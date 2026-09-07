import type { Role } from "../app/owner-policy";
import type { AlbumSource } from "../types/cloud";

export type FamilyEditionCover =
  | { kind: "placeImage"; sourceId?: string }
  | { kind: "carnetPhoto"; sourceId?: string }
  | { kind: "none" };

export type FamilyEditionConfig = {
  editionId: string;
  version: number;
  title: string;
  subtitle: string;
  cover: FamilyEditionCover;
  includedPlaceIds: Record<string, true>;
  includedCarnetEntryIds: Record<string, true>;
  includeGames: boolean;
  themeId: string;
  publishedAt: number;
  publishedByProfileId: string;
  publishedByUid: string;
};

export type FamilyEditionResolution = {
  editionId: string;
  version: number;
  title: string;
  includedPlaceIds: Record<string, true>;
  includedCarnetEntryIds: Record<string, true>;
  warnings: string[];
};

export function canReadFamilyEdition(role: Role | null): boolean {
  return role === "proprietaire" || role === "utilisateur";
}

export function canWriteFamilyEdition(role: Role | null): boolean {
  return role === "proprietaire";
}

export function buildFamilyEditionConfig(input: {
  title: string;
  subtitle?: string;
  cover?: FamilyEditionCover;
  includedPlaceIds?: Record<string, true>;
  includedCarnetEntryIds?: Record<string, true>;
  includeGames?: boolean;
  themeId?: string;
  publishedByProfileId: string;
  publishedByUid: string;
  version?: number;
  editionId?: string;
  publishedAt?: number;
}): FamilyEditionConfig {
  const safeTitle = input.title.trim() || "Edition familiale";
  const cover = input.cover ?? { kind: "none" };
  const includedPlaceIds = input.includedPlaceIds ?? {};
  const includedCarnetEntryIds = input.includedCarnetEntryIds ?? {};

  return {
    editionId: input.editionId ?? `edition-${Date.now()}`,
    version: input.version ?? 1,
    title: safeTitle,
    subtitle: input.subtitle ?? "",
    cover,
    includedPlaceIds,
    includedCarnetEntryIds,
    includeGames: Boolean(input.includeGames),
    themeId: input.themeId ?? "default",
    publishedAt: input.publishedAt ?? Date.now(),
    publishedByProfileId: input.publishedByProfileId,
    publishedByUid: input.publishedByUid,
  };
}

export function validateFamilyEditionConfig(value: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!value || typeof value !== "object") {
    return { valid: false, errors: ["edition config must be an object"] };
  }

  const config = value as Record<string, unknown>;

  if (typeof config.editionId !== "string" || config.editionId.length === 0) {
    errors.push("editionId is required");
  }

  if (typeof config.version !== "number" || !Number.isFinite(config.version) || config.version < 1) {
    errors.push("version must be a positive number");
  }

  if (typeof config.title !== "string" || config.title.trim().length === 0) {
    errors.push("title is required");
  }

  if (config.pdfUrl !== undefined || config.publicUrl !== undefined)
    errors.push("public PDF URLs are forbidden in family edition metadata");

  if (config.cover && typeof config.cover === "object") {
    const cover = config.cover as Record<string, unknown>;
    if (!("kind" in cover) || typeof cover.kind !== "string") {
      errors.push("cover.kind is required");
    }
    if (cover.kind === "placeImage" || cover.kind === "carnetPhoto") {
      if (typeof cover.sourceId !== "string" && cover.sourceId !== undefined) {
        errors.push("cover.sourceId must be a string when provided");
      }
    }
  }

  if (config.includedPlaceIds && typeof config.includedPlaceIds !== "object") {
    errors.push("includedPlaceIds must be an object");
  }

  if (config.includedCarnetEntryIds && typeof config.includedCarnetEntryIds !== "object") {
    errors.push("includedCarnetEntryIds must be an object");
  }

  if (typeof config.includeGames !== "boolean") {
    errors.push("includeGames must be a boolean");
  }

  if (typeof config.themeId !== "string" || config.themeId.length === 0) {
    errors.push("themeId is required");
  }

  if (typeof config.publishedAt !== "number" || !Number.isFinite(config.publishedAt)) {
    errors.push("publishedAt must be a number");
  }

  if (typeof config.publishedByProfileId !== "string" || config.publishedByProfileId.length === 0) {
    errors.push("publishedByProfileId is required");
  }

  if (typeof config.publishedByUid !== "string" || config.publishedByUid.length === 0) {
    errors.push("publishedByUid is required");
  }

  return { valid: errors.length === 0, errors };
}

export function resolveFamilyEditionContent(
  source: AlbumSource,
  config: FamilyEditionConfig,
  context?: {
    placeVisibilityMap?: Record<string, string>;
    placeSeenMap?: Record<string, string>;
  }
): FamilyEditionResolution {
  const warnings: string[] = [];

  const visiblePlaceIds = Object.keys(source.eligiblePlaces ?? {});
  const nextPlaceIds: Record<string, true> = {};
  const nextEntryIds: Record<string, true> = {};

  for (const placeId of Object.keys(config.includedPlaceIds ?? {})) {
    const isVisible = visiblePlaceIds.includes(placeId);
    const placeEligibility = context?.placeVisibilityMap?.[placeId] ?? "visible";
    const seenState = context?.placeSeenMap?.[placeId] ?? "seen";

    if (!isVisible || placeEligibility === "hiddenByOwner" || seenState !== "seen") {
      warnings.push(`Excluded stale place from family edition: ${placeId}`);
      continue;
    }

    nextPlaceIds[placeId] = true;

    const entries = source.placeVisitLogs?.[placeId] ?? {};
    for (const entryId of Object.keys(config.includedCarnetEntryIds ?? {})) {
      if (entries[entryId]) {
        nextEntryIds[entryId] = true;
      }
    }
  }

  for (const entryId of Object.keys(config.includedCarnetEntryIds ?? {})) {
    if (!nextEntryIds[entryId]) {
      const entryIsKnown = Object.values(source.placeVisitLogs ?? {}).some((entries) => Boolean(entries[entryId]));
      if (entryIsKnown) {
        warnings.push(`Excluded stale journal entry from family edition: ${entryId}`);
      }
    }
  }

  return {
    editionId: config.editionId,
    version: config.version,
    title: config.title,
    includedPlaceIds: nextPlaceIds,
    includedCarnetEntryIds: nextEntryIds,
    warnings,
  };
}
