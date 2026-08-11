import { describe, expect, it } from "vitest";
import { canAccessScreen } from "./access-control";
import { DOCUMENTS, DOCUMENT_CATEGORIES } from "../content/documents";
import { filterDocuments, groupDocumentsByCategory, normalizeDocumentDays } from "./documents-screen";

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
    expect(withData.PAPIERS.length).toBeGreaterThan(0);
  });

  it("documents include optional scans for gallery mode", () => {
    const volWithScans = DOCUMENTS.find((doc) => doc.id === "vol-nantes-paris-af7507");
    expect(volWithScans).toBeTruthy();
    expect((volWithScans?.scans?.length ?? 0)).toBeGreaterThan(0);
  });

  it("normalizes document days from scalar and array values", () => {
    expect(normalizeDocumentDays(undefined)).toEqual([]);
    expect(normalizeDocumentDays(4)).toEqual([4]);
    expect(normalizeDocumentDays([3, 1, 3, 2])).toEqual([1, 2, 3]);
  });

  it("filters documents by day and title", () => {
    const dayFiveDocs = filterDocuments(DOCUMENTS, { days: [5] });
    expect(dayFiveDocs.length).toBeGreaterThan(0);
    expect(dayFiveDocs.every((doc) => normalizeDocumentDays(doc.day).includes(5))).toBe(true);

    const matchingTitleDocs = filterDocuments(DOCUMENTS, { title: "montgolfière" });
    expect(matchingTitleDocs.length).toBeGreaterThan(0);
    expect(matchingTitleDocs.every((doc) => doc.title.toLowerCase().includes("montgolfière"))).toBe(true);

    const combined = filterDocuments(DOCUMENTS, { days: [6], title: "montgolfière" });
    expect(combined.map((doc) => doc.id)).toContain("Montgolfiere-discovery-balloons");
    expect(combined.map((doc) => doc.id)).not.toContain("Montgolfiere-rainbow-balloons");
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