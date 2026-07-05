import { useState, useEffect } from "react";
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
import { TIPS } from "../content/tips";

// ─── DATA ────────────────────────────────────────────────────────────────────

const CHECKLIST_CATEGORIES = [
  {
    id: "bagages",
    emoji: "🧳",
    label: "Bagages",
    items: [
      { id: "valise", label: "Valise principale" },
      { id: "cabine", label: "Bagage cabine" },
      { id: "sac-dos", label: "Sac à dos" },
      { id: "cadenas", label: "Cadenas TSA" },
    ],
  },
  {
    id: "documents",
    emoji: "📄",
    label: "Documents",
    items: [
      { id: "passeports", label: "Passeports valides" },
      { id: "visas", label: "Visas Japon" },
      { id: "billets", label: "Billets d'avion imprimés" },
      { id: "hotels", label: "Réservations hôtels" },
      { id: "assurance", label: "Assurance voyage" },
    ],
  },
  {
    id: "electronique",
    emoji: "🔌",
    label: "Électronique",
    items: [
      { id: "phones", label: "Téléphones chargés" },
      { id: "adaptateurs", label: "Adaptateurs prise japonaise" },
      { id: "powerbank", label: "Power bank" },
      { id: "photo", label: "Appareil photo + chargeur" },
      { id: "sim", label: "Carte SIM internationale" },
    ],
  },
  {
    id: "indispensables",
    emoji: "⭐",
    label: "Indispensables",
    items: [
      { id: "pharmacie", label: "Trousse à pharmacie" },
      { id: "yens", label: "Yens (cash)" },
      { id: "carte-banque", label: "Carte bancaire internationale" },
      { id: "snacks", label: "Snacks pour l'avion" },
    ],
  },
  {
    id: "personnels",
    emoji: "👗",
    label: "Effets personnels",
    items: [
      { id: "vetements", label: "Vêtements (7 tenues)" },
      { id: "chaussures", label: "Chaussures confortables" },
      { id: "impermeable", label: "Imperméable" },
      { id: "toilette", label: "Trousse de toilette" },
      { id: "lunettes", label: "Lunettes de soleil" },
      { id: "creme", label: "Crème solaire SPF 50" },
    ],
  },
];

const CHECKLIST_ITEM_IDS = new Set(
  CHECKLIST_CATEGORIES.flatMap((category) =>
    category.items.map((item) => item.id)
  )
);

const PLACES = [
  {
    id: "arashiyama",
    name: "Bambouseraie d'Arashiyama",
    shortDesc: "Une forêt de bambous géants, féerique et mystérieuse",
    tag: "Nature",
    image:
      "https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=800&h=500&fit=crop&auto=format",
    history:
      "La bambouseraie d'Arashiyama est l'un des sites les plus emblématiques du Japon. Ces bambous géants, certains atteignant 30 mètres de hauteur, ont été cultivés depuis le XIVe siècle pour de multiples usages : artisanat, alimentation et construction traditionnelle.",
    anecdotes: [
      "Le bruit du vent dans les bambous est classé parmi les 100 sons du patrimoine japonais à préserver.",
      "Des macaques japonais se promènent librement entre les bambous.",
      "Au lever du soleil, la lumière filtrée crée une atmosphère quasi magique, unique au monde.",
    ],
  },
  {
    id: "fushimi",
    name: "Sanctuaire Fushimi Inari",
    shortDesc: "Des milliers de torii orangés sur la montagne sacrée",
    tag: "Temple",
    image:
      "https://images.unsplash.com/photo-1478436127897-769e1b3f0f36?w=800&h=500&fit=crop&auto=format",
    history:
      "Fondé en 711, Fushimi Inari-taisha est l'un des sanctuaires shintoïstes les plus importants du Japon. Dédié à Inari, dieu du riz et du commerce, il est célèbre pour ses milliers de torii vermillon formant des tunnels sur 4 kilomètres de montagne.",
    anecdotes: [
      "Plus de 10 000 torii orangés ont été offerts par des commerçants et entreprises japonaises.",
      "Les renards (kitsune) sont les messagers du dieu Inari — cherchez leurs statues !",
      "La montée complète jusqu'au sommet dure environ 2h30 avec vue panoramique sur Kyoto.",
    ],
  },
  {
    id: "kinkakuji",
    name: "Temple d'or Kinkaku-ji",
    shortDesc: "Le pavillon doré qui se reflète dans l'étang Kyoko-chi",
    tag: "Temple",
    image:
      "https://images.unsplash.com/photo-1545569341-9eb8b30979d9?w=800&h=500&fit=crop&auto=format",
    history:
      "Construit en 1397 comme villa de retraite du shogun Ashikaga Yoshimitsu, Kinkaku-ji est recouvert de feuilles d'or véritable. Brûlé en 1950 par un moine bouddhiste, il fut reconstruit à l'identique en 1955.",
    anecdotes: [
      "Les deux étages supérieurs sont recouverts de feuilles d'or 24 carats.",
      "L'incendie de 1950 a inspiré un célèbre roman du grand écrivain Mishima Yukio.",
      "Le reflet parfait dans l'étang crée l'illusion de deux pavillons dorés.",
    ],
  },
];

const QUESTIONS = [
  {
    q: "Combien de torii orangés trouve-t-on à Fushimi Inari ?",
    options: ["Plus de 10 000", "Environ 1 000", "Exactement 5 000", "Moins de 500"],
    correct: 0,
    expl: "Plus de 10 000 torii ! Tous offerts par des commerçants et entreprises japonaises.",
  },
  {
    q: "Quel animal symbolise le dieu Inari ?",
    options: ["Le dragon 🐉", "Le tigre 🐯", "Le renard 🦊", "La grue 🦩"],
    correct: 2,
    expl: "Le renard (kitsune) est le messager du dieu Inari. Des statues gardent chaque torii !",
  },
  {
    q: "Quelle est la hauteur max des bambous d'Arashiyama ?",
    options: ["5 mètres", "15 mètres", "30 mètres", "50 mètres"],
    correct: 2,
    expl: "Certains bambous atteignent 30 mètres — plus haut qu'un immeuble de 10 étages !",
  },
  {
    q: "En quelle année le Temple d'or a-t-il été incendié ?",
    options: ["1945", "1950", "1960", "1970"],
    correct: 1,
    expl: "Kinkaku-ji a été brûlé en 1950, puis reconstruit à l'identique en 1955.",
  },
  {
    q: "Quel son est classé patrimoine sonore du Japon ?",
    options: ["La cloche du temple", "Le vent dans les bambous", "Le chant des cigales", "Le Shinkansen"],
    correct: 1,
    expl: "Le vent dans les bambous d'Arashiyama est officiellement classé patrimoine sonore national !",
  },
];

// ─── TYPES ───────────────────────────────────────────────────────────────────

type Screen = "checklist" | "dashboard" | "guide" | "place" | "game" | "results" | "tips" | "settings";
type QuickScreen = "guide" | "game" | "tips" | "results";
type GameState = "intro" | "playing" | "done";
type Role = "proprietaire" | "utilisateur";
type Profile = {
  surname: string;
  role: Role | null;
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
    subtitle: "Quiz Kyoto",
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
  error,
  onSurnameChange,
  onRoleChange,
  onContinue,
}: {
  profile: Profile;
  error: string | null;
  onSurnameChange: (v: string) => void;
  onRoleChange: (v: Role) => void;
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
            Entrez un surnom et choisissez votre rôle pour commencer.
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
            Rôle
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => onRoleChange("proprietaire")}
              className={`rounded-xl px-3 py-3 text-sm font-black transition-all border ${
                profile.role === "proprietaire"
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-foreground border-border"
              }`}
            >
              Propriétaire
            </button>
            <button
              onClick={() => onRoleChange("utilisateur")}
              className={`rounded-xl px-3 py-3 text-sm font-black transition-all border ${
                profile.role === "utilisateur"
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-foreground border-border"
              }`}
            >
              Utilisateur
            </button>
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

// ─── BOTTOM NAV ──────────────────────────────────────────────────────────────

function BottomNav({
  current,
  onNavigate,
}: {
  current: Screen;
  onNavigate: (s: Screen) => void;
}) {
  const activeId = current === "place" ? "guide" : current;
  return (
    <nav className="flex-shrink-0 bg-card border-t border-border flex items-center justify-around px-2 py-2">
      {BOTTOM_NAV_ITEMS.map((item) => {
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
  lockRemainingSec,
  onOpenSettings,
  onStart,
  onStartCodeChange,
  onConfirmStart,
  onCancelStartPrompt,
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
  lockRemainingSec: number;
  onOpenSettings: () => void;
  onStart: () => void;
  onStartCodeChange: (v: string) => void;
  onConfirmStart: () => void;
  onCancelStartPrompt: () => void;
}) {
  const remainingItems = Math.max(totalItems - checkedCount, 0);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="relative bg-primary text-primary-foreground px-6 pt-12 pb-8 flex-shrink-0">
        <MemphisDecor />
        <div className="relative z-10">
          <div className="flex items-center justify-between gap-3 mb-1">
            <p className="text-xs font-extrabold opacity-80 tracking-widest uppercase">
              ✈️ Avant le départ
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
                  {cat.items.map((item) => (
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
                      <span
                        className={`text-sm font-semibold transition-all ${
                          checked[item.id]
                            ? "line-through text-muted-foreground"
                            : "text-foreground"
                        }`}
                      >
                        {item.label}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        <div className="h-4" />
      </div>

      {/* CTA */}
      <div className="flex-shrink-0 px-4 pb-8 pt-3 bg-background border-t border-border">
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
      </div>

      {startPromptOpen && (
        <div className="absolute inset-0 bg-black/45 backdrop-blur-[1px] flex items-end md:items-center justify-center p-4 z-20">
          <div className="w-full md:max-w-sm bg-card rounded-2xl border border-border p-4">
            <p className="text-sm font-black text-foreground">Validation propriétaire</p>
            <p className="text-xs text-muted-foreground mt-1">
              Entrez le code propriétaire pour débloquer le voyage.
            </p>

            <input
              type="password"
              value={startCode}
              onChange={(e) => onStartCodeChange(e.target.value)}
              placeholder="Code propriétaire"
              className="mt-3 w-full rounded-xl bg-input-background px-3 py-3 text-sm font-semibold text-foreground outline-none ring-2 ring-transparent focus:ring-primary/30"
            />

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
                onClick={onConfirmStart}
                className="rounded-xl py-3 text-sm font-black bg-primary text-primary-foreground"
              >
                Valider
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
  onNavigate,
}: {
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
          {QUICK_ACTIONS.map((item) => (
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
            alt="Fushimi Inari, Kyoto"
            className="w-full h-full object-cover"
          />
          <div className="absolute bottom-3 left-3">
            <span className="bg-black/50 text-white text-xs font-bold px-3 py-1.5 rounded-full backdrop-blur-sm">
              📍 Fushimi Inari, Kyoto
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
          Guide de Kyoto 📖
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
  isPlaying,
  togglePlay,
}: {
  place: (typeof PLACES)[0];
  onBack: () => void;
  isPlaying: boolean;
  togglePlay: () => void;
}) {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="relative h-64 bg-muted flex-shrink-0">
        <img
          src={place.image}
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
            onClick={togglePlay}
            className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0 shadow-md active:scale-95 transition-transform"
          >
            {isPlaying ? <Pause size={20} /> : <Play size={20} />}
          </button>
          <div className="flex-1">
            <p className="text-sm font-black text-foreground">
              Narration audio
            </p>
            <p className="text-xs text-muted-foreground">Durée : 3 min 24 sec</p>
            <div className="mt-2 bg-border rounded-full h-1.5">
              <div
                className="bg-primary h-1.5 rounded-full transition-all duration-1000"
                style={{ width: isPlaying ? "35%" : "0%" }}
              />
            </div>
          </div>
          <Volume2 size={18} className="text-primary" />
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
  onStart,
  onAnswer,
  onBack,
  onReset,
}: {
  gameState: GameState;
  currentQ: number;
  selectedAns: number | null;
  answers: number[];
  correctCount: number;
  gameScore: number;
  onStart: () => void;
  onAnswer: (idx: number) => void;
  onBack: () => void;
  onReset: () => void;
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
            Quiz Kyoto — Jour {TRIP.currentDay}
          </p>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <div className="text-8xl mb-6">🏯</div>
          <h2 className="text-2xl font-black text-foreground mb-2">
            Prêts pour le défi ?
          </h2>
          <p className="text-sm text-muted-foreground mb-2">
            {QUESTIONS.length} questions sur les lieux visités aujourd&apos;hui à Kyoto.
          </p>
          <p className="text-sm text-muted-foreground mb-10">
            Chaque bonne réponse rapporte{" "}
            <strong className="text-primary">20 points</strong> à l&apos;équipe !
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
            onClick={onReset}
            className="bg-primary text-primary-foreground rounded-2xl py-4 px-8 font-black active:scale-95 transition-transform mb-6"
          >
            Rejouer 🔄
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
            {answers.filter((a, i) => a === QUESTIONS[i]?.correct).length * 20} pts
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
  gameScore,
  correctCount,
}: {
  onBack: () => void;
  gameScore: number;
  correctCount: number;
}) {
  const badges = [
    { icon: "🏛️", name: "Maître Culture", desc: "5 quiz complétés", earned: true },
    { icon: "🗺️", name: "Grand Explorateur", desc: "4 lieux découverts", earned: true },
    { icon: "⚡", name: "Éclair", desc: "Quiz en moins de 2 min", earned: false },
    {
      icon: "🎯",
      name: "Sans faute !",
      desc: "Score parfait",
      earned: correctCount === QUESTIONS.length,
    },
  ];
  const dailyScores = [
    { day: 1, location: "Tokyo", score: 80 },
    { day: 2, location: "Tokyo", score: 95 },
    { day: 3, location: "Nara", score: 75 },
    { day: 4, location: "Kyoto", score: gameScore > 0 ? gameScore : 90 },
  ];
  const total = dailyScores.reduce((s, d) => s + d.score, 0);
  const maxTotal = dailyScores.length * 100;

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
                      style={{ width: `${d.score}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
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
          Tout ce qu&apos;il faut savoir pour le Japon
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
  onBack,
  onSaveSurname,
  onSaveOwnerCode,
}: {
  profile: Profile;
  ownerCodeConfigured: boolean;
  onBack: () => void;
  onSaveSurname: (surname: string) => { ok: boolean; message: string };
  onSaveOwnerCode: (code: string) => { ok: boolean; message: string };
}) {
  const [surnameInput, setSurnameInput] = useState(profile.surname);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [ownerCodeInput, setOwnerCodeInput] = useState("");
  const [ownerCodeFeedback, setOwnerCodeFeedback] = useState<string | null>(null);

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
              type="password"
              value={ownerCodeInput}
              onChange={(e) => {
                setOwnerCodeInput(e.target.value);
                if (ownerCodeFeedback) setOwnerCodeFeedback(null);
              }}
              placeholder="Minimum 4 caractères"
              className="mt-2 w-full rounded-xl bg-input-background px-3 py-3 text-sm font-semibold text-foreground outline-none ring-2 ring-transparent focus:ring-primary/30"
            />
            <button
              onClick={() => {
                const result = onSaveOwnerCode(ownerCodeInput);
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
      </div>
    </div>
  );
}

// ─── MAIN APP ────────────────────────────────────────────────────────────────

export default function App() {
  const [profile, setProfile] = useState<Profile>(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem("jp-profile") || "{}");
      const role =
        parsed?.role === "proprietaire" || parsed?.role === "utilisateur"
          ? parsed.role
          : null;
      return {
        surname: typeof parsed?.surname === "string" ? parsed.surname : "",
        role,
      };
    } catch {
      return { surname: "", role: null };
    }
  });
  const [profileError, setProfileError] = useState<string | null>(null);
  const [phase, setPhase] = useState<"before" | "during">(() => {
    try {
      return (
        (localStorage.getItem("jp-phase") as "before" | "during") || "before"
      );
    } catch {
      return "before";
    }
  });
  const [screen, setScreen] = useState<Screen>("checklist");
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [openCategories, setOpenCategories] = useState<Set<string>>(
    new Set(["bagages"])
  );
  const [checked, setChecked] = useState<Record<string, boolean>>(() => {
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
  const [ownerCode, setOwnerCode] = useState<string>(() => {
    try {
      return localStorage.getItem("jp-owner-code") || "";
    } catch {
      return "";
    }
  });
  const [showStartPrompt, setShowStartPrompt] = useState(false);
  const [startCodeInput, setStartCodeInput] = useState("");
  const [startError, setStartError] = useState<string | null>(null);
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
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem("jp-profile", JSON.stringify(profile));
      localStorage.setItem("jp-owner-code", ownerCode);
      localStorage.setItem("jp-phase", phase);
      localStorage.setItem("jp-checklist", JSON.stringify(checked));
      localStorage.setItem(
        "jp-unlock-failed-attempts",
        String(unlockFailedAttempts)
      );
      localStorage.setItem("jp-unlock-locked-until", String(unlockLockedUntil));
    } catch {}
  }, [
    profile,
    ownerCode,
    phase,
    checked,
    unlockFailedAttempts,
    unlockLockedUntil,
  ]);

  useEffect(() => {
    if (unlockLockedUntil <= Date.now()) return;
    const id = setInterval(() => setNowTs(Date.now()), 500);
    return () => clearInterval(id);
  }, [unlockLockedUntil]);

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

  const totalItems = CHECKLIST_CATEGORIES.reduce(
    (s, c) => s + c.items.length,
    0
  );
  const checkedCount = Array.from(CHECKLIST_ITEM_IDS).filter(
    (id) => checked[id]
  ).length;
  const pctRaw = totalItems > 0 ? Math.round((checkedCount / totalItems) * 100) : 0;
  const pct = Math.max(0, Math.min(100, pctRaw));

  const startJourney = () => {
    setStartError(null);
    setStartCodeInput("");
    setShowStartPrompt(true);
  };

  const lockRemainingMs = Math.max(0, unlockLockedUntil - nowTs);
  const lockRemainingSec = Math.ceil(lockRemainingMs / 1000);

  const confirmStartJourney = () => {
    if (profile.role !== "proprietaire") {
      setStartError("Seul le profil propriétaire peut débloquer le voyage.");
      return;
    }
    if (!ownerCode) {
      setStartError("Configurez d'abord un code propriétaire dans Paramètres.");
      return;
    }
    if (lockRemainingMs > 0) {
      setStartError(`Trop de tentatives. Réessayez dans ${lockRemainingSec}s.`);
      return;
    }

    if (startCodeInput.trim() !== ownerCode) {
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

  const goToScreen = (s: Screen) => {
    if (s === "game") {
      setGameState("intro");
      setAnswers([]);
      setCurrentQ(0);
      setSelectedAns(null);
    }
    setScreen(s);
  };

  const openPlace = (id: string) => {
    setSelectedPlaceId(id);
    setIsPlaying(false);
    setScreen("place");
  };

  const place = PLACES.find((p) => p.id === selectedPlaceId);

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
        setGameState("done");
      }
    }, 1400);
  };

  const correctCount = answers.filter(
    (a, i) => a === QUESTIONS[i]?.correct
  ).length;
  const gameScore = correctCount * 20;

  const renderScreen = () => {
    if (!profileReady) {
      return (
        <ProfileSetupScreen
          profile={profile}
          error={profileError}
          onSurnameChange={(v) => {
            setProfile((p) => ({ ...p, surname: v }));
            if (profileError) setProfileError(null);
          }}
          onRoleChange={(v) => {
            setProfile((p) => ({ ...p, role: v }));
            if (profileError) setProfileError(null);
          }}
          onContinue={() => {
            if (!profile.surname.trim() || !profile.role) {
              setProfileError("Le surnom et le rôle sont obligatoires.");
              return;
            }
            setProfile((p) => ({ ...p, surname: p.surname.trim() }));
            setProfileError(null);
          }}
        />
      );
    }

    if (phase === "before") {
      if (screen === "settings") {
        return (
          <SettingsScreen
            profile={profile}
            ownerCodeConfigured={ownerCode.length > 0}
            onBack={() => goToScreen("checklist")}
            onSaveSurname={(surname) => {
              const normalized = surname.trim();
              if (!normalized) {
                return { ok: false, message: "Le surnom est obligatoire." };
              }
              setProfile((p) => ({ ...p, surname: normalized }));
              return { ok: true, message: "Surnom mis à jour." };
            }}
            onSaveOwnerCode={(code) => {
              if (profile.role !== "proprietaire") {
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
              setOwnerCode(normalized);
              return { ok: true, message: "Code propriétaire mis à jour." };
            }}
          />
        );
      }

      return (
        <ChecklistScreen
          categories={CHECKLIST_CATEGORIES}
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
          lockRemainingSec={lockRemainingSec}
          onOpenSettings={() => goToScreen("settings")}
          onStart={startJourney}
          onStartCodeChange={(v) => {
            setStartCodeInput(v);
            if (startError) setStartError(null);
          }}
          onConfirmStart={confirmStartJourney}
          onCancelStartPrompt={() => {
            setShowStartPrompt(false);
            setStartCodeInput("");
            setStartError(null);
          }}
        />
      );
    }
    switch (screen) {
      case "dashboard":
        return <DashboardScreen onNavigate={goToScreen} />;
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
            isPlaying={isPlaying}
            togglePlay={() => setIsPlaying((p) => !p)}
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
            onStart={() => {
              setGameState("playing");
              setCurrentQ(0);
              setSelectedAns(null);
              setAnswers([]);
            }}
            onAnswer={answerQ}
            onBack={() => goToScreen("dashboard")}
            onReset={() => {
              setGameState("intro");
              setAnswers([]);
              setCurrentQ(0);
              setSelectedAns(null);
            }}
          />
        );
      case "results":
        return (
          <ResultsScreen
            onBack={() => goToScreen("dashboard")}
            gameScore={gameScore}
            correctCount={correctCount}
          />
        );
      case "tips":
        return <TipsScreen onBack={() => goToScreen("dashboard")} />;
      case "settings":
        return (
          <SettingsScreen
            profile={profile}
            ownerCodeConfigured={ownerCode.length > 0}
            onBack={() => goToScreen("dashboard")}
            onSaveSurname={(surname) => {
              const normalized = surname.trim();
              if (!normalized) {
                return { ok: false, message: "Le surnom est obligatoire." };
              }
              setProfile((p) => ({ ...p, surname: normalized }));
              return { ok: true, message: "Surnom mis à jour." };
            }}
            onSaveOwnerCode={(code) => {
              if (profile.role !== "proprietaire") {
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
              setOwnerCode(normalized);
              return { ok: true, message: "Code propriétaire mis à jour." };
            }}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#B8A898] md:flex md:items-center md:justify-center md:p-6">
      <div className="relative w-full md:max-w-[390px] h-screen md:h-[844px] bg-background overflow-hidden flex flex-col md:rounded-[3rem] md:shadow-2xl">
        {renderScreen()}
        {phase === "during" && screen !== "checklist" && (
          <BottomNav current={screen} onNavigate={goToScreen} />
        )}
      </div>
    </div>
  );
}
