import { describe, expect, it, vi } from "vitest";
import { deleteProfileFromCloud, parseCloudSnapshot, pushCloudSnapshot } from "./cloudSyncProvider";

const mockUpdate = vi.fn().mockResolvedValue(undefined);
const mockRef = vi.fn().mockReturnValue({});
vi.mock("firebase/database", async (importOriginal) => {
  const actual = await importOriginal<typeof import("firebase/database")>();
  return {
    ...actual,
    ref: () => mockRef(),
    update: (_ref: unknown, updates: Record<string, unknown>) => mockUpdate(updates),
    onValue: vi.fn(),
    runTransaction: vi.fn(),
  };
});

describe("cloudSyncProvider phase migration", () => {
  it("uses family-wide phase when available", () => {
    const snapshot = parseCloudSnapshot({
      phase: "during",
      profiles: {
        "profile-a": {
          surname: "A",
          role: "proprietaire",
          createdAt: 1,
          lastSyncAt: 2,
        },
      },
    });

    expect(snapshot.phase).toBe("during");
    expect(snapshot.profiles["profile-a"]?.phase).toBe("before");
  });

  it("falls back to legacy phase map when family-wide phase is absent", () => {
    const snapshot = parseCloudSnapshot({
      phase: {
        "profile-a": "before",
        "profile-b": "during",
      },
      profiles: {
        "profile-a": {
          surname: "A",
          role: "proprietaire",
          createdAt: 1,
          lastSyncAt: 2,
        },
        "profile-b": {
          surname: "B",
          role: "utilisateur",
          createdAt: 1,
          lastSyncAt: 2,
        },
      },
    });

    expect(snapshot.phase).toBe("during");
    expect(snapshot.profiles["profile-a"]?.phase).toBe("before");
    expect(snapshot.profiles["profile-b"]?.phase).toBe("during");
  });

  it("defaults to before when no phase data exists", () => {
    const snapshot = parseCloudSnapshot({
      profiles: {},
    });

    expect(snapshot.phase).toBe("before");
  });

  it("keeps checklist and game history isolated per profile", () => {
    const snapshot = parseCloudSnapshot({
      phase: "during",
      profiles: {
        "profile-a": {
          surname: "A",
          role: "proprietaire",
          createdAt: 1,
          lastSyncAt: 2,
        },
        "profile-b": {
          surname: "B",
          role: "utilisateur",
          createdAt: 1,
          lastSyncAt: 2,
        },
      },
      checklists: {
        "profile-a": {
          bagage: true,
        },
        "profile-b": {
          bagage: false,
          passeport: true,
        },
      },
      gameResults: {
        "profile-a": [
          {
            day: 1,
            location: "Istanbul",
            quizScore: 20,
            correctCount: 2,
            riddleSolved: true,
            challengeDone: false,
            durationSec: 90,
            totalScore: 30,
            completedAt: "2026-07-15T10:00:00.000Z",
          },
        ],
        "profile-b": [
          {
            day: 1,
            location: "Istanbul",
            quizScore: 10,
            correctCount: 1,
            riddleSolved: false,
            challengeDone: true,
            durationSec: 130,
            totalScore: 25,
            completedAt: "2026-07-15T10:01:00.000Z",
          },
        ],
      },
    });

    expect(snapshot.profiles["profile-a"]?.checklist).toEqual({ bagage: true });
    expect(snapshot.profiles["profile-b"]?.checklist).toEqual({ bagage: false, passeport: true });
    expect(snapshot.profiles["profile-a"]?.gameResults).toHaveLength(1);
    expect(snapshot.profiles["profile-b"]?.gameResults).toHaveLength(1);
    expect(snapshot.profiles["profile-a"]?.gameResults[0]?.quizScore).toBe(20);
    expect(snapshot.profiles["profile-b"]?.gameResults[0]?.quizScore).toBe(10);
  });

  it("normalizes owner uniqueness and exposes shared phase coherently", () => {
    const snapshot = parseCloudSnapshot({
      phase: "during",
      ownerProfileId: "profile-a",
      profiles: {
        "profile-a": {
          surname: "A",
          role: "proprietaire",
          createdAt: 1,
          lastSyncAt: 2,
        },
        "profile-b": {
          surname: "B",
          role: "proprietaire",
          createdAt: 1,
          lastSyncAt: 2,
        },
      },
    });

    expect(snapshot.phase).toBe("during");
    expect(snapshot.familyState.ownerProfileId).toBe("profile-a");
    expect(snapshot.familyState.profiles.find((profile) => profile.id === "profile-a")?.role).toBe(
      "proprietaire"
    );
    expect(snapshot.familyState.profiles.find((profile) => profile.id === "profile-b")?.role).toBe(
      "utilisateur"
    );
  });

  it("parses profile-scoped password and recovery hashes when present", () => {
    const snapshot = parseCloudSnapshot({
      phase: "before",
      profiles: {
        "profile-a": {
          surname: "A",
          role: "proprietaire",
          createdAt: 1,
          lastSyncAt: 2,
          passwordHash: "sha256:" + "a".repeat(64),
          recoveryHash: "sha256:" + "b".repeat(64),
          recoveryQuestion: "Quel est le nom de votre premier animal ?",
          recoveryConfiguredAt: 123,
        },
      },
    });

    expect(snapshot.profiles["profile-a"]?.passwordHash).toBe("sha256:" + "a".repeat(64));
    expect(snapshot.profiles["profile-a"]?.recoveryHash).toBe("sha256:" + "b".repeat(64));
    expect(snapshot.profiles["profile-a"]?.recoveryQuestion).toBe(
      "Quel est le nom de votre premier animal ?"
    );
    expect(snapshot.profiles["profile-a"]?.recoveryConfiguredAt).toBe(123);
  });

  it("drops recovery metadata when recovery hash is empty", () => {
    const snapshot = parseCloudSnapshot({
      phase: "before",
      profiles: {
        "profile-a": {
          surname: "A",
          role: "proprietaire",
          createdAt: 1,
          lastSyncAt: 2,
          recoveryHash: "",
          recoveryConfiguredAt: 123,
        },
      },
    });

    expect(snapshot.profiles["profile-a"]?.recoveryHash).toBeUndefined();
    expect(snapshot.profiles["profile-a"]?.recoveryQuestion).toBeUndefined();
    expect(snapshot.profiles["profile-a"]?.recoveryConfiguredAt).toBeUndefined();
  });

  it("drops recovery question when value is blank", () => {
    const snapshot = parseCloudSnapshot({
      phase: "before",
      profiles: {
        "profile-a": {
          surname: "A",
          role: "proprietaire",
          createdAt: 1,
          lastSyncAt: 2,
          recoveryHash: "sha256:" + "c".repeat(64),
          recoveryQuestion: "   ",
          recoveryConfiguredAt: 123,
        },
      },
    });

    expect(snapshot.profiles["profile-a"]?.recoveryHash).toBe("sha256:" + "c".repeat(64));
    expect(snapshot.profiles["profile-a"]?.recoveryQuestion).toBeUndefined();
  });
});

describe("cloudSyncProvider metadata (story 10.4)", () => {
  it("parses gender and householdRole when present", () => {
    const snapshot = parseCloudSnapshot({
      phase: "before",
      profiles: {
        "profile-a": {
          surname: "A",
          role: "utilisateur",
          createdAt: 1,
          lastSyncAt: 2,
          gender: "female",
          householdRole: "parent",
        },
      },
    });

    expect(snapshot.profiles["profile-a"]?.gender).toBe("female");
    expect(snapshot.profiles["profile-a"]?.householdRole).toBe("parent");
  });

  it("returns undefined gender/householdRole when absent (backward compat)", () => {
    const snapshot = parseCloudSnapshot({
      phase: "before",
      profiles: {
        "profile-a": {
          surname: "A",
          role: "utilisateur",
          createdAt: 1,
          lastSyncAt: 2,
        },
      },
    });

    // Older profiles without metadata fields should not have them set
    expect(snapshot.profiles["profile-a"]?.gender).toBeUndefined();
    expect(snapshot.profiles["profile-a"]?.householdRole).toBeUndefined();
  });

  it("normalizes unknown gender value to unspecified", () => {
    const snapshot = parseCloudSnapshot({
      phase: "before",
      profiles: {
        "profile-a": {
          surname: "A",
          role: "utilisateur",
          createdAt: 1,
          lastSyncAt: 2,
          gender: "other",
        },
      },
    });

    expect(snapshot.profiles["profile-a"]?.gender).toBe("unspecified");
  });

  it("normalizes unknown householdRole value to member", () => {
    const snapshot = parseCloudSnapshot({
      phase: "before",
      profiles: {
        "profile-a": {
          surname: "A",
          role: "utilisateur",
          createdAt: 1,
          lastSyncAt: 2,
          householdRole: "grandparent",
        },
      },
    });

    expect(snapshot.profiles["profile-a"]?.householdRole).toBe("member");
  });

  it("parses all householdRole values correctly", () => {
    for (const role of ["parent", "child"] as const) {
      const snapshot = parseCloudSnapshot({
        phase: "before",
        profiles: {
          p: { surname: "X", role: "utilisateur", createdAt: 1, lastSyncAt: 2, householdRole: role },
        },
      });
      expect(snapshot.profiles["p"]?.householdRole).toBe(role);
    }
  });

  it("maps legacy teen householdRole value to child", () => {
    const snapshot = parseCloudSnapshot({
      phase: "before",
      profiles: {
        p: { surname: "X", role: "utilisateur", createdAt: 1, lastSyncAt: 2, householdRole: "teen" },
      },
    });

    expect(snapshot.profiles["p"]?.householdRole).toBe("child");
  });
});

describe("pushCloudSnapshot write path (story 10.6)", () => {
  const db = {} as import("firebase/database").Database;
  const familyId = "famille-test";
  const basePayload = {
    actorUid: "uid-1",
    canWriteFamilyState: false,
    familyState: { version: 1, ownerProfileId: null, profiles: [] } as import("../app/owner-policy").SharedFamilyState,
    ownerCodeHash: "",
    ownerRecoveryHash: "",
    ownerRecoveryConfiguredAt: undefined,
    profileId: "profile-1",
    surname: "Maman",
    role: "utilisateur" as import("../app/owner-policy").Role,
    profilePasswordHash: "",
    gender: "female" as const,
    householdRole: "parent" as const,
    checklist: {},
    profileCustomChecklistItems: [],
    ownerGlobalChecklistAdditions: [],
    ownerGlobalChecklistRemovals: {},
    gameResults: [],
    phase: "before" as const,
  };

  it("writes recoveryQuestion alongside recoveryHash when hash is non-empty", async () => {
    mockUpdate.mockClear();

    await pushCloudSnapshot(db, familyId, {
      ...basePayload,
      profileRecoveryHash: "sha256:" + "a".repeat(64),
      profileRecoveryQuestion: "Quel est votre dessert préféré ?",
      profileRecoveryConfiguredAt: 12345,
    });

    expect(mockUpdate).toHaveBeenCalledOnce();
    const updates = mockUpdate.mock.calls[0][0] as Record<string, unknown>;
    expect(updates["profiles/profile-1/recoveryHash"]).toBe("sha256:" + "a".repeat(64));
    expect(updates["profiles/profile-1/recoveryQuestion"]).toBe("Quel est votre dessert préféré ?");
    expect(updates["profiles/profile-1/recoveryConfiguredAt"]).toBe(12345);
  });

  it("writes null for recoveryQuestion when question is empty", async () => {
    mockUpdate.mockClear();

    await pushCloudSnapshot(db, familyId, {
      ...basePayload,
      profileRecoveryHash: "sha256:" + "b".repeat(64),
      profileRecoveryQuestion: "",
      profileRecoveryConfiguredAt: 12345,
    });

    expect(mockUpdate).toHaveBeenCalledOnce();
    const updates = mockUpdate.mock.calls[0][0] as Record<string, unknown>;
    expect(updates["profiles/profile-1/recoveryHash"]).toBe("sha256:" + "b".repeat(64));
    expect(updates["profiles/profile-1/recoveryQuestion"]).toBeNull();
  });

  it("writes null for both recoveryHash and recoveryQuestion when hash is empty", async () => {
    mockUpdate.mockClear();

    await pushCloudSnapshot(db, familyId, {
      ...basePayload,
      profileRecoveryHash: "",
      profileRecoveryQuestion: "Quel est votre dessert préféré ?",
      profileRecoveryConfiguredAt: undefined,
    });

    expect(mockUpdate).toHaveBeenCalledOnce();
    const updates = mockUpdate.mock.calls[0][0] as Record<string, unknown>;
    expect(updates["profiles/profile-1/recoveryHash"]).toBeNull();
    expect(updates["profiles/profile-1/recoveryQuestion"]).toBeNull();
    expect(updates["profiles/profile-1/recoveryConfiguredAt"]).toBeNull();
  });

  it("writes the family-wide before phase when the owner triggers a re-lock", async () => {
    mockUpdate.mockClear();

    await pushCloudSnapshot(db, familyId, {
      ...basePayload,
      canWriteFamilyState: true,
      familyState: {
        version: 1,
        ownerProfileId: "profile-1",
        profiles: [{ id: "profile-1", role: "proprietaire" }],
      },
      role: "proprietaire",
      ownerCodeHash: "sha256:" + "c".repeat(64),
      phase: "before",
    });

    expect(mockUpdate).toHaveBeenCalledOnce();
    const updates = mockUpdate.mock.calls[0][0] as Record<string, unknown>;
    expect(updates.phase).toBe("before");
    expect(updates.ownerProfileId).toBe("profile-1");
    expect(updates["profiles/profile-1/role"]).toBe("proprietaire");
  });

  it("does not let a non-owner overwrite the family-wide phase", async () => {
    mockUpdate.mockClear();

    await pushCloudSnapshot(db, familyId, {
      ...basePayload,
      canWriteFamilyState: true,
      familyState: {
        version: 1,
        ownerProfileId: "profile-2",
        profiles: [
          { id: "profile-1", role: "utilisateur" },
          { id: "profile-2", role: "proprietaire" },
        ],
      },
      phase: "during",
    });

    expect(mockUpdate).toHaveBeenCalledOnce();
    const updates = mockUpdate.mock.calls[0][0] as Record<string, unknown>;
    expect(updates.phase).toBeUndefined();
    expect(updates.ownerProfileId).toBeUndefined();
    expect(updates["profiles/profile-1/role"]).toBe("utilisateur");
  });
});

describe("deleteProfileFromCloud (story 18.3)", () => {
  const db = {} as import("firebase/database").Database;
  const familyId = "famille-test";

  it("writes null for profiles, checklists, and gameResults for the target profile in one atomic update", async () => {
    mockUpdate.mockClear();

    await deleteProfileFromCloud(db, familyId, "profile-to-delete");

    expect(mockUpdate).toHaveBeenCalledOnce();
    const updates = mockUpdate.mock.calls[0][0] as Record<string, unknown>;
    expect(updates["families/famille-test/profiles/profile-to-delete"]).toBeNull();
    expect(updates["families/famille-test/checklists/profile-to-delete"]).toBeNull();
    expect(updates["families/famille-test/gameResults/profile-to-delete"]).toBeNull();
  });

  it("includes a numeric updatedAt timestamp in the delete payload", async () => {
    mockUpdate.mockClear();

    await deleteProfileFromCloud(db, familyId, "profile-x");

    const updates = mockUpdate.mock.calls[0][0] as Record<string, unknown>;
    expect(typeof updates["families/famille-test/updatedAt"]).toBe("number");
    expect(Number.isFinite(updates["families/famille-test/updatedAt"] as number)).toBe(true);
  });

  it("does not null any unrelated paths in the delete payload", async () => {
    mockUpdate.mockClear();

    await deleteProfileFromCloud(db, familyId, "profile-y");

    const updates = mockUpdate.mock.calls[0][0] as Record<string, unknown>;
    const nulledPaths = Object.entries(updates)
      .filter(([key, val]) => val === null && key !== "families/famille-test/profiles/profile-y" && key !== "families/famille-test/checklists/profile-y" && key !== "families/famille-test/gameResults/profile-y")
      .map(([key]) => key);
    expect(nulledPaths).toHaveLength(0);
  });

  it("uses only the target profile id in the null-delete paths, not other profile ids", async () => {
    mockUpdate.mockClear();

    await deleteProfileFromCloud(db, familyId, "profile-abc");

    const updates = mockUpdate.mock.calls[0][0] as Record<string, unknown>;
    const nulledKeys = Object.keys(updates).filter((k) => updates[k] === null);
    for (const key of nulledKeys) {
      expect(key).toMatch(/famille-test.*profile-abc/);
    }
  });
});
