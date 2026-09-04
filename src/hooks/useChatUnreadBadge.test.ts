import { describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useChatUnreadBadge } from "./useChatUnreadBadge";
import type { CloudChatConversationsMap, CloudChatMessagesLog, CloudChatReadStateMap } from "../types/cloud";

function makeConversationsMock(conversations: CloudChatConversationsMap) {
  return vi.fn((onSnapshot: (value: CloudChatConversationsMap) => void) => {
    onSnapshot(conversations);
    return () => {};
  });
}

function makeReadStateMock(readState: CloudChatReadStateMap) {
  return vi.fn((onSnapshot: (value: CloudChatReadStateMap) => void) => {
    onSnapshot(readState);
    return () => {};
  });
}

function makeMessagesMock(messagesByConversation: Record<string, CloudChatMessagesLog>) {
  return vi.fn(
    (conversationId: string, _limit: number, onSnapshot: (value: CloudChatMessagesLog) => void) => {
      onSnapshot(messagesByConversation[conversationId] ?? {});
      return () => {};
    }
  );
}

const VOYAGE_CONVERSATION: CloudChatConversationsMap = {
  voyage: {
    conversationId: "voyage",
    type: "group",
    name: "Voyage",
    isDefaultVoyage: true,
    memberProfileIds: { p1: true, p2: true },
    createdAt: 1,
    createdByProfileId: "p1",
  },
};

describe("useChatUnreadBadge", () => {
  it("reports no unread when there is no message newer than lastReadAt", () => {
    const { result } = renderHook(() =>
      useChatUnreadBadge({
        cloudEnabled: true,
        currentProfileId: "p1",
        currentProfileRole: "proprietaire",
        subscribeToChatConversations: makeConversationsMock(VOYAGE_CONVERSATION),
        subscribeToChatMessages: makeMessagesMock({
          voyage: { m1: { messageId: "m1", conversationId: "voyage", authorProfileId: "p2", authorSurnameSnapshot: "Leo", authorUid: "u2", kind: "text", text: "Salut", createdAt: 100 } },
        }),
        subscribeToChatReadState: makeReadStateMock({ voyage: { p1: { lastReadAt: 200, authorUid: "u1" } } }),
      })
    );

    expect(result.current.hasUnreadChat).toBe(false);
  });

  it("reports unread when the last message is newer than lastReadAt", () => {
    const { result } = renderHook(() =>
      useChatUnreadBadge({
        cloudEnabled: true,
        currentProfileId: "p1",
        currentProfileRole: "proprietaire",
        subscribeToChatConversations: makeConversationsMock(VOYAGE_CONVERSATION),
        subscribeToChatMessages: makeMessagesMock({
          voyage: { m1: { messageId: "m1", conversationId: "voyage", authorProfileId: "p2", authorSurnameSnapshot: "Leo", authorUid: "u2", kind: "text", text: "Salut", createdAt: 300 } },
        }),
        subscribeToChatReadState: makeReadStateMock({ voyage: { p1: { lastReadAt: 200, authorUid: "u1" } } }),
      })
    );

    expect(result.current.hasUnreadChat).toBe(true);
  });

  it("reports unread for a conversation never opened before (no lastReadAt entry)", () => {
    const { result } = renderHook(() =>
      useChatUnreadBadge({
        cloudEnabled: true,
        currentProfileId: "p1",
        currentProfileRole: "proprietaire",
        subscribeToChatConversations: makeConversationsMock(VOYAGE_CONVERSATION),
        subscribeToChatMessages: makeMessagesMock({
          voyage: { m1: { messageId: "m1", conversationId: "voyage", authorProfileId: "p2", authorSurnameSnapshot: "Leo", authorUid: "u2", kind: "text", text: "Salut", createdAt: 100 } },
        }),
        subscribeToChatReadState: makeReadStateMock({}),
      })
    );

    expect(result.current.hasUnreadChat).toBe(true);
  });

  it("never shows a badge for a visiteur profile, even with unread messages", () => {
    const conversationsMock = makeConversationsMock(VOYAGE_CONVERSATION);
    const { result } = renderHook(() =>
      useChatUnreadBadge({
        cloudEnabled: true,
        currentProfileId: "p3",
        currentProfileRole: "visiteur",
        subscribeToChatConversations: conversationsMock,
        subscribeToChatMessages: makeMessagesMock({}),
        subscribeToChatReadState: makeReadStateMock({}),
      })
    );

    expect(result.current.hasUnreadChat).toBe(false);
    expect(conversationsMock).not.toHaveBeenCalled();
  });

  it("ignores conversations the current profile is not a member of", () => {
    const { result } = renderHook(() =>
      useChatUnreadBadge({
        cloudEnabled: true,
        currentProfileId: "p-outsider",
        currentProfileRole: "utilisateur",
        subscribeToChatConversations: makeConversationsMock(VOYAGE_CONVERSATION),
        subscribeToChatMessages: makeMessagesMock({
          voyage: { m1: { messageId: "m1", conversationId: "voyage", authorProfileId: "p2", authorSurnameSnapshot: "Leo", authorUid: "u2", kind: "text", text: "Salut", createdAt: 100 } },
        }),
        subscribeToChatReadState: makeReadStateMock({}),
      })
    );

    expect(result.current.hasUnreadChat).toBe(false);
  });
});
