import { loadGlobalTutorialSteps } from "./tutorial-loader";
import type { Role } from "../owner-policy";

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

function centerTutorialElement(element: Element | null) {
  if (!element || !(element instanceof HTMLElement)) return;
  if (typeof element.scrollIntoView !== "function") return;

  element.scrollIntoView({
    block: "center",
    inline: "center",
    behavior: "auto",
  });
}

function normalizeInteractiveDescription(description: string): string {
  const trimmed = description.trim();
  if (/cliquez maintenant[.!?]?$/i.test(trimmed)) {
    return trimmed;
  }
  return `${trimmed} Cliquez maintenant.`;
}

function resolveStepElement(step: ReturnType<typeof loadGlobalTutorialSteps>[number]) {
  if (step.id === "guide-day2") {
    return () => {
      let day2Option = document.querySelector(GUIDE_DAY2_OPTION);
      if (!day2Option) {
        const daySelector = document.querySelector<HTMLButtonElement>(GUIDE_DAY_SELECTOR);
        if (daySelector?.ariaExpanded !== "true") {
          daySelector?.click();
        }
        day2Option = document.querySelector(GUIDE_DAY2_OPTION);
      }

      centerTutorialElement(day2Option);
      return day2Option;
    };
  }

  if (typeof step.element !== "string") {
    return step.element;
  }

  return () => {
    const element = document.querySelector(step.element);
    centerTutorialElement(element);
    return element;
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

export async function startGlobalTutorial(
  role: Role | null = "utilisateur",
  tripStartDate: string | null = null
): Promise<void> {
  const rawSteps = loadGlobalTutorialSteps(role, tripStartDate);
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
