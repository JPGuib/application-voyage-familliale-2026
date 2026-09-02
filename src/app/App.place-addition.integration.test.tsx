import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import App from "./App";
import type { Place } from "../content/places";

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

function makeProfile(id: string, surname: string, role: AppRole) {
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

function makeSnapshot(activeRole: AppRole, ownerGlobalPlaceAdditions: Place[]) {
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
    ownerGlobalPlaceAdditions,
    placeComments: {},
    placeVisibilityMap: {},
    placeSeenMap: {},
    destinationSurvey: {},
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

function setupSessionToken(profileId: string) {
  localStorage.setItem("jp-session-token", Math.random().toString(36).substring(2) + Date.now().toString(36));
  localStorage.setItem("jp-session-token-profile-id", profileId);
  localStorage.setItem("jp-session-token-timestamp", Date.now().toString());
}

describe("App place addition integration", () => {
  beforeEach(() => {
    localStorage.clear();
    cloudSyncMock.mockReset();
  });

  it("lets the owner add an unplanned visit from the guide, synced to the cloud", async () => {
    localStorage.setItem("jp-active-profile-id", "p1");
    setupSessionToken("p1");
    // Fills a multi-field form and waits on the cloud sync effect — give it
    // more headroom than the default 5s under a loaded parallel test run.

    const pushSnapshotMock = vi.fn().mockResolvedValue(undefined);
    cloudSyncMock.mockReturnValue({
      cloudEnabled: true,
      cloudReady: true,
      cloudAuthError: null,
      cloudActorUid: "actor-owner",
      cloudSnapshot: makeSnapshot("proprietaire", []),
      pushSnapshot: pushSnapshotMock,
      claimRoleForProfile: vi.fn().mockResolvedValue(null),
      familyId: "famille-voyage-2026",
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/Jour\s+1/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Séjour" }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Guide du séjour/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Ajouter une visite/i }));

    fireEvent.change(screen.getByPlaceholderText("Nom de la visite"), {
      target: { value: "Marché improvisé" },
    });
    fireEvent.change(screen.getByPlaceholderText("Description courte"), {
      target: { value: "Petit marché local découvert sur place" },
    });
    fireEvent.change(screen.getByPlaceholderText(/Tag \(ex/i), {
      target: { value: "Découverte" },
    });
    fireEvent.change(screen.getByPlaceholderText(/Ajouter un jour/i), {
      target: { value: "1" },
    });
    const addButtons = screen.getAllByRole("button", { name: "Ajouter" });
    fireEvent.click(addButtons[0]); // adds the day chip

    fireEvent.click(screen.getAllByRole("button", { name: "Ajouter" })[1]); // submits the form

    // Visible immediately in the guide, without waiting for the cloud round-trip.
    await waitFor(() => {
      expect(screen.getByText("Marché improvisé")).toBeInTheDocument();
    });

    // And synced to the cloud so other profiles see it too.
    await waitFor(() => {
      expect(pushSnapshotMock).toHaveBeenCalled();
      const lastCall = pushSnapshotMock.mock.calls.at(-1)?.[0];
      expect(lastCall.ownerGlobalPlaceAdditions).toEqual([
        expect.objectContaining({ name: "Marché improvisé", shortDesc: "Petit marché local découvert sur place" }),
      ]);
    });
  }, 15000);

  it("shows an owner-added visit to a non-owner, without edit controls", async () => {
    localStorage.setItem("jp-active-profile-id", "p2");
    setupSessionToken("p2");

    const addedPlace: Place = {
      id: "place-added-1",
      jour: [1],
      name: "Marché improvisé",
      shortDesc: "Petit marché local découvert sur place",
      tag: "Découverte",
    };

    cloudSyncMock.mockReturnValue({
      cloudEnabled: true,
      cloudReady: true,
      cloudAuthError: null,
      cloudActorUid: "actor-user",
      cloudSnapshot: makeSnapshot("utilisateur", [addedPlace]),
      pushSnapshot: vi.fn().mockResolvedValue(undefined),
      claimRoleForProfile: vi.fn().mockResolvedValue(null),
      familyId: "famille-voyage-2026",
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/Jour\s+1/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Séjour" }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Guide du séjour/i })).toBeInTheDocument();
    });

    expect(screen.getByText("Marché improvisé")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Ajouter une visite/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Modifier" })).not.toBeInTheDocument();
  });

  it("restores an in-progress add-visit draft after a full app reload", async () => {
    localStorage.setItem("jp-active-profile-id", "p1");
    setupSessionToken("p1");

    cloudSyncMock.mockReturnValue({
      cloudEnabled: true,
      cloudReady: true,
      cloudAuthError: null,
      cloudActorUid: "actor-owner",
      cloudSnapshot: makeSnapshot("proprietaire", []),
      pushSnapshot: vi.fn().mockResolvedValue(undefined),
      claimRoleForProfile: vi.fn().mockResolvedValue(null),
      familyId: "famille-voyage-2026",
    });

    const { unmount } = render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/Jour\s+1/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Séjour" }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Guide du séjour/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Ajouter une visite/i }));

    fireEvent.change(screen.getByPlaceholderText("Nom de la visite"), {
      target: { value: "Café découvert au hasard" },
    });
    fireEvent.change(screen.getByPlaceholderText("Description courte"), {
      target: { value: "Texte copié depuis une recherche pendant que l'appli était en arrière-plan" },
    });

    // Laisse le temps à la sauvegarde locale debouncée (400ms) de s'exécuter,
    // comme si un rechargement complet (retour d'une autre appli, mise à
    // jour de version...) survenait juste après la saisie.
    await new Promise((resolve) => setTimeout(resolve, 600));

    // Simule le rechargement complet de la page : nouveau montage de <App />
    // à partir de rien, sans aucun état React conservé.
    unmount();
    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Guide du séjour/i })).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByDisplayValue("Café découvert au hasard")).toBeInTheDocument();
      expect(
        screen.getByDisplayValue("Texte copié depuis une recherche pendant que l'appli était en arrière-plan")
      ).toBeInTheDocument();
    });
  }, 15000);
});
