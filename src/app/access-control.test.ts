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
  "chat",
  "groupInfo",
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
  });

  it("grants owner full access after unlock", () => {
    const allowed = getAllowedSections("proprietaire", "during");

    expect(allowed).toEqual(ALL_SECTIONS);
  });

  // "groupInfo" (epic 29) est accessible avant le départ, contrairement au
  // Chat : cf. docs/specs-stories/epic-29/29.1-tableau-infos-du-groupe.md.
  it("restricts user before unlock to checklist, documents, groupInfo and settings", () => {
    const allowed = getAllowedSections("utilisateur", "before");

    expect(allowed).toEqual(["checklist", "documents", "groupInfo", "settings"]);
    expect(canAccessSection("utilisateur", "before", "dashboard")).toBe(false);
    expect(canAccessSection("utilisateur", "before", "documents")).toBe(true);
    expect(canAccessSection("utilisateur", "before", "groupInfo")).toBe(true);
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
      "chat",
      "groupInfo",
      "tips",
      "results",
      "settings",
    ]);
    expect(canAccessSection("utilisateur", "during", "owner-code-actions")).toBe(false);
  });

  it("keeps null role restricted even during phase", () => {
    const allowed = getAllowedSections(null, "during");

    expect(allowed).toEqual(["checklist", "documents", "groupInfo", "settings"]);
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
    expect(getAccessDeniedMessage("visiteur", "during", "chat")).toBe(
      "Cette rubrique est reservee aux voyageurs."
    );
  });

  // Story 28.1 : le Chat suit les mêmes règles d'accès que le jeu du jour
  // (propriétaire toujours, utilisateur une fois le séjour commencé,
  // visiteur jamais) plutôt qu'une checklist dédiée.
  describe("chat section (story 28.1)", () => {
    it("is always accessible to the owner, before and during", () => {
      expect(canAccessSection("proprietaire", "before", "chat")).toBe(true);
      expect(canAccessSection("proprietaire", "during", "chat")).toBe(true);
    });

    it("is accessible to utilisateur only once the trip has started", () => {
      expect(canAccessSection("utilisateur", "before", "chat")).toBe(false);
      expect(canAccessSection("utilisateur", "during", "chat")).toBe(true);
    });

    it("is never accessible to a visiteur, regardless of phase", () => {
      expect(canAccessSection("visiteur", "before", "chat")).toBe(false);
      expect(canAccessSection("visiteur", "during", "chat")).toBe(false);
    });
  });

  // Epic 29 : contrairement au Chat, "groupInfo" est accessible avant ET
  // pendant le séjour pour utilisateur/propriétaire, mais reste totalement
  // inaccessible au visiteur (aucun accès, décision actée avec
  // Jean-Philippe).
  describe("group info section (epic 29)", () => {
    it("is always accessible to the owner, before and during", () => {
      expect(canAccessSection("proprietaire", "before", "groupInfo")).toBe(true);
      expect(canAccessSection("proprietaire", "during", "groupInfo")).toBe(true);
    });

    it("is accessible to utilisateur both before and during, unlike chat", () => {
      expect(canAccessSection("utilisateur", "before", "groupInfo")).toBe(true);
      expect(canAccessSection("utilisateur", "during", "groupInfo")).toBe(true);
    });

    it("is never accessible to a visiteur, regardless of phase", () => {
      expect(canAccessSection("visiteur", "before", "groupInfo")).toBe(false);
      expect(canAccessSection("visiteur", "during", "groupInfo")).toBe(false);
    });

    it("returns the traveler-only denial message for a visiteur", () => {
      expect(getAccessDeniedMessage("visiteur", "during", "groupInfo")).toBe(
        "Cette rubrique est reservee aux voyageurs."
      );
    });
  });

  it("grants visitor access to their own settings screen", () => {
    expect(canAccessSection("visiteur", "during", "settings")).toBe(true);
  });

  // Les jeux d'arcade et le hub "jeux" suivent exactement les mêmes règles que le jeu du jour
  // ("game"), via leur mapping dans screenToSection.
  describe.each([
    ["trivial", "Trivial Turquie"],
    ["candy-crush", "Candy Crush"],
    ["crossword", "Mots fléchés Turquie"],
    ["jeux", "hub Jeux"],
    ["ordalie", "Ordalie des 5 Sens"],
    ["imposteur", "Imposteur Turque"],
  ] as const)("%s screen (%s)", (screen) => {
    it("is always accessible to the owner, before and during", () => {
      expect(canAccessScreen("proprietaire", "before", screen)).toBe(true);
      expect(canAccessScreen("proprietaire", "during", screen)).toBe(true);
    });

    it("is accessible to utilisateur only once the trip has started", () => {
      expect(canAccessScreen("utilisateur", "before", screen)).toBe(false);
      expect(canAccessScreen("utilisateur", "during", screen)).toBe(true);
    });

    it("is never accessible to a visiteur, regardless of phase", () => {
      expect(canAccessScreen("visiteur", "before", screen)).toBe(false);
      expect(canAccessScreen("visiteur", "during", screen)).toBe(false);
    });

    it("reuses the same denial message as the daily game for a visiteur", () => {
      expect(getAccessDeniedMessage("visiteur", "during", screen)).toBe(
        "Cette rubrique est reservee aux voyageurs."
      );
    });
  });
});
