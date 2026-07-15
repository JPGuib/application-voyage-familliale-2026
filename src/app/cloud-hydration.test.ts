import { describe, expect, it } from "vitest";
import {
  shouldHydrateFromCloudSnapshot,
  shouldPushCloudSnapshot,
} from "./cloud-hydration";

describe("cloud hydration decision", () => {
  it("returns false when no snapshot is available", () => {
    expect(
      shouldHydrateFromCloudSnapshot({
        cloudEnabled: true,
        isAuthenticated: true,
        hasSnapshot: false,
      })
    ).toBe(false);
  });

  it("returns true in local mode when snapshot exists", () => {
    expect(
      shouldHydrateFromCloudSnapshot({
        cloudEnabled: false,
        isAuthenticated: false,
        hasSnapshot: true,
      })
    ).toBe(true);
  });

  it("returns false in cloud mode before authentication", () => {
    expect(
      shouldHydrateFromCloudSnapshot({
        cloudEnabled: true,
        isAuthenticated: false,
        hasSnapshot: true,
      })
    ).toBe(false);
  });

  it("returns true in cloud mode after authentication", () => {
    expect(
      shouldHydrateFromCloudSnapshot({
        cloudEnabled: true,
        isAuthenticated: true,
        hasSnapshot: true,
      })
    ).toBe(true);
  });
});

describe("cloud push decision", () => {
  it("blocks push before authentication bootstrap completes", () => {
    expect(
      shouldPushCloudSnapshot({
        cloudEnabled: true,
        isAuthenticated: false,
        isAuthBootstrapPending: true,
        hasActorUid: true,
        hasRole: true,
        hasSurname: true,
        hasCloudProfile: true,
        currentProfileId: "profile-a",
        hydratedProfileId: null,
      })
    ).toBe(false);
  });

  it("blocks push for existing cloud profile until hydration is done", () => {
    expect(
      shouldPushCloudSnapshot({
        cloudEnabled: true,
        isAuthenticated: true,
        isAuthBootstrapPending: false,
        hasActorUid: true,
        hasRole: true,
        hasSurname: true,
        hasCloudProfile: true,
        currentProfileId: "profile-a",
        hydratedProfileId: null,
      })
    ).toBe(false);
  });

  it("allows push once the authenticated profile has been hydrated", () => {
    expect(
      shouldPushCloudSnapshot({
        cloudEnabled: true,
        isAuthenticated: true,
        isAuthBootstrapPending: false,
        hasActorUid: true,
        hasRole: true,
        hasSurname: true,
        hasCloudProfile: true,
        currentProfileId: "profile-a",
        hydratedProfileId: "profile-a",
      })
    ).toBe(true);
  });
});
