import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  OFFLINE_SECTION_ORDER,
  buildOfflineMediaInventory,
  computeSectionStatus,
  downloadOfflineMediaSection,
  getSectionOfflineAvailability,
  normalizeMediaUrl,
  readOfflineDownloadRegistry,
  requestPersistentStorage,
  verifyOfflineCacheIntegrity,
  type OfflineMediaInventory,
  type OfflineSectionProgress,
} from "./offline-media";

function makeInventory(urls: string[]): OfflineMediaInventory {
  const bySection = {
    "stay-guide": urls,
    "important-documents": [],
    history: [],
    "geography-economy": [],
    "culture-tradition": [],
    tips: [],
  };

  return {
    bySection,
    allUrls: [...urls],
  };
}

describe("offline media domain model", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("normalizes local and remote media urls", () => {
    const local = normalizeMediaUrl("/images/guide/Istanbul photo 1.webp");
    const remote = normalizeMediaUrl(
      "https://images.unsplash.com/photo-1527838832700-5059252407fa?w=800&h=500"
    );

    expect(local).toContain("/images/guide/Istanbul%20photo%201.webp");
    expect(remote).toContain("https://images.unsplash.com/");
    expect(normalizeMediaUrl("javascript:alert(1)")).toBeNull();
  });

  it("builds deterministic inventory for all required sections", () => {
    const inventory = buildOfflineMediaInventory();

    expect(OFFLINE_SECTION_ORDER.every((key) => Array.isArray(inventory.bySection[key]))).toBe(true);
    expect(inventory.bySection["stay-guide"].length).toBeGreaterThan(0);
    expect(inventory.bySection["important-documents"].length).toBeGreaterThan(0);
    expect(inventory.bySection.history.length).toBeGreaterThan(0);
    expect(inventory.bySection["geography-economy"].length).toBeGreaterThan(0);
    expect(inventory.bySection["culture-tradition"].length).toBeGreaterThan(0);

    const unique = new Set(inventory.allUrls);
    expect(unique.size).toBe(inventory.allUrls.length);

    // Guide HTML can contain external article links in anchors; they should
    // not be part of the offline media inventory because local <img src> is
    // already cached for the same content.
    expect(
      inventory.bySection["stay-guide"].some((url) => url.includes("toutistanbul.com"))
    ).toBe(false);
  });

  it("computes section status transitions", () => {
    expect(computeSectionStatus(10, 0, 0)).toBe("not-downloaded");
    expect(computeSectionStatus(10, 10, 0)).toBe("complete");
    expect(computeSectionStatus(10, 8, 2)).toBe("partial");
    expect(computeSectionStatus(0, 0, 0)).toBe("complete");
  });

  it("resumes downloads and skips already completed resources", async () => {
    const inventory = makeInventory([
      "https://offline.local/images/a.webp",
      "https://offline.local/audio/a.mp3",
    ]);

    const cache = {
      put: vi.fn().mockResolvedValue(undefined),
    } as unknown as Cache;

    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response("ok", { status: 200 }));

    const first = await downloadOfflineMediaSection("stay-guide", {
      inventory,
      cache,
      fetchImpl,
    });

    expect(first.downloaded).toBe(2);
    expect(first.failed).toBe(0);
    expect(fetchImpl).toHaveBeenCalledTimes(2);

    const second = await downloadOfflineMediaSection("stay-guide", {
      inventory,
      cache,
      fetchImpl,
    });

    expect(second.downloaded).toBe(0);
    expect(second.skipped).toBe(2);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("surfaces storage failures as explicit partial state", async () => {
    const inventory = makeInventory(["https://offline.local/images/a.webp"]);
    const cache = {
      put: vi
        .fn()
        .mockRejectedValue(new DOMException("quota exceeded", "QuotaExceededError")),
    } as unknown as Cache;
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response("ok", { status: 200 }));

    const result = await downloadOfflineMediaSection("stay-guide", {
      inventory,
      cache,
      fetchImpl,
    });

    expect(result.failed).toBe(1);
    expect(result.registry.sectionProgress["stay-guide"].status).toBe("partial");

    const [resource] = Object.values(result.registry.resources);
    expect(resource.errorMessage).toMatch(/insufficient storage space/i);
  });
});

describe("offline storage persistence and integrity (story 27.3)", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("requests persistent storage and journals the granted outcome in the registry", async () => {
    const persist = vi.fn().mockResolvedValue(true);
    const state = await requestPersistentStorage({ storageManager: { persist } });

    expect(state).toEqual({ supported: true, granted: true, checkedAt: expect.any(String) });
    expect(readOfflineDownloadRegistry().storagePersistence).toEqual(state);
  });

  it("journals a denied outcome without throwing", async () => {
    const persist = vi.fn().mockResolvedValue(false);
    const state = await requestPersistentStorage({ storageManager: { persist } });

    expect(state.granted).toBe(false);
    expect(readOfflineDownloadRegistry().storagePersistence.granted).toBe(false);
  });

  it("reports unsupported rather than failing when the Storage API is unavailable", async () => {
    const state = await requestPersistentStorage({ storageManager: undefined });

    expect(state).toEqual({ supported: false, granted: null, checkedAt: expect.any(String) });
  });

  it("detects evicted cache entries and downgrades the affected section to partial", async () => {
    const inventory = makeInventory(["https://offline.local/images/a.webp"]);
    const cache = {
      put: vi.fn().mockResolvedValue(undefined),
      match: vi.fn().mockResolvedValue(undefined),
    } as unknown as Cache;
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(new Response("ok", { status: 200 }));

    await downloadOfflineMediaSection("stay-guide", { inventory, cache, fetchImpl });
    const verified = await verifyOfflineCacheIntegrity({ inventory, cache });

    expect(verified.sectionProgress["stay-guide"].status).toBe("partial");
    const [resource] = Object.values(verified.resources);
    expect(resource.status).toBe("failed");
    expect(resource.errorMessage).toMatch(/cache/i);
  });

  it("leaves the registry unchanged when every cached resource is still present", async () => {
    const inventory = makeInventory(["https://offline.local/images/a.webp"]);
    const cache = {
      put: vi.fn().mockResolvedValue(undefined),
      match: vi.fn().mockResolvedValue(new Response("ok")),
    } as unknown as Cache;
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(new Response("ok", { status: 200 }));

    await downloadOfflineMediaSection("stay-guide", { inventory, cache, fetchImpl });
    const verified = await verifyOfflineCacheIntegrity({ inventory, cache });

    expect(verified.sectionProgress["stay-guide"].status).toBe("complete");
  });

  it("does not throw when the Cache Storage API is unavailable", async () => {
    const inventory = makeInventory(["https://offline.local/images/a.webp"]);
    await expect(verifyOfflineCacheIntegrity({ inventory })).resolves.toBeDefined();
  });
});

describe("getSectionOfflineAvailability (story 27.4)", () => {
  function progress(overrides: Partial<OfflineSectionProgress>): OfflineSectionProgress {
    return { total: 3, completed: 0, failed: 0, status: "not-downloaded", ...overrides };
  }

  it("reports 'Disponible hors ligne' for a fully downloaded section, online or offline", () => {
    const complete = progress({ completed: 3, status: "complete" });
    expect(getSectionOfflineAvailability(complete, true)).toEqual({
      tone: "complete",
      label: "Disponible hors ligne",
    });
    expect(getSectionOfflineAvailability(complete, false)).toEqual({
      tone: "complete",
      label: "Disponible hors ligne",
    });
  });

  it("reports 'Partiellement disponible hors ligne' for a partial section, online or offline", () => {
    const partial = progress({ completed: 1, failed: 1, status: "partial" });
    expect(getSectionOfflineAvailability(partial, true)?.tone).toBe("partial");
    expect(getSectionOfflineAvailability(partial, false)).toEqual({
      tone: "partial",
      label: "Partiellement disponible hors ligne",
    });
  });

  it("stays silent for a not-yet-downloaded section while online (no false alarm)", () => {
    const notDownloaded = progress({ status: "not-downloaded" });
    expect(getSectionOfflineAvailability(notDownloaded, true)).toBeNull();
  });

  it("reports 'Nécessite une connexion' for a not-yet-downloaded section while offline", () => {
    const notDownloaded = progress({ status: "not-downloaded" });
    expect(getSectionOfflineAvailability(notDownloaded, false)).toEqual({
      tone: "unavailable",
      label: "Nécessite une connexion",
    });
  });
});
