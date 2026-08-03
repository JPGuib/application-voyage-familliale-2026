import { describe, expect, it } from "vitest";
import { loadGlobalTutorialSteps } from "./tutorial-loader";

describe("tutorial-loader global tutorial", () => {
  it("returns a multi-screen tutorial sequence", () => {
    const steps = loadGlobalTutorialSteps();

    expect(steps.length).toBeGreaterThan(5);
    expect(steps.some((step) => step.screen === "dashboard")).toBe(true);
    expect(steps.some((step) => step.screen === "settings")).toBe(true);
    expect(steps.some((step) => step.screen === "planning")).toBe(true);
    expect(steps.some((step) => step.screen === "guide")).toBe(true);
    expect(steps.some((step) => step.screen === "tips")).toBe(true);
    expect(steps.some((step) => step.screen === "results")).toBe(true);
  });

  it("contains guided navigation clicks for screen transitions", () => {
    const steps = loadGlobalTutorialSteps();
    const interactiveSteps = steps.filter((step) => step.interactive);

    expect(interactiveSteps.length).toBeGreaterThan(0);
    expect(interactiveSteps.some((step) => step.element === '[data-tutorial-id="dashboard-settings"]')).toBe(true);
    expect(interactiveSteps.some((step) => step.element === '[data-tutorial-id="dashboard-planning"]')).toBe(true);
    expect(interactiveSteps.some((step) => step.element === '[data-tutorial-id="dashboard-today-card"]')).toBe(true);
  });

  it("anchors screen explanation steps on stable per-screen selectors", () => {
    const steps = loadGlobalTutorialSteps();
    expect(steps.some((step) => step.element === '[data-tutorial-id="settings-title"]')).toBe(true);
    expect(steps.some((step) => step.element === '[data-tutorial-id="planning-title"]')).toBe(true);
    expect(steps.some((step) => step.element === '[data-tutorial-id="guide-title"]')).toBe(true);
    expect(steps.some((step) => step.element === '[data-tutorial-id="tips-title"]')).toBe(true);
    expect(steps.some((step) => step.element === '[data-tutorial-id="results-title"]')).toBe(true);
  });
});
