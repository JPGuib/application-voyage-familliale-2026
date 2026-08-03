import { loadGlobalTutorialSteps } from "./tutorial-loader";

export type DriverLikeStep = {
  element: string;
  popover: {
    title: string;
    description: string;
  };
  disableActiveInteraction?: boolean;
  advanceOnClick?: boolean;
  waitForElement?: number;
};

// Converts global tutorial data to a Driver.js-compatible structure.
export function toDriverSteps(steps: ReturnType<typeof loadGlobalTutorialSteps>): DriverLikeStep[] {
  return steps.map((step) => ({
    element: step.element,
    popover: {
      title: step.popover.title,
      description: step.popover.description,
    },
    disableActiveInteraction: !step.interactive,
    advanceOnClick: Boolean(step.interactive),
    waitForElement: step.waitForElement,
  }));
}

export async function startGlobalTutorial(): Promise<void> {
  const rawSteps = loadGlobalTutorialSteps();
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
    overlayClickBehavior: "close",
    disableActiveInteraction: true,
    overlayOpacity: 0.55,
    smoothScroll: true,
  });

  driverObj.drive();
}
