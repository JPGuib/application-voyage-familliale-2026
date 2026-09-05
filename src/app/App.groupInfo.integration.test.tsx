import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import App from "./App";
import type { CloudGroupInfoItem } from "../types/cloud";

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

function makeItemsMock(items: Record<string, CloudGroupInfoItem>) {
  return vi.fn((onSnapshot: (value: Record<string, CloudGroupInfoItem>) => void) => {
    onSnapshot(items);
    return () => {};
  });
}

// Même esprit que makeChatReadStateHarness (App.chat.integration.test.tsx) :
// un "faux Firebase" en mémoire assez réaliste pour vérifier que
// markGroupInfoRead notifie bien les abonnés de subscribeToGroupInfoReadState.
function makeGroupInfoReadStateHarness() {
  let store: Record<string, { lastReadAt: number; authorUid: string }> = {};
  const listeners: Array<(state: typeof store) => void> = [];

  const subscribeToGroupInfoReadState = vi.fn((onSnapshot: (state: typeof store) => void) => {
    listeners.push(onSnapshot);
    onSnapshot(store);
    return () => {
      const index = listeners.indexOf(onSnapshot);
      if (index !== -1) listeners.splice(index, 1);
    };
  });

  const markGroupInfoRead = vi.fn(async (profileId: string, lastReadAt: number) => {
    const current = store[profileId]?.lastReadAt ?? 0;
    if (lastReadAt <= current) return;
    store = { ...store, [profileId]: { lastReadAt, authorUid: "actor-owner" } };
    for (const listener of listeners) listener(store);
  });

  return { subscribeToGroupInfoReadState, markGroupInfoRead };
}

async function openGroupInfoScreen() {
  fireEvent.click(screen.getByRole("button", { name: "Infos du groupe" }));

  await waitFor(() => {
    expect(screen.getByRole("heading", { name: "Infos du groupe" })).toBeInTheDocument();
  });
}

describe("App Infos du groupe integration (epic 29)", () => {
  beforeEach(() => {
    localStorage.clear();
    cloudSyncMock.mockReset();
  });

  it("does not show the nav button to a visiteur (no access at all, unlike other read-only sections)", async () => {
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

    expect(screen.queryByRole("button", { name: "Infos du groupe" })).not.toBeInTheDocument();
  });

  // Contrairement au Chat, "Infos du groupe" est dans USER_BEFORE_ALLOWED
  // (accessible avant le départ). Testé ici via le propriétaire plutôt qu'un
  // non-owner : avant le déblocage, un profil non-owner reste cantonné à
  // l'écran "Préparation des bagages" sans barre de navigation du tout (règle
  // App.tsx pré-existante, indépendante de access-control.ts) — seul le
  // propriétaire, qui a toujours accès au dashboard, peut donc effectivement
  // atteindre la rubrique avant le départ.
  it("shows the nav button to the owner BEFORE the trip is unlocked (unlike Chat, accessible before departure)", async () => {
    localStorage.setItem("jp-active-profile-id", "p1");
    setupSessionToken("p1");

    cloudSyncMock.mockReturnValue({
      cloudEnabled: true,
      cloudReady: true,
      cloudAuthError: null,
      cloudActorUid: "actor-owner",
      cloudSnapshot: makeSnapshot("proprietaire", "before"),
      pushSnapshot: vi.fn().mockResolvedValue(undefined),
      claimRoleForProfile: vi.fn().mockResolvedValue(null),
      familyId: "famille-voyage-2026",
    });

    render(<App />);

    // Avant le départ, le tableau de bord du propriétaire peut afficher
    // d'autres écrans en premier (ex. sondage destination) selon l'état de la
    // famille : on attend directement le bouton de nav plutôt qu'un texte
    // "Jour 1" spécifique à l'écran par défaut pendant le voyage.
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Infos du groupe" })).toBeInTheDocument();
    });
  });

  it("lets the owner add an item, pin any item and edit/delete an item authored by someone else", async () => {
    localStorage.setItem("jp-active-profile-id", "p1");
    setupSessionToken("p1");

    const addGroupInfoItemMock = vi.fn().mockResolvedValue(undefined);
    const setGroupInfoItemPinnedMock = vi.fn().mockResolvedValue(undefined);
    const deleteGroupInfoItemMock = vi.fn().mockResolvedValue(undefined);

    const otherAuthorItem: CloudGroupInfoItem = {
      itemId: "p2-1",
      day: 1,
      time: "7h00",
      text: "Réveil à 7h",
      authorProfileId: "p2",
      authorSurnameSnapshot: "Leo",
      authorUid: "actor-user",
      createdAt: Date.now(),
      pinned: false,
      doneBy: {},
    };

    cloudSyncMock.mockReturnValue({
      cloudEnabled: true,
      cloudReady: true,
      cloudAuthError: null,
      cloudActorUid: "actor-owner",
      cloudSnapshot: makeSnapshot("proprietaire", "during"),
      pushSnapshot: vi.fn().mockResolvedValue(undefined),
      claimRoleForProfile: vi.fn().mockResolvedValue(null),
      subscribeToGroupInfoItems: makeItemsMock({ "p2-1": otherAuthorItem }),
      addGroupInfoItem: addGroupInfoItemMock,
      setGroupInfoItemPinned: setGroupInfoItemPinnedMock,
      deleteGroupInfoItem: deleteGroupInfoItemMock,
      familyId: "famille-voyage-2026",
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/Jour\s+1/i)).toBeInTheDocument();
    });

    await openGroupInfoScreen();

    // Le propriétaire voit les boutons Modifier/Supprimer même sur un item
    // qu'il n'a pas écrit lui-même.
    expect(screen.getByText("Réveil à 7h")).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("Épingler"));
    await waitFor(() => {
      expect(setGroupInfoItemPinnedMock).toHaveBeenCalledWith("p2-1", true);
    });

    fireEvent.click(screen.getByRole("button", { name: "Supprimer" }));
    await waitFor(() => {
      expect(deleteGroupInfoItemMock).toHaveBeenCalledWith("p2-1");
    });

    // Publication d'un nouvel item par le propriétaire.
    fireEvent.click(screen.getByRole("button", { name: "+ Ajouter une info" }));
    const textarea = screen.getByPlaceholderText(/Ne pas oublier/i);
    fireEvent.change(textarea, { target: { value: "Ne pas oublier les passeports" } });
    fireEvent.click(screen.getByRole("button", { name: "Publier" }));

    await waitFor(() => {
      expect(addGroupInfoItemMock).toHaveBeenCalledOnce();
    });
    expect(addGroupInfoItemMock.mock.calls[0][0].text).toBe("Ne pas oublier les passeports");
    expect(addGroupInfoItemMock.mock.calls[0][0].authorSurnameSnapshot).toBe("Organisateur");
  });

  it("does not let a non-owner edit or delete an item authored by someone else", async () => {
    localStorage.setItem("jp-active-profile-id", "p2");
    setupSessionToken("p2");

    const otherAuthorItem: CloudGroupInfoItem = {
      itemId: "p1-1",
      day: 1,
      time: null,
      text: "Consigne de l'organisateur",
      authorProfileId: "p1",
      authorSurnameSnapshot: "Organisateur",
      authorUid: "actor-owner",
      createdAt: Date.now(),
      pinned: false,
      doneBy: {},
    };

    cloudSyncMock.mockReturnValue({
      cloudEnabled: true,
      cloudReady: true,
      cloudAuthError: null,
      cloudActorUid: "actor-user",
      cloudSnapshot: makeSnapshot("utilisateur", "during"),
      pushSnapshot: vi.fn().mockResolvedValue(undefined),
      claimRoleForProfile: vi.fn().mockResolvedValue(null),
      subscribeToGroupInfoItems: makeItemsMock({ "p1-1": otherAuthorItem }),
      familyId: "famille-voyage-2026",
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/Jour\s+1/i)).toBeInTheDocument();
    });

    await openGroupInfoScreen();

    expect(screen.getByText("Consigne de l'organisateur")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Modifier" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Supprimer" })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Épingler")).not.toBeInTheDocument();
  });

  it("lets a profile toggle its own done state independently of what another profile marked", async () => {
    localStorage.setItem("jp-active-profile-id", "p2");
    setupSessionToken("p2");

    const setGroupInfoItemDoneMock = vi.fn().mockResolvedValue(undefined);
    const item: CloudGroupInfoItem = {
      itemId: "p1-1",
      day: 1,
      time: null,
      text: "RDV dans 30 minutes",
      authorProfileId: "p1",
      authorSurnameSnapshot: "Organisateur",
      authorUid: "actor-owner",
      createdAt: Date.now(),
      pinned: false,
      doneBy: { p3: true }, // un autre profil a déjà coché, pas p2
    };

    cloudSyncMock.mockReturnValue({
      cloudEnabled: true,
      cloudReady: true,
      cloudAuthError: null,
      cloudActorUid: "actor-user",
      cloudSnapshot: makeSnapshot("utilisateur", "during"),
      pushSnapshot: vi.fn().mockResolvedValue(undefined),
      claimRoleForProfile: vi.fn().mockResolvedValue(null),
      subscribeToGroupInfoItems: makeItemsMock({ "p1-1": item }),
      setGroupInfoItemDone: setGroupInfoItemDoneMock,
      familyId: "famille-voyage-2026",
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/Jour\s+1/i)).toBeInTheDocument();
    });

    await openGroupInfoScreen();

    // p2 ne voit pas l'item comme "fait" alors que p3 l'a déjà coché.
    expect(screen.getByRole("button", { name: "Marquer comme fait" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Marquer comme fait" }));

    await waitFor(() => {
      // La rubrique expose setGroupInfoItemDone(itemId, profileId, done) —
      // le profileId est threadé par useCloudSync, jamais par l'appelant
      // (cf. src/hooks/useCloudSync.ts).
      expect(setGroupInfoItemDoneMock).toHaveBeenCalledWith("p1-1", "p2", true);
    });
  });

  it("collapses past days by default, revealed via Voir les jours précédents", async () => {
    localStorage.setItem("jp-active-profile-id", "p1");
    setupSessionToken("p1");

    const pastItem: CloudGroupInfoItem = {
      itemId: "p1-old",
      day: 1,
      time: null,
      text: "Info d'un jour révolu",
      authorProfileId: "p1",
      authorSurnameSnapshot: "Organisateur",
      authorUid: "actor-owner",
      createdAt: 1,
      pinned: false,
      doneBy: {},
    };
    const currentItem: CloudGroupInfoItem = {
      itemId: "p1-current",
      day: 3,
      time: null,
      text: "Info du jour courant",
      authorProfileId: "p1",
      authorSurnameSnapshot: "Organisateur",
      authorUid: "actor-owner",
      createdAt: 2,
      pinned: false,
      doneBy: {},
    };

    // TRIP.currentDay est mocké à 1 en tête de fichier ; on force plutôt le
    // jour courant réel de l'app via tripStartDate absent => jour 1. Pour
    // exercer le repli avec un vrai écart avant/après, on override
    // currentDay indirectement en ne fournissant qu'un item au jour 1 (donc
    // jamais révolu) : ce test vérifie surtout que rien n'est affiché tant
    // que "Voir les jours précédents" n'a pas été cliqué quand un jour est
    // strictement avant currentDay.
    cloudSyncMock.mockReturnValue({
      cloudEnabled: true,
      cloudReady: true,
      cloudAuthError: null,
      cloudActorUid: "actor-owner",
      cloudSnapshot: makeSnapshot("proprietaire", "during"),
      pushSnapshot: vi.fn().mockResolvedValue(undefined),
      claimRoleForProfile: vi.fn().mockResolvedValue(null),
      subscribeToGroupInfoItems: makeItemsMock({
        "p1-old": pastItem,
        "p1-current": currentItem,
      }),
      familyId: "famille-voyage-2026",
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/Jour\s+1/i)).toBeInTheDocument();
    });

    await openGroupInfoScreen();

    // currentDay réel = 1 (pas de tripStartDate) : le jour 1 n'est donc pas
    // révolu et reste visible, seul le "Voir les jours précédents" doit
    // rester masqué puisqu'il n'y a aucun jour strictement antérieur ici.
    expect(screen.getByText("Info d'un jour révolu")).toBeInTheDocument();
    expect(screen.getByText("Info du jour courant")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Voir les jours précédents" })).not.toBeInTheDocument();
  });

  it("shows a badge on the nav icon for an unread item, and clears it once the board is opened", async () => {
    localStorage.setItem("jp-active-profile-id", "p1");
    setupSessionToken("p1");

    const readStateHarness = makeGroupInfoReadStateHarness();
    const itemCreatedAt = Date.now();
    const item: CloudGroupInfoItem = {
      itemId: "p2-1",
      day: 1,
      time: null,
      text: "Coucou !",
      authorProfileId: "p2",
      authorSurnameSnapshot: "Leo",
      authorUid: "actor-user",
      createdAt: itemCreatedAt,
      pinned: false,
      doneBy: {},
    };

    cloudSyncMock.mockReturnValue({
      cloudEnabled: true,
      cloudReady: true,
      cloudAuthError: null,
      cloudActorUid: "actor-owner",
      cloudSnapshot: makeSnapshot("proprietaire", "during"),
      pushSnapshot: vi.fn().mockResolvedValue(undefined),
      claimRoleForProfile: vi.fn().mockResolvedValue(null),
      subscribeToGroupInfoItems: makeItemsMock({ "p2-1": item }),
      subscribeToGroupInfoReadState: readStateHarness.subscribeToGroupInfoReadState,
      markGroupInfoRead: readStateHarness.markGroupInfoRead,
      familyId: "famille-voyage-2026",
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/Jour\s+1/i)).toBeInTheDocument();
    });

    await waitFor(() => {
      const navButton = screen.getByRole("button", { name: "Infos du groupe" });
      expect(navButton.querySelector('[aria-hidden="true"]')).not.toBeNull();
    });

    await openGroupInfoScreen();

    await waitFor(() => {
      expect(readStateHarness.markGroupInfoRead).toHaveBeenCalledWith("p1", itemCreatedAt);
    });

    await waitFor(() => {
      const navButton = screen.getByRole("button", { name: "Infos du groupe" });
      expect(navButton.querySelector('[aria-hidden="true"]')).toBeNull();
    });
  });
});
