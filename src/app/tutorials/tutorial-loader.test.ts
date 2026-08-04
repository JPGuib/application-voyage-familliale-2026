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
    expect(steps.some((step) => step.screen === "place")).toBe(true);
    expect(steps.some((step) => step.screen === "game")).toBe(true);
    expect(steps.some((step) => step.screen === "results")).toBe(true);
    expect(steps.some((step) => step.screen === "tips")).toBe(true);
  });

  it("contains guided navigation clicks for screen transitions", () => {
    const steps = loadGlobalTutorialSteps();
    const interactiveSteps = steps.filter((step) => step.interactive);

    expect(interactiveSteps.length).toBeGreaterThan(0);
    expect(interactiveSteps.some((step) => step.element === '[data-tutorial-id="dashboard-settings"]')).toBe(true);
    expect(interactiveSteps.some((step) => step.element === '[data-tutorial-id="dashboard-planning"]')).toBe(true);
    expect(interactiveSteps.some((step) => step.element === '[data-tutorial-id="dashboard-today-card"]')).toBe(true);
    expect(interactiveSteps.some((step) => step.element === '[data-tutorial-id="guide-day-selector"]')).toBe(true);
    expect(interactiveSteps.some((step) => step.element === '[data-tutorial-id="guide-day-option-2"]')).toBe(true);
    expect(interactiveSteps.some((step) => step.element === '[data-tutorial-id="guide-place-sainte-sophie"]')).toBe(true);
    expect(interactiveSteps.some((step) => step.element === '[data-tutorial-id="bottom-nav-game"]')).toBe(true);
    expect(interactiveSteps.some((step) => step.element === '[data-tutorial-id="bottom-nav-dashboard"]')).toBe(true);
    expect(interactiveSteps.some((step) => step.element === '[data-tutorial-id="dashboard-quick-results"]')).toBe(true);
    expect(interactiveSteps.some((step) => step.element === '[data-tutorial-id="results-back"]')).toBe(true);
    expect(interactiveSteps.some((step) => step.element === '[data-tutorial-id="dashboard-quick-tips"]')).toBe(true);
    expect(interactiveSteps.some((step) => step.element === '[data-tutorial-id="tips-tab-payment"]')).toBe(true);
    expect(interactiveSteps.some((step) => step.element === '[data-tutorial-id="tips-back"]')).toBe(true);
  });

  it("anchors screen explanation steps on stable per-screen selectors", () => {
    const steps = loadGlobalTutorialSteps();
    expect(steps.some((step) => step.element === '[data-tutorial-id="settings-title"]')).toBe(true);
    expect(steps.some((step) => step.element === '[data-tutorial-id="planning-title"]')).toBe(true);
    expect(steps.some((step) => step.element === '[data-tutorial-id="guide-title"]')).toBe(true);
    expect(steps.some((step) => step.element === '[data-tutorial-id="place-gallery-title"]')).toBe(true);
    expect(steps.some((step) => step.element === '[data-tutorial-id="place-history-title"]')).toBe(true);
    expect(steps.some((step) => step.element === '[data-tutorial-id="place-anecdotes-title"]')).toBe(true);
    expect(steps.some((step) => step.element === '[data-tutorial-id="place-guided-tour-cta"]')).toBe(true);
    expect(steps.some((step) => step.element === '[data-tutorial-id="game-title"]')).toBe(true);
    expect(steps.some((step) => step.element === '[data-tutorial-id="results-title"]')).toBe(true);
    expect(steps.some((step) => step.element === '[data-tutorial-id="tips-title"]')).toBe(true);
    expect(steps.some((step) => step.element === '[data-tutorial-id="tips-converter-title"]')).toBe(true);
    expect(steps.some((step) => step.element === '[data-tutorial-id="dashboard-map-preview"]')).toBe(true);
    expect(steps.some((step) => step.element === '[data-tutorial-id="dashboard-polarsteps-link"]')).toBe(true);
  });

  it("continues from game to results, tips, then dashboard map and polarsteps", () => {
    const steps = loadGlobalTutorialSteps();
    const gameIndex = steps.findIndex((step) => step.id === "game-explain");
    const backHomeIndex = steps.findIndex((step) => step.id === "game-back-home");
    const resultsIndex = steps.findIndex((step) => step.id === "results-explain");
    const tipsIndex = steps.findIndex((step) => step.id === "tips-explain");
    const mapIndex = steps.findIndex((step) => step.id === "dashboard-map-preview");
    const polarstepsIndex = steps.findIndex((step) => step.id === "dashboard-polarsteps");
    expect(gameIndex).toBeGreaterThan(-1);
    expect(backHomeIndex).toBeGreaterThan(-1);
    expect(resultsIndex).toBeGreaterThan(-1);
    expect(tipsIndex).toBeGreaterThan(-1);
    expect(mapIndex).toBeGreaterThan(-1);
    expect(polarstepsIndex).toBeGreaterThan(-1);
    expect(gameIndex).toBeLessThan(backHomeIndex);
    expect(backHomeIndex).toBeLessThan(resultsIndex);
    expect(resultsIndex).toBeLessThan(tipsIndex);
    expect(tipsIndex).toBeLessThan(mapIndex);
    expect(mapIndex).toBeLessThan(polarstepsIndex);
  });
});
