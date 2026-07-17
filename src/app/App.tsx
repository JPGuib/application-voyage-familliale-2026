import { useState, useEffect, useRef } from "react";
import {
  type LucideIcon,
  Check,
  ChevronRight,
  ChevronLeft,
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
  Volume2,
} from "lucide-react";
import { TRIP } from "../content/trip";
import { PLACES } from "../content/places";
import {
  CHALLENGE_POINTS,
  DAILY_CHALLENGE,
  DAILY_RIDDLE,
  QUESTION_POINTS,
  QUESTIONS,
  RIDDLE_POINTS,
} from "../content/game";
import { TIPS } from "../content/tips";
import {
  computeBadges,
  parseGameHistory,
  type GameHistoryEntry,
  upsertGameHistory,
} from "./game-results";
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
import { useCloudSync } from "../hooks/useCloudSync";
import {
  filterCategoriesForProfile,
  getItemBadges,
  getCategoryBadges,
  getVisibleItemIds,
  type Gender,
  type HouseholdRole,
  type ProfileFilterInput,
} from "./checklist-filter";

const IS_DEV = Boolean((import.meta as { env?: { DEV?: boolean } }).env?.DEV);

// ─── DATA ────────────────────────────────────────────────────────────────────

const CHECKLIST_CATEGORIES = [
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
      { id: "toilette-pharmacie-famille", label: "Pour toute la famille : petite pharmacie de voyage (=> KG s'en occupe)" },
      { id: "toilette-fer-famille", label: "1 pour toute la famille : mini fer à repasser (=> KG s'en occupe)" },
    ],
  },
  {
    id: "electronique",
    emoji: "🔌",
    label: "Électronique",
    items: [
      { id: "elec-telephone", label: "Téléphone et son chargeur" },
      { id: "elec-attache-cou", label: "Attache-cou pour téléphone" },
      { id: "elec-perche-selfie", label: "Perche Selfie (1 pour toute la famille => JP s'en charge)" },
      { id: "elec-batterie-externe", label: "Batterie externe et son chargeur" },
      { id: "elec-ecouteurs", label: "Écouteurs et/ou casque" },
      { id: "elec-tablette-ordi", label: "Tablette ou ordinateur rouge pour regarder des films" },
      { id: "elec-films-series", label: "Films, séries et playlists téléchargés avant le départ (=> donner la liste assez vite à JP)" },
      { id: "elec-multiprise", label: "1 multiprise pour hôtel (chacun en prend 1)" },
      { id: "elec-montre-connectee", label: "Emma (optionnel) : montre connectée et son chargeur" },
      { id: "elec-ssd", label: "(Optionnel) SSD externe compact pour sauvegarder les photos et câble associé (=> voir avec JP)" },
      { id: "elec-cle-usb-c", label: "(Optionnel) Clé USB-C (=> voir avec JP)" },
      { id: "elec-livre", label: "(Optionnel) Livre (ou livre numérique), magazine, ..." },
      { id: "elec-thomas-oral", label: "Thomas : fichier d'oral de stage pour révision pendant le trajet retour" },
      { id: "elec-gopro", label: "Gopro (=> JP)" },
    ],
  },
  {
    id: "documents",
    emoji: "📄",
    label: "Documents",
    items: [
      { id: "doc-passeport-carte-id", label: "Passeport + carte d'identité" },
      { id: "doc-carte-bancaire", label: "Carte bancaire" },
    ],
  },
  {
    id: "transport",
    emoji: "🚌",
    label: "Confort pendant le transport",
    items: [
      { id: "transport-masque-sommeil", label: "(Optionnel) Masque de sommeil pour les yeux" },
      { id: "transport-bouchons-oreilles", label: "Bouchons d'oreilles (=> les récupérer auprès de KG)" },
      { id: "transport-oreiller-cou", label: "Oreiller de cou gonflable (=> le récupérer auprès de KG)" },
      { id: "transport-couverture", label: "Petite couverture légère" },
      { id: "transport-gel", label: "Pour toute la famille : 1 gel hydroalcoolique (=> KG s'en charge)" },
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
      { id: "bagages-sac-dos", label: "Petit sac à dos pour les excursions (obligatoire)" },
      { id: "bagages-sac-main", label: "(Optionnel pour les femmes) Sac à main pour le soir", genderTargets: "female" as const },
      { id: "bagages-sac-banane", label: "(Optionnel) Sac banane" },
      { id: "bagages-sac-cabine", label: "Pour chacun : petit sac cabine (qui peut être le sac à dos) de dimensions 30x40x15 cm max" },
      { id: "bagages-valise-cabine", label: "Pour chacun : petite valise cabine de dimensions 55x35x25 cm max et poids max 12kg" },
      { id: "bagages-valise-soute", label: "Pour chacun : grande valise en soute de dimensions 158 cm (L+l+h) max et poids max 23kg" },
    ],
  },
];

const CHECKLIST_ITEM_IDS = new Set(
  CHECKLIST_CATEGORIES.flatMap((category) =>
    category.items.map((item) => item.id)
  )
);

// ─── TYPES ───────────────────────────────────────────────────────────────────

type Screen = "checklist" | "dashboard" | "guide" | "place" | "game" | "results" | "tips" | "settings";
type QuickScreen = "checklist" | "guide" | "game" | "tips" | "results";
type GameState = "intro" | "playing" | "done" | "riddle" | "challenge";
type Profile = {
  id: string;
  surname: string;
  role: Role | null;
  gender: Gender;
  householdRole: HouseholdRole;
};

type LoginCandidate = {
  id: string;
  surname: string;
  role: Role;
  passwordHash?: string;
};

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
    id: "checklist",
    emoji: "🧳",
    title: "Checklist",
    subtitle: "Préparatifs et suivi",
    colorBg: "bg-[#FFF3E0]",
    colorText: "text-[#E65100]",
  },
  {
    id: "guide",
    emoji: "📖",
    title: "Guide de voyage",
    subtitle: "Découvrir les lieux",
    colorBg: "bg-[#E8F5E9]",
    colorText: "text-[#2E7D32]",
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
    id: "tips",
    emoji: "💡",
    title: "Conseils",
    subtitle: "Tips & infos pratiques",
    colorBg: "bg-[#E3F2FD]",
    colorText: "text-[#1565C0]",
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
    href: "https://wanderlog.com",
    emoji: "🗺️",
    title: "Wanderlog",
    subtitle: "Planification du voyage",
    colorBg: "bg-[#E8F5E9]",
  },
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
  { id: "guide", icon: BookOpen, label: "Guide" },
  { id: "game", icon: Gamepad2, label: "Jeu" },
  { id: "tips", icon: Lightbulb, label: "Conseils" },
  { id: "results", icon: Trophy, label: "Résultats" },
];

// ─── HELPERS ─────────────────────────────────────────────────────────────────

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

function ActionCard({
  emoji,
  title,
  subtitle,
  colorBg,
  colorText,
  onClick,
}: {
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
  error,
  onSurnameChange,
  onGenderChange,
  onHouseholdRoleChange,
  onContinue,
}: {
  profile: Profile;
  ownerAlreadyConfigured: boolean;
  error: string | null;
  onSurnameChange: (v: string) => void;
  onGenderChange: (v: Gender) => void;
  onHouseholdRoleChange: (v: HouseholdRole) => void;
  onContinue: () => void;
}) {
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

          <p className="text-xs font-extrabold text-muted-foreground uppercase tracking-widest mt-5 mb-2">
            Rôle
          </p>
          <div className="rounded-xl border border-border bg-muted/30 px-3 py-3">
            <p className="text-sm font-black text-foreground">
              {ownerAlreadyConfigured ? "Utilisateur" : "Propriétaire"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {ownerAlreadyConfigured
                ? "Un propriétaire existe déjà pour la famille. Votre profil sera créé en utilisateur."
                : "Aucun propriétaire n'est défini. Le premier profil devient propriétaire."}
            </p>
          </div>

          {error && (
            <p className="mt-4 text-sm font-bold text-destructive">{error}</p>
          )}
        </div>
      </div>

      <div className="flex-shrink-0 px-4 pb-8 pt-3 bg-background border-t border-border">
        <button
          onClick={onContinue}
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
  passwordPromptValue,
  passwordPromptError,
  onSelectProfile,
  onCreateSurnameChange,
  onLoginWithSelected,
  onCreateAndContinue,
  onPasswordPromptValueChange,
  onConfirmPasswordPrompt,
  onCancelPasswordPrompt,
}: {
  profiles: LoginCandidate[];
  selectedProfileId: string | null;
  createSurname: string;
  error: string | null;
  passwordPromptProfileSurname: string | null;
  passwordPromptValue: string;
  passwordPromptError: string | null;
  onSelectProfile: (profileId: string) => void;
  onCreateSurnameChange: (value: string) => void;
  onLoginWithSelected: () => void;
  onCreateAndContinue: () => void;
  onPasswordPromptValueChange: (value: string) => void;
  onConfirmPasswordPrompt: () => void;
  onCancelPasswordPrompt: () => void;
}) {
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
                      {candidate.role === "proprietaire" ? "Propriétaire" : "Utilisateur"}
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
            <p className="text-sm font-black text-foreground">Profil protégé</p>
            <p className="text-xs text-muted-foreground mt-1">
              Saisissez le mot de passe du profil {passwordPromptProfileSurname}.
            </p>
            <input
              type="password"
              value={passwordPromptValue}
              onChange={(e) => onPasswordPromptValueChange(e.target.value)}
              placeholder="Mot de passe"
              className="mt-3 w-full rounded-xl bg-input-background px-3 py-3 text-sm font-semibold text-foreground outline-none ring-2 ring-transparent focus:ring-primary/30"
            />
            {passwordPromptError && (
              <p className="mt-2 text-xs font-bold text-destructive">{passwordPromptError}</p>
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

function CloudAccessErrorScreen({ reason }: { reason: string }) {
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
  const activeId = current === "place" ? "guide" : current;
  return (
    <nav className="flex-shrink-0 bg-card border-t border-border flex items-center justify-around px-2 py-2">
      {items.map((item) => {
        const active = activeId === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-2xl transition-all ${
              active ? "bg-primary/10 text-primary" : "text-muted-foreground"
            }`}
          >
            <item.icon size={22} />
            <span className="text-[10px] font-extrabold">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

// ─── CHECKLIST SCREEN ────────────────────────────────────────────────────────

function ChecklistScreen({
  categories,
  checked,
  openCategories,
  toggleItem,
  toggleCategory,
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
}: {
  categories: typeof CHECKLIST_CATEGORIES;
  checked: Record<string, boolean>;
  openCategories: Set<string>;
  toggleItem: (id: string) => void;
  toggleCategory: (id: string) => void;
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
            Préparer nos bagages
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
          <p className="text-xs opacity-80 mt-1">
            {remainingItems} article{remainingItems > 1 ? "s" : ""} restant
            {remainingItems > 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
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
                        {catBadges.map((badge, index) =>
                          badge === "/" ? (
                            <span
                              key={`cat-sep-${index}`}
                              className="inline-block text-[9px] font-black uppercase tracking-wide text-muted-foreground px-0.5"
                            >
                              /
                            </span>
                          ) : (
                            <span
                              key={`cat-badge-${badge}-${index}`}
                              className="inline-block text-[9px] font-black uppercase tracking-wide bg-muted text-muted-foreground rounded-full px-2 py-0.5"
                            >
                              {badge}
                            </span>
                          )
                        )}
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
                  {cat.items.map((item) => {
                    const badges = getItemBadges(item);
                    return (
                    <button
                      key={item.id}
                      onClick={() => toggleItem(item.id)}
                      className="w-full flex items-center gap-3 py-2 text-left"
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
                        {badges.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-0.5">
                            {badges.map((badge, index) =>
                              badge === "/" ? (
                                <span
                                  key={`item-sep-${item.id}-${index}`}
                                  className="inline-block text-[9px] font-black uppercase tracking-wide text-muted-foreground px-0.5"
                                >
                                  /
                                </span>
                              ) : (
                                <span
                                  key={`item-badge-${item.id}-${badge}-${index}`}
                                  className="inline-block text-[9px] font-black uppercase tracking-wide bg-muted text-muted-foreground rounded-full px-2 py-0.5"
                                >
                                  {badge}
                                </span>
                              )
                            )}
                          </div>
                        )}
                      </div>
                    </button>
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
}: {
  quickActions: QuickAction[];
  onNavigate: (s: Screen) => void;
}) {
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
              className="text-[10px] font-black uppercase tracking-widest bg-white/20 rounded-full px-3 py-1.5"
            >
              Paramètres
            </button>
          </div>
          <h1 className="text-4xl font-black mt-1">Jour {TRIP.currentDay}</h1>
          <p className="text-sm opacity-80 font-bold">
            sur {TRIP.totalDays} jours
          </p>
          <div className="flex gap-1 mt-3 flex-wrap">
            {Array.from({ length: TRIP.totalDays }).map((_, i) => (
              <div
                key={i}
                className={`h-2 w-2 rounded-full transition-all ${
                  i < TRIP.currentDay ? "bg-secondary" : "bg-white/25"
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Today card */}
      <div className="px-4 -mt-4 relative z-10">
        <div className="bg-card rounded-2xl shadow-md p-4 border border-border">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <MapPin size={20} className="text-primary" />
            </div>
            <div>
              <p className="text-xs font-extrabold text-muted-foreground uppercase tracking-widest">
                Destination du jour
              </p>
              <p className="text-xl font-black text-foreground leading-tight">
                {TRIP.todayDestination}
              </p>
              <p className="text-sm text-muted-foreground">
                {TRIP.todaySubtitle}
              </p>
            </div>
          </div>
        </div>
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

      {/* External apps */}
      <div className="px-4 mt-5">
        <p className="text-xs font-extrabold text-muted-foreground uppercase tracking-widest mb-3">
          Applications externes
        </p>
        <div className="space-y-2">
          {EXTERNAL_APP_LINKS.map((item) => (
            <a
              key={item.href}
              href={item.href}
              target="_blank"
              rel="noopener noreferrer"
              referrerPolicy="strict-origin-when-cross-origin"
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

      {/* Photo du jour */}
      <div className="px-4 mt-5 mb-6">
        <p className="text-xs font-extrabold text-muted-foreground uppercase tracking-widest mb-3">
          Photo du jour
        </p>
        <div className="rounded-2xl overflow-hidden h-44 bg-muted relative">
          <img
            src="https://images.unsplash.com/photo-1478436127897-769e1b3f0f36?w=800&h=400&fit=crop&auto=format"
            alt="Sainte-Sophie, Istanbul"
            className="w-full h-full object-cover"
          />
          <div className="absolute bottom-3 left-3">
            <span className="bg-black/50 text-white text-xs font-bold px-3 py-1.5 rounded-full backdrop-blur-sm">
              📍 Sainte-Sophie, Istanbul
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── GUIDE SCREEN ────────────────────────────────────────────────────────────

function GuideScreen({
  onBack,
  onPlaceSelect,
}: {
  onBack: () => void;
  onPlaceSelect: (id: string) => void;
}) {
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
          Guide de Turquie 📖
        </h1>
        <p className="relative z-10 text-sm opacity-90 mt-1">
          Jour {TRIP.currentDay} — {PLACES.length} lieux à découvrir
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {PLACES.map((place) => (
          <button
            key={place.id}
            onClick={() => onPlaceSelect(place.id)}
            className="w-full bg-card rounded-2xl shadow-sm overflow-hidden border border-border text-left active:scale-95 transition-transform"
          >
            <div className="h-40 bg-muted overflow-hidden">
              <img
                src={place.image}
                alt={place.name}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <span className="text-xs font-extrabold text-accent uppercase tracking-widest">
                    {place.tag}
                  </span>
                  <h3 className="font-black text-foreground mt-0.5">
                    {place.name}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {place.shortDesc}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-bold text-muted-foreground">
                    <span className="rounded-full bg-muted px-2.5 py-1">
                      {place.photos?.length ?? 1} photos
                    </span>
                    <span className="rounded-full bg-muted px-2.5 py-1">
                      {place.audioDuration ?? "Audio à venir"}
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

// ─── PLACE DETAIL SCREEN ─────────────────────────────────────────────────────

function PlaceScreen({
  place,
  onBack,
}: {
  place: (typeof PLACES)[0];
  onBack: () => void;
}) {
  const photos = place.photos?.length ? place.photos : [place.image];
  const heroPhoto = photos[0] ?? place.image;
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [audioError, setAudioError] = useState<string | null>(null);
  const canPlayAudio = Boolean(place.audioSrc);

  useEffect(() => {
    const audio = new Audio(place.audioSrc ?? "");
    audioRef.current = audio;
    setIsPlaying(false);
    setProgress(0);
    setAudioError(null);

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

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("error", handleError);

    return () => {
      audio.pause();
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("error", handleError);
      audioRef.current = null;
    };
  }, [place.audioSrc, place.id]);

  const handleTogglePlay = async () => {
    if (!canPlayAudio || !audioRef.current) {
      setAudioError("Audio à ajouter pour ce lieu.");
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

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="relative h-64 bg-muted flex-shrink-0">
        <img
          src={heroPhoto}
          alt={place.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
        <button
          onClick={onBack}
          className="absolute top-12 left-4 bg-black/40 backdrop-blur-sm text-white rounded-full p-2.5"
        >
          <ChevronLeft size={20} />
        </button>
        <div className="absolute bottom-4 left-4 right-4">
          <span className="text-xs font-extrabold text-secondary uppercase tracking-widest">
            {place.tag}
          </span>
          <h1 className="text-xl font-black text-white mt-1 leading-tight">
            {place.name}
          </h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Audio player */}
        <div className="mx-4 mt-4 bg-primary/10 rounded-2xl p-4 flex items-center gap-4">
          <button
            onClick={handleTogglePlay}
            disabled={!canPlayAudio}
            className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0 shadow-md active:scale-95 transition-transform"
          >
            {isPlaying ? <Pause size={20} /> : <Play size={20} />}
          </button>
          <div className="flex-1">
            <p className="text-sm font-black text-foreground">
              {place.audioTitle ?? "Narration audio"}
            </p>
            <p className="text-xs text-muted-foreground">
              Durée : {place.audioDuration ?? "3 min 24 sec"}
            </p>
            <div className="mt-2 bg-border rounded-full h-1.5">
              <div
                className="bg-primary h-1.5 rounded-full transition-all duration-1000"
                style={{ width: `${progress}%` }}
              />
            </div>
            {!canPlayAudio && (
              <p className="text-xs text-muted-foreground mt-2">
                Aucun fichier audio lié à ce lieu pour le moment.
              </p>
            )}
            {audioError && (
              <p className="text-xs text-destructive mt-2">{audioError}</p>
            )}
          </div>
          <Volume2 size={18} className="text-primary" />
        </div>

        {/* Gallery */}
        <div className="px-4 mt-5">
          <h2 className="text-base font-black text-foreground mb-3">
            📷 Galerie
          </h2>
          <div className="grid grid-cols-3 gap-2">
            {photos.map((photo, index) => (
              <div key={`${place.id}-photo-${index}`} className="aspect-square rounded-2xl overflow-hidden bg-muted">
                <img src={photo} alt={`${place.name} photo ${index + 1}`} className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        </div>

        {/* History */}
        <div className="px-4 mt-5">
          <h2 className="text-base font-black text-foreground mb-2">
            📜 Histoire
          </h2>
          <p className="text-sm text-foreground/80 leading-relaxed">
            {place.history}
          </p>
        </div>

        {/* Anecdotes */}
        <div className="px-4 mt-5 mb-6">
          <h2 className="text-base font-black text-foreground mb-3">
            ✨ Le savais-tu ?
          </h2>
          <div className="space-y-3">
            {place.anecdotes.map((anecdote, i) => (
              <div
                key={i}
                className="flex gap-3 bg-[#FFF3E0] rounded-2xl p-3.5"
              >
                <span className="text-lg flex-shrink-0">💡</span>
                <p className="text-sm text-foreground/80 leading-relaxed">
                  {anecdote}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
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
  onReset,
  onContinueToRiddle,
  onRiddleAnswerChange,
  onValidateRiddle,
  onContinueToChallenge,
  onCompleteChallenge,
  onFinishSession,
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
  onReset: () => void;
  onContinueToRiddle: () => void;
  onRiddleAnswerChange: (value: string) => void;
  onValidateRiddle: () => void;
  onContinueToChallenge: () => void;
  onCompleteChallenge: () => void;
  onFinishSession: () => void;
}) {
  const q = QUESTIONS[currentQ];

  if (gameState === "intro") {
    return (
      <div className="flex flex-col h-full overflow-y-auto">
        <div className="relative bg-[#FF6B3D] text-white px-6 pt-12 pb-6 flex-shrink-0">
          <MemphisDecor />
          <button
            onClick={onBack}
            className="relative z-10 flex items-center gap-1 text-white/80 text-sm font-bold mb-3"
          >
            <ChevronLeft size={18} /> Accueil
          </button>
          <h1 className="relative z-10 text-2xl font-black">
            Jeu du jour 🎮
          </h1>
          <p className="relative z-10 text-sm opacity-90 mt-1">
            Quiz Turquie — Jour {TRIP.currentDay}
          </p>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <div className="text-8xl mb-6">🕌</div>
          <h2 className="text-2xl font-black text-foreground mb-2">
            Prêts pour le défi ?
          </h2>
          <p className="text-sm text-muted-foreground mb-2">
            {QUESTIONS.length} questions sur les lieux visités aujourd&apos;hui en Turquie.
          </p>
          <p className="text-sm text-muted-foreground mb-10">
            Chaque bonne réponse rapporte{" "}
            <strong className="text-primary">{QUESTION_POINTS} points</strong> à l&apos;équipe !
          </p>
          <button
            onClick={onStart}
            className="bg-primary text-primary-foreground rounded-2xl py-5 px-10 text-lg font-black shadow-lg active:scale-95 transition-transform"
          >
            C&apos;est parti ! 🚀
          </button>
        </div>
      </div>
    );
  }

  if (gameState === "done") {
    const stars = correctCount >= 5 ? 3 : correctCount >= 3 ? 2 : 1;
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
            points gagnés · {correctCount}/{QUESTIONS.length} bonnes réponses
          </p>
          <div className="w-full space-y-2 mb-8">
            {QUESTIONS.map((question, i) => {
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
            className="w-full bg-primary text-primary-foreground rounded-2xl py-4 px-8 font-black active:scale-95 transition-transform"
          >
            Continuer vers l&apos;énigme 🧩
          </button>
          <button
            onClick={onReset}
            className="w-full mt-3 bg-muted text-foreground rounded-2xl py-4 px-8 font-black active:scale-95 transition-transform mb-6"
          >
            Rejouer 🔄
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
              {DAILY_RIDDLE.question}
            </p>
            <p className="text-xs text-muted-foreground mt-3">
              Indice: {DAILY_RIDDLE.hint}
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
            <p className="text-sm font-black text-foreground mb-2">{DAILY_CHALLENGE.title}</p>
            <p className="text-sm text-foreground/80 leading-relaxed">
              {DAILY_CHALLENGE.description}
            </p>
            <button
              onClick={onCompleteChallenge}
              disabled={challengeDone}
              className="mt-4 w-full rounded-xl py-3 text-sm font-black bg-primary text-primary-foreground disabled:opacity-50"
            >
              {challengeDone ? "Défi validé ✅" : "Marquer comme accompli"}
            </button>
          </div>
          <button
            onClick={onFinishSession}
            className="mt-4 w-full bg-[#6B3DFF] text-white rounded-2xl py-4 text-sm font-black"
          >
            Voir les résultats 🏆
          </button>
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
            Question {currentQ + 1} / {QUESTIONS.length}
          </p>
          <p className="text-sm font-black bg-white/20 px-3 py-1 rounded-full">
            {answers.filter((a, i) => a === QUESTIONS[i]?.correct).length * QUESTION_POINTS} pts
          </p>
        </div>
        <div className="relative z-10 bg-white/20 rounded-full h-2">
          <div
            className="bg-secondary h-2 rounded-full transition-all duration-500"
            style={{ width: `${(currentQ / QUESTIONS.length) * 100}%` }}
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

function ResultsScreen({
  onBack,
  history,
}: {
  onBack: () => void;
  history: GameHistoryEntry[];
}) {
  const latestEntry = history.length > 0 ? history[history.length - 1] : null;
  const badges = computeBadges(history, QUESTIONS.length);
  const dailyScores = history.map((entry) => ({
    day: entry.day,
    location: entry.location,
    score: entry.totalScore,
  }));
  const total = dailyScores.reduce((sum, entry) => sum + entry.score, 0);
  const maxTotal = Math.max(dailyScores.length, 1) * 100;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="relative bg-[#6B3DFF] text-white px-6 pt-12 pb-6 flex-shrink-0">
        <MemphisDecor />
        <button
          onClick={onBack}
          className="relative z-10 flex items-center gap-1 text-white/80 text-sm font-bold mb-3"
        >
          <ChevronLeft size={18} /> Accueil
        </button>
        <h1 className="relative z-10 text-2xl font-black">
          Tableau des scores 🏆
        </h1>
        <p className="relative z-10 text-sm opacity-90 mt-1">
          Les Explorateurs · {total} points au total
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
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
            <p className="text-sm text-muted-foreground mb-2">
              / {maxTotal} points possibles
            </p>
          </div>
          <div className="mt-3 bg-muted rounded-full h-3">
            <div
              className="bg-[#6B3DFF] h-3 rounded-full transition-all"
              style={{ width: `${(total / maxTotal) * 100}%` }}
            />
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
        <div className="h-2" />
      </div>
    </div>
  );
}

// ─── TIPS SCREEN ─────────────────────────────────────────────────────────────

function TipsScreen({ onBack }: { onBack: () => void }) {
  const [tab, setTab] = useState<"transport" | "customs" | "practical">(
    "transport"
  );
  const tabs = [
    { id: "transport" as const, label: "🚆 Transport" },
    { id: "customs" as const, label: "🙏 Coutumes" },
    { id: "practical" as const, label: "💡 Pratique" },
  ];
  const content = { transport: TIPS.transport, customs: TIPS.customs, practical: TIPS.practical };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="relative bg-[#1565C0] text-white px-6 pt-12 pb-6 flex-shrink-0">
        <MemphisDecor />
        <button
          onClick={onBack}
          className="relative z-10 flex items-center gap-1 text-white/80 text-sm font-bold mb-3"
        >
          <ChevronLeft size={18} /> Accueil
        </button>
        <h1 className="relative z-10 text-2xl font-black">
          Conseils de voyage 💡
        </h1>
        <p className="relative z-10 text-sm opacity-90 mt-1">
          Tout ce qu&apos;il faut savoir pour la Turquie
        </p>
      </div>

      {/* Weather */}
      <div className="px-4 mt-4 flex-shrink-0">
        <div className="bg-[#E3F2FD] rounded-2xl p-4 flex items-center gap-4">
          <span className="text-4xl">☀️</span>
          <div className="flex-1">
            <p className="font-black text-2xl text-[#1565C0]">
              {TIPS.weather.temp}
            </p>
            <p className="text-sm font-bold text-foreground">
              {TIPS.weather.condition}
            </p>
            <p className="text-xs text-muted-foreground">
              Humidité : {TIPS.weather.humidity}
            </p>
          </div>
          <p className="text-xs text-[#1565C0] font-bold text-right max-w-[100px]">
            {TIPS.weather.tip}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 mt-4 flex gap-2 flex-shrink-0">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-3 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all ${
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
        {content[tab].map((item, i) => (
          <div
            key={i}
            className="bg-card rounded-2xl border border-border p-4 flex items-start gap-4"
          >
            <span className="text-3xl flex-shrink-0">{item.icon}</span>
            <div>
              <p className="font-black text-sm text-foreground">{item.title}</p>
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                {item.desc}
              </p>
            </div>
          </div>
        ))}
        <div className="h-2" />
      </div>
    </div>
  );
}

function SettingsScreen({
  profile,
  ownerCodeConfigured,
  ownerRecoveryConfigured,
  profilePasswordConfigured,
  profileRecoveryConfigured,
  onBack,
  onSaveSurname,
  onSaveProfileMetadata,
  onSaveOwnerCode,
  onSaveOwnerRecoveryPhrase,
  onSaveProfilePassword,
  onRemoveProfilePassword,
  onSaveProfileRecoveryPhrase,
  onSwitchProfile,
  cloudEnabled,
}: {
  profile: Profile;
  ownerCodeConfigured: boolean;
  ownerRecoveryConfigured: boolean;
  profilePasswordConfigured: boolean;
  profileRecoveryConfigured: boolean;
  onBack: () => void;
  onSaveSurname: (surname: string) => { ok: boolean; message: string };
  onSaveProfileMetadata: (gender: Gender, householdRole: HouseholdRole) => void;
  onSaveOwnerCode: (code: string) => Promise<{ ok: boolean; message: string }>;
  onSaveOwnerRecoveryPhrase: (phrase: string) => Promise<{ ok: boolean; message: string }>;
  onSaveProfilePassword: (password: string) => Promise<{ ok: boolean; message: string }>;
  onRemoveProfilePassword: () => Promise<{ ok: boolean; message: string }>;
  onSaveProfileRecoveryPhrase: (phrase: string) => Promise<{ ok: boolean; message: string }>;
  onSwitchProfile: () => void;
  cloudEnabled: boolean;
}) {
  const [surnameInput, setSurnameInput] = useState(profile.surname);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [selectedGender, setSelectedGender] = useState<Gender>(profile.gender);
  const [selectedHouseholdRole, setSelectedHouseholdRole] = useState<HouseholdRole>(profile.householdRole);
  const [metadataFeedback, setMetadataFeedback] = useState<string | null>(null);
  const [ownerCodeInput, setOwnerCodeInput] = useState("");
  const [ownerCodeFeedback, setOwnerCodeFeedback] = useState<string | null>(null);
  const [ownerRecoveryInput, setOwnerRecoveryInput] = useState("");
  const [ownerRecoveryFeedback, setOwnerRecoveryFeedback] = useState<string | null>(null);
  const [profilePasswordInput, setProfilePasswordInput] = useState("");
  const [profilePasswordFeedback, setProfilePasswordFeedback] = useState<string | null>(null);
  const [profileRecoveryInput, setProfileRecoveryInput] = useState("");
  const [profileRecoveryFeedback, setProfileRecoveryFeedback] = useState<string | null>(null);
  const [showOwnerCodeInput, setShowOwnerCodeInput] = useState(false);
  const [showOwnerRecoveryInput, setShowOwnerRecoveryInput] = useState(false);
  const [showProfilePasswordInput, setShowProfilePasswordInput] = useState(false);
  const [showProfileRecoveryInput, setShowProfileRecoveryInput] = useState(false);
  const [showSwitchProfilePrompt, setShowSwitchProfilePrompt] = useState(false);

  const roleLabel = profile.role === "proprietaire" ? "Propriétaire" : "Utilisateur";

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="relative bg-[#5E35B1] text-white px-6 pt-12 pb-6 flex-shrink-0">
        <MemphisDecor />
        <button
          onClick={onBack}
          className="relative z-10 flex items-center gap-1 text-white/80 text-sm font-bold mb-3"
        >
          <ChevronLeft size={18} /> Accueil
        </button>
        <h1 className="relative z-10 text-2xl font-black">
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
              Mot de passe du profil
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              {profilePasswordConfigured
                ? "Un mot de passe est déjà configuré pour ce profil."
                : "Aucun mot de passe configuré. Ce profil reste accessible sans mot de passe."}
            </p>
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
              {profilePasswordConfigured ? "Mettre à jour le mot de passe" : "Définir le mot de passe"}
            </button>
            {profilePasswordConfigured && (
              <button
                onClick={async () => {
                  const confirmed = window.confirm("Retirer le mot de passe de ce profil ?");
                  if (!confirmed) {
                    return;
                  }
                  const result = await onRemoveProfilePassword();
                  setProfilePasswordFeedback(result.message);
                  if (result.ok) setProfilePasswordInput("");
                }}
                className="mt-2 w-full rounded-xl py-3 text-sm font-black border border-border text-foreground"
              >
                Retirer le mot de passe
              </button>
            )}
            {profilePasswordFeedback && (
              <p className="mt-2 text-xs font-bold text-muted-foreground">{profilePasswordFeedback}</p>
            )}
        </div>

        <div className="bg-card rounded-2xl border border-border p-4">
            <p className="text-xs font-extrabold text-muted-foreground uppercase tracking-widest">
              Phrase de récupération du profil
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              {profileRecoveryConfigured
                ? "Une phrase de récupération est configurée pour ce profil."
                : "Aucune phrase de récupération configurée pour ce profil."}
            </p>
            <input
              type={showProfileRecoveryInput ? "text" : "password"}
              value={profileRecoveryInput}
              onChange={(e) => {
                setProfileRecoveryInput(e.target.value);
                if (profileRecoveryFeedback) setProfileRecoveryFeedback(null);
              }}
              placeholder="Votre phrase personnelle (min. 5 caractères)"
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
                const result = await onSaveProfileRecoveryPhrase(profileRecoveryInput);
                setProfileRecoveryFeedback(result.message);
                if (result.ok) setProfileRecoveryInput("");
              }}
              className="mt-3 w-full bg-primary text-primary-foreground rounded-xl py-3 text-sm font-black"
            >
              {profileRecoveryConfigured ? "Mettre à jour la phrase" : "Définir la phrase"}
            </button>
            {profileRecoveryFeedback && (
              <p className="mt-2 text-xs font-bold text-muted-foreground">{profileRecoveryFeedback}</p>
            )}
        </div>

        {profile.role === "proprietaire" ? (
          <div className="bg-card rounded-2xl border border-border p-4">
            <p className="text-xs font-extrabold text-muted-foreground uppercase tracking-widest">
              Code propriétaire
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              {ownerCodeConfigured
                ? "Un code est déjà configuré. Vous pouvez le remplacer."
                : "Aucun code configuré pour le moment."}
            </p>
            <input
              type={showOwnerCodeInput ? "text" : "password"}
              value={ownerCodeInput}
              onChange={(e) => {
                setOwnerCodeInput(e.target.value);
                if (ownerCodeFeedback) setOwnerCodeFeedback(null);
              }}
              placeholder="Minimum 4 caractères"
              className="mt-2 w-full rounded-xl bg-input-background px-3 py-3 text-sm font-semibold text-foreground outline-none ring-2 ring-transparent focus:ring-primary/30"
            />
            <button
              onClick={() => setShowOwnerCodeInput((previous) => !previous)}
              className="mt-2 text-xs font-black text-primary underline underline-offset-4"
            >
              {showOwnerCodeInput ? "Masquer" : "Afficher"} le code saisi
            </button>
            <button
              onClick={async () => {
                const result = await onSaveOwnerCode(ownerCodeInput);
                setOwnerCodeFeedback(result.message);
                if (result.ok) setOwnerCodeInput("");
              }}
              className="mt-3 w-full bg-primary text-primary-foreground rounded-xl py-3 text-sm font-black"
            >
              {ownerCodeConfigured ? "Mettre à jour le code" : "Définir le code"}
            </button>
            {ownerCodeFeedback && (
              <p className="mt-2 text-xs font-bold text-muted-foreground">{ownerCodeFeedback}</p>
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

        {profile.role === "proprietaire" ? (
          <div className="bg-card rounded-2xl border border-border p-4">
            <p className="text-xs font-extrabold text-muted-foreground uppercase tracking-widest">
              Phrase de récupération
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              {ownerRecoveryConfigured
                ? "Une phrase est déjà configurée. Vous pouvez la remplacer."
                : "Aucune phrase configurée pour le moment."}
            </p>
            <input
              type={showOwnerRecoveryInput ? "text" : "password"}
              value={ownerRecoveryInput}
              onChange={(e) => {
                setOwnerRecoveryInput(e.target.value);
                if (ownerRecoveryFeedback) setOwnerRecoveryFeedback(null);
              }}
              placeholder="Votre phrase personnelle (min. 5 caractères)"
              className="mt-2 w-full rounded-xl bg-input-background px-3 py-3 text-sm font-semibold text-foreground outline-none ring-2 ring-transparent focus:ring-primary/30"
            />
            <button
              onClick={() => setShowOwnerRecoveryInput((previous) => !previous)}
              className="mt-2 text-xs font-black text-primary underline underline-offset-4"
            >
              {showOwnerRecoveryInput ? "Masquer" : "Afficher"} la phrase saisie
            </button>
            <button
              onClick={async () => {
                const result = await onSaveOwnerRecoveryPhrase(ownerRecoveryInput);
                setOwnerRecoveryFeedback(result.message);
                if (result.ok) setOwnerRecoveryInput("");
              }}
              className="mt-3 w-full bg-primary text-primary-foreground rounded-xl py-3 text-sm font-black"
            >
              {ownerRecoveryConfigured ? "Mettre à jour la phrase" : "Définir la phrase"}
            </button>
            {ownerRecoveryFeedback && (
              <p className="mt-2 text-xs font-bold text-muted-foreground">{ownerRecoveryFeedback}</p>
            )}
          </div>
        ) : (
          <div className="bg-card rounded-2xl border border-border p-4">
            <p className="text-xs font-extrabold text-muted-foreground uppercase tracking-widest">
              Phrase de récupération
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Seul un profil propriétaire peut configurer cette phrase.
            </p>
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
    </div>
  );
}

// ─── MAIN APP ────────────────────────────────────────────────────────────────

export default function App() {
  const ACTIVE_PROFILE_ID_KEY = "jp-active-profile-id";
  const {
    cloudEnabled,
    cloudReady,
    cloudAuthError,
    cloudActorUid,
    cloudSnapshot,
    pushSnapshot,
    claimRoleForProfile,
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
  const [screen, setScreen] = useState<Screen>("checklist");
  const [accessDeniedMessage, setAccessDeniedMessage] = useState<string | null>(null);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
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
          ([id, value]) => CHECKLIST_ITEM_IDS.has(id) && typeof value === "boolean"
        )
      ) as Record<string, boolean>;
    } catch {
      return {};
    }
  });
  const [gameState, setGameState] = useState<GameState>("intro");
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
  const [passwordPromptProfileId, setPasswordPromptProfileId] = useState<string | null>(null);
  const [passwordPromptInput, setPasswordPromptInput] = useState("");
  const [passwordPromptError, setPasswordPromptError] = useState<string | null>(null);
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
  const [currentQ, setCurrentQ] = useState(0);
  const [selectedAns, setSelectedAns] = useState<number | null>(null);
  const [answers, setAnswers] = useState<number[]>([]);
  const [quizStartedAt, setQuizStartedAt] = useState<number | null>(null);
  const [quizDurationSec, setQuizDurationSec] = useState(0);
  const [riddleAnswer, setRiddleAnswer] = useState("");
  const [riddleFeedback, setRiddleFeedback] = useState<string | null>(null);
  const [riddleValidated, setRiddleValidated] = useState(false);
  const [riddleSolved, setRiddleSolved] = useState(false);
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

  const getPostAuthLandingScreen = (nextPhase: "before" | "during") =>
    nextPhase === "during" ? "dashboard" : "checklist";

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
      if (rememberedPasswordHash) {
        setSelectedLoginProfileId(rememberedProfile.profileId);
        if (!isProfilePasswordHash(rememberedPasswordHash)) {
          setAuthError("Authentification impossible. Vérifiez les informations saisies.");
          setIsAuthBootstrapPending(false);
          return;
        }

        setIsAuthBootstrapPending(false);
        return;
      }

      setProfile((previous) => ({
        ...previous,
        id: rememberedProfile.profileId,
        surname: rememberedProfile.surname,
        role: rememberedProfile.role,
        gender: rememberedProfile.gender ?? "unspecified",
        householdRole: rememberedProfile.householdRole ?? "member",
      }));
      const nextPhase = rememberedProfile.phase || cloudSnapshot.phase;
      setPhase(nextPhase);
      setScreen(getPostAuthLandingScreen(nextPhase));
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
        localStorage.removeItem("jp-owner-code");
        localStorage.removeItem("jp-owner-recovery-hash");
        localStorage.removeItem("jp-profile-password-hashes");
        localStorage.removeItem("jp-profile-recovery-hashes");
        localStorage.removeItem("jp-phase");
        localStorage.removeItem("jp-checklist");
        localStorage.removeItem("jp-game-history");
      } else {
        localStorage.setItem("jp-profile", JSON.stringify(profile));
        localStorage.setItem(
          "jp-family-state",
          JSON.stringify(enforceOwnerUniqueness(familyState))
        );
        try {
          localStorage.setItem("jp-owner-code-hash", ownerCodeHash);
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
          localStorage.setItem("jp-phase", phase);
          localStorage.setItem("jp-checklist", JSON.stringify(checked));
          localStorage.setItem("jp-game-history", JSON.stringify(gameHistory));
        } catch (e) {
          if (IS_DEV) console.warn("localStorage quota exceeded or unavailable:", e);
        }
      }

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
    ownerRecoveryHash,
    profilePasswordHashes,
    profileRecoveryHashes,
    phase,
    checked,
    unlockFailedAttempts,
    unlockLockedUntil,
    gameHistory,
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
    setFamilyState((previous) =>
      areSharedFamilyStatesEqual(previous, normalized) ? previous : normalized
    );
    setOwnerCodeHash((previous) =>
      previous === cloudSnapshot.ownerCodeHash ? previous : cloudSnapshot.ownerCodeHash
    );
    setOwnerRecoveryHash((previous) =>
      previous === (cloudSnapshot.ownerRecoveryHash || "") ? previous : (cloudSnapshot.ownerRecoveryHash || "")
    );

    const cloudProfile = cloudSnapshot.profiles[profile.id];
    if (!cloudProfile) {
      return;
    }

    setProfilePasswordHashes((previous) => {
      const nextHash = cloudProfile.passwordHash || "";
      if ((previous[profile.id] || "") === nextHash) {
        return previous;
      }
      return {
        ...previous,
        [profile.id]: nextHash,
      };
    });
    setProfileRecoveryHashes((previous) => {
      const nextHash = cloudProfile.recoveryHash || "";
      if ((previous[profile.id] || "") === nextHash) {
        return previous;
      }
      return {
        ...previous,
        [profile.id]: nextHash,
      };
    });

    hydratedCloudProfileIdRef.current = profile.id;

    setProfile((previous) => {
      const nextRole = cloudProfile.role;
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
    setGameHistory((previous) =>
      areGameHistoriesEqual(previous, cloudProfile.gameResults) ? previous : cloudProfile.gameResults
    );
  }, [cloudEnabled, cloudSnapshot, isAuthenticated, profile.id]);

  const lastCloudPushRef = useRef<string | null>(null);
  const hydratedCloudProfileIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!cloudEnabled || !isAuthenticated) {
      return;
    }

    const hasCloudProfile = Boolean(cloudSnapshot?.profiles[profile.id]);
    const isHydratedProfile = hydratedCloudProfileIdRef.current === profile.id;
    const isPhaseSynced = cloudSnapshot ? phase === cloudSnapshot.phase : false;
    setIsProfileHydrationPending(hasCloudProfile && (!isHydratedProfile || !isPhaseSynced));
  }, [cloudEnabled, cloudSnapshot, isAuthenticated, phase, profile.id]);

  useEffect(() => {
    if (!cloudEnabled || !cloudReady) return;

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
      hydratedProfileId: hydratedCloudProfileIdRef.current,
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

    const normalized = enforceOwnerUniqueness(familyState);
    const canWriteFamilyState = canUpdateOwnerCode(normalized, profile.id);
    const profilePasswordHash = profilePasswordHashes[profile.id] || "";
    const profileRecoveryHash = profileRecoveryHashes[profile.id] || "";
    const payload = JSON.stringify({
      actorUid: cloudActorUid,
      canWriteFamilyState,
      familyState: normalized,
      ownerCodeHash,
      ownerRecoveryHash,
      ownerRecoveryConfiguredAt: ownerRecoveryHash ? true : false,
      profileId: profile.id,
      surname: profile.surname,
      role: profile.role,
      gender: profile.gender,
      householdRole: profile.householdRole,
      profilePasswordHash,
      profileRecoveryHash,
      checklist: checked,
      phase,
      gameHistory,
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
      ownerRecoveryHash,
      ownerRecoveryConfiguredAt: undefined,
      profileId: profile.id,
      surname: profile.surname,
      role: profile.role,
      profilePasswordHash,
      profileRecoveryHash,
      profileRecoveryConfiguredAt: profileRecoveryHash ? Date.now() : undefined,
      gender: profile.gender,
      householdRole: profile.householdRole,
      checklist: checked,
      gameResults: gameHistory,
      phase,
    });
  }, [
    checked,
    cloudEnabled,
    cloudSnapshot,
    cloudReady,
    cloudActorUid,
    familyState,
    gameHistory,
    isAuthenticated,
    isAuthBootstrapPending,
    ownerCodeHash,
    ownerRecoveryHash,
    profilePasswordHashes,
    profileRecoveryHashes,
    phase,
    profile.id,
    profile.role,
    profile.surname,
    profile.gender,
    profile.householdRole,
    pushSnapshot,
  ]);

  useEffect(() => {
    const currentRole = profile.role;
    if (!currentRole) return;

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
  }, [profile.id, profile.role]);

  useEffect(() => {
    if (unlockLockedUntil <= Date.now()) return;
    const id = setInterval(() => setNowTs(Date.now()), 500);
    return () => clearInterval(id);
  }, [unlockLockedUntil]);

  useEffect(() => {
    if (!canAccessScreen(profile.role, phase, screen)) {
      setAccessDeniedMessage(getAccessDeniedMessage(profile.role, phase, screen));
      const safeScreen = getSafeScreen(profile.role, phase);
      if (safeScreen !== screen) {
        setScreen(safeScreen);
      }
    }
  }, [phase, profile.role, screen]);

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

  const toggleItem = (id: string) =>
    setChecked((p) => ({ ...p, [id]: !p[id] }));

  const toggleCategory = (id: string) =>
    setOpenCategories((p) => {
      const n = new Set(p);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const profileFilterInput: ProfileFilterInput = {
    role: profile.role ?? "utilisateur",
    gender: profile.gender,
    householdRole: profile.householdRole,
  };
  const visibleCategories = filterCategoriesForProfile(CHECKLIST_CATEGORIES, profileFilterInput);
  const visibleItemIds = getVisibleItemIds(CHECKLIST_CATEGORIES, profileFilterInput);

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

  const confirmStartJourney = async () => {
    if (!canUpdateOwnerCode(familyState, profile.id)) {
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

    setUnlockFailedAttempts(0);
    setUnlockLockedUntil(0);
    setStartError(null);
    setShowStartPrompt(false);
    setStartCodeInput("");
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
      setOwnerCodeHash(nextHash);
      setUnlockFailedAttempts(0);
      setUnlockLockedUntil(0);
      setNowTs(Date.now());
      setShowRecoveryPrompt(false);
      setShowStartPrompt(false);
      setStartCodeInput("");
      setStartError(null);
      resetRecoveryPromptState();
      setPhase("during");
      setScreen("dashboard");
    } catch {
      setRecoveryError("Une erreur est survenue. Réessayez.");
    }
  };

  const goToScreen = (s: Screen) => {
    if (!canAccessScreen(profile.role, phase, s)) {
      setAccessDeniedMessage(getAccessDeniedMessage(profile.role, phase, s));
      setScreen(getSafeScreen(profile.role, phase));
      return;
    }

    setAccessDeniedMessage(null);
    if (s === "game") {
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
    }
    setScreen(s);
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

  const resetForProfileSwitch = () => {
    try {
      localStorage.removeItem(ACTIVE_PROFILE_ID_KEY);
    } catch {
      // Ignore local storage failures; in-memory state reset still works.
    }

    setProfile({ id: createProfileId(), surname: "", role: null, gender: "unspecified", householdRole: "member" });
    setPhase("before");
    setScreen("checklist");
    setSelectedPlaceId(null);
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
    setUnlockFailedAttempts(0);
    setUnlockLockedUntil(0);

    lastCloudPushRef.current = null;
    hydratedCloudProfileIdRef.current = null;
    setIsProfileHydrationPending(false);
    setSelectedLoginProfileId(null);
    setCreateProfileSurname("");
    setPasswordPromptProfileId(null);
    setPasswordPromptInput("");
    setPasswordPromptError(null);
    setAuthError(null);
    setProfileError(null);
    setIsAuthBootstrapPending(false);
    setIsAuthenticated(false);
  };

  const answerQ = (idx: number) => {
    if (selectedAns !== null) return;
    setSelectedAns(idx);
    const newAnswers = [...answers, idx];
    setAnswers(newAnswers);
    setTimeout(() => {
      if (currentQ < QUESTIONS.length - 1) {
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
    (a, i) => a === QUESTIONS[i]?.correct
  ).length;
  const gameScore = correctCount * QUESTION_POINTS;
  const riddleScore = riddleSolved ? RIDDLE_POINTS : 0;
  const challengeScore = challengeDone ? CHALLENGE_POINTS : 0;

  const validateRiddle = () => {
    const normalizedInput = normalizeAnswer(riddleAnswer);
    if (!normalizedInput) {
      setRiddleFeedback("Entrez une réponse avant de valider.");
      setRiddleSolved(false);
      return;
    }

    const solved = normalizedInput === normalizeAnswer(DAILY_RIDDLE.answer);
    setRiddleValidated(true);
    setRiddleSolved(solved);
    setRiddleFeedback(
      solved
        ? `Bonne réponse ! Vous gagnez ${RIDDLE_POINTS} points.`
        : `Pas tout à fait. La bonne réponse était "${DAILY_RIDDLE.answer}".`
    );
  };

  const finishGameSession = () => {
    const entry: GameHistoryEntry = {
      day: TRIP.currentDay,
      location: TRIP.todayDestination,
      quizScore: gameScore,
      correctCount,
      riddleSolved,
      challengeDone,
      durationSec: quizDurationSec,
      totalScore: gameScore + riddleScore + challengeScore,
      completedAt: new Date().toISOString(),
    };

    setGameHistory((previous) => {
      return upsertGameHistory(previous, entry);
    });
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

  const visibleQuickActions = QUICK_ACTIONS.filter((item) =>
    canAccessScreen(profile.role, phase, item.id)
  );
  const visibleBottomNavItems = BOTTOM_NAV_ITEMS.filter((item) =>
    canAccessScreen(profile.role, phase, item.id)
  );
  const effectiveScreen = canAccessScreen(profile.role, phase, screen)
    ? screen
    : getSafeScreen(profile.role, phase);

  const renderScreen = () => {
    if (cloudEnabled && cloudAuthError) {
      return <CloudAccessErrorScreen reason={cloudAuthError} />;
    }

    if (cloudEnabled && (!cloudReady || isAuthBootstrapPending || isProfileHydrationPending)) {
      return <CloudLoadingScreen />;
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
              setAuthError(null);
              return;
            }

            setProfile((previous) => ({
              ...previous,
              id: selected.profileId,
              surname: selected.surname,
              role: selected.role,
            }));
            const nextPhase = selected.phase || cloudSnapshot.phase;
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
              const nextPhase = selected.phase || cloudSnapshot.phase;
              setPhase(nextPhase);
              setScreen(getPostAuthLandingScreen(nextPhase));
              setIsProfileHydrationPending(true);
              setAuthError(null);
              setPasswordPromptInput("");
              setPasswordPromptError(null);
              setPasswordPromptProfileId(null);
              setIsAuthenticated(true);
            };

            void confirm();
          }}
          onCancelPasswordPrompt={() => {
            setPasswordPromptInput("");
            setPasswordPromptError(null);
            setPasswordPromptProfileId(null);
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
          error={profileError}
          onSurnameChange={(v) => {
            setProfile((p) => ({ ...p, surname: v }));
            if (profileError) setProfileError(null);
          }}
          onGenderChange={(v) => setProfile((p) => ({ ...p, gender: v }))}
          onHouseholdRoleChange={(v) => setProfile((p) => ({ ...p, householdRole: v }))}
          onContinue={() => {
            if (cloudEnabled && !cloudReady) {
              setProfileError("Synchronisation cloud en cours. Patientez quelques secondes.");
              return;
            }

            const normalizedSurname = profile.surname.trim();
            if (!normalizedSurname) {
              setProfileError("Le surnom est obligatoire.");
              return;
            }

            const continueSetup = async () => {
              let assignedRole = assignRoleOnProfileCreation(familyState);
              let nextFamilyState: SharedFamilyState | null = null;

              if (cloudEnabled) {
                const result = await claimRoleForProfile(profile.id, normalizedSurname);
                if (result) {
                  assignedRole = result.assignedRole;
                  nextFamilyState = result.familyState;
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
              } else {
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

    if (phase === "before") {
      if (screen === "settings") {
        return (
          <SettingsScreen
            profile={profile}
            ownerCodeConfigured={ownerCodeHash.length > 0}
            ownerRecoveryConfigured={ownerRecoveryHash.length > 0}
            profilePasswordConfigured={currentProfilePasswordHash.length > 0}
            profileRecoveryConfigured={currentProfileRecoveryHash.length > 0}
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
              return { ok: true, message: "Code propriétaire mis à jour." };
            }}
            onSaveOwnerRecoveryPhrase={async (phrase) => {
              if (!canUpdateOwnerCode(familyState, profile.id)) {
                return {
                  ok: false,
                  message: "Seul le profil propriétaire peut configurer la phrase.",
                };
              }
              const normalized = phrase.trim();
              if (normalized.length < 5) {
                return {
                  ok: false,
                  message: "La phrase doit contenir au moins 5 caractères.",
                };
              }
              try {
                const nextHash = await hashOwnerRecoveryPhrase(normalized);
                setOwnerRecoveryHash(nextHash);
                return { ok: true, message: "Phrase de récupération mise à jour." };
              } catch (e) {
                const message = e instanceof Error ? e.message : "Erreur lors du hachage de la phrase.";
                return { ok: false, message };
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
            onSaveProfileRecoveryPhrase={async (phrase) => {
              const normalized = phrase.trim();
              if (normalized.length < 5) {
                return {
                  ok: false,
                  message: "La phrase doit contenir au moins 5 caractères.",
                };
              }
              const nextHash = await hashOwnerRecoveryPhrase(normalized);
              setProfileRecoveryHashes((previous) => ({
                ...previous,
                [profile.id]: nextHash,
              }));
              return { ok: true, message: "Phrase de récupération du profil mise à jour." };
            }}
            onSwitchProfile={resetForProfileSwitch}
          />
        );
      }

      if (effectiveScreen === "dashboard") {
        return <DashboardScreen quickActions={visibleQuickActions} onNavigate={goToScreen} />;
      }

      if (effectiveScreen === "guide") {
        return (
          <GuideScreen
            onBack={() => goToScreen("dashboard")}
            onPlaceSelect={openPlace}
          />
        );
      }

      if (effectiveScreen === "place") {
        return place ? (
          <PlaceScreen
            place={place}
            onBack={() => goToScreen("guide")}
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
            onReset={() => {
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
            }}
            onContinueToRiddle={() => setGameState("riddle")}
            onRiddleAnswerChange={(value) => {
              setRiddleAnswer(value);
              if (riddleFeedback) setRiddleFeedback(null);
            }}
            onValidateRiddle={validateRiddle}
            onContinueToChallenge={() => setGameState("challenge")}
            onCompleteChallenge={() => setChallengeDone(true)}
            onFinishSession={finishGameSession}
          />
        );
      }

      if (effectiveScreen === "results") {
        return (
          <ResultsScreen
            onBack={() => goToScreen("dashboard")}
            history={gameHistory}
          />
        );
      }

      if (effectiveScreen === "tips") {
        return <TipsScreen onBack={() => goToScreen("dashboard")} />;
      }

      return (
        <ChecklistScreen
          categories={visibleCategories}
          checked={checked}
          openCategories={openCategories}
          toggleItem={toggleItem}
          toggleCategory={toggleCategory}
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
        />
      );
    }
    switch (effectiveScreen) {
      case "checklist":
        return (
          <ChecklistScreen
            categories={visibleCategories}
            checked={checked}
            openCategories={openCategories}
            toggleItem={toggleItem}
            toggleCategory={toggleCategory}
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
          />
        );
      case "dashboard":
        return <DashboardScreen quickActions={visibleQuickActions} onNavigate={goToScreen} />;
      case "guide":
        return (
          <GuideScreen
            onBack={() => goToScreen("dashboard")}
            onPlaceSelect={openPlace}
          />
        );
      case "place":
        return place ? (
          <PlaceScreen
            place={place}
            onBack={() => goToScreen("guide")}
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
            onReset={() => {
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
            }}
            onContinueToRiddle={() => setGameState("riddle")}
            onRiddleAnswerChange={(value) => {
              setRiddleAnswer(value);
              if (riddleFeedback) setRiddleFeedback(null);
            }}
            onValidateRiddle={validateRiddle}
            onContinueToChallenge={() => setGameState("challenge")}
            onCompleteChallenge={() => setChallengeDone(true)}
            onFinishSession={finishGameSession}
          />
        );
      case "results":
        return (
          <ResultsScreen
            onBack={() => goToScreen("dashboard")}
            history={gameHistory}
          />
        );
      case "tips":
        return <TipsScreen onBack={() => goToScreen("dashboard")} />;
      case "settings":
        return (
          <SettingsScreen
            profile={profile}
            ownerCodeConfigured={ownerCodeHash.length > 0}
            ownerRecoveryConfigured={ownerRecoveryHash.length > 0}
            profilePasswordConfigured={currentProfilePasswordHash.length > 0}
            profileRecoveryConfigured={currentProfileRecoveryHash.length > 0}
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
              return { ok: true, message: "Code propriétaire mis à jour." };
            }}
            onSaveOwnerRecoveryPhrase={async (phrase) => {
              if (!canUpdateOwnerCode(familyState, profile.id)) {
                return {
                  ok: false,
                  message: "Seul le profil propriétaire peut configurer la phrase.",
                };
              }
              const normalized = phrase.trim();
              if (normalized.length < 5) {
                return {
                  ok: false,
                  message: "La phrase doit contenir au moins 5 caractères.",
                };
              }
              try {
                const nextHash = await hashOwnerRecoveryPhrase(normalized);
                setOwnerRecoveryHash(nextHash);
                return { ok: true, message: "Phrase de récupération mise à jour." };
              } catch (e) {
                const message = e instanceof Error ? e.message : "Erreur lors du hachage de la phrase.";
                return { ok: false, message };
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
            onSaveProfileRecoveryPhrase={async (phrase) => {
              const normalized = phrase.trim();
              if (normalized.length < 5) {
                return {
                  ok: false,
                  message: "La phrase doit contenir au moins 5 caractères.",
                };
              }
              const nextHash = await hashOwnerRecoveryPhrase(normalized);
              setProfileRecoveryHashes((previous) => ({
                ...previous,
                [profile.id]: nextHash,
              }));
              return { ok: true, message: "Phrase de récupération du profil mise à jour." };
            }}
            onSwitchProfile={resetForProfileSwitch}
          />
        );
      default:
        if (IS_DEV) {
          console.info(`[navigation] Unknown screen "${screen}" in phase "${phase}". Falling back to dashboard.`);
        }
        return <DashboardScreen quickActions={visibleQuickActions} onNavigate={goToScreen} />;
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
        {visibleBottomNavItems.length > 0 && (effectiveScreen !== "checklist" || canAccessScreen(profile.role, phase, "dashboard")) && (
          <BottomNav current={effectiveScreen} items={visibleBottomNavItems} onNavigate={goToScreen} />
        )}
      </div>
    </div>
  );
}
