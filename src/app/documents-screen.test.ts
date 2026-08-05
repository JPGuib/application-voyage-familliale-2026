import { describe, expect, it } from "vitest";
import { canAccessScreen } from "./access-control";
import { DOCUMENTS, DOCUMENT_CATEGORIES } from "../content/documents";
import { groupDocumentsByCategory, sortDocuments } from "./documents-screen";

describe("documents screen data helpers", () => {
  it("grouped documents: every category key exists even when empty", () => {
    const grouped = groupDocumentsByCategory([]);

    for (const category of DOCUMENT_CATEGORIES) {
      expect(grouped[category]).toEqual([]);
    }

    const withData = groupDocumentsByCategory(DOCUMENTS);
    expect(withData.VOLS.length).toBeGreaterThan(0);
    expect(withData.HEBERGEMENT.length).toBeGreaterThan(0);
    expect(withData.TRANSPORTS.length).toBeGreaterThan(0);
    expect(withData.IDENTITE.length).toBeGreaterThan(0);
  });

  it("sortDocuments: day mode sorts by day then title", () => {
    const grouped = groupDocumentsByCategory(DOCUMENTS);
    const sorted = sortDocuments(grouped.VOLS, "day");

    expect(sorted[0]?.day).toBe(1);
    expect(sorted[1]?.day).toBe(1);
    expect(sorted[2]?.day).toBe(10);
  });

  it("sortDocuments: name mode sorts alphabetically", () => {
    const grouped = groupDocumentsByCategory(DOCUMENTS);
    const sorted = sortDocuments(grouped.VOLS, "name");
    const titles = sorted.map((item) => item.title);

    expect(titles).toEqual([...titles].sort((a, b) => a.localeCompare(b, "fr", { sensitivity: "base" })));
  });
});

describe("documents access policy", () => {
  it("owner can access documents before and during trip", () => {
    expect(canAccessScreen("proprietaire", "before", "documents")).toBe(true);
    expect(canAccessScreen("proprietaire", "during", "documents")).toBe(true);
  });

  it("user can access documents before and after unlock", () => {
    expect(canAccessScreen("utilisateur", "before", "documents")).toBe(true);
    expect(canAccessScreen("utilisateur", "during", "documents")).toBe(true);
  });

  it("visitor can access documents", () => {
    expect(canAccessScreen("visiteur", "before", "documents")).toBe(true);
    expect(canAccessScreen("visiteur", "during", "documents")).toBe(true);
  });

  it("null role can access documents", () => {
    expect(canAccessScreen(null, "before", "documents")).toBe(true);
    expect(canAccessScreen(null, "during", "documents")).toBe(true);
  });
});