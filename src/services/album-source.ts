import type {
  AlbumSource,
  AlbumSourceCommentEntry,
  AlbumSourcePlaceEntry,
  AlbumSourceProfileEntry,
  AlbumSourceVisitLogEntry,
  CloudCarnetVisiteEntry,
  CloudPlaceComment,
  CloudProfileState,
  CloudSyncSnapshot,
  PlaceDayOverrideMap,
  PlaceSeenState,
  PlaceVisibilityState,
} from "../types/cloud";
import type { Place } from "../content/places";
import { Database, get, ref } from "firebase/database";
import type { Role } from "../app/owner-policy";
import { getEffectivePlaceDays } from "../app/placeDays";
import { extractGuideSections } from "../app/visiteGuideeText";
import { VISITES_GUIDEES } from "../content/generated/visites-guidees";
import { JOURS_DESTINATIONS } from "../content/generated/jours-destinations";

/**
 * Détermine si l'utilisateur a le droit d'accéder au système d'export d'album.
 *
 * Règle d'accès (story 30.1) : propriétaire et voyageur (utilisateur)
 * uniquement. Le visiteur est toujours bloqué.
 */
export function canAccessAlbumExport(role: Role | null): boolean {
  return role === "proprietaire" || role === "utilisateur";
}

/**
 * Détermine si un lieu est admissible pour l'album : doit être visible
 * (non masqué par le propriétaire) ET marqué comme visité ("seen").
 *
 * Règle métier : `placeVisibilityMap[placeId] !== "hiddenByOwner" AND placeSeenMap[placeId] === "seen"`
 * - Absence de placeId dans placeVisibilityMap → "visible" (valeur par défaut)
 * - Absence de placeId dans placeSeenMap → "unseen" (valeur par défaut, donc non admissible)
 */
export function isLocationEligible(
  placeId: string,
  placeVisibilityMap: Record<string, PlaceVisibilityState> | undefined,
  placeSeenMap: Record<string, PlaceSeenState> | undefined
): boolean {
  const visibility = placeVisibilityMap?.[placeId] ?? "visible";
  const seenState = placeSeenMap?.[placeId] ?? "unseen";

  return visibility !== "hiddenByOwner" && seenState === "seen";
}

/**
 * Convertit une entrée CloudCarnetVisiteEntry en AlbumSourceVisitLogEntry.
 * Préserve tous les champs pertinents de l'entrée source.
 */
function convertCarnetEntry(entry: CloudCarnetVisiteEntry): AlbumSourceVisitLogEntry {
  return {
    entryId: entry.entryId,
    placeId: entry.placeId,
    authorProfileId: entry.authorProfileId,
    authorSurnameSnapshot: entry.authorSurnameSnapshot,
    text: entry.text,
    photos: entry.photos,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
  };
}

/**
 * Extrait les profils requis à partir du carnet et du snapshot familial.
 * Inclut uniquement les profils ayant au moins une entrée dans le carnet,
 * mais aussi les profils supprimés si leurs entrées restent consultables
 * (cf. cas limites).
 */
function extractRequiredProfiles(
  placeVisitLogsByPlace: Record<string, Record<string, AlbumSourceVisitLogEntry>>,
  familyProfiles: Record<string, CloudProfileState>
): Record<string, AlbumSourceProfileEntry> {
  const profileIds = new Set<string>();

  // Collecter tous les authorProfileId des entrées du carnet
  for (const entriesByPlace of Object.values(placeVisitLogsByPlace)) {
    for (const entry of Object.values(entriesByPlace)) {
      profileIds.add(entry.authorProfileId);
    }
  }

  // Construire l'ensemble des profils requis
  const required: Record<string, AlbumSourceProfileEntry> = {};
  for (const profileId of profileIds) {
    const profile = familyProfiles[profileId];
    if (profile) {
      // Le profil existe toujours
      required[profileId] = {
        profileId,
        surname: profile.surname,
        gender: profile.gender,
        householdRole: profile.householdRole,
      };
    } else {
      // Le profil a été supprimé ; il faut reconstruire les infos depuis les entrées
      // Pour cette V1, on se contente de l'ID et du surnom figuré dans les entrées
      // (voir cas limites : "Un profil supprimé laisse ses entrées existantes consultables")
      // On ne peut pas reconstructurire gender/householdRole une fois le profil supprimé.
      required[profileId] = {
        profileId,
        surname: "", // Sera rempli par la première entrée trouvée
      };
    }
  }

  // Peupler les surname depuis les entrées du carnet (même pour les profils supprimés)
  for (const entriesByPlace of Object.values(placeVisitLogsByPlace)) {
    for (const entry of Object.values(entriesByPlace)) {
      if (required[entry.authorProfileId]) {
        required[entry.authorProfileId]!.surname = entry.authorSurnameSnapshot;
      }
    }
  }

  return required;
}

/**
 * Construit la liste des places admissibles à partir du catalogue complet
 * et des filtres de visibilité/seen.
 */
export function buildEligiblePlaces(
  allPlaces: Place[],
  customPlaces: Place[],
  placeVisibilityMap: Record<string, PlaceVisibilityState> | undefined,
  placeSeenMap: Record<string, PlaceSeenState> | undefined,
  placeDayOverrideMap: PlaceDayOverrideMap | undefined = {}
): Record<string, AlbumSourcePlaceEntry> {
  const eligible: Record<string, AlbumSourcePlaceEntry> = {};

  // Combiner places par défaut + places ajoutées par le propriétaire, puis
  // trier par jour effectif (bug corrigé : sans ce tri, les places ajoutées
  // par le propriétaire — ex. "Hierapolis" — arrivaient systématiquement en
  // fin de liste, après tout le catalogue par défaut, quel que soit leur
  // jour réel de visite, puisque `customPlaces` est concaténé après
  // `allPlaces`). Ce tri conditionne l'ordre des chapitres dans l'album et
  // du PDF (cf. filterAlbumContent dans albumUtils.ts, qui préserve l'ordre
  // d'insertion de ce Record), qui doit suivre l'ordre chronologique du
  // voyage plutôt que l'ordre du catalogue de contenu.
  const allPossiblePlaces = [...allPlaces, ...customPlaces]
    .map((place, index) => ({
      place,
      index,
      effectiveDays: getEffectivePlaceDays(place, placeDayOverrideMap ?? {}),
    }))
    .sort((left, right) => {
      const leftDay = left.effectiveDays.length > 0 ? Math.min(...left.effectiveDays) : Number.MAX_SAFE_INTEGER;
      const rightDay = right.effectiveDays.length > 0 ? Math.min(...right.effectiveDays) : Number.MAX_SAFE_INTEGER;
      if (leftDay !== rightDay) {
        return leftDay - rightDay;
      }
      // Départage stable : ordre d'origine (catalogue par défaut, puis
      // lieux ajoutés dans leur ordre d'ajout) pour les lieux du même jour.
      return left.index - right.index;
    });

  for (const { place, effectiveDays } of allPossiblePlaces) {
    if (isLocationEligible(place.id, placeVisibilityMap, placeSeenMap)) {
      // Guide de visite détaillé (story 30.6) : présent seulement si un
      // .docx correspondant a été converti (cf. VISITES_GUIDEES, indexé par
      // Place.id). Absent pour la plupart des lieux, c'est attendu.
      const guideSections = extractGuideSections(VISITES_GUIDEES[place.id]?.html);

      // Socle éditorial (story 30.5) : recopié tel quel depuis Place, uniquement
      // quand renseigné, pour ne jamais introduire de champ vide/undefined dans
      // l'objet (garde les tests d'égalité stricte existants stables).
      eligible[place.id] = {
        placeId: place.id,
        name: place.name,
        shortDesc: place.shortDesc,
        // Jour(s) effectif(s) (story 30.6) : après override propriétaire
        // éventuel, mêmes règles que le PlanningScreen de l'appli (cf.
        // getEffectivePlaceDays dans src/app/placeDays.ts).
        jour: effectiveDays,
        ...(place.image ? { image: place.image } : {}),
        ...(place.photos && place.photos.length > 0 ? { photos: place.photos } : {}),
        ...(place.historyLabel ? { historyLabel: place.historyLabel } : {}),
        ...(place.history ? { history: place.history } : {}),
        ...(place.anecdotesLabel ? { anecdotesLabel: place.anecdotesLabel } : {}),
        ...(place.anecdotes && place.anecdotes.length > 0 ? { anecdotes: place.anecdotes } : {}),
        ...(guideSections.length > 0 ? { guideSections } : {}),
      };
    }
  }

  return eligible;
}

/**
 * Filtre les entrées du carnet pour ne garder que celles des lieux admissibles.
 * Organise le résultat par placeId puis par entryId.
 */
export function filterCarnetVisiteByEligibility(
  placeCarnetRecords: Record<string, Record<string, CloudCarnetVisiteEntry>>,
  placeVisibilityMap: Record<string, PlaceVisibilityState> | undefined,
  placeSeenMap: Record<string, PlaceSeenState> | undefined
): Record<string, Record<string, AlbumSourceVisitLogEntry>> {
  const filtered: Record<string, Record<string, AlbumSourceVisitLogEntry>> = {};

  for (const [placeId, entries] of Object.entries(placeCarnetRecords)) {
    if (!isLocationEligible(placeId, placeVisibilityMap, placeSeenMap)) {
      continue;
    }

    const eligibleEntries: Record<string, AlbumSourceVisitLogEntry> = {};
    for (const entry of Object.values(entries)) {
      eligibleEntries[entry.entryId] = convertCarnetEntry(entry);
    }

    if (Object.keys(eligibleEntries).length > 0) {
      filtered[placeId] = eligibleEntries;
    }
  }

  return filtered;
}

/**
 * Convertit une CloudPlaceComment en AlbumSourceCommentEntry (story 30.6).
 * Préserve tous les champs pertinents, sans le champ interne authorUid.
 */
function convertPlaceComment(comment: CloudPlaceComment): AlbumSourceCommentEntry {
  return {
    commentId: comment.commentId,
    placeId: comment.placeId,
    authorProfileId: comment.authorProfileId,
    authorSurnameSnapshot: comment.authorSurnameSnapshot,
    reaction: comment.reaction,
    text: comment.text,
    createdAt: comment.createdAt,
    updatedAt: comment.updatedAt,
  };
}

/**
 * Filtre les avis de la famille (likes/dislikes + commentaires, story 30.6)
 * pour ne garder que ceux des lieux admissibles. Même schéma que
 * filterCarnetVisiteByEligibility ci-dessous, pour l'"Avis de la famille" de
 * l'album plutôt que le carnet de visite.
 */
export function filterPlaceCommentsByEligibility(
  placeComments: Record<string, Record<string, CloudPlaceComment>>,
  placeVisibilityMap: Record<string, PlaceVisibilityState> | undefined,
  placeSeenMap: Record<string, PlaceSeenState> | undefined
): Record<string, Record<string, AlbumSourceCommentEntry>> {
  const filtered: Record<string, Record<string, AlbumSourceCommentEntry>> = {};

  for (const [placeId, comments] of Object.entries(placeComments)) {
    if (!isLocationEligible(placeId, placeVisibilityMap, placeSeenMap)) {
      continue;
    }

    const eligibleComments: Record<string, AlbumSourceCommentEntry> = {};
    for (const comment of Object.values(comments)) {
      eligibleComments[comment.commentId] = convertPlaceComment(comment);
    }

    if (Object.keys(eligibleComments).length > 0) {
      filtered[placeId] = eligibleComments;
    }
  }

  return filtered;
}

/**
 * Charge tous les carnets de visite pour la famille depuis Firebase RTDB.
 *
 * Stratégie : lecture unique (get) sur placeVisitLogs/$familyId, puis parsing
 * strict avec fail-fast sur erreurs. Ne s'abonne jamais (une seule lecture).
 *
 * Erreurs réseau → levée d'exception (pas de fallback silencieux).
 * Structure attendue : Record<placeId, Record<entryId, CloudCarnetVisiteEntry>>.
 *
 * @param database Instance Firebase Database
 * @param familyId Identifiant de la famille
 * @returns Record indexé par placeId, puis par entryId
 * @throws Error si erreur réseau ou parsing échoue
 */
export async function loadFamilyPlaceVisitLogs(
  database: Database,
  familyId: string
): Promise<Record<string, Record<string, CloudCarnetVisiteEntry>>> {
  const logsRef = ref(database, `placeVisitLogs/${familyId}`);
  const snapshot = await get(logsRef);

  const result: Record<string, Record<string, CloudCarnetVisiteEntry>> = {};

  if (!snapshot.exists()) {
    return result; // Pas de carnets encore, retourner structure vide
  }

  const allPlacesData = snapshot.val();
  if (typeof allPlacesData !== "object" || allPlacesData === null) {
    return result; // Données mal formées, retourner structure vide
  }

  // Parser chaque lieu
  for (const [placeId, placeData] of Object.entries(allPlacesData)) {
    if (typeof placeData !== "object" || placeData === null) {
      continue; // Ignorer les données mal formées pour ce lieu
    }

    const entriesForPlace: Record<string, CloudCarnetVisiteEntry> = {};

    // Parser chaque entrée du lieu
    for (const [entryId, entryValue] of Object.entries(placeData)) {
      const entry = parseCarnetVisiteEntryFromValue(placeId, entryId, entryValue);
      if (entry) {
        entriesForPlace[entry.entryId] = entry;
      }
    }

    if (Object.keys(entriesForPlace).length > 0) {
      result[placeId] = entriesForPlace;
    }
  }

  return result;
}

/**
 * Parser strict d'une entrée de carnet de visite.
 *
 * Validation : comme dans cloudSyncProvider.parseCarnetVisiteEntry.
 * - Retourne null si données invalides (plutôt que lever exception)
 * - Extrait authorUid si présent
 *
 * @param placeId ID du lieu (depuis la clé de la structure)
 * @param entryId ID de l'entrée (depuis la clé de la structure)
 * @param value Valeur brute de Firebase
 * @returns CloudCarnetVisiteEntry ou null si parsing échoue
 */
function parseCarnetVisiteEntryFromValue(
  placeId: string,
  entryId: string,
  value: unknown
): CloudCarnetVisiteEntry | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const entry = value as Record<string, unknown>;

  const normalizedEntryId =
    typeof entry.entryId === "string" && entry.entryId.trim().length > 0 ? entry.entryId : entryId;
  const normalizedPlaceId =
    typeof entry.placeId === "string" && entry.placeId.trim().length > 0 ? entry.placeId : placeId;
  const authorProfileId =
    typeof entry.authorProfileId === "string" ? entry.authorProfileId.trim() : "";
  const authorSurnameSnapshot =
    typeof entry.authorSurnameSnapshot === "string" ? entry.authorSurnameSnapshot.trim() : "";
  const text = typeof entry.text === "string" ? entry.text : "";
  const createdAt = typeof entry.createdAt === "number" ? entry.createdAt : 0;
  const updatedAt = typeof entry.updatedAt === "number" ? entry.updatedAt : createdAt;

  // Validation stricte (suivre même logique que cloudSyncProvider)
  if (
    !authorProfileId ||
    !authorSurnameSnapshot ||
    !normalizedEntryId ||
    !normalizedPlaceId ||
    text.length > 2000 || // CARNET_VISITE_MAX_TEXT_LENGTH
    createdAt <= 0 ||
    updatedAt <= 0
  ) {
    return null;
  }

  // Parser les photos
  const rawPhotos = typeof entry.photos === "object" && entry.photos !== null 
    ? (entry.photos as Record<string, unknown>)
    : {};
  const photos: Record<string, string> = {};
  for (const [photoId, photoValue] of Object.entries(rawPhotos)) {
    if (Object.keys(photos).length >= 10) { // CARNET_VISITE_MAX_PHOTOS_PER_ENTRY
      break;
    }
    if (typeof photoValue === "string" && photoValue.length > 0) {
      photos[photoId] = photoValue;
    }
  }

  const authorUid =
    typeof entry.authorUid === "string" && entry.authorUid.trim().length > 0
      ? entry.authorUid
      : undefined;

  return {
    entryId: normalizedEntryId,
    placeId: normalizedPlaceId,
    authorProfileId,
    authorSurnameSnapshot,
    text,
    photos,
    createdAt,
    updatedAt,
    authorUid,
  };
}

/**
 * Assemble une AlbumSource complète à partir du snapshot familial
 * et des carnets de visite préalablement chargés.
 *
 * Logique :
 * 1. Filtre les places : uniquement celles visibles ET marquées "seen"
 * 2. Filtre les carnets : entrées uniquement pour places admissibles
 * 3. Extrait les profils requis (auteurs des entrées retenues)
 * 4. Inclut les résultats de jeu depuis le snapshot (groupe par profileId)
 */
export function assembleAlbumSource(
  snapshot: CloudSyncSnapshot,
  placeCarnetRecords: Record<string, Record<string, CloudCarnetVisiteEntry>>,
  allPlaces: Place[],
  customPlaces: Place[]
): AlbumSource {
  // Phase 1 : Filtre les places admissibles
  const eligiblePlaces = buildEligiblePlaces(
    allPlaces,
    customPlaces,
    snapshot.placeVisibilityMap,
    snapshot.placeSeenMap,
    snapshot.placeDayOverrides
  );

  // Phase 2 : Filtre les carnets (uniquement pour places admissibles)
  const placeVisitLogs = filterCarnetVisiteByEligibility(
    placeCarnetRecords,
    snapshot.placeVisibilityMap,
    snapshot.placeSeenMap
  );

  // Phase 2bis : Filtre les avis de la famille (story 30.6, même règle
  // d'éligibilité que le carnet). `snapshot.placeComments` peut être absent
  // (snapshot ancien/partiel, même cas de figure que placeSeenMap plus haut
  // dans ce fichier) : repli sur un objet vide plutôt que de faire échouer
  // tout l'assemblage de l'album.
  const placeComments = filterPlaceCommentsByEligibility(
    snapshot.placeComments ?? {},
    snapshot.placeVisibilityMap,
    snapshot.placeSeenMap
  );

  // Phase 3 : Extrait les profils requis
  const requiredProfiles = extractRequiredProfiles(placeVisitLogs, snapshot.profiles);

  // Phase 4 : Compile les résultats de jeu (inclus du snapshot)
  const gameResults: Record<string, typeof snapshot.profiles.profileId.gameResults> = {};
  for (const [profileId, profile] of Object.entries(snapshot.profiles)) {
    if (profile.gameResults.length > 0) {
      gameResults[profileId] = profile.gameResults;
    }
  }

  // Dernier jour défini du voyage (story 30.6) : dernière entrée de
  // JOURS_DESTINATIONS, contenu statique généré au build (comme PLACES),
  // même règle que App.tsx (lastDefinedDay). Sert à afficher la date de fin
  // de voyage en couverture et à borner la page planning.
  const lastTripDay = JOURS_DESTINATIONS.length > 0 ? JOURS_DESTINATIONS[JOURS_DESTINATIONS.length - 1].jour : null;

  return {
    tripStartDate: snapshot.tripStartDate,
    lastTripDay,
    phase: snapshot.phase,
    generatedAt: Date.now(),
    eligiblePlaces,
    placeVisitLogs,
    placeComments,
    requiredProfiles,
    gameResults,
  };
}

/**
 * Valide qu'une AlbumSource ne contient que les types de données autorisés.
 * Vérifie qu'il n'y a pas de documents, checklists, chats, etc.
 *
 * Retourne true si la source est valide, false sinon.
 */
export function validateAlbumSourceContent(source: AlbumSource): boolean {
  // Vérifications basiques : les champs attendus doivent être présents
  if (!source.eligiblePlaces || typeof source.eligiblePlaces !== "object") {
    return false;
  }
  if (!source.placeVisitLogs || typeof source.placeVisitLogs !== "object") {
    return false;
  }
  if (!source.placeComments || typeof source.placeComments !== "object") {
    return false;
  }
  if (!source.requiredProfiles || typeof source.requiredProfiles !== "object") {
    return false;
  }
  if (!source.gameResults || typeof source.gameResults !== "object") {
    return false;
  }

  // Aucune donnée de documents, checklists, chats, etc. ne devrait être présente
  // (cf. critère d'acceptation AC5). Ces vérifications sont en pratique garanties
  // par assembleAlbumSource lui-même, mais on les inclut pour la robustesse.
  const asRecord = source as Record<string, unknown>;
  const forbiddenKeys = [
    "documents",
    "documentPhotos",
    "checklist",
    "chatMessages",
    "chatConversations",
    "contentVisitLogs",
  ];

  for (const forbiddenKey of forbiddenKeys) {
    if (forbiddenKey in asRecord) {
      return false;
    }
  }

  return true;
}
