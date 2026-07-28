import { describe, expect, it } from "vitest";
import { getScheduledCoordinates, parseGpsString } from "./weather";

describe("parseGpsString", () => {
  it("parse une chaîne lat,lon valide", () => {
    expect(parseGpsString("41.0082,28.9784")).toEqual({ lat: 41.0082, lon: 28.9784 });
  });

  it("tolère les espaces autour de la virgule", () => {
    expect(parseGpsString("41.0082 , 28.9784")).toEqual({ lat: 41.0082, lon: 28.9784 });
  });

  it("accepte les coordonnées négatives", () => {
    expect(parseGpsString("-33.86,151.20")).toEqual({ lat: -33.86, lon: 151.2 });
  });

  it("retourne null pour une valeur vide, absente ou mal formée", () => {
    expect(parseGpsString("")).toBeNull();
    expect(parseGpsString(undefined)).toBeNull();
    expect(parseGpsString(null)).toBeNull();
    expect(parseGpsString("pas des coordonnées")).toBeNull();
    expect(parseGpsString(41.0082)).toBeNull();
  });
});

describe("getScheduledCoordinates", () => {
  const dayEntry = {
    gps_matin: "41.0082,28.9784",
    gps_apresmidi: "41.0369,28.9850",
    gps_soir: "",
  };

  it("retourne null si aucune entrée de jour n'est fournie", () => {
    expect(getScheduledCoordinates(null)).toBeNull();
    expect(getScheduledCoordinates(undefined)).toBeNull();
  });

  it("choisit le créneau du matin avant midi", () => {
    expect(getScheduledCoordinates(dayEntry, new Date(2026, 7, 16, 9))).toEqual({
      lat: 41.0082,
      lon: 28.9784,
    });
  });

  it("choisit le créneau de l'après-midi entre midi et 18h", () => {
    expect(getScheduledCoordinates(dayEntry, new Date(2026, 7, 16, 14))).toEqual({
      lat: 41.0369,
      lon: 28.985,
    });
  });

  it("se rabat sur un autre créneau si celui du soir est vide", () => {
    expect(getScheduledCoordinates(dayEntry, new Date(2026, 7, 16, 20))).toEqual({
      lat: 41.0369,
      lon: 28.985,
    });
  });

  it("retourne null si aucun créneau n'est renseigné", () => {
    expect(getScheduledCoordinates({}, new Date(2026, 7, 16, 9))).toBeNull();
  });
});
