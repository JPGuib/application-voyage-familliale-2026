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
} from "./albumUtils";
import type { AlbumDraft, AlbumSource } from "../types/cloud";

describe("Album Utilities", () => {
  const mockSource: AlbumSource = {
    tripStartDate: "2026-08-16",
    phase: "during",
    generatedAt: Date.now(),
    eligiblePlaces: {
      "place-1": { placeId: "place-1", name: "Istanbul", shortDesc: "Historic city" },
      "place-2": { placeId: "place-2", name: "Cappadocia", shortDesc: "Rock formations" },
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
          image: "/images/guide/Istanbul photo 1.webp",
          photos: [
            "/images/guide/Istanbul photo 1.webp",
            "/images/places/Mosquée bleue.webp",
            "/images/places/Sainte Sophie.webp",
            "/images/places/Bosphore.webp",
          ],
          historyLabel: "Présentation",
          history: "Istanbul est la plus grande ville de Turquie.",
          anecdotesLabel: "Le saviez-vous ?",
          anecdotes: ["Le Bosphore coupe la ville en deux."],
        },
        "place-2": {
          placeId: "place-2",
          name: "Cappadocia",
          shortDesc: "Rock formations",
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
      expect(result.places["place-1"]!.photos).toHaveLength(4);
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

      // Le lieu a 4 photos éditoriales en source, mais le plafond est appliqué.
      expect(result.estimatedImageCount).toBe(ALBUM_MAX_EDITORIAL_PHOTOS_PER_PLACE);
    });

    it("combines editorial photos (capped) and carnet photos in the image estimate", () => {
      const draft: AlbumDraft = { ...mockDraft, includedLocationIds: new Set(["place-1"]) };
      const result = filterAlbumContent(sourceWithEditorial, draft);

      // 3 photos éditoriales plafonnées (sur 4) + 1 photo de carnet (entry-1).
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
});
