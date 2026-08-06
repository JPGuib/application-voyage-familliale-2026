import { CULTURE_TRADITION_TOPICS } from "../content/culture-tradition";
import { DOCUMENTS } from "../content/documents";
import { GEOGRAPHIE_ECONOMIE_TOPICS } from "../content/geographie-economie";
import { HISTOIRE_TOPICS } from "../content/histoire";
import { PLACES } from "../content/places";
import { TIPS } from "../content/tips";
import { VISITES_GUIDEES } from "../content/generated/visites-guidees";

export const OFFLINE_MEDIA_CACHE_NAME = "offline-media-v1";
const OFFLINE_REGISTRY_STORAGE_KEY = "jp-offline-media-registry-v1";

export const OFFLINE_SECTION_ORDER = [
  "stay-guide",
  "important-documents",
  "history",
  "geography-economy",
  "culture-tradition",
  "tips",
] as const;

export type OfflineSectionKey = (typeof OFFLINE_SECTION_ORDER)[number];

export type OfflineSectionStatus = "not-downloaded" | "partial" | "complete";
export type OfflineResourceStatus = "pending" | "complete" | "failed";

export type OfflineSectionProgress = {
  total: number;
  completed: number;
  failed: number;
  status: OfflineSectionStatus;
};

export type OfflineResourceRegistryItem = {
  status: OfflineResourceStatus;
  sections: OfflineSectionKey[];
  lastAttemptAt: string | null;
  errorMessage: string | null;
};

export type OfflineDownloadRegistry = {
  version: 1;
  updatedAt: string;
  resources: Record<string, OfflineResourceRegistryItem>;
  sectionProgress: Record<OfflineSectionKey, OfflineSectionProgress>;
};

export type OfflineMediaInventory = {
  bySection: Record<OfflineSectionKey, string[]>;
  allUrls: string[];
};

export type OfflineDownloadProgressEvent = {
  section: OfflineSectionKey;
  url: string;
  completed: number;
  total: number;
  result: "skipped" | "downloaded" | "failed";
  errorMessage?: string;
};

export type OfflineDownloadResult = {
  registry: OfflineDownloadRegistry;
  attempted: number;
  downloaded: number;
  skipped: number;
  failed: number;
};

type TopicLike = {
  image?: unknown;
  photos?: unknown;
  scans?: unknown;
  audioSrc?: unknown;
};

const MEDIA_EXTENSION_RE = /\.(png|jpg|jpeg|webp|gif|mp3|m4a|wav|ogg)(\?|#|$)/i;

function getNowIso(): string {
  return new Date().toISOString();
}

function getBaseOrigin(): string {
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }
  return "https://offline.local";
}

function parseMaybeUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  if (trimmed.startsWith("data:") || trimmed.startsWith("blob:") || trimmed.startsWith("javascript:")) {
    return null;
  }

  try {
    if (/^https?:\/\//i.test(trimmed)) {
      return new URL(trimmed).toString();
    }
    return new URL(trimmed, getBaseOrigin()).toString();
  } catch {
    return null;
  }
}

function shouldKeepParsedUrl(url: string): boolean {
  if (url.startsWith(`${getBaseOrigin()}/images/`) || url.startsWith(`${getBaseOrigin()}/audio/`)) {
    return true;
  }
  if (/^https?:\/\//i.test(url)) {
    return true;
  }
  return MEDIA_EXTENSION_RE.test(url);
}

export function normalizeMediaUrl(value: string): string | null {
  const parsed = parseMaybeUrl(value);
  if (!parsed) {
    return null;
  }
  return shouldKeepParsedUrl(parsed) ? parsed : null;
}

function pushIfMedia(target: Set<string>, value: unknown): void {
  if (typeof value !== "string") {
    return;
  }
  const normalized = normalizeMediaUrl(value);
  if (normalized) {
    target.add(normalized);
  }
}

function collectTopicMedia(topics: TopicLike[]): Set<string> {
  const urls = new Set<string>();
  for (const topic of topics) {
    pushIfMedia(urls, topic.image);
    pushIfMedia(urls, topic.audioSrc);

    if (Array.isArray(topic.photos)) {
      for (const photo of topic.photos) {
        pushIfMedia(urls, photo);
      }
    }

    if (Array.isArray(topic.scans)) {
      for (const scan of topic.scans) {
        pushIfMedia(urls, scan);
      }
    }
  }
  return urls;
}

function collectTipsMedia(tips: typeof TIPS): Set<string> {
  const urls = new Set<string>();
  const groups = [tips.transport, tips.customs, tips.dictionary, tips.payment, tips.emergency, tips.food];
  for (const group of groups) {
    for (const entry of group) {
      pushIfMedia(urls, (entry as { image?: unknown; audioSrc?: unknown }).image);
      pushIfMedia(urls, (entry as { image?: unknown; audioSrc?: unknown }).audioSrc);
    }
  }
  return urls;
}

function extractMediaFromHtml(html: string): Set<string> {
  const urls = new Set<string>();
  const attrRe = /\bsrc=\"([^\"]+)\"/gi;
  let match: RegExpExecArray | null = attrRe.exec(html);
  while (match) {
    const value = match[1] ?? "";
    pushIfMedia(urls, value);
    match = attrRe.exec(html);
  }
  return urls;
}

function collectVisiteGuideeMedia(visites: Record<string, { html: string }>): Set<string> {
  const urls = new Set<string>();
  for (const visite of Object.values(visites)) {
    for (const mediaUrl of extractMediaFromHtml(visite.html)) {
      urls.add(mediaUrl);
    }
  }
  return urls;
}

function withStableUrls(urls: Iterable<string>): string[] {
  return Array.from(new Set(urls)).sort((left, right) => left.localeCompare(right));
}

export function buildOfflineMediaInventory(): OfflineMediaInventory {
  const stayGuide = new Set<string>([
    ...collectTopicMedia(PLACES as TopicLike[]),
    ...collectVisiteGuideeMedia(VISITES_GUIDEES),
  ]);
  const documents = collectTopicMedia(DOCUMENTS as TopicLike[]);
  const history = collectTopicMedia(HISTOIRE_TOPICS as TopicLike[]);
  const geography = collectTopicMedia(GEOGRAPHIE_ECONOMIE_TOPICS as TopicLike[]);
  const culture = collectTopicMedia(CULTURE_TRADITION_TOPICS as TopicLike[]);
  const tips = collectTipsMedia(TIPS);

  const bySection: Record<OfflineSectionKey, string[]> = {
    "stay-guide": withStableUrls(stayGuide),
    "important-documents": withStableUrls(documents),
    history: withStableUrls(history),
    "geography-economy": withStableUrls(geography),
    "culture-tradition": withStableUrls(culture),
    tips: withStableUrls(tips),
  };

  const allUrls = withStableUrls(Object.values(bySection).flat());

  return { bySection, allUrls };
}

export function computeSectionStatus(total: number, completed: number, failed: number): OfflineSectionStatus {
  if (total === 0) {
    return "complete";
  }
  if (completed === total) {
    return "complete";
  }
  if (completed === 0 && failed === 0) {
    return "not-downloaded";
  }
  return "partial";
}

function buildSectionProgress(
  bySection: Record<OfflineSectionKey, string[]>,
  resources: Record<string, OfflineResourceRegistryItem>
): Record<OfflineSectionKey, OfflineSectionProgress> {
  const progress = {} as Record<OfflineSectionKey, OfflineSectionProgress>;

  for (const key of OFFLINE_SECTION_ORDER) {
    const urls = bySection[key] ?? [];
    let completed = 0;
    let failed = 0;

    for (const url of urls) {
      const status = resources[url]?.status ?? "pending";
      if (status === "complete") {
        completed += 1;
      } else if (status === "failed") {
        failed += 1;
      }
    }

    progress[key] = {
      total: urls.length,
      completed,
      failed,
      status: computeSectionStatus(urls.length, completed, failed),
    };
  }

  return progress;
}

function createInitialRegistry(inventory: OfflineMediaInventory): OfflineDownloadRegistry {
  const resources: Record<string, OfflineResourceRegistryItem> = {};

  for (const url of inventory.allUrls) {
    const sections = OFFLINE_SECTION_ORDER.filter((section) => inventory.bySection[section].includes(url));
    resources[url] = {
      status: "pending",
      sections,
      lastAttemptAt: null,
      errorMessage: null,
    };
  }

  return {
    version: 1,
    updatedAt: getNowIso(),
    resources,
    sectionProgress: buildSectionProgress(inventory.bySection, resources),
  };
}

export function syncRegistryWithInventory(
  existingRegistry: OfflineDownloadRegistry | null,
  inventory: OfflineMediaInventory
): OfflineDownloadRegistry {
  const base = existingRegistry && existingRegistry.version === 1
    ? {
        version: 1 as const,
        updatedAt: existingRegistry.updatedAt,
        resources: { ...existingRegistry.resources },
        sectionProgress: existingRegistry.sectionProgress,
      }
    : createInitialRegistry(inventory);

  const validUrls = new Set(inventory.allUrls);

  for (const [url, item] of Object.entries(base.resources)) {
    if (!validUrls.has(url)) {
      delete base.resources[url];
      continue;
    }

    base.resources[url] = {
      ...item,
      sections: OFFLINE_SECTION_ORDER.filter((section) => inventory.bySection[section].includes(url)),
    };
  }

  for (const url of inventory.allUrls) {
    if (!base.resources[url]) {
      base.resources[url] = {
        status: "pending",
        sections: OFFLINE_SECTION_ORDER.filter((section) => inventory.bySection[section].includes(url)),
        lastAttemptAt: null,
        errorMessage: null,
      };
    }
  }

  base.updatedAt = getNowIso();
  base.sectionProgress = buildSectionProgress(inventory.bySection, base.resources);
  return base;
}

export function readOfflineDownloadRegistry(inventoryOverride?: OfflineMediaInventory): OfflineDownloadRegistry {
  const inventory = inventoryOverride ?? buildOfflineMediaInventory();

  try {
    const raw = localStorage.getItem(OFFLINE_REGISTRY_STORAGE_KEY);
    if (!raw) {
      return createInitialRegistry(inventory);
    }

    const parsed = JSON.parse(raw) as OfflineDownloadRegistry;
    return syncRegistryWithInventory(parsed, inventory);
  } catch {
    return createInitialRegistry(inventory);
  }
}

function saveOfflineDownloadRegistry(registry: OfflineDownloadRegistry): void {
  localStorage.setItem(OFFLINE_REGISTRY_STORAGE_KEY, JSON.stringify(registry));
}

function normalizeErrorMessage(error: unknown): string {
  if (error instanceof DOMException && (error.name === "QuotaExceededError" || error.name === "NS_ERROR_DOM_QUOTA_REACHED")) {
    return "Insufficient storage space. Free up space and retry.";
  }
  if (error instanceof Error) {
    if (/quota|storage/i.test(error.message)) {
      return "Insufficient storage space. Free up space and retry.";
    }
    return error.message;
  }
  return "Download failed";
}

async function openOfflineCache(): Promise<Cache> {
  if (typeof caches === "undefined") {
    throw new Error("Cache Storage API is not available in this browser.");
  }
  return caches.open(OFFLINE_MEDIA_CACHE_NAME);
}

async function fetchAndStoreInCache(cache: Cache, url: string, fetchImpl: typeof fetch): Promise<void> {
  const request = new Request(url, { method: "GET" });
  const response = await fetchImpl(request);
  if (!response.ok && response.type !== "opaque") {
    throw new Error(`HTTP ${response.status} while downloading ${url}`);
  }
  await cache.put(request, response.clone());
}

export async function downloadOfflineMediaSection(
  section: OfflineSectionKey,
  options?: {
    onProgress?: (event: OfflineDownloadProgressEvent) => void;
    inventory?: OfflineMediaInventory;
    cache?: Cache;
    fetchImpl?: typeof fetch;
  }
): Promise<OfflineDownloadResult> {
  const inventory = options?.inventory ?? buildOfflineMediaInventory();
  const urls = inventory.bySection[section] ?? [];
  const cache = options?.cache ?? (await openOfflineCache());
  const fetchImpl = options?.fetchImpl ?? fetch;

  let registry = syncRegistryWithInventory(readOfflineDownloadRegistry(inventory), inventory);
  let downloaded = 0;
  let skipped = 0;
  let failed = 0;

  for (let index = 0; index < urls.length; index += 1) {
    const url = urls[index];
    const current = registry.resources[url];
    if (!current) {
      continue;
    }

    if (current.status === "complete") {
      skipped += 1;
      options?.onProgress?.({
        section,
        url,
        completed: index + 1,
        total: urls.length,
        result: "skipped",
      });
      continue;
    }

    try {
      await fetchAndStoreInCache(cache, url, fetchImpl);
      registry.resources[url] = {
        ...current,
        status: "complete",
        lastAttemptAt: getNowIso(),
        errorMessage: null,
      };
      downloaded += 1;
      options?.onProgress?.({
        section,
        url,
        completed: index + 1,
        total: urls.length,
        result: "downloaded",
      });
    } catch (error) {
      const errorMessage = normalizeErrorMessage(error);
      registry.resources[url] = {
        ...current,
        status: "failed",
        lastAttemptAt: getNowIso(),
        errorMessage,
      };
      failed += 1;
      options?.onProgress?.({
        section,
        url,
        completed: index + 1,
        total: urls.length,
        result: "failed",
        errorMessage,
      });
    }
  }

  registry = syncRegistryWithInventory(registry, inventory);
  saveOfflineDownloadRegistry(registry);

  return {
    registry,
    attempted: urls.length,
    downloaded,
    skipped,
    failed,
  };
}

export async function downloadAllOfflineMedia(
  options?: {
    onProgress?: (event: OfflineDownloadProgressEvent) => void;
    inventory?: OfflineMediaInventory;
    cache?: Cache;
    fetchImpl?: typeof fetch;
  }
): Promise<OfflineDownloadResult> {
  let registry = readOfflineDownloadRegistry();
  let attempted = 0;
  let downloaded = 0;
  let skipped = 0;
  let failed = 0;

  for (const section of OFFLINE_SECTION_ORDER) {
    const result = await downloadOfflineMediaSection(section, {
      onProgress: options?.onProgress,
      inventory: options?.inventory,
      cache: options?.cache,
      fetchImpl: options?.fetchImpl,
    });
    attempted += result.attempted;
    downloaded += result.downloaded;
    skipped += result.skipped;
    failed += result.failed;
    registry = result.registry;
  }

  return { registry, attempted, downloaded, skipped, failed };
}

export function listFailedSectionUrls(
  registry: OfflineDownloadRegistry,
  section: OfflineSectionKey
): string[] {
  return Object.entries(registry.resources)
    .filter(([, item]) => item.status === "failed" && item.sections.includes(section))
    .map(([url]) => url)
    .sort((left, right) => left.localeCompare(right));
}
