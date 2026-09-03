import { describe, expect, it } from "vitest";
import {
  CHAT_MESSAGE_MAX_LENGTH,
  ORGANISATEUR_LABEL,
  VOYAGE_CONVERSATION_ID,
  VOYAGE_CONVERSATION_NAME,
  buildVoyageConversationSeed,
  computeMissingVoyageMembers,
  formatChatMessageTimestamp,
  groupConsecutiveChatMessages,
  isChatEligibleRole,
  resolveChatAuthorSnapshotLabel,
  sanitizeChatMessageText,
  sortChatMessagesAscending,
} from "./chat";
import type { CloudChatMessage } from "../types/cloud";

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
