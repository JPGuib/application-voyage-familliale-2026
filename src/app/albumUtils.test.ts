import { describe, it, expect } from "vitest";
import {
  filterAlbumContent,
  findFallbackCoverPhoto,
  findPhotoSource,
  escapeAndLimitText,
  validateDraftForPreview,
  pageCountEstimate,
  imageCountEstimate,
  ALBUM_MAX_EDITORIAL_PHOTOS_PER_PLACE,
  ALBUM_MAX_PHOTOS_PER_PLACE,
  ALBUM_MIN_PHOTOS_PER_PLACE,
  ALBUM_NO_COVER_PHOTO_ID,
  PHOTO_QUALITY_TIER_DEFAULT,
  PHOTO_QUALITY_TIER_REDUCED,
  PHOTO_QUALITY_TIER_MINIMAL,
  PHOTO_QUALITY_TIER_PLACES_THRESHOLD_REDUCED,
  PHOTO_QUALITY_TIER_PLACES_THRESHOLD_MINIMAL,
  resolvePhotoBudgetPerPlace,
  resolvePhotoQualityTier,
  isPhotoBudgetReduced,
  isPhotoQualityDegraded,
  selectBudgetedCarnetPhotos,
  fitWithinBox,
  buildEditorialCoverPhotoId,
  resolveCoverPhotoSource,
  resolveEffectiveCoverPhoto,
  listCoverPhotoOptions,
  type FilteredAlbumPlace,
} from "./albumUtils";
import type { AlbumDraft, AlbumSource } from "../types/cloud";

describe("fitWithinBox (cadre photo façon polaroid de l'export PDF)", () => {
  it("conserve le ratio et centre une image plus large que haute dans une boîte carrée", () => {
    const result = fitWithinBox(1600, 900, 100, 100);
    expect(result.width).toBeCloseTo(100, 5);
    expect(result.height).toBeCloseTo(56.25, 5);
    expect(result.offsetX).toBeCloseTo(0, 5);
    expect(result.offsetY).toBeCloseTo((100 - 56.25) / 2, 5);
  });

  it("conserve le ratio et centre une image plus haute que large dans une boîte carrée", () => {
    const result = fitWithinBox(900, 1600, 100, 100);
    expect(result.width).toBeCloseTo(56.25, 5);
    expect(result.height).toBeCloseTo(100, 5);
    expect(result.offsetX).toBeCloseTo((100 - 56.25) / 2, 5);
    expect(result.offsetY).toBeCloseTo(0, 5);
  });

  it("remplit exactement la boîte quand l'image a déjà le même ratio", () => {
    const result = fitWithinBox(200, 100, 40, 20);
    expect(result).toEqual({ width: 40, height: 20, offsetX: 0, offsetY: 0 });
  });

  it("se rabat sur la boîte entière quand les dimensions naturelles sont invalides (cas limite)", () => {
    expect(fitWithinBox(0, 0, 40, 30)).toEqual({ width: 40, height: 30, offsetX: 0, offsetY: 0 });
    expect(fitWithinBox(-10, 100, 40, 30)).toEqual({ width: 40, height: 30, offsetX: 0, offsetY: 0 });
    expect(fitWithinBox(Number.NaN, 100, 40, 30)).toEqual({ width: 40, height: 30, offsetX: 0, offsetY: 0 });
  });
});

describe("Album Utilities", () => {
  const mockSource: AlbumSource = {
    tripStartDate: "2026-08-16",
    lastTripDay: null,
    phase: "during",
    generatedAt: Date.now(),
    eligiblePlaces: {
      "place-1": { placeId: "place-1", name: "Istanbul", shortDesc: "Historic city", jour: [1] },
      "place-2": { placeId: "place-2", name: "Cappadocia", shortDesc: "Rock formations", jour: [2] },
    },
    placeVisitLogs: {
      "place-1": {
        "entry-1": {
          entryId: "entry-1",
          placeId: "place-1",
          authorProfileId: "profile-1",
          authorSurnameSnapshot: "John",
          text: "Amazing place!",
          photos: { "photo-1": "data:image/jpeg;base64,..." },
          createdAt: 1000,
          updatedAt: 1000,
        },
      },
      "place-2": {
        "entry-2": {
          entryId: "entry-2",
          placeId: "place-2",
          authorProfileId: "profile-1",
          authorSurnameSnapshot: "John",
          text: "Beautiful rock formations",
          photos: { "photo-2": "data:image/jpeg;base64,..." },
          createdAt: 2000,
          updatedAt: 2000,
        },
      },
    },
    placeComments: {},
    requiredProfiles: {
      "profile-1": { profileId: "profile-1", surname: "John" },
    },
    gameResults: {
      "profile-1": [
        {
          day: 1,
          location: "Istanbul",
          quizScore: 80,
          correctCount: 8,
          riddleSolved: true,
          challengeDone: true,
          durationSec: 300,
          totalScore: 100,
          completedAt: "2026-08-16",
        },
      ],
    },
  };

  const mockDraft: AlbumDraft = {
    profileId: "profile-1",
    title: "My Amazing Trip",
    subtitle: "Turkey Adventure",
    coverPhotoId: "photo-1",
    includedLocationIds: new Set(["place-1"]),
    includeGameSummary: false,
    theme: "default",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  describe("filterAlbumContent", () => {
    it("filters locations based on draft selection", () => {
      const result = filterAlbumContent(mockSource, mockDraft);

      expect(Object.keys(result.places)).toContain("place-1");
      expect(Object.keys(result.places)).not.toContain("place-2");
    });

    it("filters journal entries for selected locations", () => {
      const result = filterAlbumContent(mockSource, mockDraft);

      expect(Object.keys(result.entries)).toContain("place-1");
      expect(Object.keys(result.entries)).not.toContain("place-2");
    });

    it("includes game summary when enabled in draft", () => {
      const draftWithGames = { ...mockDraft, includeGameSummary: true };
      const result = filterAlbumContent(mockSource, draftWithGames);

      expect(result.gameSummary).not.toBeNull();
      expect(result.gameSummary?.totalScore).toBe(100);
      expect(result.gameSummary?.bestDay).toBe(1);
      expect(result.gameSummary?.podium[0]?.rank).toBe(1);
    });

    it("excludes game summary when disabled in draft", () => {
      const result = filterAlbumContent(mockSource, mockDraft);
      expect(result.gameSummary).toBeNull();
    });

    it("estimates page count based on content", () => {
      const result = filterAlbumContent(mockSource, mockDraft);
      expect(result.estimatedPageCount).toBeGreaterThan(0);
    });

    it("estimates image count from entries", () => {
      const result = filterAlbumContent(mockSource, mockDraft);
      expect(result.estimatedImageCount).toBe(1); // One photo in place-1
    });

    it("filters family comments (avis) for selected locations only (story 30.6)", () => {
      const sourceWithComments: AlbumSource = {
        ...mockSource,
        placeComments: {
          "place-1": {
            "comment-1": {
              commentId: "comment-1",
              placeId: "place-1",
              authorProfileId: "profile-1",
              authorSurnameSnapshot: "John",
              reaction: "like",
              text: "Super !",
              createdAt: 1000,
              updatedAt: 1000,
            },
          },
          "place-2": {
            "comment-2": {
              commentId: "comment-2",
              placeId: "place-2",
              authorProfileId: "profile-1",
              authorSurnameSnapshot: "John",
              reaction: null,
              text: "Bof",
              createdAt: 2000,
              updatedAt: 2000,
            },
          },
        },
      };

      const result = filterAlbumContent(sourceWithComments, mockDraft);

      expect(Object.keys(result.comments)).toContain("place-1");
      expect(Object.keys(result.comments)).not.toContain("place-2");
    });

    it("carries the place's jour field through to the filtered place (story 30.6)", () => {
      const result = filterAlbumContent(mockSource, mockDraft);
      expect(result.places["place-1"]!.jour).toEqual([1]);
    });

    it("detects missing cover photo", () => {
      const draftWithMissingCover = {
        ...mockDraft,
        coverPhotoId: "non-existent-photo",
      };
      const result = filterAlbumContent(mockSource, draftWithMissingCover);
      expect(result.coverPhotoMissing).toBe(true);
    });
  });

  describe("filterAlbumContent > editorial content (story 30.5)", () => {
    const sourceWithEditorial: AlbumSource = {
      ...mockSource,
      eligiblePlaces: {
        "place-1": {
          placeId: "place-1",
          name: "Istanbul",
          shortDesc: "Historic city",
          jour: [1],
          image: "/images/guide/Istanbul photo 1.webp",
          // 20 photos éditoriales : volontairement au-dessus du plafond
          // (ALBUM_MAX_EDITORIAL_PHOTOS_PER_PLACE = 15, story 30.6) pour
          // exercer réellement le comportement de plafonnement ci-dessous.
          photos: Array.from({ length: 20 }, (_, index) => `/images/places/photo-${index}.webp`),
          historyLabel: "Présentation",
          history: "Istanbul est la plus grande ville de Turquie.",
          anecdotesLabel: "Le saviez-vous ?",
          anecdotes: ["Le Bosphore coupe la ville en deux."],
        },
        "place-2": {
          placeId: "place-2",
          name: "Cappadocia",
          shortDesc: "Rock formations",
          jour: [2],
          // Pas de contenu éditorial pour ce lieu (ex. simple vol du programme).
        },
      },
    };

    it("carries the editorial content through for an included place, even without a journal entry", () => {
      const draftWithoutEntries: AlbumDraft = {
        ...mockDraft,
        includedLocationIds: new Set(["place-1"]),
      };
      const sourceWithoutEntries: AlbumSource = { ...sourceWithEditorial, placeVisitLogs: {} };

      const result = filterAlbumContent(sourceWithoutEntries, draftWithoutEntries);

      expect(result.places["place-1"]).toMatchObject({
        name: "Istanbul",
        historyLabel: "Présentation",
        history: "Istanbul est la plus grande ville de Turquie.",
        anecdotesLabel: "Le saviez-vous ?",
        anecdotes: ["Le Bosphore coupe la ville en deux."],
      });
      expect(result.places["place-1"]!.photos).toHaveLength(20);
    });

    it("keeps a place with no editorial content at all without crashing (place-2 has no history/anecdotes/photos)", () => {
      const draft: AlbumDraft = { ...mockDraft, includedLocationIds: new Set(["place-2"]) };
      const result = filterAlbumContent(sourceWithEditorial, draft);

      expect(result.places["place-2"]).toMatchObject({ name: "Cappadocia" });
      expect(result.places["place-2"]!.history).toBeUndefined();
      expect(result.places["place-2"]!.anecdotes).toBeUndefined();
      expect(result.places["place-2"]!.photos).toBeUndefined();
    });

    it("caps the editorial photo count per place at ALBUM_MAX_EDITORIAL_PHOTOS_PER_PLACE for the image estimate", () => {
      const draft: AlbumDraft = {
        ...mockDraft,
        includedLocationIds: new Set(["place-1"]),
        coverPhotoId: "",
      };
      const sourceWithoutEntries: AlbumSource = { ...sourceWithEditorial, placeVisitLogs: {} };

      const result = filterAlbumContent(sourceWithoutEntries, draft);

      // Le lieu a 20 photos éditoriales en source, mais le plafond est appliqué.
      expect(result.estimatedImageCount).toBe(ALBUM_MAX_EDITORIAL_PHOTOS_PER_PLACE);
    });

    it("combines editorial photos (capped) and carnet photos in the image estimate", () => {
      const draft: AlbumDraft = { ...mockDraft, includedLocationIds: new Set(["place-1"]) };
      const result = filterAlbumContent(sourceWithEditorial, draft);

      // Photos éditoriales plafonnées (sur 20) + 1 photo de carnet (entry-1).
      expect(result.estimatedImageCount).toBe(ALBUM_MAX_EDITORIAL_PHOTOS_PER_PLACE + 1);
    });
  });

  describe("findFallbackCoverPhoto", () => {
    it("returns first available photo from entries", () => {
      const entries = {
        "place-1": {
          "entry-1": {
            entryId: "entry-1",
            photos: { "photo-1": "data:...", "photo-2": "data:..." },
          },
        },
      };
      const fallback = findFallbackCoverPhoto(entries);
      expect(fallback).toBe("photo-1");
    });

    it("returns empty string if no photos available", () => {
      const entries = {
        "place-1": {
          "entry-1": {
            entryId: "entry-1",
            photos: {},
          },
        },
      };
      const fallback = findFallbackCoverPhoto(entries);
      expect(fallback).toBe("");
    });

    it("returns empty string for empty entries", () => {
      const fallback = findFallbackCoverPhoto({});
      expect(fallback).toBe("");
    });

    it("resolves the stored source for a selected photo", () => {
      const source = findPhotoSource(mockSource.placeVisitLogs, "photo-1");
      expect(source).toBe("data:image/jpeg;base64,...");
    });

    it("returns empty string when a selected photo is unavailable", () => {
      const source = findPhotoSource(mockSource.placeVisitLogs, "missing-photo");
      expect(source).toBe("");
    });
  });

  describe("escapeAndLimitText", () => {
    it("escapes HTML special characters", () => {
      const text = '<script>alert("xss")</script>';
      const escaped = escapeAndLimitText(text);
      expect(escaped).not.toContain("<script>");
      expect(escaped).toContain("&lt;script&gt;");
    });

    it("limits text length", () => {
      const longText = "A".repeat(300);
      const limited = escapeAndLimitText(longText, 100);
      expect(limited.length).toBeLessThanOrEqual(100);
    });

    it("escapes quotes", () => {
      const text = 'He said "Hello"';
      const escaped = escapeAndLimitText(text);
      expect(escaped).toContain("&quot;");
    });

    it("escapes ampersands", () => {
      const text = "Fish & chips";
      const escaped = escapeAndLimitText(text);
      expect(escaped).toContain("&amp;");
    });

    it("uses default max length of 200", () => {
      const longText = "A".repeat(300);
      const limited = escapeAndLimitText(longText);
      expect(limited.length).toBeLessThanOrEqual(200);
    });
  });

  describe("validateDraftForPreview", () => {
    it("validates that selected locations are eligible", () => {
      const isValid = validateDraftForPreview(mockDraft, mockSource);
      expect(isValid).toBe(true);
    });

    it("rejects draft with ineligible locations", () => {
      const invalidDraft = {
        ...mockDraft,
        includedLocationIds: new Set(["non-existent-place"]),
      };
      const isValid = validateDraftForPreview(invalidDraft, mockSource);
      expect(isValid).toBe(false);
    });

    it("accepts draft with empty location selection", () => {
      const emptyDraft = {
        ...mockDraft,
        includedLocationIds: new Set(),
      };
      const isValid = validateDraftForPreview(emptyDraft, mockSource);
      expect(isValid).toBe(true);
    });

    it("accepts draft with multiple eligible locations", () => {
      const multiDraft = {
        ...mockDraft,
        includedLocationIds: new Set(["place-1", "place-2"]),
      };
      const isValid = validateDraftForPreview(multiDraft, mockSource);
      expect(isValid).toBe(true);
    });
  });

  describe("preview estimate helpers", () => {
    it("exposes pageCountEstimate for the album preview", () => {
      const pages = pageCountEstimate(mockSource, mockDraft);
      expect(pages).toBeGreaterThan(0);
      expect(pages).toBeGreaterThanOrEqual(1);
    });

    it("exposes imageCountEstimate for the album preview", () => {
      const images = imageCountEstimate(mockSource, mockDraft);
      expect(images).toBe(1);
    });
  });

  describe("resolvePhotoQualityTier (export adaptatif, ajout story 30.5)", () => {
    it("keeps the default (non-degraded) tier for a trip with few places", () => {
      expect(resolvePhotoQualityTier(1)).toEqual(PHOTO_QUALITY_TIER_DEFAULT);
      expect(resolvePhotoQualityTier(PHOTO_QUALITY_TIER_PLACES_THRESHOLD_REDUCED)).toEqual(
        PHOTO_QUALITY_TIER_DEFAULT
      );
    });

    it("switches to the reduced tier just above the first threshold", () => {
      expect(resolvePhotoQualityTier(PHOTO_QUALITY_TIER_PLACES_THRESHOLD_REDUCED + 1)).toEqual(
        PHOTO_QUALITY_TIER_REDUCED
      );
      expect(resolvePhotoQualityTier(PHOTO_QUALITY_TIER_PLACES_THRESHOLD_MINIMAL)).toEqual(
        PHOTO_QUALITY_TIER_REDUCED
      );
    });

    it("switches to the minimal tier just above the second threshold", () => {
      expect(resolvePhotoQualityTier(PHOTO_QUALITY_TIER_PLACES_THRESHOLD_MINIMAL + 1)).toEqual(
        PHOTO_QUALITY_TIER_MINIMAL
      );
      expect(resolvePhotoQualityTier(200)).toEqual(PHOTO_QUALITY_TIER_MINIMAL);
    });

    it("exposes isPhotoQualityDegraded consistent with the resolved tier", () => {
      expect(isPhotoQualityDegraded(resolvePhotoQualityTier(1))).toBe(false);
      expect(isPhotoQualityDegraded(resolvePhotoQualityTier(50))).toBe(true);
    });
  });

  describe("resolvePhotoBudgetPerPlace (export adaptatif, ajout story 30.5)", () => {
    it("grants the maximum historical budget (3 editorial + 5 carnet) for a trip with few places", () => {
      const budget = resolvePhotoBudgetPerPlace(1);
      expect(budget.total).toBe(ALBUM_MAX_PHOTOS_PER_PLACE);
      expect(budget.editorial).toBe(ALBUM_MAX_EDITORIAL_PHOTOS_PER_PLACE);
      expect(budget.carnet).toBe(ALBUM_MAX_PHOTOS_PER_PLACE - ALBUM_MAX_EDITORIAL_PHOTOS_PER_PLACE);
      expect(isPhotoBudgetReduced(budget)).toBe(false);
    });

    it("reduces the per-place budget as the number of included places grows", () => {
      const smallTripBudget = resolvePhotoBudgetPerPlace(5);
      const bigTripBudget = resolvePhotoBudgetPerPlace(60);

      expect(bigTripBudget.total).toBeLessThan(smallTripBudget.total);
      expect(isPhotoBudgetReduced(bigTripBudget)).toBe(true);
    });

    it("never goes below the minimum guaranteed budget per place, even for a huge number of places", () => {
      const budget = resolvePhotoBudgetPerPlace(1000);
      expect(budget.total).toBe(ALBUM_MIN_PHOTOS_PER_PLACE);
      expect(budget.editorial).toBeGreaterThanOrEqual(1);
      expect(budget.carnet).toBeGreaterThanOrEqual(0);
      expect(budget.editorial + budget.carnet).toBe(budget.total);
    });

    it("always keeps editorial + carnet parts summing to the total budget", () => {
      for (const placeCount of [1, 5, 10, 15, 16, 30, 31, 50, 100]) {
        const budget = resolvePhotoBudgetPerPlace(placeCount);
        expect(budget.editorial + budget.carnet).toBe(budget.total);
        expect(budget.total).toBeGreaterThanOrEqual(ALBUM_MIN_PHOTOS_PER_PLACE);
        expect(budget.total).toBeLessThanOrEqual(ALBUM_MAX_PHOTOS_PER_PLACE);
      }
    });
  });

  describe("selectBudgetedCarnetPhotos (export adaptatif, ajout story 30.5)", () => {
    it("keeps the most recently updated entries' photos first when the budget is smaller than the total", () => {
      const placeEntries = {
        "entry-old": { entryId: "entry-old", updatedAt: 1000, photos: { "photo-old": "data:old" } },
        "entry-new": { entryId: "entry-new", updatedAt: 5000, photos: { "photo-new": "data:new" } },
      };

      const selected = selectBudgetedCarnetPhotos(placeEntries, 1);
      expect(selected).toHaveLength(1);
      expect(selected[0].id).toBe("photo-new");
    });

    it("returns all photos when the budget is large enough", () => {
      const placeEntries = {
        "entry-1": { entryId: "entry-1", updatedAt: 1, photos: { "photo-1": "data:1", "photo-2": "data:2" } },
      };

      const selected = selectBudgetedCarnetPhotos(placeEntries, 5);
      expect(selected).toHaveLength(2);
    });

    it("returns an empty array when the budget is zero or negative", () => {
      const placeEntries = {
        "entry-1": { entryId: "entry-1", updatedAt: 1, photos: { "photo-1": "data:1" } },
      };

      expect(selectBudgetedCarnetPhotos(placeEntries, 0)).toHaveLength(0);
      expect(selectBudgetedCarnetPhotos(placeEntries, -3)).toHaveLength(0);
    });
  });

  describe("filterAlbumContent > export adaptatif pour un voyage très illustré (ajout story 30.5)", () => {
    it("exposes the resolved photo budget and quality tier for a small trip (unchanged historical behavior)", () => {
      const result = filterAlbumContent(mockSource, mockDraft);
      expect(result.photoBudgetPerPlace.total).toBe(ALBUM_MAX_PHOTOS_PER_PLACE);
      expect(result.photoQualityTier).toEqual(PHOTO_QUALITY_TIER_DEFAULT);
    });

    it("reduces the photo budget and degrades quality for an album with many included places, without throwing", () => {
      const manyPlaces: AlbumSource["eligiblePlaces"] = {};
      const manyLogs: AlbumSource["placeVisitLogs"] = {};
      const includedIds = new Set<string>();
      for (let i = 0; i < 40; i += 1) {
        const placeId = `place-${i}`;
        manyPlaces[placeId] = { placeId, name: `Lieu ${i}`, shortDesc: "", jour: [] };
        manyLogs[placeId] = {
          "entry-1": {
            entryId: "entry-1",
            placeId,
            authorProfileId: "profile-1",
            authorSurnameSnapshot: "John",
            text: "Souvenir",
            photos: { [`photo-${i}`]: "data:image/jpeg;base64,abc" },
            createdAt: i,
            updatedAt: i,
          },
        };
        includedIds.add(placeId);
      }

      const bigSource: AlbumSource = {
        ...mockSource,
        eligiblePlaces: manyPlaces,
        placeVisitLogs: manyLogs,
      };
      const bigDraft: AlbumDraft = { ...mockDraft, includedLocationIds: includedIds };

      const result = filterAlbumContent(bigSource, bigDraft);

      expect(result.photoBudgetPerPlace.total).toBeLessThan(ALBUM_MAX_PHOTOS_PER_PLACE);
      expect(result.photoQualityTier).toEqual(PHOTO_QUALITY_TIER_MINIMAL);
      // Chaque lieu reste inclus : aucun lieu n'est retiré pour respecter le budget.
      expect(Object.keys(result.places)).toHaveLength(40);
    });
  });

  describe("Choix de la photo de couverture par le voyageur (story 30.7)", () => {
    const places: Record<string, FilteredAlbumPlace> = {
      "place-1": {
        name: "Istanbul",
        shortDesc: "Ville historique",
        jour: [1],
        photos: ["/images/places/istanbul-1.webp", "/images/places/istanbul-2.webp"],
      },
      "place-2": {
        name: "Cappadoce",
        shortDesc: "Rochers",
        jour: [2],
      },
    };
    const entries: Record<string, Record<string, unknown>> = {
      "place-2": {
        "entry-1": {
          entryId: "entry-1",
          placeId: "place-2",
          photos: { "photo-carnet-1": "data:image/jpeg;base64,carnet" },
        },
      },
    };

    describe("resolveCoverPhotoSource", () => {
      it("resolves an editorial cover photo id to its source", () => {
        const id = buildEditorialCoverPhotoId("place-1", 1);
        expect(resolveCoverPhotoSource(id, places, entries)).toEqual({
          src: "/images/places/istanbul-2.webp",
          kind: "editorial",
        });
      });

      it("resolves a carnet photo id to its source", () => {
        expect(resolveCoverPhotoSource("photo-carnet-1", places, entries)).toEqual({
          src: "data:image/jpeg;base64,carnet",
          kind: "carnet",
        });
      });

      it("returns null for the 'no cover' sentinel", () => {
        expect(resolveCoverPhotoSource(ALBUM_NO_COVER_PHOTO_ID, places, entries)).toBeNull();
      });

      it("returns null for an empty id", () => {
        expect(resolveCoverPhotoSource("", places, entries)).toBeNull();
      });

      it("returns null when the editorial photo index is out of bounds (place edited/removed)", () => {
        const id = buildEditorialCoverPhotoId("place-1", 99);
        expect(resolveCoverPhotoSource(id, places, entries)).toBeNull();
      });

      it("returns null when the editorial place is no longer included", () => {
        const id = buildEditorialCoverPhotoId("place-removed", 0);
        expect(resolveCoverPhotoSource(id, places, entries)).toBeNull();
      });

      it("returns null for an unknown carnet photo id", () => {
        expect(resolveCoverPhotoSource("unknown-photo", places, entries)).toBeNull();
      });
    });

    describe("resolveEffectiveCoverPhoto", () => {
      it("prefers the explicit selection when present and still valid", () => {
        const id = buildEditorialCoverPhotoId("place-1", 0);
        expect(resolveEffectiveCoverPhoto(places, entries, id)).toEqual({
          src: "/images/places/istanbul-1.webp",
          kind: "editorial",
        });
      });

      it("falls back to the first editorial photo, in chronological place order, when nothing is chosen", () => {
        expect(resolveEffectiveCoverPhoto(places, entries, "")).toEqual({
          src: "/images/places/istanbul-1.webp",
          kind: "editorial",
        });
      });

      it("falls back to a carnet photo when no editorial photo exists at all", () => {
        const placesWithoutEditorial: Record<string, FilteredAlbumPlace> = {
          "place-2": places["place-2"]!,
        };
        expect(resolveEffectiveCoverPhoto(placesWithoutEditorial, entries, "")).toEqual({
          src: "data:image/jpeg;base64,carnet",
          kind: "carnet",
        });
      });

      it("returns null (no cover at all) when the traveler explicitly chose no cover, even if photos are available", () => {
        expect(resolveEffectiveCoverPhoto(places, entries, ALBUM_NO_COVER_PHOTO_ID)).toBeNull();
      });

      it("falls back to automatic behavior when the explicit selection is stale (place no longer included)", () => {
        const id = buildEditorialCoverPhotoId("place-removed", 0);
        expect(resolveEffectiveCoverPhoto(places, entries, id)).toEqual({
          src: "/images/places/istanbul-1.webp",
          kind: "editorial",
        });
      });

      it("returns null when there is no photo available anywhere", () => {
        expect(resolveEffectiveCoverPhoto({}, {}, "")).toBeNull();
      });
    });

    describe("listCoverPhotoOptions", () => {
      it("lists editorial photos then carnet photos, per place, in place order", () => {
        const options = listCoverPhotoOptions(places, entries);
        expect(options).toEqual([
          { id: "editorial:place-1:0", src: "/images/places/istanbul-1.webp", placeName: "Istanbul", kind: "editorial" },
          { id: "editorial:place-1:1", src: "/images/places/istanbul-2.webp", placeName: "Istanbul", kind: "editorial" },
          { id: "photo-carnet-1", src: "data:image/jpeg;base64,carnet", placeName: "Cappadoce", kind: "carnet" },
        ]);
      });

      it("returns an empty list when there are no places", () => {
        expect(listCoverPhotoOptions({}, {})).toEqual([]);
      });
    });
  });
});
