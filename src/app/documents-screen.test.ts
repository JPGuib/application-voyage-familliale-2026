import { describe, expect, it } from "vitest";
import { canAccessScreen } from "./access-control";
import { DOCUMENTS, DOCUMENT_CATEGORIES } from "../content/documents";
import { groupDocumentsByCategory } from "./documents-screen";

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

  it("documents include optional scans for gallery mode", () => {
    const volWithScans = DOCUMENTS.find((doc) => doc.id === "vol-nantes-paris-af7507");
    expect(volWithScans).toBeTruthy();
    expect((volWithScans?.scans?.length ?? 0)).toBeGreaterThan(0);
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