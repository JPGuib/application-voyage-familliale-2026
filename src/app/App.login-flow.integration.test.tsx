import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import App from "./App";
import { hashOwnerRecoveryPhrase } from "./owner-recovery";
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

  it("lands on home screen after login when travel is already unlocked", async () => {
    const unlockedSnapshot = {
      ...baseSnapshot,
      phase: "during" as const,
      profiles: {
        ...baseSnapshot.profiles,
        p1: {
          ...baseSnapshot.profiles.p1,
          phase: "during" as const,
        },
        p2: {
          ...baseSnapshot.profiles.p2,
          phase: "during" as const,
        },
      },
    };

    cloudSyncMock.mockReturnValue({
      cloudEnabled: true,
      cloudReady: true,
      cloudAuthError: null,
      cloudActorUid: "actor-1",
      cloudSnapshot: unlockedSnapshot,
      pushSnapshot: vi.fn().mockResolvedValue(undefined),
      claimRoleForProfile: claimRoleForProfileMock,
      familyId: "famille-voyage-2026",
    });

    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: /Maman/i }));
    fireEvent.click(screen.getByRole("button", { name: "Se connecter avec ce profil" }));

    await waitFor(() => {
      expect(screen.getByText(/Jour\s+1/i)).toBeInTheDocument();
    });

    expect(screen.queryByRole("heading", { name: "Préparer nos bagages" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Checklist/i })).toBeInTheDocument();
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

  it("shows forgot-password link when profile recovery is configured", async () => {
    const protectedHash = await hashProfilePassword("secret-1234");
    const recoveryHash = await hashOwnerRecoveryPhrase("my first travel");
    const protectedSnapshot = {
      ...baseSnapshot,
      profiles: {
        ...baseSnapshot.profiles,
        p2: {
          ...baseSnapshot.profiles.p2,
          passwordHash: protectedHash,
          recoveryHash,
          recoveryQuestion: "Quel est ton premier voyage ?",
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

    expect(screen.getByRole("button", { name: "Mot de passe oublié ?" })).toBeInTheDocument();
  });

  it("hides forgot-password link when no recovery is configured", async () => {
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

    expect(screen.queryByRole("button", { name: "Mot de passe oublié ?" })).not.toBeInTheDocument();
  });

  it("resets password via recovery answer and authenticates", async () => {
    const protectedHash = await hashProfilePassword("secret-1234");
    const recoveryHash = await hashOwnerRecoveryPhrase("my first travel");
    const expectedNewHash = await hashProfilePassword("new-pass");
    const pushSnapshotMock = vi.fn().mockResolvedValue(undefined);
    const protectedSnapshot = {
      ...baseSnapshot,
      profiles: {
        ...baseSnapshot.profiles,
        p2: {
          ...baseSnapshot.profiles.p2,
          passwordHash: protectedHash,
          recoveryHash,
          recoveryQuestion: "Quel est ton premier voyage ?",
        },
      },
    };

    cloudSyncMock.mockReturnValue({
      cloudEnabled: true,
      cloudReady: true,
      cloudAuthError: null,
      cloudActorUid: "actor-1",
      cloudSnapshot: protectedSnapshot,
      pushSnapshot: pushSnapshotMock,
      claimRoleForProfile: claimRoleForProfileMock,
      familyId: "famille-voyage-2026",
    });

    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: /Léo/i }));
    fireEvent.click(screen.getByRole("button", { name: "Se connecter avec ce profil" }));
    fireEvent.click(screen.getByRole("button", { name: "Mot de passe oublié ?" }));

    expect(screen.getByText("Quel est ton premier voyage ?")).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText("Réponse"), {
      target: { value: "my first travel" },
    });
    fireEvent.change(screen.getByPlaceholderText("Nouveau mot de passe"), {
      target: { value: "new-pass" },
    });
    fireEvent.change(screen.getByPlaceholderText("Confirmer le nouveau mot de passe"), {
      target: { value: "new-pass" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Réinitialiser" }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Préparer nos bagages" })).toBeInTheDocument();
    });

    expect(pushSnapshotMock).toHaveBeenCalled();
    expect(pushSnapshotMock.mock.calls).toContainEqual([
      expect.objectContaining({
        profileId: "p2",
        profilePasswordHash: expectedNewHash,
      }),
    ]);
  });

  it("rejects incorrect recovery answer with generic error and no auth", async () => {
    const protectedHash = await hashProfilePassword("secret-1234");
    const recoveryHash = await hashOwnerRecoveryPhrase("my first travel");
    const pushSnapshotMock = vi.fn().mockResolvedValue(undefined);
    const protectedSnapshot = {
      ...baseSnapshot,
      profiles: {
        ...baseSnapshot.profiles,
        p2: {
          ...baseSnapshot.profiles.p2,
          passwordHash: protectedHash,
          recoveryHash,
          recoveryQuestion: "Quel est ton premier voyage ?",
        },
      },
    };

    cloudSyncMock.mockReturnValue({
      cloudEnabled: true,
      cloudReady: true,
      cloudAuthError: null,
      cloudActorUid: "actor-1",
      cloudSnapshot: protectedSnapshot,
      pushSnapshot: pushSnapshotMock,
      claimRoleForProfile: claimRoleForProfileMock,
      familyId: "famille-voyage-2026",
    });

    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: /Léo/i }));
    fireEvent.click(screen.getByRole("button", { name: "Se connecter avec ce profil" }));
    fireEvent.click(screen.getByRole("button", { name: "Mot de passe oublié ?" }));

    fireEvent.change(screen.getByPlaceholderText("Réponse"), {
      target: { value: "wrong answer" },
    });
    fireEvent.change(screen.getByPlaceholderText("Nouveau mot de passe"), {
      target: { value: "new-pass" },
    });
    fireEvent.change(screen.getByPlaceholderText("Confirmer le nouveau mot de passe"), {
      target: { value: "new-pass" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Réinitialiser" }));

    await waitFor(() => {
      expect(
        screen.getByText("Authentification impossible. Vérifiez les informations saisies.")
      ).toBeInTheDocument();
    });

    expect(pushSnapshotMock).not.toHaveBeenCalled();
    expect(screen.queryByRole("heading", { name: "Préparer nos bagages" })).not.toBeInTheDocument();
  });

  it("returns to password prompt when recovery is canceled", async () => {
    const protectedHash = await hashProfilePassword("secret-1234");
    const recoveryHash = await hashOwnerRecoveryPhrase("my first travel");
    const protectedSnapshot = {
      ...baseSnapshot,
      profiles: {
        ...baseSnapshot.profiles,
        p2: {
          ...baseSnapshot.profiles.p2,
          passwordHash: protectedHash,
          recoveryHash,
          recoveryQuestion: "Quel est ton premier voyage ?",
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
    fireEvent.click(screen.getByRole("button", { name: "Mot de passe oublié ?" }));
    fireEvent.click(screen.getByRole("button", { name: "Annuler" }));

    expect(screen.getByPlaceholderText("Mot de passe")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Se connecter" })).toBeInTheDocument();
  });

  it("changes password in session using current password and keeps login flow behavior", async () => {
    const currentHash = await hashProfilePassword("secret-1234");
    const expectedNewHash = await hashProfilePassword("new-secret-1234");
    const pushSnapshotMock = vi.fn().mockResolvedValue(undefined);
    const protectedSnapshot = {
      ...baseSnapshot,
      profiles: {
        ...baseSnapshot.profiles,
        p2: {
          ...baseSnapshot.profiles.p2,
          passwordHash: currentHash,
        },
      },
    };

    cloudSyncMock.mockReturnValue({
      cloudEnabled: true,
      cloudReady: true,
      cloudAuthError: null,
      cloudActorUid: "actor-1",
      cloudSnapshot: protectedSnapshot,
      pushSnapshot: pushSnapshotMock,
      claimRoleForProfile: claimRoleForProfileMock,
      familyId: "famille-voyage-2026",
    });

    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: /Léo/i }));
    fireEvent.click(screen.getByRole("button", { name: "Se connecter avec ce profil" }));
    fireEvent.change(screen.getByPlaceholderText("Mot de passe"), {
      target: { value: "secret-1234" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Se connecter" }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Préparer nos bagages" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Paramètres" }));
    fireEvent.click(screen.getByRole("button", { name: "Changer le mot de passe en session" }));

    fireEvent.change(screen.getByPlaceholderText("Mot de passe actuel"), {
      target: { value: "secret-1234" },
    });
    fireEvent.change(screen.getByPlaceholderText("Nouveau mot de passe (min. 4 caractères)"), {
      target: { value: "new-secret-1234" },
    });
    fireEvent.change(screen.getByPlaceholderText("Confirmer le nouveau mot de passe"), {
      target: { value: "new-secret-1234" },
    });
    const pushCallsBeforeConfirm = pushSnapshotMock.mock.calls.length;
    fireEvent.click(screen.getByRole("button", { name: "Confirmer le changement" }));

    await waitFor(() => {
      expect(screen.getByText("Mot de passe du profil mis à jour.")).toBeInTheDocument();
    });

    expect(pushSnapshotMock).toHaveBeenCalled();
    expect(pushSnapshotMock.mock.calls).toContainEqual([
      expect.objectContaining({
        profileId: "p2",
        profilePasswordHash: expectedNewHash,
        surname: "Léo",
        role: "utilisateur",
      }),
    ]);

    fireEvent.click(screen.getByRole("button", { name: "Se déconnecter / Changer de profil" }));
    fireEvent.click(screen.getByRole("button", { name: "Oui, se déconnecter" }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Se connecter" })).toBeInTheDocument();
    });

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

  it("rejects in-session current-password proof with generic error", async () => {
    const currentHash = await hashProfilePassword("secret-1234");
    const pushSnapshotMock = vi.fn().mockResolvedValue(undefined);
    const protectedSnapshot = {
      ...baseSnapshot,
      profiles: {
        ...baseSnapshot.profiles,
        p2: {
          ...baseSnapshot.profiles.p2,
          passwordHash: currentHash,
        },
      },
    };

    cloudSyncMock.mockReturnValue({
      cloudEnabled: true,
      cloudReady: true,
      cloudAuthError: null,
      cloudActorUid: "actor-1",
      cloudSnapshot: protectedSnapshot,
      pushSnapshot: pushSnapshotMock,
      claimRoleForProfile: claimRoleForProfileMock,
      familyId: "famille-voyage-2026",
    });

    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: /Léo/i }));
    fireEvent.click(screen.getByRole("button", { name: "Se connecter avec ce profil" }));
    fireEvent.change(screen.getByPlaceholderText("Mot de passe"), {
      target: { value: "secret-1234" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Se connecter" }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Préparer nos bagages" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Paramètres" }));
    fireEvent.click(screen.getByRole("button", { name: "Changer le mot de passe en session" }));

    fireEvent.change(screen.getByPlaceholderText("Mot de passe actuel"), {
      target: { value: "wrong-password" },
    });
    fireEvent.change(screen.getByPlaceholderText("Nouveau mot de passe (min. 4 caractères)"), {
      target: { value: "new-secret-1234" },
    });
    fireEvent.change(screen.getByPlaceholderText("Confirmer le nouveau mot de passe"), {
      target: { value: "new-secret-1234" },
    });
    const pushCallsBeforeConfirm = pushSnapshotMock.mock.calls.length;
    fireEvent.click(screen.getByRole("button", { name: "Confirmer le changement" }));

    await waitFor(() => {
      expect(
        screen.getByText("Authentification impossible. Vérifiez les informations saisies.")
      ).toBeInTheDocument();
    });

    expect(pushSnapshotMock.mock.calls.length).toBe(pushCallsBeforeConfirm);
  });

  it("changes password in session using recovery answer when recovery is configured", async () => {
    const currentHash = await hashProfilePassword("secret-1234");
    const recoveryHash = await hashOwnerRecoveryPhrase("my first travel");
    const expectedNewHash = await hashProfilePassword("new-secret-1234");
    const pushSnapshotMock = vi.fn().mockResolvedValue(undefined);
    const protectedSnapshot = {
      ...baseSnapshot,
      profiles: {
        ...baseSnapshot.profiles,
        p2: {
          ...baseSnapshot.profiles.p2,
          passwordHash: currentHash,
          recoveryHash,
          recoveryQuestion: "Quel est ton premier voyage ?",
        },
      },
    };

    cloudSyncMock.mockReturnValue({
      cloudEnabled: true,
      cloudReady: true,
      cloudAuthError: null,
      cloudActorUid: "actor-1",
      cloudSnapshot: protectedSnapshot,
      pushSnapshot: pushSnapshotMock,
      claimRoleForProfile: claimRoleForProfileMock,
      familyId: "famille-voyage-2026",
    });

    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: /Léo/i }));
    fireEvent.click(screen.getByRole("button", { name: "Se connecter avec ce profil" }));
    fireEvent.change(screen.getByPlaceholderText("Mot de passe"), {
      target: { value: "secret-1234" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Se connecter" }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Préparer nos bagages" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Paramètres" }));
    fireEvent.click(screen.getByRole("button", { name: "Changer le mot de passe en session" }));
    fireEvent.click(screen.getByRole("button", { name: "Réponse de récupération" }));

    fireEvent.change(screen.getByPlaceholderText("Réponse de récupération"), {
      target: { value: "my first travel" },
    });
    fireEvent.change(screen.getByPlaceholderText("Nouveau mot de passe (min. 4 caractères)"), {
      target: { value: "new-secret-1234" },
    });
    fireEvent.change(screen.getByPlaceholderText("Confirmer le nouveau mot de passe"), {
      target: { value: "new-secret-1234" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Confirmer le changement" }));

    await waitFor(() => {
      expect(screen.getByText("Mot de passe du profil mis à jour.")).toBeInTheDocument();
    });

    expect(pushSnapshotMock).toHaveBeenCalled();
    expect(pushSnapshotMock.mock.calls).toContainEqual([
      expect.objectContaining({
        profileId: "p2",
        profilePasswordHash: expectedNewHash,
      }),
    ]);
  });

  it("hides recovery proof option in session password change when recovery is not configured", async () => {
    const currentHash = await hashProfilePassword("secret-1234");
    const protectedSnapshot = {
      ...baseSnapshot,
      profiles: {
        ...baseSnapshot.profiles,
        p2: {
          ...baseSnapshot.profiles.p2,
          passwordHash: currentHash,
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
    fireEvent.change(screen.getByPlaceholderText("Mot de passe"), {
      target: { value: "secret-1234" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Se connecter" }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Préparer nos bagages" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Paramètres" }));
    fireEvent.click(screen.getByRole("button", { name: "Changer le mot de passe en session" }));

    expect(screen.queryByRole("button", { name: "Réponse de récupération" })).not.toBeInTheDocument();
  });

  it("validates mismatch and minimum length in session password change flow", async () => {
    const currentHash = await hashProfilePassword("secret-1234");
    const protectedSnapshot = {
      ...baseSnapshot,
      profiles: {
        ...baseSnapshot.profiles,
        p2: {
          ...baseSnapshot.profiles.p2,
          passwordHash: currentHash,
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
    fireEvent.change(screen.getByPlaceholderText("Mot de passe"), {
      target: { value: "secret-1234" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Se connecter" }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Préparer nos bagages" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Paramètres" }));
    fireEvent.click(screen.getByRole("button", { name: "Changer le mot de passe en session" }));

    fireEvent.change(screen.getByPlaceholderText("Mot de passe actuel"), {
      target: { value: "secret-1234" },
    });
    fireEvent.change(screen.getByPlaceholderText("Nouveau mot de passe (min. 4 caractères)"), {
      target: { value: "abc" },
    });
    fireEvent.change(screen.getByPlaceholderText("Confirmer le nouveau mot de passe"), {
      target: { value: "abc" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Confirmer le changement" }));

    await waitFor(() => {
      expect(
        screen.getByText("Le nouveau mot de passe doit contenir au moins 4 caractères.")
      ).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText("Nouveau mot de passe (min. 4 caractères)"), {
      target: { value: "new-secret-1234" },
    });
    fireEvent.change(screen.getByPlaceholderText("Confirmer le nouveau mot de passe"), {
      target: { value: "different-secret" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Confirmer le changement" }));

    await waitFor(() => {
      expect(screen.getByText("La confirmation du mot de passe ne correspond pas.")).toBeInTheDocument();
    });
  });

  // ─── Story 10.9: show/hide visibility toggles ────────────────────────────

  it("defaults password prompt input to masked mode and toggles visibility", async () => {
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

    const passwordInput = screen.getByPlaceholderText("Mot de passe");
    expect(passwordInput).toHaveAttribute("type", "password");

    fireEvent.click(screen.getByRole("button", { name: "Afficher le mot de passe saisi" }));
    expect(passwordInput).toHaveAttribute("type", "text");

    fireEvent.click(screen.getByRole("button", { name: "Masquer le mot de passe saisi" }));
    expect(passwordInput).toHaveAttribute("type", "password");
  });

  it("defaults recovery overlay inputs to masked mode and toggles each independently", async () => {
    const protectedHash = await hashProfilePassword("secret-1234");
    const recoveryHash = await hashOwnerRecoveryPhrase("my first travel");
    const protectedSnapshot = {
      ...baseSnapshot,
      profiles: {
        ...baseSnapshot.profiles,
        p2: {
          ...baseSnapshot.profiles.p2,
          passwordHash: protectedHash,
          recoveryHash,
          recoveryQuestion: "Quel est ton premier voyage ?",
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
    fireEvent.click(screen.getByRole("button", { name: "Mot de passe oublié ?" }));

    const answerInput = screen.getByPlaceholderText("Réponse");
    const newPasswordInput = screen.getByPlaceholderText("Nouveau mot de passe");
    const confirmInput = screen.getByPlaceholderText("Confirmer le nouveau mot de passe");

    expect(answerInput).toHaveAttribute("type", "password");
    expect(newPasswordInput).toHaveAttribute("type", "password");
    expect(confirmInput).toHaveAttribute("type", "password");

    fireEvent.click(screen.getByRole("button", { name: "Afficher la réponse saisie" }));
    expect(answerInput).toHaveAttribute("type", "text");
    expect(newPasswordInput).toHaveAttribute("type", "password");
    expect(confirmInput).toHaveAttribute("type", "password");

    fireEvent.click(screen.getByRole("button", { name: "Afficher le nouveau mot de passe saisi" }));
    expect(newPasswordInput).toHaveAttribute("type", "text");

    fireEvent.click(screen.getByRole("button", { name: "Afficher la confirmation saisie" }));
    expect(confirmInput).toHaveAttribute("type", "text");
  });

  it("defaults in-session password change inputs to masked mode and toggles visibility", async () => {
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
    fireEvent.change(screen.getByPlaceholderText("Mot de passe"), {
      target: { value: "secret-1234" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Se connecter" }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Préparer nos bagages" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Paramètres" }));
    fireEvent.click(screen.getByRole("button", { name: "Changer le mot de passe en session" }));

    const proofInput = screen.getByPlaceholderText("Mot de passe actuel");
    const newPasswordInput = screen.getByPlaceholderText("Nouveau mot de passe (min. 4 caractères)");
    const confirmInput = screen.getByPlaceholderText("Confirmer le nouveau mot de passe");

    expect(proofInput).toHaveAttribute("type", "password");
    expect(newPasswordInput).toHaveAttribute("type", "password");
    expect(confirmInput).toHaveAttribute("type", "password");

    fireEvent.click(screen.getByRole("button", { name: "Afficher la valeur saisie" }));
    expect(proofInput).toHaveAttribute("type", "text");
    expect(newPasswordInput).toHaveAttribute("type", "password");

    fireEvent.click(screen.getByRole("button", { name: "Afficher le nouveau mot de passe saisi" }));
    expect(newPasswordInput).toHaveAttribute("type", "text");

    fireEvent.click(screen.getByRole("button", { name: "Afficher la confirmation saisie" }));
    expect(confirmInput).toHaveAttribute("type", "text");
  });
});

// ─── Metadata hydration (story 10.4) ─────────────────────────────────────────

describe("App profile metadata hydration (story 10.4)", () => {
  beforeEach(() => {
    localStorage.clear();
    cloudSyncMock.mockReset();
  });

  it("hydrates gender and householdRole from cloud snapshot on auto-login", async () => {
    localStorage.setItem("jp-active-profile-id", "p2");

    const snapshotWithMeta = {
      ...baseSnapshot,
      profiles: {
        ...baseSnapshot.profiles,
        p2: {
          ...baseSnapshot.profiles.p2,
          gender: "female" as const,
          householdRole: "parent" as const,
        },
      },
    };

    cloudSyncMock.mockImplementation(() => ({
      cloudEnabled: true,
      cloudReady: true,
      cloudAuthError: null,
      cloudActorUid: "actor-1",
      cloudSnapshot: snapshotWithMeta,
      pushSnapshot: vi.fn().mockResolvedValue(undefined),
      claimRoleForProfile: claimRoleForProfileMock,
      familyId: "famille-voyage-2026",
    }));

    render(<App />);

    // After hydration the female user should NOT see mens clothing
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Préparer nos bagages/i })).toBeInTheDocument();
    });

    expect(screen.getByText(/Vêtements pour les femmes/i)).toBeInTheDocument();
    expect(screen.queryByText(/Vêtements pour les hommes/i)).not.toBeInTheDocument();
  });

  it("profile switch resets checklist metadata state to defaults", async () => {
    localStorage.setItem("jp-active-profile-id", "p2");

    const snapshotWithMeta = {
      ...baseSnapshot,
      profiles: {
        ...baseSnapshot.profiles,
        p2: {
          ...baseSnapshot.profiles.p2,
          gender: "female" as const,
          householdRole: "parent" as const,
        },
      },
    };

    cloudSyncMock.mockImplementation(() => ({
      cloudEnabled: true,
      cloudReady: true,
      cloudAuthError: null,
      cloudActorUid: "actor-1",
      cloudSnapshot: snapshotWithMeta,
      pushSnapshot: vi.fn().mockResolvedValue(undefined),
      claimRoleForProfile: claimRoleForProfileMock,
      familyId: "famille-voyage-2026",
    }));

    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Préparer nos bagages/i })).toBeInTheDocument();
    });

    // Switch profile
    fireEvent.click(screen.getByText(/Paramètres/i));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Profil & paramètres/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Se déconnecter \/ Changer de profil/i }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Oui, se déconnecter" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Oui, se déconnecter" }));

    // After reset, the login screen should be shown (no auto-login for new blank profile)
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Se connecter/i })).toBeInTheDocument();
    });
  });
});

describe("App profile recovery question settings (story 10.6)", () => {
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

  it("requires a recovery question and answer and confirms save", async () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: /Maman/i }));
    fireEvent.click(screen.getByRole("button", { name: "Se connecter avec ce profil" }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Préparer nos bagages" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Paramètres" }));

    fireEvent.change(screen.getByPlaceholderText("Ex: Quel est votre plat préféré ?"), {
      target: { value: "Quel est votre dessert préféré ?" },
    });
    fireEvent.change(screen.getByPlaceholderText("Votre réponse personnelle (min. 5 caractères)"), {
      target: { value: "Tiramisu" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Définir la récupération" }));

    await waitFor(() => {
      expect(
        screen.getByText("Question et réponse de récupération du profil mises à jour.")
      ).toBeInTheDocument();
    });
  });

  it("rejects a recovery question shorter than 8 characters", async () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: /Maman/i }));
    fireEvent.click(screen.getByRole("button", { name: "Se connecter avec ce profil" }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Préparer nos bagages" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Paramètres" }));

    fireEvent.change(screen.getByPlaceholderText("Ex: Quel est votre plat préféré ?"), {
      target: { value: "Court ?" },
    });
    fireEvent.change(screen.getByPlaceholderText("Votre réponse personnelle (min. 5 caractères)"), {
      target: { value: "Tiramisu" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Définir la récupération" }));

    await waitFor(() => {
      expect(
        screen.getByText("La question doit contenir au moins 8 caractères.")
      ).toBeInTheDocument();
    });
  });

  it("rejects a recovery answer shorter than 5 characters", async () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: /Maman/i }));
    fireEvent.click(screen.getByRole("button", { name: "Se connecter avec ce profil" }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Préparer nos bagages" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Paramètres" }));

    fireEvent.change(screen.getByPlaceholderText("Ex: Quel est votre plat préféré ?"), {
      target: { value: "Quel est votre dessert préféré ?" },
    });
    fireEvent.change(screen.getByPlaceholderText("Votre réponse personnelle (min. 5 caractères)"), {
      target: { value: "Non" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Définir la récupération" }));

    await waitFor(() => {
      expect(
        screen.getByText("La réponse doit contenir au moins 5 caractères.")
      ).toBeInTheDocument();
    });
  });
});
