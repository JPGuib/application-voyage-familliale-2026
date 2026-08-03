// ─── EUR <-> TRY Exchange Rate Module ────────────────────────────────────────

const EUR_TRY_CACHE_KEY = "jp-eur-try-rate-cache-v1";

export type ExchangeRateSnapshot = {
  rate: number;
  fetchedAtIso: string;
  source: "live" | "cache" | "fallback";
};

export const FALLBACK_EUR_TRY_RATE = 54;

// ─── Cache helpers ────────────────────────────────────────────────────────────

export function readRateCache(): { rate: number; fetchedAtIso: string } | null {
  try {
    const raw = localStorage.getItem(EUR_TRY_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (typeof parsed?.rate !== "number" || typeof parsed?.fetchedAtIso !== "string") return null;
    return { rate: parsed.rate as number, fetchedAtIso: parsed.fetchedAtIso as string };
  } catch {
    return null;
  }
}

export function writeRateCache(rate: number, fetchedAtIso: string): void {
  try {
    localStorage.setItem(EUR_TRY_CACHE_KEY, JSON.stringify({ rate, fetchedAtIso }));
  } catch {
    // ignore storage errors
  }
}

// ─── Rate fetch with cache and fallback policy ────────────────────────────────

export async function getEurTryRate(now = new Date()): Promise<ExchangeRateSnapshot> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch("https://api.frankfurter.dev/v2/rate/EUR/TRY", {
      signal: controller.signal,
    });
    if (!res.ok) throw new Error("http-error");
    const data = (await res.json()) as Record<string, unknown>;
    const rate = data?.rate;
    if (typeof rate !== "number" || !Number.isFinite(rate) || rate <= 0)
      throw new Error("invalid-rate");
    const fetchedAtIso = now.toISOString();
    writeRateCache(rate, fetchedAtIso);
    return { rate, fetchedAtIso, source: "live" };
  } catch {
    const cached = readRateCache();
    if (cached) return { rate: cached.rate, fetchedAtIso: cached.fetchedAtIso, source: "cache" };
    return { rate: FALLBACK_EUR_TRY_RATE, fetchedAtIso: "", source: "fallback" };
  } finally {
    clearTimeout(timer);
  }
}

// ─── Conversion helpers ───────────────────────────────────────────────────────

export function convertEurToTry(amountEur: number, rate: number): number {
  return Math.round(amountEur * rate * 100) / 100;
}

export function convertTryToEur(amountTry: number, rate: number): number {
  return Math.round((amountTry / rate) * 100) / 100;
}

// ─── Input normalization ──────────────────────────────────────────────────────

/** Returns a non-negative finite number, or null for empty/negative/non-numeric input. */
export function normalizeNumericInput(raw: string): number | null {
  const trimmed = raw.trim().replace(",", ".");
  if (trimmed === "") return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}
