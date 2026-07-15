import type { Role, SharedFamilyState } from "../app/owner-policy";

export type TravelPhase = "before" | "during";

export type ChecklistState = Record<string, boolean>;

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

export type CloudProfileRecord = {
  surname: string;
  role: Role;
  createdAt: number;
  lastSyncAt: number;
};

export type CloudProfileState = {
  profileId: string;
  surname: string;
  role: Role;
  createdAt: number;
  lastSyncAt: number;
  checklist: ChecklistState;
  gameResults: CloudGameHistoryEntry[];
  phase: TravelPhase;
};

export type CloudSyncSnapshot = {
  familyState: SharedFamilyState;
  ownerCodeHash: string;
  phase: TravelPhase;
  profiles: Record<string, CloudProfileState>;
  updatedAt: number;
};

export type CloudSyncWritePayload = {
  actorUid: string;
  canWriteFamilyState: boolean;
  familyState: SharedFamilyState;
  ownerCodeHash: string;
  profileId: string;
  surname: string;
  role: Role;
  checklist: ChecklistState;
  gameResults: CloudGameHistoryEntry[];
  phase: TravelPhase;
};

export type ClaimRoleResult = {
  assignedRole: Role;
  familyState: SharedFamilyState;
};
