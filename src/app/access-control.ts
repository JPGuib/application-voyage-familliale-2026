import type { Role } from "./owner-policy";

export type TravelPhase = "before" | "during";

export type AccessSection =
  | "checklist"
  | "dashboard"
  | "guide"
  | "game"
  | "tips"
  | "results"
  | "settings"
  | "owner-code-actions";

export type AppScreen =
  | "checklist"
  | "dashboard"
  | "guide"
  | "place"
  | "game"
  | "results"
  | "tips"
  | "settings";

const OWNER_ALLOWED: ReadonlyArray<AccessSection> = [
  "checklist",
  "dashboard",
  "guide",
  "game",
  "tips",
  "results",
  "settings",
  "owner-code-actions",
];

const USER_BEFORE_ALLOWED: ReadonlyArray<AccessSection> = ["checklist", "settings"];

const USER_AFTER_ALLOWED: ReadonlyArray<AccessSection> = [
  "checklist",
  "dashboard",
  "guide",
  "game",
  "tips",
  "results",
  "settings",
];

function screenToSection(screen: AppScreen): AccessSection {
  if (screen === "place") {
    return "guide";
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

  if (role === "utilisateur" && phase === "before") {
    return "Acces refuse: deblocage proprietaire requis pour cette rubrique.";
  }

  return "Acces refuse: cette rubrique n est pas disponible pour ce profil.";
}
