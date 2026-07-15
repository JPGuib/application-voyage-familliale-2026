import {
  onValue,
  ref,
  runTransaction,
  update,
  type Database,
} from "firebase/database";
import {
  claimRoleFirstWriterWins,
  enforceOwnerUniqueness,
  type Role,
} from "../app/owner-policy";
import type {
  ChecklistState,
  ClaimRoleResult,
  CloudGameHistoryEntry,
  CloudProfileRecord,
  CloudSyncSnapshot,
  CloudSyncWritePayload,
  TravelPhase,
} from "../types/cloud";

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function toFiniteNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function toTravelPhase(value: unknown): TravelPhase {
  return value === "during" ? "during" : "before";
}

function parseChecklist(value: unknown): ChecklistState {
  const raw = asRecord(value);
  const next: ChecklistState = {};
  for (const [key, candidate] of Object.entries(raw)) {
    if (typeof candidate === "boolean") {
      next[key] = candidate;
    }
  }
  return next;
}

function isCloudGameEntry(value: unknown): value is CloudGameHistoryEntry {
  const entry = asRecord(value);
  return (
    typeof entry.day === "number" &&
    typeof entry.location === "string" &&
    typeof entry.quizScore === "number" &&
    typeof entry.correctCount === "number" &&
    typeof entry.riddleSolved === "boolean" &&
    typeof entry.challengeDone === "boolean" &&
    typeof entry.durationSec === "number" &&
    typeof entry.totalScore === "number" &&
    typeof entry.completedAt === "string"
  );
}

function parseGameResults(value: unknown): CloudGameHistoryEntry[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(isCloudGameEntry).sort((left, right) => left.day - right.day);
}

function parseProfileRecord(value: unknown): CloudProfileRecord | null {
  const record = asRecord(value);
  const role = record.role === "proprietaire" || record.role === "utilisateur" ? record.role : null;
  if (!role) {
    return null;
  }

  const now = Date.now();
  return {
    surname: typeof record.surname === "string" ? record.surname : "",
    role,
    createdAt: toFiniteNumber(record.createdAt, now),
    lastSyncAt: toFiniteNumber(record.lastSyncAt, now),
  };
}

function familyPath(familyId: string): string {
  return `families/${familyId}`;
}

export function parseCloudSnapshot(raw: unknown): CloudSyncSnapshot {
  const root = asRecord(raw);
  const profileRecords = asRecord(root.profiles);
  const checklistRecords = asRecord(root.checklists);
  const gameResultRecords = asRecord(root.gameResults);
  const phaseRecords = asRecord(root.phase);

  const hasFamilyWidePhase = root.phase === "before" || root.phase === "during";
  const legacyPhaseCandidates = Object.values(phaseRecords).map((candidate) =>
    toTravelPhase(candidate)
  );
  const legacyFallbackPhase: TravelPhase = legacyPhaseCandidates.includes("during")
    ? "during"
    : "before";
  const sharedPhase = hasFamilyWidePhase
    ? toTravelPhase(root.phase)
    : legacyFallbackPhase;

  const profiles: CloudSyncSnapshot["profiles"] = {};
  const familyProfiles: Array<{ id: string; role: Role }> = [];

  for (const [profileId, value] of Object.entries(profileRecords)) {
    const record = parseProfileRecord(value);
    if (!record) {
      continue;
    }

    familyProfiles.push({ id: profileId, role: record.role });
    profiles[profileId] = {
      profileId,
      surname: record.surname,
      role: record.role,
      createdAt: record.createdAt,
      lastSyncAt: record.lastSyncAt,
      checklist: parseChecklist(checklistRecords[profileId]),
      gameResults: parseGameResults(gameResultRecords[profileId]),
      phase: toTravelPhase(phaseRecords[profileId]),
    };
  }

  const ownerProfileIdCandidate = typeof root.ownerProfileId === "string" ? root.ownerProfileId : null;
  const familyState = enforceOwnerUniqueness({
    version: 1,
    ownerProfileId: ownerProfileIdCandidate,
    profiles: familyProfiles,
  });

  return {
    familyState,
    ownerCodeHash: typeof root.ownerCodeHash === "string" ? root.ownerCodeHash : "",
    phase: sharedPhase,
    profiles,
    updatedAt: toFiniteNumber(root.updatedAt, 0),
  };
}

export function observeFamilySnapshot(
  database: Database,
  familyId: string,
  onSnapshot: (snapshot: CloudSyncSnapshot) => void,
  onError?: () => void
): () => void {
  const rootRef = ref(database, familyPath(familyId));
  return onValue(
    rootRef,
    (snapshot) => onSnapshot(parseCloudSnapshot(snapshot.val())),
    () => onError?.()
  );
}

export async function pushCloudSnapshot(
  database: Database,
  familyId: string,
  payload: CloudSyncWritePayload
): Promise<void> {
  const timestamp = Date.now();
  const normalizedFamilyState = enforceOwnerUniqueness(payload.familyState);
  const isPayloadOwner = normalizedFamilyState.ownerProfileId === payload.profileId;
  const effectiveRole: Role = isPayloadOwner ? "proprietaire" : "utilisateur";

  if (import.meta.env.DEV && payload.role !== effectiveRole) {
    console.info(
      `[owner-policy] Cloud role sanitized for profile ${payload.profileId}: ${payload.role} -> ${effectiveRole}.`
    );
  }

  const updates: Record<string, unknown> = {
    [`profiles/${payload.profileId}/surname`]: payload.surname,
    [`profiles/${payload.profileId}/role`]: effectiveRole,
    [`profiles/${payload.profileId}/lastSyncAt`]: timestamp,
    [`checklists/${payload.profileId}`]: payload.checklist,
    [`gameResults/${payload.profileId}`]: payload.gameResults,
  };

  if (payload.canWriteFamilyState && isPayloadOwner) {
    updates.ownerProfileId = normalizedFamilyState.ownerProfileId;
    updates.ownerUid = payload.actorUid;
    updates.ownerCodeHash = payload.ownerCodeHash;
    updates.phase = payload.phase;
    updates.updatedAt = timestamp;

    for (const profile of normalizedFamilyState.profiles) {
      updates[`profiles/${profile.id}/role`] = profile.role;
    }
  }

  await update(ref(database, familyPath(familyId)), updates);
}

export async function claimProfileRole(
  database: Database,
  familyId: string,
  profileId: string,
  surname: string,
  actorUid: string
): Promise<ClaimRoleResult> {
  const rootRef = ref(database, familyPath(familyId));

  const transaction = await runTransaction(rootRef, (current) => {
    const parsed = parseCloudSnapshot(current);
    const claimResult = claimRoleFirstWriterWins(parsed.familyState, profileId);

    const base = asRecord(current);
    const profilesRecord = asRecord(base.profiles);

    const nextFamilyState = claimResult.state;

    const timestamp = Date.now();
    const nextProfiles: Record<string, unknown> = { ...profilesRecord };

    for (const profile of nextFamilyState.profiles) {
      const previousProfile = asRecord(nextProfiles[profile.id]);
      nextProfiles[profile.id] = {
        ...previousProfile,
        surname:
          profile.id === profileId
            ? surname
            : typeof previousProfile.surname === "string"
              ? previousProfile.surname
              : "",
        role: profile.role,
        createdAt: toFiniteNumber(previousProfile.createdAt, timestamp),
        lastSyncAt: timestamp,
      };
    }

    return {
      ...base,
      ownerProfileId: nextFamilyState.ownerProfileId,
      ownerUid:
        typeof base.ownerUid === "string"
          ? base.ownerUid
          : nextFamilyState.ownerProfileId === profileId
            ? actorUid
            : null,
      profiles: nextProfiles,
      updatedAt: timestamp,
    };
  });

  const parsed = parseCloudSnapshot(transaction.snapshot.val());
  return {
    assignedRole: parsed.familyState.ownerProfileId === profileId ? "proprietaire" : "utilisateur",
    familyState: parsed.familyState,
  };
}
