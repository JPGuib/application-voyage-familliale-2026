import { describe, expect, it } from "vitest";
import { loadGlobalTutorialSteps } from "./tutorial-loader";

describe("tutorial-loader global tutorial", () => {
  it("returns a multi-screen tutorial sequence", () => {
    const steps = loadGlobalTutorialSteps();

    expect(steps.length).toBeGreaterThan(5);
    expect(steps.some((step) => step.screen === "dashboard")).toBe(true);
    expect(steps.some((step) => step.screen === "settings")).toBe(true);
    expect(steps.some((step) => step.screen === "planning")).toBe(true);
    expect(steps.some((step) => step.screen === "documents")).toBe(true);
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
    expect(interactiveSteps.some((step) => step.element === '[data-tutorial-id="dashboard-quick-documents"]')).toBe(true);
    expect(interactiveSteps.some((step) => step.element === '[data-tutorial-id="documents-open-scans"]')).toBe(true);
    expect(interactiveSteps.some((step) => step.element === '[data-tutorial-id="documents-scan-image-0"]')).toBe(true);
    expect(interactiveSteps.some((step) => step.element === '[data-tutorial-id="documents-scan-lightbox-close"]')).toBe(true);
    expect(interactiveSteps.some((step) => step.element === '[data-tutorial-id="documents-scans-back"]')).toBe(true);
    expect(interactiveSteps.some((step) => step.element === '[data-tutorial-id="dashboard-today-card"]')).toBe(true);
    expect(interactiveSteps.some((step) => step.element === '[data-tutorial-id="guide-day-selector"]')).toBe(true);
    expect(interactiveSteps.some((step) => step.element === '[data-tutorial-id="guide-day-option-2"]')).toBe(true);
    expect(interactiveSteps.some((step) => step.element === '[data-tutorial-id="guide-place-sainte-sophie"]')).toBe(true);
    expect(interactiveSteps.some((step) => step.element === '[data-tutorial-id="bottom-nav-game"]')).toBe(true);
    expect(interactiveSteps.some((step) => step.element === '[data-tutorial-id="bottom-nav-dashboard"]')).toBe(true);
    expect(interactiveSteps.some((step) => step.element === '[data-tutorial-id="dashboard-quick-results"]')).toBe(true);
    expect(interactiveSteps.some((step) => step.element === '[data-tutorial-id="results-back"]')).toBe(true);
    expect(interactiveSteps.some((step) => step.element === '[data-tutorial-id="dashboard-quick-tips"]')).toBe(true);
    expect(interactiveSteps.some((step) => step.element === '[data-tutorial-id="tips-back"]')).toBe(true);
    expect(steps.some((step) => step.element === '[data-tutorial-id="dashboard-stay-presentation"]')).toBe(true);
    expect(steps.some((step) => step.element === '[data-tutorial-id="dashboard-quick-checklist"]')).toBe(true);
    expect(steps.some((step) => step.element === '[data-tutorial-id="dashboard-offline-media"]')).toBe(true);
  });

  it("skips scan-specific tutorial steps for visitor profiles", () => {
    const steps = loadGlobalTutorialSteps("visiteur");
    const interactiveSteps = steps.filter((step) => step.interactive);

    expect(steps.some((step) => step.id === "documents-open-scans")).toBe(false);
    expect(steps.some((step) => step.id === "documents-scans-explain")).toBe(false);
    expect(steps.some((step) => step.id === "documents-scan-open-lightbox")).toBe(false);
    expect(steps.some((step) => step.id === "documents-scan-lightbox-explain")).toBe(false);
    expect(steps.some((step) => step.id === "documents-scan-close-lightbox")).toBe(false);
    expect(steps.some((step) => step.id === "documents-scans-back-to-documents")).toBe(false);
    expect(interactiveSteps.some((step) => step.element === '[data-tutorial-id="documents-open-scans"]')).toBe(false);
    expect(steps.some((step) => step.id === "documents-back-home")).toBe(true);
  });

  it("anchors screen explanation steps on stable per-screen selectors", () => {
    const steps = loadGlobalTutorialSteps();
    expect(steps.some((step) => step.element === '[data-tutorial-id="settings-title"]')).toBe(true);
    expect(steps.some((step) => step.element === '[data-tutorial-id="planning-title"]')).toBe(true);
    expect(steps.some((step) => step.element === '[data-tutorial-id="documents-title"]')).toBe(true);
    expect(steps.some((step) => step.element === '[data-tutorial-id="documents-scans-title"]')).toBe(true);
    expect(steps.some((step) => step.element === '[data-tutorial-id="documents-scan-lightbox"]')).toBe(true);
    expect(steps.some((step) => step.element === '[data-tutorial-id="guide-title"]')).toBe(true);
    expect(steps.some((step) => step.element === '[data-tutorial-id="place-audio-player"]')).toBe(true);
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

  it("continues from documents to guide, then game, results, tips, map and polarsteps", () => {
    const steps = loadGlobalTutorialSteps();
    const documentsIndex = steps.findIndex((step) => step.id === "documents-explain");
    const documentsOpenScansIndex = steps.findIndex((step) => step.id === "documents-open-scans");
    const documentsScansExplainIndex = steps.findIndex((step) => step.id === "documents-scans-explain");
    const documentsScanOpenLightboxIndex = steps.findIndex((step) => step.id === "documents-scan-open-lightbox");
    const documentsScanLightboxIndex = steps.findIndex((step) => step.id === "documents-scan-lightbox-explain");
    const documentsScanCloseLightboxIndex = steps.findIndex((step) => step.id === "documents-scan-close-lightbox");
    const documentsScansBackIndex = steps.findIndex((step) => step.id === "documents-scans-back-to-documents");
    const documentsBackIndex = steps.findIndex((step) => step.id === "documents-back-home");
    const guideIndex = steps.findIndex((step) => step.id === "guide-explain");
    const audioIndex = steps.findIndex((step) => step.id === "place-audio");
    const galleryIndex = steps.findIndex((step) => step.id === "place-gallery");
    const gameIndex = steps.findIndex((step) => step.id === "game-explain");
    const backHomeIndex = steps.findIndex((step) => step.id === "game-back-home");
    const resultsIndex = steps.findIndex((step) => step.id === "results-explain");
    const tipsIndex = steps.findIndex((step) => step.id === "tips-explain");
    const mapIndex = steps.findIndex((step) => step.id === "dashboard-map-preview");
    const polarstepsIndex = steps.findIndex((step) => step.id === "dashboard-polarsteps");
    expect(documentsIndex).toBeGreaterThan(-1);
    expect(documentsOpenScansIndex).toBeGreaterThan(-1);
    expect(documentsScansExplainIndex).toBeGreaterThan(-1);
    expect(documentsScanOpenLightboxIndex).toBeGreaterThan(-1);
    expect(documentsScanLightboxIndex).toBeGreaterThan(-1);
    expect(documentsScanCloseLightboxIndex).toBeGreaterThan(-1);
    expect(documentsScansBackIndex).toBeGreaterThan(-1);
    expect(documentsBackIndex).toBeGreaterThan(-1);
    expect(guideIndex).toBeGreaterThan(-1);
    expect(audioIndex).toBeGreaterThan(-1);
    expect(galleryIndex).toBeGreaterThan(-1);
    expect(gameIndex).toBeGreaterThan(-1);
    expect(backHomeIndex).toBeGreaterThan(-1);
    expect(resultsIndex).toBeGreaterThan(-1);
    expect(tipsIndex).toBeGreaterThan(-1);
    expect(mapIndex).toBeGreaterThan(-1);
    expect(polarstepsIndex).toBeGreaterThan(-1);
    expect(documentsIndex).toBeLessThan(documentsOpenScansIndex);
    expect(documentsOpenScansIndex).toBeLessThan(documentsScansExplainIndex);
    expect(documentsScansExplainIndex).toBeLessThan(documentsScanOpenLightboxIndex);
    expect(documentsScanOpenLightboxIndex).toBeLessThan(documentsScanLightboxIndex);
    expect(documentsScanLightboxIndex).toBeLessThan(documentsScanCloseLightboxIndex);
    expect(documentsScanCloseLightboxIndex).toBeLessThan(documentsScansBackIndex);
    expect(documentsScansBackIndex).toBeLessThan(documentsBackIndex);
    expect(documentsIndex).toBeLessThan(documentsBackIndex);
    expect(documentsBackIndex).toBeLessThan(guideIndex);
    expect(guideIndex).toBeLessThan(audioIndex);
    expect(audioIndex).toBeLessThan(galleryIndex);
    expect(gameIndex).toBeLessThan(backHomeIndex);
    expect(backHomeIndex).toBeLessThan(resultsIndex);
    expect(resultsIndex).toBeLessThan(tipsIndex);
    expect(tipsIndex).toBeLessThan(mapIndex);
    expect(mapIndex).toBeLessThan(polarstepsIndex);
  });

  it("uses a real date label for the guide day-2 step when trip start date is configured", () => {
    const steps = loadGlobalTutorialSteps("utilisateur", "2026-08-16");
    const day2Step = steps.find((step) => step.id === "guide-day2");

    expect(day2Step).toBeDefined();
    expect(day2Step?.popover.title).toContain("Passer au");
    expect(day2Step?.popover.title).not.toContain("Jour 2");
    expect(day2Step?.popover.description).toContain("17");
    expect(day2Step?.popover.description).toContain("août");
  });
});
