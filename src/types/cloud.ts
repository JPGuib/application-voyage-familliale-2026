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
  recoveryConfiguredAt?: number;
  gender?: ProfileGender;
  householdRole?: ProfileHouseholdRole;
  checklist: ChecklistState;
  customChecklistItems: ChecklistCustomItem[];
  gameResults: CloudGameHistoryEntry[];
  phase: TravelPhase;
};

export type CloudSyncSnapshot = {
  familyState: SharedFamilyState;
  ownerCodeHash: string;
  ownerRecoveryHash?: string;
  ownerRecoveryConfiguredAt?: number;
  phase: TravelPhase;
  tripStartDate: string | null;
  ownerGlobalChecklistAdditions: ChecklistCustomItem[];
  ownerGlobalChecklistRemovals: ChecklistRemovalState;
  profiles: Record<string, CloudProfileState>;
  updatedAt: number;
};

export type CloudSyncWritePayload = {
  actorUid: string;
  canWriteFamilyState: boolean;
  familyState: SharedFamilyState;
  ownerCodeHash: string;
  ownerRecoveryHash?: string;
  ownerRecoveryConfiguredAt?: number;
  profileId: string;
  surname: string;
  role: Role;
  profilePasswordHash?: string;
  profileRecoveryHash?: string;
  profileRecoveryQuestion?: string;
  profileRecoveryConfiguredAt?: number;
  gender?: ProfileGender;
  householdRole?: ProfileHouseholdRole;
  checklist: ChecklistState;
  profileCustomChecklistItems: ChecklistCustomItem[];
  ownerGlobalChecklistAdditions: ChecklistCustomItem[];
  ownerGlobalChecklistRemovals: ChecklistRemovalState;
  gameResults: CloudGameHistoryEntry[];
  phase: TravelPhase;
  tripStartDate?: string | null;
};

export type ClaimRoleResult = {
  assignedRole: Role;
  familyState: SharedFamilyState;
};
