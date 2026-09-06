import {
  get,
  limitToLast,
  onValue,
  query,
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
import {
  buildVoyageConversationSeed,
  CHAT_MESSAGE_MAX_LENGTH,
  computeMissingVoyageMembers,
  shouldAdvanceChatReadState,
  VOYAGE_CONVERSATION_ID,
  type ChatMemberProfile,
} from "../app/chat";
import {
  GROUP_INFO_TEXT_MAX_LENGTH,
  shouldAdvanceGroupInfoReadState,
} from "../app/groupInfo";
import type {
  ChallengeReactionEmoji,
  ChecklistCustomItem,
  ChecklistRemovalState,
  ChecklistState,
  ClaimRoleResult,
  CloudChallengeBestVote,
  CloudChallengeBestVotesByDay,
  CloudChallengeReaction,
  CloudChallengeReactionsByDay,
  CloudCandyCrushChallenge,
  CloudGameHistoryEntry,
  CloudGameProgress,
  CloudCarnetVisiteEntry,
  CloudCarnetVisiteLog,
  CloudCarnetContentEntry,
  CloudCarnetContentLog,
  CloudChatConversation,
  CloudChatConversationsMap,
  CloudChatMessage,
  CloudChatMessagesLog,
  CloudChatPollResponse,
  CloudChatPollResponsesByProfile,
  CloudChatReadState,
  CloudChatReadStateMap,
  CloudGroupInfoItem,
  CloudGroupInfoItemsLog,
  CloudGroupInfoReadState,
  CloudGroupInfoReadStateByProfile,
  CloudDocumentPhotoMap,
  CloudPlaceComment,
  CloudPlaceCommentsByPlace,
  CloudDestinationSurveyByProfile,
  CloudDestinationSurveyVote,
  ContentOverrideMap,
  ContentOverridePatch,
  ContentSource,
  DocumentCatalogRemovalState,
  DocumentVisibilityState,
  PlaceCatalogAdditionState,
  CloudProfileRecord,
  CloudSyncSnapshot,
  CloudSyncWritePayload,
  GameDayOverride,
  PlaceDayOverrideMap,
  PlaceDayOrderOverrideMap,
  PlaceVisibilityState,
  PlaceSeenState,
  PlaceCommentReaction,
  ProfileGender,
  ProfileHouseholdRole,
  TravelPhase,
} from "../types/cloud";
import { DEFAULT_GAME_SCORING, type GameScoringConfig } from "../content/game";
import { DOCUMENT_CATEGORIES, type DocumentCategory, type TravelDocument } from "../content/documents";
import { normalizeDocumentDays } from "../app/documents-screen";
import type { Place } from "../content/places";
import { normalizeCrosswordProgress } from "../app/crossword-progress";

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function toFiniteNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function toNonNegativeInteger(value: unknown, fallback = 0): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }
  const normalized = Math.floor(value);
  return normalized >= 0 ? normalized : fallback;
}

function parseGameScoring(value: unknown): GameScoringConfig {
  const raw = asRecord(value);
  const destination = Array.isArray(raw.destinationProposalScoring)
    ? raw.destinationProposalScoring
    : [];
  const points = (candidate: unknown, fallback: number) =>
    toNonNegativeInteger(candidate, fallback);

  return {
    questionPoints: points(raw.questionPoints, DEFAULT_GAME_SCORING.questionPoints),
    riddlePoints: points(raw.riddlePoints, DEFAULT_GAME_SCORING.riddlePoints),
    challengePoints: points(raw.challengePoints, DEFAULT_GAME_SCORING.challengePoints),
    destinationProposalScoring: [0, 1, 2].map((index) => {
      const entry = asRecord(destination[index]);
      return {
        basePoints: points(entry.basePoints, DEFAULT_GAME_SCORING.destinationProposalScoring[index].basePoints),
        bonusPoints: points(entry.bonusPoints, DEFAULT_GAME_SCORING.destinationProposalScoring[index].bonusPoints),
      };
    }) as GameScoringConfig["destinationProposalScoring"],
  };
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

function isSha256Hash(value: string): boolean {
  return /^sha256:[0-9a-f]{64}$/.test(value);
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

function parseTravelDocumentEntry(fallbackId: string, value: unknown): TravelDocument | null {
  const entry = asRecord(value);
  const id = typeof entry.id === "string" && entry.id.trim().length > 0 ? entry.id : fallbackId;
  const category = entry.category;
  if (
    typeof entry.title !== "string" ||
    entry.title.trim().length === 0 ||
    typeof entry.content !== "string" ||
    entry.content.trim().length === 0 ||
    typeof category !== "string" ||
    !DOCUMENT_CATEGORIES.includes(category as DocumentCategory)
  ) {
    return null;
  }

  const details = Array.isArray(entry.details)
    ? entry.details.filter((line): line is string => typeof line === "string")
    : undefined;
  const scans = Array.isArray(entry.scans)
    ? entry.scans.filter((line): line is string => typeof line === "string")
    : undefined;
  const links = Array.isArray(entry.links)
    ? entry.links
        .map((link) => {
          const candidate = asRecord(link);
          if (typeof candidate.label !== "string" || typeof candidate.url !== "string") {
            return null;
          }
          const label = candidate.label.trim();
          const url = candidate.url.trim();
          return label && url ? { label, url } : null;
        })
        .filter((link): link is { label: string; url: string } => Boolean(link))
    : undefined;
  const days = normalizeDocumentDays(
    typeof entry.day === "number" || Array.isArray(entry.day) ? (entry.day as number | number[]) : undefined
  );
  const gpsRaw = typeof entry.gps === "string" ? entry.gps.trim() : "";

  return {
    id,
    category: category as DocumentCategory,
    title: entry.title,
    content: entry.content,
    tag: typeof entry.tag === "string" && entry.tag.trim() ? entry.tag : undefined,
    day: days.length > 0 ? days : undefined,
    details: details && details.length > 0 ? details : undefined,
    scans: scans && scans.length > 0 ? scans : undefined,
    links: links && links.length > 0 ? links : undefined,
    gps: gpsRaw || undefined,
  };
}

function parseOwnerGlobalDocumentAdditions(value: unknown): TravelDocument[] {
  const raw = asRecord(value);
  const documents: TravelDocument[] = [];

  for (const [documentId, candidate] of Object.entries(raw)) {
    const document = parseTravelDocumentEntry(documentId, candidate);
    if (document) {
      documents.push(document);
    }
  }

  documents.sort((left, right) => left.id.localeCompare(right.id));
  return documents;
}

function parseOwnerGlobalDocumentEdits(value: unknown): Record<string, TravelDocument> {
  const raw = asRecord(value);
  const next: Record<string, TravelDocument> = {};

  for (const [documentId, candidate] of Object.entries(raw)) {
    const document = parseTravelDocumentEntry(documentId, candidate);
    if (document) {
      next[documentId] = document;
    }
  }

  return next;
}

// Les champs optionnels de TravelDocument (tag, day, details, scans, links,
// gps) sont couramment mis à `undefined` (pas juste omis) côté client. C'est
// inoffensif pour React/JSON.stringify, mais Firebase RTDB refuse d'écrire un
// objet contenant une valeur `undefined` à n'importe quelle profondeur ("update
// failed: values argument contains undefined in property ..."). On retire donc
// ces clés avant tout envoi vers update()/set().
function sanitizeTravelDocumentForFirebase(document: TravelDocument): TravelDocument {
  return JSON.parse(JSON.stringify(document)) as TravelDocument;
}

// Visite/activité du Guide du séjour ajoutée par le propriétaire (absente de
// PLACES). Même esprit que parseTravelDocumentEntry ci-dessus, mais sans
// audio (pas de pipeline d'upload de fichiers dans l'appli) et avec `jour`
// obligatoire (toujours un tableau, contrairement à `day` sur les documents).
// `image` est un data URI JPEG compressé côté client (cf. src/app/image-upload.ts),
// pas un fichier uploadé vers un service de stockage.
function parsePlaceEntry(fallbackId: string, value: unknown): Place | null {
  const entry = asRecord(value);
  const id = typeof entry.id === "string" && entry.id.trim().length > 0 ? entry.id : fallbackId;
  if (
    typeof entry.name !== "string" ||
    entry.name.trim().length === 0 ||
    typeof entry.shortDesc !== "string" ||
    entry.shortDesc.trim().length === 0 ||
    typeof entry.tag !== "string" ||
    entry.tag.trim().length === 0
  ) {
    return null;
  }

  const jour = normalizeDocumentDays(
    typeof entry.jour === "number" || Array.isArray(entry.jour) ? (entry.jour as number | number[]) : undefined
  );
  const anecdotes = Array.isArray(entry.anecdotes)
    ? entry.anecdotes.filter((line): line is string => typeof line === "string")
    : undefined;
  const links = Array.isArray(entry.links)
    ? entry.links
        .map((link) => {
          const candidate = asRecord(link);
          if (typeof candidate.label !== "string" || typeof candidate.url !== "string") {
            return null;
          }
          const label = candidate.label.trim();
          const url = candidate.url.trim();
          return label && url ? { label, url } : null;
        })
        .filter((link): link is { label: string; url: string } => Boolean(link))
    : undefined;
  const gpsRaw = typeof entry.gps === "string" ? entry.gps.trim() : "";

  return {
    id,
    jour,
    name: entry.name,
    shortDesc: entry.shortDesc,
    tag: entry.tag,
    image: typeof entry.image === "string" && entry.image.trim() ? entry.image : undefined,
    historyLabel: typeof entry.historyLabel === "string" && entry.historyLabel.trim() ? entry.historyLabel : undefined,
    history: typeof entry.history === "string" && entry.history.trim() ? entry.history : undefined,
    anecdotesLabel:
      typeof entry.anecdotesLabel === "string" && entry.anecdotesLabel.trim() ? entry.anecdotesLabel : undefined,
    anecdotes: anecdotes && anecdotes.length > 0 ? anecdotes : undefined,
    links: links && links.length > 0 ? links : undefined,
    gps: gpsRaw || undefined,
  };
}

function parseOwnerGlobalPlaceAdditions(value: unknown): PlaceCatalogAdditionState {
  const raw = asRecord(value);
  const places: Place[] = [];

  for (const [placeId, candidate] of Object.entries(raw)) {
    const place = parsePlaceEntry(placeId, candidate);
    if (place) {
      places.push(place);
    }
  }

  places.sort((left, right) => left.id.localeCompare(right.id));
  return places;
}

// Même raison que sanitizeTravelDocumentForFirebase : Firebase RTDB refuse
// d'écrire un objet contenant une valeur `undefined`.
function sanitizePlaceForFirebase(place: Place): Place {
  return JSON.parse(JSON.stringify(place)) as Place;
}

function isCloudGameEntry(value: unknown): value is CloudGameHistoryEntry {
  const entry = asRecord(value);
  return (
    typeof entry.day === "number" &&
    typeof entry.location === "string" &&
    typeof entry.quizScore === "number" &&
    typeof entry.correctCount === "number" &&
    typeof entry.riddleSolved === "boolean" &&
    (entry.riddleAnswer === undefined || typeof entry.riddleAnswer === "string") &&
    typeof entry.challengeDone === "boolean" &&
    (entry.challengeResponse === undefined || typeof entry.challengeResponse === "string") &&
    typeof entry.durationSec === "number" &&
    typeof entry.totalScore === "number" &&
    typeof entry.completedAt === "string"
  );
}

function parseGameResults(value: unknown): CloudGameHistoryEntry[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(isCloudGameEntry)
    .map((entry) => ({
      ...entry,
      riddleAnswer: typeof entry.riddleAnswer === "string" ? entry.riddleAnswer : "",
      challengeResponse: typeof entry.challengeResponse === "string" ? entry.challengeResponse : "",
    }))
    .sort((left, right) => left.day - right.day);
}

function parseCandyCrushChallenge(value: unknown): CloudCandyCrushChallenge {
  const entry = asRecord(value);
  if (
    typeof entry.bestScore === "number" &&
    Number.isFinite(entry.bestScore) &&
    entry.bestScore >= 0 &&
    typeof entry.updatedAt === "number" &&
    Number.isFinite(entry.updatedAt)
  ) {
    return { bestScore: entry.bestScore, updatedAt: entry.updatedAt };
  }
  return null;
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
    typeof entry.riddleSolved === "boolean" &&
    (entry.challengeDraft === undefined || typeof entry.challengeDraft === "string")
  ) {
    return {
      day: entry.day,
      phase: entry.phase,
      answers: entry.answers as number[],
      quizStartedAt: typeof entry.quizStartedAt === "number" ? entry.quizStartedAt : null,
      quizDurationSec: entry.quizDurationSec,
      riddleValidated: entry.riddleValidated,
      riddleSolved: entry.riddleSolved,
      challengeDraft: typeof entry.challengeDraft === "string" ? entry.challengeDraft : "",
    };
  }
  return null;
}

function toChallengeReactionEmoji(value: unknown): ChallengeReactionEmoji | null {
  if (value === "love" || value === "laugh" || value === "wow" || value === "clap") {
    return value;
  }
  return null;
}

function parseChallengeReaction(
  day: number,
  targetProfileId: string,
  reactorProfileId: string,
  value: unknown
): CloudChallengeReaction | null {
  const entry = asRecord(value);
  const emoji = toChallengeReactionEmoji(entry.emoji);
  const updatedAt = toFiniteNumber(entry.updatedAt, 0);
  const normalizedTargetProfileId =
    typeof entry.targetProfileId === "string" && entry.targetProfileId.trim().length > 0
      ? entry.targetProfileId
      : targetProfileId;
  const normalizedReactorProfileId =
    typeof entry.reactorProfileId === "string" && entry.reactorProfileId.trim().length > 0
      ? entry.reactorProfileId
      : reactorProfileId;
  const authorUid =
    typeof entry.authorUid === "string" && entry.authorUid.trim().length > 0
      ? entry.authorUid
      : undefined;

  if (!emoji || updatedAt <= 0 || !normalizedTargetProfileId || !normalizedReactorProfileId) {
    return null;
  }

  return {
    day,
    targetProfileId: normalizedTargetProfileId,
    reactorProfileId: normalizedReactorProfileId,
    emoji,
    updatedAt,
    authorUid,
  };
}

function parseChallengeReactions(value: unknown): CloudChallengeReactionsByDay {
  const raw = asRecord(value);
  const next: CloudChallengeReactionsByDay = {};

  for (const [dayKey, targetMapValue] of Object.entries(raw)) {
    const day = Number(dayKey);
    if (!Number.isFinite(day) || day <= 0) {
      continue;
    }

    const targetMap = asRecord(targetMapValue);
    for (const [targetProfileId, reactorMapValue] of Object.entries(targetMap)) {
      const reactorMap = asRecord(reactorMapValue);
      for (const [reactorProfileId, reactionValue] of Object.entries(reactorMap)) {
        const parsedReaction = parseChallengeReaction(
          Math.trunc(day),
          targetProfileId,
          reactorProfileId,
          reactionValue
        );
        if (!parsedReaction) {
          continue;
        }

        const dayBucket = next[Math.trunc(day)] ?? {};
        const targetBucket = dayBucket[targetProfileId] ?? {};
        targetBucket[reactorProfileId] = parsedReaction;
        dayBucket[targetProfileId] = targetBucket;
        next[Math.trunc(day)] = dayBucket;
      }
    }
  }

  return next;
}

// Vote "meilleur défi/commentaire du jour" (trophée). Même forme de stockage
// que les réactions emoji ci-dessus (day -> targetProfileId -> votantId),
// mais sans champ emoji : la contrainte "un seul vote par jour et par
// votant" est appliquée côté client (App.tsx, voteBestChallengeResponse) au
// moment où le vote est posé, pas ici — cette fonction se contente de lire
// fidèlement ce qui est en base.
function parseChallengeBestVote(
  day: number,
  targetProfileId: string,
  voterProfileId: string,
  value: unknown
): CloudChallengeBestVote | null {
  const entry = asRecord(value);
  const updatedAt = toFiniteNumber(entry.updatedAt, 0);
  const normalizedTargetProfileId =
    typeof entry.targetProfileId === "string" && entry.targetProfileId.trim().length > 0
      ? entry.targetProfileId
      : targetProfileId;
  const normalizedVoterProfileId =
    typeof entry.voterProfileId === "string" && entry.voterProfileId.trim().length > 0
      ? entry.voterProfileId
      : voterProfileId;
  const authorUid =
    typeof entry.authorUid === "string" && entry.authorUid.trim().length > 0
      ? entry.authorUid
      : undefined;

  if (updatedAt <= 0 || !normalizedTargetProfileId || !normalizedVoterProfileId) {
    return null;
  }

  return {
    day,
    targetProfileId: normalizedTargetProfileId,
    voterProfileId: normalizedVoterProfileId,
    updatedAt,
    authorUid,
  };
}

function parseChallengeBestVotes(value: unknown): CloudChallengeBestVotesByDay {
  const raw = asRecord(value);
  const next: CloudChallengeBestVotesByDay = {};

  for (const [dayKey, targetMapValue] of Object.entries(raw)) {
    const day = Number(dayKey);
    if (!Number.isFinite(day) || day <= 0) {
      continue;
    }

    const targetMap = asRecord(targetMapValue);
    for (const [targetProfileId, voterMapValue] of Object.entries(targetMap)) {
      const voterMap = asRecord(voterMapValue);
      for (const [voterProfileId, voteValue] of Object.entries(voterMap)) {
        const parsedVote = parseChallengeBestVote(
          Math.trunc(day),
          targetProfileId,
          voterProfileId,
          voteValue
        );
        if (!parsedVote) {
          continue;
        }

        const dayBucket = next[Math.trunc(day)] ?? {};
        const targetBucket = dayBucket[targetProfileId] ?? {};
        targetBucket[voterProfileId] = parsedVote;
        dayBucket[targetProfileId] = targetBucket;
        next[Math.trunc(day)] = dayBucket;
      }
    }
  }

  return next;
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

const CARNET_VISITE_MAX_TEXT_LENGTH = 20000;
// Le plafond métier (5 photos) s'applique par LIEU, toutes entrées/auteurs
// confondus, et est appliqué côté client (CarnetDeVisiteSection dans App.tsx)
// puisque les règles Firebase ne peuvent pas additionner les photos de
// plusieurs entrées. Ici, on ne garde qu'un plafond défensif par entrée pour
// ne jamais construire un objet local disproportionné à partir d'un
// snapshot cloud inattendu.
const CARNET_VISITE_MAX_PHOTOS_PER_ENTRY = 5;

function parseCarnetVisiteEntry(
  placeId: string,
  entryId: string,
  value: unknown
): CloudCarnetVisiteEntry | null {
  const entry = asRecord(value);
  const normalizedEntryId =
    typeof entry.entryId === "string" && entry.entryId.trim().length > 0 ? entry.entryId : entryId;
  const normalizedPlaceId =
    typeof entry.placeId === "string" && entry.placeId.trim().length > 0 ? entry.placeId : placeId;
  const authorProfileId =
    typeof entry.authorProfileId === "string" ? entry.authorProfileId.trim() : "";
  const authorSurnameSnapshot =
    typeof entry.authorSurnameSnapshot === "string" ? entry.authorSurnameSnapshot.trim() : "";
  const text = typeof entry.text === "string" ? entry.text : "";
  const createdAt = toFiniteNumber(entry.createdAt, 0);
  const updatedAt = toFiniteNumber(entry.updatedAt, createdAt);

  if (
    !authorProfileId ||
    !authorSurnameSnapshot ||
    !normalizedEntryId ||
    !normalizedPlaceId ||
    text.length > CARNET_VISITE_MAX_TEXT_LENGTH ||
    createdAt <= 0 ||
    updatedAt <= 0
  ) {
    return null;
  }

  const rawPhotos = asRecord(entry.photos);
  const photos: Record<string, string> = {};
  for (const [photoId, photoValue] of Object.entries(rawPhotos)) {
    if (Object.keys(photos).length >= CARNET_VISITE_MAX_PHOTOS_PER_ENTRY) {
      break;
    }
    if (typeof photoValue === "string" && photoValue.length > 0) {
      photos[photoId] = photoValue;
    }
  }

  const authorUid =
    typeof entry.authorUid === "string" && entry.authorUid.trim().length > 0
      ? entry.authorUid
      : undefined;

  return {
    entryId: normalizedEntryId,
    placeId: normalizedPlaceId,
    authorProfileId,
    authorSurnameSnapshot,
    text,
    photos,
    createdAt,
    updatedAt,
    authorUid,
  };
}

// Contrairement à parsePlaceComments, ne parse le carnet que d'UN lieu à la
// fois : appelé depuis observePlaceVisitLog, jamais depuis parseCloudSnapshot
// (le carnet de visite vit hors de families/$familyId, cf. CloudCarnetVisiteEntry).
function parseCarnetVisiteLog(placeId: string, value: unknown): CloudCarnetVisiteLog {
  const entryRecords = asRecord(value);
  const next: CloudCarnetVisiteLog = {};

  for (const [entryId, entryValue] of Object.entries(entryRecords)) {
    const parsed = parseCarnetVisiteEntry(placeId, entryId, entryValue);
    if (parsed) {
      next[parsed.entryId] = parsed;
    }
  }

  return next;
}

function parsePlaceVisibilityMap(value: unknown): Record<string, PlaceVisibilityState> {
  const raw = asRecord(value);
  const next: Record<string, PlaceVisibilityState> = {};

  for (const [placeId, candidate] of Object.entries(raw)) {
    if (candidate === "visible" || candidate === "hiddenByOwner") {
      next[placeId] = candidate;
    }
  }

  return next;
}

function parsePlaceSeenMap(value: unknown): Record<string, PlaceSeenState> {
  const raw = asRecord(value);
  const next: Record<string, PlaceSeenState> = {};

  for (const [placeId, candidate] of Object.entries(raw)) {
    if (candidate === "unseen" || candidate === "seen") {
      next[placeId] = candidate;
    }
  }

  return next;
}

const CONTENT_SOURCES: readonly ContentSource[] = [
  "places",
  "histoire",
  "geographie-economie",
  "culture-tradition",
];

function parseContentOverridePatch(value: unknown): ContentOverridePatch | null {
  const raw = asRecord(value);
  const patch: ContentOverridePatch = {};

  if (typeof raw.name === "string" && raw.name.trim().length > 0) {
    patch.name = raw.name;
  }
  if (typeof raw.shortDesc === "string" && raw.shortDesc.trim().length > 0) {
    patch.shortDesc = raw.shortDesc;
  }
  if (typeof raw.historyLabel === "string" && raw.historyLabel.trim().length > 0) {
    patch.historyLabel = raw.historyLabel;
  }
  if (typeof raw.history === "string" && raw.history.trim().length > 0) {
    patch.history = raw.history;
  }
  if (typeof raw.anecdotesLabel === "string" && raw.anecdotesLabel.trim().length > 0) {
    patch.anecdotesLabel = raw.anecdotesLabel;
  }
  if (Array.isArray(raw.anecdotes)) {
    const anecdotes = raw.anecdotes.filter(
      (entry): entry is string => typeof entry === "string" && entry.trim().length > 0
    );
    if (anecdotes.length > 0) {
      patch.anecdotes = anecdotes;
    }
  }

  return Object.keys(patch).length > 0 ? patch : null;
}

function parseContentOverrideMap(value: unknown): ContentOverrideMap {
  const raw = asRecord(value);
  const next: ContentOverrideMap = {};

  for (const source of CONTENT_SOURCES) {
    const itemsRaw = asRecord(raw[source]);
    const items: Record<string, ContentOverridePatch> = {};
    for (const [itemId, candidate] of Object.entries(itemsRaw)) {
      const patch = parseContentOverridePatch(candidate);
      if (patch) {
        items[itemId] = patch;
      }
    }
    if (Object.keys(items).length > 0) {
      next[source] = items;
    }
  }

  return next;
}

function toContentSource(value: unknown, fallback: ContentSource): ContentSource {
  return typeof value === "string" && (CONTENT_SOURCES as readonly string[]).includes(value)
    ? (value as ContentSource)
    : fallback;
}

// Carnet de visite pour les rubriques de contenu (Histoire, Culture et
// tradition, Géographie et économie) — même principe que
// parseCarnetVisiteEntry/parseCarnetVisiteLog ci-dessus pour les lieux, mais
// sans photos (demande explicite) et avec une clé composite [source][itemId]
// (cf. CloudCarnetContentEntry).
function parseCarnetContentEntry(
  source: ContentSource,
  itemId: string,
  entryId: string,
  value: unknown
): CloudCarnetContentEntry | null {
  const entry = asRecord(value);
  const normalizedEntryId =
    typeof entry.entryId === "string" && entry.entryId.trim().length > 0 ? entry.entryId : entryId;
  const normalizedSource = toContentSource(entry.source, source);
  const normalizedItemId =
    typeof entry.itemId === "string" && entry.itemId.trim().length > 0 ? entry.itemId : itemId;
  const authorProfileId =
    typeof entry.authorProfileId === "string" ? entry.authorProfileId.trim() : "";
  const authorSurnameSnapshot =
    typeof entry.authorSurnameSnapshot === "string" ? entry.authorSurnameSnapshot.trim() : "";
  const text = typeof entry.text === "string" ? entry.text : "";
  const createdAt = toFiniteNumber(entry.createdAt, 0);
  const updatedAt = toFiniteNumber(entry.updatedAt, createdAt);

  if (
    !authorProfileId ||
    !authorSurnameSnapshot ||
    !normalizedEntryId ||
    !normalizedItemId ||
    text.length > CARNET_VISITE_MAX_TEXT_LENGTH ||
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
    entryId: normalizedEntryId,
    source: normalizedSource,
    itemId: normalizedItemId,
    authorProfileId,
    authorSurnameSnapshot,
    text,
    createdAt,
    updatedAt,
    authorUid,
  };
}

// Contrairement à parseCarnetVisiteLog, ne parse le carnet que d'UN item de
// contenu à la fois (source + itemId) : appelé depuis observeContentVisitLog,
// jamais depuis parseCloudSnapshot (ce carnet vit hors de families/$familyId).
function parseCarnetContentLog(
  source: ContentSource,
  itemId: string,
  value: unknown
): CloudCarnetContentLog {
  const entryRecords = asRecord(value);
  const next: CloudCarnetContentLog = {};

  for (const [entryId, entryValue] of Object.entries(entryRecords)) {
    const parsed = parseCarnetContentEntry(source, itemId, entryId, entryValue);
    if (parsed) {
      next[parsed.entryId] = parsed;
    }
  }

  return next;
}

// Photos ajoutées par le propriétaire à un document existant (Documents et
// informations importants) — même plafond défensif que
// CARNET_VISITE_MAX_PHOTOS_PER_ENTRY ci-dessus, appliqué ici par document
// plutôt que par entrée de carnet (cf. CloudDocumentPhotoMap).
const DOCUMENT_PHOTOS_MAX_PER_ITEM = 5;

function parseDocumentPhotoMap(value: unknown): CloudDocumentPhotoMap {
  const raw = asRecord(value);
  const next: CloudDocumentPhotoMap = {};

  for (const [photoId, photoValue] of Object.entries(raw)) {
    if (Object.keys(next).length >= DOCUMENT_PHOTOS_MAX_PER_ITEM) {
      break;
    }
    if (typeof photoValue === "string" && photoValue.length > 0) {
      next[photoId] = photoValue;
    }
  }

  return next;
}

// Chat familial (story 28.1) : parse défensif de la conversation "Voyage",
// même esprit que les autres parseXxx ci-dessus (une entrée malformée est
// ignorée plutôt que de faire planter tout l'écran Chat).
function parseChatConversation(conversationId: string, value: unknown): CloudChatConversation | null {
  const raw = asRecord(value);
  const type = raw.type === "direct" ? "direct" : "group";
  const name = typeof raw.name === "string" ? raw.name : "";
  const isDefaultVoyage = raw.isDefaultVoyage === true;
  const createdAt = toFiniteNumber(raw.createdAt, 0);
  const createdByProfileId = typeof raw.createdByProfileId === "string" ? raw.createdByProfileId : "";

  if (!name || createdAt <= 0 || !createdByProfileId) {
    return null;
  }

  const memberProfileIds: Record<string, true> = {};
  for (const [profileId, member] of Object.entries(asRecord(raw.memberProfileIds))) {
    if (member === true) {
      memberProfileIds[profileId] = true;
    }
  }

  return {
    conversationId,
    type,
    name,
    isDefaultVoyage,
    memberProfileIds,
    createdAt,
    createdByProfileId,
  };
}

// Story 28.3 : parse défensif d'une réponse à un sondage, même esprit que
// les autres parseXxx de ce fichier — une entrée malformée est ignorée
// plutôt que de faire planter tout l'écran Chat.
function parseChatPollResponse(profileId: string, value: unknown): CloudChatPollResponse | null {
  const raw = asRecord(value);
  const responseProfileId = typeof raw.profileId === "string" ? raw.profileId : "";
  const responseValue = typeof raw.value === "string" ? raw.value : "";
  const updatedAt = toFiniteNumber(raw.updatedAt, 0);
  const authorUid = typeof raw.authorUid === "string" ? raw.authorUid : "";

  if (responseProfileId !== profileId || !responseValue || updatedAt <= 0 || !authorUid) {
    return null;
  }

  return { profileId: responseProfileId, value: responseValue, updatedAt, authorUid };
}

function parseChatPollResponses(value: unknown): CloudChatPollResponsesByProfile {
  const raw = asRecord(value);
  const next: CloudChatPollResponsesByProfile = {};

  for (const [profileId, responseValue] of Object.entries(raw)) {
    const parsed = parseChatPollResponse(profileId, responseValue);
    if (parsed) {
      next[profileId] = parsed;
    }
  }

  return next;
}

function parseChatMessage(
  conversationId: string,
  messageId: string,
  value: unknown
): CloudChatMessage | null {
  const raw = asRecord(value);
  const authorProfileId = typeof raw.authorProfileId === "string" ? raw.authorProfileId.trim() : "";
  const authorSurnameSnapshot =
    typeof raw.authorSurnameSnapshot === "string" ? raw.authorSurnameSnapshot.trim() : "";
  const authorUid = typeof raw.authorUid === "string" ? raw.authorUid.trim() : "";
  const createdAt = toFiniteNumber(raw.createdAt, 0);

  if (!authorProfileId || !authorSurnameSnapshot || !authorUid || createdAt <= 0) {
    return null;
  }

  // Sondage du propriétaire (story 28.3) : text reste "" pour ce kind, cf.
  // buildChatPollMessage dans chat.ts.
  if (raw.kind === "poll") {
    const pollType = raw.pollType === "oui_non" || raw.pollType === "libre" ? raw.pollType : null;
    const pollQuestion = typeof raw.pollQuestion === "string" ? raw.pollQuestion : "";

    if (!pollType || !pollQuestion) {
      return null;
    }

    return {
      messageId,
      conversationId,
      authorProfileId,
      authorSurnameSnapshot,
      authorUid,
      kind: "poll",
      text: "",
      createdAt,
      pollType,
      pollQuestion,
      pollClosed: raw.pollClosed === true,
      pollResponses: parseChatPollResponses(raw.pollResponses),
    };
  }

  const text = typeof raw.text === "string" ? raw.text : "";
  if (!text || text.length > CHAT_MESSAGE_MAX_LENGTH) {
    return null;
  }

  return {
    messageId,
    conversationId,
    authorProfileId,
    authorSurnameSnapshot,
    authorUid,
    kind: "text",
    text,
    createdAt,
  };
}

function parseChatMessagesLog(conversationId: string, value: unknown): CloudChatMessagesLog {
  const raw = asRecord(value);
  const next: CloudChatMessagesLog = {};

  for (const [messageId, messageValue] of Object.entries(raw)) {
    const parsed = parseChatMessage(conversationId, messageId, messageValue);
    if (parsed) {
      next[parsed.messageId] = parsed;
    }
  }

  return next;
}

// Crée la conversation de groupe "Voyage" si elle n'existe pas encore (à la
// création de la famille, ou à la première ouverture de la rubrique Chat si
// la famille existait déjà sans conversation), sinon y ajoute les profils
// proprietaire/utilisateur pas encore membres (nouveau profil créé après
// coup) — jamais de retrait ici, cf. computeMissingVoyageMembers et le
// commentaire sur deleteProfileFromCloud pour le seul cas de retrait prévu.
// Chemin hors de families/$familyId comme les autres ressources chargées à
// la demande ci-dessus (voir CloudChatConversation dans types/cloud.ts).
export async function ensureVoyageConversationMembers(
  database: Database,
  familyId: string,
  eligibleProfiles: readonly ChatMemberProfile[],
  createdByProfileId: string
): Promise<void> {
  const conversationRef = ref(database, `chatConversations/${familyId}/${VOYAGE_CONVERSATION_ID}`);
  const snapshot = await get(conversationRef);
  const existing = snapshot.exists() ? parseChatConversation(VOYAGE_CONVERSATION_ID, snapshot.val()) : null;

  if (!existing) {
    await set(conversationRef, buildVoyageConversationSeed(eligibleProfiles, createdByProfileId, Date.now()));
    return;
  }

  const eligibleProfileIds = eligibleProfiles
    .filter((profile) => profile.role !== "visiteur")
    .map((profile) => profile.profileId);
  const missingProfileIds = computeMissingVoyageMembers(existing, eligibleProfileIds);

  if (missingProfileIds.length === 0) {
    return;
  }

  const updates: Record<string, true> = {};
  for (const profileId of missingProfileIds) {
    updates[`chatConversations/${familyId}/${VOYAGE_CONVERSATION_ID}/memberProfileIds/${profileId}`] = true;
  }

  await update(ref(database), updates);
}

// Chargée à la demande pendant que la rubrique Chat est ouverte (jamais
// depuis observeFamilySnapshot) : messageLimit borne la fenêtre de messages
// récents chargés (cf. cas limite "historique long" de la story 28.1),
// augmentée côté appelant pour charger plus d'ancien historique.
export function observeChatMessages(
  database: Database,
  familyId: string,
  conversationId: string,
  messageLimit: number,
  onSnapshot: (messages: CloudChatMessagesLog) => void,
  onError?: () => void
): () => void {
  const messagesQuery = query(
    ref(database, `chatMessages/${familyId}/${conversationId}`),
    limitToLast(messageLimit)
  );
  return onValue(
    messagesQuery,
    (snapshot) => onSnapshot(parseChatMessagesLog(conversationId, snapshot.val())),
    () => onError?.()
  );
}

// Écriture réservée à l'auteur (cf. database.rules.*.json) : ni édition ni
// suppression dans ce périmètre (story 28.1, Hors périmètre), d'où un
// simple set une seule fois sur un messageId neuf.
export async function sendChatMessage(
  database: Database,
  familyId: string,
  message: CloudChatMessage
): Promise<void> {
  await set(ref(database, `chatMessages/${familyId}/${message.conversationId}/${message.messageId}`), message);
}

// Story 28.3 : réponse à un sondage, self-write réservé au profil concerné
// (cf. database.rules.*.json) — un simple `set()` suffit, contrairement à
// markChatConversationRead ci-dessous : la dernière réponse écrase toujours
// la précédente (règle métier "peut modifier sa réponse tant que le
// sondage n'est pas clos"), pas de progression monotone à garantir ici.
export async function submitChatPollResponse(
  database: Database,
  familyId: string,
  conversationId: string,
  messageId: string,
  response: CloudChatPollResponse
): Promise<void> {
  await set(
    ref(database, `chatMessages/${familyId}/${conversationId}/${messageId}/pollResponses/${response.profileId}`),
    response
  );
}

// Clôture d'un sondage par le propriétaire (story 28.3) : réservé côté
// règles Firebase au rôle proprietaire ; jamais réouvert dans ce périmètre
// (cf. Cas limites de la story).
export async function closeChatPoll(
  database: Database,
  familyId: string,
  conversationId: string,
  messageId: string
): Promise<void> {
  await set(ref(database, `chatMessages/${familyId}/${conversationId}/${messageId}/pollClosed`), true);
}

// Story 28.2 : liste de toutes les conversations de la famille (Voyage +
// groupes personnalisés + 1-to-1), chargée à la demande pour l'écran
// d'accueil du Chat — le filtrage "conversations dont je suis membre" est
// fait côté client (voir ChatHomeScreen), même modèle de confiance
// "famille" que placeVisitLogs/documentPhotos ci-dessus (cf. .read
// database.rules.*.json, inchangé par rapport à la story 28.1).
export function observeChatConversations(
  database: Database,
  familyId: string,
  onSnapshot: (conversations: CloudChatConversationsMap) => void,
  onError?: () => void
): () => void {
  return onValue(
    ref(database, `chatConversations/${familyId}`),
    (snapshot) => {
      const raw = asRecord(snapshot.val());
      const next: CloudChatConversationsMap = {};
      for (const [conversationId, value] of Object.entries(raw)) {
        const parsed = parseChatConversation(conversationId, value);
        if (parsed) {
          next[conversationId] = parsed;
        }
      }
      onSnapshot(next);
    },
    () => onError?.()
  );
}

// Création d'un groupe personnalisé ou d'une conversation 1-to-1 (story
// 28.2) : un seul `set()` sur un conversationId neuf, le créateur et les
// membres choisis étant déjà inclus dans `conversation.memberProfileIds`
// (cf. buildGroupConversationDraft/buildDirectConversationDraft dans
// chat.ts). Composition figée à la création (ajout de membre après coup
// hors périmètre v1).
export async function createChatConversation(
  database: Database,
  familyId: string,
  conversation: CloudChatConversation
): Promise<void> {
  await set(ref(database, `chatConversations/${familyId}/${conversation.conversationId}`), conversation);
}

// Renommage d'un groupe personnalisé ou d'une conversation 1-to-1 (story
// 28.2) : autorisé pour n'importe quel membre, refusé côté règles Firebase
// pour la conversation "Voyage" (isDefaultVoyage) — cf.
// canRenameChatConversation dans chat.ts pour la vérification côté client.
export async function renameChatConversation(
  database: Database,
  familyId: string,
  conversationId: string,
  name: string
): Promise<void> {
  await set(ref(database, `chatConversations/${familyId}/${conversationId}/name`), name);
}

// Un membre quitte un groupe personnalisé (jamais "Voyage", jamais une
// conversation 1-to-1, cf. canLeaveChatConversation) : retrait de sa seule
// propre clé, même mécanisme "self" que memberUids ailleurs dans les
// règles. L'historique des messages reste intact pour les membres restants.
export async function leaveChatConversation(
  database: Database,
  familyId: string,
  conversationId: string,
  profileId: string
): Promise<void> {
  await set(ref(database, `chatConversations/${familyId}/${conversationId}/memberProfileIds/${profileId}`), null);
}

// Badge de messages non lus (story 28.4) : parse défensif d'un marqueur
// "dernier passage", même esprit que les autres parseXxx ci-dessus.
function parseChatReadState(value: unknown): CloudChatReadState | null {
  const raw = asRecord(value);
  const lastReadAt = toFiniteNumber(raw.lastReadAt, 0);
  const authorUid = typeof raw.authorUid === "string" ? raw.authorUid : "";

  if (lastReadAt <= 0 || !authorUid) {
    return null;
  }

  return { lastReadAt, authorUid };
}

// Chargé en continu (contrairement à observeChatMessages/observeChatConversations
// ci-dessus, chargés à la demande pendant que le Chat est ouvert) : la
// pastille de non-lu sur l'icône de navigation doit rester à jour même
// quand la rubrique Chat n'est pas affichée, cf. useChatUnreadBadge.
export function observeChatReadState(
  database: Database,
  familyId: string,
  onSnapshot: (readState: CloudChatReadStateMap) => void,
  onError?: () => void
): () => void {
  return onValue(
    ref(database, `chatReadState/${familyId}`),
    (snapshot) => {
      const raw = asRecord(snapshot.val());
      const next: CloudChatReadStateMap = {};
      for (const [conversationId, byProfileValue] of Object.entries(raw)) {
        const byProfileRaw = asRecord(byProfileValue);
        const byProfile: Record<string, CloudChatReadState> = {};
        for (const [profileId, value] of Object.entries(byProfileRaw)) {
          const parsed = parseChatReadState(value);
          if (parsed) {
            byProfile[profileId] = parsed;
          }
        }
        if (Object.keys(byProfile).length > 0) {
          next[conversationId] = byProfile;
        }
      }
      onSnapshot(next);
    },
    () => onError?.()
  );
}

// Marque une conversation comme lue par un profil (story 28.4) : transaction
// plutôt qu'un simple `set()` pour garantir que `lastReadAt` ne recule
// jamais (cas limite multi-appareils, cf. shouldAdvanceChatReadState dans
// chat.ts) — retourner `undefined` depuis le callback annule l'écriture côté
// SDK Firebase sans erreur.
export async function markChatConversationRead(
  database: Database,
  familyId: string,
  conversationId: string,
  profileId: string,
  authorUid: string,
  lastReadAt: number
): Promise<void> {
  const stateRef = ref(database, `chatReadState/${familyId}/${conversationId}/${profileId}`);
  await runTransaction(stateRef, (current) => {
    const currentLastReadAt = toFiniteNumber(asRecord(current).lastReadAt, 0);
    if (!shouldAdvanceChatReadState(currentLastReadAt, lastReadAt)) {
      return; // no-op : ne recule jamais lastReadAt.
    }
    return { lastReadAt, authorUid };
  });
}

// --- Infos du groupe (epic 29) ------------------------------------------
//
// Même stratégie de stockage que le Chat ci-dessus (hors families/$familyId,
// chemins groupInfoItems/$familyId et groupInfoReadState/$familyId), mais un
// seul tableau partagé par famille (pas de conversations/membres à gérer).

// Parse défensif d'un item, même esprit que parseChatMessage ci-dessus : une
// entrée malformée est ignorée plutôt que de faire planter tout l'écran.
function parseGroupInfoItem(itemId: string, value: unknown): CloudGroupInfoItem | null {
  const raw = asRecord(value);
  const day = toFiniteNumber(raw.day, 0);
  const text = typeof raw.text === "string" ? raw.text : "";
  const authorProfileId = typeof raw.authorProfileId === "string" ? raw.authorProfileId.trim() : "";
  const authorSurnameSnapshot =
    typeof raw.authorSurnameSnapshot === "string" ? raw.authorSurnameSnapshot.trim() : "";
  const authorUid = typeof raw.authorUid === "string" ? raw.authorUid.trim() : "";
  const createdAt = toFiniteNumber(raw.createdAt, 0);

  if (
    day <= 0 ||
    !text ||
    text.length > GROUP_INFO_TEXT_MAX_LENGTH ||
    !authorProfileId ||
    !authorSurnameSnapshot ||
    !authorUid ||
    createdAt <= 0
  ) {
    return null;
  }

  const time = typeof raw.time === "string" && raw.time.length > 0 ? raw.time : null;

  const doneBy: Record<string, true> = {};
  for (const [profileId, done] of Object.entries(asRecord(raw.doneBy))) {
    if (done === true) {
      doneBy[profileId] = true;
    }
  }

  return {
    itemId,
    day,
    time,
    text,
    authorProfileId,
    authorSurnameSnapshot,
    authorUid,
    createdAt,
    pinned: raw.pinned === true,
    doneBy,
  };
}

function parseGroupInfoItemsLog(value: unknown): CloudGroupInfoItemsLog {
  const raw = asRecord(value);
  const next: CloudGroupInfoItemsLog = {};

  for (const [itemId, itemValue] of Object.entries(raw)) {
    const parsed = parseGroupInfoItem(itemId, itemValue);
    if (parsed) {
      next[parsed.itemId] = parsed;
    }
  }

  return next;
}

// Chargé en continu (contrairement à observeChatMessages, chargé à la
// demande) : le badge non-lu doit rester à jour même écran fermé, et
// l'écran "Infos du groupe" lui-même n'a pas de fenêtrage d'historique à
// gérer (contrairement au Chat, pas de messageLimit ici).
export function observeGroupInfoItems(
  database: Database,
  familyId: string,
  onSnapshot: (items: CloudGroupInfoItemsLog) => void,
  onError?: () => void
): () => void {
  return onValue(
    ref(database, `groupInfoItems/${familyId}`),
    (snapshot) => onSnapshot(parseGroupInfoItemsLog(snapshot.val())),
    () => onError?.()
  );
}

export async function addGroupInfoItem(
  database: Database,
  familyId: string,
  item: CloudGroupInfoItem
): Promise<void> {
  await set(ref(database, `groupInfoItems/${familyId}/${item.itemId}`), item);
}

// Édition (auteur ou propriétaire, cf. canEditGroupInfoItem dans
// groupInfo.ts, revérifié côté règles Firebase) : un `update()` multi-champs
// pour ne toucher que jour/heure/texte, jamais l'auteur ni les coches
// doneBy déjà posées par d'autres profils.
export async function updateGroupInfoItem(
  database: Database,
  familyId: string,
  itemId: string,
  patch: Partial<Pick<CloudGroupInfoItem, "day" | "time" | "text">>
): Promise<void> {
  const updates: Record<string, unknown> = {};
  const basePath = `groupInfoItems/${familyId}/${itemId}`;
  if (patch.day !== undefined) updates[`${basePath}/day`] = patch.day;
  if (patch.time !== undefined) updates[`${basePath}/time`] = patch.time;
  if (patch.text !== undefined) updates[`${basePath}/text`] = patch.text;
  await update(ref(database), updates);
}

// Suppression définitive (auteur ou propriétaire) : pas d'historique conservé
// dans ce périmètre, même choix que placeVisitLogs/leaveChatConversation.
export async function deleteGroupInfoItem(
  database: Database,
  familyId: string,
  itemId: string
): Promise<void> {
  await set(ref(database, `groupInfoItems/${familyId}/${itemId}`), null);
}

// Épingler/désépingler (réservé au propriétaire, cf. canPinGroupInfoItem) :
// champ à part, revérifié owner-only côté règles Firebase.
export async function setGroupInfoItemPinned(
  database: Database,
  familyId: string,
  itemId: string,
  pinned: boolean
): Promise<void> {
  await set(ref(database, `groupInfoItems/${familyId}/${itemId}/pinned`), pinned);
}

// Coche "fait/vu" individuelle par profil : self-write, chaque profil ne
// peut écrire que sa propre clé (cf. règles Firebase, pattern
// destinationSurvey plutôt que le modèle plus faible de chatReadState).
export async function setGroupInfoItemDone(
  database: Database,
  familyId: string,
  itemId: string,
  profileId: string,
  done: boolean
): Promise<void> {
  await set(ref(database, `groupInfoItems/${familyId}/${itemId}/doneBy/${profileId}`), done ? true : null);
}

// Badge non-lu (même principe que chatReadState) : parse défensif d'un
// marqueur "dernier passage".
function parseGroupInfoReadState(value: unknown): CloudGroupInfoReadState | null {
  const raw = asRecord(value);
  const lastReadAt = toFiniteNumber(raw.lastReadAt, 0);
  const authorUid = typeof raw.authorUid === "string" ? raw.authorUid : "";

  if (lastReadAt <= 0 || !authorUid) {
    return null;
  }

  return { lastReadAt, authorUid };
}

// Chargé en continu (même raison que observeChatReadState) : la pastille de
// non-lu sur l'icône de navigation doit rester à jour même quand la rubrique
// n'est pas affichée, cf. useGroupInfoUnreadBadge. Pas de dimension
// conversation ici (un seul tableau partagé), d'où un niveau de moins que
// chatReadState.
export function observeGroupInfoReadState(
  database: Database,
  familyId: string,
  onSnapshot: (readState: CloudGroupInfoReadStateByProfile) => void,
  onError?: () => void
): () => void {
  return onValue(
    ref(database, `groupInfoReadState/${familyId}`),
    (snapshot) => {
      const raw = asRecord(snapshot.val());
      const next: CloudGroupInfoReadStateByProfile = {};
      for (const [profileId, value] of Object.entries(raw)) {
        const parsed = parseGroupInfoReadState(value);
        if (parsed) {
          next[profileId] = parsed;
        }
      }
      onSnapshot(next);
    },
    () => onError?.()
  );
}

// Marque le tableau comme lu par un profil : transaction pour garantir que
// `lastReadAt` ne recule jamais (même cas limite multi-appareils que
// markChatConversationRead ci-dessus).
export async function markGroupInfoRead(
  database: Database,
  familyId: string,
  profileId: string,
  authorUid: string,
  lastReadAt: number
): Promise<void> {
  const stateRef = ref(database, `groupInfoReadState/${familyId}/${profileId}`);
  await runTransaction(stateRef, (current) => {
    const currentLastReadAt = toFiniteNumber(asRecord(current).lastReadAt, 0);
    if (!shouldAdvanceGroupInfoReadState(currentLastReadAt, lastReadAt)) {
      return; // no-op : ne recule jamais lastReadAt.
    }
    return { lastReadAt, authorUid };
  });
}

function normalizePlaceDays(value: unknown): number[] {
  const rawValues = Array.isArray(value)
    ? value
    : value && typeof value === "object"
      ? Object.entries(value as Record<string, unknown>)
          .filter(([key]) => /^\d+$/.test(key))
          .sort(([left], [right]) => Number(left) - Number(right))
          .map(([, day]) => day)
      : [];

  return Array.from(
    new Set(
      rawValues
        .map((day) => (typeof day === "number" && Number.isFinite(day) ? Math.trunc(day) : Number.NaN))
        .filter((day) => Number.isFinite(day) && day > 0)
    )
  ).sort((left, right) => left - right);
}

function parsePlaceDayOverrides(value: unknown): PlaceDayOverrideMap {
  const raw = asRecord(value);
  const next: PlaceDayOverrideMap = {};

  for (const [placeId, candidate] of Object.entries(raw)) {
    const valueRecord = asRecord(candidate);
    const days = normalizePlaceDays(valueRecord.days ?? candidate);
    if (days.length > 0) {
      next[placeId] = days;
    }
  }

  return next;
}

function normalizeDayOrderByDay(value: unknown, allowedDays: number[]): Record<number, number> {
  const raw = asRecord(value);
  const allowedDaySet = new Set(allowedDays);
  const next: Record<number, number> = {};

  for (const [dayKey, positionCandidate] of Object.entries(raw)) {
    const day = Number(dayKey);
    if (!Number.isFinite(day) || !allowedDaySet.has(day)) {
      continue;
    }
    if (typeof positionCandidate !== "number" || !Number.isFinite(positionCandidate)) {
      continue;
    }
    const normalizedPosition = Math.trunc(positionCandidate);
    if (normalizedPosition <= 0) {
      continue;
    }
    next[Math.trunc(day)] = normalizedPosition;
  }

  return next;
}

function parsePlaceDayOrderOverrides(value: unknown): PlaceDayOrderOverrideMap {
  const raw = asRecord(value);
  const next: PlaceDayOrderOverrideMap = {};

  for (const [placeId, candidate] of Object.entries(raw)) {
    const candidateRecord = asRecord(candidate);
    const days = normalizePlaceDays(candidateRecord.days ?? candidate);
    const orderByDay = normalizeDayOrderByDay(
      candidateRecord.orderByDay ?? candidateRecord.dayOrderByDay,
      days
    );
    if (Object.keys(orderByDay).length > 0) {
      next[placeId] = orderByDay;
    }
  }

  return next;
}

function parseDocumentVisibilityMap(value: unknown): Record<string, DocumentVisibilityState> {
  const raw = asRecord(value);
  const next: Record<string, DocumentVisibilityState> = {};

  for (const [documentId, candidate] of Object.entries(raw)) {
    if (candidate === "visible" || candidate === "hiddenByOwner") {
      next[documentId] = candidate;
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
  const documentCatalogAdditionRecords = asRecord(root.documentCatalogAdditions);
  const documentCatalogEditRecords = asRecord(root.documentCatalogEdits);
  const documentCatalogRemovalRecords = asRecord(root.documentCatalogRemovals);
  const placeCatalogAdditionRecords = asRecord(root.placeCatalogAdditions);
  const placeCommentRecords = asRecord(root.placeComments);
  const destinationSurveyRecords = parseDestinationSurvey(root.destinationSurvey);
  const challengeReactionRecords = parseChallengeReactions(root.challengeReactions);
  const challengeBestVoteRecords = parseChallengeBestVotes(root.challengeBestVotes);
  const gameResultRecords = asRecord(root.gameResults);
  const gameProgressRecords = asRecord(root.gameProgress);
  const crosswordProgressRecords = asRecord(root.crosswordProgress);
  const candyCrushChallengeRecords = asRecord(root.candyCrushChallenge);
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
      candyCrushChallenge: parseCandyCrushChallenge(candyCrushChallengeRecords[profileId]),
      destinationSurveyVote: destinationSurveyRecords[profileId] ?? null,
      launchGateCompletedCycle: toNonNegativeInteger(asRecord(value).launchGateCompletedCycle),
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
    gameScoring: parseGameScoring(root.gameScoring),
    ownerGlobalChecklistAdditions: parseChecklistCustomItems(ownerGlobalAdditionRecords),
    ownerGlobalChecklistRemovals: parseChecklistRemovals(ownerGlobalRemovalRecords),
    ownerGlobalDocumentAdditions: parseOwnerGlobalDocumentAdditions(documentCatalogAdditionRecords),
    ownerGlobalDocumentEdits: parseOwnerGlobalDocumentEdits(documentCatalogEditRecords),
    ownerGlobalDocumentRemovals: parseChecklistRemovals(documentCatalogRemovalRecords),
    ownerGlobalPlaceAdditions: parseOwnerGlobalPlaceAdditions(placeCatalogAdditionRecords),
    placeComments: parsePlaceComments(placeCommentRecords),
    placeVisibilityMap: parsePlaceVisibilityMap(root.placeVisibilityMap),
    placeSeenMap: parsePlaceSeenMap(root.placeSeenMap),
    challengeReactions: challengeReactionRecords,
    challengeBestVotes: challengeBestVoteRecords,
    placeDayOverrides: parsePlaceDayOverrides(root.placeDayOverrides),
    placeDayOrderOverrides: parsePlaceDayOrderOverrides(root.placeDayOverrides),
    documentVisibilityMap: parseDocumentVisibilityMap(root.documentVisibilityMap),
    contentOverrides: parseContentOverrideMap(root.contentOverrides),
    destinationSurvey: destinationSurveyRecords,
    gameDayOverrides: parseGameDayOverrides(root.gameDayOverrides),
    launchGateCycle: toNonNegativeInteger(root.launchGateCycle),
    launchGateCompletedCycleByProfile: Object.fromEntries(
      Object.entries(profiles).map(([profileId, record]) => [
        profileId,
        toNonNegativeInteger(record.launchGateCompletedCycle),
      ])
    ),
    crosswordProgress: Object.fromEntries(
      Object.entries(crosswordProgressRecords).map(([profileId, progress]) => [
        profileId,
        normalizeCrosswordProgress(progress),
      ])
    ),
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

// Carnet de visite d'UN lieu : chemin séparé de families/$familyId (racine
// placeVisitLogs, cf. database.rules.*.json) pour que ce onValue ne soit
// souscrit que pendant que la fiche de ce lieu est affichée (PlaceScreen),
// au lieu d'être retéléchargé par observeFamilySnapshot à chaque changement
// fait par n'importe qui dans la famille sur n'importe quel lieu. À appeler
// dans un effet React nettoyé au démontage / changement de placeId.
export function observePlaceVisitLog(
  database: Database,
  familyId: string,
  placeId: string,
  onSnapshot: (log: CloudCarnetVisiteLog) => void,
  onError?: () => void
): () => void {
  const logRef = ref(database, `placeVisitLogs/${familyId}/${placeId}`);
  return onValue(
    logRef,
    (snapshot) => onSnapshot(parseCarnetVisiteLog(placeId, snapshot.val())),
    () => onError?.()
  );
}

// Créer/modifier sa propre entrée de carnet (les règles n'autorisent l'écriture
// qu'à l'auteur, cf. authorUid dans database.rules.*.json). Écriture à chemin
// unique, complètement isolée de pushCloudSnapshot : un problème de règles pas
// encore déployées sur ce chemin n'impacte jamais le reste de la synchro.
export async function upsertPlaceVisitLogEntry(
  database: Database,
  familyId: string,
  entry: CloudCarnetVisiteEntry
): Promise<void> {
  await set(ref(database, `placeVisitLogs/${familyId}/${entry.placeId}/${entry.entryId}`), entry);
}

// Supprimer sa propre entrée de carnet (même logique que la suppression d'un
// commentaire : écrire null sur son propre nœud).
export async function deletePlaceVisitLogEntry(
  database: Database,
  familyId: string,
  placeId: string,
  entryId: string
): Promise<void> {
  await set(ref(database, `placeVisitLogs/${familyId}/${placeId}/${entryId}`), null);
}

// Même principe qu'observePlaceVisitLog/upsertPlaceVisitLogEntry/
// deletePlaceVisitLogEntry ci-dessus, pour le carnet de visite des rubriques
// de contenu (Histoire, Culture et tradition, Géographie et économie) :
// chemin séparé contentVisitLogs/$familyId/$source/$itemId, chargé à la
// demande, sans photos.
export function observeContentVisitLog(
  database: Database,
  familyId: string,
  source: ContentSource,
  itemId: string,
  onSnapshot: (log: CloudCarnetContentLog) => void,
  onError?: () => void
): () => void {
  const logRef = ref(database, `contentVisitLogs/${familyId}/${source}/${itemId}`);
  return onValue(
    logRef,
    (snapshot) => onSnapshot(parseCarnetContentLog(source, itemId, snapshot.val())),
    () => onError?.()
  );
}

export async function upsertContentVisitLogEntry(
  database: Database,
  familyId: string,
  entry: CloudCarnetContentEntry
): Promise<void> {
  await set(
    ref(database, `contentVisitLogs/${familyId}/${entry.source}/${entry.itemId}/${entry.entryId}`),
    entry
  );
}

export async function deleteContentVisitLogEntry(
  database: Database,
  familyId: string,
  source: ContentSource,
  itemId: string,
  entryId: string
): Promise<void> {
  await set(ref(database, `contentVisitLogs/${familyId}/${source}/${itemId}/${entryId}`), null);
}

// Photos ajoutées par le propriétaire à un document existant (Documents et
// informations importants) : chemin séparé documentPhotos/$familyId/$documentId
// (hors de families/$familyId, même raison qu'observePlaceVisitLog ci-dessus :
// ne pas retélécharger toutes les photos de tous les documents à chaque
// synchro famille), chargé à la demande pendant que la fiche "Docs" de ce
// document est affichée (cf. DocumentsScreen dans App.tsx).
export function observeDocumentPhotos(
  database: Database,
  familyId: string,
  documentId: string,
  onSnapshot: (photos: CloudDocumentPhotoMap) => void,
  onError?: () => void
): () => void {
  const photosRef = ref(database, `documentPhotos/${familyId}/${documentId}`);
  return onValue(
    photosRef,
    (snapshot) => onSnapshot(parseDocumentPhotoMap(snapshot.val())),
    () => onError?.()
  );
}

// Écriture réservée au propriétaire (cf. database.rules.*.json) : contrairement
// au carnet de visite, il n'y a qu'un seul auteur possible pour ces photos.
export async function upsertDocumentPhoto(
  database: Database,
  familyId: string,
  documentId: string,
  photoId: string,
  dataUri: string
): Promise<void> {
  await set(ref(database, `documentPhotos/${familyId}/${documentId}/${photoId}`), dataUri);
}

export async function deleteDocumentPhoto(
  database: Database,
  familyId: string,
  documentId: string,
  photoId: string
): Promise<void> {
  await set(ref(database, `documentPhotos/${familyId}/${documentId}/${photoId}`), null);
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
    [`candyCrushChallenge/${payload.profileId}`]: payload.candyCrushChallenge,
  };

  if (payload.crosswordProgress !== undefined) {
    updates[`crosswordProgress/${payload.profileId}`] = payload.crosswordProgress;
  }

  if (payload.launchGateCompletedCycleForProfile === null) {
    updates[`profiles/${payload.profileId}/launchGateCompletedCycle`] = null;
  } else if (typeof payload.launchGateCompletedCycleForProfile === "number") {
    updates[`profiles/${payload.profileId}/launchGateCompletedCycle`] = toNonNegativeInteger(
      payload.launchGateCompletedCycleForProfile
    );
  }

  // Commentaires: n'écrire que les branches auteur courant pour respecter la
  // règle RTDB "author-only" et éviter les PERMISSION_DENIED sur les avis
  // des autres membres de la famille. Un profil peut avoir plusieurs entrées
  // (clé profileId pour le premier avis, profileId-timestamp pour les suivants).
  for (const [placeId, commentsById] of Object.entries(payload.placeComments)) {
    for (const [commentId, comment] of Object.entries(commentsById)) {
      const normalizedAuthorUid =
        typeof comment.authorUid === "string" && comment.authorUid.trim().length > 0
          ? comment.authorUid
          : payload.actorUid;

      if (
        comment.authorProfileId === payload.profileId &&
        normalizedAuthorUid === payload.actorUid
      ) {
        updates[`placeComments/${placeId}/${commentId}`] = {
          ...comment,
          authorUid: normalizedAuthorUid,
        };
      }
    }
  }

  if (payload.challengeReactions !== undefined) {
    const desiredReactionPaths = new Set<string>();

    for (const [dayKey, targetMap] of Object.entries(payload.challengeReactions)) {
      const day = Number(dayKey);
      if (!Number.isFinite(day) || day <= 0) {
        continue;
      }

      for (const [targetProfileId, reactionsByProfile] of Object.entries(targetMap ?? {})) {
        for (const [reactorProfileId, reaction] of Object.entries(reactionsByProfile ?? {})) {
          const normalizedAuthorUid =
            typeof reaction.authorUid === "string" && reaction.authorUid.trim().length > 0
              ? reaction.authorUid
              : payload.actorUid;

          if (
            reaction.reactorProfileId === payload.profileId &&
            reactorProfileId === payload.profileId &&
            normalizedAuthorUid === payload.actorUid
          ) {
            const reactionPath =
              `challengeReactions/${Math.trunc(day)}/${targetProfileId}/${reactorProfileId}`;
            desiredReactionPaths.add(reactionPath);
            updates[reactionPath] = {
              ...reaction,
              authorUid: normalizedAuthorUid,
            };
          }
        }
      }
    }

    try {
      const existingReactionsSnapshot = await get(
        ref(database, `families/${familyId}/challengeReactions`)
      );
      const existingReactions = parseChallengeReactions(existingReactionsSnapshot.val());

      for (const [dayKey, targetMap] of Object.entries(existingReactions)) {
        const day = Number(dayKey);
        if (!Number.isFinite(day) || day <= 0) {
          continue;
        }

        for (const [targetProfileId, reactionsByProfile] of Object.entries(targetMap ?? {})) {
          for (const [reactorProfileId, reaction] of Object.entries(reactionsByProfile ?? {})) {
            if (
              reaction.reactorProfileId === payload.profileId &&
              reactorProfileId === payload.profileId
            ) {
              const reactionPath =
                `challengeReactions/${Math.trunc(day)}/${targetProfileId}/${reactorProfileId}`;
              if (!desiredReactionPaths.has(reactionPath)) {
                updates[reactionPath] = null;
              }
            }
          }
        }
      }
    } catch {
      // L'absence de lecture cloud ne doit pas bloquer le push global.
    }
  }

  // Vote "meilleur défi/commentaire du jour" (trophée) : même logique de
  // synchro que challengeReactions ci-dessus — chaque appareil ne pousse et
  // ne peut effacer que les votes dont IL est l'auteur (voterProfileId ===
  // payload.profileId, avec le bon actorUid), jamais ceux des autres.
  if (payload.challengeBestVotes !== undefined) {
    const desiredBestVotePaths = new Set<string>();

    for (const [dayKey, targetMap] of Object.entries(payload.challengeBestVotes)) {
      const day = Number(dayKey);
      if (!Number.isFinite(day) || day <= 0) {
        continue;
      }

      for (const [targetProfileId, votesByProfile] of Object.entries(targetMap ?? {})) {
        for (const [voterProfileId, vote] of Object.entries(votesByProfile ?? {})) {
          const normalizedAuthorUid =
            typeof vote.authorUid === "string" && vote.authorUid.trim().length > 0
              ? vote.authorUid
              : payload.actorUid;

          if (
            vote.voterProfileId === payload.profileId &&
            voterProfileId === payload.profileId &&
            normalizedAuthorUid === payload.actorUid
          ) {
            const bestVotePath =
              `challengeBestVotes/${Math.trunc(day)}/${targetProfileId}/${voterProfileId}`;
            desiredBestVotePaths.add(bestVotePath);
            updates[bestVotePath] = {
              ...vote,
              authorUid: normalizedAuthorUid,
            };
          }
        }
      }
    }

    try {
      const existingBestVotesSnapshot = await get(
        ref(database, `families/${familyId}/challengeBestVotes`)
      );
      const existingBestVotes = parseChallengeBestVotes(existingBestVotesSnapshot.val());

      for (const [dayKey, targetMap] of Object.entries(existingBestVotes)) {
        const day = Number(dayKey);
        if (!Number.isFinite(day) || day <= 0) {
          continue;
        }

        for (const [targetProfileId, votesByProfile] of Object.entries(targetMap ?? {})) {
          for (const [voterProfileId, vote] of Object.entries(votesByProfile ?? {})) {
            if (
              vote.voterProfileId === payload.profileId &&
              voterProfileId === payload.profileId
            ) {
              const bestVotePath =
                `challengeBestVotes/${Math.trunc(day)}/${targetProfileId}/${voterProfileId}`;
              if (!desiredBestVotePaths.has(bestVotePath)) {
                updates[bestVotePath] = null;
              }
            }
          }
        }
      }
    } catch {
      // L'absence de lecture cloud ne doit pas bloquer le push global.
    }
  }

  if (payload.resetDestinationSurvey) {
    for (const profile of normalizedFamilyState.profiles) {
      updates[`destinationSurvey/${profile.id}`] = null;
    }
  }

  if (payload.profileDestinationSurveyVote && payload.phase === "before" && !payload.resetDestinationSurvey) {
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
      const normalizedQuestion = payload.profileRecoveryQuestion?.trim() || null;
      // Only write question/answer when we have data — never overwrite with null
      // (prevents auto-sync from erasing recovery data when local state is empty).
      if (normalizedQuestion !== null) {
        updates[`profiles/${payload.profileId}/recoveryQuestion`] = normalizedQuestion;
        updates[`profiles/${payload.profileId}/recoveryAnswer`] =
          payload.profileRecoveryAnswer?.trim() || null;
      }
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
    const normalizedOwnerCodeHash = payload.ownerCodeHash.trim();
    if (isSha256Hash(normalizedOwnerCodeHash)) {
      updates.ownerCodeHash = normalizedOwnerCodeHash;
    }
    updates.ownerCodePlain = payload.ownerCodePlain?.trim() || null;
    if (
      typeof payload.travelerCodeHash === "string" &&
      isSha256Hash(payload.travelerCodeHash.trim())
    ) {
      updates.travelerCodeHash = payload.travelerCodeHash.trim();
      updates.travelerCodePlain = payload.travelerCodePlain?.trim() || null;
    }
    // Shared travel phase and launch gate cycle are intentionally NOT written
    // from generic profile sync updates. They are owner-critical coordination
    // fields and must only be changed through pushFamilyPhaseChange to avoid
    // cross-device race conditions (owner device A writes "during", owner
    // device B still on stale "before" overwrites it, causing UI flicker).
    // On n'écrit jamais explicitement null ici : tant qu'aucune fonctionnalité
    // "effacer la date" n'existe, une valeur locale vide/nulle ne doit jamais
    // écraser une date déjà enregistrée dans Firebase (voir bug corrigé :
    // une race condition côté client pouvait remettre l'état local à null,
    // et cette ligne l'aurait alors silencieusement propagé au serveur).
    if (payload.tripStartDate) {
      updates.tripStartDate = payload.tripStartDate;
    }
    updates.gameScoring = payload.gameScoring;
    updates.checklistCatalogAdditions = payload.ownerGlobalChecklistAdditions.reduce<Record<string, ChecklistCustomItem>>((acc, item) => {
      acc[item.id] = item;
      return acc;
    }, {});
    updates.checklistCatalogRemovals = payload.ownerGlobalChecklistRemovals;
    if (payload.placeVisibilityMap) {
      updates.placeVisibilityMap = payload.placeVisibilityMap;
    }
    if (payload.placeSeenMap) {
      updates.placeSeenMap = payload.placeSeenMap;
    }
    if (payload.placeDayOverrides) {
      // Un seul chemin `placeDayOverrides` doit être écrit par update() : le
      // combiner avec un sous-chemin `placeDayOverrides/{id}/orderByDay` fait
      // échouer TOUT l'update (Firebase refuse qu'un chemin soit l'ancêtre
      // d'un autre chemin dans le même appel). On fusionne donc l'ordre dans
      // le même objet que les jours avant d'écrire une clé unique.
      const orderOverrides = payload.placeDayOrderOverrides ?? {};
      const mergedDayOverrides: Record<string, unknown> = {};
      for (const [placeId, days] of Object.entries(payload.placeDayOverrides)) {
        const orderByDay = orderOverrides[placeId];
        mergedDayOverrides[placeId] =
          orderByDay && Object.keys(orderByDay).length > 0 ? { days, orderByDay } : days;
      }
      updates.placeDayOverrides = mergedDayOverrides;
    }
    if (payload.documentVisibilityMap) {
      updates.documentVisibilityMap = payload.documentVisibilityMap;
    }
    if (payload.contentOverrides) {
      updates.contentOverrides = payload.contentOverrides;
    }
    if (payload.ownerGlobalDocumentAdditions) {
      updates.documentCatalogAdditions = payload.ownerGlobalDocumentAdditions.reduce<Record<string, TravelDocument>>((acc, document) => {
        acc[document.id] = sanitizeTravelDocumentForFirebase(document);
        return acc;
      }, {});
    }
    if (payload.ownerGlobalDocumentEdits) {
      updates.documentCatalogEdits = Object.fromEntries(
        Object.entries(payload.ownerGlobalDocumentEdits).map(([documentId, document]) => [
          documentId,
          sanitizeTravelDocumentForFirebase(document),
        ])
      );
    }
    if (payload.ownerGlobalDocumentRemovals) {
      updates.documentCatalogRemovals = payload.ownerGlobalDocumentRemovals;
    }
    if (payload.ownerGlobalPlaceAdditions) {
      updates.placeCatalogAdditions = payload.ownerGlobalPlaceAdditions.reduce<Record<string, Place>>((acc, place) => {
        acc[place.id] = sanitizePlaceForFirebase(place);
        return acc;
      }, {});
    }
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

export async function saveCrosswordProgress(
  database: Database,
  familyId: string,
  profileId: string,
  progress: CloudCrosswordProgress
): Promise<void> {
  await set(ref(database, `families/${familyId}/crosswordProgress/${profileId}`), progress);
}

export async function pushPlaceVisibility(
  database: Database,
  familyId: string,
  placeId: string,
  visibility: PlaceVisibilityState | null
): Promise<void> {
  await update(ref(database, familyPath(familyId)), {
    [`placeVisibilityMap/${placeId}`]: visibility,
  });
}

// Statut "vu / pas vu" posé par le propriétaire sur un lieu (cf. PlaceSeenState).
// null = retour à "unseen" (valeur par défaut, jamais persistée explicitement),
// même logique que pushPlaceVisibility ci-dessus.
export async function pushPlaceSeen(
  database: Database,
  familyId: string,
  placeId: string,
  seen: PlaceSeenState | null
): Promise<void> {
  await update(ref(database, familyPath(familyId)), {
    [`placeSeenMap/${placeId}`]: seen,
  });
}

export async function pushContentOverride(
  database: Database,
  familyId: string,
  source: ContentSource,
  itemId: string,
  patch: ContentOverridePatch | null
): Promise<void> {
  await update(ref(database, familyPath(familyId)), {
    [`contentOverrides/${source}/${itemId}`]: patch,
  });
}

export async function pushPlaceDayOverride(
  database: Database,
  familyId: string,
  placeId: string,
  days: number[] | null,
  dayOrderByDay?: Record<number, number> | null
): Promise<void> {
  const normalizedDays = days
    ? Array.from(
        new Set(
          days
            .map((day) => (typeof day === "number" && Number.isFinite(day) ? Math.trunc(day) : Number.NaN))
            .filter((day) => Number.isFinite(day) && day > 0)
        )
      ).sort((left, right) => left - right)
    : null;

  const normalizedDayOrderByDay = normalizedDays
    ? Object.fromEntries(
        Object.entries(dayOrderByDay ?? {})
          .map(([dayKey, position]) => [Number(dayKey), position])
          .filter(
            ([day, position]) =>
              Number.isFinite(day) &&
              normalizedDays.includes(Math.trunc(day)) &&
              typeof position === "number" &&
              Number.isFinite(position) &&
              Math.trunc(position) > 0
          )
          .map(([day, position]) => [Math.trunc(day), Math.trunc(position as number)])
      )
    : {};

  const placeOverrideValue = normalizedDays
    ? {
        days: normalizedDays,
        ...(Object.keys(normalizedDayOrderByDay).length > 0
          ? { orderByDay: normalizedDayOrderByDay }
          : {}),
      }
    : null;

  await update(ref(database, familyPath(familyId)), {
    [`placeDayOverrides/${placeId}`]: placeOverrideValue,
  });
}

export async function pushFamilyPhaseChange(
  database: Database,
  familyId: string,
  payload: {
    phase: TravelPhase;
    launchGateCycle?: number;
    resetDestinationSurvey?: boolean;
    profileIdsForSurveyReset?: string[];
  }
): Promise<void> {
  const updates: Record<string, unknown> = {
    phase: payload.phase,
    updatedAt: Date.now(),
  };

  if (typeof payload.launchGateCycle === "number") {
    updates.launchGateCycle = toNonNegativeInteger(payload.launchGateCycle);
  }

  if (payload.resetDestinationSurvey && Array.isArray(payload.profileIdsForSurveyReset)) {
    for (const profileId of payload.profileIdsForSurveyReset) {
      if (typeof profileId === "string" && profileId.trim().length > 0) {
        updates[`destinationSurvey/${profileId}`] = null;
      }
    }
  }

  await update(ref(database, familyPath(familyId)), updates);
}

export async function pushTripStartDate(
  database: Database,
  familyId: string,
  tripStartDate: string
): Promise<void> {
  await update(ref(database, familyPath(familyId)), {
    tripStartDate,
    updatedAt: Date.now(),
  });
}

export async function pushGameScoring(
  database: Database,
  familyId: string,
  scoring: GameScoringConfig
): Promise<void> {
  await update(ref(database, familyPath(familyId)), {
    gameScoring: scoring,
  });
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
    [`families/${familyId}/crosswordProgress/${profileIdToDelete}`]: null,
    [`families/${familyId}/candyCrushChallenge/${profileIdToDelete}`]: null,
    [`families/${familyId}/updatedAt`]: Date.now(),
    // Story 28.1, cas limite : un profil supprimé est simplement retiré de
    // memberProfileIds de la conversation "Voyage" (ses messages passés
    // restent visibles avec leur authorSurnameSnapshot figé). Autorisé par
    // les règles Firebase uniquement parce que le profil est supprimé dans
    // cette même écriture atomique (cf. database.rules.*.json).
    [`chatConversations/${familyId}/${VOYAGE_CONVERSATION_ID}/memberProfileIds/${profileIdToDelete}`]: null,
  };

  // Story 28.2, cas limite : même retrait pour les groupes personnalisés et
  // conversations 1-to-1 dont le profil supprimé est membre (le groupe
  // reste consultable en lecture seule par les membres restants, historique
  // conservé). "Voyage" est déjà traité ci-dessus, pas la peine de le
  // revisiter ici.
  const conversationsSnapshot = await get(ref(database, `chatConversations/${familyId}`));
  const conversationsRaw = asRecord(conversationsSnapshot.val());
  for (const [conversationId, value] of Object.entries(conversationsRaw)) {
    if (conversationId === VOYAGE_CONVERSATION_ID) {
      continue;
    }
    const memberProfileIds = asRecord(asRecord(value).memberProfileIds);
    if (memberProfileIds[profileIdToDelete] === true) {
      updates[`chatConversations/${familyId}/${conversationId}/memberProfileIds/${profileIdToDelete}`] = null;
    }
  }

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
  currentChallengeReactionsByDay: CloudChallengeReactionsByDay,
  currentChallengeBestVotesByDay: CloudChallengeBestVotesByDay,
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

  if (day === undefined) {
    updates[`families/${familyId}/challengeReactions`] = null;
  } else if (currentChallengeReactionsByDay[day]) {
    updates[`families/${familyId}/challengeReactions/${day}`] = null;
  }

  if (day === undefined) {
    updates[`families/${familyId}/challengeBestVotes`] = null;
  } else if (currentChallengeBestVotesByDay[day]) {
    updates[`families/${familyId}/challengeBestVotes/${day}`] = null;
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
