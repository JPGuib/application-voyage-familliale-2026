import type { AlbumDraft, AlbumSource, CloudGameHistoryEntry } from "../types/cloud";

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
 * Nombre maximal de photos éditoriales (galerie officielle d'un lieu, cf.
 * `Place.photos` dans src/content/places.ts) incluses par lieu dans l'album
 * (aperçu ET export PDF). Ce plafond maîtrise le poids/nombre d'images de
 * l'export, cohérent avec les limites déjà existantes de 30.3
 * (MAX_IMAGES/MAX_PREPARED_BYTES dans pdf-export.ts) : un lieu très illustré
 * dans le Guide du séjour (ex. Istanbul, 4 photos) ne doit pas à lui seul
 * saturer le budget d'images d'un album multi-lieux. Les photos du carnet de
 * voyage (souvenirs personnels) ne sont pas plafonnées ici.
 */
export const ALBUM_MAX_EDITORIAL_PHOTOS_PER_PLACE = 3;

export type FilteredAlbumPlace = {
  name: string;
  shortDesc: string;
  image?: string;
  photos?: string[];
  historyLabel?: string;
  history?: string;
  anecdotesLabel?: string;
  anecdotes?: string[];
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
  profiles: Record<string, unknown>;
  gameSummary: AlbumGameSummary | null;
  coverPhotoMissing: boolean;
  estimatedPageCount: number;
  estimatedImageCount: number;
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

  // Game summary (si activé)
  let gameSummary: AlbumGameSummary | null = null;
  if (draft.includeGameSummary) {
    gameSummary = extractGameSummary(source.gameResults, draft.profileId, source.requiredProfiles);
  }

  // Vérifier si la photo de couverture est valide
  let coverPhotoMissing = false;
  if (draft.coverPhotoId) {
    // Vérifier que la photo existe toujours dans les sources filtrées
    let found = false;
    for (const placeEntries of Object.values(filteredEntries)) {
      for (const entry of Object.values(placeEntries)) {
        if (typeof entry === "object" && entry !== null && "photos" in entry) {
          const e = entry as { photos?: Record<string, unknown> };
          if (e.photos && draft.coverPhotoId in e.photos) {
            found = true;
            break;
          }
        }
      }
      if (found) break;
    }
    if (!found) {
      coverPhotoMissing = true;
    }
  }

  // Estimer le nombre de pages (A4)
  const estimatedPageCount = estimatePageCount(
    draft.title,
    filteredPlaces,
    filteredEntries,
    gameSummary
  );

  // Estimer le nombre d'images : photos éditoriales des lieux inclus
  // (plafonnées par lieu, cf. ALBUM_MAX_EDITORIAL_PHOTOS_PER_PLACE) + photos
  // du carnet de voyage (non plafonnées ici, déjà limitées côté source par
  // CARNET_VISITE_MAX_PHOTOS_PER_ENTRY).
  let estimatedImageCount = 0;
  for (const place of Object.values(filteredPlaces)) {
    if (place.photos && place.photos.length > 0) {
      estimatedImageCount += Math.min(place.photos.length, ALBUM_MAX_EDITORIAL_PHOTOS_PER_PLACE);
    }
  }
  for (const entries of Object.values(filteredEntries)) {
    for (const entry of Object.values(entries)) {
      if (typeof entry === "object" && entry !== null && "photos" in entry) {
        const e = entry as { photos?: Record<string, unknown> };
        if (e.photos) {
          estimatedImageCount += Object.keys(e.photos).length;
        }
      }
    }
  }

  return {
    places: filteredPlaces,
    entries: filteredEntries,
    profiles: source.requiredProfiles,
    gameSummary,
    coverPhotoMissing,
    estimatedPageCount,
    estimatedImageCount,
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
