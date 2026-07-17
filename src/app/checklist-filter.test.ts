import { describe, expect, it } from "vitest";
import {
  filterCategoriesForProfile,
  getCategoryBadges,
  getItemBadges,
  getVisibleItemIds,
  isItemVisibleForProfile,
  type ChecklistItemTargeting,
  type ProfileFilterInput,
} from "./checklist-filter";

// ─── isItemVisibleForProfile ─────────────────────────────────────────────────

describe("isItemVisibleForProfile - owner override", () => {
  it("shows ownerOnly item to owner", () => {
    const item: ChecklistItemTargeting = { ownerOnly: true };
    const owner: ProfileFilterInput = {
      role: "proprietaire",
      gender: "unspecified",
      householdRole: "member",
    };
    expect(isItemVisibleForProfile(item, owner)).toBe(true);
  });

  it("shows gender-targeted item to owner regardless of gender", () => {
    const item: ChecklistItemTargeting = { genderTargets: "female" };
    const owner: ProfileFilterInput = {
      role: "proprietaire",
      gender: "male",
      householdRole: "parent",
    };
    expect(isItemVisibleForProfile(item, owner)).toBe(true);
  });

  it("shows householdRole-targeted item to owner regardless of role", () => {
    const item: ChecklistItemTargeting = { householdRoleTargets: "child" };
    const owner: ProfileFilterInput = {
      role: "proprietaire",
      gender: "unspecified",
      householdRole: "parent",
    };
    expect(isItemVisibleForProfile(item, owner)).toBe(true);
  });
});

describe("isItemVisibleForProfile - ownerOnly gate", () => {
  it("hides ownerOnly item from non-owner", () => {
    const item: ChecklistItemTargeting = { ownerOnly: true };
    const user: ProfileFilterInput = {
      role: "utilisateur",
      gender: "male",
      householdRole: "parent",
    };
    expect(isItemVisibleForProfile(item, user)).toBe(false);
  });

  it("hides ownerOnly item from non-owner even with default metadata", () => {
    const item: ChecklistItemTargeting = { ownerOnly: true };
    const user: ProfileFilterInput = {
      role: "utilisateur",
      gender: "unspecified",
      householdRole: "member",
    };
    expect(isItemVisibleForProfile(item, user)).toBe(false);
  });
});

describe("isItemVisibleForProfile - default metadata (AC2)", () => {
  it("shows gender-targeted item to non-owner with default metadata", () => {
    const item: ChecklistItemTargeting = { genderTargets: "female" };
    const user: ProfileFilterInput = {
      role: "utilisateur",
      gender: "unspecified",
      householdRole: "member",
    };
    expect(isItemVisibleForProfile(item, user)).toBe(true);
  });

  it("shows householdRole-targeted item to non-owner with default metadata", () => {
    const item: ChecklistItemTargeting = { householdRoleTargets: "teen" };
    const user: ProfileFilterInput = {
      role: "utilisateur",
      gender: "unspecified",
      householdRole: "member",
    };
    expect(isItemVisibleForProfile(item, user)).toBe(true);
  });

  it("shows untagged item to non-owner with default metadata", () => {
    const item: ChecklistItemTargeting = {};
    const user: ProfileFilterInput = {
      role: "utilisateur",
      gender: "unspecified",
      householdRole: "member",
    };
    expect(isItemVisibleForProfile(item, user)).toBe(true);
  });
});

describe("isItemVisibleForProfile - gender filtering", () => {
  it("hides male item from female user", () => {
    const item: ChecklistItemTargeting = { genderTargets: "male" };
    const user: ProfileFilterInput = {
      role: "utilisateur",
      gender: "female",
      householdRole: "parent",
    };
    expect(isItemVisibleForProfile(item, user)).toBe(false);
  });

  it("hides female item from male user", () => {
    const item: ChecklistItemTargeting = { genderTargets: "female" };
    const user: ProfileFilterInput = {
      role: "utilisateur",
      gender: "male",
      householdRole: "parent",
    };
    expect(isItemVisibleForProfile(item, user)).toBe(false);
  });

  it("shows female item to female user", () => {
    const item: ChecklistItemTargeting = { genderTargets: "female" };
    const user: ProfileFilterInput = {
      role: "utilisateur",
      gender: "female",
      householdRole: "parent",
    };
    expect(isItemVisibleForProfile(item, user)).toBe(true);
  });

  it("shows 'all' gender item to male user with explicit role", () => {
    const item: ChecklistItemTargeting = { genderTargets: "all" };
    const user: ProfileFilterInput = {
      role: "utilisateur",
      gender: "male",
      householdRole: "parent",
    };
    expect(isItemVisibleForProfile(item, user)).toBe(true);
  });

  it("shows gender-targeted item to unspecified-gender user with explicit householdRole", () => {
    // gender pass-through: when profile.gender is unspecified, gender dimension does not filter
    const item: ChecklistItemTargeting = { genderTargets: "male" };
    const user: ProfileFilterInput = {
      role: "utilisateur",
      gender: "unspecified",
      householdRole: "teen",
    };
    expect(isItemVisibleForProfile(item, user)).toBe(true);
  });
});

describe("isItemVisibleForProfile - householdRole filtering", () => {
  it("hides parent item from teen user", () => {
    const item: ChecklistItemTargeting = { householdRoleTargets: "parent" };
    const user: ProfileFilterInput = {
      role: "utilisateur",
      gender: "unspecified",
      householdRole: "teen",
    };
    expect(isItemVisibleForProfile(item, user)).toBe(false);
  });

  it("shows teen item to teen user", () => {
    const item: ChecklistItemTargeting = { householdRoleTargets: "teen" };
    const user: ProfileFilterInput = {
      role: "utilisateur",
      gender: "unspecified",
      householdRole: "teen",
    };
    expect(isItemVisibleForProfile(item, user)).toBe(true);
  });

  it("shows 'all' householdRole item to any explicit-role user", () => {
    const item: ChecklistItemTargeting = { householdRoleTargets: "all" };
    const user: ProfileFilterInput = {
      role: "utilisateur",
      gender: "male",
      householdRole: "teen",
    };
    expect(isItemVisibleForProfile(item, user)).toBe(true);
  });

  it("shows householdRole-targeted item to member-role user with explicit gender", () => {
    // householdRole pass-through: when profile.householdRole is "member", role dimension does not filter
    const item: ChecklistItemTargeting = { householdRoleTargets: "parent" };
    const user: ProfileFilterInput = {
      role: "utilisateur",
      gender: "female",
      householdRole: "member",
    };
    expect(isItemVisibleForProfile(item, user)).toBe(true);
  });
});

describe("isItemVisibleForProfile - combined targeting", () => {
  it("hides female+parent item from male parent", () => {
    const item: ChecklistItemTargeting = {
      genderTargets: "female",
      householdRoleTargets: "parent",
    };
    const user: ProfileFilterInput = {
      role: "utilisateur",
      gender: "male",
      householdRole: "parent",
    };
    expect(isItemVisibleForProfile(item, user)).toBe(false);
  });

  it("shows female+parent item to female parent", () => {
    const item: ChecklistItemTargeting = {
      genderTargets: "female",
      householdRoleTargets: "parent",
    };
    const user: ProfileFilterInput = {
      role: "utilisateur",
      gender: "female",
      householdRole: "parent",
    };
    expect(isItemVisibleForProfile(item, user)).toBe(true);
  });

  it("hides female+parent item from female teen", () => {
    const item: ChecklistItemTargeting = {
      genderTargets: "female",
      householdRoleTargets: "parent",
    };
    const user: ProfileFilterInput = {
      role: "utilisateur",
      gender: "female",
      householdRole: "teen",
    };
    expect(isItemVisibleForProfile(item, user)).toBe(false);
  });
});

// ─── filterCategoriesForProfile (AC3, AC4) ───────────────────────────────────

const SAMPLE_CATEGORIES = [
  {
    id: "mens-clothing",
    items: [
      { id: "m1", genderTargets: "male" as const },
      { id: "m2", genderTargets: "male" as const },
    ],
  },
  {
    id: "womens-clothing",
    items: [
      { id: "w1", genderTargets: "female" as const },
    ],
  },
  {
    id: "family-items",
    items: [
      { id: "f1" },
      { id: "f2" },
    ],
  },
  {
    id: "teen-items",
    items: [{ id: "t1", householdRoleTargets: "teen" as const }],
  },
  {
    id: "child-items",
    items: [{ id: "c1", householdRoleTargets: "child" as const }],
  },
  {
    id: "owner-tools",
    items: [
      { id: "o1", ownerOnly: true },
    ],
  },
];

describe("filterCategoriesForProfile - AC3 owner sees all", () => {
  it("owner sees all 6 categories including ownerOnly", () => {
    const owner: ProfileFilterInput = {
      role: "proprietaire",
      gender: "unspecified",
      householdRole: "member",
    };
    const result = filterCategoriesForProfile(SAMPLE_CATEGORIES, owner);
    expect(result).toHaveLength(6);
  });
});

describe("filterCategoriesForProfile - AC2 non-owner default metadata", () => {
  it("default non-owner sees mens, womens, teen, child and family (not ownerOnly)", () => {
    const user: ProfileFilterInput = {
      role: "utilisateur",
      gender: "unspecified",
      householdRole: "member",
    };
    const result = filterCategoriesForProfile(SAMPLE_CATEGORIES, user);
    const ids = result.map((c) => c.id);
    expect(ids).toContain("mens-clothing");
    expect(ids).toContain("womens-clothing");
    expect(ids).toContain("family-items");
    expect(ids).toContain("teen-items");
    expect(ids).toContain("child-items");
    expect(ids).not.toContain("owner-tools");
  });
});

describe("filterCategoriesForProfile - AC4 empty category removal", () => {
  it("removes category when all its items are hidden", () => {
    const user: ProfileFilterInput = {
      role: "utilisateur",
      gender: "female",
      householdRole: "parent",
    };
    const result = filterCategoriesForProfile(SAMPLE_CATEGORIES, user);
    expect(result.find((c) => c.id === "mens-clothing")).toBeUndefined();
    expect(result.find((c) => c.id === "owner-tools")).toBeUndefined();
    expect(result.find((c) => c.id === "womens-clothing")).toBeDefined();
    expect(result.find((c) => c.id === "family-items")).toBeDefined();
  });
});

describe("filterCategoriesForProfile - AC8 QA matrix combinations", () => {
  const owner: ProfileFilterInput = { role: "proprietaire", gender: "unspecified", householdRole: "member" };
  const parentMale: ProfileFilterInput = { role: "utilisateur", gender: "male", householdRole: "parent" };
  const parentFemale: ProfileFilterInput = { role: "utilisateur", gender: "female", householdRole: "parent" };
  const teen: ProfileFilterInput = { role: "utilisateur", gender: "unspecified", householdRole: "teen" };
  const child: ProfileFilterInput = { role: "utilisateur", gender: "unspecified", householdRole: "child" };

  it("owner: sees all categories", () => {
    const result = filterCategoriesForProfile(SAMPLE_CATEGORIES, owner);
    expect(result).toHaveLength(6);
  });

  it("parent-male: sees mens-clothing and family-items", () => {
    const result = filterCategoriesForProfile(SAMPLE_CATEGORIES, parentMale);
    const ids = result.map((c) => c.id);
    expect(ids).toContain("mens-clothing");
    expect(ids).toContain("family-items");
    expect(ids).not.toContain("womens-clothing");
    expect(ids).not.toContain("owner-tools");
  });

  it("parent-female: sees womens-clothing and family-items", () => {
    const result = filterCategoriesForProfile(SAMPLE_CATEGORIES, parentFemale);
    const ids = result.map((c) => c.id);
    expect(ids).toContain("womens-clothing");
    expect(ids).toContain("family-items");
    expect(ids).not.toContain("mens-clothing");
  });

  it("teen: sees teen-targeted items and hides child-targeted items", () => {
    const result = filterCategoriesForProfile(SAMPLE_CATEGORIES, teen);
    const ids = result.map((c) => c.id);
    expect(ids).toContain("teen-items");
    expect(ids).not.toContain("child-items");
    expect(ids).toContain("family-items");
    expect(ids).not.toContain("owner-tools");
  });

  it("child: sees child-targeted items and hides teen-targeted items", () => {
    const result = filterCategoriesForProfile(SAMPLE_CATEGORIES, child);
    const ids = result.map((c) => c.id);
    expect(ids).toContain("child-items");
    expect(ids).not.toContain("teen-items");
    expect(ids).toContain("family-items");
    expect(ids).not.toContain("owner-tools");
  });
});

// ─── getVisibleItemIds ────────────────────────────────────────────────────────

describe("getVisibleItemIds", () => {
  it("returns correct IDs for female user", () => {
    const user: ProfileFilterInput = { role: "utilisateur", gender: "female", householdRole: "parent" };
    const ids = getVisibleItemIds(SAMPLE_CATEGORIES, user);
    expect(ids.has("w1")).toBe(true);
    expect(ids.has("f1")).toBe(true);
    expect(ids.has("m1")).toBe(false);
    expect(ids.has("o1")).toBe(false);
  });

  it("owner gets all item IDs", () => {
    const owner: ProfileFilterInput = { role: "proprietaire", gender: "unspecified", householdRole: "member" };
    const ids = getVisibleItemIds(SAMPLE_CATEGORIES, owner);
    // mens m1+m2, womens w1, family f1+f2, teen t1, child c1, owner-tools o1 = 8
    expect(ids.size).toBe(8);
  });
});

// ─── getItemBadges ────────────────────────────────────────────────────────────

describe("getItemBadges", () => {
  it("returns empty array for untagged item", () => {
    expect(getItemBadges({})).toEqual([]);
  });

  it("returns ['Hommes'] for male item", () => {
    expect(getItemBadges({ genderTargets: "male" })).toEqual(["Hommes"]);
  });

  it("returns ['Femmes'] for female item", () => {
    expect(getItemBadges({ genderTargets: "female" })).toEqual(["Femmes"]);
  });

  it("returns ['Propriétaire uniquement'] for ownerOnly item", () => {
    expect(getItemBadges({ ownerOnly: true })).toEqual(["Propriétaire uniquement"]);
  });

  it("returns ['Parents'] for parent item", () => {
    expect(getItemBadges({ householdRoleTargets: "parent" })).toEqual(["Parents"]);
  });

  it("returns ['Enfants'] for teen item", () => {
    expect(getItemBadges({ householdRoleTargets: "teen" })).toEqual(["Enfants"]);
  });

  it("returns ['Enfants'] for child item", () => {
    expect(getItemBadges({ householdRoleTargets: "child" })).toEqual(["Enfants"]);
  });

  it("returns combined badges for multi-targeted item", () => {
    const badges = getItemBadges({ genderTargets: "female", householdRoleTargets: "parent" });
    expect(badges).toContain("Femmes");
    expect(badges).toContain("Parents");
  });

  it("ownerOnly keeps other targeting badges", () => {
    const badges = getItemBadges({ ownerOnly: true, genderTargets: "male" });
    expect(badges).toContain("Propriétaire uniquement");
    expect(badges).toContain("Hommes");
  });
});

// ─── getCategoryBadges ────────────────────────────────────────────────────────

describe("getCategoryBadges", () => {
  it("returns empty array when no items have targeting", () => {
    const items: ChecklistItemTargeting[] = [{}, {}];
    expect(getCategoryBadges(items)).toEqual([]);
  });

  it("aggregates badges across items", () => {
    const items: ChecklistItemTargeting[] = [
      { genderTargets: "male" },
      { genderTargets: "female" },
    ];
    const badges = getCategoryBadges(items);
    expect(badges).toContain("Hommes");
    expect(badges).toContain("Femmes");
  });

  it("deduplicates badges from multiple items with same target", () => {
    const items: ChecklistItemTargeting[] = [
      { genderTargets: "male" },
      { genderTargets: "male" },
    ];
    const badges = getCategoryBadges(items);
    expect(badges.filter((b) => b === "Hommes")).toHaveLength(1);
  });
});
