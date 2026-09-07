import type { AlbumDraft, AlbumSource } from "../types/cloud";
import type { FilteredAlbumContent } from "../app/albumUtils";
import { ALBUM_MAX_EDITORIAL_PHOTOS_PER_PLACE, findPhotoSource } from "../app/albumUtils";
import { computeResizedDimensions } from "../app/image-upload";

export type PdfExportLimitInput = {
  imageCount: number;
  preparedBytes: number;
};

export type PdfExportLimitResult = {
  allowed: boolean;
  reason: string;
  imageLimit: number;
  byteLimit: number;
};

export type PdfPreparedImage = {
  id: string;
  src: string;
  // "carnet" (défaut) : data URI JPEG déjà compressée par le voyageur.
  // "editorial" (story 30.5) : chemin d'asset bundlé (ex. /images/...webp)
  // vers une photo officielle du lieu, pas encore convertie en JPEG data URI
  // à ce stade (voir convertEditorialAssetToJpegDataUrl, appelée juste avant
  // le rendu réel dans exportAlbumAsPdf).
  kind?: "carnet" | "editorial";
  width?: number;
  height?: number;
  fileSize?: number;
};

export type PdfPreparedImagesResult = {
  valid: PdfPreparedImage[];
  invalid: Array<{ id: string; src: string; reason: string }>;
};

export type PdfExportProgress = "preparing" | "rendering" | "download";

const MAX_IMAGES = 60;
const MAX_PREPARED_BYTES = 20 * 1024 * 1024;

// Estimation du poids d'une photo éditoriale une fois convertie (redimensionnée
// à EDITORIAL_PHOTO_MAX_DIMENSION_PX puis recompressée en JPEG qualité 0.72,
// cf. convertEditorialAssetToJpegDataUrl ci-dessous). On ne connaît pas le
// poids réel avant conversion (l'asset source est un .webp de taille variable
// et pas encore chargé à l'étape de calcul de limite) ; cette estimation,
// volontairement proche de la limite haute observée pour ce même gabarit de
// compression dans src/app/image-upload.ts (PLACE_IMAGE_MAX_DATA_URL_LENGTH),
// garde le calcul de limite prudent plutôt que de sous-estimer le poids réel.
const EDITORIAL_PHOTO_ESTIMATED_BYTES = 180_000;

export function calculateExportLimit(input: PdfExportLimitInput): PdfExportLimitResult {
  const byteLimit = MAX_PREPARED_BYTES;
  const imageLimit = MAX_IMAGES;

  if (input.imageCount > imageLimit) {
    return {
      allowed: false,
      reason: `Le PDF dépasse la limite de ${imageLimit} images. Réduisez le nombre d'images sélectionnées avant l'export.`,
      imageLimit,
      byteLimit,
    };
  }

  if (input.preparedBytes > byteLimit) {
    return {
      allowed: false,
      reason: `Le PDF dépasse la limite de 20 MiB de données images préparées. Réduisez les photos ou leur taille avant l'export.`,
      imageLimit,
      byteLimit,
    };
  }

  return {
    allowed: true,
    reason: "Export autorisé.",
    imageLimit,
    byteLimit,
  };
}

export function preparePdfImages(images: PdfPreparedImage[]): PdfPreparedImagesResult {
  const valid: PdfPreparedImage[] = [];
  const invalid: Array<{ id: string; src: string; reason: string }> = [];

  for (const image of images) {
    if (!image?.src || typeof image.src !== "string") {
      invalid.push({ id: image?.id ?? "unknown", src: image?.src ?? "", reason: "Image vide ou invalide." });
      continue;
    }

    if (image.kind === "editorial") {
      // Chemin d'asset bundlé (pas encore un data URI JPEG à ce stade) : on
      // valide juste la présence d'un chemin non vide, la conversion réelle
      // se fait juste avant le rendu (cf. convertEditorialAssetToJpegDataUrl).
      valid.push(image);
      continue;
    }

    if (!/^data:image\/jpeg;base64,/i.test(image.src)) {
      invalid.push({
        id: image.id,
        src: image.src,
        reason: "Format non compatible pour l'export PDF (seuls les JPEG data URI sont pris en charge).",
      });
      continue;
    }

    valid.push(image);
  }

  return { valid, invalid };
}

export function collectPdfImages(content: FilteredAlbumContent): PdfPreparedImage[] {
  const images: PdfPreparedImage[] = [];

  // Photos éditoriales des lieux inclus (présentation officielle du lieu),
  // plafonnées par lieu pour maîtriser le poids/nombre total d'images
  // (cf. ALBUM_MAX_EDITORIAL_PHOTOS_PER_PLACE dans albumUtils.ts).
  for (const [placeId, place] of Object.entries(content.places)) {
    const photos = place.photos ?? [];
    const capped = photos.slice(0, ALBUM_MAX_EDITORIAL_PHOTOS_PER_PLACE);
    capped.forEach((src, index) => {
      if (typeof src === "string" && src) {
        images.push({
          id: `editorial:${placeId}:${index}`,
          src,
          kind: "editorial",
          fileSize: EDITORIAL_PHOTO_ESTIMATED_BYTES,
        });
      }
    });
  }

  // Photos du carnet de visite (souvenirs personnels), inchangé depuis 30.3.
  for (const placeEntries of Object.values(content.entries)) {
    for (const entry of Object.values(placeEntries)) {
      if (!entry || typeof entry !== "object" || !("photos" in entry)) {
        continue;
      }

      const photos = (entry as { photos?: Record<string, string> }).photos ?? {};
      for (const [photoId, src] of Object.entries(photos)) {
        if (typeof src === "string") {
          images.push({ id: photoId, src, kind: "carnet", fileSize: src.length * 0.75 });
        }
      }
    }
  }

  return images;
}

export function normalizePdfName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "album-voyage";
}

// --- Conversion des photos éditoriales (story 30.5) ---------------------
//
// Les photos éditoriales des lieux (`Place.photos` dans src/content/places.ts)
// sont des chemins d'assets bundlés (ex. /images/guide/Istanbul photo 1.webp),
// pas des data URI JPEG comme les photos de carnet. jsPDF (addImage) a besoin
// d'un data URI directement exploitable ; on les convertit donc à la demande,
// juste avant le rendu, avec la même technique que la compression de photo
// côté propriétaire (src/app/image-upload.ts) : chargement dans une balise
// <img>, dessin redimensionné dans un <canvas>, export en JPEG.
//
// Chaque étape est injectable (fetchAsset/readBlobAsDataUrl/loadImageElement/
// drawResizedJpeg) pour rester testable en Vitest/jsdom, qui n'implémente pas
// nativement le décodage d'image ni le rendu canvas 2D. En dehors des tests,
// les valeurs par défaut utilisent les API navigateur réelles.

export const EDITORIAL_PHOTO_MAX_DIMENSION_PX = 900;
const EDITORIAL_PHOTO_JPEG_QUALITY = 0.72;

export type EditorialPhotoConverterDeps = {
  fetchAsset?: (src: string) => Promise<{ ok: boolean; blob: () => Promise<Blob> }>;
  readBlobAsDataUrl?: (blob: Blob) => Promise<string>;
  loadImageElement?: (
    dataUrl: string
  ) => Promise<{ naturalWidth?: number; naturalHeight?: number; width?: number; height?: number }>;
  drawResizedJpeg?: (image: unknown, width: number, height: number, quality: number) => string;
};

function defaultFetchAsset(src: string): Promise<{ ok: boolean; blob: () => Promise<Blob> }> {
  return fetch(src);
}

function defaultReadBlobAsDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Lecture de la photo éditoriale impossible."));
    reader.readAsDataURL(blob);
  });
}

function defaultLoadImageElement(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Photo éditoriale illisible ou corrompue."));
    image.src = dataUrl;
  });
}

function defaultDrawResizedJpeg(image: unknown, width: number, height: number, quality: number): string {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Traitement de l'image impossible sur cet appareil.");
  }
  context.drawImage(image as CanvasImageSource, 0, 0, width, height);
  return canvas.toDataURL("image/jpeg", quality);
}

/**
 * Convertit une photo éditoriale (chemin d'asset bundlé) en data URI JPEG
 * redimensionnée, embarquable par jsPDF.
 *
 * Cas limite (story 30.5) : toute erreur (asset introuvable, réseau,
 * décodage, canvas indisponible) est absorbée et fait retourner `null` :
 * l'image est alors ignorée silencieusement par l'appelant, sans jamais
 * casser l'export du reste de l'album (même politique que la photo de
 * couverture manquante en 30.3).
 */
export async function convertEditorialAssetToJpegDataUrl(
  assetSrc: string,
  deps: EditorialPhotoConverterDeps = {}
): Promise<string | null> {
  const fetchAsset = deps.fetchAsset ?? defaultFetchAsset;
  const readBlobAsDataUrl = deps.readBlobAsDataUrl ?? defaultReadBlobAsDataUrl;
  const loadImageElement = deps.loadImageElement ?? defaultLoadImageElement;
  const drawResizedJpeg = deps.drawResizedJpeg ?? defaultDrawResizedJpeg;

  try {
    const response = await fetchAsset(assetSrc);
    if (!response || !response.ok) {
      return null;
    }
    const blob = await response.blob();
    const originalDataUrl = await readBlobAsDataUrl(blob);
    const image = await loadImageElement(originalDataUrl);
    const { width, height } = computeResizedDimensions(
      image.naturalWidth || image.width || 0,
      image.naturalHeight || image.height || 0,
      EDITORIAL_PHOTO_MAX_DIMENSION_PX
    );
    return drawResizedJpeg(image, width, height, EDITORIAL_PHOTO_JPEG_QUALITY);
  } catch {
    return null;
  }
}

// --- Rendu PDF (story 30.3, refonte visuelle story 30.5) -----------------

// Dégradé approximé façon jsPDF (pas de vrai dégradé vectoriel disponible) :
// on peint des bandes horizontales fines en interpolant linéairement du bleu-
// violet vers le violet, technique classique en génération PDF. Couleurs
// proches de `linear-gradient(135deg, #667eea 0%, #764ba2 100%)` utilisé pour
// `.album-page--cover` dans src/styles/album.css, pour rester cohérent avec
// l'aperçu HTML.
const COVER_GRADIENT_START: [number, number, number] = [102, 126, 234]; // #667eea
const COVER_GRADIENT_END: [number, number, number] = [118, 75, 162]; // #764ba2
const ACCENT_COLOR: [number, number, number] = [25, 118, 210]; // #1976d2, accent de l'appli

function drawVerticalGradient(
  doc: import("jspdf").jsPDF,
  x: number,
  y: number,
  width: number,
  height: number,
  start: [number, number, number],
  end: [number, number, number],
  steps = 28
) {
  const stepHeight = height / steps;
  for (let i = 0; i < steps; i += 1) {
    const t = steps <= 1 ? 0 : i / (steps - 1);
    const r = Math.round(start[0] + (end[0] - start[0]) * t);
    const g = Math.round(start[1] + (end[1] - start[1]) * t);
    const b = Math.round(start[2] + (end[2] - start[2]) * t);
    doc.setFillColor(r, g, b);
    // Léger recouvrement (+0.5) pour ne pas laisser de liseré blanc entre bandes.
    doc.rect(x, y + i * stepHeight, width, stepHeight + 0.5, "F");
  }
}

function drawTitleBand(
  doc: import("jspdf").jsPDF,
  text: string,
  pageWidth: number,
  margin: number,
  y: number,
  bandHeight = 14
) {
  doc.setFillColor(...ACCENT_COLOR);
  doc.rect(0, y, pageWidth, bandHeight, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(text.slice(0, 90), margin, y + bandHeight / 2 + 3);
  doc.setTextColor(0, 0, 0);
}

// Retire les marqueurs markdown simples (**gras**) utilisés dans
// src/content/places.ts : jsPDF affiche du texte brut, pas du markdown.
function stripBasicMarkdown(text: string): string {
  return text.replace(/\*\*/g, "");
}

export async function exportAlbumAsPdf(
  draft: AlbumDraft,
  content: FilteredAlbumContent,
  source: AlbumSource,
  onProgress?: (phase: PdfExportProgress) => void,
  editorialConverterDeps?: EditorialPhotoConverterDeps
): Promise<void> {
  const images = collectPdfImages(content);
  const prepared = preparePdfImages(images);
  const limitCheck = calculateExportLimit({
    imageCount: prepared.valid.length,
    preparedBytes: prepared.valid.reduce((sum, img) => sum + (img.fileSize ?? img.src.length), 0),
  });

  if (!limitCheck.allowed) {
    throw new Error(limitCheck.reason);
  }

  onProgress?.("preparing");

  // Cache de conversion éditoriale : une même photo (ex. couverture ET
  // galerie du chapitre) n'est convertie qu'une seule fois.
  const editorialCache = new Map<string, string | null>();
  async function resolveEditorial(src: string): Promise<string | null> {
    if (editorialCache.has(src)) {
      return editorialCache.get(src) ?? null;
    }
    const converted = await convertEditorialAssetToJpegDataUrl(src, editorialConverterDeps);
    editorialCache.set(src, converted);
    return converted;
  }

  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;

  const addTextBlock = (lines: string[], x: number, y: number, fontSize: number, lineHeight = 7) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(fontSize);
    let currentY = y;
    for (const line of lines) {
      const safeLine = String(line || "").slice(0, 220);
      doc.text(safeLine, x, currentY, { maxWidth: pageWidth - x - margin });
      currentY += lineHeight;
    }
    return currentY;
  };

  // --- Couverture -----------------------------------------------------
  onProgress?.("rendering");
  drawVerticalGradient(doc, 0, 0, pageWidth, pageHeight, COVER_GRADIENT_START, COVER_GRADIENT_END);

  // Photo de couverture : priorité à la photo de carnet choisie par le
  // voyageur (draft.coverPhotoId), sinon repli sur la première photo
  // éditoriale disponible parmi les lieux inclus, sinon aucune image.
  const carnetCoverSrc = findPhotoSource(content.entries, draft.coverPhotoId);
  let coverImageSrc: string | null = null;
  if (carnetCoverSrc) {
    coverImageSrc = carnetCoverSrc;
  } else {
    const firstEditorial = prepared.valid.find((img) => img.kind === "editorial");
    if (firstEditorial) {
      coverImageSrc = await resolveEditorial(firstEditorial.src);
    }
  }

  if (coverImageSrc) {
    try {
      doc.addImage(coverImageSrc, "JPEG", margin, 20, pageWidth - margin * 2, 80, undefined, "FAST");
    } catch {
      // Cas limite : photo de couverture illisible/corrompue, ignorée
      // silencieusement pour garder une couverture propre (habillage seul).
    }
  }
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(26);
  doc.text(draft.title || "Mon album", margin, 130, { maxWidth: pageWidth - margin * 2 });
  if (draft.subtitle) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(13);
    doc.text(draft.subtitle, margin, 142, { maxWidth: pageWidth - margin * 2 });
  }
  doc.setTextColor(0, 0, 0);

  // --- Itinéraire -------------------------------------------------------
  const itineraryLines = Object.values(content.places).map((place) => `• ${place.name}`);
  if (itineraryLines.length > 0) {
    doc.addPage();
    drawTitleBand(doc, "Itinéraire", pageWidth, margin, 12);
    addTextBlock(itineraryLines, margin, 38, 11, 7);
  }

  // --- Chapitres par lieu -------------------------------------------------
  // Un chapitre est créé pour chaque lieu inclus, même sans note de carnet :
  // le socle éditorial (présentation, anecdotes, photos officielles) est
  // toujours affiché en premier, les souvenirs personnels s'ajoutent ensuite
  // (règle métier story 30.5).
  for (const [placeId, place] of Object.entries(content.places)) {
    const placeEntries = content.entries[placeId] ?? {};
    const bodyLines: string[] = [];
    for (const entry of Object.values(placeEntries)) {
      if (!entry || typeof entry !== "object") continue;
      const text = (entry as { text?: unknown }).text;
      if (typeof text === "string" && text.trim()) {
        bodyLines.push(text.trim());
      }
    }

    doc.addPage();
    drawTitleBand(doc, place.name || placeId, pageWidth, margin, 12);
    let cursorY = 38;

    const hasPresentation = Boolean(place.history && place.history.trim());
    const hasAnecdotes = Boolean(place.anecdotes && place.anecdotes.length > 0);

    if (hasPresentation) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(...ACCENT_COLOR);
      doc.text((place.historyLabel || "Présentation").slice(0, 90), margin, cursorY);
      doc.setTextColor(0, 0, 0);
      cursorY += 7;
      const historyLines = doc.splitTextToSize(stripBasicMarkdown(place.history || ""), pageWidth - margin * 2);
      cursorY = addTextBlock(historyLines, margin, cursorY, 10.5, 5.5);
      cursorY += 3;
    }

    if (hasAnecdotes) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(...ACCENT_COLOR);
      doc.text((place.anecdotesLabel || "Anecdotes").slice(0, 90), margin, cursorY);
      doc.setTextColor(0, 0, 0);
      cursorY += 7;
      const bulletLines = (place.anecdotes ?? []).map((item) => `• ${item}`);
      cursorY = addTextBlock(bulletLines, margin, cursorY, 10.5, 5.5);
      cursorY += 3;
    }

    // Galerie photo : photos éditoriales converties + photos de carnet,
    // dans une grille simple de 3 colonnes.
    const galleryEntries: Array<{ src: string; editorial: boolean }> = [];
    for (const src of (place.photos ?? []).slice(0, ALBUM_MAX_EDITORIAL_PHOTOS_PER_PLACE)) {
      galleryEntries.push({ src, editorial: true });
    }
    for (const entry of Object.values(placeEntries)) {
      if (!entry || typeof entry !== "object" || !("photos" in entry)) continue;
      const photos = (entry as { photos?: Record<string, string> }).photos ?? {};
      for (const src of Object.values(photos)) {
        if (typeof src === "string") galleryEntries.push({ src, editorial: false });
      }
    }

    if (galleryEntries.length > 0) {
      const columns = 3;
      const gap = 4;
      const cellWidth = (pageWidth - margin * 2 - gap * (columns - 1)) / columns;
      const cellHeight = 34;
      let column = 0;
      for (const item of galleryEntries) {
        const src = item.editorial ? await resolveEditorial(item.src) : item.src;
        if (!src) {
          // Cas limite : image introuvable/erreur réseau, ignorée silencieusement.
          continue;
        }
        const x = margin + column * (cellWidth + gap);
        try {
          doc.addImage(src, "JPEG", x, cursorY, cellWidth, cellHeight, undefined, "FAST");
        } catch {
          // Cas limite : image corrompue, on n'interrompt pas le reste du chapitre.
        }
        column += 1;
        if (column >= columns) {
          column = 0;
          cursorY += cellHeight + gap;
        }
      }
      if (column !== 0) {
        cursorY += cellHeight + gap;
      }
      cursorY += 2;
    }

    // Notes de carnet : conservées, mises en forme avec un bandeau d'accent.
    if (bodyLines.length > 0) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text("Souvenirs du carnet", margin, cursorY);
      cursorY += 6;
      doc.setDrawColor(...ACCENT_COLOR);
      doc.setLineWidth(0.8);
      doc.line(margin, cursorY - 4, margin, cursorY + bodyLines.length * 7 - 4);
      cursorY = addTextBlock(bodyLines, margin + 4, cursorY, 11, 7);
    } else if (!hasPresentation && !hasAnecdotes && galleryEntries.length === 0) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.text("Aucun souvenir détaillé pour ce lieu.", margin, cursorY);
    }
  }

  if (content.gameSummary) {
    doc.addPage();
    drawTitleBand(doc, "Résultats de jeu", pageWidth, margin, 12);
    addTextBlock(
      [
        `Score total : ${content.gameSummary.totalScore}`,
        `Badges : ${content.gameSummary.badges.join(", ") || "Aucun"}`,
        `Podium : ${content.gameSummary.podium.map((entry) => `${entry.surname} ${entry.totalScore} pts`).join(" / ") || "Aucun"}`,
      ],
      margin,
      38,
      11,
      7
    );
  }

  const safeName = normalizePdfName(draft.title || source.tripStartDate || "album-voyage");
  const fileName = `${safeName}-${new Date().toISOString().slice(0, 10)}.pdf`;

  onProgress?.("download");
  doc.save(fileName);
}
