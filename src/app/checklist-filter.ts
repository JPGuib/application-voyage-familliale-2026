// Checklist visibility filter - pure, side-effect free utility for story 10.4.
// All functions are deterministic and never mutate their inputs.

import type {
  ProfileGender,
  ProfileHouseholdRole,
} from "../types/cloud";

export type GenderTarget = "all" | "male" | "female";
export type HouseholdRoleTarget = "all" | "parent" | "child";
export type Gender = ProfileGender;
export type HouseholdRole = ProfileHouseholdRole;

export type ChecklistItemTargeting = {
  genderTargets?: GenderTarget;
  householdRoleTargets?: HouseholdRoleTarget;
  ownerOnly?: boolean;
  visibleToProfileId?: string;
};

const GENDER_BADGE_ORDER = ["Hommes", "Femmes"] as const;
const HOUSEHOLD_BADGE_ORDER = ["Parents", "Enfants"] as const;
type GenderBadgeLabel = (typeof GENDER_BADGE_ORDER)[number];
type HouseholdBadgeLabel = (typeof HOUSEHOLD_BADGE_ORDER)[number];

function buildTargetingBadgeParts(
  genderBadges: ReadonlySet<GenderBadgeLabel>,
  householdBadges: ReadonlySet<HouseholdBadgeLabel>
): string[] {
  const left = GENDER_BADGE_ORDER.filter((label) => genderBadges.has(label));
  const right = HOUSEHOLD_BADGE_ORDER.filter((label) => householdBadges.has(label));
  if (left.length === 0 || right.length === 0) return [];
  return [...left, ...right];
}

export type ProfileFilterInput = {
  profileId?: string;
  role: "proprietaire" | "utilisateur";
  gender: Gender;
  householdRole: HouseholdRole;
};

/**
 * Determines whether a checklist item should be visible for the given profile.
 *
 * Rules (in order):
 * 1. Owner ("proprietaire") sees all items.
 * 2. `ownerOnly` items are invisible to non-owners.
 * 3. Non-owner with default metadata (gender = "unspecified" AND householdRole = "member")
 *    sees all remaining items.
 * 4. Non-owner with at least one explicit metadata value is filtered by both gender and
 *    householdRole tags:
 *    - Gender dimension passes when: item genderTarget is "all", OR profile.gender is
 *      "unspecified", OR genderTarget matches profile.gender.
 *    - HouseholdRole dimension passes when: item householdRoleTarget is "all", OR
 *      profile.householdRole is "member", OR householdRoleTarget matches profile.householdRole.
 */
export function isItemVisibleForProfile(
  item: ChecklistItemTargeting,
  profile: ProfileFilterInput
): boolean {
  if (item.visibleToProfileId && item.visibleToProfileId !== profile.profileId) {
    return false;
  }

  if (profile.role === "proprietaire") return true;
  if (item.ownerOnly) return false;

  const hasExplicitGender = profile.gender !== "unspecified";
  const hasExplicitRole = profile.householdRole !== "member";

  if (!hasExplicitGender && !hasExplicitRole) return true;

  const genderTarget: GenderTarget = item.genderTargets ?? "all";
  if (genderTarget !== "all" && hasExplicitGender && genderTarget !== profile.gender) {
    return false;
  }

  const roleTarget: HouseholdRoleTarget = item.householdRoleTargets ?? "all";
  if (roleTarget !== "all" && hasExplicitRole && roleTarget !== profile.householdRole) {
    return false;
  }

  return true;
}

/**
 * Filters a list of categories to only include items visible for the profile.
 * Categories that end up with zero visible items are removed entirely.
 */
export function filterCategoriesForProfile<
  I extends ChecklistItemTargeting & { id: string },
  C extends { id: string; items: I[] }
>(categories: C[], profile: ProfileFilterInput): C[] {
  const result: C[] = [];
  for (const cat of categories) {
    const visibleItems = cat.items.filter((item) =>
      isItemVisibleForProfile(item, profile)
    );
    if (visibleItems.length > 0) {
      result.push({ ...cat, items: visibleItems });
    }
  }
  return result;
}

/**
 * Returns the set of item IDs that are visible for the given profile.
 */
export function getVisibleItemIds<
  I extends ChecklistItemTargeting & { id: string },
  C extends { id: string; items: I[] }
>(categories: C[], profile: ProfileFilterInput): Set<string> {
  const ids = new Set<string>();
  for (const cat of filterCategoriesForProfile(categories, profile)) {
    for (const item of cat.items) {
      ids.add(item.id);
    }
  }
  return ids;
}

/**
 * Returns human-readable badge labels for a single checklist item.
 * By design, unspecified/all targeting displays both badges for that dimension.
 */
export function getItemBadges(item: ChecklistItemTargeting): string[] {
  const badges: string[] = [];

  const genderBadges = new Set<GenderBadgeLabel>();
  const genderTarget: GenderTarget = item.genderTargets ?? "all";
  if (genderTarget === "all" || genderTarget === "male") genderBadges.add("Hommes");
  if (genderTarget === "all" || genderTarget === "female") genderBadges.add("Femmes");

  const householdRoleBadges = new Set<HouseholdBadgeLabel>();
  const householdRoleTarget: HouseholdRoleTarget = item.householdRoleTargets ?? "all";
  if (householdRoleTarget === "all" || householdRoleTarget === "parent") householdRoleBadges.add("Parents");
  if (householdRoleTarget === "all" || householdRoleTarget === "child") householdRoleBadges.add("Enfants");

  badges.push(...buildTargetingBadgeParts(genderBadges, householdRoleBadges));

  return badges;
}

/**
 * Returns the union of badge labels across all items in a category.
 * Used to display aggregated targeting labels on the category header.
 */
export function getCategoryBadges(items: ChecklistItemTargeting[]): string[] {
  const genderBadges = new Set<GenderBadgeLabel>();
  const householdBadges = new Set<HouseholdBadgeLabel>();

  for (const item of items) {
    const genderTarget: GenderTarget = item.genderTargets ?? "all";
    if (genderTarget === "all" || genderTarget === "male") genderBadges.add("Hommes");
    if (genderTarget === "all" || genderTarget === "female") genderBadges.add("Femmes");

    const householdRoleTarget: HouseholdRoleTarget = item.householdRoleTargets ?? "all";
    if (householdRoleTarget === "all" || householdRoleTarget === "parent") householdBadges.add("Parents");
    if (householdRoleTarget === "all" || householdRoleTarget === "child") householdBadges.add("Enfants");
  }

  const badges: string[] = [];
  if (genderBadges.size > 0 && householdBadges.size > 0) {
    badges.push(...buildTargetingBadgeParts(genderBadges, householdBadges));
  }

  return badges;
}
