import { describe, expect, it } from "vitest";
import {
  GROUP_INFO_TEXT_MAX_LENGTH,
  GROUP_INFO_TIME_MAX_LENGTH,
  buildGroupInfoItem,
  canDeleteGroupInfoItem,
  canEditGroupInfoItem,
  canPinGroupInfoItem,
  computeHasUnreadGroupInfo,
  groupGroupInfoItemsByDay,
  groupInfoDoneByProfile,
  isGroupInfoDayPast,
  sanitizeGroupInfoText,
  sanitizeGroupInfoTime,
  shouldAdvanceGroupInfoReadState,
  sortGroupInfoItems,
} from "./groupInfo";
import { isChatEligibleRole, resolveChatAuthorSnapshotLabel } from "./chat";
import type { CloudGroupInfoItem } from "../types/cloud";

function makeItem(overrides: Partial<CloudGroupInfoItem>): CloudGroupInfoItem {
  return {
    itemId: "p1-1",
    day: 1,
    time: null,
    text: "Ne pas oublier les passeports",
    authorProfileId: "p1",
    authorSurnameSnapshot: "Leo",
    authorUid: "uid-1",
    createdAt: 1,
    pinned: false,
    doneBy: {},
    ...overrides,
  };
}

describe("groupInfo re-exports depuis chat.ts", () => {
  it("réutilise isChatEligibleRole et resolveChatAuthorSnapshotLabel tels quels (pas de duplication)", () => {
    expect(isChatEligibleRole("visiteur")).toBe(false);
    expect(isChatEligibleRole("utilisateur")).toBe(true);
    expect(resolveChatAuthorSnapshotLabel("proprietaire", "Maman")).toBe("Organisateur");
  });
});

describe("sanitizeGroupInfoText", () => {
  it("trim et plafonne à GROUP_INFO_TEXT_MAX_LENGTH", () => {
    expect(sanitizeGroupInfoText("  Bonjour  ")).toBe("Bonjour");
    expect(sanitizeGroupInfoText("a".repeat(GROUP_INFO_TEXT_MAX_LENGTH + 50)).length).toBe(
      GROUP_INFO_TEXT_MAX_LENGTH
    );
  });
});

describe("sanitizeGroupInfoTime", () => {
  it("renvoie null pour une heure vide après nettoyage", () => {
    expect(sanitizeGroupInfoTime("   ")).toBeNull();
    expect(sanitizeGroupInfoTime("")).toBeNull();
  });

  it("trim et plafonne à GROUP_INFO_TIME_MAX_LENGTH sinon", () => {
    expect(sanitizeGroupInfoTime("  7h00  ")).toBe("7h00");
    expect(sanitizeGroupInfoTime("a".repeat(GROUP_INFO_TIME_MAX_LENGTH + 10)).length).toBe(
      GROUP_INFO_TIME_MAX_LENGTH
    );
  });
});

describe("buildGroupInfoItem", () => {
  it("construit un item non épinglé, sans coche, avec le texte sanitizé", () => {
    const item = buildGroupInfoItem(2, "7h00", "  Réveil  ", "p1", "Leo", "uid-1", 100);
    expect(item).toEqual({
      itemId: "p1-100",
      day: 2,
      time: "7h00",
      text: "Réveil",
      authorProfileId: "p1",
      authorSurnameSnapshot: "Leo",
      authorUid: "uid-1",
      createdAt: 100,
      pinned: false,
      doneBy: {},
    });
  });
});

describe("canEditGroupInfoItem / canDeleteGroupInfoItem", () => {
  const item = makeItem({ authorProfileId: "p1" });

  it("autorise l'auteur", () => {
    expect(canEditGroupInfoItem("p1", item, false)).toBe(true);
    expect(canDeleteGroupInfoItem("p1", item, false)).toBe(true);
  });

  it("autorise le propriétaire même s'il n'est pas l'auteur", () => {
    expect(canEditGroupInfoItem("p2", item, true)).toBe(true);
    expect(canDeleteGroupInfoItem("p2", item, true)).toBe(true);
  });

  it("refuse un autre profil non propriétaire", () => {
    expect(canEditGroupInfoItem("p2", item, false)).toBe(false);
    expect(canDeleteGroupInfoItem("p2", item, false)).toBe(false);
  });
});

describe("canPinGroupInfoItem", () => {
  it("réservé au propriétaire, quel que soit l'auteur", () => {
    expect(canPinGroupInfoItem(true)).toBe(true);
    expect(canPinGroupInfoItem(false)).toBe(false);
  });
});

describe("isGroupInfoDayPast", () => {
  it("un jour est révolu s'il est strictement avant le jour courant", () => {
    expect(isGroupInfoDayPast(1, 3)).toBe(true);
    expect(isGroupInfoDayPast(3, 3)).toBe(false);
    expect(isGroupInfoDayPast(4, 3)).toBe(false);
  });
});

describe("groupInfoDoneByProfile", () => {
  it("vrai seulement si la clé du profil vaut true", () => {
    const item = makeItem({ doneBy: { p1: true } });
    expect(groupInfoDoneByProfile(item, "p1")).toBe(true);
    expect(groupInfoDoneByProfile(item, "p2")).toBe(false);
  });
});

describe("sortGroupInfoItems", () => {
  it("place les épinglés en premier (plus récent en tête), puis trie par jour, heure puis création", () => {
    const a = makeItem({ itemId: "a", day: 2, time: null, createdAt: 1 });
    const b = makeItem({ itemId: "b", day: 1, time: "7h00", createdAt: 2 });
    const c = makeItem({ itemId: "c", day: 1, time: null, createdAt: 3 });
    const pinnedOld = makeItem({ itemId: "pinned-old", pinned: true, createdAt: 10 });
    const pinnedNew = makeItem({ itemId: "pinned-new", pinned: true, createdAt: 20 });

    const sorted = sortGroupInfoItems([a, b, c, pinnedOld, pinnedNew]);
    expect(sorted.map((item) => item.itemId)).toEqual(["pinned-new", "pinned-old", "b", "c", "a"]);
  });
});

describe("groupGroupInfoItemsByDay", () => {
  it("regroupe par jour croissant en conservant l'ordre reçu à l'intérieur d'un jour", () => {
    const items = [
      makeItem({ itemId: "d2-a", day: 2 }),
      makeItem({ itemId: "d1-a", day: 1 }),
      makeItem({ itemId: "d1-b", day: 1 }),
    ];
    const groups = groupGroupInfoItemsByDay(items);
    expect(groups).toEqual([
      { day: 1, items: [items[1], items[2]] },
      { day: 2, items: [items[0]] },
    ]);
  });
});

describe("computeHasUnreadGroupInfo", () => {
  it("vrai si au moins un item est plus récent que lastReadAt", () => {
    const items = [makeItem({ createdAt: 5 })];
    expect(computeHasUnreadGroupInfo(items, 4)).toBe(true);
    expect(computeHasUnreadGroupInfo(items, 5)).toBe(false);
  });

  it("traite l'absence de lastReadAt comme 0 (jamais ouvert)", () => {
    const items = [makeItem({ createdAt: 1 })];
    expect(computeHasUnreadGroupInfo(items, null)).toBe(true);
    expect(computeHasUnreadGroupInfo(items, undefined)).toBe(true);
  });
});

describe("shouldAdvanceGroupInfoReadState", () => {
  it("ne recule jamais lastReadAt", () => {
    expect(shouldAdvanceGroupInfoReadState(10, 20)).toBe(true);
    expect(shouldAdvanceGroupInfoReadState(20, 10)).toBe(false);
    expect(shouldAdvanceGroupInfoReadState(null, 5)).toBe(true);
  });
});
