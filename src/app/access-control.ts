import type { Role } from "./owner-policy";

export type TravelPhase = "before" | "during";

export type AccessSection =
  | "checklist"
  | "dashboard"
  | "guide"
  | "planning"
  | "documents"
  | "histoire"
  | "geographie"
  | "culture"
  | "game"
  | "tips"
  | "results"
  | "settings"
  | "owner-code-actions";

export type AppScreen =
  | "checklist"
  | "dashboard"
  | "guide"
  | "planning"
  | "documents"
  | "offline-media"
  | "map"
  | "place"
  | "histoire"
  | "histoire-topic"
  | "geographie"
  | "geographie-topic"
  | "culture"
  | "culture-topic"
  | "visite-guidee"
  | "game"
  | "trivial"
  | "jeux"
  | "candy-crush"
  | "ordalie"
  | "imposteur"
  | "results"
  | "tips"
  | "settings";

const OWNER_ALLOWED: ReadonlyArray<AccessSection> = [
  "checklist",
  "dashboard",
  "guide",
  "planning",
  "documents",
  "histoire",
  "geographie",
  "culture",
  "game",
  "tips",
  "results",
  "settings",
  "owner-code-actions",
];

const USER_BEFORE_ALLOWED: ReadonlyArray<AccessSection> = ["checklist", "documents", "settings"];

const USER_AFTER_ALLOWED: ReadonlyArray<AccessSection> = [
  "checklist",
  "dashboard",
  "guide",
  "planning",
  "documents",
  "histoire",
  "geographie",
  "culture",
  "game",
  "tips",
  "results",
  "settings",
];

// Le visiteur (story 24.3, restreint le 2026-08-01) suit le voyage sans
// checklist ni jeu/résultats ni action code propriétaire, et n'est jamais
// bloqué par la phase avant/pendant : il suit dès sa création, contrairement
// à l'utilisateur qui attend le déblocage.
const VISITOR_ALLOWED: ReadonlyArray<AccessSection> = [
  "dashboard",
  "guide",
  "planning",
  "documents",
  "histoire",
  "geographie",
  "culture",
  "tips",
  "settings",
];

function screenToSection(screen: AppScreen): AccessSection {
  if (screen === "offline-media") {
    return "tips";
  }

  if (screen === "map" || screen === "place" || screen === "visite-guidee") {
    return "guide";
  }

  if (screen === "histoire-topic") {
    return "histoire";
  }

  if (screen === "geographie-topic") {
    return "geographie";
  }

  if (screen === "culture-topic") {
    return "culture";
  }

  // Le Trivial Turquie, Candy Crush, l'Ordalie des 5 Sens et l'Imposteur
  // Turque suivent exactement les mêmes règles d'accès que le jeu du jour :
  // propriétaire toujours, voyageur (rôle "utilisateur") une fois le séjour
  // commencé, visiteur jamais. "jeux" est le hub de lancement commun aux 4.
  if (
    screen === "trivial" ||
    screen === "jeux" ||
    screen === "candy-crush" ||
    screen === "ordalie" ||
    screen === "imposteur"
  ) {
    return "game";
  }

  return screen;
}

export function getAllowedSections(role: Role | null, phase: TravelPhase): AccessSection[] {
  if (role === null) {
    return [...USER_BEFORE_ALLOWED];
  }

  if (role === "proprietaire") {
    return [...OWNER_ALLOWED];
  }

  if (role === "visiteur") {
    return [...VISITOR_ALLOWED];
  }

  return phase === "during" ? [...USER_AFTER_ALLOWED] : [...USER_BEFORE_ALLOWED];
}

export function canAccessSection(
  role: Role | null,
  phase: TravelPhase,
  section: AccessSection
): boolean {
  return getAllowedSections(role, phase).includes(section);
}

export function canAccessScreen(
  role: Role | null,
  phase: TravelPhase,
  screen: AppScreen
): boolean {
  return canAccessSection(role, phase, screenToSection(screen));
}

export function getVisibleNavScreens(
  role: Role | null,
  phase: TravelPhase,
  screens: AppScreen[]
): AppScreen[] {
  return screens.filter((screen) => canAccessScreen(role, phase, screen));
}

export function getSafeScreen(role: Role | null, phase: TravelPhase): AppScreen {
  if (canAccessScreen(role, phase, "dashboard")) {
    return "dashboard";
  }

  if (canAccessScreen(role, phase, "checklist")) {
    return "checklist";
  }

  return "settings";
}

export function getAccessDeniedMessage(
  role: Role | null,
  phase: TravelPhase,
  screen: AppScreen
): string {
  const section = screenToSection(screen);

  if (section === "owner-code-actions" || (section === "settings" && role !== "proprietaire")) {
    return "Acces refuse: cette action est reservee au profil proprietaire.";
  }

  if (role === "visiteur" && (section === "checklist" || section === "game" || section === "results")) {
    return "Cette rubrique est reservee aux voyageurs.";
  }

  if (role === "utilisateur" && phase === "before") {
    return "Acces refuse: deblocage proprietaire requis pour cette rubrique.";
  }

  return "Acces refuse: cette rubrique n est pas disponible pour ce profil.";
}
