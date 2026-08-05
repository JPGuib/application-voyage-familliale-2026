import { describe, expect, it } from "vitest";
import { canAccessScreen } from "./access-control";
import { PLACES } from "../content/places";
import { DOCUMENTS } from "../content/documents";
import { getVolPlaces, groupDocumentsByCategory } from "./documents-screen";

describe("documents screen data helpers", () => {
  it("volPlaces: filters only tag=Vol from PLACES", () => {
    const volPlaces = getVolPlaces(PLACES);

    expect(volPlaces.length).toBeGreaterThan(0);
    expect(volPlaces.every((place) => place.tag === "Vol")).toBe(true);
  });

  it("volPlaces: contains the three expected flights (AF7507, AF1390, TO3421)", () => {
    const volPlaces = getVolPlaces(PLACES);
    const flightDetails = volPlaces.map((place) => place.history).join(" ");

    expect(flightDetails).toContain("AF7507");
    expect(flightDetails).toContain("AF1390");
    expect(flightDetails).toContain("TO3421");
  });

  it("grouped documents: each non-vol category key exists even when empty", () => {
    const grouped = groupDocumentsByCategory([]);

    expect(grouped["Hébergement"]).toEqual([]);
    expect(grouped["Assurance/Santé"]).toEqual([]);
    expect(grouped["Réservations diverses"]).toEqual([]);

    const withData = groupDocumentsByCategory(DOCUMENTS);
    expect(withData["Hébergement"].length).toBeGreaterThan(0);
    expect(withData["Assurance/Santé"].length).toBeGreaterThan(0);
    expect(withData["Réservations diverses"].length).toBeGreaterThan(0);
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