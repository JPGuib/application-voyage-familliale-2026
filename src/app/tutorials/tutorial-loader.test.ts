import { describe, expect, it } from "vitest";
import { loadTutorialSteps } from "./tutorial-loader";

describe("tutorial-loader profile variations", () => {
  it("returns different step sets by profile", () => {
    const decouverte = loadTutorialSteps("decouverte");
    const premiere = loadTutorialSteps("premiere-utilisation");
    const avance = loadTutorialSteps("avance");
    const administration = loadTutorialSteps("administration");

    expect(decouverte.length).toBeGreaterThan(0);
    expect(premiere.length).toBeGreaterThan(0);
    expect(avance.length).toBeGreaterThan(0);
    expect(administration.length).toBeGreaterThan(0);

    expect(administration.length).toBeLessThan(premiere.length);
    expect(avance.length).toBeLessThan(premiere.length);
  });

  it("includes settings step for administration profile", () => {
    const administration = loadTutorialSteps("administration");
    expect(
      administration.some((step) => step.element === '[data-tutorial-id="dashboard-settings"]')
    ).toBe(true);
  });

  it("does not include settings step for decouverte profile", () => {
    const decouverte = loadTutorialSteps("decouverte");
    expect(
      decouverte.some((step) => step.element === '[data-tutorial-id="dashboard-settings"]')
    ).toBe(false);
  });
});
