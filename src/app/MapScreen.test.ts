import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { buildMarkers } from "./MapScreen";

// Mock leaflet to avoid DOM/canvas errors in jsdom
vi.mock("leaflet", () => ({
  default: {
    icon: () => ({}),
  },
}));

// Mock react-leaflet to avoid MapContainer rendering errors
vi.mock("react-leaflet", () => ({
  MapContainer: () => null,
  TileLayer: () => null,
  Marker: () => null,
  Popup: () => null,
  CircleMarker: () => null,
  useMap: () => ({ flyTo: () => {} }),
}));

// Mock the generated jours-destinations to control test data
vi.mock("../content/generated/jours-destinations", () => ({
  JOURS_DESTINATIONS: [
    {
      jour: 1,
      destination: "Nantes",
      visites_prevues: "Nantes",
      gps_matin: "47.2184,-1.5536",
      gps_apresmidi: "47.2184,-1.5536",
      gps_soir: "48.8566,2.3522",
    },
    {
      jour: 2,
      destination: "Istanbul",
      visites_prevues: "Sainte-Sophie",
      gps_matin: "41.0138,28.9497",
      gps_apresmidi: "41.0138,28.9497",
      gps_soir: "41.0138,28.9497",
    },
    {
      jour: 3,
      destination: "Cappadoce",
      visites_prevues: "Goreme",
      gps_matin: "",
      gps_apresmidi: "",
      gps_soir: "",
    },
  ],
}));

vi.mock("../content/places", () => ({
  PLACES: [
    { id: "place-1", jour: [1], name: "Lieu 1" },
    { id: "place-2", jour: [1], name: "Lieu 2" },
    { id: "place-3", jour: [2], name: "Lieu Istanbul" },
  ],
}));

describe("buildMarkers", () => {
  it("déduplication des coordonnées identiques pour un même jour", () => {
    // Jour 1 : matin et apresmidi ont la même coordonnée → une seule entrée
    // + soir a une coordonnée différente → 2 marqueurs au total
    const markers = buildMarkers([1]);
    expect(markers).toHaveLength(2);
  });

  it("inclut le nombre de lieux pour le jour correspondant", () => {
    const markers = buildMarkers([1]);
    // Jour 1 a 2 places dans le mock
    expect(markers.every((m) => m.placeCount === 2)).toBe(true);
  });

  it("retourne tous les marqueurs de plusieurs jours en mode all-days", () => {
    // Jour 1 : 2 markers, Jour 2 : 1 marker (toutes les slots identiques)
    const markers = buildMarkers([1, 2]);
    expect(markers).toHaveLength(3);
  });

  it("retourne un tableau vide pour un jour sans coordonnées GPS", () => {
    const markers = buildMarkers([3]);
    expect(markers).toHaveLength(0);
  });

  it("ignore les jours non présents dans JOURS_DESTINATIONS", () => {
    const markers = buildMarkers([99]);
    expect(markers).toHaveLength(0);
  });

  it("retourne un tableau vide quand aucun jour n'est fourni", () => {
    const markers = buildMarkers([]);
    expect(markers).toHaveLength(0);
  });

  it("attribue les bonnes coordonnées au marqueur", () => {
    const markers = buildMarkers([2]);
    expect(markers).toHaveLength(1);
    expect(markers[0].lat).toBeCloseTo(41.0138);
    expect(markers[0].lon).toBeCloseTo(28.9497);
    expect(markers[0].destination).toBe("Istanbul");
    expect(markers[0].day).toBe(2);
  });

  it("produit des clés uniques pour des marqueurs différents", () => {
    const markers = buildMarkers([1, 2]);
    const keys = markers.map((m) => m.key);
    const uniqueKeys = new Set(keys);
    expect(uniqueKeys.size).toBe(keys.length);
  });
});
