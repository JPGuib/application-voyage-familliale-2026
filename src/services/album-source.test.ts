import { describe, expect, it, vi, beforeEach } from "vitest";

const mockGet = vi.fn();
const mockRef = vi.fn((_db: unknown, path?: string) => ({ path }));

vi.mock("firebase/database", async (importOriginal) => {
  const actual = await importOriginal<typeof import("firebase/database")>();
  return {
    ...actual,
    ref: (db: unknown, path?: string) => mockRef(db, path),
    get: (target: unknown) => mockGet(target),
  };
});

import {
  assembleAlbumSource,
  buildEligiblePlaces,
  canAccessAlbumExport,
  filterCarnetVisiteByEligibility,
  isLocationEligible,
  loadFamilyPlaceVisitLogs,
  validateAlbumSourceContent,
} from "./album-source";
import type {
  AlbumSource,
  CloudCarnetVisiteEntry,
  CloudProfileState,
  CloudSyncSnapshot,
} from "../types/cloud";
import type { Place } from "../content/places";

describe("Album Source - Eligibility Filter", () => {
  describe("isLocationEligible", () => {
    it("returns true when location is visible and seen", () => {
      const result = isLocationEligible(
        "place-1",
        { "place-1": "visible" },
        { "place-1": "seen" }
      );
      expect(result).toBe(true);
    });

    it("returns false when location is hiddenByOwner", () => {
      const result = isLocationEligible(
        "place-1",
        { "place-1": "hiddenByOwner" },
        { "place-1": "seen" }
      );
      expect(result).toBe(false);
    });

    it("returns false when location is unseen", () => {
      const result = isLocationEligible(
        "place-1",
        { "place-1": "visible" },
        { "place-1": "unseen" }
      );
      expect(result).toBe(false);
    });

    it("returns false when location is hiddenByOwner AND unseen", () => {
      const result = isLocationEligible(
        "place-1",
        { "place-1": "hiddenByOwner" },
        { "place-1": "unseen" }
      );
      expect(result).toBe(false);
    });

    it("returns true when location is absent from placeVisibilityMap (defaults to visible)", () => {
      const result = isLocationEligible("place-1", {}, { "place-1": "seen" });
      expect(result).toBe(true);
    });

    it("returns false when location is absent from placeSeenMap (defaults to unseen)", () => {
      const result = isLocationEligible("place-1", { "place-1": "visible" }, {});
      expect(result).toBe(false);
    });

    it("handles undefined maps correctly", () => {
      expect(isLocationEligible("place-1", undefined, undefined)).toBe(false);
      expect(isLocationEligible("place-1", { "place-1": "visible" }, undefined)).toBe(false);
      expect(isLocationEligible("place-1", undefined, { "place-1": "seen" })).toBe(true); // visible (default) + seen = eligible
    });

    it("returns true when both maps are undefined and location gets default values", () => {
      // With undefined maps, defaults are: visible=true, seen=false -> not eligible
      expect(isLocationEligible("place-1", undefined, undefined)).toBe(false);
    });
  });

  describe("buildEligiblePlaces", () => {
    const defaultPlaces: Place[] = [
      {
        id: "place-1",
        name: "Place 1",
        shortDesc: "Description 1",
        tag: "tag1",
        jour: [1],
      },
      {
        id: "place-2",
        name: "Place 2",
        shortDesc: "Description 2",
        tag: "tag2",
        jour: [2],
      },
    ];

    const customPlaces: Place[] = [
      {
        id: "place-custom",
        name: "Custom Place",
        shortDesc: "Custom Description",
        tag: "custom",
        jour: [1],
      },
    ];

    it("includes places that are visible and seen", () => {
      const result = buildEligiblePlaces(
        defaultPlaces,
        [],
        { "place-1": "visible" },
        { "place-1": "seen" }
      );
      expect(result).toHaveProperty("place-1");
      expect(result["place-1"]).toEqual({
        placeId: "place-1",
        name: "Place 1",
        shortDesc: "Description 1",
      });
    });

    it("excludes hidden places", () => {
      const result = buildEligiblePlaces(
        defaultPlaces,
        [],
        { "place-1": "hiddenByOwner" },
        { "place-1": "seen" }
      );
      expect(result).not.toHaveProperty("place-1");
    });

    it("excludes unseen places", () => {
      const result = buildEligiblePlaces(
        defaultPlaces,
        [],
        { "place-2": "visible" },
        { "place-2": "unseen" }
      );
      expect(result).not.toHaveProperty("place-2");
    });

    it("combines default and custom places", () => {
      const result = buildEligiblePlaces(
        defaultPlaces,
        customPlaces,
        { "place-1": "visible", "place-custom": "visible" },
        { "place-1": "seen", "place-custom": "seen" }
      );
      expect(result).toHaveProperty("place-1");
      expect(result).toHaveProperty("place-custom");
      expect(Object.keys(result).length).toBe(2);
    });

    it("returns empty object when no places are eligible", () => {
      const result = buildEligiblePlaces(
        defaultPlaces,
        [],
        { "place-1": "hiddenByOwner", "place-2": "hiddenByOwner" },
        { "place-1": "seen", "place-2": "seen" }
      );
      expect(result).toEqual({});
    });

    it("copies the editorial content (story 30.5) from Place onto the eligible entry", () => {
      const placesWithEditorial: Place[] = [
        {
          id: "place-editorial",
          name: "Istanbul",
          shortDesc: "La ville-pont",
          tag: "Ville",
          jour: [2],
          image: "/images/guide/Istanbul photo 1.webp",
          photos: [
            "/images/guide/Istanbul photo 1.webp",
            "/images/places/Mosquée bleue.webp",
          ],
          historyLabel: "Présentation",
          history: "Istanbul est la plus grande ville de Turquie.",
          anecdotesLabel: "Le saviez-vous ?",
          anecdotes: ["Le Bosphore coupe la ville en deux."],
        },
      ];

      const result = buildEligiblePlaces(
        placesWithEditorial,
        [],
        { "place-editorial": "visible" },
        { "place-editorial": "seen" }
      );

      expect(result["place-editorial"]).toEqual({
        placeId: "place-editorial",
        name: "Istanbul",
        shortDesc: "La ville-pont",
        image: "/images/guide/Istanbul photo 1.webp",
        photos: [
          "/images/guide/Istanbul photo 1.webp",
          "/images/places/Mosquée bleue.webp",
        ],
        historyLabel: "Présentation",
        history: "Istanbul est la plus grande ville de Turquie.",
        anecdotesLabel: "Le saviez-vous ?",
        anecdotes: ["Le Bosphore coupe la ville en deux."],
      });
    });

    it("omits editorial fields entirely when the source Place has none (no undefined keys leaking in)", () => {
      const result = buildEligiblePlaces(
        defaultPlaces,
        [],
        { "place-1": "visible" },
        { "place-1": "seen" }
      );

      expect(Object.keys(result["place-1"]!).sort()).toEqual(["name", "placeId", "shortDesc"]);
    });
  });

  describe("filterCarnetVisiteByEligibility", () => {
    const placeCarnetRecords: Record<string, Record<string, CloudCarnetVisiteEntry>> = {
      "place-1": {
        "profile-1-1000": {
          entryId: "profile-1-1000",
          placeId: "place-1",
          authorProfileId: "profile-1",
          authorSurnameSnapshot: "Alice",
          text: "Lovely place",
          photos: {},
          createdAt: 1000,
          updatedAt: 1000,
        },
      },
      "place-2": {
        "profile-2-2000": {
          entryId: "profile-2-2000",
          placeId: "place-2",
          authorProfileId: "profile-2",
          authorSurnameSnapshot: "Bob",
          text: "Great visit",
          photos: { "photo-1": "data:image/jpeg;..." },
          createdAt: 2000,
          updatedAt: 2000,
        },
      },
    };

    it("includes entries from eligible locations only", () => {
      const result = filterCarnetVisiteByEligibility(
        placeCarnetRecords,
        { "place-1": "visible" },
        { "place-1": "seen" }
      );
      expect(result).toHaveProperty("place-1");
      expect(result).not.toHaveProperty("place-2");
    });

    it("excludes entries from hidden locations", () => {
      const result = filterCarnetVisiteByEligibility(
        placeCarnetRecords,
        { "place-1": "hiddenByOwner" },
        { "place-1": "seen" }
      );
      expect(result).not.toHaveProperty("place-1");
    });

    it("excludes entries from unseen locations", () => {
      const result = filterCarnetVisiteByEligibility(
        placeCarnetRecords,
        { "place-1": "visible" },
        { "place-1": "unseen" }
      );
      expect(result).not.toHaveProperty("place-1");
    });

    it("converts entries to AlbumSourceVisitLogEntry format", () => {
      const result = filterCarnetVisiteByEligibility(
        placeCarnetRecords,
        { "place-1": "visible" },
        { "place-1": "seen" }
      );
      const entry = result["place-1"]!["profile-1-1000"];
      expect(entry).toEqual({
        entryId: "profile-1-1000",
        placeId: "place-1",
        authorProfileId: "profile-1",
        authorSurnameSnapshot: "Alice",
        text: "Lovely place",
        photos: {},
        createdAt: 1000,
        updatedAt: 1000,
      });
    });

    it("handles text-only entries (no photos)", () => {
      const result = filterCarnetVisiteByEligibility(
        placeCarnetRecords,
        { "place-1": "visible" },
        { "place-1": "seen" }
      );
      expect(result["place-1"]!["profile-1-1000"]!.photos).toEqual({});
    });

    it("handles photo-only entries (empty text)", () => {
      const photoOnlyRecord: Record<string, Record<string, CloudCarnetVisiteEntry>> = {
        "place-1": {
          "profile-1-1000": {
            entryId: "profile-1-1000",
            placeId: "place-1",
            authorProfileId: "profile-1",
            authorSurnameSnapshot: "Alice",
            text: "",
            photos: { "photo-1": "data:image/jpeg;..." },
            createdAt: 1000,
            updatedAt: 1000,
          },
        },
      };
      const result = filterCarnetVisiteByEligibility(
        photoOnlyRecord,
        { "place-1": "visible" },
        { "place-1": "seen" }
      );
      expect(result["place-1"]!["profile-1-1000"]!.photos).toHaveProperty("photo-1");
    });

    it("returns empty object when no entries are eligible", () => {
      const result = filterCarnetVisiteByEligibility(
        placeCarnetRecords,
        { "place-1": "hiddenByOwner", "place-2": "hiddenByOwner" },
        { "place-1": "seen", "place-2": "seen" }
      );
      expect(result).toEqual({});
    });
  });
});

describe("Album Source - Assembly", () => {
  const mockProfile = (id: string, surname: string): CloudProfileState => ({
    profileId: id,
    surname,
    role: "utilisateur",
    createdAt: 1000,
    lastSyncAt: 1000,
    checklist: {},
    customChecklistItems: [],
    gameResults: [],
    gameProgress: null,
    candyCrushChallenge: null,
    destinationSurveyVote: null,
    phase: "during",
  });

  const mockSnapshot = (): CloudSyncSnapshot => ({
    familyState: { version: 1, ownerProfileId: "owner", profiles: [] },
    ownerCodeHash: "",
    phase: "during",
    tripStartDate: "2026-09-01",
    gameScoring: {
      questionPoints: 10,
      riddlePoints: 20,
      challengePoints: 30,
      destinationProposalScoring: [
        { basePoints: 5, bonusPoints: 10 },
        { basePoints: 5, bonusPoints: 10 },
        { basePoints: 5, bonusPoints: 10 },
      ],
    },
    ownerGlobalChecklistAdditions: [],
    ownerGlobalChecklistRemovals: {},
    placeComments: {},
    placeVisibilityMap: {},
    placeSeenMap: {},
    documentVisibilityMap: {},
    destinationSurvey: {},
    gameDayOverrides: {},
    launchGateCycle: 0,
    launchGateCompletedCycleByProfile: {},
    crosswordProgress: {},
    profiles: {},
    updatedAt: Date.now(),
  });

  describe("assembleAlbumSource", () => {
    it("creates album source with eligible places and visit logs", () => {
      const snapshot = mockSnapshot();
      snapshot.profiles = {
        "profile-1": mockProfile("profile-1", "Alice"),
      };
      snapshot.placeVisibilityMap = { "place-1": "visible" };
      snapshot.placeSeenMap = { "place-1": "seen" };

      const places: Place[] = [
        {
          id: "place-1",
          name: "Place 1",
          shortDesc: "Description 1",
          tag: "tag1",
          jour: [1],
        },
      ];

      const placeCarnet: Record<string, Record<string, CloudCarnetVisiteEntry>> = {
        "place-1": {
          "profile-1-1000": {
            entryId: "profile-1-1000",
            placeId: "place-1",
            authorProfileId: "profile-1",
            authorSurnameSnapshot: "Alice",
            text: "Great place",
            photos: {},
            createdAt: 1000,
            updatedAt: 1000,
          },
        },
      };

      const result = assembleAlbumSource(snapshot, placeCarnet, places, []);

      expect(result.eligiblePlaces).toHaveProperty("place-1");
      expect(result.placeVisitLogs).toHaveProperty("place-1");
      expect(result.requiredProfiles).toHaveProperty("profile-1");
      expect(result.tripStartDate).toBe("2026-09-01");
      expect(result.phase).toBe("during");
      expect(result.generatedAt).toBeGreaterThan(0);
    });

    it("includes only profiles with visit log entries", () => {
      const snapshot = mockSnapshot();
      snapshot.profiles = {
        "profile-1": mockProfile("profile-1", "Alice"),
        "profile-2": mockProfile("profile-2", "Bob"),
      };
      snapshot.placeVisibilityMap = { "place-1": "visible" };
      snapshot.placeSeenMap = { "place-1": "seen" };

      const places: Place[] = [
        {
          id: "place-1",
          name: "Place 1",
          shortDesc: "Description 1",
          tag: "tag1",
          jour: [1],
        },
      ];

      const placeCarnet: Record<string, Record<string, CloudCarnetVisiteEntry>> = {
        "place-1": {
          "profile-1-1000": {
            entryId: "profile-1-1000",
            placeId: "place-1",
            authorProfileId: "profile-1",
            authorSurnameSnapshot: "Alice",
            text: "Great place",
            photos: {},
            createdAt: 1000,
            updatedAt: 1000,
          },
        },
      };

      const result = assembleAlbumSource(snapshot, placeCarnet, places, []);

      expect(result.requiredProfiles).toHaveProperty("profile-1");
      expect(result.requiredProfiles).not.toHaveProperty("profile-2");
    });

    it("includes game results from snapshot", () => {
      const snapshot = mockSnapshot();
      const profileWithGames = mockProfile("profile-1", "Alice");
      profileWithGames.gameResults = [
        {
          day: 1,
          location: "place-1",
          quizScore: 100,
          correctCount: 5,
          riddleSolved: true,
          challengeDone: true,
          durationSec: 300,
          totalScore: 150,
          completedAt: "2026-09-01T10:00:00Z",
        },
      ];
      snapshot.profiles = { "profile-1": profileWithGames };
      snapshot.placeVisibilityMap = { "place-1": "visible" };
      snapshot.placeSeenMap = { "place-1": "seen" };

      const places: Place[] = [
        {
          id: "place-1",
          name: "Place 1",
          shortDesc: "Description 1",
          tag: "tag1",
          jour: [1],
        },
      ];

      const result = assembleAlbumSource(snapshot, {}, places, []);

      expect(result.gameResults).toHaveProperty("profile-1");
      expect(result.gameResults["profile-1"]).toHaveLength(1);
      expect(result.gameResults["profile-1"]![0]!.day).toBe(1);
    });

    it("handles empty carnet records", () => {
      const snapshot = mockSnapshot();
      snapshot.profiles = { "profile-1": mockProfile("profile-1", "Alice") };
      snapshot.placeVisibilityMap = { "place-1": "visible" };
      snapshot.placeSeenMap = { "place-1": "seen" };

      const places: Place[] = [
        {
          id: "place-1",
          name: "Place 1",
          shortDesc: "Description 1",
          tag: "tag1",
          jour: [1],
        },
      ];

      const result = assembleAlbumSource(snapshot, {}, places, []);

      expect(result.eligiblePlaces).toHaveProperty("place-1");
      expect(result.placeVisitLogs).toEqual({});
      expect(result.requiredProfiles).toEqual({});
    });
  });

  describe("validateAlbumSourceContent", () => {
    it("validates a correct album source", () => {
      const validSource: AlbumSource = {
        tripStartDate: "2026-09-01",
        phase: "during",
        generatedAt: Date.now(),
        eligiblePlaces: { "place-1": { placeId: "place-1", name: "Place 1", shortDesc: "Desc" } },
        placeVisitLogs: {},
        requiredProfiles: {},
        gameResults: {},
      };

      expect(validateAlbumSourceContent(validSource)).toBe(true);
    });

    it("rejects source with missing eligiblePlaces", () => {
      const invalidSource = {
        tripStartDate: "2026-09-01",
        phase: "during",
        generatedAt: Date.now(),
        placeVisitLogs: {},
        requiredProfiles: {},
        gameResults: {},
      } as unknown as AlbumSource;

      expect(validateAlbumSourceContent(invalidSource)).toBe(false);
    });

    it("rejects source with missing placeVisitLogs", () => {
      const invalidSource = {
        tripStartDate: "2026-09-01",
        phase: "during",
        generatedAt: Date.now(),
        eligiblePlaces: {},
        requiredProfiles: {},
        gameResults: {},
      } as unknown as AlbumSource;

      expect(validateAlbumSourceContent(invalidSource)).toBe(false);
    });

    it("rejects source with forbidden fields like documents", () => {
      const invalidSource = {
        tripStartDate: "2026-09-01",
        phase: "during",
        generatedAt: Date.now(),
        eligiblePlaces: {},
        placeVisitLogs: {},
        requiredProfiles: {},
        gameResults: {},
        documents: {}, // Forbidden!
      } as unknown as AlbumSource;

      expect(validateAlbumSourceContent(invalidSource)).toBe(false);
    });

    it("rejects source with forbidden chatMessages", () => {
      const invalidSource = {
        tripStartDate: "2026-09-01",
        phase: "during",
        generatedAt: Date.now(),
        eligiblePlaces: {},
        placeVisitLogs: {},
        requiredProfiles: {},
        gameResults: {},
        chatMessages: {}, // Forbidden!
      } as unknown as AlbumSource;

      expect(validateAlbumSourceContent(invalidSource)).toBe(false);
    });
  });

  describe("Retrocompatibility > Missing placeSeenMap", () => {
    it("assembleAlbumSource > handles snapshot with missing placeSeenMap field gracefully", () => {
      const snapshot = mockSnapshot();
      snapshot.profiles = {
        "profile-1": mockProfile("profile-1", "Alice"),
      };
      snapshot.placeVisibilityMap = { "place-1": "visible" };
      snapshot.placeSeenMap = {};

      // Delete placeSeenMap to simulate older snapshots
      delete (snapshot as any).placeSeenMap;

      const placeCarnetRecords: Record<string, Record<string, CloudCarnetVisiteEntry>> = {
        "place-1": {
          "entry-1": {
            entryId: "entry-1",
            placeId: "place-1",
            authorProfileId: "profile-1",
            authorSurnameSnapshot: "Alice",
            text: "Visite fun!",
            photos: {},
            createdAt: 1000,
            updatedAt: 1000,
          },
        },
      };

      const result = assembleAlbumSource(
        snapshot,
        placeCarnetRecords,
        [{ id: "place-1", name: "Ephesus", type: "landmark" } as Place],
        [] // customPlaces must be an array
      );

      // place-1 should NOT be in eligiblePlaces because placeSeenMap is missing
      // (defaults to "unseen" for all places)
      expect(result.eligiblePlaces).toEqual({});
      // placeVisitLogs should also be empty since place-1 is not eligible
      expect(result.placeVisitLogs).toEqual({});
    });

    it("buildEligiblePlaces > filters correctly when placeSeenMap is missing from snapshot", () => {
      const snapshot = mockSnapshot();

      const eligible = buildEligiblePlaces(
        [{ id: "place-1", name: "Ephesus", type: "landmark" } as Place],
        [], // customPlaces must be an array, not an object
        snapshot.placeVisibilityMap,
        undefined // Missing placeSeenMap
      );

      // All places should be filtered out (unseen = not eligible)
      expect(eligible).toEqual({});
    });

    it("isLocationEligible > defaults to unseen when placeSeenMap is undefined", () => {
      expect(isLocationEligible("place-1", { "place-1": "visible" }, undefined)).toBe(false);
    });
  });

  describe("Access Control", () => {
    it("canAccessAlbumExport > allows proprietaire", () => {
      expect(canAccessAlbumExport("proprietaire")).toBe(true);
    });

    it("canAccessAlbumExport > allows utilisateur", () => {
      expect(canAccessAlbumExport("utilisateur")).toBe(true);
    });

    it("canAccessAlbumExport > blocks visiteur", () => {
      expect(canAccessAlbumExport("visiteur")).toBe(false);
    });

    it("canAccessAlbumExport > blocks null role", () => {
      expect(canAccessAlbumExport(null)).toBe(false);
    });
  });

  describe("Firebase Collector", () => {
    const db = {} as import("firebase/database").Database;

    const validEntry = (overrides: Record<string, unknown> = {}) => ({
      entryId: "entry-1",
      placeId: "place-1",
      authorProfileId: "profile-1",
      authorSurnameSnapshot: "Alice",
      text: "Superbe visite",
      photos: {},
      createdAt: 1000,
      updatedAt: 1000,
      authorUid: "uid-1",
      ...overrides,
    });

    const snapshotOf = (value: unknown) => ({
      exists: () => value !== null && value !== undefined,
      val: () => value,
    });

    beforeEach(() => {
      mockGet.mockReset();
      mockRef.mockClear();
    });

    it("reads placeVisitLogs/$familyId exactly once, without any subscription (AC4)", async () => {
      mockGet.mockResolvedValue(snapshotOf(null));

      await loadFamilyPlaceVisitLogs(db, "famille-test");

      expect(mockRef).toHaveBeenCalledWith(db, "placeVisitLogs/famille-test");
      expect(mockGet).toHaveBeenCalledTimes(1);
    });

    it("returns an empty object when the snapshot does not exist", async () => {
      mockGet.mockResolvedValue(snapshotOf(null));

      await expect(loadFamilyPlaceVisitLogs(db, "famille-test")).resolves.toEqual({});
    });

    it("parses entries from several places, keyed by placeId then entryId", async () => {
      mockGet.mockResolvedValue(
        snapshotOf({
          "place-1": {
            "entry-1": validEntry(),
            "entry-2": validEntry({ entryId: "entry-2", text: "Deuxième passage" }),
          },
          "place-2": {
            "entry-3": validEntry({ entryId: "entry-3", placeId: "place-2" }),
          },
        })
      );

      const result = await loadFamilyPlaceVisitLogs(db, "famille-test");

      expect(Object.keys(result)).toEqual(["place-1", "place-2"]);
      expect(Object.keys(result["place-1"])).toEqual(["entry-1", "entry-2"]);
      expect(result["place-2"]["entry-3"]).toMatchObject({
        placeId: "place-2",
        authorProfileId: "profile-1",
        authorUid: "uid-1",
      });
    });

    it("keeps photo entries and caps them at the per-entry limit", async () => {
      const photos: Record<string, string> = {};
      for (let i = 0; i < 15; i += 1) {
        photos[`photo-${i}`] = `data-${i}`;
      }
      mockGet.mockResolvedValue(
        snapshotOf({ "place-1": { "entry-1": validEntry({ text: "", photos }) } })
      );

      const result = await loadFamilyPlaceVisitLogs(db, "famille-test");

      expect(Object.keys(result["place-1"]["entry-1"].photos)).toHaveLength(10);
    });

    it("drops malformed entries but keeps the valid ones of the same place", async () => {
      mockGet.mockResolvedValue(
        snapshotOf({
          "place-1": {
            "entry-ok": validEntry({ entryId: "entry-ok" }),
            "entry-no-author": validEntry({ entryId: "entry-no-author", authorProfileId: "" }),
            "entry-no-surname": validEntry({
              entryId: "entry-no-surname",
              authorSurnameSnapshot: "",
            }),
            "entry-bad-date": validEntry({ entryId: "entry-bad-date", createdAt: 0 }),
            "entry-not-object": "corrompu",
          },
        })
      );

      const result = await loadFamilyPlaceVisitLogs(db, "famille-test");

      expect(Object.keys(result["place-1"])).toEqual(["entry-ok"]);
    });

    it("omits a place whose entries are all malformed", async () => {
      mockGet.mockResolvedValue(
        snapshotOf({
          "place-1": { "entry-1": validEntry() },
          "place-2": { "entry-2": validEntry({ authorProfileId: "" }) },
          "place-3": "corrompu",
        })
      );

      const result = await loadFamilyPlaceVisitLogs(db, "famille-test");

      expect(Object.keys(result)).toEqual(["place-1"]);
    });

    it("propagates a read failure instead of returning partial data", async () => {
      mockGet.mockRejectedValue(new Error("permission_denied"));

      await expect(loadFamilyPlaceVisitLogs(db, "famille-test")).rejects.toThrow(
        "permission_denied"
      );
    });
  });
});
