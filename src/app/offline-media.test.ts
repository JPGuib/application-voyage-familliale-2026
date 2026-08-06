import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  OFFLINE_SECTION_ORDER,
  buildOfflineMediaInventory,
  computeSectionStatus,
  downloadOfflineMediaSection,
  normalizeMediaUrl,
  type OfflineMediaInventory,
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
