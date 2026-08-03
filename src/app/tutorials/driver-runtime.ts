import type { DriverStepConfig } from "./generated/driver-accueil";
import { loadTutorialSteps, type TutorialProfile } from "./tutorial-loader";

export type DriverLikeStep = {
  element: string;
  popover: {
    title: string;
    description: string;
  };
};

// Converts generated tutorial data to a Driver.js-compatible structure.
export function toDriverSteps(steps: DriverStepConfig[]): DriverLikeStep[] {
  return steps.map((step) => ({
    element: step.element,
    popover: {
      title: step.popover.title,
      description: step.popover.description,
    },
  }));
}

export async function startTutorialFromProfile(profile: TutorialProfile): Promise<void> {
  const rawSteps = loadTutorialSteps(profile);
  const steps = toDriverSteps(rawSteps);
  if (steps.length === 0) return;

  const [{ driver }] = await Promise.all([
    import("driver.js"),
    import("driver.js/dist/driver.css"),
  ]);

  const driverObj = driver({
    steps,
    showProgress: true,
    progressText: "{{current}} / {{total}}",
    allowClose: true,
    overlayOpacity: 0.55,
    smoothScroll: true,
  });

  driverObj.drive();
}
