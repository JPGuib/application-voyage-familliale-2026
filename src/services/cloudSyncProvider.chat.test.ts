import { describe, expect, it, vi, beforeEach } from "vitest";

const mockGet = vi.fn();
const mockSet = vi.fn().mockResolvedValue(undefined);
const mockUpdate = vi.fn().mockResolvedValue(undefined);
const mockOnValue = vi.fn();
const mockRef = vi.fn((_db: unknown, path?: string) => ({ path }));
const mockQuery = vi.fn((baseRef: unknown, ...constraints: unknown[]) => ({ baseRef, constraints }));
const mockLimitToLast = vi.fn((limit: number) => ({ limitToLast: limit }));

vi.mock("firebase/database", async (importOriginal) => {
  const actual = await importOriginal<typeof import("firebase/database")>();
  return {
    ...actual,
    ref: (db: unknown, path?: string) => mockRef(db, path),
    get: (target: unknown) => mockGet(target),
    set: (target: unknown, value: unknown) => mockSet(target, value),
    update: (target: unknown, updates: unknown) => mockUpdate(target, updates),
    onValue: (target: unknown, onNext: (snapshot: unknown) => void, onError?: unknown) =>
      mockOnValue(target, onNext, onError),
    query: (baseRef: unknown, ...constraints: unknown[]) => mockQuery(baseRef, ...constraints),
    limitToLast: (limit: number) => mockLimitToLast(limit),
  };
});

import {
  ensureVoyageConversationMembers,
  observeChatMessages,
  sendChatMessage,
} from "./cloudSyncProvider";
import { VOYAGE_CONVERSATION_NAME, VOYAGE_CONVERSATION_ID } from "../app/chat";
import type { CloudChatMessage } from "../types/cloud";

const db = {} as import("firebase/database").Database;
const familyId = "famille-test";

beforeEach(() => {
  mockGet.mockReset();
  mockSet.mockClear();
  mockUpdate.mockClear();
  mockOnValue.mockClear();
  mockQuery.mockClear();
  mockLimitToLast.mockClear();
});

describe("ensureVoyageConversationMembers (story 28.1)", () => {
  it("creates the Voyage conversation with every eligible profile when it does not exist yet", async () => {
    mockGet.mockResolvedValueOnce({ exists: () => false, val: () => null });

    await ensureVoyageConversationMembers(
      db,
      familyId,
      [
        { profileId: "p1", role: "proprietaire" },
        { profileId: "p2", role: "utilisateur" },
        { profileId: "p3", role: "visiteur" },
      ],
      "p1"
    );

    expect(mockSet).toHaveBeenCalledOnce();
    const [, seed] = mockSet.mock.calls[0];
    expect(seed.conversationId).toBe(VOYAGE_CONVERSATION_ID);
    expect(seed.name).toBe(VOYAGE_CONVERSATION_NAME);
    expect(seed.isDefaultVoyage).toBe(true);
    expect(seed.memberProfileIds).toEqual({ p1: true, p2: true });
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("only adds the missing eligible profiles when the conversation already exists", async () => {
    mockGet.mockResolvedValueOnce({
      exists: () => true,
      val: () => ({
        conversationId: VOYAGE_CONVERSATION_ID,
        type: "group",
        name: VOYAGE_CONVERSATION_NAME,
        isDefaultVoyage: true,
        memberProfileIds: { p1: true },
        createdAt: 1,
        createdByProfileId: "p1",
      }),
    });

    await ensureVoyageConversationMembers(
      db,
      familyId,
      [
        { profileId: "p1", role: "proprietaire" },
        { profileId: "p2", role: "utilisateur" },
      ],
      "p1"
    );

    expect(mockSet).not.toHaveBeenCalled();
    expect(mockUpdate).toHaveBeenCalledOnce();
    const [, updates] = mockUpdate.mock.calls[0];
    expect(updates).toEqual({
      [`chatConversations/${familyId}/${VOYAGE_CONVERSATION_ID}/memberProfileIds/p2`]: true,
    });
  });

  it("does not write anything once every eligible profile is already a member", async () => {
    mockGet.mockResolvedValueOnce({
      exists: () => true,
      val: () => ({
        conversationId: VOYAGE_CONVERSATION_ID,
        type: "group",
        name: VOYAGE_CONVERSATION_NAME,
        isDefaultVoyage: true,
        memberProfileIds: { p1: true, p2: true },
        createdAt: 1,
        createdByProfileId: "p1",
      }),
    });

    await ensureVoyageConversationMembers(
      db,
      familyId,
      [
        { profileId: "p1", role: "proprietaire" },
        { profileId: "p2", role: "utilisateur" },
      ],
      "p1"
    );

    expect(mockSet).not.toHaveBeenCalled();
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});

describe("sendChatMessage (story 28.1)", () => {
  it("writes the message under chatMessages/{familyId}/{conversationId}/{messageId}", async () => {
    const message: CloudChatMessage = {
      messageId: "p1-1000",
      conversationId: VOYAGE_CONVERSATION_ID,
      authorProfileId: "p1",
      authorSurnameSnapshot: "Organisateur",
      authorUid: "uid-1",
      kind: "text",
      text: "Salut la famille",
      createdAt: 1000,
    };

    await sendChatMessage(db, familyId, message);

    expect(mockSet).toHaveBeenCalledOnce();
    const [target, value] = mockSet.mock.calls[0];
    expect(target).toEqual({ path: `chatMessages/${familyId}/${VOYAGE_CONVERSATION_ID}/p1-1000` });
    expect(value).toEqual(message);
  });
});

describe("observeChatMessages (story 28.1)", () => {
  it("queries with limitToLast and forwards parsed messages to onSnapshot", () => {
    const onSnapshot = vi.fn();

    observeChatMessages(db, familyId, VOYAGE_CONVERSATION_ID, 50, onSnapshot);

    expect(mockRef).toHaveBeenCalledWith(db, `chatMessages/${familyId}/${VOYAGE_CONVERSATION_ID}`);
    expect(mockLimitToLast).toHaveBeenCalledWith(50);
    expect(mockOnValue).toHaveBeenCalledOnce();

    const [, onValueCallback] = mockOnValue.mock.calls[0];
    onValueCallback({
      val: () => ({
        "m-1": {
          authorProfileId: "p1",
          authorSurnameSnapshot: "Organisateur",
          authorUid: "uid-1",
          kind: "text",
          text: "Salut",
          createdAt: 10,
        },
      }),
    });

    expect(onSnapshot).toHaveBeenCalledWith({
      "m-1": {
        messageId: "m-1",
        conversationId: VOYAGE_CONVERSATION_ID,
        authorProfileId: "p1",
        authorSurnameSnapshot: "Organisateur",
        authorUid: "uid-1",
        kind: "text",
        text: "Salut",
        createdAt: 10,
      },
    });
  });
});
