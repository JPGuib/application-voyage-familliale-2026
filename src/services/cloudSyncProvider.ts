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
  CloudGameProgress,
  CloudPlaceComment,
  CloudPlaceCommentsByPlace,
  CloudDestinationSurveyByProfile,
  CloudDestinationSurveyVote,
  CloudProfileRecord,
  CloudSyncSnapshot,
  CloudSyncWritePayload,
  GameDayOverride,
  PlaceCommentReaction,
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

function parseGameProgress(value: unknown): CloudGameProgress {
  const entry = asRecord(value);
  if (
    typeof entry.day === "number" &&
    (entry.phase === "playing" || entry.phase === "riddle" || entry.phase === "challenge") &&
    Array.isArray(entry.answers) &&
    entry.answers.every((item) => typeof item === "number") &&
    (entry.quizStartedAt === null || entry.quizStartedAt === undefined || typeof entry.quizStartedAt === "number") &&
    typeof entry.quizDurationSec === "number" &&
    typeof entry.riddleValidated === "boolean" &&
    typeof entry.riddleSolved === "boolean"
  ) {
    return {
      day: entry.day,
      phase: entry.phase,
      answers: entry.answers as number[],
      quizStartedAt: typeof entry.quizStartedAt === "number" ? entry.quizStartedAt : null,
      quizDurationSec: entry.quizDurationSec,
      riddleValidated: entry.riddleValidated,
      riddleSolved: entry.riddleSolved,
    };
  }
  return null;
}

function parseGameDayOverrides(value: unknown): Record<number, GameDayOverride> {
  const raw = asRecord(value);
  const next: Record<number, GameDayOverride> = {};

  for (const [key, candidate] of Object.entries(raw)) {
    if (candidate !== "open" && candidate !== "closed") {
      continue;
    }
    const day = Number(key);
    if (Number.isFinite(day)) {
      next[day] = candidate;
    }
  }

  return next;
}

function toPlaceCommentReaction(value: unknown): PlaceCommentReaction | null {
  if (value === "like" || value === "dislike") {
    return value;
  }
  return null;
}

function parsePlaceComment(
  placeId: string,
  commentId: string,
  value: unknown
): CloudPlaceComment | null {
  const entry = asRecord(value);
  const normalizedCommentId =
    typeof entry.commentId === "string" && entry.commentId.trim().length > 0
      ? entry.commentId
      : commentId;
  const normalizedPlaceId =
    typeof entry.placeId === "string" && entry.placeId.trim().length > 0
      ? entry.placeId
      : placeId;
  const reaction = toPlaceCommentReaction(entry.reaction);
  const authorProfileId =
    typeof entry.authorProfileId === "string" ? entry.authorProfileId.trim() : "";
  const authorSurnameSnapshot =
    typeof entry.authorSurnameSnapshot === "string"
      ? entry.authorSurnameSnapshot.trim()
      : "";
  const text = typeof entry.text === "string" ? entry.text.trim() : "";
  const createdAt = toFiniteNumber(entry.createdAt, 0);
  const updatedAt = toFiniteNumber(entry.updatedAt, createdAt);

  if (
    !authorProfileId ||
    !authorSurnameSnapshot ||
    !normalizedCommentId ||
    !normalizedPlaceId ||
    text.length > 500 ||
    createdAt <= 0 ||
    updatedAt <= 0
  ) {
    return null;
  }

  const authorUid =
    typeof entry.authorUid === "string" && entry.authorUid.trim().length > 0
      ? entry.authorUid
      : undefined;

  return {
    commentId: normalizedCommentId,
    placeId: normalizedPlaceId,
    authorProfileId,
    authorSurnameSnapshot,
    reaction,
    text,
    createdAt,
    updatedAt,
    authorUid,
  };
}

function parsePlaceComments(value: unknown): CloudPlaceCommentsByPlace {
  const placeRecords = asRecord(value);
  const next: CloudPlaceCommentsByPlace = {};

  for (const [placeId, placeValue] of Object.entries(placeRecords)) {
    const commentRecords = asRecord(placeValue);
    const placeComments: Record<string, CloudPlaceComment> = {};

    for (const [commentId, commentValue] of Object.entries(commentRecords)) {
      const parsed = parsePlaceComment(placeId, commentId, commentValue);
      if (!parsed) {
        continue;
      }
      placeComments[parsed.commentId] = parsed;
    }

    if (Object.keys(placeComments).length > 0) {
      next[placeId] = placeComments;
    }
  }

  return next;
}

function parseDestinationSurveyVote(
  profileId: string,
  value: unknown
): CloudDestinationSurveyVote | null {
  const entry = asRecord(value);
  const proposals = Array.isArray(entry.proposals)
    ? entry.proposals.filter((proposal): proposal is string => typeof proposal === "string")
        .map((proposal) => proposal.trim())
        .filter((proposal) => proposal.length > 0)
        .slice(0, 3)
    : [];

  const updatedAt = toFiniteNumber(entry.updatedAt, 0);
  if (proposals.length === 0 || updatedAt <= 0) {
    return null;
  }

  const authorUid =
    typeof entry.authorUid === "string" && entry.authorUid.trim().length > 0
      ? entry.authorUid
      : undefined;

  return {
    profileId,
    proposals,
    updatedAt,
    authorUid,
  };
}

function parseDestinationSurvey(value: unknown): CloudDestinationSurveyByProfile {
  const records = asRecord(value);
  const next: CloudDestinationSurveyByProfile = {};

  for (const [profileId, candidate] of Object.entries(records)) {
    const parsed = parseDestinationSurveyVote(profileId, candidate);
    if (!parsed) {
      continue;
    }
    next[profileId] = parsed;
  }

  return next;
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
  const role =
    record.role === "proprietaire" || record.role === "utilisateur" || record.role === "visiteur"
      ? record.role
      : null;
  if (!role) {
    return null;
  }

  const now = Date.now();
  const passwordHash = toOptionalNonEmptyString(record.passwordHash);
  const recoveryHash = toOptionalNonEmptyString(record.recoveryHash);
  const recoveryQuestion = toOptionalNonEmptyString(record.recoveryQuestion);
  const recoveryAnswer = toOptionalNonEmptyString(record.recoveryAnswer);
  return {
    surname: typeof record.surname === "string" ? record.surname : "",
    role,
    createdAt: toFiniteNumber(record.createdAt, now),
    lastSyncAt: toFiniteNumber(record.lastSyncAt, now),
    passwordHash,
    recoveryHash,
    recoveryQuestion: recoveryHash ? recoveryQuestion : undefined,
    recoveryAnswer: recoveryHash ? recoveryAnswer : undefined,
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
  const placeCommentRecords = asRecord(root.placeComments);
  const destinationSurveyRecords = parseDestinationSurvey(root.destinationSurvey);
  const gameResultRecords = asRecord(root.gameResults);
  const gameProgressRecords = asRecord(root.gameProgress);
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
      recoveryAnswer: record.recoveryAnswer,
      recoveryConfiguredAt: record.recoveryConfiguredAt,
      gender: record.gender,
      householdRole: record.householdRole,
      checklist: parseChecklist(checklistRecords[profileId]),
      customChecklistItems: parseChecklistCustomItems(asRecord(value).customChecklistItems),
      gameResults: parseGameResults(gameResultRecords[profileId]),
      gameProgress: parseGameProgress(gameProgressRecords[profileId]),
      destinationSurveyVote: destinationSurveyRecords[profileId] ?? null,
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
    ownerCodePlain: toOptionalNonEmptyString(root.ownerCodePlain),
    travelerCodeHash: toOptionalNonEmptyString(root.travelerCodeHash),
    travelerCodePlain: toOptionalNonEmptyString(root.travelerCodePlain),
    phase: sharedPhase,
    tripStartDate: typeof root.tripStartDate === "string" ? root.tripStartDate : null,
    ownerGlobalChecklistAdditions: parseChecklistCustomItems(ownerGlobalAdditionRecords),
    ownerGlobalChecklistRemovals: parseChecklistRemovals(ownerGlobalRemovalRecords),
    placeComments: parsePlaceComments(placeCommentRecords),
    destinationSurvey: destinationSurveyRecords,
    gameDayOverrides: parseGameDayOverrides(root.gameDayOverrides),
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

export async function ensureProfileMembership(
  database: Database,
  familyId: string,
  profileId: string,
  uid: string
): Promise<void> {
  await set(ref(database, `families/${familyId}/profiles/${profileId}/memberUids/${uid}`), true);
}

/**
 * Déclare l'utilisateur courant comme un appareil propriétaire reconnu, dans
 * ownerMembers/{familyId}/{uid} = true. Permet à plusieurs appareils/navigateurs
 * (chacun ayant sa propre identité anonyme Firebase) d'agir comme propriétaire,
 * plutôt que de dépendre d'un unique ownerUid figé sur le tout premier appareil.
 * À appeler uniquement lorsque l'app a déjà déterminé, côté client, que ce
 * profil est bien le propriétaire (ownerProfileId === profile.id) — l'écriture
 * elle-même n'est autorisée par les règles que pour sa propre entrée
 * (auth.uid === $uid), au même niveau de confiance que familyMembers.
 */
export async function ensureOwnerMembership(
  database: Database,
  familyId: string,
  uid: string
): Promise<void> {
  await set(ref(database, `ownerMembers/${familyId}/${uid}`), true);
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
  const existingRoleInFamilyState = normalizedFamilyState.profiles.find(
    (profile) => profile.id === payload.profileId
  )?.role;
  // Un profil visiteur (story 24.1/24.3) ne doit jamais être rétrogradé en
  // "utilisateur" par cette sanitization, que ce soit parce que son propre
  // appareil pousse à nouveau son rôle, ou parce que le roster famille le
  // connaît déjà comme visiteur.
  const effectiveRole: Role = isPayloadOwner
    ? "proprietaire"
    : payload.role === "visiteur" || existingRoleInFamilyState === "visiteur"
      ? "visiteur"
      : "utilisateur";

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
    [`gameProgress/${payload.profileId}`]: payload.gameProgress,
  };

  // Commentaires: n'écrire que les branches auteur courant pour respecter la
  // règle RTDB "author-only" et éviter les PERMISSION_DENIED sur les avis
  // des autres membres de la famille. Un profil peut avoir plusieurs entrées
  // (clé profileId pour le premier avis, profileId-timestamp pour les suivants).
  for (const [placeId, commentsById] of Object.entries(payload.placeComments)) {
    for (const [commentId, comment] of Object.entries(commentsById)) {
      if (comment.authorProfileId === payload.profileId) {
        updates[`placeComments/${placeId}/${commentId}`] = comment;
      }
    }
  }

  if (payload.profileDestinationSurveyVote && payload.phase === "before") {
    updates[`destinationSurvey/${payload.profileId}`] = {
      ...payload.profileDestinationSurveyVote,
      profileId: payload.profileId,
      authorUid: payload.actorUid,
    };
  }

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
      updates[`profiles/${payload.profileId}/recoveryAnswer`] =
        payload.profileRecoveryAnswer?.trim() || null;
      updates[`profiles/${payload.profileId}/recoveryConfiguredAt`] =
        payload.profileRecoveryConfiguredAt ?? timestamp;
    } else {
      updates[`profiles/${payload.profileId}/recoveryHash`] = null;
      updates[`profiles/${payload.profileId}/recoveryQuestion`] = null;
      updates[`profiles/${payload.profileId}/recoveryAnswer`] = null;
      updates[`profiles/${payload.profileId}/recoveryConfiguredAt`] = null;
    }
  }

  // Write profile metadata with backward-compatible defaults
  updates[`profiles/${payload.profileId}/gender`] = payload.gender ?? "unspecified";
  updates[`profiles/${payload.profileId}/householdRole`] = payload.householdRole ?? "member";

  if (payload.canWriteFamilyState && isPayloadOwner) {
    updates.ownerProfileId = normalizedFamilyState.ownerProfileId;
    // On n'écrase plus jamais ownerUid ici : il est fixé une seule fois par
    // claimProfileRole (premier appareil à revendiquer le rôle) et les règles
    // de sécurité interdisent de toute façon de le changer ensuite.
    // L'enregistrement de cet appareil comme identité propriétaire reconnue
    // (pour le multi-appareils) se fait séparément via ensureOwnerMembership
    // / registerAsOwnerDevice — ne pas dupliquer ici, et surtout pas sur un
    // chemin différent (ownerUids) qui n'a pas de règle Firebase définie et
    // ferait échouer tout l'envoi groupé.
    updates.ownerCodeHash = payload.ownerCodeHash;
    updates.ownerCodePlain = payload.ownerCodePlain?.trim() || null;
    if (typeof payload.travelerCodeHash === "string" && payload.travelerCodeHash.trim().length > 0) {
      updates.travelerCodeHash = payload.travelerCodeHash;
      updates.travelerCodePlain = payload.travelerCodePlain?.trim() || null;
    }
    updates.phase = payload.phase;
    // On n'écrit jamais explicitement null ici : tant qu'aucune fonctionnalité
    // "effacer la date" n'existe, une valeur locale vide/nulle ne doit jamais
    // écraser une date déjà enregistrée dans Firebase (voir bug corrigé :
    // une race condition côté client pouvait remettre l'état local à null,
    // et cette ligne l'aurait alors silencieusement propagé au serveur).
    if (payload.tripStartDate) {
      updates.tripStartDate = payload.tripStartDate;
    }
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

export async function pushDestinationSurveyVoteOnly(
  database: Database,
  familyId: string,
  payload: {
    actorUid: string;
    profileId: string;
    vote: CloudDestinationSurveyVote;
    phase: TravelPhase;
  }
): Promise<void> {
  if (payload.phase !== "before") {
    return;
  }

  const updates: Record<string, unknown> = {
    [`destinationSurvey/${payload.profileId}`]: {
      ...payload.vote,
      profileId: payload.profileId,
      authorUid: payload.actorUid,
    },
  };

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
        memberUids: {
          ...asRecord(previousProfile.memberUids),
          [actorUid]: true,
        },
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
    [`families/${familyId}/gameProgress/${profileIdToDelete}`]: null,
    [`families/${familyId}/updatedAt`]: Date.now(),
  };

  await update(ref(database), updates);
}

/**
 * Force l'ouverture/fermeture d'une journée de jeu (override propriétaire du
 * verrouillage automatique par jour, story 19.1). `value === null` efface
 * l'override et revient au comportement automatique.
 */
export async function pushGameDayOverride(
  database: Database,
  familyId: string,
  day: number,
  value: GameDayOverride | null
): Promise<void> {
  const updates: Record<string, unknown> = {
    [`gameDayOverrides/${day}`]: value,
    updatedAt: Date.now(),
  };

  await update(ref(database, familyPath(familyId)), updates);
}

/**
 * Réinitialisation propriétaire des scores (story 19 — besoin ajouté par le
 * PO) : reset total (day === undefined, tous profils) ou ciblé sur une seule
 * journée (les autres jours de chaque profil restent intacts). Efface aussi
 * la partie EN COURS (gameProgress) des profils concernés par ce reset — un
 * profil resté coincé en plein quiz/énigme/défi pour le(s) jour(s)
 * réinitialisé(s) doit pouvoir rejouer depuis "intro", sinon le jour reste
 * verrouillé sur son ancienne progression malgré le reset des scores (bug
 * corrigé le 2026-08-01).
 */
export async function resetGameResultsInCloud(
  database: Database,
  familyId: string,
  currentResultsByProfile: Record<string, CloudGameHistoryEntry[]>,
  currentProgressByProfile: Record<string, CloudGameProgress>,
  day?: number
): Promise<void> {
  const updates: Record<string, unknown> = {
    [`families/${familyId}/updatedAt`]: Date.now(),
  };

  for (const [profileId, entries] of Object.entries(currentResultsByProfile)) {
    if (day === undefined) {
      updates[`families/${familyId}/gameResults/${profileId}`] = null;
      continue;
    }

    const filtered = entries.filter((entry) => entry.day !== day);
    updates[`families/${familyId}/gameResults/${profileId}`] =
      filtered.length > 0 ? filtered : null;
  }

  for (const [profileId, progress] of Object.entries(currentProgressByProfile)) {
    if (day === undefined) {
      updates[`families/${familyId}/gameProgress/${profileId}`] = null;
    } else if (progress && progress.day === day) {
      updates[`families/${familyId}/gameProgress/${profileId}`] = null;
    }
  }

  await update(ref(database), updates);
}

/**
 * Réinitialisation propriétaire d'une partie EN COURS (non terminée) pour un
 * profil donné : n'efface que la progression en cours (gameProgress), pas
 * les scores déjà validés (gameResults) — cet outil sert à débloquer un
 * profil resté coincé en plein quiz/énigme/défi, pas à effacer une journée
 * déjà terminée (voir l'outil séparé "Réinitialiser les scores" pour ça).
 */
export async function resetGameProgressInCloud(
  database: Database,
  familyId: string,
  profileId: string
): Promise<void> {
  const updates: Record<string, unknown> = {
    [`families/${familyId}/gameProgress/${profileId}`]: null,
    [`families/${familyId}/updatedAt`]: Date.now(),
  };

  await update(ref(database), updates);
}
