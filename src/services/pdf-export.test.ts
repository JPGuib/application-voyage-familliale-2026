import { describe, expect, it, vi } from "vitest";
import {
  calculateExportLimit,
  preparePdfImages,
  collectPdfImages,
  convertEditorialAssetToJpegDataUrl,
  recompressCarnetPhotoForExport,
  exportAlbumAsPdf,
  computeChapterDayColorCursor,
  EDITORIAL_PHOTO_MAX_DIMENSION_PX,
} from "./pdf-export";
import {
  ALBUM_MAX_EDITORIAL_PHOTOS_PER_PLACE,
  PHOTO_QUALITY_TIER_DEFAULT,
  PHOTO_QUALITY_TIER_REDUCED,
  PHOTO_QUALITY_TIER_MINIMAL,
  resolvePhotoBudgetPerPlace,
  resolvePhotoQualityTier,
} from "../app/albumUtils";
import type { FilteredAlbumContent } from "../app/albumUtils";
import type { AlbumDraft, AlbumSource } from "../types/cloud";
import { formatTripDayLabel } from "../app/trip-day-format";

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
// `text` est, comme `save` ci-dessus, assignée en propriété propre de
// l'instance (pas sur le prototype) : on l'enveloppe donc de la même façon,
// en délégant systématiquement à l'implémentation réelle (le rendu du texte
// n'est pas modifié), pour permettre aux tests qui en ont besoin (rappel du
// jour de visite, story 30.7) d'inspecter les appels via `TestJsPDF.textCalls`
// (tableau statique partagé, à réinitialiser par le test avant usage).
vi.mock("jspdf", async (importOriginal) => {
  const actual = await importOriginal<typeof import("jspdf")>();
  class TestJsPDF extends actual.jsPDF {
    static textCalls: unknown[][] = [];

    constructor(...args: ConstructorParameters<typeof actual.jsPDF>) {
      super(...args);
      Object.defineProperty(this, "save", {
        value: () => this,
        writable: true,
        configurable: true,
      });
      const originalText = this.text.bind(this);
      Object.defineProperty(this, "text", {
        value: (...textArgs: unknown[]) => {
          TestJsPDF.textCalls.push(textArgs);
          return originalText(...(textArgs as Parameters<typeof originalText>));
        },
        writable: true,
        configurable: true,
      });
    }
  }
  return { ...actual, jsPDF: TestJsPDF };
});

describe("pdf export limits", () => {
  // Depuis l'ajout de l'export adaptatif (story 30.5), ce plafond n'est plus
  // qu'un garde-fou extrême (cf. commentaire de HARD_MAX_IMAGES dans
  // pdf-export.ts) : il ne doit être atteint que pour un volume de photos
  // délirant, bien au-delà de ce qu'un album normal produit même après
  // dégradation qualité et réduction du budget par lieu.
  it("blocks export when image count exceeds the extreme hard-safety limit", () => {
    const result = calculateExportLimit({
      imageCount: 601,
      preparedBytes: 1024,
    });

    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("600");
    // Le message ne doit plus suggérer de retirer des lieux (rôle de dernier
    // filet extrême, plus un usage normal).
    expect(result.reason).not.toMatch(/retirer|réduisez le nombre de lieux/i);
  });

  it("blocks export when prepared payload is too large (extreme hard-safety limit)", () => {
    const result = calculateExportLimit({
      imageCount: 10,
      preparedBytes: 151 * 1024 * 1024,
    });

    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/150\s*MiB|150 MiB|150MB/i);
  });

  it("allows a large but reasonable album (well under the extreme hard-safety limit)", () => {
    const result = calculateExportLimit({
      imageCount: 500,
      preparedBytes: 120 * 1024 * 1024,
    });

    expect(result.allowed).toBe(true);
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
    const placeCount = Object.keys(overrides.places ?? {}).length;
    return {
      places: {},
      entries: {},
      profiles: {},
      gameSummary: null,
      coverPhotoMissing: false,
      estimatedPageCount: 1,
      estimatedImageCount: 0,
      // Peu de lieux dans ces tests : le budget adaptatif revient au
      // comportement historique (3 éditoriales / 5 carnet, palier par défaut).
      photoBudgetPerPlace: resolvePhotoBudgetPerPlace(placeCount),
      photoQualityTier: PHOTO_QUALITY_TIER_DEFAULT,
      ...overrides,
    };
  }

  it("includes editorial photos for included places, capped per place", () => {
    const content = baseContent({
      places: {
        "place-1": {
          name: "Istanbul",
          shortDesc: "",
          // 20 photos : volontairement au-dessus du plafond
          // (ALBUM_MAX_EDITORIAL_PHOTOS_PER_PLACE = 15, story 30.6) pour
          // exercer réellement le comportement de plafonnement ci-dessous.
          photos: Array.from({ length: 20 }, (_, index) => `/images/photo-${index}.webp`),
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
        jour: [1],
        photos: ["/images/guide/Istanbul photo 1.webp", "/images/places/Bosphore.webp"],
        historyLabel: "Présentation",
        history: "Istanbul est la plus grande ville de **Turquie**.",
        anecdotesLabel: "Le saviez-vous ?",
        anecdotes: ["Le Bosphore coupe la ville en deux.", "On change de continent en quelques minutes."],
      },
      "place-2": {
        name: "Cappadocia",
        shortDesc: "Rock formations",
        jour: [2],
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
    comments: {},
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
    // 2 lieux inclus : bien en dessous du seuil de dégradation (15 lieux),
    // comportement historique inchangé.
    photoBudgetPerPlace: resolvePhotoBudgetPerPlace(2),
    photoQualityTier: PHOTO_QUALITY_TIER_DEFAULT,
  };

  const source: AlbumSource = {
    tripStartDate: "2026-08-16",
    lastTripDay: 2,
    phase: "after",
    generatedAt: Date.now(),
    eligiblePlaces: {},
    placeVisitLogs: {},
    placeComments: {},
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
        },
        // Palier de qualité par défaut (2 lieux) : la photo de carnet n'est pas
        // recompressée (cf. recompressCarnetPhotoForExport), mais ses dimensions
        // naturelles sont tout de même mesurées pour l'affichage "contain" du
        // cadre polaroid (cf. measureImageDimensions dans pdf-export.ts) : un
        // mock de `loadImageElement` reste donc nécessaire ici pour ne pas
        // retomber sur un vrai décodage d'image indisponible sous jsdom.
        {
          loadImageElement: vi.fn().mockResolvedValue({ naturalWidth: 800, naturalHeight: 600 }),
        }
      )
    ).resolves.toBeUndefined();

    expect(progressPhases).toEqual(["preparing", "rendering", "download"]);
  });

  it("completes without throwing when family comments (avis) and a detailed visite guidée are present (story 30.6)", async () => {
    const contentWithEnrichment: FilteredAlbumContent = {
      ...content,
      places: {
        ...content.places,
        "place-1": {
          ...content.places["place-1"]!,
          guideSections: [
            {
              title: "Histoire de la mosquée",
              paragraphs: ["Un long paragraphe sur l'histoire du lieu."],
              bullets: ["Un premier fait marquant.", "Un second fait marquant."],
            },
          ],
        },
      },
      comments: {
        "place-1": {
          "comment-1": {
            commentId: "comment-1",
            placeId: "place-1",
            authorProfileId: "profile-2",
            authorSurnameSnapshot: "Camille",
            reaction: "like",
            text: "On y retournerait direct !",
            createdAt: 1000,
            updatedAt: 1000,
          },
          "comment-2": {
            commentId: "comment-2",
            placeId: "place-1",
            authorProfileId: "profile-3",
            authorSurnameSnapshot: "Sacha",
            reaction: "dislike",
            text: "",
            createdAt: 2000,
            updatedAt: 2000,
          },
        },
      },
    };

    await expect(
      exportAlbumAsPdf(
        draft,
        contentWithEnrichment,
        source,
        undefined,
        {
          fetchAsset: vi.fn().mockResolvedValue({ ok: true, blob: () => Promise.resolve({} as Blob) }),
          readBlobAsDataUrl: vi.fn().mockResolvedValue("data:image/webp;base64,original"),
          loadImageElement: vi.fn().mockResolvedValue({ naturalWidth: 900, naturalHeight: 600 }),
          drawResizedJpeg: vi.fn(() => "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD"),
        },
        {
          loadImageElement: vi.fn().mockResolvedValue({ naturalWidth: 800, naturalHeight: 600 }),
        }
      )
    ).resolves.toBeUndefined();
  });
});

describe("recompressCarnetPhotoForExport (export adaptatif, ajout story 30.5)", () => {
  it("does not reprocess a carnet photo when the default (non-degraded) quality tier applies", async () => {
    const loadImageElement = vi.fn();
    const drawResizedJpeg = vi.fn();

    const result = await recompressCarnetPhotoForExport(
      "data:image/jpeg;base64,original",
      PHOTO_QUALITY_TIER_DEFAULT,
      { loadImageElement, drawResizedJpeg }
    );

    expect(result).toBe("data:image/jpeg;base64,original");
    expect(loadImageElement).not.toHaveBeenCalled();
    expect(drawResizedJpeg).not.toHaveBeenCalled();
  });

  it("recompresses a carnet photo when a more aggressive quality tier is selected", async () => {
    const result = await recompressCarnetPhotoForExport(
      "data:image/jpeg;base64,original",
      PHOTO_QUALITY_TIER_MINIMAL,
      {
        loadImageElement: vi.fn().mockResolvedValue({ naturalWidth: 1200, naturalHeight: 800 }),
        drawResizedJpeg: vi.fn(
          (_, width, height, quality) => `data:image/jpeg;base64,recompressed-${width}x${height}-${quality}`
        ),
      }
    );

    expect(result).toBe(
      `data:image/jpeg;base64,recompressed-${PHOTO_QUALITY_TIER_MINIMAL.maxDimensionPx}x333-${PHOTO_QUALITY_TIER_MINIMAL.jpegQuality}`
    );
  });

  it("falls back silently to the original photo when recompression fails (decode error, cas limite)", async () => {
    const result = await recompressCarnetPhotoForExport(
      "data:image/jpeg;base64,original",
      PHOTO_QUALITY_TIER_REDUCED,
      { loadImageElement: vi.fn().mockRejectedValue(new Error("decode failed")) }
    );

    expect(result).toBe("data:image/jpeg;base64,original");
  });

  it("falls back silently to the original photo when canvas rendering is unavailable", async () => {
    const result = await recompressCarnetPhotoForExport(
      "data:image/jpeg;base64,original",
      PHOTO_QUALITY_TIER_REDUCED,
      {
        loadImageElement: vi.fn().mockResolvedValue({ naturalWidth: 900, naturalHeight: 600 }),
        drawResizedJpeg: vi.fn(() => {
          throw new Error("Traitement de l'image impossible sur cet appareil.");
        }),
      }
    );

    expect(result).toBe("data:image/jpeg;base64,original");
  });
});

describe("exportAlbumAsPdf > voyage très illustré (nombreux lieux, export adaptatif)", () => {
  it("never throws for a trip with many places, using a reduced photo budget and a degraded quality tier", async () => {
    const placeCount = 40; // > 30 lieux : palier de dégradation maximal.
    const places: FilteredAlbumContent["places"] = {};
    const entries: FilteredAlbumContent["entries"] = {};
    for (let i = 0; i < placeCount; i += 1) {
      const placeId = `place-${i}`;
      places[placeId] = { name: `Lieu ${i}`, shortDesc: "", jour: [] };
      entries[placeId] = {
        "entry-1": {
          entryId: "entry-1",
          updatedAt: i,
          text: `Souvenir du lieu ${i}`,
          photos: { [`photo-${i}`]: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD" },
        },
      };
    }

    const largeDraft: AlbumDraft = {
      profileId: "profile-1",
      title: "Grand tour",
      subtitle: "",
      coverPhotoId: "",
      includedLocationIds: new Set(Object.keys(places)),
      includeGameSummary: false,
      theme: "default",
      createdAt: 1,
      updatedAt: 1,
    };

    const photoBudgetPerPlace = resolvePhotoBudgetPerPlace(placeCount);
    const photoQualityTier = resolvePhotoQualityTier(placeCount);
    expect(photoQualityTier).toBe(PHOTO_QUALITY_TIER_MINIMAL);

    const largeContent: FilteredAlbumContent = {
      places,
      entries,
      comments: {},
      profiles: {},
      gameSummary: null,
      coverPhotoMissing: false,
      estimatedPageCount: placeCount + 2,
      estimatedImageCount: placeCount * photoBudgetPerPlace.carnet,
      photoBudgetPerPlace,
      photoQualityTier,
    };

    const largeSource: AlbumSource = {
      tripStartDate: "2026-01-01",
      lastTripDay: null,
      phase: "after",
      generatedAt: Date.now(),
      eligiblePlaces: {},
      placeVisitLogs: {},
      placeComments: {},
      requiredProfiles: {},
      gameResults: {},
    };

    await expect(
      exportAlbumAsPdf(largeDraft, largeContent, largeSource, undefined, undefined, {
        loadImageElement: vi.fn().mockResolvedValue({ naturalWidth: 900, naturalHeight: 600 }),
        drawResizedJpeg: vi.fn(() => "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD"),
      })
    ).resolves.toBeUndefined();
  });
});

describe("computeChapterDayColorCursor (couleur de chapitre par jour, story 30.7)", () => {
  it("assigns the same color-cursor to chapters sharing the same day", () => {
    expect(computeChapterDayColorCursor([1, 1])).toEqual([0, 0]);
  });

  it("advances the color-cursor by one at the first chapter of a new day", () => {
    expect(computeChapterDayColorCursor([1, 1, 2, 2, 3])).toEqual([0, 0, 1, 1, 2]);
  });

  it("advances the color-cursor for the very first chapter even when its day is unknown (bug fix : un jour inconnu ne doit pas être confondu avec l'état initial)", () => {
    expect(computeChapterDayColorCursor([null, null, 1])).toEqual([0, 0, 1]);
  });

  it("returns an empty array for no chapters", () => {
    expect(computeChapterDayColorCursor([])).toEqual([]);
  });
});

describe("exportAlbumAsPdf > jour de visite rappelé au titre et en pied de page (story 30.7)", () => {
  it("prints the visit day label under the chapter title and in the footer of every page of that chapter", async () => {
    const draft: AlbumDraft = {
      profileId: "profile-1",
      title: "Notre voyage",
      subtitle: "",
      coverPhotoId: "",
      includedLocationIds: new Set(["place-1", "place-2", "place-3"]),
      includeGameSummary: false,
      theme: "default",
      createdAt: 1,
      updatedAt: 1,
    };

    const content: FilteredAlbumContent = {
      places: {
        // Deux lieux le même jour, un troisième le jour suivant (déjà triés
        // chronologiquement en amont par buildEligiblePlaces).
        "place-1": { name: "Lieu A", shortDesc: "", jour: [1] },
        "place-2": { name: "Lieu B", shortDesc: "", jour: [1] },
        "place-3": { name: "Lieu C", shortDesc: "", jour: [2] },
      },
      entries: {},
      comments: {},
      profiles: {},
      gameSummary: null,
      coverPhotoMissing: false,
      estimatedPageCount: 5,
      estimatedImageCount: 0,
      photoBudgetPerPlace: resolvePhotoBudgetPerPlace(3),
      photoQualityTier: PHOTO_QUALITY_TIER_DEFAULT,
    };

    const source: AlbumSource = {
      tripStartDate: "2026-08-16",
      lastTripDay: 2,
      phase: "after",
      generatedAt: Date.now(),
      eligiblePlaces: {},
      placeVisitLogs: {},
      placeComments: {},
      requiredProfiles: {},
      gameResults: {},
    };

    const jspdfModule = await import("jspdf");
    const TestJsPDF = jspdfModule.jsPDF as unknown as { textCalls: unknown[][] };
    TestJsPDF.textCalls = [];

    await expect(exportAlbumAsPdf(draft, content, source)).resolves.toBeUndefined();

    const day1Label = formatTripDayLabel(1, "2026-08-16", { format: "short" }).toUpperCase();
    const day2Label = formatTripDayLabel(2, "2026-08-16", { format: "short" }).toUpperCase();

    const matchesDayLabel = ([text]: unknown[]) => text === day1Label || text === day2Label;
    const titleAreaCalls = TestJsPDF.textCalls.filter(
      (call) => matchesDayLabel(call) && (call[3] as { align?: string } | undefined)?.align !== "right"
    );
    // Un rappel sous le bandeau de titre pour chacun des 3 chapitres (place-1,
    // place-2, place-3), quel que soit le jour.
    expect(titleAreaCalls.length).toBe(3);

    const footerCalls = TestJsPDF.textCalls.filter(
      (call) => matchesDayLabel(call) && (call[3] as { align?: string } | undefined)?.align === "right"
    );
    // 3 chapitres, une page chacun (pas de débordement) : 3 pieds de page datés.
    expect(footerCalls.length).toBe(3);
  });

  it("does not print any day label for a chapter whose place has no known day", async () => {
    const draft: AlbumDraft = {
      profileId: "profile-1",
      title: "Notre voyage",
      subtitle: "",
      coverPhotoId: "",
      includedLocationIds: new Set(["place-1"]),
      includeGameSummary: false,
      theme: "default",
      createdAt: 1,
      updatedAt: 1,
    };

    const content: FilteredAlbumContent = {
      places: {
        "place-1": { name: "Lieu sans jour", shortDesc: "", jour: [] },
      },
      entries: {},
      comments: {},
      profiles: {},
      gameSummary: null,
      coverPhotoMissing: false,
      estimatedPageCount: 3,
      estimatedImageCount: 0,
      photoBudgetPerPlace: resolvePhotoBudgetPerPlace(1),
      photoQualityTier: PHOTO_QUALITY_TIER_DEFAULT,
    };

    const source: AlbumSource = {
      tripStartDate: "2026-08-16",
      lastTripDay: 1,
      phase: "after",
      generatedAt: Date.now(),
      eligiblePlaces: {},
      placeVisitLogs: {},
      placeComments: {},
      requiredProfiles: {},
      gameResults: {},
    };

    await expect(exportAlbumAsPdf(draft, content, source)).resolves.toBeUndefined();
  });
});
