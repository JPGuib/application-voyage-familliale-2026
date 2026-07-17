import { describe, expect, it } from "vitest";
import { CHECKLIST_CATEGORIES } from "./App";
import { filterCategoriesForProfile, getVisibleItemIds, type ProfileFilterInput } from "./checklist-filter";

function flattenItems() {
  return CHECKLIST_CATEGORIES.flatMap((category) => category.items);
}

describe("checklist content enrichment - story 10.5", () => {
  it("contains at least 50 checklist items", () => {
    expect(flattenItems().length).toBeGreaterThanOrEqual(50);
  });

  it("keeps required category coverage", () => {
    const ids = new Set(CHECKLIST_CATEGORIES.map((category) => category.id));
    expect(ids.has("documents")).toBe(true);
    expect(ids.has("transport")).toBe(true);
    expect(ids.has("bagages")).toBe(true);
    expect(ids.has("toilette-sante")).toBe(true);
    expect(ids.has("electronique")).toBe(true);
    expect(ids.has("vetements-hommes")).toBe(true);
    expect(ids.has("vetements-femmes")).toBe(true);
  });

  it("contains explicit role and owner targeting metadata", () => {
    const items = flattenItems();
    const ownerOnlyCount = items.filter((item) => item.ownerOnly).length;
    const parentTargetedCount = items.filter((item) => item.householdRoleTargets === "parent").length;
    const childTargetedCount = items.filter((item) => item.householdRoleTargets === "child").length;

    expect(ownerOnlyCount).toBeGreaterThanOrEqual(3);
    expect(parentTargetedCount).toBeGreaterThanOrEqual(6);
    expect(childTargetedCount).toBeGreaterThanOrEqual(4);
  });

  it("keeps meaningful visibility for profile matrix", () => {
    const owner: ProfileFilterInput = { role: "proprietaire", gender: "unspecified", householdRole: "member" };
    const parentMale: ProfileFilterInput = { role: "utilisateur", gender: "male", householdRole: "parent" };
    const parentFemale: ProfileFilterInput = { role: "utilisateur", gender: "female", householdRole: "parent" };
    const child: ProfileFilterInput = { role: "utilisateur", gender: "unspecified", householdRole: "child" };

    const ownerIds = getVisibleItemIds(CHECKLIST_CATEGORIES, owner);
    const parentMaleIds = getVisibleItemIds(CHECKLIST_CATEGORIES, parentMale);
    const parentFemaleIds = getVisibleItemIds(CHECKLIST_CATEGORIES, parentFemale);
    const childIds = getVisibleItemIds(CHECKLIST_CATEGORIES, child);

    expect(ownerIds.size).toBeGreaterThan(parentMaleIds.size);
    expect(ownerIds.size).toBeGreaterThan(parentFemaleIds.size);
    expect(ownerIds.size).toBeGreaterThan(childIds.size);

    expect(parentMaleIds.size).toBeGreaterThanOrEqual(30);
    expect(parentFemaleIds.size).toBeGreaterThanOrEqual(30);
    expect(childIds.size).toBeGreaterThanOrEqual(24);

    expect(filterCategoriesForProfile(CHECKLIST_CATEGORIES, owner)).not.toHaveLength(0);
    expect(filterCategoriesForProfile(CHECKLIST_CATEGORIES, parentMale)).not.toHaveLength(0);
    expect(filterCategoriesForProfile(CHECKLIST_CATEGORIES, parentFemale)).not.toHaveLength(0);
    expect(filterCategoriesForProfile(CHECKLIST_CATEGORIES, child)).not.toHaveLength(0);
  });
});
