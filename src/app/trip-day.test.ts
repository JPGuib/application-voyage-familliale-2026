import { describe, expect, it } from "vitest";
import {
  clampToLastDefinedDay,
  computeCurrentDay,
  isTripFinished,
  isValidTripStartDate,
} from "./trip-day";

describe("isValidTripStartDate", () => {
  it("accepte une date au format YYYY-MM-DD", () => {
    expect(isValidTripStartDate("2026-08-16")).toBe(true);
  });

  it("rejette null, undefined et les formats invalides", () => {
    expect(isValidTripStartDate(null)).toBe(false);
    expect(isValidTripStartDate(undefined)).toBe(false);
    expect(isValidTripStartDate("16/08/2026")).toBe(false);
    expect(isValidTripStartDate("")).toBe(false);
  });
});

describe("computeCurrentDay", () => {
  it("retourne 1 tant que la date courante est <= date de début", () => {
    expect(computeCurrentDay("2026-08-16", new Date(2026, 7, 16))).toBe(1);
    expect(computeCurrentDay("2026-08-16", new Date(2026, 7, 10))).toBe(1);
  });

  it("incrémente d'un jour par jour calendaire écoulé", () => {
    expect(computeCurrentDay("2026-08-16", new Date(2026, 7, 17))).toBe(2);
    expect(computeCurrentDay("2026-08-16", new Date(2026, 7, 18))).toBe(3);
    expect(computeCurrentDay("2026-08-16", new Date(2026, 7, 21))).toBe(6);
  });

  it("retourne 1 si la date de début est absente ou invalide", () => {
    expect(computeCurrentDay(null, new Date(2026, 7, 20))).toBe(1);
    expect(computeCurrentDay(undefined, new Date(2026, 7, 20))).toBe(1);
    expect(computeCurrentDay("pas une date", new Date(2026, 7, 20))).toBe(1);
  });

  it("retourne 1 si la date de début est dans le futur", () => {
    expect(computeCurrentDay("2026-12-25", new Date(2026, 7, 20))).toBe(1);
  });
});

describe("isTripFinished / clampToLastDefinedDay", () => {
  it("le voyage n'est pas terminé tant que le jour courant est <= dernier jour défini", () => {
    expect(isTripFinished(6, 6)).toBe(false);
    expect(isTripFinished(5, 6)).toBe(false);
  });

  it("le voyage est terminé si le jour courant dépasse le dernier jour défini", () => {
    expect(isTripFinished(7, 6)).toBe(true);
  });

  it("sans table de jours définie, le voyage n'est jamais considéré comme terminé", () => {
    expect(isTripFinished(42, null)).toBe(false);
  });

  it("clampToLastDefinedDay ne dépasse jamais le dernier jour défini", () => {
    expect(clampToLastDefinedDay(9, 6)).toBe(6);
    expect(clampToLastDefinedDay(3, 6)).toBe(3);
    expect(clampToLastDefinedDay(9, null)).toBe(9);
  });
});
