import { describe, expect, it, vi } from "vitest";
import {
  calculateExportLimit,
  preparePdfImages,
  collectPdfImages,
  convertEditorialAssetToJpegDataUrl,
  exportAlbumAsPdf,
  EDITORIAL_PHOTO_MAX_DIMENSION_PX,
} from "./pdf-export";
import { ALBUM_MAX_EDITORIAL_PHOTOS_PER_PLACE } from "../app/albumUtils";
import type { FilteredAlbumContent } from "../app/albumUtils";
import type { AlbumDraft, AlbumSource } from "../types/cloud";

// jsPDF#save() détecte l'environnement Node (require("fs") disponible, ce qui
// est le cas sous Vitest même avec l'environnement "jsdom") et écrit alors
// réellement un fichier PDF sur disque via fs.writeFileSync, plutôt que de
// déclencher un téléchargement navigateur (constaté lors de l'implémentation
// de cette story). `save` est assignée comme propriété propre de l'instance
// par le constructeur de jsPDF (pas sur le prototype), donc un simple
// sous-classement ne suffit pas à la remplacer : on la réécrit explicitement
// après l'appel à super() pour neutraliser cet effet de bord et ne tester
// que la composition des pages, pas le téléchargement lui-même (déjà couvert
// fonctionnellement par la story 30.3 et non modifié ici).
vi.mock("jspdf", async (importOriginal) => {
  const actual = await importOriginal<typeof import("jspdf")>();
  class TestJsPDF extends actual.jsPDF {
    constructor(...args: ConstructorParameters<typeof actual.jsPDF>) {
      super(...args);
      Object.defineProperty(this, "save", {
        value: () => this,
        writable: true,
        configurable: true,
      });
    }
  }
  return { ...actual, jsPDF: TestJsPDF };
});

describe("pdf export limits", () => {
  it("blocks export when image count exceeds the browser-safe limit", () => {
    const result = calculateExportLimit({
      imageCount: 61,
      preparedBytes: 1024,
    });

    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("60");
  });

  it("blocks export when prepared payload is too large", () => {
    const result = calculateExportLimit({
      imageCount: 10,
      preparedBytes: 21 * 1024 * 1024,
    });

    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/20\s*MiB|20 MiB|20MB/i);
  });

  it("keeps valid JPEG images and ignores unreadable data", () => {
    const prepared = preparePdfImages([
      { id: "good", src: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAA" },
      { id: "bad", src: "not-a-data-uri" },
      { id: "png", src: "data:image/png;base64,abcd" },
    ]);

    expect(prepared.valid).toHaveLength(1);
    expect(prepared.valid[0].id).toBe("good");
    expect(prepared.invalid).toHaveLength(2);
  });

  it("accepts editorial (asset path) images without requiring a JPEG data URI (story 30.5)", () => {
    const prepared = preparePdfImages([
      { id: "editorial:place-1:0", src: "/images/guide/Istanbul photo 1.webp", kind: "editorial" },
      { id: "bad", src: "not-a-data-uri" },
    ]);

    expect(prepared.valid).toHaveLength(1);
    expect(prepared.valid[0].id).toBe("editorial:place-1:0");
    expect(prepared.invalid).toHaveLength(1);
  });
});

describe("collectPdfImages > editorial photos (story 30.5)", () => {
  function baseContent(overrides: Partial<FilteredAlbumContent> = {}): FilteredAlbumContent {
    return {
      places: {},
      entries: {},
      profiles: {},
      gameSummary: null,
      coverPhotoMissing: false,
      estimatedPageCount: 1,
      estimatedImageCount: 0,
      ...overrides,
    };
  }

  it("includes editorial photos for included places, capped per place", () => {
    const content = baseContent({
      places: {
        "place-1": {
          name: "Istanbul",
          shortDesc: "",
          photos: [
            "/images/a.webp",
            "/images/b.webp",
            "/images/c.webp",
            "/images/d.webp",
          ],
        },
      },
    });

    const images = collectPdfImages(content);
    const editorial = images.filter((image) => image.kind === "editorial");

    expect(editorial).toHaveLength(ALBUM_MAX_EDITORIAL_PHOTOS_PER_PLACE);
    expect(editorial.every((image) => image.src.startsWith("/images/"))).toBe(true);
  });

  it("combines editorial and carnet photos in the same collection", () => {
    const content = baseContent({
      places: {
        "place-1": { name: "Istanbul", shortDesc: "", photos: ["/images/a.webp"] },
      },
      entries: {
        "place-1": {
          "entry-1": {
            entryId: "entry-1",
            photos: { "photo-1": "data:image/jpeg;base64,abc" },
          },
        },
      },
    });

    const images = collectPdfImages(content);
    expect(images).toHaveLength(2);
    expect(images.find((image) => image.kind === "editorial")?.src).toBe("/images/a.webp");
    expect(images.find((image) => image.kind === "carnet")?.src).toBe("data:image/jpeg;base64,abc");
  });

  it("does not add any editorial image for a place without a photos field", () => {
    const content = baseContent({
      places: { "place-2": { name: "Cappadocia", shortDesc: "" } },
    });

    const images = collectPdfImages(content);
    expect(images).toHaveLength(0);
  });
});

describe("convertEditorialAssetToJpegDataUrl", () => {
  it("resizes and converts a valid asset to a JPEG data URI using injected browser deps", async () => {
    const fakeBlob = {} as Blob;
    const result = await convertEditorialAssetToJpegDataUrl("/images/guide/Istanbul photo 1.webp", {
      fetchAsset: vi.fn().mockResolvedValue({ ok: true, blob: () => Promise.resolve(fakeBlob) }),
      readBlobAsDataUrl: vi.fn().mockResolvedValue("data:image/webp;base64,original"),
      loadImageElement: vi.fn().mockResolvedValue({ naturalWidth: 1800, naturalHeight: 900 }),
      drawResizedJpeg: vi.fn((_, width, height) => `data:image/jpeg;base64,resized-${width}x${height}`),
    });

    expect(result).toBe(`data:image/jpeg;base64,resized-${EDITORIAL_PHOTO_MAX_DIMENSION_PX}x450`);
  });

  it("returns null silently when the asset fetch fails (network error, cas limite)", async () => {
    const result = await convertEditorialAssetToJpegDataUrl("/images/missing.webp", {
      fetchAsset: vi.fn().mockRejectedValue(new Error("network down")),
    });

    expect(result).toBeNull();
  });

  it("returns null silently when the response is not ok (asset introuvable)", async () => {
    const result = await convertEditorialAssetToJpegDataUrl("/images/missing.webp", {
      fetchAsset: vi.fn().mockResolvedValue({ ok: false, blob: () => Promise.resolve({} as Blob) }),
    });

    expect(result).toBeNull();
  });

  it("returns null silently when the image fails to decode (corrupted asset)", async () => {
    const result = await convertEditorialAssetToJpegDataUrl("/images/corrupted.webp", {
      fetchAsset: vi.fn().mockResolvedValue({ ok: true, blob: () => Promise.resolve({} as Blob) }),
      readBlobAsDataUrl: vi.fn().mockResolvedValue("data:image/webp;base64,broken"),
      loadImageElement: vi.fn().mockRejectedValue(new Error("Image illisible")),
    });

    expect(result).toBeNull();
  });
});

describe("exportAlbumAsPdf > rich editorial content (story 30.5)", () => {
  const draft: AlbumDraft = {
    profileId: "profile-1",
    title: "Notre voyage en Turquie",
    subtitle: "Été 2026",
    coverPhotoId: "",
    includedLocationIds: new Set(["place-1", "place-2"]),
    includeGameSummary: true,
    theme: "default",
    createdAt: 1,
    updatedAt: 1,
  };

  const content: FilteredAlbumContent = {
    places: {
      "place-1": {
        name: "Istanbul",
        shortDesc: "La ville-pont",
        photos: ["/images/guide/Istanbul photo 1.webp", "/images/places/Bosphore.webp"],
        historyLabel: "Présentation",
        history: "Istanbul est la plus grande ville de **Turquie**.",
        anecdotesLabel: "Le saviez-vous ?",
        anecdotes: ["Le Bosphore coupe la ville en deux.", "On change de continent en quelques minutes."],
      },
      "place-2": {
        name: "Cappadocia",
        shortDesc: "Rock formations",
        // Aucun contenu éditorial ni note de carnet pour ce lieu.
      },
    },
    entries: {
      "place-1": {
        "entry-1": {
          entryId: "entry-1",
          text: "Une vue magnifique sur le Bosphore.",
          photos: { "photo-1": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD" },
        },
      },
    },
    profiles: {},
    gameSummary: {
      profileId: "profile-1",
      totalScore: 120,
      totalDaysPlayed: 2,
      bestDay: 1,
      badges: ["Voyageur engagé"],
      podium: [{ profileId: "profile-1", surname: "Alex", totalScore: 120, rank: 1 }],
    },
    coverPhotoMissing: false,
    estimatedPageCount: 4,
    estimatedImageCount: 3,
  };

  const source: AlbumSource = {
    tripStartDate: "2026-08-16",
    phase: "after",
    generatedAt: Date.now(),
    eligiblePlaces: {},
    placeVisitLogs: {},
    requiredProfiles: {},
    gameResults: {},
  };

  it("completes without throwing, converting editorial photos via the injected deps and skipping unreadable ones", async () => {
    const progressPhases: string[] = [];
    const fakeBlob = {} as Blob;

    await expect(
      exportAlbumAsPdf(
        draft,
        content,
        source,
        (phase) => progressPhases.push(phase),
        {
          fetchAsset: vi.fn((src: string) =>
            src.includes("Bosphore")
              ? Promise.reject(new Error("network down"))
              : Promise.resolve({ ok: true, blob: () => Promise.resolve(fakeBlob) })
          ),
          readBlobAsDataUrl: vi.fn().mockResolvedValue("data:image/webp;base64,original"),
          loadImageElement: vi.fn().mockResolvedValue({ naturalWidth: 900, naturalHeight: 600 }),
          drawResizedJpeg: vi.fn(() => "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD"),
        }
      )
    ).resolves.toBeUndefined();

    expect(progressPhases).toEqual(["preparing", "rendering", "download"]);
  });
});
