import { loadGlobalTutorialSteps } from "./tutorial-loader";

export type DriverLikeStep = {
  element: string | (() => Element | null);
  popover: {
    title: string;
    description: string;
    showButtons?: Array<"next" | "previous" | "close">;
  };
  disableActiveInteraction?: boolean;
  advanceOnClick?: boolean;
  waitForElement?: number;
};

const GUIDE_DAY_SELECTOR = '[data-tutorial-id="guide-day-selector"]';
const GUIDE_DAY2_OPTION = '[data-tutorial-id="guide-day-option-2"]';

function normalizeInteractiveDescription(description: string): string {
  const trimmed = description.trim();
  if (/cliquez maintenant[.!?]?$/i.test(trimmed)) {
    return trimmed;
  }
  return `${trimmed} Cliquez maintenant.`;
}

function resolveStepElement(step: ReturnType<typeof loadGlobalTutorialSteps>[number]) {
  if (step.id !== "guide-day2") {
    return step.element;
  }

  return () => {
    const day2Option = document.querySelector(GUIDE_DAY2_OPTION);
    if (day2Option) {
      return day2Option;
    }

    const daySelector = document.querySelector<HTMLButtonElement>(GUIDE_DAY_SELECTOR);
    if (daySelector?.ariaExpanded !== "true") {
      daySelector?.click();
    }

    return document.querySelector(GUIDE_DAY2_OPTION);
  };
}

// Converts global tutorial data to a Driver.js-compatible structure.
export function toDriverSteps(steps: ReturnType<typeof loadGlobalTutorialSteps>): DriverLikeStep[] {
  return steps.map((step) => ({
    element: resolveStepElement(step),
    popover: {
      title: step.popover.title,
      description: step.interactive
        ? normalizeInteractiveDescription(step.popover.description)
        : step.popover.description,
      showButtons: step.interactive ? ["previous", "close"] : undefined,
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
    overlayClickBehavior: () => {
      // Intentionally no-op: avoid accidental tutorial interruption on backdrop click.
    },
    disableActiveInteraction: true,
    overlayOpacity: 0.55,
    smoothScroll: true,
  });

  driverObj.drive();
}
