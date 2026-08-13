import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import App from "./App";
import { hashOwnerCode } from "./owner-code";

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

type SnapshotPhase = "before" | "during";

function makeSnapshot(phase: SnapshotPhase) {
  const launchGateCycle = phase === "during" ? 1 : 0;
  const launchGateCompletedCycleByProfile =
    phase === "during"
      ? {
          p2: 1,
          p3: 1,
        }
      : {};

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
    ownerRecoveryHash: "",
    phase,
    launchGateCycle,
    launchGateCompletedCycleByProfile,
    profiles: {
      p1: {
        profileId: "p1",
        surname: "Maman",
        role: "proprietaire" as const,
        createdAt: 1,
        lastSyncAt: 1,
        checklist: {},
        gameResults: [],
        phase,
      },
      p2: {
        profileId: "p2",
        surname: "Leo",
        role: "utilisateur" as const,
        createdAt: 1,
        lastSyncAt: 1,
        checklist: {},
        gameResults: [],
        phase,
      },
      p3: {
        profileId: "p3",
        surname: "Mia",
        role: "visiteur" as const,
        createdAt: 1,
        lastSyncAt: 1,
        checklist: {},
        gameResults: [],
        phase,
      },
    },
    updatedAt: 1,
  };
}

function setNavigatorOnline(value: boolean) {
  Object.defineProperty(window.navigator, "onLine", {
    configurable: true,
    value,
  });
}

describe("App access-control integration", () => {
  beforeEach(() => {
    localStorage.clear();
    cloudSyncMock.mockReset();
    setNavigatorOnline(true);
  });

  it("grants owner full access to all screens before unlock (story 18.2)", async () => {
    localStorage.setItem("jp-active-profile-id", "p1");

    let snapshot = makeSnapshot("before");
    cloudSyncMock.mockImplementation(() => ({
      cloudEnabled: true,
      cloudReady: true,
      cloudAuthError: null,
      cloudActorUid: "actor-1",
      cloudSnapshot: snapshot,
      pushSnapshot: vi.fn().mockResolvedValue(undefined),
      claimRoleForProfile: vi.fn().mockResolvedValue(null),
      familyId: "famille-voyage-2026",
    }));

    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Préparation des bagages/i })).toBeInTheDocument();
    });

    expect(screen.getByRole("button", { name: "Accueil" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Séjour" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Accueil" }));
    await waitFor(() => {
      expect(screen.getByText(/Jour\s+1/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Séjour" }));
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Guide du séjour/i })).toBeInTheDocument();
    });

    fireEvent.click(within(screen.getByRole("navigation")).getByRole("button", { name: "Accueil" }));
    await waitFor(() => {
      expect(screen.getByText(/Jour\s+1/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Paramètres/i }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Profil & paramètres/i })).toBeInTheDocument();
    });

    expect(screen.getByText(/Code propriétaire/i)).toBeInTheDocument();
  });

  it("keeps user on checklist flow before unlock while owner keeps full access", async () => {
    localStorage.setItem("jp-active-profile-id", "p2");

    const snapshot = makeSnapshot("before");
    cloudSyncMock.mockImplementation(() => ({
      cloudEnabled: true,
      cloudReady: true,
      cloudAuthError: null,
      cloudActorUid: "actor-1",
      cloudSnapshot: snapshot,
      pushSnapshot: vi.fn().mockResolvedValue(undefined),
      claimRoleForProfile: vi.fn().mockResolvedValue(null),
      familyId: "famille-voyage-2026",
    }));

    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Préparation des bagages/i })).toBeInTheDocument();
    });

    expect(screen.getByRole("button", { name: /On est partis/i })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /On est parti/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Accueil" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Séjour" })).not.toBeInTheDocument();
  });

  it("keeps owner-only unlock guard message when user triggers unlock before phase change", async () => {
    localStorage.setItem("jp-active-profile-id", "p2");

    const snapshot = makeSnapshot("before");
    cloudSyncMock.mockImplementation(() => ({
      cloudEnabled: true,
      cloudReady: true,
      cloudAuthError: null,
      cloudActorUid: "actor-1",
      cloudSnapshot: snapshot,
      pushSnapshot: vi.fn().mockResolvedValue(undefined),
      claimRoleForProfile: vi.fn().mockResolvedValue(null),
      familyId: "famille-voyage-2026",
    }));

    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Préparation des bagages/i })).toBeInTheDocument();
    });

    expect(screen.queryByRole("button", { name: "Accueil" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /On est partis/i }));
    fireEvent.click(screen.getByRole("button", { name: /Valider/i }));
    expect(screen.getByText(/Seul le profil propriétaire peut débloquer le voyage\./i)).toBeInTheDocument();
  });

  it("redirects blocked screen with explicit deny reason when unlock is revoked", async () => {
    localStorage.setItem("jp-active-profile-id", "p2");

    let snapshot = makeSnapshot("during");
    cloudSyncMock.mockImplementation(() => ({
      cloudEnabled: true,
      cloudReady: true,
      cloudAuthError: null,
      cloudActorUid: "actor-1",
      cloudSnapshot: snapshot,
      pushSnapshot: vi.fn().mockResolvedValue(undefined),
      claimRoleForProfile: vi.fn().mockResolvedValue(null),
      familyId: "famille-voyage-2026",
    }));

    const view = render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/Jour\s+1/i)).toBeInTheDocument();
    });

    snapshot = makeSnapshot("before");
    view.rerender(<App />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Préparation des bagages/i })).toBeInTheDocument();
    });

    expect(screen.getByText(/Acces refuse/i)).toBeInTheDocument();
    expect(screen.getByText(/deblocage proprietaire requis/i)).toBeInTheDocument();
  });

  it("allows user after unlock to access guide game tips and results", async () => {
    localStorage.setItem("jp-active-profile-id", "p2");

    const snapshot = makeSnapshot("during");
    cloudSyncMock.mockImplementation(() => ({
      cloudEnabled: true,
      cloudReady: true,
      cloudAuthError: null,
      cloudActorUid: "actor-1",
      cloudSnapshot: snapshot,
      pushSnapshot: vi.fn().mockResolvedValue(undefined),
      claimRoleForProfile: vi.fn().mockResolvedValue(null),
      familyId: "famille-voyage-2026",
    }));

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/Jour\s+1/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Checklist/i }));
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Préparation des bagages/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Accueil" }));
    await waitFor(() => {
      expect(screen.getByText(/Jour\s+1/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Séjour" }));
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Guide du séjour/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Jeu" }));
    await waitFor(() => {
      expect(screen.getByText(/Prêts pour le défi/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Conseils" }));
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Conseils de voyage/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Résultats" }));
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Tableau des scores/i })).toBeInTheDocument();
    });
  });

  it("shows a lock-state badge and a single toggle button in the owner's settings (story 18.2)", async () => {
    localStorage.setItem("jp-active-profile-id", "p1");

    const snapshot = makeSnapshot("during");
    cloudSyncMock.mockImplementation(() => ({
      cloudEnabled: true,
      cloudReady: true,
      cloudAuthError: null,
      cloudActorUid: "actor-1",
      cloudSnapshot: snapshot,
      pushSnapshot: vi.fn().mockResolvedValue(undefined),
      claimRoleForProfile: vi.fn().mockResolvedValue(null),
      familyId: "famille-voyage-2026",
    }));

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/Jour\s+1/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Paramètres/i }));
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Profil & paramètres/i })).toBeInTheDocument();
    });

    expect(screen.getByText(/Débloquée/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Bloquer l'application/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Débloquer l'application/i })).not.toBeInTheDocument();
  });

  it("disables settings write actions offline and restores them online again (story 27.5)", async () => {
    localStorage.setItem("jp-active-profile-id", "p1");

    const lastSyncAt = Date.UTC(2026, 7, 6, 9, 15, 0);
    const snapshot = {
      ...makeSnapshot("during"),
      ownerCodePlain: "1234",
      travelerCodePlain: "famille2026",
      updatedAt: lastSyncAt,
      profiles: {
        ...makeSnapshot("during").profiles,
        p1: {
          ...makeSnapshot("during").profiles.p1,
          lastSyncAt,
        },
      },
    };

    cloudSyncMock.mockImplementation(() => ({
      cloudEnabled: true,
      cloudReady: true,
      cloudAuthError: null,
      cloudActorUid: "actor-1",
      cloudSnapshot: snapshot,
      pushSnapshot: vi.fn().mockResolvedValue(undefined),
      claimRoleForProfile: vi.fn().mockResolvedValue(null),
      familyId: "famille-voyage-2026",
    }));

    setNavigatorOnline(false);
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/Jour\s+1/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Paramètres/i }));
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Profil & paramètres/i })).toBeInTheDocument();
    });

    expect(screen.getByText(/Nécessite une connexion/i)).toBeInTheDocument();
    expect(screen.getByText(/Dernière synchronisation/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Enregistrer le surnom/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Mettre à jour le code/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Bloquer l'application/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Se déconnecter \/ Changer de profil/i })).toBeDisabled();

    setNavigatorOnline(true);
    act(() => {
      window.dispatchEvent(new Event("online"));
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Enregistrer le surnom/i })).toBeEnabled();
    });

    expect(screen.queryByText(/Nécessite une connexion/i)).not.toBeInTheDocument();
  });

  it("prevents opening the daily game while offline (story 27.5)", async () => {
    localStorage.setItem("jp-active-profile-id", "p1");

    const snapshot = makeSnapshot("during");
    cloudSyncMock.mockImplementation(() => ({
      cloudEnabled: true,
      cloudReady: true,
      cloudAuthError: null,
      cloudActorUid: "actor-1",
      cloudSnapshot: snapshot,
      pushSnapshot: vi.fn().mockResolvedValue(undefined),
      claimRoleForProfile: vi.fn().mockResolvedValue(null),
      familyId: "famille-voyage-2026",
    }));

    setNavigatorOnline(false);
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/Jour\s+1/i)).toBeInTheDocument();
    });

    const gameButton = screen.getByRole("button", { name: /Jeux/i });
    expect(gameButton).toBeDisabled();
    expect(screen.getAllByText(/Connexion requise/i).length).toBeGreaterThan(0);
    expect(screen.queryByRole("heading", { name: /Jeu du jour/i })).not.toBeInTheDocument();
  });

  it("does not show the lock badge or toggle button in a non-owner's settings (story 18.2)", async () => {
    localStorage.setItem("jp-active-profile-id", "p2");

    const snapshot = makeSnapshot("during");
    cloudSyncMock.mockImplementation(() => ({
      cloudEnabled: true,
      cloudReady: true,
      cloudAuthError: null,
      cloudActorUid: "actor-1",
      cloudSnapshot: snapshot,
      pushSnapshot: vi.fn().mockResolvedValue(undefined),
      claimRoleForProfile: vi.fn().mockResolvedValue(null),
      familyId: "famille-voyage-2026",
    }));

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/Jour\s+1/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Paramètres/i }));
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Profil & paramètres/i })).toBeInTheDocument();
    });

    expect(screen.queryByText(/Débloquée/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Verrouillée/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Bloquer l'application/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Débloquer l'application/i })).not.toBeInTheDocument();
  });

  it("allows the owner to lock the application from settings without leaving the screen (story 18.2)", async () => {
    localStorage.setItem("jp-active-profile-id", "p1");

    const ownerCodeHash = await hashOwnerCode("1234");
    const pushSnapshot = vi.fn().mockResolvedValue(undefined);
    const pushOwnerPhaseChange = vi.fn().mockResolvedValue(true);
    const snapshot = {
      ...makeSnapshot("during"),
      ownerCodeHash,
    };

    cloudSyncMock.mockImplementation(() => ({
      cloudEnabled: true,
      cloudReady: true,
      cloudAuthError: null,
      cloudActorUid: "actor-1",
      cloudSnapshot: snapshot,
      pushSnapshot,
      pushOwnerPhaseChange,
      claimRoleForProfile: vi.fn().mockResolvedValue(null),
      familyId: "famille-voyage-2026",
    }));

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/Jour\s+1/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Paramètres/i }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Profil & paramètres/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Bloquer l'application/i }));

    await waitFor(() => {
      expect(screen.getByText(/Entrez le code propriétaire pour bloquer l'application/i)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText(/Code propriétaire/i), {
      target: { value: "1234" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Valider" }));

    await waitFor(() => {
      expect(pushOwnerPhaseChange).toHaveBeenCalledWith(
        expect.objectContaining({
          phase: "before",
        })
      );
    });

    // The owner stays on the settings screen and sees the badge/button update immediately.
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Profil & paramètres/i })).toBeInTheDocument();
      expect(screen.getByText(/Verrouillée/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Débloquer l'application/i })).toBeInTheDocument();
    });
  });

  it("supports a full owner lock-unlock cycle from the same settings button", async () => {
    localStorage.setItem("jp-active-profile-id", "p1");

    const ownerCodeHash = await hashOwnerCode("1234");
    let snapshot = {
      ...makeSnapshot("during"),
      ownerCodeHash,
    };
    const pushSnapshot = vi.fn().mockResolvedValue(undefined);
    const pushOwnerPhaseChange = vi.fn().mockImplementation(async (payload: { phase: SnapshotPhase }) => {
      snapshot = {
        ...snapshot,
        phase: payload.phase,
        profiles: {
          ...snapshot.profiles,
          p1: { ...snapshot.profiles.p1, phase: payload.phase },
          p2: { ...snapshot.profiles.p2, phase: payload.phase },
        },
      };
    });

    cloudSyncMock.mockImplementation(() => ({
      cloudEnabled: true,
      cloudReady: true,
      cloudAuthError: null,
      cloudActorUid: "actor-1",
      cloudSnapshot: snapshot,
      pushSnapshot,
      pushOwnerPhaseChange,
      claimRoleForProfile: vi.fn().mockResolvedValue(null),
      familyId: "famille-voyage-2026",
    }));

    const view = render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/Jour\s+1/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Paramètres/i }));
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Profil & paramètres/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Bloquer l'application/i }));
    await waitFor(() => {
      expect(screen.getByText(/Entrez le code propriétaire pour bloquer l'application/i)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText(/Code propriétaire/i), {
      target: { value: "1234" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Valider" }));

    await waitFor(() => {
      expect(pushOwnerPhaseChange).toHaveBeenCalledWith(expect.objectContaining({ phase: "before" }));
    });

    view.rerender(<App />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Débloquer l'application/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Débloquer l'application/i }));
    await waitFor(() => {
      expect(screen.getByText(/Entrez le code propriétaire pour débloquer l'application/i)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText(/Code propriétaire/i), {
      target: { value: "1234" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Valider" }));

    await waitFor(() => {
      expect(pushOwnerPhaseChange).toHaveBeenCalledWith(expect.objectContaining({ phase: "during" }));
    });

    view.rerender(<App />);

    await waitFor(() => {
      expect(screen.getByText(/Débloquée/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Bloquer l'application/i })).toBeInTheDocument();
    });
  });

  it("shows an error and keeps the app unlocked when the lock code is wrong", async () => {
    localStorage.setItem("jp-active-profile-id", "p1");

    const ownerCodeHash = await hashOwnerCode("1234");
    const pushSnapshot = vi.fn().mockResolvedValue(undefined);
    const pushOwnerPhaseChange = vi.fn().mockResolvedValue(true);
    const snapshot = {
      ...makeSnapshot("during"),
      ownerCodeHash,
    };

    cloudSyncMock.mockImplementation(() => ({
      cloudEnabled: true,
      cloudReady: true,
      cloudAuthError: null,
      cloudActorUid: "actor-1",
      cloudSnapshot: snapshot,
      pushSnapshot,
      pushOwnerPhaseChange,
      claimRoleForProfile: vi.fn().mockResolvedValue(null),
      familyId: "famille-voyage-2026",
    }));

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/Jour\s+1/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Paramètres/i }));
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Profil & paramètres/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Bloquer l'application/i }));
    await waitFor(() => {
      expect(screen.getByText(/Entrez le code propriétaire pour bloquer l'application/i)).toBeInTheDocument();
    });

    const callCountBeforeValidation = pushSnapshot.mock.calls.length;

    fireEvent.change(screen.getByPlaceholderText(/Code propriétaire/i), {
      target: { value: "9999" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Valider" }));

    await waitFor(() => {
      expect(screen.getByText(/Code incorrect\. Réessayez\./i)).toBeInTheDocument();
    });

    expect(pushSnapshot).toHaveBeenCalledTimes(callCountBeforeValidation);
    expect(
      pushSnapshot.mock.calls.some(
        ([payload]) => payload && typeof payload === "object" && payload.phase === "before"
      )
    ).toBe(false);
    expect(screen.getByRole("heading", { name: /Profil & paramètres/i })).toBeInTheDocument();
    expect(screen.getByText(/Débloquée/i)).toBeInTheDocument();
  });

  it("keeps the owner on the guide screen when a lock arrives while browsing (story 18.2)", async () => {
    localStorage.setItem("jp-active-profile-id", "p1");

    let snapshot = makeSnapshot("during");
    cloudSyncMock.mockImplementation(() => ({
      cloudEnabled: true,
      cloudReady: true,
      cloudAuthError: null,
      cloudActorUid: "actor-1",
      cloudSnapshot: snapshot,
      pushSnapshot: vi.fn().mockResolvedValue(undefined),
      claimRoleForProfile: vi.fn().mockResolvedValue(null),
      familyId: "famille-voyage-2026",
    }));

    const view = render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/Jour\s+1/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Séjour" }));
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Guide du séjour/i })).toBeInTheDocument();
    });

    snapshot = makeSnapshot("before");
    view.rerender(<App />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Guide du séjour/i })).toBeInTheDocument();
    });
  });

  it("keeps launch gate visible when phase switches from before to during until ritual completion", async () => {
    localStorage.setItem("jp-active-profile-id", "p3");

    let snapshot = makeSnapshot("before");
    cloudSyncMock.mockImplementation(() => ({
      cloudEnabled: true,
      cloudReady: true,
      cloudAuthError: null,
      cloudActorUid: "actor-1",
      cloudSnapshot: snapshot,
      pushSnapshot: vi.fn().mockResolvedValue(undefined),
      claimRoleForProfile: vi.fn().mockResolvedValue(null),
      familyId: "famille-voyage-2026",
    }));

    const view = render(<App />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /On est parti/i })).toBeInTheDocument();
    });

    snapshot = makeSnapshot("during");
    snapshot.launchGateCompletedCycleByProfile = {};
    view.rerender(<App />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /On est parti/i })).toBeInTheDocument();
    });

    expect(screen.queryByText(/Jour\s+1/i)).not.toBeInTheDocument();
  });

  it("does not expose unlock actions on checklist during travel phase", async () => {
    localStorage.setItem("jp-active-profile-id", "p2");

    const snapshot = makeSnapshot("during");
    cloudSyncMock.mockImplementation(() => ({
      cloudEnabled: true,
      cloudReady: true,
      cloudAuthError: null,
      cloudActorUid: "actor-1",
      cloudSnapshot: snapshot,
      pushSnapshot: vi.fn().mockResolvedValue(undefined),
      claimRoleForProfile: vi.fn().mockResolvedValue(null),
      familyId: "famille-voyage-2026",
    }));

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/Jour\s+1/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Checklist/i }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Préparation des bagages/i })).toBeInTheDocument();
    });

    expect(screen.queryByRole("button", { name: /On est partis/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/Code oublié/i)).not.toBeInTheDocument();
  });
});

// ─── Checklist filtering (story 10.4) ────────────────────────────────────────

type ProfileGender = "unspecified" | "male" | "female";
type ProfileHouseholdRole = "member" | "parent" | "child";

function makeSnapshotWithMetadata(
  phase: "before" | "during",
  profileId: "p1" | "p2",
  gender: ProfileGender,
  householdRole: ProfileHouseholdRole
) {
  const snapshot = makeSnapshot(phase);
  const target = snapshot.profiles[profileId] as
    | (typeof snapshot.profiles)["p1"]
    | (typeof snapshot.profiles)["p2"]
    | undefined;
  if (target) {
    target.gender = gender;
    target.householdRole = householdRole;
  }
  return snapshot;
}

describe("App checklist filtering integration (story 10.4)", () => {
  beforeEach(() => {
    localStorage.clear();
    cloudSyncMock.mockReset();
  });

  it("male user sees mens clothing category but not womens clothing category", async () => {
    localStorage.setItem("jp-active-profile-id", "p2");

    const snapshot = makeSnapshotWithMetadata("during", "p2", "male", "parent");
    cloudSyncMock.mockImplementation(() => ({
      cloudEnabled: true,
      cloudReady: true,
      cloudAuthError: null,
      cloudActorUid: "actor-1",
      cloudSnapshot: snapshot,
      pushSnapshot: vi.fn().mockResolvedValue(undefined),
      claimRoleForProfile: vi.fn().mockResolvedValue(null),
      familyId: "famille-voyage-2026",
    }));

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/Jour\s+1/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Checklist/i }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Préparation des bagages/i })).toBeInTheDocument();
    });

    expect(screen.getByText(/Vêtements pour les hommes/i)).toBeInTheDocument();
    expect(screen.queryByText(/Vêtements pour les femmes/i)).not.toBeInTheDocument();
  });

  it("female user sees womens clothing category but not mens clothing category", async () => {
    localStorage.setItem("jp-active-profile-id", "p2");

    const snapshot = makeSnapshotWithMetadata("during", "p2", "female", "parent");
    cloudSyncMock.mockImplementation(() => ({
      cloudEnabled: true,
      cloudReady: true,
      cloudAuthError: null,
      cloudActorUid: "actor-1",
      cloudSnapshot: snapshot,
      pushSnapshot: vi.fn().mockResolvedValue(undefined),
      claimRoleForProfile: vi.fn().mockResolvedValue(null),
      familyId: "famille-voyage-2026",
    }));

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/Jour\s+1/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Checklist/i }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Préparation des bagages/i })).toBeInTheDocument();
    });

    expect(screen.getByText(/Vêtements pour les femmes/i)).toBeInTheDocument();
    expect(screen.queryByText(/Vêtements pour les hommes/i)).not.toBeInTheDocument();
  });

  it("user with default metadata (unspecified/member) sees both gender categories", async () => {
    localStorage.setItem("jp-active-profile-id", "p2");

    const snapshot = makeSnapshotWithMetadata("during", "p2", "unspecified", "member");
    cloudSyncMock.mockImplementation(() => ({
      cloudEnabled: true,
      cloudReady: true,
      cloudAuthError: null,
      cloudActorUid: "actor-1",
      cloudSnapshot: snapshot,
      pushSnapshot: vi.fn().mockResolvedValue(undefined),
      claimRoleForProfile: vi.fn().mockResolvedValue(null),
      familyId: "famille-voyage-2026",
    }));

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/Jour\s+1/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Checklist/i }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Préparation des bagages/i })).toBeInTheDocument();
    });

    expect(screen.getByText(/Vêtements pour les hommes/i)).toBeInTheDocument();
    expect(screen.getByText(/Vêtements pour les femmes/i)).toBeInTheDocument();
  });

  it("owner profile (p1) keeps both gender categories visible with explicit female metadata", async () => {
    localStorage.setItem("jp-active-profile-id", "p1");

    // Owner with female metadata still sees mens clothing
    const snapshot = makeSnapshotWithMetadata("before", "p1", "female", "parent");
    cloudSyncMock.mockImplementation(() => ({
      cloudEnabled: true,
      cloudReady: true,
      cloudAuthError: null,
      cloudActorUid: "actor-1",
      cloudSnapshot: snapshot,
      pushSnapshot: vi.fn().mockResolvedValue(undefined),
      claimRoleForProfile: vi.fn().mockResolvedValue(null),
      familyId: "famille-voyage-2026",
    }));

    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Préparation des bagages/i })).toBeInTheDocument();
    });

    expect(screen.getByText(/Vêtements pour les hommes/i)).toBeInTheDocument();
    expect(screen.getByText(/Vêtements pour les femmes/i)).toBeInTheDocument();
  });
});
