import { ACCUEIL_DRIVER_STEPS, type DriverStepConfig } from "./generated/driver-accueil";

export type TutorialProfile = "decouverte" | "premiere-utilisation" | "avance" | "administration";

type Selector = DriverStepConfig["element"];

const PROFILE_SELECTOR_MAP: Record<TutorialProfile, Selector[]> = {
  "decouverte": [
    '[data-tutorial-id="dashboard-today-card"]',
    '[data-tutorial-id="dashboard-planning"]',
    '[data-tutorial-id="bottom-nav-dashboard"]',
  ],
  "premiere-utilisation": [
    '[data-tutorial-id="dashboard-settings"]',
    '[data-tutorial-id="dashboard-today-card"]',
    '[data-tutorial-id="dashboard-planning"]',
    '[data-tutorial-id="dashboard-map-preview"]',
  ],
  "avance": [
    '[data-tutorial-id="dashboard-planning"]',
    '[data-tutorial-id="dashboard-map-preview"]',
    '[data-tutorial-id="bottom-nav-dashboard"]',
  ],
  "administration": [
    '[data-tutorial-id="dashboard-settings"]',
    '[data-tutorial-id="bottom-nav-dashboard"]',
  ],
};

function filterBySelectors(selectors: Selector[]): DriverStepConfig[] {
  const selectorSet = new Set(selectors);
  return ACCUEIL_DRIVER_STEPS.filter((step) => selectorSet.has(step.element));
}

export function loadTutorialSteps(profile: TutorialProfile): DriverStepConfig[] {
  const filtered = filterBySelectors(PROFILE_SELECTOR_MAP[profile]);
  // Safety fallback: if generated selectors changed, keep tutorial usable.
  return filtered.length > 0 ? filtered : ACCUEIL_DRIVER_STEPS;
}
