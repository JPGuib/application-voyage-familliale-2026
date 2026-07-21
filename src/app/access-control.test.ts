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
  "game",
  "tips",
  "results",
  "settings",
  "owner-code-actions",
];

describe("access-control policy", () => {
  it("restricts owner before unlock to checklist settings and owner actions", () => {
    const allowed = getAllowedSections("proprietaire", "before");

    expect(allowed).toEqual(["checklist", "settings", "owner-code-actions"]);
    expect(canAccessSection("proprietaire", "before", "dashboard")).toBe(false);
    expect(canAccessSection("proprietaire", "before", "guide")).toBe(false);
    expect(canAccessSection("proprietaire", "before", "game")).toBe(false);
    expect(canAccessSection("proprietaire", "before", "tips")).toBe(false);
    expect(canAccessSection("proprietaire", "before", "results")).toBe(false);
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
