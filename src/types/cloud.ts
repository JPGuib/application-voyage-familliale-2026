import type { Role, SharedFamilyState } from "../app/owner-policy";
import type { GameScoringConfig } from "../content/game";
import type { TravelDocument } from "../content/documents";
import type { Place } from "../content/places";

export type TravelPhase = "before" | "during";

export type ChecklistState = Record<string, boolean>;

export type ChecklistCustomItem = {
  id: string;
  label: string;
  categoryId: string;
  genderTargets?: "all" | "male" | "female";
  householdRoleTargets?: "all" | "parent" | "child";
  ownerOnly?: boolean;
  visibleToProfileId?: string;
};

export type ChecklistRemovalState = Record<string, boolean>;

export type CloudGameHistoryEntry = {
  day: number;
  location: string;
  quizScore: number;
  correctCount: number;
  riddleSolved: boolean;
  // Réponse (texte brut) donnée par le joueur à l'énigme du jour ; facultatif
  // pour rester compatible avec les entrées enregistrées avant l'ajout de ce
  // champ (cf. game-results.ts, même logique côté local).
  riddleAnswer?: string;
  challengeDone: boolean;
  challengeResponse?: string;
  durationSec: number;
  totalScore: number;
  completedAt: string;
};

// Progression en cours (session non terminée) du jeu du jour, pour reprendre
// après une fermeture/rechargement de l'appli, y compris en plein quiz
// ("playing", survit à un F5). Null = aucune session en cours pour ce
// profil. Jamais "done" : le récap du quiz bascule directement vers
// l'énigme si on quitte l'écran (voir App.tsx, goToScreen).
export type CloudGameProgress = {
  day: number;
  phase: "playing" | "riddle" | "challenge";
  answers: number[];
  quizStartedAt: number | null;
  quizDurationSec: number;
  riddleValidated: boolean;
  riddleSolved: boolean;
  challengeDraft?: string;
} | null;

export type ChallengeReactionEmoji = "love" | "laugh" | "wow" | "clap";

export type CloudChallengeReaction = {
  day: number;
  targetProfileId: string;
  reactorProfileId: string;
  emoji: ChallengeReactionEmoji;
  updatedAt: number;
  authorUid?: string;
};

export type CloudChallengeReactionsByDay = Record<
  number,
  Record<string, Record<string, CloudChallengeReaction>>
>;

// Vote "meilleur défi/commentaire du jour" (trophée). Un voyageur ne peut
// voter que pour UNE seule réponse par jour (contrairement aux réactions
// emoji ci-dessus, où il peut réagir à plusieurs réponses) ; cette règle
// est appliquée côté client au moment du vote, pas dans la forme du type.
export type CloudChallengeBestVote = {
  day: number;
  targetProfileId: string;
  voterProfileId: string;
  updatedAt: number;
  authorUid?: string;
};

export type CloudChallengeBestVotesByDay = Record<
  number,
  Record<string, Record<string, CloudChallengeBestVote>>
>;

export type PlaceCommentReaction = "like" | "dislike";

export type PlaceVisibilityState = "visible" | "hiddenByOwner";
// Statut "vu / pas vu" posé par le propriétaire sur un lieu du guide une fois
// la visite/l'activité faite (ou non) pendant le séjour. Visible par tous les
// utilisateurs (contrairement à placeVisibilityMap qui masque un lieu pour
// les non-propriétaires). "unseen" = valeur par défaut, jamais persistée
// explicitement (même logique que "visible" pour PlaceVisibilityState).
export type PlaceSeenState = "unseen" | "seen";
export type PlaceSeenMap = Record<string, PlaceSeenState>;
export type PlaceDayOverrideMap = Record<string, number[]>;
export type PlaceDayOrderOverrideMap = Record<string, Record<number, number>>;
export type DocumentVisibilityState = "visible" | "hiddenByOwner";

// Correction/enrichissement par le propriétaire des textes des rubriques de
// contenu (places, histoire, géographie-économie, culture-tradition). Chaque
// entrée de contentOverrides[$source][$itemId] ne contient que les champs
// effectivement modifiés ; les champs absents restent ceux du .ts source
// (voir applyContentOverride dans App.tsx). null = pas d'override.
export type ContentSource = "places" | "histoire" | "geographie-economie" | "culture-tradition";
export type ContentOverridePatch = Partial<{
  name: string;
  shortDesc: string;
  historyLabel: string;
  history: string;
  anecdotesLabel: string;
  anecdotes: string[];
}>;
export type ContentOverrideMap = Partial<Record<ContentSource, Record<string, ContentOverridePatch>>>;

// Édition des documents/informations importantes par le propriétaire :
// - ownerGlobalDocumentAdditions : documents personnalisés ajoutés (id absent de DOCUMENTS)
// - ownerGlobalDocumentEdits : remplacement intégral d'un document par défaut (clé = id DOCUMENTS)
// - ownerGlobalDocumentRemovals : suppression d'un document par défaut (clé = id DOCUMENTS)
// Même esprit que ownerGlobalChecklistAdditions/Removals ci-dessus.
export type DocumentCatalogRemovalState = Record<string, boolean>;

// Visites/activités du Guide du séjour ajoutées par le propriétaire, absentes
// de PLACES (src/content/places.ts). Contrairement aux documents, pas besoin
// d'Edits/Removals séparés : éditer/masquer une place PAR DÉFAUT existe déjà
// via contentOverrides/placeVisibilityMap, donc ce mécanisme ne gère que les
// places ajoutées (éditer = remplacer l'entrée par id, supprimer = la retirer
// du tableau, cf. savePlaceForOwner/deletePlaceForOwner dans App.tsx).
export type PlaceCatalogAdditionState = Place[];

export type CloudPlaceComment = {
  commentId: string;
  placeId: string;
  authorProfileId: string;
  authorSurnameSnapshot: string;
  reaction: PlaceCommentReaction | null;
  text: string;
  createdAt: number;
  updatedAt: number;
  authorUid?: string;
};

export type CloudPlaceCommentsByPlace = Record<string, Record<string, CloudPlaceComment>>;

// Carnet de visite : notes libres + photos ajoutées par un voyageur ou le
// propriétaire sur un lieu du Guide du séjour (le visiteur ne peut que lire).
// Contrairement à CloudPlaceComment (une entrée "principale" par auteur), un
// même auteur peut avoir plusieurs entrées de carnet dans le temps : entryId
// = `${authorProfileId}-${timestamp}`. Stocké hors de families/$familyId
// (chemin placeVisitLogs/$familyId/$placeId/$entryId) et chargé à la demande
// par lieu, pas dans le flux temps réel global, pour ne pas faire retélé-
// charger toutes les photos de tous les lieux à chaque synchro famille (voir
// observePlaceVisitLog dans cloudSyncProvider.ts).
export type CloudCarnetVisiteEntry = {
  entryId: string;
  placeId: string;
  authorProfileId: string;
  authorSurnameSnapshot: string;
  text: string;
  photos: Record<string, string>; // photoId -> data URI JPEG compressée, max 5
  createdAt: number;
  updatedAt: number;
  authorUid?: string;
};

export type CloudCarnetVisiteLog = Record<string, CloudCarnetVisiteEntry>; // entryId -> entrée

// Photos ajoutées PAR LE PROPRIÉTAIRE UNIQUEMENT à un document existant de
// Documents et informations importants (ex : scanner un billet retour depuis
// le téléphone), en complément des scans statiques `TravelDocument.scans`
// (src/content/documents.ts). Même principe que les photos du carnet de
// visite ci-dessus (data URI JPEG compressée côté client, clés figées
// photo-0..photo-4 pour plafonner à 5 côté règles Firebase), mais pas
// d'auteur multiple ni de texte : une simple carte photoId -> data URI.
// Stocké hors de families/$familyId, chemin
// documentPhotos/$familyId/$documentId/$photoId, chargé à la demande (voir
// observeDocumentPhotos dans cloudSyncProvider.ts).
export type CloudDocumentPhotoMap = Record<string, string>; // photoId -> data URI JPEG compressée, max 5

// Même principe que CloudCarnetVisiteEntry, mais pour les rubriques de
// contenu (Histoire, Culture et tradition, Géographie et économie) plutôt
// que pour un lieu du Guide du séjour : PAS de photos (demande explicite),
// et clé composite [source][itemId] plutôt que placeId seul, car les ids de
// topics ne sont uniques qu'au sein d'une même rubrique (même pattern que
// ContentOverrideMap). Stocké hors de families/$familyId, chemin
// contentVisitLogs/$familyId/$source/$itemId/$entryId, chargé à la demande
// (voir observeContentVisitLog dans cloudSyncProvider.ts).
export type CloudCarnetContentEntry = {
  entryId: string;
  source: ContentSource;
  itemId: string;
  authorProfileId: string;
  authorSurnameSnapshot: string;
  text: string;
  createdAt: number;
  updatedAt: number;
  authorUid?: string;
};

export type CloudCarnetContentLog = Record<string, CloudCarnetContentEntry>; // entryId -> entrée

// Chat familial (story 28.1) : conversation de groupe "Voyage" créée
// automatiquement, réunissant tous les profils proprietaire/utilisateur
// (jamais les visiteurs, cf. access-control.ts). Comme placeVisitLogs et
// documentPhotos ci-dessus, stocké hors de families/$familyId (chemins
// chatConversations/$familyId et chatMessages/$familyId), chargé à la
// demande par ChatScreen plutôt que dans le flux temps réel global (voir
// observeChatMessages/ensureVoyageConversationMembers dans
// cloudSyncProvider.ts).
export type ChatConversationType = "group" | "direct";

export type CloudChatConversation = {
  conversationId: string;
  type: ChatConversationType;
  name: string;
  isDefaultVoyage: boolean;
  memberProfileIds: Record<string, true>;
  createdAt: number;
  createdByProfileId: string;
};

export type CloudChatConversationsMap = Record<string, CloudChatConversation>;

// Sondage du propriétaire dans la conversation "Voyage" (story 28.3) :
// question fermée (oui/non) ou libre ("humeur"), résultats nominatifs — voir
// docs/specs-stories/epic-28/28.3-sondages-proprietaire.md.
export type ChatPollType = "oui_non" | "libre";

// Une entrée par profil ayant répondu (une seule réponse par profil, la
// nouvelle remplace la précédente tant que le sondage n'est pas clos) :
// value = "oui" | "non" pour pollType "oui_non", texte libre sinon. Stockée
// sous chatMessages/$familyId/$conversationId/$messageId/pollResponses,
// donc chargée avec le message lui-même (voir observeChatMessages), pas
// besoin d'un abonnement séparé.
export type CloudChatPollResponse = {
  profileId: string;
  value: string;
  updatedAt: number;
  authorUid: string;
};

export type CloudChatPollResponsesByProfile = Record<string, CloudChatPollResponse>; // profileId -> réponse

// authorSurnameSnapshot est figé à l'envoi : "Organisateur" si l'auteur est
// propriétaire au moment de l'envoi (cf. resolveChatAuthorSnapshotLabel dans
// chat.ts), sinon son surnom à cet instant — ni l'un ni l'autre ne change
// rétroactivement si le rôle ou le surnom de l'auteur change plus tard
// (même logique que CloudPlaceComment/CloudCarnetVisiteEntry ci-dessus).
// kind "poll" (story 28.3) : text reste "" et n'est jamais affiché pour ce
// kind ; pollType/pollQuestion/pollClosed sont alors toujours présents (cf.
// buildChatPollMessage dans chat.ts), pollResponses absent tant que personne
// n'a répondu.
export type CloudChatMessage = {
  messageId: string;
  conversationId: string;
  authorProfileId: string;
  authorSurnameSnapshot: string;
  authorUid: string;
  kind: "text" | "poll";
  text: string;
  createdAt: number;
  pollType?: ChatPollType;
  pollQuestion?: string;
  pollClosed?: boolean;
  pollResponses?: CloudChatPollResponsesByProfile;
};

export type CloudChatMessagesLog = Record<string, CloudChatMessage>;

// Badge de messages non lus (story 28.4) : un marqueur "dernier passage" par
// profil et par conversation, écrit uniquement par le profil concerné
// (self-write). Le calcul du non-lu (messages avec createdAt > lastReadAt)
// reste entièrement côté client, cf. computeUnreadChatMessageCount dans
// chat.ts — pas de compteur dénormalisé côté cloud, même esprit que le
// modèle "sans backend applicatif" déjà en place pour le Chat.
export type CloudChatReadState = {
  lastReadAt: number;
  authorUid: string;
};

export type CloudChatReadStateByProfile = Record<string, CloudChatReadState>; // profileId -> état

export type CloudChatReadStateMap = Record<string, CloudChatReadStateByProfile>; // conversationId -> profileId -> état

export type CloudDestinationSurveyVote = {
  profileId: string;
  proposals: string[];
  updatedAt: number;
  authorUid?: string;
};

export type CloudDestinationSurveyByProfile = Record<string, CloudDestinationSurveyVote>;

export type ProfileGender = "unspecified" | "male" | "female";
export type ProfileHouseholdRole = "member" | "parent" | "child";

// Record personnel au mode "Défi" de Bazar Crush (Candy Crush) : grille 9x9,
// 6 types de pions, niveau 1, timer 120s figés (cf. candy-crush-challenge.ts).
// null = jamais joué en mode Défi.
export type CloudCandyCrushChallenge = { bestScore: number; updatedAt: number } | null;

export type CloudProfileRecord = {
  surname: string;
  role: Role;
  createdAt: number;
  lastSyncAt: number;
  passwordHash?: string;
  recoveryHash?: string;
  recoveryQuestion?: string;
  recoveryAnswer?: string;
  recoveryConfiguredAt?: number;
  gender?: ProfileGender;
  householdRole?: ProfileHouseholdRole;
};

export type CloudProfileState = {
  profileId: string;
  surname: string;
  role: Role;
  createdAt: number;
  lastSyncAt: number;
  passwordHash?: string;
  recoveryHash?: string;
  recoveryQuestion?: string;
  recoveryAnswer?: string;
  recoveryConfiguredAt?: number;
  gender?: ProfileGender;
  householdRole?: ProfileHouseholdRole;
  checklist: ChecklistState;
  customChecklistItems: ChecklistCustomItem[];
  gameResults: CloudGameHistoryEntry[];
  gameProgress: CloudGameProgress;
  candyCrushChallenge: CloudCandyCrushChallenge;
  destinationSurveyVote: CloudDestinationSurveyVote | null;
  launchGateCompletedCycle?: number;
  phase: TravelPhase;
};

export type GameDayOverride = "open" | "closed";

export type CloudSyncSnapshot = {
  familyState: SharedFamilyState;
  ownerCodeHash: string;
  ownerCodePlain?: string;
  travelerCodeHash?: string;
  travelerCodePlain?: string;
  ownerRecoveryHash?: string;
  ownerRecoveryConfiguredAt?: number;
  phase: TravelPhase;
  tripStartDate: string | null;
  gameScoring: GameScoringConfig;
  ownerGlobalChecklistAdditions: ChecklistCustomItem[];
  ownerGlobalChecklistRemovals: ChecklistRemovalState;
  placeComments: CloudPlaceCommentsByPlace;
  placeVisibilityMap: Record<string, PlaceVisibilityState>;
  placeSeenMap: Record<string, PlaceSeenState>;
  placeDayOverrides?: PlaceDayOverrideMap;
  placeDayOrderOverrides?: PlaceDayOrderOverrideMap;
  documentVisibilityMap: Record<string, DocumentVisibilityState>;
  contentOverrides?: ContentOverrideMap;
  ownerGlobalDocumentAdditions?: TravelDocument[];
  ownerGlobalDocumentEdits?: Record<string, TravelDocument>;
  ownerGlobalDocumentRemovals?: DocumentCatalogRemovalState;
  ownerGlobalPlaceAdditions?: PlaceCatalogAdditionState;
  destinationSurvey: CloudDestinationSurveyByProfile;
  challengeReactions?: CloudChallengeReactionsByDay;
  challengeBestVotes?: CloudChallengeBestVotesByDay;
  gameDayOverrides: Record<number, GameDayOverride>;
  launchGateCycle: number;
  launchGateCompletedCycleByProfile: Record<string, number>;
  profiles: Record<string, CloudProfileState>;
  updatedAt: number;
};

export type CloudSyncWritePayload = {
  actorUid: string;
  canWriteFamilyState: boolean;
  familyState: SharedFamilyState;
  ownerCodeHash: string;
  ownerCodePlain?: string;
  travelerCodeHash?: string;
  travelerCodePlain?: string;
  ownerRecoveryHash?: string;
  ownerRecoveryConfiguredAt?: number;
  profileId: string;
  surname: string;
  role: Role;
  profilePasswordHash?: string;
  profileRecoveryHash?: string;
  profileRecoveryQuestion?: string;
  profileRecoveryAnswer?: string;
  profileRecoveryConfiguredAt?: number;
  gender?: ProfileGender;
  householdRole?: ProfileHouseholdRole;
  checklist: ChecklistState;
  profileCustomChecklistItems: ChecklistCustomItem[];
  ownerGlobalChecklistAdditions: ChecklistCustomItem[];
  ownerGlobalChecklistRemovals: ChecklistRemovalState;
  placeComments: CloudPlaceCommentsByPlace;
  placeVisibilityMap?: Record<string, PlaceVisibilityState>;
  placeSeenMap?: Record<string, PlaceSeenState>;
  placeDayOverrides?: PlaceDayOverrideMap;
  placeDayOrderOverrides?: PlaceDayOrderOverrideMap;
  documentVisibilityMap?: Record<string, DocumentVisibilityState>;
  contentOverrides?: ContentOverrideMap;
  ownerGlobalDocumentAdditions?: TravelDocument[];
  ownerGlobalDocumentEdits?: Record<string, TravelDocument>;
  ownerGlobalDocumentRemovals?: DocumentCatalogRemovalState;
  ownerGlobalPlaceAdditions?: PlaceCatalogAdditionState;
  profileDestinationSurveyVote?: CloudDestinationSurveyVote | null;
  challengeReactions?: CloudChallengeReactionsByDay;
  challengeBestVotes?: CloudChallengeBestVotesByDay;
  launchGateCycle?: number;
  launchGateCompletedCycleForProfile?: number | null;
  resetDestinationSurvey?: boolean;
  gameResults: CloudGameHistoryEntry[];
  gameProgress: CloudGameProgress;
  candyCrushChallenge: CloudCandyCrushChallenge;
  phase: TravelPhase;
  tripStartDate?: string | null;
  gameScoring: GameScoringConfig;
};

export type ClaimRoleResult = {
  assignedRole: Role;
  familyState: SharedFamilyState;
};
