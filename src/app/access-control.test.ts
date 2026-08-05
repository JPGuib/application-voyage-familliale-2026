import { describe, expect, it } from "vitest";
import {
  canAccessScreen,
  canAccessSection,
  getAccessDeniedMessage,
  getAllowedSections,
  type AccessSection,
} from "./access-control";

const ALL_SECTIONS: AccessSection[] = [
  "checklist",
  "dashboard",
  "guide",
  "planning",
  "documents",
  "histoire",
  "geographie",
  "culture",
  "game",
  "tips",
  "results",
  "settings",
  "owner-code-actions",
];

describe("access-control policy", () => {
  it("grants owner full access even before unlock (story 18.2)", () => {
    const allowed = getAllowedSections("proprietaire", "before");

    expect(allowed).toEqual(ALL_SECTIONS);
    expect(canAccessSection("proprietaire", "before", "dashboard")).toBe(true);
    expect(canAccessSection("proprietaire", "before", "guide")).toBe(true);
    expect(canAccessSection("proprietaire", "before", "game")).toBe(true);
    expect(canAccessSection("proprietaire", "before", "tips")).toBe(true);
    expect(canAccessSection("proprietaire", "before", "results")).toBe(true);
    expect(canAccessScreen("proprietaire", "before", "epub")).toBe(true);
  });

  it("grants owner full access after unlock", () => {
    const allowed = getAllowedSections("proprietaire", "during");

    expect(allowed).toEqual(ALL_SECTIONS);
  });

  it("restricts user before unlock to checklist, documents and settings", () => {
    const allowed = getAllowedSections("utilisateur", "before");

    expect(allowed).toEqual(["checklist", "documents", "settings"]);
    expect(canAccessSection("utilisateur", "before", "dashboard")).toBe(false);
    expect(canAccessSection("utilisateur", "before", "documents")).toBe(true);
    expect(canAccessScreen("utilisateur", "before", "epub")).toBe(false);
  });

  it("unlocks all user sections except owner code actions", () => {
    const allowed = getAllowedSections("utilisateur", "during");

    expect(allowed).toEqual([
      "checklist",
      "dashboard",
      "guide",
      "planning",
      "documents",
      "histoire",
      "geographie",
      "culture",
      "game",
      "tips",
      "results",
      "settings",
    ]);
    expect(canAccessSection("utilisateur", "during", "owner-code-actions")).toBe(false);
  });

  it("keeps null role restricted even during phase", () => {
    const allowed = getAllowedSections(null, "during");

    expect(allowed).toEqual(["checklist", "documents", "settings"]);
  });

  it("grants visitor access only to read-only content and their own settings (story 24.3, restreint le 2026-08-01)", () => {
    const allowed = getAllowedSections("visiteur", "before");

    expect(allowed).toEqual([
      "dashboard",
      "guide",
      "planning",
      "documents",
      "histoire",
      "geographie",
      "culture",
      "tips",
      "settings",
    ]);
    expect(canAccessSection("visiteur", "before", "checklist")).toBe(false);
    expect(canAccessSection("visiteur", "before", "game")).toBe(false);
    expect(canAccessSection("visiteur", "before", "results")).toBe(false);
    expect(canAccessSection("visiteur", "before", "owner-code-actions")).toBe(false);
  });

  it("does not gate visitor access on trip phase, unlike utilisateur (story 24.3)", () => {
    expect(getAllowedSections("visiteur", "before")).toEqual(getAllowedSections("visiteur", "during"));
    expect(canAccessSection("visiteur", "before", "dashboard")).toBe(true);
    expect(canAccessSection("visiteur", "during", "game")).toBe(false);
    expect(canAccessScreen("visiteur", "during", "epub")).toBe(true);
  });

  it("returns a friendly denial message for a visitor targeting the checklist, the game or the results (story 24.3)", () => {
    expect(getAccessDeniedMessage("visiteur", "during", "checklist")).toBe(
      "Cette rubrique est reservee aux voyageurs."
    );
    expect(getAccessDeniedMessage("visiteur", "during", "game")).toBe(
      "Cette rubrique est reservee aux voyageurs."
    );
    expect(getAccessDeniedMessage("visiteur", "during", "results")).toBe(
      "Cette rubrique est reservee aux voyageurs."
    );
  });

  it("grants visitor access to their own settings screen", () => {
    expect(canAccessSection("visiteur", "during", "settings")).toBe(true);
  });
});
