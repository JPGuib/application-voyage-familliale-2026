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

type SnapshotPhase = "before" | "during";

function makeSnapshot(phase: SnapshotPhase) {
  return {
    familyState: {
      version: 1,
      ownerProfileId: "p1",
      profiles: [
        { id: "p1", role: "proprietaire" as const },
        { id: "p2", role: "utilisateur" as const },
      ],
    },
    ownerCodeHash: "hash",
    ownerRecoveryHash: "",
    phase,
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
    },
    updatedAt: 1,
  };
}

describe("App access-control integration", () => {
  beforeEach(() => {
    localStorage.clear();
    cloudSyncMock.mockReset();
  });

  it("allows owner to access travel sections before unlock", async () => {
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
      expect(screen.getByRole("heading", { name: /Préparer nos bagages/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Accueil" }));

    await waitFor(() => {
      expect(screen.getByText(/Jour\s+1/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Guide" }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Guide de Turquie/i })).toBeInTheDocument();
    });
  });

  it("keeps user locked to checklist and settings before unlock", async () => {
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
      expect(screen.getByRole("heading", { name: /Préparer nos bagages/i })).toBeInTheDocument();
    });

    expect(screen.queryByRole("button", { name: "Accueil" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Paramètres/i }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Profil & paramètres/i })).toBeInTheDocument();
    });

    expect(screen.getByText(/Seul un profil propriétaire peut configurer ce code\./i)).toBeInTheDocument();
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
      expect(screen.getByRole("heading", { name: /Préparer nos bagages/i })).toBeInTheDocument();
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
      expect(screen.getByRole("heading", { name: /Préparer nos bagages/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Accueil" }));
    await waitFor(() => {
      expect(screen.getByText(/Jour\s+1/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Guide" }));
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Guide de Turquie/i })).toBeInTheDocument();
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

  it("keeps checklist accessible when phase switches from before to during", async () => {
    localStorage.setItem("jp-active-profile-id", "p2");

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
      expect(screen.getByRole("heading", { name: /Préparer nos bagages/i })).toBeInTheDocument();
    });

    snapshot = makeSnapshot("during");
    view.rerender(<App />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Préparer nos bagages/i })).toBeInTheDocument();
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
      expect(screen.getByRole("heading", { name: /Préparer nos bagages/i })).toBeInTheDocument();
    });

    expect(screen.queryByRole("button", { name: /On est partis/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/Code oublié/i)).not.toBeInTheDocument();
  });
});
