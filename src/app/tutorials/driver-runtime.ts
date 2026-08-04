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

const GUIDE_DAY_SELECTOR = '[data-tutorial-id="guide-day-selector"]';
const GUIDE_DAY2_OPTION = '[data-tutorial-id="guide-day-option-2"]';
const GUIDE_DAY2_STEP_TITLE = "Passer au Jour 2";
const POPOVER_TITLE_SELECTOR = ".driver-popover-title";
const NEXT_BUTTON_SELECTOR = ".driver-popover-next-btn";

function normalizeInteractiveDescription(description: string): string {
  const trimmed = description.trim();
  if (/cliquez maintenant[.!?]?$/i.test(trimmed)) {
    return trimmed;
  }
  return `${trimmed} Cliquez maintenant.`;
}

function setupInteractiveUxGuards(
  rawSteps: ReturnType<typeof loadGlobalTutorialSteps>
): () => void {
  let disposed = false;
  const interactiveTitles = new Set(
    rawSteps
      .filter((step) => step.interactive)
      .map((step) => step.popover.title.trim())
  );

  const applyGuards = () => {
    if (disposed) return;

    const title = document.querySelector(POPOVER_TITLE_SELECTOR)?.textContent?.trim() ?? "";

    const nextButton = document.querySelector<HTMLElement>(NEXT_BUTTON_SELECTOR);
    if (nextButton) {
      const isInteractiveStep = interactiveTitles.has(title);
      nextButton.style.display = isInteractiveStep ? "none" : "";
      nextButton.setAttribute("aria-hidden", isInteractiveStep ? "true" : "false");
    }

    if (title !== GUIDE_DAY2_STEP_TITLE) return;

    const day2Option = document.querySelector(GUIDE_DAY2_OPTION);
    if (day2Option) return;

    const daySelector = document.querySelector<HTMLButtonElement>(GUIDE_DAY_SELECTOR);
    daySelector?.click();
  };

  const observer = new MutationObserver(() => {
    applyGuards();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    characterData: true,
  });

  const intervalId = window.setInterval(applyGuards, 150);
  const timeoutId = window.setTimeout(() => {
    cleanup();
  }, 5 * 60 * 1000);

  function cleanup() {
    if (disposed) return;
    disposed = true;
    observer.disconnect();
    window.clearInterval(intervalId);
    window.clearTimeout(timeoutId);
    const nextButton = document.querySelector<HTMLElement>(NEXT_BUTTON_SELECTOR);
    if (nextButton) {
      nextButton.style.display = "";
      nextButton.setAttribute("aria-hidden", "false");
    }
  }

  return cleanup;
}

// Converts global tutorial data to a Driver.js-compatible structure.
export function toDriverSteps(steps: ReturnType<typeof loadGlobalTutorialSteps>): DriverLikeStep[] {
  return steps.map((step) => ({
    element: step.element,
    popover: {
      title: step.popover.title,
      description: step.interactive
        ? normalizeInteractiveDescription(step.popover.description)
        : step.popover.description,
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

  const cleanupInteractiveUxGuards = setupInteractiveUxGuards(rawSteps);

  try {
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
      onDestroyed: () => {
        cleanupInteractiveUxGuards();
      },
      disableActiveInteraction: true,
      overlayOpacity: 0.55,
      smoothScroll: true,
    });

    driverObj.drive();
  } catch (error) {
    cleanupInteractiveUxGuards();
    throw error;
  }
}
