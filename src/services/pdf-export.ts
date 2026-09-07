import type { AlbumDraft, AlbumSource } from "../types/cloud";
import type { FilteredAlbumContent } from "../app/albumUtils";

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
  for (const placeEntries of Object.values(content.entries)) {
    for (const [entryId, entry] of Object.entries(placeEntries)) {
      if (!entry || typeof entry !== "object" || !("photos" in entry)) {
        continue;
      }

      const photos = (entry as { photos?: Record<string, string> }).photos ?? {};
      for (const [photoId, src] of Object.entries(photos)) {
        if (typeof src === "string") {
          images.push({ id: photoId, src, fileSize: src.length * 0.75 });
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

export async function exportAlbumAsPdf(
  draft: AlbumDraft,
  content: FilteredAlbumContent,
  source: AlbumSource,
  onProgress?: (phase: PdfExportProgress) => void
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
  };

  // Cover page
  onProgress?.("rendering");
  doc.setFillColor(240, 245, 250);
  doc.rect(0, 0, pageWidth, pageHeight, "F");
  const coverImage = prepared.valid[0]?.src;
  if (coverImage) {
    try {
      doc.addImage(coverImage, "JPEG", margin, 20, pageWidth - margin * 2, 80, undefined, "FAST");
    } catch {
      // Ignore unreadable cover photo, keep cover layout intact.
    }
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  doc.text(draft.title || "Mon album", margin, 120);
  if (draft.subtitle) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    doc.text(draft.subtitle, margin, 132, { maxWidth: pageWidth - margin * 2 });
  }

  const itineraryLines = Object.values(content.places).map((place) => `• ${place.name}`);
  if (itineraryLines.length > 0) {
    doc.addPage();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("Itinéraire", margin, 20);
    addTextBlock(itineraryLines, margin, 32, 11, 7);
  }

  for (const [placeId, placeEntries] of Object.entries(content.entries)) {
    const placeName = content.places[placeId]?.name ?? placeId;
    const bodyLines: string[] = [];
    for (const entry of Object.values(placeEntries)) {
      if (!entry || typeof entry !== "object") continue;
      const text = (entry as { text?: unknown }).text;
      if (typeof text === "string" && text.trim()) {
        bodyLines.push(text.trim());
      }
    }

    doc.addPage();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text(placeName, margin, 20);
    if (bodyLines.length > 0) {
      addTextBlock(bodyLines, margin, 32, 11, 7);
    } else {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.text("Aucun souvenir détaillé pour ce lieu.", margin, 32);
    }
  }

  if (content.gameSummary) {
    doc.addPage();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("Résultats de jeu", margin, 20);
    addTextBlock([
      `Score total : ${content.gameSummary.totalScore}`,
      `Badges : ${content.gameSummary.badges.join(", ") || "Aucun"}`,
      `Podium : ${content.gameSummary.podium.map((entry) => `${entry.surname} ${entry.totalScore} pts`).join(" / ") || "Aucun"}`,
    ], margin, 32, 11, 7);
  }

  const safeName = normalizePdfName(draft.title || source.tripStartDate || "album-voyage");
  const fileName = `${safeName}-${new Date().toISOString().slice(0, 10)}.pdf`;

  onProgress?.("download");
  doc.save(fileName);
}
