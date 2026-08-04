import type { Role, SharedFamilyState } from "../app/owner-policy";

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
  challengeDone: boolean;
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
} | null;

export type PlaceCommentReaction = "like" | "dislike";

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

export type CloudDestinationSurveyVote = {
  profileId: string;
  proposals: string[];
  updatedAt: number;
  authorUid?: string;
};

export type CloudDestinationSurveyByProfile = Record<string, CloudDestinationSurveyVote>;

export type ProfileGender = "unspecified" | "male" | "female";
export type ProfileHouseholdRole = "member" | "parent" | "child";

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
  ownerGlobalChecklistAdditions: ChecklistCustomItem[];
  ownerGlobalChecklistRemovals: ChecklistRemovalState;
  placeComments: CloudPlaceCommentsByPlace;
  destinationSurvey: CloudDestinationSurveyByProfile;
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
  profileDestinationSurveyVote?: CloudDestinationSurveyVote | null;
  launchGateCycle?: number;
  launchGateCompletedCycleForProfile?: number | null;
  resetDestinationSurvey?: boolean;
  gameResults: CloudGameHistoryEntry[];
  gameProgress: CloudGameProgress;
  phase: TravelPhase;
  tripStartDate?: string | null;
};

export type ClaimRoleResult = {
  assignedRole: Role;
  familyState: SharedFamilyState;
};
