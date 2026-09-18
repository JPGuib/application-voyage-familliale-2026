import type { AlbumDraft, AlbumSource } from "../types/cloud";
import type { FilteredAlbumContent, PhotoQualityTier } from "../app/albumUtils";
import {
  ALBUM_CONTENT_SECTIONS,
  fitWithinBox,
  isPhotoQualityDegraded,
  PHOTO_QUALITY_TIER_DEFAULT,
  resolveEffectiveCoverPhoto,
  selectBudgetedCarnetPhotos,
} from "../app/albumUtils";
import { computeResizedDimensions } from "../app/image-upload";
import { formatPrimaryTripDayLabel, formatTripDayLabel } from "../app/trip-day-format";
import { isValidTripStartDate } from "../app/trip-day";
import { JOURS_DESTINATIONS } from "../content/generated/jours-destinations";
import { TRIP_MAP_IMAGE_PATH } from "../content/trip";

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

// Garde-fou ultime de l'export (story 30.5, ajout "export adaptatif").
//
// Avant ce raffinement, un plafond bas (60 images / 20 MiB) bloquait l'export
// dès qu'un voyage était un peu illustré, en demandant de retirer des lieux
// de la sélection — inacceptable : chaque lieu marqué vu doit pouvoir
// apparaître dans l'album (règle produit constante de l'epic 30). La
// dégradation automatique de qualité (cf. resolvePhotoQualityTier dans
// albumUtils.ts) et la répartition adaptative du budget de photos par lieu
// (cf. resolvePhotoBudgetPerPlace) absorbent désormais la quasi-totalité des
// voyages, même très illustrés, sans jamais avoir à exclure un lieu entier.
// Ces plafonds ne sont donc plus des limites visées en usage normal, mais un
// dernier filet pour un cas réellement extrême (un voyage à un nombre de
// lieux et de photos délirant, même après dégradation maximale) : ils ne
// devraient plus être atteints en pratique.
// Relevés (story 30.6, retour de test utilisateur "mettre toutes les
// photos") en cohérence avec l'assouplissement du budget par lieu dans
// albumUtils.ts (ALBUM_MAX_PHOTOS_PER_PLACE/ALBUM_PHOTO_BUDGET_TOTAL) :
// valeurs de départ, ajustables après un usage réel.
const HARD_MAX_IMAGES = 600;
const HARD_MAX_PREPARED_BYTES = 150 * 1024 * 1024;

// Estimation du poids d'une photo éditoriale une fois convertie (redimensionnée
// puis recompressée en JPEG selon le palier de qualité choisi, cf.
// convertEditorialAssetToJpegDataUrl ci-dessous). On ne connaît pas le poids
// réel avant conversion (l'asset source est un .webp de taille variable et
// pas encore chargé à l'étape de calcul de limite) ; cette estimation reste
// volontairement basée sur le gabarit de qualité par défaut (le plus lourd),
// même quand un palier dégradé sera effectivement appliqué au rendu : elle
// garde ainsi le calcul de limite prudent (majorant) plutôt que de
// sous-estimer le poids réel avant dégradation.
const EDITORIAL_PHOTO_ESTIMATED_BYTES = 180_000;

/**
 * Filet de sécurité ultime de l'export PDF (cf. commentaire de HARD_MAX_IMAGES/
 * HARD_MAX_PREPARED_BYTES ci-dessus). Ne devrait plus être atteint qu'en
 * dernier recours, pour un voyage au volume de lieux/photos réellement
 * extrême : le message ne suggère donc plus de retirer des lieux (ce n'est
 * plus la solution normale) mais oriente vers un partage en plusieurs
 * albums.
 */
export function calculateExportLimit(input: PdfExportLimitInput): PdfExportLimitResult {
  const byteLimit = HARD_MAX_PREPARED_BYTES;
  const imageLimit = HARD_MAX_IMAGES;

  if (input.imageCount > imageLimit) {
    return {
      allowed: false,
      reason: `Cet album compte plus de ${imageLimit} images, même après réduction automatique du nombre de photos par lieu. C'est un volume extrême pour un seul PDF : envisagez de composer plusieurs albums (par exemple un par grande étape du voyage).`,
      imageLimit,
      byteLimit,
    };
  }

  if (input.preparedBytes > byteLimit) {
    const byteLimitMiB = Math.round(byteLimit / (1024 * 1024));
    return {
      allowed: false,
      reason: `Cet album dépasse ${byteLimitMiB} MiB de données images, même après réduction automatique de la qualité des photos. C'est un volume extrême pour un seul PDF : envisagez de composer plusieurs albums (par exemple un par grande étape du voyage).`,
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
  // Budget de photos par lieu (éditorial + carnet), calculé une seule fois
  // pour tout l'album à partir du nombre de lieux inclus (story 30.5, export
  // adaptatif) : cf. `FilteredAlbumContent.photoBudgetPerPlace` et
  // `resolvePhotoBudgetPerPlace` dans albumUtils.ts. Ce même budget est
  // utilisé par l'aperçu HTML (AlbumScreen.tsx) pour rester cohérent avec ce
  // qui sera effectivement rendu dans le PDF.
  const { editorial: editorialBudget, carnet: carnetBudget } = content.photoBudgetPerPlace;

  for (const [placeId, place] of Object.entries(content.places)) {
    // Photos éditoriales des lieux inclus (présentation officielle du lieu).
    const photos = place.photos ?? [];
    const cappedEditorial = photos.slice(0, editorialBudget);
    cappedEditorial.forEach((src, index) => {
      if (typeof src === "string" && src) {
        images.push({
          id: `editorial:${placeId}:${index}`,
          src,
          kind: "editorial",
          fileSize: EDITORIAL_PHOTO_ESTIMATED_BYTES,
        });
      }
    });

    // Photos du carnet de visite (souvenirs personnels) de ce lieu, les plus
    // récentes conservées en priorité en cas de troncature (cf.
    // selectBudgetedCarnetPhotos).
    const placeEntries = content.entries[placeId] ?? {};
    for (const photo of selectBudgetedCarnetPhotos(placeEntries, carnetBudget)) {
      images.push({ id: photo.id, src: photo.src, kind: "carnet", fileSize: photo.src.length * 0.75 });
    }
  }

  // Photos éditoriales des topics de contenu inclus (Histoire / Géographie
  // et économie / Culture et tradition, story 30.8). Pas de photos de
  // carnet pour ces rubriques (les entrées de carnet de contenu n'en ont
  // jamais, cf. AlbumSourceContentEntry) : seul le budget éditorial
  // s'applique ici.
  for (const [key, topic] of Object.entries(content.contentTopics ?? {})) {
    const photos = topic.photos ?? [];
    photos.slice(0, editorialBudget).forEach((src, index) => {
      if (typeof src === "string" && src) {
        images.push({
          id: `content-editorial:${key}:${index}`,
          src,
          kind: "editorial",
          fileSize: EDITORIAL_PHOTO_ESTIMATED_BYTES,
        });
      }
    });
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

// --- Conversion/recompression des photos à l'export (story 30.5) --------
//
// Les photos éditoriales des lieux (`Place.photos` dans src/content/places.ts)
// sont des chemins d'assets bundlés (ex. /images/guide/Istanbul photo 1.webp),
// pas des data URI JPEG comme les photos de carnet. jsPDF (addImage) a besoin
// d'un data URI directement exploitable ; on les convertit donc à la demande,
// juste avant le rendu, avec la même technique que la compression de photo
// côté propriétaire (src/app/image-upload.ts) : chargement dans une balise
// <img>, dessin redimensionné dans un <canvas>, export en JPEG.
//
// Depuis l'ajout de l'export adaptatif, les photos de carnet peuvent elles
// aussi être recompressées à l'export (pas à l'ajout/stockage, cf.
// recompressCarnetPhotoForExport plus bas), quand le palier de qualité
// choisi pour l'album (cf. resolvePhotoQualityTier dans albumUtils.ts) est
// plus agressif que leur gabarit de stockage d'origine (900px/qualité 0.72,
// cf. PLACE_IMAGE_MAX_DIMENSION_PX dans image-upload.ts). Les deux chemins
// (éditorial et carnet) réutilisent donc la même fonction de redimensionnement
// paramétrée par un palier de qualité (`recompressDataUrlToJpeg`), pour ne
// pas dupliquer le mécanisme.
//
// Chaque étape est injectable (fetchAsset/readBlobAsDataUrl/loadImageElement/
// drawResizedJpeg) pour rester testable en Vitest/jsdom, qui n'implémente pas
// nativement le décodage d'image ni le rendu canvas 2D. En dehors des tests,
// les valeurs par défaut utilisent les API navigateur réelles.

// Conservé pour compatibilité (référence à la dimension du palier par
// défaut, cf. PHOTO_QUALITY_TIER_DEFAULT dans albumUtils.ts) ; la dimension
// et la qualité réellement appliquées dépendent désormais du palier choisi
// pour l'album (cf. resolvePhotoQualityTier).
export const EDITORIAL_PHOTO_MAX_DIMENSION_PX = PHOTO_QUALITY_TIER_DEFAULT.maxDimensionPx;

/** Dépendances communes aux deux chemins de recompression (carnet et éditorial). */
export type ImageRecompressionDeps = {
  loadImageElement?: (
    dataUrl: string
  ) => Promise<{ naturalWidth?: number; naturalHeight?: number; width?: number; height?: number }>;
  drawResizedJpeg?: (image: unknown, width: number, height: number, quality: number) => string;
};

export type EditorialPhotoConverterDeps = ImageRecompressionDeps & {
  fetchAsset?: (src: string) => Promise<{ ok: boolean; blob: () => Promise<Blob> }>;
  readBlobAsDataUrl?: (blob: Blob) => Promise<string>;
};

/** Alias dédié au chemin carnet, mêmes dépendances que ImageRecompressionDeps. */
export type CarnetPhotoRecompressionDeps = ImageRecompressionDeps;

function defaultFetchAsset(src: string): Promise<{ ok: boolean; blob: () => Promise<Blob> }> {
  return fetch(src);
}

function defaultReadBlobAsDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Lecture de la photo impossible."));
    reader.readAsDataURL(blob);
  });
}

function defaultLoadImageElement(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Photo illisible ou corrompue."));
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
 * Redimensionne/recompresse un data URI déjà chargé (image décodable) selon
 * le palier de qualité fourni. Fonction commune aux deux chemins de
 * recompression (carnet et éditorial) : seule l'obtention du data URI
 * d'origine diffère (fetch d'un asset bundlé pour l'éditorial, déjà en
 * mémoire pour le carnet).
 *
 * Cas limite : toute erreur (décodage impossible, canvas indisponible) est
 * absorbée et fait retourner `null`, jamais d'exception propagée.
 */
async function recompressDataUrlToJpeg(
  dataUrl: string,
  tier: PhotoQualityTier,
  deps: ImageRecompressionDeps = {}
): Promise<string | null> {
  const loadImageElement = deps.loadImageElement ?? defaultLoadImageElement;
  const drawResizedJpeg = deps.drawResizedJpeg ?? defaultDrawResizedJpeg;

  try {
    const image = await loadImageElement(dataUrl);
    const { width, height } = computeResizedDimensions(
      image.naturalWidth || image.width || 0,
      image.naturalHeight || image.height || 0,
      tier.maxDimensionPx
    );
    return drawResizedJpeg(image, width, height, tier.jpegQuality);
  } catch {
    return null;
  }
}

/**
 * Convertit une photo éditoriale (chemin d'asset bundlé) en data URI JPEG
 * redimensionnée selon le palier de qualité de l'album, embarquable par
 * jsPDF.
 *
 * Cas limite (story 30.5) : toute erreur (asset introuvable, réseau,
 * décodage, canvas indisponible) est absorbée et fait retourner `null` :
 * l'image est alors ignorée silencieusement par l'appelant, sans jamais
 * casser l'export du reste de l'album (même politique que la photo de
 * couverture manquante en 30.3).
 */
export async function convertEditorialAssetToJpegDataUrl(
  assetSrc: string,
  deps: EditorialPhotoConverterDeps = {},
  tier: PhotoQualityTier = PHOTO_QUALITY_TIER_DEFAULT
): Promise<string | null> {
  const fetchAsset = deps.fetchAsset ?? defaultFetchAsset;
  const readBlobAsDataUrl = deps.readBlobAsDataUrl ?? defaultReadBlobAsDataUrl;

  try {
    const response = await fetchAsset(assetSrc);
    if (!response || !response.ok) {
      return null;
    }
    const blob = await response.blob();
    const originalDataUrl = await readBlobAsDataUrl(blob);
    return await recompressDataUrlToJpeg(originalDataUrl, tier, deps);
  } catch {
    return null;
  }
}

/**
 * Recompresse une photo de carnet (data URI JPEG déjà stockée, cf.
 * `compressImageFileToDataUrl` dans image-upload.ts) selon le palier de
 * qualité choisi pour l'album, uniquement quand ce palier est plus agressif
 * que le gabarit de stockage d'origine (story 30.5, export adaptatif).
 *
 * Ne modifie jamais le mécanisme de stockage carnet/vignette : ce
 * retraitement n'a lieu qu'au moment de l'export PDF, sur une copie
 * temporaire, jamais persistée.
 *
 * Cas limite : si le palier par défaut est sélectionné (voyage peu illustré,
 * comportement historique), la photo n'est pas retraitée (déjà conforme,
 * inutile de la dégrader à nouveau). Si le retraitement échoue (décodage
 * impossible, canvas indisponible), on se rabat silencieusement sur la
 * photo d'origine plutôt que d'échouer l'export entier.
 */
export async function recompressCarnetPhotoForExport(
  src: string,
  tier: PhotoQualityTier,
  deps: CarnetPhotoRecompressionDeps = {}
): Promise<string> {
  if (!isPhotoQualityDegraded(tier)) {
    return src;
  }
  const recompressed = await recompressDataUrlToJpeg(src, tier, deps);
  return recompressed ?? src;
}

/**
 * Mesure les dimensions naturelles d'une image déjà résolue en data URI
 * (couverture ou galerie), pour l'afficher en respectant son ratio d'origine
 * (cf. `fitWithinBox` dans albumUtils.ts) plutôt que de l'étirer brutalement
 * dans une cellule à ratio fixe.
 *
 * Réutilise le même point d'injection `loadImageElement` que les fonctions
 * de recompression ci-dessus (mêmes deps, `EditorialPhotoConverterDeps`/
 * `CarnetPhotoRecompressionDeps`) : en production, un vrai décodage navigateur ;
 * en tests, le mock déjà injecté pour la conversion/recompression sert aussi
 * à cette mesure, sans dépendance réseau ni décodage supplémentaire à
 * configurer.
 *
 * Cas limite : toute erreur (décodage impossible, dimensions nulles) retourne
 * `null`, l'appelant se rabat alors sur un étirement dans la cellule (mieux
 * qu'un échec d'export).
 */
async function measureImageDimensions(
  dataUrl: string,
  deps: ImageRecompressionDeps = {}
): Promise<{ width: number; height: number } | null> {
  const loadImageElement = deps.loadImageElement ?? defaultLoadImageElement;
  try {
    const image = await loadImageElement(dataUrl);
    const width = image.naturalWidth || image.width || 0;
    const height = image.naturalHeight || image.height || 0;
    if (width <= 0 || height <= 0) {
      return null;
    }
    return { width, height };
  } catch {
    return null;
  }
}

// --- Rendu PDF (story 30.3, refonte visuelle story 30.5, habillage "carnet
// de voyage" story 30.6) ---------------------------------------------------
//
// Palette reprise des tokens réels de l'application (src/styles/theme.css),
// pour que le PDF prolonge visuellement l'appli plutôt que d'utiliser une
// palette Material bleue générique sans lien avec elle.
const PRIMARY_COLOR: [number, number, number] = [255, 107, 61]; // #FF6B3D (--primary)
const SECONDARY_COLOR: [number, number, number] = [255, 217, 61]; // #FFD93D (--secondary)
const ACCENT_TEAL_COLOR: [number, number, number] = [0, 196, 167]; // #00C4A7 (--accent)
const TEXT_COLOR: [number, number, number] = [26, 26, 46]; // #1A1A2E (--foreground)
const MUTED_TEXT_COLOR: [number, number, number] = [139, 115, 85]; // #8B7355 (--muted-foreground)
const PAGE_BACKGROUND_COLOR: [number, number, number] = [255, 251, 245]; // #FFFBF5 (--background)
const WHITE_COLOR: [number, number, number] = [255, 255, 255];
// Ombre portée simulée des cadres photo façon polaroid : un gris chaud plutôt
// qu'un gris neutre, pour rester dans la même famille que le fond crème.
const PHOTO_FRAME_SHADOW_COLOR: [number, number, number] = [214, 201, 184];

// Alternance de couleur des bandeaux de chapitre selon le JOUR de visite
// (variété façon "scrapbook", plutôt qu'un bleu unique répété partout) : deux
// lieux visités le même jour partagent la même couleur, la couleur change au
// jour suivant (retour utilisateur : "je ferais une couleur par jour", au
// lieu d'une alternance par lieu). Le jaune (--secondary) est volontairement
// exclu de cette rotation : trop clair pour porter du texte blanc lisible en
// fond plein, il est réservé aux petits accents (puces, chips).
const CHAPTER_ACCENT_COLORS: Array<[number, number, number]> = [PRIMARY_COLOR, ACCENT_TEAL_COLOR];
function getChapterAccent(index: number): [number, number, number] {
  return CHAPTER_ACCENT_COLORS[index % CHAPTER_ACCENT_COLORS.length];
}

/**
 * Calcule, pour une liste de chapitres-lieux (ordonnée chronologiquement,
 * cf. buildEligiblePlaces dans album-source.ts), l'index d'accent de couleur
 * à appliquer à chacun : deux chapitres consécutifs partageant le même jour
 * reçoivent le même index, l'index avance d'un cran au premier chapitre d'un
 * nouveau jour (cf. `getChapterAccent`).
 *
 * Cas limite : le tout premier chapitre doit toujours démarrer un nouveau
 * "groupe couleur", même quand son jour est inconnu (`null`, lieu sans jour
 * renseigné) — sans le drapeau `isFirst`, un premier jour `null` serait
 * confondu avec l'état initial `lastDay = null` et le curseur ne
 * démarrerait jamais (bug constaté : `getChapterAccent(-1)` plante le rendu).
 */
export function computeChapterDayColorCursor(daysByChapter: Array<number | null>): number[] {
  const cursors: number[] = [];
  let lastDay: number | null = null;
  let cursor = -1;
  let isFirst = true;
  for (const day of daysByChapter) {
    if (isFirst || day !== lastDay) {
      cursor += 1;
      lastDay = day;
      isFirst = false;
    }
    cursors.push(cursor);
  }
  return cursors;
}

/**
 * Enregistre les polices embarquées (Nunito Regular/Bold, Caveat Bold) dans
 * le document jsPDF. Instances statiques subsettées générées une fois depuis
 * les polices variables officielles Google Fonts (cf. src/assets/fonts/*.ts),
 * importées dynamiquement pour rester dans le même chunk paresseux que
 * `jspdf` (chargées seulement quand un export est réellement déclenché).
 */
async function registerAlbumFonts(doc: import("jspdf").jsPDF): Promise<void> {
  const [{ NUNITO_REGULAR_BASE64 }, { NUNITO_BOLD_BASE64 }, { CAVEAT_BOLD_BASE64 }] = await Promise.all([
    import("../assets/fonts/nunito-regular"),
    import("../assets/fonts/nunito-bold"),
    import("../assets/fonts/caveat-bold"),
  ]);

  doc.addFileToVFS("Nunito-Regular.ttf", NUNITO_REGULAR_BASE64);
  doc.addFont("Nunito-Regular.ttf", "Nunito", "normal");
  doc.addFileToVFS("Nunito-Bold.ttf", NUNITO_BOLD_BASE64);
  doc.addFont("Nunito-Bold.ttf", "Nunito", "bold");
  doc.addFileToVFS("Caveat-Bold.ttf", CAVEAT_BOLD_BASE64);
  doc.addFont("Caveat-Bold.ttf", "Caveat", "bold");
}

function paintPageBackground(doc: import("jspdf").jsPDF, pageWidth: number, pageHeight: number) {
  doc.setFillColor(...PAGE_BACKGROUND_COLOR);
  doc.rect(0, 0, pageWidth, pageHeight, "F");
}

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

// Bandeau de titre en "pill" arrondi (au lieu d'un rectangle plein-largeur),
// cohérent avec les coins très arrondis de l'appli (--radius: 1rem dans
// theme.css). La couleur est choisie par l'appelant (cf. getChapterAccent)
// pour varier d'un chapitre à l'autre plutôt que rester figée en bleu unique.
function drawTitleBand(
  doc: import("jspdf").jsPDF,
  text: string,
  pageWidth: number,
  margin: number,
  y: number,
  accentColor: [number, number, number],
  bandHeight = 13
) {
  const bandWidth = pageWidth - margin * 2;
  doc.setFillColor(...accentColor);
  doc.roundedRect(margin, y, bandWidth, bandHeight, 3, 3, "F");
  doc.setTextColor(...WHITE_COLOR);
  doc.setFont("Nunito", "bold");
  doc.setFontSize(bandHeight >= 13 ? 15 : 11);
  doc.text(text.slice(0, 90), margin + 5, y + bandHeight / 2 + 2.7, { maxWidth: bandWidth - 10 });
  doc.setTextColor(...TEXT_COLOR);
}

type EnsureSpaceOptions = {
  /** Titre du chapitre en cours, redessiné en mini-bandeau "(suite)" si le contenu déborde sur une nouvelle page. */
  chapterTitle?: string;
  accentColor?: [number, number, number];
};

/**
 * Garantit qu'un bloc de hauteur `neededHeight` tient dans la page courante à
 * partir de `cursorY` : sinon, ajoute une nouvelle page (fond crème repeint,
 * mini-bandeau de continuité optionnel) et retourne le nouveau `cursorY`.
 *
 * Corrige un manque du rendu précédent : le contenu (texte long, galerie,
 * notes de carnet) pouvait déborder silencieusement en bas de page sans
 * saut de page, produisant un rendu coupé/peu soigné.
 */
function ensureSpace(
  doc: import("jspdf").jsPDF,
  cursorY: number,
  neededHeight: number,
  pageWidth: number,
  pageHeight: number,
  margin: number,
  options: EnsureSpaceOptions = {}
): number {
  if (cursorY + neededHeight <= pageHeight - margin) {
    return cursorY;
  }

  doc.addPage();
  paintPageBackground(doc, pageWidth, pageHeight);
  let nextY = margin;
  if (options.chapterTitle) {
    drawTitleBand(
      doc,
      `${options.chapterTitle} (suite)`,
      pageWidth,
      margin,
      nextY,
      options.accentColor ?? PRIMARY_COLOR,
      10
    );
    nextY += 10 + 8;
  }
  return nextY;
}

// Cadre "polaroid" : carte blanche arrondie + ombre portée légère derrière,
// photo affichée en mode "contain" (ratio conservé, cf. fitWithinBox) et
// centrée dans la carte plutôt qu'étirée brutalement dans la cellule (bug du
// rendu précédent, visible surtout sur les photos non carrées).
const PHOTO_FRAME_PADDING = 2.4;
const PHOTO_FRAME_SHADOW_OFFSET = 1;
const PHOTO_FRAME_RADIUS = 2;

function drawFramedPhoto(
  doc: import("jspdf").jsPDF,
  src: string,
  x: number,
  y: number,
  cellWidth: number,
  cellHeight: number,
  dimensions: { width: number; height: number } | null
) {
  doc.setFillColor(...PHOTO_FRAME_SHADOW_COLOR);
  doc.roundedRect(
    x + PHOTO_FRAME_SHADOW_OFFSET,
    y + PHOTO_FRAME_SHADOW_OFFSET,
    cellWidth,
    cellHeight,
    PHOTO_FRAME_RADIUS,
    PHOTO_FRAME_RADIUS,
    "F"
  );
  doc.setFillColor(...WHITE_COLOR);
  doc.roundedRect(x, y, cellWidth, cellHeight, PHOTO_FRAME_RADIUS, PHOTO_FRAME_RADIUS, "F");

  const innerWidth = cellWidth - PHOTO_FRAME_PADDING * 2;
  const innerHeight = cellHeight - PHOTO_FRAME_PADDING * 2;
  if (innerWidth <= 0 || innerHeight <= 0) {
    return;
  }

  const fitted = fitWithinBox(dimensions?.width ?? innerWidth, dimensions?.height ?? innerHeight, innerWidth, innerHeight);

  try {
    doc.addImage(
      src,
      "JPEG",
      x + PHOTO_FRAME_PADDING + fitted.offsetX,
      y + PHOTO_FRAME_PADDING + fitted.offsetY,
      fitted.width,
      fitted.height,
      undefined,
      "FAST"
    );
  } catch {
    // Cas limite : image corrompue, cadre blanc conservé plutôt que de casser le chapitre.
  }
}

// Retire les marqueurs markdown simples (**gras**) utilisés dans
// src/content/places.ts : jsPDF affiche du texte brut, pas du markdown.
function stripBasicMarkdown(text: string): string {
  return text.replace(/\*\*/g, "");
}

/**
 * Formate la plage de dates du voyage (1er jour -> dernier jour défini,
 * story 30.6) pour la couverture de l'album, en réutilisant le même helper
 * que le reste de l'appli (`formatTripDayLabel`, cf. PlanningScreen dans
 * App.tsx) pour rester cohérent.
 *
 * Cas limite : date de début absente/invalide -> aucune plage affichée
 * (pas de texte trompeur). Un seul jour défini -> une seule date affichée.
 */
function formatTripDateRangeLabel(tripStartDate: string | null, lastTripDay: number | null): string | null {
  if (!isValidTripStartDate(tripStartDate)) {
    return null;
  }
  const startLabel = formatTripDayLabel(1, tripStartDate, { format: "long" });
  if (!lastTripDay || lastTripDay <= 1) {
    return startLabel;
  }
  const endLabel = formatTripDayLabel(lastTripDay, tripStartDate, { format: "long" });
  return `${startLabel} — ${endLabel}`;
}

/**
 * Étiquette de jour d'un chapitre-lieu (retour utilisateur : "on perd
 * rapidement le jour de la visite"), affichée sous le bandeau de titre du
 * chapitre et rappelée en pied de page de chaque page de ce chapitre. Même
 * helper que l'aperçu HTML (cf. AlbumScreen.tsx), pour rester cohérents.
 */
function formatChapterDayLabel(jour: number[], tripStartDate: string | null): string | null {
  return formatPrimaryTripDayLabel(jour, tripStartDate, { format: "short" });
}

export async function exportAlbumAsPdf(
  draft: AlbumDraft,
  content: FilteredAlbumContent,
  source: AlbumSource,
  onProgress?: (phase: PdfExportProgress) => void,
  editorialConverterDeps?: EditorialPhotoConverterDeps,
  carnetConverterDeps?: CarnetPhotoRecompressionDeps
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

  // Palier de qualité/dimension à appliquer à toutes les photos de cet
  // export (éditoriales ET carnet), calculé une seule fois pour tout l'album
  // à partir du nombre de lieux inclus (story 30.5, export adaptatif).
  const qualityTier = content.photoQualityTier;

  // Cache de conversion éditoriale : une même photo (ex. couverture ET
  // galerie du chapitre) n'est convertie qu'une seule fois.
  const editorialCache = new Map<string, string | null>();
  async function resolveEditorial(src: string): Promise<string | null> {
    if (editorialCache.has(src)) {
      return editorialCache.get(src) ?? null;
    }
    const converted = await convertEditorialAssetToJpegDataUrl(src, editorialConverterDeps, qualityTier);
    editorialCache.set(src, converted);
    return converted;
  }

  // Cache de recompression carnet : idem, une même photo (ex. couverture ET
  // galerie) n'est retraitée qu'une seule fois. Ne retraite réellement que
  // si le palier de qualité est plus agressif que le stockage d'origine
  // (cf. recompressCarnetPhotoForExport), se rabat sur la source d'origine
  // en cas d'échec.
  const carnetCache = new Map<string, string>();
  async function resolveCarnet(src: string): Promise<string> {
    if (carnetCache.has(src)) {
      return carnetCache.get(src)!;
    }
    const resolved = await recompressCarnetPhotoForExport(src, qualityTier, carnetConverterDeps);
    carnetCache.set(src, resolved);
    return resolved;
  }

  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;

  const pageContentWidth = pageWidth - margin * 2;
  // Cache des dimensions naturelles des photos déjà résolues (couverture ET
  // galerie), pour n'appeler `measureImageDimensions` qu'une seule fois par
  // photo même si elle apparaît à plusieurs endroits de l'album.
  const dimensionCache = new Map<string, { width: number; height: number } | null>();
  async function resolveDimensions(
    src: string,
    deps: ImageRecompressionDeps | undefined
  ): Promise<{ width: number; height: number } | null> {
    if (dimensionCache.has(src)) {
      return dimensionCache.get(src) ?? null;
    }
    const dimensions = await measureImageDimensions(src, deps);
    dimensionCache.set(src, dimensions);
    return dimensions;
  }

  const addTextBlock = (lines: string[], x: number, y: number, fontSize: number, lineHeight = 7) => {
    doc.setFont("Nunito", "normal");
    doc.setFontSize(fontSize);
    doc.setTextColor(...TEXT_COLOR);
    let currentY = y;
    for (const line of lines) {
      const safeLine = String(line || "").slice(0, 220);
      doc.text(safeLine, x, currentY, { maxWidth: pageWidth - x - margin });
      currentY += lineHeight;
    }
    return currentY;
  };

  onProgress?.("rendering");
  await registerAlbumFonts(doc);

  // --- Couverture -----------------------------------------------------
  drawVerticalGradient(doc, 0, 0, pageWidth, pageHeight, PRIMARY_COLOR, SECONDARY_COLOR);

  // Photo de couverture : priorité au choix explicite du voyageur
  // (draft.coverPhotoId, photo éditoriale OU de carnet, cf. AlbumScreen.tsx),
  // sinon repli automatique sur la première photo éditoriale disponible dans
  // l'ordre chronologique des lieux inclus (content.places est déjà trié par
  // jour, cf. buildEligiblePlaces dans album-source.ts), sinon aucune image
  // (choix explicite "aucune photo" ou album sans aucune photo disponible).
  const coverPhoto = resolveEffectiveCoverPhoto(content.places, content.entries, draft.coverPhotoId);
  let coverImageSrc: string | null = null;
  let coverImageDeps: ImageRecompressionDeps | undefined;
  if (coverPhoto?.kind === "carnet") {
    coverImageSrc = await resolveCarnet(coverPhoto.src);
    coverImageDeps = carnetConverterDeps;
  } else if (coverPhoto?.kind === "editorial") {
    coverImageSrc = await resolveEditorial(coverPhoto.src);
    coverImageDeps = editorialConverterDeps;
  }

  // Petit label "eyebrow" façon carnet de voyage, au-dessus du bandeau photo
  // (espacement manuel des lettres : jsPDF n'expose pas d'option fiable de
  // letter-spacing sur `text()`).
  doc.setFont("Nunito", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(...WHITE_COLOR);
  doc.text("C A R N E T   D E   V O Y A G E", pageWidth / 2, 26, { align: "center" });

  const coverPhotoY = 34;
  const coverPhotoHeight = 92;
  if (coverImageSrc) {
    const dimensions = await resolveDimensions(coverImageSrc, coverImageDeps);
    try {
      drawFramedPhoto(doc, coverImageSrc, margin, coverPhotoY, pageContentWidth, coverPhotoHeight, dimensions);
    } catch {
      // Cas limite : photo de couverture illisible/corrompue, ignorée
      // silencieusement pour garder une couverture propre (habillage seul).
    }
  }

  // Titre en lignes pré-calculées (plutôt qu'un simple maxWidth) : la police
  // Caveat en grand corps peut s'enrouler sur un titre un peu long, il faut
  // alors décaler le sous-titre en conséquence pour ne pas le chevaucher.
  doc.setFont("Caveat", "bold");
  doc.setFontSize(40);
  doc.setTextColor(...WHITE_COLOR);
  const titleLines: string[] = doc.splitTextToSize(draft.title || "Mon album", pageContentWidth);
  let titleCursorY = coverPhotoY + coverPhotoHeight + 20;
  for (const line of titleLines) {
    doc.text(line, pageWidth / 2, titleCursorY, { align: "center" });
    titleCursorY += 16;
  }
  if (draft.subtitle) {
    doc.setFont("Nunito", "normal");
    doc.setFontSize(12.5);
    doc.text(draft.subtitle, pageWidth / 2, titleCursorY, { align: "center", maxWidth: pageContentWidth });
    titleCursorY += 9;
  }

  // Dates du voyage (story 30.6) : 1er jour -> dernier jour défini
  // (JOURS_DESTINATIONS), formatées avec le même helper que le reste de
  // l'appli (cf. PlanningScreen dans App.tsx) pour rester cohérent.
  const tripDateRangeLabel = formatTripDateRangeLabel(source.tripStartDate, source.lastTripDay);
  if (tripDateRangeLabel) {
    doc.setFont("Nunito", "normal");
    doc.setFontSize(11);
    doc.text(tripDateRangeLabel, pageWidth / 2, titleCursorY, { align: "center", maxWidth: pageContentWidth });
  }
  doc.setTextColor(...TEXT_COLOR);

  // --- Circuit du voyage --------------------------------------------------
  // Reprend la photo affichée sur le tableau de bord de l'appli (story 30.6),
  // convertie via le même pipeline que les photos éditoriales.
  const mapImageSrc = await resolveEditorial(TRIP_MAP_IMAGE_PATH);
  if (mapImageSrc) {
    doc.addPage();
    paintPageBackground(doc, pageWidth, pageHeight);
    drawTitleBand(doc, "Circuit du voyage", pageWidth, margin, 12, PRIMARY_COLOR);
    const mapDimensions = await resolveDimensions(mapImageSrc, editorialConverterDeps);
    drawFramedPhoto(doc, mapImageSrc, margin, 34, pageContentWidth, pageHeight - 34 - margin - 10, mapDimensions);
  }

  // --- Planning jour par jour ----------------------------------------------
  // Remplace l'ancienne liste plate des lieux inclus par un regroupement par
  // jour façon écran "Planning complet" de l'appli (story 30.6) : un jour
  // n'est affiché que s'il contient au moins un lieu inclus dans l'album,
  // pour rester compact (tenir sur 1 page pour un voyage classique) plutôt
  // que de lister tous les jours du voyage même vides.
  const includedPlaceEntries = Object.entries(content.places);
  const daysWithIncludedPlaces = JOURS_DESTINATIONS.filter((dayEntry) =>
    includedPlaceEntries.some(([, place]) => place.jour.includes(dayEntry.jour))
  );

  if (daysWithIncludedPlaces.length > 0) {
    doc.addPage();
    paintPageBackground(doc, pageWidth, pageHeight);
    drawTitleBand(doc, "Planning du voyage", pageWidth, margin, 12, PRIMARY_COLOR);
    let cursorY = 34;

    for (const [index, dayEntry] of daysWithIncludedPlaces.entries()) {
      const placeNames = includedPlaceEntries
        .filter(([, place]) => place.jour.includes(dayEntry.jour))
        .map(([, place]) => place.name);

      doc.setFont("Nunito", "bold");
      doc.setFontSize(10);
      const dateLabel = formatTripDayLabel(dayEntry.jour, source.tripStartDate, { format: "long" });
      doc.setFont("Nunito", "bold");
      doc.setFontSize(12);
      const destinationLines: string[] = doc.splitTextToSize(dayEntry.destination, pageContentWidth - 8);
      doc.setFont("Nunito", "normal");
      doc.setFontSize(10);
      const placesLine = placeNames.join(" · ");
      const placesLines: string[] = placesLine ? doc.splitTextToSize(placesLine, pageContentWidth - 8) : [];

      const neededHeight = 5 + destinationLines.length * 6 + placesLines.length * 5 + 5;
      cursorY = ensureSpace(doc, cursorY, neededHeight, pageWidth, pageHeight, margin, {
        chapterTitle: "Planning du voyage",
        accentColor: PRIMARY_COLOR,
      });

      const dotColor = index % 2 === 0 ? PRIMARY_COLOR : ACCENT_TEAL_COLOR;
      doc.setFillColor(...dotColor);
      doc.circle(margin + 1.4, cursorY - 1.4, 1.4, "F");

      doc.setFont("Nunito", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(...MUTED_TEXT_COLOR);
      doc.text(dateLabel.toUpperCase(), margin + 6, cursorY);
      cursorY += 5;

      doc.setFont("Nunito", "bold");
      doc.setFontSize(12);
      doc.setTextColor(...TEXT_COLOR);
      for (const line of destinationLines) {
        doc.text(line, margin + 6, cursorY);
        cursorY += 6;
      }

      if (placesLines.length > 0) {
        doc.setFont("Nunito", "normal");
        doc.setFontSize(10);
        doc.setTextColor(...MUTED_TEXT_COLOR);
        for (const line of placesLines) {
          doc.text(line, margin + 6, cursorY);
          cursorY += 5;
        }
      }
      cursorY += 5;
    }
    doc.setTextColor(...TEXT_COLOR);
  }

  // --- Chapitres par lieu -------------------------------------------------
  // Un chapitre est créé pour chaque lieu inclus, même sans note de carnet :
  // le socle éditorial (présentation, anecdotes, photos officielles) est
  // toujours affiché en premier, les souvenirs personnels s'ajoutent ensuite
  // (règle métier story 30.5). L'accent de couleur alterne selon le JOUR de
  // visite (cf. getChapterAccent) plutôt que selon l'index du lieu : deux
  // lieux visités le même jour partagent la même couleur, la couleur change
  // au jour suivant (retour utilisateur : "je ferais une couleur par jour").
  // Repose sur le tri chronologique des chapitres (cf. buildEligiblePlaces
  // dans album-source.ts) : le jour ne peut donc que rester stable ou
  // avancer d'un chapitre à l'autre.
  //
  // Le jour de visite est aussi rappelé sous le bandeau de titre et en pied
  // de page de chaque page du chapitre (retour utilisateur : "on perd
  // rapidement le jour de la visite"), via `chapterFooterRanges` complété
  // ci-dessous et exploité dans la passe finale de numérotation des pages.
  const chapterEntries = Object.entries(content.places);
  const chapterPrimaryDays = chapterEntries.map(([, place]) =>
    place.jour.length > 0 ? Math.min(...place.jour) : null
  );
  const chapterDayColorCursors = computeChapterDayColorCursor(chapterPrimaryDays);
  const chapterFooterRanges: Array<{ startPage: number; endPage: number; label: string }> = [];

  for (const [chapterPosition, [placeId, place]] of chapterEntries.entries()) {
    const placeEntries = content.entries[placeId] ?? {};
    const bodyLines: string[] = [];
    for (const entry of Object.values(placeEntries)) {
      if (!entry || typeof entry !== "object") continue;
      const text = (entry as { text?: unknown }).text;
      if (typeof text === "string" && text.trim()) {
        bodyLines.push(text.trim());
      }
    }

    const chapterTitle = place.name || placeId;
    const accentColor = getChapterAccent(chapterDayColorCursors[chapterPosition]);
    const chapterDayLabel = formatChapterDayLabel(place.jour, source.tripStartDate);

    doc.addPage();
    const chapterStartPage = doc.getNumberOfPages();
    paintPageBackground(doc, pageWidth, pageHeight);
    drawTitleBand(doc, chapterTitle, pageWidth, margin, 12, accentColor);
    let cursorY = 34;
    if (chapterDayLabel) {
      doc.setFont("Nunito", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(...MUTED_TEXT_COLOR);
      doc.text(chapterDayLabel.toUpperCase(), margin, 30);
      doc.setTextColor(...TEXT_COLOR);
      cursorY = 36;
    }

    const hasPresentation = Boolean(place.history && place.history.trim());
    const hasAnecdotes = Boolean(place.anecdotes && place.anecdotes.length > 0);

    if (hasPresentation) {
      // `splitTextToSize` mesure le texte avec la police/taille *actuellement
      // active* sur le document : elle doit donc être fixée ici à la même
      // valeur que celle utilisée au dessin réel (cf. addTextBlock plus bas,
      // "Nunito"/10.5), sous peine de mesurer à une taille différente de
      // celle du rendu et de faire déborder une ligne sur la suivante.
      doc.setFont("Nunito", "normal");
      doc.setFontSize(10.5);
      const historyLines: string[] = doc.splitTextToSize(stripBasicMarkdown(place.history || ""), pageContentWidth);
      cursorY = ensureSpace(doc, cursorY, 7 + historyLines.length * 5.5 + 3, pageWidth, pageHeight, margin, {
        chapterTitle,
        accentColor,
      });
      doc.setFont("Nunito", "bold");
      doc.setFontSize(12);
      doc.setTextColor(...accentColor);
      doc.text((place.historyLabel || "Présentation").slice(0, 90), margin, cursorY);
      doc.setTextColor(...TEXT_COLOR);
      cursorY += 7;
      cursorY = addTextBlock(historyLines, margin, cursorY, 10.5, 5.5);
      cursorY += 3;
    }

    if (hasAnecdotes) {
      // Chaque anecdote est pré-découpée en lignes physiques (comme la
      // présentation ci-dessus) : une anecdote longue qui prend plusieurs
      // lignes est ainsi correctement prise en compte dans la hauteur
      // réservée, au lieu de laisser jsPDF l'enrouler seul au moment du
      // dessin (risque de chevauchement avec l'anecdote suivante).
      // Même précaution que pour `historyLines` ci-dessus : mesurer à la
      // police/taille exacte du rendu réel (Nunito/10.5, cf. addTextBlock).
      doc.setFont("Nunito", "normal");
      doc.setFontSize(10.5);
      const anecdoteLines: string[] = [];
      for (const item of place.anecdotes ?? []) {
        anecdoteLines.push(...(doc.splitTextToSize(`•  ${item}`, pageContentWidth - 2) as string[]));
      }
      cursorY = ensureSpace(doc, cursorY, 7 + anecdoteLines.length * 5.5 + 3, pageWidth, pageHeight, margin, {
        chapterTitle,
        accentColor,
      });
      doc.setFont("Nunito", "bold");
      doc.setFontSize(12);
      doc.setTextColor(...accentColor);
      doc.text((place.anecdotesLabel || "Anecdotes").slice(0, 90), margin, cursorY);
      doc.setTextColor(...TEXT_COLOR);
      cursorY += 7;
      cursorY = addTextBlock(anecdoteLines, margin, cursorY, 10.5, 5.5);
      cursorY += 3;
    }

    // Galerie photo : photos éditoriales converties + photos de carnet,
    // dans une grille simple de 3 colonnes. Plafonnées au budget de photos
    // par lieu de l'album (cf. content.photoBudgetPerPlace, story 30.5,
    // export adaptatif), les photos de carnet les plus récentes étant
    // conservées en priorité en cas de troncature.
    const galleryEntries: Array<{ src: string; editorial: boolean }> = [];
    for (const src of (place.photos ?? []).slice(0, content.photoBudgetPerPlace.editorial)) {
      galleryEntries.push({ src, editorial: true });
    }
    for (const photo of selectBudgetedCarnetPhotos(placeEntries, content.photoBudgetPerPlace.carnet)) {
      galleryEntries.push({ src: photo.src, editorial: false });
    }

    if (galleryEntries.length > 0) {
      const columns = 3;
      const gap = 4;
      const cellWidth = (pageContentWidth - gap * (columns - 1)) / columns;
      const cellHeight = 36;
      let column = 0;
      for (const item of galleryEntries) {
        if (column === 0) {
          cursorY = ensureSpace(doc, cursorY, cellHeight + gap, pageWidth, pageHeight, margin, {
            chapterTitle,
            accentColor,
          });
        }

        const src = item.editorial ? await resolveEditorial(item.src) : await resolveCarnet(item.src);
        if (!src) {
          // Cas limite : image introuvable/erreur réseau, ignorée silencieusement.
          continue;
        }
        const deps = item.editorial ? editorialConverterDeps : carnetConverterDeps;
        const dimensions = await resolveDimensions(src, deps);
        const x = margin + column * (cellWidth + gap);
        drawFramedPhoto(doc, src, x, cursorY, cellWidth, cellHeight, dimensions);

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

    // Notes de carnet : conservées, mises en forme avec un liseré d'accent.
    // Chaque note est pré-découpée en lignes physiques (même raison que les
    // anecdotes ci-dessus) pour que le liseré couvre exactement la hauteur du
    // texte, y compris quand une note s'étend sur plusieurs lignes.
    if (bodyLines.length > 0) {
      // Même précaution que pour `historyLines`/`anecdoteLines` ci-dessus :
      // mesurer à la police/taille exacte du rendu réel (Nunito/11, cf.
      // addTextBlock plus bas). Sans ce `setFontSize` explicite, la mesure
      // hérite de la taille laissée par le bloc précédent (10.5 pour la
      // présentation/les anecdotes) : plus petite que les 11pt du rendu réel,
      // ce qui faisait déborder certaines lignes sur la ligne suivante lors
      // du dessin (chevauchement de texte constaté à la vérification visuelle).
      doc.setFont("Nunito", "normal");
      doc.setFontSize(11);
      const noteLines: string[] = [];
      for (const line of bodyLines) {
        noteLines.push(...(doc.splitTextToSize(line, pageContentWidth - 8) as string[]));
      }
      cursorY = ensureSpace(doc, cursorY, 10 + noteLines.length * 7, pageWidth, pageHeight, margin, {
        chapterTitle,
        accentColor,
      });
      doc.setFont("Nunito", "bold");
      doc.setFontSize(11);
      doc.setTextColor(...TEXT_COLOR);
      doc.text("Souvenirs du carnet", margin, cursorY);
      cursorY += 6;
      doc.setDrawColor(...accentColor);
      doc.setLineWidth(0.8);
      doc.line(margin, cursorY - 4, margin, cursorY + noteLines.length * 7 - 4);
      cursorY = addTextBlock(noteLines, margin + 4, cursorY, 11, 7);
    }

    // Avis de la famille (story 30.6) : like/dislike + commentaire libre par
    // membre de la famille, même wording que la fiche lieu de l'appli
    // (App.tsx, "Avis de la famille" / "J'aime" / "J'aime pas" / "Réaction
    // sans commentaire.").
    const placeComments = Object.values(content.comments[placeId] ?? {});
    if (placeComments.length > 0) {
      cursorY = ensureSpace(doc, cursorY, 9, pageWidth, pageHeight, margin, { chapterTitle, accentColor });
      doc.setFont("Nunito", "bold");
      doc.setFontSize(12);
      doc.setTextColor(...accentColor);
      doc.text("Avis de la famille", margin, cursorY);
      doc.setTextColor(...TEXT_COLOR);
      cursorY += 7;

      for (const comment of placeComments) {
        const reactionLabel =
          comment.reaction === "like" ? "J'aime" : comment.reaction === "dislike" ? "J'aime pas" : "Commentaire";
        const hasText = Boolean(comment.text && comment.text.trim());
        doc.setFont("Nunito", "normal");
        doc.setFontSize(10.5);
        const textLines: string[] = hasText
          ? doc.splitTextToSize(comment.text.trim(), pageContentWidth)
          : ["Réaction sans commentaire."];

        cursorY = ensureSpace(doc, cursorY, 6 + textLines.length * 5.5 + 3, pageWidth, pageHeight, margin, {
          chapterTitle,
          accentColor,
        });

        doc.setFont("Nunito", "bold");
        doc.setFontSize(10.5);
        doc.setTextColor(...TEXT_COLOR);
        doc.text(comment.authorSurnameSnapshot || "Anonyme", margin, cursorY);
        doc.setFont("Nunito", "normal");
        doc.setFontSize(9.5);
        doc.setTextColor(...MUTED_TEXT_COLOR);
        doc.text(reactionLabel, pageWidth - margin, cursorY, { align: "right" });
        cursorY += 5.5;

        doc.setFont("Nunito", "normal");
        doc.setFontSize(10.5);
        doc.setTextColor(...(hasText ? TEXT_COLOR : MUTED_TEXT_COLOR));
        for (const line of textLines) {
          doc.text(line, margin, cursorY, { maxWidth: pageContentWidth });
          cursorY += 5.5;
        }
        doc.setTextColor(...TEXT_COLOR);
        cursorY += 3;
      }
    }

    // Guide de visite détaillé (story 30.6), seulement si ce lieu en a un
    // (cf. VISITES_GUIDEES dans src/content/generated/visites-guidees.ts).
    // Une pagination par paragraphe/liste (plutôt que par section entière)
    // pour rester robuste sur un guide riche à plusieurs longues sections.
    const guideSections = place.guideSections ?? [];
    if (guideSections.length > 0) {
      cursorY = ensureSpace(doc, cursorY, 10, pageWidth, pageHeight, margin, { chapterTitle, accentColor });
      doc.setFont("Nunito", "bold");
      doc.setFontSize(13);
      doc.setTextColor(...accentColor);
      doc.text("Guide de visite détaillé", margin, cursorY);
      doc.setTextColor(...TEXT_COLOR);
      cursorY += 8;

      for (const section of guideSections) {
        if (section.title) {
          cursorY = ensureSpace(doc, cursorY, 9, pageWidth, pageHeight, margin, { chapterTitle, accentColor });
          doc.setFont("Nunito", "bold");
          doc.setFontSize(11);
          doc.setTextColor(...accentColor);
          doc.text(section.title.slice(0, 90), margin, cursorY);
          doc.setTextColor(...TEXT_COLOR);
          cursorY += 7;
        }

        for (const paragraph of section.paragraphs) {
          doc.setFont("Nunito", "normal");
          doc.setFontSize(10.5);
          const lines: string[] = doc.splitTextToSize(paragraph, pageContentWidth);
          cursorY = ensureSpace(doc, cursorY, lines.length * 5.5 + 2, pageWidth, pageHeight, margin, {
            chapterTitle,
            accentColor,
          });
          cursorY = addTextBlock(lines, margin, cursorY, 10.5, 5.5);
          cursorY += 2;
        }

        if (section.bullets.length > 0) {
          doc.setFont("Nunito", "normal");
          doc.setFontSize(10.5);
          const bulletLines: string[] = [];
          for (const bullet of section.bullets) {
            bulletLines.push(...(doc.splitTextToSize(`•  ${bullet}`, pageContentWidth - 2) as string[]));
          }
          cursorY = ensureSpace(doc, cursorY, bulletLines.length * 5.5 + 2, pageWidth, pageHeight, margin, {
            chapterTitle,
            accentColor,
          });
          cursorY = addTextBlock(bulletLines, margin, cursorY, 10.5, 5.5);
        }
        cursorY += 4;
      }
    }

    if (
      !hasPresentation &&
      !hasAnecdotes &&
      galleryEntries.length === 0 &&
      bodyLines.length === 0 &&
      placeComments.length === 0 &&
      guideSections.length === 0
    ) {
      doc.setFont("Nunito", "normal");
      doc.setFontSize(11);
      doc.setTextColor(...MUTED_TEXT_COLOR);
      doc.text("Aucun souvenir détaillé pour ce lieu.", margin, cursorY);
      doc.setTextColor(...TEXT_COLOR);
    }

    if (chapterDayLabel) {
      chapterFooterRanges.push({ startPage: chapterStartPage, endPage: doc.getNumberOfPages(), label: chapterDayLabel });
    }
  }

  // --- Chapitres par rubrique de contenu (Histoire / Géographie et
  // économie / Culture et tradition, story 30.8) --------------------------
  // Même principe que les chapitres par lieu ci-dessus (bandeau de titre,
  // présentation, anecdotes, galerie éditoriale, souvenirs de carnet), en
  // plus simple : pas de jour de visite, pas d'avis de la famille, pas de
  // guide de visite détaillé (notions propres aux lieux du Guide du séjour).
  // L'étiquette sous le bandeau de titre indique la rubrique plutôt qu'un
  // jour, et sert aussi à choisir la couleur d'accent : tous les topics
  // d'une même rubrique partagent la même couleur (alternance PAR RUBRIQUE,
  // via l'index dans ALBUM_CONTENT_SECTIONS), pas par topic.
  for (const [sectionIndex, section] of ALBUM_CONTENT_SECTIONS.entries()) {
    const topicsInSection = Object.entries(content.contentTopics ?? {}).filter(
      ([, topic]) => topic.section === section.id
    );
    if (topicsInSection.length === 0) {
      continue;
    }

    const accentColor = getChapterAccent(sectionIndex);

    for (const [key, topic] of topicsInSection) {
      const topicEntries = content.contentEntries?.[key] ?? {};
      const chapterTitle = topic.name || key;

      doc.addPage();
      const chapterStartPage = doc.getNumberOfPages();
      paintPageBackground(doc, pageWidth, pageHeight);
      drawTitleBand(doc, chapterTitle, pageWidth, margin, 12, accentColor);
      let cursorY = 36;

      doc.setFont("Nunito", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(...MUTED_TEXT_COLOR);
      doc.text(section.label.toUpperCase(), margin, 30);
      doc.setTextColor(...TEXT_COLOR);

      const hasPresentation = Boolean(topic.history && topic.history.trim());
      const hasAnecdotes = Boolean(topic.anecdotes && topic.anecdotes.length > 0);

      if (hasPresentation) {
        doc.setFont("Nunito", "normal");
        doc.setFontSize(10.5);
        const historyLines: string[] = doc.splitTextToSize(
          stripBasicMarkdown(topic.history || ""),
          pageContentWidth
        );
        cursorY = ensureSpace(doc, cursorY, 7 + historyLines.length * 5.5 + 3, pageWidth, pageHeight, margin, {
          chapterTitle,
          accentColor,
        });
        doc.setFont("Nunito", "bold");
        doc.setFontSize(12);
        doc.setTextColor(...accentColor);
        doc.text((topic.historyLabel || "Présentation").slice(0, 90), margin, cursorY);
        doc.setTextColor(...TEXT_COLOR);
        cursorY += 7;
        cursorY = addTextBlock(historyLines, margin, cursorY, 10.5, 5.5);
        cursorY += 3;
      }

      if (hasAnecdotes) {
        doc.setFont("Nunito", "normal");
        doc.setFontSize(10.5);
        const anecdoteLines: string[] = [];
        for (const item of topic.anecdotes ?? []) {
          anecdoteLines.push(...(doc.splitTextToSize(`•  ${item}`, pageContentWidth - 2) as string[]));
        }
        cursorY = ensureSpace(doc, cursorY, 7 + anecdoteLines.length * 5.5 + 3, pageWidth, pageHeight, margin, {
          chapterTitle,
          accentColor,
        });
        doc.setFont("Nunito", "bold");
        doc.setFontSize(12);
        doc.setTextColor(...accentColor);
        doc.text((topic.anecdotesLabel || "Anecdotes").slice(0, 90), margin, cursorY);
        doc.setTextColor(...TEXT_COLOR);
        cursorY += 7;
        cursorY = addTextBlock(anecdoteLines, margin, cursorY, 10.5, 5.5);
        cursorY += 3;
      }

      // Galerie photo éditoriale uniquement : les entrées de carnet de
      // contenu n'ont jamais de photos (cf. AlbumSourceContentEntry).
      const galleryPhotos = (topic.photos ?? []).slice(0, content.photoBudgetPerPlace.editorial);
      if (galleryPhotos.length > 0) {
        const columns = 3;
        const gap = 4;
        const cellWidth = (pageContentWidth - gap * (columns - 1)) / columns;
        const cellHeight = 36;
        let column = 0;
        for (const src of galleryPhotos) {
          if (column === 0) {
            cursorY = ensureSpace(doc, cursorY, cellHeight + gap, pageWidth, pageHeight, margin, {
              chapterTitle,
              accentColor,
            });
          }

          const resolvedSrc = await resolveEditorial(src);
          if (resolvedSrc) {
            const dimensions = await resolveDimensions(resolvedSrc, editorialConverterDeps);
            const x = margin + column * (cellWidth + gap);
            drawFramedPhoto(doc, resolvedSrc, x, cursorY, cellWidth, cellHeight, dimensions);
          }
          // Cas limite : photo introuvable/erreur réseau, ignorée silencieusement.

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

      // Souvenirs du carnet (texte seul, pas de photos pour ces rubriques).
      const noteTexts = Object.values(topicEntries)
        .map((entry) => entry.text?.trim())
        .filter((text): text is string => Boolean(text));
      if (noteTexts.length > 0) {
        doc.setFont("Nunito", "normal");
        doc.setFontSize(11);
        const noteLines: string[] = [];
        for (const line of noteTexts) {
          noteLines.push(...(doc.splitTextToSize(line, pageContentWidth - 8) as string[]));
        }
        cursorY = ensureSpace(doc, cursorY, 10 + noteLines.length * 7, pageWidth, pageHeight, margin, {
          chapterTitle,
          accentColor,
        });
        doc.setFont("Nunito", "bold");
        doc.setFontSize(11);
        doc.setTextColor(...TEXT_COLOR);
        doc.text("Souvenirs du carnet", margin, cursorY);
        cursorY += 6;
        doc.setDrawColor(...accentColor);
        doc.setLineWidth(0.8);
        doc.line(margin, cursorY - 4, margin, cursorY + noteLines.length * 7 - 4);
        cursorY = addTextBlock(noteLines, margin + 4, cursorY, 11, 7);
      }

      if (!hasPresentation && !hasAnecdotes && galleryPhotos.length === 0 && noteTexts.length === 0) {
        doc.setFont("Nunito", "normal");
        doc.setFontSize(11);
        doc.setTextColor(...MUTED_TEXT_COLOR);
        doc.text("Aucun souvenir détaillé pour cette rubrique.", margin, cursorY);
        doc.setTextColor(...TEXT_COLOR);
      }

      chapterFooterRanges.push({ startPage: chapterStartPage, endPage: doc.getNumberOfPages(), label: section.label });
    }
  }

  // --- Résultats de jeu ---------------------------------------------------
  if (content.gameSummary) {
    doc.addPage();
    paintPageBackground(doc, pageWidth, pageHeight);
    drawTitleBand(doc, "Résultats de jeu", pageWidth, margin, 12, ACCENT_TEAL_COLOR);
    let cursorY = 34;

    doc.setFont("Nunito", "bold");
    doc.setFontSize(13);
    doc.setTextColor(...TEXT_COLOR);
    doc.text(`Score total : ${content.gameSummary.totalScore} pts`, margin, cursorY);
    cursorY += 11;

    // Badges rendus en "chips" arrondies plutôt qu'en liste séparée par des
    // virgules, cohérent avec l'esthétique de l'appli (coins très arrondis).
    if (content.gameSummary.badges.length > 0) {
      const chipHeight = 8;
      const chipGap = 3;
      doc.setFont("Nunito", "bold");
      doc.setFontSize(9.5);
      let chipX = margin;
      for (const [index, badge] of content.gameSummary.badges.entries()) {
        const chipWidth = doc.getTextWidth(badge) + 8;
        if (chipX + chipWidth > pageWidth - margin) {
          chipX = margin;
          cursorY += chipHeight + chipGap;
        }
        const chipColor = index % 2 === 0 ? PRIMARY_COLOR : SECONDARY_COLOR;
        const chipTextColor = index % 2 === 0 ? WHITE_COLOR : TEXT_COLOR;
        doc.setFillColor(...chipColor);
        doc.roundedRect(chipX, cursorY, chipWidth, chipHeight, chipHeight / 2, chipHeight / 2, "F");
        doc.setTextColor(...chipTextColor);
        doc.text(badge, chipX + 4, cursorY + chipHeight / 2 + 3);
        chipX += chipWidth + chipGap;
      }
      cursorY += chipHeight + 10;
      doc.setTextColor(...TEXT_COLOR);
    }

    // Podium familial : rang en médaillon coloré plutôt qu'en texte brut.
    if (content.gameSummary.podium.length > 0) {
      doc.setFont("Nunito", "bold");
      doc.setFontSize(12);
      doc.setTextColor(...ACCENT_TEAL_COLOR);
      doc.text("Podium familial", margin, cursorY);
      doc.setTextColor(...TEXT_COLOR);
      cursorY += 8;

      const rankColors: Array<[number, number, number]> = [SECONDARY_COLOR, [201, 201, 201], [205, 164, 120]];
      for (const entry of content.gameSummary.podium) {
        const rankColor = rankColors[entry.rank - 1] ?? PRIMARY_COLOR;
        doc.setFillColor(...rankColor);
        doc.circle(margin + 3, cursorY - 1.1, 3, "F");
        doc.setFont("Nunito", "bold");
        doc.setFontSize(9.5);
        doc.setTextColor(...TEXT_COLOR);
        doc.text(String(entry.rank), margin + 3, cursorY - 0.1, { align: "center" });
        doc.setFont("Nunito", "normal");
        doc.setFontSize(11);
        doc.text(`${entry.surname} — ${entry.totalScore} pts`, margin + 9, cursorY);
        cursorY += 7.5;
      }
    }
  }

  // --- Pied de page (numérotation + rappel du jour de visite) -------------
  // Passe finale sur toutes les pages déjà générées, sauf la couverture (page
  // 1, non numérotée). Pattern standard jsPDF (`setPage` en fin de
  // génération) pour donner au PDF le fini d'un vrai livre imprimé. Les
  // pages d'un chapitre-lieu rappellent aussi leur jour de visite (cf.
  // `chapterFooterRanges`, retour utilisateur : "on perd rapidement le jour
  // de la visite").
  const totalPages = doc.getNumberOfPages();
  for (let pageNumber = 2; pageNumber <= totalPages; pageNumber += 1) {
    doc.setPage(pageNumber);
    doc.setFont("Nunito", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...MUTED_TEXT_COLOR);
    doc.text(String(pageNumber - 1), pageWidth / 2, pageHeight - 8, { align: "center" });

    const dayFooter = chapterFooterRanges.find(
      (range) => pageNumber >= range.startPage && pageNumber <= range.endPage
    );
    if (dayFooter) {
      // Même casse que le rappel sous le bandeau de titre (majuscules), pour
      // rester cohérent entre les deux rappels du jour sur une même page.
      doc.text(dayFooter.label.toUpperCase(), pageWidth - margin, pageHeight - 8, { align: "right" });
    }
  }
  doc.setPage(totalPages);
  doc.setTextColor(...TEXT_COLOR);

  const safeName = normalizePdfName(draft.title || source.tripStartDate || "album-voyage");
  const fileName = `${safeName}-${new Date().toISOString().slice(0, 10)}.pdf`;

  onProgress?.("download");
  doc.save(fileName);
}
