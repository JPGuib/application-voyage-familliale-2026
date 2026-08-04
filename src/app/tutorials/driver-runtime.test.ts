import { describe, expect, it, vi } from "vitest";

import { toDriverSteps } from "./driver-runtime";
import { loadGlobalTutorialSteps } from "./tutorial-loader";

describe("driver-runtime", () => {
  it("adds click guidance and hides Next for interactive steps", () => {
    const steps = toDriverSteps(loadGlobalTutorialSteps());
    const interactiveStep = steps.find(
      (step) => step.popover.title === "Passer au Jour 2"
    );
    const passiveStep = steps.find(
      (step) => step.popover.title === "Écran Guide"
    );

    expect(interactiveStep).toBeDefined();
    expect(interactiveStep?.popover.description).toMatch(/Cliquez maintenant\.$/);
    expect(interactiveStep?.popover.showButtons).toEqual(["previous", "close"]);

    expect(passiveStep).toBeDefined();
    expect(passiveStep?.popover.showButtons).toBeUndefined();
  });

  it("reopens the day selector when the guide day 2 option is still closed", () => {
    document.body.innerHTML = '<button data-tutorial-id="guide-day-selector"></button>';

    const selector = document.querySelector<HTMLButtonElement>(
      '[data-tutorial-id="guide-day-selector"]'
    );
    const clickSpy = vi.fn(() => {
      const option = document.createElement("button");
      option.setAttribute("data-tutorial-id", "guide-day-option-2");
      document.body.appendChild(option);
    });
    selector?.addEventListener("click", clickSpy);

    const steps = toDriverSteps(loadGlobalTutorialSteps());
    const day2Step = steps.find((step) => step.popover.title === "Passer au Jour 2");

    expect(day2Step).toBeDefined();
    expect(typeof day2Step?.element).toBe("function");

    const resolvedElement = (day2Step?.element as () => Element | null)();

    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(resolvedElement).not.toBeNull();
    expect(resolvedElement?.getAttribute("data-tutorial-id")).toBe("guide-day-option-2");
  });
});