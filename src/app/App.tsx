import { useState, useEffect, useRef, type ReactNode } from "react";
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
} from "lucide-react";
import { MapScreen } from "./MapScreen";
import { TRIP } from "../content/trip";
import { PLACES } from "../content/places";
import { HISTOIRE_TOPICS } from "../content/histoire";
import { GEOGRAPHIE_ECONOMIE_TOPICS } from "../content/geographie-economie";
import { CULTURE_TRADITION_TOPICS } from "../content/culture-tradition";
import {
  CHALLENGE_POINTS,
  getChallengeForDay,
  getQuestionsForDay,
  getRiddleForDay,
  QUESTION_POINTS,
  RIDDLE_POINTS,
  type DailyChallenge,
  type DailyRiddle,
  type QuizQuestion,
} from "../content/game";
import { TIPS } from "../content/tips";
import { getScheduledCoordinates, getWeatherAdvice, useDeviceLocation, useWeather } from "./weather";
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
import { computePodium, type PodiumProfileInput } from "./podium";
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
  LAUNCH_VIDEO_SRC,
  getNextLaunchGateCycle,
  shouldForceLaunchGate,
} from "./launch-gate";

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
];

const CUSTOM_PROFILE_CHECKLIST_STORAGE_KEY = "jp-custom-checklist-items-by-profile";
const OWNER_GLOBAL_CHECKLIST_ADDITIONS_KEY = "jp-owner-global-checklist-additions";
const OWNER_GLOBAL_CHECKLIST_REMOVALS_KEY = "jp-owner-global-checklist-removals";
const PROFILE_RECOVERY_QUESTION_STORAGE_KEY = "jp-profile-recovery-questions";
const PROFILE_RECOVERY_ANSWER_STORAGE_KEY = "jp-profile-recovery-answers";
const PLACE_COMMENTS_STORAGE_KEY = "jp-place-comments";
const DESTINATION_SURVEY_STORAGE_KEY = "jp-destination-survey";
const LAUNCH_GATE_CYCLE_STORAGE_KEY = "jp-launch-gate-cycle";
const LAUNCH_GATE_COMPLETED_CYCLE_STORAGE_KEY = "jp-launch-gate-completed-cycle-by-profile";
const LAUNCH_GATE_PENDING_COMPLETION_STORAGE_KEY = "jp-launch-gate-pending-completion-by-profile";
const MAX_PLACE_COMMENT_LENGTH = 500;

// ─── TYPES ───────────────────────────────────────────────────────────────────

type Screen = "checklist" | "dashboard" | "guide" | "planning" | "map" | "place" | "histoire" | "histoire-topic" | "geographie" | "geographie-topic" | "culture" | "culture-topic" | "visite-guidee" | "game" | "results" | "tips" | "settings";
const SCREEN_VALUES: readonly Screen[] = ["checklist", "dashboard", "guide", "planning", "map", "place", "histoire", "histoire-topic", "geographie", "geographie-topic", "culture", "culture-topic", "visite-guidee", "game", "results", "tips", "settings"];
type QuickScreen = "checklist" | "guide" | "map" | "histoire" | "geographie" | "culture" | "game" | "tips" | "results";
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
    id: "map",
    emoji: "🗺️",
    title: "Carte interactive",
    subtitle: "Voir les lieux sur la carte",
    colorBg: "bg-[#E8F0FE]",
    colorText: "text-[#1A73E8]",
  },
  {
    id: "checklist",
    emoji: "🧳",
    title: "Checklist",
    subtitle: "Préparatifs et suivi",
    colorBg: "bg-[#FFF3E0]",
    colorText: "text-[#E65100]",
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
    emoji: "🗺️",
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
    subtitle: "Quiz Turquie",
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
  title,
  subtitle,
  colorBg,
  colorText,
  onClick,
}: {
  tutorialId?: string;
  emoji: string;
  title: string;
  subtitle: string;
  colorBg: string;
  colorText: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      data-tutorial-id={tutorialId}
      className={`${colorBg} rounded-2xl p-4 text-left active:scale-95 transition-transform w-full shadow-sm`}
    >
      <span className="text-3xl mb-2 block">{emoji}</span>
      <p className={`font-black text-sm ${colorText}`}>{title}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
    </button>
  );
}

function ProfileSetupScreen({
  profile,
  ownerAlreadyConfigured,
  travelerCodeConfigured,
  error,
  onSurnameChange,
  onGenderChange,
  onHouseholdRoleChange,
  onContinue,
}: {
  profile: Profile;
  ownerAlreadyConfigured: boolean;
  travelerCodeConfigured: boolean;
  error: string | null;
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
}) {
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [showRecoveryAnswer, setShowRecoveryAnswer] = useState(false);
  const [showRecoveryNewPassword, setShowRecoveryNewPassword] = useState(false);
  const [showRecoveryConfirm, setShowRecoveryConfirm] = useState(false);

  useEffect(() => {
    if (!passwordPromptProfileSurname) {
      setShowPasswordPrompt(false);
      setShowRecoveryAnswer(false);
      setShowRecoveryNewPassword(false);
      setShowRecoveryConfirm(false);
    }
  }, [passwordPromptProfileSurname]);

  useEffect(() => {
    if (profileRecoveryStep !== "recovery") {
      setShowRecoveryAnswer(false);
      setShowRecoveryNewPassword(false);
      setShowRecoveryConfirm(false);
    }
  }, [profileRecoveryStep]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="relative bg-primary text-primary-foreground px-6 pt-12 pb-8 flex-shrink-0">
        <MemphisDecor />
        <div className="relative z-10">
          <p className="text-xs font-extrabold opacity-80 tracking-widest uppercase mb-1">
            ☁️ Connexion famille
          </p>
          <h1 className="text-2xl font-black leading-tight mb-2">
            Se connecter
          </h1>
          <p className="text-sm opacity-90">
            Choisissez un profil existant ou créez le vôtre.
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4">
        {profiles.length > 0 && (
          <div className="bg-card rounded-2xl border border-border p-4">
            <p className="text-xs font-extrabold text-muted-foreground uppercase tracking-widest mb-3">
              Profils existants
            </p>
            <div className="space-y-2">
              {profiles.map((candidate) => {
                const isSelected = selectedProfileId === candidate.id;
                return (
                  <button
                    key={candidate.id}
                    onClick={() => onSelectProfile(candidate.id)}
                    className={`w-full rounded-xl border px-3 py-3 text-left transition-colors ${
                      isSelected
                        ? "border-primary bg-primary/10"
                        : "border-border bg-background"
                    }`}
                  >
                    <p className="text-sm font-black text-foreground">{candidate.surname}</p>
                    <p className="text-[11px] font-bold text-muted-foreground mt-0.5">
                      {candidate.role === "proprietaire"
                        ? "Propriétaire"
                        : candidate.role === "visiteur"
                          ? "Visiteur"
                          : "Voyageur"}
                      {candidate.passwordHash ? " · Protégé" : ""}
                    </p>
                  </button>
                );
              })}
            </div>
            <button
              onClick={onLoginWithSelected}
              className="mt-3 w-full bg-primary text-primary-foreground rounded-xl py-3 text-sm font-black"
            >
              Se connecter avec ce profil
            </button>
          </div>
        )}

        <div className="bg-card rounded-2xl border border-border p-4">
          <p className="text-xs font-extrabold text-muted-foreground uppercase tracking-widest">
            Nouveau profil
          </p>
          <input
            value={createSurname}
            onChange={(e) => onCreateSurnameChange(e.target.value)}
            placeholder="Ex: Maman, Papa, Léo"
            className="mt-2 w-full rounded-xl bg-input-background px-3 py-3 text-sm font-semibold text-foreground outline-none ring-2 ring-transparent focus:ring-primary/30"
          />
          <button
            onClick={onCreateAndContinue}
            className="mt-3 w-full rounded-xl py-3 text-sm font-black border border-border text-foreground"
          >
            Créer un nouveau profil
          </button>
        </div>

        {error && <p className="text-sm font-bold text-destructive">{error}</p>}
      </div>

      {passwordPromptProfileSurname && (
        <div className="absolute inset-0 bg-black/45 backdrop-blur-[1px] flex items-end md:items-center justify-center p-4 z-20">
          <div className="w-full md:max-w-sm bg-card rounded-2xl border border-border p-4">
            {profileRecoveryStep === "recovery" ? (
              <>
                <p className="text-sm font-black text-foreground">Récupérer l'accès au profil</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Répondez à la question de sécurité pour définir un nouveau mot de passe.
                </p>
                <p className="mt-3 text-[11px] font-extrabold text-muted-foreground uppercase tracking-widest">
                  Question de récupération
                </p>
                <p className="mt-1 rounded-xl border border-border bg-muted/30 px-3 py-2 text-sm font-bold text-foreground">
                  {profileRecoveryQuestion || "Question indisponible"}
                </p>
                <div className="relative mt-3">
                  <input
                    type={showRecoveryAnswer ? "text" : "password"}
                    value={profileRecoveryAnswerInput}
                    onChange={(e) => onProfileRecoveryAnswerChange(e.target.value)}
                    placeholder="Réponse"
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
                <div className="relative mt-2">
                  <input
                    type={showRecoveryNewPassword ? "text" : "password"}
                    value={profileRecoveryNewPasswordInput}
                    onChange={(e) => onProfileRecoveryNewPasswordChange(e.target.value)}
                    placeholder="Nouveau mot de passe"
                    className="w-full rounded-xl bg-input-background px-3 py-3 pr-10 text-sm font-semibold text-foreground outline-none ring-2 ring-transparent focus:ring-primary/30"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRecoveryNewPassword((previous) => !previous)}
                    aria-label={showRecoveryNewPassword ? "Masquer le nouveau mot de passe saisi" : "Afficher le nouveau mot de passe saisi"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  >
                    {showRecoveryNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <div className="relative mt-2">
                  <input
                    type={showRecoveryConfirm ? "text" : "password"}
                    value={profileRecoveryNewPasswordConfirmInput}
                    onChange={(e) => onProfileRecoveryNewPasswordConfirmChange(e.target.value)}
                    placeholder="Confirmer le nouveau mot de passe"
                    className="w-full rounded-xl bg-input-background px-3 py-3 pr-10 text-sm font-semibold text-foreground outline-none ring-2 ring-transparent focus:ring-primary/30"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRecoveryConfirm((previous) => !previous)}
                    aria-label={showRecoveryConfirm ? "Masquer la confirmation saisie" : "Afficher la confirmation saisie"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  >
                    {showRecoveryConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {profileRecoveryError && (
                  <p className="mt-2 text-xs font-bold text-destructive">{profileRecoveryError}</p>
                )}
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button
                    onClick={onCancelProfileRecovery}
                    className="rounded-xl py-3 text-sm font-black border border-border text-foreground"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={onConfirmProfileRecoveryReset}
                    className="rounded-xl py-3 text-sm font-black bg-primary text-primary-foreground"
                  >
                    Réinitialiser
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm font-black text-foreground">Profil protégé</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Saisissez le mot de passe du profil {passwordPromptProfileSurname}.
                </p>
                <div className="relative mt-3">
                  <input
                    type={showPasswordPrompt ? "text" : "password"}
                    value={passwordPromptValue}
                    onChange={(e) => onPasswordPromptValueChange(e.target.value)}
                    placeholder="Mot de passe"
                    className="w-full rounded-xl bg-input-background px-3 py-3 pr-10 text-sm font-semibold text-foreground outline-none ring-2 ring-transparent focus:ring-primary/30"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswordPrompt((previous) => !previous)}
                    aria-label={showPasswordPrompt ? "Masquer le mot de passe saisi" : "Afficher le mot de passe saisi"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  >
                    {showPasswordPrompt ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {passwordPromptError && (
                  <p className="mt-2 text-xs font-bold text-destructive">{passwordPromptError}</p>
                )}
                {profileRecoveryQuestion && (
                  <button
                    onClick={onOpenProfileForgotPassword}
                    className="mt-2 text-xs font-black text-primary underline underline-offset-2"
                  >
                    Mot de passe oublié ?
                  </button>
                )}
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button
                    onClick={onCancelPasswordPrompt}
                    className="rounded-xl py-3 text-sm font-black border border-border text-foreground"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={onConfirmPasswordPrompt}
                    className="rounded-xl py-3 text-sm font-black bg-primary text-primary-foreground"
                  >
                    Se connecter
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function CloudLoadingScreen() {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="relative bg-primary text-primary-foreground px-6 pt-12 pb-8 flex-shrink-0">
        <MemphisDecor />
        <div className="relative z-10">
          <p className="text-xs font-extrabold opacity-80 tracking-widest uppercase mb-1">
            ☁️ Synchronisation
          </p>
          <h1 className="text-2xl font-black leading-tight mb-2">Préparation du cloud</h1>
          <p className="text-sm opacity-90">
            Chargement des profils de la famille...
          </p>
        </div>
      </div>
      <div className="flex-1 px-4 py-5">
        <div className="bg-card rounded-2xl border border-border p-4">
          <p className="text-sm font-semibold text-muted-foreground">
            Patientez quelques secondes.
          </p>
        </div>
      </div>
    </div>
  );
}

function CloudAccessErrorScreen({
  reason,
  onRetry,
}: {
  reason: string;
  onRetry?: () => void;
}) {
  const detailsByReason: Record<string, string> = {
    "auth-required": "Authentification cloud requise mais session non disponible.",
    "auth-unavailable": "Authentification cloud indisponible pour le moment.",
    "permission-denied": "Acces cloud refuse. Verifiez les regles Firebase et l appartenance famille.",
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="relative bg-primary text-primary-foreground px-6 pt-12 pb-8 flex-shrink-0">
        <MemphisDecor />
        <div className="relative z-10">
          <p className="text-xs font-extrabold opacity-80 tracking-widest uppercase mb-1">
            ☁️ Synchronisation
          </p>
          <h1 className="text-2xl font-black leading-tight mb-2">Acces cloud bloque</h1>
          <p className="text-sm opacity-90">L application attend une session cloud valide.</p>
        </div>
      </div>
      <div className="flex-1 px-4 py-5">
        <div className="bg-card rounded-2xl border border-border p-4">
          <p className="text-sm font-semibold text-muted-foreground">
            {detailsByReason[reason] || "Erreur cloud non documentee."}
          </p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-4 w-full rounded-xl bg-primary px-3 py-2.5 text-sm font-black text-primary-foreground"
            >
              Reessayer la synchronisation
            </button>
          )}
        </div>
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
          const allDone = catChecked === cat.items.length;
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
  onNavigate,
  onStartTutorial,
  currentDay,
  totalDays,
  todayDestination,
  todaySubtitle,
  tripFinished,
  daysUntilStart,
  todayFormatted,
}: {
  quickActions: QuickAction[];
  onNavigate: (s: Screen) => void;
  onStartTutorial: () => void;
  currentDay: number;
  totalDays: number;
  todayDestination: string;
  todaySubtitle: string;
  tripFinished: boolean;
  daysUntilStart: number | null;
  todayFormatted: string;
}) {
  const [mapLightboxOpen, setMapLightboxOpen] = useState(false);
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
                  : `Jour ${currentDay}`}
              </h1>
              <p className="text-sm opacity-80 font-bold">
                {daysUntilStart !== null ? "avant le départ" : `sur ${totalDays} jours`}
              </p>
            </div>
            <p className="text-sm font-bold opacity-80 text-right pt-1">
              {todayFormatted}
            </p>
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
          onClick={() => onNavigate("guide")}
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

      {/* Tutoriel Accueil */}
      <div className="px-4 mt-3">
        <button
          onClick={onStartTutorial}
          data-tutorial-id="dashboard-start-tutorial"
          className="w-full flex items-center justify-between px-4 py-3 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 active:scale-95 transition-transform"
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">🎯</span>
            <div className="text-left">
              <p className="font-black text-sm text-foreground">Tutoriel interactif</p>
              <p className="text-xs text-muted-foreground">Découvrir l'écran Accueil pas à pas</p>
            </div>
          </div>
          <ChevronRight size={18} className="text-muted-foreground flex-shrink-0" />
        </button>
      </div>

      {/* Quick actions */}
      <div className="px-4 mt-5">
        <p className="text-xs font-extrabold text-muted-foreground uppercase tracking-widest mb-3">
          Accès rapides
        </p>
        <div className="grid grid-cols-2 gap-3">
          {quickActions.map((item) => (
            <ActionCard
              key={item.id}
              tutorialId={`dashboard-quick-${item.id}`}
              emoji={item.emoji}
              title={item.title}
              subtitle={item.subtitle}
              colorBg={item.colorBg}
              colorText={item.colorText}
              onClick={() => onNavigate(item.id)}
            />
          ))}
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
              src="/images/Carte du voyage.png"
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
              src="/images/Carte du voyage.png"
              alt="Carte du circuit du séjour en Turquie"
              className="max-w-full max-h-full object-contain rounded-lg"
            />
          </div>
        </div>
      )}

      {/* Photos du séjour */}
      <div className="px-4 mt-5 mb-6">
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
    </div>
  );
}

// ─── SHARED TYPES ────────────────────────────────────────────────────────────

type ContentTopic = {
  id: string;
  name: string;
  shortDesc: string;
  tag: string;
  image: string;
  photos?: string[];
  audioTitle?: string;
  audioDuration?: string;
  audioSrc?: string;
  history: string;
  historyLabel?: string;
  anecdotes: string[];
  anecdotesLabel?: string;
};

// ─── CONTENT LIST SCREEN (used by Guide and Histoire) ──────────────────────

function ContentListScreen({
  items,
  headerEmoji,
  headerTitle,
  headerSubtitle,
  onBack,
  onItemSelect,
}: {
  items: ContentTopic[];
  headerEmoji: string;
  headerTitle: string;
  headerSubtitle: string;
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
  onBack,
  onDaySelect,
  currentDay,
  tripFinished,
}: {
  onBack: () => void;
  onDaySelect: (day: number) => void;
  currentDay: number;
  tripFinished: boolean;
}) {
  const dayPlaces = PLACES.reduce(
    (acc, place) => {
      const daysForPlace = (place as { jour?: number[] }).jour || [];
      daysForPlace.forEach((day) => {
        if (!acc[day]) {
          acc[day] = [];
        }
        acc[day].push(place);
      });
      return acc;
    },
    {} as Record<number, typeof PLACES>
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
          const places = dayPlaces[dayEntry.jour] || [];
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
                      Jour {dayEntry.jour}
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
                      Pas de détail renseigné
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

// ─── GUIDE SCREEN ────────────────────────────────────────────────────────────

function GuideScreen({
  onBack,
  onPlaceSelect,
  currentDay,
  selectedDay,
  onSelectedDayChange,
  commentsByPlace,
}: {
  onBack: () => void;
  onPlaceSelect: (id: string) => void;
  currentDay: number;
  selectedDay: number;
  onSelectedDayChange: (day: number) => void;
  commentsByPlace: PlaceCommentsByPlace;
}) {
  const [selectorOpen, setSelectorOpen] = useState(false);

  const dayPlaces = PLACES.filter((place) =>
    (place as { jour?: number[] }).jour?.includes(selectedDay)
  );
  const realDurations = useAudioDurations(dayPlaces);
  const selectedEntry = JOURS_DESTINATIONS.find((d) => d.jour === selectedDay) ?? null;

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

        <div className="relative z-20 mt-3">
          <button
            onClick={() => setSelectorOpen((prev) => !prev)}
            data-tutorial-id="guide-day-selector"
            className="w-full flex items-center justify-between bg-white/15 rounded-2xl px-4 py-3 backdrop-blur-sm"
          >
            <span className="text-left">
              <span className="block text-sm font-black">
                Jour {selectedDay}
                {selectedDay === currentDay && (
                  <span className="ml-2 text-[10px] font-black uppercase tracking-widest bg-white/25 rounded-full px-2 py-0.5 align-middle">
                    aujourd'hui
                  </span>
                )}
              </span>
              {selectedEntry && (
                <span className="block text-xs opacity-80 mt-0.5">
                  {selectedEntry.destination}
                </span>
              )}
            </span>
            <ChevronDown
              size={18}
              className={`transition-transform flex-shrink-0 ${selectorOpen ? "rotate-180" : ""}`}
            />
          </button>

          {selectorOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setSelectorOpen(false)}
              />
              <div className="absolute left-0 right-0 mt-2 z-20 bg-card text-foreground rounded-2xl border border-border shadow-lg overflow-hidden max-h-72 overflow-y-auto">
                {JOURS_DESTINATIONS.map((entry) => (
                  <button
                    key={entry.jour}
                    onClick={() => {
                      onSelectedDayChange(entry.jour);
                      setSelectorOpen(false);
                    }}
                    data-tutorial-id={`guide-day-option-${entry.jour}`}
                    className={`w-full flex items-center justify-between px-4 py-3 text-left active:bg-muted transition-colors border-b border-border/60 last:border-b-0 ${
                      entry.jour === selectedDay ? "bg-muted" : ""
                    }`}
                  >
                    <span>
                      <span className="block text-sm font-bold text-foreground">
                        Jour {entry.jour} — {entry.destination}
                      </span>
                    </span>
                    {entry.jour === currentDay && (
                      <span className="text-[10px] font-black uppercase tracking-widest text-primary flex-shrink-0 ml-2">
                        aujourd'hui
                      </span>
                    )}
                  </button>
                ))}
                {JOURS_DESTINATIONS.length === 0 && (
                  <p className="px-4 py-3 text-sm text-muted-foreground">
                    Aucun jour défini pour le moment.
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {dayPlaces.length === 0 && (
          <div className="px-2 py-10 text-center">
            <p className="text-sm text-muted-foreground">
              Pas de visite prévue ce jour.
            </p>
          </div>
        )}
        {dayPlaces.map((item) => {
          const counts = getPlaceReactionCounts(commentsByPlace[item.id]);

          return (
            <button
              key={item.id}
              onClick={() => onPlaceSelect(item.id)}
              data-tutorial-id={`guide-place-${item.id}`}
              className="w-full bg-card rounded-2xl shadow-sm overflow-hidden border border-border text-left active:scale-95 transition-transform"
            >
              <div className="relative h-40 bg-muted overflow-hidden">
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
                    <div className="mt-3 flex items-center justify-between gap-2">
                      <div className="flex flex-wrap gap-2 text-[10px] font-bold text-muted-foreground">
                        <span className="rounded-full bg-muted px-2.5 py-1">
                          {item.photos?.length ?? 1} photos
                        </span>
                        <span className="rounded-full bg-muted px-2.5 py-1">
                          {realDurations[item.id] ?? item.audioDuration ?? "Audio à venir"}
                        </span>
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
          );
        })}
        <div className="h-2" />
      </div>
    </div>
  );
}

// ─── HISTOIRE SCREEN ─────────────────────────────────────────────────────────

function HistoireScreen({
  onBack,
  onTopicSelect,
}: {
  onBack: () => void;
  onTopicSelect: (id: string) => void;
}) {
  return (
    <ContentListScreen
      items={HISTOIRE_TOPICS}
      headerEmoji="🏛️"
      headerTitle="Histoire de Turquie"
      headerSubtitle={`${HISTOIRE_TOPICS.length} rubriques à explorer`}
      onBack={onBack}
      onItemSelect={onTopicSelect}
    />
  );
}

// ─── GÉOGRAPHIE ET ÉCONOMIE SCREEN ──────────────────────────────────────────

function GeographieScreen({
  onBack,
  onTopicSelect,
}: {
  onBack: () => void;
  onTopicSelect: (id: string) => void;
}) {
  return (
    <ContentListScreen
      items={GEOGRAPHIE_ECONOMIE_TOPICS}
      headerEmoji="🗺️"
      headerTitle="Géographie et Économie"
      headerSubtitle={`${GEOGRAPHIE_ECONOMIE_TOPICS.length} rubriques à explorer`}
      onBack={onBack}
      onItemSelect={onTopicSelect}
    />
  );
}

// ─── CULTURE ET TRADITION SCREEN ────────────────────────────────────────────

function CultureScreen({
  onBack,
  onTopicSelect,
}: {
  onBack: () => void;
  onTopicSelect: (id: string) => void;
}) {
  return (
    <ContentListScreen
      items={CULTURE_TRADITION_TOPICS}
      headerEmoji="🎭"
      headerTitle="Culture et Tradition"
      headerSubtitle={`${CULTURE_TRADITION_TOPICS.length} rubriques à explorer`}
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
              {part.slice(2, -2)}
            </strong>
          ) : (
            <span key={i}>{part}</span>
          )
        )}
      </p>
    ));
}

function ContentDetailScreen({
  item,
  onBack,
  onOpenVisiteGuidee,
  visiteGuideeCtaText = "Voir le guide de visite complet",
  visiteGuideeCtaSubtext = "Histoire détaillée, salle par salle",
  extraSection,
  heroReactionCounts,
}: {
  item: ContentTopic;
  onBack: () => void;
  onOpenVisiteGuidee?: (item: ContentTopic) => void;
  visiteGuideeCtaText?: string;
  visiteGuideeCtaSubtext?: string;
  extraSection?: ReactNode;
  heroReactionCounts?: { likes: number; dislikes: number };
}) {
  const visiteGuidee = VISITES_GUIDEES[item.id];
  const photos = item.photos?.length ? item.photos : [item.image];
  const heroPhoto = photos[0] ?? item.image;
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [realDuration, setRealDuration] = useState<string | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const canPlayAudio = Boolean(item.audioSrc);

  useEffect(() => {
    const audio = new Audio(item.audioSrc ?? "");
    audio.muted = isMuted;
    audioRef.current = audio;
    setIsPlaying(false);
    setProgress(0);
    setAudioError(null);
    setRealDuration(null);

    const handleLoadedMetadata = () => {
      const formatted = formatDuration(audio.duration);
      if (formatted) {
        setRealDuration(formatted);
      }
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
  }, [item.audioSrc, item.id]);

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

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="relative h-64 bg-muted flex-shrink-0">
        <img
          src={heroPhoto}
          alt={item.name}
          className="w-full h-full object-cover"
        />
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
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
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
              <div className="mt-2 bg-border rounded-full h-1.5">
                <div
                  className="bg-primary h-1.5 rounded-full transition-all duration-1000"
                  style={{ width: `${progress}%` }}
                />
              </div>
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

        {/* Gallery */}
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

        {/* History */}
        <div className="px-4 mt-5">
          <h2 data-tutorial-id="place-history-title" className="text-base font-black text-foreground mb-2">
            📜 {item.historyLabel ?? "Histoire"}
          </h2>
          <div className="text-sm text-foreground/80 leading-relaxed">
            {renderFormattedText(item.history)}
          </div>
        </div>

        {/* Anecdotes */}
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
  onBack,
  onOpenVisiteGuidee,
}: {
  place: (typeof PLACES)[0];
  profile: Profile;
  familyProfiles: Array<{ id: string; surname: string }>;
  comments: Record<string, PlaceComment>;
  onUpsertComment: (input: { placeId: string; reaction: PlaceCommentReaction | null; text: string }) => void;
  onBack: () => void;
  onOpenVisiteGuidee: (item: ContentTopic) => void;
}) {
  const reactionCounts = getPlaceReactionCounts(comments);

  return (
    <ContentDetailScreen
      item={place}
      onBack={onBack}
      onOpenVisiteGuidee={onOpenVisiteGuidee}
      heroReactionCounts={reactionCounts}
      extraSection={
        <PlaceCommentsSection
          placeId={place.id}
          comments={comments}
          profile={profile}
          familyProfiles={familyProfiles}
          onUpsert={onUpsertComment}
        />
      }
    />
  );
}

// ─── HISTOIRE TOPIC DETAIL SCREEN ────────────────────────────────────────────

function HistoireTopicScreen({
  topic,
  onBack,
  onOpenVisiteGuidee,
}: {
  topic: (typeof HISTOIRE_TOPICS)[0];
  onBack: () => void;
  onOpenVisiteGuidee: (item: ContentTopic) => void;
}) {
  return (
    <ContentDetailScreen
      item={topic}
      onBack={onBack}
      onOpenVisiteGuidee={onOpenVisiteGuidee}
      visiteGuideeCtaText="Pour en savoir plus"
      visiteGuideeCtaSubtext=""
    />
  );
}

function GeographieTopicScreen({
  topic,
  onBack,
  onOpenVisiteGuidee,
}: {
  topic: (typeof GEOGRAPHIE_ECONOMIE_TOPICS)[0];
  onBack: () => void;
  onOpenVisiteGuidee: (item: ContentTopic) => void;
}) {
  return (
    <ContentDetailScreen
      item={topic}
      onBack={onBack}
      onOpenVisiteGuidee={onOpenVisiteGuidee}
      visiteGuideeCtaText="Pour en savoir plus"
      visiteGuideeCtaSubtext=""
    />
  );
}

function CultureTopicScreen({
  topic,
  onBack,
  onOpenVisiteGuidee,
}: {
  topic: (typeof CULTURE_TRADITION_TOPICS)[0];
  onBack: () => void;
  onOpenVisiteGuidee: (item: ContentTopic) => void;
}) {
  return (
    <ContentDetailScreen
      item={topic}
      onBack={onBack}
      onOpenVisiteGuidee={onOpenVisiteGuidee}
      visiteGuideeCtaText="Pour en savoir plus"
      visiteGuideeCtaSubtext=""
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
  challengeDone,
  onStart,
  onAnswer,
  onBack,
  onContinueToRiddle,
  onRiddleAnswerChange,
  onValidateRiddle,
  onContinueToChallenge,
  onCompleteChallenge,
  currentDay,
  alreadyPlayedToday,
  gameDayOverride,
  questions,
  riddle,
  challenge,
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
  challengeDone: boolean;
  onStart: () => void;
  onAnswer: (idx: number) => void;
  onBack: () => void;
  onContinueToRiddle: () => void;
  onRiddleAnswerChange: (value: string) => void;
  onValidateRiddle: () => void;
  onContinueToChallenge: () => void;
  onCompleteChallenge: () => void;
  currentDay: number;
  alreadyPlayedToday: GameHistoryEntry | null;
  gameDayOverride: "open" | "closed" | null;
  questions: QuizQuestion[];
  riddle: DailyRiddle;
  challenge: DailyChallenge;
}) {
  // Garde-fou défensif : currentQ ne doit jamais dépasser la dernière
  // question (sinon questions[currentQ] est undefined et fait planter tout
  // l'écran — bug vécu le 2026-08-01 via une resynchronisation cloud trop
  // agressive, corrigé à la source, mais ce clamp reste une sécurité utile).
  const q = questions[Math.min(currentQ, questions.length - 1)];

  if (gameState === "intro") {
    const isClosedByOwner = gameDayOverride === "closed";
    const isLockedByCompletion = gameDayOverride !== "open" && alreadyPlayedToday !== null;

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
            Quiz Turquie — Jour {currentDay}
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
            <p className="text-sm text-muted-foreground mb-6">
              Chaque bonne réponse rapporte{" "}
              <strong className="text-primary">{QUESTION_POINTS} points</strong> à l&apos;équipe !
            </p>
            <p className="text-xs font-bold text-[#C62828] bg-[#FFEBEE] rounded-xl px-4 py-3 mb-8 text-left">
              ⚠️ Une fois lancé, impossible de quitter le jeu avant de l&apos;avoir terminé (quiz,
              énigme puis défi photo). Mieux vaut y jouer en fin de journée, une fois toutes les
              visites terminées.
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
            Bonus de {RIDDLE_POINTS} points si la réponse est correcte
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
              disabled={riddleValidated}
            />
            {!riddleValidated && (
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
                  riddleSolved ? "text-[#2E7D32]" : "text-[#C62828]"
                }`}
              >
                {riddleFeedback}
              </p>
            )}
          </div>

          {riddleValidated && (
            <button
              onClick={onContinueToChallenge}
              className="mt-4 w-full bg-primary text-primary-foreground rounded-2xl py-4 text-sm font-black"
            >
              Continuer vers le défi 💪
            </button>
          )}
        </div>
      </div>
    );
  }

  if (gameState === "challenge") {
    return (
      <div className="flex flex-col h-full overflow-y-auto">
        <div className="relative bg-[#FF6B3D] text-white px-6 pt-12 pb-6 flex-shrink-0">
          <MemphisDecor />
          <h1 className="relative z-10 text-2xl font-black">Défi du jour 💪</h1>
          <p className="relative z-10 text-sm opacity-90 mt-1">
            {CHALLENGE_POINTS} points si le défi est accompli
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
            <p className="mt-3 text-xs text-muted-foreground">
              Une fois le défi terminé, le jeu du jour se termine : impossible d&apos;y revenir ensuite.
            </p>
            <button
              onClick={onCompleteChallenge}
              disabled={challengeDone}
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
            {answers.filter((a, i) => a === questions[i]?.correct).length * QUESTION_POINTS} pts
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
  currentProfileId,
  destinationSurveyDestination,
  destinationSurveyResults,
}: {
  onBack: () => void;
  history: GameHistoryEntry[];
  familyMembers: PodiumProfileInput[];
  currentDay: number;
  currentProfileId: string;
  destinationSurveyDestination: string;
  destinationSurveyResults: ReturnType<typeof computeDestinationSurveyResults>["rows"];
}) {
  const chartMembers = familyMembers.filter((member) => member.role !== "proprietaire");
  const visibleDestinationSurveyResults = destinationSurveyResults.filter(
    (row) => row.role !== "proprietaire"
  );
  const [chartProfileId, setChartProfileId] = useState(
    () => chartMembers.some((m) => m.profileId === currentProfileId)
      ? currentProfileId
      : (chartMembers[0]?.profileId ?? currentProfileId)
  );

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
            Défi du jour {currentDay} — qui a joué ?
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
                  {latestEntry.riddleSolved ? `+${RIDDLE_POINTS} pts` : "0 pt"}
                </p>
              </div>
              <div className="rounded-xl bg-[#E3F2FD] p-3">
                <p className="text-xs text-muted-foreground">Défi</p>
                <p className="font-black text-foreground">
                  {latestEntry.challengeDone ? `+${CHALLENGE_POINTS} pts` : "0 pt"}
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
              {dailyScores.map((d) => (
                <div key={d.day} className="flex items-center gap-3">
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
                </div>
              ))}
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

        <div className="h-2" />
      </div>
    </div>
  );
}

// ─── TIPS SCREEN ─────────────────────────────────────────────────────────────

function TipsScreen({ onBack, currentDay }: { onBack: () => void; currentDay: number }) {
  const dayEntry = JOURS_DESTINATIONS.find((d) => d.jour === currentDay) as
    | Record<string, unknown>
    | undefined;
  const { coords: deviceCoords } = useDeviceLocation();
  const scheduledCoords = getScheduledCoordinates(dayEntry);
  const activeCoords = deviceCoords ?? scheduledCoords;
  const { weather, loading: weatherLoading, error: weatherError } = useWeather(activeCoords);
  const [tab, setTab] = useState<
    "transport" | "customs" | "dictionary" | "payment" | "emergency" | "food"
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
    { id: "transport" as const, label: "🚆 Transport" },
    { id: "customs" as const, label: "🙏 Coutumes" },
    { id: "dictionary" as const, label: "🗣️ Dico" },
    { id: "payment" as const, label: "💳 Paiement" },
    { id: "emergency" as const, label: "🚨 Urgences" },
    { id: "food" as const, label: "🍽️ Cuisine" },
  ];
  const content = {
    transport: TIPS.transport,
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
                On y va :
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
                <source src={LAUNCH_VIDEO_SRC} type="video/mp4" />
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
  onSaveTripStartDate: (date: string) => { ok: boolean; message: string };
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
}) {
  const [surnameInput, setSurnameInput] = useState(profile.surname);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [tripStartDateInput, setTripStartDateInput] = useState(tripStartDate ?? "");
  const [tripStartDateFeedback, setTripStartDateFeedback] = useState<string | null>(null);
  useEffect(() => {
    setTripStartDateInput(tripStartDate ?? "");
  }, [tripStartDate]);
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
  const notificationTogglesDisabled =
    !notificationsSupported || notificationPermissionStatus === "denied";

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
            className="mt-3 w-full bg-primary text-primary-foreground rounded-xl py-3 text-sm font-black"
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
                className={`rounded-xl py-2 text-xs font-black border transition-colors ${
                  selectedGender === g
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-foreground"
                }`}
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
                className={`rounded-xl py-2 text-xs font-black border transition-colors ${
                  selectedHouseholdRole === r
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-foreground"
                }`}
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
                  className="mt-3 w-full bg-primary text-primary-foreground rounded-xl py-3 text-sm font-black"
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
                    className="mt-3 w-full bg-primary text-primary-foreground rounded-xl py-3 text-sm font-black"
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
                        className="rounded-xl py-3 text-sm font-black bg-primary text-primary-foreground"
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
              className="mt-3 w-full bg-primary text-primary-foreground rounded-xl py-3 text-sm font-black"
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
              Détermine le "Jour 1" affiché à toute la famille. Tant que la date
              du jour ne dépasse pas cette date, l'application affiche Jour 1.
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
              onClick={() => {
                const result = onSaveTripStartDate(tripStartDateInput);
                setTripStartDateFeedback(result.message);
              }}
              className="mt-2 w-full rounded-xl bg-primary text-primary-foreground font-black text-sm py-2.5 active:scale-95 transition-transform"
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
              className="mt-3 w-full bg-primary text-primary-foreground rounded-xl py-3 text-sm font-black"
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
                className="mt-3 w-full bg-primary text-primary-foreground rounded-xl py-3 text-sm font-black"
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
                    disabled={!ownerLockActionsEnabled}
                    className="mt-3 w-full rounded-xl py-3 text-sm font-black border border-border text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
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
                    className="mt-2 w-full rounded-xl py-3 text-sm font-black border border-border text-foreground"
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
                          className="rounded-xl py-3 text-sm font-black bg-primary text-primary-foreground"
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
              Jour {currentDay} —{" "}
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
                disabled={gameDayOverride === "open"}
                className="w-full rounded-xl py-3 text-sm font-black border border-border text-foreground disabled:opacity-40"
              >
                Forcer l&apos;ouverture du jour {currentDay}
              </button>
              <button
                onClick={() => {
                  setPendingDayOverrideAction("closed");
                  setDayOverrideCodeInput("");
                  setDayOverrideFeedback(null);
                  setShowDayOverrideCodeInput(false);
                  setShowDayOverridePrompt(true);
                }}
                disabled={gameDayOverride === "closed"}
                className="w-full rounded-xl py-3 text-sm font-black border border-border text-foreground disabled:opacity-40"
              >
                Forcer la fermeture du jour {currentDay}
              </button>
              <button
                onClick={() => {
                  setPendingDayOverrideAction(null);
                  setDayOverrideCodeInput("");
                  setDayOverrideFeedback(null);
                  setShowDayOverrideCodeInput(false);
                  setShowDayOverridePrompt(true);
                }}
                disabled={gameDayOverride === null}
                className="w-full rounded-xl py-3 text-sm font-black border border-border text-foreground disabled:opacity-40"
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
                  ? `forcer l'ouverture du jour ${currentDay}`
                  : pendingDayOverrideAction === "closed"
                    ? `forcer la fermeture du jour ${currentDay}`
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
                  className="rounded-xl py-3 text-sm font-black bg-primary text-primary-foreground"
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
              className="mt-3 w-full rounded-xl py-3 text-sm font-black border border-destructive text-destructive"
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
                    Jour {day}
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
                className="rounded-xl py-3 px-4 text-sm font-black border border-destructive text-destructive"
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
                className="rounded-xl py-3 px-4 text-sm font-black border border-destructive text-destructive"
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
                  className="rounded-xl py-3 text-sm font-black bg-destructive text-destructive-foreground"
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
                  : `la réinitialisation des scores du jour ${pendingScoreResetAction.day}`}
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
                  className="rounded-xl py-3 text-sm font-black bg-destructive text-destructive-foreground"
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
              className="mt-3 w-full rounded-xl py-3 text-sm font-black border border-border text-foreground"
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
              className="mt-3 w-full rounded-xl py-3 text-sm font-black border border-destructive text-destructive"
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
                className="rounded-xl py-3 text-sm font-black bg-primary text-primary-foreground"
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
                    className="rounded-xl py-3 text-sm font-black bg-destructive text-destructive-foreground"
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
                    className="rounded-xl py-3 text-sm font-black bg-destructive text-destructive-foreground"
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
                    className="rounded-xl py-3 text-sm font-black bg-destructive text-destructive-foreground"
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
  const [challengeDone, setChallengeDone] = useState(false);
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
    gameState === "playing" || gameState === "done" || gameState === "riddle" || gameState === "challenge"
      ? {
          day: currentDay,
          phase: gameState === "done" ? "riddle" : gameState,
          answers,
          quizStartedAt,
          quizDurationSec,
          riddleValidated,
          riddleSolved,
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
      if (!canAccessScreen(profile.role, phase, screen)) {
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
        localStorage.removeItem(CUSTOM_PROFILE_CHECKLIST_STORAGE_KEY);
        localStorage.removeItem(OWNER_GLOBAL_CHECKLIST_ADDITIONS_KEY);
        localStorage.removeItem(OWNER_GLOBAL_CHECKLIST_REMOVALS_KEY);
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
            PLACE_COMMENTS_STORAGE_KEY,
            JSON.stringify(placeCommentsByPlace)
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
    placeCommentsByPlace,
    destinationSurveyVotes,
    launchGateCycle,
    launchGateCompletedCycleByProfile,
    unlockFailedAttempts,
    unlockLockedUntil,
    gameHistory,
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
    setPhase((previous) => (previous === cloudSnapshot.phase ? previous : cloudSnapshot.phase));
    const nextLaunchGateCycle =
      typeof cloudSnapshot.launchGateCycle === "number" && Number.isFinite(cloudSnapshot.launchGateCycle)
        ? Math.max(0, Math.floor(cloudSnapshot.launchGateCycle))
        : 0;
    setLaunchGateCycle((previous) =>
      previous === nextLaunchGateCycle ? previous : nextLaunchGateCycle
    );
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
    setGameHistory((previous) =>
      areGameHistoriesEqual(previous, cloudProfile.gameResults) ? previous : cloudProfile.gameResults
    );

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
      if (cloudProgress.riddleValidated) {
        setRiddleFeedback(
          cloudProgress.riddleSolved
            ? `Bonne réponse ! Vous gagnez ${RIDDLE_POINTS} points.`
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
  }, [cloudEnabled, cloudSnapshot, isAuthenticated, profile.id, currentDay]);

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
    const isAwaitingCommittedPhase = pendingCloudPhaseRef.current === phase;
    const isPhaseSynced = cloudSnapshot
      ? phase === cloudSnapshot.phase || isAwaitingCommittedPhase
      : false;
    setIsProfileHydrationPending(hasCloudProfile && (!isHydratedProfile || !isPhaseSynced));
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
    const canWriteFamilyState =
      canUpdateOwnerCode(normalized, profile.id) && isOwnerCodeHash(ownerCodeHash.trim());
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
      destinationSurveyVote: destinationSurveyVotes[profile.id] ?? null,
      launchGateCycle,
      launchGateCompletedCycleForProfile: launchGateCompletedCycleByProfile[profile.id] ?? null,
      phase,
      tripStartDate,
      gameHistory,
      currentGameProgress,
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
      profileDestinationSurveyVote: destinationSurveyVotes[profile.id] ?? null,
      launchGateCycle,
      launchGateCompletedCycleForProfile: launchGateCompletedCycleByProfile[profile.id] ?? null,
      gameResults: gameHistory,
      gameProgress: currentGameProgress,
      phase,
      tripStartDate,
    });
  }, [
    checked,
    cloudEnabled,
    cloudSnapshot,
    cloudReady,
    cloudActorUid,
    familyState,
    gameHistory,
    gameState,
    currentDay,
    answers,
    quizStartedAt,
    quizDurationSec,
    riddleValidated,
    riddleSolved,
    isAuthenticated,
    isAuthBootstrapPending,
    ownerCodeHash,
    ownerCodePlain,
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
    placeCommentsByPlace,
    destinationSurveyVotes,
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

    if (!canAccessScreen(profile.role, phase, screen)) {
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
    if (!canAccessScreen(profile.role, phase, s)) {
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
  // - "done" (récap du quiz) et "challenge" (défi photo) autorisent à
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

    setAccessDeniedMessage(null);
    setSelectedPlaceId(id);
    setScreen("place");
  };

  const place = PLACES.find((p) => p.id === selectedPlaceId);

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

  const histoireTopic = HISTOIRE_TOPICS.find((t) => t.id === selectedTopicId);

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

  const geographieTopic = GEOGRAPHIE_ECONOMIE_TOPICS.find((t) => t.id === selectedGeographieTopicId);

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

  const cultureTopic = CULTURE_TRADITION_TOPICS.find((t) => t.id === selectedCultureTopicId);

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
    const canWriteFamilyState = profile.role === "proprietaire" || canUpdateOwnerCode(normalizedFamilyState, profile.id);
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
          ? `Jour ${currentDay} ouvert manuellement.`
          : value === "closed"
            ? `Jour ${currentDay} fermé manuellement.`
            : `Jour ${currentDay} repassé en automatique.`,
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

    setUnlockFailedAttempts(0);
    setUnlockLockedUntil(0);
    setNowTs(Date.now());

    return {
      ok: true,
      message:
        action.kind === "all"
          ? "Tous les scores ont été réinitialisés."
          : `Les scores du jour ${action.day} ont été réinitialisés.`,
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

  const todaysQuestions = getQuestionsForDay(currentDay);
  const todaysRiddle = getRiddleForDay(currentDay);
  const todaysChallenge = getChallengeForDay(currentDay);

  const localGameProgressCheckedRef = useRef(false);
  useEffect(() => {
    if (cloudEnabled) return; // Mode cloud : géré par l'effet d'hydratation cloud.
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
      }
      return;
    }

    if (progress.riddleValidated) {
      setRiddleFeedback(
        progress.riddleSolved
          ? `Bonne réponse ! Vous gagnez ${RIDDLE_POINTS} points.`
          : `Pas tout à fait. La bonne réponse était "${todaysRiddle.answer}".`
      );
    }
  }, [cloudEnabled, currentDay, gameState, todaysRiddle.answer]);

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
  const gameScore = correctCount * QUESTION_POINTS;
  const riddleScore = riddleSolved ? RIDDLE_POINTS : 0;

  const validateRiddle = () => {
    const normalizedInput = normalizeAnswer(riddleAnswer);
    if (!normalizedInput) {
      setRiddleFeedback("Entrez une réponse avant de valider.");
      setRiddleSolved(false);
      return;
    }

    const solved = normalizedInput === normalizeAnswer(todaysRiddle.answer);
    setRiddleValidated(true);
    setRiddleSolved(solved);
    setRiddleFeedback(
      solved
        ? `Bonne réponse ! Vous gagnez ${RIDDLE_POINTS} points.`
        : `Pas tout à fait. La bonne réponse était "${todaysRiddle.answer}".`
    );
  };

  // Terminer le défi photo termine immédiatement la session du jour (pas de
  // bouton "Voir les résultats" séparé) : le défi photo est donc désormais
  // obligatoire pour clore la journée, et il n'y a plus de retour possible
  // ensuite (alreadyPlayedToday verrouille l'écran "game" dès que
  // gameHistory contient une entrée pour currentDay).
  const completeChallengeAndFinishSession = () => {
    const entry: GameHistoryEntry = {
      day: currentDay,
      location: todayDestination,
      quizScore: gameScore,
      correctCount,
      riddleSolved,
      challengeDone: true,
      durationSec: quizDurationSec,
      totalScore: gameScore + riddleScore + CHALLENGE_POINTS,
      completedAt: new Date().toISOString(),
    };

    setGameHistory((previous) => upsertGameHistory(previous, entry));
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
    setChallengeDone(false);
    setScreen("results");
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
        gameResults: selected.gameResults,
        gameProgress: selected.gameProgress,
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

  const visibleQuickActions = QUICK_ACTIONS.filter((item) =>
    canAccessScreen(profile.role, phase, item.id)
  );
  const visibleBottomNavItems = BOTTOM_NAV_ITEMS.filter((item) =>
    canAccessScreen(profile.role, phase, item.id)
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
  });
  const destinationSurveyPointsByProfile = new Map(
    destinationSurveyResults.rows.map((row) => [row.profileId, row.points] as const)
  );
  const familyMembersForPodium: PodiumProfileInput[] = cloudSnapshot
    ? Object.values(cloudSnapshot.profiles).map((item) => ({
        profileId: item.profileId,
        surname: item.surname,
        role: item.role,
        gameResults: item.gameResults,
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
  const effectiveScreen = canAccessScreen(profile.role, phase, screen)
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
    void startGlobalTutorial();
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
          passwordPromptProfileSurname={
            passwordPromptProfileId
              ? cloudSnapshot?.profiles[passwordPromptProfileId]?.surname || null
              : null
          }
          profileRecoveryStep={profileRecoveryStep}
          profileRecoveryQuestion={
            passwordPromptProfileId
              ? cloudSnapshot?.profiles[passwordPromptProfileId]?.recoveryQuestion ?? null
              : null
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
            const targetProfileId = passwordPromptProfileId;
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
                gameResults: selected.gameResults,
                gameProgress: selected.gameProgress,
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
              }

              if (cloudEnabled) {
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

    if (phase === "before") {
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
            onSaveTripStartDate={(date) => {
              if (!canUpdateOwnerCode(familyState, profile.id)) {
                return {
                  ok: false,
                  message: "Seul le profil propriétaire peut configurer la date de début.",
                };
              }
              if (!isValidTripStartDate(date)) {
                return { ok: false, message: "Merci de choisir une date valide." };
              }
              pendingTripStartDateRef.current = date;
              setTripStartDate(date);
              return { ok: true, message: "Date de début du voyage mise à jour." };
            }}
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
          />
        );
      }

      if (effectiveScreen === "dashboard") {
        return <DashboardScreen
            quickActions={visibleQuickActions}
            onNavigate={goToScreen}
            onStartTutorial={startAccueilTutorial}
            currentDay={currentDay}
            totalDays={totalDays}
            todayDestination={todayDestination}
            todaySubtitle={todaySubtitle}
            tripFinished={tripFinished}
            daysUntilStart={daysUntilStart}
            todayFormatted={todayFormatted}
          />;
      }

      if (effectiveScreen === "guide") {
        return (
          <GuideScreen
            onBack={() => goToScreen("dashboard")}
            onPlaceSelect={openPlace}
            currentDay={currentDay}
            selectedDay={guideSelectedDay ?? currentDay}
            onSelectedDayChange={setGuideSelectedDay}
            commentsByPlace={placeCommentsByPlace}
          />
        );
      }

      if (effectiveScreen === "planning") {
        return (
          <PlanningScreen
            onBack={() => goToScreen("dashboard")}
            onDaySelect={(day) => {
              setGuideSelectedDay(day);
              goToScreen("guide");
            }}
            currentDay={currentDay}
            tripFinished={tripFinished}
          />
        );
      }

      if (effectiveScreen === "map") {
        return (
          <MapScreen
            onBack={() => goToScreen("dashboard")}
            currentDay={currentDay}
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
            onBack={() => goToScreen("guide")}
            onOpenVisiteGuidee={(item) => openVisiteGuidee(item, "place")}
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
            onBack={() => goToScreen("dashboard")}
            onTopicSelect={openHistoireTopic}
          />
        );
      }

      if (effectiveScreen === "histoire-topic") {
        return histoireTopic ? (
          <HistoireTopicScreen
            topic={histoireTopic}
            onBack={() => goToScreen("histoire")}
            onOpenVisiteGuidee={(item) => openVisiteGuidee(item, "histoire-topic")}
          />
        ) : null;
      }

      if (effectiveScreen === "geographie") {
        return (
          <GeographieScreen
            onBack={() => goToScreen("dashboard")}
            onTopicSelect={openGeographieTopic}
          />
        );
      }

      if (effectiveScreen === "geographie-topic") {
        return geographieTopic ? (
          <GeographieTopicScreen
            topic={geographieTopic}
            onBack={() => goToScreen("geographie")}
            onOpenVisiteGuidee={(item) => openVisiteGuidee(item, "geographie-topic")}
          />
        ) : null;
      }

      if (effectiveScreen === "culture") {
        return (
          <CultureScreen
            onBack={() => goToScreen("dashboard")}
            onTopicSelect={openCultureTopic}
          />
        );
      }

      if (effectiveScreen === "culture-topic") {
        return cultureTopic ? (
          <CultureTopicScreen
            topic={cultureTopic}
            onBack={() => goToScreen("culture")}
            onOpenVisiteGuidee={(item) => openVisiteGuidee(item, "culture-topic")}
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
            challengeDone={challengeDone}
            currentDay={currentDay}
            alreadyPlayedToday={alreadyPlayedToday}
            gameDayOverride={gameDayOverride}
            questions={todaysQuestions}
            riddle={todaysRiddle}
            challenge={todaysChallenge}
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
            onContinueToChallenge={() => setGameState("challenge")}
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
            currentProfileId={profile.id}
            destinationSurveyDestination={todayDestination}
            destinationSurveyResults={destinationSurveyResults.rows}
          />
        );
      }

      if (effectiveScreen === "tips") {
        return <TipsScreen onBack={() => goToScreen("dashboard")} currentDay={currentDay} />;
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
            onNavigate={goToScreen}
            onStartTutorial={startAccueilTutorial}
            currentDay={currentDay}
            totalDays={totalDays}
            todayDestination={todayDestination}
            todaySubtitle={todaySubtitle}
            tripFinished={tripFinished}
            daysUntilStart={daysUntilStart}
            todayFormatted={todayFormatted}
          />;
      case "guide":
        return (
          <GuideScreen
            onBack={() => goToScreen("dashboard")}
            onPlaceSelect={openPlace}
            currentDay={currentDay}
            selectedDay={guideSelectedDay ?? currentDay}
            onSelectedDayChange={setGuideSelectedDay}
            commentsByPlace={placeCommentsByPlace}
          />
        );
      case "planning":
        return (
          <PlanningScreen
            onBack={() => goToScreen("dashboard")}
            onDaySelect={(day) => {
              setGuideSelectedDay(day);
              goToScreen("guide");
            }}
            currentDay={currentDay}
            tripFinished={tripFinished}
          />
        );
      case "map":
        return (
          <MapScreen
            onBack={() => goToScreen("dashboard")}
            currentDay={currentDay}
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
            onBack={() => goToScreen("guide")}
            onOpenVisiteGuidee={(item) => openVisiteGuidee(item, "place")}
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
            onBack={() => goToScreen("dashboard")}
            onTopicSelect={openHistoireTopic}
          />
        );
      case "histoire-topic":
        return histoireTopic ? (
          <HistoireTopicScreen
            topic={histoireTopic}
            onBack={() => goToScreen("histoire")}
            onOpenVisiteGuidee={(item) => openVisiteGuidee(item, "histoire-topic")}
          />
        ) : null;
      case "geographie":
        return (
          <GeographieScreen
            onBack={() => goToScreen("dashboard")}
            onTopicSelect={openGeographieTopic}
          />
        );
      case "geographie-topic":
        return geographieTopic ? (
          <GeographieTopicScreen
            topic={geographieTopic}
            onBack={() => goToScreen("geographie")}
            onOpenVisiteGuidee={(item) => openVisiteGuidee(item, "geographie-topic")}
          />
        ) : null;
      case "culture":
        return (
          <CultureScreen
            onBack={() => goToScreen("dashboard")}
            onTopicSelect={openCultureTopic}
          />
        );
      case "culture-topic":
        return cultureTopic ? (
          <CultureTopicScreen
            topic={cultureTopic}
            onBack={() => goToScreen("culture")}
            onOpenVisiteGuidee={(item) => openVisiteGuidee(item, "culture-topic")}
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
            challengeDone={challengeDone}
            currentDay={currentDay}
            alreadyPlayedToday={alreadyPlayedToday}
            gameDayOverride={gameDayOverride}
            questions={todaysQuestions}
            riddle={todaysRiddle}
            challenge={todaysChallenge}
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
            onContinueToChallenge={() => setGameState("challenge")}
            onCompleteChallenge={completeChallengeAndFinishSession}
          />
        );
      case "results":
        return (
          <ResultsScreen
            onBack={() => goToScreen("dashboard")}
            history={gameHistory}
            familyMembers={familyMembersForPodium}
            currentDay={currentDay}
            destinationSurveyDestination={todayDestination}
            destinationSurveyResults={destinationSurveyResults.rows}
            currentProfileId={profile.id}
          />
        );
      case "tips":
        return <TipsScreen onBack={() => goToScreen("dashboard")} currentDay={currentDay} />;
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
            onSaveTripStartDate={(date) => {
              if (!canUpdateOwnerCode(familyState, profile.id)) {
                return {
                  ok: false,
                  message: "Seul le profil propriétaire peut configurer la date de début.",
                };
              }
              if (!isValidTripStartDate(date)) {
                return { ok: false, message: "Merci de choisir une date valide." };
              }
              pendingTripStartDateRef.current = date;
              setTripStartDate(date);
              return { ok: true, message: "Date de début du voyage mise à jour." };
            }}
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
          />
        );
      default:
        if (IS_DEV) {
          console.info(`[navigation] Unknown screen "${screen}" in phase "${phase}". Falling back to dashboard.`);
        }
        return <DashboardScreen
            quickActions={visibleQuickActions}
            onNavigate={goToScreen}
            currentDay={currentDay}
            totalDays={totalDays}
            todayDestination={todayDestination}
            todaySubtitle={todaySubtitle}
            tripFinished={tripFinished}
            daysUntilStart={daysUntilStart}
            todayFormatted={todayFormatted}
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
