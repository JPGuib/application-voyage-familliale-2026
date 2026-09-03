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

function makeSnapshot(activeRole: AppRole) {
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
    documentVisibilityMap: {},
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

// Comme App.carnet-visite.integration.test.tsx : subscribeToDocumentPhotos
// est volontairement absent du mock (chargé à la demande, hors du flux mocké
// ici). Le fallback no-op défini dans App.tsx doit tenir, et l'affichage
// s'appuie sur le cache local pré-rempli (jp-document-photos-cache).
async function openNantesPaScanScreen() {
  render(<App />);

  await waitFor(() => {
    expect(screen.getByText(/Jour\s+1/i)).toBeInTheDocument();
  });

  fireEvent.click(screen.getByRole("button", { name: /Documents et informations importants/i }));

  await waitFor(() => {
    expect(screen.getByRole("heading", { name: /Documents et informations importants/i })).toBeInTheDocument();
  });

  fireEvent.click(screen.getByRole("button", { name: /Ouvrir les docs de Nantes → Paris/i }));

  await waitFor(() => {
    expect(screen.getByRole("heading", { name: /Docs · Nantes → Paris/i })).toBeInTheDocument();
  });
}

describe("App document photos integration", () => {
  beforeEach(() => {
    localStorage.clear();
    cloudSyncMock.mockReset();
  });

  it("lets the owner add photos to an existing document, capped at 5", async () => {
    localStorage.setItem("jp-active-profile-id", "p1");
    // 3 photos déjà ajoutées sur ce document : encore 2 places disponibles.
    localStorage.setItem(
      "jp-document-photos-cache",
      JSON.stringify({
        "vol-nantes-paris-af7507": {
          "photo-0": "data:image/jpeg;base64,AAAA",
          "photo-1": "data:image/jpeg;base64,BBBB",
          "photo-2": "data:image/jpeg;base64,CCCC",
        },
      })
    );

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

    await openNantesPaScanScreen();

    expect(screen.getByLabelText("Ajouter une photo depuis l'appareil")).toBeInTheDocument();
    expect(screen.getByText(/Ajouter une photo \(3\/5\)/i)).toBeInTheDocument();
    // Suppression possible sur une photo ajoutée par le propriétaire.
    expect(screen.getAllByRole("button", { name: "Supprimer cette photo" })).toHaveLength(3);
  });

  it("blocks adding a 6th photo once the per-document cap is reached", async () => {
    localStorage.setItem("jp-active-profile-id", "p1");
    localStorage.setItem(
      "jp-document-photos-cache",
      JSON.stringify({
        "vol-nantes-paris-af7507": {
          "photo-0": "data:image/jpeg;base64,AAAA",
          "photo-1": "data:image/jpeg;base64,BBBB",
          "photo-2": "data:image/jpeg;base64,CCCC",
          "photo-3": "data:image/jpeg;base64,DDDD",
          "photo-4": "data:image/jpeg;base64,EEEE",
        },
      })
    );

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

    await openNantesPaScanScreen();

    expect(
      screen.getByText(/Limite de 5 photos ajoutées atteinte pour ce document/i)
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Ajouter une photo depuis l'appareil")).not.toBeInTheDocument();
  });

  it("does not let a non-owner add or remove document photos, but shows them", async () => {
    localStorage.setItem("jp-active-profile-id", "p2");
    localStorage.setItem(
      "jp-document-photos-cache",
      JSON.stringify({
        "vol-nantes-paris-af7507": {
          "photo-0": "data:image/jpeg;base64,AAAA",
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

    await openNantesPaScanScreen();

    expect(screen.queryByLabelText("Ajouter une photo depuis l'appareil")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Supprimer cette photo" })).not.toBeInTheDocument();
  });

  it("lets the owner remove a previously added document photo", async () => {
    localStorage.setItem("jp-active-profile-id", "p1");
    localStorage.setItem(
      "jp-document-photos-cache",
      JSON.stringify({
        "vol-nantes-paris-af7507": {
          "photo-0": "data:image/jpeg;base64,AAAA",
        },
      })
    );

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

    await openNantesPaScanScreen();

    expect(screen.getByText(/Ajouter une photo \(1\/5\)/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Supprimer cette photo" }));

    await waitFor(() => {
      expect(screen.getByText(/Ajouter une photo \(0\/5\)/i)).toBeInTheDocument();
    });
  });

  it("lets the owner open a document with no scan at all to add the first photo", async () => {
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

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/Jour\s+1/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Documents et informations importants/i }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Documents et informations importants/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "BANQUE" }));
    fireEvent.click(screen.getByRole("button", { name: /Ouvrir les docs de Service carte CB LCL/i }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Docs · Service carte CB LCL/i })).toBeInTheDocument();
    });

    expect(screen.getByText(/Aucun doc disponible pour cet élément/i)).toBeInTheDocument();
    expect(screen.getByText(/Ajouter une photo \(0\/5\)/i)).toBeInTheDocument();
  });

  it("does not let a non-owner open a document with no scan at all", async () => {
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

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/Jour\s+1/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Documents et informations importants/i }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Documents et informations importants/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "BANQUE" }));

    expect(screen.queryByRole("button", { name: /Ouvrir les docs de Service carte CB LCL/i })).not.toBeInTheDocument();
  });
});
