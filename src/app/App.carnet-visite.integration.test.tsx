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

  it("opens a lightbox to enlarge a carnet photo and lets the user close it", async () => {
    localStorage.setItem("jp-active-profile-id", "p2");
    // Le carnet est chargé à la demande (pas via cloudSnapshot) : on seed
    // directement le cache local lu au montage (jp-carnet-visite-cache), sur
    // le modèle de parseCarnetVisiteCache dans App.tsx.
    localStorage.setItem(
      "jp-carnet-visite-cache",
      JSON.stringify({
        [PLACES[0].id]: {
          "p2-1": {
            entryId: "p2-1",
            placeId: PLACES[0].id,
            authorProfileId: "p2",
            authorSurnameSnapshot: "Leo",
            text: "Une belle photo souvenir",
            photos: { "photo-0": "data:image/jpeg;base64,AAAA" },
            createdAt: 1,
            updatedAt: 1,
            authorUid: "actor-user",
          },
        },
      })
    );

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

    expect(screen.getByText("Une belle photo souvenir")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Voir la photo en plus grand" }));

    await waitFor(() => {
      expect(screen.getByAltText("Photo du carnet de visite 1")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Fermer" }));

    expect(screen.queryByAltText("Photo du carnet de visite 1")).not.toBeInTheDocument();
  });

  it("caps photos per place (across all authors' entries), not per entry", async () => {
    localStorage.setItem("jp-active-profile-id", "p2");
    // 5 photos déjà posées par un AUTRE auteur (p1) sur ce lieu : le plafond
    // est bien par lieu, toutes entrées/auteurs confondus, pas par entrée.
    localStorage.setItem(
      "jp-carnet-visite-cache",
      JSON.stringify({
        [PLACES[0].id]: {
          "p1-1": {
            entryId: "p1-1",
            placeId: PLACES[0].id,
            authorProfileId: "p1",
            authorSurnameSnapshot: "Maman",
            text: "Cinq photos déjà là",
            photos: {
              "photo-0": "data:image/jpeg;base64,AAAA",
              "photo-1": "data:image/jpeg;base64,BBBB",
              "photo-2": "data:image/jpeg;base64,CCCC",
              "photo-3": "data:image/jpeg;base64,DDDD",
              "photo-4": "data:image/jpeg;base64,EEEE",
            },
            createdAt: 1,
            updatedAt: 1,
            authorUid: "actor-owner",
          },
        },
      })
    );

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

    fireEvent.click(screen.getByRole("button", { name: /Ajouter un souvenir/i }));

    expect(
      screen.getByText(/Limite de 5 photos atteinte pour ce lieu/i)
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Ajouter une photo depuis l'appareil")).not.toBeInTheDocument();

    // Le texte seul reste possible malgré le plafond photo atteint.
    fireEvent.change(
      screen.getByPlaceholderText("Ce que vous avez appris, vu ou entendu pendant la visite..."),
      { target: { value: "Encore un souvenir, sans photo cette fois" } }
    );
    fireEvent.click(screen.getByRole("button", { name: /Ajouter au carnet/i }));

    expect(screen.getByText("Encore un souvenir, sans photo cette fois")).toBeInTheDocument();
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
