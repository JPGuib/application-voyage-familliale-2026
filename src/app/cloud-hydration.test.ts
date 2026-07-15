import { describe, expect, it } from "vitest";
import { shouldHydrateFromCloudSnapshot } from "./cloud-hydration";

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
