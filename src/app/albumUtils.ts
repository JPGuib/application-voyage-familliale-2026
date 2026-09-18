import type {
  AlbumDraft,
  AlbumSource,
  AlbumSourceCommentEntry,
  CloudGameHistoryEntry,
  GuideSection,
} from "../types/cloud";

export type AlbumGameSummary = {
  profileId: string;
  totalScore: number;
  totalDaysPlayed: number;
  bestDay: number | null;
  badges: string[];
  podium: Array<{
    profileId: string;
    surname: string;
    totalScore: number;
    rank: number;
  }>;
};

/**
 * Nombre maximal "historique" de photos éditoriales (galerie officielle d'un
 * lieu, cf. `Place.photos` dans src/content/places.ts) incluses par lieu.
 * Depuis l'ajout de l'export adaptatif (story 30.5, cf.
 * `resolvePhotoBudgetPerPlace` ci-dessous), ce plafond n'est plus une limite
 * fixe appliquée telle quelle : il sert de valeur plancher/de référence pour
 * un voyage peu illustré (peu de lieux inclus), où le budget adaptatif
 * calculé revient exactement à ce plafond historique (voir
 * `ALBUM_MAX_PHOTOS_PER_PLACE`). Conservé exporté car encore utilisé par les
 * tests pour vérifier ce cas de référence.
 *
 * Relevé à 15 (story 30.6, retour de test utilisateur "mettre toutes les
 * photos") : certains lieux de `content/places.ts` ont jusqu'à 15 photos
 * éditoriales ; l'ancien plafond de 3 en tronquait donc la plupart. Décision
 * produit actée : assouplir fortement plutôt que supprimer le garde-fou
 * (cf. `ALBUM_MAX_PHOTOS_PER_PLACE`/`ALBUM_PHOTO_BUDGET_TOTAL` ci-dessous).
 */
export const ALBUM_MAX_EDITORIAL_PHOTOS_PER_PLACE = 15;

// --- Budget de photos et dégradation qualité adaptatifs ------------------
//
// Constat produit (story 30.5, ajout "export adaptatif") : chaque lieu
// marqué vu doit pouvoir apparaître dans l'album, l'export ne doit donc
// jamais obliger à retirer un lieu entier de la sélection pour rester sous
// un budget d'images. À la place, pour un voyage très illustré (beaucoup de
// lieux inclus), on (1) dégrade automatiquement la qualité/dimension des
// photos, et (2) réduit le nombre de photos par lieu de façon progressive,
// sans jamais descendre sous un minimum garanti. Le blocage final de
// `calculateExportLimit` (pdf-export.ts) ne devient plus qu'un garde-fou
// extrême, qui ne doit plus être atteint en usage normal.

export type PhotoQualityTier = {
  maxDimensionPx: number;
  jpegQuality: number;
};

/**
 * Paliers de dégradation qualité/dimension des photos à l'export, choisis
 * selon le nombre de lieux inclus dans l'album (`Object.keys(places).length`) :
 * - <= 15 lieux : palier par défaut, comportement historique inchangé depuis
 *   la story 30.5 initiale (900px / qualité JPEG 0.72). Un voyage "normal"
 *   n'est donc jamais dégradé.
 * - 16 à 30 lieux : palier intermédiaire (700px / qualité 0.6), pour un
 *   voyage multi-étapes assez riche.
 * - > 30 lieux : palier maximal de dégradation (500px / qualité 0.45), pour
 *   un très grand carnet de voyage (ex. road-trip à de nombreuses étapes) où
 *   la priorité est de garder un PDF téléchargeable plutôt qu'une qualité
 *   photo maximale.
 * Seuils choisis empiriquement (pas de mesure réelle de poids moyen de PDF
 * disponible) ; à ajuster si un usage réel montre un besoin différent.
 */
export const PHOTO_QUALITY_TIER_DEFAULT: PhotoQualityTier = { maxDimensionPx: 900, jpegQuality: 0.72 };
export const PHOTO_QUALITY_TIER_REDUCED: PhotoQualityTier = { maxDimensionPx: 700, jpegQuality: 0.6 };
export const PHOTO_QUALITY_TIER_MINIMAL: PhotoQualityTier = { maxDimensionPx: 500, jpegQuality: 0.45 };

export const PHOTO_QUALITY_TIER_PLACES_THRESHOLD_REDUCED = 15;
export const PHOTO_QUALITY_TIER_PLACES_THRESHOLD_MINIMAL = 30;

/**
 * Détermine le palier de dégradation qualité/dimension à appliquer aux
 * photos de l'export (éditoriales ET carnet), selon le nombre de lieux
 * inclus dans l'album courant.
 */
export function resolvePhotoQualityTier(includedPlaceCount: number): PhotoQualityTier {
  if (includedPlaceCount > PHOTO_QUALITY_TIER_PLACES_THRESHOLD_MINIMAL) {
    return PHOTO_QUALITY_TIER_MINIMAL;
  }
  if (includedPlaceCount > PHOTO_QUALITY_TIER_PLACES_THRESHOLD_REDUCED) {
    return PHOTO_QUALITY_TIER_REDUCED;
  }
  return PHOTO_QUALITY_TIER_DEFAULT;
}

/** Vrai si le palier fourni dégrade la qualité par rapport au défaut. */
export function isPhotoQualityDegraded(tier: PhotoQualityTier): boolean {
  return tier.maxDimensionPx !== PHOTO_QUALITY_TIER_DEFAULT.maxDimensionPx;
}

/**
 * Budget de photos (éditoriales + carnet) alloué à un seul lieu, répondant à
 * `resolvePhotoBudgetPerPlace`.
 */
export type PhotoBudgetPerPlace = {
  /** Nombre total de photos (éditorial + carnet) pour ce lieu. */
  total: number;
  /** Part du budget réservée aux photos éditoriales de ce lieu. */
  editorial: number;
  /** Part du budget réservée aux photos de carnet de ce lieu. */
  carnet: number;
};

/**
 * Budget total de photos (toutes catégories confondues) visé pour un album,
 * réparti entre tous les lieux inclus. Choisi comme un compromis entre
 * richesse visuelle et poids/temps de génération du PDF sur mobile.
 *
 * Relevé à 480 (story 30.6, retour de test utilisateur) en cohérence avec le
 * nouveau plafond par lieu (un voyage de 12 lieux à 40 photos chacun, cf.
 * ALBUM_MAX_PHOTOS_PER_PLACE, atteint déjà 480 photos) : valeur de départ,
 * ajustable après un usage réel comme le mécanisme de dégradation qualité
 * ci-dessus.
 */
export const ALBUM_PHOTO_BUDGET_TOTAL = 480;
/** Budget minimal garanti par lieu, quel que soit le nombre de lieux inclus. */
export const ALBUM_MIN_PHOTOS_PER_PLACE = 2;
/**
 * Budget maximal par lieu : 15 photos éditoriales (ALBUM_MAX_EDITORIAL_PHOTOS_PER_PLACE)
 * + 25 photos de carnet (story 30.6, assoupli mais toujours plafonné — décision
 * produit actée avec l'utilisateur plutôt que de supprimer entièrement le
 * garde-fou).
 */
export const ALBUM_MAX_PHOTOS_PER_PLACE = 40;

// Ratio historique éditorial/total (3 éditoriales sur 8 photos au total),
// réutilisé pour répartir proportionnellement le budget réduit entre
// éditorial et carnet plutôt que de figer une valeur arbitraire.
const EDITORIAL_SHARE_RATIO = ALBUM_MAX_EDITORIAL_PHOTOS_PER_PLACE / ALBUM_MAX_PHOTOS_PER_PLACE;

/**
 * Calcule le budget de photos par lieu selon le nombre de lieux inclus dans
 * l'album courant. Répartition éditorial/carnet : au moins 1 photo
 * éditoriale si le budget le permet (priorité à la présentation officielle
 * du lieu), le reste du budget pour le carnet — cf. `selectBudgetedCarnetPhotos`
 * pour la sélection des photos de carnet effectivement conservées (les plus
 * récentes en priorité, via `updatedAt`).
 *
 * Calculé une seule fois par export/aperçu (cf. `FilteredAlbumContent.photoBudgetPerPlace`),
 * pas par lieu indépendamment, pour rester cohérent entre tous les lieux
 * d'un même album.
 */
export function resolvePhotoBudgetPerPlace(includedPlaceCount: number): PhotoBudgetPerPlace {
  const safeCount = includedPlaceCount > 0 ? includedPlaceCount : 1;
  const rawTotal = Math.round(ALBUM_PHOTO_BUDGET_TOTAL / safeCount);
  const total = Math.min(ALBUM_MAX_PHOTOS_PER_PLACE, Math.max(ALBUM_MIN_PHOTOS_PER_PLACE, rawTotal));
  const editorial = Math.min(
    ALBUM_MAX_EDITORIAL_PHOTOS_PER_PLACE,
    Math.max(1, Math.round(total * EDITORIAL_SHARE_RATIO))
  );
  const carnet = Math.max(0, total - editorial);
  return { total, editorial, carnet };
}

/** Vrai si le budget fourni est réduit par rapport au maximum historique. */
export function isPhotoBudgetReduced(budget: PhotoBudgetPerPlace): boolean {
  return budget.total < ALBUM_MAX_PHOTOS_PER_PLACE;
}

/** Dimensions calculées par `fitWithinBox`, à la fois taille et position centrée dans la boîte. */
export type FittedBox = { width: number; height: number; offsetX: number; offsetY: number };

/**
 * Calcule les dimensions d'une image (ratio conservé, mode "contain") pour
 * qu'elle tienne entièrement dans une boîte `maxWidth` x `maxHeight`, centrée
 * dans cette boîte (`offsetX`/`offsetY` relatifs au coin haut-gauche de la
 * boîte). Utilisé par l'export PDF (cf. pdf-export.ts) pour éviter la
 * déformation d'une photo étirée brutalement dans une cellule de galerie à
 * ratio fixe.
 *
 * Cas limite : dimensions naturelles invalides (0, négatives, non finies)
 * retombent sur la boîte entière (pas de ratio calculable).
 */
export function fitWithinBox(
  naturalWidth: number,
  naturalHeight: number,
  maxWidth: number,
  maxHeight: number
): FittedBox {
  if (!Number.isFinite(naturalWidth) || !Number.isFinite(naturalHeight) || naturalWidth <= 0 || naturalHeight <= 0) {
    return { width: maxWidth, height: maxHeight, offsetX: 0, offsetY: 0 };
  }

  const scale = Math.min(maxWidth / naturalWidth, maxHeight / naturalHeight);
  const width = naturalWidth * scale;
  const height = naturalHeight * scale;
  return {
    width,
    height,
    offsetX: (maxWidth - width) / 2,
    offsetY: (maxHeight - height) / 2,
  };
}

/** Référence (id + source) d'une photo de carnet, pour la sélection budgétée. */
export type CarnetPhotoRef = { id: string; src: string };

/**
 * Sélectionne, parmi toutes les photos de carnet d'un lieu (potentiellement
 * réparties sur plusieurs notes/entrées), les photos à conserver dans le
 * budget alloué. Priorise les notes les plus récentes (`entry.updatedAt`),
 * pour garder les souvenirs les plus récents en cas de troncature.
 */
export function selectBudgetedCarnetPhotos(
  placeEntries: Record<string, unknown>,
  carnetBudget: number
): CarnetPhotoRef[] {
  const entries = Object.values(placeEntries).filter(
    (entry): entry is Record<string, unknown> => typeof entry === "object" && entry !== null
  );

  const sortedEntries = [...entries].sort((a, b) => {
    const aUpdatedAt = typeof a.updatedAt === "number" ? a.updatedAt : 0;
    const bUpdatedAt = typeof b.updatedAt === "number" ? b.updatedAt : 0;
    return bUpdatedAt - aUpdatedAt;
  });

  const refs: CarnetPhotoRef[] = [];
  for (const entry of sortedEntries) {
    if (!("photos" in entry)) continue;
    const photos = (entry as { photos?: Record<string, string> }).photos ?? {};
    for (const [id, src] of Object.entries(photos)) {
      if (typeof src === "string") {
        refs.push({ id, src });
      }
    }
  }

  return refs.slice(0, Math.max(0, carnetBudget));
}

export type FilteredAlbumPlace = {
  name: string;
  shortDesc: string;
  image?: string;
  photos?: string[];
  historyLabel?: string;
  history?: string;
  anecdotesLabel?: string;
  anecdotes?: string[];
  // Jour(s) effectif(s) du voyage (story 30.6), pour le regroupement par jour
  // de la page planning de l'album (cf. AlbumSourcePlaceEntry.jour).
  jour: number[];
  // Guide de visite détaillé (story 30.6), seulement si ce lieu en a un.
  guideSections?: GuideSection[];
};

/**
 * Filtre les sources de l'album en fonction de la sélection du brouillon.
 *
 * Applique les filtres :
 * - Lieux inclus selon le brouillon (includedLocationIds)
 * - Photos de couverture valides
 * - Résultats de jeu si activés
 */
export interface FilteredAlbumContent {
  places: Record<string, FilteredAlbumPlace>;
  entries: Record<string, Record<string, unknown>>;
  // Avis de la famille (story 30.6, like/dislike + commentaire), filtrés sur
  // les lieux inclus — même schéma que `entries` pour le carnet de visite.
  comments: Record<string, Record<string, AlbumSourceCommentEntry>>;
  profiles: Record<string, unknown>;
  gameSummary: AlbumGameSummary | null;
  coverPhotoMissing: boolean;
  estimatedPageCount: number;
  estimatedImageCount: number;
  /**
   * Budget de photos par lieu (éditorial + carnet), calculé une seule fois
   * pour tout l'album à partir du nombre de lieux inclus (story 30.5, export
   * adaptatif). Utilisé à la fois par l'aperçu HTML et par l'export PDF pour
   * rester cohérents (cf. `resolvePhotoBudgetPerPlace`).
   */
  photoBudgetPerPlace: PhotoBudgetPerPlace;
  /**
   * Palier de dégradation qualité/dimension des photos à appliquer à
   * l'export (story 30.5, export adaptatif), calculé une seule fois pour
   * tout l'album (cf. `resolvePhotoQualityTier`).
   */
  photoQualityTier: PhotoQualityTier;
}

/**
 * Applique les filtres du brouillon aux sources de l'album.
 */
export function filterAlbumContent(
  source: AlbumSource,
  draft: AlbumDraft
): FilteredAlbumContent {
  // Filtrer les lieux selon la sélection du brouillon. Le socle éditorial
  // (présentation, anecdotes, photos officielles) est toujours recopié pour
  // un lieu inclus : il doit apparaître même sans note de carnet (règle
  // produit story 30.5).
  const filteredPlaces: Record<string, FilteredAlbumPlace> = {};
  for (const [placeId, place] of Object.entries(source.eligiblePlaces)) {
    if (draft.includedLocationIds.has(placeId)) {
      filteredPlaces[placeId] = {
        name: place.name,
        shortDesc: place.shortDesc,
        image: place.image,
        photos: place.photos,
        historyLabel: place.historyLabel,
        history: place.history,
        anecdotesLabel: place.anecdotesLabel,
        anecdotes: place.anecdotes,
        jour: place.jour,
        guideSections: place.guideSections,
      };
    }
  }

  // Filtrer les entrées du carnet pour les lieux sélectionnés
  const filteredEntries: Record<string, Record<string, unknown>> = {};
  for (const [placeId, entries] of Object.entries(source.placeVisitLogs)) {
    if (draft.includedLocationIds.has(placeId)) {
      filteredEntries[placeId] = entries;
    }
  }

  // Filtrer les avis de la famille pour les lieux sélectionnés (story 30.6)
  const filteredComments: Record<string, Record<string, AlbumSourceCommentEntry>> = {};
  for (const [placeId, comments] of Object.entries(source.placeComments)) {
    if (draft.includedLocationIds.has(placeId)) {
      filteredComments[placeId] = comments;
    }
  }

  // Game summary (si activé)
  let gameSummary: AlbumGameSummary | null = null;
  if (draft.includeGameSummary) {
    gameSummary = extractGameSummary(source.gameResults, draft.profileId, source.requiredProfiles);
  }

  // Vérifier si la photo de couverture choisie explicitement est toujours
  // valide (lieu resté inclus, index photo toujours dans les bornes). La
  // sentinelle "aucune photo" et le choix "automatique" (chaîne vide) ne
  // sont jamais considérés comme manquants : cf. `resolveEffectiveCoverPhoto`
  // pour le repli automatique qui s'applique dans ces deux cas.
  let coverPhotoMissing = false;
  if (draft.coverPhotoId && draft.coverPhotoId !== ALBUM_NO_COVER_PHOTO_ID) {
    coverPhotoMissing = resolveCoverPhotoSource(draft.coverPhotoId, filteredPlaces, filteredEntries) === null;
  }

  // Estimer le nombre de pages (A4)
  const estimatedPageCount = estimatePageCount(
    draft.title,
    filteredPlaces,
    filteredEntries,
    gameSummary
  );

  // Budget de photos par lieu et palier de dégradation qualité, calculés une
  // seule fois pour tout l'album à partir du nombre de lieux inclus (story
  // 30.5, export adaptatif) : plus il y a de lieux inclus, plus le budget
  // par lieu (et la qualité des photos, cf. photoQualityTier) est réduit,
  // sans jamais nécessiter de retirer un lieu de la sélection.
  const includedPlaceCount = Object.keys(filteredPlaces).length;
  const photoBudgetPerPlace = resolvePhotoBudgetPerPlace(includedPlaceCount);
  const photoQualityTier = resolvePhotoQualityTier(includedPlaceCount);

  // Estimer le nombre d'images : photos éditoriales des lieux inclus +
  // photos du carnet de voyage, chacune plafonnée au budget par lieu
  // (cf. photoBudgetPerPlace), les photos de carnet les plus récentes étant
  // conservées en priorité en cas de troncature (cf. selectBudgetedCarnetPhotos).
  let estimatedImageCount = 0;
  for (const [placeId, place] of Object.entries(filteredPlaces)) {
    if (place.photos && place.photos.length > 0) {
      estimatedImageCount += Math.min(place.photos.length, photoBudgetPerPlace.editorial);
    }
    const placeEntries = filteredEntries[placeId] ?? {};
    estimatedImageCount += selectBudgetedCarnetPhotos(placeEntries, photoBudgetPerPlace.carnet).length;
  }

  return {
    places: filteredPlaces,
    entries: filteredEntries,
    comments: filteredComments,
    profiles: source.requiredProfiles,
    gameSummary,
    coverPhotoMissing,
    estimatedPageCount,
    estimatedImageCount,
    photoBudgetPerPlace,
    photoQualityTier,
  };
}

/**
 * Extrait une synthèse des résultats de jeu (score, badges, podium familial).
 * Exclut les réponses détaillées de quiz et les défis d'autres joueurs.
 */
export function extractGameSummary(
  gameResultsByProfile: Record<string, CloudGameHistoryEntry[]>,
  profileId: string,
  profiles: Record<string, { profileId: string; surname: string }> = {}
): AlbumGameSummary | null {
  const personalResults = gameResultsByProfile[profileId] ?? [];
  if (personalResults.length === 0) {
    return null;
  }

  const totalScore = personalResults.reduce((sum, entry) => sum + (entry.totalScore ?? 0), 0);
  const bestResult = personalResults.reduce<CloudGameHistoryEntry | null>((best, entry) => {
    if (!best || (entry.totalScore ?? 0) > (best.totalScore ?? 0)) {
      return entry;
    }
    return best;
  }, null);
  const bestDay = bestResult ? bestResult.day : null;

  const badges: string[] = [];
  if (personalResults.some((entry) => entry.riddleSolved)) {
    badges.push("Mystère résolu");
  }
  if (personalResults.some((entry) => entry.challengeDone)) {
    badges.push("Défi accompli");
  }
  if (personalResults.some((entry) => entry.correctCount >= 8)) {
    badges.push("Quiz maîtrisé");
  }
  if (badges.length === 0) {
    badges.push("Voyageur engagé");
  }

  const podium = Object.entries(gameResultsByProfile)
    .map(([memberProfileId, entries]) => {
      const total = entries.reduce((sum, entry) => sum + (entry.totalScore ?? 0), 0);
      return {
        profileId: memberProfileId,
        surname: profiles[memberProfileId]?.surname ?? memberProfileId,
        totalScore: total,
      };
    })
    .sort((a, b) => b.totalScore - a.totalScore)
    .slice(0, 3)
    .map((entry, index) => ({
      ...entry,
      rank: index + 1,
    }));

  return {
    profileId,
    totalScore,
    totalDaysPlayed: personalResults.length,
    bestDay,
    badges,
    podium,
  };
}

/**
 * Estime le nombre de pages A4 pour le futur album.
 * Estimation approximative basée sur le nombre de contenus.
 *
 * Depuis la story 30.5, chaque lieu inclus forme un "chapitre" (bandeau,
 * présentation, anecdotes, galerie éditoriale) qui occupe au moins une page,
 * même sans note de carnet associée (le socle éditorial est toujours
 * affiché). Les notes de carnet au-delà de la première du chapitre
 * débordent sur des pages supplémentaires, par lot de 3 (comme avant 30.5).
 */
function estimatePageCount(
  _title: string,
  places: Record<string, unknown>,
  entries: Record<string, Record<string, unknown>>,
  gameSummary: unknown
): number {
  let pages = 2; // Cover and itinerary pages

  const placeIds = Object.keys(places);
  if (placeIds.length === 0) {
    // Keep a stable minimal content page for an album without any place.
    pages += 1;
  } else {
    for (const placeId of placeIds) {
      pages += 1; // Chapitre du lieu (bandeau + présentation + anecdotes + galerie).
      const entryCount = Object.keys(entries[placeId] ?? {}).length;
      if (entryCount > 1) {
        // La première note tient dans la page de chapitre, les suivantes débordent.
        pages += Math.ceil((entryCount - 1) / 3);
      }
    }
  }

  // Add page for game summary if present
  if (gameSummary) {
    pages += 1;
  }

  return Math.max(1, Math.ceil(pages));
}

/**
 * Remplace la photo de couverture par la première photo disponible dans les entrées.
 * Si aucune photo disponible, retourne une chaîne vide (pas de couverture).
 */
export function findFallbackCoverPhoto(
  entries: Record<string, Record<string, unknown>>
): string {
  for (const placeEntries of Object.values(entries)) {
    for (const entry of Object.values(placeEntries)) {
      if (typeof entry === "object" && entry !== null && "photos" in entry) {
        const e = entry as { photos?: Record<string, unknown> };
        if (e.photos && Object.keys(e.photos).length > 0) {
          return Object.keys(e.photos)[0];
        }
      }
    }
  }
  return "";
}

/**
 * Résout l'identifiant d'une photo vers sa source stockée dans les entrées.
 */
export function findPhotoSource(
  entries: Record<string, Record<string, unknown>>,
  photoId: string
): string {
  if (!photoId) return "";

  for (const placeEntries of Object.values(entries)) {
    for (const entry of Object.values(placeEntries)) {
      if (typeof entry !== "object" || entry === null || !("photos" in entry)) {
        continue;
      }

      const photos = (entry as { photos?: Record<string, unknown> }).photos;
      const source = photos?.[photoId];
      if (typeof source === "string") {
        return source;
      }
    }
  }

  return "";
}

// --- Choix de la photo de couverture par le voyageur (story 30.7) --------
//
// Avant cet ajout, le sélecteur de couverture (AlbumScreen.tsx) ne proposait
// que les photos personnelles du carnet ; s'il n'en choisissait aucune, la
// couverture retombait silencieusement sur "la première photo éditoriale
// trouvée", sans que le voyageur comprenne ni maîtrise ce choix (retour
// utilisateur). Cette section permet de désigner explicitement N'IMPORTE
// QUELLE photo (éditoriale d'un lieu OU personnelle du carnet) comme
// couverture, tout en gardant un choix "automatique" explicite et un choix
// "aucune photo" explicite (distinct de "pas encore choisi").

/** Sentinelle "aucune photo de couverture" choisie explicitement par le voyageur. */
export const ALBUM_NO_COVER_PHOTO_ID = "__no_cover__";

const EDITORIAL_COVER_ID_PATTERN = /^editorial:(.+):(\d+)$/;

/** Identifiant stable d'une photo éditoriale d'un lieu, pour coverPhotoId. */
export function buildEditorialCoverPhotoId(placeId: string, photoIndex: number): string {
  return `editorial:${placeId}:${photoIndex}`;
}

export type ResolvedCoverPhoto = { src: string; kind: "editorial" | "carnet" };

/**
 * Résout un `coverPhotoId` explicite (photo éditoriale au format
 * "editorial:{placeId}:{index}", ou id de photo de carnet) vers sa source.
 *
 * Retourne `null` si l'id est vide, correspond à la sentinelle "aucune
 * photo", ou ne correspond plus à rien (lieu retiré de la sélection, index
 * hors limites) — l'appelant doit alors se rabattre sur le comportement
 * automatique (cf. `resolveEffectiveCoverPhoto`).
 */
export function resolveCoverPhotoSource(
  coverPhotoId: string,
  places: Record<string, FilteredAlbumPlace>,
  entries: Record<string, Record<string, unknown>>
): ResolvedCoverPhoto | null {
  if (!coverPhotoId || coverPhotoId === ALBUM_NO_COVER_PHOTO_ID) {
    return null;
  }

  const editorialMatch = EDITORIAL_COVER_ID_PATTERN.exec(coverPhotoId);
  if (editorialMatch) {
    const [, placeId, indexText] = editorialMatch;
    const src = places[placeId]?.photos?.[Number(indexText)];
    return typeof src === "string" ? { src, kind: "editorial" } : null;
  }

  const carnetSrc = findPhotoSource(entries, coverPhotoId);
  return carnetSrc ? { src: carnetSrc, kind: "carnet" } : null;
}

/**
 * Résout la couverture effective de l'album : choix explicite du voyageur
 * (`resolveCoverPhotoSource`) s'il est présent et toujours valide ; sinon
 * repli automatique sur la première photo éditoriale disponible, dans
 * l'ordre chronologique des lieux inclus (les lieux de `places` sont déjà
 * triés par jour, cf. `buildEligiblePlaces` dans album-source.ts) ; sinon la
 * première photo de carnet trouvée ; sinon aucune couverture.
 *
 * La sentinelle `ALBUM_NO_COVER_PHOTO_ID` court-circuite ce repli : c'est un
 * choix explicite du voyageur de ne pas avoir de photo en couverture.
 */
export function resolveEffectiveCoverPhoto(
  places: Record<string, FilteredAlbumPlace>,
  entries: Record<string, Record<string, unknown>>,
  coverPhotoId: string
): ResolvedCoverPhoto | null {
  if (coverPhotoId === ALBUM_NO_COVER_PHOTO_ID) {
    return null;
  }

  if (coverPhotoId) {
    const explicit = resolveCoverPhotoSource(coverPhotoId, places, entries);
    if (explicit) {
      return explicit;
    }
  }

  for (const place of Object.values(places)) {
    if (place.photos && place.photos.length > 0) {
      return { src: place.photos[0], kind: "editorial" };
    }
  }

  const fallbackCarnetPhotoId = findFallbackCoverPhoto(entries);
  if (fallbackCarnetPhotoId) {
    const src = findPhotoSource(entries, fallbackCarnetPhotoId);
    if (src) {
      return { src, kind: "carnet" };
    }
  }

  return null;
}

/** Une option sélectionnable dans le picker visuel de photo de couverture. */
export type CoverPhotoOption = {
  id: string;
  src: string;
  placeName: string;
  kind: "editorial" | "carnet";
};

/**
 * Liste toutes les photos sélectionnables comme couverture (éditoriales des
 * lieux inclus, puis personnelles du carnet), dans l'ordre chronologique des
 * lieux (même ordre que les chapitres de l'album). Alimente le picker visuel
 * de AlbumScreen.tsx.
 */
export function listCoverPhotoOptions(
  places: Record<string, FilteredAlbumPlace>,
  entries: Record<string, Record<string, unknown>>
): CoverPhotoOption[] {
  const options: CoverPhotoOption[] = [];

  for (const [placeId, place] of Object.entries(places)) {
    (place.photos ?? []).forEach((src, index) => {
      if (typeof src === "string" && src) {
        options.push({ id: buildEditorialCoverPhotoId(placeId, index), src, placeName: place.name, kind: "editorial" });
      }
    });

    for (const entry of Object.values(entries[placeId] ?? {})) {
      if (typeof entry !== "object" || entry === null || !("photos" in entry)) {
        continue;
      }
      const photos = (entry as { photos?: Record<string, unknown> }).photos ?? {};
      for (const [photoId, src] of Object.entries(photos)) {
        if (typeof src === "string" && src) {
          options.push({ id: photoId, src, placeName: place.name, kind: "carnet" });
        }
      }
    }
  }

  return options;
}

/**
 * Échappe le contenu HTML/markdown pour éviter les bris de mise en page.
 * Éscape les caractères spéciaux HTML et limite la longueur.
 */
export function escapeAndLimitText(text: string, maxLength: number = 200): string {
  return text
    .slice(0, maxLength)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Calcule le nombre estimé de pages A4 pour une composition donnée.
 * Expose une API publique utilisable par le composant d'aperçu.
 */
export function pageCountEstimate(source: AlbumSource, draft: AlbumDraft): number {
  return filterAlbumContent(source, draft).estimatedPageCount;
}

/**
 * Calcule le nombre estimé d'images incluses dans la composition finale.
 * Expose une API publique utilisable par le composant d'aperçu.
 */
export function imageCountEstimate(source: AlbumSource, draft: AlbumDraft): number {
  return filterAlbumContent(source, draft).estimatedImageCount;
}

/**
 * Valide qu'un brouillon est prêt pour la prévisualisation.
 * Vérifie que les lieux sélectionnés correspondent aux lieux admissibles.
 */
export function validateDraftForPreview(draft: AlbumDraft, source: AlbumSource): boolean {
  // Vérifier que les lieux inclus sont dans les lieux admissibles
  for (const locationId of draft.includedLocationIds) {
    if (!(locationId in source.eligiblePlaces)) {
      return false;
    }
  }

  // Vérifier que le titre est non-vide (optionnel mais recommandé)
  // Titre peut être vide pour l'aperçu

  return true;
}
