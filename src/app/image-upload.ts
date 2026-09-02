// Compression d'une photo choisie par le propriétaire (disque ou galerie du
// smartphone) pour une visite ajoutée manuellement dans le Guide du séjour.
//
// Il n'y a pas de pipeline d'upload vers un service de stockage de fichiers
// dans l'appli (cf. commentaire sur ownerGlobalPlaceAdditions dans App.tsx) :
// la photo est donc redimensionnée/compressée côté client puis stockée
// directement en data URI base64 dans le champ `image` du lieu, synchronisée
// comme le reste des données via Firebase Realtime Database. D'où les limites
// volontairement basses ci-dessous, pour ne pas trop alourdir la synchro
// cloud partagée par toute la famille à chaque photo ajoutée.

export const PLACE_IMAGE_MAX_DIMENSION_PX = 900;
// ~260 Ko binaires une fois décodés depuis le base64 (facteur ~1.37).
export const PLACE_IMAGE_MAX_DATA_URL_LENGTH = 350_000;
const PLACE_IMAGE_MIN_QUALITY = 0.35;
const PLACE_IMAGE_QUALITY_STEP = 0.12;

export class PlaceImageError extends Error {}

export function computeResizedDimensions(
  width: number,
  height: number,
  maxDimension: number
): { width: number; height: number } {
  if (width <= 0 || height <= 0) {
    return { width: maxDimension, height: maxDimension };
  }
  if (width <= maxDimension && height <= maxDimension) {
    return { width, height };
  }
  const ratio = width > height ? maxDimension / width : maxDimension / height;
  return {
    width: Math.max(1, Math.round(width * ratio)),
    height: Math.max(1, Math.round(height * ratio)),
  };
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new PlaceImageError("Lecture du fichier impossible."));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new PlaceImageError("Image illisible ou corrompue."));
    image.src = src;
  });
}

// Redimensionne et compresse la photo en un data URI JPEG raisonnablement
// léger, pour l'utiliser comme vignette (`image`) d'une visite ajoutée
// manuellement. Réduit progressivement la qualité JPEG jusqu'à passer sous
// PLACE_IMAGE_MAX_DATA_URL_LENGTH.
export async function compressImageFileToDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new PlaceImageError("Le fichier choisi n'est pas une image.");
  }

  const originalDataUrl = await readFileAsDataUrl(file);
  const image = await loadImage(originalDataUrl);
  const { width, height } = computeResizedDimensions(
    image.naturalWidth || image.width,
    image.naturalHeight || image.height,
    PLACE_IMAGE_MAX_DIMENSION_PX
  );

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new PlaceImageError("Traitement de l'image impossible sur cet appareil.");
  }
  context.drawImage(image, 0, 0, width, height);

  let quality = 0.72;
  let dataUrl = canvas.toDataURL("image/jpeg", quality);
  while (dataUrl.length > PLACE_IMAGE_MAX_DATA_URL_LENGTH && quality > PLACE_IMAGE_MIN_QUALITY) {
    quality -= PLACE_IMAGE_QUALITY_STEP;
    dataUrl = canvas.toDataURL("image/jpeg", quality);
  }

  if (dataUrl.length > PLACE_IMAGE_MAX_DATA_URL_LENGTH) {
    throw new PlaceImageError(
      "Photo trop volumineuse même après compression. Essayez une photo moins détaillée."
    );
  }

  return dataUrl;
}
