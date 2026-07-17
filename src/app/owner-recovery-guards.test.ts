import { describe, expect, it } from "vitest";
import { evaluateOwnerRecoveryGuards } from "./owner-recovery-guards";
import type { SharedFamilyState } from "./owner-policy";

function makeState(overrides: Partial<SharedFamilyState> = {}): SharedFamilyState {
  return {
    version: 1,
    ownerProfileId: "owner-1",
    profiles: [
      { id: "owner-1", role: "proprietaire" },
      { id: "user-2", role: "utilisateur" },
    ],
    ...overrides,
  };
}

describe("owner recovery guards", () => {
  it("rejects recovery actions for non-owner profile", () => {
    const guards = evaluateOwnerRecoveryGuards(makeState(), "user-2", "sha256:" + "a".repeat(64));

    expect(guards.canOpenFlow).toBe(false);
    expect(guards.canResetCode).toBe(false);
    expect(guards.reason).toBe("not-owner");
  });

  it("rejects reset when recovery phrase hash is missing", () => {
    const guards = evaluateOwnerRecoveryGuards(makeState(), "owner-1", "");

    expect(guards.canOpenFlow).toBe(true);
    expect(guards.canResetCode).toBe(false);
    expect(guards.reason).toBe("recovery-not-configured");
  });

  it("allows reset when owner and recovery hash are configured", () => {
    const guards = evaluateOwnerRecoveryGuards(makeState(), "owner-1", "sha256:" + "b".repeat(64));

    expect(guards.canOpenFlow).toBe(true);
    expect(guards.canResetCode).toBe(true);
    expect(guards.reason).toBe(null);
  });
});
