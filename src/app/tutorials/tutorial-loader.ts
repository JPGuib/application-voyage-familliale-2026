import { ACCUEIL_DRIVER_STEPS, type DriverStepConfig } from "./generated/driver-accueil";

export type TutorialProfile = "decouverte" | "premiere-utilisation" | "avance" | "administration";

// V1 scope: we always return the Accueil tutorial set.
export function loadTutorialSteps(_profile: TutorialProfile): DriverStepConfig[] {
  return ACCUEIL_DRIVER_STEPS;
}
