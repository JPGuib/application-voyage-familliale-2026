import { useState, useEffect, useMemo, useRef, type ChangeEvent, type ReactNode } from "react";
import {
  type LucideIcon,
  Check,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Map as MapIcon,
  MapPin,
  Lightbulb,
  ExternalLink,
  Trophy,
  Play,
  Pause,
  Home,
  BookOpen,
  Gamepad2,
  Star,
  Plane,
  Plus,
  Trash2,
  Volume2,
  VolumeX,
  Theater,
  X,
  Eye,
  EyeOff,
  ThumbsUp,
  ThumbsDown,
  MessageCircle,
  Scroll,
  Globe,
  Download,
  Pencil,
} from "lucide-react";
import { MapScreen } from "./MapScreen";
import { OfflineMediaScreen } from "./OfflineMediaScreen";
import { TrivialGameScreen } from "./TrivialGameScreen";
import { ArcadeHubScreen } from "./ArcadeHubScreen";
import { CandyCrushScreen } from "./CandyCrushScreen";
import { CrosswordScreen } from "./CrosswordScreen";
import { OrdalieScreen } from "./OrdalieScreen";
import { ImposteurScreen } from "./ImposteurScreen";
import { TRIP } from "../content/trip";
import { PLACES, type Place, type PlaceLink } from "../content/places";
import {
  DOCUMENT_CATEGORIES,
  DOCUMENTS,
  type DocumentCategory,
  type TravelDocument,
} from "../content/documents";
import { HISTOIRE_TOPICS } from "../content/histoire";
import { GEOGRAPHIE_ECONOMIE_TOPICS } from "../content/geographie-economie";
import { CULTURE_TRADITION_TOPICS } from "../content/culture-tradition";
import {
  DEFAULT_GAME_SCORING,
  getChallengeForDay,
  getQuestionsForDay,
  getRiddleForDay,
  type DailyChallenge,
  type DailyRiddle,
  type GameScoringConfig,
  type QuizQuestion,
} from "../content/game";
import { TIPS } from "../content/tips";
import {
  getScheduledCoordinates,
  getWeatherAdvice,
  parseGpsString,
  useDeviceLocation,
  useWeather,
  type Coordinates,
} from "./weather";
import { compressImageFileToDataUrl, PlaceImageError } from "./image-upload";
import {
  convertEurToTry,
  convertTryToEur,
  getEurTryRate,
  normalizeNumericInput,
  type ExchangeRateSnapshot,
} from "./exchange-rate";
import {
  computeBadges,
  parseGameHistory,
  parseGameProgress,
  type GameHistoryEntry,
  type GameProgress,
  upsertGameHistory,
} from "./game-results";
import { computePodium } from "./podium";
import {
  computeCandyCrushPodium,
  mergeCandyCrushChallengeRecord,
  parseCandyCrushChallengeRecord,
  type CandyCrushChallengeRecord,
} from "./candy-crush-challenge";
import { buildScoreChartPoints } from "./score-progression";
import { LineChart, Line, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "./components/ui/chart";
import {
  applyProfileRoleMutation,
  assignRoleOnProfileCreation,
  areSharedFamilyStatesEqual,
  canUpdateOwnerCode,
  createProfileId,
  enforceOwnerUniqueness,
  parseSharedFamilyState,
  upsertProfile,
  type Role,
  type SharedFamilyState,
} from "./owner-policy";
import {
  hashOwnerCode,
  isOwnerCodeHash,
  verifyOwnerCode,
} from "./owner-code";
import {
  hashOwnerRecoveryPhrase,
  isOwnerRecoveryHash,
  verifyOwnerRecoveryPhrase,
} from "./owner-recovery";
import {
  hashProfilePassword,
  isProfilePasswordHash,
  verifyProfilePassword,
} from "./profile-password";
import { evaluateOwnerRecoveryGuards } from "./owner-recovery-guards";
import {
  shouldHydrateFromCloudSnapshot,
  shouldPushCloudSnapshot,
} from "./cloud-hydration";
import {
  canAccessScreen,
  getAccessDeniedMessage,
  getSafeScreen,
} from "./access-control";
import {
  filterDocuments,
  groupDocumentsByCategory,
  normalizeDocumentDays,
} from "./documents-screen";
import { findDuplicateProfileBySurname } from "./profile-login";
import { VISITES_GUIDEES } from "../content/generated/visites-guidees";
import { JOURS_DESTINATIONS } from "../content/generated/jours-destinations";
import {
  clampToLastDefinedDay,
  computeCurrentDay,
  computeDaysUntilStart,
  isTripFinished,
  isValidTripStartDate,
} from "./trip-day";
import { formatTripDayLabel } from "./trip-day-format";
import {
  type NotificationPermissionStatus,
  type NotificationPreferences,
  DEFAULT_NOTIFICATION_PREFS,
  areNotificationsSupported,
  getNotificationPermissionStatus,
  readNotificationPreferences,
  requestPermission,
  shouldTriggerChecklistReminder,
  shouldTriggerGameReminder,
  showNotification,
  updateNotificationPreferences,
} from "./notifications";
import { useCloudSync } from "../hooks/useCloudSync";
import {
  filterCategoriesForProfile,
  getCategoryBadges,
  getVisibleItemIds,
  type ChecklistItemTargeting,
  type Gender,
  type HouseholdRole,
  type ProfileFilterInput,
} from "./checklist-filter";
import {
  MAX_DESTINATION_PROPOSALS,
  computeDestinationSurveyResults,
  normalizeDestinationText,
  validateDestinationProposals,
  type DestinationSurveyVote,
} from "./destination-survey";
import { startGlobalTutorial } from "./tutorials/driver-runtime";
import {
  LAUNCH_FALLBACK_STEPS,
  getLaunchVideoSrc,
  getNextLaunchGateCycle,
  shouldForceLaunchGate,
} from "./launch-gate";
import {
  getSectionOfflineAvailability,
  readOfflineDownloadRegistry,
  type OfflineSectionKey,
} from "./offline-media";

const IS_DEV = Boolean((import.meta as { env?: { DEV?: boolean } }).env?.DEV);

type ChecklistItem = ChecklistItemTargeting & {
  id: string;
  label: string;
  isCustom?: boolean;
};

type ChecklistCategory = {
  id: string;
  emoji: string;
  label: string;
  keepWhenEmpty?: boolean;
  items: ChecklistItem[];
};

type CustomChecklistItem = ChecklistItem & {
  categoryId: string;
};

// ─── DATA ────────────────────────────────────────────────────────────────────

export const CHECKLIST_CATEGORIES: ChecklistCategory[] = [
  {
    id: "vetements-hommes",
    emoji: "👔",
    label: "Vêtements pour les hommes",
    items: [
      { id: "hommes-tenue-toulouse-nantes", label: "Tenue pour Toulouse-Nantes le samedi 15 août", genderTargets: "male" as const },
      { id: "hommes-tenue-avion", label: "Tenue pour avion aller et retour", genderTargets: "male" as const },
      { id: "hommes-pyjama", label: "Pyjama", genderTargets: "male" as const },
      { id: "hommes-calecons", label: "Caleçons pour les 10 jours", genderTargets: "male" as const },
      { id: "hommes-tshirts", label: "T-shirts légers (dont 2 manches longues)", genderTargets: "male" as const },
      { id: "hommes-shorts", label: "Shorts légers (dont quelques-uns confortables respirants pour les journées d'excursions)", genderTargets: "male" as const },
      { id: "hommes-tenues-soir", label: "Tenues légères plus habillées pour les restaurants / sorties du soir", genderTargets: "male" as const },
      { id: "hommes-socquettes", label: "10 paires de socquettes", genderTargets: "male" as const },
      { id: "hommes-chaussettes", label: "1 paire de chaussettes (mi-hautes ou hautes)", genderTargets: "male" as const },
      { id: "hommes-pantalons", label: "1 ou 2 pantalons légers", genderTargets: "male" as const },
      { id: "hommes-pulls", label: "Quelques pulls dont 1 polaire (ou sweat)", genderTargets: "male" as const },
      { id: "hommes-gants", label: "1 paire de gants légers", genderTargets: "male" as const },
      { id: "hommes-coupe-vent", label: "1 coupe-vent ou style Jott", genderTargets: "male" as const },
      { id: "hommes-jean", label: "1 pantalon type jean", genderTargets: "male" as const },
      { id: "hommes-linge-sale", label: "Sacs pour le linge sale", genderTargets: "male" as const },
    ],
  },
  {
    id: "vetements-femmes",
    emoji: "👗",
    label: "Vêtements pour les femmes",
    items: [
      { id: "femmes-tenue-toulouse-nantes", label: "Tenue pour Toulouse-Nantes le samedi 15 août", genderTargets: "female" as const },
      { id: "femmes-tenue-avion", label: "Tenue pour avion aller et retour", genderTargets: "female" as const },
      { id: "femmes-pyjama", label: "Pyjama", genderTargets: "female" as const },
      { id: "femmes-lingerie", label: "Lingerie pour les 10 jours", genderTargets: "female" as const },
      { id: "femmes-tshirts", label: "T-shirts légers (dont 2 manches longues)", genderTargets: "female" as const },
      { id: "femmes-shorts-jupes-robes", label: "Shorts / jupes / robes légers (dont 2 confortables respirants pas trop courts pour les journées d'excursion)", genderTargets: "female" as const },
      { id: "femmes-tenues-soir", label: "Tenues légères plus habillées pour les restaurants du soir", genderTargets: "female" as const },
      { id: "femmes-socquettes", label: "10 paires de chaussettes ou socquettes fines", genderTargets: "female" as const },
      { id: "femmes-chaussettes", label: "1 paire de chaussettes", genderTargets: "female" as const },
      { id: "femmes-pantalons", label: "1 ou 2 pantalons légers", genderTargets: "female" as const },
      { id: "femmes-pulls", label: "Quelques pulls dont 1 polaire (ou sweat)", genderTargets: "female" as const },
      { id: "femmes-gants", label: "1 paire de gants légers", genderTargets: "female" as const },
      { id: "femmes-coupe-vent", label: "1 coupe-vent ou style Jott", genderTargets: "female" as const },
      { id: "femmes-jean", label: "1 pantalon type jean", genderTargets: "female" as const },
      { id: "femmes-linge-sale", label: "Sacs pour le linge sale", genderTargets: "female" as const },
    ],
  },
  {
    id: "chaussures",
    emoji: "👟",
    label: "Chaussures",
    items: [
      { id: "chaussures-baskets-1", label: "2 paires de baskets pour les promenades / excursions (dont celle pour l'avion)" },
      { id: "chaussures-soir", label: "1 paire de chaussures pour le soir" },
      { id: "chaussures-tongs", label: "1 paire de tongs" },
    ],
  },
  {
    id: "baignade-soleil",
    emoji: "☀️",
    label: "Baignade et soleil",
    items: [
      { id: "baignade-maillots", label: "1 ou 2 maillots / shorts de bain" },
      { id: "baignade-pareo", label: "(Optionnel pour les femmes) : paréo", genderTargets: "female" as const },
      { id: "baignade-serviette", label: "1 serviette de bain Decathlon" },
      { id: "baignade-lunettes", label: "Lunettes de soleil" },
      { id: "baignade-casquette", label: "Casquette" },
      { id: "baignade-gourde", label: "Gourde isotherme de petite ou moyenne taille" },
    ],
  },
  {
    id: "toilette-sante",
    emoji: "🧴",
    label: "Trousse de toilette et santé",
    items: [
      { id: "toilette-medicaments", label: "Médicaments personnels (dont pilule et traitement asthmatique)" },
      { id: "toilette-affaires", label: "Affaires de toilette" },
      { id: "toilette-creme", label: "Crème hydratante corps" },
      { id: "toilette-soins-cheveux", label: "(Optionnel) Soins cheveux" },
      { id: "toilette-mains", label: "(Optionnel) Crème pour les mains" },
      { id: "toilette-apres-soleil", label: "(Optionnel) Après-soleil" },
      { id: "toilette-ventilateur", label: "(Optionnel mais recommandé) mini ventilateur ou éventail" },
      { id: "toilette-pharmacie-famille", label: "Pour toute la famille : petite pharmacie de voyage (=> KG s'en occupe)", householdRoleTargets: "parent" as const, ownerOnly: true },
      { id: "toilette-fer-famille", label: "1 pour toute la famille : mini fer à repasser (=> KG s'en occupe)", householdRoleTargets: "parent" as const, ownerOnly: true },
    ],
  },
  {
    id: "electronique",
    emoji: "🔌",
    label: "Électronique",
    items: [
      { id: "elec-telephone", label: "Téléphone et son chargeur" },
      { id: "elec-attache-cou", label: "Attache-cou pour téléphone" },
      { id: "elec-perche-selfie", label: "Perche Selfie (1 pour toute la famille => JP s'en charge)", householdRoleTargets: "parent" as const, ownerOnly: true },
      { id: "elec-batterie-externe", label: "Batterie externe et son chargeur" },
      { id: "elec-ecouteurs", label: "Écouteurs et/ou casque" },
      { id: "elec-tablette-ordi", label: "Tablette ou ordinateur rouge pour regarder des films" },
      { id: "elec-films-series", label: "Films, séries et playlists téléchargés avant le départ (=> donner la liste assez vite à JP)", householdRoleTargets: "parent" as const },
      { id: "elec-multiprise", label: "1 multiprise pour hôtel (chacun en prend 1)" },
      { id: "elec-montre-connectee", label: "Emma (optionnel) : montre connectée et son chargeur", householdRoleTargets: "child" as const, genderTargets: "female" as const },
      { id: "elec-ssd", label: "(Optionnel) SSD externe compact pour sauvegarder les photos et câble associé (=> voir avec JP)", householdRoleTargets: "parent" as const, ownerOnly: true },
      { id: "elec-cle-usb-c", label: "(Optionnel) Clé USB-C (=> voir avec JP)", householdRoleTargets: "parent" as const, ownerOnly: true },
      { id: "elec-livre", label: "(Optionnel) Livre (ou livre numérique), magazine, ..." },
      { id: "elec-thomas-oral", label: "Thomas : fichier d'oral de stage pour révision pendant le trajet retour", householdRoleTargets: "child" as const },
      { id: "elec-gopro", label: "Gopro (=> JP)", householdRoleTargets: "parent" as const, ownerOnly: true },
    ],
  },
  {
    id: "documents",
    emoji: "📄",
    label: "Documents",
    items: [
      { id: "doc-passeport-carte-id", label: "Passeport + carte d'identité", householdRoleTargets: "parent" as const },
      { id: "doc-carte-bancaire", label: "Carte bancaire", householdRoleTargets: "parent" as const },
    ],
  },
  {
    id: "transport",
    emoji: "🚌",
    label: "Confort pendant le transport",
    items: [
      { id: "transport-masque-sommeil", label: "(Optionnel) Masque de sommeil pour les yeux", householdRoleTargets: "child" as const },
      { id: "transport-bouchons-oreilles", label: "Bouchons d'oreilles (=> les récupérer auprès de KG)" },
      { id: "transport-oreiller-cou", label: "Oreiller de cou gonflable (=> le récupérer auprès de KG)" },
      { id: "transport-couverture", label: "Petite couverture légère", householdRoleTargets: "child" as const },
      { id: "transport-gel", label: "Pour toute la famille : 1 gel hydroalcoolique (=> KG s'en charge)", householdRoleTargets: "parent" as const, ownerOnly: true },
      { id: "transport-mouchoirs", label: "Mouchoirs" },
      { id: "transport-lingettes", label: "Lingettes rafraîchissantes" },
      { id: "transport-chewing-gum", label: "Optionnel : chewing-gum" },
      { id: "transport-sacs-zip", label: "Quelques sacs congélation zip pour protéger les objets ou transporter des liquides" },
    ],
  },
  {
    id: "bagages",
    emoji: "🧳",
    label: "Bagages",
    items: [
      { id: "bagages-sac-dos", label: "Petit sac à dos pour les excursions (obligatoire)", householdRoleTargets: "child" as const },
      { id: "bagages-sac-main", label: "(Optionnel pour les femmes) Sac à main pour le soir", genderTargets: "female" as const },
      { id: "bagages-sac-banane", label: "(Optionnel) Sac banane" },
      { id: "bagages-sac-cabine", label: "Pour chacun : petit sac cabine (qui peut être le sac à dos) de dimensions 30x40x15 cm max" },
      { id: "bagages-valise-cabine", label: "Pour chacun : petite valise cabine de dimensions 55x35x25 cm max et poids max 12kg" },
      { id: "bagages-valise-soute", label: "Pour chacun : grande valise en soute de dimensions 158 cm (L+l+h) max et poids max 23kg" },
    ],
  },
  {
    id: "autre",
    emoji: "📝",
    label: "Autre",
    keepWhenEmpty: true,
    items: [],
  },
];

const CUSTOM_PROFILE_CHECKLIST_STORAGE_KEY = "jp-custom-checklist-items-by-profile";
const OWNER_GLOBAL_CHECKLIST_ADDITIONS_KEY = "jp-owner-global-checklist-additions";
const OWNER_GLOBAL_CHECKLIST_REMOVALS_KEY = "jp-owner-global-checklist-removals";
const PROFILE_RECOVERY_QUESTION_STORAGE_KEY = "jp-profile-recovery-questions";
const PROFILE_RECOVERY_ANSWER_STORAGE_KEY = "jp-profile-recovery-answers";
const PLACE_COMMENTS_STORAGE_KEY = "jp-place-comments";
const PLACE_VISIBILITY_STORAGE_KEY = "jp-place-visibility-map";
const PLACE_SEEN_STORAGE_KEY = "jp-place-seen-map";
const PLACE_DAY_OVERRIDES_STORAGE_KEY = "jp-place-day-overrides";
const PLACE_DAY_ORDER_OVERRIDES_STORAGE_KEY = "jp-place-day-order-overrides";
const DOCUMENT_VISIBILITY_STORAGE_KEY = "jp-document-visibility-map";
const CONTENT_OVERRIDES_STORAGE_KEY = "jp-content-overrides";
const OWNER_GLOBAL_DOCUMENT_ADDITIONS_KEY = "jp-owner-global-document-additions";
const OWNER_GLOBAL_DOCUMENT_EDITS_KEY = "jp-owner-global-document-edits";
const OWNER_GLOBAL_DOCUMENT_REMOVALS_KEY = "jp-owner-global-document-removals";
const OWNER_GLOBAL_PLACE_ADDITIONS_KEY = "jp-owner-global-place-additions";
// Brouillon en cours du formulaire "Ajouter/modifier une visite" du Guide du
// séjour (GuideScreen). Sur mobile, revenir sur l'appli après être passé sur
// une autre appli (copier une description trouvée ailleurs, par ex.) peut
// déclencher un rechargement complet de la page (mise à jour du service
// worker, ou l'OS qui recycle l'onglet en arrière-plan) : sans cette
// persistance locale, tout le texte saisi dans le formulaire serait perdu au
// retour, même si l'écran "guide" lui est bien restauré (cf. "jp-screen").
// Effacé dès que le formulaire est validé ou annulé (voir l'effet de
// sauvegarde dans GuideScreen).
const PLACE_DRAFT_STORAGE_KEY = "jp-place-draft";

type StoredPlaceDraft = {
  isAddingPlace: boolean;
  editingPlaceFormId: string | null;
  name: string;
  shortDesc: string;
  tag: string;
  days: number[];
  dayInput: string;
  historyLabel: string;
  history: string;
  anecdotesLabel: string;
  anecdotes: string;
  gps: string;
  links: string;
  image: string;
};

function readStoredPlaceDraft(): StoredPlaceDraft | null {
  try {
    const raw = localStorage.getItem(PLACE_DRAFT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredPlaceDraft>;
    if (!parsed || (!parsed.isAddingPlace && !parsed.editingPlaceFormId)) {
      return null;
    }
    return {
      isAddingPlace: Boolean(parsed.isAddingPlace),
      editingPlaceFormId: typeof parsed.editingPlaceFormId === "string" ? parsed.editingPlaceFormId : null,
      name: typeof parsed.name === "string" ? parsed.name : "",
      shortDesc: typeof parsed.shortDesc === "string" ? parsed.shortDesc : "",
      tag: typeof parsed.tag === "string" ? parsed.tag : "",
      days: Array.isArray(parsed.days) ? parsed.days.filter((day): day is number => typeof day === "number") : [],
      dayInput: typeof parsed.dayInput === "string" ? parsed.dayInput : "",
      historyLabel: typeof parsed.historyLabel === "string" ? parsed.historyLabel : "",
      history: typeof parsed.history === "string" ? parsed.history : "",
      anecdotesLabel: typeof parsed.anecdotesLabel === "string" ? parsed.anecdotesLabel : "",
      anecdotes: typeof parsed.anecdotes === "string" ? parsed.anecdotes : "",
      gps: typeof parsed.gps === "string" ? parsed.gps : "",
      links: typeof parsed.links === "string" ? parsed.links : "",
      image: typeof parsed.image === "string" ? parsed.image : "",
    };
  } catch {
    return null;
  }
}
const DESTINATION_SURVEY_STORAGE_KEY = "jp-destination-survey";
const LAUNCH_GATE_CYCLE_STORAGE_KEY = "jp-launch-gate-cycle";
const LAUNCH_GATE_COMPLETED_CYCLE_STORAGE_KEY = "jp-launch-gate-completed-cycle-by-profile";
const LAUNCH_GATE_PENDING_COMPLETION_STORAGE_KEY = "jp-launch-gate-pending-completion-by-profile";
const MAX_PLACE_COMMENT_LENGTH = 500;
const MAX_CHALLENGE_RESPONSE_LENGTH = 280;
// Carnet de visite : pas de limite gênante en usage réel ("sans limite de
// caractères" demandé), juste un garde-fou anti-abus/anti-noeud géant côté
// Realtime Database (même plafond que la règle Firebase, cf. database.rules.*.json).
const CARNET_ENTRY_MAX_TEXT_LENGTH = 20000;
// 5 photos par LIEU (toutes entrées/auteurs confondus), pas par entrée :
// compromis validé pour rester loin des quotas gratuits Firebase (chaque
// photo compressée pèse ~200-260 Ko, cf. image-upload.ts) tout en illustrant
// correctement une visite. Plafond appliqué côté client (CarnetDeVisiteSection
// compte les photos déjà présentes sur toutes les entrées du lieu avant
// d'autoriser un ajout) : les règles Firebase ne peuvent valider qu'un nœud
// à la fois et ne peuvent donc pas additionner les photos de plusieurs
// entrées ; elles gardent seulement ce nombre comme plafond défensif par
// entrée (cf. database.rules.*.json).
const CARNET_PLACE_MAX_PHOTOS = 5;
const CARNET_VISITE_CACHE_STORAGE_KEY = "jp-carnet-visite-cache";

// Brouillon en cours du formulaire "Carnet de visite" (texte + photos déjà
// compressées) d'un lieu du Guide du séjour. Même besoin que
// PLACE_DRAFT_STORAGE_KEY ci-dessus : ne pas perdre la saisie si l'app perd le
// focus (changement d'appli, verrouillage d'écran, service worker qui recycle
// l'onglet...). Un seul brouillon actif à la fois, scope par lieu (et par
// entrée en cours de modification le cas échéant). Effacé dès que l'entrée
// est envoyée ou l'édition annulée.
const CARNET_DRAFT_STORAGE_KEY = "jp-carnet-draft";

type StoredCarnetDraft = {
  placeId: string;
  editingEntryId: string | null;
  text: string;
  photos: string[];
};

function readStoredCarnetDraft(placeId: string): StoredCarnetDraft | null {
  try {
    const raw = localStorage.getItem(CARNET_DRAFT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredCarnetDraft>;
    if (!parsed || parsed.placeId !== placeId) {
      return null;
    }
    const text = typeof parsed.text === "string" ? parsed.text : "";
    const photos = Array.isArray(parsed.photos)
      ? parsed.photos
          .filter((photo): photo is string => typeof photo === "string")
          .slice(0, CARNET_PLACE_MAX_PHOTOS)
      : [];
    if (!text && photos.length === 0) {
      return null;
    }
    return {
      placeId,
      editingEntryId: typeof parsed.editingEntryId === "string" ? parsed.editingEntryId : null,
      text,
      photos,
    };
  } catch {
    return null;
  }
}

const CARNET_CONTENT_CACHE_STORAGE_KEY = "jp-carnet-content-cache";

// Brouillon en cours du carnet de visite d'une rubrique de contenu (Histoire,
// Culture et tradition, Géographie et économie) — même besoin et même
// mécanique que CARNET_DRAFT_STORAGE_KEY ci-dessus, mais sans photos et clé
// composite [source, itemId] au lieu de placeId. Fichier séparé plutôt que
// réutiliser CARNET_DRAFT_STORAGE_KEY pour ne jamais mélanger un brouillon de
// lieu avec un brouillon de rubrique de contenu.
const CARNET_CONTENT_DRAFT_STORAGE_KEY = "jp-carnet-content-draft";

type StoredCarnetContentDraft = {
  source: ContentSource;
  itemId: string;
  editingEntryId: string | null;
  text: string;
};

function readStoredCarnetContentDraft(
  source: ContentSource,
  itemId: string
): StoredCarnetContentDraft | null {
  try {
    const raw = localStorage.getItem(CARNET_CONTENT_DRAFT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredCarnetContentDraft>;
    if (!parsed || parsed.source !== source || parsed.itemId !== itemId) {
      return null;
    }
    const text = typeof parsed.text === "string" ? parsed.text : "";
    if (!text) {
      return null;
    }
    return {
      source,
      itemId,
      editingEntryId: typeof parsed.editingEntryId === "string" ? parsed.editingEntryId : null,
      text,
    };
  } catch {
    return null;
  }
}

// ─── TYPES ───────────────────────────────────────────────────────────────────

type Screen = "checklist" | "dashboard" | "guide" | "planning" | "documents" | "offline-media" | "map" | "place" | "histoire" | "histoire-topic" | "geographie" | "geographie-topic" | "culture" | "culture-topic" | "visite-guidee" | "game" | "trivial" | "jeux" | "candy-crush" | "crossword" | "ordalie" | "imposteur" | "results" | "tips" | "settings";
const SCREEN_VALUES: readonly Screen[] = ["checklist", "dashboard", "guide", "planning", "documents", "offline-media", "map", "place", "histoire", "histoire-topic", "geographie", "geographie-topic", "culture", "culture-topic", "visite-guidee", "game", "trivial", "jeux", "candy-crush", "crossword", "ordalie", "imposteur", "results", "tips", "settings"];
type QuickScreen = "guide" | "documents" | "histoire" | "geographie" | "culture" | "tips" | "game" | "results";

const INTERNAL_DOCUMENT_LINK_PREFIX = "app://document/";

function buildInternalDocumentLink(documentId: string): string {
  return `${INTERNAL_DOCUMENT_LINK_PREFIX}${encodeURIComponent(documentId)}`;
}

function normalizeForMatch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function hasDayOverlap(placeDays: number[], documentDay: number | number[] | undefined): boolean {
  const documentDays = normalizeDocumentDays(documentDay);
  if (documentDays.length === 0 || placeDays.length === 0) {
    return false;
  }
  return documentDays.some((day) => placeDays.includes(day));
}

function getAutomaticallyMatchedDocumentIds(placeId: string): string[] {
  const place = PLACES.find((entry) => entry.id === placeId);
  if (!place) {
    return [];
  }

  const placeDays = Array.isArray((place as { jour?: number[] }).jour)
    ? ((place as { jour?: number[] }).jour ?? [])
    : [];
  const normalizedTag = normalizeForMatch((place as { tag?: string }).tag ?? "");
  const matchesByRules = DOCUMENTS.filter((document) => {
    if (document.id === placeId) {
      return true;
    }

    if (normalizedTag.includes("vol") && document.category === "VOLS") {
      return hasDayOverlap(placeDays, document.day);
    }

    if (normalizedTag.includes("hotel") && document.category === "HEBERGEMENT") {
      return hasDayOverlap(placeDays, document.day);
    }

    if (normalizedTag.includes("restaurant") && document.category === "RESTAURANT") {
      return hasDayOverlap(placeDays, document.day);
    }

    if (normalizedTag.includes("activite") && normalizeForMatch(place.name).includes("montgolfiere")) {
      return document.category === "ACTIVITES" && normalizeForMatch(document.title).includes("montgolfiere");
    }

    return false;
  });

  return matchesByRules.map((document) => document.id);
}

function getAutoReservationLinksForPlace(placeId: string): Array<{ label: string; url: string }> {
  const placeEntry = PLACES.find((entry) => entry.id === placeId) as
    | { reservationDocumentIds?: unknown }
    | undefined;
  const documentIdsFromPlace = Array.isArray(placeEntry?.reservationDocumentIds)
    ? placeEntry.reservationDocumentIds.filter((id): id is string => typeof id === "string" && id.trim().length > 0)
    : [];

  if (documentIdsFromPlace.length > 0) {
    return documentIdsFromPlace
      .map((documentId) => {
        const document = DOCUMENTS.find((entry) => entry.id === documentId);
        if (!document) return null;
        return {
          label: `Voir la reservation: ${document.title}`,
          url: buildInternalDocumentLink(document.id),
        };
      })
      .filter((entry): entry is { label: string; url: string } => Boolean(entry));
  }

  const documentIds = getAutomaticallyMatchedDocumentIds(placeId);

  return documentIds
    .map((documentId) => {
      const document = DOCUMENTS.find((entry) => entry.id === documentId);
      if (!document) return null;
      return {
        label: `Voir la reservation: ${document.title}`,
        url: buildInternalDocumentLink(document.id),
      };
    })
    .filter((entry): entry is { label: string; url: string } => Boolean(entry));
}

type DocumentsDeepLinkTarget = {
  documentId: string;
  requestKey: number;
};
type GameState = "intro" | "playing" | "done" | "riddle" | "challenge";
type Profile = {
  id: string;
  surname: string;
  role: Role | null;
  gender: Gender;
  householdRole: HouseholdRole;
};

type PlaceCommentReaction = "like" | "dislike";

type PlaceComment = {
  commentId: string;
  placeId: string;
  authorProfileId: string;
  authorSurnameSnapshot: string;
  reaction: PlaceCommentReaction | null;
  text: string;
  createdAt: number;
  updatedAt: number;
  authorUid?: string;
};

type PlaceCommentsByPlace = Record<string, Record<string, PlaceComment>>;

// Carnet de visite : notes libres + photos ajoutées par un voyageur ou le
// propriétaire sur un lieu du Guide du séjour (lecture ouverte à tous les
// rôles, y compris visiteur, une fois l'entrée enregistrée). Contrairement à
// PlaceComment (une entrée "principale" par auteur), un même auteur peut
// ajouter plusieurs entrées dans le temps : entryId = `${authorProfileId}-${timestamp}`.
// Chargé à la demande par lieu (cf. l'effet d'abonnement sur selectedPlaceId
// et subscribeToPlaceVisitLog), pas dans le flux temps réel global famille,
// pour ne pas faire retélécharger toutes les photos de tous les lieux à
// chaque synchro (voir aussi placeVisitLogs dans database.rules.*.json).
type CarnetVisiteEntry = {
  entryId: string;
  placeId: string;
  authorProfileId: string;
  authorSurnameSnapshot: string;
  text: string;
  photos: Record<string, string>; // photoId -> data URI JPEG compressée ; max CARNET_PLACE_MAX_PHOTOS au total sur le lieu
  createdAt: number;
  updatedAt: number;
  authorUid?: string;
};
type CarnetVisiteLogByPlace = Record<string, Record<string, CarnetVisiteEntry>>; // placeId -> entryId -> entrée

// Même principe que CarnetVisiteEntry, pour les rubriques de contenu
// (Histoire, Culture et tradition, Géographie et économie) plutôt qu'un lieu
// du Guide du séjour : PAS de photos (demande explicite — les règles Firebase
// interdisent ce champ, cf. contentVisitLogs dans database.rules.*.json), et
// clé composite source+itemId au lieu de placeId seul, car les ids de topics
// ne sont uniques qu'au sein d'une même rubrique (même logique que
// ContentOverrideMap ci-dessus).
type CarnetContentEntry = {
  entryId: string;
  source: ContentSource;
  itemId: string;
  authorProfileId: string;
  authorSurnameSnapshot: string;
  text: string;
  createdAt: number;
  updatedAt: number;
  authorUid?: string;
};
// Clé composite `${source}::${itemId}` -> entryId -> entrée (voir carnetContentKey).
type CarnetContentLogByKey = Record<string, Record<string, CarnetContentEntry>>;

function carnetContentKey(source: ContentSource, itemId: string): string {
  return `${source}::${itemId}`;
}

type ChallengeReactionEmoji = "love" | "laugh" | "wow" | "clap";
type ChallengeReaction = {
  day: number;
  targetProfileId: string;
  reactorProfileId: string;
  emoji: ChallengeReactionEmoji;
  updatedAt: number;
  authorUid?: string;
};
type ChallengeReactionsByDay = Record<number, Record<string, Record<string, ChallengeReaction>>>;
// Vote "meilleur défi/commentaire du jour" (trophée) : contrairement aux
// réactions emoji ci-dessus (un voyageur peut réagir à plusieurs réponses
// avec des emojis différents), un voyageur ne peut voter trophée que pour
// UNE seule réponse par jour — voir voteBestChallengeResponse, qui retire
// tout autre vote du même votant sur le même jour avant d'en poser un
// nouveau.
type ChallengeBestVote = {
  day: number;
  targetProfileId: string;
  voterProfileId: string;
  updatedAt: number;
  authorUid?: string;
};
type ChallengeBestVotesByDay = Record<number, Record<string, Record<string, ChallengeBestVote>>>;
type PlaceVisibilityState = "visible" | "hiddenByOwner";
type PlaceVisibilityMap = Record<string, PlaceVisibilityState>;
// Statut "vu / pas vu" posé par le propriétaire une fois la visite/l'activité
// faite (ou non) pendant le séjour. Contrairement à PlaceVisibilityState, ce
// tag est visible par tous les utilisateurs (aucun effet sur l'accès au lieu).
type PlaceSeenState = "unseen" | "seen";
type PlaceSeenMap = Record<string, PlaceSeenState>;
type PlaceDayOverrideMap = Record<string, number[]>;
type PlaceDayOrderOverrideMap = Record<string, Record<number, number>>;
type DocumentVisibilityState = "visible" | "hiddenByOwner";
type DocumentVisibilityMap = Record<string, DocumentVisibilityState>;

// Correction/enrichissement par le propriétaire des textes de places.ts,
// histoire.ts, geographie-economie.ts et culture-tradition.ts (mêmes champs
// que ContentTopic, cf. plus bas). Chaque override ne contient que les
// champs effectivement modifiés ; les champs absents restent ceux du .ts.
type ContentSource = "places" | "histoire" | "geographie-economie" | "culture-tradition";
type ContentOverridePatch = Partial<{
  name: string;
  shortDesc: string;
  historyLabel: string;
  history: string;
  anecdotesLabel: string;
  anecdotes: string[];
}>;
type ContentOverrideMap = Partial<Record<ContentSource, Record<string, ContentOverridePatch>>>;

type LoginCandidate = {
  id: string;
  surname: string;
  role: Role;
  passwordHash?: string;
};

type InSessionPasswordProofMethod = "current-password" | "recovery";

type QuickAction = {
  id: QuickScreen;
  emoji: string;
  title: string;
  subtitle: string;
  colorBg: string;
  colorText: string;
};

type ResultsFamilyMember = {
  profileId: string;
  surname: string;
  role: Role;
  gameResults: GameHistoryEntry[];
  destinationSurveyPoints?: number;
};

const CHALLENGE_REACTION_OPTIONS: Array<{
  value: ChallengeReactionEmoji;
  emoji: string;
  label: string;
}> = [
  { value: "love", emoji: "❤️", label: "J'adore" },
  { value: "laugh", emoji: "😂", label: "Drôle" },
  { value: "wow", emoji: "😮", label: "Impressionnant" },
  { value: "clap", emoji: "👏", label: "Bravo" },
];

type ExternalAppLink = {
  href: string;
  emoji: string;
  title: string;
  subtitle: string;
  colorBg: string;
};

const QUICK_ACTIONS: QuickAction[] = [
  {
    id: "guide",
    emoji: "📖",
    title: "Guide du séjour",
    subtitle: "Découvrir les lieux",
    colorBg: "bg-[#E8F5E9]",
    colorText: "text-[#2E7D32]",
  },
  {
    id: "documents",
    emoji: "📄",
    title: "Documents et informations importants",
    subtitle: "Vols, papiers et réservations",
    colorBg: "bg-[#E8F0FE]",
    colorText: "text-[#1A73E8]",
  },
  {
    id: "histoire",
    emoji: "🏛️",
    title: "Histoire",
    subtitle: "Découvrir la Turquie",
    colorBg: "bg-[#FDE7E9]",
    colorText: "text-[#AD1457]",
  },
  {
    id: "geographie",
    emoji: "🌍",
    title: "Géographie et Économie",
    subtitle: "Relief, climat et économie",
    colorBg: "bg-[#E0F2F1]",
    colorText: "text-[#00695C]",
  },
  {
    id: "culture",
    emoji: "🎭",
    title: "Culture et Tradition",
    subtitle: "Gastronomie, arts et coutumes",
    colorBg: "bg-[#FFF8E1]",
    colorText: "text-[#F57F17]",
  },
  {
    id: "tips",
    emoji: "💡",
    title: "Conseils",
    subtitle: "Tips & infos pratiques",
    colorBg: "bg-[#E3F2FD]",
    colorText: "text-[#1565C0]",
  },
  {
    id: "game",
    emoji: "🎮",
    title: "Jeu du jour",
    subtitle: "Quiz, énigme et défi",
    colorBg: "bg-[#FFF3E0]",
    colorText: "text-[#E65100]",
  },
  {
    id: "results",
    emoji: "🏆",
    title: "Résultats",
    subtitle: "Scores & badges",
    colorBg: "bg-[#F3E5F5]",
    colorText: "text-[#6A1B9A]",
  },
];

const EXTERNAL_APP_LINKS: ExternalAppLink[] = [
  {
    href: "https://polarsteps.com",
    emoji: "📸",
    title: "Polarsteps",
    subtitle: "Journal de voyage",
    colorBg: "bg-[#E3F2FD]",
  },
];

const STAY_PRESENTATION_IMAGES = Array.from(
  { length: 22 },
  (_, index) => `/images/Séjour/page_${index + 1}.webp`
);

const BOTTOM_NAV_ITEMS: Array<{ id: Screen; icon: LucideIcon; label: string }> = [
  { id: "dashboard", icon: Home, label: "Accueil" },
  { id: "guide", icon: BookOpen, label: "Séjour" },
  { id: "map", icon: MapIcon, label: "Carte" },
  { id: "game", icon: Gamepad2, label: "Jeu" },
  { id: "tips", icon: Lightbulb, label: "Conseils" },
  { id: "histoire", icon: Scroll, label: "Histoire" },
  { id: "geographie", icon: Globe, label: "Géographie" },
  { id: "culture", icon: Theater, label: "Culture" },
  { id: "results", icon: Trophy, label: "Résultats" },
  { id: "offline-media", icon: Download, label: "Offline" },
];

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function formatDuration(seconds: number): string | null {
  const rounded = Math.round(seconds);
  if (!Number.isFinite(rounded) || rounded <= 0) return null;
  const minutes = Math.floor(rounded / 60);
  const remainingSeconds = String(rounded % 60).padStart(2, "0");
  return `${minutes} min ${remainingSeconds} sec`;
}

// Précharge uniquement les métadonnées (pas le fichier entier) de chaque
// audio pour connaître leur vraie durée, sans télécharger tout le MP3.
function useAudioDurations(places: { id: string; audioSrc?: string }[]) {
  const [durations, setDurations] = useState<Record<string, string>>({});

  useEffect(() => {
    const audios: HTMLAudioElement[] = [];

    places.forEach((place) => {
      if (!place.audioSrc) return;
      const audio = new Audio();
      audio.preload = "metadata";
      audio.src = place.audioSrc;

      const handleLoadedMetadata = () => {
        const formatted = formatDuration(audio.duration);
        if (formatted) {
          setDurations((prev) => ({ ...prev, [place.id]: formatted }));
        }
      };

      audio.addEventListener("loadedmetadata", handleLoadedMetadata);
      audios.push(audio);
    });

    return () => {
      audios.forEach((audio) => {
        audio.removeAttribute("src");
        audio.load();
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [places.map((p) => p.id).join(",")]);

  return durations;
}


function MemphisDecor() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none" aria-hidden>
      <div className="absolute -top-10 -right-10 w-36 h-36 rounded-full bg-white/10" />
      <div className="absolute top-8 right-10 w-10 h-10 rotate-45 bg-white/10" />
      <div className="absolute bottom-3 left-5 w-7 h-7 rounded-full bg-white/10" />
      <div className="absolute bottom-6 left-16 w-4 h-4 rotate-12 bg-white/10" />
    </div>
  );
}

function OfflineBanner() {
  return (
    <div className="absolute left-1/2 top-4 z-50 -translate-x-1/2 px-4">
      <div className="rounded-full bg-[#1F2937] px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-white shadow-lg">
        Hors ligne · contenu local disponible
      </div>
    </div>
  );
}

function normalizeAnswer(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

// Distance de Levenshtein entre deux chaînes : nombre minimal d'ajouts,
// suppressions ou substitutions de caractères pour passer de l'une à
// l'autre. Utilisée pour tolérer une petite faute de frappe ou une
// orthographe légèrement différente dans les réponses de l'énigme
// (ex: "Galatta" ou "Ghalata" au lieu de "Galata").
function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let previousRow = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 0; i < a.length; i++) {
    const currentRow = [i + 1];
    for (let j = 0; j < b.length; j++) {
      const cost = a[i] === b[j] ? 0 : 1;
      currentRow.push(
        Math.min(
          previousRow[j + 1] + 1, // suppression
          currentRow[j] + 1, // insertion
          previousRow[j] + cost // substitution
        )
      );
    }
    previousRow = currentRow;
  }
  return previousRow[b.length];
}

function isCloseEnough(word: string, target: string): boolean {
  if (!word || !target) return false;
  if (word === target) return true;
  // Tolérance calibrée sur la longueur du mot attendu : une petite faute de
  // frappe ou une variante d'orthographe (1 caractère en plus/en moins/
  // différent) est acceptée sur la plupart des noms de l'énigme, et 2
  // seulement sur les mots très longs — pour éviter qu'une réponse
  // simplement tronquée (ex: "Derinku" pour "Derinkuyu") ne soit acceptée à
  // tort.
  const maxDistance = target.length > 9 ? 2 : target.length > 3 ? 1 : 0;
  return levenshteinDistance(word, target) <= maxDistance;
}

// Vérifie si la réponse saisie peut être acceptée automatiquement, en
// tolérant :
// - les accents, la casse et la ponctuation (déjà gérés par normalizeAnswer),
// - des mots ajoutés autour de la bonne réponse (ex: "Tour de Galata" ou
//   "Tout de Galata" pour la réponse attendue "Galata"),
// - une petite différence d'orthographe (faute de frappe, transcription
//   différente d'un nom turc, etc.).
// Si aucun de ces cas ne s'applique, on ne tranche pas automatiquement :
// c'est alors au joueur d'indiquer honnêtement si sa réponse était bonne
// (voir le mécanisme d'auto-déclaration dans validateRiddle).
function isRiddleAnswerAcceptable(rawInput: string, rawExpected: string): boolean {
  const clean = (v: string) =>
    normalizeAnswer(v)
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  const input = clean(rawInput);
  const expected = clean(rawExpected);
  if (!input || !expected) return false;

  if (input === expected) return true;

  // La bonne réponse apparaît comme un des mots de la saisie.
  const inputWords = input.split(" ");
  if (inputWords.some((word) => isCloseEnough(word, expected))) {
    return true;
  }

  // Petite différence d'orthographe sur la réponse complète.
  return isCloseEnough(input, expected);
}

function areChecklistStatesEqual(
  left: Record<string, boolean>,
  right: Record<string, boolean>
): boolean {
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);
  if (leftKeys.length !== rightKeys.length) {
    return false;
  }

  for (const key of leftKeys) {
    if (left[key] !== right[key]) {
      return false;
    }
  }

  return true;
}

function isValidCategoryId(categoryId: string): boolean {
  return CHECKLIST_CATEGORIES.some((category) => category.id === categoryId);
}

function parseCustomChecklistItems(raw: unknown): CustomChecklistItem[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  const parsed: CustomChecklistItem[] = [];
  for (const candidate of raw) {
    if (!candidate || typeof candidate !== "object") {
      continue;
    }

    const item = candidate as Record<string, unknown>;
    if (
      typeof item.id !== "string" ||
      typeof item.label !== "string" ||
      typeof item.categoryId !== "string" ||
      !isValidCategoryId(item.categoryId)
    ) {
      continue;
    }

    const normalized: CustomChecklistItem = {
      id: item.id,
      label: item.label,
      categoryId: item.categoryId,
      isCustom: true,
    };

    if (
      item.genderTargets === "all" ||
      item.genderTargets === "male" ||
      item.genderTargets === "female"
    ) {
      normalized.genderTargets = item.genderTargets;
    }
    if (
      item.householdRoleTargets === "all" ||
      item.householdRoleTargets === "parent" ||
      item.householdRoleTargets === "child"
    ) {
      normalized.householdRoleTargets = item.householdRoleTargets;
    }
    if (typeof item.ownerOnly === "boolean") {
      normalized.ownerOnly = item.ownerOnly;
    }
    if (typeof item.visibleToProfileId === "string") {
      normalized.visibleToProfileId = item.visibleToProfileId;
    }

    parsed.push(normalized);
  }

  return parsed;
}

function areCustomChecklistItemsEqual(
  left: CustomChecklistItem[],
  right: CustomChecklistItem[]
): boolean {
  if (left.length !== right.length) {
    return false;
  }

  const serialize = (items: CustomChecklistItem[]) =>
    [...items]
      .map((item) => JSON.stringify(item))
      .sort();

  const leftSerialized = serialize(left);
  const rightSerialized = serialize(right);
  return leftSerialized.every((entry, index) => entry === rightSerialized[index]);
}

function areRemovalMapsEqual(
  left: Record<string, boolean>,
  right: Record<string, boolean>
): boolean {
  return areChecklistStatesEqual(left, right);
}

function mergeChecklistCatalog(
  baseCategories: ChecklistCategory[],
  ownerGlobalAdditions: CustomChecklistItem[],
  ownerGlobalRemovals: Record<string, boolean>,
  profileCustomItems: CustomChecklistItem[]
): ChecklistCategory[] {
  const additionsByCategory = new Map<string, ChecklistItem[]>();

  for (const item of [...ownerGlobalAdditions, ...profileCustomItems]) {
    if (!isValidCategoryId(item.categoryId)) {
      continue;
    }
    const existing = additionsByCategory.get(item.categoryId) ?? [];
    existing.push(item);
    additionsByCategory.set(item.categoryId, existing);
  }

  return baseCategories.map((category) => {
    const baseItems = category.items.filter((item) => !ownerGlobalRemovals[item.id]);
    const addedItems = (additionsByCategory.get(category.id) ?? []).filter(
      (item) => !ownerGlobalRemovals[item.id]
    );
    return {
      ...category,
      items: [...baseItems, ...addedItems],
    };
  });
}

function areGameHistoriesEqual(
  left: GameHistoryEntry[],
  right: GameHistoryEntry[]
): boolean {
  if (left.length !== right.length) {
    return false;
  }

  for (let i = 0; i < left.length; i += 1) {
    if (JSON.stringify(left[i]) !== JSON.stringify(right[i])) {
      return false;
    }
  }

  return true;
}

function areChallengeReactionsEqual(
  left: ChallengeReactionsByDay,
  right: ChallengeReactionsByDay
): boolean {
  return stableSerializeForCloudPush(left) === stableSerializeForCloudPush(right);
}

function areChallengeBestVotesEqual(
  left: ChallengeBestVotesByDay,
  right: ChallengeBestVotesByDay
): boolean {
  return stableSerializeForCloudPush(left) === stableSerializeForCloudPush(right);
}

function parsePlaceComments(raw: unknown): PlaceCommentsByPlace {
  if (!raw || typeof raw !== "object") {
    return {};
  }

  const next: PlaceCommentsByPlace = {};
  for (const [placeId, placeValue] of Object.entries(raw as Record<string, unknown>)) {
    if (!placeValue || typeof placeValue !== "object") {
      continue;
    }

    const commentsForPlace: Record<string, PlaceComment> = {};
    for (const [commentId, commentValue] of Object.entries(placeValue as Record<string, unknown>)) {
      if (!commentValue || typeof commentValue !== "object") {
        continue;
      }
      const candidate = commentValue as Record<string, unknown>;
      const reaction: PlaceCommentReaction | null =
        candidate.reaction === "like" || candidate.reaction === "dislike"
          ? candidate.reaction
          : null;

      const authorProfileId = typeof candidate.authorProfileId === "string" ? candidate.authorProfileId.trim() : "";
      const authorSurnameSnapshot =
        typeof candidate.authorSurnameSnapshot === "string"
          ? candidate.authorSurnameSnapshot.trim()
          : "";
      const text = typeof candidate.text === "string" ? candidate.text.trim() : "";
      const createdAt = typeof candidate.createdAt === "number" ? candidate.createdAt : 0;
      const updatedAt = typeof candidate.updatedAt === "number" ? candidate.updatedAt : createdAt;
      const normalizedCommentId =
        typeof candidate.commentId === "string" && candidate.commentId.trim().length > 0
          ? candidate.commentId
          : commentId;
      const normalizedPlaceId =
        typeof candidate.placeId === "string" && candidate.placeId.trim().length > 0
          ? candidate.placeId
          : placeId;

      if (
        !authorProfileId ||
        !authorSurnameSnapshot ||
        !normalizedCommentId ||
        !normalizedPlaceId ||
        text.length > MAX_PLACE_COMMENT_LENGTH ||
        createdAt <= 0 ||
        updatedAt <= 0
      ) {
        continue;
      }

      commentsForPlace[normalizedCommentId] = {
        commentId: normalizedCommentId,
        placeId: normalizedPlaceId,
        authorProfileId,
        authorSurnameSnapshot,
        reaction,
        text,
        createdAt,
        updatedAt,
        authorUid:
          typeof candidate.authorUid === "string" && candidate.authorUid.trim().length > 0
            ? candidate.authorUid
            : undefined,
      };
    }

    if (Object.keys(commentsForPlace).length > 0) {
      next[placeId] = commentsForPlace;
    }
  }

  return next;
}

// Cache local best-effort du carnet de visite : contrairement à
// placeCommentsByPlace, ce n'est pas la source de vérité (le carnet est
// chargé à la demande via subscribeToPlaceVisitLog quand on ouvre un lieu) —
// juste un affichage instantané des dernières entrées vues, avant que
// l'abonnement cloud ne rafraîchisse.
function parseCarnetVisiteCache(raw: unknown): CarnetVisiteLogByPlace {
  if (!raw || typeof raw !== "object") {
    return {};
  }

  const next: CarnetVisiteLogByPlace = {};
  for (const [placeId, placeValue] of Object.entries(raw as Record<string, unknown>)) {
    if (!placeValue || typeof placeValue !== "object") {
      continue;
    }

    const entriesForPlace: Record<string, CarnetVisiteEntry> = {};
    for (const [entryId, entryValue] of Object.entries(placeValue as Record<string, unknown>)) {
      if (!entryValue || typeof entryValue !== "object") {
        continue;
      }
      const candidate = entryValue as Record<string, unknown>;
      const authorProfileId =
        typeof candidate.authorProfileId === "string" ? candidate.authorProfileId.trim() : "";
      const authorSurnameSnapshot =
        typeof candidate.authorSurnameSnapshot === "string" ? candidate.authorSurnameSnapshot.trim() : "";
      const text = typeof candidate.text === "string" ? candidate.text : "";
      const createdAt = typeof candidate.createdAt === "number" ? candidate.createdAt : 0;
      const updatedAt = typeof candidate.updatedAt === "number" ? candidate.updatedAt : createdAt;
      const normalizedEntryId =
        typeof candidate.entryId === "string" && candidate.entryId.trim().length > 0
          ? candidate.entryId
          : entryId;
      const normalizedPlaceId =
        typeof candidate.placeId === "string" && candidate.placeId.trim().length > 0
          ? candidate.placeId
          : placeId;

      if (
        !authorProfileId ||
        !authorSurnameSnapshot ||
        !normalizedEntryId ||
        !normalizedPlaceId ||
        text.length > CARNET_ENTRY_MAX_TEXT_LENGTH ||
        createdAt <= 0 ||
        updatedAt <= 0
      ) {
        continue;
      }

      const rawPhotos =
        candidate.photos && typeof candidate.photos === "object"
          ? (candidate.photos as Record<string, unknown>)
          : {};
      const photos: Record<string, string> = {};
      for (const [photoId, photoValue] of Object.entries(rawPhotos)) {
        if (Object.keys(photos).length >= CARNET_PLACE_MAX_PHOTOS) {
          break;
        }
        if (typeof photoValue === "string" && photoValue.length > 0) {
          photos[photoId] = photoValue;
        }
      }

      entriesForPlace[normalizedEntryId] = {
        entryId: normalizedEntryId,
        placeId: normalizedPlaceId,
        authorProfileId,
        authorSurnameSnapshot,
        text,
        photos,
        createdAt,
        updatedAt,
        authorUid:
          typeof candidate.authorUid === "string" && candidate.authorUid.trim().length > 0
            ? candidate.authorUid
            : undefined,
      };
    }

    if (Object.keys(entriesForPlace).length > 0) {
      next[placeId] = entriesForPlace;
    }
  }

  return next;
}

function isContentSource(value: unknown): value is ContentSource {
  return typeof value === "string" && (CONTENT_SOURCES as readonly string[]).includes(value);
}

// Cache local best-effort du carnet de visite des rubriques de contenu
// (Histoire, Culture et tradition, Géographie et économie) — même esprit que
// parseCarnetVisiteCache ci-dessus pour les lieux, mais sans photos et clé
// composite carnetContentKey(source, itemId) plutôt que placeId.
function parseCarnetContentCache(raw: unknown): CarnetContentLogByKey {
  if (!raw || typeof raw !== "object") {
    return {};
  }

  const next: CarnetContentLogByKey = {};
  for (const [key, keyValue] of Object.entries(raw as Record<string, unknown>)) {
    if (!keyValue || typeof keyValue !== "object") {
      continue;
    }

    const entriesForKey: Record<string, CarnetContentEntry> = {};
    for (const [entryId, entryValue] of Object.entries(keyValue as Record<string, unknown>)) {
      if (!entryValue || typeof entryValue !== "object") {
        continue;
      }
      const candidate = entryValue as Record<string, unknown>;
      const authorProfileId =
        typeof candidate.authorProfileId === "string" ? candidate.authorProfileId.trim() : "";
      const authorSurnameSnapshot =
        typeof candidate.authorSurnameSnapshot === "string" ? candidate.authorSurnameSnapshot.trim() : "";
      const text = typeof candidate.text === "string" ? candidate.text : "";
      const createdAt = typeof candidate.createdAt === "number" ? candidate.createdAt : 0;
      const updatedAt = typeof candidate.updatedAt === "number" ? candidate.updatedAt : createdAt;
      const normalizedEntryId =
        typeof candidate.entryId === "string" && candidate.entryId.trim().length > 0
          ? candidate.entryId
          : entryId;
      const source = isContentSource(candidate.source) ? candidate.source : null;
      const itemId =
        typeof candidate.itemId === "string" && candidate.itemId.trim().length > 0
          ? candidate.itemId
          : null;

      if (
        !authorProfileId ||
        !authorSurnameSnapshot ||
        !normalizedEntryId ||
        !source ||
        !itemId ||
        text.length > CARNET_ENTRY_MAX_TEXT_LENGTH ||
        createdAt <= 0 ||
        updatedAt <= 0
      ) {
        continue;
      }

      entriesForKey[normalizedEntryId] = {
        entryId: normalizedEntryId,
        source,
        itemId,
        authorProfileId,
        authorSurnameSnapshot,
        text,
        createdAt,
        updatedAt,
        authorUid:
          typeof candidate.authorUid === "string" && candidate.authorUid.trim().length > 0
            ? candidate.authorUid
            : undefined,
      };
    }

    if (Object.keys(entriesForKey).length > 0) {
      next[key] = entriesForKey;
    }
  }

  return next;
}

function parseDestinationSurveyVotes(raw: unknown): Record<string, DestinationSurveyVote> {
  if (!raw || typeof raw !== "object") {
    return {};
  }

  const next: Record<string, DestinationSurveyVote> = {};
  for (const [profileId, voteValue] of Object.entries(raw as Record<string, unknown>)) {
    if (!voteValue || typeof voteValue !== "object") {
      continue;
    }

    const candidate = voteValue as Record<string, unknown>;
    const proposals = Array.isArray(candidate.proposals)
      ? candidate.proposals
          .filter((proposal): proposal is string => typeof proposal === "string")
          .map((proposal) => normalizeDestinationText(proposal))
          .filter((proposal) => proposal.length > 0)
          .slice(0, MAX_DESTINATION_PROPOSALS)
      : [];
    const updatedAt = typeof candidate.updatedAt === "number" ? candidate.updatedAt : 0;

    if (proposals.length === 0 || updatedAt <= 0) {
      continue;
    }

    next[profileId] = {
      profileId,
      proposals,
      updatedAt,
      authorUid:
        typeof candidate.authorUid === "string" && candidate.authorUid.trim().length > 0
          ? candidate.authorUid
          : undefined,
    };
  }

  return next;
}

function parseLaunchGateCompletionMap(raw: unknown): Record<string, number> {
  if (!raw || typeof raw !== "object") {
    return {};
  }

  return Object.fromEntries(
    Object.entries(raw as Record<string, unknown>)
      .filter(([, value]) => typeof value === "number" && Number.isFinite(value) && value >= 0)
      .map(([key, value]) => [key, Math.floor(value as number)])
  );
}

function areDestinationSurveyVotesEqual(
  left: Record<string, DestinationSurveyVote>,
  right: Record<string, DestinationSurveyVote>
): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function stableSerializeForCloudPush(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableSerializeForCloudPush(entry)).join(",")}]`;
  }

  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  const entries: string[] = [];
  for (const key of keys) {
    const candidate = record[key];
    if (candidate === undefined) {
      continue;
    }
    entries.push(`${JSON.stringify(key)}:${stableSerializeForCloudPush(candidate)}`);
  }
  return `{${entries.join(",")}}`;
}

function arePlaceCommentsEqual(left: PlaceCommentsByPlace, right: PlaceCommentsByPlace): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function parsePlaceVisibilityMap(raw: unknown): PlaceVisibilityMap {
  if (!raw || typeof raw !== "object") {
    return {};
  }

  const next: PlaceVisibilityMap = {};
  for (const [placeId, value] of Object.entries(raw as Record<string, unknown>)) {
    if (value === "visible" || value === "hiddenByOwner") {
      next[placeId] = value;
    }
  }

  return next;
}

function parsePlaceSeenMap(raw: unknown): PlaceSeenMap {
  if (!raw || typeof raw !== "object") {
    return {};
  }

  const next: PlaceSeenMap = {};
  for (const [placeId, value] of Object.entries(raw as Record<string, unknown>)) {
    if (value === "unseen" || value === "seen") {
      next[placeId] = value;
    }
  }

  return next;
}

const CONTENT_SOURCES: readonly ContentSource[] = [
  "places",
  "histoire",
  "geographie-economie",
  "culture-tradition",
];

function parseContentOverridePatch(raw: unknown): ContentOverridePatch | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const record = raw as Record<string, unknown>;
  const patch: ContentOverridePatch = {};

  if (typeof record.name === "string" && record.name.trim().length > 0) {
    patch.name = record.name;
  }
  if (typeof record.shortDesc === "string" && record.shortDesc.trim().length > 0) {
    patch.shortDesc = record.shortDesc;
  }
  if (typeof record.historyLabel === "string" && record.historyLabel.trim().length > 0) {
    patch.historyLabel = record.historyLabel;
  }
  if (typeof record.history === "string" && record.history.trim().length > 0) {
    patch.history = record.history;
  }
  if (typeof record.anecdotesLabel === "string" && record.anecdotesLabel.trim().length > 0) {
    patch.anecdotesLabel = record.anecdotesLabel;
  }
  if (Array.isArray(record.anecdotes)) {
    const anecdotes = record.anecdotes.filter(
      (entry): entry is string => typeof entry === "string" && entry.trim().length > 0
    );
    if (anecdotes.length > 0) {
      patch.anecdotes = anecdotes;
    }
  }

  return Object.keys(patch).length > 0 ? patch : null;
}

function parseContentOverrideMap(raw: unknown): ContentOverrideMap {
  if (!raw || typeof raw !== "object") {
    return {};
  }
  const record = raw as Record<string, unknown>;
  const next: ContentOverrideMap = {};

  for (const source of CONTENT_SOURCES) {
    const itemsRaw = record[source];
    if (!itemsRaw || typeof itemsRaw !== "object") {
      continue;
    }
    const items: Record<string, ContentOverridePatch> = {};
    for (const [itemId, candidate] of Object.entries(itemsRaw as Record<string, unknown>)) {
      const patch = parseContentOverridePatch(candidate);
      if (patch) {
        items[itemId] = patch;
      }
    }
    if (Object.keys(items).length > 0) {
      next[source] = items;
    }
  }

  return next;
}

function applyContentOverride<T extends { name: string; shortDesc: string; history?: string; historyLabel?: string; anecdotes?: string[]; anecdotesLabel?: string }>(
  item: T,
  override: ContentOverridePatch | undefined
): T {
  if (!override) {
    return item;
  }
  return {
    ...item,
    ...(override.name !== undefined ? { name: override.name } : {}),
    ...(override.shortDesc !== undefined ? { shortDesc: override.shortDesc } : {}),
    ...(override.historyLabel !== undefined ? { historyLabel: override.historyLabel } : {}),
    ...(override.history !== undefined ? { history: override.history } : {}),
    ...(override.anecdotesLabel !== undefined ? { anecdotesLabel: override.anecdotesLabel } : {}),
    ...(override.anecdotes !== undefined ? { anecdotes: override.anecdotes } : {}),
  };
}

function areContentOverrideMapsEqual(left: ContentOverrideMap, right: ContentOverrideMap): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

// Correction/enrichissement des documents/informations importantes par le
// propriétaire, synchronisé cloud (même esprit que ownerGlobalChecklist*
// pour le catalogue de checklist) :
// - ownerGlobalDocumentAdditions : documents personnalisés ajoutés
// - ownerGlobalDocumentEdits : remplacement intégral d'un document DOCUMENTS édité (clé = id)
// - ownerGlobalDocumentRemovals : suppression permanente d'un document DOCUMENTS (clé = id)
function parseTravelDocumentEntry(fallbackId: string, raw: unknown): TravelDocument | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const entry = raw as Record<string, unknown>;
  const id = typeof entry.id === "string" && entry.id.trim().length > 0 ? entry.id : fallbackId;
  const category = entry.category;
  if (
    typeof entry.title !== "string" ||
    entry.title.trim().length === 0 ||
    typeof entry.content !== "string" ||
    entry.content.trim().length === 0 ||
    typeof category !== "string" ||
    !DOCUMENT_CATEGORIES.includes(category as DocumentCategory)
  ) {
    return null;
  }

  const details = Array.isArray(entry.details)
    ? entry.details.filter((line): line is string => typeof line === "string")
    : undefined;
  const scans = Array.isArray(entry.scans)
    ? entry.scans.filter((line): line is string => typeof line === "string")
    : undefined;
  const links = Array.isArray(entry.links)
    ? entry.links
        .map((link) => {
          if (!link || typeof link !== "object") return null;
          const candidate = link as Record<string, unknown>;
          if (typeof candidate.label !== "string" || typeof candidate.url !== "string") return null;
          const label = candidate.label.trim();
          const url = candidate.url.trim();
          return label && url ? { label, url } : null;
        })
        .filter((link): link is { label: string; url: string } => Boolean(link))
    : undefined;
  const days = normalizeDocumentDays(
    typeof entry.day === "number" || Array.isArray(entry.day) ? (entry.day as number | number[]) : undefined
  );
  const gpsRaw = typeof entry.gps === "string" ? entry.gps.trim() : "";

  return {
    id,
    category: category as DocumentCategory,
    title: entry.title,
    content: entry.content,
    tag: typeof entry.tag === "string" && entry.tag.trim() ? entry.tag : undefined,
    day: days.length > 0 ? days : undefined,
    details: details && details.length > 0 ? details : undefined,
    scans: scans && scans.length > 0 ? scans : undefined,
    links: links && links.length > 0 ? links : undefined,
    gps: gpsRaw || undefined,
  };
}

// Accepte soit un tableau (forme utilisée pour le stockage local jp-owner-
// global-document-additions), soit un objet { [id]: document } (forme
// utilisée côté cloud, cf. cloudSyncProvider.ts).
function parseOwnerGlobalDocumentAdditions(raw: unknown): TravelDocument[] {
  const entries: Array<[string, unknown]> = Array.isArray(raw)
    ? raw.map((candidate, index) => [`doc-${index}`, candidate])
    : raw && typeof raw === "object"
      ? Object.entries(raw as Record<string, unknown>)
      : [];

  const documents: TravelDocument[] = [];
  for (const [fallbackId, candidate] of entries) {
    const document = parseTravelDocumentEntry(fallbackId, candidate);
    if (document) {
      documents.push(document);
    }
  }
  return documents;
}

function parseOwnerGlobalDocumentEdits(raw: unknown): Record<string, TravelDocument> {
  if (!raw || typeof raw !== "object") {
    return {};
  }
  const next: Record<string, TravelDocument> = {};
  for (const [documentId, candidate] of Object.entries(raw as Record<string, unknown>)) {
    const document = parseTravelDocumentEntry(documentId, candidate);
    if (document) {
      next[documentId] = document;
    }
  }
  return next;
}

function parseOwnerGlobalDocumentRemovals(raw: unknown): Record<string, boolean> {
  if (!raw || typeof raw !== "object") {
    return {};
  }
  return Object.fromEntries(
    Object.entries(raw as Record<string, unknown>).filter(([, value]) => typeof value === "boolean")
  ) as Record<string, boolean>;
}

function areTravelDocumentListsEqual(left: TravelDocument[], right: TravelDocument[]): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function areTravelDocumentMapsEqual(
  left: Record<string, TravelDocument>,
  right: Record<string, TravelDocument>
): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function normalizePlaceDays(raw: unknown): number[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  return Array.from(
    new Set(
      raw
        .map((day) => (typeof day === "number" && Number.isFinite(day) ? Math.trunc(day) : Number.NaN))
        .filter((day) => Number.isFinite(day) && day > 0)
    )
  ).sort((left, right) => left - right);
}

// Visites/activités du Guide du séjour ajoutées par le propriétaire (absentes
// de PLACES), synchronisées cloud. Même esprit que ownerGlobalDocumentAdditions
// ci-dessus, mais sans photo/audio (pas de pipeline d'upload dans l'appli) et
// sans Edits/Removals séparés : éditer/masquer une place PAR DÉFAUT existe déjà
// via contentOverrides/placeVisibilityMap, donc ce mécanisme ne gère que les
// places ajoutées (éditer = remplacer l'entrée par id dans le tableau,
// supprimer = la retirer, cf. savePlaceForOwner/deletePlaceForOwner).
function parsePlaceEntry(fallbackId: string, raw: unknown): Place | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const entry = raw as Record<string, unknown>;
  const id = typeof entry.id === "string" && entry.id.trim().length > 0 ? entry.id : fallbackId;
  if (
    typeof entry.name !== "string" ||
    entry.name.trim().length === 0 ||
    typeof entry.shortDesc !== "string" ||
    entry.shortDesc.trim().length === 0 ||
    typeof entry.tag !== "string" ||
    entry.tag.trim().length === 0
  ) {
    return null;
  }

  const anecdotes = Array.isArray(entry.anecdotes)
    ? entry.anecdotes.filter((line): line is string => typeof line === "string")
    : undefined;
  const links = Array.isArray(entry.links)
    ? entry.links
        .map((link) => {
          if (!link || typeof link !== "object") return null;
          const candidate = link as Record<string, unknown>;
          if (typeof candidate.label !== "string" || typeof candidate.url !== "string") return null;
          const label = candidate.label.trim();
          const url = candidate.url.trim();
          return label && url ? { label, url } : null;
        })
        .filter((link): link is PlaceLink => Boolean(link))
    : undefined;
  const gpsRaw = typeof entry.gps === "string" ? entry.gps.trim() : "";

  return {
    id,
    jour: normalizePlaceDays(entry.jour),
    name: entry.name,
    shortDesc: entry.shortDesc,
    tag: entry.tag,
    historyLabel:
      typeof entry.historyLabel === "string" && entry.historyLabel.trim() ? entry.historyLabel : undefined,
    history: typeof entry.history === "string" && entry.history.trim() ? entry.history : undefined,
    anecdotesLabel:
      typeof entry.anecdotesLabel === "string" && entry.anecdotesLabel.trim() ? entry.anecdotesLabel : undefined,
    anecdotes: anecdotes && anecdotes.length > 0 ? anecdotes : undefined,
    links: links && links.length > 0 ? links : undefined,
    gps: gpsRaw || undefined,
  };
}

// Accepte soit un tableau (forme utilisée pour le stockage local jp-owner-
// global-place-additions), soit un objet { [id]: place } (forme utilisée
// côté cloud, cf. cloudSyncProvider.ts).
function parseOwnerGlobalPlaceAdditions(raw: unknown): Place[] {
  const entries: Array<[string, unknown]> = Array.isArray(raw)
    ? raw.map((candidate, index) => [`place-${index}`, candidate])
    : raw && typeof raw === "object"
      ? Object.entries(raw as Record<string, unknown>)
      : [];

  const places: Place[] = [];
  for (const [fallbackId, candidate] of entries) {
    const place = parsePlaceEntry(fallbackId, candidate);
    if (place) {
      places.push(place);
    }
  }
  return places;
}

function areTravelPlaceListsEqual(left: Place[], right: Place[]): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function parsePlaceDayOverrideMap(raw: unknown): PlaceDayOverrideMap {
  if (!raw || typeof raw !== "object") {
    return {};
  }

  const next: PlaceDayOverrideMap = {};
  for (const [placeId, value] of Object.entries(raw as Record<string, unknown>)) {
    const valueRecord = value && typeof value === "object"
      ? (value as Record<string, unknown>)
      : null;
    const normalizedDays = normalizePlaceDays(valueRecord?.days ?? value);
    if (normalizedDays.length > 0) {
      next[placeId] = normalizedDays;
    }
  }

  return next;
}

function parsePlaceDayOrderOverrideMap(raw: unknown): PlaceDayOrderOverrideMap {
  if (!raw || typeof raw !== "object") {
    return {};
  }

  const next: PlaceDayOrderOverrideMap = {};
  for (const [placeId, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!value || typeof value !== "object") {
      continue;
    }

    const valueRecord = value as Record<string, unknown>;
    const effectiveDays = normalizePlaceDays(valueRecord.days ?? []);
    const allowedDays = new Set(effectiveDays);
    const orderRecord =
      valueRecord.orderByDay && typeof valueRecord.orderByDay === "object"
        ? (valueRecord.orderByDay as Record<string, unknown>)
        : valueRecord;

    const normalizedOrderByDay: Record<number, number> = {};
    for (const [dayKey, positionCandidate] of Object.entries(orderRecord)) {
      const day = Number(dayKey);
      if (!Number.isFinite(day)) {
        continue;
      }
      const normalizedDay = Math.trunc(day);
      if (allowedDays.size > 0 && !allowedDays.has(normalizedDay)) {
        continue;
      }
      if (typeof positionCandidate !== "number" || !Number.isFinite(positionCandidate)) {
        continue;
      }
      const normalizedPosition = Math.trunc(positionCandidate);
      if (normalizedPosition <= 0) {
        continue;
      }
      normalizedOrderByDay[normalizedDay] = normalizedPosition;
    }

    if (Object.keys(normalizedOrderByDay).length > 0) {
      next[placeId] = normalizedOrderByDay;
    }
  }

  return next;
}

function getBasePlaceDays(place: { jour?: number[] }): number[] {
  return normalizePlaceDays(place.jour ?? []);
}

function getEffectivePlaceDays(
  place: { id: string; jour?: number[] },
  overrideMap: PlaceDayOverrideMap
): number[] {
  const overrideDays = overrideMap[place.id];
  return overrideDays && overrideDays.length > 0 ? overrideDays : getBasePlaceDays(place);
}

function getPlaceOrderPositionForDay(
  placeId: string,
  day: number,
  orderMap: PlaceDayOrderOverrideMap
): number | null {
  const perDay = orderMap[placeId];
  if (!perDay) {
    return null;
  }
  const value = perDay[day];
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }
  const normalized = Math.trunc(value);
  return normalized > 0 ? normalized : null;
}

function sortPlacesForDay<T extends { id: string }>(
  places: T[],
  day: number,
  orderMap: PlaceDayOrderOverrideMap,
  fallbackIndexMap: Record<string, number>
): T[] {
  const base = [...places].sort(
    (left, right) =>
      (fallbackIndexMap[left.id] ?? Number.MAX_SAFE_INTEGER) -
      (fallbackIndexMap[right.id] ?? Number.MAX_SAFE_INTEGER)
  );

  const positioned = base
    .map((item) => ({
      item,
      desiredPosition: getPlaceOrderPositionForDay(item.id, day, orderMap),
      fallbackIndex: fallbackIndexMap[item.id] ?? Number.MAX_SAFE_INTEGER,
    }))
    .filter((entry): entry is { item: T; desiredPosition: number; fallbackIndex: number } =>
      entry.desiredPosition !== null
    )
    .sort((left, right) => {
      if (left.desiredPosition !== right.desiredPosition) {
        return left.desiredPosition - right.desiredPosition;
      }
      return left.fallbackIndex - right.fallbackIndex;
    });

  const ordered = [...base];
  for (const entry of positioned) {
    const currentIndex = ordered.findIndex((item) => item.id === entry.item.id);
    if (currentIndex === -1) {
      continue;
    }
    const [moved] = ordered.splice(currentIndex, 1);
    const targetIndex = Math.max(0, Math.min(entry.desiredPosition - 1, ordered.length));
    ordered.splice(targetIndex, 0, moved);
  }

  return ordered;
}

function getPlacePositionInDay(
  placeId: string,
  day: number,
  placeDayOverrideMap: PlaceDayOverrideMap,
  placeDayOrderOverrideMap: PlaceDayOrderOverrideMap,
  fallbackIndexMap: Record<string, number>
): number {
  const dayPlaces = PLACES_WITH_AUTO_GPS
    .filter((place) => getEffectivePlaceDays(place, placeDayOverrideMap).includes(day));
  const sorted = sortPlacesForDay(dayPlaces, day, placeDayOrderOverrideMap, fallbackIndexMap);
  const index = sorted.findIndex((entry) => entry.id === placeId);
  return index >= 0 ? index + 1 : 1;
}

function getDefaultPlacePositionForDay(
  placeId: string,
  day: number,
  placeDayOverrideMap: PlaceDayOverrideMap,
  placeDayOrderOverrideMap: PlaceDayOrderOverrideMap,
  fallbackIndexMap: Record<string, number>
): number {
  const dayPlaces = PLACES_WITH_AUTO_GPS.filter((place) =>
    getEffectivePlaceDays(place, placeDayOverrideMap).includes(day)
  );
  const sorted = sortPlacesForDay(dayPlaces, day, placeDayOrderOverrideMap, fallbackIndexMap);
  const existingIndex = sorted.findIndex((entry) => entry.id === placeId);
  if (existingIndex >= 0) {
    return existingIndex + 1;
  }
  // By default, place newly added to a day goes to the end of that day.
  return sorted.length + 1;
}

function isPlaceVisibleForRole(
  role: Role | null,
  placeId: string,
  visibilityMap: PlaceVisibilityMap
): boolean {
  if (role === "proprietaire") {
    return true;
  }

  return (visibilityMap[placeId] ?? "visible") === "visible";
}

function arePlaceVisibilityMapsEqual(left: PlaceVisibilityMap, right: PlaceVisibilityMap): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function arePlaceSeenMapsEqual(left: PlaceSeenMap, right: PlaceSeenMap): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function arePlaceDayOverrideMapsEqual(left: PlaceDayOverrideMap, right: PlaceDayOverrideMap): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function arePlaceDayOrderOverrideMapsEqual(
  left: PlaceDayOrderOverrideMap,
  right: PlaceDayOrderOverrideMap
): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function parseDocumentVisibilityMap(raw: unknown): DocumentVisibilityMap {
  if (!raw || typeof raw !== "object") {
    return {};
  }

  const next: DocumentVisibilityMap = {};
  for (const [documentId, value] of Object.entries(raw as Record<string, unknown>)) {
    if (value === "visible" || value === "hiddenByOwner") {
      next[documentId] = value;
    }
  }

  return next;
}

function isDocumentVisibleForRole(
  role: Role | null,
  documentId: string,
  visibilityMap: DocumentVisibilityMap
): boolean {
  if (role === "proprietaire") {
    return true;
  }

  return (visibilityMap[documentId] ?? "visible") === "visible";
}

function areDocumentVisibilityMapsEqual(left: DocumentVisibilityMap, right: DocumentVisibilityMap): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function getPlaceReactionCounts(comments: Record<string, PlaceComment> | undefined): {
  likes: number;
  dislikes: number;
} {
  let likes = 0;
  let dislikes = 0;
  for (const comment of Object.values(comments ?? {})) {
    if (comment.reaction === "like") {
      likes += 1;
    } else if (comment.reaction === "dislike") {
      dislikes += 1;
    }
  }
  return { likes, dislikes };
}

function ReactionCountersBadge({
  likes,
  dislikes,
  className,
}: {
  likes: number;
  dislikes: number;
  className?: string;
}) {
  return (
    <div className={`inline-flex items-center gap-2 rounded-full bg-black/55 px-2.5 py-1 text-white ${className ?? ""}`}>
      <span className="inline-flex items-center gap-1 text-xs font-black">
        <ThumbsUp size={12} /> {likes}
      </span>
      <span className="inline-flex items-center gap-1 text-xs font-black">
        <ThumbsDown size={12} /> {dislikes}
      </span>
    </div>
  );
}

function ActionCard({
  tutorialId,
  emoji,
  iconSrc,
  title,
  subtitle,
  colorBg,
  colorText,
  onClick,
  disabled = false,
  disabledReason,
}: {
  tutorialId?: string;
  emoji: string;
  iconSrc?: string;
  title: string;
  subtitle: string;
  colorBg: string;
  colorText: string;
  onClick: () => void;
  disabled?: boolean;
  disabledReason?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      data-tutorial-id={tutorialId}
      className={`${colorBg} rounded-2xl p-4 text-left active:scale-95 transition-transform w-full shadow-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100`}
    >
      {iconSrc ? (
        <img
          src={iconSrc}
          alt="Montgolfière"
          className="w-12 h-12 mb-2 rounded-xl object-cover"
        />
      ) : (
        <span
          className="text-3xl mb-2 block"
          style={{ fontFamily: '"Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif' }}
        >
          {emoji}
        </span>
      )}
      <p className={`font-black text-sm ${colorText}`}>{title}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
      {disabledReason && (
        <span className="mt-2 inline-block rounded-full bg-black/10 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-foreground/70">
          {disabledReason}
        </span>
      )}
    </button>
  );
}

function ProfileSetupScreen({
  profile,
  ownerAlreadyConfigured,
  travelerCodeConfigured,
  error,
  onCancel,
  onSurnameChange,
  onGenderChange,
  onHouseholdRoleChange,
  onContinue,
}: {
  profile: Profile;
  ownerAlreadyConfigured: boolean;
  travelerCodeConfigured: boolean;
  error: string | null;
  onCancel?: () => void;
  onSurnameChange: (v: string) => void;
  onGenderChange: (v: Gender) => void;
  onHouseholdRoleChange: (v: HouseholdRole) => void;
  onContinue: (
    password: string,
    recoveryQuestion: string,
    recoveryAnswer: string,
    travelerChoice: "voyageur" | "visiteur" | null,
    travelerCode: string
  ) => void;
}) {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [recoveryQuestion, setRecoveryQuestion] = useState("");
  const [recoveryAnswer, setRecoveryAnswer] = useState("");
  const [showRecoveryAnswer, setShowRecoveryAnswer] = useState(false);
  const [travelerChoice, setTravelerChoice] = useState<"voyageur" | "visiteur" | null>(null);
  const [travelerCode, setTravelerCode] = useState("");
  const [showTravelerCode, setShowTravelerCode] = useState(false);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="relative bg-primary text-primary-foreground px-6 pt-12 pb-8 flex-shrink-0">
        <MemphisDecor />
        {onCancel && (
          <div className="relative z-10 mb-2">
            <button
              type="button"
              onClick={onCancel}
              className="text-xs font-extrabold uppercase tracking-widest opacity-90 hover:opacity-100"
            >
              Retour
            </button>
          </div>
        )}
        <div className="relative z-10">
          <p className="text-xs font-extrabold opacity-80 tracking-widest uppercase mb-1">
            👨‍👩‍👧‍👦 Bienvenue
          </p>
          <h1 className="text-2xl font-black leading-tight mb-2">
            Créer votre profil
          </h1>
          <p className="text-sm opacity-90">
            Entrez un surnom pour commencer.
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5">
        <div className="bg-card rounded-2xl border border-border p-4">
          <label className="text-xs font-extrabold text-muted-foreground uppercase tracking-widest">
            Surnom
          </label>
          <input
            value={profile.surname}
            onChange={(e) => onSurnameChange(e.target.value)}
            placeholder="Ex: Maman, Papa, Léo"
            className="mt-2 w-full rounded-xl bg-input-background px-3 py-3 text-sm font-semibold text-foreground outline-none ring-2 ring-transparent focus:ring-primary/30"
          />

          <p className="text-xs font-extrabold text-muted-foreground uppercase tracking-widest mt-5 mb-2">
            Genre (optionnel)
          </p>
          <div className="grid grid-cols-3 gap-2">
            {(["unspecified", "male", "female"] as const).map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => onGenderChange(g)}
                className={`rounded-xl py-2 text-xs font-black border transition-colors ${
                  profile.gender === g
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-foreground"
                }`}
              >
                {g === "unspecified" ? "Non précisé" : g === "male" ? "Homme" : "Femme"}
              </button>
            ))}
          </div>

          <p className="text-xs font-extrabold text-muted-foreground uppercase tracking-widest mt-5 mb-2">
            Rôle familial (optionnel)
          </p>
          <div className="grid grid-cols-2 gap-2">
            {(["member", "parent", "child"] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => onHouseholdRoleChange(r)}
                className={`rounded-xl py-2 text-xs font-black border transition-colors ${
                  profile.householdRole === r
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-foreground"
                }`}
              >
                {r === "member" ? "Non précisé" : r === "parent" ? "Parent" : "Enfant"}
              </button>
            ))}
          </div>

          {ownerAlreadyConfigured ? (
            <>
              <p className="text-xs font-extrabold text-muted-foreground uppercase tracking-widest mt-5 mb-2">
                Vous êtes...
              </p>
              <div className="grid grid-cols-1 gap-2">
                <button
                  type="button"
                  onClick={() => setTravelerChoice("voyageur")}
                  className={`rounded-xl py-3 px-3 text-sm font-black border transition-colors text-left ${
                    travelerChoice === "voyageur"
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border text-foreground"
                  }`}
                >
                  🧳 Je voyage avec vous
                </button>
                <button
                  type="button"
                  onClick={() => setTravelerChoice("visiteur")}
                  className={`rounded-xl py-3 px-3 text-sm font-black border transition-colors text-left ${
                    travelerChoice === "visiteur"
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border text-foreground"
                  }`}
                >
                  👀 Je veux juste suivre le voyage
                </button>
              </div>

              {travelerChoice === "voyageur" && (
                <div className="mt-3">
                  {travelerCodeConfigured ? (
                    <>
                      <label className="text-xs font-extrabold text-muted-foreground uppercase tracking-widest">
                        Code voyageur
                      </label>
                      <div className="relative mt-2">
                        <input
                          type={showTravelerCode ? "text" : "password"}
                          value={travelerCode}
                          onChange={(e) => setTravelerCode(e.target.value)}
                          placeholder="Code transmis par le propriétaire"
                          className="w-full rounded-xl bg-input-background px-3 py-3 pr-10 text-sm font-semibold text-foreground outline-none ring-2 ring-transparent focus:ring-primary/30"
                        />
                        <button
                          type="button"
                          onClick={() => setShowTravelerCode((previous) => !previous)}
                          aria-label={showTravelerCode ? "Masquer le code voyageur saisi" : "Afficher le code voyageur saisi"}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                        >
                          {showTravelerCode ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Le propriétaire doit d'abord configurer un code voyageur dans ses paramètres.
                    </p>
                  )}
                </div>
              )}
            </>
          ) : (
            <>
              <p className="text-xs font-extrabold text-muted-foreground uppercase tracking-widest mt-5 mb-2">
                Rôle
              </p>
              <div className="rounded-xl border border-border bg-muted/30 px-3 py-3">
                <p className="text-sm font-black text-foreground">Propriétaire</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Aucun propriétaire n'est défini. Le premier profil devient propriétaire.
                </p>
              </div>
            </>
          )}

          <p className="text-xs font-extrabold text-muted-foreground uppercase tracking-widest mt-5 mb-2">
            Mot de passe du profil *
          </p>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 4 caractères"
              className="w-full rounded-xl bg-input-background px-3 py-3 pr-10 text-sm font-semibold text-foreground outline-none ring-2 ring-transparent focus:ring-primary/30"
            />
            <button
              type="button"
              onClick={() => setShowPassword((previous) => !previous)}
              aria-label={showPassword ? "Masquer le mot de passe saisi" : "Afficher le mot de passe saisi"}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Obligatoire pour protéger votre profil dès sa création.
          </p>

          <p className="text-xs font-extrabold text-muted-foreground uppercase tracking-widest mt-5 mb-2">
            Question de récupération *
          </p>
          <input
            type="text"
            value={recoveryQuestion}
            onChange={(e) => setRecoveryQuestion(e.target.value)}
            placeholder="Ex: Quel est votre plat préféré ?"
            maxLength={200}
            className="w-full rounded-xl bg-input-background px-3 py-3 text-sm font-semibold text-foreground outline-none ring-2 ring-transparent focus:ring-primary/30"
          />

          <p className="text-xs font-extrabold text-muted-foreground uppercase tracking-widest mt-3 mb-2">
            Réponse de récupération *
          </p>
          <div className="relative">
            <input
              type={showRecoveryAnswer ? "text" : "password"}
              value={recoveryAnswer}
              onChange={(e) => setRecoveryAnswer(e.target.value)}
              placeholder="Votre réponse personnelle (min. 5 caractères)"
              className="w-full rounded-xl bg-input-background px-3 py-3 pr-10 text-sm font-semibold text-foreground outline-none ring-2 ring-transparent focus:ring-primary/30"
            />
            <button
              type="button"
              onClick={() => setShowRecoveryAnswer((previous) => !previous)}
              aria-label={showRecoveryAnswer ? "Masquer la réponse saisie" : "Afficher la réponse saisie"}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            >
              {showRecoveryAnswer ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {error && (
            <p className="mt-4 text-sm font-bold text-destructive">{error}</p>
          )}
        </div>
      </div>

      <div className="flex-shrink-0 px-4 pb-8 pt-3 bg-background border-t border-border">
        <div className={onCancel ? "grid grid-cols-2 gap-3" : ""}>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="w-full rounded-2xl py-5 text-base font-black border border-border text-foreground active:scale-95 transition-transform"
            >
              Annuler
            </button>
          )}
          <button
            onClick={() =>
              onContinue(
                password,
                recoveryQuestion,
                recoveryAnswer,
                ownerAlreadyConfigured ? travelerChoice : null,
                travelerCode
              )
            }
            className="w-full bg-primary text-primary-foreground rounded-2xl py-5 text-lg font-black shadow-lg active:scale-95 transition-transform"
          >
            Continuer
          </button>
        </div>
      </div>
    </div>
  );
}

function CloudLoadingScreen() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-center">
        <div className="mb-6 flex justify-center">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 border-4 border-transparent border-t-blue-500 border-r-blue-500 rounded-full animate-spin"></div>
          </div>
        </div>
        <p className="text-xl font-semibold text-gray-800 mb-2">Chargement en cours...</p>
        <p className="text-sm text-gray-600">Synchronisation avec le cloud</p>
      </div>
    </div>
  );
}

function CloudAccessErrorScreen({ reason, onRetry }: { reason: string; onRetry: () => void }) {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-red-50 to-orange-100">
      <div className="bg-white rounded-3xl shadow-xl p-8 max-w-md mx-4 text-center">
        <div className="mb-6 text-5xl">⚠️</div>
        <h1 className="text-2xl font-black text-gray-900 mb-3">Erreur d'accès</h1>
        <p className="text-gray-700 mb-2">{reason}</p>
        <p className="text-sm text-gray-500 mb-6">Vérifiez votre connexion internet et réessayez.</p>
        <button
          onClick={onRetry}
          className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-xl transition-colors"
        >
          Réessayer
        </button>
      </div>
    </div>
  );
}

function CloudLoginScreen({
  profiles,
  selectedProfileId,
  createSurname,
  error,
  passwordPromptProfileSurname,
  profileRecoveryStep,
  profileRecoveryQuestion,
  profileRecoveryAnswerInput,
  profileRecoveryNewPasswordInput,
  profileRecoveryNewPasswordConfirmInput,
  profileRecoveryError,
  passwordPromptValue,
  passwordPromptError,
  onSelectProfile,
  onCreateSurnameChange,
  onLoginWithSelected,
  onCreateAndContinue,
  onOpenProfileForgotPassword,
  onProfileRecoveryAnswerChange,
  onProfileRecoveryNewPasswordChange,
  onProfileRecoveryNewPasswordConfirmChange,
  onConfirmProfileRecoveryReset,
  onCancelProfileRecovery,
  onPasswordPromptValueChange,
  onConfirmPasswordPrompt,
  onCancelPasswordPrompt,
  onSubmitLogin,
}: {
  profiles: LoginCandidate[];
  selectedProfileId: string | null;
  createSurname: string;
  error: string | null;
  passwordPromptProfileSurname: string | null;
  profileRecoveryStep: "none" | "recovery";
  profileRecoveryQuestion: string | null;
  profileRecoveryAnswerInput: string;
  profileRecoveryNewPasswordInput: string;
  profileRecoveryNewPasswordConfirmInput: string;
  profileRecoveryError: string | null;
  passwordPromptValue: string;
  passwordPromptError: string | null;
  onSelectProfile: (profileId: string) => void;
  onCreateSurnameChange: (value: string) => void;
  onLoginWithSelected: () => void;
  onCreateAndContinue: () => void;
  onOpenProfileForgotPassword: () => void;
  onProfileRecoveryAnswerChange: (v: string) => void;
  onProfileRecoveryNewPasswordChange: (v: string) => void;
  onProfileRecoveryNewPasswordConfirmChange: (v: string) => void;
  onConfirmProfileRecoveryReset: () => void;
  onCancelProfileRecovery: () => void;
  onPasswordPromptValueChange: (value: string) => void;
  onConfirmPasswordPrompt: () => void;
  onCancelPasswordPrompt: () => void;
  onSubmitLogin?: (profileId: string, password: string) => void;
}) {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [profileSearch, setProfileSearch] = useState("");
  const [isProfileListOpen, setIsProfileListOpen] = useState(false);
  const [isCreateProfileDialogOpen, setIsCreateProfileDialogOpen] = useState(false);
  const [showRecoveryAnswer, setShowRecoveryAnswer] = useState(false);
  const [showRecoveryNewPassword, setShowRecoveryNewPassword] = useState(false);
  const [showRecoveryConfirm, setShowRecoveryConfirm] = useState(false);
  const profilePickerRef = useRef<HTMLDivElement | null>(null);

  const selectedProfile = profiles.find((p) => p.id === selectedProfileId);
  const isProtected = Boolean(selectedProfile?.passwordHash);

  const formatProfileLabel = (candidate: LoginCandidate) =>
    `${candidate.surname} ${candidate.role === "proprietaire" ? "(Propriétaire)" : candidate.role === "visiteur" ? "(Visiteur)" : "(Voyageur)"}`;

  const normalizedProfileSearch = profileSearch.trim().toLocaleLowerCase("fr-FR");
  const filteredProfiles = profiles
    .filter((candidate) => {
      if (!normalizedProfileSearch) return true;
      const surname = candidate.surname.trim().toLocaleLowerCase("fr-FR");
      const fullLabel = formatProfileLabel(candidate).toLocaleLowerCase("fr-FR");
      return surname.startsWith(normalizedProfileSearch) || fullLabel.startsWith(normalizedProfileSearch);
    })
    .sort((left, right) => {
      const roleOrder: Record<LoginCandidate["role"], number> = {
        utilisateur: 0,
        visiteur: 1,
        proprietaire: 2,
      };
      return roleOrder[left.role] - roleOrder[right.role];
    });

  const handleLogin = () => {
    setLocalError(null);
    if (!selectedProfileId) {
      setLocalError("Veuillez sélectionner un profil.");
      return;
    }

    if (onSubmitLogin) {
      onSubmitLogin(selectedProfileId, password);
    } else {
      if (isProtected && !password.trim()) {
        setLocalError("Veuillez saisir votre mot de passe.");
        return;
      }
      onLoginWithSelected();
      if (isProtected) {
        onPasswordPromptValueChange(password);
        setTimeout(() => onConfirmPasswordPrompt(), 50);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleLogin();
    }
  };

  useEffect(() => {
    setPassword("");
    setLocalError(null);
  }, [selectedProfileId]);

  useEffect(() => {
    if (!selectedProfileId) return;
    const nextSelected = profiles.find((candidate) => candidate.id === selectedProfileId);
    if (!nextSelected) return;
    setProfileSearch(formatProfileLabel(nextSelected));
  }, [selectedProfileId, profiles]);

  useEffect(() => {
    if (!isProfileListOpen) return;

    const handleDocumentClick = (event: MouseEvent) => {
      if (!profilePickerRef.current) return;
      if (event.target instanceof Node && profilePickerRef.current.contains(event.target)) return;
      setIsProfileListOpen(false);
    };

    document.addEventListener("mousedown", handleDocumentClick);
    return () => {
      document.removeEventListener("mousedown", handleDocumentClick);
    };
  }, [isProfileListOpen]);

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#FFF8F5]">
      <div className="relative bg-[#FF6B3D] text-white px-6 pt-12 pb-8 flex-shrink-0">
        <MemphisDecor />
        <div className="relative z-10">
          <p className="text-xs font-extrabold opacity-80 tracking-widest uppercase mb-1">
            ☁️ Connexion famille
          </p>
          <h1 className="text-2xl font-black leading-tight mb-2">
            Se connecter
          </h1>
          <p className="text-sm opacity-90">
            Accédez à votre espace voyage
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6">
        {profileRecoveryStep === "recovery" ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
            <div>
              <p className="text-lg font-black text-gray-900">Récupérer l&apos;accès</p>
              <p className="text-xs text-gray-500 mt-1">
                Répondez à votre question de sécurité pour définir un nouveau mot de passe.
              </p>
            </div>

            <div>
              <label className="text-xs font-extrabold text-gray-500 uppercase tracking-widest">
                Question de récupération
              </label>
              <p className="mt-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 text-sm font-bold text-gray-900">
                {profileRecoveryQuestion || "Question indisponible"}
              </p>
            </div>

            <div className="relative">
              <label className="text-xs font-extrabold text-gray-500 uppercase tracking-widest">
                Réponse
              </label>
              <input
                type={showRecoveryAnswer ? "text" : "password"}
                value={profileRecoveryAnswerInput}
                onChange={(e) => onProfileRecoveryAnswerChange(e.target.value)}
                placeholder="Réponse"
                className="mt-2 w-full rounded-xl bg-gray-50 border border-gray-200 px-3 py-3 pr-10 text-sm font-semibold text-gray-900 outline-none focus:border-[#FF6B3D] focus:ring-1 focus:ring-[#FF6B3D]"
              />
              <button
                type="button"
                onClick={() => setShowRecoveryAnswer((p) => !p)}
                aria-label={showRecoveryAnswer ? "Masquer la réponse saisie" : "Afficher la réponse saisie"}
                className="absolute right-3 top-[38px] text-gray-400"
              >
                {showRecoveryAnswer ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <div className="relative">
              <label className="text-xs font-extrabold text-gray-500 uppercase tracking-widest">
                Nouveau mot de passe
              </label>
              <input
                type={showRecoveryNewPassword ? "text" : "password"}
                value={profileRecoveryNewPasswordInput}
                onChange={(e) => onProfileRecoveryNewPasswordChange(e.target.value)}
                placeholder="Nouveau mot de passe"
                className="mt-2 w-full rounded-xl bg-gray-50 border border-gray-200 px-3 py-3 pr-10 text-sm font-semibold text-gray-900 outline-none focus:border-[#FF6B3D] focus:ring-1 focus:ring-[#FF6B3D]"
              />
              <button
                type="button"
                onClick={() => setShowRecoveryNewPassword((p) => !p)}
                aria-label={showRecoveryNewPassword ? "Masquer le nouveau mot de passe saisi" : "Afficher le nouveau mot de passe saisi"}
                className="absolute right-3 top-[38px] text-gray-400"
              >
                {showRecoveryNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <div className="relative">
              <label className="text-xs font-extrabold text-gray-500 uppercase tracking-widest">
                Confirmer le mot de passe
              </label>
              <input
                type={showRecoveryConfirm ? "text" : "password"}
                value={profileRecoveryNewPasswordConfirmInput}
                onChange={(e) => onProfileRecoveryNewPasswordConfirmChange(e.target.value)}
                placeholder="Confirmer le nouveau mot de passe"
                className="mt-2 w-full rounded-xl bg-gray-50 border border-gray-200 px-3 py-3 pr-10 text-sm font-semibold text-gray-900 outline-none focus:border-[#FF6B3D] focus:ring-1 focus:ring-[#FF6B3D]"
              />
              <button
                type="button"
                onClick={() => setShowRecoveryConfirm((p) => !p)}
                aria-label={showRecoveryConfirm ? "Masquer la confirmation saisie" : "Afficher la confirmation saisie"}
                className="absolute right-3 top-[38px] text-gray-400"
              >
                {showRecoveryConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {profileRecoveryError && (
              <p className="text-xs font-bold text-red-500">{profileRecoveryError}</p>
            )}

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={onCancelProfileRecovery}
                className="rounded-xl py-3 text-sm font-black border border-gray-200 text-gray-700 hover:bg-gray-50 active:scale-95 transition-transform"
              >
                Annuler
              </button>
              <button
                onClick={onConfirmProfileRecoveryReset}
                className="rounded-xl py-3 text-sm font-black bg-[#FF6B3D] text-white shadow-md active:scale-95 transition-transform"
              >
                Réinitialiser
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
              {profiles.length > 0 ? (
                <>
                  <div>
                    <label className="text-xs font-extrabold text-gray-500 uppercase tracking-widest">
                      Nom d&apos;utilisateur
                    </label>
                    <div ref={profilePickerRef} className="relative mt-2">
                      <input
                        type="text"
                        value={profileSearch}
                        onChange={(e) => {
                          const nextValue = e.target.value;
                          setProfileSearch(nextValue);
                          setIsProfileListOpen(true);
                          setLocalError(null);

                          if (selectedProfileId) {
                            onSelectProfile("");
                          }
                        }}
                        onFocus={() => setIsProfileListOpen(true)}
                        onKeyDown={(e) => {
                          if (e.key === "Escape") {
                            setIsProfileListOpen(false);
                          }
                        }}
                        placeholder="Sélectionnez un profil"
                        className="w-full rounded-xl bg-gray-50 border border-gray-200 px-3 py-3 pr-10 text-sm font-semibold text-gray-900 outline-none focus:border-[#FF6B3D] focus:ring-1 focus:ring-[#FF6B3D]"
                      />
                      <button
                        type="button"
                        onClick={() => setIsProfileListOpen((previous) => !previous)}
                        aria-label="Afficher les profils disponibles"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                      >
                        <ChevronDown
                          size={18}
                          className={`transition-transform ${isProfileListOpen ? "rotate-180" : ""}`}
                        />
                      </button>

                      {isProfileListOpen && (
                        <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
                          <ul className="max-h-56 overflow-y-auto py-1">
                            {filteredProfiles.length > 0 ? (
                              filteredProfiles.map((candidate) => (
                                <li key={candidate.id}>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      onSelectProfile(candidate.id);
                                      setProfileSearch(formatProfileLabel(candidate));
                                      setIsProfileListOpen(false);
                                      setLocalError(null);
                                    }}
                                    className="w-full px-3 py-2 text-left text-sm font-semibold text-gray-900 hover:bg-[#FFF0EB]"
                                  >
                                    {formatProfileLabel(candidate)}
                                  </button>
                                </li>
                              ))
                            ) : (
                              <li className="px-3 py-2 text-sm font-semibold text-gray-400">
                                Aucun profil ne commence par cette saisie.
                              </li>
                            )}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>

                  {selectedProfileId && isProtected && (
                    <div className="relative">
                      <p className="text-xs font-bold text-[#FF6B3D] mb-1">Profil protégé</p>
                      <label className="text-xs font-extrabold text-gray-500 uppercase tracking-widest">
                        Mot de passe
                      </label>
                      <div className="relative mt-2">
                        <input
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => {
                            setPassword(e.target.value);
                            setLocalError(null);
                          }}
                          onKeyDown={handleKeyDown}
                          placeholder="Votre mot de passe"
                          className="w-full rounded-xl bg-gray-50 border border-gray-200 px-3 py-3 pr-10 text-sm font-semibold text-gray-900 outline-none focus:border-[#FF6B3D] focus:ring-1 focus:ring-[#FF6B3D]"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((p) => !p)}
                          aria-label={showPassword ? "Masquer le mot de passe saisi" : "Afficher le mot de passe saisi"}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                        >
                          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>

                      {profileRecoveryQuestion && (
                        <div className="mt-2 text-right">
                          <button
                            type="button"
                            onClick={onOpenProfileForgotPassword}
                            className="text-xs font-bold text-[#FF6B3D] hover:underline underline-offset-2"
                          >
                            Mot de passe oublié ?
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {(localError || error || passwordPromptError) && (
                    <p className="text-xs font-bold text-red-500">
                      {localError || error || passwordPromptError}
                    </p>
                  )}

                  <button
                    onClick={handleLogin}
                    disabled={!selectedProfileId}
                    className="w-full bg-[#FF6B3D] text-white rounded-2xl py-4 text-sm font-black shadow-md active:scale-95 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Se connecter
                  </button>
                </>
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm text-gray-500">
                    Aucun profil existant. Créez le vôtre ci-dessous.
                  </p>
                </div>
              )}
            </div>

            <div className="py-3 text-center">
              <button
                type="button"
                onClick={() => setIsCreateProfileDialogOpen(true)}
                className="text-xs font-bold text-gray-500 hover:text-[#FF6B3D] hover:underline underline-offset-2"
              >
                Nouveau ici
              </button>
            </div>

            {isCreateProfileDialogOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
                <button
                  type="button"
                  aria-label="Fermer la création de profil"
                  onClick={() => setIsCreateProfileDialogOpen(false)}
                  className="absolute inset-0 bg-black/35"
                />
                <div className="relative z-10 w-full max-w-sm rounded-2xl bg-white border border-gray-100 shadow-xl p-5 space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-extrabold text-gray-700 uppercase tracking-widest">Nouveau profil</p>
                    <button
                      type="button"
                      onClick={() => setIsCreateProfileDialogOpen(false)}
                      className="text-xs font-bold text-gray-400 hover:text-gray-600"
                    >
                      Fermer
                    </button>
                  </div>
                  <input
                    autoFocus
                    value={createSurname}
                    onChange={(e) => onCreateSurnameChange(e.target.value)}
                    placeholder="Ex: Maman, Papa, Léo"
                    className="w-full rounded-xl bg-gray-50 border border-gray-200 px-3 py-3 text-sm font-semibold text-gray-900 outline-none focus:border-[#FF6B3D] focus:ring-1 focus:ring-[#FF6B3D]"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setIsCreateProfileDialogOpen(false)}
                      className="rounded-xl py-3 text-sm font-black border border-gray-200 text-gray-700 hover:bg-gray-50 active:scale-95 transition-transform"
                    >
                      Annuler
                    </button>
                    <button
                      type="button"
                      onClick={onCreateAndContinue}
                      className="rounded-xl py-3 text-sm font-black border-2 border-[#FF6B3D] text-[#FF6B3D] hover:bg-[#FFF0EB] active:scale-95 transition-transform"
                    >
                      Créer un nouveau profil
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── BOTTOM NAV ──────────────────────────────────────────────────────────────

function BottomNav({
  current,
  items,
  onNavigate,
}: {
  current: Screen;
  items: Array<{ id: Screen; icon: LucideIcon; label: string }>;
  onNavigate: (s: Screen) => void;
}) {
  const activeId =
    current === "place" || current === "visite-guidee"
      ? "guide"
      : current === "histoire-topic"
      ? "histoire"
      : current === "geographie-topic"
      ? "geographie"
      : current === "culture-topic"
      ? "culture"
      : current;
  return (
    <nav
      data-tutorial-id="bottom-nav"
      className="flex-shrink-0 bg-card border-t border-border overflow-x-auto py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      <div className="flex items-center min-w-max px-2 gap-1">
        {items.map((item) => {
          const active = activeId === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              data-tutorial-id={`bottom-nav-${item.id}`}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-2xl transition-all min-w-[60px] ${
                active ? "bg-primary/10 text-primary" : "text-muted-foreground"
              }`}
            >
              <item.icon size={22} />
              <span className="text-[10px] font-extrabold">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

// ─── CHECKLIST SCREEN ────────────────────────────────────────────────────────

function ChecklistScreen({
  categories,
  role,
  currentProfileId,
  checked,
  openCategories,
  toggleItem,
  toggleCategory,
  newItemDrafts,
  onChangeNewItemDraft,
  onAddItem,
  onDeleteItem,
  pct,
  checkedCount,
  totalItems,
  startPromptOpen,
  startCode,
  startError,
  recoveryPromptOpen,
  recoveryPhrase,
  recoveryNewCode,
  recoveryCodeConfirm,
  recoveryError,
  lockRemainingSec,
  unlockActionsEnabled,
  onOpenSettings,
  onStart,
  onOpenForgotCode,
  onStartCodeChange,
  onRecoveryPhraseChange,
  onRecoveryNewCodeChange,
  onRecoveryCodeConfirmChange,
  onConfirmStart,
  onConfirmRecoveryReset,
  onCancelStartPrompt,
  onCancelRecoveryPrompt,
  daysUntilStart,
  todayFormatted,
  destinationSurveyDestination,
  destinationSurveyDrafts,
  destinationSurveyError,
  destinationSurveyResults,
  onDestinationSurveyDraftChange,
  onSaveDestinationSurvey,
}: {
  categories: ChecklistCategory[];
  role: Role | null;
  currentProfileId: string;
  checked: Record<string, boolean>;
  openCategories: Set<string>;
  toggleItem: (id: string) => void;
  toggleCategory: (id: string) => void;
  newItemDrafts: Record<string, string>;
  onChangeNewItemDraft: (categoryId: string, value: string) => void;
  onAddItem: (categoryId: string) => void;
  onDeleteItem: (itemId: string) => void;
  pct: number;
  checkedCount: number;
  totalItems: number;
  startPromptOpen: boolean;
  startCode: string;
  startError: string | null;
  recoveryPromptOpen: boolean;
  recoveryPhrase: string;
  recoveryNewCode: string;
  recoveryCodeConfirm: string;
  recoveryError: string | null;
  lockRemainingSec: number;
  unlockActionsEnabled: boolean;
  onOpenSettings: () => void;
  onStart: () => void;
  onOpenForgotCode: () => void;
  onStartCodeChange: (v: string) => void;
  onRecoveryPhraseChange: (v: string) => void;
  onRecoveryNewCodeChange: (v: string) => void;
  onRecoveryCodeConfirmChange: (v: string) => void;
  onConfirmStart: () => void | Promise<void>;
  onConfirmRecoveryReset: () => void | Promise<void>;
  onCancelStartPrompt: () => void;
  onCancelRecoveryPrompt: () => void;
  daysUntilStart: number | null;
  todayFormatted: string;
  destinationSurveyDestination: string;
  destinationSurveyDrafts: string[];
  destinationSurveyError: string | null;
  destinationSurveyResults: ReturnType<typeof computeDestinationSurveyResults>["rows"];
  onDestinationSurveyDraftChange: (index: number, value: string) => void;
  onSaveDestinationSurvey: () => void;
}) {
  const [showStartCode, setShowStartCode] = useState(false);
  const [showRecoveryPhrase, setShowRecoveryPhrase] = useState(false);
  const [showRecoveryNewCode, setShowRecoveryNewCode] = useState(false);
  const [showRecoveryCodeConfirm, setShowRecoveryCodeConfirm] = useState(false);
  const remainingItems = Math.max(totalItems - checkedCount, 0);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="relative bg-primary text-primary-foreground px-6 pt-12 pb-8 flex-shrink-0">
        <MemphisDecor />
        <div className="relative z-10">
          <div className="flex items-center justify-between gap-3 mb-1">
            <p className="text-xs font-extrabold opacity-80 tracking-widest uppercase">
              {unlockActionsEnabled ? "✈️ Avant le départ" : "✅ Voyage débloqué"}
            </p>
            <button
              onClick={onOpenSettings}
              className="text-[10px] font-black uppercase tracking-widest bg-white/20 rounded-full px-3 py-1.5"
            >
              Paramètres
            </button>
          </div>
          <h1 className="text-2xl font-black leading-tight mb-4">
            Préparation des bagages
          </h1>
          <div className="bg-white/20 rounded-full h-3 mb-1.5">
            <div
              className="bg-secondary h-3 rounded-full transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-sm font-bold opacity-90">
            {checkedCount} / {totalItems} articles cochés ({pct}%)
          </p>
          <div className="flex items-end justify-between gap-3 mt-1">
            <p className="text-xs opacity-80">
              {remainingItems} article{remainingItems > 1 ? "s" : ""} restant
              {remainingItems > 1 ? "s" : ""}
            </p>
            <p className="text-xs font-bold opacity-80 text-right">
              {daysUntilStart !== null ? `J-${daysUntilStart} jours` : todayFormatted}
            </p>
          </div>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {unlockActionsEnabled && (
          <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <p className="text-xs font-extrabold uppercase tracking-widest text-muted-foreground">
              Sondage destination
            </p>
            <h2 className="mt-1 text-lg font-black text-foreground">
              Où allons-nous ?
            </h2>
            <p className="mt-1 text-sm font-semibold text-muted-foreground">
              Tu peux proposer jusqu'à 3 pays.
            </p>
            <p className="text-sm font-semibold text-muted-foreground">
              Points: 20 si bonne réponse, +10 si premier choix, +5 si deuxième choix.
            </p>
            <p className="text-sm font-semibold text-muted-foreground">
              Une fois le voyage commencé, les réponses sont figées, les points acquis comptent dans le challenge global ... héhéhé.
            </p>

            <div className="mt-3 space-y-2">
              {[0, 1, 2].map((index) => (
                <input
                  key={`destination-proposal-${index}`}
                  type="text"
                  value={destinationSurveyDrafts[index] ?? ""}
                  onChange={(event) => onDestinationSurveyDraftChange(index, event.target.value)}
                  placeholder={`Proposition ${index + 1}`}
                  className="w-full rounded-xl bg-input-background px-3 py-2 text-sm font-semibold text-foreground outline-none ring-2 ring-transparent focus:ring-primary/30"
                />
              ))}
              {destinationSurveyError && (
                <p className="text-xs font-bold text-destructive">{destinationSurveyError}</p>
              )}
              <button
                onClick={onSaveDestinationSurvey}
                className="w-full rounded-xl bg-primary px-3 py-2 text-sm font-black text-primary-foreground"
              >
                Enregistrer mes propositions
              </button>
            </div>
          </section>
        )}

        <p className="text-xs font-extrabold uppercase tracking-widest text-muted-foreground px-1 pt-1">
          Checklist de préparation
        </p>

        {categories.map((cat) => {
          const catChecked = cat.items.filter((i) => checked[i.id]).length;
          const isOpen = openCategories.has(cat.id);
          const allDone = cat.items.length > 0 && catChecked === cat.items.length;
          const catBadges = getCategoryBadges(cat.items);
          return (
            <div
              key={cat.id}
              className="bg-card rounded-2xl shadow-sm overflow-hidden border border-border"
            >
              <button
                className="w-full flex items-center justify-between px-4 py-4 text-left"
                onClick={() => toggleCategory(cat.id)}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{cat.emoji}</span>
                  <div>
                    <p className="font-black text-foreground">{cat.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {catChecked} / {cat.items.length}
                    </p>
                    {catBadges.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {catBadges.map((badge, index) => (
                          <span
                            key={`cat-badge-${badge}-${index}`}
                            className="inline-block text-[9px] font-black uppercase tracking-wide bg-muted text-muted-foreground rounded-full px-2 py-0.5"
                          >
                            {badge}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {allDone && (
                    <span className="w-6 h-6 rounded-full bg-accent flex items-center justify-center">
                      <Check size={13} className="text-white" />
                    </span>
                  )}
                  <ChevronRight
                    size={18}
                    className={`text-muted-foreground transition-transform duration-200 ${
                      isOpen ? "rotate-90" : ""
                    }`}
                  />
                </div>
              </button>
              {isOpen && (
                <div className="border-t border-border px-4 pb-3 pt-2 space-y-1.5">
                  <div className="flex items-center gap-2 pb-2">
                    <input
                      value={newItemDrafts[cat.id] ?? ""}
                      onChange={(e) => onChangeNewItemDraft(cat.id, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          onAddItem(cat.id);
                        }
                      }}
                      placeholder="Ajouter un item dans cette rubrique"
                      className="flex-1 rounded-xl bg-input-background px-3 py-2 text-xs font-semibold text-foreground outline-none ring-2 ring-transparent focus:ring-primary/30"
                    />
                    <button
                      onClick={() => onAddItem(cat.id)}
                      className="rounded-xl bg-primary text-primary-foreground px-3 py-2 text-xs font-black uppercase tracking-wide"
                      aria-label={`Ajouter un item dans ${cat.label}`}
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                  {cat.items.map((item) => {
                    return (
                    <div key={item.id} className="w-full flex items-center gap-2 py-1">
                      <button
                        onClick={() => toggleItem(item.id)}
                        className="flex-1 flex items-center gap-3 py-1 text-left"
                      >
                        <div
                          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all duration-200 ${
                            checked[item.id]
                              ? "bg-accent border-accent"
                              : "border-muted-foreground/40"
                          }`}
                        >
                          {checked[item.id] && (
                            <Check size={13} className="text-white" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <span
                            className={`text-sm font-semibold transition-all ${
                              checked[item.id]
                                ? "line-through text-muted-foreground"
                                : "text-foreground"
                            }`}
                          >
                            {item.label}
                          </span>
                          {item.visibleToProfileId === currentProfileId && (
                            <span className="ml-2 inline-block text-[9px] font-black uppercase tracking-wide bg-secondary/20 text-secondary rounded-full px-2 py-0.5">
                              Item perso
                            </span>
                          )}
                        </div>
                      </button>
                      {(role === "proprietaire" || item.visibleToProfileId === currentProfileId) && (
                        <button
                          onClick={() => onDeleteItem(item.id)}
                          className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-destructive"
                          aria-label={`Supprimer ${item.label}`}
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
        <div className="h-4" />
      </div>

      {/* CTA */}
      <div className="flex-shrink-0 px-4 pb-8 pt-3 bg-background border-t border-border">
        {unlockActionsEnabled ? (
          <>
            <button
              onClick={onStart}
              className="w-full bg-primary text-primary-foreground rounded-2xl py-5 text-lg font-black flex items-center justify-center gap-3 shadow-lg active:scale-95 transition-transform"
            >
              <Plane size={22} />
              On est partis ! 🎉
            </button>
            <p className="text-center text-xs text-muted-foreground mt-2">
              Votre aventure vous attend !
            </p>
          </>
        ) : (
          <p className="text-center text-xs font-bold text-muted-foreground mt-2">
            Voyage déjà débloqué. Checklist disponible pendant tout le séjour.
          </p>
        )}
      </div>

      {startPromptOpen && (
        <div className="absolute inset-0 bg-black/45 backdrop-blur-[1px] flex items-end md:items-center justify-center p-4 z-20">
          <div className="w-full md:max-w-sm bg-card rounded-2xl border border-border p-4">
            <p className="text-sm font-black text-foreground">Validation propriétaire</p>
            <p className="text-xs text-muted-foreground mt-1">
              Entrez le code propriétaire pour débloquer le voyage.
            </p>

            <input
              type={showStartCode ? "text" : "password"}
              value={startCode}
              onChange={(e) => onStartCodeChange(e.target.value)}
              placeholder="Code propriétaire"
              className="mt-3 w-full rounded-xl bg-input-background px-3 py-3 text-sm font-semibold text-foreground outline-none ring-2 ring-transparent focus:ring-primary/30"
            />
            <button
              onClick={() => setShowStartCode((previous) => !previous)}
              className="mt-2 text-xs font-black text-primary underline underline-offset-4"
            >
              {showStartCode ? "Masquer" : "Afficher"} le code saisi
            </button>

            <button
              onClick={onOpenForgotCode}
              className="mt-3 text-xs font-black text-primary underline underline-offset-4"
            >
              Code oublié ?
            </button>

            {lockRemainingSec > 0 && (
              <p className="mt-2 text-xs font-bold text-destructive">
                Trop de tentatives. Réessayez dans {lockRemainingSec}s.
              </p>
            )}

            {startError && (
              <p className="mt-2 text-xs font-bold text-destructive">{startError}</p>
            )}

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                onClick={onCancelStartPrompt}
                className="rounded-xl py-3 text-sm font-black border border-border text-foreground"
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  void onConfirmStart();
                }}
                className="rounded-xl py-3 text-sm font-black bg-primary text-primary-foreground"
              >
                Valider
              </button>
            </div>
          </div>
        </div>
      )}

      {recoveryPromptOpen && (
        <div className="absolute inset-0 bg-black/50 backdrop-blur-[1px] flex items-end md:items-center justify-center p-4 z-30">
          <div className="w-full md:max-w-sm bg-card rounded-2xl border border-border p-4">
            <p className="text-sm font-black text-foreground">Réinitialiser le code propriétaire</p>
            <p className="text-xs text-muted-foreground mt-1">
              Vérifiez votre phrase de récupération puis définissez un nouveau code.
            </p>

            <input
              type={showRecoveryPhrase ? "text" : "password"}
              value={recoveryPhrase}
              onChange={(e) => onRecoveryPhraseChange(e.target.value)}
              placeholder="Phrase de récupération"
              className="mt-3 w-full rounded-xl bg-input-background px-3 py-3 text-sm font-semibold text-foreground outline-none ring-2 ring-transparent focus:ring-primary/30"
            />
            <button
              onClick={() => setShowRecoveryPhrase((previous) => !previous)}
              className="mt-2 text-xs font-black text-primary underline underline-offset-4"
            >
              {showRecoveryPhrase ? "Masquer" : "Afficher"} la phrase saisie
            </button>
            <input
              type={showRecoveryNewCode ? "text" : "password"}
              value={recoveryNewCode}
              onChange={(e) => onRecoveryNewCodeChange(e.target.value)}
              placeholder="Nouveau code propriétaire"
              className="mt-2 w-full rounded-xl bg-input-background px-3 py-3 text-sm font-semibold text-foreground outline-none ring-2 ring-transparent focus:ring-primary/30"
            />
            <button
              onClick={() => setShowRecoveryNewCode((previous) => !previous)}
              className="mt-2 text-xs font-black text-primary underline underline-offset-4"
            >
              {showRecoveryNewCode ? "Masquer" : "Afficher"} le nouveau code
            </button>
            <input
              type={showRecoveryCodeConfirm ? "text" : "password"}
              value={recoveryCodeConfirm}
              onChange={(e) => onRecoveryCodeConfirmChange(e.target.value)}
              placeholder="Confirmer le nouveau code"
              className="mt-2 w-full rounded-xl bg-input-background px-3 py-3 text-sm font-semibold text-foreground outline-none ring-2 ring-transparent focus:ring-primary/30"
            />
            <button
              onClick={() => setShowRecoveryCodeConfirm((previous) => !previous)}
              className="mt-2 text-xs font-black text-primary underline underline-offset-4"
            >
              {showRecoveryCodeConfirm ? "Masquer" : "Afficher"} la confirmation
            </button>

            {recoveryError && (
              <p className="mt-2 text-xs font-bold text-destructive">{recoveryError}</p>
            )}

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                onClick={onCancelRecoveryPrompt}
                className="rounded-xl py-3 text-sm font-black border border-border text-foreground"
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  void onConfirmRecoveryReset();
                }}
                className="rounded-xl py-3 text-sm font-black bg-primary text-primary-foreground"
              >
                Réinitialiser le code
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── DASHBOARD SCREEN ────────────────────────────────────────────────────────

function DashboardScreen({
  quickActions,
  canAccessChecklist,
  canAccessOfflineMedia,
  canPlayArcade,
  showVisitorLockedActions,
  allowVisitorGamePostTripReplay,
  allowVisitorArcadePostTripReplay,
  isOnline,
  onNavigate,
  onNavigateToTodayGuide,
  onStartTutorial,
  currentDay,
  tripStartDate,
  totalDays,
  todayDestination,
  todaySubtitle,
  tripFinished,
  daysUntilStart,
  todayFormatted,
  profileSurname,
}: {
  quickActions: QuickAction[];
  canAccessChecklist: boolean;
  canAccessOfflineMedia: boolean;
  canPlayArcade?: boolean;
  showVisitorLockedActions: boolean;
  allowVisitorGamePostTripReplay: boolean;
  allowVisitorArcadePostTripReplay: boolean;
  isOnline: boolean;
  onNavigate: (s: Screen) => void;
  onNavigateToTodayGuide: () => void;
  onStartTutorial: () => void;
  currentDay: number;
  tripStartDate: string | null;
  totalDays: number;
  todayDestination: string;
  todaySubtitle: string;
  tripFinished: boolean;
  daysUntilStart: number | null;
  todayFormatted: string;
  profileSurname: string;
}) {
  const [mapLightboxOpen, setMapLightboxOpen] = useState(false);
  const [stayPresentationImageIndex, setStayPresentationImageIndex] = useState<number | null>(null);
  const offlineSummary = useMemo(() => {
    const registry = readOfflineDownloadRegistry();
    const totals = Object.values(registry.sectionProgress).reduce(
      (acc, section) => {
        acc.total += section.total;
        acc.completed += section.completed;
        return acc;
      },
      { total: 0, completed: 0 }
    );

    const percent = totals.total > 0
      ? Math.round((totals.completed / totals.total) * 100)
      : 0;

    return {
      completed: totals.completed,
      total: totals.total,
      percent,
    };
  }, []);

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div className="relative bg-primary text-primary-foreground px-6 pt-12 pb-8 flex-shrink-0">
        <MemphisDecor />
        <div className="relative z-10">
          <div className="flex items-start justify-between gap-3">
            <p className="text-xs font-extrabold opacity-80 tracking-widest uppercase">
              {TRIP.name}
            </p>
            <button
              onClick={() => onNavigate("settings")}
              data-tutorial-id="dashboard-settings"
              className="text-[10px] font-black uppercase tracking-widest bg-white/20 rounded-full px-3 py-1.5"
            >
              Paramètres
            </button>
          </div>
          <div className="flex items-start justify-between gap-3 mt-1">
            <div>
              <h1 className="text-4xl font-black">
                {daysUntilStart !== null
                  ? `J-${daysUntilStart}`
                  : tripFinished
                  ? "Voyage terminé"
                  : formatTripDayLabel(currentDay, tripStartDate, { format: "long" })}
              </h1>
              <p className="text-sm opacity-80 font-bold">
                {daysUntilStart !== null ? "avant le départ" : `sur ${totalDays} jours`}
              </p>
            </div>
            <div className="text-right pt-1">
              <p className="text-sm font-bold">Bonjour {profileSurname} !</p>
            </div>
          </div>
          {daysUntilStart === null && (
            <div className="flex gap-1 mt-3 flex-wrap">
              {Array.from({ length: totalDays }).map((_, i) => (
                <div
                  key={i}
                  className={`h-2 w-2 rounded-full transition-all ${
                    i < currentDay ? "bg-secondary" : "bg-white/25"
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Today card */}
      <div className="px-4 -mt-4 relative z-10">
        <button
          onClick={onNavigateToTodayGuide}
          data-tutorial-id="dashboard-today-card"
          className="w-full text-left bg-card rounded-2xl shadow-md p-4 border border-border active:scale-95 transition-transform"
        >
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <MapPin size={20} className="text-primary" />
            </div>
            <div>
              <p className="text-xs font-extrabold text-muted-foreground uppercase tracking-widest">
                {tripFinished ? "Dernière destination" : "Destination du jour"}
              </p>
              <p className="text-xl font-black text-foreground leading-tight">
                {todayDestination}
              </p>
              <p className="text-sm text-muted-foreground">
                {todaySubtitle}
              </p>
            </div>
          </div>
        </button>
      </div>

      {/* Planning complet button */}
      <div className="px-4 mt-4">
        <button
          onClick={() => onNavigate("planning")}
          data-tutorial-id="dashboard-planning"
          className="w-full flex items-center justify-between px-4 py-3.5 rounded-2xl bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 active:scale-95 transition-transform"
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">📅</span>
            <div className="text-left">
              <p className="font-black text-sm text-foreground">
                Planning complet
              </p>
              <p className="text-xs text-muted-foreground">
                Voir tous les jours du séjour
              </p>
            </div>
          </div>
          <ChevronRight size={18} className="text-muted-foreground flex-shrink-0" />
        </button>
      </div>

      {/* Quick actions */}
      <div className="px-4 mt-5">
        <p className="text-xs font-extrabold text-muted-foreground uppercase tracking-widest mb-3">
          MENU
        </p>
        <div className="grid grid-cols-2 gap-3">
          {quickActions.map((item) => {
            const isGameOfflineLocked = item.id === "game" && !isOnline;
            const allowVisitorAction = item.id === "game" && allowVisitorGamePostTripReplay;
            const isVisitorLocked =
              showVisitorLockedActions &&
              !allowVisitorAction &&
              !canAccessScreen("visiteur", "during", item.id);
            const isLocked = isGameOfflineLocked || isVisitorLocked;

            return (
              <ActionCard
                key={item.id}
                tutorialId={`dashboard-quick-${item.id}`}
                emoji={item.emoji}
                title={item.title}
                subtitle={
                  isGameOfflineLocked
                    ? "Connexion requise"
                    : isVisitorLocked
                      ? "Non disponible pour un visiteur"
                      : item.subtitle
                }
                colorBg={item.colorBg}
                colorText={item.colorText}
                onClick={() => onNavigate(item.id)}
                disabled={isLocked}
                disabledReason={isVisitorLocked ? "Non disponible" : undefined}
              />
            );
          })}
        </div>
        <div className="grid grid-cols-2 gap-3 mt-3">
          {(canPlayArcade || showVisitorLockedActions) && (
            <ActionCard
              tutorialId="dashboard-arcade"
              emoji="🕹️"
              title="Espace ludique"
              subtitle={
                showVisitorLockedActions && !allowVisitorArcadePostTripReplay
                    ? "Non disponible pour un visiteur"
                    : "Petits jeux en solo ou en équipe"
              }
              colorBg="bg-[#FFF3E0]"
              colorText="text-[#E65100]"
              onClick={() => onNavigate("jeux")}
              disabled={showVisitorLockedActions && !allowVisitorArcadePostTripReplay}
              disabledReason={showVisitorLockedActions && !allowVisitorArcadePostTripReplay ? "Non disponible" : undefined}
            />
          )}
          <ActionCard
            tutorialId="dashboard-stay-presentation"
            emoji="🇹🇷"
            title="Présentation du séjour"
            subtitle="Voir les images du voyage"
            colorBg="bg-[#E3F2FD]"
            colorText="text-[#1565C0]"
            onClick={() => setStayPresentationImageIndex(0)}
          />
        </div>
      </div>

      {/* Circuit du séjour */}
      <div className="px-4 mt-5">
        <p className="text-xs font-extrabold text-muted-foreground uppercase tracking-widest mb-3">
          Circuit du séjour
        </p>
        <div className="rounded-2xl overflow-hidden bg-muted relative">
          <button
            onClick={() => setMapLightboxOpen(true)}
            data-tutorial-id="dashboard-map-preview"
            className="block w-full active:scale-95 transition-transform"
          >
            <img
              src="/images/Carte du voyage.webp?v=20260811"
              alt="Carte du circuit du séjour en Turquie"
              className="w-full h-auto object-contain"
            />
          </button>
        </div>
      </div>

      {mapLightboxOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex flex-col"
          onClick={() => setMapLightboxOpen(false)}
        >
          <div className="flex items-center justify-end px-4 pt-12 pb-3 flex-shrink-0">
            <button
              onClick={() => setMapLightboxOpen(false)}
              aria-label="Fermer"
              className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center text-white"
            >
              <X size={18} />
            </button>
          </div>
          <div className="flex-1 flex items-center justify-center px-2 min-h-0" onClick={(e) => e.stopPropagation()}>
            <img
              src="/images/Carte du voyage.webp?v=20260811"
              alt="Carte du circuit du séjour en Turquie"
              className="max-w-full max-h-full object-contain rounded-lg"
            />
          </div>
        </div>
      )}

      {/* Photos du séjour */}
      <div className="px-4 mt-5 mb-2">
        <p className="text-xs font-extrabold text-muted-foreground uppercase tracking-widest mb-3">
          Photos du séjour
        </p>
        <div className="space-y-2">
          {EXTERNAL_APP_LINKS.map((item) => (
            <a
              key={item.href}
              href={item.href}
              target="_blank"
              rel="noopener noreferrer"
              referrerPolicy="strict-origin-when-cross-origin"
              data-tutorial-id={item.title === "Polarsteps" ? "dashboard-polarsteps-link" : undefined}
              className={`${item.colorBg} flex items-center justify-between px-4 py-3.5 rounded-2xl active:scale-95 transition-transform`}
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">{item.emoji}</span>
                <div>
                  <p className="font-black text-sm text-foreground">
                    {item.title}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {item.subtitle}
                  </p>
                </div>
              </div>
              <ExternalLink size={16} className="text-muted-foreground" />
            </a>
          ))}
        </div>
      </div>

      {(canAccessChecklist || showVisitorLockedActions) && (
        <div className="px-4 mt-4">
          <p className="text-xs font-extrabold text-muted-foreground uppercase tracking-widest mb-3">
            CHECKLIST
          </p>
          <button
            onClick={() => onNavigate("checklist")}
            disabled={showVisitorLockedActions}
            data-tutorial-id="dashboard-quick-checklist"
            className="w-full flex items-center justify-between gap-3 rounded-2xl border border-[#C8E6C9] bg-[#E8F5E9] px-4 py-3.5 text-left active:scale-95 transition-transform disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100"
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">✅</span>
              <div>
                <p className="font-black text-sm text-[#2E7D32]">Checklist</p>
                <p className="text-xs text-[#388E3C]">
                  {showVisitorLockedActions ? "Non disponible pour un visiteur" : "Préparer le départ"}
                </p>
              </div>
            </div>
            {showVisitorLockedActions ? (
              <span className="rounded-full bg-black/10 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-foreground/70">
                Non disponible
              </span>
            ) : <ChevronRight size={16} className="text-[#2E7D32]" />}
          </button>
        </div>
      )}

      {canAccessOfflineMedia && (
        <div className="px-4 mt-4">
          <p className="text-xs font-extrabold text-muted-foreground uppercase tracking-widest mb-3">
            Offline media
          </p>
          <button
            onClick={() => onNavigate("offline-media")}
            data-tutorial-id="dashboard-offline-media"
            className="w-full rounded-2xl border border-[#C8E6C9] bg-[#E8F5E9] px-4 py-3.5 text-left active:scale-95 transition-transform"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="text-xl">⬇️</span>
                <div>
                  <p className="font-black text-sm text-[#1B5E20]">Offline media</p>
                  <p className="text-xs text-[#2E7D32]">{offlineSummary.percent}% téléchargé</p>
                </div>
              </div>
              <ChevronRight size={16} className="text-[#2E7D32]" />
            </div>
            <p className="mt-2 text-[11px] font-semibold text-[#33691E]">
              {offlineSummary.completed}/{offlineSummary.total} ressources en cache
            </p>
          </button>
        </div>
      )}

      <div className="px-4 mt-4 mb-6">
        <p className="text-xs font-extrabold text-muted-foreground uppercase tracking-widest mb-3">
          TUTORIEL INTERACTIF
        </p>
        <button
          onClick={onStartTutorial}
          data-tutorial-id="dashboard-start-tutorial"
          className="w-full flex items-center justify-between gap-3 rounded-2xl border border-[#FFCC80] bg-[#FFF3E0] px-4 py-3.5 text-left active:scale-95 transition-transform"
        >
          <div className="flex items-center gap-3">
            <span className="text-xl">🎯</span>
            <div>
              <p className="font-black text-sm text-[#BF360C]">Tutoriel interactif</p>
              <p className="text-xs text-[#E65100]">Découvrir l'accueil pas à pas</p>
            </div>
          </div>
          <ChevronRight size={16} className="text-[#E65100]" />
        </button>
      </div>

      {stayPresentationImageIndex !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex flex-col"
          onClick={() => setStayPresentationImageIndex(null)}
        >
          <div className="flex items-center justify-between gap-3 px-4 pt-12 pb-3 text-white flex-shrink-0">
            <p className="text-sm font-black">Présentation du séjour</p>
            <button
              onClick={() => setStayPresentationImageIndex(null)}
              aria-label="Fermer la présentation du séjour"
              className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center"
            >
              <X size={18} />
            </button>
          </div>
          <div
            className="flex-1 flex items-center justify-center gap-2 px-2 min-h-0"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              onClick={() => setStayPresentationImageIndex((current) =>
                current === null
                  ? 0
                  : (current - 1 + STAY_PRESENTATION_IMAGES.length) % STAY_PRESENTATION_IMAGES.length
              )}
              aria-label="Image précédente"
              className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center text-white flex-shrink-0"
            >
              <ChevronLeft size={22} />
            </button>
            <img
              src={STAY_PRESENTATION_IMAGES[stayPresentationImageIndex]}
              alt={`Image ${stayPresentationImageIndex + 1} du séjour`}
              className="max-w-full max-h-full object-contain rounded-lg"
            />
            <button
              onClick={() => setStayPresentationImageIndex((current) =>
                current === null ? 0 : (current + 1) % STAY_PRESENTATION_IMAGES.length
              )}
              aria-label="Image suivante"
              className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center text-white flex-shrink-0"
            >
              <ChevronRight size={22} />
            </button>
          </div>
          <div
            className="flex gap-2 overflow-x-auto px-4 py-4 flex-shrink-0"
            onClick={(event) => event.stopPropagation()}
          >
            {STAY_PRESENTATION_IMAGES.map((image, index) => (
              <button
                key={image}
                onClick={() => setStayPresentationImageIndex(index)}
                aria-label={`Afficher l'image ${index + 1}`}
                className={`w-16 h-12 rounded-lg overflow-hidden flex-shrink-0 border-2 ${
                  index === stayPresentationImageIndex ? "border-white" : "border-transparent opacity-60"
                }`}
              >
                <img src={image} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}


    </div>
  );
}

// ─── SHARED TYPES ────────────────────────────────────────────────────────────

type ContentTopic = {
  id: string;
  name: string;
  shortDesc: string;
  tag: string;
  // Optionnels pour permettre l'affichage des visites ajoutées par le
  // propriétaire dans le Guide du séjour (pas de photo/histoire obligatoire,
  // cf. Place dans content/places.ts) via ce même écran de détail générique.
  image?: string;
  photos?: string[];
  audioTitle?: string;
  audioDuration?: string;
  audioSrc?: string;
  history?: string;
  historyLabel?: string;
  anecdotes?: string[];
  anecdotesLabel?: string;
  gps?: string;
  links?: Array<{
    label: string;
    url: string;
  }>;
};

function buildGoogleMapsPlaceUrl(destination: Coordinates): string {
  const params = new URLSearchParams({
    api: "1",
    query: `${destination.lat},${destination.lon}`,
  });
  return `https://www.google.com/maps/search/?${params.toString()}`;
}

function buildGoogleMapsDirectionsUrl(destination: Coordinates, origin?: Coordinates): string {
  const params = new URLSearchParams({
    api: "1",
    destination: `${destination.lat},${destination.lon}`,
  });
  if (origin) {
    params.set("origin", `${origin.lat},${origin.lon}`);
  }
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

function openExternalWindow(url: string): void {
  window.open(url, "_blank", "noopener,noreferrer");
}

function resolveDayFallbackGps(day: number | undefined): string | undefined {
  if (!day) return undefined;
  const dayEntry = JOURS_DESTINATIONS.find((entry) => entry.jour === day);
  if (!dayEntry) return undefined;

  for (const key of ["gps_matin", "gps_apresmidi", "gps_soir"] as const) {
    const raw = dayEntry[key];
    if (typeof raw !== "string") continue;
    if (!parseGpsString(raw)) continue;
    return raw;
  }

  return undefined;
}

function shouldAutoFillGpsForPlace(place: { tag?: string; jour?: number[] }): boolean {
  if (!place.jour || place.jour.length === 0) {
    return false;
  }

  const tag = (place.tag ?? "").toLowerCase();

  // On ne force pas les vols ni les tuiles de découverte globale.
  if (tag.includes("vol") || tag.includes("decouvrir") || tag.includes("découvrir")) {
    return false;
  }

  return true;
}

const PLACES_WITH_AUTO_GPS = PLACES.map((place) => {
  const currentGps = (place as { gps?: string }).gps;
  if (currentGps && parseGpsString(currentGps)) {
    return place;
  }

  if (!shouldAutoFillGpsForPlace(place as { tag?: string; jour?: number[] })) {
    return place;
  }

  const firstDay = (place as { jour?: number[] }).jour?.[0];
  const fallbackGps = resolveDayFallbackGps(firstDay);
  if (!fallbackGps) {
    return place;
  }

  return { ...place, gps: fallbackGps };
});

const GAME_REPLAY_DAYS_FROM_PLACES = Array.from(
  new Set(
    PLACES.flatMap((place) =>
      Array.isArray((place as { jour?: number[] }).jour)
        ? (place as { jour?: number[] }).jour ?? []
        : []
    )
  )
)
  .map((day) => Math.trunc(day))
  .filter((day) => Number.isFinite(day) && day > 0)
  .sort((a, b) => a - b);

// ─── OFFLINE CONTENT AVAILABILITY BADGE (story 27.4) ────────────────────────
// Shared, read-only indicator reused by every content screen (Guide de
// séjour, Documents, Histoire, Géographie-économie, Culture-tradition,
// Conseils) to surface the section's offline-download state — sourced
// exclusively from the story 27.2 registry via getSectionOfflineAvailability,
// never duplicated or recomputed here.

function ContentOfflineStatusBadge({
  section,
  isOnline,
}: {
  section: OfflineSectionKey;
  isOnline: boolean;
}) {
  const badge = useMemo(() => {
    const registry = readOfflineDownloadRegistry();
    return getSectionOfflineAvailability(registry.sectionProgress[section], isOnline);
  }, [section, isOnline]);

  if (!badge) {
    return null;
  }

  const toneClass =
    badge.tone === "complete"
      ? "bg-[#E8F5E9] text-[#1B5E20]"
      : badge.tone === "partial"
        ? "bg-[#FFF3E0] text-[#E65100]"
        : "bg-[#FDECEA] text-[#B71C1C]";

  return (
    <span
      className={`relative z-10 inline-flex items-center gap-1 rounded-full px-2.5 py-1 mt-2 text-[10px] font-black uppercase tracking-widest ${toneClass}`}
    >
      {badge.label}
    </span>
  );
}

// ─── CONTENT LIST SCREEN (used by Guide and Histoire) ──────────────────────

function ContentListScreen({
  items,
  headerEmoji,
  headerTitle,
  headerSubtitle,
  offlineSection,
  isOnline,
  onBack,
  onItemSelect,
}: {
  items: ContentTopic[];
  headerEmoji: string;
  headerTitle: string;
  headerSubtitle: string;
  offlineSection: OfflineSectionKey;
  isOnline: boolean;
  onBack: () => void;
  onItemSelect: (id: string) => void;
}) {
  const realDurations = useAudioDurations(items);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="relative bg-accent text-accent-foreground px-6 pt-12 pb-6 flex-shrink-0">
        <MemphisDecor />
        <button
          onClick={onBack}
          className="relative z-10 flex items-center gap-1 text-white/80 text-sm font-bold mb-3"
        >
          <ChevronLeft size={18} /> Accueil
        </button>
        <h1 className="relative z-10 text-2xl font-black">
          {headerTitle} {headerEmoji}
        </h1>
        <p className="relative z-10 text-sm opacity-90 mt-1">
          {headerSubtitle}
        </p>
        <ContentOfflineStatusBadge section={offlineSection} isOnline={isOnline} />
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => onItemSelect(item.id)}
            className="w-full bg-card rounded-2xl shadow-sm overflow-hidden border border-border text-left active:scale-95 transition-transform"
          >
            <div className="h-40 bg-muted overflow-hidden">
              <img
                src={item.image}
                alt={item.name}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <span className="text-xs font-extrabold text-accent uppercase tracking-widest">
                    {item.tag}
                  </span>
                  <h3 className="font-black text-foreground mt-0.5">
                    {item.name}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {item.shortDesc}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-bold text-muted-foreground">
                    <span className="rounded-full bg-muted px-2.5 py-1">
                      {item.photos?.length ?? 1} photos
                    </span>
                    <span className="rounded-full bg-muted px-2.5 py-1">
                      {realDurations[item.id] ?? item.audioDuration ?? "Audio à venir"}
                    </span>
                  </div>
                </div>
                <ChevronRight
                  size={20}
                  className="text-muted-foreground mt-1 flex-shrink-0"
                />
              </div>
            </div>
          </button>
        ))}
        <div className="h-2" />
      </div>
    </div>
  );
}

// ─── PLANNING SCREEN ─────────────────────────────────────────────────────────

function PlanningScreen({
  places,
  onBack,
  onDaySelect,
  currentDay,
  tripStartDate,
  tripFinished,
  role,
  placeVisibilityMap,
  placeDayOverrideMap,
  placeDayOrderOverrideMap,
}: {
  // Places par défaut + visites ajoutées par le propriétaire, déjà fusionnées
  // par le composant parent (voir placesWithOverrides dans App.tsx), pour que
  // les visites imprévues apparaissent aussi dans le planning par jour.
  places: Place[];
  onBack: () => void;
  onDaySelect: (day: number) => void;
  currentDay: number;
  tripStartDate: string | null;
  tripFinished: boolean;
  role: Role | null;
  placeVisibilityMap: PlaceVisibilityMap;
  placeDayOverrideMap: PlaceDayOverrideMap;
  placeDayOrderOverrideMap: PlaceDayOrderOverrideMap;
}) {
  const fallbackPlaceIndexMap = useMemo(
    () => Object.fromEntries(places.map((place, index) => [place.id, index])),
    [places]
  );
  const dayPlaces = places.reduce(
    (acc, place) => {
      const daysForPlace = getEffectivePlaceDays(place, placeDayOverrideMap);
      daysForPlace.forEach((day) => {
        if (!acc[day]) {
          acc[day] = [];
        }
        acc[day].push(place);
      });
      return acc;
    },
    {} as Record<number, typeof places>
  );
  const visiblePlacesByDay = Object.fromEntries(
    Object.entries(dayPlaces).map(([dayKey, places]) => {
      const day = Number(dayKey);
      const visiblePlaces = places.filter((place) =>
        isPlaceVisibleForRole(role, place.id, placeVisibilityMap)
      );
      return [
        day,
        sortPlacesForDay(visiblePlaces, day, placeDayOrderOverrideMap, fallbackPlaceIndexMap),
      ];
    })
  );

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div className="relative bg-primary text-primary-foreground px-6 pt-12 pb-8 flex-shrink-0">
        <MemphisDecor />
        <button
          onClick={onBack}
          data-tutorial-id="planning-back"
          className="relative z-10 flex items-center gap-1 text-white/80 text-sm font-bold mb-3"
        >
          <ChevronLeft size={18} /> Accueil
        </button>
        <h1 data-tutorial-id="planning-title" className="relative z-10 text-2xl font-black">Planning complet 📅</h1>
      </div>

      {/* Day cards */}
      <div className="px-4 pt-5 pb-6 space-y-3">
        {JOURS_DESTINATIONS.map((dayEntry) => {
          const places = visiblePlacesByDay[dayEntry.jour] || [];
          const isCurrentDay = dayEntry.jour === currentDay && !tripFinished;

          return (
            <button
              key={dayEntry.jour}
              onClick={() => onDaySelect(dayEntry.jour)}
              className={`w-full text-left rounded-2xl p-4 border transition-all active:scale-95 ${
                isCurrentDay
                  ? "bg-secondary text-secondary-foreground border-secondary shadow-md"
                  : "bg-card border-border"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-extrabold text-muted-foreground uppercase tracking-widest">
                      {formatTripDayLabel(dayEntry.jour, tripStartDate)}
                    </span>
                    {isCurrentDay && (
                      <span className="text-[10px] font-black uppercase tracking-widest bg-primary text-primary-foreground rounded-full px-2 py-0.5">
                        aujourd'hui
                      </span>
                    )}
                  </div>
                  <h3 className="font-black text-lg mt-1">
                    {dayEntry.destination}
                  </h3>
                  {places.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {places.slice(0, 3).map((place) => (
                        <span
                          key={place.id}
                          className="text-xs font-semibold text-muted-foreground bg-muted rounded-full px-2.5 py-1"
                        >
                          {place.name}
                        </span>
                      ))}
                      {places.length > 3 && (
                        <span className="text-xs font-semibold text-muted-foreground">
                          +{places.length - 3} lieu{places.length - 4 >= 1 ? "x" : ""}
                        </span>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground mt-2">
                      {role === "proprietaire" ? "Pas de détail renseigné" : "Aucun lieu visible pour ce jour"}
                    </p>
                  )}
                </div>
                <ChevronRight
                  size={20}
                  className="text-muted-foreground mt-1 flex-shrink-0"
                />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function DocumentsScreen({
  documents,
  onBack,
  tripStartDate,
  role,
  documentVisibilityMap,
  onToggleDocumentVisibility,
  canManageDocumentVisibility,
  onSaveDocument,
  onDeleteDocument,
  deepLinkTarget,
  onDeepLinkHandled,
  isOnline,
}: {
  // Documents par défaut + ajouts/corrections/suppressions du propriétaire,
  // déjà fusionnés par le composant parent (voir documentsWithOwnerOverrides
  // dans App.tsx) et synchronisés cloud.
  documents: TravelDocument[];
  onBack: () => void;
  tripStartDate: string | null;
  role: Role | null;
  documentVisibilityMap: DocumentVisibilityMap;
  onToggleDocumentVisibility: (documentId: string, nextState: DocumentVisibilityState) => void;
  canManageDocumentVisibility: boolean;
  onSaveDocument: (document: TravelDocument) => void;
  onDeleteDocument: (documentId: string) => void;
  deepLinkTarget: DocumentsDeepLinkTarget | null;
  onDeepLinkHandled: () => void;
  isOnline: boolean;
}) {
  const isOwner = role === "proprietaire";
  const canConsultScans = role !== "visiteur";
  const { coords: deviceCoords } = useDeviceLocation();

  const [activeCategory, setActiveCategory] = useState<DocumentCategory>(
    DOCUMENT_CATEGORIES[0]
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [scansDocumentId, setScansDocumentId] = useState<string | null>(null);
  const [scanLightboxIndex, setScanLightboxIndex] = useState<number | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [documentFilterDays, setDocumentFilterDays] = useState<number[]>([]);
  const [documentFilterName, setDocumentFilterName] = useState("");
  const [documentDayDropdownOpen, setDocumentDayDropdownOpen] = useState(false);
  const [highlightedDocumentId, setHighlightedDocumentId] = useState<string | null>(null);

  const [draftCategory, setDraftCategory] = useState<DocumentCategory>(DOCUMENT_CATEGORIES[0]);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftTag, setDraftTag] = useState("");
  const [draftDays, setDraftDays] = useState<number[]>([]);
  const [draftDayInput, setDraftDayInput] = useState("");
  const [draftContent, setDraftContent] = useState("");
  const [draftDetails, setDraftDetails] = useState("");
  const [draftScans, setDraftScans] = useState("");
  const [draftLinks, setDraftLinks] = useState("");
  const [draftGps, setDraftGps] = useState("");

  function parseDraftDayInput(value: string): number[] {
    return Array.from(
      new Set(
        value
          .split(/[;,\s]+/)
          .map((token) => token.trim())
          .filter((token) => token.length > 0)
          .map((token) => Number.parseInt(token, 10))
          .filter((day) => Number.isFinite(day) && day > 0)
      )
    ).sort((a, b) => a - b);
  }

  function addDraftDaysFromInput(): void {
    const parsed = parseDraftDayInput(draftDayInput);
    if (parsed.length === 0) return;

    setDraftDays((previous) =>
      Array.from(new Set([...previous, ...parsed])).sort((a, b) => a - b)
    );
    setDraftDayInput("");
  }

  function removeDraftDay(day: number): void {
    setDraftDays((previous) => previous.filter((value) => value !== day));
  }

  useEffect(() => {
    if (!isOwner) {
      setEditingId(null);
      setIsAdding(false);
    }
  }, [isOwner]);

  useEffect(() => {
    if (role === "proprietaire" || !scansDocumentId) {
      return;
    }

    if ((documentVisibilityMap[scansDocumentId] ?? "visible") !== "visible") {
      setScansDocumentId(null);
      setScanLightboxIndex(null);
    }
  }, [documentVisibilityMap, role, scansDocumentId]);

  const visibleDocuments = documents.filter((document) =>
    isDocumentVisibleForRole(role, document.id, documentVisibilityMap)
  );
  const grouped = groupDocumentsByCategory(visibleDocuments);
  const categoryItems = grouped[activeCategory];
  const availableDocumentDays = useMemo(
    () =>
      Array.from(
        new Set(categoryItems.flatMap((item) => normalizeDocumentDays(item.day)))
      ).sort((a, b) => a - b),
    [categoryItems]
  );
  const hasDocumentFilters =
    documentFilterDays.length > 0 || documentFilterName.trim().length > 0;
  const activeDocumentFilterCount =
    (documentFilterDays.length > 0 ? 1 : 0) + (documentFilterName.trim().length > 0 ? 1 : 0);
  const visibleItems = useMemo(
    () =>
      filterDocuments(categoryItems, {
        days: documentFilterDays,
        title: documentFilterName,
      }),
    [categoryItems, documentFilterDays, documentFilterName]
  );
  const scansDocument = scansDocumentId
    ? visibleDocuments.find((doc) => doc.id === scansDocumentId) ?? null
    : null;

  useEffect(() => {
    if (!deepLinkTarget) {
      return;
    }

    const visibleTarget = visibleDocuments.find((document) => document.id === deepLinkTarget.documentId);
    const fallbackTarget = documents.find((document) => document.id === deepLinkTarget.documentId);
    const target = visibleTarget ?? fallbackTarget;

    if (!target) {
      onDeepLinkHandled();
      return;
    }

    setActiveCategory(target.category);
    setDocumentFilterName(target.title);
    setDocumentFilterDays([]);
    setDocumentDayDropdownOpen(false);
    setFilterOpen(false);
    setHighlightedDocumentId(target.id);

    requestAnimationFrame(() => {
      const targetElement = document.getElementById(`document-card-${target.id}`);
      targetElement?.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    onDeepLinkHandled();
  }, [documents, deepLinkTarget, onDeepLinkHandled, visibleDocuments]);

  useEffect(() => {
    if (!highlightedDocumentId) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setHighlightedDocumentId(null);
    }, 2200);

    return () => window.clearTimeout(timeout);
  }, [highlightedDocumentId]);

  useEffect(() => {
    setDocumentFilterDays((previous) => {
      const next = previous.filter((day) => availableDocumentDays.includes(day));
      if (next.length === previous.length && next.every((day, index) => day === previous[index])) {
        return previous;
      }
      return next;
    });
  }, [availableDocumentDays]);

  function clearDraft(): void {
    setDraftCategory(activeCategory);
    setDraftTitle("");
    setDraftTag("");
    setDraftDays([]);
    setDraftDayInput("");
    setDraftContent("");
    setDraftDetails("");
    setDraftScans("");
    setDraftLinks("");
    setDraftGps("");
  }

  function openCreateForm(): void {
    if (!isOwner) return;
    clearDraft();
    setIsAdding(true);
    setEditingId(null);
  }

  function startEdit(item: TravelDocument): void {
    if (!isOwner) return;
    setDraftCategory(item.category);
    setDraftTitle(item.title);
    setDraftTag(item.tag ?? "");
    setDraftDays(normalizeDocumentDays(item.day));
    setDraftDayInput("");
    setDraftContent(item.content);
    setDraftDetails((item.details ?? []).join("\n"));
    setDraftScans((item.scans ?? []).join("\n"));
    setDraftLinks((item.links ?? []).map((link) => `${link.label}|${link.url}`).join("\n"));
    setDraftGps(item.gps ?? "");
    setEditingId(item.id);
    setIsAdding(false);
  }

  function commitDraft(targetId?: string): void {
    if (!isOwner) return;
    const normalizedTitle = draftTitle.trim();
    const normalizedContent = draftContent.trim();
    if (!normalizedTitle || !normalizedContent) {
      return;
    }

    const parsedDays = Array.from(
      new Set([...draftDays, ...parseDraftDayInput(draftDayInput)])
    ).sort((a, b) => a - b);
    const details = draftDetails
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
    const scans = draftScans
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
    const links = draftLinks
      .split("\n")
      .map((line) => {
        const normalizedLine = line.trim();
        if (!normalizedLine) return null;
        const separatorIndex = normalizedLine.indexOf("|");
        if (separatorIndex === -1) {
          return { label: normalizedLine, url: normalizedLine };
        }
        const label = normalizedLine.slice(0, separatorIndex).trim();
        const url = normalizedLine.slice(separatorIndex + 1).trim();
        if (!label || !url) return null;
        return { label, url };
      })
      .filter((entry): entry is { label: string; url: string } => Boolean(entry));
    const gpsRaw = draftGps.trim();
    if (gpsRaw && !parseGpsString(gpsRaw)) {
      return;
    }
    const gps = gpsRaw && parseGpsString(gpsRaw) ? gpsRaw : undefined;

    if (targetId && !window.confirm("Confirmer la modification de ce document ?")) {
      return;
    }

    const payload: TravelDocument = {
      id: targetId ?? `doc-${Date.now()}`,
      category: draftCategory,
      title: normalizedTitle,
      content: normalizedContent,
      tag: draftTag.trim() || undefined,
      day: parsedDays.length > 0 ? parsedDays : undefined,
      details: details.length > 0 ? details : undefined,
      scans: scans.length > 0 ? scans : undefined,
      links: links.length > 0 ? links : undefined,
      gps,
    };

    onSaveDocument(payload);
    if (targetId) {
      setEditingId(null);
    } else {
      setIsAdding(false);
    }

    clearDraft();
    setActiveCategory(payload.category);
  }

  function removeDocument(id: string): void {
    if (!isOwner) return;
    if (!window.confirm("Confirmer la suppression de ce document ?")) {
      return;
    }
    onDeleteDocument(id);
    if (editingId === id) {
      setEditingId(null);
      clearDraft();
    }
    if (scansDocumentId === id) {
      setScansDocumentId(null);
      setScanLightboxIndex(null);
    }
  }

  function openScans(item: TravelDocument): void {
    if (!canConsultScans) {
      return;
    }
    if (!item.scans || item.scans.length === 0) {
      return;
    }
    setScansDocumentId(item.id);
    setScanLightboxIndex(null);
  }

  function openDocumentLocation(item: TravelDocument): void {
    if (!item.gps) return;
    const coords = parseGpsString(item.gps);
    if (!coords) return;
    openExternalWindow(buildGoogleMapsPlaceUrl(coords));
  }

  function openDocumentDirections(item: TravelDocument): void {
    if (!item.gps) return;
    const destination = parseGpsString(item.gps);
    if (!destination) return;
    openExternalWindow(buildGoogleMapsDirectionsUrl(destination, deviceCoords ?? undefined));
  }

  function renderDocumentEditor(targetId?: string) {
    const isEditMode = Boolean(targetId);
    const draftGpsNormalized = draftGps.trim();
    const draftGpsInvalid = draftGpsNormalized.length > 0 && !parseGpsString(draftGpsNormalized);

    return (
      <div className="rounded-2xl border border-[#BFDBFE] bg-[#EFF6FF] p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <select
            value={draftCategory}
            onChange={(event) => setDraftCategory(event.target.value as DocumentCategory)}
            className="rounded-xl border border-border px-3 py-2 text-sm bg-background text-foreground"
            aria-label="Catégorie du document"
          >
            {DOCUMENT_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={draftTitle}
            onChange={(event) => setDraftTitle(event.target.value)}
            placeholder="Titre du document"
            aria-label="Titre du document"
            className="rounded-xl border border-border px-3 py-2 text-sm bg-background text-foreground"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <input
            type="text"
            value={draftTag}
            onChange={(event) => setDraftTag(event.target.value)}
            placeholder="Tag optionnel (ex: Jour 3, AF7507, Soir)"
            aria-label="Tag du document"
            className="rounded-xl border border-border px-3 py-2 text-sm bg-background text-foreground"
          />
          <div className="rounded-xl border border-border px-3 py-2 text-sm bg-background text-foreground">
            <p className="text-[11px] font-semibold text-muted-foreground mb-2">Dates du document</p>
            <div className="flex flex-wrap gap-1.5 mb-2 min-h-[1.75rem]">
              {draftDays.length === 0 ? (
                <span className="text-xs text-muted-foreground">Aucune date ajoutée</span>
              ) : (
                draftDays.map((day) => (
                  <span
                    key={`draft-day-${day}`}
                    className="inline-flex items-center gap-1 rounded-full bg-[#E3F2FD] px-2 py-1 text-[11px] font-black text-[#1565C0]"
                  >
                    {formatTripDayLabel(day, tripStartDate)}
                    <button
                      type="button"
                      onClick={() => removeDraftDay(day)}
                      className="text-[10px] leading-none"
                      aria-label={`Retirer la date ${formatTripDayLabel(day, tripStartDate)}`}
                    >
                      ×
                    </button>
                  </span>
                ))
              )}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={draftDayInput}
                onChange={(event) => setDraftDayInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addDraftDaysFromInput();
                  }
                }}
                placeholder="Ajouter un jour (ex: 2 ou 2,3,9)"
                aria-label="Ajouter des jours au document"
                className="flex-1 rounded-xl border border-border px-3 py-2 text-sm bg-background text-foreground"
              />
              <button
                type="button"
                onClick={addDraftDaysFromInput}
                className="rounded-xl border border-border px-3 py-2 text-xs font-black uppercase tracking-widest"
              >
                Ajouter
              </button>
            </div>
          </div>
        </div>

        <textarea
          value={draftContent}
          onChange={(event) => setDraftContent(event.target.value)}
          placeholder="Contenu libre du document (gras avec **texte**)."
          aria-label="Contenu du document"
          rows={6}
          className="w-full rounded-xl border border-border px-3 py-2 text-sm bg-background text-foreground resize-y"
        />

        <textarea
          value={draftDetails}
          onChange={(event) => setDraftDetails(event.target.value)}
          placeholder="Détails optionnels, une ligne par élément"
          aria-label="Détails du document"
          rows={3}
          className="w-full rounded-xl border border-border px-3 py-2 text-sm bg-background text-foreground resize-y"
        />

        <textarea
          value={draftScans}
          onChange={(event) => setDraftScans(event.target.value)}
          placeholder="Chemins scans/images (un par ligne, ex: /images/Vol/Nantes Paris.webp)"
          aria-label="Scans du document"
          rows={3}
          className="w-full rounded-xl border border-border px-3 py-2 text-sm bg-background text-foreground resize-y"
        />

        <textarea
          value={draftLinks}
          onChange={(event) => setDraftLinks(event.target.value)}
          placeholder="Liens (un par ligne) format: Libellé|https://exemple.com"
          aria-label="Liens du document"
          rows={3}
          className="w-full rounded-xl border border-border px-3 py-2 text-sm bg-background text-foreground resize-y"
        />

        <input
          type="text"
          value={draftGps}
          onChange={(event) => setDraftGps(event.target.value)}
          placeholder="Coordonnées GPS (format: 41.0086,28.9802)"
          aria-label="Coordonnées GPS du document"
          className={`w-full rounded-xl border px-3 py-2 text-sm bg-background text-foreground ${
            draftGpsInvalid ? "border-destructive" : "border-border"
          }`}
        />
        {draftGpsInvalid && (
          <p className="text-xs font-semibold text-destructive">
            Format GPS invalide. Utilisez le format latitude,longitude (ex: 41.0086,28.9802).
          </p>
        )}

        <p className="text-[11px] text-muted-foreground leading-relaxed">
          Astuce: gras avec **comme ceci**. Ajoutez les dates via le champ ci-dessus. Liens via Libellé|URL. GPS: lat,lon.
        </p>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => commitDraft(targetId)}
            disabled={draftGpsInvalid}
            className="inline-flex items-center gap-1 rounded-xl bg-[#1565C0] px-3 py-2 text-xs font-black uppercase tracking-widest text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Check size={14} />
            {isEditMode ? "Enregistrer" : "Ajouter"}
          </button>
          <button
            onClick={() => {
              clearDraft();
              setEditingId(null);
              setIsAdding(false);
            }}
            className="inline-flex items-center gap-1 rounded-xl bg-muted px-3 py-2 text-xs font-black uppercase tracking-widest text-muted-foreground"
          >
            <X size={14} />
            Annuler
          </button>
        </div>
      </div>
    );
  }

  if (scansDocument) {
    const scans = scansDocument.scans ?? [];
    return (
      <div className="flex flex-col h-full overflow-hidden">
        <div className="relative bg-[#1565C0] text-white px-6 pt-12 pb-6 flex-shrink-0">
          <MemphisDecor />
          <button
            onClick={() => {
              setScansDocumentId(null);
              setScanLightboxIndex(null);
            }}
            data-tutorial-id="documents-scans-back"
            className="relative z-10 flex items-center gap-1 text-white/80 text-sm font-bold mb-3"
          >
            <ChevronLeft size={18} /> Documents
          </button>
          <h1 data-tutorial-id="documents-scans-title" className="relative z-10 text-2xl font-black">Docs · {scansDocument.title}</h1>
          <p className="relative z-10 text-sm opacity-90 mt-1">
            Touchez une image pour l'agrandir
          </p>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          {scans.length === 0 ? (
            <div className="rounded-2xl bg-card border border-border p-4">
              <p className="text-sm text-muted-foreground italic">Aucun doc disponible pour cet élément</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {scans.map((src, index) => (
                <button
                  key={`${scansDocument.id}-scan-${index}`}
                  onClick={() => setScanLightboxIndex(index)}
                  data-tutorial-id={index === 0 ? "documents-scan-image-0" : undefined}
                  className="rounded-2xl overflow-hidden border border-border bg-card active:scale-95 transition-transform"
                >
                  <img
                    src={src}
                    alt={`${scansDocument.title} scan ${index + 1}`}
                    className="w-full h-36 object-cover"
                  />
                </button>
              ))}
            </div>
          )}
          <div className="h-2" />
        </div>

        {scanLightboxIndex !== null && scans.length > 0 && (
          <div
            className="fixed inset-0 z-50 bg-black/90 flex flex-col"
            onClick={() => setScanLightboxIndex(null)}
          >
            <div className="flex items-center justify-between px-4 pt-12 pb-3 flex-shrink-0 text-white">
              <span className="text-xs font-black tracking-widest uppercase">
                {scanLightboxIndex + 1} / {scans.length}
              </span>
              <button
                onClick={() => setScanLightboxIndex(null)}
                data-tutorial-id="documents-scan-lightbox-close"
                className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 flex items-center justify-center px-2 min-h-0" onClick={(e) => e.stopPropagation()}>
              <img
                src={scans[scanLightboxIndex]}
                alt={`${scansDocument.title} scan agrandi ${scanLightboxIndex + 1}`}
                data-tutorial-id="documents-scan-lightbox"
                className="max-w-full max-h-full object-contain rounded-lg"
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="relative bg-[#1565C0] text-white px-6 pt-12 pb-6 flex-shrink-0">
        <MemphisDecor />
        <button
          onClick={onBack}
          data-tutorial-id="documents-back"
          className="relative z-10 flex items-center gap-1 text-white/80 text-sm font-bold mb-3"
        >
          <ChevronLeft size={18} /> Accueil
        </button>
        <h1 data-tutorial-id="documents-title" className="relative z-10 text-2xl font-black">Documents et informations importants 📄</h1>
        <p className="relative z-10 text-sm opacity-90 mt-1">
          Classez et éditez vos informations de voyage par catégorie
        </p>
        <ContentOfflineStatusBadge section="important-documents" isOnline={isOnline} />
      </div>

      <div className="px-4 mt-4 grid grid-cols-3 gap-2 flex-shrink-0">
        {DOCUMENT_CATEGORIES.map((category) => (
          <button
            key={category}
            onClick={() => {
              setActiveCategory(category);
              if (!isAdding && !editingId) {
                setDraftCategory(category);
              }
            }}
            data-tutorial-id={category === "VOLS" ? "documents-tab-vols" : undefined}
            className={`px-2 py-2 rounded-xl text-[11px] font-extrabold text-center leading-tight transition-all ${
              activeCategory === category
                ? "bg-[#1565C0] text-white"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      <div className="mx-4 mt-3 flex-shrink-0 rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        <button
          type="button"
          onClick={() => setFilterOpen((prev) => !prev)}
          className="w-full flex items-center justify-between px-4 py-3 text-left"
        >
          <span className="min-w-0 text-left">
            <span className="block text-sm font-black text-foreground">
              {hasDocumentFilters ? "Filtres actifs" : "Filtrer cette catégorie"}
            </span>
            {hasDocumentFilters ? (
              <span className="block text-xs text-muted-foreground mt-0.5 truncate">
                {[
                  documentFilterDays.length > 0 &&
                    documentFilterDays.map((day) => formatTripDayLabel(day, tripStartDate)).join(", "),
                  documentFilterName.trim() && `Titre: \"${documentFilterName.trim()}\"`,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            ) : (
              <span className="block text-xs text-muted-foreground mt-0.5">
                Jour/date ou texte du titre
              </span>
            )}
          </span>
          <div className="flex items-center gap-2 flex-shrink-0 ml-2">
            {hasDocumentFilters && (
              <span className="text-[10px] font-black bg-[#1565C0] text-white rounded-full px-2 py-0.5">
                {activeDocumentFilterCount}
              </span>
            )}
            <ChevronDown
              size={18}
              className={`transition-transform text-muted-foreground ${filterOpen ? "rotate-180" : ""}`}
            />
          </div>
        </button>

        {filterOpen && (
          <div className="px-4 pb-4 space-y-3 border-t border-border">
            <div className="pt-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1.5">Jour</p>
              <button
                type="button"
                onClick={() => setDocumentDayDropdownOpen((prev) => !prev)}
                className={`w-full flex items-center justify-between rounded-xl border px-3 py-2.5 text-sm text-left transition-colors ${
                  documentFilterDays.length > 0
                    ? "border-[#1565C0] bg-[#EFF6FF] text-[#1565C0] font-bold"
                    : "border-border bg-muted text-foreground"
                }`}
              >
                <span className="truncate">
                  {documentFilterDays.length === 0
                    ? "Tous les jours"
                    : documentFilterDays.length <= 2
                      ? documentFilterDays.map((day) => formatTripDayLabel(day, tripStartDate)).join(", ")
                      : `${documentFilterDays.length} jours sélectionnés`}
                </span>
                <ChevronDown
                  size={15}
                  className={`flex-shrink-0 ml-2 transition-transform ${documentDayDropdownOpen ? "rotate-180" : ""}`}
                />
              </button>

              {documentDayDropdownOpen && (
                <div className="mt-1 border border-border rounded-xl overflow-hidden">
                  {availableDocumentDays.length === 0 ? (
                    <div className="px-3 py-2.5 text-sm text-muted-foreground bg-background">
                      Aucun jour associé dans cette catégorie.
                    </div>
                  ) : (
                    availableDocumentDays.map((day) => {
                      const active = documentFilterDays.includes(day);
                      return (
                        <button
                          key={`documents-day-filter-${day}`}
                          type="button"
                          onClick={() =>
                            setDocumentFilterDays((prev) =>
                              active
                                ? prev.filter((entry) => entry !== day)
                                : [...prev, day].sort((a, b) => a - b)
                            )
                          }
                          className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-left border-b border-border/40 last:border-b-0 active:bg-muted"
                        >
                          <span className={`w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center ${active ? "bg-[#1565C0] border-[#1565C0]" : "border-border"}`}>
                            {active && <Check size={10} className="text-white" />}
                          </span>
                          <span className={active ? "font-bold text-foreground" : "text-muted-foreground"}>
                            {formatTripDayLabel(day, tripStartDate)}
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1.5">Nom</p>
              <input
                type="text"
                value={documentFilterName}
                onChange={(event) => setDocumentFilterName(event.target.value)}
                placeholder="Rechercher dans le titre"
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground"
                aria-label="Filtrer les documents par titre"
              />
            </div>

            {hasDocumentFilters && (
              <button
                type="button"
                onClick={() => {
                  setDocumentFilterDays([]);
                  setDocumentFilterName("");
                }}
                className="rounded-xl border border-border px-3 py-2 text-xs font-black uppercase tracking-widest text-muted-foreground"
              >
                Réinitialiser les filtres
              </button>
            )}
          </div>
        )}
      </div>

      {isOwner && (
        <div className="px-4 mt-3 flex flex-wrap gap-2 flex-shrink-0">
          <button
            onClick={openCreateForm}
            className="ml-auto inline-flex items-center gap-1 rounded-xl bg-[#E3F2FD] px-3 py-2 text-xs font-black uppercase tracking-widest text-[#1565C0]"
          >
            <Plus size={14} /> Nouveau
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {isAdding && renderDocumentEditor()}

        {visibleItems.length === 0 ? (
          <div className="rounded-2xl bg-card border border-border p-4">
            <p className="text-sm text-muted-foreground italic">
              {isOwner
                ? "Aucun document renseigné pour cette catégorie"
                : "Aucun document visible pour cette catégorie"}
            </p>
          </div>
        ) : (
          visibleItems.map((item) => {
            const mapCoords = item.gps ? parseGpsString(item.gps) : null;
            const visibilityState = documentVisibilityMap[item.id] ?? "visible";
            const isHiddenByOwner = visibilityState === "hiddenByOwner";
            return (
            <article
              id={`document-card-${item.id}`}
              key={item.id}
              className={`rounded-2xl bg-card border p-4 transition-shadow ${
                highlightedDocumentId === item.id
                  ? "border-[#1565C0] ring-2 ring-[#1565C0]/30"
                  : "border-border"
              }`}
            >
              {editingId === item.id ? (
                renderDocumentEditor(item.id)
              ) : (
                <>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex-1 min-w-[180px]">
                      <h3 className="font-black text-foreground">{item.title}</h3>
                      <div className="mt-1 flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-widest">
                        {normalizeDocumentDays(item.day).map((day) => (
                          <span key={`${item.id}-day-${day}`} className="rounded-full bg-[#E3F2FD] px-2.5 py-1 text-[#1565C0]">
                            {formatTripDayLabel(day, tripStartDate)}
                          </span>
                        ))}
                        {item.tag ? (
                          <span className="rounded-full bg-muted px-2.5 py-1 text-muted-foreground">{item.tag}</span>
                        ) : null}
                        {isOwner && isHiddenByOwner ? (
                          <span className="rounded-full bg-[#FDECEA] px-2.5 py-1 text-[#B71C1C]">
                            Masqué par le propriétaire
                          </span>
                        ) : null}
                        {(item.scans?.length ?? 0) > 0 && canConsultScans ? (
                            <button
                              type="button"
                              onClick={() => openScans(item)}
                              data-tutorial-id={item.id === "vol-nantes-paris-af7507" ? "documents-open-scans" : undefined}
                              className="inline-flex items-center justify-center whitespace-nowrap rounded-full border-0 bg-[#E8F5E9] px-2.5 py-1 text-[10px] font-black uppercase tracking-widest leading-none text-[#2E7D32] transition-transform active:scale-95"
                              aria-label={`Ouvrir les docs de ${item.title}`}
                            >
                              {item.scans?.length} doc(s)
                            </button>
                        ) : null}
                      </div>
                    </div>
                    {isOwner && (
                      <div className="flex items-center gap-2">
                        {canManageDocumentVisibility && (
                          <button
                            onClick={() =>
                              onToggleDocumentVisibility(
                                item.id,
                                isHiddenByOwner ? "visible" : "hiddenByOwner"
                              )
                            }
                            className={`rounded-lg px-2.5 py-1.5 text-[11px] font-black uppercase tracking-widest ${
                              isHiddenByOwner
                                ? "bg-[#FDECEA] text-[#B71C1C]"
                                : "bg-[#E8F5E9] text-[#1B5E20]"
                            }`}
                          >
                            {isHiddenByOwner ? "Rendre visible" : "Masquer"}
                          </button>
                        )}
                        <button
                          onClick={() => startEdit(item)}
                          className="rounded-lg bg-muted px-2.5 py-1.5 text-[11px] font-black uppercase tracking-widest text-muted-foreground"
                        >
                          Modifier
                        </button>
                        <button
                          onClick={() => removeDocument(item.id)}
                          className="inline-flex items-center gap-1 rounded-lg bg-[#FDE7E9] px-2.5 py-1.5 text-[11px] font-black uppercase tracking-widest text-[#AD1457]"
                        >
                          <Trash2 size={12} /> Supprimer
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="text-sm text-muted-foreground mt-3 leading-relaxed">
                    {renderFormattedText(item.content)}
                  </div>
                  {item.links && item.links.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {item.links.map((link, linkIndex) => (
                        <button
                          key={`${item.id}-link-${linkIndex}`}
                          type="button"
                          onClick={() => openExternalWindow(link.url)}
                          className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-2.5 py-1.5 text-[11px] font-bold text-foreground/80"
                        >
                          <Globe size={12} />
                          {link.label}
                        </button>
                      ))}
                    </div>
                  )}
                  {mapCoords && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => openDocumentLocation(item)}
                        className="inline-flex items-center gap-1 rounded-lg bg-[#E3F2FD] px-2.5 py-1.5 text-[11px] font-black uppercase tracking-widest text-[#1565C0]"
                      >
                        <MapPin size={12} />
                        Voir la carte
                      </button>
                      <button
                        type="button"
                        onClick={() => openDocumentDirections(item)}
                        className="inline-flex items-center gap-1 rounded-lg bg-[#E8F5E9] px-2.5 py-1.5 text-[11px] font-black uppercase tracking-widest text-[#2E7D32]"
                      >
                        <Plane size={12} />
                        Y aller
                      </button>
                    </div>
                  )}
                  {item.details && item.details.length > 0 && (
                    <ul className="mt-3 space-y-1 list-disc pl-5 text-sm text-muted-foreground">
                      {item.details.map((detail, detailIndex) => (
                        <li key={`${item.id}-${detailIndex}`}>{detail}</li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            </article>
            );
          })
        )}
        <div className="h-2" />
      </div>
    </div>
  );
}

// ─── GUIDE SCREEN ────────────────────────────────────────────────────────────

function GuideScreen({
  places,
  onBack,
  onPlaceSelect,
  currentDay,
  selectedDay,
  tripStartDate,
  onSelectedDayChange,
  commentsByPlace,
  role,
  placeVisibilityMap,
  placeSeenMap,
  placeDayOverrideMap,
  placeDayOrderOverrideMap,
  onTogglePlaceVisibility,
  onTogglePlaceSeen,
  onSetPlaceDays,
  canManagePlaceVisibility,
  ownerAddedPlaceIds,
  onSavePlace,
  onDeletePlace,
  isOnline,
}: {
  places: Place[];
  onBack: () => void;
  onPlaceSelect: (id: string) => void;
  currentDay: number;
  selectedDay: number | null;
  tripStartDate: string | null;
  onSelectedDayChange: (day: number | null) => void;
  commentsByPlace: PlaceCommentsByPlace;
  role: Role | null;
  placeVisibilityMap: PlaceVisibilityMap;
  placeSeenMap: PlaceSeenMap;
  placeDayOverrideMap: PlaceDayOverrideMap;
  placeDayOrderOverrideMap: PlaceDayOrderOverrideMap;
  onTogglePlaceVisibility: (placeId: string, nextState: PlaceVisibilityState) => void;
  onTogglePlaceSeen: (placeId: string, nextState: PlaceSeenState) => void;
  onSetPlaceDays: (
    placeId: string,
    nextDays: number[],
    dayOrderByDay: Record<number, number>
  ) => Promise<boolean>;
  canManagePlaceVisibility: boolean;
  // Ids des visites ajoutées par le propriétaire (absentes de PLACES) : seules
  // celles-ci peuvent être modifiées/supprimées ici (les places par défaut
  // passent par contentOverrides/placeVisibilityMap, cf. App.tsx).
  ownerAddedPlaceIds: Set<string>;
  onSavePlace: (place: Place) => void;
  onDeletePlace: (placeId: string) => void;
  isOnline: boolean;
}) {
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterDays, setFilterDays] = useState<number[]>(() =>
    selectedDay !== null ? [selectedDay] : []
  );
  const [filterTags, setFilterTags] = useState<string[]>([]);
  const [filterVilles, setFilterVilles] = useState<string[]>([]);
  const [filterName, setFilterName] = useState("");
  const [dayDropdownOpen, setDayDropdownOpen] = useState(false);
  const [tagDropdownOpen, setTagDropdownOpen] = useState(false);
  const [villeDropdownOpen, setVilleDropdownOpen] = useState(false);
  const [editingPlaceId, setEditingPlaceId] = useState<string | null>(null);
  const [draftPlaceDays, setDraftPlaceDays] = useState<number[]>([]);
  const [draftPlaceDayOrderByDay, setDraftPlaceDayOrderByDay] = useState<Record<number, number>>({});
  const [savingPlaceDaysForId, setSavingPlaceDaysForId] = useState<string | null>(null);
  const isOwner = role === "proprietaire";
  // Lu une seule fois au montage : permet de restaurer le formulaire
  // d'ajout/modification de visite si l'appli a rechargé pendant qu'il était
  // ouvert (cf. PLACE_DRAFT_STORAGE_KEY ci-dessus).
  const storedPlaceDraftRef = useRef(readStoredPlaceDraft());
  const [isAddingPlace, setIsAddingPlace] = useState(
    () => storedPlaceDraftRef.current?.isAddingPlace ?? false
  );
  const [editingPlaceFormId, setEditingPlaceFormId] = useState<string | null>(
    () => storedPlaceDraftRef.current?.editingPlaceFormId ?? null
  );
  const [draftPlaceName, setDraftPlaceName] = useState(() => storedPlaceDraftRef.current?.name ?? "");
  const [draftPlaceShortDesc, setDraftPlaceShortDesc] = useState(
    () => storedPlaceDraftRef.current?.shortDesc ?? ""
  );
  const [draftPlaceTag, setDraftPlaceTag] = useState(() => storedPlaceDraftRef.current?.tag ?? "");
  const [draftNewPlaceDays, setDraftNewPlaceDays] = useState<number[]>(() =>
    storedPlaceDraftRef.current ? storedPlaceDraftRef.current.days : selectedDay !== null ? [selectedDay] : []
  );
  const [draftNewPlaceDayInput, setDraftNewPlaceDayInput] = useState(
    () => storedPlaceDraftRef.current?.dayInput ?? ""
  );
  const [draftPlaceHistoryLabel, setDraftPlaceHistoryLabel] = useState(
    () => storedPlaceDraftRef.current?.historyLabel ?? ""
  );
  const [draftPlaceHistory, setDraftPlaceHistory] = useState(() => storedPlaceDraftRef.current?.history ?? "");
  const [draftPlaceAnecdotesLabel, setDraftPlaceAnecdotesLabel] = useState(
    () => storedPlaceDraftRef.current?.anecdotesLabel ?? ""
  );
  const [draftPlaceAnecdotes, setDraftPlaceAnecdotes] = useState(
    () => storedPlaceDraftRef.current?.anecdotes ?? ""
  );
  const [draftPlaceGps, setDraftPlaceGps] = useState(() => storedPlaceDraftRef.current?.gps ?? "");
  const [draftPlaceLinks, setDraftPlaceLinks] = useState(() => storedPlaceDraftRef.current?.links ?? "");
  const [draftPlaceImage, setDraftPlaceImage] = useState(() => storedPlaceDraftRef.current?.image ?? "");
  const [placeImageProcessing, setPlaceImageProcessing] = useState(false);
  const [placeImageError, setPlaceImageError] = useState<string | null>(null);

  // Sauvegarde locale (debounced) du brouillon en cours, pour survivre à un
  // rechargement complet de l'appli pendant la saisie (retour d'une autre
  // appli après un copier-coller, mise à jour de version, etc. — voir
  // PLACE_DRAFT_STORAGE_KEY). Effacé automatiquement une fois qu'aucun
  // formulaire n'est ouvert (annulation ou validation, qui remettent déjà
  // isAddingPlace/editingPlaceFormId à leur valeur initiale via
  // clearPlaceDraft).
  useEffect(() => {
    const timeout = window.setTimeout(() => {
      if (!isAddingPlace && !editingPlaceFormId) {
        localStorage.removeItem(PLACE_DRAFT_STORAGE_KEY);
        return;
      }
      const draft: StoredPlaceDraft = {
        isAddingPlace,
        editingPlaceFormId,
        name: draftPlaceName,
        shortDesc: draftPlaceShortDesc,
        tag: draftPlaceTag,
        days: draftNewPlaceDays,
        dayInput: draftNewPlaceDayInput,
        historyLabel: draftPlaceHistoryLabel,
        history: draftPlaceHistory,
        anecdotesLabel: draftPlaceAnecdotesLabel,
        anecdotes: draftPlaceAnecdotes,
        gps: draftPlaceGps,
        links: draftPlaceLinks,
        image: draftPlaceImage,
      };
      try {
        localStorage.setItem(PLACE_DRAFT_STORAGE_KEY, JSON.stringify(draft));
      } catch {
        // Stockage plein ou indisponible : le brouillon reste fonctionnel en
        // mémoire pour la session en cours, seule la persistance est perdue.
      }
    }, 400);
    return () => window.clearTimeout(timeout);
  }, [
    isAddingPlace,
    editingPlaceFormId,
    draftPlaceName,
    draftPlaceShortDesc,
    draftPlaceTag,
    draftNewPlaceDays,
    draftNewPlaceDayInput,
    draftPlaceHistoryLabel,
    draftPlaceHistory,
    draftPlaceAnecdotesLabel,
    draftPlaceAnecdotes,
    draftPlaceGps,
    draftPlaceLinks,
    draftPlaceImage,
  ]);
  const fallbackPlaceIndexMap = useMemo(
    () => Object.fromEntries(places.map((place, index) => [place.id, index])),
    [places]
  );

  // Reset filters when navigation sets a specific day context
  useEffect(() => {
    setFilterDays(selectedDay !== null ? [selectedDay] : []);
    setFilterTags([]);
    setFilterVilles([]);
    setFilterName("");
    setFilterOpen(false);
    setDayDropdownOpen(false);
    setTagDropdownOpen(false);
    setVilleDropdownOpen(false);
  }, [selectedDay]);

  useEffect(() => {
    if (!isOwner) {
      setIsAddingPlace(false);
      setEditingPlaceFormId(null);
    }
  }, [isOwner]);

  const availableTags = useMemo(
    () => [...new Set(places.map((p) => p.tag))].sort(),
    [places]
  );
  const availableVilles = useMemo(
    () =>
      [
        ...new Set(
          places.flatMap((p) =>
            "ville" in p && typeof (p as { ville?: string }).ville === "string"
              ? [(p as { ville: string }).ville]
              : []
          )
        ),
      ].sort(),
    [places]
  );

  // Cascading available options — each layer filtered by upstream selections
  const availableVillesForFilter = useMemo(() => {
    const seen = new Set<string>();
    for (const p of places) {
      if (!isPlaceVisibleForRole(role, p.id, placeVisibilityMap)) continue;
      if (filterDays.length > 0) {
        const days = getEffectivePlaceDays(p, placeDayOverrideMap);
        if (!filterDays.some((d) => days.includes(d))) continue;
      }
      const ville = "ville" in p ? (p as { ville?: string }).ville : undefined;
      if (ville) seen.add(ville);
    }
    return [...seen].sort();
  }, [filterDays, placeDayOverrideMap, placeVisibilityMap, role, places]);

  const availableTagsForFilter = useMemo(() => {
    const seen = new Set<string>();
    for (const p of places) {
      if (!isPlaceVisibleForRole(role, p.id, placeVisibilityMap)) continue;
      if (filterDays.length > 0) {
        const days = getEffectivePlaceDays(p, placeDayOverrideMap);
        if (!filterDays.some((d) => days.includes(d))) continue;
      }
      if (
        filterVilles.length > 0 &&
        !("ville" in p && filterVilles.includes((p as { ville?: string }).ville ?? ""))
      )
        continue;
      seen.add(p.tag);
    }
    return [...seen].sort();
  }, [filterDays, filterVilles, placeDayOverrideMap, placeVisibilityMap, role, places]);

  useEffect(() => {
    setFilterVilles((prev) => prev.filter((v) => availableVillesForFilter.includes(v)));
  }, [availableVillesForFilter]);
  useEffect(() => {
    setFilterTags((prev) => prev.filter((t) => availableTagsForFilter.includes(t)));
  }, [availableTagsForFilter]);

  const filteredGroups = useMemo(() => {
    const daysToShow =
      filterDays.length > 0
        ? JOURS_DESTINATIONS.filter((e) => filterDays.includes(e.jour))
        : JOURS_DESTINATIONS;
    const normalizedSearch = filterName.trim().toLowerCase();
    return daysToShow
      .map((entry) => ({
        entry,
        places: sortPlacesForDay(
          places.filter((p) =>
            getEffectivePlaceDays(p, placeDayOverrideMap).includes(entry.jour)
          )
            .filter((p) => isPlaceVisibleForRole(role, p.id, placeVisibilityMap))
            .filter((p) => filterTags.length === 0 || filterTags.includes(p.tag))
            .filter(
              (p) =>
                filterVilles.length === 0 ||
                ("ville" in p &&
                  filterVilles.includes(
                    (p as { ville?: string }).ville ?? ""
                  ))
            )
            .filter(
              (p) =>
                !normalizedSearch ||
                p.name.toLowerCase().includes(normalizedSearch)
            ),
          entry.jour,
          placeDayOrderOverrideMap,
          fallbackPlaceIndexMap
        ),
      }))
      .filter((g) => g.places.length > 0);
  }, [
    places,
    filterDays,
    filterTags,
    filterVilles,
    filterName,
    placeDayOverrideMap,
    placeVisibilityMap,
    role,
    placeDayOrderOverrideMap,
    fallbackPlaceIndexMap,
  ]);

  const activeFilterCount =
    filterDays.length +
    filterTags.length +
    filterVilles.length +
    (filterName.trim() ? 1 : 0);
  const hasFilters = activeFilterCount > 0;

  const clearFilters = () => {
    setFilterDays([]);
    setFilterTags([]);
    setFilterVilles([]);
    setFilterName("");
    onSelectedDayChange(null);
  };

  const toggleDraftPlaceDay = (day: number) => {
    setDraftPlaceDays((previous) => {
      const hasDay = previous.includes(day);
      const nextDays = hasDay
        ? previous.filter((value) => value !== day)
        : [...previous, day].sort((left, right) => left - right);
      if (!hasDay) {
        setDraftPlaceDayOrderByDay((previousOrder) => ({
          ...previousOrder,
          [day]:
            previousOrder[day] ??
            getDefaultPlacePositionForDay(
              editingPlaceId ?? "",
              day,
              placeDayOverrideMap,
              placeDayOrderOverrideMap,
              fallbackPlaceIndexMap
            ),
        }));
      } else {
        setDraftPlaceDayOrderByDay((previousOrder) => {
          const nextOrder = { ...previousOrder };
          delete nextOrder[day];
          return nextOrder;
        });
      }
      return nextDays;
    });
  };

  const updateDraftDayPosition = (day: number, nextPosition: number) => {
    const normalized = Math.max(1, Math.trunc(nextPosition));
    setDraftPlaceDayOrderByDay((previous) => ({
      ...previous,
      [day]: normalized,
    }));
  };

  // Ajout/édition d'une visite imprévue par le propriétaire (voir
  // ownerAddedPlaceIds/onSavePlace/onDeletePlace ci-dessus). Même esprit que
  // le formulaire de DocumentsScreen, sans photo/audio.
  function parseNewPlaceDayInput(value: string): number[] {
    return Array.from(
      new Set(
        value
          .split(/[;,\s]+/)
          .map((token) => token.trim())
          .filter((token) => token.length > 0)
          .map((token) => Number.parseInt(token, 10))
          .filter((day) => Number.isFinite(day) && day > 0)
      )
    ).sort((a, b) => a - b);
  }

  function addNewPlaceDaysFromInput(): void {
    const parsed = parseNewPlaceDayInput(draftNewPlaceDayInput);
    if (parsed.length === 0) return;
    setDraftNewPlaceDays((previous) =>
      Array.from(new Set([...previous, ...parsed])).sort((a, b) => a - b)
    );
    setDraftNewPlaceDayInput("");
  }

  function removeNewPlaceDay(day: number): void {
    setDraftNewPlaceDays((previous) => previous.filter((value) => value !== day));
  }

  function clearPlaceDraft(): void {
    setDraftPlaceName("");
    setDraftPlaceShortDesc("");
    setDraftPlaceTag("");
    setDraftNewPlaceDays(selectedDay !== null ? [selectedDay] : []);
    setDraftNewPlaceDayInput("");
    setDraftPlaceHistoryLabel("");
    setDraftPlaceHistory("");
    setDraftPlaceAnecdotesLabel("");
    setDraftPlaceAnecdotes("");
    setDraftPlaceGps("");
    setDraftPlaceLinks("");
    setDraftPlaceImage("");
    setPlaceImageError(null);
  }

  function openPlaceCreateForm(): void {
    if (!isOwner) return;
    clearPlaceDraft();
    setIsAddingPlace(true);
    setEditingPlaceFormId(null);
  }

  function startEditPlace(item: Place): void {
    if (!isOwner) return;
    setDraftPlaceName(item.name);
    setDraftPlaceShortDesc(item.shortDesc);
    setDraftPlaceTag(item.tag);
    setDraftNewPlaceDays(item.jour);
    setDraftNewPlaceDayInput("");
    setDraftPlaceHistoryLabel(item.historyLabel ?? "");
    setDraftPlaceHistory(item.history ?? "");
    setDraftPlaceAnecdotesLabel(item.anecdotesLabel ?? "");
    setDraftPlaceAnecdotes((item.anecdotes ?? []).join("\n"));
    setDraftPlaceGps(item.gps ?? "");
    setDraftPlaceLinks((item.links ?? []).map((link) => `${link.label}|${link.url}`).join("\n"));
    setDraftPlaceImage(item.image ?? "");
    setPlaceImageError(null);
    setEditingPlaceFormId(item.id);
    setIsAddingPlace(false);
  }

  // Compresse/redimensionne côté client la photo choisie (disque ou galerie
  // du smartphone) avant de la stocker en data URI dans le brouillon : voir
  // src/app/image-upload.ts pour le pourquoi (pas de pipeline d'upload vers
  // un service de stockage dans l'appli).
  async function handlePlaceImageFileChange(event: ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.target.files?.[0];
    // Permet de resélectionner le même fichier plus tard (sinon onChange ne
    // se redéclenche pas si l'utilisateur choisit deux fois le même fichier).
    event.target.value = "";
    if (!file) return;

    setPlaceImageError(null);
    setPlaceImageProcessing(true);
    try {
      const dataUrl = await compressImageFileToDataUrl(file);
      setDraftPlaceImage(dataUrl);
    } catch (error) {
      setPlaceImageError(
        error instanceof PlaceImageError ? error.message : "Impossible de traiter cette photo."
      );
    } finally {
      setPlaceImageProcessing(false);
    }
  }

  function removeDraftPlaceImage(): void {
    setDraftPlaceImage("");
    setPlaceImageError(null);
  }

  function commitPlaceDraft(targetId?: string): void {
    if (!isOwner) return;
    const normalizedName = draftPlaceName.trim();
    const normalizedShortDesc = draftPlaceShortDesc.trim();
    const normalizedTag = draftPlaceTag.trim();
    if (!normalizedName || !normalizedShortDesc || !normalizedTag) {
      return;
    }

    const jour = Array.from(
      new Set([...draftNewPlaceDays, ...parseNewPlaceDayInput(draftNewPlaceDayInput)])
    ).sort((a, b) => a - b);
    if (jour.length === 0) {
      return;
    }
    const anecdotes = draftPlaceAnecdotes
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
    const links = draftPlaceLinks
      .split("\n")
      .map((line) => {
        const normalizedLine = line.trim();
        if (!normalizedLine) return null;
        const separatorIndex = normalizedLine.indexOf("|");
        if (separatorIndex === -1) {
          return { label: normalizedLine, url: normalizedLine };
        }
        const label = normalizedLine.slice(0, separatorIndex).trim();
        const url = normalizedLine.slice(separatorIndex + 1).trim();
        return label && url ? { label, url } : null;
      })
      .filter((link): link is PlaceLink => Boolean(link));
    const gpsRaw = draftPlaceGps.trim();
    if (gpsRaw && !parseGpsString(gpsRaw)) {
      return;
    }

    if (targetId && !window.confirm("Confirmer la modification de cette visite ?")) {
      return;
    }

    const payload: Place = {
      id: targetId ?? `place-${Date.now()}`,
      jour,
      name: normalizedName,
      shortDesc: normalizedShortDesc,
      tag: normalizedTag,
      image: draftPlaceImage || undefined,
      historyLabel: draftPlaceHistoryLabel.trim() || undefined,
      history: draftPlaceHistory.trim() || undefined,
      anecdotesLabel: draftPlaceAnecdotesLabel.trim() || undefined,
      anecdotes: anecdotes.length > 0 ? anecdotes : undefined,
      links: links.length > 0 ? links : undefined,
      gps: gpsRaw || undefined,
    };

    onSavePlace(payload);
    if (targetId) {
      setEditingPlaceFormId(null);
    } else {
      setIsAddingPlace(false);
    }
    clearPlaceDraft();
  }

  function removeAddedPlace(placeId: string): void {
    if (!isOwner) return;
    if (!window.confirm("Confirmer la suppression de cette visite ?")) {
      return;
    }
    onDeletePlace(placeId);
    if (editingPlaceFormId === placeId) {
      setEditingPlaceFormId(null);
      clearPlaceDraft();
    }
  }

  function renderPlaceFormEditor(targetId?: string) {
    const isEditMode = Boolean(targetId);
    const draftGpsNormalized = draftPlaceGps.trim();
    const draftGpsInvalid = draftGpsNormalized.length > 0 && !parseGpsString(draftGpsNormalized);

    return (
      <div className="rounded-2xl border border-[#BFDBFE] bg-[#EFF6FF] p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <input
            type="text"
            value={draftPlaceName}
            onChange={(event) => setDraftPlaceName(event.target.value)}
            placeholder="Nom de la visite"
            aria-label="Nom de la visite"
            className="rounded-xl border border-border px-3 py-2 text-sm bg-background text-foreground"
          />
          <input
            type="text"
            value={draftPlaceTag}
            onChange={(event) => setDraftPlaceTag(event.target.value)}
            placeholder="Tag (ex: Visite, Restaurant, Promenade)"
            aria-label="Tag de la visite"
            className="rounded-xl border border-border px-3 py-2 text-sm bg-background text-foreground"
          />
        </div>

        <input
          type="text"
          value={draftPlaceShortDesc}
          onChange={(event) => setDraftPlaceShortDesc(event.target.value)}
          placeholder="Description courte"
          aria-label="Description courte de la visite"
          className="w-full rounded-xl border border-border px-3 py-2 text-sm bg-background text-foreground"
        />

        <div className="rounded-xl border border-border px-3 py-2 text-sm bg-background text-foreground">
          <p className="text-[11px] font-semibold text-muted-foreground mb-2">Jour(s) de la visite</p>
          <div className="flex flex-wrap gap-1.5 mb-2 min-h-[1.75rem]">
            {draftNewPlaceDays.length === 0 ? (
              <span className="text-xs text-muted-foreground">Aucun jour ajouté</span>
            ) : (
              draftNewPlaceDays.map((day) => (
                <span
                  key={`draft-new-place-day-${day}`}
                  className="inline-flex items-center gap-1 rounded-full bg-[#E3F2FD] px-2 py-1 text-[11px] font-black text-[#1565C0]"
                >
                  {formatTripDayLabel(day, tripStartDate)}
                  <button
                    type="button"
                    onClick={() => removeNewPlaceDay(day)}
                    className="text-[10px] leading-none"
                    aria-label={`Retirer le jour ${formatTripDayLabel(day, tripStartDate)}`}
                  >
                    ×
                  </button>
                </span>
              ))
            )}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={draftNewPlaceDayInput}
              onChange={(event) => setDraftNewPlaceDayInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  addNewPlaceDaysFromInput();
                }
              }}
              placeholder="Ajouter un jour (ex: 2 ou 2,3,9)"
              aria-label="Ajouter des jours à la visite"
              className="flex-1 rounded-xl border border-border px-3 py-2 text-sm bg-background text-foreground"
            />
            <button
              type="button"
              onClick={addNewPlaceDaysFromInput}
              className="rounded-xl border border-border px-3 py-2 text-xs font-black uppercase tracking-widest"
            >
              Ajouter
            </button>
          </div>
        </div>

        <input
          type="text"
          value={draftPlaceHistoryLabel}
          onChange={(event) => setDraftPlaceHistoryLabel(event.target.value)}
          placeholder="Titre du récit / de l'histoire (optionnel)"
          aria-label="Titre de l'histoire de la visite"
          className="w-full rounded-xl border border-border px-3 py-2 text-sm bg-background text-foreground"
        />
        <textarea
          value={draftPlaceHistory}
          onChange={(event) => setDraftPlaceHistory(event.target.value)}
          placeholder="Récit / histoire (optionnel, gras avec **texte**)"
          aria-label="Histoire de la visite"
          rows={4}
          className="w-full rounded-xl border border-border px-3 py-2 text-sm bg-background text-foreground resize-y"
        />

        <input
          type="text"
          value={draftPlaceAnecdotesLabel}
          onChange={(event) => setDraftPlaceAnecdotesLabel(event.target.value)}
          placeholder="Titre des anecdotes (optionnel)"
          aria-label="Titre des anecdotes de la visite"
          className="w-full rounded-xl border border-border px-3 py-2 text-sm bg-background text-foreground"
        />
        <textarea
          value={draftPlaceAnecdotes}
          onChange={(event) => setDraftPlaceAnecdotes(event.target.value)}
          placeholder="Anecdotes optionnelles, une ligne par élément"
          aria-label="Anecdotes de la visite"
          rows={3}
          className="w-full rounded-xl border border-border px-3 py-2 text-sm bg-background text-foreground resize-y"
        />

        <textarea
          value={draftPlaceLinks}
          onChange={(event) => setDraftPlaceLinks(event.target.value)}
          placeholder="Liens (un par ligne) format: Libellé|https://exemple.com"
          aria-label="Liens de la visite"
          rows={2}
          className="w-full rounded-xl border border-border px-3 py-2 text-sm bg-background text-foreground resize-y"
        />

        <div className="rounded-xl border border-border px-3 py-2 bg-background space-y-2">
          <p className="text-[11px] font-semibold text-muted-foreground">Photo de la visite (optionnel)</p>
          {draftPlaceImage ? (
            <div className="relative w-full h-32 rounded-lg overflow-hidden bg-muted">
              <img src={draftPlaceImage} alt="Aperçu de la photo" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={removeDraftPlaceImage}
                className="absolute top-1.5 right-1.5 rounded-full bg-background/90 p-1 text-muted-foreground shadow"
                aria-label="Retirer la photo"
              >
                <X size={14} />
              </button>
            </div>
          ) : null}
          <label className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-black uppercase tracking-widest cursor-pointer">
            <input
              type="file"
              accept="image/*"
              onChange={handlePlaceImageFileChange}
              className="hidden"
              aria-label="Choisir une photo depuis l'appareil"
            />
            {placeImageProcessing
              ? "Traitement en cours..."
              : draftPlaceImage
                ? "Changer la photo"
                : "Choisir une photo"}
          </label>
          {placeImageError && (
            <p className="text-xs font-semibold text-destructive">{placeImageError}</p>
          )}
        </div>

        <input
          type="text"
          value={draftPlaceGps}
          onChange={(event) => setDraftPlaceGps(event.target.value)}
          placeholder="Coordonnées GPS (format: 41.0086,28.9802)"
          aria-label="Coordonnées GPS de la visite"
          className={`w-full rounded-xl border px-3 py-2 text-sm bg-background text-foreground ${
            draftGpsInvalid ? "border-destructive" : "border-border"
          }`}
        />
        {draftGpsInvalid && (
          <p className="text-xs font-semibold text-destructive">
            Format GPS invalide. Utilisez le format latitude,longitude (ex: 41.0086,28.9802).
          </p>
        )}

        <p className="text-[11px] text-muted-foreground leading-relaxed">
          Pas d'audio possible pour une visite ajoutée manuellement. Astuce: gras avec **comme ceci**. Liens via Libellé|URL. GPS: lat,lon.
        </p>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => commitPlaceDraft(targetId)}
            disabled={draftGpsInvalid || placeImageProcessing}
            className="inline-flex items-center gap-1 rounded-xl bg-[#1565C0] px-3 py-2 text-xs font-black uppercase tracking-widest text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Check size={14} />
            {isEditMode ? "Enregistrer" : "Ajouter"}
          </button>
          <button
            onClick={() => {
              clearPlaceDraft();
              setEditingPlaceFormId(null);
              setIsAddingPlace(false);
            }}
            className="inline-flex items-center gap-1 rounded-xl bg-muted px-3 py-2 text-xs font-black uppercase tracking-widest text-muted-foreground"
          >
            <X size={14} />
            Annuler
          </button>
        </div>
      </div>
    );
  }

  const renderPlaceCard = (
    item: Place,
    dayForCard: number,
    keyPrefix = ""
  ) => {
    const counts = getPlaceReactionCounts(commentsByPlace[item.id]);
    const visibilityState = placeVisibilityMap[item.id] ?? "visible";
    const isHiddenByOwner = visibilityState === "hiddenByOwner";
    const canToggleVisibility = canManagePlaceVisibility;
    const isOwnerAddedPlace = ownerAddedPlaceIds.has(item.id);
    const seenState = placeSeenMap[item.id] ?? "unseen";
    const isSeen = seenState === "seen";
    const effectiveDays = getEffectivePlaceDays(item, placeDayOverrideMap);
    const hasOrderOverride = getPlaceOrderPositionForDay(item.id, dayForCard, placeDayOrderOverrideMap);
    const effectiveOrder =
      hasOrderOverride !== null
        ? getPlacePositionInDay(
            item.id,
            dayForCard,
            placeDayOverrideMap,
            placeDayOrderOverrideMap,
            fallbackPlaceIndexMap
          )
        : null;
    const baseDays = getBasePlaceDays(item);
    const hasDayOverride = JSON.stringify(effectiveDays) !== JSON.stringify(baseDays);
    const isEditingDays = editingPlaceId === item.id;
    return (
      <div key={keyPrefix + item.id} className="space-y-2">
        <button
          onClick={() => onPlaceSelect(item.id)}
          data-tutorial-id={`guide-place-${item.id}`}
          className="w-full bg-card rounded-2xl shadow-sm overflow-hidden border border-border text-left active:scale-95 transition-transform"
        >
          <div className="relative h-40 bg-muted overflow-hidden">
            {item.image ? (
              <img
                src={item.image}
                alt={item.name}
                className="w-full h-full object-cover"
              />
            ) : (
              // Visite ajoutée par le propriétaire : pas de photo (pas de
              // pipeline d'upload dans l'appli), on affiche un repère à la place.
              <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                <MapPin size={32} strokeWidth={1.5} />
              </div>
            )}
          </div>
          <div className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-extrabold text-accent uppercase tracking-widest">
                    {item.tag}
                  </span>
                  {isSeen && (
                    <span className="rounded-full bg-[#E8F5E9] px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-[#1B5E20]">
                      ✓ Vu
                    </span>
                  )}
                </div>
                <h3 className="font-black text-foreground mt-0.5">
                  {item.name}
                </h3>
                {isHiddenByOwner && canManagePlaceVisibility && (
                  <p className="mt-1 text-[11px] font-bold uppercase tracking-widest text-[#B71C1C]">
                    Masqué par le propriétaire
                  </p>
                )}
                <p className="text-sm text-muted-foreground mt-1">
                  {item.shortDesc}
                </p>
                {canManagePlaceVisibility && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {effectiveDays.map((day) => (
                      <span
                        key={`${item.id}-day-${day}`}
                        className="rounded-full bg-[#E3F2FD] px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-[#1565C0]"
                      >
                        {formatTripDayLabel(day, tripStartDate)}
                      </span>
                    ))}
                    {hasDayOverride && (
                      <span className="rounded-full bg-[#FFF3E0] px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-[#EF6C00]">
                        Jour modifié
                      </span>
                    )}
                    {effectiveOrder !== null && (
                      <span className="rounded-full bg-[#E8F5E9] px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-[#2E7D32]">
                        Position jour {dayForCard}: {effectiveOrder}
                      </span>
                    )}
                  </div>
                )}
                <div className="mt-3 flex items-center justify-between gap-2">
                  <div className="flex flex-wrap gap-2 text-[10px] font-bold text-muted-foreground">
                    {effectiveDays.map((day) => (
                      <span key={`date-tag-${day}`} className="rounded-full bg-primary/10 px-2.5 py-1 text-primary">
                        {formatTripDayLabel(day, tripStartDate)}
                      </span>
                    ))}
                    {item.ville && (
                      <span className="rounded-full bg-muted px-2.5 py-1 text-muted-foreground">
                        {item.ville}
                      </span>
                    )}
                  </div>
                  <ReactionCountersBadge
                    likes={counts.likes}
                    dislikes={counts.dislikes}
                    className="!bg-white !text-black border border-black/15 [&>span]:text-[10px] [&>span]:font-normal"
                  />
                </div>
              </div>
              <ChevronRight
                size={20}
                className="text-muted-foreground mt-1 flex-shrink-0"
              />
            </div>
          </div>
        </button>
        {canToggleVisibility && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                onTogglePlaceVisibility(item.id, isHiddenByOwner ? "visible" : "hiddenByOwner");
              }}
              className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-widest ${
                isHiddenByOwner ? "bg-[#FDECEA] text-[#B71C1C]" : "bg-[#E8F5E9] text-[#1B5E20]"
              }`}
              aria-label={`Basculer visibilité de ${item.name}`}
            >
              {isHiddenByOwner ? "Rendre visible" : "Masquer pour non-propriétaires"}
            </button>
            <button
              type="button"
              onClick={() => {
                onTogglePlaceSeen(item.id, isSeen ? "unseen" : "seen");
              }}
              className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-widest ${
                isSeen ? "bg-[#E8F5E9] text-[#1B5E20]" : "bg-muted text-muted-foreground"
              }`}
              aria-label={`Marquer ${item.name} comme ${isSeen ? "non vu" : "vu"}`}
            >
              {isSeen ? "✓ Vu" : "Marquer comme vu"}
            </button>
            <button
              type="button"
              onClick={() => {
                if (isEditingDays) {
                  setEditingPlaceId(null);
                  setDraftPlaceDays([]);
                  setDraftPlaceDayOrderByDay({});
                  return;
                }
                setEditingPlaceId(item.id);
                setDraftPlaceDays(effectiveDays);
                const nextOrderByDay: Record<number, number> = {};
                for (const day of effectiveDays) {
                  nextOrderByDay[day] =
                    getPlaceOrderPositionForDay(item.id, day, placeDayOrderOverrideMap) ??
                    getPlacePositionInDay(
                      item.id,
                      day,
                      placeDayOverrideMap,
                      placeDayOrderOverrideMap,
                      fallbackPlaceIndexMap
                    );
                }
                setDraftPlaceDayOrderByDay(nextOrderByDay);
              }}
              className="rounded-full bg-[#E3F2FD] px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-[#1565C0]"
              aria-label={`Changer les jours de ${item.name}`}
            >
              {isEditingDays ? "Annuler" : "Changer les jours"}
            </button>
            {isOwnerAddedPlace && (
              <>
                <button
                  type="button"
                  onClick={() => startEditPlace(item)}
                  className="rounded-full bg-muted px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground"
                >
                  Modifier
                </button>
                <button
                  type="button"
                  onClick={() => removeAddedPlace(item.id)}
                  className="inline-flex items-center gap-1 rounded-full bg-[#FDE7E9] px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-[#AD1457]"
                >
                  <Trash2 size={11} /> Supprimer
                </button>
              </>
            )}
          </div>
        )}
        {isOwner && isOwnerAddedPlace && editingPlaceFormId === item.id && (
          <div className="mt-1">{renderPlaceFormEditor(item.id)}</div>
        )}
        {canManagePlaceVisibility && isEditingDays && (
          <div className="rounded-2xl border border-[#BFDBFE] bg-[#EFF6FF] p-3 space-y-3">
            <p className="text-xs font-black uppercase tracking-widest text-[#1565C0]">
              Jours affichés pour ce lieu
            </p>
            <div className="flex flex-wrap gap-2">
              {JOURS_DESTINATIONS.map((entry) => {
                const isSelected = draftPlaceDays.includes(entry.jour);
                return (
                  <button
                    key={`${item.id}-override-day-${entry.jour}`}
                    type="button"
                    onClick={() => toggleDraftPlaceDay(entry.jour)}
                    data-tutorial-id={`guide-day-override-${item.id}-${entry.jour}`}
                    className={`rounded-full px-3 py-1.5 text-[11px] font-black uppercase tracking-widest ${
                      isSelected
                        ? "bg-[#1565C0] text-white"
                        : "bg-background text-muted-foreground border border-border"
                    }`}
                  >
                    {formatTripDayLabel(entry.jour, tripStartDate)}
                  </button>
                );
              })}
            </div>
            <div className="space-y-2">
              <p className="text-[11px] font-black uppercase tracking-widest text-[#1565C0]">
                Position dans chaque jour
              </p>
              {draftPlaceDays.map((day) => {
                const dayLabel = formatTripDayLabel(day, tripStartDate);
                const dayPosition = Math.max(1, Math.trunc(draftPlaceDayOrderByDay[day] ?? 1));
                return (
                  <div key={`${item.id}-order-${day}`} className="flex items-center justify-between gap-2 rounded-xl bg-white px-3 py-2 border border-[#BFDBFE]">
                    <span className="text-xs font-bold text-foreground">{dayLabel}</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => updateDraftDayPosition(day, dayPosition - 1)}
                        className="w-7 h-7 rounded-full border border-border text-xs font-black"
                        aria-label={`Monter ${item.name} le ${dayLabel}`}
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min={1}
                        value={dayPosition}
                        onChange={(event) => {
                          const parsed = Number.parseInt(event.target.value, 10);
                          if (!Number.isFinite(parsed)) {
                            return;
                          }
                          updateDraftDayPosition(day, parsed);
                        }}
                        className="w-16 rounded-lg border border-border px-2 py-1 text-xs font-black text-center"
                        aria-label={`Position de ${item.name} le ${dayLabel}`}
                      />
                      <button
                        type="button"
                        onClick={() => updateDraftDayPosition(day, dayPosition + 1)}
                        className="w-7 h-7 rounded-full border border-border text-xs font-black"
                        aria-label={`Descendre ${item.name} le ${dayLabel}`}
                      >
                        +
                      </button>
                    </div>
                  </div>
                );
              })}
              {draftPlaceDays.length === 0 && (
                <p className="text-xs text-muted-foreground">Sélectionnez au moins un jour pour régler sa position.</p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={async () => {
                  if (draftPlaceDays.length === 0) {
                    return;
                  }
                  setSavingPlaceDaysForId(item.id);
                  const saved = await onSetPlaceDays(item.id, draftPlaceDays, draftPlaceDayOrderByDay);
                  setSavingPlaceDaysForId(null);
                  if (!saved) {
                    return;
                  }
                  setEditingPlaceId(null);
                  setDraftPlaceDays([]);
                  setDraftPlaceDayOrderByDay({});
                }}
                data-tutorial-id={`guide-day-override-save-${item.id}`}
                disabled={draftPlaceDays.length === 0 || savingPlaceDaysForId === item.id}
                className="rounded-full bg-[#1565C0] px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {savingPlaceDaysForId === item.id ? "Enregistrement..." : "Enregistrer"}
              </button>
              <button
                type="button"
                onClick={async () => {
                  setSavingPlaceDaysForId(item.id);
                  const saved = await onSetPlaceDays(item.id, baseDays, {});
                  setSavingPlaceDaysForId(null);
                  if (!saved) {
                    return;
                  }
                  setEditingPlaceId(null);
                  setDraftPlaceDays([]);
                  setDraftPlaceDayOrderByDay({});
                }}
                disabled={savingPlaceDaysForId === item.id}
                className="rounded-full border border-[#BFDBFE] bg-white px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-[#1565C0]"
              >
                Réinitialiser
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="relative bg-accent text-accent-foreground px-6 pt-12 pb-6 flex-shrink-0">
        <MemphisDecor />
        <button
          onClick={onBack}
          data-tutorial-id="guide-back"
          className="relative z-10 flex items-center gap-1 text-white/80 text-sm font-bold mb-3"
        >
          <ChevronLeft size={18} /> Accueil
        </button>
        <h1 data-tutorial-id="guide-title" className="relative z-10 text-2xl font-black">Guide du séjour 📖</h1>
        <div>
          <ContentOfflineStatusBadge section="stay-guide" isOnline={isOnline} />
        </div>

      </div>

      <div className="flex-shrink-0 bg-card border-b border-border shadow-sm">
        <button
          onClick={() => setFilterOpen((prev) => !prev)}
          data-tutorial-id="guide-day-selector"
          className="w-full flex items-center justify-between px-4 py-3 text-left"
        >
          <span className="text-left min-w-0">
            <span className="block text-sm font-black text-foreground">
              {hasFilters ? "Filtres actifs" : "Tous les lieux"}
            </span>
            {hasFilters ? (
              <span className="block text-xs text-muted-foreground mt-0.5 truncate">
                {[
                  filterDays.length > 0 &&
                    filterDays.map((d) => formatTripDayLabel(d, tripStartDate)).join(", "),
                  filterVilles.length > 0 && filterVilles.join(", "),
                  filterTags.length > 0 && filterTags.join(", "),
                  filterName.trim() && `"${filterName.trim()}"`,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            ) : (
              <span className="block text-xs text-muted-foreground mt-0.5">Appuyer pour filtrer</span>
            )}
          </span>
          <div className="flex items-center gap-2 flex-shrink-0 ml-2">
            {hasFilters && (
              <span className="text-[10px] font-black bg-accent text-accent-foreground rounded-full px-2 py-0.5">
                {activeFilterCount}
              </span>
            )}
            <ChevronDown
              size={18}
              className={`transition-transform text-muted-foreground ${filterOpen ? "rotate-180" : ""}`}
            />
          </div>
        </button>

        {filterOpen && (
          <div className="px-4 pb-4 space-y-3 overflow-y-auto max-h-[45vh] border-t border-border">

            {/* Date */}
            <div className="pt-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1.5">Date</p>
            <button
              type="button"
              data-tutorial-id="guide-date-dropdown"
              onClick={() => setDayDropdownOpen((p) => !p)}
              className={`w-full flex items-center justify-between rounded-xl border px-3 py-2.5 text-sm text-left transition-colors ${
                filterDays.length > 0
                  ? "border-accent bg-accent/5 text-accent font-bold"
                  : "border-border bg-muted text-foreground"
              }`}
            >
              <span className="truncate">
                {filterDays.length === 0
                  ? "Tous les jours"
                  : filterDays.length <= 2
                  ? filterDays.map((d) => formatTripDayLabel(d, tripStartDate)).join(", ")
                  : `${filterDays.length} jours sélectionnés`}
              </span>
              <ChevronDown size={15} className={`flex-shrink-0 ml-2 transition-transform ${dayDropdownOpen ? "rotate-180" : ""}`} />
            </button>
            {dayDropdownOpen && (
              <div className="mt-1 border border-border rounded-xl overflow-hidden">
                {JOURS_DESTINATIONS.map((entry) => {
                  const active = filterDays.includes(entry.jour);
                  return (
                    <button
                      key={entry.jour}
                      type="button"
                      data-tutorial-id={`guide-day-option-${entry.jour}`}
                      onClick={() =>
                        setFilterDays((prev) =>
                          active
                            ? prev.filter((d) => d !== entry.jour)
                            : [...prev, entry.jour].sort((a, b) => a - b)
                        )
                      }
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-left border-b border-border/40 last:border-b-0 active:bg-muted"
                    >
                      <span className={`w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center ${active ? "bg-accent border-accent" : "border-border"}`}>
                        {active && <Check size={10} className="text-accent-foreground" />}
                      </span>
                      <span className={active ? "font-bold text-foreground" : "text-muted-foreground"}>
                        {formatTripDayLabel(entry.jour, tripStartDate)}
                        {entry.jour === currentDay && <span className="ml-1 text-[10px] text-primary font-bold">· auj.</span>}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
            </div>

            {/* Ville — options filtrées par les dates sélectionnées */}
            {availableVillesForFilter.length > 0 && (
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1.5">Ville</p>
                <button
                  type="button"
                  onClick={() => setVilleDropdownOpen((p) => !p)}
                  className={`w-full flex items-center justify-between rounded-xl border px-3 py-2.5 text-sm text-left transition-colors ${
                    filterVilles.length > 0
                      ? "border-accent bg-accent/5 text-accent font-bold"
                      : "border-border bg-muted text-foreground"
                  }`}
                >
                  <span className="truncate">
                    {filterVilles.length === 0
                      ? "Toutes les villes"
                      : filterVilles.length <= 2
                      ? filterVilles.join(", ")
                      : `${filterVilles.length} villes sélectionnées`}
                  </span>
                  <ChevronDown size={15} className={`flex-shrink-0 ml-2 transition-transform ${villeDropdownOpen ? "rotate-180" : ""}`} />
                </button>
                {villeDropdownOpen && (
                  <div className="mt-1 border border-border rounded-xl overflow-hidden">
                    {availableVillesForFilter.map((ville) => {
                      const active = filterVilles.includes(ville);
                      return (
                        <button
                          key={ville}
                          type="button"
                          onClick={() =>
                            setFilterVilles((prev) =>
                              active ? prev.filter((v) => v !== ville) : [...prev, ville].sort()
                            )
                          }
                          className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-left border-b border-border/40 last:border-b-0 active:bg-muted"
                        >
                          <span className={`w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center ${active ? "bg-accent border-accent" : "border-border"}`}>
                            {active && <Check size={10} className="text-accent-foreground" />}
                          </span>
                          <span className={active ? "font-bold text-foreground" : "text-muted-foreground"}>{ville}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Type — options filtrées par dates + villes */}
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1.5">Type</p>
              <button
                type="button"
                onClick={() => setTagDropdownOpen((p) => !p)}
                className={`w-full flex items-center justify-between rounded-xl border px-3 py-2.5 text-sm text-left transition-colors ${
                  filterTags.length > 0
                    ? "border-accent bg-accent/5 text-accent font-bold"
                    : "border-border bg-muted text-foreground"
                }`}
              >
                <span className="truncate">
                  {filterTags.length === 0
                    ? "Tous les types"
                    : filterTags.length <= 2
                    ? filterTags.join(", ")
                    : `${filterTags.length} types sélectionnés`}
                </span>
                <ChevronDown size={15} className={`flex-shrink-0 ml-2 transition-transform ${tagDropdownOpen ? "rotate-180" : ""}`} />
              </button>
              {tagDropdownOpen && (
                <div className="mt-1 border border-border rounded-xl overflow-hidden">
                  {availableTagsForFilter.map((tag) => {
                    const active = filterTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() =>
                          setFilterTags((prev) =>
                            active ? prev.filter((t) => t !== tag) : [...prev, tag].sort()
                          )
                        }
                        className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-left border-b border-border/40 last:border-b-0 active:bg-muted"
                      >
                        <span className={`w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center ${active ? "bg-accent border-accent" : "border-border"}`}>
                          {active && <Check size={10} className="text-accent-foreground" />}
                        </span>
                        <span className={active ? "font-bold text-foreground" : "text-muted-foreground"}>{tag}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Recherche par nom */}
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1.5">Recherche</p>
              <input
                type="text"
                value={filterName}
                onChange={(e) => setFilterName(e.target.value)}
                placeholder="Nom du lieu..."
                className="w-full rounded-xl border border-border bg-muted px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
              />
            </div>

            {hasFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="text-[11px] font-black uppercase tracking-widest text-accent underline"
              >
                Effacer tous les filtres
              </button>
            )}
          </div>
        )}
      </div>

      {isOwner && (
        <div className="px-4 mt-3 flex flex-wrap gap-2 flex-shrink-0">
          <button
            onClick={() => (isAddingPlace ? setIsAddingPlace(false) : openPlaceCreateForm())}
            className="ml-auto inline-flex items-center gap-1 rounded-xl bg-[#E3F2FD] px-3 py-2 text-xs font-black uppercase tracking-widest text-[#1565C0]"
          >
            <Plus size={14} /> {isAddingPlace ? "Annuler" : "Ajouter une visite"}
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {isAddingPlace && renderPlaceFormEditor()}
        {filteredGroups.length === 0 ? (
          <div className="px-2 py-10 text-center">
            <p className="text-sm text-muted-foreground">
              {hasFilters
                ? "Aucun lieu ne correspond aux filtres."
                : "Aucune visite prévue."}
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {filteredGroups.map(({ entry, places }) => (
              <div key={`section-${entry.jour}`} className="space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-sm font-black uppercase tracking-widest text-accent">
                    {formatTripDayLabel(entry.jour, tripStartDate)}
                  </h2>
                  <span className="text-sm font-semibold text-muted-foreground">
                    — {entry.destination}
                  </span>
                  {entry.jour === currentDay && (
                    <span className="text-[10px] font-black uppercase tracking-widest text-primary bg-primary/10 rounded-full px-2 py-0.5">
                      aujourd'hui
                    </span>
                  )}
                </div>
                {places.map((item) =>
                  renderPlaceCard(item, entry.jour, `day${entry.jour}-`)
                )}
              </div>
            ))}
          </div>
        )}
        <div className="h-2" />
      </div>
    </div>
  );
}

// ─── HISTOIRE SCREEN ─────────────────────────────────────────────────────────

function HistoireScreen({
  topics,
  onBack,
  onTopicSelect,
  isOnline,
}: {
  topics: typeof HISTOIRE_TOPICS;
  onBack: () => void;
  onTopicSelect: (id: string) => void;
  isOnline: boolean;
}) {
  return (
    <ContentListScreen
      items={topics}
      headerEmoji="🏛️"
      headerTitle="Histoire de Turquie"
      headerSubtitle={`${topics.length} rubriques à explorer`}
      offlineSection="history"
      isOnline={isOnline}
      onBack={onBack}
      onItemSelect={onTopicSelect}
    />
  );
}

// ─── GÉOGRAPHIE ET ÉCONOMIE SCREEN ──────────────────────────────────────────

function GeographieScreen({
  topics,
  onBack,
  onTopicSelect,
  isOnline,
}: {
  topics: typeof GEOGRAPHIE_ECONOMIE_TOPICS;
  onBack: () => void;
  onTopicSelect: (id: string) => void;
  isOnline: boolean;
}) {
  return (
    <ContentListScreen
      items={topics}
      headerEmoji="🗺️"
      headerTitle="Géographie et Économie"
      headerSubtitle={`${topics.length} rubriques à explorer`}
      offlineSection="geography-economy"
      isOnline={isOnline}
      onBack={onBack}
      onItemSelect={onTopicSelect}
    />
  );
}

// ─── CULTURE ET TRADITION SCREEN ────────────────────────────────────────────

function CultureScreen({
  topics,
  onBack,
  onTopicSelect,
  isOnline,
}: {
  topics: typeof CULTURE_TRADITION_TOPICS;
  onBack: () => void;
  onTopicSelect: (id: string) => void;
  isOnline: boolean;
}) {
  return (
    <ContentListScreen
      items={topics}
      headerEmoji="🎭"
      headerTitle="Culture et Tradition"
      headerSubtitle={`${topics.length} rubriques à explorer`}
      offlineSection="culture-tradition"
      isOnline={isOnline}
      onBack={onBack}
      onItemSelect={onTopicSelect}
    />
  );
}

// ─── CONTENT DETAIL SCREEN (used by Place and Histoire topic) ──────────────

// Formatage léger pour les textes "history" (places.ts, histoire.ts,
// culture-tradition.ts, geographie-economie.ts) : "\n" dans le texte source
// crée un retour à la ligne, "**mot**" met "mot" en gras. Volontairement
// minimal (pas de vraie syntaxe Markdown complète) pour rester simple à
// écrire directement dans les fichiers de contenu.
function renderFormattedText(text: string | string[] | null | undefined) {
  const renderTextWithLinks = (rawText: string, keyPrefix: string): ReactNode[] => {
    const urlRegex = /(https?:\/\/[^\s)]+|www\.[^\s)]+)/g;
    const chunks: ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null = null;

    while ((match = urlRegex.exec(rawText)) !== null) {
      const found = match[0];
      const index = match.index;
      if (index > lastIndex) {
        chunks.push(
          <span key={`${keyPrefix}-txt-${lastIndex}`}>
            {rawText.slice(lastIndex, index)}
          </span>
        );
      }

      const href = found.startsWith("http") ? found : `https://${found}`;
      chunks.push(
        <a
          key={`${keyPrefix}-url-${index}`}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 text-accent font-semibold break-all"
        >
          {found}
        </a>
      );
      lastIndex = index + found.length;
    }

    if (lastIndex < rawText.length) {
      chunks.push(
        <span key={`${keyPrefix}-txt-tail`}>
          {rawText.slice(lastIndex)}
        </span>
      );
    }

    return chunks.length > 0 ? chunks : [<span key={`${keyPrefix}-txt-only`}>{rawText}</span>];
  };

  // Tolérance : si le contenu a été écrit par erreur comme un tableau de
  // chaînes (ex: history: ["...", "**Titre**", "..."]), on le rejoint en une
  // seule chaîne plutôt que de planter — l'écran de détail ne doit jamais
  // afficher une page blanche à cause d'une erreur de syntaxe dans le contenu.
  const normalized = Array.isArray(text) ? text.join("\n") : text ?? "";

  return normalized
    .split("\n")
    .filter((paragraph) => paragraph.trim().length > 0)
    .map((paragraph, pIndex) => (
      <p key={pIndex} className={pIndex > 0 ? "mt-3" : undefined}>
        {paragraph.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
          part.startsWith("**") && part.endsWith("**") ? (
            <strong key={i} className="font-black text-foreground">
              {renderTextWithLinks(part.slice(2, -2), `p${pIndex}-b${i}`)}
            </strong>
          ) : (
            <span key={i}>{renderTextWithLinks(part, `p${pIndex}-n${i}`)}</span>
          )
        )}
      </p>
    ));
}

function ContentDetailScreen({
  item,
  onBack,
  onOpenVisiteGuidee,
  onOpenInternalLink,
  visiteGuideeCtaText = "Voir le guide de visite complet",
  visiteGuideeCtaSubtext = "Histoire détaillée, salle par salle",
  extraSection,
  heroReactionCounts,
  offlineSection,
  isOnline,
  isOwner = false,
  onSaveOverride,
}: {
  item: ContentTopic;
  onBack: () => void;
  onOpenVisiteGuidee?: (item: ContentTopic) => void;
  onOpenInternalLink?: (url: string) => boolean;
  visiteGuideeCtaText?: string;
  visiteGuideeCtaSubtext?: string;
  extraSection?: ReactNode;
  heroReactionCounts?: { likes: number; dislikes: number };
  offlineSection: OfflineSectionKey;
  isOnline: boolean;
  // Correction/enrichissement de ce contenu par le propriétaire (name,
  // shortDesc, historyLabel/history, anecdotesLabel/anecdotes). Absent =
  // pas d'édition possible sur cet écran (ex: guide de visite détaillé).
  isOwner?: boolean;
  onSaveOverride?: (patch: ContentOverridePatch | null) => void;
}) {
  const [isEditingContent, setIsEditingContent] = useState(false);
  const [draftName, setDraftName] = useState(item.name);
  const [draftShortDesc, setDraftShortDesc] = useState(item.shortDesc);
  const [draftHistoryLabel, setDraftHistoryLabel] = useState(item.historyLabel ?? "");
  const [draftHistory, setDraftHistory] = useState(item.history ?? "");
  const [draftAnecdotesLabel, setDraftAnecdotesLabel] = useState(item.anecdotesLabel ?? "");
  const [draftAnecdotes, setDraftAnecdotes] = useState((item.anecdotes ?? []).join("\n"));

  const openContentEditor = () => {
    setDraftName(item.name);
    setDraftShortDesc(item.shortDesc);
    setDraftHistoryLabel(item.historyLabel ?? "");
    setDraftHistory(item.history ?? "");
    setDraftAnecdotesLabel(item.anecdotesLabel ?? "");
    setDraftAnecdotes((item.anecdotes ?? []).join("\n"));
    setIsEditingContent(true);
  };

  const saveContentEditor = () => {
    const anecdotes = draftAnecdotes
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
    const trimmedHistoryLabel = draftHistoryLabel.trim();
    const trimmedAnecdotesLabel = draftAnecdotesLabel.trim();
    onSaveOverride?.({
      name: draftName.trim() || item.name,
      shortDesc: draftShortDesc.trim() || item.shortDesc,
      ...(trimmedHistoryLabel ? { historyLabel: trimmedHistoryLabel } : {}),
      history: draftHistory.trim() || item.history,
      ...(trimmedAnecdotesLabel ? { anecdotesLabel: trimmedAnecdotesLabel } : {}),
      anecdotes: anecdotes.length > 0 ? anecdotes : item.anecdotes,
    });
    setIsEditingContent(false);
  };

  const resetContentEditor = () => {
    onSaveOverride?.(null);
    setIsEditingContent(false);
  };
  const visiteGuidee = VISITES_GUIDEES[item.id];
  const autoReservationLinks = useMemo(() => getAutoReservationLinksForPlace(item.id), [item.id]);
  const usefulLinks = useMemo(() => {
    const merged = [...(item.links ?? []), ...autoReservationLinks];
    const byUrl = new Map<string, { label: string; url: string }>();
    for (const link of merged) {
      if (!byUrl.has(link.url)) {
        byUrl.set(link.url, link);
      }
    }
    return Array.from(byUrl.values());
  }, [autoReservationLinks, item.links]);
  const reservationLinks = useMemo(
    () => usefulLinks.filter((link) => link.url.startsWith(INTERNAL_DOCUMENT_LINK_PREFIX)),
    [usefulLinks]
  );
  const externalUsefulLinks = useMemo(
    () => usefulLinks.filter((link) => !link.url.startsWith(INTERNAL_DOCUMENT_LINK_PREFIX)),
    [usefulLinks]
  );
  // item.image/photos absents pour une visite ajoutée par le propriétaire
  // (pas de pipeline d'upload dans l'appli) : pas de héros photo ni galerie
  // dans ce cas plutôt que d'afficher une image cassée.
  const photos = item.photos?.length ? item.photos : item.image ? [item.image] : [];
  const heroPhoto = photos[0];
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [canSeekAudio, setCanSeekAudio] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [realDuration, setRealDuration] = useState<string | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const { coords: deviceCoords } = useDeviceLocation();
  const destinationCoords = item.gps ? parseGpsString(item.gps) : null;
  const canPlayAudio = Boolean(item.audioSrc);

  const openUsefulLink = (url: string) => {
    if (onOpenInternalLink?.(url)) {
      return;
    }
    openExternalWindow(url);
  };

  useEffect(() => {
    const audio = new Audio(item.audioSrc ?? "");
    audio.muted = isMuted;
    audioRef.current = audio;
    setIsPlaying(false);
    setProgress(0);
    setCanSeekAudio(false);
    setAudioError(null);
    setRealDuration(null);

    const handleLoadedMetadata = () => {
      const formatted = formatDuration(audio.duration);
      if (formatted) {
        setRealDuration(formatted);
      }
      setCanSeekAudio(Number.isFinite(audio.duration) && audio.duration > 0);
    };

    const handleTimeUpdate = () => {
      const duration = audio.duration || 0;
      const nextProgress = duration > 0 ? (audio.currentTime / duration) * 100 : 0;
      setProgress(nextProgress);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setProgress(100);
    };

    const handleError = () => {
      setIsPlaying(false);
      setAudioError("Audio indisponible pour le moment.");
    };

    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("error", handleError);

    return () => {
      audio.pause();
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("error", handleError);
      audioRef.current = null;
    };
  }, [item.audioSrc, item.id, isMuted]);

  const handleTogglePlay = async () => {
    if (!canPlayAudio || !audioRef.current) {
      setAudioError("Audio à ajouter pour ce contenu.");
      return;
    }

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      return;
    }

    try {
      await audioRef.current.play();
      setIsPlaying(true);
      setAudioError(null);
    } catch {
      setIsPlaying(false);
      setAudioError("Lecture impossible pour le moment.");
    }
  };

  const handleToggleMute = () => {
    setIsMuted((prev) => {
      const next = !prev;
      if (audioRef.current) {
        audioRef.current.muted = next;
      }
      return next;
    });
  };

  const handleSeek = (event: ChangeEvent<HTMLInputElement>) => {
    const nextProgress = Number(event.currentTarget.value);
    setProgress(nextProgress);

    const audio = audioRef.current;
    if (!audio || !Number.isFinite(audio.duration) || audio.duration <= 0) {
      return;
    }

    audio.currentTime = (nextProgress / 100) * audio.duration;
  };

  const openPlaceLocation = () => {
    if (!destinationCoords) return;
    openExternalWindow(buildGoogleMapsPlaceUrl(destinationCoords));
  };

  const openPlaceDirections = () => {
    if (!destinationCoords) return;
    openExternalWindow(buildGoogleMapsDirectionsUrl(destinationCoords, deviceCoords ?? undefined));
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="relative h-64 bg-muted flex-shrink-0">
        {heroPhoto ? (
          <img
            src={heroPhoto}
            alt={item.name}
            className="w-full h-full object-cover"
          />
        ) : (
          // Visite ajoutée par le propriétaire : pas de photo (pas de
          // pipeline d'upload dans l'appli), on affiche un repère à la place.
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            <MapPin size={48} strokeWidth={1.5} />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
        <button
          onClick={onBack}
          data-tutorial-id="place-back"
          className="absolute top-12 left-4 bg-black/40 backdrop-blur-sm text-white rounded-full p-2.5"
        >
          <ChevronLeft size={20} />
        </button>
        {heroReactionCounts && heroReactionCounts.likes + heroReactionCounts.dislikes > 0 && (
          <ReactionCountersBadge
            likes={heroReactionCounts.likes}
            dislikes={heroReactionCounts.dislikes}
            className="absolute bottom-4 right-4"
          />
        )}
        <div className="absolute bottom-4 left-4 right-4">
          <span className="text-xs font-extrabold text-secondary uppercase tracking-widest">
            {item.tag}
          </span>
          <h1 className="text-xl font-black text-white mt-1 leading-tight">
            {item.name}
          </h1>
          <ContentOfflineStatusBadge section={offlineSection} isOnline={isOnline} />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isOwner && onSaveOverride && (
          <div className="px-4 mt-4">
            {isEditingContent ? (
              <div className="rounded-2xl border border-[#BFDBFE] bg-[#EFF6FF] p-4 space-y-3">
                <input
                  type="text"
                  value={draftName}
                  onChange={(event) => setDraftName(event.target.value)}
                  placeholder="Titre"
                  aria-label="Titre du contenu"
                  className="w-full rounded-xl border border-border px-3 py-2 text-sm bg-background text-foreground"
                />
                <input
                  type="text"
                  value={draftShortDesc}
                  onChange={(event) => setDraftShortDesc(event.target.value)}
                  placeholder="Description courte"
                  aria-label="Description courte du contenu"
                  className="w-full rounded-xl border border-border px-3 py-2 text-sm bg-background text-foreground"
                />
                <input
                  type="text"
                  value={draftHistoryLabel}
                  onChange={(event) => setDraftHistoryLabel(event.target.value)}
                  placeholder="Libellé de la section Histoire (ex: Histoire)"
                  aria-label="Libellé de la section Histoire"
                  className="w-full rounded-xl border border-border px-3 py-2 text-sm bg-background text-foreground"
                />
                <textarea
                  value={draftHistory}
                  onChange={(event) => setDraftHistory(event.target.value)}
                  placeholder="Texte de la section Histoire (gras avec **texte**)"
                  aria-label="Texte de la section Histoire"
                  rows={6}
                  className="w-full rounded-xl border border-border px-3 py-2 text-sm bg-background text-foreground resize-y"
                />
                <input
                  type="text"
                  value={draftAnecdotesLabel}
                  onChange={(event) => setDraftAnecdotesLabel(event.target.value)}
                  placeholder="Libellé de la section Anecdotes (ex: Le savais-tu ?)"
                  aria-label="Libellé de la section Anecdotes"
                  className="w-full rounded-xl border border-border px-3 py-2 text-sm bg-background text-foreground"
                />
                <textarea
                  value={draftAnecdotes}
                  onChange={(event) => setDraftAnecdotes(event.target.value)}
                  placeholder="Anecdotes, une par ligne"
                  aria-label="Anecdotes"
                  rows={4}
                  className="w-full rounded-xl border border-border px-3 py-2 text-sm bg-background text-foreground resize-y"
                />
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Astuce : gras avec **comme ceci** dans le texte d'histoire. Une anecdote par ligne. Ces
                  modifications sont visibles par toute la famille.
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={saveContentEditor}
                    className="inline-flex items-center gap-1 rounded-xl bg-[#1565C0] px-3 py-2 text-xs font-black uppercase tracking-widest text-white"
                  >
                    <Check size={14} />
                    Enregistrer
                  </button>
                  <button
                    onClick={() => setIsEditingContent(false)}
                    className="inline-flex items-center gap-1 rounded-xl bg-muted px-3 py-2 text-xs font-black uppercase tracking-widest text-muted-foreground"
                  >
                    <X size={14} />
                    Annuler
                  </button>
                  <button
                    onClick={resetContentEditor}
                    className="inline-flex items-center gap-1 rounded-xl bg-[#FDECEA] px-3 py-2 text-xs font-black uppercase tracking-widest text-[#B71C1C]"
                  >
                    Réinitialiser
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={openContentEditor}
                className="inline-flex items-center gap-1 rounded-full bg-[#E3F2FD] px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-[#1565C0]"
              >
                <Pencil size={12} />
                Modifier ce contenu
              </button>
            )}
          </div>
        )}

        {/* Audio player — n'apparaît que si audioTitle ET audioDuration sont renseignés */}
        {item.audioTitle && item.audioDuration && (
          <div
            data-tutorial-id="place-audio-player"
            className="mx-4 mt-4 bg-primary/10 rounded-2xl p-4 flex items-center gap-4"
          >
            <button
              onClick={handleTogglePlay}
              disabled={!canPlayAudio}
              className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0 shadow-md active:scale-95 transition-transform"
            >
              {isPlaying ? <Pause size={20} /> : <Play size={20} />}
            </button>
            <div className="flex-1">
              <p className="text-sm font-black text-foreground">
                {item.audioTitle}
              </p>
              <p className="text-xs text-muted-foreground">
                Durée : {realDuration ?? item.audioDuration}
              </p>
              <input
                type="range"
                min="0"
                max="100"
                step="0.1"
                value={progress}
                onChange={handleSeek}
                disabled={!canSeekAudio}
                aria-label="Avancer ou reculer dans l'audio"
                className="mt-2 h-6 w-full cursor-pointer accent-primary disabled:cursor-not-allowed disabled:opacity-50"
              />
              {!canPlayAudio && (
                <p className="text-xs text-muted-foreground mt-2">
                  Aucun fichier audio lié à ce contenu pour le moment.
                </p>
              )}
              {audioError && (
                <p className="text-xs text-destructive mt-2">{audioError}</p>
              )}
            </div>
            <button
              onClick={handleToggleMute}
              disabled={!canPlayAudio}
              aria-label={isMuted ? "Réactiver le son" : "Couper le son"}
              className="flex-shrink-0 text-primary active:scale-95 transition-transform disabled:opacity-40"
            >
              {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
          </div>
        )}

        {/* Gallery — absente pour une visite ajoutée sans photo */}
        {photos.length > 0 && (
          <div className="px-4 mt-5">
            <h2 data-tutorial-id="place-gallery-title" className="text-base font-black text-foreground mb-3">
              📷 Galerie
            </h2>
            <div className="grid grid-cols-3 gap-2">
              {photos.map((photo, index) => (
                <button
                  key={`${item.id}-photo-${index}`}
                  onClick={() => setLightboxIndex(index)}
                  className="aspect-square rounded-2xl overflow-hidden bg-muted active:scale-95 transition-transform"
                >
                  <img src={photo} alt={`${item.name} photo ${index + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>
        )}

        {lightboxIndex !== null && (
          <div
            className="fixed inset-0 z-50 bg-black/90 flex flex-col"
            onClick={() => setLightboxIndex(null)}
          >
            <div className="flex items-center justify-between px-4 pt-12 pb-3 flex-shrink-0">
              <span className="text-white/70 text-sm font-bold">
                {lightboxIndex + 1} / {photos.length}
              </span>
              <button
                onClick={() => setLightboxIndex(null)}
                aria-label="Fermer"
                className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div
              className="flex-1 flex items-center justify-center px-2 min-h-0"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={photos[lightboxIndex]}
                alt={`${item.name} photo ${lightboxIndex + 1}`}
                className="max-w-full max-h-full object-contain rounded-lg"
              />
            </div>

            {photos.length > 1 && (
              <div
                className="flex items-center justify-between px-4 pb-10 pt-3 flex-shrink-0"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() =>
                    setLightboxIndex((prev) =>
                      prev === null ? null : (prev - 1 + photos.length) % photos.length
                    )
                  }
                  aria-label="Photo précédente"
                  className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center text-white active:scale-95 transition-transform"
                >
                  <ChevronLeft size={20} />
                </button>
                <button
                  onClick={() =>
                    setLightboxIndex((prev) => (prev === null ? null : (prev + 1) % photos.length))
                  }
                  aria-label="Photo suivante"
                  className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center text-white active:scale-95 transition-transform"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            )}
          </div>
        )}

        {/* History — absente pour une visite ajoutée sans texte d'histoire */}
        {item.history && (
          <div className="px-4 mt-5">
            <h2 data-tutorial-id="place-history-title" className="text-base font-black text-foreground mb-2">
              📜 {item.historyLabel ?? "Histoire"}
            </h2>
            <div className="text-sm text-foreground/80 leading-relaxed">
              {renderFormattedText(item.history)}
            </div>
          </div>
        )}

        {destinationCoords && (
          <div className="px-4 mt-5">
            <h2 className="text-base font-black text-foreground mb-3">📍 Localisation</h2>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={openPlaceLocation}
                className="inline-flex items-center gap-1 rounded-xl bg-[#E3F2FD] px-3 py-2 text-xs font-black uppercase tracking-widest text-[#1565C0]"
              >
                <MapPin size={14} />
                Voir la carte
              </button>
              <button
                type="button"
                onClick={openPlaceDirections}
                className="inline-flex items-center gap-1 rounded-xl bg-[#E8F5E9] px-3 py-2 text-xs font-black uppercase tracking-widest text-[#2E7D32]"
              >
                <Plane size={14} />
                Y aller
              </button>
            </div>
          </div>
        )}

        {/* Anecdotes — absentes pour une visite ajoutée sans anecdotes */}
        {item.anecdotes && item.anecdotes.length > 0 && (
          <div className="px-4 mt-5 mb-6">
            <h2 data-tutorial-id="place-anecdotes-title" className="text-base font-black text-foreground mb-3">
              ✨ {item.anecdotesLabel ?? "Le savais-tu ?"}
            </h2>
            <div className="space-y-3">
              {item.anecdotes.map((anecdote, i) => (
                <div
                  key={i}
                  className="flex gap-2.5 rounded-2xl bg-[#FFF3E0] px-3.5 py-2"
                >
                  <span className="text-base leading-none flex-shrink-0 pt-0.5">💡</span>
                  <p className="text-sm leading-snug text-foreground/80">
                    {anecdote}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {usefulLinks.length > 0 ? (
          <div className="px-4 mb-6">
            <h2 className="text-base font-black text-foreground mb-3">🌐 Liens utiles</h2>
            {reservationLinks.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-2">
                {reservationLinks.map((link, index) => (
                  <button
                    key={`${item.id}-reservation-link-${index}`}
                    type="button"
                    onClick={() => openUsefulLink(link.url)}
                    title={link.label}
                    aria-label={link.label}
                    className="inline-flex items-center gap-1 rounded-full border border-[#90CAF9] bg-[#E3F2FD] px-3 py-1.5 text-[11px] font-black uppercase tracking-widest text-[#1565C0] active:scale-95 transition-transform"
                  >
                    Voir reservation
                    <ExternalLink size={12} />
                  </button>
                ))}
              </div>
            )}

            {externalUsefulLinks.length > 0 && (
              <div className="space-y-2">
                {externalUsefulLinks.map((link, index) => (
                  <button
                    key={`${item.id}-link-${index}`}
                    type="button"
                    onClick={() => openUsefulLink(link.url)}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card px-3.5 py-3 active:scale-95 transition-transform"
                  >
                    <span className="text-sm font-semibold text-foreground/90">{link.label}</span>
                    <ExternalLink size={16} className="text-muted-foreground flex-shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : null}

        {/* Guide de visite complet (uniquement si un contenu a été fourni) */}
        {onOpenVisiteGuidee && visiteGuidee && (
          <div className="px-4 mb-6">
            <button
              onClick={() => onOpenVisiteGuidee(item)}
              data-tutorial-id="place-guided-tour-cta"
              className="w-full flex items-center gap-3 bg-[#EFEBFF] rounded-2xl p-4 text-left active:scale-95 transition-transform"
            >
              <span className="text-2xl flex-shrink-0">📖</span>
              <div className="flex-1">
                <p className="text-sm font-black text-foreground">
                  {visiteGuideeCtaText}
                </p>
                {visiteGuideeCtaSubtext && (
                  <p className="text-xs text-muted-foreground">
                    {visiteGuideeCtaSubtext}
                  </p>
                )}
              </div>
              <ChevronRight size={20} className="text-muted-foreground flex-shrink-0" />
            </button>
          </div>
        )}

        {extraSection}
      </div>
    </div>
  );
}

// ─── PLACE DETAIL SCREEN ─────────────────────────────────────────────────────

// Carnet de visite : notes libres + photos ajoutées par un voyageur ou le
// propriétaire (le visiteur lit sans pouvoir écrire, cf. canWrite). Affiché
// avant "Avis de la famille" (PlaceCommentsSection) sur la fiche d'un lieu.
function CarnetDeVisiteSection({
  placeId,
  entries,
  profile,
  familyProfiles,
  onUpsert,
  onDelete,
}: {
  placeId: string;
  entries: Record<string, CarnetVisiteEntry>;
  profile: Profile;
  familyProfiles: Array<{ id: string; surname: string }>;
  onUpsert: (input: { placeId: string; text: string; photos: Record<string, string>; entryId?: string }) => void;
  onDelete: (placeId: string, entryId: string) => void;
}) {
  const canWrite = profile.role === "utilisateur" || profile.role === "proprietaire";
  // Lu une seule fois au montage : restaure le brouillon en cours si l'appli
  // a perdu le focus (autre appli, verrouillage d'écran...) pendant la saisie
  // (cf. CARNET_DRAFT_STORAGE_KEY).
  const storedDraftRef = useRef(readStoredCarnetDraft(placeId));
  const [editingEntryId, setEditingEntryId] = useState<string | null>(
    () => storedDraftRef.current?.editingEntryId ?? null
  );
  const [text, setText] = useState(() => storedDraftRef.current?.text ?? "");
  const [photos, setPhotos] = useState<string[]>(() => storedDraftRef.current?.photos ?? []);
  const [isFormOpen, setIsFormOpen] = useState(() => Boolean(storedDraftRef.current));
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [photoProcessing, setPhotoProcessing] = useState(false);
  const [textError, setTextError] = useState<string | null>(null);
  // Agrandissement d'une photo (entrée déjà enregistrée ou aperçu en cours de
  // saisie) : même pattern de lightbox que la galerie de ContentDetailScreen.
  const [lightboxPhotos, setLightboxPhotos] = useState<string[] | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // Brouillon debouncé (texte + photos déjà compressées) : même besoin que
  // PLACE_DRAFT_STORAGE_KEY pour le formulaire d'ajout de visite. Effacé
  // automatiquement une fois le formulaire fermé (annulation ou validation).
  useEffect(() => {
    const timeout = window.setTimeout(() => {
      if (!isFormOpen || (!text && photos.length === 0)) {
        localStorage.removeItem(CARNET_DRAFT_STORAGE_KEY);
        return;
      }
      const draft: StoredCarnetDraft = { placeId, editingEntryId, text, photos };
      try {
        localStorage.setItem(CARNET_DRAFT_STORAGE_KEY, JSON.stringify(draft));
      } catch {
        // Stockage plein ou indisponible : le brouillon reste fonctionnel en
        // mémoire pour la session en cours, seule la persistance est perdue.
      }
    }, 400);
    return () => window.clearTimeout(timeout);
  }, [placeId, editingEntryId, text, photos, isFormOpen]);

  const sortedEntries = Object.values(entries).sort((left, right) => left.createdAt - right.createdAt);

  // Le plafond de CARNET_PLACE_MAX_PHOTOS photos s'applique au LIEU entier,
  // toutes entrées et tous auteurs confondus — pas à l'entrée en cours. On
  // exclut l'entrée en cours d'édition (editingEntryId) du total "déjà pris"
  // : ses photos sont déjà comptées dans le brouillon `photos` ci-dessus, les
  // compter aussi ici les compterait deux fois.
  const photosUsedElsewhereOnPlace = Object.values(entries).reduce((sum, entry) => {
    if (editingEntryId && entry.entryId === editingEntryId) {
      return sum;
    }
    return sum + Object.keys(entry.photos).length;
  }, 0);
  const remainingPhotoSlotsForPlace = Math.max(
    0,
    CARNET_PLACE_MAX_PHOTOS - photosUsedElsewhereOnPlace - photos.length
  );

  const resolveAuthorSurname = (entry: CarnetVisiteEntry): string => {
    const profileEntry = familyProfiles.find((item) => item.id === entry.authorProfileId);
    if (!profileEntry) {
      return "Profil supprimé";
    }
    return profileEntry.surname || entry.authorSurnameSnapshot || "Profil supprimé";
  };

  function resetForm(): void {
    setEditingEntryId(null);
    setText("");
    setPhotos([]);
    setPhotoError(null);
    setTextError(null);
    setIsFormOpen(false);
    localStorage.removeItem(CARNET_DRAFT_STORAGE_KEY);
  }

  function startEditing(entry: CarnetVisiteEntry): void {
    setEditingEntryId(entry.entryId);
    setText(entry.text);
    setPhotos(Object.values(entry.photos));
    setPhotoError(null);
    setTextError(null);
    setIsFormOpen(true);
  }

  async function handlePhotoFileChange(event: ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.target.files?.[0];
    // Permet de resélectionner le même fichier plus tard.
    event.target.value = "";
    if (!file || remainingPhotoSlotsForPlace <= 0) return;

    setPhotoError(null);
    setPhotoProcessing(true);
    try {
      const dataUrl = await compressImageFileToDataUrl(file);
      setPhotos((previous) => [...previous, dataUrl]);
    } catch (error) {
      setPhotoError(
        error instanceof PlaceImageError ? error.message : "Impossible de traiter cette photo."
      );
    } finally {
      setPhotoProcessing(false);
    }
  }

  function removePhoto(index: number): void {
    setPhotos((previous) => previous.filter((_, photoIndex) => photoIndex !== index));
  }

  function handleSubmit(): void {
    const trimmedText = text.trim();
    if (!trimmedText && photos.length === 0) {
      setTextError("Ajoutez du texte ou une photo.");
      return;
    }
    if (trimmedText.length > CARNET_ENTRY_MAX_TEXT_LENGTH) {
      setTextError(`Le texte doit rester sous ${CARNET_ENTRY_MAX_TEXT_LENGTH} caractères.`);
      return;
    }
    setTextError(null);

    const photosById: Record<string, string> = {};
    photos.forEach((photo, index) => {
      photosById[`photo-${index}`] = photo;
    });

    onUpsert({ placeId, text: trimmedText, photos: photosById, entryId: editingEntryId ?? undefined });
    resetForm();
  }

  return (
    <>
      <div className="px-4 mb-6">
        <div className="rounded-2xl border border-border bg-card p-4">
          <h2 className="flex items-center gap-2 text-base font-black text-foreground">
            <BookOpen size={18} />
            Carnet de visite
          </h2>

        {sortedEntries.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Personne n'a encore ajouté de souvenir ici{canWrite ? ", soyez le premier" : ""}.
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            {sortedEntries.map((entry) => {
              const entryPhotos = Object.values(entry.photos);
              const isOwnEntry = entry.authorProfileId === profile.id;
              return (
                <div key={entry.entryId} className="rounded-xl border border-border/80 bg-background p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-black text-foreground">{resolveAuthorSurname(entry)}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(entry.updatedAt).toLocaleDateString("fr-FR")}
                      </p>
                    </div>
                    {isOwnEntry && (
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => startEditing(entry)}
                          className="text-muted-foreground"
                          aria-label="Modifier cette entrée du carnet"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => onDelete(placeId, entry.entryId)}
                          className="text-muted-foreground"
                          aria-label="Supprimer cette entrée du carnet"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                  {entry.text ? (
                    <p className="mt-2 text-sm text-foreground/85 break-words whitespace-pre-wrap">{entry.text}</p>
                  ) : null}
                  {entryPhotos.length > 0 && (
                    <div className="mt-2 grid grid-cols-3 gap-2">
                      {entryPhotos.map((photo, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => {
                            setLightboxPhotos(entryPhotos);
                            setLightboxIndex(index);
                          }}
                          className="h-20 rounded-lg overflow-hidden bg-muted active:scale-95 transition-transform"
                          aria-label="Voir la photo en plus grand"
                        >
                          <img
                            src={photo}
                            alt="Photo ajoutée au carnet de visite"
                            className="w-full h-full object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {canWrite && (
          <div className="mt-4 rounded-xl bg-muted/50 p-3">
            {isFormOpen ? (
              <>
                <p className="text-sm font-black text-foreground">
                  {editingEntryId ? "Modifier mon entrée" : "Ajouter un souvenir"}
                </p>
                <textarea
                  value={text}
                  onChange={(event) => {
                    setText(event.target.value);
                    setTextError(null);
                  }}
                  placeholder="Ce que vous avez appris, vu ou entendu pendant la visite..."
                  rows={4}
                  className="mt-2 w-full rounded-xl border border-border bg-background p-3 text-sm text-foreground outline-none focus:border-primary resize-y"
                />
                {photos.length > 0 && (
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {photos.map((photo, index) => (
                      <div key={index} className="relative h-20 rounded-lg overflow-hidden bg-muted">
                        <button
                          type="button"
                          onClick={() => {
                            setLightboxPhotos(photos);
                            setLightboxIndex(index);
                          }}
                          className="w-full h-full"
                          aria-label="Voir la photo en plus grand"
                        >
                          <img src={photo} alt="Aperçu de la photo" className="w-full h-full object-cover" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removePhoto(index)}
                          className="absolute top-1 right-1 rounded-full bg-background/90 p-1 text-muted-foreground shadow"
                          aria-label="Retirer la photo"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {remainingPhotoSlotsForPlace > 0 ? (
                  <label className="mt-2 inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-black uppercase tracking-widest cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoFileChange}
                      className="hidden"
                      aria-label="Ajouter une photo depuis l'appareil"
                    />
                    {photoProcessing
                      ? "Traitement en cours..."
                      : `Ajouter une photo (${photosUsedElsewhereOnPlace + photos.length}/${CARNET_PLACE_MAX_PHOTOS} pour ce lieu)`}
                  </label>
                ) : (
                  <p className="mt-2 text-xs font-semibold text-muted-foreground">
                    Limite de {CARNET_PLACE_MAX_PHOTOS} photos atteinte pour ce lieu (toutes entrées confondues).
                  </p>
                )}
                {photoError && <p className="mt-2 text-xs font-semibold text-destructive">{photoError}</p>}
                {textError && <p className="mt-2 text-xs text-destructive">{textError}</p>}
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={handleSubmit}
                    className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-black text-primary-foreground active:scale-95 transition-transform"
                  >
                    <Check size={16} /> {editingEntryId ? "Enregistrer" : "Ajouter au carnet"}
                  </button>
                  <button
                    onClick={resetForm}
                    className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-black text-foreground"
                  >
                    Annuler
                  </button>
                </div>
              </>
            ) : (
              <button
                onClick={() => setIsFormOpen(true)}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-black text-primary-foreground active:scale-95 transition-transform"
              >
                <Plus size={16} /> Ajouter un souvenir
              </button>
            )}
          </div>
        )}
      </div>
      </div>

      {lightboxPhotos && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex flex-col"
          onClick={() => setLightboxPhotos(null)}
        >
          <div className="flex items-center justify-between px-4 pt-12 pb-3 flex-shrink-0">
            <span className="text-white/70 text-sm font-bold">
              {lightboxIndex + 1} / {lightboxPhotos.length}
            </span>
            <button
              onClick={() => setLightboxPhotos(null)}
              aria-label="Fermer"
              className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center text-white"
            >
              <X size={18} />
            </button>
          </div>

          <div
            className="flex-1 flex items-center justify-center px-2 min-h-0"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={lightboxPhotos[lightboxIndex]}
              alt={`Photo du carnet de visite ${lightboxIndex + 1}`}
              className="max-w-full max-h-full object-contain rounded-lg"
            />
          </div>

          {lightboxPhotos.length > 1 && (
            <div
              className="flex items-center justify-between px-4 pb-10 pt-3 flex-shrink-0"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() =>
                  setLightboxIndex((prev) => (prev - 1 + lightboxPhotos.length) % lightboxPhotos.length)
                }
                aria-label="Photo précédente"
                className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center text-white active:scale-95 transition-transform"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                onClick={() => setLightboxIndex((prev) => (prev + 1) % lightboxPhotos.length)}
                aria-label="Photo suivante"
                className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center text-white active:scale-95 transition-transform"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}

// Carnet de visite pour une rubrique de contenu (Histoire, Culture et
// tradition, Géographie et économie) — même principe et même écriture
// réservée voyageur/propriétaire que CarnetDeVisiteSection ci-dessus, mais
// SANS photos (demande explicite ; les règles Firebase contentVisitLogs
// interdisent d'ailleurs ce champ côté serveur).
function CarnetDeVisiteContentSection({
  source,
  itemId,
  entries,
  profile,
  familyProfiles,
  onUpsert,
  onDelete,
}: {
  source: ContentSource;
  itemId: string;
  entries: Record<string, CarnetContentEntry>;
  profile: Profile;
  familyProfiles: Array<{ id: string; surname: string }>;
  onUpsert: (input: { source: ContentSource; itemId: string; text: string; entryId?: string }) => void;
  onDelete: (source: ContentSource, itemId: string, entryId: string) => void;
}) {
  const canWrite = profile.role === "utilisateur" || profile.role === "proprietaire";
  const storedDraftRef = useRef(readStoredCarnetContentDraft(source, itemId));
  const [editingEntryId, setEditingEntryId] = useState<string | null>(
    () => storedDraftRef.current?.editingEntryId ?? null
  );
  const [text, setText] = useState(() => storedDraftRef.current?.text ?? "");
  const [isFormOpen, setIsFormOpen] = useState(() => Boolean(storedDraftRef.current));
  const [textError, setTextError] = useState<string | null>(null);

  // Brouillon debouncé : même besoin que CarnetDeVisiteSection ci-dessus.
  useEffect(() => {
    const timeout = window.setTimeout(() => {
      if (!isFormOpen || !text) {
        localStorage.removeItem(CARNET_CONTENT_DRAFT_STORAGE_KEY);
        return;
      }
      const draft: StoredCarnetContentDraft = { source, itemId, editingEntryId, text };
      try {
        localStorage.setItem(CARNET_CONTENT_DRAFT_STORAGE_KEY, JSON.stringify(draft));
      } catch {
        // Stockage plein ou indisponible : le brouillon reste fonctionnel en
        // mémoire pour la session en cours, seule la persistance est perdue.
      }
    }, 400);
    return () => window.clearTimeout(timeout);
  }, [source, itemId, editingEntryId, text, isFormOpen]);

  const sortedEntries = Object.values(entries).sort((left, right) => left.createdAt - right.createdAt);

  const resolveAuthorSurname = (entry: CarnetContentEntry): string => {
    const profileEntry = familyProfiles.find((item) => item.id === entry.authorProfileId);
    if (!profileEntry) {
      return "Profil supprimé";
    }
    return profileEntry.surname || entry.authorSurnameSnapshot || "Profil supprimé";
  };

  function resetForm(): void {
    setEditingEntryId(null);
    setText("");
    setTextError(null);
    setIsFormOpen(false);
    localStorage.removeItem(CARNET_CONTENT_DRAFT_STORAGE_KEY);
  }

  function startEditing(entry: CarnetContentEntry): void {
    setEditingEntryId(entry.entryId);
    setText(entry.text);
    setTextError(null);
    setIsFormOpen(true);
  }

  function handleSubmit(): void {
    const trimmedText = text.trim();
    if (!trimmedText) {
      setTextError("Ajoutez du texte.");
      return;
    }
    if (trimmedText.length > CARNET_ENTRY_MAX_TEXT_LENGTH) {
      setTextError(`Le texte doit rester sous ${CARNET_ENTRY_MAX_TEXT_LENGTH} caractères.`);
      return;
    }
    setTextError(null);

    onUpsert({ source, itemId, text: trimmedText, entryId: editingEntryId ?? undefined });
    resetForm();
  }

  return (
    <div className="px-4 mb-6">
      <div className="rounded-2xl border border-border bg-card p-4">
        <h2 className="flex items-center gap-2 text-base font-black text-foreground">
          <BookOpen size={18} />
          Carnet de visite
        </h2>

        {sortedEntries.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Personne n'a encore ajouté de souvenir ici{canWrite ? ", soyez le premier" : ""}.
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            {sortedEntries.map((entry) => {
              const isOwnEntry = entry.authorProfileId === profile.id;
              return (
                <div key={entry.entryId} className="rounded-xl border border-border/80 bg-background p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-black text-foreground">{resolveAuthorSurname(entry)}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(entry.updatedAt).toLocaleDateString("fr-FR")}
                      </p>
                    </div>
                    {isOwnEntry && (
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => startEditing(entry)}
                          className="text-muted-foreground"
                          aria-label="Modifier cette entrée du carnet"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => onDelete(source, itemId, entry.entryId)}
                          className="text-muted-foreground"
                          aria-label="Supprimer cette entrée du carnet"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                  <p className="mt-2 text-sm text-foreground/85 break-words whitespace-pre-wrap">{entry.text}</p>
                </div>
              );
            })}
          </div>
        )}

        {canWrite && (
          <div className="mt-4 rounded-xl bg-muted/50 p-3">
            {isFormOpen ? (
              <>
                <p className="text-sm font-black text-foreground">
                  {editingEntryId ? "Modifier mon entrée" : "Ajouter un souvenir"}
                </p>
                <textarea
                  value={text}
                  onChange={(event) => {
                    setText(event.target.value);
                    setTextError(null);
                  }}
                  placeholder="Ce que vous avez appris, vu ou entendu..."
                  rows={4}
                  className="mt-2 w-full rounded-xl border border-border bg-background p-3 text-sm text-foreground outline-none focus:border-primary resize-y"
                />
                {textError && <p className="mt-2 text-xs text-destructive">{textError}</p>}
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={handleSubmit}
                    className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-black text-primary-foreground active:scale-95 transition-transform"
                  >
                    <Check size={16} /> {editingEntryId ? "Enregistrer" : "Ajouter au carnet"}
                  </button>
                  <button
                    onClick={resetForm}
                    className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-black text-foreground"
                  >
                    Annuler
                  </button>
                </div>
              </>
            ) : (
              <button
                onClick={() => setIsFormOpen(true)}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-black text-primary-foreground active:scale-95 transition-transform"
              >
                <Plus size={16} /> Ajouter un souvenir
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function PlaceCommentsSection({
  placeId,
  comments,
  profile,
  familyProfiles,
  onUpsert,
}: {
  placeId: string;
  comments: Record<string, PlaceComment>;
  profile: Profile;
  familyProfiles: Array<{ id: string; surname: string }>;
  onUpsert: (input: { placeId: string; reaction: PlaceCommentReaction | null; text: string; isNew?: boolean }) => void;
}) {
  const ownComment = comments[profile.id] ?? null;
  const [reaction, setReaction] = useState<PlaceCommentReaction | null>(ownComment?.reaction ?? null);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setReaction(ownComment?.reaction ?? null);
  }, [ownComment?.reaction]);

  const sortedComments = Object.values(comments).sort((left, right) => left.createdAt - right.createdAt);

  const resolveAuthorSurname = (comment: PlaceComment): string => {
    const profileEntry = familyProfiles.find((entry) => entry.id === comment.authorProfileId);
    if (!profileEntry) {
      return "Profil supprime";
    }
    return profileEntry.surname || comment.authorSurnameSnapshot || "Profil supprime";
  };

  const handleReactionChange = (newReaction: PlaceCommentReaction) => {
    setReaction(newReaction);
    onUpsert({ placeId, reaction: newReaction, text: ownComment!.text });
  };

  const handleSubmit = () => {
    if (ownComment) {
      const trimmedText = text.trim();
      if (!trimmedText) {
        setError("Ajoutez un commentaire.");
        return;
      }
      if (trimmedText.length > MAX_PLACE_COMMENT_LENGTH) {
        setError(`Le commentaire doit rester sous ${MAX_PLACE_COMMENT_LENGTH} caracteres.`);
        return;
      }
      setError(null);
      setText("");
      onUpsert({ placeId, reaction: null, text: trimmedText, isNew: true });
      return;
    }

    const trimmedText = text.trim();
    if (trimmedText.length > MAX_PLACE_COMMENT_LENGTH) {
      setError(`Le commentaire doit rester sous ${MAX_PLACE_COMMENT_LENGTH} caracteres.`);
      return;
    }

    if (!reaction && !trimmedText) {
      setError("Ajoutez un commentaire ou une reaction.");
      return;
    }

    setError(null);
    onUpsert({ placeId, reaction, text: trimmedText });
  };

  return (
    <div className="px-4 mb-6">
      <div className="rounded-2xl border border-border bg-card p-4">
        <h2 className="flex items-center gap-2 text-base font-black text-foreground">
          <MessageCircle size={18} />
          Avis de la famille
        </h2>

        {sortedComments.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">Soyez le premier a donner votre avis.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {sortedComments.map((comment) => {
              return (
                <div key={comment.commentId} className="rounded-xl border border-border/80 bg-background p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-black text-foreground">{resolveAuthorSurname(comment)}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(comment.updatedAt).toLocaleDateString("fr-FR")}
                      </p>
                    </div>
                    <span className="text-xs font-bold text-muted-foreground">
                      {comment.reaction === "like"
                        ? "J'aime"
                        : comment.reaction === "dislike"
                          ? "J'aime pas"
                          : "Commentaire"}
                    </span>
                  </div>
                  {comment.text ? (
                    <p className="mt-2 text-sm text-foreground/85 break-words">{comment.text}</p>
                  ) : (
                    <p className="mt-2 text-sm italic text-muted-foreground">Reaction sans commentaire.</p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-4 rounded-xl bg-muted/50 p-3">
          {ownComment ? (
            <>
              <p className="text-sm font-black text-foreground">Ma réaction</p>
              <div className="mt-2 flex gap-2">
                <button
                  onClick={() => handleReactionChange("like")}
                  className={`inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm font-bold transition-colors ${
                    reaction === "like"
                      ? "border-emerald-500 bg-emerald-500/15 text-emerald-700"
                      : "border-border text-foreground"
                  }`}
                >
                  <ThumbsUp size={16} /> J'aime
                </button>
                <button
                  onClick={() => handleReactionChange("dislike")}
                  className={`inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm font-bold transition-colors ${
                    reaction === "dislike"
                      ? "border-rose-500 bg-rose-500/15 text-rose-700"
                      : "border-border text-foreground"
                  }`}
                >
                  <ThumbsDown size={16} /> J'aime pas
                </button>
              </div>
              <p className="mt-4 text-sm font-black text-foreground">Ajouter un commentaire</p>
              <textarea
                value={text}
                onChange={(event) => {
                  const next = event.target.value;
                  if (next.length <= MAX_PLACE_COMMENT_LENGTH) {
                    setText(next);
                    setError(null);
                  }
                }}
                placeholder="Votre commentaire"
                rows={3}
                className="mt-2 w-full rounded-xl border border-border bg-background p-3 text-sm text-foreground outline-none focus:border-primary"
              />
              <p className="mt-1 text-right text-xs text-muted-foreground">{text.length}/{MAX_PLACE_COMMENT_LENGTH}</p>
              {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
              <button
                onClick={handleSubmit}
                className="mt-3 inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-black text-primary-foreground active:scale-95 transition-transform"
              >
                <Check size={16} /> Commenter
              </button>
            </>
          ) : (
            <>
              <p className="text-sm font-black text-foreground">Donner mon avis</p>
              <div className="mt-2 flex gap-2">
                <button
                  onClick={() => setReaction("like")}
                  className={`inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm font-bold transition-colors ${
                    reaction === "like"
                      ? "border-emerald-500 bg-emerald-500/15 text-emerald-700"
                      : "border-border text-foreground"
                  }`}
                >
                  <ThumbsUp size={16} /> J'aime
                </button>
                <button
                  onClick={() => setReaction("dislike")}
                  className={`inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm font-bold transition-colors ${
                    reaction === "dislike"
                      ? "border-rose-500 bg-rose-500/15 text-rose-700"
                      : "border-border text-foreground"
                  }`}
                >
                  <ThumbsDown size={16} /> J'aime pas
                </button>
              </div>
              <textarea
                value={text}
                onChange={(event) => {
                  const next = event.target.value;
                  if (next.length <= MAX_PLACE_COMMENT_LENGTH) {
                    setText(next);
                    setError(null);
                  }
                }}
                placeholder="Votre commentaire (optionnel)"
                rows={3}
                className="mt-3 w-full rounded-xl border border-border bg-background p-3 text-sm text-foreground outline-none focus:border-primary"
              />
              <p className="mt-1 text-right text-xs text-muted-foreground">{text.length}/{MAX_PLACE_COMMENT_LENGTH}</p>
              {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
              <button
                onClick={handleSubmit}
                className="mt-3 inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-black text-primary-foreground active:scale-95 transition-transform"
              >
                <Check size={16} /> Publier
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function PlaceScreen({
  place,
  profile,
  familyProfiles,
  comments,
  onUpsertComment,
  carnetEntries,
  onUpsertCarnetEntry,
  onDeleteCarnetEntry,
  onBack,
  onOpenVisiteGuidee,
  onOpenInternalLink,
  isOnline,
  onSaveContentOverride,
  isOwnerAddedPlace,
}: {
  place: Place;
  profile: Profile;
  familyProfiles: Array<{ id: string; surname: string }>;
  comments: Record<string, PlaceComment>;
  onUpsertComment: (input: { placeId: string; reaction: PlaceCommentReaction | null; text: string }) => void;
  carnetEntries: Record<string, CarnetVisiteEntry>;
  onUpsertCarnetEntry: (input: { placeId: string; text: string; photos: Record<string, string>; entryId?: string }) => void;
  onDeleteCarnetEntry: (placeId: string, entryId: string) => void;
  onBack: () => void;
  onOpenVisiteGuidee: (item: ContentTopic) => void;
  onOpenInternalLink: (url: string) => boolean;
  isOnline: boolean;
  onSaveContentOverride: (source: ContentSource, itemId: string, patch: ContentOverridePatch | null) => void;
  // Une visite ajoutée par le propriétaire (ownerGlobalPlaceAdditions) ne
  // passe pas par contentOverrides (voir placesWithOverrides dans App.tsx) :
  // on désactive donc ce mécanisme d'édition ici pour éviter un enregistrement
  // silencieusement sans effet — l'édition se fait via le Guide du séjour.
  isOwnerAddedPlace: boolean;
}) {
  const reactionCounts = getPlaceReactionCounts(comments);

  return (
    <ContentDetailScreen
      item={place}
      onBack={onBack}
      onOpenVisiteGuidee={onOpenVisiteGuidee}
      onOpenInternalLink={onOpenInternalLink}
      heroReactionCounts={reactionCounts}
      offlineSection="stay-guide"
      isOnline={isOnline}
      isOwner={profile.role === "proprietaire" && !isOwnerAddedPlace}
      onSaveOverride={(patch) => onSaveContentOverride("places", place.id, patch)}
      extraSection={
        <>
          <CarnetDeVisiteSection
            placeId={place.id}
            entries={carnetEntries}
            profile={profile}
            familyProfiles={familyProfiles}
            onUpsert={onUpsertCarnetEntry}
            onDelete={onDeleteCarnetEntry}
          />
          <PlaceCommentsSection
            placeId={place.id}
            comments={comments}
            profile={profile}
            familyProfiles={familyProfiles}
            onUpsert={onUpsertComment}
          />
        </>
      }
    />
  );
}

// ─── HISTOIRE TOPIC DETAIL SCREEN ────────────────────────────────────────────

function HistoireTopicScreen({
  topic,
  profile,
  familyProfiles,
  carnetEntries,
  onUpsertCarnetEntry,
  onDeleteCarnetEntry,
  onBack,
  onOpenVisiteGuidee,
  isOnline,
  onSaveContentOverride,
}: {
  topic: (typeof HISTOIRE_TOPICS)[0];
  profile: Profile;
  familyProfiles: Array<{ id: string; surname: string }>;
  carnetEntries: Record<string, CarnetContentEntry>;
  onUpsertCarnetEntry: (input: { source: ContentSource; itemId: string; text: string; entryId?: string }) => void;
  onDeleteCarnetEntry: (source: ContentSource, itemId: string, entryId: string) => void;
  onBack: () => void;
  onOpenVisiteGuidee: (item: ContentTopic) => void;
  isOnline: boolean;
  onSaveContentOverride: (source: ContentSource, itemId: string, patch: ContentOverridePatch | null) => void;
}) {
  return (
    <ContentDetailScreen
      item={topic}
      onBack={onBack}
      onOpenVisiteGuidee={onOpenVisiteGuidee}
      visiteGuideeCtaText="Pour en savoir plus"
      visiteGuideeCtaSubtext=""
      offlineSection="history"
      isOnline={isOnline}
      isOwner={profile.role === "proprietaire"}
      onSaveOverride={(patch) => onSaveContentOverride("histoire", topic.id, patch)}
      extraSection={
        <CarnetDeVisiteContentSection
          source="histoire"
          itemId={topic.id}
          entries={carnetEntries}
          profile={profile}
          familyProfiles={familyProfiles}
          onUpsert={onUpsertCarnetEntry}
          onDelete={onDeleteCarnetEntry}
        />
      }
    />
  );
}

function GeographieTopicScreen({
  topic,
  profile,
  familyProfiles,
  carnetEntries,
  onUpsertCarnetEntry,
  onDeleteCarnetEntry,
  onBack,
  onOpenVisiteGuidee,
  isOnline,
  onSaveContentOverride,
}: {
  topic: (typeof GEOGRAPHIE_ECONOMIE_TOPICS)[0];
  profile: Profile;
  familyProfiles: Array<{ id: string; surname: string }>;
  carnetEntries: Record<string, CarnetContentEntry>;
  onUpsertCarnetEntry: (input: { source: ContentSource; itemId: string; text: string; entryId?: string }) => void;
  onDeleteCarnetEntry: (source: ContentSource, itemId: string, entryId: string) => void;
  onBack: () => void;
  onOpenVisiteGuidee: (item: ContentTopic) => void;
  isOnline: boolean;
  onSaveContentOverride: (source: ContentSource, itemId: string, patch: ContentOverridePatch | null) => void;
}) {
  return (
    <ContentDetailScreen
      item={topic}
      onBack={onBack}
      onOpenVisiteGuidee={onOpenVisiteGuidee}
      visiteGuideeCtaText="Pour en savoir plus"
      visiteGuideeCtaSubtext=""
      offlineSection="geography-economy"
      isOnline={isOnline}
      isOwner={profile.role === "proprietaire"}
      onSaveOverride={(patch) => onSaveContentOverride("geographie-economie", topic.id, patch)}
      extraSection={
        <CarnetDeVisiteContentSection
          source="geographie-economie"
          itemId={topic.id}
          entries={carnetEntries}
          profile={profile}
          familyProfiles={familyProfiles}
          onUpsert={onUpsertCarnetEntry}
          onDelete={onDeleteCarnetEntry}
        />
      }
    />
  );
}

function CultureTopicScreen({
  topic,
  profile,
  familyProfiles,
  carnetEntries,
  onUpsertCarnetEntry,
  onDeleteCarnetEntry,
  onBack,
  onOpenVisiteGuidee,
  isOnline,
  onSaveContentOverride,
}: {
  topic: (typeof CULTURE_TRADITION_TOPICS)[0];
  profile: Profile;
  familyProfiles: Array<{ id: string; surname: string }>;
  carnetEntries: Record<string, CarnetContentEntry>;
  onUpsertCarnetEntry: (input: { source: ContentSource; itemId: string; text: string; entryId?: string }) => void;
  onDeleteCarnetEntry: (source: ContentSource, itemId: string, entryId: string) => void;
  onBack: () => void;
  onOpenVisiteGuidee: (item: ContentTopic) => void;
  isOnline: boolean;
  onSaveContentOverride: (source: ContentSource, itemId: string, patch: ContentOverridePatch | null) => void;
}) {
  return (
    <ContentDetailScreen
      item={topic}
      onBack={onBack}
      onOpenVisiteGuidee={onOpenVisiteGuidee}
      visiteGuideeCtaText="Pour en savoir plus"
      visiteGuideeCtaSubtext=""
      offlineSection="culture-tradition"
      isOnline={isOnline}
      isOwner={profile.role === "proprietaire"}
      onSaveOverride={(patch) => onSaveContentOverride("culture-tradition", topic.id, patch)}
      extraSection={
        <CarnetDeVisiteContentSection
          source="culture-tradition"
          itemId={topic.id}
          entries={carnetEntries}
          profile={profile}
          familyProfiles={familyProfiles}
          onUpsert={onUpsertCarnetEntry}
          onDelete={onDeleteCarnetEntry}
        />
      }
    />
  );
}

// ─── GUIDE DE VISITE SCREEN (contenu Word converti, sections + sommaire) ────

function VisiteGuideeScreen({
  guideId,
  title,
  onBack,
}: {
  guideId: string;
  title: string;
  onBack: () => void;
}) {
  const content = VISITES_GUIDEES[guideId];

  const handleTocClick = (sectionId: string) => {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="flex-1 overflow-y-auto bg-background">
      <div className="sticky top-0 z-10 bg-card border-b border-border px-4 py-3 flex items-center gap-3">
        <button
          onClick={onBack}
          className="w-9 h-9 rounded-full bg-muted flex items-center justify-center flex-shrink-0"
          aria-label="Retour"
        >
          <ChevronLeft size={18} />
        </button>
        <div className="min-w-0">
          <p className="text-xs font-extrabold text-muted-foreground uppercase tracking-widest">
            Guide de visite
          </p>
          <p className="text-base font-black text-foreground truncate">{title}</p>
        </div>
      </div>

      {!content ? (
        <div className="px-4 py-8 text-center">
          <p className="text-sm text-muted-foreground">
            Le guide de visite détaillé de ce lieu n'est pas encore disponible.
          </p>
        </div>
      ) : (
        <div className="px-4 py-5">
          {content.toc.length > 0 && (
            <div className="mb-6">
              <div className="flex items-baseline justify-between mb-3">
                <p className="text-xs font-extrabold text-muted-foreground uppercase tracking-widest">
                  Sommaire
                </p>
                <p className="text-xs text-muted-foreground">
                  {content.toc.length} étapes
                </p>
              </div>
              <div className="bg-card rounded-2xl border border-border overflow-hidden">
                {content.toc.map((section, i) => (
                  <button
                    key={section.id}
                    onClick={() => handleTocClick(section.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left active:bg-muted transition-colors ${
                      i !== content.toc.length - 1 ? "border-b border-border/60" : ""
                    }`}
                  >
                    <span className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-black flex items-center justify-center">
                      {i + 1}
                    </span>
                    <span className="text-sm text-foreground font-medium leading-snug">
                      {section.title}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div
            className="visite-guidee-content text-sm text-foreground/80 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: content.html }}
          />
        </div>
      )}
    </div>
  );
}

// ─── GAME SCREEN ─────────────────────────────────────────────────────────────

function GameScreen({
  gameState,
  currentQ,
  selectedAns,
  answers,
  correctCount,
  gameScore,
  riddleAnswer,
  riddleFeedback,
  riddleValidated,
  riddleSolved,
  riddleSelfCheckPending,
  challengeResponse,
  challengeDone,
  gameDay,
  canPickReplayDay,
  replayDayChoices,
  onReplayDayChange,
  scorePersistenceDisabled,
  challengeEnabled,
  onFinishAfterRiddle,
  onStart,
  onAnswer,
  onBack,
  onContinueToRiddle,
  onRiddleAnswerChange,
  onValidateRiddle,
  onDeclareRiddleSelfCheck,
  onContinueToChallenge,
  onChallengeResponseChange,
  onCompleteChallenge,
  currentDay,
  tripStartDate,
  alreadyPlayedToday,
  gameDayOverride,
  questions,
  riddle,
  challenge,
  scoring,
  canPlayArcade,
  onOpenArcade,
}: {
  gameState: GameState;
  currentQ: number;
  selectedAns: number | null;
  answers: number[];
  correctCount: number;
  gameScore: number;
  riddleAnswer: string;
  riddleFeedback: string | null;
  riddleValidated: boolean;
  riddleSolved: boolean;
  riddleSelfCheckPending: boolean;
  challengeResponse: string;
  challengeDone: boolean;
  gameDay: number;
  canPickReplayDay: boolean;
  replayDayChoices: number[];
  onReplayDayChange: (day: number) => void;
  scorePersistenceDisabled: boolean;
  challengeEnabled: boolean;
  onFinishAfterRiddle: () => void;
  onStart: () => void;
  onAnswer: (idx: number) => void;
  onBack: () => void;
  onContinueToRiddle: () => void;
  onRiddleAnswerChange: (value: string) => void;
  onValidateRiddle: () => void;
  onDeclareRiddleSelfCheck: (isCorrect: boolean) => void;
  onContinueToChallenge: () => void;
  onChallengeResponseChange: (value: string) => void;
  onCompleteChallenge: () => void;
  currentDay: number;
  tripStartDate: string | null;
  alreadyPlayedToday: GameHistoryEntry | null;
  gameDayOverride: "open" | "closed" | null;
  questions: QuizQuestion[];
  riddle: DailyRiddle;
  challenge: DailyChallenge;
  scoring: GameScoringConfig;
  canPlayArcade?: boolean;
  onOpenArcade?: () => void;
}) {
  // Garde-fou défensif : currentQ ne doit jamais dépasser la dernière
  // question (sinon questions[currentQ] est undefined et fait planter tout
  // l'écran — bug vécu le 2026-08-01 via une resynchronisation cloud trop
  // agressive, corrigé à la source, mais ce clamp reste une sécurité utile).
  const q = questions[Math.min(currentQ, questions.length - 1)];

  if (gameState === "intro") {
    const isClosedByOwner = gameDayOverride === "closed";
    const isLockedByCompletion =
      !scorePersistenceDisabled && gameDayOverride !== "open" && alreadyPlayedToday !== null;

    return (
      <div className="flex flex-col h-full overflow-y-auto">
        <div className="relative bg-[#FF6B3D] text-white px-6 pt-12 pb-6 flex-shrink-0">
          <MemphisDecor />
          <button
            onClick={onBack}
            data-tutorial-id="game-back"
            className="relative z-10 flex items-center gap-1 text-white/80 text-sm font-bold mb-3"
          >
            <ChevronLeft size={18} /> Accueil
          </button>
          <h1 data-tutorial-id="game-title" className="relative z-10 text-2xl font-black">
            Jeu du jour 🎮
          </h1>
          <p className="relative z-10 text-sm opacity-90 mt-1">
            Quiz Turquie — {formatTripDayLabel(gameDay, tripStartDate)}
          </p>
        </div>
        {isClosedByOwner ? (
          <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
            <div className="text-8xl mb-6">🔒</div>
            <h2 className="text-2xl font-black text-foreground mb-2">
              Jeu fermé pour le moment
            </h2>
            <p className="text-sm text-muted-foreground">
              Le propriétaire a fermé le défi de cette journée. Revenez un peu plus tard !
            </p>
          </div>
        ) : isLockedByCompletion ? (
          <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
            <div className="text-8xl mb-6">🎉</div>
            <h2 className="text-2xl font-black text-foreground mb-2">
              Défi du jour déjà relevé !
            </h2>
            <p className="text-5xl font-black text-primary mb-2">
              {alreadyPlayedToday?.totalScore} pts
            </p>
            <p className="text-sm text-muted-foreground">
              Revenez demain pour un nouveau défi !
            </p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
            <div className="text-8xl mb-6">🕌</div>
            <h2 className="text-2xl font-black text-foreground mb-2">
              Prêts pour le défi ?
            </h2>
            <p className="text-sm text-muted-foreground mb-2">
              {questions.length} questions sur les lieux visités aujourd&apos;hui en Turquie.
            </p>
            {scorePersistenceDisabled && (
              <p className="text-xs font-bold text-[#1565C0] bg-[#E3F2FD] rounded-xl px-4 py-3 mb-3 text-left">
                Mode rejeu post-voyage: vous pouvez rejouer librement, sur le jour de votre choix. Les
                points affichés sont informatifs et ne modifient plus les résultats officiels.
              </p>
            )}
            {canPickReplayDay && replayDayChoices.length > 0 && (
              <div className="w-full mb-4 text-left">
                <label className="block text-xs font-extrabold uppercase tracking-widest text-muted-foreground mb-1">
                  Jour à rejouer
                </label>
                <select
                  value={gameDay}
                  onChange={(event) => onReplayDayChange(Number(event.target.value))}
                  className="w-full rounded-xl bg-input-background px-3 py-3 text-sm font-semibold text-foreground outline-none ring-2 ring-transparent focus:ring-primary/30"
                >
                  {replayDayChoices.map((day) => (
                    <option key={day} value={day}>
                      {formatTripDayLabel(day, tripStartDate)}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <p className="text-sm text-muted-foreground mb-6">
              Chaque bonne réponse rapporte{" "}
              <strong className="text-primary">{scoring.questionPoints} points</strong> à l&apos;équipe !
            </p>
            <p className="text-xs font-bold text-[#C62828] bg-[#FFEBEE] rounded-xl px-4 py-3 mb-8 text-left">
              {challengeEnabled
                ? "⚠️ Une fois lancé, impossible de quitter le jeu avant de l&apos;avoir terminé (quiz, énigme puis défi final). Mieux vaut y jouer en fin de journée, une fois toutes les visites terminées."
                : "⚠️ Une fois lancé, terminez le quiz puis l&apos;énigme. Le défi final n&apos;est pas rejouable en mode post-voyage."}
            </p>
            <button
              onClick={onStart}
              className="bg-primary text-primary-foreground rounded-2xl py-5 px-10 text-lg font-black shadow-lg active:scale-95 transition-transform"
            >
              C&apos;est parti ! 🚀
            </button>
          </div>
        )}
      </div>
    );
  }

  if (gameState === "done") {
    const stars =
      correctCount === questions.length
        ? 3
        : correctCount >= Math.ceil(questions.length / 2)
          ? 2
          : 1;
    return (
      <div className="flex flex-col h-full overflow-y-auto">
        <div className="relative bg-[#FF6B3D] text-white px-6 pt-12 pb-6 flex-shrink-0">
          <MemphisDecor />
          <h1 className="relative z-10 text-2xl font-black">
            Résultat du quiz 🎉
          </h1>
        </div>
        <div className="flex-1 flex flex-col items-center px-4 pt-6 text-center">
          <div className="flex gap-1 mb-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Star
                key={i}
                size={36}
                className={
                  i < stars
                    ? "fill-[#FFD93D] text-[#FFD93D]"
                    : "text-muted-foreground/30"
                }
              />
            ))}
          </div>
          <p className="text-6xl font-black text-primary mb-1">{gameScore}</p>
          <p className="text-sm text-muted-foreground mb-6">
            points gagnés · {correctCount}/{questions.length} bonnes réponses
          </p>
          <div className="w-full space-y-2 mb-8">
            {questions.map((question, i) => {
              const userAns = answers[i];
              const correct = userAns === question.correct;
              return (
                <div
                  key={i}
                  className={`flex items-start gap-3 p-3.5 rounded-2xl text-left ${
                    correct ? "bg-[#E8F5E9]" : "bg-[#FFEBEE]"
                  }`}
                >
                  <span className="text-lg">{correct ? "✅" : "❌"}</span>
                  <div>
                    <p className="text-xs font-black text-foreground">
                      {question.q}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {question.expl}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
          <button
            onClick={onContinueToRiddle}
            className="w-full bg-primary text-primary-foreground rounded-2xl py-4 px-8 font-black active:scale-95 transition-transform mb-6"
          >
            Continuer vers l&apos;énigme 🧩
          </button>
        </div>
      </div>
    );
  }

  if (gameState === "riddle") {
    return (
      <div className="flex flex-col h-full overflow-y-auto">
        <div className="relative bg-[#FF6B3D] text-white px-6 pt-12 pb-6 flex-shrink-0">
          <MemphisDecor />
          <h1 className="relative z-10 text-2xl font-black">Énigme du jour 🧩</h1>
          <p className="relative z-10 text-sm opacity-90 mt-1">
            Bonus de {scoring.riddlePoints} points si la réponse est correcte
          </p>
        </div>
        <div className="flex-1 px-4 py-5">
          <div className="bg-card rounded-2xl border border-border p-5">
            <p className="text-sm font-black text-foreground mb-2">Énigme</p>
            <p className="text-sm text-foreground/80 leading-relaxed">
              {riddle.question}
            </p>
            <p className="text-xs text-muted-foreground mt-3">
              Indice: {riddle.hint}
            </p>
            <input
              value={riddleAnswer}
              onChange={(e) => onRiddleAnswerChange(e.target.value)}
              placeholder="Votre réponse"
              className="mt-4 w-full rounded-xl bg-input-background px-3 py-3 text-sm font-semibold text-foreground outline-none ring-2 ring-transparent focus:ring-primary/30"
              disabled={riddleValidated || riddleSelfCheckPending}
            />
            {!riddleValidated && !riddleSelfCheckPending && (
              <button
                onClick={onValidateRiddle}
                className="mt-3 w-full bg-primary text-primary-foreground rounded-xl py-3 text-sm font-black"
              >
                Valider la réponse
              </button>
            )}
            {riddleFeedback && (
              <p
                className={`mt-3 text-sm font-bold ${
                  riddleSelfCheckPending
                    ? "text-foreground"
                    : riddleSolved
                    ? "text-[#2E7D32]"
                    : "text-[#C62828]"
                }`}
              >
                {riddleFeedback}
              </p>
            )}
            {riddleSelfCheckPending && (
              <>
                <p className="mt-1 text-xs text-muted-foreground">
                  On vous fait confiance : soyez honnête 🙂
                </p>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => onDeclareRiddleSelfCheck(true)}
                    className="flex-1 bg-[#2E7D32] text-white rounded-xl py-3 text-sm font-black"
                  >
                    Oui, c'était ma réponse ✅
                  </button>
                  <button
                    onClick={() => onDeclareRiddleSelfCheck(false)}
                    className="flex-1 bg-[#C62828] text-white rounded-xl py-3 text-sm font-black"
                  >
                    Non, pas vraiment ❌
                  </button>
                </div>
              </>
            )}
          </div>

          {riddleValidated && challengeEnabled && (
            <button
              onClick={onContinueToChallenge}
              className="mt-4 w-full bg-primary text-primary-foreground rounded-2xl py-4 text-sm font-black"
            >
              Continuer vers le défi 💪
            </button>
          )}
          {riddleValidated && !challengeEnabled && (
            <button
              onClick={onFinishAfterRiddle}
              className="mt-4 w-full bg-primary text-primary-foreground rounded-2xl py-4 text-sm font-black"
            >
              Terminer le rejeu ✅
            </button>
          )}
        </div>
      </div>
    );
  }

  if (gameState === "challenge" && !challengeEnabled) {
    return (
      <div className="flex flex-col h-full overflow-y-auto">
        <div className="relative bg-[#FF6B3D] text-white px-6 pt-12 pb-6 flex-shrink-0">
          <MemphisDecor />
          <h1 className="relative z-10 text-2xl font-black">Jeu du jour 🎮</h1>
        </div>
        <div className="flex-1 px-4 py-6 flex flex-col items-center justify-center text-center">
          <p className="text-sm font-semibold text-muted-foreground mb-4">
            Le défi final n&apos;est pas disponible en mode post-voyage.
          </p>
          <button
            onClick={onFinishAfterRiddle}
            className="bg-primary text-primary-foreground rounded-2xl py-4 px-8 text-sm font-black"
          >
            Retour au jeu du jour
          </button>
        </div>
      </div>
    );
  }

  if (gameState === "challenge") {
    const trimmedChallengeResponse = challengeResponse.trim();
    return (
      <div className="flex flex-col h-full overflow-y-auto">
        <div className="relative bg-[#FF6B3D] text-white px-6 pt-12 pb-6 flex-shrink-0">
          <MemphisDecor />
          <h1 className="relative z-10 text-2xl font-black">Défi du jour 💪</h1>
          <p className="relative z-10 text-sm opacity-90 mt-1">
            {scoring.challengePoints} points si le défi est accompli
          </p>
        </div>
        <div className="flex-1 px-4 py-5">
          <div className="bg-card rounded-2xl border border-border p-5">
            <p className="text-sm font-black text-foreground mb-2">{challenge.title}</p>
            <p className="text-sm text-foreground/80 leading-relaxed">
              {challenge.description}
            </p>
            <p className="mt-3 text-xs font-bold text-[#6B3DFF] bg-[#F3E5F5] rounded-xl px-3 py-2.5 leading-relaxed">
              📌 {challenge.note}
            </p>
            <textarea
              value={challengeResponse}
              onChange={(e) => onChallengeResponseChange(e.target.value.slice(0, MAX_CHALLENGE_RESPONSE_LENGTH))}
              placeholder="Écrivez ici votre réponse au défi du jour"
              className="mt-4 min-h-28 w-full rounded-xl bg-input-background px-3 py-3 text-sm font-semibold text-foreground outline-none ring-2 ring-transparent focus:ring-primary/30"
              disabled={challengeDone}
            />
            <div className="mt-2 flex items-center justify-between gap-3 text-xs text-muted-foreground">
              <span>Cette réponse sera partagée avec les autres une fois tout le monde passé.</span>
              <span>{challengeResponse.length}/{MAX_CHALLENGE_RESPONSE_LENGTH}</span>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Une fois le défi terminé, le jeu du jour se termine : impossible d&apos;y revenir ensuite.
            </p>
            <button
              onClick={onCompleteChallenge}
              disabled={challengeDone || trimmedChallengeResponse.length === 0}
              className="mt-4 w-full rounded-xl py-3 text-sm font-black bg-primary text-primary-foreground disabled:opacity-50"
            >
              {challengeDone ? "Défi validé ✅" : "Terminer le défi du jour 🏆"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Playing
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="relative bg-[#FF6B3D] text-white px-6 pt-12 pb-5 flex-shrink-0">
        <MemphisDecor />
        <div className="relative z-10 flex items-center justify-between mb-3">
          <p className="text-sm font-extrabold opacity-80">
            Question {currentQ + 1} / {questions.length}
          </p>
          <p className="text-sm font-black bg-white/20 px-3 py-1 rounded-full">
            {answers.filter((a, i) => a === questions[i]?.correct).length * scoring.questionPoints} pts
          </p>
        </div>
        <div className="relative z-10 bg-white/20 rounded-full h-2">
          <div
            className="bg-secondary h-2 rounded-full transition-all duration-500"
            style={{ width: `${(currentQ / questions.length) * 100}%` }}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5">
        <div className="bg-card rounded-2xl shadow-sm p-5 mb-5 border border-border">
          <p className="text-lg font-black text-foreground leading-snug">
            {q.q}
          </p>
        </div>
        <div className="space-y-3">
          {q.options.map((opt, idx) => {
            const isSelected = selectedAns === idx;
            const isCorrect = idx === q.correct;
            let cls =
              "bg-card border-2 border-border text-foreground";
            if (selectedAns !== null) {
              if (isCorrect)
                cls =
                  "bg-[#E8F5E9] border-2 border-[#4CAF50] text-[#2E7D32]";
              else if (isSelected)
                cls =
                  "bg-[#FFEBEE] border-2 border-[#F44336] text-[#C62828]";
              else cls = "bg-card border-2 border-border text-muted-foreground";
            }
            return (
              <button
                key={idx}
                onClick={() => onAnswer(idx)}
                disabled={selectedAns !== null}
                className={`w-full ${cls} rounded-2xl px-5 py-4 text-left font-bold text-sm transition-all active:scale-95`}
              >
                {opt}
              </button>
            );
          })}
        </div>
        {selectedAns !== null && (
          <div
            className={`mt-4 p-4 rounded-2xl ${
              selectedAns === q.correct ? "bg-[#E8F5E9]" : "bg-[#FFF3E0]"
            }`}
          >
            <p className="text-sm text-foreground font-semibold">
              💡 {q.expl}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── RESULTS SCREEN ──────────────────────────────────────────────────────────

const SCORE_CHART_CONFIG: ChartConfig = {
  cumulativeScore: { label: "Score cumulé", color: "#6B3DFF" },
};

function ResultsScreen({
  onBack,
  history,
  familyMembers,
  currentDay,
  sharedChallengeDays,
  tripStartDate,
  currentProfileId,
  currentProfileRole,
  destinationSurveyDestination,
  destinationSurveyResults,
  scoring,
  challengeReactionsByDay,
  onReactToChallengeResponse,
  challengeBestVotesByDay,
  onVoteBestChallengeResponse,
}: {
  onBack: () => void;
  history: GameHistoryEntry[];
  familyMembers: ResultsFamilyMember[];
  currentDay: number;
  sharedChallengeDays: number[];
  tripStartDate: string | null;
  currentProfileId: string;
  currentProfileRole: Role | null;
  destinationSurveyDestination: string;
  destinationSurveyResults: ReturnType<typeof computeDestinationSurveyResults>["rows"];
  scoring: GameScoringConfig;
  challengeReactionsByDay: ChallengeReactionsByDay;
  onReactToChallengeResponse: (
    day: number,
    targetProfileId: string,
    emoji: ChallengeReactionEmoji
  ) => void;
  challengeBestVotesByDay: ChallengeBestVotesByDay;
  onVoteBestChallengeResponse: (day: number, targetProfileId: string) => void;
}) {
  const chartMembers = familyMembers.filter((member) => member.role === "utilisateur");
  // Story 25.2 AC7 : le proprietaire n'apparait jamais dans les resultats, mais
  // les visiteurs peuvent apparaitre dans l'affichage du sondage (sans points).
  const visibleDestinationSurveyResults = destinationSurveyResults.filter(
    (row) => row.role !== "proprietaire"
  );
  const [chartProfileId, setChartProfileId] = useState(
    () => chartMembers.some((m) => m.profileId === currentProfileId)
      ? currentProfileId
      : (chartMembers[0]?.profileId ?? currentProfileId)
  );
  // Jour actuellement déplié dans le détail "Par journée" (accordéon) ; null
  // = tout replié.
  const [expandedHistoryDay, setExpandedHistoryDay] = useState<number | null>(null);

  const chartProfile = chartMembers.find((m) => m.profileId === chartProfileId)
    ?? chartMembers.find((m) => m.profileId === currentProfileId)
    ?? chartMembers[0];
  const chartPoints = chartProfile
    ? buildScoreChartPoints(chartProfile.gameResults)
    : [];
  const currentProfileDestinationSurveyPoints =
    destinationSurveyResults.find((row) => row.profileId === currentProfileId)?.points ?? 0;

  const latestEntry = history.length > 0 ? history[history.length - 1] : null;
  const badges = computeBadges(history, (day) => getQuestionsForDay(day).length);
  const dailyScores = history.map((entry) => ({
    day: entry.day,
    location: entry.location,
    score: entry.totalScore,
  }));
  const total =
    dailyScores.reduce((sum, entry) => sum + entry.score, 0)
    + currentProfileDestinationSurveyPoints;
  const podium = computePodium(familyMembers);
  const medalByRank: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };
  const todayParticipants = familyMembers
    .filter((member) => member.role !== "proprietaire" && member.role !== "visiteur")
    .map((member) => ({
      profileId: member.profileId,
      surname: member.surname,
      hasPlayed: member.gameResults.some((entry) => entry.day === currentDay),
    }));
  const canViewSharedChallenges =
    currentProfileRole === "utilisateur";
  const sharedChallengeParticipants = familyMembers.filter(
    (member) => member.role !== "proprietaire" && member.role !== "visiteur"
  );
  const perDayChallengeData = sharedChallengeDays.map((day) => {
    const allEntries = sharedChallengeParticipants
      .map((member) => {
        const gameEntry = member.gameResults.find((entry) => entry.day === day) ?? null;
        const challengeResponse = gameEntry?.challengeResponse?.trim() ?? "";
        const reactionsForEntry = challengeReactionsByDay[day]?.[member.profileId] ?? {};
        const reactionCounts = CHALLENGE_REACTION_OPTIONS.map((option) => ({
          ...option,
          reactors: Object.values(reactionsForEntry)
            .filter((reaction) => reaction.emoji === option.value)
            .map((reaction) =>
              familyMembers.find((familyMember) => familyMember.profileId === reaction.reactorProfileId)?.surname
              ?? "Profil supprimé"
            )
            .sort((left, right) => left.localeCompare(right, "fr")),
        }));
        const bestVotesForEntry = challengeBestVotesByDay[day]?.[member.profileId] ?? {};
        const bestVoters = Object.values(bestVotesForEntry)
          .map((vote) =>
            familyMembers.find((familyMember) => familyMember.profileId === vote.voterProfileId)?.surname
            ?? "Profil supprimé"
          )
          .sort((left, right) => left.localeCompare(right, "fr"));
        return {
          profileId: member.profileId,
          surname: member.surname,
          response: challengeResponse,
          completedAt: gameEntry?.completedAt ?? "",
          currentUserReaction: reactionsForEntry[currentProfileId]?.emoji ?? null,
          reactionCounts,
          bestVoteCount: bestVoters.length,
          bestVoters,
          currentUserVotedBest: Boolean(bestVotesForEntry[currentProfileId]),
        };
      })
      .sort((left, right) => {
        const leftTs = Date.parse(left.completedAt);
        const rightTs = Date.parse(right.completedAt);
        const leftValid = Number.isFinite(leftTs);
        const rightValid = Number.isFinite(rightTs);
        if (leftValid && rightValid && leftTs !== rightTs) return leftTs - rightTs;
        if (leftValid !== rightValid) return leftValid ? -1 : 1;
        return left.surname.localeCompare(right.surname, "fr");
      });
    const isPastDay = day < currentDay;
    const entries = isPastDay
      ? allEntries.filter((entry) => entry.response.length > 0)
      : allEntries;
    const ready = isPastDay
      ? entries.length > 0
      : entries.length > 0 && entries.every((entry) => entry.response.length > 0);
    // Le(s) défi(s) en tête du vote trophée pour ce jour (0 vote = personne
    // en tête, pas de mise en avant).
    const topBestVoteCount = entries.reduce(
      (max, entry) => Math.max(max, entry.bestVoteCount),
      0
    );
    const entriesWithHighlight = entries.map((entry) => ({
      ...entry,
      isTopVoted: topBestVoteCount > 0 && entry.bestVoteCount === topBestVoteCount,
    }));
    return { day, entries: entriesWithHighlight, ready };
  });

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="relative bg-[#6B3DFF] text-white px-6 pt-12 pb-6 flex-shrink-0">
        <MemphisDecor />
        <button
          onClick={onBack}
          data-tutorial-id="results-back"
          className="relative z-10 flex items-center gap-1 text-white/80 text-sm font-bold mb-3"
        >
          <ChevronLeft size={18} /> Accueil
        </button>
        <h1 data-tutorial-id="results-title" className="relative z-10 text-2xl font-black">
          Tableau des scores 🏆
        </h1>
        <p className="relative z-10 text-sm opacity-90 mt-1">
          Les Explorateurs · {total} points au total
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Podium */}
        <div className="bg-card rounded-2xl shadow-sm border border-border p-5">
          <p className="text-xs font-extrabold text-muted-foreground uppercase tracking-widest mb-3">
            Podium 🏆
          </p>
          {podium.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucun profil (hors propriétaire) n&apos;a encore de score.
            </p>
          ) : (
            <div className="space-y-2">
              {podium.map((entry) => (
                <div
                  key={entry.profileId}
                  className={`flex items-center justify-between rounded-xl px-3 py-2.5 ${
                    entry.rank === 1
                      ? "bg-[#FFF3E0]"
                      : entry.rank === 2
                        ? "bg-[#F5F5F5]"
                        : entry.rank === 3
                          ? "bg-[#FBE9E7]"
                          : "bg-muted/50"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{medalByRank[entry.rank] ?? `#${entry.rank}`}</span>
                    <span className="text-sm font-black text-foreground">{entry.surname}</span>
                  </div>
                  <span className="text-sm font-black text-[#6B3DFF]">{entry.total} pts</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Participation au défi du jour */}
        <div className="bg-card rounded-2xl shadow-sm border border-border p-5">
          <p className="text-xs font-extrabold text-muted-foreground uppercase tracking-widest mb-3">
            Défi du {formatTripDayLabel(currentDay, tripStartDate)} — qui a joué ?
          </p>
          {todayParticipants.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucun participant à afficher.
            </p>
          ) : (
            <div className="space-y-2">
              {todayParticipants.map((participant) => (
                <div
                  key={participant.profileId}
                  className="flex items-center justify-between rounded-xl px-3 py-2.5 bg-muted/50"
                >
                  <span className="text-sm font-black text-foreground">
                    {participant.surname}
                  </span>
                  <span
                    className={`text-xs font-black ${
                      participant.hasPlayed ? "text-[#2E7D32]" : "text-muted-foreground"
                    }`}
                  >
                    {participant.hasPlayed ? "✅ A joué" : "⏳ N'a pas encore joué"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {latestEntry && (
          <div className="bg-card rounded-2xl shadow-sm border border-border p-5">
            <p className="text-xs font-extrabold text-muted-foreground uppercase tracking-widest mb-3">
              Dernière session
            </p>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl bg-[#FFF3E0] p-3">
                <p className="text-xs text-muted-foreground">Quiz</p>
                <p className="font-black text-foreground">{latestEntry.quizScore} pts</p>
              </div>
              <div className="rounded-xl bg-[#E8F5E9] p-3">
                <p className="text-xs text-muted-foreground">Énigme</p>
                <p className="font-black text-foreground">
                  {latestEntry.riddleSolved ? `+${scoring.riddlePoints} pts` : "0 pt"}
                </p>
              </div>
              <div className="rounded-xl bg-[#E3F2FD] p-3">
                <p className="text-xs text-muted-foreground">Défi</p>
                <p className="font-black text-foreground">
                  {latestEntry.challengeDone ? `+${scoring.challengePoints} pts` : "0 pt"}
                </p>
              </div>
              <div className="rounded-xl bg-[#F3E5F5] p-3">
                <p className="text-xs text-muted-foreground">Total session</p>
                <p className="font-black text-foreground">{latestEntry.totalScore} pts</p>
              </div>
            </div>
          </div>
        )}

        {/* Score summary */}
        <div className="bg-card rounded-2xl shadow-sm border border-border p-5">
          <p className="text-xs font-extrabold text-muted-foreground uppercase tracking-widest mb-3">
            Score total
          </p>
          <div className="flex items-end gap-2">
            <p className="text-5xl font-black text-[#6B3DFF]">{total}</p>
          </div>
        </div>

        {/* Day scores */}
        <div className="bg-card rounded-2xl shadow-sm border border-border p-5">
          <p className="text-xs font-extrabold text-muted-foreground uppercase tracking-widest mb-3">
            Par journée
          </p>
          {dailyScores.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucune session terminée pour le moment. Lancez un jeu du jour pour générer des résultats.
            </p>
          ) : (
            <div className="space-y-3">
              {dailyScores.map((d) => {
                const isExpanded = expandedHistoryDay === d.day;
                const detailEntry = history.find((entry) => entry.day === d.day) ?? null;
                const totalQuestions = getQuestionsForDay(d.day).length;
                const expectedRiddleAnswer = getRiddleForDay(d.day).answer;
                return (
                  <div key={d.day}>
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedHistoryDay((current) => (current === d.day ? null : d.day))
                      }
                      aria-expanded={isExpanded}
                      className="w-full flex items-center gap-3 text-left"
                    >
                      <div className="w-9 h-9 rounded-full bg-[#6B3DFF]/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-black text-[#6B3DFF]">
                          J{d.day}
                        </span>
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between mb-1">
                          <span className="text-sm font-bold text-foreground">
                            {d.location}
                          </span>
                          <span className="text-sm font-black text-[#6B3DFF]">
                            {d.score} pts
                          </span>
                        </div>
                        <div className="bg-muted rounded-full h-2">
                          <div
                            className="bg-[#6B3DFF] h-2 rounded-full transition-all"
                            style={{ width: `${Math.min(100, d.score)}%` }}
                          />
                        </div>
                      </div>
                      <ChevronDown
                        size={16}
                        className={`flex-shrink-0 text-muted-foreground transition-transform ${
                          isExpanded ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                    {isExpanded && detailEntry && (
                      <div className="mt-3 ml-12 space-y-2 rounded-xl bg-muted/30 border border-border p-3 text-sm">
                        <div className="flex justify-between gap-3">
                          <span className="text-muted-foreground">Quiz</span>
                          <span className="font-bold text-foreground text-right">
                            {detailEntry.correctCount}/{totalQuestions} bonnes réponses · {detailEntry.quizScore} pts
                          </span>
                        </div>
                        <div className="flex justify-between gap-3">
                          <span className="text-muted-foreground flex-shrink-0">Énigme</span>
                          <span className="font-bold text-foreground text-right">
                            {detailEntry.riddleSolved
                              ? `Gagnée (+${scoring.riddlePoints} pts)`
                              : "Perdue (0 pt)"}
                          </span>
                        </div>
                        {detailEntry.riddleAnswer ? (
                          <p className="text-xs text-muted-foreground">
                            Réponse donnée : « {detailEntry.riddleAnswer} » — Réponse attendue : « {expectedRiddleAnswer} »
                          </p>
                        ) : (
                          <p className="text-xs text-muted-foreground">
                            Réponse attendue : « {expectedRiddleAnswer} »
                          </p>
                        )}
                        <div className="flex justify-between gap-3">
                          <span className="text-muted-foreground">Défi</span>
                          <span className="font-bold text-foreground text-right">
                            {detailEntry.challengeDone
                              ? `Réalisé (+${scoring.challengePoints} pts)`
                              : "Non réalisé (0 pt)"}
                          </span>
                        </div>
                        {detailEntry.challengeResponse ? (
                          <p className="text-xs text-muted-foreground">
                            Réponse au défi : « {detailEntry.challengeResponse} »
                          </p>
                        ) : null}
                        <div className="flex justify-between gap-3 pt-1 border-t border-border">
                          <span className="text-muted-foreground">Durée</span>
                          <span className="font-bold text-foreground">
                            {formatDuration(detailEntry.durationSec) ?? "—"}
                          </span>
                        </div>
                        <div className="flex justify-between gap-3">
                          <span className="text-muted-foreground">Date</span>
                          <span className="font-bold text-foreground">
                            {new Date(detailEntry.completedAt).toLocaleDateString("fr-FR", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Badges */}
        <div className="bg-card rounded-2xl shadow-sm border border-border p-5">
          <p className="text-xs font-extrabold text-muted-foreground uppercase tracking-widest mb-3">
            Badges obtenus
          </p>
          <div className="grid grid-cols-2 gap-3">
            {badges.map((badge, i) => (
              <div
                key={i}
                className={`rounded-2xl p-4 text-center ${
                  badge.earned ? "bg-[#FFF3E0]" : "bg-muted opacity-40"
                }`}
              >
                <p className="text-3xl mb-1">{badge.icon}</p>
                <p className="text-xs font-black text-foreground">
                  {badge.name}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {badge.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
        {/* Score progression chart */}
        <div className="bg-card rounded-2xl shadow-sm border border-border p-5">
          <p className="text-xs font-extrabold text-muted-foreground uppercase tracking-widest mb-3">
            Progression des scores 📈
          </p>

          {/* Profile selector */}
          {chartMembers.length > 1 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {chartMembers.map((member) => (
                <button
                  key={member.profileId}
                  onClick={() => setChartProfileId(member.profileId)}
                  className={`px-3 py-1 rounded-full text-xs font-black transition-colors ${
                    chartProfileId === member.profileId
                      ? "bg-[#6B3DFF] text-white"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {member.surname}
                </button>
              ))}
            </div>
          )}

          {/* Chart or empty state */}
          {chartPoints.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {chartProfile?.surname ?? "Ce profil"} n&apos;a pas encore de score enregistré.
            </p>
          ) : (
            <ChartContainer config={SCORE_CHART_CONFIG} className="h-[180px] w-full">
              <LineChart
                data={chartPoints}
                margin={{ top: 4, right: 8, bottom: 0, left: -20 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line
                  type="monotone"
                  dataKey="cumulativeScore"
                  name="Score cumulé"
                  stroke="#6B3DFF"
                  strokeWidth={2}
                  dot={{ r: 4, fill: "#6B3DFF" }}
                  activeDot={{ r: 5 }}
                  isAnimationActive={false}
                />
              </LineChart>
            </ChartContainer>
          )}
        </div>

        <div className="bg-card rounded-2xl shadow-sm border border-border p-5">
          <p className="text-xs font-extrabold text-muted-foreground uppercase tracking-widest mb-3">
            Challenge destination
          </p>
          <p className="text-sm font-semibold text-muted-foreground mb-3">
            Destination correcte: {destinationSurveyDestination}
          </p>
          {visibleDestinationSurveyResults.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucun résultat de challenge à afficher.
            </p>
          ) : (
            <div className="space-y-2">
              {visibleDestinationSurveyResults.map((row) => (
                <div
                  key={`destination-result-${row.profileId}`}
                  className="rounded-xl border border-border bg-muted/30 px-3 py-2"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-black text-foreground">{row.surname}</p>
                    <p className="text-sm font-black text-[#6B3DFF]">{row.points} pts</p>
                  </div>
                  <p className="text-xs font-semibold text-muted-foreground">
                    Propositions: {row.proposals.length > 0 ? row.proposals.join(", ") : "Aucune proposition"}
                  </p>
                  <p className="text-xs font-semibold text-muted-foreground">
                    Résultat: {row.isCorrect ? `Bonne réponse. Choix ${row.rank ?? 1}` : "Incorrect"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {canViewSharedChallenges && perDayChallengeData.map(({ day, entries, ready }) => (
          <div key={`shared-challenge-day-${day}`} className="bg-card rounded-2xl shadow-sm border border-border p-5">
            <p className="text-xs font-extrabold text-muted-foreground uppercase tracking-widest mb-3">
              Défis partagés — {formatTripDayLabel(day, tripStartDate)}
            </p>
            {!ready ? (
              <p className="text-sm text-muted-foreground">
                Les réponses du défi seront visibles ici dès que tout le monde aura répondu.
              </p>
            ) : (
              <div className="space-y-3">
                {entries.map((entry) => (
                  <div
                    key={`shared-challenge-${day}-${entry.profileId}`}
                    className={`rounded-xl border px-3 py-3 transition-colors ${
                      entry.isTopVoted
                        ? "border-[#2E7D32] bg-[#E8F5E9]"
                        : "border-border bg-muted/30"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-black text-foreground">{entry.surname}</p>
                      {entry.completedAt ? (
                        <p className="text-[11px] font-semibold text-muted-foreground">
                          {new Date(entry.completedAt).toLocaleDateString("fr-FR", {
                            day: "2-digit",
                            month: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      ) : null}
                    </div>
                    <p className="mt-2 text-sm text-foreground/85 leading-relaxed">{entry.response}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {entry.reactionCounts
                        .filter((reaction) => reaction.count > 0)
                        .map((reaction) => (
                          <span
                            key={`reaction-count-${entry.profileId}-${reaction.value}`}
                            className="rounded-full bg-white px-2.5 py-1 text-xs font-black text-foreground shadow-sm"
                          >
                            {reaction.emoji} {reaction.reactors.length}
                          </span>
                        ))}
                      {entry.bestVoteCount > 0 && (
                        <span className="rounded-full bg-[#FFF3CD] px-2.5 py-1 text-xs font-black text-[#F9A825] shadow-sm">
                          🏆 {entry.bestVoteCount}
                        </span>
                      )}
                    </div>
                    {(entry.reactionCounts.some((reaction) => reaction.reactors.length > 0) ||
                      entry.bestVoters.length > 0) && (
                      <div className="mt-2 space-y-1">
                        {entry.reactionCounts
                          .filter((reaction) => reaction.reactors.length > 0)
                          .map((reaction) => (
                            <p
                              key={`reaction-reactors-${entry.profileId}-${reaction.value}`}
                              className="text-xs font-semibold text-muted-foreground"
                            >
                              {reaction.emoji} {reaction.reactors.join(", ")}
                            </p>
                          ))}
                        {entry.bestVoters.length > 0 && (
                          <p className="text-xs font-semibold text-muted-foreground">
                            🏆 {entry.bestVoters.join(", ")}
                          </p>
                        )}
                      </div>
                    )}
                    {entry.profileId !== currentProfileId && (
                      <div className="mt-3 flex flex-nowrap items-center gap-1.5 overflow-x-auto">
                        {CHALLENGE_REACTION_OPTIONS.map((reaction) => {
                          const isSelected = entry.currentUserReaction === reaction.value;
                          return (
                            <button
                              key={`reaction-button-${entry.profileId}-${reaction.value}`}
                              onClick={() =>
                                onReactToChallengeResponse(day, entry.profileId, reaction.value)
                              }
                              className={`flex-shrink-0 rounded-full border px-2.5 py-1 text-sm font-black transition-colors ${
                                isSelected
                                  ? "border-[#6B3DFF] bg-[#F3E5F5] text-[#6B3DFF]"
                                  : "border-border bg-white text-foreground"
                              }`}
                              aria-label={reaction.label}
                              title={reaction.label}
                            >
                              {reaction.emoji}
                            </button>
                          );
                        })}
                        <button
                          onClick={() => onVoteBestChallengeResponse(day, entry.profileId)}
                          className={`flex-shrink-0 ml-1 rounded-full border-2 px-3 py-1.5 text-base font-black transition-colors ${
                            entry.currentUserVotedBest
                              ? "border-[#F9A825] bg-[#FFF8E1] text-[#F9A825]"
                              : "border-border bg-white text-foreground"
                          }`}
                          aria-label="Voter pour le meilleur défi du jour"
                          title="Voter pour le meilleur défi du jour"
                        >
                          🏆
                        </button>
                      </div>
                    )}
                    {entry.profileId !== currentProfileId && entry.currentUserReaction && (
                      <p className="mt-2 text-[11px] font-semibold text-muted-foreground">
                        Re-cliquez sur votre emoji pour retirer votre réaction.
                      </p>
                    )}
                    {entry.profileId !== currentProfileId && entry.currentUserVotedBest && (
                      <p className="mt-1 text-[11px] font-semibold text-muted-foreground">
                        Re-cliquez sur le trophée pour retirer votre vote.
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        <div className="h-2" />
      </div>
    </div>
  );
}

// ─── TIPS SCREEN ─────────────────────────────────────────────────────────────

function TipsScreen({
  onBack,
  currentDay,
  isOnline,
}: {
  onBack: () => void;
  currentDay: number;
  isOnline: boolean;
}) {
  const dayEntry = JOURS_DESTINATIONS.find((d) => d.jour === currentDay) as
    | Record<string, unknown>
    | undefined;
  const { coords: deviceCoords } = useDeviceLocation();
  const scheduledCoords = getScheduledCoordinates(dayEntry);
  const activeCoords = deviceCoords ?? scheduledCoords;
  const { weather, loading: weatherLoading, error: weatherError } = useWeather(activeCoords);
  const [tab, setTab] = useState<
    "Telephonie" | "customs" | "dictionary" | "payment" | "emergency" | "food"
  >("payment");

  const [rateSnapshot, setRateSnapshot] = useState<ExchangeRateSnapshot | null>(null);
  const [eurInput, setEurInput] = useState("");
  const [tryInput, setTryInput] = useState("");
  const lastEdited = useRef<"eur" | "try" | null>(null);

  useEffect(() => {
    let cancelled = false;
    getEurTryRate().then((snapshot) => {
      if (!cancelled) setRateSnapshot(snapshot);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  function handleEurChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setEurInput(val);
    lastEdited.current = "eur";
    const n = normalizeNumericInput(val);
    if (n !== null && rateSnapshot) {
      setTryInput(String(convertEurToTry(n, rateSnapshot.rate)));
    } else {
      setTryInput("");
    }
  }

  function handleTryChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setTryInput(val);
    lastEdited.current = "try";
    const n = normalizeNumericInput(val);
    if (n !== null && rateSnapshot) {
      setEurInput(String(convertTryToEur(n, rateSnapshot.rate)));
    } else {
      setEurInput("");
    }
  }

  function formatFreshnessMessage(snapshot: ExchangeRateSnapshot): string {
    if (snapshot.source === "live") {
      const time = new Date(snapshot.fetchedAtIso).toLocaleTimeString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
      });
      return `Taux en direct récupéré à ${time}`;
    }
    if (snapshot.source === "cache") {
      const date = new Date(snapshot.fetchedAtIso).toLocaleDateString("fr-FR");
      return `Dernier taux connu (${date})`;
    }
    return "Taux indicatif non mis à jour";
  }

  const tabs = [
    { id: "Telephonie" as const, label: "📱 Téléphonie" },
    { id: "customs" as const, label: "🙏 Coutumes" },
    { id: "dictionary" as const, label: "🗣️ Dico" },
    { id: "payment" as const, label: "💳 Paiement" },
    { id: "emergency" as const, label: "🚨 Urgences" },
    { id: "food" as const, label: "🍽️ Cuisine" },
  ];
  const content = {
    Telephonie: TIPS.Telephonie,
    customs: TIPS.customs,
    dictionary: TIPS.dictionary,
    payment: TIPS.payment,
    emergency: TIPS.emergency,
    food: TIPS.food,
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="relative bg-[#1565C0] text-white px-6 pt-12 pb-6 flex-shrink-0">
        <MemphisDecor />
        <button
          onClick={onBack}
          data-tutorial-id="tips-back"
          className="relative z-10 flex items-center gap-1 text-white/80 text-sm font-bold mb-3"
        >
          <ChevronLeft size={18} /> Accueil
        </button>
        <h1 data-tutorial-id="tips-title" className="relative z-10 text-2xl font-black">
          Conseils de voyage 💡
        </h1>
        <p className="relative z-10 text-sm opacity-90 mt-1">
          Tout ce qu&apos;il faut savoir pour la Turquie
        </p>
        <ContentOfflineStatusBadge section="tips" isOnline={isOnline} />
      </div>

      {/* Weather */}
      <div className="px-4 mt-4 flex-shrink-0">
        <div className="bg-[#E3F2FD] rounded-2xl p-4 flex items-center gap-4">
          {weather ? (
            <>
              <span className="text-4xl">{weather.emoji}</span>
              <div className="flex-1">
                <p className="font-black text-2xl text-[#1565C0]">
                  {weather.temp}
                </p>
                <p className="text-sm font-bold text-foreground">
                  {weather.condition}
                </p>
                <p className="text-xs text-muted-foreground">
                  Humidité : {weather.humidity}
                </p>
              </div>
              <p className="text-xs text-[#1565C0] font-bold text-right max-w-[100px]">
                {getWeatherAdvice(weather)}
              </p>
            </>
          ) : (
            <div className="flex-1 text-sm text-muted-foreground">
              {!activeCoords
                ? "Position non disponible pour le moment (GPS refusé et aucune coordonnée programmée pour aujourd'hui)."
                : weatherLoading
                ? "Récupération de la météo du jour…"
                : weatherError
                ? "Météo indisponible pour le moment."
                : "Météo indisponible pour le moment."}
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 mt-4 grid grid-cols-3 gap-2 flex-shrink-0">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            data-tutorial-id={t.id === "payment" ? "tips-tab-payment" : undefined}
            className={`px-2 py-2 rounded-xl text-[11px] font-extrabold text-center leading-tight transition-all ${
              tab === t.id
                ? "bg-[#1565C0] text-white"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {tab === "payment" && (
          <div className="bg-[#E3F2FD] rounded-2xl p-4 mb-1 space-y-3">
            <p data-tutorial-id="tips-converter-title" className="text-xs font-black text-[#1565C0] uppercase tracking-wide">
              💱 Convertisseur EUR ↔ TRY
            </p>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-[#1565C0] w-10 flex-shrink-0">EUR €</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={eurInput}
                  onChange={handleEurChange}
                  placeholder="0"
                  aria-label="Montant en euros"
                  className="flex-1 rounded-xl border border-border px-3 py-2 text-sm bg-background text-foreground"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-[#1565C0] w-10 flex-shrink-0">TRY ₺</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={tryInput}
                  onChange={handleTryChange}
                  placeholder="0"
                  aria-label="Montant en livres turques"
                  className="flex-1 rounded-xl border border-border px-3 py-2 text-sm bg-background text-foreground"
                />
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              {rateSnapshot
                ? `${formatFreshnessMessage(rateSnapshot)} · Valeur approximative, frais bancaires non inclus.`
                : "Récupération du taux de change…"}
            </p>
          </div>
        )}
        {content[tab].map((item, i) => (
          <div
            key={i}
            className="bg-card rounded-2xl border border-border p-4 flex items-start gap-4"
          >
            <span className="text-3xl flex-shrink-0">{item.icon}</span>
            <div>
              <p className="font-black text-sm text-foreground">{item.title}</p>
              {"phonetic" in item && item.phonetic && (
                <p className="text-xs text-[#1565C0] font-bold italic mt-0.5">
                  {item.phonetic}
                </p>
              )}
              <div className="text-sm text-muted-foreground mt-1 leading-relaxed">
                {renderFormattedText(item.desc)}
              </div>
            </div>
          </div>
        ))}
        <div className="h-2" />
      </div>
    </div>
  );
}

function LaunchGateScreen({
  videoSrc,
  locked,
  message,
  mode,
  fallbackStepIndex,
  isOwnerReplay,
  onStart,
  onVideoEnded,
  onVideoError,
  onNextFallback,
  onReplay,
  onEnterApp,
  onClosePlayback,
  onCloseOwnerReplay,
}: {
  videoSrc: string;
  locked: boolean;
  message: string | null;
  mode: "idle" | "video" | "fallback" | "completed";
  fallbackStepIndex: number;
  isOwnerReplay: boolean;
  onStart: () => void;
  onVideoEnded: () => void;
  onVideoError: () => void;
  onNextFallback: () => void;
  onReplay: () => void;
  onEnterApp: () => void;
  onClosePlayback: () => void;
  onCloseOwnerReplay: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fallbackStep =
    LAUNCH_FALLBACK_STEPS[Math.max(0, Math.min(fallbackStepIndex, LAUNCH_FALLBACK_STEPS.length - 1))];
  const isLastFallbackStep = fallbackStepIndex >= LAUNCH_FALLBACK_STEPS.length - 1;
  const showCloseButton = isOwnerReplay || mode === "video";

  const requestVideoFullscreen = () => {
    const node = videoRef.current as (HTMLVideoElement & {
      webkitEnterFullscreen?: () => void;
      webkitRequestFullscreen?: () => Promise<void>;
    }) | null;
    if (!node) {
      return;
    }

    try {
      if (typeof node.requestFullscreen === "function") {
        void node.requestFullscreen();
        return;
      }
      if (typeof node.webkitRequestFullscreen === "function") {
        void node.webkitRequestFullscreen();
        return;
      }
      if (typeof node.webkitEnterFullscreen === "function") {
        node.webkitEnterFullscreen();
      }
    } catch {
      // Best effort only: keep inline playback when fullscreen isn't available.
    }
  };

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#0F172A] text-white">
      <div className="relative px-6 pt-12 pb-6">
        <MemphisDecor />
        <div className="relative z-10">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-xs font-extrabold uppercase tracking-widest text-white/80">✈️ Voyage mystère</p>
            {showCloseButton ? (
              <button
                onClick={() => {
                  if (isOwnerReplay) {
                    onCloseOwnerReplay();
                    return;
                  }
                  onClosePlayback();
                }}
                className="rounded-full bg-white/20 px-3 py-1 text-[10px] font-black uppercase tracking-widest"
              >
                Fermer
              </button>
            ) : null}
          </div>
          <h1 className="text-3xl font-black">On est parti !</h1>
          {locked ? <p className="mt-2 text-sm text-white/85">Le départ n'est pas encore débloqué.</p> : null}
        </div>
      </div>

      <div className="flex-1 px-4 pb-6">
        <div className="h-full rounded-3xl border border-white/15 bg-white/5 p-4">
          {mode === "idle" && (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <button
                onClick={onStart}
                className="rounded-2xl bg-[#3B82F6] px-6 py-4 text-base font-black text-white shadow-lg transition-transform active:scale-95"
              >
                  Let's go !
              </button>
              {message && <p className="mt-4 text-sm font-bold text-amber-300">{message}</p>}
            </div>
          )}

          {mode === "video" && (
            <div className="flex h-full flex-col gap-3">
              <video
                ref={videoRef}
                className="h-full min-h-[260px] w-full rounded-2xl bg-black object-contain"
                controls
                autoPlay
                playsInline
                preload="metadata"
                onLoadedMetadata={requestVideoFullscreen}
                onEnded={onVideoEnded}
                onError={onVideoError}
              >
                <source src={videoSrc} type="video/mp4" />
              </video>
              <p className="text-xs font-semibold text-white/70">
                Si la vidéo ne se lance pas, utilise Revoir pour relancer la lecture ou Entrer pour continuer.
              </p>
            </div>
          )}

          {mode === "fallback" && (
            <div
              className={`flex h-full flex-col justify-between rounded-2xl p-5 ${
                fallbackStep.theme === "blue"
                  ? "bg-gradient-to-b from-[#1D4ED8] to-[#2563EB]"
                  : "bg-gradient-to-b from-[#111827] to-[#1F2937]"
              }`}
            >
              <div>
                <p className="text-xs font-extrabold uppercase tracking-widest text-white/70">
                  Étape {Math.min(fallbackStepIndex + 1, LAUNCH_FALLBACK_STEPS.length)} / {LAUNCH_FALLBACK_STEPS.length}
                </p>
                <h2 className="mt-2 text-2xl font-black">{fallbackStep.title}</h2>
                <p className="mt-3 text-base leading-relaxed text-white/90">{fallbackStep.body}</p>
                {fallbackStep.showPhotos && (
                  <div className="mt-4 grid grid-cols-3 gap-2">
                    <div className="h-16 rounded-xl bg-white/20" />
                    <div className="h-16 rounded-xl bg-white/30" />
                    <div className="h-16 rounded-xl bg-white/20" />
                  </div>
                )}
              </div>

              <div className="mt-5">
                {!isLastFallbackStep ? (
                  <button
                    onClick={onNextFallback}
                    className="w-full rounded-2xl bg-white text-[#0F172A] py-3 text-sm font-black"
                  >
                    Suivant
                  </button>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={onReplay}
                      className="rounded-2xl border border-white/30 py-3 text-sm font-black"
                    >
                      Revoir
                    </button>
                    <button
                      onClick={onEnterApp}
                      className="rounded-2xl bg-white py-3 text-sm font-black text-[#0F172A]"
                    >
                      Entrer
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {mode === "completed" && (
            <div className="flex h-full flex-col items-center justify-center">
              <p className="text-lg font-black">Prêt pour le voyage</p>
              <p className="mt-2 text-sm text-white/80">Tu peux revoir la vidéo ou entrer dans l'application.</p>
              <div className="mt-5 grid w-full grid-cols-2 gap-2">
                <button
                  onClick={onReplay}
                  className="rounded-2xl border border-white/30 py-3 text-sm font-black"
                >
                  Revoir
                </button>
                <button
                  onClick={onEnterApp}
                  className="rounded-2xl bg-white py-3 text-sm font-black text-[#0F172A]"
                >
                  Entrer
                </button>
              </div>
            </div>
          )}

          {mode !== "idle" && message && <p className="mt-3 text-center text-sm font-bold text-amber-300">{message}</p>}
        </div>
      </div>
    </div>
  );
}

function SettingsScreen({
  profile,
  ownerCodeConfigured,
  ownerCodeCurrent,
  travelerCodeConfigured,
  travelerCodeCurrent,
  profilePasswordConfigured,
  profileRecoveryConfigured,
  profileRecoveryQuestion,
  profileRecoveryAnswer,
  appLocked,
  onBack,
  onSaveSurname,
  onSaveProfileMetadata,
  onSaveOwnerCode,
  onSaveTravelerCode,
  onToggleLock,
  onOpenLaunchReplay,
  onSaveProfilePassword,
  onChangeProfilePasswordInSession,
  onRemoveProfilePassword,
  onSaveProfileRecoveryData,
  onSwitchProfile,
  cloudEnabled,
  onDeleteOwnProfile,
  tripStartDate,
  onSaveTripStartDate,
  gameScoring,
  onSaveGameScoring,
  currentDay,
  lastDefinedDay,
  gameDayOverride,
  onSetGameDayOverride,
  notificationPreferences,
  notificationPermissionStatus,
  notificationsSupported,
  onToggleNotificationPreference,
  onResetScores,
  familyMembersForGameProgressReset,
  onResetGameProgress,
  isOnline,
  lastSyncAt,
}: {
  profile: Profile;
  ownerCodeConfigured: boolean;
  ownerCodeCurrent: string;
  travelerCodeConfigured: boolean;
  travelerCodeCurrent: string;
  profilePasswordConfigured: boolean;
  profileRecoveryConfigured: boolean;
  profileRecoveryQuestion: string;
  profileRecoveryAnswer: string;
  appLocked: boolean;
  onBack: () => void;
  onSaveSurname: (surname: string) => { ok: boolean; message: string };
  onSaveProfileMetadata: (gender: Gender, householdRole: HouseholdRole) => void;
  onSaveOwnerCode: (code: string) => Promise<{ ok: boolean; message: string }>;
  onSaveTravelerCode: (code: string) => Promise<{ ok: boolean; message: string }>;
  onToggleLock: (code: string) => Promise<{ ok: boolean; message: string }>;
  onOpenLaunchReplay: () => void;
  onSaveProfilePassword: (password: string) => Promise<{ ok: boolean; message: string }>;
  onChangeProfilePasswordInSession: (
    method: InSessionPasswordProofMethod,
    proofInput: string,
    newPassword: string,
    confirmPassword: string
  ) => Promise<{ ok: boolean; message: string }>;
  onRemoveProfilePassword: () => Promise<{ ok: boolean; message: string }>;
  onSaveProfileRecoveryData: (
    question: string,
    answer: string
  ) => Promise<{ ok: boolean; message: string }>;
  onSwitchProfile: () => void;
  cloudEnabled: boolean;
  onDeleteOwnProfile: (
    proofMethod: "none" | "password" | "recovery",
    proofInput: string
  ) => Promise<{ ok: boolean; message: string }>;
  tripStartDate: string | null;
  onSaveTripStartDate: (date: string) => Promise<{ ok: boolean; message: string }>;
  gameScoring: GameScoringConfig;
  onSaveGameScoring: (scoring: GameScoringConfig) => Promise<{ ok: boolean; message: string }>;
  currentDay: number;
  lastDefinedDay: number | null;
  gameDayOverride: "open" | "closed" | null;
  onSetGameDayOverride: (
    code: string,
    value: "open" | "closed" | null
  ) => Promise<{ ok: boolean; message: string }>;
  notificationPreferences: NotificationPreferences;
  notificationPermissionStatus: NotificationPermissionStatus;
  notificationsSupported: boolean;
  onToggleNotificationPreference: (
    key: "notif_checklist" | "notif_game" | "notif_comments"
  ) => Promise<{ ok: boolean; message: string }>;
  onResetScores: (
    code: string,
    action: { kind: "all" } | { kind: "day"; day: number }
  ) => Promise<{ ok: boolean; message: string }>;
  familyMembersForGameProgressReset: { profileId: string; surname: string }[];
  onResetGameProgress: (
    code: string,
    targetProfileId: string
  ) => Promise<{ ok: boolean; message: string }>;
  isOnline: boolean;
  lastSyncAt: number | null;
}) {
  const [surnameInput, setSurnameInput] = useState(profile.surname);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [tripStartDateInput, setTripStartDateInput] = useState(tripStartDate ?? "");
  const [tripStartDateFeedback, setTripStartDateFeedback] = useState<string | null>(null);
  const [gameScoringInput, setGameScoringInput] = useState(gameScoring);
  const [gameScoringFeedback, setGameScoringFeedback] = useState<string | null>(null);
  useEffect(() => {
    setTripStartDateInput(tripStartDate ?? "");
  }, [tripStartDate]);
  useEffect(() => {
    setGameScoringInput(gameScoring);
  }, [gameScoring]);
  const [selectedGender, setSelectedGender] = useState<Gender>(profile.gender);
  const [selectedHouseholdRole, setSelectedHouseholdRole] = useState<HouseholdRole>(profile.householdRole);
  const [metadataFeedback, setMetadataFeedback] = useState<string | null>(null);
  const [ownerCodeInput, setOwnerCodeInput] = useState(ownerCodeCurrent);
  useEffect(() => {
    setOwnerCodeInput(ownerCodeCurrent);
  }, [ownerCodeCurrent]);
  const [ownerCodeFeedback, setOwnerCodeFeedback] = useState<string | null>(null);
  const [travelerCodeInput, setTravelerCodeInput] = useState(travelerCodeCurrent);
  useEffect(() => {
    setTravelerCodeInput(travelerCodeCurrent);
  }, [travelerCodeCurrent]);
  const [travelerCodeFeedback, setTravelerCodeFeedback] = useState<string | null>(null);
  const [showTravelerCodeInput, setShowTravelerCodeInput] = useState(false);
  const [lockToggleCodeInput, setLockToggleCodeInput] = useState("");
  const [lockToggleFeedback, setLockToggleFeedback] = useState<string | null>(null);
  const [profilePasswordInput, setProfilePasswordInput] = useState("");
  const [profilePasswordFeedback, setProfilePasswordFeedback] = useState<string | null>(null);
  const [profileRecoveryQuestionInput, setProfileRecoveryQuestionInput] = useState(profileRecoveryQuestion);
  useEffect(() => {
    setProfileRecoveryQuestionInput(profileRecoveryQuestion);
  }, [profileRecoveryQuestion]);
  const [profileRecoveryInput, setProfileRecoveryInput] = useState(profileRecoveryAnswer);
  useEffect(() => {
    setProfileRecoveryInput(profileRecoveryAnswer);
  }, [profileRecoveryAnswer]);
  const [profileRecoveryFeedback, setProfileRecoveryFeedback] = useState<string | null>(null);
  const [showOwnerCodeInput, setShowOwnerCodeInput] = useState(false);
  const [showLockTogglePrompt, setShowLockTogglePrompt] = useState(false);
  const [showLockToggleCodeInput, setShowLockToggleCodeInput] = useState(false);
  const [pendingDayOverrideAction, setPendingDayOverrideAction] = useState<
    "open" | "closed" | null
  >(null);
  const [showDayOverridePrompt, setShowDayOverridePrompt] = useState(false);
  const [dayOverrideCodeInput, setDayOverrideCodeInput] = useState("");
  const [showDayOverrideCodeInput, setShowDayOverrideCodeInput] = useState(false);
  const [dayOverrideFeedback, setDayOverrideFeedback] = useState<string | null>(null);
  const [pendingScoreResetAction, setPendingScoreResetAction] = useState<
    { kind: "all" } | { kind: "day"; day: number } | null
  >(null);
  const [showScoreResetPrompt, setShowScoreResetPrompt] = useState(false);
  const [scoreResetCodeInput, setScoreResetCodeInput] = useState("");
  const [showScoreResetCodeInput, setShowScoreResetCodeInput] = useState(false);
  const [scoreResetFeedback, setScoreResetFeedback] = useState<string | null>(null);
  const [scoreResetDayInput, setScoreResetDayInput] = useState(currentDay);
  const [gameProgressResetProfileInput, setGameProgressResetProfileInput] = useState(profile.id);
  const [pendingGameProgressResetProfileId, setPendingGameProgressResetProfileId] = useState<
    string | null
  >(null);
  const [showGameProgressResetPrompt, setShowGameProgressResetPrompt] = useState(false);
  const [gameProgressResetCodeInput, setGameProgressResetCodeInput] = useState("");
  const [showGameProgressResetCodeInput, setShowGameProgressResetCodeInput] = useState(false);
  const [gameProgressResetFeedback, setGameProgressResetFeedback] = useState<string | null>(null);
  const [showProfilePasswordInput, setShowProfilePasswordInput] = useState(false);
  const [showPasswordChangeFlow, setShowPasswordChangeFlow] = useState(false);
  const [passwordProofMethod, setPasswordProofMethod] =
    useState<InSessionPasswordProofMethod>("current-password");
  const [passwordProofInput, setPasswordProofInput] = useState("");
  const [passwordChangeInput, setPasswordChangeInput] = useState("");
  const [passwordChangeConfirmInput, setPasswordChangeConfirmInput] = useState("");
  const [passwordChangeFeedback, setPasswordChangeFeedback] = useState<string | null>(null);
  const [showProfileRecoveryInput, setShowProfileRecoveryInput] = useState(false);
  const [showPasswordProofInput, setShowPasswordProofInput] = useState(false);
  const [showPasswordChangeInput, setShowPasswordChangeInput] = useState(false);
  const [showPasswordChangeConfirmInput, setShowPasswordChangeConfirmInput] = useState(false);
  const [showSwitchProfilePrompt, setShowSwitchProfilePrompt] = useState(false);
  const [showDeleteProfilePrompt, setShowDeleteProfilePrompt] = useState(false);
  const [showDeleteProfileCredentialStep, setShowDeleteProfileCredentialStep] = useState(false);
  const [deleteProfileProofMethod, setDeleteProfileProofMethod] = useState<"password" | "recovery">("password");
  const [deleteProfileProofInput, setDeleteProfileProofInput] = useState("");
  const [showDeleteProfileProofInput, setShowDeleteProfileProofInput] = useState(false);
  const [deleteProfileConfirmError, setDeleteProfileConfirmError] = useState<string | null>(null);
  const [notificationFeedback, setNotificationFeedback] = useState<string | null>(null);

  const notificationStatusLabel =
    notificationPermissionStatus === "granted"
      ? "Accordee"
      : notificationPermissionStatus === "denied"
        ? "Refusee"
        : notificationPermissionStatus === "default"
          ? "Non demandee"
          : "Non supportee";
  const settingsWriteActionsDisabled = !isOnline;
  const notificationTogglesDisabled =
    settingsWriteActionsDisabled || !notificationsSupported || notificationPermissionStatus === "denied";
  const settingsDisabledButtonClass = "disabled:opacity-40 disabled:cursor-not-allowed";
  const lastSyncLabel =
    typeof lastSyncAt === "number" && Number.isFinite(lastSyncAt) && lastSyncAt > 0
      ? new Intl.DateTimeFormat("fr-FR", {
          dateStyle: "short",
          timeStyle: "short",
        }).format(new Date(lastSyncAt))
      : null;

  useEffect(() => {
    if (!profileRecoveryConfigured && passwordProofMethod === "recovery") {
      setPasswordProofMethod("current-password");
    }
  }, [passwordProofMethod, profileRecoveryConfigured]);

  const resetPasswordChangeFlow = () => {
    setShowPasswordChangeFlow(false);
    setPasswordProofMethod("current-password");
    setPasswordProofInput("");
    setPasswordChangeInput("");
    setPasswordChangeConfirmInput("");
    setPasswordChangeFeedback(null);
    setShowPasswordProofInput(false);
    setShowPasswordChangeInput(false);
    setShowPasswordChangeConfirmInput(false);
  };

  const roleLabel =
    profile.role === "proprietaire"
      ? "Propriétaire"
      : profile.role === "visiteur"
        ? "Visiteur"
        : "Voyageur";
  const ownerLockActionsEnabled = ownerCodeConfigured;
  const proposalLabels = ["1er choix", "2e choix", "3e choix"] as const;
  const updateScoringInput = (update: (current: GameScoringConfig) => GameScoringConfig) => {
    setGameScoringInput((current) => update(current));
    if (gameScoringFeedback) setGameScoringFeedback(null);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="relative bg-[#5E35B1] text-white px-6 pt-12 pb-6 flex-shrink-0">
        <MemphisDecor />
        <button
          onClick={onBack}
          data-tutorial-id="settings-back"
          className="relative z-10 flex items-center gap-1 text-white/80 text-sm font-bold mb-3"
        >
          <ChevronLeft size={18} /> Accueil
        </button>
        <h1 data-tutorial-id="settings-title" className="relative z-10 text-2xl font-black">
          Profil & paramètres ⚙️
        </h1>
        <p className="relative z-10 text-sm opacity-90 mt-1">
          Modifier votre surnom et consulter votre rôle
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {settingsWriteActionsDisabled && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50/90 p-4 text-amber-950">
            <p className="text-xs font-extrabold uppercase tracking-widest">Nécessite une connexion</p>
            <p className="mt-2 text-xs text-amber-900">
              Les réglages restent consultables hors ligne. Les actions de modification se réactiveront automatiquement au retour du réseau.
            </p>
            <p className="mt-2 text-[11px] font-bold text-amber-900/80">
              Dernière synchronisation : {lastSyncLabel ?? "indisponible"}
            </p>
          </div>
        )}

        <div className="bg-card rounded-2xl border border-border p-4">
          <p className="text-xs font-extrabold text-muted-foreground uppercase tracking-widest">
            Surnom
          </p>
          <input
            value={surnameInput}
            onChange={(e) => {
              setSurnameInput(e.target.value);
              if (feedback) setFeedback(null);
            }}
            placeholder="Votre surnom"
            className="mt-2 w-full rounded-xl bg-input-background px-3 py-3 text-sm font-semibold text-foreground outline-none ring-2 ring-transparent focus:ring-primary/30"
          />
          <button
            onClick={() => {
              const result = onSaveSurname(surnameInput);
              setFeedback(result.message);
            }}
            disabled={settingsWriteActionsDisabled}
            className={`mt-3 w-full bg-primary text-primary-foreground rounded-xl py-3 text-sm font-black ${settingsDisabledButtonClass}`}
          >
            Enregistrer le surnom
          </button>
          {feedback && (
            <p className="mt-2 text-xs font-bold text-muted-foreground">{feedback}</p>
          )}
        </div>

        <div className="bg-card rounded-2xl border border-border p-4">
          <p className="text-xs font-extrabold text-muted-foreground uppercase tracking-widest mb-3">
            Profil de préparation
          </p>
          <p className="text-xs text-muted-foreground mb-3">
            Ces informations permettent d'adapter la checklist à votre profil (optionnel).
          </p>
          <p className="text-xs font-extrabold text-muted-foreground uppercase tracking-widest mb-2">
            Genre
          </p>
          <div className="grid grid-cols-3 gap-2 mb-4">
            {(["unspecified", "male", "female"] as const).map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => {
                  setSelectedGender(g);
                  onSaveProfileMetadata(g, selectedHouseholdRole);
                  setMetadataFeedback("Profil de préparation mis à jour.");
                }}
                disabled={settingsWriteActionsDisabled}
                className={`rounded-xl py-2 text-xs font-black border transition-colors ${
                  selectedGender === g
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-foreground"
                } ${settingsDisabledButtonClass}`}
              >
                {g === "unspecified" ? "Non précisé" : g === "male" ? "Homme" : "Femme"}
              </button>
            ))}
          </div>
          <p className="text-xs font-extrabold text-muted-foreground uppercase tracking-widest mb-2">
            Rôle familial
          </p>
          <div className="grid grid-cols-2 gap-2 mb-4">
            {(["member", "parent", "child"] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => {
                  setSelectedHouseholdRole(r);
                  onSaveProfileMetadata(selectedGender, r);
                  setMetadataFeedback("Profil de préparation mis à jour.");
                }}
                disabled={settingsWriteActionsDisabled}
                className={`rounded-xl py-2 text-xs font-black border transition-colors ${
                  selectedHouseholdRole === r
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-foreground"
                } ${settingsDisabledButtonClass}`}
              >
                {r === "member" ? "Non précisé" : r === "parent" ? "Parent" : "Enfant"}
              </button>
            ))}
          </div>
          {metadataFeedback && (
            <p className="mt-2 text-xs font-bold text-muted-foreground">{metadataFeedback}</p>
          )}
        </div>

        <div className="bg-card rounded-2xl border border-border p-4">
          <p className="text-xs font-extrabold text-muted-foreground uppercase tracking-widest mb-2">
            Rôle
          </p>
          <div className="inline-flex items-center gap-2 rounded-full bg-[#F3E5F5] px-3 py-1.5">
            <span className="text-xs font-black text-[#6A1B9A]">{roleLabel}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Le rôle est défini à la création du profil pour ce MVP.
          </p>
        </div>

        {profile.role === "proprietaire" && (
          <div className="bg-card rounded-2xl border border-border p-4">
            <p className="text-xs font-extrabold text-muted-foreground uppercase tracking-widest">
              Bonification des jeux
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Seul le propriétaire peut modifier ces points. Les changements s&apos;appliquent aux prochaines parties.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-3">
              {[
                ["Bonne réponse au quiz", gameScoringInput.questionPoints, "questionPoints"],
                ["Énigme réussie", gameScoringInput.riddlePoints, "riddlePoints"],
                ["Défi accompli", gameScoringInput.challengePoints, "challengePoints"],
              ].map(([label, value, key]) => (
                <label key={key} className="text-xs font-bold text-muted-foreground">
                  {label}
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={value}
                    onChange={(event) => {
                      const nextValue = Math.max(0, Math.floor(Number(event.target.value) || 0));
                      updateScoringInput((current) => ({ ...current, [key]: nextValue }));
                    }}
                    disabled={settingsWriteActionsDisabled}
                    className={`mt-1 w-full rounded-xl bg-input-background px-3 py-2 text-sm font-semibold text-foreground ${settingsDisabledButtonClass}`}
                  />
                </label>
              ))}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-3">
              {gameScoringInput.destinationProposalScoring.map((entry, index) => (
                <div key={proposalLabels[index]} className="rounded-xl border border-border p-3">
                  <p className="text-xs font-black text-foreground">{proposalLabels[index]}</p>
                  {["basePoints", "bonusPoints"].map((key) => (
                    <label key={key} className="block text-xs font-bold text-muted-foreground mt-2">
                      {key === "basePoints" ? "Points de base" : "Bonus"}
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={entry[key as keyof typeof entry]}
                        onChange={(event) => {
                          const nextValue = Math.max(0, Math.floor(Number(event.target.value) || 0));
                          updateScoringInput((current) => ({
                            ...current,
                            destinationProposalScoring: current.destinationProposalScoring.map((item, itemIndex) =>
                              itemIndex === index ? { ...item, [key]: nextValue } : item
                            ) as GameScoringConfig["destinationProposalScoring"],
                          }));
                        }}
                        disabled={settingsWriteActionsDisabled}
                        className={`mt-1 w-full rounded-xl bg-input-background px-3 py-2 text-sm font-semibold text-foreground ${settingsDisabledButtonClass}`}
                      />
                    </label>
                  ))}
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={async () => {
                const result = await onSaveGameScoring(gameScoringInput);
                setGameScoringFeedback(result.message);
              }}
              disabled={settingsWriteActionsDisabled}
              className={`mt-3 w-full bg-primary text-primary-foreground rounded-xl py-3 text-sm font-black ${settingsDisabledButtonClass}`}
            >
              Enregistrer la bonification
            </button>
            {gameScoringFeedback && (
              <p className="mt-2 text-xs font-bold text-muted-foreground">{gameScoringFeedback}</p>
            )}
          </div>
        )}

        <div className="bg-card rounded-2xl border border-border p-4">
          <p className="text-xs font-extrabold text-muted-foreground uppercase tracking-widest">
            Notifications
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Etat de la permission navigateur: {notificationStatusLabel}
          </p>
          {notificationTogglesDisabled && (
            <p className="text-xs text-muted-foreground mt-2">
              Autorisez les notifications dans les parametres de votre navigateur pour activer les rappels.
            </p>
          )}

          <div className="mt-3 grid grid-cols-1 gap-2">
            <button
              type="button"
              onClick={async () => {
                const result = await onToggleNotificationPreference("notif_checklist");
                setNotificationFeedback(result.message);
              }}
              disabled={notificationTogglesDisabled}
              className={`w-full rounded-xl py-3 text-sm font-black border transition-colors ${
                notificationPreferences.notif_checklist
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-foreground"
              } disabled:opacity-40`}
            >
              Rappel checklist (J-3 et J-1 avant le depart)
            </button>

            <button
              type="button"
              onClick={async () => {
                const result = await onToggleNotificationPreference("notif_game");
                setNotificationFeedback(result.message);
              }}
              disabled={notificationTogglesDisabled}
              className={`w-full rounded-xl py-3 text-sm font-black border transition-colors ${
                notificationPreferences.notif_game
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-foreground"
              } disabled:opacity-40`}
            >
              Rappel defi du jour
            </button>

            <button
              type="button"
              onClick={async () => {
                const result = await onToggleNotificationPreference("notif_comments");
                setNotificationFeedback(result.message);
              }}
              disabled={notificationTogglesDisabled}
              className={`w-full rounded-xl py-3 text-sm font-black border transition-colors ${
                notificationPreferences.notif_comments
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-foreground"
              } disabled:opacity-40`}
            >
              Commentaires de la famille sur les lieux
            </button>
          </div>

          {notificationFeedback && (
            <p className="mt-2 text-xs font-bold text-muted-foreground">{notificationFeedback}</p>
          )}
        </div>

        <div className="bg-card rounded-2xl border border-border p-4">
            <p className="text-xs font-extrabold text-muted-foreground uppercase tracking-widest">
              Mot de passe du profil
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              {profilePasswordConfigured
                ? "Un mot de passe est déjà configuré pour ce profil."
                : "Aucun mot de passe configuré. Ce profil reste accessible sans mot de passe."}
            </p>
            {!profilePasswordConfigured && (
              <>
                <input
                  type={showProfilePasswordInput ? "text" : "password"}
                  value={profilePasswordInput}
                  onChange={(e) => {
                    setProfilePasswordInput(e.target.value);
                    if (profilePasswordFeedback) setProfilePasswordFeedback(null);
                  }}
                  placeholder="Minimum 4 caractères"
                  className="mt-2 w-full rounded-xl bg-input-background px-3 py-3 text-sm font-semibold text-foreground outline-none ring-2 ring-transparent focus:ring-primary/30"
                />
                <button
                  onClick={() => setShowProfilePasswordInput((previous) => !previous)}
                  className="mt-2 text-xs font-black text-primary underline underline-offset-4"
                >
                  {showProfilePasswordInput ? "Masquer" : "Afficher"} le mot de passe saisi
                </button>
                <button
                  onClick={async () => {
                    const result = await onSaveProfilePassword(profilePasswordInput);
                    setProfilePasswordFeedback(result.message);
                    if (result.ok) setProfilePasswordInput("");
                  }}
                  disabled={settingsWriteActionsDisabled}
                  className={`mt-3 w-full bg-primary text-primary-foreground rounded-xl py-3 text-sm font-black ${settingsDisabledButtonClass}`}
                >
                  Définir le mot de passe
                </button>
              </>
            )}
            {profilePasswordConfigured && (
              <>
                {!showPasswordChangeFlow && (
                  <button
                    onClick={() => {
                      setShowPasswordChangeFlow(true);
                      setPasswordChangeFeedback(null);
                    }}
                    disabled={settingsWriteActionsDisabled}
                    className={`mt-3 w-full bg-primary text-primary-foreground rounded-xl py-3 text-sm font-black ${settingsDisabledButtonClass}`}
                  >
                    Changer le mot de passe en session
                  </button>
                )}
                {showPasswordChangeFlow && (
                  <div className="mt-3 rounded-xl border border-border p-3">
                    <p className="text-xs font-extrabold text-muted-foreground uppercase tracking-widest">
                      Vérification d'identité
                    </p>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setPasswordProofMethod("current-password")}
                        className={`rounded-xl py-2 text-xs font-black border transition-colors ${
                          passwordProofMethod === "current-password"
                            ? "bg-primary text-primary-foreground border-primary"
                            : "border-border text-foreground"
                        }`}
                      >
                        Mot de passe actuel
                      </button>
                      {profileRecoveryConfigured && (
                        <button
                          type="button"
                          onClick={() => setPasswordProofMethod("recovery")}
                          className={`rounded-xl py-2 text-xs font-black border transition-colors ${
                            passwordProofMethod === "recovery"
                              ? "bg-primary text-primary-foreground border-primary"
                              : "border-border text-foreground"
                          }`}
                        >
                          Réponse de récupération
                        </button>
                      )}
                    </div>
                    <div className="relative mt-2">
                      <input
                        type={showPasswordProofInput ? "text" : "password"}
                        value={passwordProofInput}
                        onChange={(e) => {
                          setPasswordProofInput(e.target.value);
                          if (passwordChangeFeedback) setPasswordChangeFeedback(null);
                        }}
                        placeholder={
                          passwordProofMethod === "current-password"
                            ? "Mot de passe actuel"
                            : "Réponse de récupération"
                        }
                        className="w-full rounded-xl bg-input-background px-3 py-3 pr-10 text-sm font-semibold text-foreground outline-none ring-2 ring-transparent focus:ring-primary/30"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswordProofInput((previous) => !previous)}
                        aria-label={showPasswordProofInput ? "Masquer la valeur saisie" : "Afficher la valeur saisie"}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                      >
                        {showPasswordProofInput ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    <div className="relative mt-2">
                      <input
                        type={showPasswordChangeInput ? "text" : "password"}
                        value={passwordChangeInput}
                        onChange={(e) => {
                          setPasswordChangeInput(e.target.value);
                          if (passwordChangeFeedback) setPasswordChangeFeedback(null);
                        }}
                        placeholder="Nouveau mot de passe (min. 4 caractères)"
                        className="w-full rounded-xl bg-input-background px-3 py-3 pr-10 text-sm font-semibold text-foreground outline-none ring-2 ring-transparent focus:ring-primary/30"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswordChangeInput((previous) => !previous)}
                        aria-label={showPasswordChangeInput ? "Masquer le nouveau mot de passe saisi" : "Afficher le nouveau mot de passe saisi"}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                      >
                        {showPasswordChangeInput ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    <div className="relative mt-2">
                      <input
                        type={showPasswordChangeConfirmInput ? "text" : "password"}
                        value={passwordChangeConfirmInput}
                        onChange={(e) => {
                          setPasswordChangeConfirmInput(e.target.value);
                          if (passwordChangeFeedback) setPasswordChangeFeedback(null);
                        }}
                        placeholder="Confirmer le nouveau mot de passe"
                        className="w-full rounded-xl bg-input-background px-3 py-3 pr-10 text-sm font-semibold text-foreground outline-none ring-2 ring-transparent focus:ring-primary/30"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswordChangeConfirmInput((previous) => !previous)}
                        aria-label={showPasswordChangeConfirmInput ? "Masquer la confirmation saisie" : "Afficher la confirmation saisie"}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                      >
                        {showPasswordChangeConfirmInput ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={resetPasswordChangeFlow}
                        className="rounded-xl py-3 text-sm font-black border border-border text-foreground"
                      >
                        Annuler
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          const result = await onChangeProfilePasswordInSession(
                            passwordProofMethod,
                            passwordProofInput,
                            passwordChangeInput,
                            passwordChangeConfirmInput
                          );
                          setPasswordChangeFeedback(result.message);
                          if (result.ok) {
                            setPasswordProofInput("");
                            setPasswordChangeInput("");
                            setPasswordChangeConfirmInput("");
                            setShowPasswordChangeFlow(false);
                          }
                        }}
                        disabled={settingsWriteActionsDisabled}
                        className={`rounded-xl py-3 text-sm font-black bg-primary text-primary-foreground ${settingsDisabledButtonClass}`}
                      >
                        Confirmer le changement
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
            {passwordChangeFeedback && (
              <p className="mt-2 text-xs font-bold text-muted-foreground">{passwordChangeFeedback}</p>
            )}
            {profilePasswordFeedback && (
              <p className="mt-2 text-xs font-bold text-muted-foreground">{profilePasswordFeedback}</p>
            )}
        </div>

        <div className="bg-card rounded-2xl border border-border p-4">
            <p className="text-xs font-extrabold text-muted-foreground uppercase tracking-widest">
              Récupération du mot de passe profil
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              {profileRecoveryConfigured
                ? "Une question/réponse de récupération est configurée pour ce profil."
                : "Aucune récupération configurée pour ce profil."}
            </p>
            {profileRecoveryConfigured && (
              <p className="mt-3 text-[11px] font-extrabold text-muted-foreground uppercase tracking-widest">
                Question actuelle
              </p>
            )}
            <input
              type="text"
              value={profileRecoveryQuestionInput}
              onChange={(e) => {
                setProfileRecoveryQuestionInput(e.target.value);
                if (profileRecoveryFeedback) setProfileRecoveryFeedback(null);
              }}
              placeholder="Ex: Quel est votre plat préféré ?"
              maxLength={200}
              className="mt-2 w-full rounded-xl bg-input-background px-3 py-3 text-sm font-semibold text-foreground outline-none ring-2 ring-transparent focus:ring-primary/30"
            />
            {profileRecoveryConfigured && (
              <p className="mt-3 text-[11px] font-extrabold text-muted-foreground uppercase tracking-widest">
                Réponse actuelle
              </p>
            )}
            <input
              type={showProfileRecoveryInput ? "text" : "password"}
              value={profileRecoveryInput}
              onChange={(e) => {
                setProfileRecoveryInput(e.target.value);
                if (profileRecoveryFeedback) setProfileRecoveryFeedback(null);
              }}
              placeholder="Votre réponse personnelle (min. 5 caractères)"
              className="mt-2 w-full rounded-xl bg-input-background px-3 py-3 text-sm font-semibold text-foreground outline-none ring-2 ring-transparent focus:ring-primary/30"
            />
            <button
              onClick={() => setShowProfileRecoveryInput((previous) => !previous)}
              className="mt-2 text-xs font-black text-primary underline underline-offset-4"
            >
              {showProfileRecoveryInput ? "Masquer" : "Afficher"} la phrase saisie
            </button>
            <button
              onClick={async () => {
                const result = await onSaveProfileRecoveryData(
                  profileRecoveryQuestionInput,
                  profileRecoveryInput
                );
                setProfileRecoveryFeedback(result.message);
              }}
              disabled={settingsWriteActionsDisabled}
              className={`mt-3 w-full bg-primary text-primary-foreground rounded-xl py-3 text-sm font-black ${settingsDisabledButtonClass}`}
            >
              {profileRecoveryConfigured ? "Mettre à jour la récupération" : "Définir la récupération"}
            </button>
            {profileRecoveryFeedback && (
              <p className="mt-2 text-xs font-bold text-muted-foreground">{profileRecoveryFeedback}</p>
            )}
        </div>

        {profile.role === "proprietaire" ? (
          <div className="bg-card rounded-2xl border border-border p-4 mb-3">
            <p className="text-xs font-extrabold text-muted-foreground uppercase tracking-widest">
              Date de début du voyage
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Détermine la date de départ affichée à toute la famille. Les jours du
              séjour s'affichent ensuite avec leurs vraies dates.
            </p>
            <p className="text-sm font-bold text-foreground mt-3">
              Date actuellement enregistrée :{" "}
              {tripStartDate
                ? new Intl.DateTimeFormat("fr-FR", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  }).format(new Date(tripStartDate + "T00:00:00"))
                : "aucune date définie"}
            </p>
            <input
              type="date"
              value={tripStartDateInput}
              onChange={(e) => {
                setTripStartDateInput(e.target.value);
                if (tripStartDateFeedback) setTripStartDateFeedback(null);
              }}
              className="mt-2 w-full rounded-xl bg-input-background px-3 py-3 text-sm font-semibold text-foreground outline-none ring-2 ring-transparent focus:ring-primary/30"
            />
            <button
              onClick={async () => {
                const result = await onSaveTripStartDate(tripStartDateInput);
                setTripStartDateFeedback(result.message);
              }}
              disabled={settingsWriteActionsDisabled}
              className={`mt-2 w-full rounded-xl bg-primary text-primary-foreground font-black text-sm py-2.5 active:scale-95 transition-transform ${settingsDisabledButtonClass}`}
            >
              Enregistrer la date de début
            </button>
            {tripStartDateFeedback && (
              <p className="text-xs text-muted-foreground mt-2">{tripStartDateFeedback}</p>
            )}
          </div>
        ) : null}

        {profile.role === "proprietaire" ? (
          <div className="bg-card rounded-2xl border border-border p-4">
            <p className="text-xs font-extrabold text-muted-foreground uppercase tracking-widest">
              Code propriétaire
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              {ownerCodeConfigured
                ? ownerCodeCurrent
                  ? "Un code est déjà configuré. Vous pouvez le consulter ou le remplacer."
                  : "Code configuré avant l'ajout de cet affichage : saisissez-le à nouveau ci-dessous pour pouvoir le consulter."
                : "Aucun code configuré pour le moment."}
            </p>

            <div className="relative mt-2">
              <input
                type={showOwnerCodeInput ? "text" : "password"}
                value={ownerCodeInput}
                onChange={(e) => {
                  setOwnerCodeInput(e.target.value);
                  if (ownerCodeFeedback) setOwnerCodeFeedback(null);
                }}
                placeholder="Minimum 4 caractères"
                className="w-full rounded-xl bg-input-background px-3 py-3 pr-10 text-sm font-semibold text-foreground outline-none ring-2 ring-transparent focus:ring-primary/30"
              />
              <button
                type="button"
                onClick={() => setShowOwnerCodeInput((previous) => !previous)}
                aria-label={showOwnerCodeInput ? "Masquer le code" : "Afficher le code"}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              >
                {showOwnerCodeInput ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <button
              onClick={async () => {
                const result = await onSaveOwnerCode(ownerCodeInput);
                setOwnerCodeFeedback(result.message);
              }}
              disabled={settingsWriteActionsDisabled}
              className={`mt-3 w-full bg-primary text-primary-foreground rounded-xl py-3 text-sm font-black ${settingsDisabledButtonClass}`}
            >
              {ownerCodeConfigured ? "Mettre à jour le code" : "Définir le code"}
            </button>
            {ownerCodeFeedback && (
              <p className="mt-2 text-xs font-bold text-muted-foreground">{ownerCodeFeedback}</p>
            )}

            <div className="mt-4 border-t border-border pt-4">
              <p className="text-xs font-extrabold text-muted-foreground uppercase tracking-widest">
                Code voyageur
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                {travelerCodeConfigured
                  ? travelerCodeCurrent
                    ? "Un code est déjà configuré. Vous pouvez le consulter ou le remplacer."
                    : "Code configuré avant l'ajout de cet affichage : saisissez-le à nouveau ci-dessous pour pouvoir le consulter."
                  : "Non configuré. Les membres de la famille en ont besoin pour rejoindre en tant que Voyageur."}
              </p>

              <div className="relative mt-2">
                <input
                  type={showTravelerCodeInput ? "text" : "password"}
                  value={travelerCodeInput}
                  onChange={(e) => {
                    setTravelerCodeInput(e.target.value);
                    if (travelerCodeFeedback) setTravelerCodeFeedback(null);
                  }}
                  placeholder="Minimum 4 caractères"
                  className="w-full rounded-xl bg-input-background px-3 py-3 pr-10 text-sm font-semibold text-foreground outline-none ring-2 ring-transparent focus:ring-primary/30"
                />
                <button
                  type="button"
                  onClick={() => setShowTravelerCodeInput((previous) => !previous)}
                  aria-label={showTravelerCodeInput ? "Masquer le code voyageur" : "Afficher le code voyageur"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                >
                  {showTravelerCodeInput ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <button
                onClick={async () => {
                  const result = await onSaveTravelerCode(travelerCodeInput);
                  setTravelerCodeFeedback(result.message);
                }}
                disabled={settingsWriteActionsDisabled}
                className={`mt-3 w-full bg-primary text-primary-foreground rounded-xl py-3 text-sm font-black ${settingsDisabledButtonClass}`}
              >
                {travelerCodeConfigured ? "Mettre à jour le code voyageur" : "Définir le code voyageur"}
              </button>
              {travelerCodeFeedback && (
                <p className="mt-2 text-xs font-bold text-muted-foreground">{travelerCodeFeedback}</p>
              )}
              {ownerCodeConfigured &&
                travelerCodeConfigured &&
                ownerCodeCurrent &&
                travelerCodeCurrent &&
                ownerCodeCurrent === travelerCodeCurrent && (
                  <p className="mt-2 text-xs font-bold text-amber-600">
                    Ce code est identique au code propriétaire. Deux codes différents sont recommandés.
                  </p>
                )}
            </div>

            {profile.role === "proprietaire" && (
              <>
                <div className="mt-4 border-t border-border pt-4">
                  <p className="text-xs font-extrabold text-muted-foreground uppercase tracking-widest">
                    État de l'application
                  </p>
                  <span
                    className={`inline-flex items-center gap-1 mt-2 rounded-full px-3 py-1 text-xs font-black ${
                      appLocked
                        ? "bg-destructive/15 text-destructive"
                        : "bg-accent/20 text-accent"
                    }`}
                  >
                    {appLocked ? "✈️ Verrouillée" : "✅ Débloquée"}
                  </span>
                  <button
                    onClick={() => {
                      if (!ownerLockActionsEnabled) {
                        setLockToggleFeedback("Configurez d'abord un code propriétaire pour verrouiller/déverrouiller l'application.");
                        return;
                      }
                      setLockToggleCodeInput("");
                      setLockToggleFeedback(null);
                      setShowLockToggleCodeInput(false);
                      setShowLockTogglePrompt(true);
                    }}
                    disabled={!ownerLockActionsEnabled || settingsWriteActionsDisabled}
                    className={`mt-3 w-full rounded-xl py-3 text-sm font-black border border-border text-foreground ${settingsDisabledButtonClass}`}
                  >
                    {appLocked ? "Débloquer l'application" : "Bloquer l'application"}
                  </button>
                  {!ownerLockActionsEnabled && (
                    <p className="mt-2 text-xs font-bold text-muted-foreground">
                      Définissez d'abord un code propriétaire pour activer cette action.
                    </p>
                  )}
                  <button
                    onClick={onOpenLaunchReplay}
                    disabled={settingsWriteActionsDisabled}
                    className={`mt-2 w-full rounded-xl py-3 text-sm font-black border border-border text-foreground ${settingsDisabledButtonClass}`}
                  >
                    Rejouer le rituel de départ
                  </button>
                </div>

                {showLockTogglePrompt && (
                  <div className="absolute inset-0 bg-black/45 backdrop-blur-[1px] flex items-end md:items-center justify-center p-4 z-20">
                    <div className="w-full md:max-w-sm bg-card rounded-2xl border border-border p-4">
                      <p className="text-sm font-black text-foreground">Validation propriétaire</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Entrez le code propriétaire pour {appLocked ? "débloquer" : "bloquer"} l'application.
                      </p>

                      <input
                        type={showLockToggleCodeInput ? "text" : "password"}
                        value={lockToggleCodeInput}
                        onChange={(e) => {
                          setLockToggleCodeInput(e.target.value);
                          if (lockToggleFeedback) setLockToggleFeedback(null);
                        }}
                        placeholder="Code propriétaire"
                        className="mt-3 w-full rounded-xl bg-input-background px-3 py-3 text-sm font-semibold text-foreground outline-none ring-2 ring-transparent focus:ring-primary/30"
                      />
                      <button
                        onClick={() => setShowLockToggleCodeInput((previous) => !previous)}
                        className="mt-2 text-xs font-black text-primary underline underline-offset-4"
                      >
                        {showLockToggleCodeInput ? "Masquer" : "Afficher"} le code saisi
                      </button>

                      {lockToggleFeedback && (
                        <p className="mt-2 text-xs font-bold text-destructive">{lockToggleFeedback}</p>
                      )}

                      <div className="mt-4 grid grid-cols-2 gap-2">
                        <button
                          onClick={() => {
                            setShowLockTogglePrompt(false);
                            setLockToggleCodeInput("");
                            setLockToggleFeedback(null);
                            setShowLockToggleCodeInput(false);
                          }}
                          className="rounded-xl py-3 text-sm font-black border border-border text-foreground"
                        >
                          Annuler
                        </button>
                        <button
                          onClick={async () => {
                            const result = await onToggleLock(lockToggleCodeInput);
                            if (result.ok) {
                              setShowLockTogglePrompt(false);
                              setLockToggleCodeInput("");
                              setLockToggleFeedback(null);
                              setShowLockToggleCodeInput(false);
                              return;
                            }

                            setLockToggleFeedback(result.message);
                          }}
                          disabled={settingsWriteActionsDisabled}
                          className={`rounded-xl py-3 text-sm font-black bg-primary text-primary-foreground ${settingsDisabledButtonClass}`}
                        >
                          Valider
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        ) : (
          <div className="bg-card rounded-2xl border border-border p-4">
            <p className="text-xs font-extrabold text-muted-foreground uppercase tracking-widest">
              Code propriétaire
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Seul un profil propriétaire peut configurer ce code.
            </p>
          </div>
        )}

        {profile.role === "proprietaire" && cloudEnabled && (
          <div className="bg-card rounded-2xl border border-border p-4">
            <p className="text-xs font-extrabold text-muted-foreground uppercase tracking-widest">
              Journée de jeu
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              {formatTripDayLabel(currentDay, tripStartDate)} —{" "}
              {gameDayOverride === "open"
                ? "ouverte manuellement (rejouable)"
                : gameDayOverride === "closed"
                  ? "fermée manuellement"
                  : "automatique (verrouillage normal après complétion)"}
            </p>
            <div className="mt-3 grid grid-cols-1 gap-2">
              <button
                onClick={() => {
                  setPendingDayOverrideAction("open");
                  setDayOverrideCodeInput("");
                  setDayOverrideFeedback(null);
                  setShowDayOverrideCodeInput(false);
                  setShowDayOverridePrompt(true);
                }}
                disabled={settingsWriteActionsDisabled || gameDayOverride === "open"}
                className={`w-full rounded-xl py-3 text-sm font-black border border-border text-foreground ${settingsDisabledButtonClass}`}
              >
                Forcer l&apos;ouverture ({formatTripDayLabel(currentDay, tripStartDate)})
              </button>
              <button
                onClick={() => {
                  setPendingDayOverrideAction("closed");
                  setDayOverrideCodeInput("");
                  setDayOverrideFeedback(null);
                  setShowDayOverrideCodeInput(false);
                  setShowDayOverridePrompt(true);
                }}
                disabled={settingsWriteActionsDisabled || gameDayOverride === "closed"}
                className={`w-full rounded-xl py-3 text-sm font-black border border-border text-foreground ${settingsDisabledButtonClass}`}
              >
                Forcer la fermeture ({formatTripDayLabel(currentDay, tripStartDate)})
              </button>
              <button
                onClick={() => {
                  setPendingDayOverrideAction(null);
                  setDayOverrideCodeInput("");
                  setDayOverrideFeedback(null);
                  setShowDayOverrideCodeInput(false);
                  setShowDayOverridePrompt(true);
                }}
                disabled={settingsWriteActionsDisabled || gameDayOverride === null}
                className={`w-full rounded-xl py-3 text-sm font-black border border-border text-foreground ${settingsDisabledButtonClass}`}
              >
                Revenir à l&apos;automatique
              </button>
            </div>
          </div>
        )}

        {showDayOverridePrompt && (
          <div className="absolute inset-0 bg-black/45 backdrop-blur-[1px] flex items-end md:items-center justify-center p-4 z-20">
            <div className="w-full md:max-w-sm bg-card rounded-2xl border border-border p-4">
              <p className="text-sm font-black text-foreground">Validation propriétaire</p>
              <p className="text-xs text-muted-foreground mt-1">
                Entrez le code propriétaire pour{" "}
                {pendingDayOverrideAction === "open"
                  ? `forcer l'ouverture (${formatTripDayLabel(currentDay, tripStartDate)})`
                  : pendingDayOverrideAction === "closed"
                    ? `forcer la fermeture (${formatTripDayLabel(currentDay, tripStartDate)})`
                    : "revenir à l'automatique"}
                .
              </p>

              <input
                type={showDayOverrideCodeInput ? "text" : "password"}
                value={dayOverrideCodeInput}
                onChange={(e) => {
                  setDayOverrideCodeInput(e.target.value);
                  if (dayOverrideFeedback) setDayOverrideFeedback(null);
                }}
                placeholder="Code propriétaire"
                className="mt-3 w-full rounded-xl bg-input-background px-3 py-3 text-sm font-semibold text-foreground outline-none ring-2 ring-transparent focus:ring-primary/30"
              />
              <button
                onClick={() => setShowDayOverrideCodeInput((previous) => !previous)}
                className="mt-2 text-xs font-black text-primary underline underline-offset-4"
              >
                {showDayOverrideCodeInput ? "Masquer" : "Afficher"} le code saisi
              </button>

              {dayOverrideFeedback && (
                <p className="mt-2 text-xs font-bold text-destructive">{dayOverrideFeedback}</p>
              )}

              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    setShowDayOverridePrompt(false);
                    setDayOverrideCodeInput("");
                    setDayOverrideFeedback(null);
                    setShowDayOverrideCodeInput(false);
                  }}
                  className="rounded-xl py-3 text-sm font-black border border-border text-foreground"
                >
                  Annuler
                </button>
                <button
                  onClick={async () => {
                    const result = await onSetGameDayOverride(
                      dayOverrideCodeInput,
                      pendingDayOverrideAction
                    );
                    if (result.ok) {
                      setShowDayOverridePrompt(false);
                      setDayOverrideCodeInput("");
                      setDayOverrideFeedback(null);
                      setShowDayOverrideCodeInput(false);
                      return;
                    }

                    setDayOverrideFeedback(result.message);
                  }}
                  disabled={settingsWriteActionsDisabled}
                  className={`rounded-xl py-3 text-sm font-black bg-primary text-primary-foreground ${settingsDisabledButtonClass}`}
                >
                  Valider
                </button>
              </div>
            </div>
          </div>
        )}

        {profile.role === "proprietaire" && cloudEnabled && (
          <div className="bg-card rounded-2xl border border-destructive/30 p-4">
            <p className="text-xs font-extrabold text-destructive uppercase tracking-widest">
              Réinitialiser les scores
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Remet à 0 les compteurs de toute la famille (et donc le podium). À utiliser en cas de
              souci — action irréversible.
            </p>
            <button
              onClick={() => {
                setPendingScoreResetAction({ kind: "all" });
                setScoreResetCodeInput("");
                setScoreResetFeedback(null);
                setShowScoreResetCodeInput(false);
                setShowScoreResetPrompt(true);
              }}
              disabled={settingsWriteActionsDisabled}
              className={`mt-3 w-full rounded-xl py-3 text-sm font-black border border-destructive text-destructive ${settingsDisabledButtonClass}`}
            >
              Réinitialiser tous les scores
            </button>

            <div className="mt-3 flex items-center gap-2">
              <select
                value={scoreResetDayInput}
                onChange={(e) => setScoreResetDayInput(Number(e.target.value))}
                className="flex-1 rounded-xl bg-input-background px-3 py-3 text-sm font-semibold text-foreground outline-none ring-2 ring-transparent focus:ring-primary/30"
              >
                {Array.from(
                  { length: Math.max(lastDefinedDay ?? currentDay, 1) },
                  (_, i) => i + 1
                ).map((day) => (
                  <option key={day} value={day}>
                    {formatTripDayLabel(day, tripStartDate)}
                  </option>
                ))}
              </select>
              <button
                onClick={() => {
                  setPendingScoreResetAction({ kind: "day", day: scoreResetDayInput });
                  setScoreResetCodeInput("");
                  setScoreResetFeedback(null);
                  setShowScoreResetCodeInput(false);
                  setShowScoreResetPrompt(true);
                }}
                disabled={settingsWriteActionsDisabled}
                className={`rounded-xl py-3 px-4 text-sm font-black border border-destructive text-destructive ${settingsDisabledButtonClass}`}
              >
                Réinitialiser ce jour
              </button>
            </div>
          </div>
        )}

        {profile.role === "proprietaire" && cloudEnabled && familyMembersForGameProgressReset.length > 0 && (
          <div className="bg-card rounded-2xl border border-destructive/30 p-4">
            <p className="text-xs font-extrabold text-destructive uppercase tracking-widest">
              Réinitialiser une partie en cours
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Remet à 0 le quiz/l&apos;énigme/le défi non terminés d&apos;un profil, qui repart au
              début du quiz. Ne touche pas aux scores déjà validés des autres jours.
            </p>
            <div className="mt-3 flex items-center gap-2">
              <select
                value={gameProgressResetProfileInput}
                onChange={(e) => setGameProgressResetProfileInput(e.target.value)}
                className="flex-1 rounded-xl bg-input-background px-3 py-3 text-sm font-semibold text-foreground outline-none ring-2 ring-transparent focus:ring-primary/30"
              >
                {familyMembersForGameProgressReset.map((member) => (
                  <option key={member.profileId} value={member.profileId}>
                    {member.surname}
                  </option>
                ))}
              </select>
              <button
                onClick={() => {
                  setPendingGameProgressResetProfileId(gameProgressResetProfileInput);
                  setGameProgressResetCodeInput("");
                  setGameProgressResetFeedback(null);
                  setShowGameProgressResetCodeInput(false);
                  setShowGameProgressResetPrompt(true);
                }}
                disabled={settingsWriteActionsDisabled}
                className={`rounded-xl py-3 px-4 text-sm font-black border border-destructive text-destructive ${settingsDisabledButtonClass}`}
              >
                Réinitialiser
              </button>
            </div>
          </div>
        )}

        {showGameProgressResetPrompt && pendingGameProgressResetProfileId && (
          <div className="absolute inset-0 bg-black/45 backdrop-blur-[1px] flex items-end md:items-center justify-center p-4 z-20">
            <div className="w-full md:max-w-sm bg-card rounded-2xl border border-border p-4">
              <p className="text-sm font-black text-foreground">Validation propriétaire</p>
              <p className="text-xs text-muted-foreground mt-1">
                Entrez le code propriétaire pour confirmer la réinitialisation de la partie en cours
                de{" "}
                {familyMembersForGameProgressReset.find(
                  (member) => member.profileId === pendingGameProgressResetProfileId
                )?.surname ?? "ce profil"}
                . Cette action est irréversible.
              </p>

              <input
                type={showGameProgressResetCodeInput ? "text" : "password"}
                value={gameProgressResetCodeInput}
                onChange={(e) => {
                  setGameProgressResetCodeInput(e.target.value);
                  if (gameProgressResetFeedback) setGameProgressResetFeedback(null);
                }}
                placeholder="Code propriétaire"
                className="mt-3 w-full rounded-xl bg-input-background px-3 py-3 text-sm font-semibold text-foreground outline-none ring-2 ring-transparent focus:ring-primary/30"
              />
              <button
                onClick={() => setShowGameProgressResetCodeInput((previous) => !previous)}
                className="mt-2 text-xs font-black text-primary underline underline-offset-4"
              >
                {showGameProgressResetCodeInput ? "Masquer" : "Afficher"} le code saisi
              </button>

              {gameProgressResetFeedback && (
                <p className="mt-2 text-xs font-bold text-destructive">{gameProgressResetFeedback}</p>
              )}

              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    setShowGameProgressResetPrompt(false);
                    setPendingGameProgressResetProfileId(null);
                    setGameProgressResetCodeInput("");
                    setGameProgressResetFeedback(null);
                    setShowGameProgressResetCodeInput(false);
                  }}
                  className="rounded-xl py-3 text-sm font-black border border-border text-foreground"
                >
                  Annuler
                </button>
                <button
                  onClick={async () => {
                    const result = await onResetGameProgress(
                      gameProgressResetCodeInput,
                      pendingGameProgressResetProfileId
                    );
                    if (result.ok) {
                      setShowGameProgressResetPrompt(false);
                      setPendingGameProgressResetProfileId(null);
                      setGameProgressResetCodeInput("");
                      setGameProgressResetFeedback(null);
                      setShowGameProgressResetCodeInput(false);
                      return;
                    }

                    setGameProgressResetFeedback(result.message);
                  }}
                  disabled={settingsWriteActionsDisabled}
                  className={`rounded-xl py-3 text-sm font-black bg-destructive text-destructive-foreground ${settingsDisabledButtonClass}`}
                >
                  Valider
                </button>
              </div>
            </div>
          </div>
        )}

        {showScoreResetPrompt && pendingScoreResetAction && (
          <div className="absolute inset-0 bg-black/45 backdrop-blur-[1px] flex items-end md:items-center justify-center p-4 z-20">
            <div className="w-full md:max-w-sm bg-card rounded-2xl border border-border p-4">
              <p className="text-sm font-black text-foreground">Validation propriétaire</p>
              <p className="text-xs text-muted-foreground mt-1">
                Entrez le code propriétaire pour confirmer{" "}
                {pendingScoreResetAction.kind === "all"
                  ? "la réinitialisation de tous les scores"
                  : `la réinitialisation des scores du ${formatTripDayLabel(pendingScoreResetAction.day, tripStartDate)}`}
                . Cette action est irréversible.
              </p>

              <input
                type={showScoreResetCodeInput ? "text" : "password"}
                value={scoreResetCodeInput}
                onChange={(e) => {
                  setScoreResetCodeInput(e.target.value);
                  if (scoreResetFeedback) setScoreResetFeedback(null);
                }}
                placeholder="Code propriétaire"
                className="mt-3 w-full rounded-xl bg-input-background px-3 py-3 text-sm font-semibold text-foreground outline-none ring-2 ring-transparent focus:ring-primary/30"
              />
              <button
                onClick={() => setShowScoreResetCodeInput((previous) => !previous)}
                className="mt-2 text-xs font-black text-primary underline underline-offset-4"
              >
                {showScoreResetCodeInput ? "Masquer" : "Afficher"} le code saisi
              </button>

              {scoreResetFeedback && (
                <p className="mt-2 text-xs font-bold text-destructive">{scoreResetFeedback}</p>
              )}

              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    setShowScoreResetPrompt(false);
                    setPendingScoreResetAction(null);
                    setScoreResetCodeInput("");
                    setScoreResetFeedback(null);
                    setShowScoreResetCodeInput(false);
                  }}
                  className="rounded-xl py-3 text-sm font-black border border-border text-foreground"
                >
                  Annuler
                </button>
                <button
                  onClick={async () => {
                    const result = await onResetScores(
                      scoreResetCodeInput,
                      pendingScoreResetAction
                    );
                    if (result.ok) {
                      setShowScoreResetPrompt(false);
                      setPendingScoreResetAction(null);
                      setScoreResetCodeInput("");
                      setScoreResetFeedback(null);
                      setShowScoreResetCodeInput(false);
                      return;
                    }

                    setScoreResetFeedback(result.message);
                  }}
                  disabled={settingsWriteActionsDisabled}
                  className={`rounded-xl py-3 text-sm font-black bg-destructive text-destructive-foreground ${settingsDisabledButtonClass}`}
                >
                  Valider
                </button>
              </div>
            </div>
          </div>
        )}

        {cloudEnabled && (
          <div className="bg-card rounded-2xl border border-border p-4">
            <p className="text-xs font-extrabold text-muted-foreground uppercase tracking-widest">
              Session
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Déconnectez-vous pour changer de profil sur cet appareil.
            </p>
            <button
              onClick={() => setShowSwitchProfilePrompt(true)}
              disabled={settingsWriteActionsDisabled}
              className={`mt-3 w-full rounded-xl py-3 text-sm font-black border border-border text-foreground ${settingsDisabledButtonClass}`}
            >
              Se déconnecter / Changer de profil
            </button>
          </div>
        )}

        {profile.role !== "proprietaire" && (
          <div className="bg-card rounded-2xl border border-destructive/30 p-4">
            <p className="text-xs font-extrabold text-destructive uppercase tracking-widest">
              Zone dangereuse
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Supprimez définitivement votre profil et toutes les données qui lui sont associées.
            </p>
            <button
              onClick={() => {
                setDeleteProfileConfirmError(null);
                setDeleteProfileProofInput("");
                setShowDeleteProfileProofInput(false);
                setShowDeleteProfileCredentialStep(false);
                setDeleteProfileProofMethod("password");
                setShowDeleteProfilePrompt(true);
              }}
              disabled={settingsWriteActionsDisabled}
              className={`mt-3 w-full rounded-xl py-3 text-sm font-black border border-destructive text-destructive ${settingsDisabledButtonClass}`}
            >
              Supprimer mon profil
            </button>
          </div>
        )}
      </div>

      {showSwitchProfilePrompt && (
        <div className="absolute inset-0 bg-black/45 backdrop-blur-[1px] flex items-end md:items-center justify-center p-4 z-20">
          <div className="w-full md:max-w-sm bg-card rounded-2xl border border-border p-4">
            <p className="text-sm font-black text-foreground">Confirmer la déconnexion</p>
            <p className="text-xs text-muted-foreground mt-1">
              Voulez-vous vraiment vous déconnecter et revenir à la sélection de profil ?
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                onClick={() => setShowSwitchProfilePrompt(false)}
                className="rounded-xl py-3 text-sm font-black border border-border text-foreground"
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  setShowSwitchProfilePrompt(false);
                  onSwitchProfile();
                }}
                disabled={settingsWriteActionsDisabled}
                className={`rounded-xl py-3 text-sm font-black bg-primary text-primary-foreground ${settingsDisabledButtonClass}`}
              >
                Oui, se déconnecter
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteProfilePrompt && (
        <div className="absolute inset-0 bg-black/45 backdrop-blur-[1px] flex items-end md:items-center justify-center p-4 z-20">
          <div className="w-full md:max-w-sm bg-card rounded-2xl border border-border p-4">
            <p className="text-sm font-black text-destructive">Supprimer mon profil</p>
            <p className="text-xs text-muted-foreground mt-2">
              Cette action est irréversible. Les données suivantes seront définitivement supprimées :
            </p>
            <ul className="mt-2 text-xs text-muted-foreground list-disc list-inside space-y-1">
              <li>Votre profil et vos informations personnelles</li>
              <li>Votre checklist et vos personnalisations</li>
              <li>Votre historique de jeux et résultats</li>
              <li>Votre mot de passe et question de récupération</li>
            </ul>
            <p className="mt-2 text-xs font-bold text-foreground">
              Les données partagées de la famille (phase de voyage, catalogue partagé) ne seront pas affectées.
            </p>

            {!showDeleteProfileCredentialStep && (
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  onClick={() => setShowDeleteProfilePrompt(false)}
                  className="rounded-xl py-3 text-sm font-black border border-border text-foreground"
                >
                  Annuler
                </button>
                {profilePasswordConfigured ? (
                  <button
                    onClick={() => setShowDeleteProfileCredentialStep(true)}
                    disabled={settingsWriteActionsDisabled}
                    className={`rounded-xl py-3 text-sm font-black bg-destructive text-destructive-foreground ${settingsDisabledButtonClass}`}
                  >
                    Continuer
                  </button>
                ) : (
                  <button
                    onClick={async () => {
                      const result = await onDeleteOwnProfile("none", "");
                      if (!result.ok) {
                        setDeleteProfileConfirmError(result.message);
                        setShowDeleteProfilePrompt(false);
                      }
                    }}
                    disabled={settingsWriteActionsDisabled}
                    className={`rounded-xl py-3 text-sm font-black bg-destructive text-destructive-foreground ${settingsDisabledButtonClass}`}
                  >
                    Supprimer définitivement
                  </button>
                )}
              </div>
            )}

            {showDeleteProfileCredentialStep && (
              <div className="mt-3">
                <p className="text-xs font-extrabold text-muted-foreground uppercase tracking-widest">
                  Confirmez votre identité
                </p>
                {profileRecoveryConfigured && (
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setDeleteProfileProofMethod("password")}
                      className={`rounded-xl py-2 text-xs font-black border transition-colors ${
                        deleteProfileProofMethod === "password"
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-border text-foreground"
                      }`}
                    >
                      Mot de passe
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteProfileProofMethod("recovery")}
                      className={`rounded-xl py-2 text-xs font-black border transition-colors ${
                        deleteProfileProofMethod === "recovery"
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-border text-foreground"
                      }`}
                    >
                      Récupération
                    </button>
                  </div>
                )}
                {deleteProfileProofMethod === "recovery" && profileRecoveryConfigured && (
                  <>
                    <p className="mt-3 text-[11px] font-extrabold text-muted-foreground uppercase tracking-widest">
                      Question de récupération
                    </p>
                    <p className="mt-1 rounded-xl border border-border bg-muted/30 px-3 py-2 text-sm font-bold text-foreground">
                      {profileRecoveryQuestion || "Question indisponible"}
                    </p>
                  </>
                )}
                <input
                  type={showDeleteProfileProofInput ? "text" : "password"}
                  value={deleteProfileProofInput}
                  onChange={(e) => {
                    setDeleteProfileProofInput(e.target.value);
                    if (deleteProfileConfirmError) setDeleteProfileConfirmError(null);
                  }}
                  placeholder={
                    deleteProfileProofMethod === "password"
                      ? "Mot de passe du profil"
                      : "Réponse de récupération"
                  }
                  className="mt-2 w-full rounded-xl bg-input-background px-3 py-3 text-sm font-semibold text-foreground outline-none ring-2 ring-transparent focus:ring-primary/30"
                />
                <button
                  type="button"
                  onClick={() => setShowDeleteProfileProofInput((prev) => !prev)}
                  className="mt-2 text-xs font-black text-primary underline underline-offset-4"
                >
                  {showDeleteProfileProofInput ? "Masquer" : "Afficher"} la valeur saisie
                </button>
                {deleteProfileConfirmError && (
                  <p className="mt-2 text-xs font-bold text-destructive">{deleteProfileConfirmError}</p>
                )}
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      setShowDeleteProfilePrompt(false);
                      setShowDeleteProfileCredentialStep(false);
                      setDeleteProfileProofInput("");
                      setDeleteProfileConfirmError(null);
                    }}
                    className="rounded-xl py-3 text-sm font-black border border-border text-foreground"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={async () => {
                      const result = await onDeleteOwnProfile(
                        deleteProfileProofMethod,
                        deleteProfileProofInput
                      );
                      if (!result.ok) {
                        setDeleteProfileConfirmError(result.message);
                      }
                    }}
                    disabled={settingsWriteActionsDisabled}
                    className={`rounded-xl py-3 text-sm font-black bg-destructive text-destructive-foreground ${settingsDisabledButtonClass}`}
                  >
                    Supprimer définitivement
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── MAIN APP ────────────────────────────────────────────────────────────────

export default function App() {
  const ACTIVE_PROFILE_ID_KEY = "jp-active-profile-id";
  const SESSION_TOKEN_KEY = "jp-session-token";
  const SESSION_TOKEN_PROFILE_ID_KEY = "jp-session-token-profile-id";
  const SESSION_TOKEN_TIMESTAMP_KEY = "jp-session-token-timestamp";
  const SESSION_TOKEN_VALIDITY_DAYS = 7;

  // Generate a simple session token (in production, use cryptographically secure tokens)
  const generateSessionToken = () => {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  };

  const isSessionTokenValid = () => {
    try {
      const timestamp = localStorage.getItem(SESSION_TOKEN_TIMESTAMP_KEY);
      if (!timestamp) return false;

      const createdAt = parseInt(timestamp, 10);
      const nowMs = Date.now();
      const validityMs = SESSION_TOKEN_VALIDITY_DAYS * 24 * 60 * 60 * 1000;

      return nowMs - createdAt < validityMs;
    } catch {
      return false;
    }
  };

  const saveSessionToken = (profileId: string) => {
    try {
      localStorage.setItem(SESSION_TOKEN_KEY, generateSessionToken());
      localStorage.setItem(SESSION_TOKEN_PROFILE_ID_KEY, profileId);
      localStorage.setItem(SESSION_TOKEN_TIMESTAMP_KEY, Date.now().toString());
    } catch {
      // Ignore storage errors
    }
  };

  const clearSessionToken = () => {
    try {
      localStorage.removeItem(SESSION_TOKEN_KEY);
      localStorage.removeItem(SESSION_TOKEN_PROFILE_ID_KEY);
      localStorage.removeItem(SESSION_TOKEN_TIMESTAMP_KEY);
    } catch {
      // Ignore storage errors
    }
  };

  const {
    cloudEnabled,
    cloudReady,
    cloudAuthError,
    cloudActorUid,
    cloudSnapshot,
    pushSnapshot,
    claimRoleForProfile,
    deleteProfile,
    setGameDayOverride,
    setPlaceDayOverride,
    setPlaceVisibility: setPlaceVisibilityInCloud,
    setPlaceSeen: setPlaceSeenInCloud,
    // Défauts de secours : ces trois fonctions carnet de visite sont plus
    // récentes que la plupart des mocks useCloudSync des tests d'intégration
    // (qui fournissent un objet réduit à la main). subscribeToPlaceVisitLog
    // est en plus appelée automatiquement dès qu'un lieu est ouvert (effet
    // sur selectedPlaceId), contrairement aux autres fonctions cloud
    // ci-dessus qui ne sont déclenchées que par une action utilisateur — un
    // mock qui ne la fournit pas ne doit donc pas faire planter tout l'écran
    // "place". Sans effet en production : useCloudSync() fournit toujours
    // les vraies implémentations.
    subscribeToPlaceVisitLog = () => () => {},
    upsertCarnetVisiteEntry: upsertCarnetVisiteEntryInCloud = async () => {},
    deleteCarnetVisiteEntry: deleteCarnetVisiteEntryInCloud = async () => {},
    // Même filet de sécurité que ci-dessus pour le carnet de visite des
    // rubriques de contenu (Histoire, Culture et tradition, Géographie et
    // économie).
    subscribeToContentVisitLog = () => () => {},
    upsertCarnetContentEntry: upsertCarnetContentEntryInCloud = async () => {},
    deleteCarnetContentEntry: deleteCarnetContentEntryInCloud = async () => {},
    setContentOverride: setContentOverrideInCloud,
    setTripStartDate: setTripStartDateInCloud,
    setGameScoring: setGameScoringInCloud,
    resetGameResults,
    resetGameProgress,
    registerAsOwnerDevice,
    pushOwnerPhaseChange,
    retryCloudAccess,
  } = useCloudSync();
  const [isOnline, setIsOnline] = useState(() => {
    if (typeof navigator === "undefined") {
      return true;
    }
    return navigator.onLine;
  });
  const [profile, setProfile] = useState<Profile>(() => {
    if (cloudEnabled) {
      return { id: createProfileId(), surname: "", role: null, gender: "unspecified", householdRole: "member" };
    }

    try {
      const parsed = JSON.parse(localStorage.getItem("jp-profile") || "{}");
      const role =
        parsed?.role === "proprietaire" || parsed?.role === "utilisateur"
          ? parsed.role
          : null;
      const gender: Gender =
        parsed?.gender === "male" || parsed?.gender === "female"
          ? parsed.gender
          : "unspecified";
      const householdRole: HouseholdRole =
        parsed?.householdRole === "parent" || parsed?.householdRole === "child"
          ? parsed.householdRole
          : parsed?.householdRole === "teen"
            ? "child"
          : "member";
      return {
        id: typeof parsed?.id === "string" && parsed.id.trim() ? parsed.id : createProfileId(),
        surname: typeof parsed?.surname === "string" ? parsed.surname : "",
        role,
        gender,
        householdRole,
      };
    } catch {
      return { id: createProfileId(), surname: "", role: null, gender: "unspecified", householdRole: "member" };
    }
  });
  const [familyState, setFamilyState] = useState<SharedFamilyState>(() => {
    if (cloudEnabled) {
      return parseSharedFamilyState(null);
    }

    try {
      const fromStorage = parseSharedFamilyState(localStorage.getItem("jp-family-state"));
      return enforceOwnerUniqueness(fromStorage);
    } catch {
      return parseSharedFamilyState(null);
    }
  });
  const [profileError, setProfileError] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => !cloudEnabled);
  const [isAuthBootstrapPending, setIsAuthBootstrapPending] = useState<boolean>(() => cloudEnabled);
  const [isInitializing, setIsInitializing] = useState<boolean>(() => cloudEnabled);
  const [isProfileHydrationPending, setIsProfileHydrationPending] = useState(false);
  const [selectedLoginProfileId, setSelectedLoginProfileId] = useState<string | null>(null);
  const [createProfileSurname, setCreateProfileSurname] = useState("");
  const [phase, setPhase] = useState<"before" | "during">(() => {
    if (cloudEnabled) {
      return "before";
    }

    try {
      return (
        (localStorage.getItem("jp-phase") as "before" | "during") || "before"
      );
    } catch {
      return "before";
    }
  });
  const [launchGateCycle, setLaunchGateCycle] = useState<number>(() => {
    if (cloudEnabled) {
      return 0;
    }
    try {
      const raw = localStorage.getItem(LAUNCH_GATE_CYCLE_STORAGE_KEY);
      const parsed = raw ? Number(raw) : 0;
      return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : 0;
    } catch {
      return 0;
    }
  });
  const [launchGateCompletedCycleByProfile, setLaunchGateCompletedCycleByProfile] = useState<Record<string, number>>(() => {
    if (cloudEnabled) {
      try {
        const persistedRaw = JSON.parse(localStorage.getItem(LAUNCH_GATE_COMPLETED_CYCLE_STORAGE_KEY) || "{}");
        const pendingRaw = JSON.parse(localStorage.getItem(LAUNCH_GATE_PENDING_COMPLETION_STORAGE_KEY) || "{}");
        const persisted = parseLaunchGateCompletionMap(persistedRaw);
        const pending = parseLaunchGateCompletionMap(pendingRaw);
        const merged: Record<string, number> = { ...persisted };
        for (const [profileId, cycle] of Object.entries(pending)) {
          merged[profileId] = Math.max(merged[profileId] ?? -1, cycle);
        }
        return merged;
      } catch {
        return {};
      }
    }
    try {
      const raw = JSON.parse(localStorage.getItem(LAUNCH_GATE_COMPLETED_CYCLE_STORAGE_KEY) || "{}");
      return parseLaunchGateCompletionMap(raw);
    } catch {
      return {};
    }
  });
  const [launchGateMode, setLaunchGateMode] = useState<"idle" | "video" | "fallback" | "completed">("idle");
  const [launchFallbackStepIndex, setLaunchFallbackStepIndex] = useState(0);
  const [launchGateMessage, setLaunchGateMessage] = useState<string | null>(null);
  const [ownerReplayLaunchRequested, setOwnerReplayLaunchRequested] = useState(false);
  const [tripStartDate, setTripStartDate] = useState<string | null>(() => {
    if (cloudEnabled) {
      return null;
    }

    try {
      return localStorage.getItem("jp-trip-start-date") || null;
    } catch {
      return null;
    }
  });
  const [screen, setScreen] = useState<Screen>(() => {
    if (cloudEnabled) {
      // En mode cloud, l'écran est restauré après le bootstrap d'authentification
      // (voir l'effet plus bas qui lit "jp-screen" une fois le profil connu).
      return "checklist";
    }

    try {
      const saved = localStorage.getItem("jp-screen");
      return SCREEN_VALUES.includes(saved as Screen) ? (saved as Screen) : "checklist";
    } catch {
      return "checklist";
    }
  });
  const [pendingScreen, setPendingScreen] = useState<Screen | null>(null);
  const [accessDeniedMessage, setAccessDeniedMessage] = useState<string | null>(null);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [documentsDeepLinkTarget, setDocumentsDeepLinkTarget] = useState<DocumentsDeepLinkTarget | null>(null);
  const [selectedVisiteGuideeId, setSelectedVisiteGuideeId] = useState<string | null>(null);
  const [selectedVisiteGuideeTitle, setSelectedVisiteGuideeTitle] = useState<string>("");
  const [visiteGuideeBackScreen, setVisiteGuideeBackScreen] = useState<Screen>("place");
  const [guideSelectedDay, setGuideSelectedDay] = useState<number | null>(null);
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [selectedGeographieTopicId, setSelectedGeographieTopicId] = useState<string | null>(null);
  const [selectedCultureTopicId, setSelectedCultureTopicId] = useState<string | null>(null);
  const [openCategories, setOpenCategories] = useState<Set<string>>(
    new Set([CHECKLIST_CATEGORIES[0]?.id ?? "vetements-hommes"])
  );
  const [checked, setChecked] = useState<Record<string, boolean>>(() => {
    if (cloudEnabled) {
      return {};
    }

    try {
      const parsed = JSON.parse(localStorage.getItem("jp-checklist") || "{}");
      if (!parsed || typeof parsed !== "object") return {};
      return Object.fromEntries(
        Object.entries(parsed).filter(
          ([, value]) => typeof value === "boolean"
        )
      ) as Record<string, boolean>;
    } catch {
      return {};
    }
  });
  const [customChecklistItemsByProfile, setCustomChecklistItemsByProfile] = useState<Record<string, CustomChecklistItem[]>>(() => {
    if (cloudEnabled) {
      return {};
    }

    try {
      const raw = JSON.parse(localStorage.getItem(CUSTOM_PROFILE_CHECKLIST_STORAGE_KEY) || "{}");
      if (!raw || typeof raw !== "object") {
        return {};
      }

      const result: Record<string, CustomChecklistItem[]> = {};
      for (const [profileId, items] of Object.entries(raw as Record<string, unknown>)) {
        if (typeof profileId !== "string") {
          continue;
        }
        result[profileId] = parseCustomChecklistItems(items);
      }
      return result;
    } catch {
      return {};
    }
  });
  const [ownerGlobalChecklistAdditions, setOwnerGlobalChecklistAdditions] = useState<CustomChecklistItem[]>(() => {
    if (cloudEnabled) {
      return [];
    }

    try {
      return parseCustomChecklistItems(
        JSON.parse(localStorage.getItem(OWNER_GLOBAL_CHECKLIST_ADDITIONS_KEY) || "[]")
      );
    } catch {
      return [];
    }
  });
  const [ownerGlobalChecklistRemovals, setOwnerGlobalChecklistRemovals] = useState<Record<string, boolean>>(() => {
    if (cloudEnabled) {
      return {};
    }

    try {
      const parsed = JSON.parse(localStorage.getItem(OWNER_GLOBAL_CHECKLIST_REMOVALS_KEY) || "{}");
      if (!parsed || typeof parsed !== "object") {
        return {};
      }
      return Object.fromEntries(
        Object.entries(parsed).filter(([, value]) => typeof value === "boolean")
      ) as Record<string, boolean>;
    } catch {
      return {};
    }
  });
  const [ownerGlobalDocumentAdditions, setOwnerGlobalDocumentAdditions] = useState<TravelDocument[]>(() => {
    if (cloudEnabled) {
      return [];
    }
    try {
      return parseOwnerGlobalDocumentAdditions(
        JSON.parse(localStorage.getItem(OWNER_GLOBAL_DOCUMENT_ADDITIONS_KEY) || "[]")
      );
    } catch {
      return [];
    }
  });
  const [ownerGlobalDocumentEdits, setOwnerGlobalDocumentEdits] = useState<Record<string, TravelDocument>>(() => {
    if (cloudEnabled) {
      return {};
    }
    try {
      return parseOwnerGlobalDocumentEdits(
        JSON.parse(localStorage.getItem(OWNER_GLOBAL_DOCUMENT_EDITS_KEY) || "{}")
      );
    } catch {
      return {};
    }
  });
  const [ownerGlobalDocumentRemovals, setOwnerGlobalDocumentRemovals] = useState<Record<string, boolean>>(() => {
    if (cloudEnabled) {
      return {};
    }
    try {
      return parseOwnerGlobalDocumentRemovals(
        JSON.parse(localStorage.getItem(OWNER_GLOBAL_DOCUMENT_REMOVALS_KEY) || "{}")
      );
    } catch {
      return {};
    }
  });
  const [ownerGlobalPlaceAdditions, setOwnerGlobalPlaceAdditions] = useState<Place[]>(() => {
    if (cloudEnabled) {
      return [];
    }
    try {
      return parseOwnerGlobalPlaceAdditions(
        JSON.parse(localStorage.getItem(OWNER_GLOBAL_PLACE_ADDITIONS_KEY) || "[]")
      );
    } catch {
      return [];
    }
  });
  const [placeCommentsByPlace, setPlaceCommentsByPlace] = useState<PlaceCommentsByPlace>(() => {
    if (cloudEnabled) {
      return {};
    }

    try {
      const parsed = JSON.parse(localStorage.getItem(PLACE_COMMENTS_STORAGE_KEY) || "{}");
      return parsePlaceComments(parsed);
    } catch {
      return {};
    }
  });
  // Contrairement à placeCommentsByPlace, on seed toujours depuis le cache
  // local (même si cloudEnabled) : le carnet est chargé à la demande par lieu
  // (pas via le snapshot famille global), donc rien ne le remplira tant qu'on
  // n'a pas ouvert la fiche d'un lieu — le cache permet un affichage immédiat
  // des dernières entrées déjà vues en attendant l'abonnement cloud.
  const [carnetVisiteByPlace, setCarnetVisiteByPlace] = useState<CarnetVisiteLogByPlace>(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem(CARNET_VISITE_CACHE_STORAGE_KEY) || "{}");
      return parseCarnetVisiteCache(parsed);
    } catch {
      return {};
    }
  });
  // Même logique que carnetVisiteByPlace ci-dessus, pour le carnet de visite
  // des rubriques de contenu (Histoire, Culture et tradition, Géographie et
  // économie) — seedé depuis son propre cache local, chargé à la demande par
  // [source, itemId] (cf. carnetContentKey).
  const [carnetContentByKey, setCarnetContentByKey] = useState<CarnetContentLogByKey>(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem(CARNET_CONTENT_CACHE_STORAGE_KEY) || "{}");
      return parseCarnetContentCache(parsed);
    } catch {
      return {};
    }
  });
  const [placeVisibilityMap, setPlaceVisibilityMap] = useState<PlaceVisibilityMap>(() => {
    if (cloudEnabled) {
      return {};
    }

    try {
      const parsed = JSON.parse(localStorage.getItem(PLACE_VISIBILITY_STORAGE_KEY) || "{}");
      return parsePlaceVisibilityMap(parsed);
    } catch {
      return {};
    }
  });
  const [placeSeenMap, setPlaceSeenMap] = useState<PlaceSeenMap>(() => {
    if (cloudEnabled) {
      return {};
    }

    try {
      const parsed = JSON.parse(localStorage.getItem(PLACE_SEEN_STORAGE_KEY) || "{}");
      return parsePlaceSeenMap(parsed);
    } catch {
      return {};
    }
  });
  const [placeDayOverrideMap, setPlaceDayOverrideMap] = useState<PlaceDayOverrideMap>(() => {
    if (cloudEnabled) {
      return {};
    }

    try {
      const parsed = JSON.parse(localStorage.getItem(PLACE_DAY_OVERRIDES_STORAGE_KEY) || "{}");
      return parsePlaceDayOverrideMap(parsed);
    } catch {
      return {};
    }
  });
  const [placeDayOrderOverrideMap, setPlaceDayOrderOverrideMap] = useState<PlaceDayOrderOverrideMap>(() => {
    if (cloudEnabled) {
      return {};
    }

    try {
      const parsed = JSON.parse(localStorage.getItem(PLACE_DAY_ORDER_OVERRIDES_STORAGE_KEY) || "{}");
      return parsePlaceDayOrderOverrideMap(parsed);
    } catch {
      return {};
    }
  });
  const [documentVisibilityMap, setDocumentVisibilityMap] = useState<DocumentVisibilityMap>(() => {
    if (cloudEnabled) {
      return {};
    }

    try {
      const parsed = JSON.parse(localStorage.getItem(DOCUMENT_VISIBILITY_STORAGE_KEY) || "{}");
      return parseDocumentVisibilityMap(parsed);
    } catch {
      return {};
    }
  });
  const [contentOverrides, setContentOverrides] = useState<ContentOverrideMap>(() => {
    if (cloudEnabled) {
      return {};
    }

    try {
      const parsed = JSON.parse(localStorage.getItem(CONTENT_OVERRIDES_STORAGE_KEY) || "{}");
      return parseContentOverrideMap(parsed);
    } catch {
      return {};
    }
  });
  const [destinationSurveyVotes, setDestinationSurveyVotes] = useState<Record<string, DestinationSurveyVote>>(() => {
    if (cloudEnabled) {
      return {};
    }

    try {
      const parsed = JSON.parse(localStorage.getItem(DESTINATION_SURVEY_STORAGE_KEY) || "{}");
      return parseDestinationSurveyVotes(parsed);
    } catch {
      return {};
    }
  });
  const [destinationSurveyDrafts, setDestinationSurveyDrafts] = useState<string[]>(["", "", ""]);
  const [destinationSurveyError, setDestinationSurveyError] = useState<string | null>(null);
  const [notificationPreferences, setNotificationPreferences] = useState<NotificationPreferences>(
    DEFAULT_NOTIFICATION_PREFS
  );
  const [notificationPermissionStatus, setNotificationPermissionStatus] =
    useState<NotificationPermissionStatus>(() => getNotificationPermissionStatus());
  const [newItemDrafts, setNewItemDrafts] = useState<Record<string, string>>({});
  const [gameState, setGameState] = useState<GameState>(() => {
    if (cloudEnabled) {
      return "intro";
    }
    try {
      return parseGameProgress(localStorage.getItem("jp-game-progress"))?.phase ?? "intro";
    } catch {
      return "intro";
    }
  });
  const [ownerCodeHash, setOwnerCodeHash] = useState<string>(() => {
    if (cloudEnabled) {
      return "";
    }

    try {
      return localStorage.getItem("jp-owner-code-hash") || "";
    } catch {
      return "";
    }
  });
  const [ownerCodePlain, setOwnerCodePlain] = useState<string>(() => {
    if (cloudEnabled) {
      return "";
    }

    try {
      return localStorage.getItem("jp-owner-code-plain") || "";
    } catch {
      return "";
    }
  });
  const [gameScoring, setGameScoring] = useState<GameScoringConfig>(() => {
    if (cloudEnabled) {
      return DEFAULT_GAME_SCORING;
    }
    try {
      const stored = JSON.parse(localStorage.getItem("jp-game-scoring") || "null");
      return stored && typeof stored === "object" ? stored as GameScoringConfig : DEFAULT_GAME_SCORING;
    } catch {
      return DEFAULT_GAME_SCORING;
    }
  });
  const [travelerCodeHash, setTravelerCodeHash] = useState<string>(() => {
    if (cloudEnabled) {
      return "";
    }

    try {
      return localStorage.getItem("jp-traveler-code-hash") || "";
    } catch {
      return "";
    }
  });
  const [travelerCodePlain, setTravelerCodePlain] = useState<string>(() => {
    if (cloudEnabled) {
      return "";
    }

    try {
      return localStorage.getItem("jp-traveler-code-plain") || "";
    } catch {
      return "";
    }
  });
  const [ownerRecoveryHash, setOwnerRecoveryHash] = useState<string>(() => {
    if (cloudEnabled) {
      return "";
    }

    try {
      const stored = localStorage.getItem("jp-owner-recovery-hash");
      return stored && typeof stored === 'string' ? stored : "";
    } catch (e) {
      if (IS_DEV) console.warn("Failed to read recovery hash from localStorage:", e);
      return "";
    }
  });
  const [profilePasswordHashes, setProfilePasswordHashes] = useState<Record<string, string>>(() => {
    if (cloudEnabled) {
      return {};
    }

    try {
      const raw = localStorage.getItem("jp-profile-password-hashes");
      const parsed = raw ? JSON.parse(raw) : {};
      return parsed && typeof parsed === "object" ? (parsed as Record<string, string>) : {};
    } catch {
      return {};
    }
  });
  const [profileRecoveryHashes, setProfileRecoveryHashes] = useState<Record<string, string>>(() => {
    if (cloudEnabled) {
      return {};
    }

    try {
      const raw = localStorage.getItem("jp-profile-recovery-hashes");
      const parsed = raw ? JSON.parse(raw) : {};
      return parsed && typeof parsed === "object" ? (parsed as Record<string, string>) : {};
    } catch {
      return {};
    }
  });
  const [profileRecoveryQuestions, setProfileRecoveryQuestions] = useState<Record<string, string>>(() => {
    if (cloudEnabled) {
      return {};
    }

    try {
      const raw = localStorage.getItem(PROFILE_RECOVERY_QUESTION_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Record<string, string>) : {};
    } catch {
      return {};
    }
  });
  const [profileRecoveryAnswers, setProfileRecoveryAnswers] = useState<Record<string, string>>(() => {
    if (cloudEnabled) {
      return {};
    }

    try {
      const raw = localStorage.getItem(PROFILE_RECOVERY_ANSWER_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Record<string, string>) : {};
    } catch {
      return {};
    }
  });
  const [passwordPromptProfileId, setPasswordPromptProfileId] = useState<string | null>(null);
  const [passwordPromptInput, setPasswordPromptInput] = useState("");
  const [passwordPromptError, setPasswordPromptError] = useState<string | null>(null);
  const [profileRecoveryStep, setProfileRecoveryStep] = useState<"none" | "recovery">("none");
  const [profileRecoveryAnswerInput, setProfileRecoveryAnswerInput] = useState("");
  const [profileRecoveryNewPasswordInput, setProfileRecoveryNewPasswordInput] = useState("");
  const [profileRecoveryNewPasswordConfirmInput, setProfileRecoveryNewPasswordConfirmInput] = useState("");
  const [profileRecoveryError, setProfileRecoveryError] = useState<string | null>(null);
  const [showStartPrompt, setShowStartPrompt] = useState(false);
  const [startCodeInput, setStartCodeInput] = useState("");
  const [startError, setStartError] = useState<string | null>(null);
  const [showRecoveryPrompt, setShowRecoveryPrompt] = useState(false);
  const [recoveryPhraseInput, setRecoveryPhraseInput] = useState("");
  const [recoveryNewCodeInput, setRecoveryNewCodeInput] = useState("");
  const [recoveryCodeConfirmInput, setRecoveryCodeConfirmInput] = useState("");
  const [recoveryError, setRecoveryError] = useState<string | null>(null);

  const applyProfileMetadata = (gender: Gender, householdRole: HouseholdRole) => {
    setProfile((p) => ({ ...p, gender, householdRole }));
    const firstCategoryId = CHECKLIST_CATEGORIES[0]?.id;
    setOpenCategories(firstCategoryId ? new Set([firstCategoryId]) : new Set());
  };
  const [unlockFailedAttempts, setUnlockFailedAttempts] = useState<number>(() => {
    try {
      const raw = localStorage.getItem("jp-unlock-failed-attempts");
      return raw ? Number(raw) || 0 : 0;
    } catch {
      return 0;
    }
  });
  const [unlockLockedUntil, setUnlockLockedUntil] = useState<number>(() => {
    try {
      const raw = localStorage.getItem("jp-unlock-locked-until");
      return raw ? Number(raw) || 0 : 0;
    } catch {
      return 0;
    }
  });
  const [nowTs, setNowTs] = useState(Date.now());
  // currentQ se déduit du nombre de réponses déjà enregistrées : on reprend
  // toujours à la question suivante, jamais de désynchronisation possible
  // entre les deux (cf. mémo "reprise du quiz après F5", 2026-08-01).
  const [currentQ, setCurrentQ] = useState(() => {
    if (cloudEnabled) {
      return 0;
    }
    try {
      return parseGameProgress(localStorage.getItem("jp-game-progress"))?.answers.length ?? 0;
    } catch {
      return 0;
    }
  });
  const [selectedAns, setSelectedAns] = useState<number | null>(null);
  const [answers, setAnswers] = useState<number[]>(() => {
    if (cloudEnabled) {
      return [];
    }
    try {
      return parseGameProgress(localStorage.getItem("jp-game-progress"))?.answers ?? [];
    } catch {
      return [];
    }
  });
  const [quizStartedAt, setQuizStartedAt] = useState<number | null>(() => {
    if (cloudEnabled) {
      return null;
    }
    try {
      return parseGameProgress(localStorage.getItem("jp-game-progress"))?.quizStartedAt ?? null;
    } catch {
      return null;
    }
  });
  const [quizDurationSec, setQuizDurationSec] = useState(() => {
    if (cloudEnabled) {
      return 0;
    }
    try {
      return parseGameProgress(localStorage.getItem("jp-game-progress"))?.quizDurationSec ?? 0;
    } catch {
      return 0;
    }
  });
  const [riddleAnswer, setRiddleAnswer] = useState("");
  const [riddleFeedback, setRiddleFeedback] = useState<string | null>(null);
  const [riddleValidated, setRiddleValidated] = useState(() => {
    if (cloudEnabled) {
      return false;
    }
    try {
      return parseGameProgress(localStorage.getItem("jp-game-progress"))?.riddleValidated ?? false;
    } catch {
      return false;
    }
  });
  const [riddleSolved, setRiddleSolved] = useState(() => {
    if (cloudEnabled) {
      return false;
    }
    try {
      return parseGameProgress(localStorage.getItem("jp-game-progress"))?.riddleSolved ?? false;
    } catch {
      return false;
    }
  });
  // true pendant la phase d'auto-déclaration : la réponse saisie ne
  // correspond pas automatiquement à la bonne réponse, on affiche donc
  // celle-ci et on demande au joueur d'indiquer honnêtement si c'était
  // sa réponse (formulée différemment) ou non. Volontairement non
  // persisté (ni localStorage, ni cloud) : c'est un état transitoire,
  // résolu avant que riddleValidated ne passe à true.
  const [riddleSelfCheckPending, setRiddleSelfCheckPending] = useState(false);
  const [challengeResponse, setChallengeResponse] = useState(() => {
    if (cloudEnabled) {
      return "";
    }
    try {
      return parseGameProgress(localStorage.getItem("jp-game-progress"))?.challengeDraft ?? "";
    } catch {
      return "";
    }
  });
  const [challengeDone, setChallengeDone] = useState(false);
  const [challengeReactionsByDay, setChallengeReactionsByDay] = useState<ChallengeReactionsByDay>({});
  const [challengeBestVotesByDay, setChallengeBestVotesByDay] = useState<ChallengeBestVotesByDay>({});
  const [gameHistory, setGameHistory] = useState<GameHistoryEntry[]>(() => {
    if (cloudEnabled) {
      return [];
    }

    try {
      return parseGameHistory(localStorage.getItem("jp-game-history"));
    } catch {
      return [];
    }
  });
  // Record personnel du mode "Défi" de Bazar Crush (Candy Crush) — cf.
  // candy-crush-challenge.ts. Même pattern que gameHistory ci-dessus : lu
  // depuis le localStorage tant que le cloud n'a pas encore hydraté.
  const [candyCrushBest, setCandyCrushBest] = useState<CandyCrushChallengeRecord | null>(() => {
    if (cloudEnabled) {
      return null;
    }

    try {
      return parseCandyCrushChallengeRecord(localStorage.getItem("jp-candy-crush-challenge-best"));
    } catch {
      return null;
    }
  });
  const [postTripReplayDay, setPostTripReplayDay] = useState<number | null>(null);

  // Calculé tôt (avant l'effet d'hydratation cloud plus bas) car la
  // progression de jeu en cours (gameProgress) doit être comparée au jour
  // courant dès l'hydratation, pas seulement au moment du scoring.
  const lastDefinedDay =
    JOURS_DESTINATIONS.length > 0
      ? JOURS_DESTINATIONS[JOURS_DESTINATIONS.length - 1].jour
      : null;
  const rawCurrentDay = computeCurrentDay(tripStartDate);
  const currentDay = clampToLastDefinedDay(rawCurrentDay, lastDefinedDay);
  const tripFinished = isTripFinished(rawCurrentDay, lastDefinedDay);
  const postTripReplayEnabled = tripFinished && phase === "during";
  const replayDayChoices =
    GAME_REPLAY_DAYS_FROM_PLACES.length > 0
      ? GAME_REPLAY_DAYS_FROM_PLACES
      : Array.from({ length: Math.max(lastDefinedDay ?? 1, 1) }, (_, i) => i + 1);
  const gameDay = postTripReplayEnabled
    ? postTripReplayDay ?? replayDayChoices[replayDayChoices.length - 1] ?? currentDay
    : currentDay;
  const isPostTripReplayOpenScreen = (target: Screen): boolean =>
    postTripReplayEnabled &&
    (target === "game" ||
      target === "jeux" ||
      target === "trivial" ||
      target === "candy-crush" ||
      target === "crossword" ||
      target === "ordalie" ||
      target === "imposteur");
  const canAccessCurrentScreen =
    canAccessScreen(profile.role, phase, screen) ||
    isPostTripReplayOpenScreen(screen);

  useEffect(() => {
    if (!postTripReplayEnabled) {
      setPostTripReplayDay(null);
      return;
    }

    setPostTripReplayDay((previous) => {
      if (previous !== null && replayDayChoices.includes(previous)) {
        return previous;
      }

      if (replayDayChoices.includes(currentDay)) {
        return currentDay;
      }

      return replayDayChoices[replayDayChoices.length - 1] ?? 1;
    });
  }, [postTripReplayEnabled, replayDayChoices, currentDay]);

  // Progression en cours du jeu du jour (null si "intro" : rien à reprendre
  // avant d'avoir commencé). Persistée dès "playing" (survit à un
  // F5/fermeture d'appli en plein quiz) pour ne jamais repartir à zéro.
  // "done" (récap du score, avant l'énigme) est sauvegardé comme "riddle" :
  // ce récap ne se revoit jamais, qu'on quitte l'écran en direct (cf.
  // goToScreen, qui fait le même bascule) ou qu'on ferme l'appli dessus —
  // sans ça, fermer l'appli pile sur ce récap perdait la progression et
  // permettait de rejouer le quiz (bug corrigé le 2026-08-01).
  // Calculé une fois ici et réutilisé pour la sauvegarde locale et tous les
  // envois cloud, pour ne jamais désynchroniser les deux.
  const currentGameProgress: GameProgress | null =
    !postTripReplayEnabled &&
    (gameState === "playing" || gameState === "done" || gameState === "riddle" || gameState === "challenge")
      ? {
          day: currentDay,
          phase: gameState === "done" ? "riddle" : gameState,
          answers,
          quizStartedAt,
          quizDurationSec,
          riddleValidated,
          riddleSolved,
          challengeDraft: challengeResponse,
        }
      : null;

  // Horodatage du dernier changement LOCAL de currentGameProgress (mis à jour
  // en dehors de tout effet, directement au rendu — sûr car on ne fait que
  // muter une ref, sans jamais la relire pendant CE rendu). Sert de fenêtre
  // de grâce dans l'effet d'hydratation cloud plus bas : tant qu'on vient de
  // changer quelque chose localement (ex: cliquer "C'est parti"), on ignore
  // un cloudSnapshot qui semble "ne rien avoir" — c'est simplement le
  // temps que notre propre écriture fasse l'aller-retour, pas une vraie
  // réinitialisation distante. Sans ça, avec plusieurs profils actifs en
  // même temps (usage normal en famille), le moindre écho d'un AUTRE
  // profil pouvait faire annuler "C'est parti" avant même que le push local
  // n'ait eu la moindre chance d'arriver (bug vécu le 2026-08-01, la
  // première tentative de correctif — retirer gameState des dépendances de
  // l'effet — réduisait le risque mais ne l'éliminait pas en usage multi-profils).
  const previousGameProgressJsonRef = useRef<string>("null");
  const lastLocalGameProgressChangeAtRef = useRef<number>(0);
  const previousPhaseRef = useRef<TravelPhase>(phase);
  const currentGameProgressJson = JSON.stringify(currentGameProgress);
  if (previousGameProgressJsonRef.current !== currentGameProgressJson) {
    previousGameProgressJsonRef.current = currentGameProgressJson;
    lastLocalGameProgressChangeAtRef.current = Date.now();
  }

  const getPostAuthLandingScreen = (nextPhase: "before" | "during") =>
    nextPhase === "during" ? "dashboard" : "checklist";

  useEffect(() => {
    if (previousPhaseRef.current === phase) {
      return;
    }

    previousPhaseRef.current = phase;

    // Owners have unrestricted access across phase changes — don't redirect them.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    if (profile.role === "proprietaire") {
      if (phase === "before") {
        setDestinationSurveyVotes({});
        setDestinationSurveyDrafts(["", "", ""]);
        setDestinationSurveyError(null);
      }
      return;
    }

    if (phase === "during") {
      // Stay on checklist (or any accessible screen) — only navigate to dashboard
      // if the current screen is not accessible in the new phase.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      if (!canAccessCurrentScreen) {
        setScreen("dashboard");
      }
      return;
    }

    // Phase → "before": reset survey state and redirect with denial message if needed.
    setDestinationSurveyVotes({});
    setDestinationSurveyDrafts(["", "", ""]);
    setDestinationSurveyError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    if (!canAccessScreen(profile.role, phase, screen)) {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      setAccessDeniedMessage(getAccessDeniedMessage(profile.role, phase, screen));
      // eslint-disable-next-line react-hooks/exhaustive-deps
      setScreen(getSafeScreen(profile.role, phase));
    }
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  // Persistance de l'écran affiché (préférence locale à cet appareil, pas une
  // donnée familiale) — volontairement indépendante du mode cloud/local, pour
  // qu'un simple rechargement (F5) revienne sur le même écran plutôt que sur
  // l'écran d'atterrissage par défaut.
  useEffect(() => {
    if (!isAuthenticated) return;
    try {
      localStorage.setItem("jp-screen", screen);
    } catch {
      // Ignore storage errors; the screen will just reset to its default on reload.
    }
  }, [screen, isAuthenticated]);

  useEffect(() => {
    if (!cloudEnabled) {
      setIsAuthenticated(true);
      setIsAuthBootstrapPending(false);
      return;
    }

    if (!cloudReady) {
      setIsAuthBootstrapPending(true);
      return;
    }

    if (isAuthenticated) {
      setIsAuthBootstrapPending(false);
      return;
    }

    try {
      const rememberedId = localStorage.getItem(ACTIVE_PROFILE_ID_KEY);
      if (!rememberedId) {
        setIsAuthBootstrapPending(false);
        return;
      }

      if (!cloudSnapshot) {
        setIsAuthBootstrapPending(false);
        return;
      }

      const rememberedProfile = cloudSnapshot.profiles[rememberedId];
      if (!rememberedProfile) {
        setIsAuthBootstrapPending(false);
        return;
      }

      const rememberedPasswordHash = rememberedProfile.passwordHash?.trim() || "";
      
      // Check if we have a valid session token - if so, skip password verification
      const hasValidSessionToken =
        isSessionTokenValid() &&
        localStorage.getItem(SESSION_TOKEN_PROFILE_ID_KEY) === rememberedId;

      if (rememberedPasswordHash && !hasValidSessionToken) {
        // Password is set and no valid session token → require password re-entry
        setSelectedLoginProfileId(rememberedProfile.profileId);
        if (!isProfilePasswordHash(rememberedPasswordHash)) {
          setAuthError("Authentification impossible. Vérifiez les informations saisies.");
          setIsAuthBootstrapPending(false);
          return;
        }

        setIsAuthBootstrapPending(false);
        return;
      }

      // Restore session (either no password, or valid session token exists)
      setProfile((previous) => ({
        ...previous,
        id: rememberedProfile.profileId,
        surname: rememberedProfile.surname,
        role: rememberedProfile.role,
        gender: rememberedProfile.gender ?? "unspecified",
        householdRole: rememberedProfile.householdRole ?? "member",
      }));
      const nextPhase = cloudSnapshot.phase;
      setPhase(nextPhase);

      // Try to restore the previous screen, fallback to landing screen
      const savedScreen = localStorage.getItem("jp-screen");
      const screenToRestore = (savedScreen as Screen) || getPostAuthLandingScreen(nextPhase);
      setScreen(screenToRestore);
      
      setIsAuthenticated(true);
      setAuthError(null);
    } catch {
      // Ignore storage errors and keep manual login flow available.
    } finally {
      setIsAuthBootstrapPending(false);
    }
  }, [
    ACTIVE_PROFILE_ID_KEY,
    cloudEnabled,
    cloudReady,
    cloudSnapshot,
    isAuthenticated,
  ]);

  useEffect(() => {
    if (cloudEnabled && cloudReady && !isAuthBootstrapPending) {
      setIsInitializing(false);
    }
  }, [cloudEnabled, cloudReady, isAuthBootstrapPending]);

  useEffect(() => {
    if (!cloudEnabled) {
      setIsInitializing(false);
      return;
    }
  }, [cloudEnabled]);

  useEffect(() => {
    if (cloudEnabled) {
      return;
    }

    const migrateLegacyOwnerCode = async () => {
      const normalizedCurrentHash = ownerCodeHash.trim();
      let legacyClearCode = "";

      try {
        legacyClearCode = localStorage.getItem("jp-owner-code") || "";
      } catch {
        return;
      }

      if (!legacyClearCode) {
        return;
      }

      if (normalizedCurrentHash && isOwnerCodeHash(normalizedCurrentHash)) {
        if (IS_DEV) {
          console.info("[owner-code] Legacy clear-text owner code key detected and purged.");
        }
        try {
          localStorage.removeItem("jp-owner-code");
        } catch {
          // Ignore storage cleanup failures; hash storage remains authoritative.
        }
        return;
      }

      const sourceCode = normalizedCurrentHash || legacyClearCode;
      const nextHash = await hashOwnerCode(sourceCode);
      if (IS_DEV) {
        console.warn("[owner-code] Legacy clear-text owner code migrated to hash-only storage.");
      }
      setOwnerCodeHash(nextHash);
      try {
        localStorage.removeItem("jp-owner-code");
      } catch {
        // Ignore storage cleanup failures; hash storage remains authoritative.
      }
    };

    void migrateLegacyOwnerCode();
  }, [cloudEnabled, ownerCodeHash]);

  useEffect(() => {
    try {
      if (cloudEnabled) {
        // Cloud-authoritative mode: clear deprecated shared local keys.
        localStorage.removeItem("jp-profile");
        localStorage.removeItem("jp-family-state");
        localStorage.removeItem("jp-owner-code-hash");
        localStorage.removeItem("jp-owner-code-plain");
        localStorage.removeItem("jp-traveler-code-hash");
        localStorage.removeItem("jp-traveler-code-plain");
        localStorage.removeItem("jp-owner-code");
        localStorage.removeItem("jp-owner-recovery-hash");
        localStorage.removeItem("jp-profile-password-hashes");
        localStorage.removeItem("jp-profile-recovery-hashes");
        localStorage.removeItem(PROFILE_RECOVERY_QUESTION_STORAGE_KEY);
        localStorage.removeItem(PROFILE_RECOVERY_ANSWER_STORAGE_KEY);
        localStorage.removeItem("jp-phase");
        localStorage.removeItem("jp-trip-start-date");
        localStorage.removeItem("jp-checklist");
        localStorage.removeItem("jp-game-history");
        localStorage.removeItem("jp-game-progress");
        localStorage.removeItem("jp-candy-crush-challenge-best");
        localStorage.removeItem(PLACE_VISIBILITY_STORAGE_KEY);
        localStorage.removeItem(PLACE_SEEN_STORAGE_KEY);
        localStorage.removeItem(PLACE_DAY_OVERRIDES_STORAGE_KEY);
        localStorage.removeItem(PLACE_DAY_ORDER_OVERRIDES_STORAGE_KEY);
        localStorage.removeItem(DOCUMENT_VISIBILITY_STORAGE_KEY);
        localStorage.removeItem(CONTENT_OVERRIDES_STORAGE_KEY);
        localStorage.removeItem(CUSTOM_PROFILE_CHECKLIST_STORAGE_KEY);
        localStorage.removeItem(OWNER_GLOBAL_CHECKLIST_ADDITIONS_KEY);
        localStorage.removeItem(OWNER_GLOBAL_CHECKLIST_REMOVALS_KEY);
        localStorage.removeItem(OWNER_GLOBAL_DOCUMENT_ADDITIONS_KEY);
        localStorage.removeItem(OWNER_GLOBAL_DOCUMENT_EDITS_KEY);
        localStorage.removeItem(OWNER_GLOBAL_DOCUMENT_REMOVALS_KEY);
        localStorage.removeItem(DESTINATION_SURVEY_STORAGE_KEY);
      } else {
        localStorage.setItem("jp-profile", JSON.stringify(profile));
        localStorage.setItem(
          "jp-family-state",
          JSON.stringify(enforceOwnerUniqueness(familyState))
        );
        try {
          localStorage.setItem("jp-owner-code-hash", ownerCodeHash);
          localStorage.setItem("jp-owner-code-plain", ownerCodePlain);
          localStorage.setItem("jp-game-scoring", JSON.stringify(gameScoring));
          localStorage.setItem("jp-traveler-code-hash", travelerCodeHash);
          localStorage.setItem("jp-traveler-code-plain", travelerCodePlain);
          localStorage.setItem("jp-owner-recovery-hash", ownerRecoveryHash);
          localStorage.removeItem("jp-owner-code");
          localStorage.setItem(
            "jp-profile-password-hashes",
            JSON.stringify(profilePasswordHashes)
          );
          localStorage.setItem(
            "jp-profile-recovery-hashes",
            JSON.stringify(profileRecoveryHashes)
          );
          localStorage.setItem(
            PROFILE_RECOVERY_QUESTION_STORAGE_KEY,
            JSON.stringify(profileRecoveryQuestions)
          );
          localStorage.setItem(
            PROFILE_RECOVERY_ANSWER_STORAGE_KEY,
            JSON.stringify(profileRecoveryAnswers)
          );
          localStorage.setItem("jp-phase", phase);
          if (tripStartDate) {
            localStorage.setItem("jp-trip-start-date", tripStartDate);
          } else {
            localStorage.removeItem("jp-trip-start-date");
          }
          localStorage.setItem("jp-checklist", JSON.stringify(checked));
          localStorage.setItem("jp-game-history", JSON.stringify(gameHistory));
          if (currentGameProgress) {
            localStorage.setItem("jp-game-progress", JSON.stringify(currentGameProgress));
          } else {
            localStorage.removeItem("jp-game-progress");
          }
          if (candyCrushBest) {
            localStorage.setItem("jp-candy-crush-challenge-best", JSON.stringify(candyCrushBest));
          } else {
            localStorage.removeItem("jp-candy-crush-challenge-best");
          }
          localStorage.setItem(
            CUSTOM_PROFILE_CHECKLIST_STORAGE_KEY,
            JSON.stringify(customChecklistItemsByProfile)
          );
          localStorage.setItem(
            OWNER_GLOBAL_CHECKLIST_ADDITIONS_KEY,
            JSON.stringify(ownerGlobalChecklistAdditions)
          );
          localStorage.setItem(
            OWNER_GLOBAL_CHECKLIST_REMOVALS_KEY,
            JSON.stringify(ownerGlobalChecklistRemovals)
          );
          localStorage.setItem(
            OWNER_GLOBAL_DOCUMENT_ADDITIONS_KEY,
            JSON.stringify(ownerGlobalDocumentAdditions)
          );
          localStorage.setItem(
            OWNER_GLOBAL_DOCUMENT_EDITS_KEY,
            JSON.stringify(ownerGlobalDocumentEdits)
          );
          localStorage.setItem(
            OWNER_GLOBAL_DOCUMENT_REMOVALS_KEY,
            JSON.stringify(ownerGlobalDocumentRemovals)
          );
          localStorage.setItem(
            OWNER_GLOBAL_PLACE_ADDITIONS_KEY,
            JSON.stringify(ownerGlobalPlaceAdditions)
          );
          localStorage.setItem(
            PLACE_COMMENTS_STORAGE_KEY,
            JSON.stringify(placeCommentsByPlace)
          );
          localStorage.setItem(
            PLACE_VISIBILITY_STORAGE_KEY,
            JSON.stringify(placeVisibilityMap)
          );
          localStorage.setItem(
            PLACE_SEEN_STORAGE_KEY,
            JSON.stringify(placeSeenMap)
          );
          localStorage.setItem(
            PLACE_DAY_OVERRIDES_STORAGE_KEY,
            JSON.stringify(placeDayOverrideMap)
          );
          localStorage.setItem(
            PLACE_DAY_ORDER_OVERRIDES_STORAGE_KEY,
            JSON.stringify(placeDayOrderOverrideMap)
          );
          localStorage.setItem(
            DOCUMENT_VISIBILITY_STORAGE_KEY,
            JSON.stringify(documentVisibilityMap)
          );
          localStorage.setItem(
            CONTENT_OVERRIDES_STORAGE_KEY,
            JSON.stringify(contentOverrides)
          );
          localStorage.setItem(
            DESTINATION_SURVEY_STORAGE_KEY,
            JSON.stringify(destinationSurveyVotes)
          );
          localStorage.setItem(
            LAUNCH_GATE_CYCLE_STORAGE_KEY,
            String(Math.max(0, Math.floor(launchGateCycle)))
          );
          localStorage.setItem(
            LAUNCH_GATE_COMPLETED_CYCLE_STORAGE_KEY,
            JSON.stringify(launchGateCompletedCycleByProfile)
          );
          localStorage.removeItem(LAUNCH_GATE_PENDING_COMPLETION_STORAGE_KEY);
        } catch (e) {
          if (IS_DEV) console.warn("localStorage quota exceeded or unavailable:", e);
        }
      }

      // Keep launch-gate cache available in cloud mode so a hard refresh after
      // "Entrer" does not temporarily re-open the gate while stale snapshots catch up.
      localStorage.setItem(
        LAUNCH_GATE_CYCLE_STORAGE_KEY,
        String(Math.max(0, Math.floor(launchGateCycle)))
      );
      localStorage.setItem(
        LAUNCH_GATE_COMPLETED_CYCLE_STORAGE_KEY,
        JSON.stringify(launchGateCompletedCycleByProfile)
      );

      localStorage.setItem(
        "jp-unlock-failed-attempts",
        String(unlockFailedAttempts)
      );
      localStorage.setItem("jp-unlock-locked-until", String(unlockLockedUntil));
      if (isAuthenticated) {
        localStorage.setItem(ACTIVE_PROFILE_ID_KEY, profile.id);
      }
    } catch {}
  }, [
    ACTIVE_PROFILE_ID_KEY,
    cloudEnabled,
    profile,
    familyState,
    ownerCodeHash,
    ownerCodePlain,
    gameScoring,
    travelerCodeHash,
    travelerCodePlain,
    ownerRecoveryHash,
    profilePasswordHashes,
    profileRecoveryHashes,
    profileRecoveryQuestions,
    profileRecoveryAnswers,
    phase,
    tripStartDate,
    screen,
    checked,
    customChecklistItemsByProfile,
    ownerGlobalChecklistAdditions,
    ownerGlobalChecklistRemovals,
    ownerGlobalDocumentAdditions,
    ownerGlobalDocumentEdits,
    ownerGlobalDocumentRemovals,
    ownerGlobalPlaceAdditions,
    placeCommentsByPlace,
    placeVisibilityMap,
    placeSeenMap,
    placeDayOverrideMap,
    placeDayOrderOverrideMap,
    documentVisibilityMap,
    contentOverrides,
    destinationSurveyVotes,
    launchGateCycle,
    launchGateCompletedCycleByProfile,
    unlockFailedAttempts,
    unlockLockedUntil,
    gameHistory,
    candyCrushBest,
    gameState,
    currentDay,
    answers,
    quizStartedAt,
    quizDurationSec,
    riddleValidated,
    riddleSolved,
    isAuthenticated,
  ]);

  useEffect(() => {
    if (
      !shouldHydrateFromCloudSnapshot({
        cloudEnabled,
        isAuthenticated,
        hasSnapshot: Boolean(cloudSnapshot),
      })
    ) {
      return;
    }

    const normalized = enforceOwnerUniqueness(cloudSnapshot.familyState);
    const pendingPhase = pendingCloudPhaseRef.current;
    const shouldDeferPendingPhaseHydration =
      pendingPhase !== null && cloudSnapshot.phase !== pendingPhase;
    if (!shouldDeferPendingPhaseHydration) {
      setPhase((previous) => (previous === cloudSnapshot.phase ? previous : cloudSnapshot.phase));
    }
    const nextLaunchGateCycle =
      typeof cloudSnapshot.launchGateCycle === "number" && Number.isFinite(cloudSnapshot.launchGateCycle)
        ? Math.max(0, Math.floor(cloudSnapshot.launchGateCycle))
        : 0;
    if (!shouldDeferPendingPhaseHydration) {
      setLaunchGateCycle((previous) =>
        previous === nextLaunchGateCycle ? previous : nextLaunchGateCycle
      );
    }
    setLaunchGateCompletedCycleByProfile((previous) => {
      const raw =
        cloudSnapshot.launchGateCompletedCycleByProfile &&
        typeof cloudSnapshot.launchGateCompletedCycleByProfile === "object"
          ? cloudSnapshot.launchGateCompletedCycleByProfile
          : {};
      const next = parseLaunchGateCompletionMap(raw);

      // Keep local completion cache until cloud snapshots catch up, so a hard
      // refresh right after "Entrer" does not re-open the gate.
      try {
        const persistedRaw = JSON.parse(localStorage.getItem(LAUNCH_GATE_COMPLETED_CYCLE_STORAGE_KEY) || "{}");
        const persisted = parseLaunchGateCompletionMap(persistedRaw);
        for (const [profileId, cycle] of Object.entries(persisted)) {
          next[profileId] = Math.max(next[profileId] ?? -1, cycle);
        }
      } catch {
        // ignore storage errors
      }

      const pendingCompletion = pendingLaunchGateCompletionRef.current;
      if (pendingCompletion && pendingCompletion.profileId === profile.id) {
        const cloudCompletedCycleRaw = next[pendingCompletion.profileId];
        const cloudCompletedCycle =
          typeof cloudCompletedCycleRaw === "number" && Number.isFinite(cloudCompletedCycleRaw)
            ? Math.floor(cloudCompletedCycleRaw)
            : -1;

        if (cloudCompletedCycle >= pendingCompletion.cycle) {
          pendingLaunchGateCompletionRef.current = null;
          try {
            localStorage.removeItem(LAUNCH_GATE_PENDING_COMPLETION_STORAGE_KEY);
          } catch {
            // ignore storage errors
          }
        } else {
          next[pendingCompletion.profileId] = pendingCompletion.cycle;
        }
      }

      try {
        localStorage.setItem(
          LAUNCH_GATE_PENDING_COMPLETION_STORAGE_KEY,
          JSON.stringify(next)
        );
      } catch {
        // ignore storage errors
      }

      return JSON.stringify(previous) === JSON.stringify(next) ? previous : next;
    });
    setTripStartDate((previous) => {
      const pending = pendingTripStartDateRef.current;
      if (pending !== "none") {
        if (cloudSnapshot.tripStartDate !== pending) {
          // Une écriture est en cours de propagation : cet instantané est
          // probablement périmé (antérieur à notre propre écriture). On
          // l'ignore pour ne pas écraser l'édition locale non confirmée.
          return previous;
        }
        // Le cloud confirme bien notre écriture : plus rien en attente.
        pendingTripStartDateRef.current = "none";
      }
      return previous === cloudSnapshot.tripStartDate ? previous : cloudSnapshot.tripStartDate;
    });
    setFamilyState((previous) =>
      areSharedFamilyStatesEqual(previous, normalized) ? previous : normalized
    );
    setOwnerCodeHash((previous) =>
      previous === cloudSnapshot.ownerCodeHash ? previous : cloudSnapshot.ownerCodeHash
    );
    setOwnerCodePlain((previous) =>
      previous === (cloudSnapshot.ownerCodePlain || "") ? previous : (cloudSnapshot.ownerCodePlain || "")
    );
    setGameScoring((previous) =>
      JSON.stringify(previous) === JSON.stringify(cloudSnapshot.gameScoring ?? DEFAULT_GAME_SCORING)
        ? previous
        : (cloudSnapshot.gameScoring ?? DEFAULT_GAME_SCORING)
    );
    setTravelerCodeHash((previous) =>
      previous === (cloudSnapshot.travelerCodeHash || "") ? previous : (cloudSnapshot.travelerCodeHash || "")
    );
    setTravelerCodePlain((previous) =>
      previous === (cloudSnapshot.travelerCodePlain || "") ? previous : (cloudSnapshot.travelerCodePlain || "")
    );
    setOwnerRecoveryHash((previous) =>
      previous === (cloudSnapshot.ownerRecoveryHash || "") ? previous : (cloudSnapshot.ownerRecoveryHash || "")
    );

    const cloudProfile = cloudSnapshot.profiles[profile.id];
    if (!cloudProfile) {
      // Profile no longer exists in cloud (deleted from another device, or by
      // ourselves via deleteOwnProfile — which already handles its own reset
      // once the deletion completes, so skip here to avoid racing it).
      // If we were previously hydrated with this profile, fail closed to profile selection.
      if (hydratedProfileId === profile.id && !isDeletingProfileRef.current) {
        resetForProfileSwitch();
      }
      return;
    }

    const cloudPasswordHash = cloudProfile.passwordHash || "";
    const cloudRecoveryHash = cloudProfile.recoveryHash || "";
    const cloudRecoveryQuestion = cloudProfile.recoveryQuestion || "";
    const cloudRecoveryAnswer = cloudProfile.recoveryAnswer || "";

    const pendingCredentials = pendingProfileCredentialsRef.current;
    const isPendingForThisProfile =
      pendingCredentials !== "none" && pendingCredentials.profileId === profile.id;
    const pendingConfirmed =
      !isPendingForThisProfile ||
      (cloudPasswordHash === pendingCredentials.passwordHash &&
        cloudRecoveryHash === pendingCredentials.recoveryHash &&
        cloudRecoveryQuestion === pendingCredentials.recoveryQuestion &&
        cloudRecoveryAnswer === pendingCredentials.recoveryAnswer);

    if (isPendingForThisProfile && !pendingConfirmed) {
      // Cet instantané ne reflète pas encore le mot de passe/la récupération
      // qu'on vient de définir localement (ex : écho intermédiaire de
      // claimRoleForProfile, qui n'écrit que le rôle/surnom) : on l'ignore
      // pour ne pas effacer localement une valeur pas encore confirmée par
      // notre propre push complet.
    } else {
      if (isPendingForThisProfile) {
        pendingProfileCredentialsRef.current = "none";
      }
      setProfilePasswordHashes((previous) =>
        (previous[profile.id] || "") === cloudPasswordHash
          ? previous
          : { ...previous, [profile.id]: cloudPasswordHash }
      );
      setProfileRecoveryHashes((previous) =>
        (previous[profile.id] || "") === cloudRecoveryHash
          ? previous
          : { ...previous, [profile.id]: cloudRecoveryHash }
      );
      setProfileRecoveryQuestions((previous) =>
        (previous[profile.id] || "") === cloudRecoveryQuestion
          ? previous
          : { ...previous, [profile.id]: cloudRecoveryQuestion }
      );
      setProfileRecoveryAnswers((previous) =>
        (previous[profile.id] || "") === cloudRecoveryAnswer
          ? previous
          : { ...previous, [profile.id]: cloudRecoveryAnswer }
      );
    }

    setHydratedProfileId(profile.id);

    const pendingRole = pendingProfileRoleRef.current;
    const isRolePendingForThisProfile =
      pendingRole !== "none" && pendingRole.profileId === profile.id;
    const rolePendingConfirmed = !isRolePendingForThisProfile || cloudProfile.role === pendingRole.role;
    if (isRolePendingForThisProfile && rolePendingConfirmed) {
      pendingProfileRoleRef.current = "none";
    }

    setProfile((previous) => {
      const nextRole =
        normalized.ownerProfileId === profile.id
          ? "proprietaire"
          : isRolePendingForThisProfile && !rolePendingConfirmed
            ? previous.role
            : cloudProfile.role;
      const nextSurname = cloudProfile.surname || previous.surname;
      const nextGender: Gender = cloudProfile.gender ?? "unspecified";
      const nextHouseholdRole: HouseholdRole = cloudProfile.householdRole ?? "member";
      if (
        previous.role === nextRole &&
        previous.surname === nextSurname &&
        previous.gender === nextGender &&
        previous.householdRole === nextHouseholdRole
      ) {
        return previous;
      }
      return {
        ...previous,
        role: nextRole,
        surname: nextSurname,
        gender: nextGender,
        householdRole: nextHouseholdRole,
      };
    });

    setChecked((previous) =>
      areChecklistStatesEqual(previous, cloudProfile.checklist) ? previous : cloudProfile.checklist
    );
    setCustomChecklistItemsByProfile((previous) => {
      const current = previous[profile.id] ?? [];
      const next = cloudProfile.customChecklistItems ?? [];
      if (areCustomChecklistItemsEqual(current, next)) {
        return previous;
      }
      return {
        ...previous,
        [profile.id]: next,
      };
    });
    setOwnerGlobalChecklistAdditions((previous) =>
      areCustomChecklistItemsEqual(previous, cloudSnapshot.ownerGlobalChecklistAdditions ?? [])
        ? previous
        : cloudSnapshot.ownerGlobalChecklistAdditions ?? []
    );
    setOwnerGlobalChecklistRemovals((previous) =>
      areRemovalMapsEqual(previous, cloudSnapshot.ownerGlobalChecklistRemovals ?? {})
        ? previous
        : cloudSnapshot.ownerGlobalChecklistRemovals ?? {}
    );
    setOwnerGlobalDocumentAdditions((previous) =>
      areTravelDocumentListsEqual(previous, cloudSnapshot.ownerGlobalDocumentAdditions ?? [])
        ? previous
        : cloudSnapshot.ownerGlobalDocumentAdditions ?? []
    );
    setOwnerGlobalDocumentEdits((previous) =>
      areTravelDocumentMapsEqual(previous, cloudSnapshot.ownerGlobalDocumentEdits ?? {})
        ? previous
        : cloudSnapshot.ownerGlobalDocumentEdits ?? {}
    );
    setOwnerGlobalDocumentRemovals((previous) =>
      areRemovalMapsEqual(previous, cloudSnapshot.ownerGlobalDocumentRemovals ?? {})
        ? previous
        : cloudSnapshot.ownerGlobalDocumentRemovals ?? {}
    );
    setOwnerGlobalPlaceAdditions((previous) =>
      areTravelPlaceListsEqual(previous, cloudSnapshot.ownerGlobalPlaceAdditions ?? [])
        ? previous
        : cloudSnapshot.ownerGlobalPlaceAdditions ?? []
    );
    setPlaceCommentsByPlace((previous) => {
      const nextFromCloud = cloudSnapshot.placeComments ?? {};
      const pending = pendingPlaceCommentsRef.current;
      if (pending !== "none") {
        const serializedCloud = JSON.stringify(nextFromCloud);
        if (serializedCloud !== pending) {
          // Un push local est encore en transit: ne pas écraser l'état local.
          return previous;
        }
        pendingPlaceCommentsRef.current = "none";
      }

      return arePlaceCommentsEqual(previous, nextFromCloud)
        ? previous
        : nextFromCloud;
    });
    setPlaceVisibilityMap((previous) => {
      const nextFromCloud = cloudSnapshot.placeVisibilityMap ?? {};
      const pending = pendingPlaceVisibilityMapRef.current;
      if (pending !== "none") {
        const serializedCloud = JSON.stringify(nextFromCloud);
        if (serializedCloud !== pending) {
          return previous;
        }
        pendingPlaceVisibilityMapRef.current = "none";
      }
      return arePlaceVisibilityMapsEqual(previous, nextFromCloud) ? previous : nextFromCloud;
    });
    setPlaceSeenMap((previous) => {
      const nextFromCloud = cloudSnapshot.placeSeenMap ?? {};
      const pending = pendingPlaceSeenMapRef.current;
      if (pending !== "none") {
        const serializedCloud = JSON.stringify(nextFromCloud);
        if (serializedCloud !== pending) {
          return previous;
        }
        pendingPlaceSeenMapRef.current = "none";
      }
      return arePlaceSeenMapsEqual(previous, nextFromCloud) ? previous : nextFromCloud;
    });
    setPlaceDayOverrideMap((previous) => {
      const nextFromCloud = cloudSnapshot.placeDayOverrides ?? {};
      const pending = pendingPlaceDayOverrideMapRef.current;
      if (pending !== "none") {
        const serializedCloud = JSON.stringify(nextFromCloud);
        if (serializedCloud !== pending) {
          return previous;
        }
        pendingPlaceDayOverrideMapRef.current = "none";
      }
      return arePlaceDayOverrideMapsEqual(previous, nextFromCloud) ? previous : nextFromCloud;
    });
    setPlaceDayOrderOverrideMap((previous) => {
      const nextFromCloud = cloudSnapshot.placeDayOrderOverrides ?? {};
      const pending = pendingPlaceDayOrderOverrideMapRef.current;
      if (pending !== "none") {
        const serializedCloud = JSON.stringify(nextFromCloud);
        if (serializedCloud !== pending) {
          return previous;
        }
        pendingPlaceDayOrderOverrideMapRef.current = "none";
      }
      return arePlaceDayOrderOverrideMapsEqual(previous, nextFromCloud)
        ? previous
        : nextFromCloud;
    });
    setDocumentVisibilityMap((previous) => {
      const nextFromCloud = cloudSnapshot.documentVisibilityMap ?? {};
      const pending = pendingDocumentVisibilityMapRef.current;
      if (pending !== "none") {
        const serializedCloud = JSON.stringify(nextFromCloud);
        if (serializedCloud !== pending) {
          return previous;
        }
        pendingDocumentVisibilityMapRef.current = "none";
      }
      return areDocumentVisibilityMapsEqual(previous, nextFromCloud) ? previous : nextFromCloud;
    });
    setContentOverrides((previous) => {
      const nextFromCloud = cloudSnapshot.contentOverrides ?? {};
      const pending = pendingContentOverridesRef.current;
      if (pending !== "none") {
        const serializedCloud = JSON.stringify(nextFromCloud);
        if (serializedCloud !== pending) {
          return previous;
        }
        pendingContentOverridesRef.current = "none";
      }
      return areContentOverrideMapsEqual(previous, nextFromCloud) ? previous : nextFromCloud;
    });
    setDestinationSurveyVotes((previous) => {
      const nextFromCloud = cloudSnapshot.destinationSurvey ?? {};
      const pendingVote = pendingDestinationSurveyVoteRef.current;
      if (pendingVote !== "none") {
        const cloudVote = nextFromCloud[pendingVote.profileId] ?? null;
        if (JSON.stringify(cloudVote) !== pendingVote.serializedVote) {
          // Snapshot cloud probablement antérieur à notre dernière saisie locale.
          return previous;
        }
        pendingDestinationSurveyVoteRef.current = "none";
      }

      return areDestinationSurveyVotesEqual(previous, nextFromCloud)
        ? previous
        : nextFromCloud;
    });
    setChallengeReactionsByDay((previous) => {
      const nextFromCloud = cloudSnapshot.challengeReactions ?? {};
      const pendingReactions = pendingChallengeReactionsRef.current;
      if (pendingReactions !== "none") {
        if (stableSerializeForCloudPush(nextFromCloud) !== pendingReactions) {
          return previous;
        }
        pendingChallengeReactionsRef.current = "none";
      }

      return areChallengeReactionsEqual(previous, nextFromCloud)
        ? previous
        : nextFromCloud;
    });
    setChallengeBestVotesByDay((previous) => {
      const nextFromCloud = cloudSnapshot.challengeBestVotes ?? {};
      const pendingVotes = pendingChallengeBestVotesRef.current;
      if (pendingVotes !== "none") {
        if (stableSerializeForCloudPush(nextFromCloud) !== pendingVotes) {
          return previous;
        }
        pendingChallengeBestVotesRef.current = "none";
      }

      return areChallengeBestVotesEqual(previous, nextFromCloud)
        ? previous
        : nextFromCloud;
    });
    setGameHistory((previous) =>
      areGameHistoriesEqual(previous, cloudProfile.gameResults) ? previous : cloudProfile.gameResults
    );
    // Ne régresse jamais un record déjà connu localement (cf.
    // mergeCandyCrushChallengeRecord) : une hydratation cloud partielle/à la
    // traîne ne doit jamais effacer un record fraîchement battu en local.
    setCandyCrushBest((previous) => {
      const merged = mergeCandyCrushChallengeRecord(previous, cloudProfile.candyCrushChallenge);
      return previous?.bestScore === merged?.bestScore && previous?.updatedAt === merged?.updatedAt
        ? previous
        : merged;
    });

    // Reprise de la progression en cours (quiz déjà soumis, énigme ou défi
    // photo) : seulement si elle correspond au jour courant, sinon elle est
    // ignorée (journée précédente jamais terminée, on repart sur "intro").
    // N'est appliquée que si l'état local est ENCORE "intro" (rien démarré
    // localement pour l'instant) : dès que l'utilisateur clique "C'est
    // parti" (ou reprend une partie déjà en cours), gameState quitte
    // "intro" pour de bon, ce qui bloque toute réapplication ultérieure —
    // qu'un écho cloud arrive pendant une partie active (ce qui faisait
    // planter l'écran, cf. questions[currentQ] undefined, corrigé le
    // 2026-08-01) ou qu'une donnée périmée traîne encore dans Firebase
    // (parties de test précédentes, changement de jour simulé, etc. —
    // second bug corrigé le même jour). Un ancien garde-fou "une seule
    // fois par profil+jour" basé sur une ref avait ces deux défauts : soit
    // il consommait son unique tentative sur une valeur transitoire
    // incorrecte (currentDay pas encore stabilisé) et bloquait ensuite la
    // vraie reprise, soit il autorisait une reprise tardive à s'appliquer
    // en pleine partie fraîchement relancée. Se baser sur l'état réel
    // (gameState === "intro") au lieu d'un compteur d'essais élimine ces
    // deux classes de bug : c'est toujours sûr de réessayer tant que rien
    // n'a démarré localement, et plus jamais sûr dès que quelque chose a démarré.
    // Une journée fermée par le propriétaire (gameDayOverride "closed")
    // bloque aussi la reprise (pas seulement un nouveau départ depuis
    // "intro") : sans ce check, une session déjà en cours se reprenait
    // quand même après un F5, même la journée fermée entre-temps.
    if (postTripReplayEnabled) {
      return;
    }

    const cloudProgress = cloudProfile.gameProgress ?? null;
    const dayOverrideForCurrentDay = cloudSnapshot.gameDayOverrides?.[currentDay] ?? null;
    const hasMatchingCloudProgress =
      cloudProgress !== null &&
      cloudProgress.day === currentDay &&
      dayOverrideForCurrentDay !== "closed";

    if (hasMatchingCloudProgress && gameState === "intro") {
      setGameState((previous) => (previous === cloudProgress.phase ? previous : cloudProgress.phase));
      setCurrentQ((previous) =>
        previous === cloudProgress.answers.length ? previous : cloudProgress.answers.length
      );
      setAnswers((previous) =>
        JSON.stringify(previous) === JSON.stringify(cloudProgress.answers)
          ? previous
          : cloudProgress.answers
      );
      setQuizStartedAt((previous) =>
        previous === cloudProgress.quizStartedAt ? previous : cloudProgress.quizStartedAt
      );
      setQuizDurationSec((previous) =>
        previous === cloudProgress.quizDurationSec ? previous : cloudProgress.quizDurationSec
      );
      setRiddleValidated((previous) =>
        previous === cloudProgress.riddleValidated ? previous : cloudProgress.riddleValidated
      );
      setRiddleSolved((previous) =>
        previous === cloudProgress.riddleSolved ? previous : cloudProgress.riddleSolved
      );
      setChallengeResponse((previous) =>
        previous === (cloudProgress.challengeDraft ?? "")
          ? previous
          : (cloudProgress.challengeDraft ?? "")
      );
      if (cloudProgress.riddleValidated) {
        setRiddleFeedback(
          cloudProgress.riddleSolved
            ? `Bonne réponse ! Vous gagnez ${gameScoring.riddlePoints} points.`
            : `Pas tout à fait. La bonne réponse était "${getRiddleForDay(currentDay).answer}".`
        );
      }
    } else if (
      !hasMatchingCloudProgress &&
      gameState !== "intro" &&
      Date.now() - lastLocalGameProgressChangeAtRef.current > 4000
    ) {
      // Le cloud ne reflète plus (ou plus pour ce jour) de partie en cours
      // pour ce profil : soit le propriétaire vient de la réinitialiser
      // (outil "Réinitialiser une partie en cours" ou "Réinitialiser les
      // scores"), soit la journée a été fermée entre-temps. On aligne
      // l'état local en conséquence — sans ça, l'écran restait bloqué sur
      // l'ancienne étape (riddle/challenge) malgré la réinitialisation
      // distante, ce qui donnait l'impression que l'outil ne faisait rien.
      // Fenêtre de grâce de 4s (cf. lastLocalGameProgressChangeAtRef) : si
      // on vient tout juste de changer quelque chose localement (ex:
      // "C'est parti"), on laisse le temps à notre propre écriture de
      // remonter avant de conclure à une vraie réinitialisation distante.
      setGameState("intro");
      setCurrentQ(0);
      setSelectedAns(null);
      setAnswers([]);
      setQuizStartedAt(null);
      setQuizDurationSec(0);
      setRiddleAnswer("");
      setRiddleFeedback(null);
      setRiddleValidated(false);
      setRiddleSolved(false);
      setRiddleSelfCheckPending(false);
      setChallengeResponse("");
      setChallengeDone(false);
    }
    // gameState est délibérément exclu des dépendances : cet effet ne doit
    // se ré-exécuter QUE sur un vrai changement d'instantané cloud, jamais
    // simplement parce qu'on vient de changer gameState localement (ex :
    // cliquer "C'est parti"). Sinon, il se redéclenche immédiatement avec
    // un cloudSnapshot pas encore à jour (notre propre écriture n'a pas
    // encore fait l'aller-retour), voit "pas de progression pour ce jour"
    // et annule aussitôt l'action qu'on vient de faire localement — bug
    // vécu le 2026-08-01 : "C'est parti" semblait ne rien faire. La valeur
    // de gameState lue ci-dessus reste néanmoins toujours à jour (fermeture
    // React normale), seul le déclenchement de l'effet ignore ses changements.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cloudEnabled, cloudSnapshot, isAuthenticated, profile.id, currentDay, postTripReplayEnabled]);

  const lastCloudPushRef = useRef<string | null>(null);
  const pendingCloudPhaseRef = useRef<TravelPhase | null>(null);
  // State (not a ref): the hydration effect below also updates
  // profilePasswordHashes/profileRecoveryHashes/etc. for the same profile.
  // Using a ref here would make this "hydrated" flag flip synchronously
  // within the same effect flush, before those sibling state updates commit
  // — so effects reading the ref (auto-push, isProfileHydrationPending)
  // could see "hydrated" but still read stale (pre-hydration) password/
  // recovery hashes from state, and push an empty hash that wipes the real
  // one in Firebase. As state, it commits together with the other hydrated
  // fields on the same render, closing that race.
  const [hydratedProfileId, setHydratedProfileId] = useState<string | null>(null);
  // "none" = pas d'écriture en attente. Sinon, contient la valeur qu'on vient
  // d'envoyer et qu'on attend de voir confirmée par un instantané cloud, pour
  // éviter qu'un instantané cloud périmé (déjà en vol) n'écrase l'édition
  // locale avant que la confirmation du push n'arrive.
  const pendingTripStartDateRef = useRef<string | null | "none">("none");
  // Même mécanisme que pendingTripStartDateRef, pour le mot de passe/la
  // récupération saisis à la création d'un profil (story 18.9). Le premier
  // écho cloud après claimRoleForProfile ne contient encore que le rôle/
  // surnom (écriture séparée, transaction Firebase dédiée à l'attribution du
  // rôle) : sans ce garde-fou, l'effet d'hydratation ci-dessous prendrait ce
  // profil "encore incomplet" pour la vérité et effacerait localement le mot
  // de passe/la récupération qu'on vient de définir, avant même que notre
  // propre push complet n'ait atteint Firebase.
  const pendingProfileCredentialsRef = useRef<
    | {
        profileId: string;
        passwordHash: string;
        recoveryHash: string;
        recoveryQuestion: string;
        recoveryAnswer: string;
      }
    | "none"
  >("none");
  // Story 24.1 : même course que ci-dessus, mais pour le rôle lui-même.
  // claimRoleForProfile écrit "utilisateur" via sa transaction (elle ne
  // connaît que proprietaire/utilisateur) ; le choix "Visiteur" applique une
  // surcouche locale juste après. Sans ce garde-fou, l'écho temps réel de
  // cette transaction (encore "utilisateur") arrive parfois avant que notre
  // propre push du rôle "visiteur" n'ait atteint Firebase, et l'effet
  // d'hydratation ci-dessous rétablirait "utilisateur" de façon définitive.
  const pendingProfileRoleRef = useRef<{ profileId: string; role: Role } | "none">("none");
  // Évite qu'un snapshot cloud intermédiaire (encore ancien) n'écrase un
  // commentaire local juste après création/édition/suppression.
  const pendingPlaceCommentsRef = useRef<string | "none">("none");
  // Évite qu'un snapshot cloud intermédiaire (encore ancien) n'écrase le
  // dernier vote sondage local (sinon effet de clignotement à l'écran).
  const pendingDestinationSurveyVoteRef = useRef<
    | {
        profileId: string;
        serializedVote: string;
      }
    | "none"
  >("none");
  // Même principe que pendingPlaceCommentsRef, appliqué à la visibilité des
  // lieux: évite le clignotement quand un snapshot cloud ancien revient juste
  // après un toggle local propriétaire.
  const pendingPlaceVisibilityMapRef = useRef<string | "none">("none");
  // Même principe, appliqué au statut "vu / pas vu" posé par le propriétaire.
  const pendingPlaceSeenMapRef = useRef<string | "none">("none");
  const pendingPlaceDayOverrideMapRef = useRef<string | "none">("none");
  const pendingPlaceDayOrderOverrideMapRef = useRef<string | "none">("none");
  // Même principe que pendingPlaceVisibilityMapRef, appliqué à la visibilité
  // des documents importants.
  const pendingDocumentVisibilityMapRef = useRef<string | "none">("none");
  // Même principe, appliqué aux corrections de contenu (places/histoire/
  // géographie-économie/culture-tradition) faites par le propriétaire.
  const pendingContentOverridesRef = useRef<string | "none">("none");
  const pendingChallengeReactionsRef = useRef<string | "none">("none");
  const pendingChallengeBestVotesRef = useRef<string | "none">("none");
  const previousCommentsSnapshotRef = useRef<PlaceCommentsByPlace | null>(null);
  const pendingLaunchGateCompletionRef = useRef<{ profileId: string; cycle: number } | null>(null);
  const lastChecklistReminderKeyRef = useRef<string | null>(null);
  const ownerDeviceRegisteredRef = useRef(false);
  // Empêche le push automatique de re-créer un profil dans le cloud pendant
  // la fenêtre asynchrone entre la suppression cloud et le reset local de
  // l'état "profile" (l'écho temps réel de Firebase peut arriver avant que
  // resetForProfileSwitch() n'ait vidé role/surname).
  const isDeletingProfileRef = useRef(false);

  useEffect(() => {
    if (!cloudEnabled || !isAuthenticated) {
      return;
    }

    const hasCloudProfile = Boolean(cloudSnapshot?.profiles[profile.id]);
    const isHydratedProfile = hydratedProfileId === profile.id;
    if (cloudSnapshot && pendingCloudPhaseRef.current === cloudSnapshot.phase) {
      pendingCloudPhaseRef.current = null;
    }
    // Keep UI stable during cloud phase propagation. We only gate on profile
    // hydration, not on transient phase-sync delays, to prevent lock/unlock flicker.
    setIsProfileHydrationPending(hasCloudProfile && !isHydratedProfile);
  }, [cloudEnabled, cloudSnapshot, isAuthenticated, phase, profile.id, hydratedProfileId]);

  useEffect(() => {
    if (!cloudEnabled || !cloudReady) return;
    if (isDeletingProfileRef.current) return;

    const hasCloudProfile = Boolean(cloudSnapshot?.profiles[profile.id]);
    const canPush = shouldPushCloudSnapshot({
      cloudEnabled,
      hasSnapshot: Boolean(cloudSnapshot),
      isAuthenticated,
      isAuthBootstrapPending,
      hasActorUid: Boolean(cloudActorUid),
      hasRole: Boolean(profile.role),
      hasSurname: profile.surname.trim().length > 0,
      hasCloudProfile,
      currentProfileId: profile.id,
      hydratedProfileId,
    });
    if (!canPush) {
      if (IS_DEV) {
        console.info(
          "[cloud-sync] Push skipped: profile not ready or awaiting cloud hydration after switch."
        );
      }
      return;
    }

    if (!profile.role || !cloudActorUid) return;

    if (hasCloudProfile && cloudSnapshot && phase !== cloudSnapshot.phase) {
      if (IS_DEV) {
        console.info("[cloud-sync] Push skipped: awaiting phase synchronization with cloud snapshot.");
      }
      return;
    }

    if (pendingCloudPhaseRef.current !== null) {
      if (IS_DEV) {
        console.info("[cloud-sync] Push skipped: owner phase change still pending confirmation.");
      }
      return;
    }

    const normalized = enforceOwnerUniqueness(familyState);
    const canWriteFamilyState = canUpdateOwnerCode(normalized, profile.id);
    if (
      canWriteFamilyState &&
      !ownerDeviceRegisteredRef.current &&
      typeof registerAsOwnerDevice === "function"
    ) {
      void registerAsOwnerDevice()
        .then(() => {
          ownerDeviceRegisteredRef.current = true;
        })
        .catch(() => {
          // Keep retrying on subsequent pushes until registration succeeds.
        });
    }
    const profilePasswordHash = profilePasswordHashes[profile.id] || "";
    const profileRecoveryHash = profileRecoveryHashes[profile.id] || "";
    const profileRecoveryQuestion = profileRecoveryQuestions[profile.id] || "";
    const profileRecoveryAnswer = profileRecoveryAnswers[profile.id] || "";
    const profileCustomChecklistItems = customChecklistItemsByProfile[profile.id] ?? [];
    const payload = stableSerializeForCloudPush({
      actorUid: cloudActorUid,
      canWriteFamilyState,
      familyState: normalized,
      ownerCodeHash,
      ownerCodePlain,
      travelerCodeHash,
      travelerCodePlain,
      ownerRecoveryHash,
      ownerRecoveryConfiguredAt: ownerRecoveryHash ? true : false,
      profileId: profile.id,
      surname: profile.surname,
      role: profile.role,
      gender: profile.gender,
      householdRole: profile.householdRole,
      profilePasswordHash,
      profileRecoveryHash,
      profileRecoveryQuestion,
      profileRecoveryAnswer,
      checklist: checked,
      profileCustomChecklistItems,
      ownerGlobalChecklistAdditions,
      ownerGlobalChecklistRemovals,
      placeCommentsByPlace,
      placeVisibilityMap,
      // placeSeenMap intentionally NOT included in the bulk periodic sync
      // payload: it goes through the app-root multi-path update() alongside
      // every other field, and Firebase RTDB rejects that ENTIRE multi-path
      // write atomically if any single path fails permission/validation
      // (see project_firebase_rules_field_allowlist memory / story: same
      // failure mode already hit once with ownerCodePlain). Until
      // firebase/database.rules.*.json's placeSeenMap rule is actually
      // deployed to the live project, keep this field out of the bulk
      // payload so an undeployed rule can't silently break ALL cloud sync.
      // It's still written via the dedicated single-path setPlaceSeenForOwner
      // → pushPlaceSeen call below, which fails in isolation if rules are
      // stale (caught + logged, no cascade). Re-add here once confirmed
      // deployed.
      placeDayOverrides: placeDayOverrideMap,
      placeDayOrderOverrides: placeDayOrderOverrideMap,
      documentVisibilityMap,
      contentOverrides,
      ownerGlobalDocumentAdditions,
      ownerGlobalDocumentEdits,
      ownerGlobalDocumentRemovals,
      ownerGlobalPlaceAdditions,
      destinationSurveyVote: destinationSurveyVotes[profile.id] ?? null,
      challengeReactions: challengeReactionsByDay,
      challengeBestVotes: challengeBestVotesByDay,
      launchGateCycle,
      launchGateCompletedCycleForProfile: launchGateCompletedCycleByProfile[profile.id] ?? null,
      phase,
      tripStartDate,
      gameScoring,
      gameHistory,
      currentGameProgress,
      candyCrushBest,
    });
    if (lastCloudPushRef.current === payload) {
      return;
    }

    lastCloudPushRef.current = payload;
    void pushSnapshot({
      actorUid: cloudActorUid,
      canWriteFamilyState,
      familyState: normalized,
      ownerCodeHash,
      ownerCodePlain,
      travelerCodeHash,
      travelerCodePlain,
      ownerRecoveryHash,
      ownerRecoveryConfiguredAt: undefined,
      profileId: profile.id,
      surname: profile.surname,
      role: profile.role,
      profilePasswordHash,
      profileRecoveryHash,
      profileRecoveryQuestion,
      profileRecoveryAnswer,
      // Keep this stable in automatic sync to avoid timestamp churn loops.
      profileRecoveryConfiguredAt: profileRecoveryHash
        ? cloudSnapshot?.profiles[profile.id]?.recoveryConfiguredAt
        : undefined,
      gender: profile.gender,
      householdRole: profile.householdRole,
      checklist: checked,
      profileCustomChecklistItems,
      ownerGlobalChecklistAdditions,
      ownerGlobalChecklistRemovals,
      placeComments: placeCommentsByPlace,
      placeVisibilityMap,
      // placeSeenMap intentionally omitted here too — see comment above.
      placeDayOverrides: placeDayOverrideMap,
      placeDayOrderOverrides: placeDayOrderOverrideMap,
      documentVisibilityMap,
      contentOverrides,
      ownerGlobalDocumentAdditions,
      ownerGlobalDocumentEdits,
      ownerGlobalDocumentRemovals,
      ownerGlobalPlaceAdditions,
      profileDestinationSurveyVote: destinationSurveyVotes[profile.id] ?? null,
      challengeReactions: challengeReactionsByDay,
      challengeBestVotes: challengeBestVotesByDay,
      launchGateCycle,
      launchGateCompletedCycleForProfile: launchGateCompletedCycleByProfile[profile.id] ?? null,
      gameResults: gameHistory,
      gameProgress: currentGameProgress,
      candyCrushChallenge: candyCrushBest,
      phase,
      tripStartDate,
      gameScoring,
    });
  }, [
    checked,
    cloudEnabled,
    cloudSnapshot,
    cloudReady,
    cloudActorUid,
    familyState,
    gameHistory,
    candyCrushBest,
    gameState,
    currentDay,
    answers,
    quizStartedAt,
    quizDurationSec,
    riddleValidated,
    riddleSolved,
    challengeResponse,
    isAuthenticated,
    isAuthBootstrapPending,
    ownerCodeHash,
    ownerCodePlain,
    gameScoring,
    travelerCodeHash,
    travelerCodePlain,
    ownerRecoveryHash,
    profilePasswordHashes,
    profileRecoveryHashes,
    profileRecoveryQuestions,
    profileRecoveryAnswers,
    customChecklistItemsByProfile,
    ownerGlobalChecklistAdditions,
    ownerGlobalChecklistRemovals,
    ownerGlobalDocumentAdditions,
    ownerGlobalDocumentEdits,
    ownerGlobalDocumentRemovals,
    ownerGlobalPlaceAdditions,
    placeCommentsByPlace,
    placeVisibilityMap,
    placeDayOverrideMap,
    placeDayOrderOverrideMap,
    documentVisibilityMap,
    contentOverrides,
    destinationSurveyVotes,
    challengeReactionsByDay,
    launchGateCycle,
    launchGateCompletedCycleByProfile,
    phase,
    tripStartDate,
    hydratedProfileId,
    profile.id,
    profile.role,
    profile.surname,
    profile.gender,
    profile.householdRole,
    pushSnapshot,
  ]);

  useEffect(() => {
    setNotificationPreferences(readNotificationPreferences(profile.id));
    setNotificationPermissionStatus(getNotificationPermissionStatus());
  }, [profile.id]);

  useEffect(() => {
    const syncPermission = () => {
      setNotificationPermissionStatus(getNotificationPermissionStatus());
    };

    window.addEventListener("focus", syncPermission);
    document.addEventListener("visibilitychange", syncPermission);
    return () => {
      window.removeEventListener("focus", syncPermission);
      document.removeEventListener("visibilitychange", syncPermission);
    };
  }, []);

  useEffect(() => {
    const currentRole = profile.role;
    if (!currentRole) return;
    // When cloud is enabled, only merge this profile into the shared roster
    // once cloud itself confirms it exists (via the hydration effect or a
    // successful claim). Merging a speculative/unconfirmed profile id here
    // would let a later owner push write a bare `role` for it in Firebase
    // (via the owner-only role-sync loop) with no surname ever set, creating
    // an orphan blank-surname profile.
    if (cloudEnabled && !cloudSnapshot?.profiles[profile.id]) return;

    setFamilyState((previous) => {
      const mutation = applyProfileRoleMutation(previous, profile.id, currentRole);
      if (mutation.rejected && IS_DEV) {
        console.info(
          `[owner-policy] Role mutation rejected (${mutation.reason}) for profile ${profile.id}.`
        );
      }
      const normalizedRole = mutation.role;

      if (normalizedRole !== profile.role) {
        setProfile((current) => ({ ...current, role: normalizedRole }));
      }

      return mutation.state;
    });
    // Intentionally not reacting to cloudSnapshot changes here: cloudSnapshot
    // is only consulted for its value at the moment profile.id/profile.role
    // change (e.g. right after creation/login). Reacting to every snapshot
    // update (which gets a new object reference on every realtime echo, even
    // no-op ones) would re-run this effect far too often. Eventual
    // consistency once cloud confirms a profile is handled separately by the
    // cloud-hydration effect, which syncs familyState from cloudSnapshot with
    // a proper equality check.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.id, profile.role, cloudEnabled]);

  useEffect(() => {
    if (unlockLockedUntil <= Date.now()) return;
    const id = setInterval(() => setNowTs(Date.now()), 500);
    return () => clearInterval(id);
  }, [unlockLockedUntil]);

  useEffect(() => {
    // Pendant le bootstrap cloud (auth, snapshot, hydratation du profil), le rôle
    // et la phase peuvent transiter par des valeurs par défaut/incohérentes avant
    // de se stabiliser. Vérifier l'accès à ce moment-là déclenchait un refus
    // d'accès fantôme (message rouge) et repoussait l'écran restauré vers
    // Checklist. On attend que le même chargement que l'écran de chargement
    // (CloudLoadingScreen) soit terminé avant de faire respecter les accès.
    const isBootstrapping =
      isInitializing ||
      (cloudEnabled && (!cloudReady || isAuthBootstrapPending || isProfileHydrationPending || !isAuthenticated));
    if (isBootstrapping) return;

    if (!canAccessCurrentScreen) {
      setAccessDeniedMessage(getAccessDeniedMessage(profile.role, phase, screen));
      const safeScreen = getSafeScreen(profile.role, phase);
      if (safeScreen !== screen) {
        setScreen(safeScreen);
      }
    }
  }, [
    phase,
    profile.role,
    screen,
    cloudEnabled,
    cloudReady,
    isAuthBootstrapPending,
    isProfileHydrationPending,
    isAuthenticated,
    isInitializing,
    canAccessCurrentScreen,
  ]);

  useEffect(() => {
    if (!accessDeniedMessage) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setAccessDeniedMessage(null);
    }, 4500);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [accessDeniedMessage]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const profileReady = profile.surname.trim().length > 0 && profile.role !== null;

  const currentProfileCustomItems = customChecklistItemsByProfile[profile.id] ?? [];
  const effectiveChecklistCategories = mergeChecklistCatalog(
    CHECKLIST_CATEGORIES,
    ownerGlobalChecklistAdditions,
    ownerGlobalChecklistRemovals,
    currentProfileCustomItems
  );

  // Documents/informations importantes après application des corrections,
  // ajouts et suppressions du propriétaire (voir contentOverrides plus haut
  // pour le même principe appliqué aux rubriques places/histoire/etc.).
  const documentsWithOwnerOverrides: TravelDocument[] = [
    ...DOCUMENTS.filter((doc) => !ownerGlobalDocumentRemovals[doc.id]).map(
      (doc) => ownerGlobalDocumentEdits[doc.id] ?? doc
    ),
    ...ownerGlobalDocumentAdditions,
  ];

  function saveDocumentForOwner(document: TravelDocument): void {
    if (!canUpdateOwnerCode(familyState, profile.id)) {
      return;
    }
    const isDefaultDocument = DOCUMENTS.some((doc) => doc.id === document.id);
    if (isDefaultDocument) {
      setOwnerGlobalDocumentEdits((previous) => ({ ...previous, [document.id]: document }));
    } else {
      setOwnerGlobalDocumentAdditions((previous) => {
        const exists = previous.some((doc) => doc.id === document.id);
        return exists
          ? previous.map((doc) => (doc.id === document.id ? document : doc))
          : [...previous, document];
      });
    }
  }

  function deleteDocumentForOwner(documentId: string): void {
    if (!canUpdateOwnerCode(familyState, profile.id)) {
      return;
    }
    const isDefaultDocument = DOCUMENTS.some((doc) => doc.id === documentId);
    if (isDefaultDocument) {
      setOwnerGlobalDocumentRemovals((previous) => ({ ...previous, [documentId]: true }));
      setOwnerGlobalDocumentEdits((previous) => {
        if (!(documentId in previous)) {
          return previous;
        }
        const next = { ...previous };
        delete next[documentId];
        return next;
      });
    } else {
      setOwnerGlobalDocumentAdditions((previous) => previous.filter((doc) => doc.id !== documentId));
    }
  }

  // Visite/activité ajoutée par le propriétaire dans le Guide du séjour
  // (n'existe pas dans PLACES). Contrairement aux documents, pas de branche
  // "place par défaut" ici : éditer/masquer une place par défaut passe déjà
  // par contentOverrides/placeVisibilityMap, donc ownerGlobalPlaceAdditions ne
  // contient jamais que des places ajoutées par le propriétaire.
  function savePlaceForOwner(place: Place): void {
    if (!canUpdateOwnerCode(familyState, profile.id)) {
      return;
    }
    setOwnerGlobalPlaceAdditions((previous) => {
      const exists = previous.some((p) => p.id === place.id);
      return exists
        ? previous.map((p) => (p.id === place.id ? place : p))
        : [...previous, place];
    });
  }

  function deletePlaceForOwner(placeId: string): void {
    if (!canUpdateOwnerCode(familyState, profile.id)) {
      return;
    }
    setOwnerGlobalPlaceAdditions((previous) => previous.filter((p) => p.id !== placeId));
  }

  const toggleItem = (id: string) =>
    setChecked((p) => ({ ...p, [id]: !p[id] }));

  const updateNewItemDraft = (categoryId: string, value: string) => {
    setNewItemDrafts((previous) => ({
      ...previous,
      [categoryId]: value,
    }));
  };

  const addChecklistItem = (categoryId: string) => {
    const rawLabel = newItemDrafts[categoryId] ?? "";
    const label = rawLabel.trim();
    if (!label) {
      return;
    }

    if (!isValidCategoryId(categoryId)) {
      return;
    }

    const itemId = `custom-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const baseItem: CustomChecklistItem = {
      id: itemId,
      label,
      categoryId,
      isCustom: true,
    };

    if (profile.role === "proprietaire") {
      setOwnerGlobalChecklistAdditions((previous) => [...previous, baseItem]);
      setOwnerGlobalChecklistRemovals((previous) => {
        if (!previous[itemId]) {
          return previous;
        }
        const next = { ...previous };
        delete next[itemId];
        return next;
      });
    } else {
      const profileScoped: CustomChecklistItem = {
        ...baseItem,
        genderTargets: profile.gender === "unspecified" ? undefined : profile.gender,
        householdRoleTargets: profile.householdRole === "member" ? undefined : profile.householdRole,
        visibleToProfileId: profile.id,
      };

      setCustomChecklistItemsByProfile((previous) => {
        const current = previous[profile.id] ?? [];
        return {
          ...previous,
          [profile.id]: [...current, profileScoped],
        };
      });
    }

    setNewItemDrafts((previous) => ({
      ...previous,
      [categoryId]: "",
    }));
  };

  const deleteChecklistItem = (itemId: string) => {
    if (profile.role !== "proprietaire" && profile.role !== "utilisateur") {
      return;
    }

    if (profile.role === "utilisateur") {
      const current = customChecklistItemsByProfile[profile.id] ?? [];
      const isOwnItem = current.some(
        (item) => item.id === itemId && item.visibleToProfileId === profile.id
      );
      if (!isOwnItem) {
        return;
      }

      setCustomChecklistItemsByProfile((previous) => {
        const existing = previous[profile.id] ?? [];
        return {
          ...previous,
          [profile.id]: existing.filter((item) => item.id !== itemId),
        };
      });
      setChecked((previous) => {
        if (!(itemId in previous)) {
          return previous;
        }
        const next = { ...previous };
        delete next[itemId];
        return next;
      });
      return;
    }

    setOwnerGlobalChecklistAdditions((previous) => previous.filter((item) => item.id !== itemId));
    setOwnerGlobalChecklistRemovals((previous) => ({
      ...previous,
      [itemId]: true,
    }));
    setChecked((previous) => {
      if (!(itemId in previous)) {
        return previous;
      }
      const next = { ...previous };
      delete next[itemId];
      return next;
    });
  };

  const toggleCategory = (id: string) =>
    setOpenCategories((p) => {
      const n = new Set(p);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const profileFilterInput: ProfileFilterInput = {
    profileId: profile.id,
    role: profile.role ?? "utilisateur",
    gender: profile.gender,
    householdRole: profile.householdRole,
  };
  const visibleCategories = filterCategoriesForProfile(effectiveChecklistCategories, profileFilterInput);
  const visibleItemIds = getVisibleItemIds(effectiveChecklistCategories, profileFilterInput);

  const totalItems = visibleCategories.reduce(
    (s, c) => s + c.items.length,
    0
  );
  const checkedCount = Array.from(visibleItemIds).filter(
    (id) => checked[id]
  ).length;
  const pctRaw = totalItems > 0 ? Math.round((checkedCount / totalItems) * 100) : 0;
  const pct = Math.max(0, Math.min(100, pctRaw));

  const startJourney = () => {
    setStartError(null);
    setStartCodeInput("");
    setShowStartPrompt(true);
  };

  const resetRecoveryPromptState = () => {
    setRecoveryPhraseInput("");
    setRecoveryNewCodeInput("");
    setRecoveryCodeConfirmInput("");
    setRecoveryError(null);
  };

  const lockRemainingMs = Math.max(0, unlockLockedUntil - nowTs);
  const lockRemainingSec = Math.ceil(lockRemainingMs / 1000);
  const canControlAppLock = profile.role === "proprietaire" || canUpdateOwnerCode(familyState, profile.id);

  const confirmStartJourney = async () => {
    if (!canControlAppLock) {
      setStartError("Seul le profil propriétaire peut débloquer le voyage.");
      return;
    }
    if (!ownerCodeHash) {
      setStartError("Configurez d'abord un code propriétaire dans Paramètres.");
      return;
    }
    if (lockRemainingMs > 0) {
      setStartError(`Trop de tentatives. Réessayez dans ${lockRemainingSec}s.`);
      return;
    }

    const isCodeValid = await verifyOwnerCode(startCodeInput, ownerCodeHash);
    if (!isCodeValid) {
      const nextAttempts = unlockFailedAttempts + 1;
      if (nextAttempts >= 3) {
        const nextLock = Date.now() + 30000;
        setUnlockFailedAttempts(0);
        setUnlockLockedUntil(nextLock);
        setNowTs(Date.now());
        setStartError("Code incorrect. Blocage temporaire de 30 secondes.");
      } else {
        setUnlockFailedAttempts(nextAttempts);
        setStartError("Code incorrect. Réessayez.");
      }
      return;
    }

    const nextLaunchCycle = getNextLaunchGateCycle(launchGateCycle, phase, "during");
    const syncResult = await pushPhaseChange("during", { launchGateCycle: nextLaunchCycle });
    if (!syncResult.ok) {
      setStartError(syncResult.message);
      return;
    }

    setUnlockFailedAttempts(0);
    setUnlockLockedUntil(0);
    setStartError(null);
    setShowStartPrompt(false);
    setStartCodeInput("");
    setLaunchGateCycle(nextLaunchCycle);
    setPhase("during");
    setScreen("dashboard");
  };

  const openForgotCodeFlow = () => {
    const guards = evaluateOwnerRecoveryGuards(familyState, profile.id, ownerRecoveryHash);

    if (!guards.canOpenFlow) {
      setStartError("Seul le profil propriétaire peut débloquer le voyage.");
      return;
    }

    if (!guards.canResetCode) {
      setShowStartPrompt(false);
      setStartCodeInput("");
      setStartError(null);
      resetRecoveryPromptState();
      setScreen("settings");
      return;
    }

    resetRecoveryPromptState();
    setShowStartPrompt(false);
    setShowRecoveryPrompt(true);
  };

  const confirmRecoveryReset = async () => {
    const guards = evaluateOwnerRecoveryGuards(familyState, profile.id, ownerRecoveryHash);

    if (!guards.canOpenFlow) {
      setRecoveryError("Seul le profil propriétaire peut réinitialiser le code.");
      return;
    }

    if (!guards.canResetCode) {
      setRecoveryError("Aucune phrase de récupération configurée.");
      return;
    }

    if (lockRemainingMs > 0) {
      setRecoveryError(`Trop de tentatives. Réessayez dans ${lockRemainingSec}s.`);
      return;
    }

    const phrase = recoveryPhraseInput.trim();
    if (!phrase) {
      setRecoveryError("Entrez la phrase de récupération.");
      return;
    }

    const nextCode = recoveryNewCodeInput.trim();
    const confirmCode = recoveryCodeConfirmInput.trim();

    if (nextCode.length < 4) {
      setRecoveryError("Le code doit contenir au moins 4 caractères.");
      return;
    }

    if (nextCode !== confirmCode) {
      setRecoveryError("La confirmation du code ne correspond pas.");
      return;
    }

    try {
      const phraseMatches = await verifyOwnerRecoveryPhrase(phrase, ownerRecoveryHash);
      if (!phraseMatches) {
        const nextAttempts = unlockFailedAttempts + 1;
        if (nextAttempts >= 3) {
          const nextLock = Date.now() + 30000;
          setUnlockFailedAttempts(0);
          setUnlockLockedUntil(nextLock);
          setNowTs(Date.now());
          setRecoveryError("Phrase incorrecte. Blocage temporaire de 30 secondes.");
        } else {
          setUnlockFailedAttempts(nextAttempts);
          setRecoveryError("Phrase incorrecte. Le code propriétaire n'a pas été modifié.");
        }
        return;
      }

      const nextHash = await hashOwnerCode(nextCode);
      const nextLaunchCycle = getNextLaunchGateCycle(launchGateCycle, phase, "during");
      const syncResult = await pushPhaseChange("during", { launchGateCycle: nextLaunchCycle });
      if (!syncResult.ok) {
        setRecoveryError(syncResult.message);
        return;
      }

      setOwnerCodeHash(nextHash);
      setUnlockFailedAttempts(0);
      setUnlockLockedUntil(0);
      setNowTs(Date.now());
      setShowRecoveryPrompt(false);
      setShowStartPrompt(false);
      setStartCodeInput("");
      setStartError(null);
      resetRecoveryPromptState();
      setLaunchGateCycle(nextLaunchCycle);
      setPhase("during");
      setScreen("dashboard");
    } catch {
      setRecoveryError("Une erreur est survenue. Réessayez.");
    }
  };

  const performNavigation = (s: Screen) => {
    if (s === "game" && !isOnline) {
      setAccessDeniedMessage("Jeu du jour indisponible hors ligne. Reconnectez-vous pour le lancer.");
      setScreen(getSafeScreen(profile.role, phase));
      return;
    }

    if ((s === "trivial" || s === "candy-crush" || s === "ordalie" || s === "imposteur") && !isOnline) {
      setAccessDeniedMessage(
        s === "trivial"
          ? "Trivial Turquie indisponible hors ligne. Reconnectez-vous pour rejoindre une partie."
          : "Espace ludique indisponible hors ligne. Reconnectez-vous pour lancer les jeux."
      );
      setScreen(getSafeScreen(profile.role, phase));
      return;
    }

    if (!isPostTripReplayOpenScreen(s) && !canAccessScreen(profile.role, phase, s)) {
      setAccessDeniedMessage(getAccessDeniedMessage(profile.role, phase, s));
      setScreen(getSafeScreen(profile.role, phase));
      return;
    }

    setAccessDeniedMessage(null);
    setScreen(s);
  };

  // Règles de navigation pendant le jeu du jour (story jeu 2026-07-31) :
  // - "playing" (quiz en cours) et "riddle" (énigme, avant d'avoir cliqué
  //   "Continuer vers le défi") sont bloquants : impossible de changer
  //   d'écran, on affiche juste un avertissement.
  // - "done" (récap du quiz) et "challenge" (défi final) autorisent à
  //   quitter et reprendre plus tard, sans confirmation. Quitter pendant
  //   "done" fait basculer directement vers l'énigme (le récap du quiz ne
  //   se revoit pas, cf. règle "pas de rejeu").
  const goToScreen = (s: Screen) => {
    const isLeavingGameScreen = screen === "game" && s !== "game";
    if (!isLeavingGameScreen) {
      performNavigation(s);
      return;
    }

    if (gameState === "playing" || gameState === "riddle") {
      setPendingScreen(s);
      return;
    }

    if (gameState === "done") {
      setGameState("riddle");
    }
    performNavigation(s);
  };

  const openPlace = (id: string) => {
    if (!canAccessScreen(profile.role, phase, "place")) {
      setAccessDeniedMessage(getAccessDeniedMessage(profile.role, phase, "place"));
      setScreen(getSafeScreen(profile.role, phase));
      return;
    }

    if (!isPlaceVisibleForRole(profile.role, id, placeVisibilityMap)) {
      setAccessDeniedMessage("Ce lieu est masqué par le propriétaire.");
      setSelectedPlaceId(null);
      setScreen("guide");
      return;
    }

    setAccessDeniedMessage(null);
    setSelectedPlaceId(id);
    setScreen("place");
  };

  const setPlaceVisibilityForOwner = (placeId: string, nextState: PlaceVisibilityState) => {
    if (!canUpdateOwnerCode(familyState, profile.id)) {
      return;
    }

    setPlaceVisibilityMap((previous) => {
      const next = { ...previous };
      if (nextState === "visible") {
        delete next[placeId];
      } else {
        next[placeId] = nextState;
      }
      if (cloudEnabled) {
        pendingPlaceVisibilityMapRef.current = JSON.stringify(next);
      }
      return next;
    });

    if (cloudEnabled) {
      void setPlaceVisibilityInCloud(placeId, nextState === "visible" ? null : nextState).catch(
        (error) => {
          console.error("[place-visibility] cloud write failed", {
            placeId,
            nextState,
            error,
          });
        }
      );
    }
  };

  const setPlaceSeenForOwner = (placeId: string, nextState: PlaceSeenState) => {
    if (!canUpdateOwnerCode(familyState, profile.id)) {
      return;
    }

    setPlaceSeenMap((previous) => {
      const next = { ...previous };
      if (nextState === "unseen") {
        delete next[placeId];
      } else {
        next[placeId] = nextState;
      }
      if (cloudEnabled) {
        pendingPlaceSeenMapRef.current = JSON.stringify(next);
      }
      return next;
    });

    if (cloudEnabled) {
      void setPlaceSeenInCloud(placeId, nextState === "unseen" ? null : nextState).catch(
        (error) => {
          console.error("[place-seen] cloud write failed", {
            placeId,
            nextState,
            error,
          });
        }
      );
    }
  };

  const setContentOverrideForOwner = (
    source: ContentSource,
    itemId: string,
    patch: ContentOverridePatch | null
  ) => {
    if (!canUpdateOwnerCode(familyState, profile.id)) {
      return;
    }

    setContentOverrides((previous) => {
      const next: ContentOverrideMap = { ...previous };
      const itemsForSource = { ...(next[source] ?? {}) };
      if (patch) {
        itemsForSource[itemId] = patch;
      } else {
        delete itemsForSource[itemId];
      }
      if (Object.keys(itemsForSource).length > 0) {
        next[source] = itemsForSource;
      } else {
        delete next[source];
      }
      if (cloudEnabled) {
        pendingContentOverridesRef.current = JSON.stringify(next);
      }
      return next;
    });

    if (cloudEnabled) {
      void setContentOverrideInCloud(source, itemId, patch).catch((error) => {
        console.error("[content-override] cloud write failed", {
          source,
          itemId,
          error,
        });
      });
    }
  };

  const setPlaceDaysForOwner = async (
    placeId: string,
    nextDays: number[],
    dayOrderByDay: Record<number, number>
  ): Promise<boolean> => {
    if (!canUpdateOwnerCode(familyState, profile.id)) {
      return false;
    }

    const normalizedNextDays = normalizePlaceDays(nextDays);
    if (normalizedNextDays.length === 0) {
      return false;
    }

    const placeDefinition = placesWithOverrides.find((candidate) => candidate.id === placeId);
    if (!placeDefinition) {
      return false;
    }

    const baseDays = getBasePlaceDays(placeDefinition);
    const previousMap = placeDayOverrideMap;
    const previousOrderMap = placeDayOrderOverrideMap;
    const nextMap = { ...previousMap };
    const nextOrderMap = { ...previousOrderMap };

    const normalizedOrderByDay = Object.fromEntries(
      Object.entries(dayOrderByDay)
        .map(([dayKey, value]) => [Number(dayKey), value])
        .filter(
          ([day, value]) =>
            Number.isFinite(day) &&
            normalizedNextDays.includes(Math.trunc(day)) &&
            typeof value === "number" &&
            Number.isFinite(value) &&
            Math.trunc(value) > 0
        )
        .map(([day, value]) => [Math.trunc(day), Math.trunc(value as number)])
    );

    const hasOrderOverride = Object.keys(normalizedOrderByDay).length > 0;
    const shouldClearOverride =
      !hasOrderOverride && JSON.stringify(normalizedNextDays) === JSON.stringify(baseDays);

    if (shouldClearOverride) {
      delete nextMap[placeId];
    } else {
      nextMap[placeId] = normalizedNextDays;
    }
    if (Object.keys(normalizedOrderByDay).length > 0) {
      nextOrderMap[placeId] = normalizedOrderByDay;
    } else {
      delete nextOrderMap[placeId];
    }

    if (cloudEnabled) {
      pendingPlaceDayOverrideMapRef.current = JSON.stringify(nextMap);
      pendingPlaceDayOrderOverrideMapRef.current = JSON.stringify(nextOrderMap);
    }
    setPlaceDayOverrideMap(nextMap);
    setPlaceDayOrderOverrideMap(nextOrderMap);

    if (!cloudEnabled) {
      return true;
    }

    try {
      await setPlaceDayOverride(
        placeId,
        shouldClearOverride ? null : normalizedNextDays,
        hasOrderOverride ? normalizedOrderByDay : null
      );
      console.info("[place-day-override] sync ok", {
        placeId,
        days: shouldClearOverride ? null : normalizedNextDays,
        dayOrderByDay: hasOrderOverride ? normalizedOrderByDay : null,
        actorProfileId: profile.id,
        actorRole: profile.role,
        familyOwnerProfileId: familyState.ownerProfileId,
        cloudActorUid,
      });
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      pendingPlaceDayOverrideMapRef.current = "none";
      pendingPlaceDayOrderOverrideMapRef.current = "none";
      setPlaceDayOverrideMap(previousMap);
      setPlaceDayOrderOverrideMap(previousOrderMap);
      setAccessDeniedMessage(
        errorMessage.includes("auth-required")
          ? "Synchronisation impossible: session cloud indisponible."
          : errorMessage.toUpperCase().includes("PERMISSION_DENIED")
            ? "Synchronisation refusée par Firebase pour ce profil propriétaire."
            : "La modification des jours n'a pas pu être synchronisée."
      );
      console.error("[place-day-override] sync failed", {
        placeId,
        days: shouldClearOverride ? null : normalizedNextDays,
        dayOrderByDay: hasOrderOverride ? normalizedOrderByDay : null,
        actorProfileId: profile.id,
        actorRole: profile.role,
        familyOwnerProfileId: familyState.ownerProfileId,
        cloudActorUid,
        errorMessage,
        error,
      });
      return false;
    }
  };

  const setDocumentVisibilityForOwner = (documentId: string, nextState: DocumentVisibilityState) => {
    if (!canUpdateOwnerCode(familyState, profile.id)) {
      return;
    }

    setDocumentVisibilityMap((previous) => {
      const next = { ...previous };
      if (nextState === "visible") {
        delete next[documentId];
      } else {
        next[documentId] = nextState;
      }
      if (cloudEnabled) {
        pendingDocumentVisibilityMapRef.current = JSON.stringify(next);
      }
      return next;
    });
  };

  useEffect(() => {
    if (screen !== "place" || !selectedPlaceId) {
      return;
    }

    if (!isPlaceVisibleForRole(profile.role, selectedPlaceId, placeVisibilityMap)) {
      setAccessDeniedMessage("Ce lieu est masqué par le propriétaire.");
      setSelectedPlaceId(null);
      setScreen("guide");
    }
  }, [screen, selectedPlaceId, profile.role, placeVisibilityMap]);

  // Cache local best-effort (voir parseCarnetVisiteCache) : pas de debounce
  // nécessaire, le volume de données change rarement (une entrée à la fois).
  useEffect(() => {
    try {
      localStorage.setItem(CARNET_VISITE_CACHE_STORAGE_KEY, JSON.stringify(carnetVisiteByPlace));
    } catch {
      // Ignore storage errors (quota dépassé, navigation privée...)
    }
  }, [carnetVisiteByPlace]);

  // Carnet de visite chargé à la demande : abonnement scope au seul lieu
  // actuellement ouvert (subscribeToPlaceVisitLog), pas au flux famille
  // global. Se désabonne dès qu'on change de lieu ou qu'on quitte la fiche.
  useEffect(() => {
    if (!selectedPlaceId) {
      return;
    }

    const placeId = selectedPlaceId;
    const unsubscribe = subscribeToPlaceVisitLog(
      placeId,
      (log) => {
        setCarnetVisiteByPlace((previous) => ({ ...previous, [placeId]: log }));
      },
      () => {
        console.error("[carnet-visite] subscription failed", { placeId });
      }
    );

    return () => unsubscribe();
  }, [selectedPlaceId, subscribeToPlaceVisitLog]);

  // Même logique que le cache du carnet de visite des lieux ci-dessus, pour
  // le carnet de visite des rubriques de contenu.
  useEffect(() => {
    try {
      localStorage.setItem(CARNET_CONTENT_CACHE_STORAGE_KEY, JSON.stringify(carnetContentByKey));
    } catch {
      // Ignore storage errors (quota dépassé, navigation privée...)
    }
  }, [carnetContentByKey]);

  // Carnet de visite des rubriques de contenu, chargé à la demande : un seul
  // abonnement à la fois, scope à la rubrique/l'item actuellement affiché
  // (Histoire, Culture et tradition ou Géographie et économie), déterminé via
  // l'écran courant + son id de topic sélectionné. Même esprit que l'effet
  // équivalent pour selectedPlaceId ci-dessus.
  useEffect(() => {
    const source: ContentSource | null =
      screen === "histoire-topic" && selectedTopicId
        ? "histoire"
        : screen === "geographie-topic" && selectedGeographieTopicId
          ? "geographie-economie"
          : screen === "culture-topic" && selectedCultureTopicId
            ? "culture-tradition"
            : null;
    const itemId =
      source === "histoire"
        ? selectedTopicId
        : source === "geographie-economie"
          ? selectedGeographieTopicId
          : source === "culture-tradition"
            ? selectedCultureTopicId
            : null;

    if (!source || !itemId) {
      return;
    }

    const key = carnetContentKey(source, itemId);
    const unsubscribe = subscribeToContentVisitLog(
      source,
      itemId,
      (log) => {
        setCarnetContentByKey((previous) => ({ ...previous, [key]: log }));
      },
      () => {
        console.error("[carnet-visite] content subscription failed", { source, itemId });
      }
    );

    return () => unsubscribe();
  }, [
    screen,
    selectedTopicId,
    selectedGeographieTopicId,
    selectedCultureTopicId,
    subscribeToContentVisitLog,
  ]);

  // Contenu des 4 rubriques après application des corrections/ajouts du
  // propriétaire (contentOverrides). Les champs non modifiés restent ceux
  // des fichiers .ts sources (voir applyContentOverride).
  const placesWithOverrides = useMemo(
    () => [
      ...PLACES_WITH_AUTO_GPS.map((p) => applyContentOverride(p, contentOverrides.places?.[p.id])),
      ...ownerGlobalPlaceAdditions,
    ],
    [contentOverrides.places, ownerGlobalPlaceAdditions]
  );
  const ownerAddedPlaceIds = useMemo(
    () => new Set(ownerGlobalPlaceAdditions.map((p) => p.id)),
    [ownerGlobalPlaceAdditions]
  );
  const histoireTopicsWithOverrides = useMemo(
    () => HISTOIRE_TOPICS.map((t) => applyContentOverride(t, contentOverrides.histoire?.[t.id])),
    [contentOverrides.histoire]
  );
  const geographieTopicsWithOverrides = useMemo(
    () =>
      GEOGRAPHIE_ECONOMIE_TOPICS.map((t) =>
        applyContentOverride(t, contentOverrides["geographie-economie"]?.[t.id])
      ),
    [contentOverrides]
  );
  const cultureTopicsWithOverrides = useMemo(
    () =>
      CULTURE_TRADITION_TOPICS.map((t) =>
        applyContentOverride(t, contentOverrides["culture-tradition"]?.[t.id])
      ),
    [contentOverrides]
  );

  const place = placesWithOverrides.find((p) => p.id === selectedPlaceId);

  useEffect(() => {
    const existingVote = destinationSurveyVotes[profile.id];
    if (!existingVote) {
      setDestinationSurveyDrafts(["", "", ""]);
      return;
    }

    const nextDrafts = [
      existingVote.proposals[0] ?? "",
      existingVote.proposals[1] ?? "",
      existingVote.proposals[2] ?? "",
    ];
    setDestinationSurveyDrafts(nextDrafts);
  }, [destinationSurveyVotes, profile.id]);

  const updateDestinationSurveyDraft = (index: number, value: string) => {
    setDestinationSurveyDrafts((previous) => {
      const next = [...previous];
      next[index] = value;
      return next;
    });
    if (destinationSurveyError) {
      setDestinationSurveyError(null);
    }
  };

  const saveDestinationSurvey = () => {
    if (phase !== "before") {
      setDestinationSurveyError("Le sondage est verrouille apres le deblocage.");
      return;
    }

    const validation = validateDestinationProposals(destinationSurveyDrafts);
    if (!validation.ok) {
      setDestinationSurveyError(validation.message);
      return;
    }

    const vote: DestinationSurveyVote = {
      profileId: profile.id,
      proposals: validation.proposals,
      updatedAt: Date.now(),
      authorUid: cloudActorUid ?? undefined,
    };

    if (cloudEnabled) {
      pendingDestinationSurveyVoteRef.current = {
        profileId: profile.id,
        serializedVote: JSON.stringify(vote),
      };
    }

    setDestinationSurveyVotes((previous) => ({
      ...previous,
      [profile.id]: vote,
    }));
    setDestinationSurveyError(null);
  };

  const upsertPlaceComment = (input: {
    placeId: string;
    reaction: PlaceCommentReaction | null;
    text: string;
    isNew?: boolean;
  }) => {
    if (!profile.role) {
      return;
    }

    const now = Date.now();
    const authorProfileId = profile.id;
    const commentId = input.isNew ? `${authorProfileId}-${now}` : authorProfileId;
    const authorSurnameSnapshot = profile.surname.trim() || "Profil";

    setPlaceCommentsByPlace((previous) => {
      const placeComments = previous[input.placeId] ?? {};
      const existing = placeComments[commentId];
      const nextComment: PlaceComment = {
        commentId,
        placeId: input.placeId,
        authorProfileId,
        authorSurnameSnapshot,
        reaction: input.reaction,
        text: input.text,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
        authorUid: cloudActorUid ?? undefined,
      };

      const next: PlaceCommentsByPlace = {
        ...previous,
        [input.placeId]: {
          ...placeComments,
          [commentId]: nextComment,
        },
      };

      if (cloudEnabled) {
        pendingPlaceCommentsRef.current = JSON.stringify(next);
      }

      return next;
    });
  };

  // Carnet de visite : contrairement à upsertPlaceComment, pas de pendingRef
  // ni de réconciliation au prochain snapshot famille — le carnet vit hors du
  // snapshot global, donc l'écriture cloud se fait directement ici (comme
  // setPlaceSeen/setContentOverride ci-dessus), en plus de la mise à jour
  // optimiste de l'état local.
  const upsertCarnetVisiteEntry = (input: {
    placeId: string;
    text: string;
    photos: Record<string, string>;
    entryId?: string;
  }) => {
    if (!profile.role || profile.role === "visiteur") {
      return;
    }

    const now = Date.now();
    const authorProfileId = profile.id;
    const entryId = input.entryId ?? `${authorProfileId}-${now}`;
    const authorSurnameSnapshot = profile.surname.trim() || "Profil";
    const existing = carnetVisiteByPlace[input.placeId]?.[entryId];

    const nextEntry: CarnetVisiteEntry = {
      entryId,
      placeId: input.placeId,
      authorProfileId,
      authorSurnameSnapshot,
      text: input.text,
      photos: input.photos,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      authorUid: cloudActorUid ?? undefined,
    };

    setCarnetVisiteByPlace((previous) => {
      const placeEntries = previous[input.placeId] ?? {};
      return {
        ...previous,
        [input.placeId]: {
          ...placeEntries,
          [entryId]: nextEntry,
        },
      };
    });

    if (cloudEnabled) {
      void upsertCarnetVisiteEntryInCloud(nextEntry).catch((error) => {
        console.error("[carnet-visite] cloud write failed", {
          placeId: input.placeId,
          entryId,
          error,
        });
      });
    }
  };

  const deleteCarnetVisiteEntry = (placeId: string, entryId: string) => {
    setCarnetVisiteByPlace((previous) => {
      const placeEntries = { ...(previous[placeId] ?? {}) };
      delete placeEntries[entryId];
      return { ...previous, [placeId]: placeEntries };
    });

    if (cloudEnabled) {
      void deleteCarnetVisiteEntryInCloud(placeId, entryId).catch((error) => {
        console.error("[carnet-visite] cloud delete failed", { placeId, entryId, error });
      });
    }
  };

  // Même logique qu'upsertCarnetVisiteEntry/deleteCarnetVisiteEntry
  // ci-dessus, pour le carnet de visite des rubriques de contenu — sans
  // photos, clé composite [source, itemId] au lieu de placeId.
  const upsertCarnetContentEntry = (input: {
    source: ContentSource;
    itemId: string;
    text: string;
    entryId?: string;
  }) => {
    if (!profile.role || profile.role === "visiteur") {
      return;
    }

    const now = Date.now();
    const authorProfileId = profile.id;
    const entryId = input.entryId ?? `${authorProfileId}-${now}`;
    const authorSurnameSnapshot = profile.surname.trim() || "Profil";
    const key = carnetContentKey(input.source, input.itemId);
    const existing = carnetContentByKey[key]?.[entryId];

    const nextEntry: CarnetContentEntry = {
      entryId,
      source: input.source,
      itemId: input.itemId,
      authorProfileId,
      authorSurnameSnapshot,
      text: input.text,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      authorUid: cloudActorUid ?? undefined,
    };

    setCarnetContentByKey((previous) => {
      const entriesForKey = previous[key] ?? {};
      return {
        ...previous,
        [key]: {
          ...entriesForKey,
          [entryId]: nextEntry,
        },
      };
    });

    if (cloudEnabled) {
      void upsertCarnetContentEntryInCloud(nextEntry).catch((error) => {
        console.error("[carnet-visite] content cloud write failed", {
          source: input.source,
          itemId: input.itemId,
          entryId,
          error,
        });
      });
    }
  };

  const deleteCarnetContentEntry = (source: ContentSource, itemId: string, entryId: string) => {
    const key = carnetContentKey(source, itemId);
    setCarnetContentByKey((previous) => {
      const entriesForKey = { ...(previous[key] ?? {}) };
      delete entriesForKey[entryId];
      return { ...previous, [key]: entriesForKey };
    });

    if (cloudEnabled) {
      void deleteCarnetContentEntryInCloud(source, itemId, entryId).catch((error) => {
        console.error("[carnet-visite] content cloud delete failed", { source, itemId, entryId, error });
      });
    }
  };

  const openVisiteGuidee = (item: ContentTopic, backScreen: Screen) => {
    if (!canAccessScreen(profile.role, phase, "visite-guidee")) {
      setAccessDeniedMessage(getAccessDeniedMessage(profile.role, phase, "visite-guidee"));
      setScreen(getSafeScreen(profile.role, phase));
      return;
    }

    setAccessDeniedMessage(null);
    setSelectedVisiteGuideeId(item.id);
    setSelectedVisiteGuideeTitle(item.name);
    setVisiteGuideeBackScreen(backScreen);
    setScreen("visite-guidee");
  };

  const openHistoireTopic = (id: string) => {
    if (!canAccessScreen(profile.role, phase, "histoire-topic")) {
      setAccessDeniedMessage(getAccessDeniedMessage(profile.role, phase, "histoire-topic"));
      setScreen(getSafeScreen(profile.role, phase));
      return;
    }

    setAccessDeniedMessage(null);
    setSelectedTopicId(id);
    setScreen("histoire-topic");
  };

  const openInternalLink = (url: string): boolean => {
    if (!url.startsWith(INTERNAL_DOCUMENT_LINK_PREFIX)) {
      return false;
    }

    const documentId = decodeURIComponent(url.slice(INTERNAL_DOCUMENT_LINK_PREFIX.length));
    if (!documentId) {
      return false;
    }

    if (!canAccessScreen(profile.role, phase, "documents")) {
      setAccessDeniedMessage(getAccessDeniedMessage(profile.role, phase, "documents"));
      setScreen(getSafeScreen(profile.role, phase));
      return true;
    }

    if (!isDocumentVisibleForRole(profile.role, documentId, documentVisibilityMap)) {
      setAccessDeniedMessage("Ce document est masqué par le propriétaire.");
      setScreen("documents");
      return true;
    }

    setAccessDeniedMessage(null);
    setDocumentsDeepLinkTarget({ documentId, requestKey: Date.now() });
    setScreen("documents");
    return true;
  };

  const histoireTopic = histoireTopicsWithOverrides.find((t) => t.id === selectedTopicId);

  const openGeographieTopic = (id: string) => {
    if (!canAccessScreen(profile.role, phase, "geographie-topic")) {
      setAccessDeniedMessage(getAccessDeniedMessage(profile.role, phase, "geographie-topic"));
      setScreen(getSafeScreen(profile.role, phase));
      return;
    }

    setAccessDeniedMessage(null);
    setSelectedGeographieTopicId(id);
    setScreen("geographie-topic");
  };

  const geographieTopic = geographieTopicsWithOverrides.find((t) => t.id === selectedGeographieTopicId);

  const openCultureTopic = (id: string) => {
    if (!canAccessScreen(profile.role, phase, "culture-topic")) {
      setAccessDeniedMessage(getAccessDeniedMessage(profile.role, phase, "culture-topic"));
      setScreen(getSafeScreen(profile.role, phase));
      return;
    }

    setAccessDeniedMessage(null);
    setSelectedCultureTopicId(id);
    setScreen("culture-topic");
  };

  const cultureTopic = cultureTopicsWithOverrides.find((t) => t.id === selectedCultureTopicId);

  const handleLoginSubmit = async (profileId: string, password: string) => {
    if (!cloudSnapshot) {
      setAuthError("Synchronisation cloud indisponible pour le moment.");
      return;
    }
    if (!profileId) {
      setAuthError("Sélectionnez un profil pour continuer.");
      return;
    }

    const selected = cloudSnapshot.profiles[profileId];
    if (!selected) {
      setAuthError("Profil introuvable. Rechargez puis réessayez.");
      return;
    }

    const selectedPasswordHash = selected.passwordHash?.trim() || "";
    if (selectedPasswordHash) {
      if (!isProfilePasswordHash(selectedPasswordHash)) {
        setAuthError("Authentification impossible. Vérifiez les informations saisies.");
        return;
      }
      const verified = await verifyProfilePassword(password, selectedPasswordHash);
      if (!verified) {
        setPasswordPromptProfileId(selected.profileId);
        setPasswordPromptInput("");
        setPasswordPromptError("Authentification impossible. Vérifiez les informations saisies.");
        setProfileRecoveryStep("none");
        return;
      }
    }

    setProfile((previous) => ({
      ...previous,
      id: selected.profileId,
      surname: selected.surname,
      role: selected.role,
      gender: selected.gender ?? "unspecified",
      householdRole: selected.householdRole ?? "member",
    }));
    const nextPhase = cloudSnapshot.phase;
    setPhase(nextPhase);
    const savedScreen = localStorage.getItem("jp-screen");
    const screenToRestore = (savedScreen as Screen) || getPostAuthLandingScreen(nextPhase);
    setScreen(screenToRestore);
    setIsAuthenticated(true);
    setAuthError(null);
    saveSessionToken(selected.profileId);
    setPasswordPromptProfileId(null);
    setPasswordPromptInput("");
    setPasswordPromptError(null);
  };

const resetForProfileSwitch = () => {
    try {
      localStorage.removeItem(ACTIVE_PROFILE_ID_KEY);
      localStorage.removeItem("jp-screen");
    } catch {
      // Ignore local storage failures; in-memory state reset still works.
    }

    setProfile({ id: createProfileId(), surname: "", role: null, gender: "unspecified", householdRole: "member" });
    setPhase("before");
    setScreen("checklist");
    setSelectedPlaceId(null);
    setSelectedVisiteGuideeId(null);
    setSelectedVisiteGuideeTitle("");
    setVisiteGuideeBackScreen("place");
    setOpenCategories(new Set([CHECKLIST_CATEGORIES[0]?.id ?? "vetements-hommes"]));
    setChecked({});
    setGameHistory([]);
    setCandyCrushBest(null);
    setGameState("intro");
    setAnswers([]);
    setCurrentQ(0);
    setSelectedAns(null);
    setQuizStartedAt(null);
    setQuizDurationSec(0);
    setRiddleAnswer("");
    setRiddleFeedback(null);
    setRiddleValidated(false);
    setRiddleSolved(false);
    setRiddleSelfCheckPending(false);
    setChallengeResponse("");
    setChallengeDone(false);
    setShowStartPrompt(false);
    setStartCodeInput("");
    setStartError(null);
    setShowRecoveryPrompt(false);
    resetRecoveryPromptState();
    setDestinationSurveyDrafts(["", "", ""]);
    setDestinationSurveyError(null);
    setLaunchGateMode("idle");
    setLaunchFallbackStepIndex(0);
    setLaunchGateMessage(null);
    setOwnerReplayLaunchRequested(false);
    pendingDestinationSurveyVoteRef.current = "none";
    setUnlockFailedAttempts(0);
    setUnlockLockedUntil(0);

    lastCloudPushRef.current = null;
    setHydratedProfileId(null);
    setIsProfileHydrationPending(false);
    setSelectedLoginProfileId(null);
    setCreateProfileSurname("");
    setPasswordPromptProfileId(null);
    setPasswordPromptInput("");
    setPasswordPromptError(null);
    setAuthError(null);
    setProfileError(null);
    setIsAuthBootstrapPending(false);
    clearSessionToken();
    setIsAuthenticated(false);
  };

  const deleteOwnProfile = async (
    proofMethod: "none" | "password" | "recovery",
    proofInput: string
  ): Promise<{ ok: boolean; message: string }> => {
    const genericError = "Authentification impossible. Vérifiez les informations saisies.";

    if (profile.role === "proprietaire") {
      return { ok: false, message: "Le profil propriétaire ne peut pas être supprimé." };
    }

    const currentPasswordHash = profilePasswordHashes[profile.id]?.trim() || "";
    const currentRecoveryHash = profileRecoveryHashes[profile.id]?.trim() || "";

    if (currentPasswordHash) {
      if (proofMethod === "password") {
        if (!isProfilePasswordHash(currentPasswordHash)) {
          return { ok: false, message: genericError };
        }
        const normalizedInput = proofInput.trim();
        if (!normalizedInput) {
          return { ok: false, message: genericError };
        }
        const verified = await verifyProfilePassword(normalizedInput, currentPasswordHash);
        if (!verified) {
          return { ok: false, message: genericError };
        }
      } else if (proofMethod === "recovery") {
        if (!isOwnerRecoveryHash(currentRecoveryHash)) {
          return { ok: false, message: genericError };
        }
        const normalizedInput = proofInput.trim();
        if (!normalizedInput) {
          return { ok: false, message: genericError };
        }
        const answerHash = await hashOwnerRecoveryPhrase(normalizedInput);
        if (answerHash !== currentRecoveryHash) {
          return { ok: false, message: genericError };
        }
      } else {
        return { ok: false, message: genericError };
      }
    }

    const deletedProfileId = profile.id;

    if (cloudEnabled) {
      isDeletingProfileRef.current = true;
      try {
        await deleteProfile(deletedProfileId);
      } catch {
        isDeletingProfileRef.current = false;
        return { ok: false, message: "Erreur lors de la suppression. Réessayez." };
      }
    }

    setProfilePasswordHashes((prev) => {
      if (!(deletedProfileId in prev)) return prev;
      const { [deletedProfileId]: _removed, ...next } = prev;
      return next;
    });
    setProfileRecoveryHashes((prev) => {
      if (!(deletedProfileId in prev)) return prev;
      const { [deletedProfileId]: _removed, ...next } = prev;
      return next;
    });
    setProfileRecoveryQuestions((prev) => {
      if (!(deletedProfileId in prev)) return prev;
      const { [deletedProfileId]: _removed, ...next } = prev;
      return next;
    });
    setCustomChecklistItemsByProfile((prev) => {
      if (!(deletedProfileId in prev)) return prev;
      const { [deletedProfileId]: _removed, ...next } = prev;
      return next;
    });
    setFamilyState((prev) => {
      const next = {
        ...prev,
        profiles: prev.profiles.filter((p) => p.id !== deletedProfileId),
      };
      return enforceOwnerUniqueness(next);
    });

    resetForProfileSwitch();
    isDeletingProfileRef.current = false;
    return { ok: true, message: "" };
  };

  const pushPhaseChange = async (
    nextPhase: "before" | "during",
    options?: { resetDestinationSurvey?: boolean; launchGateCycle?: number }
  ) => {
    if (!cloudEnabled) {
      return { ok: true as const, message: null };
    }

    if (!cloudSnapshot || !cloudActorUid || !profile.role) {
      return {
        ok: false as const,
        message: "Synchronisation cloud indisponible pour le moment.",
      };
    }

    const normalizedFamilyState = enforceOwnerUniqueness(familyState);
    const canWriteFamilyState = canUpdateOwnerCode(normalizedFamilyState, profile.id);
    if (!canWriteFamilyState) {
      return {
        ok: false as const,
        message: "Seul le profil propriétaire peut re-verrouiller l'application.",
      };
    }

    pendingCloudPhaseRef.current = nextPhase;

    const pushed = await pushOwnerPhaseChange({
      phase: nextPhase,
      launchGateCycle: options?.launchGateCycle,
      resetDestinationSurvey: options?.resetDestinationSurvey,
      profileIdsForSurveyReset: options?.resetDestinationSurvey
        ? normalizedFamilyState.profiles.map((item) => item.id)
        : undefined,
    });

    if (pushed === false) {
      pendingCloudPhaseRef.current = null;
      return {
        ok: false as const,
        message: "Synchronisation cloud refusee. Verifiez les regles Firebase et l'appartenance famille.",
      };
    }

    return { ok: true as const, message: null };
  };

  const confirmOwnerLockToggle = async (code: string) => {
    if (!canControlAppLock) {
      return {
        ok: false,
        message: "Seul le profil propriétaire peut modifier le verrouillage de l'application.",
      };
    }

    if (!ownerCodeHash) {
      return {
        ok: false,
        message: "Configurez d'abord un code propriétaire dans Paramètres.",
      };
    }

    if (lockRemainingMs > 0) {
      return {
        ok: false,
        message: `Trop de tentatives. Réessayez dans ${lockRemainingSec}s.`,
      };
    }

    const isCodeValid = await verifyOwnerCode(code, ownerCodeHash);
    if (!isCodeValid) {
      const nextAttempts = unlockFailedAttempts + 1;
      if (nextAttempts >= 3) {
        const nextLock = Date.now() + 30000;
        setUnlockFailedAttempts(0);
        setUnlockLockedUntil(nextLock);
        setNowTs(Date.now());
        return {
          ok: false,
          message: "Code incorrect. Blocage temporaire de 30 secondes.",
        };
      }

      setUnlockFailedAttempts(nextAttempts);
      return {
        ok: false,
        message: "Code incorrect. Réessayez.",
      };
    }

    const nextPhase: "before" | "during" = phase === "during" ? "before" : "during";
    const computedLaunchCycle = getNextLaunchGateCycle(launchGateCycle, phase, nextPhase);
    const syncResult = await pushPhaseChange(nextPhase, {
      // Destination survey reset currently conflicts with RTDB author/write rules
      // across profiles and can make owner lock/unlock loop on permission-denied.
      // Keep phase toggle reliable first; survey reset can be handled separately.
      resetDestinationSurvey: false,
      launchGateCycle: computedLaunchCycle,
    });
    if (!syncResult.ok) {
      return syncResult;
    }

    setUnlockFailedAttempts(0);
    setUnlockLockedUntil(0);
    setNowTs(Date.now());
    setAccessDeniedMessage(null);
    setLaunchGateCycle(computedLaunchCycle);
    setPhase(nextPhase);

    // The owner stays on their current screen (settings) so they can see the
    // updated lock badge immediately. The phase-change effect handles redirecting
    // non-owners on inaccessible screens.
    setScreen("settings");
    if (nextPhase === "before") {
      setDestinationSurveyVotes({});
      setDestinationSurveyDrafts(["", "", ""]);
      setDestinationSurveyError(null);
    }

    return {
      ok: true,
      message: nextPhase === "before" ? "Application verrouillée." : "Application débloquée.",
    };
  };

  const confirmDayOverrideChange = async (
    code: string,
    value: "open" | "closed" | null
  ): Promise<{ ok: boolean; message: string }> => {
    if (!canUpdateOwnerCode(familyState, profile.id)) {
      return {
        ok: false,
        message: "Seul le profil propriétaire peut modifier le verrouillage d'une journée.",
      };
    }

    if (!ownerCodeHash) {
      return {
        ok: false,
        message: "Configurez d'abord un code propriétaire dans Paramètres.",
      };
    }

    if (lockRemainingMs > 0) {
      return {
        ok: false,
        message: `Trop de tentatives. Réessayez dans ${lockRemainingSec}s.`,
      };
    }

    const isCodeValid = await verifyOwnerCode(code, ownerCodeHash);
    if (!isCodeValid) {
      const nextAttempts = unlockFailedAttempts + 1;
      if (nextAttempts >= 3) {
        const nextLock = Date.now() + 30000;
        setUnlockFailedAttempts(0);
        setUnlockLockedUntil(nextLock);
        setNowTs(Date.now());
        return { ok: false, message: "Code incorrect. Blocage temporaire de 30 secondes." };
      }

      setUnlockFailedAttempts(nextAttempts);
      return { ok: false, message: "Code incorrect. Réessayez." };
    }

    try {
      await setGameDayOverride(currentDay, value);
    } catch {
      return { ok: false, message: "Synchronisation cloud indisponible pour le moment." };
    }

    setUnlockFailedAttempts(0);
    setUnlockLockedUntil(0);
    setNowTs(Date.now());

    return {
      ok: true,
      message:
        value === "open"
          ? `${formatTripDayLabel(currentDay, tripStartDate)} ouvert manuellement.`
          : value === "closed"
            ? `${formatTripDayLabel(currentDay, tripStartDate)} fermé manuellement.`
            : `${formatTripDayLabel(currentDay, tripStartDate)} repassé en automatique.`,
    };
  };

  const confirmScoreReset = async (
    code: string,
    action: { kind: "all" } | { kind: "day"; day: number }
  ): Promise<{ ok: boolean; message: string }> => {
    if (!canUpdateOwnerCode(familyState, profile.id)) {
      return {
        ok: false,
        message: "Seul le profil propriétaire peut réinitialiser les scores.",
      };
    }

    if (!ownerCodeHash) {
      return {
        ok: false,
        message: "Configurez d'abord un code propriétaire dans Paramètres.",
      };
    }

    if (lockRemainingMs > 0) {
      return {
        ok: false,
        message: `Trop de tentatives. Réessayez dans ${lockRemainingSec}s.`,
      };
    }

    const isCodeValid = await verifyOwnerCode(code, ownerCodeHash);
    if (!isCodeValid) {
      const nextAttempts = unlockFailedAttempts + 1;
      if (nextAttempts >= 3) {
        const nextLock = Date.now() + 30000;
        setUnlockFailedAttempts(0);
        setUnlockLockedUntil(nextLock);
        setNowTs(Date.now());
        return { ok: false, message: "Code incorrect. Blocage temporaire de 30 secondes." };
      }

      setUnlockFailedAttempts(nextAttempts);
      return { ok: false, message: "Code incorrect. Réessayez." };
    }

    const day = action.kind === "day" ? action.day : undefined;

    try {
      if (cloudEnabled) {
        await resetGameResults(day);
      }
    } catch {
      return { ok: false, message: "Synchronisation cloud indisponible pour le moment." };
    }

    setGameHistory((previous) =>
      day === undefined ? [] : previous.filter((entry) => entry.day !== day)
    );
    setChallengeReactionsByDay((previous) => {
      if (day === undefined) {
        return {};
      }

      const next = { ...previous };
      delete next[day];
      return next;
    });
    setChallengeBestVotesByDay((previous) => {
      if (day === undefined) {
        return {};
      }

      const next = { ...previous };
      delete next[day];
      return next;
    });

    setUnlockFailedAttempts(0);
    setUnlockLockedUntil(0);
    setNowTs(Date.now());

    return {
      ok: true,
      message:
        action.kind === "all"
          ? "Tous les scores ont été réinitialisés."
          : `Les scores du ${formatTripDayLabel(action.day, tripStartDate)} ont été réinitialisés.`,
    };
  };

  // Réinitialisation propriétaire de la partie EN COURS (non terminée) d'un
  // profil précis : remet le quiz/l'énigme/le défi à zéro pour ce profil et
  // rend le jeu de nouveau disponible (repart au quiz), sans toucher aux
  // scores déjà validés d'autres journées (cf. resetGameProgressInCloud).
  const confirmGameProgressReset = async (
    code: string,
    targetProfileId: string
  ): Promise<{ ok: boolean; message: string }> => {
    if (!canUpdateOwnerCode(familyState, profile.id)) {
      return {
        ok: false,
        message: "Seul le profil propriétaire peut réinitialiser une partie en cours.",
      };
    }

    if (!ownerCodeHash) {
      return {
        ok: false,
        message: "Configurez d'abord un code propriétaire dans Paramètres.",
      };
    }

    if (lockRemainingMs > 0) {
      return {
        ok: false,
        message: `Trop de tentatives. Réessayez dans ${lockRemainingSec}s.`,
      };
    }

    const isCodeValid = await verifyOwnerCode(code, ownerCodeHash);
    if (!isCodeValid) {
      const nextAttempts = unlockFailedAttempts + 1;
      if (nextAttempts >= 3) {
        const nextLock = Date.now() + 30000;
        setUnlockFailedAttempts(0);
        setUnlockLockedUntil(nextLock);
        setNowTs(Date.now());
        return { ok: false, message: "Code incorrect. Blocage temporaire de 30 secondes." };
      }

      setUnlockFailedAttempts(nextAttempts);
      return { ok: false, message: "Code incorrect. Réessayez." };
    }

    try {
      if (cloudEnabled) {
        await resetGameProgress(targetProfileId);
      }
    } catch {
      return { ok: false, message: "Synchronisation cloud indisponible pour le moment." };
    }

    if (targetProfileId === profile.id) {
      // Le propriétaire réinitialise sa propre partie : on remet aussi
      // l'état local à zéro immédiatement, sans attendre l'écho cloud.
      setGameState("intro");
      setCurrentQ(0);
      setSelectedAns(null);
      setAnswers([]);
      setQuizStartedAt(null);
      setQuizDurationSec(0);
      setRiddleAnswer("");
      setRiddleFeedback(null);
      setRiddleValidated(false);
      setRiddleSolved(false);
      setRiddleSelfCheckPending(false);
      setChallengeResponse("");
      setChallengeDone(false);
    }

    setUnlockFailedAttempts(0);
    setUnlockLockedUntil(0);
    setNowTs(Date.now());

    const targetSurname =
      familyMembersForPodium.find((member) => member.profileId === targetProfileId)?.surname ??
      "ce profil";

    return {
      ok: true,
      message: `La partie en cours de ${targetSurname} a été réinitialisée.`,
    };
  };

  const saveTripStartDate = async (date: string) => {
    if (!canUpdateOwnerCode(familyState, profile.id)) {
      return {
        ok: false,
        message: "Seul le profil propriétaire peut configurer la date de début.",
      };
    }

    if (!isValidTripStartDate(date)) {
      return { ok: false, message: "Merci de choisir une date valide." };
    }

    if (!cloudEnabled) {
      setTripStartDate(date);
      return { ok: true, message: "Date de début du voyage mise à jour." };
    }

    if (!cloudSnapshot || !cloudActorUid || !profile.role) {
      return {
        ok: false,
        message: "Synchronisation cloud indisponible pour le moment.",
      };
    }

    const normalizedFamilyState = enforceOwnerUniqueness(familyState);
    const canWriteFamilyState = canUpdateOwnerCode(normalizedFamilyState, profile.id);
    if (!canWriteFamilyState) {
      return {
        ok: false,
        message: "Seul le profil propriétaire peut configurer la date de début.",
      };
    }

    const pushed = await setTripStartDateInCloud(date);
    if (!pushed) {
      pendingTripStartDateRef.current = "none";
      return {
        ok: false,
        message: "Enregistrement impossible. Verifiez la synchronisation cloud puis reessayez.",
      };
    }

    pendingTripStartDateRef.current = date;
    setTripStartDate(date);
    return { ok: true, message: "Date de début du voyage mise à jour." };
  };

  const saveGameScoring = async (scoring: GameScoringConfig) => {
    if (!canUpdateOwnerCode(familyState, profile.id)) {
      return { ok: false, message: "Seul le profil propriétaire peut modifier la bonification." };
    }

    const normalizePoints = (value: number) =>
      Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
    const normalizedScoring: GameScoringConfig = {
      questionPoints: normalizePoints(scoring.questionPoints),
      riddlePoints: normalizePoints(scoring.riddlePoints),
      challengePoints: normalizePoints(scoring.challengePoints),
      destinationProposalScoring: scoring.destinationProposalScoring.map((entry) => ({
        basePoints: normalizePoints(entry.basePoints),
        bonusPoints: normalizePoints(entry.bonusPoints),
      })) as GameScoringConfig["destinationProposalScoring"],
    };
    setGameScoring(normalizedScoring);

    if (cloudEnabled) {
      const pushed = await setGameScoringInCloud(normalizedScoring);
      if (!pushed) {
        return {
          ok: false,
          message: "Enregistrement Firebase impossible. Vérifiez les règles et le projet utilisé.",
        };
      }
    }

    return { ok: true, message: "Bonification des jeux mise à jour." };
  };

  const todaysQuestions = getQuestionsForDay(gameDay);
  const todaysRiddle = getRiddleForDay(gameDay);
  const todaysChallenge = getChallengeForDay(gameDay);

  const localGameProgressCheckedRef = useRef(false);
  useEffect(() => {
    if (cloudEnabled) return; // Mode cloud : géré par l'effet d'hydratation cloud.
    if (postTripReplayEnabled) {
      if (gameState !== "intro") {
        setGameState("intro");
        setCurrentQ(0);
        setAnswers([]);
        setQuizStartedAt(null);
        setQuizDurationSec(0);
        setRiddleValidated(false);
        setRiddleSolved(false);
        setRiddleSelfCheckPending(false);
      }
      setChallengeResponse("");
      return;
    }
    if (localGameProgressCheckedRef.current) return;
    localGameProgressCheckedRef.current = true;

    const progress = parseGameProgress(localStorage.getItem("jp-game-progress"));
    if (!progress || progress.day !== currentDay) {
      // Progression d'un jour précédent jamais terminée : on ne la reprend
      // pas, on repart sur un jour neuf.
      if (gameState !== "intro") {
        setGameState("intro");
        setCurrentQ(0);
        setAnswers([]);
        setQuizStartedAt(null);
        setQuizDurationSec(0);
        setRiddleValidated(false);
        setRiddleSolved(false);
        setRiddleSelfCheckPending(false);
      }
      setChallengeResponse("");
      return;
    }

    if (progress.riddleValidated) {
      setRiddleFeedback(
        progress.riddleSolved
          ? `Bonne réponse ! Vous gagnez ${gameScoring.riddlePoints} points.`
          : `Pas tout à fait. La bonne réponse était "${todaysRiddle.answer}".`
      );
    }
    setChallengeResponse(progress.challengeDraft ?? "");
  }, [cloudEnabled, currentDay, gameState, todaysRiddle.answer, postTripReplayEnabled]);

  const answerQ = (idx: number) => {
    if (selectedAns !== null) return;
    setSelectedAns(idx);
    const newAnswers = [...answers, idx];
    setAnswers(newAnswers);
    setTimeout(() => {
      if (currentQ < todaysQuestions.length - 1) {
        setCurrentQ((q) => q + 1);
        setSelectedAns(null);
      } else {
        if (quizStartedAt) {
          const duration = Math.max(1, Math.round((Date.now() - quizStartedAt) / 1000));
          setQuizDurationSec(duration);
        }
        setGameState("done");
      }
    }, 1400);
  };

  const correctCount = answers.filter(
    (a, i) => a === todaysQuestions[i]?.correct
  ).length;
  const gameScore = correctCount * gameScoring.questionPoints;
  const riddleScore = riddleSolved ? gameScoring.riddlePoints : 0;

  const validateRiddle = () => {
    const normalizedInput = normalizeAnswer(riddleAnswer);
    if (!normalizedInput) {
      setRiddleFeedback("Entrez une réponse avant de valider.");
      setRiddleSolved(false);
      setRiddleSelfCheckPending(false);
      return;
    }

    // On accepte automatiquement les réponses formulées un peu différemment
    // (mots ajoutés comme "Tour de Galata", petite faute de frappe...).
    if (isRiddleAnswerAcceptable(riddleAnswer, todaysRiddle.answer)) {
      setRiddleValidated(true);
      setRiddleSolved(true);
      setRiddleSelfCheckPending(false);
      setRiddleFeedback(`Bonne réponse ! Vous gagnez ${gameScoring.riddlePoints} points.`);
      return;
    }

    // Pas de correspondance automatique : on affiche la bonne réponse et on
    // fait confiance au joueur pour indiquer, en toute honnêteté, si sa
    // réponse (formulée autrement) était correcte ou non.
    setRiddleSelfCheckPending(true);
    setRiddleFeedback(
      `La bonne réponse était "${todaysRiddle.answer}". Était-ce le sens de votre réponse ?`
    );
  };

  // Résout la phase d'auto-déclaration : le joueur indique lui-même si sa
  // réponse, non reconnue automatiquement, était correcte ou non. Rien
  // n'empêche techniquement de tricher ici : on fait confiance au joueur.
  const declareRiddleSelfCheck = (isCorrect: boolean) => {
    setRiddleSelfCheckPending(false);
    setRiddleValidated(true);
    setRiddleSolved(isCorrect);
    setRiddleFeedback(
      isCorrect
        ? `Bonne réponse ! Vous gagnez ${gameScoring.riddlePoints} points.`
        : `Pas de souci, ce sera pour la prochaine fois. La bonne réponse était "${todaysRiddle.answer}".`
    );
  };

  // Terminer le défi final termine immédiatement la session du jour (pas de
  // bouton "Voir les résultats" séparé) : le défi du jour est donc désormais
  // obligatoire pour clore la journée, et il n'y a plus de retour possible
  // ensuite (alreadyPlayedToday verrouille l'écran "game" dès que
  // gameHistory contient une entrée pour currentDay).
  const completeChallengeAndFinishSession = () => {
    const trimmedChallengeResponse = challengeResponse.trim();
    if (!trimmedChallengeResponse) {
      return;
    }

    if (!postTripReplayEnabled) {
      const entry: GameHistoryEntry = {
        day: currentDay,
        location: todayDestination,
        quizScore: gameScore,
        correctCount,
        riddleSolved,
        riddleAnswer: riddleAnswer.trim(),
        challengeDone: true,
        challengeResponse: trimmedChallengeResponse,
        durationSec: quizDurationSec,
        totalScore: gameScore + riddleScore + gameScoring.challengePoints,
        completedAt: new Date().toISOString(),
      };

      setGameHistory((previous) => upsertGameHistory(previous, entry));
    }
    setGameState("intro");
    setAnswers([]);
    setCurrentQ(0);
    setSelectedAns(null);
    setQuizStartedAt(null);
    setQuizDurationSec(0);
    setRiddleAnswer("");
    setRiddleFeedback(null);
    setRiddleValidated(false);
    setRiddleSolved(false);
    setRiddleSelfCheckPending(false);
    setChallengeResponse("");
    setChallengeDone(false);
    setScreen("results");
  };

  const reactToChallengeResponse = (
    day: number,
    targetProfileId: string,
    emoji: ChallengeReactionEmoji
  ) => {
    if (
      day < 1 ||
      profile.role !== "utilisateur" ||
      targetProfileId === profile.id
    ) {
      return;
    }

    const targetRole =
      cloudSnapshot?.profiles?.[targetProfileId]?.role
      ?? (targetProfileId === profile.id ? profile.role : null);
    if (targetRole !== "utilisateur") {
      return;
    }

    setChallengeReactionsByDay((previous) => {
      const dayBucket = previous[day] ?? {};
      const targetBucket = dayBucket[targetProfileId] ?? {};
      const existingReaction = targetBucket[profile.id] ?? null;

      if (existingReaction?.emoji === emoji) {
        const nextTargetBucket = { ...targetBucket };
        delete nextTargetBucket[profile.id];

        const nextDayBucket = { ...dayBucket };
        if (Object.keys(nextTargetBucket).length === 0) {
          delete nextDayBucket[targetProfileId];
        } else {
          nextDayBucket[targetProfileId] = nextTargetBucket;
        }

        const next: ChallengeReactionsByDay = { ...previous };
        if (Object.keys(nextDayBucket).length === 0) {
          delete next[day];
        } else {
          next[day] = nextDayBucket;
        }

        pendingChallengeReactionsRef.current = stableSerializeForCloudPush(next);
        return next;
      }

      const next: ChallengeReactionsByDay = {
        ...previous,
        [day]: {
          ...dayBucket,
          [targetProfileId]: {
            ...targetBucket,
            [profile.id]: {
              day,
              targetProfileId,
              reactorProfileId: profile.id,
              emoji,
              updatedAt: Date.now(),
              authorUid: cloudActorUid ?? undefined,
            },
          },
        },
      };

      pendingChallengeReactionsRef.current = stableSerializeForCloudPush(next);
      return next;
    });
  };

  // Vote "meilleur défi/commentaire du jour" (trophée). Contrairement aux
  // emojis ci-dessus, un voyageur ne peut voter que pour UNE seule réponse
  // par jour : poser un nouveau vote retire automatiquement l'ancien
  // (même journée), et revoter pour la même cible retire le vote (toggle).
  const voteBestChallengeResponse = (day: number, targetProfileId: string) => {
    if (
      day < 1 ||
      profile.role !== "utilisateur" ||
      targetProfileId === profile.id
    ) {
      return;
    }

    const targetRole =
      cloudSnapshot?.profiles?.[targetProfileId]?.role
      ?? (targetProfileId === profile.id ? profile.role : null);
    if (targetRole !== "utilisateur") {
      return;
    }

    setChallengeBestVotesByDay((previous) => {
      const dayBucket = previous[day] ?? {};
      const alreadyVotedForTarget = Boolean(dayBucket[targetProfileId]?.[profile.id]);

      // On retire d'abord tout vote existant de ce votant pour ce jour,
      // quelle que soit la cible (règle : un seul vote par jour).
      const nextDayBucket: Record<string, Record<string, ChallengeBestVote>> = {};
      for (const [otherTargetProfileId, votersMap] of Object.entries(dayBucket)) {
        if (!votersMap[profile.id]) {
          nextDayBucket[otherTargetProfileId] = votersMap;
          continue;
        }
        const nextVotersMap = { ...votersMap };
        delete nextVotersMap[profile.id];
        if (Object.keys(nextVotersMap).length > 0) {
          nextDayBucket[otherTargetProfileId] = nextVotersMap;
        }
      }

      // Si le joueur revote pour la même cible, c'est un retrait (toggle) :
      // on s'arrête là, sans reposer de vote.
      if (!alreadyVotedForTarget) {
        nextDayBucket[targetProfileId] = {
          ...(nextDayBucket[targetProfileId] ?? {}),
          [profile.id]: {
            day,
            targetProfileId,
            voterProfileId: profile.id,
            updatedAt: Date.now(),
            authorUid: cloudActorUid ?? undefined,
          },
        };
      }

      const next: ChallengeBestVotesByDay = { ...previous };
      if (Object.keys(nextDayBucket).length === 0) {
        delete next[day];
      } else {
        next[day] = nextDayBucket;
      }

      pendingChallengeBestVotesRef.current = stableSerializeForCloudPush(next);
      return next;
    });
  };

  const loginCandidates: LoginCandidate[] = cloudSnapshot
    ? Object.values(cloudSnapshot.profiles)
        .map((item) => ({
          id: item.profileId,
          surname: item.surname,
          role: item.role,
          passwordHash: item.passwordHash,
        }))
        .sort((left, right) => left.surname.localeCompare(right.surname, "fr"))
    : [];

  const currentProfilePasswordHash = profilePasswordHashes[profile.id] || "";
  const currentProfileRecoveryHash = profileRecoveryHashes[profile.id] || "";
  const currentProfileRecoveryQuestion = profileRecoveryQuestions[profile.id] || "";
  const currentProfileRecoveryAnswer = profileRecoveryAnswers[profile.id] || "";
  const currentProfileLastSyncAt =
    cloudSnapshot?.profiles?.[profile.id]?.lastSyncAt ?? cloudSnapshot?.updatedAt ?? null;

  const changeProfilePasswordInSession = async (
    method: InSessionPasswordProofMethod,
    proofInput: string,
    newPassword: string,
    confirmPassword: string
  ): Promise<{ ok: boolean; message: string }> => {
    const genericError = "Authentification impossible. Vérifiez les informations saisies.";
    const currentHash = profilePasswordHashes[profile.id]?.trim() || "";
    if (!currentHash || !isProfilePasswordHash(currentHash)) {
      return { ok: false, message: genericError };
    }

    const normalizedProofInput = proofInput.trim();
    if (!normalizedProofInput) {
      return { ok: false, message: genericError };
    }

    if (method === "current-password") {
      const verified = await verifyProfilePassword(normalizedProofInput, currentHash);
      if (!verified) {
        return { ok: false, message: genericError };
      }
    } else {
      const recoveryHash = profileRecoveryHashes[profile.id]?.trim() || "";
      if (!isOwnerRecoveryHash(recoveryHash)) {
        return { ok: false, message: genericError };
      }

      const answerHash = await hashOwnerRecoveryPhrase(normalizedProofInput);
      if (answerHash !== recoveryHash) {
        return { ok: false, message: genericError };
      }
    }

    const normalizedNewPassword = newPassword.trim();
    const normalizedConfirmPassword = confirmPassword.trim();
    if (normalizedNewPassword.length < 4) {
      return {
        ok: false,
        message: "Le nouveau mot de passe doit contenir au moins 4 caractères.",
      };
    }

    if (!normalizedConfirmPassword || normalizedNewPassword !== normalizedConfirmPassword) {
      return {
        ok: false,
        message: "La confirmation du mot de passe ne correspond pas.",
      };
    }

    const nextHash = await hashProfilePassword(normalizedNewPassword);
    if (!isProfilePasswordHash(nextHash)) {
      return { ok: false, message: genericError };
    }

    const previousPasswordHash = profilePasswordHashes[profile.id] || "";
    setProfilePasswordHashes((previous) => ({
      ...previous,
      [profile.id]: nextHash,
    }));

    if (cloudEnabled) {
      if (!cloudSnapshot || !cloudActorUid) {
        setProfilePasswordHashes((previous) => ({
          ...previous,
          [profile.id]: previousPasswordHash,
        }));
        return { ok: false, message: genericError };
      }

      const selected = cloudSnapshot.profiles[profile.id];
      if (!selected) {
        setProfilePasswordHashes((previous) => ({
          ...previous,
          [profile.id]: previousPasswordHash,
        }));
        return { ok: false, message: genericError };
      }

      const pushed = await pushSnapshot({
        actorUid: cloudActorUid,
        canWriteFamilyState: false,
        familyState: cloudSnapshot.familyState,
        ownerCodeHash: cloudSnapshot.ownerCodeHash,
        ownerCodePlain: cloudSnapshot.ownerCodePlain,
        ownerRecoveryHash: cloudSnapshot.ownerRecoveryHash,
        ownerRecoveryConfiguredAt: cloudSnapshot.ownerRecoveryConfiguredAt,
        profileId: selected.profileId,
        surname: selected.surname,
        role: selected.role,
        profilePasswordHash: nextHash,
        profileRecoveryHash: selected.recoveryHash,
        profileRecoveryQuestion: selected.recoveryQuestion,
        profileRecoveryAnswer: selected.recoveryAnswer,
        profileRecoveryConfiguredAt: selected.recoveryConfiguredAt,
        gender: selected.gender,
        householdRole: selected.householdRole,
        checklist: selected.checklist,
        profileCustomChecklistItems: selected.customChecklistItems ?? [],
        ownerGlobalChecklistAdditions: cloudSnapshot.ownerGlobalChecklistAdditions,
        ownerGlobalChecklistRemovals: cloudSnapshot.ownerGlobalChecklistRemovals,
        placeComments: cloudSnapshot.placeComments ?? {},
        challengeReactions: cloudSnapshot.challengeReactions ?? {},
        gameResults: selected.gameResults,
        gameProgress: selected.gameProgress,
        candyCrushChallenge: selected.candyCrushChallenge,
        phase: selected.phase || cloudSnapshot.phase,
        tripStartDate: cloudSnapshot.tripStartDate,
      });
      if (pushed === false) {
        setProfilePasswordHashes((previous) => ({
          ...previous,
          [profile.id]: previousPasswordHash,
        }));
        return { ok: false, message: genericError };
      }
    }

    return { ok: true, message: "Mot de passe du profil mis à jour." };
  };

  const visibleQuickActions = profile.role === "visiteur"
    ? QUICK_ACTIONS
    : QUICK_ACTIONS.filter((item) => canAccessScreen(profile.role, phase, item.id));
  const visibleBottomNavItems = BOTTOM_NAV_ITEMS.filter(
    (item) =>
      canAccessScreen(profile.role, phase, item.id) ||
      (postTripReplayEnabled && profile.role === "visiteur" && (item.id === "game" || item.id === "jeux"))
  );
  const daysUntilStart = computeDaysUntilStart(tripStartDate);
  const todayFormatted = new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());
  const todayEntry = JOURS_DESTINATIONS.find((d) => d.jour === currentDay) ?? null;
  const todayDestination = todayEntry?.destination ?? TRIP.todayDestination;
  const todaySubtitle = todayEntry?.visites_prevues ?? TRIP.todaySubtitle;
  const totalDays = lastDefinedDay ?? TRIP.totalDays;
  const alreadyPlayedToday = gameHistory.find((entry) => entry.day === currentDay) ?? null;
  const gameDayOverride = cloudSnapshot?.gameDayOverrides?.[currentDay] ?? null;

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }
    if (!shouldTriggerChecklistReminder(daysUntilStart, pct, notificationPreferences)) {
      return;
    }

    const today = new Date().toISOString().slice(0, 10);
    const reminderKey = `${profile.id}:${today}:${daysUntilStart}`;
    if (lastChecklistReminderKeyRef.current === reminderKey) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      const shown = showNotification(
        "Checklist avant le depart",
        `Il reste ${daysUntilStart} jour(s) avant le depart - votre checklist n'est pas complete.`
      );
      if (shown) {
        lastChecklistReminderKeyRef.current = reminderKey;
      }
    }, 250);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [daysUntilStart, isAuthenticated, notificationPreferences, pct, profile.id]);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    const today = new Date().toISOString().slice(0, 10);
    if (!shouldTriggerGameReminder(currentDay, gameHistory, today, notificationPreferences)) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      const shown = showNotification("Defi du jour", "Tu n'as pas encore joue aujourd'hui !");
      if (!shown) {
        return;
      }

      const updated = updateNotificationPreferences(profile.id, {
        lastGameReminderDate: today,
      });
      setNotificationPreferences(updated);
    }, 300);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [currentDay, gameHistory, isAuthenticated, notificationPreferences, profile.id]);

  useEffect(() => {
    const previousComments = previousCommentsSnapshotRef.current;
    previousCommentsSnapshotRef.current = placeCommentsByPlace;

    if (!previousComments || !notificationPreferences.notif_comments) {
      return;
    }

    for (const [placeId, placeComments] of Object.entries(placeCommentsByPlace)) {
      const previousForPlace = previousComments[placeId] ?? {};
      for (const [commentId, comment] of Object.entries(placeComments)) {
        if (previousForPlace[commentId]) {
          continue;
        }
        if (comment.authorProfileId === profile.id) {
          continue;
        }

        const placeName = PLACES.find((place) => place.id === placeId)?.name ?? placeId;
        showNotification(
          "Nouveau commentaire",
          `${comment.authorSurnameSnapshot} a commente ${placeName}`
        );
      }
    }
  }, [notificationPreferences.notif_comments, placeCommentsByPlace, profile.id]);

  const toggleNotificationPreference = async (
    key: "notif_checklist" | "notif_game" | "notif_comments"
  ): Promise<{ ok: boolean; message: string }> => {
    const currentlyEnabled = notificationPreferences[key];

    if (!currentlyEnabled && notificationPermissionStatus !== "granted") {
      const permission = await requestPermission();
      setNotificationPermissionStatus(permission);
      if (permission !== "granted") {
        return {
          ok: false,
          message:
            "Permission de notification refusee. L'application continue de fonctionner normalement.",
        };
      }
    }

    const updated = updateNotificationPreferences(profile.id, {
      [key]: !currentlyEnabled,
    });
    setNotificationPreferences(updated);
    return {
      ok: true,
      message: !currentlyEnabled ? "Notification activee." : "Notification desactivee.",
    };
  };
  const destinationSurveyParticipants = cloudSnapshot
    ? Object.values(cloudSnapshot.profiles).map((item) => ({
        profileId: item.profileId,
        surname: item.surname,
        role: item.role,
      }))
    : [
        {
          profileId: profile.id,
          surname: profile.surname,
          role: profile.role ?? "utilisateur",
        },
      ];
  const destinationSurveyResults = computeDestinationSurveyResults({
    destination: TRIP.surveyDestination ?? todayDestination,
    participants: destinationSurveyParticipants,
    votesByProfile: destinationSurveyVotes,
    scoring: gameScoring.destinationProposalScoring,
  });
  const destinationSurveyPointsByProfile = new Map(
    destinationSurveyResults.rows.map((row) => [row.profileId, row.points] as const)
  );
  const sharedChallengeDays = Array.from(
    new Set(
      (cloudSnapshot
        ? Object.values(cloudSnapshot.profiles).flatMap((item) => item.gameResults)
        : gameHistory
      )
        .map((entry) => entry.day)
        .filter((day) => day >= 1 && day <= currentDay)
    )
  ).sort((left, right) => right - left);
  const familyMembersForPodium: ResultsFamilyMember[] = cloudSnapshot
    ? Object.values(cloudSnapshot.profiles).map((item) => ({
        profileId: item.profileId,
        surname: item.surname,
        role: item.role,
        gameResults: item.gameResults as GameHistoryEntry[],
        destinationSurveyPoints: destinationSurveyPointsByProfile.get(item.profileId) ?? 0,
      }))
    : [
        {
          profileId: profile.id,
          surname: profile.surname,
          role: profile.role ?? "utilisateur",
          gameResults: gameHistory,
          destinationSurveyPoints: destinationSurveyPointsByProfile.get(profile.id) ?? 0,
        },
      ];
  // Podium du mode "Défi" de Bazar Crush (Candy Crush) — tout le monde
  // compte, y compris propriétaire/visiteurs (cf. computeCandyCrushPodium).
  // Pour le profil courant on utilise `candyCrushBest` (déjà fusionné via
  // mergeCandyCrushChallengeRecord) plutôt que le cloudSnapshot brut, pour ne
  // jamais afficher un record périmé pendant la brève fenêtre avant que le
  // push cloud n'ait fait l'aller-retour.
  const candyCrushPodium = computeCandyCrushPodium(
    cloudSnapshot
      ? Object.values(cloudSnapshot.profiles).map((item) => ({
          profileId: item.profileId,
          surname: item.surname,
          bestScore:
            item.profileId === profile.id
              ? candyCrushBest?.bestScore ?? 0
              : item.candyCrushChallenge?.bestScore ?? 0,
        }))
      : [
          {
            profileId: profile.id,
            surname: profile.surname,
            bestScore: candyCrushBest?.bestScore ?? 0,
          },
        ]
  );
  function handleCandyCrushChallengeResult(score: number) {
    setCandyCrushBest((previous) =>
      previous && previous.bestScore >= score ? previous : { bestScore: score, updatedAt: Date.now() }
    );
  }
  const familyProfilesForComments = cloudSnapshot
    ? Object.values(cloudSnapshot.profiles).map((item) => ({
        id: item.profileId,
        surname: item.surname,
      }))
    : familyState.profiles.map((item) => ({
        id: item.id,
        surname: item.id === profile.id ? profile.surname : item.id,
      }));
  const placeCommentsForSelectedPlace =
    selectedPlaceId && placeCommentsByPlace[selectedPlaceId]
      ? placeCommentsByPlace[selectedPlaceId]
      : {};
  const carnetVisiteForSelectedPlace =
    selectedPlaceId && carnetVisiteByPlace[selectedPlaceId]
      ? carnetVisiteByPlace[selectedPlaceId]
      : {};
  // Utilisé par HistoireTopicScreen/GeographieTopicScreen/CultureTopicScreen
  // pour retrouver les entrées de carnet de leur topic actuellement affiché
  // (voir carnetContentKey).
  const getCarnetContentEntries = (
    source: ContentSource,
    itemId: string | null
  ): Record<string, CarnetContentEntry> => {
    if (!itemId) return {};
    return carnetContentByKey[carnetContentKey(source, itemId)] ?? {};
  };
  const effectiveScreen = canAccessCurrentScreen
    ? screen
    : getSafeScreen(profile.role, phase);

  const launchGateForced = shouldForceLaunchGate({
    role: profile.role,
    phase,
    profileId: profile.id,
    launchGateCycle,
    launchGateCompletedCycleByProfile,
    ownerReplayRequested: ownerReplayLaunchRequested,
  });

  const completeLaunchGateForCurrentProfile = () => {
    if (profile.role === "proprietaire" || ownerReplayLaunchRequested) {
      return;
    }
    const completionCycle = launchGateCycle > 0 ? launchGateCycle : 1;
    pendingLaunchGateCompletionRef.current = {
      profileId: profile.id,
      cycle: completionCycle,
    };
    setLaunchGateCompletedCycleByProfile((previous) => ({
      ...previous,
      [profile.id]: completionCycle,
    }));
    try {
      const raw = JSON.parse(localStorage.getItem(LAUNCH_GATE_PENDING_COMPLETION_STORAGE_KEY) || "{}");
      const next = {
        ...parseLaunchGateCompletionMap(raw),
        [profile.id]: completionCycle,
      };
      localStorage.setItem(LAUNCH_GATE_PENDING_COMPLETION_STORAGE_KEY, JSON.stringify(next));
      localStorage.setItem(LAUNCH_GATE_COMPLETED_CYCLE_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore storage errors
    }
  };

  useEffect(() => {
    setLaunchGateMode("idle");
    setLaunchFallbackStepIndex(0);
    setLaunchGateMessage(null);
    if (profile.role !== "proprietaire") {
      setOwnerReplayLaunchRequested(false);
    }
  }, [profile.id, phase, profile.role]);

  const handleLaunchStart = () => {
    if (!ownerReplayLaunchRequested && profile.role !== "proprietaire" && phase === "before") {
      setLaunchGateMessage("Le voyage n'a pas encore commencé. Revenez plus tard !");
      return;
    }
    setLaunchGateMessage(null);
    setLaunchFallbackStepIndex(0);
    setLaunchGateMode("video");
  };

  const handleLaunchVideoError = () => {
    if (ownerReplayLaunchRequested) {
      setLaunchGateMessage("Video indisponible. Verifiez le fichier puis relancez la lecture.");
      setLaunchGateMode("idle");
      return;
    }
    setLaunchGateMessage("Video indisponible. La lecture video peut etre relancee avec Revoir.");
    setLaunchFallbackStepIndex(0);
    setLaunchGateMode("completed");
  };

  const handleLaunchVideoEnded = () => {
    if (ownerReplayLaunchRequested) {
      setLaunchGateMessage(null);
      setLaunchGateMode("idle");
      return;
    }
    setLaunchGateMessage(null);
    setLaunchGateMode("completed");
  };

  const handleLaunchNextFallback = () => {
    if (launchFallbackStepIndex >= LAUNCH_FALLBACK_STEPS.length - 1) {
      setLaunchGateMode("completed");
      return;
    }
    setLaunchFallbackStepIndex((previous) => previous + 1);
  };

  const handleLaunchReplay = () => {
    setLaunchGateMessage(null);
    setLaunchFallbackStepIndex(0);
    setLaunchGateMode("video");
  };

  const handleLaunchClosePlayback = () => {
    setLaunchGateMessage(null);
    setLaunchGateMode("idle");
  };

  const handleLaunchEnter = () => {
    completeLaunchGateForCurrentProfile();
    setOwnerReplayLaunchRequested(false);
    setLaunchGateMode("idle");
    setLaunchFallbackStepIndex(0);
    setLaunchGateMessage(null);
    setScreen("dashboard");
  };

  const startAccueilTutorial = () => {
    void startGlobalTutorial(profile.role, tripStartDate);
  };

  const renderScreen = () => {
    if (isInitializing || (cloudEnabled && (!cloudReady || isAuthBootstrapPending || isProfileHydrationPending))) {
      return <CloudLoadingScreen />;
    }

    if (cloudEnabled && cloudAuthError) {
      return <CloudAccessErrorScreen reason={cloudAuthError} onRetry={() => {
        void retryCloudAccess();
      }} />;
    }

    if (cloudEnabled && !isAuthenticated) {
      return (
        <CloudLoginScreen
          profiles={loginCandidates}
          selectedProfileId={selectedLoginProfileId}
          createSurname={createProfileSurname}
          error={authError}
          onSubmitLogin={handleLoginSubmit}
          passwordPromptProfileSurname={
            passwordPromptProfileId
              ? cloudSnapshot?.profiles[passwordPromptProfileId]?.surname || null
              : null
          }
          profileRecoveryStep={profileRecoveryStep}
          profileRecoveryQuestion={
            (() => {
              const targetId = passwordPromptProfileId ?? selectedLoginProfileId;
              return targetId ? (cloudSnapshot?.profiles[targetId]?.recoveryQuestion ?? null) : null;
            })()
          }
          profileRecoveryAnswerInput={profileRecoveryAnswerInput}
          profileRecoveryNewPasswordInput={profileRecoveryNewPasswordInput}
          profileRecoveryNewPasswordConfirmInput={profileRecoveryNewPasswordConfirmInput}
          profileRecoveryError={profileRecoveryError}
          passwordPromptValue={passwordPromptInput}
          passwordPromptError={passwordPromptError}
          onSelectProfile={(profileId) => {
            setSelectedLoginProfileId(profileId);
            if (authError) setAuthError(null);
          }}
          onCreateSurnameChange={(value) => {
            setCreateProfileSurname(value);
            if (authError) setAuthError(null);
          }}
          onLoginWithSelected={() => {
            if (!cloudSnapshot) {
              setAuthError("Synchronisation cloud indisponible pour le moment.");
              return;
            }

            if (!selectedLoginProfileId) {
              setAuthError("Sélectionnez un profil pour continuer.");
              return;
            }

            const selected = cloudSnapshot.profiles[selectedLoginProfileId];
            if (!selected) {
              setAuthError("Profil introuvable. Rechargez puis réessayez.");
              return;
            }

            const selectedPasswordHash = selected.passwordHash?.trim() || "";
            if (selectedPasswordHash) {
              if (!isProfilePasswordHash(selectedPasswordHash)) {
                setAuthError("Authentification impossible. Vérifiez les informations saisies.");
                return;
              }

              setPasswordPromptProfileId(selected.profileId);
              setPasswordPromptInput("");
              setPasswordPromptError(null);
              setProfileRecoveryStep("none");
              setProfileRecoveryAnswerInput("");
              setProfileRecoveryNewPasswordInput("");
              setProfileRecoveryNewPasswordConfirmInput("");
              setProfileRecoveryError(null);
              setAuthError(null);
              return;
            }

            setProfile((previous) => ({
              ...previous,
              id: selected.profileId,
              surname: selected.surname,
              role: selected.role,
            }));
            const nextPhase = cloudSnapshot.phase;
            setPhase(nextPhase);
            setScreen(getPostAuthLandingScreen(nextPhase));
            setIsProfileHydrationPending(true);
            setAuthError(null);
            setIsAuthenticated(true);
          }}
          onPasswordPromptValueChange={(value) => {
            setPasswordPromptInput(value);
            if (passwordPromptError) setPasswordPromptError(null);
          }}
          onOpenProfileForgotPassword={() => {
            setProfileRecoveryStep("recovery");
            setProfileRecoveryAnswerInput("");
            setProfileRecoveryNewPasswordInput("");
            setProfileRecoveryNewPasswordConfirmInput("");
            setProfileRecoveryError(null);
          }}
          onProfileRecoveryAnswerChange={(value) => {
            setProfileRecoveryAnswerInput(value);
            if (profileRecoveryError) setProfileRecoveryError(null);
          }}
          onProfileRecoveryNewPasswordChange={(value) => {
            setProfileRecoveryNewPasswordInput(value);
            if (profileRecoveryError) setProfileRecoveryError(null);
          }}
          onProfileRecoveryNewPasswordConfirmChange={(value) => {
            setProfileRecoveryNewPasswordConfirmInput(value);
            if (profileRecoveryError) setProfileRecoveryError(null);
          }}
          onConfirmProfileRecoveryReset={() => {
            const genericError = "Authentification impossible. Vérifiez les informations saisies.";
            const targetProfileId = passwordPromptProfileId ?? selectedLoginProfileId;
            if (!cloudSnapshot || !targetProfileId || !cloudActorUid) {
              setProfileRecoveryError(genericError);
              return;
            }

            const selected = cloudSnapshot.profiles[targetProfileId];
            const recoveryHash = selected?.recoveryHash?.trim() || "";
            if (!selected || !isOwnerRecoveryHash(recoveryHash)) {
              setProfileRecoveryError(genericError);
              return;
            }

            const answer = profileRecoveryAnswerInput.trim();
            const newPassword = profileRecoveryNewPasswordInput.trim();
            const confirmation = profileRecoveryNewPasswordConfirmInput.trim();

            if (!answer) {
              setProfileRecoveryError("La réponse de récupération est obligatoire.");
              return;
            }

            if (!newPassword || newPassword.length < 4) {
              setProfileRecoveryError("Le nouveau mot de passe doit contenir au moins 4 caractères.");
              return;
            }

            if (!confirmation || newPassword !== confirmation) {
              setProfileRecoveryError("La confirmation du mot de passe ne correspond pas.");
              return;
            }

            const confirmReset = async () => {
              const answerHash = await hashOwnerRecoveryPhrase(answer);
              if (answerHash !== recoveryHash) {
                setProfileRecoveryError(genericError);
                return;
              }

              const newPasswordHash = await hashProfilePassword(newPassword);
              if (!isProfilePasswordHash(newPasswordHash)) {
                setProfileRecoveryError(genericError);
                return;
              }

              const previousPasswordHash = profilePasswordHashes[targetProfileId] || "";
              setProfilePasswordHashes((previous) => ({
                ...previous,
                [targetProfileId]: newPasswordHash,
              }));

              const pushed = await pushSnapshot({
                actorUid: cloudActorUid,
                canWriteFamilyState: false,
                familyState: cloudSnapshot.familyState,
                ownerCodeHash: cloudSnapshot.ownerCodeHash,
                ownerRecoveryHash: cloudSnapshot.ownerRecoveryHash,
                ownerRecoveryConfiguredAt: cloudSnapshot.ownerRecoveryConfiguredAt,
                profileId: selected.profileId,
                surname: selected.surname,
                role: selected.role,
                profilePasswordHash: newPasswordHash,
                profileRecoveryHash: selected.recoveryHash,
                profileRecoveryQuestion: selected.recoveryQuestion,
                profileRecoveryAnswer: selected.recoveryAnswer,
                profileRecoveryConfiguredAt: selected.recoveryConfiguredAt,
                gender: selected.gender,
                householdRole: selected.householdRole,
                checklist: selected.checklist,
                profileCustomChecklistItems: selected.customChecklistItems ?? [],
                ownerGlobalChecklistAdditions: cloudSnapshot.ownerGlobalChecklistAdditions,
                ownerGlobalChecklistRemovals: cloudSnapshot.ownerGlobalChecklistRemovals,
                placeComments: cloudSnapshot.placeComments ?? {},
                challengeReactions: cloudSnapshot.challengeReactions ?? {},
                gameResults: selected.gameResults,
                gameProgress: selected.gameProgress,
                candyCrushChallenge: selected.candyCrushChallenge,
                phase: selected.phase || cloudSnapshot.phase,
                tripStartDate: cloudSnapshot.tripStartDate,
              });
              if (pushed === false) {
                setProfilePasswordHashes((previous) => ({
                  ...previous,
                  [targetProfileId]: previousPasswordHash,
                }));
                setProfileRecoveryError(genericError);
                return;
              }

              setProfile((previous) => ({
                ...previous,
                id: selected.profileId,
                surname: selected.surname,
                role: selected.role,
                gender: selected.gender ?? "unspecified",
                householdRole: selected.householdRole ?? "member",
              }));
              const nextPhase = cloudSnapshot.phase;
              setPhase(nextPhase);
              setScreen(getPostAuthLandingScreen(nextPhase));
              setIsProfileHydrationPending(true);
              setAuthError(null);
              setPasswordPromptProfileId(null);
              setPasswordPromptInput("");
              setPasswordPromptError(null);
              setProfileRecoveryStep("none");
              setProfileRecoveryAnswerInput("");
              setProfileRecoveryNewPasswordInput("");
              setProfileRecoveryNewPasswordConfirmInput("");
              setProfileRecoveryError(null);
              setIsAuthenticated(true);
            };

            void confirmReset();
          }}
          onCancelProfileRecovery={() => {
            setProfileRecoveryStep("none");
            setProfileRecoveryAnswerInput("");
            setProfileRecoveryNewPasswordInput("");
            setProfileRecoveryNewPasswordConfirmInput("");
            setProfileRecoveryError(null);
          }}
          onConfirmPasswordPrompt={() => {
            const targetProfileId = passwordPromptProfileId;
            if (!cloudSnapshot || !targetProfileId) {
              setPasswordPromptError("Authentification impossible. Vérifiez les informations saisies.");
              return;
            }

            const selected = cloudSnapshot.profiles[targetProfileId];
            const selectedPasswordHash = selected?.passwordHash?.trim() || "";
            if (!selected || !selectedPasswordHash || !isProfilePasswordHash(selectedPasswordHash)) {
              setPasswordPromptError("Authentification impossible. Vérifiez les informations saisies.");
              return;
            }

            const confirm = async () => {
              const ok = await verifyProfilePassword(passwordPromptInput, selectedPasswordHash);
              if (!ok) {
                setPasswordPromptError("Authentification impossible. Vérifiez les informations saisies.");
                return;
              }

              setProfile((previous) => ({
                ...previous,
                id: selected.profileId,
                surname: selected.surname,
                role: selected.role,
              }));
              const nextPhase = cloudSnapshot.phase;
              setPhase(nextPhase);
              setScreen(getPostAuthLandingScreen(nextPhase));
              setIsProfileHydrationPending(true);
              setAuthError(null);
              setPasswordPromptInput("");
              setPasswordPromptError(null);
              setPasswordPromptProfileId(null);
              saveSessionToken(targetProfileId);
              setIsAuthenticated(true);
            };

            void confirm();
          }}
          onCancelPasswordPrompt={() => {
            setPasswordPromptInput("");
            setPasswordPromptError(null);
            setPasswordPromptProfileId(null);
            setProfileRecoveryStep("none");
            setProfileRecoveryAnswerInput("");
            setProfileRecoveryNewPasswordInput("");
            setProfileRecoveryNewPasswordConfirmInput("");
            setProfileRecoveryError(null);
          }}
          onCreateAndContinue={() => {
            const normalizedSurname = createProfileSurname.trim();
            if (!normalizedSurname) {
              setAuthError("Le surnom est obligatoire pour créer un profil.");
              return;
            }

            const duplicateCandidate = findDuplicateProfileBySurname(
              loginCandidates,
              normalizedSurname
            );
            if (duplicateCandidate) {
              setSelectedLoginProfileId(duplicateCandidate.id);
              setAuthError(
                "Ce profil existe déjà. Sélectionnez-le dans la liste puis appuyez sur Se connecter."
              );
              return;
            }

            setProfile((previous) => ({
              ...previous,
              id: createProfileId(),
              surname: normalizedSurname,
              role: null,
            }));
            setProfileError(null);
            setAuthError(null);
            setIsAuthenticated(true);
          }}
        />
      );
    }

    if (!profileReady) {
      return (
        <ProfileSetupScreen
          profile={profile}
          ownerAlreadyConfigured={Boolean(familyState.ownerProfileId)}
          travelerCodeConfigured={travelerCodeHash.length > 0}
          error={profileError}
          onCancel={
            cloudEnabled
              ? () => {
                  setProfile({
                    id: createProfileId(),
                    surname: "",
                    role: null,
                    gender: "unspecified",
                    householdRole: "member",
                  });
                  setProfileError(null);
                  setAuthError(null);
                  setCreateProfileSurname("");
                  setIsAuthenticated(false);
                }
              : undefined
          }
          onSurnameChange={(v) => {
            setProfile((p) => ({ ...p, surname: v }));
            if (profileError) setProfileError(null);
          }}
          onGenderChange={(v) => setProfile((p) => ({ ...p, gender: v }))}
          onHouseholdRoleChange={(v) => setProfile((p) => ({ ...p, householdRole: v }))}
          onContinue={(password, recoveryQuestion, recoveryAnswer, travelerChoice, travelerCode) => {
            if (cloudEnabled && !cloudReady) {
              setProfileError("Synchronisation cloud en cours. Patientez quelques secondes.");
              return;
            }

            const normalizedSurname = profile.surname.trim();
            if (!normalizedSurname) {
              setProfileError("Le surnom est obligatoire.");
              return;
            }

            const ownerAlreadyConfigured = Boolean(familyState.ownerProfileId);
            if (ownerAlreadyConfigured && travelerChoice === null) {
              setProfileError(
                "Merci d'indiquer si vous voyagez avec nous ou si vous souhaitez simplement suivre le voyage."
              );
              return;
            }

            const normalizedPassword = password.trim();
            const normalizedRecoveryQuestion = recoveryQuestion.trim();
            const normalizedRecoveryAnswer = recoveryAnswer.trim();

            if (!normalizedPassword || !normalizedRecoveryQuestion || !normalizedRecoveryAnswer) {
              setProfileError(
                "Le mot de passe et la question/réponse de récupération sont obligatoires pour créer un profil."
              );
              return;
            }

            if (normalizedPassword.length < 4) {
              setProfileError("Le mot de passe doit contenir au moins 4 caractères.");
              return;
            }

            if (normalizedRecoveryQuestion.length < 8) {
              setProfileError("La question de récupération doit contenir au moins 8 caractères.");
              return;
            }

            if (normalizedRecoveryQuestion.length > 200) {
              setProfileError("La question de récupération ne doit pas dépasser 200 caractères.");
              return;
            }

            if (normalizedRecoveryAnswer.length < 5) {
              setProfileError("La réponse de récupération doit contenir au moins 5 caractères.");
              return;
            }

            const continueSetup = async () => {
              if (ownerAlreadyConfigured && travelerChoice === "voyageur") {
                if (lockRemainingMs > 0) {
                  setProfileError(`Trop de tentatives. Réessayez dans ${lockRemainingSec}s.`);
                  return;
                }

                if (!travelerCodeHash) {
                  setProfileError(
                    "Le propriétaire doit d'abord configurer un code voyageur dans ses paramètres."
                  );
                  return;
                }

                const isTravelerCodeValid = await verifyOwnerCode(travelerCode, travelerCodeHash);
                if (!isTravelerCodeValid) {
                  const nextAttempts = unlockFailedAttempts + 1;
                  if (nextAttempts >= 3) {
                    setUnlockFailedAttempts(0);
                    setUnlockLockedUntil(Date.now() + 30000);
                    setNowTs(Date.now());
                    setProfileError("Code voyageur incorrect. Blocage temporaire de 30 secondes.");
                  } else {
                    setUnlockFailedAttempts(nextAttempts);
                    setProfileError("Code voyageur incorrect. Réessayez, ou choisissez Visiteur.");
                  }
                  return;
                }

                setUnlockFailedAttempts(0);
                setUnlockLockedUntil(0);
                setNowTs(Date.now());
              }

              // Hash the password/recovery answer up front (pure local
              // computation), and commit them to local state BEFORE calling
              // claimRoleForProfile. That call performs a Firebase transaction
              // on the whole family root, which the current security rules
              // structurally deny (no ancestor grants write there) — Firebase
              // treats the denial as a retryable conflict and can take a very
              // long time (or effectively never, in practice) to settle. If
              // the password/recovery state only got set *after* awaiting
              // that call, the app's own fallback role-assignment path (which
              // doesn't wait on it) could complete profile creation — and
              // trigger the first successful cloud push — before the password
              // was ever attached to it, permanently leaving the profile
              // unprotected. Setting it first means whichever path finishes
              // the profile creation, the password is already there.
              const nextPasswordHash = await hashProfilePassword(normalizedPassword);
              const nextRecoveryHash = await hashOwnerRecoveryPhrase(normalizedRecoveryAnswer);

              if (cloudEnabled) {
                pendingProfileCredentialsRef.current = {
                  profileId: profile.id,
                  passwordHash: nextPasswordHash,
                  recoveryHash: nextRecoveryHash,
                  recoveryQuestion: normalizedRecoveryQuestion,
                  recoveryAnswer: normalizedRecoveryAnswer,
                };
              }

              setProfilePasswordHashes((previous) => ({
                ...previous,
                [profile.id]: nextPasswordHash,
              }));
              setProfileRecoveryHashes((previous) => ({
                ...previous,
                [profile.id]: nextRecoveryHash,
              }));
              setProfileRecoveryQuestions((previous) => ({
                ...previous,
                [profile.id]: normalizedRecoveryQuestion,
              }));
              setProfileRecoveryAnswers((previous) => ({
                ...previous,
                [profile.id]: normalizedRecoveryAnswer,
              }));

              let assignedRole = assignRoleOnProfileCreation(familyState);
              let nextFamilyState: SharedFamilyState | null = null;

              // Story 24.1 : le choix "Visiteur" ne s'applique jamais au tout
              // premier profil (la course propriétaire/utilisateur ci-dessous
              // aurait alors renvoyé "proprietaire", jamais "utilisateur").
              // Cette surcouche est appliquée AVANT d'attendre
              // claimRoleForProfile (et pas après) : sa transaction Firebase
              // ne connaît que proprietaire/utilisateur et peut mettre très
              // longtemps (voire jamais, en pratique) à se résoudre quand les
              // règles de sécurité la refusent structurellement (cf. le
              // commentaire plus bas) — si le rôle "visiteur" n'était appliqué
              // qu'après ce await, il resterait bloqué sur "utilisateur" via
              // l'écho de la transaction récupéré par l'effet d'hydratation
              // (seul mécanisme qui, dans ce cas, fait réellement avancer
              // l'écran au-delà de la création de profil).
              const isVisitorOverride =
                ownerAlreadyConfigured && travelerChoice === "visiteur" && assignedRole === "utilisateur";
              if (isVisitorOverride) {
                assignedRole = "visiteur";
                pendingProfileRoleRef.current = { profileId: profile.id, role: "visiteur" };
                setProfile((current) => ({ ...current, surname: normalizedSurname, role: "visiteur" }));
                // Navigate away from checklist immediately so the access guard
                // doesn't flash "réservée aux voyageurs" on the visitor's screen.
                setScreen(getSafeScreen("visiteur", phase));
              } else {
                // Pre-set the locally-computed role so profileReady becomes true
                // immediately. claimRoleForProfile is intentionally NOT called for
                // cloud mode: its root-level Firebase transaction is denied by
                // security rules, causing a re-sync that temporarily removes the
                // new profile from the snapshot and triggers resetForProfileSwitch.
                // The auto-push handles the actual Firebase write instead.
                setProfile((current) => ({ ...current, surname: normalizedSurname, role: assignedRole }));
                setScreen(getSafeScreen(assignedRole, phase));
              }

              if (!cloudEnabled) {
                // Offline mode: claim the role atomically via the local transaction.
                const result = await claimRoleForProfile(profile.id, normalizedSurname);
                if (result) {
                  nextFamilyState = isVisitorOverride
                    ? applyProfileRoleMutation(result.familyState, profile.id, "visiteur").state
                    : result.familyState;
                  if (!isVisitorOverride) {
                    assignedRole = result.assignedRole;
                  }
                }
              }

              const nextProfile = {
                ...profile,
                surname: normalizedSurname,
                role: assignedRole,
              };

              setProfile(nextProfile);

              if (nextFamilyState) {
                setFamilyState(enforceOwnerUniqueness(nextFamilyState));
              } else if (!cloudEnabled) {
                // Only mutate the shared roster locally in true offline mode.
                // When cloud is enabled but the claim failed (e.g. transient
                // network/permission error), merging this profile into
                // familyState here would let a later owner push write a
                // bare `role` for it in Firebase before its own surname has
                // ever been synced, creating an orphan blank-surname profile.
                setFamilyState((previous) => {
                  const mutation = applyProfileRoleMutation(previous, nextProfile.id, assignedRole);
                  if (mutation.rejected && IS_DEV) {
                    console.info(
                      `[owner-policy] Setup role mutation rejected (${mutation.reason}) for profile ${nextProfile.id}.`
                    );
                  }

                  if (mutation.role !== assignedRole) {
                    setProfile((current) => ({ ...current, role: mutation.role }));
                  }

                  return mutation.state;
                });
              }

              setProfileError(null);
            };

            void continueSetup();
          }}
        />
      );
    }

    if (launchGateForced) {
      return (
        <LaunchGateScreen
          videoSrc={getLaunchVideoSrc(profile.role)}
          locked={phase === "before"}
          message={launchGateMessage}
          mode={launchGateMode}
          fallbackStepIndex={launchFallbackStepIndex}
          isOwnerReplay={ownerReplayLaunchRequested}
          onStart={handleLaunchStart}
          onVideoEnded={handleLaunchVideoEnded}
          onVideoError={handleLaunchVideoError}
          onNextFallback={handleLaunchNextFallback}
          onReplay={handleLaunchReplay}
          onEnterApp={handleLaunchEnter}
          onClosePlayback={handleLaunchClosePlayback}
          onCloseOwnerReplay={() => {
            setOwnerReplayLaunchRequested(false);
            setLaunchGateMode("idle");
            setLaunchFallbackStepIndex(0);
            setLaunchGateMessage(null);
            setScreen("settings");
          }}
        />
      );
    }

    if (phase === "before" && (profile.role !== "proprietaire" || screen === "settings" || screen === "checklist")) {
      if (screen === "settings") {
        return (
          <SettingsScreen
            profile={profile}
            ownerCodeConfigured={ownerCodeHash.length > 0}
            ownerCodeCurrent={ownerCodePlain}
            travelerCodeConfigured={travelerCodeHash.length > 0}
            travelerCodeCurrent={travelerCodePlain}
            profilePasswordConfigured={currentProfilePasswordHash.length > 0}
            profileRecoveryConfigured={currentProfileRecoveryHash.length > 0}
            profileRecoveryQuestion={currentProfileRecoveryQuestion}
            profileRecoveryAnswer={currentProfileRecoveryAnswer}
            appLocked
            cloudEnabled={cloudEnabled}
            onBack={() => goToScreen("checklist")}
            onSaveSurname={(surname) => {
              const normalized = surname.trim();
              if (!normalized) {
                return { ok: false, message: "Le surnom est obligatoire." };
              }
              setProfile((p) => ({ ...p, surname: normalized }));
              return { ok: true, message: "Surnom mis à jour." };
            }}
            onSaveProfileMetadata={(gender, householdRole) => {
              applyProfileMetadata(gender, householdRole);
            }}
            onSaveOwnerCode={async (code) => {
              if (!canUpdateOwnerCode(familyState, profile.id)) {
                return {
                  ok: false,
                  message: "Seul le profil propriétaire peut configurer le code.",
                };
              }
              const normalized = code.trim();
              if (normalized.length < 4) {
                return {
                  ok: false,
                  message: "Le code doit contenir au moins 4 caractères.",
                };
              }
              const nextHash = await hashOwnerCode(normalized);
              setOwnerCodeHash(nextHash);
              setOwnerCodePlain(normalized);
              return { ok: true, message: "Code propriétaire mis à jour." };
            }}
            onSaveTravelerCode={async (code) => {
              if (!canUpdateOwnerCode(familyState, profile.id)) {
                return {
                  ok: false,
                  message: "Seul le profil propriétaire peut configurer le code.",
                };
              }
              const normalized = code.trim();
              if (normalized.length < 4) {
                return {
                  ok: false,
                  message: "Le code doit contenir au moins 4 caractères.",
                };
              }
              const nextHash = await hashOwnerCode(normalized);
              setTravelerCodeHash(nextHash);
              setTravelerCodePlain(normalized);
              return { ok: true, message: "Code voyageur mis à jour." };
            }}
            onToggleLock={confirmOwnerLockToggle}
            onOpenLaunchReplay={() => {
              if (profile.role === "proprietaire") {
                setOwnerReplayLaunchRequested(true);
                setLaunchGateMode("video");
                setLaunchFallbackStepIndex(0);
                setLaunchGateMessage(null);
              }
            }}
            onSaveProfilePassword={async (password) => {
              const normalized = password.trim();
              if (normalized.length < 4) {
                return {
                  ok: false,
                  message: "Le mot de passe doit contenir au moins 4 caractères.",
                };
              }
              const nextHash = await hashProfilePassword(normalized);
              setProfilePasswordHashes((previous) => ({
                ...previous,
                [profile.id]: nextHash,
              }));
              return { ok: true, message: "Mot de passe du profil mis à jour." };
            }}
            onChangeProfilePasswordInSession={changeProfilePasswordInSession}
            onRemoveProfilePassword={async () => {
              setProfilePasswordHashes((previous) => {
                if (!(profile.id in previous)) {
                  return previous;
                }

                const { [profile.id]: _removed, ...next } = previous;
                return next;
              });
              return { ok: true, message: "Mot de passe du profil retiré." };
            }}
            onSaveProfileRecoveryData={async (question, answer) => {
              const normalizedQuestion = question.trim();
              if (normalizedQuestion.length < 8) {
                return {
                  ok: false,
                  message: "La question doit contenir au moins 8 caractères.",
                };
              }
              if (normalizedQuestion.length > 200) {
                return {
                  ok: false,
                  message: "La question ne doit pas dépasser 200 caractères.",
                };
              }

              const normalizedAnswer = answer.trim();
              if (normalizedAnswer.length < 5) {
                return {
                  ok: false,
                  message: "La réponse doit contenir au moins 5 caractères.",
                };
              }

              const nextHash = await hashOwnerRecoveryPhrase(normalizedAnswer);
              setProfileRecoveryHashes((previous) => ({
                ...previous,
                [profile.id]: nextHash,
              }));
              setProfileRecoveryQuestions((previous) => ({
                ...previous,
                [profile.id]: normalizedQuestion,
              }));
              setProfileRecoveryAnswers((previous) => ({
                ...previous,
                [profile.id]: normalizedAnswer,
              }));
              return {
                ok: true,
                message: "Question et réponse de récupération du profil mises à jour.",
              };
            }}
            onSwitchProfile={resetForProfileSwitch}
            onDeleteOwnProfile={deleteOwnProfile}
            tripStartDate={tripStartDate}
            onSaveTripStartDate={saveTripStartDate}
            gameScoring={gameScoring}
            onSaveGameScoring={saveGameScoring}
            currentDay={currentDay}
            lastDefinedDay={lastDefinedDay}
            gameDayOverride={gameDayOverride}
            onSetGameDayOverride={confirmDayOverrideChange}
            notificationPreferences={notificationPreferences}
            notificationPermissionStatus={notificationPermissionStatus}
            notificationsSupported={areNotificationsSupported()}
            onToggleNotificationPreference={toggleNotificationPreference}
            onResetScores={confirmScoreReset}
            familyMembersForGameProgressReset={familyMembersForPodium.map((member) => ({
              profileId: member.profileId,
              surname: member.surname,
            }))}
            onResetGameProgress={confirmGameProgressReset}
            isOnline={isOnline}
            lastSyncAt={currentProfileLastSyncAt}
          />
        );
      }

      if (effectiveScreen === "dashboard") {
        return <DashboardScreen
            quickActions={visibleQuickActions}
            canAccessChecklist={canAccessScreen(profile.role, phase, "checklist")}
            canAccessOfflineMedia={canAccessScreen(profile.role, phase, "offline-media")}
            canPlayArcade={
              canAccessScreen(profile.role, phase, "jeux") ||
              (postTripReplayEnabled && profile.role === "visiteur")
            }
            showVisitorLockedActions={profile.role === "visiteur"}
            allowVisitorGamePostTripReplay={postTripReplayEnabled}
            allowVisitorArcadePostTripReplay={postTripReplayEnabled}
          isOnline={isOnline}
            onNavigate={goToScreen}
            onNavigateToTodayGuide={() => {
              setGuideSelectedDay(currentDay);
              goToScreen("guide");
            }}
            onStartTutorial={startAccueilTutorial}
            currentDay={currentDay}
            tripStartDate={tripStartDate}
            totalDays={totalDays}
            todayDestination={todayDestination}
            todaySubtitle={todaySubtitle}
            tripFinished={tripFinished}
            daysUntilStart={daysUntilStart}
            todayFormatted={todayFormatted}
            profileSurname={profile.surname}
          />;
      }

      if (effectiveScreen === "guide") {
        return (
          <GuideScreen
            places={placesWithOverrides}
            onBack={() => goToScreen("dashboard")}
            onPlaceSelect={openPlace}
            currentDay={currentDay}
            selectedDay={guideSelectedDay}
            tripStartDate={tripStartDate}
            onSelectedDayChange={setGuideSelectedDay}
            commentsByPlace={placeCommentsByPlace}
            role={profile.role}
            placeVisibilityMap={placeVisibilityMap}
            placeSeenMap={placeSeenMap}
            placeDayOverrideMap={placeDayOverrideMap}
            placeDayOrderOverrideMap={placeDayOrderOverrideMap}
            onTogglePlaceVisibility={setPlaceVisibilityForOwner}
            onTogglePlaceSeen={setPlaceSeenForOwner}
            onSetPlaceDays={setPlaceDaysForOwner}
            canManagePlaceVisibility={canUpdateOwnerCode(familyState, profile.id)}
            ownerAddedPlaceIds={ownerAddedPlaceIds}
            onSavePlace={savePlaceForOwner}
            onDeletePlace={deletePlaceForOwner}
            isOnline={isOnline}
          />
        );
      }

      if (effectiveScreen === "planning") {
        return (
          <PlanningScreen
            places={placesWithOverrides}
            onBack={() => goToScreen("dashboard")}
            onDaySelect={(day) => {
              setGuideSelectedDay(day);
              goToScreen("guide");
            }}
            currentDay={currentDay}
            tripStartDate={tripStartDate}
            tripFinished={tripFinished}
            role={profile.role}
            placeVisibilityMap={placeVisibilityMap}
            placeDayOverrideMap={placeDayOverrideMap}
            placeDayOrderOverrideMap={placeDayOrderOverrideMap}
          />
        );
      }

      if (effectiveScreen === "documents") {
        return (
          <DocumentsScreen
            documents={documentsWithOwnerOverrides}
            onBack={() => goToScreen("dashboard")}
            tripStartDate={tripStartDate}
            role={profile.role}
            documentVisibilityMap={documentVisibilityMap}
            onToggleDocumentVisibility={setDocumentVisibilityForOwner}
            canManageDocumentVisibility={canUpdateOwnerCode(familyState, profile.id)}
            onSaveDocument={saveDocumentForOwner}
            onDeleteDocument={deleteDocumentForOwner}
            deepLinkTarget={documentsDeepLinkTarget}
            onDeepLinkHandled={() => setDocumentsDeepLinkTarget(null)}
            isOnline={isOnline}
          />
        );
      }

      if (effectiveScreen === "map") {
        return (
          <MapScreen
            places={placesWithOverrides}
            onBack={() => goToScreen("dashboard")}
            currentDay={currentDay}
            tripStartDate={tripStartDate}
            placeDayOverrideMap={placeDayOverrideMap}
            onNavigateToGuide={(day) => {
              setGuideSelectedDay(day);
              goToScreen("guide");
            }}
          />
        );
      }

      if (effectiveScreen === "place") {
        return place ? (
          <PlaceScreen
            place={place}
            profile={profile}
            familyProfiles={familyProfilesForComments}
            comments={placeCommentsForSelectedPlace}
            onUpsertComment={upsertPlaceComment}
            carnetEntries={carnetVisiteForSelectedPlace}
            onUpsertCarnetEntry={upsertCarnetVisiteEntry}
            onDeleteCarnetEntry={deleteCarnetVisiteEntry}
            onBack={() => goToScreen("guide")}
            onOpenVisiteGuidee={(item) => openVisiteGuidee(item, "place")}
            onOpenInternalLink={openInternalLink}
            isOnline={isOnline}
            onSaveContentOverride={setContentOverrideForOwner}
            isOwnerAddedPlace={place ? ownerAddedPlaceIds.has(place.id) : false}
          />
        ) : null;
      }

      if (effectiveScreen === "visite-guidee") {
        return selectedVisiteGuideeId ? (
          <VisiteGuideeScreen
            guideId={selectedVisiteGuideeId}
            title={selectedVisiteGuideeTitle}
            onBack={() => goToScreen(visiteGuideeBackScreen)}
          />
        ) : null;
      }

      if (effectiveScreen === "histoire") {
        return (
          <HistoireScreen
            topics={histoireTopicsWithOverrides}
            onBack={() => goToScreen("dashboard")}
            onTopicSelect={openHistoireTopic}
            isOnline={isOnline}
          />
        );
      }

      if (effectiveScreen === "histoire-topic") {
        return histoireTopic ? (
          <HistoireTopicScreen
            topic={histoireTopic}
            profile={profile}
            familyProfiles={familyProfilesForComments}
            carnetEntries={getCarnetContentEntries("histoire", histoireTopic.id)}
            onUpsertCarnetEntry={upsertCarnetContentEntry}
            onDeleteCarnetEntry={deleteCarnetContentEntry}
            onBack={() => goToScreen("histoire")}
            onOpenVisiteGuidee={(item) => openVisiteGuidee(item, "histoire-topic")}
            isOnline={isOnline}
            onSaveContentOverride={setContentOverrideForOwner}
            isOwnerAddedPlace={place ? ownerAddedPlaceIds.has(place.id) : false}
          />
        ) : null;
      }

      if (effectiveScreen === "geographie") {
        return (
          <GeographieScreen
            topics={geographieTopicsWithOverrides}
            onBack={() => goToScreen("dashboard")}
            onTopicSelect={openGeographieTopic}
            isOnline={isOnline}
          />
        );
      }

      if (effectiveScreen === "geographie-topic") {
        return geographieTopic ? (
          <GeographieTopicScreen
            topic={geographieTopic}
            profile={profile}
            familyProfiles={familyProfilesForComments}
            carnetEntries={getCarnetContentEntries("geographie-economie", geographieTopic.id)}
            onUpsertCarnetEntry={upsertCarnetContentEntry}
            onDeleteCarnetEntry={deleteCarnetContentEntry}
            onBack={() => goToScreen("geographie")}
            onOpenVisiteGuidee={(item) => openVisiteGuidee(item, "geographie-topic")}
            isOnline={isOnline}
            onSaveContentOverride={setContentOverrideForOwner}
            isOwnerAddedPlace={place ? ownerAddedPlaceIds.has(place.id) : false}
          />
        ) : null;
      }

      if (effectiveScreen === "culture") {
        return (
          <CultureScreen
            topics={cultureTopicsWithOverrides}
            onBack={() => goToScreen("dashboard")}
            onTopicSelect={openCultureTopic}
            isOnline={isOnline}
          />
        );
      }

      if (effectiveScreen === "culture-topic") {
        return cultureTopic ? (
          <CultureTopicScreen
            topic={cultureTopic}
            profile={profile}
            familyProfiles={familyProfilesForComments}
            carnetEntries={getCarnetContentEntries("culture-tradition", cultureTopic.id)}
            onUpsertCarnetEntry={upsertCarnetContentEntry}
            onDeleteCarnetEntry={deleteCarnetContentEntry}
            onBack={() => goToScreen("culture")}
            onOpenVisiteGuidee={(item) => openVisiteGuidee(item, "culture-topic")}
            isOnline={isOnline}
            onSaveContentOverride={setContentOverrideForOwner}
            isOwnerAddedPlace={place ? ownerAddedPlaceIds.has(place.id) : false}
          />
        ) : null;
      }

      if (effectiveScreen === "game") {
        return (
          <GameScreen
            gameState={gameState}
            currentQ={currentQ}
            selectedAns={selectedAns}
            answers={answers}
            correctCount={correctCount}
            gameScore={gameScore}
            riddleAnswer={riddleAnswer}
            riddleFeedback={riddleFeedback}
            riddleValidated={riddleValidated}
            riddleSolved={riddleSolved}
            riddleSelfCheckPending={riddleSelfCheckPending}
            challengeResponse={challengeResponse}
            challengeDone={challengeDone}
            gameDay={gameDay}
            canPickReplayDay={postTripReplayEnabled}
            replayDayChoices={replayDayChoices}
            onReplayDayChange={setPostTripReplayDay}
            scorePersistenceDisabled={postTripReplayEnabled}
            challengeEnabled={!postTripReplayEnabled}
            onFinishAfterRiddle={() => {
              setGameState("intro");
              setAnswers([]);
              setCurrentQ(0);
              setSelectedAns(null);
              setQuizStartedAt(null);
              setQuizDurationSec(0);
              setRiddleAnswer("");
              setRiddleFeedback(null);
              setRiddleValidated(false);
              setRiddleSolved(false);
              setRiddleSelfCheckPending(false);
              setChallengeResponse("");
              setChallengeDone(false);
            }}
            currentDay={currentDay}
            tripStartDate={tripStartDate}
            alreadyPlayedToday={alreadyPlayedToday}
            gameDayOverride={gameDayOverride}
            questions={todaysQuestions}
            riddle={todaysRiddle}
            challenge={todaysChallenge}
            scoring={gameScoring}
            onStart={() => {
              setGameState("playing");
              setCurrentQ(0);
              setSelectedAns(null);
              setAnswers([]);
              setQuizStartedAt(Date.now());
              setQuizDurationSec(0);
              setRiddleAnswer("");
              setRiddleFeedback(null);
              setRiddleValidated(false);
              setRiddleSolved(false);
              setRiddleSelfCheckPending(false);
              setChallengeResponse("");
              setChallengeDone(false);
            }}
            onAnswer={answerQ}
            onBack={() => goToScreen("dashboard")}
            onContinueToRiddle={() => setGameState("riddle")}
            onRiddleAnswerChange={(value) => {
              setRiddleAnswer(value);
              if (riddleFeedback) setRiddleFeedback(null);
            }}
            onValidateRiddle={validateRiddle}
            onDeclareRiddleSelfCheck={declareRiddleSelfCheck}
            onContinueToChallenge={() => {
              if (postTripReplayEnabled) {
                return;
              }
              setGameState("challenge");
            }}
            onChallengeResponseChange={setChallengeResponse}
            onCompleteChallenge={completeChallengeAndFinishSession}
          />
        );
      }

      if (effectiveScreen === "results") {
        return (
          <ResultsScreen
            onBack={() => goToScreen("dashboard")}
            history={gameHistory}
            familyMembers={familyMembersForPodium}
            currentDay={currentDay}
            sharedChallengeDays={sharedChallengeDays}
            tripStartDate={tripStartDate}
            currentProfileId={profile.id}
            currentProfileRole={profile.role}
            destinationSurveyDestination={todayDestination}
            destinationSurveyResults={destinationSurveyResults.rows}
            scoring={gameScoring}
            challengeReactionsByDay={challengeReactionsByDay}
            onReactToChallengeResponse={reactToChallengeResponse}
            challengeBestVotesByDay={challengeBestVotesByDay}
            onVoteBestChallengeResponse={voteBestChallengeResponse}
          />
        );
      }

      if (effectiveScreen === "tips") {
        return <TipsScreen onBack={() => goToScreen("dashboard")} currentDay={currentDay} isOnline={isOnline} />;
      }

      if (effectiveScreen === "offline-media") {
        return <OfflineMediaScreen isOnline={isOnline} onBack={() => goToScreen("dashboard")} />;
      }

      return (
        <ChecklistScreen
          categories={visibleCategories}
          role={profile.role}
          currentProfileId={profile.id}
          checked={checked}
          openCategories={openCategories}
          toggleItem={toggleItem}
          toggleCategory={toggleCategory}
          newItemDrafts={newItemDrafts}
          onChangeNewItemDraft={updateNewItemDraft}
          onAddItem={addChecklistItem}
          onDeleteItem={deleteChecklistItem}
          pct={pct}
          checkedCount={checkedCount}
          totalItems={totalItems}
          startPromptOpen={showStartPrompt}
          startCode={startCodeInput}
          startError={startError}
          recoveryPromptOpen={showRecoveryPrompt}
          recoveryPhrase={recoveryPhraseInput}
          recoveryNewCode={recoveryNewCodeInput}
          recoveryCodeConfirm={recoveryCodeConfirmInput}
          recoveryError={recoveryError}
          lockRemainingSec={lockRemainingSec}
          unlockActionsEnabled
          onOpenSettings={() => goToScreen("settings")}
          onStart={startJourney}
          onOpenForgotCode={openForgotCodeFlow}
          onStartCodeChange={(v) => {
            setStartCodeInput(v);
            if (startError) setStartError(null);
          }}
          onRecoveryPhraseChange={(v) => {
            setRecoveryPhraseInput(v);
            if (recoveryError) setRecoveryError(null);
          }}
          onRecoveryNewCodeChange={(v) => {
            setRecoveryNewCodeInput(v);
            if (recoveryError) setRecoveryError(null);
          }}
          onRecoveryCodeConfirmChange={(v) => {
            setRecoveryCodeConfirmInput(v);
            if (recoveryError) setRecoveryError(null);
          }}
          onConfirmStart={confirmStartJourney}
          onConfirmRecoveryReset={confirmRecoveryReset}
          onCancelStartPrompt={() => {
            setShowStartPrompt(false);
            setStartCodeInput("");
            setStartError(null);
          }}
          onCancelRecoveryPrompt={() => {
            setShowRecoveryPrompt(false);
            resetRecoveryPromptState();
          }}
          daysUntilStart={daysUntilStart}
          todayFormatted={todayFormatted}
          destinationSurveyDestination={todayDestination}
          destinationSurveyDrafts={destinationSurveyDrafts}
          destinationSurveyError={destinationSurveyError}
          destinationSurveyResults={destinationSurveyResults.rows}
          onDestinationSurveyDraftChange={updateDestinationSurveyDraft}
          onSaveDestinationSurvey={saveDestinationSurvey}
        />
      );
    }
    switch (effectiveScreen) {
      case "checklist":
        return (
          <ChecklistScreen
            categories={visibleCategories}
            role={profile.role}
            currentProfileId={profile.id}
            checked={checked}
            openCategories={openCategories}
            toggleItem={toggleItem}
            toggleCategory={toggleCategory}
            newItemDrafts={newItemDrafts}
            onChangeNewItemDraft={updateNewItemDraft}
            onAddItem={addChecklistItem}
            onDeleteItem={deleteChecklistItem}
            pct={pct}
            checkedCount={checkedCount}
            totalItems={totalItems}
            startPromptOpen={false}
            startCode=""
            startError={null}
            recoveryPromptOpen={false}
            recoveryPhrase=""
            recoveryNewCode=""
            recoveryCodeConfirm=""
            recoveryError={null}
            lockRemainingSec={0}
            unlockActionsEnabled={false}
            onOpenSettings={() => goToScreen("settings")}
            onStart={() => {
              // No-op during travel phase: checklist remains consultable but unlock flow is not exposed.
            }}
            onOpenForgotCode={() => {
              // No-op during travel phase.
            }}
            onStartCodeChange={() => {
              // No-op during travel phase.
            }}
            onRecoveryPhraseChange={() => {
              // No-op during travel phase.
            }}
            onRecoveryNewCodeChange={() => {
              // No-op during travel phase.
            }}
            onRecoveryCodeConfirmChange={() => {
              // No-op during travel phase.
            }}
            onConfirmStart={async () => {
              // No-op during travel phase.
            }}
            onConfirmRecoveryReset={async () => {
              // No-op during travel phase.
            }}
            onCancelStartPrompt={() => {
              // No-op during travel phase.
            }}
            onCancelRecoveryPrompt={() => {
              // No-op during travel phase.
            }}
            daysUntilStart={daysUntilStart}
            todayFormatted={todayFormatted}
            destinationSurveyDestination={todayDestination}
            destinationSurveyDrafts={destinationSurveyDrafts}
            destinationSurveyError={null}
            destinationSurveyResults={destinationSurveyResults.rows}
            onDestinationSurveyDraftChange={() => {
              // No-op during travel phase.
            }}
            onSaveDestinationSurvey={() => {
              // No-op during travel phase.
            }}
          />
        );
      case "dashboard":
        return <DashboardScreen
            quickActions={visibleQuickActions}
            canAccessChecklist={canAccessScreen(profile.role, phase, "checklist")}
            canAccessOfflineMedia={canAccessScreen(profile.role, phase, "offline-media")}
            canPlayArcade={
              canAccessScreen(profile.role, phase, "jeux") ||
              (postTripReplayEnabled && profile.role === "visiteur")
            }
            showVisitorLockedActions={profile.role === "visiteur"}
            allowVisitorGamePostTripReplay={postTripReplayEnabled}
            allowVisitorArcadePostTripReplay={postTripReplayEnabled}
          isOnline={isOnline}
            onNavigate={goToScreen}
            onNavigateToTodayGuide={() => {
              setGuideSelectedDay(currentDay);
              goToScreen("guide");
            }}
            onStartTutorial={startAccueilTutorial}
            currentDay={currentDay}
            tripStartDate={tripStartDate}
            totalDays={totalDays}
            todayDestination={todayDestination}
            todaySubtitle={todaySubtitle}
            tripFinished={tripFinished}
            daysUntilStart={daysUntilStart}
            todayFormatted={todayFormatted}
            profileSurname={profile.surname}
          />;
      case "guide":
        return (
          <GuideScreen
            places={placesWithOverrides}
            onBack={() => goToScreen("dashboard")}
            onPlaceSelect={openPlace}
            currentDay={currentDay}
            selectedDay={guideSelectedDay}
            tripStartDate={tripStartDate}
            onSelectedDayChange={setGuideSelectedDay}
            commentsByPlace={placeCommentsByPlace}
            role={profile.role}
            placeVisibilityMap={placeVisibilityMap}
            placeSeenMap={placeSeenMap}
            placeDayOverrideMap={placeDayOverrideMap}
            placeDayOrderOverrideMap={placeDayOrderOverrideMap}
            onTogglePlaceVisibility={setPlaceVisibilityForOwner}
            onTogglePlaceSeen={setPlaceSeenForOwner}
            onSetPlaceDays={setPlaceDaysForOwner}
            canManagePlaceVisibility={canUpdateOwnerCode(familyState, profile.id)}
            ownerAddedPlaceIds={ownerAddedPlaceIds}
            onSavePlace={savePlaceForOwner}
            onDeletePlace={deletePlaceForOwner}
            isOnline={isOnline}
          />
        );
      case "planning":
        return (
          <PlanningScreen
            places={placesWithOverrides}
            onBack={() => goToScreen("dashboard")}
            onDaySelect={(day) => {
              setGuideSelectedDay(day);
              goToScreen("guide");
            }}
            currentDay={currentDay}
            tripStartDate={tripStartDate}
            tripFinished={tripFinished}
            role={profile.role}
            placeVisibilityMap={placeVisibilityMap}
            placeDayOverrideMap={placeDayOverrideMap}
            placeDayOrderOverrideMap={placeDayOrderOverrideMap}
          />
        );
      case "documents":
        return (
          <DocumentsScreen
            documents={documentsWithOwnerOverrides}
            onBack={() => goToScreen("dashboard")}
            tripStartDate={tripStartDate}
            role={profile.role}
            documentVisibilityMap={documentVisibilityMap}
            onToggleDocumentVisibility={setDocumentVisibilityForOwner}
            canManageDocumentVisibility={canUpdateOwnerCode(familyState, profile.id)}
            onSaveDocument={saveDocumentForOwner}
            onDeleteDocument={deleteDocumentForOwner}
            deepLinkTarget={documentsDeepLinkTarget}
            onDeepLinkHandled={() => setDocumentsDeepLinkTarget(null)}
            isOnline={isOnline}
          />
        );
      case "map":
        return (
          <MapScreen
            places={placesWithOverrides}
            onBack={() => goToScreen("dashboard")}
            currentDay={currentDay}
            tripStartDate={tripStartDate}
            placeDayOverrideMap={placeDayOverrideMap}
            onNavigateToGuide={(day) => {
              setGuideSelectedDay(day);
              goToScreen("guide");
            }}
          />
        );
      case "place":
        return place ? (
          <PlaceScreen
            place={place}
            profile={profile}
            familyProfiles={familyProfilesForComments}
            comments={placeCommentsForSelectedPlace}
            onUpsertComment={upsertPlaceComment}
            carnetEntries={carnetVisiteForSelectedPlace}
            onUpsertCarnetEntry={upsertCarnetVisiteEntry}
            onDeleteCarnetEntry={deleteCarnetVisiteEntry}
            onBack={() => goToScreen("guide")}
            onOpenVisiteGuidee={(item) => openVisiteGuidee(item, "place")}
            onOpenInternalLink={openInternalLink}
            isOnline={isOnline}
            onSaveContentOverride={setContentOverrideForOwner}
            isOwnerAddedPlace={place ? ownerAddedPlaceIds.has(place.id) : false}
          />
        ) : null;
      case "visite-guidee":
        return selectedVisiteGuideeId ? (
          <VisiteGuideeScreen
            guideId={selectedVisiteGuideeId}
            title={selectedVisiteGuideeTitle}
            onBack={() => goToScreen(visiteGuideeBackScreen)}
          />
        ) : null;
      case "histoire":
        return (
          <HistoireScreen
            topics={histoireTopicsWithOverrides}
            onBack={() => goToScreen("dashboard")}
            onTopicSelect={openHistoireTopic}
            isOnline={isOnline}
          />
        );
      case "histoire-topic":
        return histoireTopic ? (
          <HistoireTopicScreen
            topic={histoireTopic}
            profile={profile}
            familyProfiles={familyProfilesForComments}
            carnetEntries={getCarnetContentEntries("histoire", histoireTopic.id)}
            onUpsertCarnetEntry={upsertCarnetContentEntry}
            onDeleteCarnetEntry={deleteCarnetContentEntry}
            onBack={() => goToScreen("histoire")}
            onOpenVisiteGuidee={(item) => openVisiteGuidee(item, "histoire-topic")}
            isOnline={isOnline}
            onSaveContentOverride={setContentOverrideForOwner}
            isOwnerAddedPlace={place ? ownerAddedPlaceIds.has(place.id) : false}
          />
        ) : null;
      case "geographie":
        return (
          <GeographieScreen
            topics={geographieTopicsWithOverrides}
            onBack={() => goToScreen("dashboard")}
            onTopicSelect={openGeographieTopic}
            isOnline={isOnline}
          />
        );
      case "geographie-topic":
        return geographieTopic ? (
          <GeographieTopicScreen
            topic={geographieTopic}
            profile={profile}
            familyProfiles={familyProfilesForComments}
            carnetEntries={getCarnetContentEntries("geographie-economie", geographieTopic.id)}
            onUpsertCarnetEntry={upsertCarnetContentEntry}
            onDeleteCarnetEntry={deleteCarnetContentEntry}
            onBack={() => goToScreen("geographie")}
            onOpenVisiteGuidee={(item) => openVisiteGuidee(item, "geographie-topic")}
            isOnline={isOnline}
            onSaveContentOverride={setContentOverrideForOwner}
            isOwnerAddedPlace={place ? ownerAddedPlaceIds.has(place.id) : false}
          />
        ) : null;
      case "culture":
        return (
          <CultureScreen
            topics={cultureTopicsWithOverrides}
            onBack={() => goToScreen("dashboard")}
            onTopicSelect={openCultureTopic}
            isOnline={isOnline}
          />
        );
      case "culture-topic":
        return cultureTopic ? (
          <CultureTopicScreen
            topic={cultureTopic}
            profile={profile}
            familyProfiles={familyProfilesForComments}
            carnetEntries={getCarnetContentEntries("culture-tradition", cultureTopic.id)}
            onUpsertCarnetEntry={upsertCarnetContentEntry}
            onDeleteCarnetEntry={deleteCarnetContentEntry}
            onBack={() => goToScreen("culture")}
            onOpenVisiteGuidee={(item) => openVisiteGuidee(item, "culture-topic")}
            isOnline={isOnline}
            onSaveContentOverride={setContentOverrideForOwner}
            isOwnerAddedPlace={place ? ownerAddedPlaceIds.has(place.id) : false}
          />
        ) : null;
      case "game":
        return (
          <GameScreen
            gameState={gameState}
            currentQ={currentQ}
            selectedAns={selectedAns}
            answers={answers}
            correctCount={correctCount}
            gameScore={gameScore}
            riddleAnswer={riddleAnswer}
            riddleFeedback={riddleFeedback}
            riddleValidated={riddleValidated}
            riddleSolved={riddleSolved}
            riddleSelfCheckPending={riddleSelfCheckPending}
            challengeResponse={challengeResponse}
            challengeDone={challengeDone}
            gameDay={gameDay}
            canPickReplayDay={postTripReplayEnabled}
            replayDayChoices={replayDayChoices}
            onReplayDayChange={setPostTripReplayDay}
            scorePersistenceDisabled={postTripReplayEnabled}
            challengeEnabled={!postTripReplayEnabled}
            onFinishAfterRiddle={() => {
              setGameState("intro");
              setAnswers([]);
              setCurrentQ(0);
              setSelectedAns(null);
              setQuizStartedAt(null);
              setQuizDurationSec(0);
              setRiddleAnswer("");
              setRiddleFeedback(null);
              setRiddleValidated(false);
              setRiddleSolved(false);
              setRiddleSelfCheckPending(false);
              setChallengeResponse("");
              setChallengeDone(false);
            }}
            currentDay={currentDay}
            tripStartDate={tripStartDate}
            alreadyPlayedToday={alreadyPlayedToday}
            gameDayOverride={gameDayOverride}
            questions={todaysQuestions}
            riddle={todaysRiddle}
            challenge={todaysChallenge}
            scoring={gameScoring}
            onStart={() => {
              setGameState("playing");
              setCurrentQ(0);
              setSelectedAns(null);
              setAnswers([]);
              setQuizStartedAt(Date.now());
              setQuizDurationSec(0);
              setRiddleAnswer("");
              setRiddleFeedback(null);
              setRiddleValidated(false);
              setRiddleSolved(false);
              setRiddleSelfCheckPending(false);
              setChallengeResponse("");
              setChallengeDone(false);
            }}
            onAnswer={answerQ}
            onBack={() => goToScreen("dashboard")}
            onContinueToRiddle={() => setGameState("riddle")}
            onRiddleAnswerChange={(value) => {
              setRiddleAnswer(value);
              if (riddleFeedback) setRiddleFeedback(null);
            }}
            onValidateRiddle={validateRiddle}
            onDeclareRiddleSelfCheck={declareRiddleSelfCheck}
            onContinueToChallenge={() => {
              if (postTripReplayEnabled) {
                return;
              }
              setGameState("challenge");
            }}
            onChallengeResponseChange={setChallengeResponse}
            onCompleteChallenge={completeChallengeAndFinishSession}
            canPlayArcade={canAccessScreen(profile.role, phase, "jeux")}
            onOpenArcade={() => goToScreen("jeux")}
          />
        );
      case "jeux":
        return (
          <ArcadeHubScreen
            onBack={() => goToScreen("dashboard")}
            onPlayTrivial={() => goToScreen("trivial")}
            onPlayCandyCrush={() => goToScreen("candy-crush")}
            onPlayCrossword={() => goToScreen("crossword")}
            onPlayOrdalie={() => goToScreen("ordalie")}
            onPlayImposteur={() => goToScreen("imposteur")}
          />
        );
      case "trivial":
        return (
          <TrivialGameScreen
            defaultPlayerName={profile.surname}
            onBack={() => goToScreen("jeux")}
          />
        );
      case "candy-crush":
        return (
          <CandyCrushScreen
            onBack={() => goToScreen("jeux")}
            personalBest={candyCrushBest?.bestScore ?? 0}
            podium={candyCrushPodium}
            currentProfileId={profile.id}
            onChallengeResult={handleCandyCrushChallengeResult}
          />
        );
      case "crossword":
        return <CrosswordScreen onBack={() => goToScreen("jeux")} />;
      case "ordalie":
        return <OrdalieScreen onBack={() => goToScreen("jeux")} />;
      case "imposteur":
        return <ImposteurScreen defaultPlayerName={profile.surname} onBack={() => goToScreen("jeux")} />;
      case "results":
        return (
          <ResultsScreen
            onBack={() => goToScreen("dashboard")}
            history={gameHistory}
            familyMembers={familyMembersForPodium}
            currentDay={currentDay}
            sharedChallengeDays={sharedChallengeDays}
            tripStartDate={tripStartDate}
            destinationSurveyDestination={todayDestination}
            destinationSurveyResults={destinationSurveyResults.rows}
            scoring={gameScoring}
            currentProfileId={profile.id}
            currentProfileRole={profile.role}
            challengeReactionsByDay={challengeReactionsByDay}
            onReactToChallengeResponse={reactToChallengeResponse}
            challengeBestVotesByDay={challengeBestVotesByDay}
            onVoteBestChallengeResponse={voteBestChallengeResponse}
          />
        );
      case "tips":
        return <TipsScreen onBack={() => goToScreen("dashboard")} currentDay={currentDay} isOnline={isOnline} />;
      case "offline-media":
        return <OfflineMediaScreen isOnline={isOnline} onBack={() => goToScreen("dashboard")} />;
      case "settings":
        return (
          <SettingsScreen
            profile={profile}
            ownerCodeConfigured={ownerCodeHash.length > 0}
            ownerCodeCurrent={ownerCodePlain}
            travelerCodeConfigured={travelerCodeHash.length > 0}
            travelerCodeCurrent={travelerCodePlain}
            profilePasswordConfigured={currentProfilePasswordHash.length > 0}
            profileRecoveryConfigured={currentProfileRecoveryHash.length > 0}
            profileRecoveryQuestion={currentProfileRecoveryQuestion}
            profileRecoveryAnswer={currentProfileRecoveryAnswer}
            appLocked={phase === "before"}
            cloudEnabled={cloudEnabled}
            onBack={() => goToScreen("dashboard")}
            onSaveSurname={(surname) => {
              const normalized = surname.trim();
              if (!normalized) {
                return { ok: false, message: "Le surnom est obligatoire." };
              }
              setProfile((p) => ({ ...p, surname: normalized }));
              return { ok: true, message: "Surnom mis à jour." };
            }}
            onSaveProfileMetadata={(gender, householdRole) => {
              applyProfileMetadata(gender, householdRole);
            }}
            onSaveOwnerCode={async (code) => {
              if (!canUpdateOwnerCode(familyState, profile.id)) {
                return {
                  ok: false,
                  message: "Seul le profil propriétaire peut configurer le code.",
                };
              }
              const normalized = code.trim();
              if (normalized.length < 4) {
                return {
                  ok: false,
                  message: "Le code doit contenir au moins 4 caractères.",
                };
              }
              const nextHash = await hashOwnerCode(normalized);
              setOwnerCodeHash(nextHash);
              setOwnerCodePlain(normalized);
              return { ok: true, message: "Code propriétaire mis à jour." };
            }}
            onSaveTravelerCode={async (code) => {
              if (!canUpdateOwnerCode(familyState, profile.id)) {
                return {
                  ok: false,
                  message: "Seul le profil propriétaire peut configurer le code.",
                };
              }
              const normalized = code.trim();
              if (normalized.length < 4) {
                return {
                  ok: false,
                  message: "Le code doit contenir au moins 4 caractères.",
                };
              }
              const nextHash = await hashOwnerCode(normalized);
              setTravelerCodeHash(nextHash);
              setTravelerCodePlain(normalized);
              return { ok: true, message: "Code voyageur mis à jour." };
            }}
            onToggleLock={confirmOwnerLockToggle}
            onOpenLaunchReplay={() => {
              if (profile.role === "proprietaire") {
                setOwnerReplayLaunchRequested(true);
                setLaunchGateMode("video");
                setLaunchFallbackStepIndex(0);
                setLaunchGateMessage(null);
              }
            }}
            onSaveProfilePassword={async (password) => {
              const normalized = password.trim();
              if (normalized.length < 4) {
                return {
                  ok: false,
                  message: "Le mot de passe doit contenir au moins 4 caractères.",
                };
              }
              const nextHash = await hashProfilePassword(normalized);
              setProfilePasswordHashes((previous) => ({
                ...previous,
                [profile.id]: nextHash,
              }));
              return { ok: true, message: "Mot de passe du profil mis à jour." };
            }}
            onChangeProfilePasswordInSession={changeProfilePasswordInSession}
            onRemoveProfilePassword={async () => {
              setProfilePasswordHashes((previous) => {
                if (!(profile.id in previous)) {
                  return previous;
                }

                const { [profile.id]: _removed, ...next } = previous;
                return next;
              });
              return { ok: true, message: "Mot de passe du profil retiré." };
            }}
            onSaveProfileRecoveryData={async (question, answer) => {
              const normalizedQuestion = question.trim();
              if (normalizedQuestion.length < 8) {
                return {
                  ok: false,
                  message: "La question doit contenir au moins 8 caractères.",
                };
              }
              if (normalizedQuestion.length > 200) {
                return {
                  ok: false,
                  message: "La question ne doit pas dépasser 200 caractères.",
                };
              }

              const normalizedAnswer = answer.trim();
              if (normalizedAnswer.length < 5) {
                return {
                  ok: false,
                  message: "La réponse doit contenir au moins 5 caractères.",
                };
              }

              const nextHash = await hashOwnerRecoveryPhrase(normalizedAnswer);
              setProfileRecoveryHashes((previous) => ({
                ...previous,
                [profile.id]: nextHash,
              }));
              setProfileRecoveryQuestions((previous) => ({
                ...previous,
                [profile.id]: normalizedQuestion,
              }));
              setProfileRecoveryAnswers((previous) => ({
                ...previous,
                [profile.id]: normalizedAnswer,
              }));
              return {
                ok: true,
                message: "Question et réponse de récupération du profil mises à jour.",
              };
            }}
            onSwitchProfile={resetForProfileSwitch}
            onDeleteOwnProfile={deleteOwnProfile}
            tripStartDate={tripStartDate}
            onSaveTripStartDate={saveTripStartDate}
            gameScoring={gameScoring}
            onSaveGameScoring={saveGameScoring}
            currentDay={currentDay}
            lastDefinedDay={lastDefinedDay}
            gameDayOverride={gameDayOverride}
            onSetGameDayOverride={confirmDayOverrideChange}
            notificationPreferences={notificationPreferences}
            notificationPermissionStatus={notificationPermissionStatus}
            notificationsSupported={areNotificationsSupported()}
            onToggleNotificationPreference={toggleNotificationPreference}
            onResetScores={confirmScoreReset}
            familyMembersForGameProgressReset={familyMembersForPodium.map((member) => ({
              profileId: member.profileId,
              surname: member.surname,
            }))}
            onResetGameProgress={confirmGameProgressReset}
            isOnline={isOnline}
            lastSyncAt={currentProfileLastSyncAt}
          />
        );
      default:
        if (IS_DEV) {
          console.info(`[navigation] Unknown screen "${screen}" in phase "${phase}". Falling back to dashboard.`);
        }
        return <DashboardScreen
            quickActions={visibleQuickActions}
          canAccessChecklist={canAccessScreen(profile.role, phase, "checklist")}
            canAccessOfflineMedia={canAccessScreen(profile.role, phase, "offline-media")}
            canPlayArcade={
              canAccessScreen(profile.role, phase, "jeux") ||
              (postTripReplayEnabled && profile.role === "visiteur")
            }
            showVisitorLockedActions={profile.role === "visiteur"}
            allowVisitorGamePostTripReplay={postTripReplayEnabled}
            allowVisitorArcadePostTripReplay={postTripReplayEnabled}
            isOnline={isOnline}
            onNavigate={goToScreen}
          onStartTutorial={startAccueilTutorial}
            currentDay={currentDay}
            tripStartDate={tripStartDate}
            totalDays={totalDays}
            todayDestination={todayDestination}
            todaySubtitle={todaySubtitle}
            tripFinished={tripFinished}
            daysUntilStart={daysUntilStart}
            todayFormatted={todayFormatted}
            profileSurname={profile.surname}
          />;
    }
  };

  return (
    <div className="min-h-screen bg-[#B8A898] md:flex md:items-center md:justify-center md:p-6">
      <div className="relative w-full md:max-w-[390px] h-screen md:h-[844px] bg-background overflow-hidden flex flex-col md:rounded-[3rem] md:shadow-2xl">
        {!isOnline && <OfflineBanner />}
        {accessDeniedMessage && (
          <div className="absolute left-1/2 top-4 z-50 -translate-x-1/2 px-4">
            <div className="rounded-full bg-destructive px-4 py-2 text-xs font-black tracking-[0.02em] text-destructive-foreground shadow-lg">
              {accessDeniedMessage}
            </div>
          </div>
        )}
        {renderScreen()}
        {!launchGateForced && visibleBottomNavItems.length > 0 && (effectiveScreen !== "checklist" || canAccessScreen(profile.role, phase, "dashboard")) && (
          <BottomNav current={effectiveScreen} items={visibleBottomNavItems} onNavigate={goToScreen} />
        )}
        {pendingScreen && (
          <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center px-6">
            <div className="bg-card rounded-2xl p-6 max-w-xs w-full text-center shadow-2xl">
              <div className="text-5xl mb-3">🚫</div>
              <p className="text-lg font-black text-foreground mb-2">
                Impossible de quitter maintenant
              </p>
              <p className="text-sm text-muted-foreground mb-6">
                {gameState === "playing"
                  ? "Vous devez terminer le quiz avant de changer d'écran."
                  : "Vous devez valider l'énigme avant de changer d'écran."}
              </p>
              <button
                onClick={() => setPendingScreen(null)}
                className="w-full bg-primary text-primary-foreground rounded-2xl py-3 font-black active:scale-95 transition-transform"
              >
                Continuer
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
