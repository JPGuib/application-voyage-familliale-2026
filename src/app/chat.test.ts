import { describe, expect, it } from "vitest";
import {
  CHAT_MESSAGE_MAX_LENGTH,
  CUSTOM_CHAT_NAME_MAX_LENGTH,
  DIRECT_CONVERSATION_PLACEHOLDER_NAME,
  ORGANISATEUR_LABEL,
  POLL_BUBBLE_LABEL,
  POLL_LIBRE_ANSWER_MAX_LENGTH,
  POLL_OUI_NON_OPTIONS,
  UNREAD_BADGE_DISPLAY_CAP,
  VOYAGE_CONVERSATION_ID,
  VOYAGE_CONVERSATION_NAME,
  buildChatPollMessage,
  buildChatPollResponse,
  buildDirectConversationDraft,
  buildGroupConversationDraft,
  buildVoyageConversationSeed,
  canCreateChatPoll,
  canLeaveChatConversation,
  canRenameChatConversation,
  canRespondToChatPoll,
  chatMessagePreviewSourceText,
  computeMissingVoyageMembers,
  computeOuiNonPollTally,
  computeUnreadChatMessageCount,
  formatChatMessageTimestamp,
  formatUnreadBadgeLabel,
  generateChatConversationId,
  getChatPollResponseForProfile,
  groupConsecutiveChatMessages,
  isChatEligibleRole,
  isChatPollAnswerValueValid,
  listSelectableChatMembers,
  resolveChatAuthorSnapshotLabel,
  resolveChatConversationDisplayName,
  sanitizeChatConversationName,
  sanitizeChatMessageText,
  sanitizePollLibreAnswer,
  sanitizePollQuestion,
  shouldAdvanceChatReadState,
  sortChatConversationsByActivity,
  sortChatMessagesAscending,
  truncateChatMessagePreview,
} from "./chat";
import type { CloudChatConversation, CloudChatMessage, CloudChatPollResponsesByProfile } from "../types/cloud";

function makeMessage(overrides: Partial<CloudChatMessage>): CloudChatMessage {
  return {
    messageId: "m1",
    conversationId: VOYAGE_CONVERSATION_ID,
    authorProfileId: "p1",
    authorSurnameSnapshot: "Leo",
    authorUid: "uid-1",
    kind: "text",
    text: "Salut",
    createdAt: 1,
    ...overrides,
  };
}

describe("isChatEligibleRole", () => {
  it("excludes visiteur only", () => {
    expect(isChatEligibleRole("proprietaire")).toBe(true);
    expect(isChatEligibleRole("utilisateur")).toBe(true);
    expect(isChatEligibleRole("visiteur")).toBe(false);
  });
});

describe("resolveChatAuthorSnapshotLabel", () => {
  it("always returns Organisateur for the owner role, regardless of surname", () => {
    expect(resolveChatAuthorSnapshotLabel("proprietaire", "Maman")).toBe(ORGANISATEUR_LABEL);
    expect(resolveChatAuthorSnapshotLabel("proprietaire", "")).toBe(ORGANISATEUR_LABEL);
  });

  it("returns the trimmed surname for non-owner roles", () => {
    expect(resolveChatAuthorSnapshotLabel("utilisateur", "  Leo  ")).toBe("Leo");
  });

  it("falls back to a generic label when the surname is blank", () => {
    expect(resolveChatAuthorSnapshotLabel("utilisateur", "   ")).toBe("Profil");
  });
});

describe("buildVoyageConversationSeed", () => {
  it("includes proprietaire and utilisateur profiles but excludes visiteur", () => {
    const seed = buildVoyageConversationSeed(
      [
        { profileId: "p1", role: "proprietaire" },
        { profileId: "p2", role: "utilisateur" },
        { profileId: "p3", role: "visiteur" },
      ],
      "p1",
      1000
    );

    expect(seed.conversationId).toBe(VOYAGE_CONVERSATION_ID);
    expect(seed.name).toBe(VOYAGE_CONVERSATION_NAME);
    expect(seed.type).toBe("group");
    expect(seed.isDefaultVoyage).toBe(true);
    expect(seed.createdByProfileId).toBe("p1");
    expect(seed.createdAt).toBe(1000);
    expect(seed.memberProfileIds).toEqual({ p1: true, p2: true });
  });
});

describe("computeMissingVoyageMembers", () => {
  it("returns every eligible profile when the conversation does not exist yet", () => {
    expect(computeMissingVoyageMembers(null, ["p1", "p2"])).toEqual(["p1", "p2"]);
  });

  it("returns only the profiles not already registered as members", () => {
    const conversation = { memberProfileIds: { p1: true as const } };
    expect(computeMissingVoyageMembers(conversation, ["p1", "p2", "p3"])).toEqual(["p2", "p3"]);
  });

  it("returns an empty list once every eligible profile is already a member", () => {
    const conversation = { memberProfileIds: { p1: true as const, p2: true as const } };
    expect(computeMissingVoyageMembers(conversation, ["p1", "p2"])).toEqual([]);
  });
});

describe("sortChatMessagesAscending", () => {
  it("sorts by createdAt without mutating the input array", () => {
    const input = [makeMessage({ messageId: "b", createdAt: 20 }), makeMessage({ messageId: "a", createdAt: 10 })];
    const sorted = sortChatMessagesAscending(input);

    expect(sorted.map((m) => m.messageId)).toEqual(["a", "b"]);
    expect(input.map((m) => m.messageId)).toEqual(["b", "a"]);
  });
});

describe("groupConsecutiveChatMessages", () => {
  it("groups consecutive messages from the same author", () => {
    const messages = [
      makeMessage({ messageId: "1", authorProfileId: "p1" }),
      makeMessage({ messageId: "2", authorProfileId: "p1" }),
      makeMessage({ messageId: "3", authorProfileId: "p2" }),
      makeMessage({ messageId: "4", authorProfileId: "p1" }),
    ];

    const groups = groupConsecutiveChatMessages(messages);

    expect(groups).toHaveLength(3);
    expect(groups[0].map((m) => m.messageId)).toEqual(["1", "2"]);
    expect(groups[1].map((m) => m.messageId)).toEqual(["3"]);
    expect(groups[2].map((m) => m.messageId)).toEqual(["4"]);
  });

  it("returns an empty list for no messages", () => {
    expect(groupConsecutiveChatMessages([])).toEqual([]);
  });
});

describe("formatChatMessageTimestamp", () => {
  it("shows only the time for a message sent today", () => {
    const now = new Date(2026, 8, 3, 18, 0, 0).getTime();
    const createdAt = new Date(2026, 8, 3, 14, 32, 0).getTime();

    const result = formatChatMessageTimestamp(createdAt, now);

    expect(result.time).toBe("14:32");
    expect(result.dateLabel).toBeNull();
  });

  it("also shows the date for a message sent on a previous day", () => {
    const now = new Date(2026, 8, 3, 9, 0, 0).getTime();
    const createdAt = new Date(2026, 8, 1, 22, 5, 0).getTime();

    const result = formatChatMessageTimestamp(createdAt, now);

    expect(result.time).toBe("22:05");
    expect(result.dateLabel).not.toBeNull();
  });
});

describe("sanitizeChatMessageText", () => {
  it("trims surrounding whitespace", () => {
    expect(sanitizeChatMessageText("  Salut tout le monde  ")).toBe("Salut tout le monde");
  });

  it("caps the length at CHAT_MESSAGE_MAX_LENGTH", () => {
    const long = "a".repeat(CHAT_MESSAGE_MAX_LENGTH + 50);
    expect(sanitizeChatMessageText(long)).toHaveLength(CHAT_MESSAGE_MAX_LENGTH);
  });
});

// --- Story 28.2 : groupes personnalisés et conversations 1-to-1 ---------

describe("generateChatConversationId", () => {
  it("never collides across successive calls", () => {
    const ids = Array.from({ length: 20 }, () => generateChatConversationId());
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("sanitizeChatConversationName", () => {
  it("trims and caps the length at CUSTOM_CHAT_NAME_MAX_LENGTH", () => {
    expect(sanitizeChatConversationName("  Les grands  ")).toBe("Les grands");
    const long = "a".repeat(CUSTOM_CHAT_NAME_MAX_LENGTH + 20);
    expect(sanitizeChatConversationName(long)).toHaveLength(CUSTOM_CHAT_NAME_MAX_LENGTH);
  });
});

describe("buildGroupConversationDraft", () => {
  it("includes the creator plus the chosen members, never isDefaultVoyage", () => {
    const draft = buildGroupConversationDraft("Team plage", "p1", ["p2", "p3"], 1000);

    expect(draft.type).toBe("group");
    expect(draft.name).toBe("Team plage");
    expect(draft.isDefaultVoyage).toBe(false);
    expect(draft.createdByProfileId).toBe("p1");
    expect(draft.createdAt).toBe(1000);
    expect(draft.memberProfileIds).toEqual({ p1: true, p2: true, p3: true });
  });
});

describe("buildDirectConversationDraft", () => {
  it("has exactly the two participants and a placeholder name", () => {
    const draft = buildDirectConversationDraft("p1", "p2", 1000);

    expect(draft.type).toBe("direct");
    expect(draft.name).toBe(DIRECT_CONVERSATION_PLACEHOLDER_NAME);
    expect(draft.isDefaultVoyage).toBe(false);
    expect(draft.memberProfileIds).toEqual({ p1: true, p2: true });
  });
});

describe("canRenameChatConversation / canLeaveChatConversation", () => {
  it("forbids renaming and leaving the Voyage conversation", () => {
    const voyage = { isDefaultVoyage: true, type: "group" as const };
    expect(canRenameChatConversation(voyage)).toBe(false);
    expect(canLeaveChatConversation(voyage)).toBe(false);
  });

  it("allows renaming and leaving a custom group", () => {
    const group = { isDefaultVoyage: false, type: "group" as const };
    expect(canRenameChatConversation(group)).toBe(true);
    expect(canLeaveChatConversation(group)).toBe(true);
  });

  it("allows renaming but never leaving a 1-to-1 conversation", () => {
    const direct = { isDefaultVoyage: false, type: "direct" as const };
    expect(canRenameChatConversation(direct)).toBe(true);
    expect(canLeaveChatConversation(direct)).toBe(false);
  });
});

describe("resolveChatConversationDisplayName", () => {
  const profilesById = {
    p1: { surname: "Maman", role: "proprietaire" as const },
    p2: { surname: "Leo", role: "utilisateur" as const },
  };

  it("returns the stored name as-is for a group (Voyage or custom)", () => {
    const group: Pick<CloudChatConversation, "type" | "name" | "memberProfileIds"> = {
      type: "group",
      name: "Team plage",
      memberProfileIds: { p1: true, p2: true },
    };
    expect(resolveChatConversationDisplayName(group, "p2", profilesById)).toBe("Team plage");
  });

  it("resolves a direct conversation to the other participant's live label", () => {
    const direct: Pick<CloudChatConversation, "type" | "name" | "memberProfileIds"> = {
      type: "direct",
      name: DIRECT_CONVERSATION_PLACEHOLDER_NAME,
      memberProfileIds: { p1: true, p2: true },
    };
    expect(resolveChatConversationDisplayName(direct, "p2", profilesById)).toBe(ORGANISATEUR_LABEL);
    expect(resolveChatConversationDisplayName(direct, "p1", profilesById)).toBe("Leo");
  });

  it("falls back to a neutral label if the other participant no longer exists", () => {
    const direct: Pick<CloudChatConversation, "type" | "name" | "memberProfileIds"> = {
      type: "direct",
      name: DIRECT_CONVERSATION_PLACEHOLDER_NAME,
      memberProfileIds: { p1: true, p404: true },
    };
    expect(resolveChatConversationDisplayName(direct, "p1", profilesById)).toBe("Profil supprimé");
  });
});

describe("listSelectableChatMembers", () => {
  it("excludes visiteur profiles and the current profile", () => {
    const members = listSelectableChatMembers(
      [
        { profileId: "p1", role: "proprietaire" },
        { profileId: "p2", role: "utilisateur" },
        { profileId: "p3", role: "visiteur" },
      ],
      "p1"
    );

    expect(members.map((m) => m.profileId)).toEqual(["p2"]);
  });
});

describe("truncateChatMessagePreview", () => {
  it("leaves short text untouched", () => {
    expect(truncateChatMessagePreview("Salut !")).toBe("Salut !");
  });

  it("flattens newlines and truncates with an ellipsis", () => {
    const preview = truncateChatMessagePreview("Ligne 1\nLigne 2 qui continue encore et encore", 20);
    expect(preview.endsWith("…")).toBe(true);
    expect(preview.length).toBeLessThanOrEqual(20);
    expect(preview.includes("\n")).toBe(false);
  });
});

describe("sortChatConversationsByActivity", () => {
  it("sorts by most recent activity first, without mutating the input", () => {
    const input = [
      { conversationId: "b", createdAt: 10 },
      { conversationId: "a", createdAt: 20 },
    ];
    const sorted = sortChatConversationsByActivity(input, (c) => c.createdAt);

    expect(sorted.map((c) => c.conversationId)).toEqual(["a", "b"]);
    expect(input.map((c) => c.conversationId)).toEqual(["b", "a"]);
  });

  it("breaks ties on conversationId for a stable order", () => {
    const input = [
      { conversationId: "z", createdAt: 10 },
      { conversationId: "a", createdAt: 10 },
    ];
    const sorted = sortChatConversationsByActivity(input, (c) => c.createdAt);
    expect(sorted.map((c) => c.conversationId)).toEqual(["a", "z"]);
  });
});

// Story 28.4 : badge de messages non lus.
describe("computeUnreadChatMessageCount", () => {
  it("counts only messages strictly newer than lastReadAt", () => {
    const messages = [
      makeMessage({ messageId: "m1", createdAt: 100 }),
      makeMessage({ messageId: "m2", createdAt: 200 }),
      makeMessage({ messageId: "m3", createdAt: 300 }),
    ];
    expect(computeUnreadChatMessageCount(messages, 200)).toBe(1);
  });

  it("counts every loaded message when lastReadAt is absent (never opened before)", () => {
    const messages = [makeMessage({ messageId: "m1", createdAt: 1 }), makeMessage({ messageId: "m2", createdAt: 2 })];
    expect(computeUnreadChatMessageCount(messages, null)).toBe(2);
    expect(computeUnreadChatMessageCount(messages, undefined)).toBe(2);
  });

  it("returns 0 when nothing is newer than lastReadAt", () => {
    const messages = [makeMessage({ messageId: "m1", createdAt: 100 })];
    expect(computeUnreadChatMessageCount(messages, 500)).toBe(0);
  });
});

describe("formatUnreadBadgeLabel", () => {
  it("shows the exact count below the display cap", () => {
    expect(formatUnreadBadgeLabel(1)).toBe("1");
    expect(formatUnreadBadgeLabel(UNREAD_BADGE_DISPLAY_CAP)).toBe("9");
  });

  it("caps the label past the display cap", () => {
    expect(formatUnreadBadgeLabel(UNREAD_BADGE_DISPLAY_CAP + 1)).toBe("9+");
    expect(formatUnreadBadgeLabel(42)).toBe("9+");
  });
});

describe("shouldAdvanceChatReadState", () => {
  it("allows advancing when the candidate is strictly newer", () => {
    expect(shouldAdvanceChatReadState(100, 200)).toBe(true);
  });

  it("never regresses lastReadAt (cas limite multi-appareils)", () => {
    expect(shouldAdvanceChatReadState(200, 100)).toBe(false);
    expect(shouldAdvanceChatReadState(200, 200)).toBe(false);
  });

  it("treats a missing current value as 0", () => {
    expect(shouldAdvanceChatReadState(null, 1)).toBe(true);
    expect(shouldAdvanceChatReadState(undefined, 1)).toBe(true);
  });
});

// --- Story 28.3 : sondages du propriétaire dans "Voyage" ----------------

describe("canCreateChatPoll", () => {
  it("allows only the proprietaire, and only in the Voyage conversation", () => {
    const voyage = { isDefaultVoyage: true };
    const customGroup = { isDefaultVoyage: false };

    expect(canCreateChatPoll("proprietaire", voyage)).toBe(true);
    expect(canCreateChatPoll("utilisateur", voyage)).toBe(false);
    expect(canCreateChatPoll("visiteur", voyage)).toBe(false);
    expect(canCreateChatPoll("proprietaire", customGroup)).toBe(false);
  });
});

describe("sanitizePollQuestion / sanitizePollLibreAnswer", () => {
  it("trims and caps the question at CHAT_MESSAGE_MAX_LENGTH", () => {
    expect(sanitizePollQuestion("  On part tôt demain ?  ")).toBe("On part tôt demain ?");
    const long = "a".repeat(CHAT_MESSAGE_MAX_LENGTH + 10);
    expect(sanitizePollQuestion(long)).toHaveLength(CHAT_MESSAGE_MAX_LENGTH);
  });

  it("trims and caps a libre answer at POLL_LIBRE_ANSWER_MAX_LENGTH", () => {
    expect(sanitizePollLibreAnswer("  Fatigué  ")).toBe("Fatigué");
    const long = "a".repeat(POLL_LIBRE_ANSWER_MAX_LENGTH + 10);
    expect(sanitizePollLibreAnswer(long)).toHaveLength(POLL_LIBRE_ANSWER_MAX_LENGTH);
  });
});

describe("buildChatPollMessage", () => {
  it("builds a poll message with an empty text and pollClosed starting at false", () => {
    const message = buildChatPollMessage(
      VOYAGE_CONVERSATION_ID,
      "oui_non",
      "On part tôt demain ?",
      "p1",
      ORGANISATEUR_LABEL,
      "uid-1",
      1000
    );

    expect(message.kind).toBe("poll");
    expect(message.text).toBe("");
    expect(message.pollType).toBe("oui_non");
    expect(message.pollQuestion).toBe("On part tôt demain ?");
    expect(message.pollClosed).toBe(false);
    expect(message.messageId).toBe("p1-1000");
  });
});

describe("canRespondToChatPoll", () => {
  it("allows responding while the poll is open, denies once closed", () => {
    expect(canRespondToChatPoll({ pollClosed: false })).toBe(true);
    expect(canRespondToChatPoll({ pollClosed: undefined })).toBe(true);
    expect(canRespondToChatPoll({ pollClosed: true })).toBe(false);
  });
});

describe("isChatPollAnswerValueValid", () => {
  it("only accepts the two fixed options for oui_non", () => {
    expect(isChatPollAnswerValueValid("oui_non", "oui")).toBe(true);
    expect(isChatPollAnswerValueValid("oui_non", "non")).toBe(true);
    expect(isChatPollAnswerValueValid("oui_non", "peut-être")).toBe(false);
    expect(isChatPollAnswerValueValid("oui_non", "")).toBe(false);
  });

  it("accepts any non-empty text within the limit for libre", () => {
    expect(isChatPollAnswerValueValid("libre", "Fatigué mais content")).toBe(true);
    expect(isChatPollAnswerValueValid("libre", "")).toBe(false);
    expect(isChatPollAnswerValueValid("libre", "a".repeat(POLL_LIBRE_ANSWER_MAX_LENGTH + 1))).toBe(false);
    expect(isChatPollAnswerValueValid("libre", "a".repeat(POLL_LIBRE_ANSWER_MAX_LENGTH))).toBe(true);
  });
});

describe("buildChatPollResponse / getChatPollResponseForProfile", () => {
  it("builds a response and retrieves it by profileId", () => {
    const response = buildChatPollResponse("p2", "oui", "uid-2", 500);
    const responses: CloudChatPollResponsesByProfile = { p2: response };

    expect(getChatPollResponseForProfile(responses, "p2")).toEqual(response);
    expect(getChatPollResponseForProfile(responses, "p3")).toBeUndefined();
    expect(getChatPollResponseForProfile(undefined, "p2")).toBeUndefined();
  });
});

describe("computeOuiNonPollTally", () => {
  it("counts oui and non answers separately, ignoring libre-shaped values", () => {
    const responses: CloudChatPollResponsesByProfile = {
      p1: buildChatPollResponse("p1", "oui", "uid-1", 1),
      p2: buildChatPollResponse("p2", "non", "uid-2", 2),
      p3: buildChatPollResponse("p3", "oui", "uid-3", 3),
    };

    expect(computeOuiNonPollTally(responses)).toEqual({ oui: 2, non: 1 });
  });

  it("returns zero counts when there are no responses yet", () => {
    expect(computeOuiNonPollTally(undefined)).toEqual({ oui: 0, non: 0 });
    expect(computeOuiNonPollTally({})).toEqual({ oui: 0, non: 0 });
  });
});

describe("chatMessagePreviewSourceText", () => {
  it("uses the raw text for a text message", () => {
    expect(chatMessagePreviewSourceText({ kind: "text", text: "Salut !", pollQuestion: undefined })).toBe(
      "Salut !"
    );
  });

  it("uses the poll question, prefixed, for a poll message", () => {
    expect(
      chatMessagePreviewSourceText({ kind: "poll", text: "", pollQuestion: "On part tôt demain ?" })
    ).toBe("📊 On part tôt demain ?");
  });
});

describe("POLL_OUI_NON_OPTIONS / POLL_BUBBLE_LABEL", () => {
  it("exposes exactly the two fixed options, in this order", () => {
    expect(POLL_OUI_NON_OPTIONS).toEqual(["oui", "non"]);
  });

  it("uses the familial 'Organisateur' wording, never an administrative one", () => {
    expect(POLL_BUBBLE_LABEL).toBe("Sondage de l'Organisateur");
  });
});
