import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import App from "./App";

const cloudSyncMock = vi.fn();

vi.mock("../hooks/useCloudSync", () => ({
  useCloudSync: () => cloudSyncMock(),
}));

vi.mock("../content/trip", () => ({
  TRIP: {
    name: "Voyage Famille",
    currentDay: 1,
    totalDays: 10,
    todayDestination: "Istanbul",
    todaySubtitle: "Jour de decouverte",
  },
}));

type AppRole = "proprietaire" | "utilisateur" | "visiteur";

function makeProfile(id: string, surname: string, role: AppRole, phase: "before" | "during") {
  return {
    profileId: id,
    surname,
    role,
    createdAt: 1,
    lastSyncAt: 1,
    checklist: {},
    customChecklistItems: [],
    gameResults: [],
    gameProgress: null,
    phase,
  };
}

function makeSnapshot(activeRole: AppRole, phase: "before" | "during") {
  const activeProfileId = activeRole === "proprietaire" ? "p1" : activeRole === "utilisateur" ? "p2" : "p3";

  return {
    familyState: {
      version: 1,
      ownerProfileId: "p1",
      profiles: [
        { id: "p1", role: "proprietaire" as const },
        { id: "p2", role: "utilisateur" as const },
        { id: "p3", role: "visiteur" as const },
      ],
    },
    ownerCodeHash: "hash",
    ownerCodePlain: "",
    travelerCodeHash: "",
    travelerCodePlain: "",
    ownerRecoveryHash: "",
    ownerGlobalChecklistAdditions: [],
    ownerGlobalChecklistRemovals: {},
    placeComments: {},
    placeVisibilityMap: {},
    placeSeenMap: {},
    destinationSurvey: {},
    gameDayOverrides: {},
    phase,
    tripStartDate: null,
    launchGateCycle: phase === "during" ? 1 : 0,
    launchGateCompletedCycleByProfile: phase === "during" ? { p1: 1, p2: 1, p3: 1 } : {},
    profiles: {
      p1: makeProfile("p1", "Maman", "proprietaire", phase),
      p2: makeProfile("p2", "Leo", "utilisateur", phase),
      p3: makeProfile("p3", "Nina", "visiteur", phase),
      [activeProfileId]: makeProfile(
        activeProfileId,
        activeProfileId === "p1" ? "Maman" : activeProfileId === "p2" ? "Leo" : "Nina",
        activeRole,
        phase
      ),
    },
    updatedAt: 1,
  };
}

function setupSessionToken(profileId: string) {
  localStorage.setItem("jp-session-token", Math.random().toString(36).substring(2) + Date.now().toString(36));
  localStorage.setItem("jp-session-token-profile-id", profileId);
  localStorage.setItem("jp-session-token-timestamp", Date.now().toString());
}

// Story 28.2 : la rubrique Chat ouvre désormais la liste des conversations
// (ChatHomeScreen) avant d'afficher une conversation précise. Ce mock ne
// fournit que la conversation "Voyage" (comportement de la story 28.1).
function makeSubscribeToChatConversationsMock() {
  return vi.fn(
    (onSnapshot: (conversations: Record<string, unknown>) => void) => {
      onSnapshot({
        voyage: {
          conversationId: "voyage",
          type: "group",
          name: "Voyage",
          isDefaultVoyage: true,
          memberProfileIds: { p1: true, p2: true },
          createdAt: 1,
          createdByProfileId: "p1",
        },
      });
      return () => {};
    }
  );
}

// Story 28.4 : petit "faux Firebase" en mémoire pour chatReadState, assez
// réaliste pour vérifier que markChatConversationRead notifie bien les
// abonnés de subscribeToChatReadState (contrairement aux autres mocks de ce
// fichier qui ne simulent qu'un aller simple, sans boucle de rétroaction).
function makeChatReadStateHarness() {
  let store: Record<string, Record<string, { lastReadAt: number; authorUid: string }>> = {};
  const listeners: Array<(state: typeof store) => void> = [];

  const subscribeToChatReadState = vi.fn((onSnapshot: (state: typeof store) => void) => {
    listeners.push(onSnapshot);
    onSnapshot(store);
    return () => {
      const index = listeners.indexOf(onSnapshot);
      if (index !== -1) listeners.splice(index, 1);
    };
  });

  const markChatConversationRead = vi.fn(
    async (conversationId: string, profileId: string, lastReadAt: number) => {
      const current = store[conversationId]?.[profileId]?.lastReadAt ?? 0;
      if (lastReadAt <= current) return;
      store = {
        ...store,
        [conversationId]: {
          ...store[conversationId],
          [profileId]: { lastReadAt, authorUid: "actor-owner" },
        },
      };
      for (const listener of listeners) listener(store);
    }
  );

  return { subscribeToChatReadState, markChatConversationRead };
}

// Depuis la liste du Chat, ouvre la conversation "Voyage" (cf.
// makeSubscribeToChatConversationsMock ci-dessus).
async function openVoyageConversation() {
  fireEvent.click(screen.getByRole("button", { name: "Chat" }));

  await waitFor(() => {
    expect(screen.getByText("Voyage")).toBeInTheDocument();
  });
  fireEvent.click(screen.getByText("Voyage"));

  await waitFor(() => {
    expect(screen.getByRole("heading", { name: "Voyage" })).toBeInTheDocument();
  });
}

describe("App chat integration (story 28.1)", () => {
  beforeEach(() => {
    localStorage.clear();
    cloudSyncMock.mockReset();
  });

  it("lets the owner open the Voyage conversation, read messages and send one labelled Organisateur", async () => {
    localStorage.setItem("jp-active-profile-id", "p1");
    setupSessionToken("p1");

    const sendChatMessageMock = vi.fn().mockResolvedValue(undefined);
    const subscribeToChatMessagesMock = vi.fn(
      (_conversationId: string, _limit: number, onSnapshot: (messages: unknown) => void) => {
        onSnapshot({
          "m1": {
            messageId: "m1",
            conversationId: "voyage",
            authorProfileId: "p2",
            authorSurnameSnapshot: "Leo",
            authorUid: "actor-user",
            kind: "text",
            text: "Vivement le départ !",
            createdAt: Date.now() - 1000,
          },
          "m2": {
            messageId: "m2",
            conversationId: "voyage",
            authorProfileId: "p1",
            authorSurnameSnapshot: "Organisateur",
            authorUid: "actor-owner",
            kind: "text",
            text: "Hâte d'y être !",
            createdAt: Date.now(),
          },
        });
        return () => {};
      }
    );

    cloudSyncMock.mockReturnValue({
      cloudEnabled: true,
      cloudReady: true,
      cloudAuthError: null,
      cloudActorUid: "actor-owner",
      cloudSnapshot: makeSnapshot("proprietaire", "during"),
      pushSnapshot: vi.fn().mockResolvedValue(undefined),
      claimRoleForProfile: vi.fn().mockResolvedValue(null),
      subscribeToChatMessages: subscribeToChatMessagesMock,
      sendChatMessage: sendChatMessageMock,
      ensureVoyageConversation: vi.fn().mockResolvedValue(undefined),
      subscribeToChatConversations: makeSubscribeToChatConversationsMock(),
      familyId: "famille-voyage-2026",
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/Jour\s+1/i)).toBeInTheDocument();
    });

    await openVoyageConversation();

    expect(screen.getByText("Vivement le départ !")).toBeInTheDocument();
    expect(screen.getByText("Hâte d'y être !")).toBeInTheDocument();

    // Story 28.1 feedback (test réel de Jean-Philippe) : le surnom (ou
    // "Organisateur") doit être visible au-dessus de CHAQUE bulle, pas
    // seulement celles des autres, pour qu'on distingue toujours qui a
    // écrit quoi. On vérifie aussi l'alignement gauche/droite en même temps.
    const otherLabel = screen.getByText("Leo");
    const ownLabel = screen.getByText("Organisateur");
    expect(otherLabel.closest(".items-start")).not.toBeNull();
    expect(ownLabel.closest(".items-end")).not.toBeNull();

    const textarea = screen.getByPlaceholderText(/Écrire un message/i);
    fireEvent.change(textarea, { target: { value: "Bonne préparation à tous !" } });
    fireEvent.click(screen.getByRole("button", { name: "Envoyer" }));

    await waitFor(() => {
      expect(sendChatMessageMock).toHaveBeenCalledOnce();
    });

    const sentMessage = sendChatMessageMock.mock.calls[0][0];
    expect(sentMessage.authorSurnameSnapshot).toBe("Organisateur");
    expect(sentMessage.authorProfileId).toBe("p1");
    expect(sentMessage.text).toBe("Bonne préparation à tous !");
    expect(sentMessage.conversationId).toBe("voyage");
  });

  it("lets the owner insert an emoji from the built-in picker into the draft message", async () => {
    localStorage.setItem("jp-active-profile-id", "p1");
    setupSessionToken("p1");

    cloudSyncMock.mockReturnValue({
      cloudEnabled: true,
      cloudReady: true,
      cloudAuthError: null,
      cloudActorUid: "actor-owner",
      cloudSnapshot: makeSnapshot("proprietaire", "during"),
      pushSnapshot: vi.fn().mockResolvedValue(undefined),
      claimRoleForProfile: vi.fn().mockResolvedValue(null),
      subscribeToChatMessages: vi.fn(() => () => {}),
      sendChatMessage: vi.fn().mockResolvedValue(undefined),
      ensureVoyageConversation: vi.fn().mockResolvedValue(undefined),
      subscribeToChatConversations: makeSubscribeToChatConversationsMock(),
      familyId: "famille-voyage-2026",
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/Jour\s+1/i)).toBeInTheDocument();
    });

    await openVoyageConversation();

    const textarea = screen.getByPlaceholderText(/Écrire un message/i) as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: "On part " } });

    fireEvent.click(screen.getByRole("button", { name: "Choisir un emoji" }));
    fireEvent.click(screen.getByRole("button", { name: "Ajouter ✈️" }));

    expect(textarea.value).toBe("On part ✈️");
  });

  it("labels a non-owner's sent message with their own surname, not Organisateur", async () => {
    localStorage.setItem("jp-active-profile-id", "p2");
    setupSessionToken("p2");

    const sendChatMessageMock = vi.fn().mockResolvedValue(undefined);

    cloudSyncMock.mockReturnValue({
      cloudEnabled: true,
      cloudReady: true,
      cloudAuthError: null,
      cloudActorUid: "actor-user",
      cloudSnapshot: makeSnapshot("utilisateur", "during"),
      pushSnapshot: vi.fn().mockResolvedValue(undefined),
      claimRoleForProfile: vi.fn().mockResolvedValue(null),
      subscribeToChatMessages: vi.fn(() => () => {}),
      sendChatMessage: sendChatMessageMock,
      ensureVoyageConversation: vi.fn().mockResolvedValue(undefined),
      subscribeToChatConversations: makeSubscribeToChatConversationsMock(),
      familyId: "famille-voyage-2026",
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/Jour\s+1/i)).toBeInTheDocument();
    });

    await openVoyageConversation();

    const textarea = screen.getByPlaceholderText(/Écrire un message/i);
    fireEvent.change(textarea, { target: { value: "Salut !" } });
    fireEvent.click(screen.getByRole("button", { name: "Envoyer" }));

    await waitFor(() => {
      expect(sendChatMessageMock).toHaveBeenCalledOnce();
    });

    expect(sendChatMessageMock.mock.calls[0][0].authorSurnameSnapshot).toBe("Leo");
  });

  it("does not show the Chat nav button to a visiteur", async () => {
    localStorage.setItem("jp-active-profile-id", "p3");
    setupSessionToken("p3");

    cloudSyncMock.mockReturnValue({
      cloudEnabled: true,
      cloudReady: true,
      cloudAuthError: null,
      cloudActorUid: "actor-visitor",
      cloudSnapshot: makeSnapshot("visiteur", "during"),
      pushSnapshot: vi.fn().mockResolvedValue(undefined),
      claimRoleForProfile: vi.fn().mockResolvedValue(null),
      familyId: "famille-voyage-2026",
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/Jour\s+1/i)).toBeInTheDocument();
    });

    expect(screen.queryByRole("button", { name: "Chat" })).not.toBeInTheDocument();
  });

  it("does not show the Chat nav button to a non-owner before the trip is unlocked", async () => {
    localStorage.setItem("jp-active-profile-id", "p2");
    setupSessionToken("p2");

    cloudSyncMock.mockReturnValue({
      cloudEnabled: true,
      cloudReady: true,
      cloudAuthError: null,
      cloudActorUid: "actor-user",
      cloudSnapshot: makeSnapshot("utilisateur", "before"),
      pushSnapshot: vi.fn().mockResolvedValue(undefined),
      claimRoleForProfile: vi.fn().mockResolvedValue(null),
      familyId: "famille-voyage-2026",
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Préparation des bagages/i })).toBeInTheDocument();
    });

    expect(screen.queryByRole("button", { name: "Chat" })).not.toBeInTheDocument();
  });
});

describe("App chat unread badge (story 28.4)", () => {
  beforeEach(() => {
    localStorage.clear();
    cloudSyncMock.mockReset();
  });

  it("shows a badge on the Chat nav icon for an unread message, and clears it once the conversation is opened", async () => {
    localStorage.setItem("jp-active-profile-id", "p1");
    setupSessionToken("p1");

    const readStateHarness = makeChatReadStateHarness();
    // Timestamp figé et partagé par tous les abonnés (badge de nav ET
    // ChatHomeScreen) : sans ça, deux appels indépendants à Date.now() dans
    // le mock pourraient produire des millisecondes différentes et rendre le
    // test intermittent (cf. shouldAdvanceChatReadState, comparaison stricte).
    const messageCreatedAt = Date.now();
    const subscribeToChatMessagesMock = vi.fn(
      (_conversationId: string, _limit: number, onSnapshot: (messages: unknown) => void) => {
        onSnapshot({
          m1: {
            messageId: "m1",
            conversationId: "voyage",
            authorProfileId: "p2",
            authorSurnameSnapshot: "Leo",
            authorUid: "actor-user",
            kind: "text",
            text: "Coucou !",
            createdAt: messageCreatedAt,
          },
        });
        return () => {};
      }
    );

    cloudSyncMock.mockReturnValue({
      cloudEnabled: true,
      cloudReady: true,
      cloudAuthError: null,
      cloudActorUid: "actor-owner",
      cloudSnapshot: makeSnapshot("proprietaire", "during"),
      pushSnapshot: vi.fn().mockResolvedValue(undefined),
      claimRoleForProfile: vi.fn().mockResolvedValue(null),
      subscribeToChatMessages: subscribeToChatMessagesMock,
      sendChatMessage: vi.fn().mockResolvedValue(undefined),
      ensureVoyageConversation: vi.fn().mockResolvedValue(undefined),
      subscribeToChatConversations: makeSubscribeToChatConversationsMock(),
      subscribeToChatReadState: readStateHarness.subscribeToChatReadState,
      markChatConversationRead: readStateHarness.markChatConversationRead,
      familyId: "famille-voyage-2026",
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/Jour\s+1/i)).toBeInTheDocument();
    });

    await waitFor(() => {
      const chatNavButton = screen.getByRole("button", { name: "Chat" });
      expect(chatNavButton.querySelector('[aria-hidden="true"]')).not.toBeNull();
    });

    await openVoyageConversation();

    await waitFor(() => {
      expect(readStateHarness.markChatConversationRead).toHaveBeenCalledWith("voyage", "p1", messageCreatedAt);
    });

    await waitFor(() => {
      const chatNavButton = screen.getByRole("button", { name: "Chat" });
      expect(chatNavButton.querySelector('[aria-hidden="true"]')).toBeNull();
    });
  });
});
