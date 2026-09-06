import { describe, expect, it, vi } from "vitest";
import {
  deleteProfileFromCloud,
  parseCloudSnapshot,
  pushCloudSnapshot,
  pushGameDayOverride,
  pushPlaceDayOverride,
  resetGameProgressInCloud,
  resetGameResultsInCloud,
} from "./cloudSyncProvider";

const mockUpdate = vi.fn().mockResolvedValue(undefined);
const mockRef = vi.fn().mockReturnValue({});
// Par défaut, aucune conversation personnalisée/1-to-1 à nettoyer (story
// 28.2) : deleteProfileFromCloud fait un get() sur chatConversations/$familyId
// avant son update() atomique, cf. les tests dédiés ci-dessous pour le cas où
// des conversations personnalisées existent.
const mockGet = vi.fn().mockResolvedValue({ val: () => null, exists: () => false });
vi.mock("firebase/database", async (importOriginal) => {
  const actual = await importOriginal<typeof import("firebase/database")>();
  return {
    ...actual,
    ref: () => mockRef(),
    get: (...args: unknown[]) => mockGet(...args),
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

describe("place comments parsing and sync (story 21.2)", () => {
  it("parses valid place comments and drops invalid ones", () => {
    const snapshot = parseCloudSnapshot({
      phase: "during",
      profiles: {
        "profile-a": { surname: "A", role: "proprietaire", createdAt: 1, lastSyncAt: 2 },
      },
      placeComments: {
        "sainte-sophie": {
          "profile-a": {
            commentId: "profile-a",
            placeId: "sainte-sophie",
            authorProfileId: "profile-a",
            authorSurnameSnapshot: "Maman",
            reaction: "like",
            text: "Magnifique lieu.",
            createdAt: 10,
            updatedAt: 12,
          },
          invalid: {
            commentId: "invalid",
            placeId: "sainte-sophie",
            authorProfileId: "profile-b",
            authorSurnameSnapshot: "",
            reaction: "wow",
            text: "x",
            createdAt: 10,
            updatedAt: 12,
          },
        },
      },
    });

    expect(Object.keys(snapshot.placeComments)).toEqual(["sainte-sophie"]);
    expect(snapshot.placeComments["sainte-sophie"]?.["profile-a"]?.reaction).toBe("like");
    expect(snapshot.placeComments["sainte-sophie"]?.["invalid"]).toBeUndefined();
  });

  it("writes placeComments in cloud updates payload", async () => {
    mockUpdate.mockClear();
    const db = {} as import("firebase/database").Database;

    await pushCloudSnapshot(db, "famille-test", {
      actorUid: "uid-1",
      canWriteFamilyState: false,
      familyState: { version: 1, ownerProfileId: null, profiles: [] } as import("../app/owner-policy").SharedFamilyState,
      ownerCodeHash: "",
      ownerRecoveryHash: "",
      ownerRecoveryConfiguredAt: undefined,
      profileId: "profile-a",
      surname: "Maman",
      role: "utilisateur",
      checklist: {},
      profileCustomChecklistItems: [],
      ownerGlobalChecklistAdditions: [],
      ownerGlobalChecklistRemovals: {},
      placeComments: {
        "sainte-sophie": {
          "profile-a": {
            commentId: "profile-a",
            placeId: "sainte-sophie",
            authorProfileId: "profile-a",
            authorSurnameSnapshot: "Maman",
            reaction: "like",
            text: "Super",
            createdAt: 1,
            updatedAt: 2,
          },
          "profile-a-9999": {
            commentId: "profile-a-9999",
            placeId: "sainte-sophie",
            authorProfileId: "profile-a",
            authorSurnameSnapshot: "Maman",
            authorUid: "uid-2",
            reaction: null,
            text: "Nouveau commentaire dans le fil",
            createdAt: 9999,
            updatedAt: 9999,
          },
          "profile-b": {
            commentId: "profile-b",
            placeId: "sainte-sophie",
            authorProfileId: "profile-b",
            authorSurnameSnapshot: "Papa",
            reaction: "dislike",
            text: "Avis d'un autre",
            createdAt: 5,
            updatedAt: 5,
          },
        },
      },
      gameResults: [],
      gameProgress: null,
      candyCrushChallenge: null,
      phase: "before",
    });

    const updates = mockUpdate.mock.calls[0][0] as Record<string, unknown>;
    // Doit écrire le commentaire original de l'auteur courant
    expect(updates["placeComments/sainte-sophie/profile-a"]).toEqual({
      commentId: "profile-a",
      placeId: "sainte-sophie",
      authorProfileId: "profile-a",
      authorSurnameSnapshot: "Maman",
      authorUid: "uid-1",
      reaction: "like",
      text: "Super",
      createdAt: 1,
      updatedAt: 2,
    });
    // Ne doit pas écrire un commentaire du même profil mais d'un autre uid Firebase
    expect(updates["placeComments/sainte-sophie/profile-a-9999"]).toBeUndefined();
    // Ne doit pas écrire les commentaires des autres profils
    expect(updates["placeComments/sainte-sophie/profile-b"]).toBeUndefined();
  });
});

describe("document visibility parsing and sync (story 26.3)", () => {
  it("parses valid document visibility map values and ignores invalid ones", () => {
    const snapshot = parseCloudSnapshot({
      phase: "during",
      profiles: {
        "profile-a": { surname: "A", role: "proprietaire", createdAt: 1, lastSyncAt: 2 },
      },
      documentVisibilityMap: {
        "vol-nantes-paris-af7507": "hiddenByOwner",
        "hotel-istanbul-kadikoy": "visible",
        invalid: "secret",
      },
    });

    expect(snapshot.documentVisibilityMap).toEqual({
      "vol-nantes-paris-af7507": "hiddenByOwner",
      "hotel-istanbul-kadikoy": "visible",
    });
  });

  it("writes documentVisibilityMap for owner family-state updates", async () => {
    mockUpdate.mockClear();
    const db = {} as import("firebase/database").Database;

    await pushCloudSnapshot(db, "famille-test", {
      actorUid: "uid-owner",
      canWriteFamilyState: true,
      familyState: {
        version: 1,
        ownerProfileId: "profile-owner",
        profiles: [{ id: "profile-owner", role: "proprietaire" }],
      } as import("../app/owner-policy").SharedFamilyState,
      ownerCodeHash: `sha256:${"a".repeat(64)}`,
      ownerCodePlain: "1234",
      ownerRecoveryHash: "",
      ownerRecoveryConfiguredAt: undefined,
      profileId: "profile-owner",
      surname: "Maman",
      role: "proprietaire",
      checklist: {},
      profileCustomChecklistItems: [],
      ownerGlobalChecklistAdditions: [],
      ownerGlobalChecklistRemovals: {},
      placeComments: {},
      placeVisibilityMap: {},
      documentVisibilityMap: {
        "vol-nantes-paris-af7507": "hiddenByOwner",
      },
      gameResults: [],
      gameProgress: null,
      candyCrushChallenge: null,
      phase: "during",
    });

    const updates = mockUpdate.mock.calls[0][0] as Record<string, unknown>;
    expect(updates.documentVisibilityMap).toEqual({
      "vol-nantes-paris-af7507": "hiddenByOwner",
    });
  });
});

describe("gameProgress parsing and sync (jeu du jour persistance)", () => {
  it("parses a valid in-progress gameProgress entry per profile", () => {
    const snapshot = parseCloudSnapshot({
      phase: "during",
      profiles: {
        "profile-a": { surname: "A", role: "utilisateur", createdAt: 1, lastSyncAt: 2 },
      },
      gameProgress: {
        "profile-a": {
          day: 3,
          phase: "challenge",
          answers: [1, 0, 2],
          quizStartedAt: null,
          quizDurationSec: 75,
          riddleValidated: true,
          riddleSolved: true,
        },
      },
    });

    expect(snapshot.profiles["profile-a"]?.gameProgress).toEqual({
      day: 3,
      phase: "challenge",
      answers: [1, 0, 2],
      quizStartedAt: null,
      quizDurationSec: 75,
      riddleValidated: true,
      riddleSolved: true,
      challengeDraft: "",
    });
  });

  it("parses an in-progress quiz (playing) with quizStartedAt", () => {
    const snapshot = parseCloudSnapshot({
      phase: "during",
      profiles: {
        "profile-a": { surname: "A", role: "utilisateur", createdAt: 1, lastSyncAt: 2 },
      },
      gameProgress: {
        "profile-a": {
          day: 3,
          phase: "playing",
          answers: [1],
          quizStartedAt: 1700000000000,
          quizDurationSec: 0,
          riddleValidated: false,
          riddleSolved: false,
        },
      },
    });

    expect(snapshot.profiles["profile-a"]?.gameProgress).toEqual({
      day: 3,
      phase: "playing",
      answers: [1],
      quizStartedAt: 1700000000000,
      quizDurationSec: 0,
      riddleValidated: false,
      riddleSolved: false,
      challengeDraft: "",
    });
  });

  it("returns null when gameProgress is absent or malformed", () => {
    const snapshot = parseCloudSnapshot({
      phase: "during",
      profiles: {
        "profile-a": { surname: "A", role: "utilisateur", createdAt: 1, lastSyncAt: 2 },
        "profile-b": { surname: "B", role: "utilisateur", createdAt: 1, lastSyncAt: 2 },
      },
      gameProgress: {
        "profile-b": { day: 1, phase: "done", answers: [], quizStartedAt: null, quizDurationSec: 0, riddleValidated: false, riddleSolved: false },
      },
    });

    expect(snapshot.profiles["profile-a"]?.gameProgress).toBeNull();
    // "done" n'est pas une phase persistée valide (récap du quiz jamais repris) : rejetée.
    expect(snapshot.profiles["profile-b"]?.gameProgress).toBeNull();
  });

  it("writes gameProgress for the target profile on push, and null clears it", async () => {
    mockUpdate.mockClear();
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
      placeComments: {},
      gameResults: [],
      candyCrushChallenge: null,
      phase: "before" as const,
    };

    await pushCloudSnapshot(db, familyId, {
      ...basePayload,
      gameProgress: {
        day: 2,
        phase: "riddle",
        answers: [1, 1],
        quizStartedAt: null,
        quizDurationSec: 40,
        riddleValidated: false,
        riddleSolved: false,
      },
    });
    let updates = mockUpdate.mock.calls[0][0] as Record<string, unknown>;
    expect(updates["gameProgress/profile-1"]).toEqual({
      day: 2,
      phase: "riddle",
      answers: [1, 1],
      quizStartedAt: null,
      quizDurationSec: 40,
      riddleValidated: false,
      riddleSolved: false,
    });

    mockUpdate.mockClear();
    await pushCloudSnapshot(db, familyId, { ...basePayload, gameProgress: null });
    updates = mockUpdate.mock.calls[0][0] as Record<string, unknown>;
    expect(updates["gameProgress/profile-1"]).toBeNull();
  });

  it("clears gameProgress alongside profiles/checklists/gameResults on profile deletion", async () => {
    mockUpdate.mockClear();
    const db = {} as import("firebase/database").Database;
    const familyId = "famille-test";

    await deleteProfileFromCloud(db, familyId, "profile-to-delete");

    const updates = mockUpdate.mock.calls[0][0] as Record<string, unknown>;
    expect(updates["families/famille-test/gameProgress/profile-to-delete"]).toBeNull();
  });

  it("resetGameProgressInCloud clears only the targeted profile's in-progress game", async () => {
    mockUpdate.mockClear();
    const db = {} as import("firebase/database").Database;
    const familyId = "famille-test";

    await resetGameProgressInCloud(db, familyId, "profile-stuck");

    const updates = mockUpdate.mock.calls[0][0] as Record<string, unknown>;
    expect(updates["families/famille-test/gameProgress/profile-stuck"]).toBeNull();
    expect(typeof updates["families/famille-test/updatedAt"]).toBe("number");
    expect(Object.keys(updates)).toHaveLength(2);
  });
});

describe("crosswordProgress parsing and sync", () => {
  const crosswordProgress = {
    puzzleId: "turquie-general",
    entries: { "0,6": "A", "4,13": "I" },
    results: { "0,6": "correct", "4,13": "wrong" },
    completedPuzzleIds: ["turquie-general"],
    updatedAt: 123,
  };

  it("keeps valid per-profile progress and discards malformed crossword fields", () => {
    const snapshot = parseCloudSnapshot({
      profiles: {
        "profile-a": { surname: "A", role: "utilisateur", createdAt: 1, lastSyncAt: 2 },
      },
      crosswordProgress: {
        "profile-a": {
          ...crosswordProgress,
          entries: { ...crosswordProgress.entries, invalid: "Z", "0,6": "too long" },
          results: { ...crosswordProgress.results, invalid: "correct", "4,13": "unknown" },
          completedPuzzleIds: ["turquie-general", "unknown", "turquie-general"],
        },
        "profile-b": { ...crosswordProgress, puzzleId: "unknown" },
      },
    });

    expect(snapshot.crosswordProgress["profile-a"]).toEqual({
      ...crosswordProgress,
      entries: { "4,13": "I" },
      results: {},
    });
    expect(snapshot.crosswordProgress["profile-b"]).toBeNull();
  });

  it("writes and clears only the active profile crossword path", async () => {
    mockUpdate.mockClear();
    const db = {} as import("firebase/database").Database;
    const basePayload = {
      actorUid: "uid-1",
      canWriteFamilyState: false,
      familyState: { version: 1, ownerProfileId: null, profiles: [] } as import("../app/owner-policy").SharedFamilyState,
      ownerCodeHash: "",
      ownerRecoveryHash: "",
      ownerRecoveryConfiguredAt: undefined,
      profileId: "profile-a",
      surname: "A",
      role: "utilisateur" as const,
      checklist: {},
      profileCustomChecklistItems: [],
      ownerGlobalChecklistAdditions: [],
      ownerGlobalChecklistRemovals: {},
      placeComments: {},
      gameResults: [],
      gameProgress: null,
      candyCrushChallenge: null,
      phase: "before" as const,
    };

    await pushCloudSnapshot(db, "famille-test", { ...basePayload, crosswordProgress });
    let updates = mockUpdate.mock.calls[0][0] as Record<string, unknown>;
    expect(updates["crosswordProgress/profile-a"]).toEqual(crosswordProgress);
    expect(updates["crosswordProgress/profile-b"]).toBeUndefined();

    mockUpdate.mockClear();
    await pushCloudSnapshot(db, "famille-test", { ...basePayload, crosswordProgress: null });
    updates = mockUpdate.mock.calls[0][0] as Record<string, unknown>;
    expect(updates["crosswordProgress/profile-a"]).toBeNull();
  });

  it("clears crossword progress when deleting the profile", async () => {
    mockUpdate.mockClear();
    await deleteProfileFromCloud({} as import("firebase/database").Database, "famille-test", "profile-to-delete");

    const updates = mockUpdate.mock.calls[0][0] as Record<string, unknown>;
    expect(updates["families/famille-test/crosswordProgress/profile-to-delete"]).toBeNull();
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

describe("visiteur role round-trip (story 24.1/24.3)", () => {
  const db = {} as import("firebase/database").Database;
  const familyId = "famille-test";
  const basePayload = {
    actorUid: "uid-1",
    canWriteFamilyState: false,
    familyState: {
      version: 1,
      ownerProfileId: "owner-1",
      profiles: [
        { id: "owner-1", role: "proprietaire" as const },
        { id: "profile-1", role: "visiteur" as const },
      ],
    } as import("../app/owner-policy").SharedFamilyState,
    ownerCodeHash: "",
    ownerRecoveryHash: "",
    ownerRecoveryConfiguredAt: undefined,
    profileId: "profile-1",
    surname: "Tonton",
    role: "visiteur" as import("../app/owner-policy").Role,
    profilePasswordHash: "",
    gender: "unspecified" as const,
    householdRole: "member" as const,
    checklist: {},
    profileCustomChecklistItems: [],
    ownerGlobalChecklistAdditions: [],
    ownerGlobalChecklistRemovals: {},
    placeComments: {},
    gameResults: [],
    gameProgress: null,
    candyCrushChallenge: null,
    phase: "before" as const,
  };

  it("parseCloudSnapshot conserve un profil avec le role visiteur", () => {
    const snapshot = parseCloudSnapshot({
      phase: "before",
      ownerProfileId: "owner-1",
      profiles: {
        "owner-1": { surname: "Papa", role: "proprietaire", createdAt: 1, lastSyncAt: 2 },
        "profile-1": { surname: "Tonton", role: "visiteur", createdAt: 1, lastSyncAt: 2 },
      },
    });

    expect(snapshot.profiles["profile-1"]).toBeDefined();
    expect(snapshot.profiles["profile-1"]?.role).toBe("visiteur");
    expect(snapshot.familyState.profiles.find((p) => p.id === "profile-1")?.role).toBe("visiteur");
  });

  it("pushCloudSnapshot depuis l'appareil du visiteur lui-meme ne sanitize pas son role en utilisateur", async () => {
    mockUpdate.mockClear();

    await pushCloudSnapshot(db, familyId, basePayload);

    const updates = mockUpdate.mock.calls[0][0] as Record<string, unknown>;
    expect(updates["profiles/profile-1/role"]).toBe("visiteur");
  });

  it("pushCloudSnapshot depuis l'appareil du proprietaire rebroadcast bien le role visiteur d'un autre profil", async () => {
    mockUpdate.mockClear();

    await pushCloudSnapshot(db, familyId, {
      ...basePayload,
      profileId: "owner-1",
      surname: "Papa",
      role: "proprietaire",
      canWriteFamilyState: true,
      ownerCodeHash: "sha256:" + "d".repeat(64),
    });

    const updates = mockUpdate.mock.calls[0][0] as Record<string, unknown>;
    expect(updates["profiles/owner-1/role"]).toBe("proprietaire");
    expect(updates["profiles/profile-1/role"]).toBe("visiteur");
  });

  it("pushCloudSnapshot ecrit le code voyageur uniquement quand le proprietaire l'a configure", async () => {
    mockUpdate.mockClear();

    await pushCloudSnapshot(db, familyId, {
      ...basePayload,
      profileId: "owner-1",
      role: "proprietaire",
      canWriteFamilyState: true,
      ownerCodeHash: "sha256:" + "e".repeat(64),
      travelerCodeHash: "sha256:" + "f".repeat(64),
      travelerCodePlain: "1234",
    });

    const updates = mockUpdate.mock.calls[0][0] as Record<string, unknown>;
    expect(updates.travelerCodeHash).toBe("sha256:" + "f".repeat(64));
    expect(updates.travelerCodePlain).toBe("1234");
  });

  it("pushCloudSnapshot n'ecrit pas travelerCodeHash quand il n'est pas configure", async () => {
    mockUpdate.mockClear();

    await pushCloudSnapshot(db, familyId, {
      ...basePayload,
      profileId: "owner-1",
      role: "proprietaire",
      canWriteFamilyState: true,
      ownerCodeHash: "sha256:" + "e".repeat(64),
    });

    const updates = mockUpdate.mock.calls[0][0] as Record<string, unknown>;
    expect(updates.travelerCodeHash).toBeUndefined();
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
    placeComments: {},
    gameResults: [],
    gameProgress: null,
    candyCrushChallenge: null,
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

  it("does not overwrite recoveryQuestion when question is empty but hash is valid", async () => {
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
    // When question is empty, the key must NOT be written (preserves existing Firebase value)
    expect(updates["profiles/profile-1/recoveryQuestion"]).toBeUndefined();
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

  it("does not write family-wide phase from generic owner snapshot sync", async () => {
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
    expect(updates.phase).toBeUndefined();
    expect(updates.ownerProfileId).toBe("profile-1");
    expect(updates["profiles/profile-1/role"]).toBe("proprietaire");
  });

  it("does not write ownerCodeHash when it is empty during an owner family-wide push", async () => {
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
      ownerCodeHash: "",
      phase: "during",
    });

    expect(mockUpdate).toHaveBeenCalledOnce();
    const updates = mockUpdate.mock.calls[0][0] as Record<string, unknown>;
    expect(updates.ownerCodeHash).toBeUndefined();
    expect(updates.phase).toBeUndefined();
  });

  it("does not write travelerCodeHash when it is not a valid sha256 hash", async () => {
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
      travelerCodeHash: "abc",
      phase: "during",
    });

    expect(mockUpdate).toHaveBeenCalledOnce();
    const updates = mockUpdate.mock.calls[0][0] as Record<string, unknown>;
    expect(updates.travelerCodeHash).toBeUndefined();
  });

  it("clears every destination survey vote when relocking with resetDestinationSurvey", async () => {
    mockUpdate.mockClear();

    await pushCloudSnapshot(db, familyId, {
      ...basePayload,
      canWriteFamilyState: true,
      resetDestinationSurvey: true,
      familyState: {
        version: 1,
        ownerProfileId: "profile-1",
        profiles: [
          { id: "profile-1", role: "proprietaire" },
          { id: "profile-2", role: "utilisateur" },
        ],
      },
      role: "proprietaire",
      phase: "before",
    });

    expect(mockUpdate).toHaveBeenCalledOnce();
    const updates = mockUpdate.mock.calls[0][0] as Record<string, unknown>;
    expect(updates["destinationSurvey/profile-1"]).toBeNull();
    expect(updates["destinationSurvey/profile-2"]).toBeNull();
    expect(updates.phase).toBeUndefined();
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
      .filter(([key, val]) => val === null && key !== "families/famille-test/profiles/profile-y" && key !== "families/famille-test/checklists/profile-y" && key !== "families/famille-test/gameResults/profile-y" && key !== "families/famille-test/gameProgress/profile-y" && key !== "families/famille-test/crosswordProgress/profile-y" && key !== "families/famille-test/candyCrushChallenge/profile-y" && key !== "chatConversations/famille-test/voyage/memberProfileIds/profile-y")
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

  // Story 28.1, cas limite : un profil supprimé est retiré de la
  // conversation "Voyage" (ses messages passés restent visibles avec leur
  // authorSurnameSnapshot figé, cf. types/cloud.ts).
  it("also removes the deleted profile from the Voyage chat conversation members", async () => {
    mockUpdate.mockClear();

    await deleteProfileFromCloud(db, familyId, "profile-y");

    const updates = mockUpdate.mock.calls[0][0] as Record<string, unknown>;
    expect(updates["chatConversations/famille-test/voyage/memberProfileIds/profile-y"]).toBeNull();
  });

  // Story 28.2, cas limite : même retrait pour les groupes personnalisés et
  // conversations 1-to-1 dont le profil supprimé est membre.
  it("also removes the deleted profile from custom group/direct conversations it belongs to", async () => {
    mockUpdate.mockClear();
    mockGet.mockResolvedValueOnce({
      val: () => ({
        "conv-1": { memberProfileIds: { "profile-y": true, "profile-other": true } },
        "conv-2": { memberProfileIds: { "profile-other": true } },
      }),
      exists: () => true,
    });

    await deleteProfileFromCloud(db, familyId, "profile-y");

    const updates = mockUpdate.mock.calls[0][0] as Record<string, unknown>;
    expect(updates["chatConversations/famille-test/conv-1/memberProfileIds/profile-y"]).toBeNull();
    expect(updates["chatConversations/famille-test/conv-2/memberProfileIds/profile-y"]).toBeUndefined();
  });
});

describe("gameDayOverrides parsing (story 19.1 owner override)", () => {
  it("parses valid open/closed override entries keyed by day", () => {
    const snapshot = parseCloudSnapshot({
      phase: "before",
      profiles: {},
      gameDayOverrides: { "3": "open", "5": "closed" },
    });

    expect(snapshot.gameDayOverrides).toEqual({ 3: "open", 5: "closed" });
  });

  it("drops invalid override values and non-numeric keys", () => {
    const snapshot = parseCloudSnapshot({
      phase: "before",
      profiles: {},
      gameDayOverrides: { "2": "maybe", abc: "open", "4": "closed" },
    });

    expect(snapshot.gameDayOverrides).toEqual({ 4: "closed" });
  });

  it("defaults to an empty object when gameDayOverrides is absent", () => {
    const snapshot = parseCloudSnapshot({ phase: "before", profiles: {} });

    expect(snapshot.gameDayOverrides).toEqual({});
  });
});

describe("place visibility parsing and sync (story 26.2)", () => {
  it("parses valid hidden/visible place visibility entries", () => {
    const snapshot = parseCloudSnapshot({
      phase: "during",
      profiles: {},
      placeVisibilityMap: {
        "sainte-sophie": "hiddenByOwner",
        "tour-galata": "visible",
      },
    });

    expect(snapshot.placeVisibilityMap).toEqual({
      "sainte-sophie": "hiddenByOwner",
      "tour-galata": "visible",
    });
  });

  it("drops invalid place visibility entries and defaults to visible map empty", () => {
    const snapshot = parseCloudSnapshot({
      phase: "during",
      profiles: {},
      placeVisibilityMap: {
        "sainte-sophie": "hiddenByOwner",
        "tour-galata": "secret",
      },
    });

    expect(snapshot.placeVisibilityMap).toEqual({
      "sainte-sophie": "hiddenByOwner",
    });
  });

  it("writes owner place visibility map during owner-scoped push", async () => {
    mockUpdate.mockClear();
    const db = {} as import("firebase/database").Database;

    await pushCloudSnapshot(db, "famille-test", {
      actorUid: "owner-uid",
      canWriteFamilyState: true,
      familyState: {
        version: 1,
        ownerProfileId: "profile-1",
        profiles: [{ id: "profile-1", role: "proprietaire" }],
      },
      ownerCodeHash: "sha256:" + "d".repeat(64),
      profileId: "profile-1",
      surname: "Owner",
      role: "proprietaire",
      checklist: {},
      profileCustomChecklistItems: [],
      ownerGlobalChecklistAdditions: [],
      ownerGlobalChecklistRemovals: {},
      placeComments: {},
      placeVisibilityMap: {
        "sainte-sophie": "hiddenByOwner",
      },
      gameResults: [],
      gameProgress: null,
      candyCrushChallenge: null,
      phase: "during",
    });

    const updates = mockUpdate.mock.calls[0][0] as Record<string, unknown>;
    expect(updates.placeVisibilityMap).toEqual({
      "sainte-sophie": "hiddenByOwner",
    });
  });

  it("parses valid seen/unseen place-seen entries", () => {
    const snapshot = parseCloudSnapshot({
      phase: "during",
      profiles: {},
      placeSeenMap: {
        "sainte-sophie": "seen",
        "tour-galata": "unseen",
      },
    });

    expect(snapshot.placeSeenMap).toEqual({
      "sainte-sophie": "seen",
      "tour-galata": "unseen",
    });
  });

  it("drops invalid place-seen entries", () => {
    const snapshot = parseCloudSnapshot({
      phase: "during",
      profiles: {},
      placeSeenMap: {
        "sainte-sophie": "seen",
        "tour-galata": "maybe",
      },
    });

    expect(snapshot.placeSeenMap).toEqual({
      "sainte-sophie": "seen",
    });
  });

  it("writes owner place-seen map during owner-scoped push", async () => {
    mockUpdate.mockClear();
    const db = {} as import("firebase/database").Database;

    await pushCloudSnapshot(db, "famille-test", {
      actorUid: "owner-uid",
      canWriteFamilyState: true,
      familyState: {
        version: 1,
        ownerProfileId: "profile-1",
        profiles: [{ id: "profile-1", role: "proprietaire" }],
      },
      ownerCodeHash: "sha256:" + "d".repeat(64),
      profileId: "profile-1",
      surname: "Owner",
      role: "proprietaire",
      checklist: {},
      profileCustomChecklistItems: [],
      ownerGlobalChecklistAdditions: [],
      ownerGlobalChecklistRemovals: {},
      placeComments: {},
      placeSeenMap: {
        "sainte-sophie": "seen",
      },
      gameResults: [],
      gameProgress: null,
      candyCrushChallenge: null,
      phase: "during",
    });

    const updates = mockUpdate.mock.calls[0][0] as Record<string, unknown>;
    expect(updates.placeSeenMap).toEqual({
      "sainte-sophie": "seen",
    });
  });

  it("parses place day overrides when RTDB returns an indexed object", () => {
    const snapshot = parseCloudSnapshot({
      phase: "during",
      profiles: {},
      placeDayOverrides: {
        "sainte-sophie": {
          0: 2,
          1: 3,
        },
      },
    });

    expect(snapshot.placeDayOverrides).toEqual({
      "sainte-sophie": [2, 3],
    });
  });

  it("parses place day order overrides when present", () => {
    const snapshot = parseCloudSnapshot({
      phase: "during",
      profiles: {},
      placeDayOverrides: {
        "sainte-sophie": {
          days: [2, 3],
          orderByDay: {
            2: 5,
            3: 1,
          },
        },
      },
    });

    expect(snapshot.placeDayOrderOverrides).toEqual({
      "sainte-sophie": {
        2: 5,
        3: 1,
      },
    });
  });

  it("writes owner place day overrides during owner-scoped push", async () => {
    mockUpdate.mockClear();
    const db = {} as import("firebase/database").Database;

    await pushCloudSnapshot(db, "famille-test", {
      actorUid: "owner-uid",
      canWriteFamilyState: true,
      familyState: {
        version: 1,
        ownerProfileId: "profile-1",
        profiles: [{ id: "profile-1", role: "proprietaire" }],
      },
      ownerCodeHash: "sha256:" + "d".repeat(64),
      profileId: "profile-1",
      surname: "Owner",
      role: "proprietaire",
      checklist: {},
      profileCustomChecklistItems: [],
      ownerGlobalChecklistAdditions: [],
      ownerGlobalChecklistRemovals: {},
      placeComments: {},
      placeDayOverrides: {
        "sainte-sophie": [2, 3],
      },
      gameResults: [],
      gameProgress: null,
      candyCrushChallenge: null,
      phase: "during",
    });

    const updates = mockUpdate.mock.calls[0][0] as Record<string, unknown>;
    expect(updates.placeDayOverrides).toEqual({
      "sainte-sophie": [2, 3],
    });
  });

  it("merges owner place day order overrides into the same placeDayOverrides key (no ancestor/descendant path conflict)", async () => {
    mockUpdate.mockClear();
    const db = {} as import("firebase/database").Database;

    await pushCloudSnapshot(db, "famille-test", {
      actorUid: "owner-uid",
      canWriteFamilyState: true,
      familyState: {
        version: 1,
        ownerProfileId: "profile-1",
        profiles: [{ id: "profile-1", role: "proprietaire" }],
      },
      ownerCodeHash: "sha256:" + "d".repeat(64),
      profileId: "profile-1",
      surname: "Owner",
      role: "proprietaire",
      checklist: {},
      profileCustomChecklistItems: [],
      ownerGlobalChecklistAdditions: [],
      ownerGlobalChecklistRemovals: {},
      placeComments: {},
      placeDayOverrides: {
        "sainte-sophie": [2, 3],
        "Découverte de la Turquie": [1],
      },
      placeDayOrderOverrides: {
        "sainte-sophie": {
          2: 5,
        },
      },
      gameResults: [],
      gameProgress: null,
      candyCrushChallenge: null,
      phase: "during",
    });

    // Un seul update() a bien lieu, avec un seul chemin `placeDayOverrides` :
    // écrire à la fois `placeDayOverrides` et `placeDayOverrides/{id}/orderByDay`
    // dans le même update() faisait échouer TOUT l'appel côté Firebase
    // ("values argument contains a path ... that is ancestor of another path").
    expect(mockUpdate).toHaveBeenCalledOnce();
    const updates = mockUpdate.mock.calls[0][0] as Record<string, unknown>;
    expect(Object.keys(updates).some((key) => key.startsWith("placeDayOverrides/"))).toBe(false);
    expect(updates.placeDayOverrides).toEqual({
      "sainte-sophie": { days: [2, 3], orderByDay: { 2: 5 } },
      "Découverte de la Turquie": [1],
    });
  });
});

describe("document catalog parsing and sync (édition des documents par le propriétaire)", () => {
  const db = {} as import("firebase/database").Database;

  it("strips undefined optional fields from documentCatalogAdditions/Edits before writing (Firebase rejects undefined)", async () => {
    mockUpdate.mockClear();

    await pushCloudSnapshot(db, "famille-test", {
      actorUid: "owner-uid",
      canWriteFamilyState: true,
      familyState: {
        version: 1,
        ownerProfileId: "profile-1",
        profiles: [{ id: "profile-1", role: "proprietaire" }],
      },
      ownerCodeHash: "sha256:" + "d".repeat(64),
      profileId: "profile-1",
      surname: "Owner",
      role: "proprietaire",
      checklist: {},
      profileCustomChecklistItems: [],
      ownerGlobalChecklistAdditions: [],
      ownerGlobalChecklistRemovals: {},
      placeComments: {},
      ownerGlobalDocumentAdditions: [
        {
          id: "doc-custom-1",
          category: "PAPIERS",
          title: "Copie passeport",
          content: "Scan ajouté par le propriétaire.",
          tag: undefined,
          day: undefined,
          details: undefined,
          scans: undefined,
          links: undefined,
          gps: undefined,
        },
      ],
      ownerGlobalDocumentEdits: {
        "vol-nantes-paris-af7507": {
          id: "vol-nantes-paris-af7507",
          category: "VOLS",
          title: "Nantes → Paris (corrigé)",
          content: "Texte corrigé par le propriétaire.",
          tag: undefined,
          day: undefined,
          details: undefined,
          scans: undefined,
          links: undefined,
          gps: undefined,
        },
      },
      gameResults: [],
      gameProgress: null,
      candyCrushChallenge: null,
      phase: "during",
    });

    expect(mockUpdate).toHaveBeenCalledOnce();
    const updates = mockUpdate.mock.calls[0][0] as Record<string, unknown>;

    // JSON.stringify tolère les valeurs `undefined` (elles sont simplement
    // omises) : c'est cette propriété qu'on exploite pour nettoyer les
    // documents avant de les passer à update()/set(), qui lèvent une
    // exception dès qu'une valeur `undefined` apparaît à n'importe quelle
    // profondeur de l'objet.
    const additions = updates.documentCatalogAdditions as Record<string, unknown>;
    expect(additions["doc-custom-1"]).toEqual({
      id: "doc-custom-1",
      category: "PAPIERS",
      title: "Copie passeport",
      content: "Scan ajouté par le propriétaire.",
    });
    expect("gps" in (additions["doc-custom-1"] as object)).toBe(false);

    const edits = updates.documentCatalogEdits as Record<string, unknown>;
    expect(edits["vol-nantes-paris-af7507"]).toEqual({
      id: "vol-nantes-paris-af7507",
      category: "VOLS",
      title: "Nantes → Paris (corrigé)",
      content: "Texte corrigé par le propriétaire.",
    });
    expect("gps" in (edits["vol-nantes-paris-af7507"] as object)).toBe(false);
  });
});

describe("pushGameDayOverride (story 19.1 owner override)", () => {
  const db = {} as import("firebase/database").Database;
  const familyId = "famille-test";

  it("writes the requested override value under gameDayOverrides/{day}", async () => {
    mockUpdate.mockClear();

    await pushGameDayOverride(db, familyId, 3, "closed");

    expect(mockUpdate).toHaveBeenCalledOnce();
    const updates = mockUpdate.mock.calls[0][0] as Record<string, unknown>;
    expect(updates["gameDayOverrides/3"]).toBe("closed");
    expect(typeof updates.updatedAt).toBe("number");
  });

  it("writes null to clear an override and revert to automatic", async () => {
    mockUpdate.mockClear();

    await pushGameDayOverride(db, familyId, 3, null);

    const updates = mockUpdate.mock.calls[0][0] as Record<string, unknown>;
    expect(updates["gameDayOverrides/3"]).toBeNull();
  });
});

describe("pushPlaceDayOverride", () => {
  const db = {} as import("firebase/database").Database;
  const familyId = "famille-test";

  it("writes normalized day overrides under placeDayOverrides/{placeId}", async () => {
    mockUpdate.mockClear();

    await pushPlaceDayOverride(db, familyId, "sainte-sophie", [3, 2, 2]);

    const updates = mockUpdate.mock.calls[0][0] as Record<string, unknown>;
    expect(updates).toEqual({
      "placeDayOverrides/sainte-sophie": {
        days: [2, 3],
      },
    });
  });

  it("writes normalized day order alongside day overrides", async () => {
    mockUpdate.mockClear();

    await pushPlaceDayOverride(db, familyId, "sainte-sophie", [3, 2], {
      2: 5,
      3: 1,
      9: 4,
    });

    const updates = mockUpdate.mock.calls[0][0] as Record<string, unknown>;
    expect(updates).toEqual({
      "placeDayOverrides/sainte-sophie": {
        days: [2, 3],
        orderByDay: {
          2: 5,
          3: 1,
        },
      },
    });
  });

  it("writes null to clear an override", async () => {
    mockUpdate.mockClear();

    await pushPlaceDayOverride(db, familyId, "sainte-sophie", null);

    const updates = mockUpdate.mock.calls[0][0] as Record<string, unknown>;
    expect(updates).toEqual({ "placeDayOverrides/sainte-sophie": null });
  });
});

describe("resetGameResultsInCloud (owner score reset)", () => {
  const db = {} as import("firebase/database").Database;
  const familyId = "famille-test";
  const entryFor = (day: number, totalScore: number) => ({
    day,
    location: "Istanbul",
    quizScore: totalScore,
    correctCount: 1,
    riddleSolved: false,
    challengeDone: false,
    durationSec: 60,
    totalScore,
    completedAt: "2026-07-15T10:00:00.000Z",
  });

  it("nulls out gameResults for every profile on a full reset", async () => {
    mockUpdate.mockClear();

    await resetGameResultsInCloud(
      db,
      familyId,
      {
        "profile-a": [entryFor(1, 10), entryFor(2, 20)],
        "profile-b": [entryFor(1, 5)],
      },
      {},
      {},
      {}
    );

    const updates = mockUpdate.mock.calls[0][0] as Record<string, unknown>;
    expect(updates["families/famille-test/gameResults/profile-a"]).toBeNull();
    expect(updates["families/famille-test/gameResults/profile-b"]).toBeNull();
  });

  it("only removes the targeted day for a per-day reset, keeping other days intact", async () => {
    mockUpdate.mockClear();

    await resetGameResultsInCloud(
      db,
      familyId,
      { "profile-a": [entryFor(1, 10), entryFor(2, 20)] },
      {},
      {},
      {},
      2
    );

    const updates = mockUpdate.mock.calls[0][0] as Record<string, unknown>;
    expect(updates["families/famille-test/gameResults/profile-a"]).toEqual([entryFor(1, 10)]);
  });

  it("writes null for a per-day reset when it empties the profile's history", async () => {
    mockUpdate.mockClear();

    await resetGameResultsInCloud(db, familyId, { "profile-a": [entryFor(1, 10)] }, {}, {}, {}, 1);

    const updates = mockUpdate.mock.calls[0][0] as Record<string, unknown>;
    expect(updates["families/famille-test/gameResults/profile-a"]).toBeNull();
  });

  it("also clears matching in-progress gameProgress on a full reset", async () => {
    mockUpdate.mockClear();

    await resetGameResultsInCloud(
      db,
      familyId,
      { "profile-a": [entryFor(1, 10)] },
      {
        "profile-a": {
          day: 1,
          phase: "riddle",
          answers: [1],
          quizStartedAt: null,
          quizDurationSec: 30,
          riddleValidated: false,
          riddleSolved: false,
        },
        "profile-b": null,
      },
      {},
      {}
    );

    const updates = mockUpdate.mock.calls[0][0] as Record<string, unknown>;
    expect(updates["families/famille-test/gameProgress/profile-a"]).toBeNull();
    expect(updates["families/famille-test/gameProgress/profile-b"]).toBeNull();
  });

  it("only clears gameProgress matching the targeted day on a per-day reset", async () => {
    mockUpdate.mockClear();

    await resetGameResultsInCloud(
      db,
      familyId,
      { "profile-a": [entryFor(2, 10)] },
      {
        "profile-a": {
          day: 2,
          phase: "challenge",
          answers: [1, 0],
          quizStartedAt: null,
          quizDurationSec: 30,
          riddleValidated: true,
          riddleSolved: true,
        },
        "profile-b": {
          day: 5,
          phase: "playing",
          answers: [],
          quizStartedAt: 1700000000000,
          quizDurationSec: 0,
          riddleValidated: false,
          riddleSolved: false,
        },
      },
      {},
      {},
      2
    );

    const updates = mockUpdate.mock.calls[0][0] as Record<string, unknown>;
    expect(updates["families/famille-test/gameProgress/profile-a"]).toBeNull();
    expect(updates["families/famille-test/gameProgress/profile-b"]).toBeUndefined();
  });
});
