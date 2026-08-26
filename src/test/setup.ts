import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, vi } from "vitest";

// Several integration tests hardcode a trip start date (2026-08-16) and rely on
// "now" falling within the trip window to assert the "during" trip UI. Without
// freezing the clock, these tests become flaky/fail once the real date moves
// past the hardcoded trip window. Freeze "now" to a fixed in-trip date for all
// tests; individual tests can still override it with their own vi.setSystemTime
// / vi.useFakeTimers calls when they need a different point in time.
const FIXED_TEST_NOW = new Date("2026-08-24T09:00:00");

beforeEach(() => {
  vi.setSystemTime(FIXED_TEST_NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

// Node 22+ exposes its own global `localStorage` (Web Storage API, gated behind
// --localstorage-file). In a vitest jsdom environment this built-in accessor can
// shadow jsdom's own window.localStorage, leaving `localStorage` undefined in
// tests. Fall back to an in-memory Storage polyfill whenever that happens.
if (typeof globalThis.localStorage === "undefined" || typeof globalThis.localStorage?.clear !== "function") {
  class MemoryStorage implements Storage {
    private store = new Map<string, string>();

    get length() {
      return this.store.size;
    }

    clear(): void {
      this.store.clear();
    }

    getItem(key: string): string | null {
      return this.store.has(key) ? this.store.get(key)! : null;
    }

    key(index: number): string | null {
      return Array.from(this.store.keys())[index] ?? null;
    }

    removeItem(key: string): void {
      this.store.delete(key);
    }

    setItem(key: string, value: string): void {
      this.store.set(key, String(value));
    }
  }

  const memoryStorage = new MemoryStorage();
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: memoryStorage,
  });
  if (typeof window !== "undefined") {
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: memoryStorage,
    });
  }
}
