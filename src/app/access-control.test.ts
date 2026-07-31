import { describe, expect, it } from "vitest";
import {
  canAccessSection,
  getAllowedSections,
  type AccessSection,
} from "./access-control";

const ALL_SECTIONS: AccessSection[] = [
  "checklist",
  "dashboard",
  "guide",
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
  });

  it("grants owner full access after unlock", () => {
    const allowed = getAllowedSections("proprietaire", "during");

    expect(allowed).toEqual(ALL_SECTIONS);
  });

  it("restricts user before unlock to checklist and settings", () => {
    const allowed = getAllowedSections("utilisateur", "before");

    expect(allowed).toEqual(["checklist", "settings"]);
    expect(canAccessSection("utilisateur", "before", "dashboard")).toBe(false);
  });

  it("unlocks all user sections except owner code actions", () => {
    const allowed = getAllowedSections("utilisateur", "during");

    expect(allowed).toEqual([
      "checklist",
      "dashboard",
      "guide",
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

    expect(allowed).toEqual(["checklist", "settings"]);
  });
});
