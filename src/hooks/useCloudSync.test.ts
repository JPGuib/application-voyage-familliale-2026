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

// Regression test (story 24.2 bug): pushSnapshot used to manually rebuild the
// mutation object field-by-field and silently dropped travelerCodeHash /
// travelerCodePlain (forgotten when the fields were added), so saving the
// traveler code in Settings looked successful locally but never reached
// Firebase — no error, no console log, just a silently incomplete write.
describe("useCloudSync pushSnapshot forwards all payload fields", () => {
  beforeEach(() => {
    pushCloudSnapshotMock.mockClear();
  });

  it("forwards travelerCodeHash/travelerCodePlain to pushCloudSnapshot", async () => {
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
      gameResults: [],
      gameProgress: null,
      phase: "before",
    });

    expect(pushCloudSnapshotMock).toHaveBeenCalledOnce();
    const mutation = pushCloudSnapshotMock.mock.calls[0][2] as {
      travelerCodeHash?: string;
      travelerCodePlain?: string;
    };
    expect(mutation.travelerCodeHash).toBe(`sha256:${"b".repeat(64)}`);
    expect(mutation.travelerCodePlain).toBe("1234");
  });
});
