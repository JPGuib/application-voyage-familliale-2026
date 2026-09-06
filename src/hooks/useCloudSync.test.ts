import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useCloudSync } from "./useCloudSync";

const pushCloudSnapshotMock = vi.fn().mockResolvedValue(undefined);

vi.mock("../services/cloudSyncProvider", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../services/cloudSyncProvider")>();
  return {
    ...actual,
    pushCloudSnapshot: (...args: unknown[]) =>
      pushCloudSnapshotMock(...args) as ReturnType<typeof actual.pushCloudSnapshot>,
    observeFamilySnapshot: () => () => {},
    ensureFamilyMembership: vi.fn().mockResolvedValue(undefined),
    ensureProfileMembership: vi.fn().mockResolvedValue(undefined),
    ensureOwnerMembership: vi.fn().mockResolvedValue(undefined),
  };
});

vi.mock("../services/firebaseConfig", () => ({
  isFirebaseConfigured: () => true,
  getFirebaseDatabaseInstance: () => ({}) as unknown,
  getFirebaseAuthInstance: () => ({}) as unknown,
  ensureFirebaseAnonymousAuth: vi.fn().mockResolvedValue({ uid: "actor-1" }),
  observeFirebaseUser: (onUser: (user: { uid: string } | null) => void) => {
    onUser({ uid: "actor-1" });
    return () => {};
  },
}));

// Regression guard: pushSnapshot manually rebuilds a mutation object. Whenever
// a new field is added to PushSnapshotInput it can be silently dropped if not
// forwarded here, which creates cross-device drift with no explicit error.
describe("useCloudSync pushSnapshot forwards all payload fields", () => {
  beforeEach(() => {
    pushCloudSnapshotMock.mockClear();
  });

  it("forwards travelerCodeHash/travelerCodePlain, crossword progress, place-day schedule overrides and launch-gate cycle fields", async () => {
    const { result } = renderHook(() => useCloudSync());

    await waitFor(() => {
      expect(result.current.cloudActorUid).toBe("actor-1");
    });

    await result.current.pushSnapshot({
      actorUid: "actor-1",
      canWriteFamilyState: true,
      familyState: {
        version: 1,
        ownerProfileId: "p1",
        profiles: [{ id: "p1", role: "proprietaire" }],
      },
      ownerCodeHash: `sha256:${"a".repeat(64)}`,
      travelerCodeHash: `sha256:${"b".repeat(64)}`,
      travelerCodePlain: "1234",
      profileId: "p1",
      surname: "Maman",
      role: "proprietaire",
      checklist: {},
      profileCustomChecklistItems: [],
      ownerGlobalChecklistAdditions: [],
      ownerGlobalChecklistRemovals: {},
      placeComments: {},
      placeDayOverrides: {
        "sainte-sophie": [2, 3],
      },
      placeDayOrderOverrides: {
        "sainte-sophie": {
          2: 5,
          3: 1,
        },
      },
      launchGateCycle: 3,
      launchGateCompletedCycleForProfile: 2,
      gameResults: [],
      gameProgress: null,
      crosswordProgress: {
        puzzleId: "turquie-general",
        entries: { "0,6": "A" },
        results: {},
        puzzleProgress: { "turquie-general": { entries: { "0,6": "A" }, results: {} } },
        completedPuzzleIds: [],
        updatedAt: 1700000000000,
      },
      candyCrushChallenge: { bestScore: 42, updatedAt: 1700000000000 },
      phase: "before",
    });

    expect(pushCloudSnapshotMock).toHaveBeenCalledOnce();
    const mutation = pushCloudSnapshotMock.mock.calls[0][2] as {
      travelerCodeHash?: string;
      travelerCodePlain?: string;
      placeDayOverrides?: Record<string, number[]>;
      placeDayOrderOverrides?: Record<string, Record<number, number>>;
      launchGateCycle?: number;
      launchGateCompletedCycleForProfile?: number | null;
      crosswordProgress?: { entries: Record<string, string> } | null;
      candyCrushChallenge?: { bestScore: number; updatedAt: number } | null;
    };
    expect(mutation.travelerCodeHash).toBe(`sha256:${"b".repeat(64)}`);
    expect(mutation.travelerCodePlain).toBe("1234");
    expect(mutation.placeDayOverrides).toEqual({
      "sainte-sophie": [2, 3],
    });
    expect(mutation.placeDayOrderOverrides).toEqual({
      "sainte-sophie": {
        2: 5,
        3: 1,
      },
    });
    expect(mutation.launchGateCycle).toBe(3);
    expect(mutation.launchGateCompletedCycleForProfile).toBe(2);
    expect(mutation.crosswordProgress).toMatchObject({ entries: { "0,6": "A" } });
    // Regression guard for the exact bug fixed 2026-09-01: candyCrushChallenge
    // was accepted by pushSnapshot's input type but never copied into the
    // rebuilt mutation object, silently becoming `undefined` and making the
    // real Firebase `update()` call throw ("values argument contains
    // undefined") for every user on every push.
    expect(mutation.candyCrushChallenge).toEqual({ bestScore: 42, updatedAt: 1700000000000 });
  });
});
