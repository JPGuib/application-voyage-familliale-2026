import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import App from "./App";
import { PLACES } from "../content/places";

const cloudSyncMock = vi.fn();

vi.mock("../hooks/useCloudSync", () => ({
  useCloudSync: () => cloudSyncMock(),
}));

vi.mock("../content/trip", () => ({
  TRIP: {
    currentDay: 1,
    todayDestination: "Istanbul",
  },
}));

function makeProfile(id: string, surname: string, role: "proprietaire" | "utilisateur" | "visiteur") {
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
    phase: "during" as const,
  };
}

function makeSnapshot(activeRole: "utilisateur" | "visiteur" | "proprietaire") {
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
    gameDayOverrides: {},
    phase: "during" as const,
    tripStartDate: null,
    launchGateCycle: 1,
    launchGateCompletedCycleByProfile: {
      p1: 1,
      p2: 1,
      p3: 1,
    },
    profiles: {
      p1: makeProfile("p1", "Maman", "proprietaire"),
      p2: makeProfile("p2", "Leo", "utilisateur"),
      p3: makeProfile("p3", "Nina", "visiteur"),
      [activeProfileId]: makeProfile(
        activeProfileId,
        activeProfileId === "p1" ? "Maman" : activeProfileId === "p2" ? "Leo" : "Nina",
        activeRole
      ),
    },
    updatedAt: 1,
  };
}

// Ces tests n'exercent volontairement pas subscribeToPlaceVisitLog (absent du
// mock, comme dans App.place-comments.integration.test.tsx) : le carnet est
// chargé à la demande, hors du flux mocké ici. Le fallback no-op défini dans
// App.tsx (subscribeToPlaceVisitLog = () => () => {}) doit donc tenir sans
// planter — c'est justement ce que ce fichier vérifie en filigrane pour
// chaque test qui ouvre une fiche lieu.
async function openFirstPlace() {
  render(<App />);

  await waitFor(() => {
    expect(screen.getByText(/Jour\s+1/i)).toBeInTheDocument();
  });

  fireEvent.click(screen.getByRole("button", { name: "Séjour" }));
  await waitFor(() => {
    expect(screen.getByRole("heading", { name: /Guide du séjour/i })).toBeInTheDocument();
  });

  // getAllByRole car le propriétaire voit aussi des boutons d'action par
  // lieu (visibilité/jour/vu) dont l'aria-label contient le nom du lieu ; le
  // bouton principal qui ouvre la fiche est toujours rendu en premier.
  fireEvent.click(screen.getAllByRole("button", { name: new RegExp(PLACES[0].name, "i") })[0]);

  await waitFor(() => {
    expect(screen.getByText("Carnet de visite")).toBeInTheDocument();
  });
}

describe("App carnet de visite integration", () => {
  beforeEach(() => {
    localStorage.clear();
    cloudSyncMock.mockReset();
  });

  it("lets a traveler (voyageur) add a text-only entry to the carnet", async () => {
    localStorage.setItem("jp-active-profile-id", "p2");

    cloudSyncMock.mockReturnValue({
      cloudEnabled: true,
      cloudReady: true,
      cloudAuthError: null,
      cloudActorUid: "actor-user",
      cloudSnapshot: makeSnapshot("utilisateur"),
      pushSnapshot: vi.fn().mockResolvedValue(undefined),
      claimRoleForProfile: vi.fn().mockResolvedValue(null),
      familyId: "famille-voyage-2026",
    });

    await openFirstPlace();

    expect(screen.getByText(/Personne n'a encore ajouté de souvenir ici/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Ajouter un souvenir/i }));
    fireEvent.change(
      screen.getByPlaceholderText("Ce que vous avez appris, vu ou entendu pendant la visite..."),
      { target: { value: "Le guide nous a raconté une anecdote incroyable" } }
    );
    fireEvent.click(screen.getByRole("button", { name: /Ajouter au carnet/i }));

    expect(screen.getByText("Le guide nous a raconté une anecdote incroyable")).toBeInTheDocument();
    expect(screen.getByText("Leo")).toBeInTheDocument();
  });

  it("does not show the add-entry form to a visiteur (read-only)", async () => {
    localStorage.setItem("jp-active-profile-id", "p3");

    cloudSyncMock.mockReturnValue({
      cloudEnabled: true,
      cloudReady: true,
      cloudAuthError: null,
      cloudActorUid: "actor-visitor",
      cloudSnapshot: makeSnapshot("visiteur"),
      pushSnapshot: vi.fn().mockResolvedValue(undefined),
      claimRoleForProfile: vi.fn().mockResolvedValue(null),
      familyId: "famille-voyage-2026",
    });

    await openFirstPlace();

    expect(screen.queryByRole("button", { name: /Ajouter un souvenir/i })).not.toBeInTheDocument();
  });

  it("lets the owner add an entry and does not show edit/delete for other authors' entries", async () => {
    localStorage.setItem("jp-active-profile-id", "p1");

    cloudSyncMock.mockReturnValue({
      cloudEnabled: true,
      cloudReady: true,
      cloudAuthError: null,
      cloudActorUid: "actor-owner",
      cloudSnapshot: makeSnapshot("proprietaire"),
      pushSnapshot: vi.fn().mockResolvedValue(undefined),
      claimRoleForProfile: vi.fn().mockResolvedValue(null),
      familyId: "famille-voyage-2026",
    });

    await openFirstPlace();

    fireEvent.click(screen.getByRole("button", { name: /Ajouter un souvenir/i }));
    fireEvent.change(
      screen.getByPlaceholderText("Ce que vous avez appris, vu ou entendu pendant la visite..."),
      { target: { value: "Notre entrée du carnet" } }
    );
    fireEvent.click(screen.getByRole("button", { name: /Ajouter au carnet/i }));

    await waitFor(() => {
      expect(screen.getByText("Notre entrée du carnet")).toBeInTheDocument();
    });

    // L'auteur (le propriétaire ici) voit ses propres actions d'édition.
    expect(screen.getByRole("button", { name: /Modifier cette entrée du carnet/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Supprimer cette entrée du carnet/i })).toBeInTheDocument();
  });
});
