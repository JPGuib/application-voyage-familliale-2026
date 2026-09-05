import { describe, expect, it, vi, beforeEach } from "vitest";

const mockSet = vi.fn().mockResolvedValue(undefined);
const mockUpdate = vi.fn().mockResolvedValue(undefined);
const mockOnValue = vi.fn();
const mockRef = vi.fn((_db: unknown, path?: string) => ({ path }));
const mockRunTransaction = vi.fn();

vi.mock("firebase/database", async (importOriginal) => {
  const actual = await importOriginal<typeof import("firebase/database")>();
  return {
    ...actual,
    ref: (db: unknown, path?: string) => mockRef(db, path),
    set: (target: unknown, value: unknown) => mockSet(target, value),
    update: (target: unknown, updates: unknown) => mockUpdate(target, updates),
    onValue: (target: unknown, onNext: (snapshot: unknown) => void, onError?: unknown) =>
      mockOnValue(target, onNext, onError),
    runTransaction: (target: unknown, updater: (current: unknown) => unknown) =>
      mockRunTransaction(target, updater),
  };
});

import {
  addGroupInfoItem,
  deleteGroupInfoItem,
  markGroupInfoRead,
  observeGroupInfoItems,
  observeGroupInfoReadState,
  setGroupInfoItemDone,
  setGroupInfoItemPinned,
  updateGroupInfoItem,
} from "./cloudSyncProvider";
import type { CloudGroupInfoItem } from "../types/cloud";

const db = {} as import("firebase/database").Database;
const familyId = "famille-test";

beforeEach(() => {
  mockSet.mockClear();
  mockUpdate.mockClear();
  mockOnValue.mockClear();
  mockRunTransaction.mockClear();
});

const baseItem: CloudGroupInfoItem = {
  itemId: "p1-1000",
  day: 2,
  time: "7h00",
  text: "Ne pas oublier les passeports",
  authorProfileId: "p1",
  authorSurnameSnapshot: "Leo",
  authorUid: "uid-1",
  createdAt: 1000,
  pinned: false,
  doneBy: {},
};

describe("addGroupInfoItem (epic 29)", () => {
  it("writes the item under groupInfoItems/{familyId}/{itemId}", async () => {
    await addGroupInfoItem(db, familyId, baseItem);

    expect(mockSet).toHaveBeenCalledOnce();
    const [target, value] = mockSet.mock.calls[0];
    expect(target).toEqual({ path: `groupInfoItems/${familyId}/p1-1000` });
    expect(value).toEqual(baseItem);
  });
});

describe("updateGroupInfoItem (epic 29)", () => {
  it("only patches the given fields via a multi-path update", async () => {
    await updateGroupInfoItem(db, familyId, "p1-1000", { day: 3, text: "Nouveau texte" });

    expect(mockUpdate).toHaveBeenCalledOnce();
    const [, updates] = mockUpdate.mock.calls[0];
    expect(updates).toEqual({
      [`groupInfoItems/${familyId}/p1-1000/day`]: 3,
      [`groupInfoItems/${familyId}/p1-1000/text`]: "Nouveau texte",
    });
  });
});

describe("deleteGroupInfoItem (epic 29)", () => {
  it("sets the item to null (hard delete)", async () => {
    await deleteGroupInfoItem(db, familyId, "p1-1000");

    expect(mockSet).toHaveBeenCalledOnce();
    const [target, value] = mockSet.mock.calls[0];
    expect(target).toEqual({ path: `groupInfoItems/${familyId}/p1-1000` });
    expect(value).toBeNull();
  });
});

describe("setGroupInfoItemPinned (epic 29)", () => {
  it("writes the pinned field only", async () => {
    await setGroupInfoItemPinned(db, familyId, "p1-1000", true);

    expect(mockSet).toHaveBeenCalledOnce();
    const [target, value] = mockSet.mock.calls[0];
    expect(target).toEqual({ path: `groupInfoItems/${familyId}/p1-1000/pinned` });
    expect(value).toBe(true);
  });
});

describe("setGroupInfoItemDone (epic 29)", () => {
  it("writes true under doneBy/{profileId} when marking done", async () => {
    await setGroupInfoItemDone(db, familyId, "p1-1000", "p2", true);

    expect(mockSet).toHaveBeenCalledOnce();
    const [target, value] = mockSet.mock.calls[0];
    expect(target).toEqual({ path: `groupInfoItems/${familyId}/p1-1000/doneBy/p2` });
    expect(value).toBe(true);
  });

  it("writes null under doneBy/{profileId} when unmarking", async () => {
    await setGroupInfoItemDone(db, familyId, "p1-1000", "p2", false);

    const [, value] = mockSet.mock.calls[0];
    expect(value).toBeNull();
  });
});

describe("observeGroupInfoItems (epic 29)", () => {
  it("subscribes continuously and forwards parsed items to onSnapshot", () => {
    const onSnapshot = vi.fn();

    observeGroupInfoItems(db, familyId, onSnapshot);

    expect(mockRef).toHaveBeenCalledWith(db, `groupInfoItems/${familyId}`);
    expect(mockOnValue).toHaveBeenCalledOnce();

    const [, onValueCallback] = mockOnValue.mock.calls[0];
    onValueCallback({ val: () => ({ "p1-1000": baseItem }) });

    expect(onSnapshot).toHaveBeenCalledWith({ "p1-1000": baseItem });
  });

  it("ignores a malformed entry rather than crashing the screen", () => {
    const onSnapshot = vi.fn();

    observeGroupInfoItems(db, familyId, onSnapshot);

    const [, onValueCallback] = mockOnValue.mock.calls[0];
    onValueCallback({
      val: () => ({
        broken: { ...baseItem, itemId: "broken", text: "" }, // texte vide, invalide
      }),
    });

    expect(onSnapshot).toHaveBeenCalledWith({});
  });

  it("only keeps doneBy entries explicitly set to true", () => {
    const onSnapshot = vi.fn();

    observeGroupInfoItems(db, familyId, onSnapshot);

    const [, onValueCallback] = mockOnValue.mock.calls[0];
    onValueCallback({
      val: () => ({
        "p1-1000": { ...baseItem, doneBy: { p2: true, p3: false } },
      }),
    });

    expect(onSnapshot).toHaveBeenCalledWith({
      "p1-1000": { ...baseItem, doneBy: { p2: true } },
    });
  });
});

describe("observeGroupInfoReadState (epic 29)", () => {
  it("subscribes at groupInfoReadState/{familyId} (une dimension de moins que chatReadState)", () => {
    const onSnapshot = vi.fn();

    observeGroupInfoReadState(db, familyId, onSnapshot);

    expect(mockRef).toHaveBeenCalledWith(db, `groupInfoReadState/${familyId}`);

    const [, onValueCallback] = mockOnValue.mock.calls[0];
    onValueCallback({
      val: () => ({ p1: { lastReadAt: 500, authorUid: "uid-1" } }),
    });

    expect(onSnapshot).toHaveBeenCalledWith({ p1: { lastReadAt: 500, authorUid: "uid-1" } });
  });
});

describe("markGroupInfoRead (epic 29)", () => {
  it("advances lastReadAt when the candidate is more recent", async () => {
    mockRunTransaction.mockImplementation(async (_target: unknown, updater: (current: unknown) => unknown) => {
      const result = updater({ lastReadAt: 10, authorUid: "uid-old" });
      expect(result).toEqual({ lastReadAt: 20, authorUid: "uid-1" });
    });

    await markGroupInfoRead(db, familyId, "p1", "uid-1", 20);

    expect(mockRunTransaction).toHaveBeenCalledOnce();
    const [target] = mockRunTransaction.mock.calls[0];
    expect(target).toEqual({ path: `groupInfoReadState/${familyId}/p1` });
  });

  it("is a no-op (never regresses lastReadAt)", async () => {
    mockRunTransaction.mockImplementation(async (_target: unknown, updater: (current: unknown) => unknown) => {
      const result = updater({ lastReadAt: 30, authorUid: "uid-old" });
      expect(result).toBeUndefined();
    });

    await markGroupInfoRead(db, familyId, "p1", "uid-1", 20);
  });
});
