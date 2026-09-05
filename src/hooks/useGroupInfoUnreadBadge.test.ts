import { describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useGroupInfoUnreadBadge } from "./useGroupInfoUnreadBadge";
import type { CloudGroupInfoItemsLog, CloudGroupInfoReadStateByProfile } from "../types/cloud";

function makeItemsMock(items: CloudGroupInfoItemsLog) {
  return vi.fn((onSnapshot: (value: CloudGroupInfoItemsLog) => void) => {
    onSnapshot(items);
    return () => {};
  });
}

function makeReadStateMock(readState: CloudGroupInfoReadStateByProfile) {
  return vi.fn((onSnapshot: (value: CloudGroupInfoReadStateByProfile) => void) => {
    onSnapshot(readState);
    return () => {};
  });
}

const ONE_ITEM: CloudGroupInfoItemsLog = {
  "p2-100": {
    itemId: "p2-100",
    day: 1,
    time: null,
    text: "Réveil à 7h",
    authorProfileId: "p2",
    authorSurnameSnapshot: "Leo",
    authorUid: "u2",
    createdAt: 300,
    pinned: false,
    doneBy: {},
  },
};

describe("useGroupInfoUnreadBadge", () => {
  it("reports no unread when there is no item newer than lastReadAt", () => {
    const { result } = renderHook(() =>
      useGroupInfoUnreadBadge({
        cloudEnabled: true,
        currentProfileId: "p1",
        currentProfileRole: "proprietaire",
        subscribeToGroupInfoItems: makeItemsMock(ONE_ITEM),
        subscribeToGroupInfoReadState: makeReadStateMock({ p1: { lastReadAt: 400, authorUid: "u1" } }),
      })
    );

    expect(result.current.hasUnreadGroupInfo).toBe(false);
  });

  it("reports unread when the latest item is newer than lastReadAt", () => {
    const { result } = renderHook(() =>
      useGroupInfoUnreadBadge({
        cloudEnabled: true,
        currentProfileId: "p1",
        currentProfileRole: "proprietaire",
        subscribeToGroupInfoItems: makeItemsMock(ONE_ITEM),
        subscribeToGroupInfoReadState: makeReadStateMock({ p1: { lastReadAt: 200, authorUid: "u1" } }),
      })
    );

    expect(result.current.hasUnreadGroupInfo).toBe(true);
  });

  it("reports unread when the profile never opened the board before (no lastReadAt entry)", () => {
    const { result } = renderHook(() =>
      useGroupInfoUnreadBadge({
        cloudEnabled: true,
        currentProfileId: "p1",
        currentProfileRole: "proprietaire",
        subscribeToGroupInfoItems: makeItemsMock(ONE_ITEM),
        subscribeToGroupInfoReadState: makeReadStateMock({}),
      })
    );

    expect(result.current.hasUnreadGroupInfo).toBe(true);
  });

  it("never shows a badge for a visiteur profile (no access to this rubric)", () => {
    const itemsMock = makeItemsMock(ONE_ITEM);
    const { result } = renderHook(() =>
      useGroupInfoUnreadBadge({
        cloudEnabled: true,
        currentProfileId: "p3",
        currentProfileRole: "visiteur",
        subscribeToGroupInfoItems: itemsMock,
        subscribeToGroupInfoReadState: makeReadStateMock({}),
      })
    );

    expect(result.current.hasUnreadGroupInfo).toBe(false);
    expect(itemsMock).not.toHaveBeenCalled();
  });
});
