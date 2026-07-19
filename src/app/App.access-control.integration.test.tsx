import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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

  it("keeps owner locked to checklist and settings before unlock", async () => {
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

    expect(screen.queryByRole("button", { name: "Accueil" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Guide" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Paramètres/i }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Profil & paramètres/i })).toBeInTheDocument();
    });

    expect(screen.getByText(/Code propriétaire/i)).toBeInTheDocument();
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

  it("allows the owner to re-lock from settings after entering the correct code", async () => {
    localStorage.setItem("jp-active-profile-id", "p1");

    const ownerCodeHash = await hashOwnerCode("1234");
    const pushSnapshot = vi.fn().mockResolvedValue(undefined);
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

    fireEvent.click(screen.getByRole("button", { name: /Re-verrouiller l'application/i }));

    await waitFor(() => {
      expect(screen.getByText(/Entrez le code propriétaire pour re-verrouiller l'application/i)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText(/Code propriétaire/i), {
      target: { value: "1234" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Valider" }));

    await waitFor(() => {
      expect(pushSnapshot).toHaveBeenCalledWith(
        expect.objectContaining({
          profileId: "p1",
          phase: "before",
        })
      );
    });

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Préparer nos bagages/i })).toBeInTheDocument();
    });
  });

  it("supports a full owner lock-unlock cycle after re-lock", async () => {
    localStorage.setItem("jp-active-profile-id", "p1");

    const ownerCodeHash = await hashOwnerCode("1234");
    let snapshot = {
      ...makeSnapshot("during"),
      ownerCodeHash,
    };
    const pushSnapshot = vi.fn().mockImplementation(async (payload: { phase: SnapshotPhase }) => {
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

    fireEvent.click(screen.getByRole("button", { name: /Re-verrouiller l'application/i }));
    await waitFor(() => {
      expect(screen.getByText(/Entrez le code propriétaire pour re-verrouiller l'application/i)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText(/Code propriétaire/i), {
      target: { value: "1234" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Valider" }));

    await waitFor(() => {
      expect(pushSnapshot).toHaveBeenCalledWith(expect.objectContaining({ phase: "before" }));
    });

    view.rerender(<App />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Préparer nos bagages/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /On est partis/i }));
    await waitFor(() => {
      expect(screen.getByText(/Entrez le code propriétaire pour débloquer le voyage/i)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText(/Code propriétaire/i), {
      target: { value: "1234" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Valider" }));

    await waitFor(() => {
      expect(pushSnapshot).toHaveBeenCalledWith(expect.objectContaining({ phase: "during" }));
    });

    view.rerender(<App />);

    await waitFor(() => {
      expect(screen.getByText(/Jour\s+1/i)).toBeInTheDocument();
    });
  });

  it("shows an error and keeps the app unlocked when the re-lock code is wrong", async () => {
    localStorage.setItem("jp-active-profile-id", "p1");

    const ownerCodeHash = await hashOwnerCode("1234");
    const pushSnapshot = vi.fn().mockResolvedValue(undefined);
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

    fireEvent.click(screen.getByRole("button", { name: /Re-verrouiller l'application/i }));
    await waitFor(() => {
      expect(screen.getByText(/Entrez le code propriétaire pour re-verrouiller l'application/i)).toBeInTheDocument();
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
  });

  it("redirects the owner to checklist when a re-lock arrives while viewing guide", async () => {
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

    fireEvent.click(screen.getByRole("button", { name: "Guide" }));
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Guide de Turquie/i })).toBeInTheDocument();
    });

    snapshot = makeSnapshot("before");
    view.rerender(<App />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Préparer nos bagages/i })).toBeInTheDocument();
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

    const snapshot = makeSnapshotWithMetadata("before", "p2", "male", "parent");
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

    expect(screen.getByText(/Vêtements pour les hommes/i)).toBeInTheDocument();
    expect(screen.queryByText(/Vêtements pour les femmes/i)).not.toBeInTheDocument();
  });

  it("female user sees womens clothing category but not mens clothing category", async () => {
    localStorage.setItem("jp-active-profile-id", "p2");

    const snapshot = makeSnapshotWithMetadata("before", "p2", "female", "parent");
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

    expect(screen.getByText(/Vêtements pour les femmes/i)).toBeInTheDocument();
    expect(screen.queryByText(/Vêtements pour les hommes/i)).not.toBeInTheDocument();
  });

  it("user with default metadata (unspecified/member) sees both gender categories", async () => {
    localStorage.setItem("jp-active-profile-id", "p2");

    const snapshot = makeSnapshotWithMetadata("before", "p2", "unspecified", "member");
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
      expect(screen.getByRole("heading", { name: /Préparer nos bagages/i })).toBeInTheDocument();
    });

    expect(screen.getByText(/Vêtements pour les hommes/i)).toBeInTheDocument();
    expect(screen.getByText(/Vêtements pour les femmes/i)).toBeInTheDocument();
  });
});
