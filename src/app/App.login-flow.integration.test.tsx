import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import App from "./App";
import { hashProfilePassword } from "./profile-password";

const cloudSyncMock = vi.fn();
const claimRoleForProfileMock = vi.fn();

vi.mock("../hooks/useCloudSync", () => ({
  useCloudSync: () => cloudSyncMock(),
}));

vi.mock("../content/trip", () => ({
  TRIP: {
    currentDay: 1,
    todayDestination: "Istanbul",
  },
}));

const baseSnapshot = {
  familyState: {
    version: 1,
    ownerProfileId: "p1",
    profiles: [
      { id: "p1", role: "proprietaire" as const },
      { id: "p2", role: "utilisateur" as const },
    ],
  },
  ownerCodeHash: "",
  phase: "before" as const,
  profiles: {
    p1: {
      profileId: "p1",
      surname: "Maman",
      role: "proprietaire" as const,
      createdAt: 1,
      lastSyncAt: 1,
      checklist: {},
      gameResults: [],
      phase: "before" as const,
    },
    p2: {
      profileId: "p2",
      surname: "Léo",
      role: "utilisateur" as const,
      createdAt: 1,
      lastSyncAt: 1,
      checklist: {},
      gameResults: [],
      phase: "before" as const,
    },
  },
  updatedAt: 1,
};

describe("App cloud login flow", () => {
  beforeEach(() => {
    localStorage.clear();
    cloudSyncMock.mockReset();
    claimRoleForProfileMock.mockReset();
    claimRoleForProfileMock.mockResolvedValue(null);
    cloudSyncMock.mockReturnValue({
      cloudEnabled: true,
      cloudReady: true,
      cloudAuthError: null,
      cloudActorUid: "actor-1",
      cloudSnapshot: baseSnapshot,
      pushSnapshot: vi.fn().mockResolvedValue(undefined),
      claimRoleForProfile: claimRoleForProfileMock,
      familyId: "famille-voyage-2026",
    });
  });

  it("prevents duplicate profile creation and suggests existing selection", async () => {
    render(<App />);

    const input = screen.getByPlaceholderText("Ex: Maman, Papa, Léo");
    fireEvent.change(input, { target: { value: "maman" } });
    fireEvent.click(screen.getByRole("button", { name: "Créer un nouveau profil" }));

    expect(
      screen.getByText(
        "Ce profil existe déjà. Sélectionnez-le dans la liste puis appuyez sur Se connecter."
      )
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Se connecter avec ce profil" }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Préparer nos bagages" })).toBeInTheDocument();
    });
  });

  it("returns to cloud selection screen after switch profile action", async () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: /Maman/i }));
    fireEvent.click(screen.getByRole("button", { name: "Se connecter avec ce profil" }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Préparer nos bagages" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Paramètres" }));
    fireEvent.click(screen.getByRole("button", { name: "Se déconnecter / Changer de profil" }));
    fireEvent.click(screen.getByRole("button", { name: "Oui, se déconnecter" }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Se connecter" })).toBeInTheDocument();
    });

    expect(screen.getByRole("button", { name: /Maman/i })).toBeInTheDocument();
  });

  it("keeps current session when switch profile confirmation is canceled", async () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: /Maman/i }));
    fireEvent.click(screen.getByRole("button", { name: "Se connecter avec ce profil" }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Préparer nos bagages" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Paramètres" }));
    fireEvent.click(screen.getByRole("button", { name: "Se déconnecter / Changer de profil" }));
    fireEvent.click(screen.getByRole("button", { name: "Annuler" }));

    expect(
      screen.getByRole("button", { name: "Se déconnecter / Changer de profil" })
    ).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Se connecter" })).not.toBeInTheDocument();
  });

  it("blocks dashboard access until profile selection after logout confirmation", async () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: /Maman/i }));
    fireEvent.click(screen.getByRole("button", { name: "Se connecter avec ce profil" }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Préparer nos bagages" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Paramètres" }));
    fireEvent.click(screen.getByRole("button", { name: "Se déconnecter / Changer de profil" }));
    fireEvent.click(screen.getByRole("button", { name: "Oui, se déconnecter" }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Se connecter" })).toBeInTheDocument();
    });

    expect(screen.queryByRole("heading", { name: "Préparer nos bagages" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Paramètres" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Maman/i })).toBeInTheDocument();
  });

  it("creates a new profile then completes setup and persists active profile id", async () => {
    render(<App />);

    const input = screen.getByPlaceholderText("Ex: Maman, Papa, Léo");
    fireEvent.change(input, { target: { value: "Emma" } });
    fireEvent.click(screen.getByRole("button", { name: "Créer un nouveau profil" }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Créer votre profil" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Continuer" }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Préparer nos bagages" })).toBeInTheDocument();
    });

    const activeProfileId = localStorage.getItem("jp-active-profile-id");
    expect(activeProfileId).toMatch(/^profile-/);
    expect(claimRoleForProfileMock).toHaveBeenCalledTimes(1);
    expect(claimRoleForProfileMock).toHaveBeenCalledWith(activeProfileId, "Emma");
  });

  it("requires password for protected profile and keeps generic error messaging", async () => {
    const protectedHash = await hashProfilePassword("secret-1234");
    const protectedSnapshot = {
      ...baseSnapshot,
      profiles: {
        ...baseSnapshot.profiles,
        p2: {
          ...baseSnapshot.profiles.p2,
          passwordHash: protectedHash,
        },
      },
    };

    cloudSyncMock.mockReturnValue({
      cloudEnabled: true,
      cloudReady: true,
      cloudAuthError: null,
      cloudActorUid: "actor-1",
      cloudSnapshot: protectedSnapshot,
      pushSnapshot: vi.fn().mockResolvedValue(undefined),
      claimRoleForProfile: claimRoleForProfileMock,
      familyId: "famille-voyage-2026",
    });

    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: /Léo/i }));
    fireEvent.click(screen.getByRole("button", { name: "Se connecter avec ce profil" }));

    expect(screen.getByText("Profil protégé")).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText("Mot de passe"), {
      target: { value: "wrong-password" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Se connecter" }));

    await waitFor(() => {
      expect(
        screen.getByText("Authentification impossible. Vérifiez les informations saisies.")
      ).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText("Mot de passe"), {
      target: { value: "secret-1234" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Se connecter" }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Préparer nos bagages" })).toBeInTheDocument();
    });
  });

  it("fails closed when selected profile has malformed password hash", async () => {
    const malformedSnapshot = {
      ...baseSnapshot,
      profiles: {
        ...baseSnapshot.profiles,
        p2: {
          ...baseSnapshot.profiles.p2,
          passwordHash: "sha256:invalid",
        },
      },
    };

    cloudSyncMock.mockReturnValue({
      cloudEnabled: true,
      cloudReady: true,
      cloudAuthError: null,
      cloudActorUid: "actor-1",
      cloudSnapshot: malformedSnapshot,
      pushSnapshot: vi.fn().mockResolvedValue(undefined),
      claimRoleForProfile: claimRoleForProfileMock,
      familyId: "famille-voyage-2026",
    });

    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: /Léo/i }));
    fireEvent.click(screen.getByRole("button", { name: "Se connecter avec ce profil" }));

    await waitFor(() => {
      expect(
        screen.getByText("Authentification impossible. Vérifiez les informations saisies.")
      ).toBeInTheDocument();
    });
    expect(screen.queryByRole("heading", { name: "Préparer nos bagages" })).not.toBeInTheDocument();
  });

  it("fails closed during remembered-profile bootstrap when hash is malformed", async () => {
    localStorage.setItem("jp-active-profile-id", "p2");

    const malformedSnapshot = {
      ...baseSnapshot,
      profiles: {
        ...baseSnapshot.profiles,
        p2: {
          ...baseSnapshot.profiles.p2,
          passwordHash: "sha256:invalid",
        },
      },
    };

    cloudSyncMock.mockReturnValue({
      cloudEnabled: true,
      cloudReady: true,
      cloudAuthError: null,
      cloudActorUid: "actor-1",
      cloudSnapshot: malformedSnapshot,
      pushSnapshot: vi.fn().mockResolvedValue(undefined),
      claimRoleForProfile: claimRoleForProfileMock,
      familyId: "famille-voyage-2026",
    });

    render(<App />);

    await waitFor(() => {
      expect(
        screen.getByText("Authentification impossible. Vérifiez les informations saisies.")
      ).toBeInTheDocument();
    });

    expect(screen.getByRole("heading", { name: "Se connecter" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Préparer nos bagages" })).not.toBeInTheDocument();
  });

  it("can remove a profile password from settings", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);

    try {
      render(<App />);

      fireEvent.click(screen.getByRole("button", { name: /Maman/i }));
      fireEvent.click(screen.getByRole("button", { name: "Se connecter avec ce profil" }));

      await waitFor(() => {
        expect(screen.getByRole("heading", { name: "Préparer nos bagages" })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: "Paramètres" }));

      fireEvent.change(screen.getAllByPlaceholderText("Minimum 4 caractères")[0], {
        target: { value: "safe-pass" },
      });
      fireEvent.click(screen.getByRole("button", { name: "Définir le mot de passe" }));

      await waitFor(() => {
        expect(screen.getByRole("button", { name: "Retirer le mot de passe" })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: "Retirer le mot de passe" }));

      await waitFor(() => {
        expect(screen.getByRole("button", { name: "Définir le mot de passe" })).toBeInTheDocument();
      });
      expect(
        screen.getByText("Aucun mot de passe configuré. Ce profil reste accessible sans mot de passe.")
      ).toBeInTheDocument();
    } finally {
      confirmSpy.mockRestore();
    }
  });
});
