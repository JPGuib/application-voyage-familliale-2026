import {
  onValue,
  ref,
  runTransaction,
  set,
  update,
  type Database,
} from "firebase/database";
import {
  claimRoleFirstWriterWins,
  enforceOwnerUniqueness,
  type Role,
} from "../app/owner-policy";
import type {
  ChecklistCustomItem,
  ChecklistRemovalState,
  ChecklistState,
  ClaimRoleResult,
  CloudGameHistoryEntry,
  CloudProfileRecord,
  CloudSyncSnapshot,
  CloudSyncWritePayload,
  ProfileGender,
  ProfileHouseholdRole,
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

function toOptionalNonEmptyString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
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

function parseChecklistRemovals(value: unknown): ChecklistRemovalState {
  const raw = asRecord(value);
  const next: ChecklistRemovalState = {};
  for (const [key, candidate] of Object.entries(raw)) {
    if (typeof candidate === "boolean") {
      next[key] = candidate;
    }
  }
  return next;
}

function parseChecklistCustomItems(value: unknown): ChecklistCustomItem[] {
  const raw = asRecord(value);
  const items: ChecklistCustomItem[] = [];

  for (const [itemId, candidate] of Object.entries(raw)) {
    const entry = asRecord(candidate);
    const id = typeof entry.id === "string" ? entry.id : itemId;
    if (
      typeof id !== "string" ||
      typeof entry.label !== "string" ||
      typeof entry.categoryId !== "string"
    ) {
      continue;
    }

    const item: ChecklistCustomItem = {
      id,
      label: entry.label,
      categoryId: entry.categoryId,
    };
    if (entry.genderTargets === "all" || entry.genderTargets === "male" || entry.genderTargets === "female") {
      item.genderTargets = entry.genderTargets;
    }
    if (
      entry.householdRoleTargets === "all" ||
      entry.householdRoleTargets === "parent" ||
      entry.householdRoleTargets === "child"
    ) {
      item.householdRoleTargets = entry.householdRoleTargets;
    }
    if (typeof entry.ownerOnly === "boolean") {
      item.ownerOnly = entry.ownerOnly;
    }
    if (typeof entry.visibleToProfileId === "string") {
      item.visibleToProfileId = entry.visibleToProfileId;
    }

    items.push(item);
  }

  items.sort((left, right) => left.id.localeCompare(right.id));
  return items;
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

function toProfileGender(value: unknown): ProfileGender {
  if (value === "male" || value === "female") return value;
  return "unspecified";
}

function toProfileHouseholdRole(value: unknown): ProfileHouseholdRole {
  if (value === "parent" || value === "child") return value;
  if (value === "teen") return "child";
  return "member";
}

function parseProfileRecord(value: unknown): CloudProfileRecord | null {
  const record = asRecord(value);
  const role = record.role === "proprietaire" || record.role === "utilisateur" ? record.role : null;
  if (!role) {
    return null;
  }

  const now = Date.now();
  const passwordHash = toOptionalNonEmptyString(record.passwordHash);
  const recoveryHash = toOptionalNonEmptyString(record.recoveryHash);
  const recoveryQuestion = toOptionalNonEmptyString(record.recoveryQuestion);
  return {
    surname: typeof record.surname === "string" ? record.surname : "",
    role,
    createdAt: toFiniteNumber(record.createdAt, now),
    lastSyncAt: toFiniteNumber(record.lastSyncAt, now),
    passwordHash,
    recoveryHash,
    recoveryQuestion: recoveryHash ? recoveryQuestion : undefined,
    recoveryConfiguredAt:
      recoveryHash &&
      typeof record.recoveryConfiguredAt === "number" &&
      Number.isFinite(record.recoveryConfiguredAt)
        ? record.recoveryConfiguredAt
        : undefined,
    gender: record.gender !== undefined ? toProfileGender(record.gender) : undefined,
    householdRole: record.householdRole !== undefined ? toProfileHouseholdRole(record.householdRole) : undefined,
  };
}

function familyPath(familyId: string): string {
  return `families/${familyId}`;
}

export function parseCloudSnapshot(raw: unknown): CloudSyncSnapshot {
  const root = asRecord(raw);
  const profileRecords = asRecord(root.profiles);
  const checklistRecords = asRecord(root.checklists);
  const ownerGlobalAdditionRecords = asRecord(root.checklistCatalogAdditions);
  const ownerGlobalRemovalRecords = asRecord(root.checklistCatalogRemovals);
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
      passwordHash: record.passwordHash,
      recoveryHash: record.recoveryHash,
      recoveryQuestion: record.recoveryQuestion,
      recoveryConfiguredAt: record.recoveryConfiguredAt,
      gender: record.gender,
      householdRole: record.householdRole,
      checklist: parseChecklist(checklistRecords[profileId]),
      customChecklistItems: parseChecklistCustomItems(asRecord(value).customChecklistItems),
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
    tripStartDate: typeof root.tripStartDate === "string" ? root.tripStartDate : null,
    ownerGlobalChecklistAdditions: parseChecklistCustomItems(ownerGlobalAdditionRecords),
    ownerGlobalChecklistRemovals: parseChecklistRemovals(ownerGlobalRemovalRecords),
    profiles,
    updatedAt: toFiniteNumber(root.updatedAt, 0),
  };
}

/**
 * Déclare l'utilisateur courant comme membre de la famille dans
 * familyMembers/{familyId}/{uid} = true. Requis par les règles de sécurité
 * (families/{familyId} n'est lisible/inscriptible que pour les uid présents
 * ici) — sans cet appel, tout accès à families/{familyId} est refusé
 * ("permission-denied"), y compris pour le tout premier appareil de la famille.
 * L'écriture est autorisée par les règles pour n'importe quel utilisateur
 * authentifié écrivant sa propre entrée (auth.uid === $uid), donc cet appel
 * est sûr à effectuer dès qu'une session anonyme est établie.
 */
export async function ensureFamilyMembership(
  database: Database,
  familyId: string,
  uid: string
): Promise<void> {
  await set(ref(database, `familyMembers/${familyId}/${uid}`), true);
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
    [`profiles/${payload.profileId}/customChecklistItems`]: payload.profileCustomChecklistItems.reduce<Record<string, ChecklistCustomItem>>((acc, item) => {
      acc[item.id] = item;
      return acc;
    }, {}),
    [`checklists/${payload.profileId}`]: payload.checklist,
    [`gameResults/${payload.profileId}`]: payload.gameResults,
  };

  if (typeof payload.profilePasswordHash === "string") {
    const normalizedPasswordHash = payload.profilePasswordHash.trim();
    updates[`profiles/${payload.profileId}/passwordHash`] =
      normalizedPasswordHash.length > 0 ? payload.profilePasswordHash : null;
  }
  if (typeof payload.profileRecoveryHash === "string") {
    const normalizedRecoveryHash = payload.profileRecoveryHash.trim();
    if (normalizedRecoveryHash.length > 0) {
      updates[`profiles/${payload.profileId}/recoveryHash`] = payload.profileRecoveryHash;
      updates[`profiles/${payload.profileId}/recoveryQuestion`] =
        payload.profileRecoveryQuestion?.trim() || null;
      updates[`profiles/${payload.profileId}/recoveryConfiguredAt`] =
        payload.profileRecoveryConfiguredAt ?? timestamp;
    } else {
      updates[`profiles/${payload.profileId}/recoveryHash`] = null;
      updates[`profiles/${payload.profileId}/recoveryQuestion`] = null;
      updates[`profiles/${payload.profileId}/recoveryConfiguredAt`] = null;
    }
  }

  // Write profile metadata with backward-compatible defaults
  updates[`profiles/${payload.profileId}/gender`] = payload.gender ?? "unspecified";
  updates[`profiles/${payload.profileId}/householdRole`] = payload.householdRole ?? "member";

  if (payload.canWriteFamilyState && isPayloadOwner) {
    updates.ownerProfileId = normalizedFamilyState.ownerProfileId;
    updates.ownerUid = payload.actorUid;
    updates.ownerCodeHash = payload.ownerCodeHash;
    updates.phase = payload.phase;
    updates.tripStartDate = payload.tripStartDate ?? null;
    updates.checklistCatalogAdditions = payload.ownerGlobalChecklistAdditions.reduce<Record<string, ChecklistCustomItem>>((acc, item) => {
      acc[item.id] = item;
      return acc;
    }, {});
    updates.checklistCatalogRemovals = payload.ownerGlobalChecklistRemovals;
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

export async function deleteProfileFromCloud(
  database: Database,
  familyId: string,
  profileIdToDelete: string
): Promise<void> {
  const updates: Record<string, unknown> = {
    [`families/${familyId}/profiles/${profileIdToDelete}`]: null,
    [`families/${familyId}/checklists/${profileIdToDelete}`]: null,
    [`families/${familyId}/gameResults/${profileIdToDelete}`]: null,
    [`families/${familyId}/updatedAt`]: Date.now(),
  };

  await update(ref(database), updates);
}
