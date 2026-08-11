import { describe, expect, it, vi } from "vitest";

import { toDriverSteps } from "./driver-runtime";
import { loadGlobalTutorialSteps } from "./tutorial-loader";

describe("driver-runtime", () => {
  it("adds click guidance and hides Next for interactive steps", () => {
    const steps = toDriverSteps(loadGlobalTutorialSteps());
    const rawSteps = loadGlobalTutorialSteps();
    const interactiveStepIndex = rawSteps.findIndex((step) => step.id === "guide-day2");
    const interactiveStep = interactiveStepIndex >= 0 ? steps[interactiveStepIndex] : undefined;
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

    const filterPanelSelector = document.querySelector<HTMLButtonElement>(
      '[data-tutorial-id="guide-day-selector"]'
    );
    const filterClickSpy = vi.fn(() => {
      const dateDropdownBtn = document.createElement("button");
      dateDropdownBtn.setAttribute("data-tutorial-id", "guide-date-dropdown");
      document.body.appendChild(dateDropdownBtn);
    });
    filterPanelSelector?.addEventListener("click", filterClickSpy);

    const steps = toDriverSteps(loadGlobalTutorialSteps());
    const rawSteps = loadGlobalTutorialSteps();
    const day2StepIndex = rawSteps.findIndex((step) => step.id === "guide-day2");
    const day2Step = day2StepIndex >= 0 ? steps[day2StepIndex] : undefined;

    expect(day2Step).toBeDefined();
    expect(typeof day2Step?.element).toBe("function");

    // Simulate that clicking the date dropdown button reveals day-option-2
    document.body.addEventListener("click", (e) => {
      const target = e.target as HTMLElement;
      if (target.getAttribute("data-tutorial-id") === "guide-date-dropdown") {
        const option = document.createElement("button");
        option.setAttribute("data-tutorial-id", "guide-day-option-2");
        document.body.appendChild(option);
      }
    });

    const resolvedElement = (day2Step?.element as () => Element | null)();

    expect(filterClickSpy).toHaveBeenCalledTimes(1);
    expect(resolvedElement).not.toBeNull();
    expect(resolvedElement?.getAttribute("data-tutorial-id")).toBe("guide-day-option-2");
  });

  it("scrolls regular tutorial targets into view before highlighting them", () => {
    document.body.innerHTML = '<div data-tutorial-id="place-anecdotes-title"></div>';

    const target = document.querySelector<HTMLElement>('[data-tutorial-id="place-anecdotes-title"]');
    const scrollIntoViewSpy = vi.fn();
    if (target) {
      target.scrollIntoView = scrollIntoViewSpy;
    }

    const steps = toDriverSteps(loadGlobalTutorialSteps());
    const anecdotesStep = steps.find((step) => step.popover.title === "Anecdotes");

    expect(anecdotesStep).toBeDefined();
    expect(typeof anecdotesStep?.element).toBe("function");

    const resolvedElement = (anecdotesStep?.element as () => Element | null)();

    expect(resolvedElement).toBe(target ?? null);
    expect(scrollIntoViewSpy).toHaveBeenCalledWith({
      block: "center",
      inline: "center",
      behavior: "auto",
    });
  });
});