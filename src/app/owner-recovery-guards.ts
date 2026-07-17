import { canUpdateOwnerCode, type SharedFamilyState } from "./owner-policy";

export type OwnerRecoveryGuardReason = "not-owner" | "recovery-not-configured" | null;

export type OwnerRecoveryGuards = {
  canOpenFlow: boolean;
  canResetCode: boolean;
  reason: OwnerRecoveryGuardReason;
};

export function evaluateOwnerRecoveryGuards(
  familyState: SharedFamilyState,
  actorProfileId: string,
  ownerRecoveryHash: string
): OwnerRecoveryGuards {
  const isOwner = canUpdateOwnerCode(familyState, actorProfileId);
  if (!isOwner) {
    return {
      canOpenFlow: false,
      canResetCode: false,
      reason: "not-owner",
    };
  }

  const hasRecoveryPhrase = ownerRecoveryHash.trim().length > 0;
  return {
    canOpenFlow: true,
    canResetCode: hasRecoveryPhrase,
    reason: hasRecoveryPhrase ? null : "recovery-not-configured",
  };
}
