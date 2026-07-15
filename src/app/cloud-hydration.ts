type CloudHydrationDecisionInput = {
  cloudEnabled: boolean;
  isAuthenticated: boolean;
  hasSnapshot: boolean;
};

type CloudPushDecisionInput = {
  cloudEnabled: boolean;
  isAuthenticated: boolean;
  isAuthBootstrapPending: boolean;
  hasActorUid: boolean;
  hasRole: boolean;
  hasSurname: boolean;
  hasCloudProfile: boolean;
  currentProfileId: string;
  hydratedProfileId: string | null;
};

export function shouldHydrateFromCloudSnapshot(
  input: CloudHydrationDecisionInput
): boolean {
  if (!input.hasSnapshot) {
    return false;
  }

  if (!input.cloudEnabled) {
    return true;
  }

  return input.isAuthenticated;
}

export function shouldPushCloudSnapshot(input: CloudPushDecisionInput): boolean {
  if (!input.cloudEnabled) {
    return true;
  }

  if (!input.isAuthenticated || input.isAuthBootstrapPending) {
    return false;
  }

  if (!input.hasActorUid || !input.hasRole || !input.hasSurname) {
    return false;
  }

  if (input.hasCloudProfile && input.hydratedProfileId !== input.currentProfileId) {
    return false;
  }

  return true;
}
