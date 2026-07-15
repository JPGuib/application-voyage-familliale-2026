type CloudHydrationDecisionInput = {
  cloudEnabled: boolean;
  isAuthenticated: boolean;
  hasSnapshot: boolean;
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
