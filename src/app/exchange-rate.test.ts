import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  convertEurToTry,
  convertTryToEur,
  FALLBACK_EUR_TRY_RATE,
  getEurTryRate,
  normalizeNumericInput,
  readRateCache,
  writeRateCache,
} from "./exchange-rate";

describe("convertEurToTry", () => {
  it("convertit correctement EUR en TRY", () => {
    expect(convertEurToTry(100, 37.5)).toBe(3750);
    expect(convertEurToTry(1, 37.5)).toBe(37.5);
  });

  it("arrondit à 2 décimales", () => {
    expect(convertEurToTry(1, 37.123)).toBe(37.12);
  });

  it("retourne 0 pour un montant nul", () => {
    expect(convertEurToTry(0, 37.5)).toBe(0);
  });
});

describe("convertTryToEur", () => {
  it("convertit correctement TRY en EUR", () => {
    expect(convertTryToEur(3750, 37.5)).toBe(100);
  });

  it("arrondit à 2 décimales", () => {
    expect(convertTryToEur(1, 37.5)).toBe(0.03);
  });

  it("retourne 0 pour un montant nul", () => {
    expect(convertTryToEur(0, 37.5)).toBe(0);
  });
});

describe("normalizeNumericInput", () => {
  it("retourne null pour une chaîne vide", () => {
    expect(normalizeNumericInput("")).toBeNull();
    expect(normalizeNumericInput("   ")).toBeNull();
  });

  it("retourne null pour une valeur négative", () => {
    expect(normalizeNumericInput("-5")).toBeNull();
    expect(normalizeNumericInput("-0.1")).toBeNull();
  });

  it("retourne null pour une valeur non numérique", () => {
    expect(normalizeNumericInput("abc")).toBeNull();
    expect(normalizeNumericInput("1e2a")).toBeNull();
  });

  it("retourne null pour NaN et Infinity", () => {
    expect(normalizeNumericInput("NaN")).toBeNull();
    expect(normalizeNumericInput("Infinity")).toBeNull();
  });

  it("retourne le nombre correct pour une valeur valide", () => {
    expect(normalizeNumericInput("100")).toBe(100);
    expect(normalizeNumericInput("0")).toBe(0);
    expect(normalizeNumericInput("3.14")).toBe(3.14);
    expect(normalizeNumericInput("  50  ")).toBe(50);
  });

  it("accepte la virgule comme séparateur décimal (saisie française)", () => {
    expect(normalizeNumericInput("3,14")).toBe(3.14);
  });
});

describe("readRateCache / writeRateCache", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it("retourne null si aucun cache n'est présent", () => {
    expect(readRateCache()).toBeNull();
  });

  it("lit une valeur écrite par writeRateCache", () => {
    writeRateCache(37.5, "2026-08-03T10:00:00.000Z");
    expect(readRateCache()).toEqual({ rate: 37.5, fetchedAtIso: "2026-08-03T10:00:00.000Z" });
  });

  it("retourne null si le cache contient du JSON invalide", () => {
    localStorage.setItem("jp-eur-try-rate-cache-v1", "pas du JSON valide{{");
    expect(readRateCache()).toBeNull();
  });

  it("retourne null si rate ou fetchedAtIso manquent dans le cache", () => {
    localStorage.setItem("jp-eur-try-rate-cache-v1", JSON.stringify({ rate: 37.5 }));
    expect(readRateCache()).toBeNull();
    localStorage.setItem("jp-eur-try-rate-cache-v1", JSON.stringify({ fetchedAtIso: "2026-08-03" }));
    expect(readRateCache()).toBeNull();
  });
});

describe("getEurTryRate", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("retourne le taux live quand le fetch réussit", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ rate: 38.2 }) })
    );
    const result = await getEurTryRate(new Date("2026-08-03T10:00:00Z"));
    expect(result.rate).toBe(38.2);
    expect(result.source).toBe("live");
    expect(result.fetchedAtIso).toBe("2026-08-03T10:00:00.000Z");
  });

  it("écrit le taux dans le cache après un fetch réussi", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ rate: 38.2 }) })
    );
    await getEurTryRate(new Date("2026-08-03T10:00:00Z"));
    expect(readRateCache()).toEqual({ rate: 38.2, fetchedAtIso: "2026-08-03T10:00:00.000Z" });
  });

  it("utilise le cache si le fetch échoue et qu'un cache est disponible", async () => {
    writeRateCache(37.0, "2026-08-02T10:00:00.000Z");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network error")));
    const result = await getEurTryRate();
    expect(result.rate).toBe(37.0);
    expect(result.source).toBe("cache");
    expect(result.fetchedAtIso).toBe("2026-08-02T10:00:00.000Z");
  });

  it("utilise le taux de repli si le fetch échoue et qu'aucun cache n'est disponible", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network error")));
    const result = await getEurTryRate();
    expect(result.rate).toBe(FALLBACK_EUR_TRY_RATE);
    expect(result.source).toBe("fallback");
    expect(result.fetchedAtIso).toBe("");
  });

  it("utilise le repli si la réponse HTTP est en erreur (ex. 422)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 422 }));
    const result = await getEurTryRate();
    expect(result.source).toBe("fallback");
    expect(result.rate).toBe(FALLBACK_EUR_TRY_RATE);
  });

  it("utilise le repli si le payload ne contient pas de rate valide", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ rates: { TRY: 38.2 } }) })
    );
    const result = await getEurTryRate();
    expect(result.source).toBe("fallback");
  });

  it("utilise le repli si rate est négatif ou nul", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ rate: -1 }) })
    );
    const result = await getEurTryRate();
    expect(result.source).toBe("fallback");
  });

  it("préfère le cache sur le repli codé en dur quand les deux sont disponibles", async () => {
    writeRateCache(40.0, "2026-08-01T08:00:00.000Z");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network error")));
    const result = await getEurTryRate();
    expect(result.source).toBe("cache");
    expect(result.rate).toBe(40.0);
  });
});
