import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import App from "./App";
import { hashOwnerRecoveryPhrase } from "./owner-recovery";
import { hashProfilePassword } from "./profile-password";
import { hashOwnerCode } from "./owner-code";

const cloudSyncMock = vi.fn();
const claimRoleForProfileMock = vi.fn();
const deleteProfileMock = vi.fn();

vi.mock("../hooks/useCloudSync", () => ({
  useCloudSync: () => cloudSyncMock(),
}));

vi.mock("../content/trip", () => ({
  TRIP: {
    currentDay: 1,
    todayDestination: "Istanbul",
  },
}));

// Story 24.1 : toute création de profil (hors 1er profil) demande
// maintenant un choix Voyageur/Visiteur. Les tests génériques de ce fichier
// (non spécifiques au rôle) utilisent "Voyageur" avec ce code préconfiguré
// pour préserver le comportement historique (rôle "utilisateur" inchangé,
// atterrissage sur la Checklist en phase "before").
const TEST_TRAVELER_CODE = "famille2026";
const testTravelerCodeHash = await hashOwnerCode(TEST_TRAVELER_CODE);

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
  travelerCodeHash: testTravelerCodeHash,
  phase: "before" as const,
  launchGateCycle: 1,
  launchGateCompletedCycleByProfile: {
    p1: 1,
    p2: 1,
  },
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

function fillMandatoryProfileCreationFields() {
  fireEvent.click(screen.getByRole("button", { name: /voyage avec vous/i }));
  fireEvent.change(screen.getByPlaceholderText("Code transmis par le propriétaire"), {
    target: { value: TEST_TRAVELER_CODE },
  });
  fireEvent.change(screen.getByPlaceholderText("Minimum 4 caractères"), {
    target: { value: "new-profile-pw" },
  });
  fireEvent.change(screen.getByPlaceholderText("Ex: Quel est votre plat préféré ?"), {
    target: { value: "Quel est votre dessert préféré ?" },
  });
  fireEvent.change(screen.getByPlaceholderText("Votre réponse personnelle (min. 5 caractères)"), {
    target: { value: "Tiramisu" },
  });
}

function loginWithProfileLabel(profileLabelPattern: RegExp) {
  const input = screen.getByPlaceholderText("Sélectionnez un profil");
  const typedPrefix = profileLabelPattern.source.replace(/[^\p{L}\p{N}]/gu, "").slice(0, 3);
  fireEvent.change(input, { target: { value: typedPrefix } });

  const matchingProfileButton = screen.getByText(profileLabelPattern);
  fireEvent.click(matchingProfileButton);
  fireEvent.click(screen.getByRole("button", { name: "Se connecter" }));
}

function openCreateProfileDialog() {
  fireEvent.click(screen.getByRole("button", { name: "Nouveau ici" }));
}

describe("App cloud login flow", () => {
  beforeEach(() => {
    localStorage.clear();
    cloudSyncMock.mockReset();
    claimRoleForProfileMock.mockReset();
    deleteProfileMock.mockReset();
    claimRoleForProfileMock.mockResolvedValue(null);
    deleteProfileMock.mockResolvedValue(undefined);
    cloudSyncMock.mockReturnValue({
      cloudEnabled: true,
      cloudReady: true,
      cloudAuthError: null,
      cloudActorUid: "actor-1",
      cloudSnapshot: baseSnapshot,
      pushSnapshot: vi.fn().mockResolvedValue(undefined),
      claimRoleForProfile: claimRoleForProfileMock,
      deleteProfile: deleteProfileMock,
      familyId: "famille-voyage-2026",
    });
  });

  it("prevents duplicate profile creation and suggests existing selection", async () => {
    render(<App />);

    openCreateProfileDialog();
    const input = screen.getByPlaceholderText(/Ex: Maman, Papa, L.o/);
    fireEvent.change(input, { target: { value: "maman" } });
    fireEvent.click(screen.getByRole("button", { name: "Créer un nouveau profil" }));

    expect(
      screen.getByText(
        "Ce profil existe déjà. Sélectionnez-le dans la liste puis appuyez sur Se connecter."
      )
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Se connecter" }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Préparation des bagages" })).toBeInTheDocument();
    });
  });

  it("returns to cloud selection screen after switch profile action", async () => {
    render(<App />);

    loginWithProfileLabel(/Maman/i);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Préparation des bagages" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Paramètres" }));
    fireEvent.click(screen.getByRole("button", { name: "Se déconnecter / Changer de profil" }));
    fireEvent.click(screen.getByRole("button", { name: "Oui, se déconnecter" }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Se connecter" })).toBeInTheDocument();
    });

    expect(screen.getByPlaceholderText("Sélectionnez un profil")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Afficher les profils disponibles" }));
    expect(screen.getByText(/Maman/i)).toBeInTheDocument();
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

    loginWithProfileLabel(/Maman/i);

    await waitFor(() => {
      expect(screen.getByText(/Jour\s+1/i)).toBeInTheDocument();
    });

    expect(screen.queryByRole("heading", { name: "Préparation des bagages" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Checklist/i })).toBeInTheDocument();
  });

  it("lands on home screen after login using the family-wide phase, ignoring a stale per-profile phase value", async () => {
    // Regression test for story 12.1: the redirect must follow the shared
    // family-wide phase (cloudSnapshot.phase), not the legacy per-profile
    // phase field, which can be stale/out of sync (e.g. "before") even when
    // the family has already unlocked the trip.
    const unlockedSnapshot = {
      ...baseSnapshot,
      phase: "during" as const,
      profiles: {
        ...baseSnapshot.profiles,
        p1: {
          ...baseSnapshot.profiles.p1,
          phase: "before" as const,
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

    loginWithProfileLabel(/Maman/i);

    await waitFor(() => {
      expect(screen.getByText(/Jour\s+1/i)).toBeInTheDocument();
    });

    expect(screen.queryByRole("heading", { name: "Préparation des bagages" })).not.toBeInTheDocument();
  });

  it("keeps current session when switch profile confirmation is canceled", async () => {
    render(<App />);

    loginWithProfileLabel(/Maman/i);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Préparation des bagages" })).toBeInTheDocument();
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

    loginWithProfileLabel(/Maman/i);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Préparation des bagages" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Paramètres" }));
    fireEvent.click(screen.getByRole("button", { name: "Se déconnecter / Changer de profil" }));
    fireEvent.click(screen.getByRole("button", { name: "Oui, se déconnecter" }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Se connecter" })).toBeInTheDocument();
    });

    expect(screen.queryByRole("heading", { name: "Préparation des bagages" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Paramètres" })).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText("Sélectionnez un profil")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Afficher les profils disponibles" }));
    expect(screen.getByText(/Maman/i)).toBeInTheDocument();
  });

  it("creates a new profile then completes setup and persists active profile id", async () => {
    render(<App />);

    openCreateProfileDialog();
    const input = screen.getByPlaceholderText(/Ex: Maman, Papa, L.o/);
    fireEvent.change(input, { target: { value: "Emma" } });
    fireEvent.click(screen.getByRole("button", { name: "Créer un nouveau profil" }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Créer votre profil" })).toBeInTheDocument();
    });

    fillMandatoryProfileCreationFields();
    fireEvent.click(screen.getByRole("button", { name: "Continuer" }));

    // claimRoleForProfile is no longer called in cloud mode: the auto-push
    // handles the Firebase write, avoiding the transaction-failure re-sync
    // that was triggering resetForProfileSwitch.
    expect(claimRoleForProfileMock).not.toHaveBeenCalled();

    await waitFor(() => {
      expect(localStorage.getItem("jp-active-profile-id")).toMatch(/^profile-/);
    });

    const activeProfileId = localStorage.getItem("jp-active-profile-id");
    expect(activeProfileId).toMatch(/^profile-/);
  });

  it("allows canceling profile creation and returns to the login screen", async () => {
    render(<App />);

    openCreateProfileDialog();
    const input = screen.getByPlaceholderText(/Ex: Maman, Papa, L.o/);
    fireEvent.change(input, { target: { value: "Emma" } });
    fireEvent.click(screen.getByRole("button", { name: "Créer un nouveau profil" }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Créer votre profil" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Annuler" }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Se connecter" })).toBeInTheDocument();
    });
  });

  it("blocks profile creation when the mandatory password and recovery fields are missing (story 18.9)", async () => {
    render(<App />);

    openCreateProfileDialog();
    const input = screen.getByPlaceholderText(/Ex: Maman, Papa, L.o/);
    fireEvent.change(input, { target: { value: "Emma" } });
    fireEvent.click(screen.getByRole("button", { name: "Créer un nouveau profil" }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Créer votre profil" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /suivre le voyage/i }));
    fireEvent.click(screen.getByRole("button", { name: "Continuer" }));

    await waitFor(() => {
      expect(
        screen.getByText(
          "Le mot de passe et la question/réponse de récupération sont obligatoires pour créer un profil."
        )
      ).toBeInTheDocument();
    });

    expect(screen.getByRole("heading", { name: "Créer votre profil" })).toBeInTheDocument();
  });

  it("blocks profile creation with a too-short password", async () => {
    render(<App />);

    openCreateProfileDialog();
    const input = screen.getByPlaceholderText(/Ex: Maman, Papa, L.o/);
    fireEvent.change(input, { target: { value: "Emma" } });
    fireEvent.click(screen.getByRole("button", { name: "Créer un nouveau profil" }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Créer votre profil" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /suivre le voyage/i }));
    fireEvent.change(screen.getByPlaceholderText("Minimum 4 caractères"), {
      target: { value: "abc" },
    });
    fireEvent.change(screen.getByPlaceholderText("Ex: Quel est votre plat préféré ?"), {
      target: { value: "Quel est votre dessert préféré ?" },
    });
    fireEvent.change(screen.getByPlaceholderText("Votre réponse personnelle (min. 5 caractères)"), {
      target: { value: "Tiramisu" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Continuer" }));

    await waitFor(() => {
      expect(
        screen.getByText("Le mot de passe doit contenir au moins 4 caractères.")
      ).toBeInTheDocument();
    });
    expect(claimRoleForProfileMock).not.toHaveBeenCalled();
  });

  it("blocks profile creation with a too-short recovery answer", async () => {
    render(<App />);

    openCreateProfileDialog();
    const input = screen.getByPlaceholderText(/Ex: Maman, Papa, L.o/);
    fireEvent.change(input, { target: { value: "Emma" } });
    fireEvent.click(screen.getByRole("button", { name: "Créer un nouveau profil" }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Créer votre profil" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /suivre le voyage/i }));
    fireEvent.change(screen.getByPlaceholderText("Minimum 4 caractères"), {
      target: { value: "new-profile-pw" },
    });
    fireEvent.change(screen.getByPlaceholderText("Ex: Quel est votre plat préféré ?"), {
      target: { value: "Quel est votre dessert préféré ?" },
    });
    fireEvent.change(screen.getByPlaceholderText("Votre réponse personnelle (min. 5 caractères)"), {
      target: { value: "No" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Continuer" }));

    await waitFor(() => {
      expect(
        screen.getByText("La réponse de récupération doit contenir au moins 5 caractères.")
      ).toBeInTheDocument();
    });
    expect(claimRoleForProfileMock).not.toHaveBeenCalled();
  });

  it("creates the new profile with a working password and recovery once all mandatory fields are valid", async () => {
    const pushSnapshotMock = vi.fn().mockResolvedValue(undefined);
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
      pushSnapshot: pushSnapshotMock,
      claimRoleForProfile: claimRoleForProfileMock,
      familyId: "famille-voyage-2026",
    });

    render(<App />);

    openCreateProfileDialog();
    const input = screen.getByPlaceholderText(/Ex: Maman, Papa, L.o/);
    fireEvent.change(input, { target: { value: "Emma" } });
    fireEvent.click(screen.getByRole("button", { name: "Créer un nouveau profil" }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Créer votre profil" })).toBeInTheDocument();
    });

    fillMandatoryProfileCreationFields();
    fireEvent.click(screen.getByRole("button", { name: "Continuer" }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "On est parti !" })).toBeInTheDocument();
    });

    const activeProfileId = localStorage.getItem("jp-active-profile-id");

    await waitFor(() => {
      expect(pushSnapshotMock).toHaveBeenCalled();
    });

    const expectedPasswordHash = await hashProfilePassword("new-profile-pw");
    const matchingCall = pushSnapshotMock.mock.calls.find(
      (call) => (call[0] as { profileId: string }).profileId === activeProfileId
    );
    expect(matchingCall).toBeDefined();
    const payload = matchingCall![0] as {
      profilePasswordHash: string;
      profileRecoveryQuestion: string;
    };
    expect(payload.profilePasswordHash).toBe(expectedPasswordHash);
    expect(payload.profileRecoveryQuestion).toBe("Quel est votre dessert préféré ?");
  });

  it("blocks profile creation when neither Voyageur nor Visiteur is chosen (story 24.1)", async () => {
    render(<App />);

    openCreateProfileDialog();
    const input = screen.getByPlaceholderText(/Ex: Maman, Papa, L.o/);
    fireEvent.change(input, { target: { value: "Emma" } });
    fireEvent.click(screen.getByRole("button", { name: "Créer un nouveau profil" }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Créer votre profil" })).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText("Minimum 4 caractères"), {
      target: { value: "new-profile-pw" },
    });
    fireEvent.change(screen.getByPlaceholderText("Ex: Quel est votre plat préféré ?"), {
      target: { value: "Quel est votre dessert préféré ?" },
    });
    fireEvent.change(screen.getByPlaceholderText("Votre réponse personnelle (min. 5 caractères)"), {
      target: { value: "Tiramisu" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Continuer" }));

    await waitFor(() => {
      expect(
        screen.getByText(
          "Merci d'indiquer si vous voyagez avec nous ou si vous souhaitez simplement suivre le voyage."
        )
      ).toBeInTheDocument();
    });
    expect(claimRoleForProfileMock).not.toHaveBeenCalled();
  });

  it("creating a profile as Visiteur assigns the visiteur role without requiring a code (story 24.1/24.3)", async () => {
    const pushSnapshotMock = vi.fn().mockResolvedValue(undefined);
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
    claimRoleForProfileMock.mockResolvedValue({
      assignedRole: "utilisateur",
      familyState: unlockedSnapshot.familyState,
    });
    cloudSyncMock.mockReturnValue({
      cloudEnabled: true,
      cloudReady: true,
      cloudAuthError: null,
      cloudActorUid: "actor-1",
      cloudSnapshot: unlockedSnapshot,
      pushSnapshot: pushSnapshotMock,
      claimRoleForProfile: claimRoleForProfileMock,
      familyId: "famille-voyage-2026",
    });

    render(<App />);

    openCreateProfileDialog();
    const input = screen.getByPlaceholderText(/Ex: Maman, Papa, L.o/);
    fireEvent.change(input, { target: { value: "Tonton" } });
    fireEvent.click(screen.getByRole("button", { name: "Créer un nouveau profil" }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Créer votre profil" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /suivre le voyage/i }));
    fireEvent.change(screen.getByPlaceholderText("Minimum 4 caractères"), {
      target: { value: "new-profile-pw" },
    });
    fireEvent.change(screen.getByPlaceholderText("Ex: Quel est votre plat préféré ?"), {
      target: { value: "Quel est votre dessert préféré ?" },
    });
    fireEvent.change(screen.getByPlaceholderText("Votre réponse personnelle (min. 5 caractères)"), {
      target: { value: "Tiramisu" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Continuer" }));

    // En phase "during" (story 25.4), un visiteur nouvellement créé passe
    // d'abord par l'écran de lancement avant d'entrer dans l'application.
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "On est parti !" })).toBeInTheDocument();
    });

    const activeProfileId = localStorage.getItem("jp-active-profile-id");
    await waitFor(() => {
      expect(pushSnapshotMock).toHaveBeenCalled();
    });

    const matchingCall = pushSnapshotMock.mock.calls.find(
      (call) => (call[0] as { profileId: string }).profileId === activeProfileId
    );
    expect(matchingCall).toBeDefined();
    expect((matchingCall![0] as { role: string }).role).toBe("visiteur");
  });

  it("Voyageur option shows guidance instead of a code field when no traveler code is configured (story 24.1)", async () => {
    const snapshotWithoutTravelerCode = { ...baseSnapshot, travelerCodeHash: "" };
    cloudSyncMock.mockReturnValue({
      cloudEnabled: true,
      cloudReady: true,
      cloudAuthError: null,
      cloudActorUid: "actor-1",
      cloudSnapshot: snapshotWithoutTravelerCode,
      pushSnapshot: vi.fn().mockResolvedValue(undefined),
      claimRoleForProfile: claimRoleForProfileMock,
      familyId: "famille-voyage-2026",
    });

    render(<App />);

    openCreateProfileDialog();
    const input = screen.getByPlaceholderText(/Ex: Maman, Papa, L.o/);
    fireEvent.change(input, { target: { value: "Tonton" } });
    fireEvent.click(screen.getByRole("button", { name: "Créer un nouveau profil" }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Créer votre profil" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /voyage avec vous/i }));

    expect(
      screen.getByText("Le propriétaire doit d'abord configurer un code voyageur dans ses paramètres.")
    ).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Code transmis par le propriétaire")).not.toBeInTheDocument();
  });

  it("creating a profile as Voyageur with the correct code keeps the utilisateur role unchanged (story 24.1)", async () => {
    const travelerCodeHash = await hashOwnerCode("famille2026");
    const snapshotWithTravelerCode = {
      ...baseSnapshot,
      travelerCodeHash,
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
    const pushSnapshotMock = vi.fn().mockResolvedValue(undefined);
    claimRoleForProfileMock.mockResolvedValue({
      assignedRole: "utilisateur",
      familyState: baseSnapshot.familyState,
    });
    cloudSyncMock.mockReturnValue({
      cloudEnabled: true,
      cloudReady: true,
      cloudAuthError: null,
      cloudActorUid: "actor-1",
      cloudSnapshot: snapshotWithTravelerCode,
      pushSnapshot: pushSnapshotMock,
      claimRoleForProfile: claimRoleForProfileMock,
      familyId: "famille-voyage-2026",
    });

    render(<App />);

    openCreateProfileDialog();
    const input = screen.getByPlaceholderText(/Ex: Maman, Papa, L.o/);
    fireEvent.change(input, { target: { value: "Oncle" } });
    fireEvent.click(screen.getByRole("button", { name: "Créer un nouveau profil" }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Créer votre profil" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /voyage avec vous/i }));
    fireEvent.change(screen.getByPlaceholderText("Code transmis par le propriétaire"), {
      target: { value: "famille2026" },
    });
    fireEvent.change(screen.getByPlaceholderText("Minimum 4 caractères"), {
      target: { value: "new-profile-pw" },
    });
    fireEvent.change(screen.getByPlaceholderText("Ex: Quel est votre plat préféré ?"), {
      target: { value: "Quel est votre dessert préféré ?" },
    });
    fireEvent.change(screen.getByPlaceholderText("Votre réponse personnelle (min. 5 caractères)"), {
      target: { value: "Tiramisu" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Continuer" }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "On est parti !" })).toBeInTheDocument();
    });

    const activeProfileId = localStorage.getItem("jp-active-profile-id");
    await waitFor(() => {
      expect(pushSnapshotMock).toHaveBeenCalled();
    });

    const matchingCall = pushSnapshotMock.mock.calls.find(
      (call) => (call[0] as { profileId: string }).profileId === activeProfileId
    );
    expect(matchingCall).toBeDefined();
    expect((matchingCall![0] as { role: string }).role).toBe("utilisateur");
  });

  it("creating a profile as Voyageur with an incorrect code shows an error and does not create the profile (story 24.1)", async () => {
    const travelerCodeHash = await hashOwnerCode("famille2026");
    const snapshotWithTravelerCode = { ...baseSnapshot, travelerCodeHash };
    cloudSyncMock.mockReturnValue({
      cloudEnabled: true,
      cloudReady: true,
      cloudAuthError: null,
      cloudActorUid: "actor-1",
      cloudSnapshot: snapshotWithTravelerCode,
      pushSnapshot: vi.fn().mockResolvedValue(undefined),
      claimRoleForProfile: claimRoleForProfileMock,
      familyId: "famille-voyage-2026",
    });

    render(<App />);

    openCreateProfileDialog();
    const input = screen.getByPlaceholderText(/Ex: Maman, Papa, L.o/);
    fireEvent.change(input, { target: { value: "Oncle" } });
    fireEvent.click(screen.getByRole("button", { name: "Créer un nouveau profil" }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Créer votre profil" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /voyage avec vous/i }));
    fireEvent.change(screen.getByPlaceholderText("Code transmis par le propriétaire"), {
      target: { value: "mauvais-code" },
    });
    fireEvent.change(screen.getByPlaceholderText("Minimum 4 caractères"), {
      target: { value: "new-profile-pw" },
    });
    fireEvent.change(screen.getByPlaceholderText("Ex: Quel est votre plat préféré ?"), {
      target: { value: "Quel est votre dessert préféré ?" },
    });
    fireEvent.change(screen.getByPlaceholderText("Votre réponse personnelle (min. 5 caractères)"), {
      target: { value: "Tiramisu" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Continuer" }));

    await waitFor(() => {
      expect(screen.getByText("Code voyageur incorrect. Réessayez, ou choisissez Visiteur.")).toBeInTheDocument();
    });
    expect(screen.getByRole("heading", { name: "Créer votre profil" })).toBeInTheDocument();
    expect(claimRoleForProfileMock).not.toHaveBeenCalled();
  });

  it("does not wipe the freshly-set password/recovery when claimRoleForProfile's role-only echo lands before our own full push (story 18.9 regression)", async () => {
    // Regression test: claimRoleForProfile writes a role/surname-only record
    // to Firebase via its own transaction, separate from the full profile
    // push that carries the password/recovery hashes. If the realtime cloud
    // snapshot reflects that intermediate, password-less record before our
    // own full push lands, a naive cloud-hydration effect would copy the
    // "no password" state back into local state and permanently erase the
    // password/recovery the user just set at creation time.
    const pushSnapshotMock = vi.fn();
    let currentSnapshot = {
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
    pushSnapshotMock.mockImplementation(async (payload: Record<string, unknown>) => {
      const profileId = payload.profileId as string;
      currentSnapshot = {
        ...currentSnapshot,
        launchGateCompletedCycleByProfile: {
          ...(currentSnapshot.launchGateCompletedCycleByProfile as Record<string, number>),
          [profileId]: 1,
        },
        profiles: {
          ...currentSnapshot.profiles,
          [profileId]: {
            ...(currentSnapshot.profiles as Record<string, unknown>)[profileId],
            profileId,
            surname: payload.surname,
            role: payload.role,
            passwordHash: payload.profilePasswordHash,
            recoveryHash: payload.profileRecoveryHash,
            recoveryQuestion: payload.profileRecoveryQuestion,
            recoveryAnswer: payload.profileRecoveryAnswer,
            createdAt: 1,
            lastSyncAt: 1,
            checklist: {},
            gameResults: [],
            phase: "during",
          },
        },
      } as typeof baseSnapshot;
    });

    claimRoleForProfileMock.mockImplementation(async (profileId: string, surname: string) => {
      // Simulate the realtime listener echoing claimRoleForProfile's own
      // Firebase transaction back *before* our full password/recovery push
      // has had a chance to land: role/surname only, no password fields yet.
      currentSnapshot = {
        ...currentSnapshot,
        familyState: {
          ...currentSnapshot.familyState,
          profiles: [
            ...currentSnapshot.familyState.profiles,
            { id: profileId, role: "utilisateur" as const },
          ],
        },
        launchGateCompletedCycleByProfile: {
          ...(currentSnapshot.launchGateCompletedCycleByProfile as Record<string, number>),
          [profileId]: 1,
        },
        profiles: {
          ...currentSnapshot.profiles,
          [profileId]: {
            profileId,
            surname,
            role: "utilisateur" as const,
            createdAt: 1,
            lastSyncAt: 1,
            checklist: {},
            gameResults: [],
            phase: "during" as const,
          },
        },
      };
      return { assignedRole: "utilisateur" as const, familyState: currentSnapshot.familyState };
    });

    cloudSyncMock.mockImplementation(() => ({
      cloudEnabled: true,
      cloudReady: true,
      cloudAuthError: null,
      cloudActorUid: "actor-1",
      cloudSnapshot: currentSnapshot,
      pushSnapshot: pushSnapshotMock,
      claimRoleForProfile: claimRoleForProfileMock,
      familyId: "famille-voyage-2026",
    }));

    render(<App />);

    openCreateProfileDialog();
    const input = screen.getByPlaceholderText(/Ex: Maman, Papa, L.o/);
    fireEvent.change(input, { target: { value: "Emma" } });
    fireEvent.click(screen.getByRole("button", { name: "Créer un nouveau profil" }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Créer votre profil" })).toBeInTheDocument();
    });

    fillMandatoryProfileCreationFields();
    fireEvent.click(screen.getByRole("button", { name: "Continuer" }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "On est parti !" })).toBeInTheDocument();
    });

    const activeProfileId = localStorage.getItem("jp-active-profile-id")!;
    const expectedPasswordHash = await hashProfilePassword("new-profile-pw");

    await waitFor(() => {
      const finalProfile = currentSnapshot.profiles[
        activeProfileId as keyof typeof currentSnapshot.profiles
      ] as unknown as { passwordHash?: string; recoveryQuestion?: string } | undefined;
      expect(finalProfile?.passwordHash).toBe(expectedPasswordHash);
      expect(finalProfile?.recoveryQuestion).toBe("Quel est votre dessert préféré ?");
    });
  });

  it("does not fall back to utilisateur when claimRoleForProfile's role-only echo (\"utilisateur\") lands before our own visiteur push (story 24.1 regression)", async () => {
    // Regression test: claimRoleForProfile's own Firebase transaction always
    // writes "utilisateur" for a non-owner profile (it only knows about
    // proprietaire/utilisateur) — the "Visiteur" choice applies a local
    // override *after* that transaction resolves. If the realtime cloud
    // snapshot echoes that intermediate "utilisateur" write before our own
    // follow-up push (with role "visiteur") lands, a naive cloud-hydration
    // effect would copy "utilisateur" back into local state and the profile
    // would permanently stay "utilisateur" instead of "visiteur".
    const pushSnapshotMock = vi.fn();
    let currentSnapshot = {
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
    pushSnapshotMock.mockImplementation(async (payload: Record<string, unknown>) => {
      const profileId = payload.profileId as string;
      currentSnapshot = {
        ...currentSnapshot,
        launchGateCompletedCycleByProfile: {
          ...(currentSnapshot.launchGateCompletedCycleByProfile as Record<string, number>),
          [profileId]: 1,
        },
        profiles: {
          ...currentSnapshot.profiles,
          [profileId]: {
            ...(currentSnapshot.profiles as Record<string, unknown>)[profileId],
            profileId,
            surname: payload.surname,
            role: payload.role,
            createdAt: 1,
            lastSyncAt: 1,
            checklist: {},
            gameResults: [],
            phase: "during",
          },
        },
      } as typeof baseSnapshot;
    });

    claimRoleForProfileMock.mockImplementation(async (profileId: string, surname: string) => {
      // Simulate the realtime listener echoing claimRoleForProfile's own
      // Firebase transaction back *before* our own visiteur-role push lands:
      // role "utilisateur" only, exactly like the real transaction.
      currentSnapshot = {
        ...currentSnapshot,
        familyState: {
          ...currentSnapshot.familyState,
          profiles: [
            ...currentSnapshot.familyState.profiles,
            { id: profileId, role: "utilisateur" as const },
          ],
        },
        launchGateCompletedCycleByProfile: {
          ...(currentSnapshot.launchGateCompletedCycleByProfile as Record<string, number>),
          [profileId]: 1,
        },
        profiles: {
          ...currentSnapshot.profiles,
          [profileId]: {
            profileId,
            surname,
            role: "utilisateur" as const,
            createdAt: 1,
            lastSyncAt: 1,
            checklist: {},
            gameResults: [],
            phase: "during" as const,
          },
        },
      };
      return { assignedRole: "utilisateur" as const, familyState: currentSnapshot.familyState };
    });

    cloudSyncMock.mockImplementation(() => ({
      cloudEnabled: true,
      cloudReady: true,
      cloudAuthError: null,
      cloudActorUid: "actor-1",
      cloudSnapshot: currentSnapshot,
      pushSnapshot: pushSnapshotMock,
      claimRoleForProfile: claimRoleForProfileMock,
      familyId: "famille-voyage-2026",
    }));

    render(<App />);

    openCreateProfileDialog();
    const input = screen.getByPlaceholderText(/Ex: Maman, Papa, L.o/);
    fireEvent.change(input, { target: { value: "Tonton" } });
    fireEvent.click(screen.getByRole("button", { name: "Créer un nouveau profil" }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Créer votre profil" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /suivre le voyage/i }));
    fireEvent.change(screen.getByPlaceholderText("Minimum 4 caractères"), {
      target: { value: "new-profile-pw" },
    });
    fireEvent.change(screen.getByPlaceholderText("Ex: Quel est votre plat préféré ?"), {
      target: { value: "Quel est votre dessert préféré ?" },
    });
    fireEvent.change(screen.getByPlaceholderText("Votre réponse personnelle (min. 5 caractères)"), {
      target: { value: "Tiramisu" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Continuer" }));

    // claimRoleForProfile n'est plus appelé en mode cloud (supprimé pour éviter
    // le reset via re-sync Firebase). La vérification porte sur le rôle poussé
    // par l'auto-push, pas sur l'écho de la transaction.
    expect(claimRoleForProfileMock).not.toHaveBeenCalled();

    // Le visiteur atterrit sur la LaunchGateScreen ("On est parti !") puisque
    // son cycle launch gate n'est pas encore marqué complété.
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "On est parti !" })).toBeInTheDocument();
    });

    const activeProfileId = localStorage.getItem("jp-active-profile-id")!;
    await waitFor(() => {
      const matchingCall = pushSnapshotMock.mock.calls.find(
        (call) => (call[0] as { profileId: string }).profileId === activeProfileId
      );
      expect((matchingCall?.[0] as { role?: string })?.role).toBe("visiteur");
    });
  });

  it("does not merge the new profile into the shared roster when the cloud claim fails, to avoid a later owner push creating an orphan blank-surname profile", async () => {
    // Regression test: when claimRoleForProfile fails (returns null) while
    // cloud is enabled, the app must still let the user proceed locally, but
    // must NOT add the new profile id to shared familyState — otherwise a
    // later owner push would write a bare `role` for that id in Firebase
    // (via the owner-only role-sync loop) with no surname ever set, creating
    // an orphan "Utilisateur" profile with a blank name.
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

    const pushSnapshotMock = vi.fn().mockResolvedValue(undefined);
    claimRoleForProfileMock.mockResolvedValue(null);
    cloudSyncMock.mockReturnValue({
      cloudEnabled: true,
      cloudReady: true,
      cloudAuthError: null,
      cloudActorUid: "actor-1",
      cloudSnapshot: unlockedSnapshot,
      pushSnapshot: pushSnapshotMock,
      claimRoleForProfile: claimRoleForProfileMock,
      familyId: "famille-voyage-2026",
    });

    render(<App />);

    openCreateProfileDialog();
    const input = screen.getByPlaceholderText(/Ex: Maman, Papa, L.o/);
    fireEvent.change(input, { target: { value: "Emma" } });
    fireEvent.click(screen.getByRole("button", { name: "Créer un nouveau profil" }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Créer votre profil" })).toBeInTheDocument();
    });

    fillMandatoryProfileCreationFields();
    fireEvent.click(screen.getByRole("button", { name: "Continuer" }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "On est parti !" })).toBeInTheDocument();
    });

    const activeProfileId = localStorage.getItem("jp-active-profile-id");
    expect(activeProfileId).toMatch(/^profile-/);

    await waitFor(() => {
      expect(pushSnapshotMock).toHaveBeenCalled();
    });

    for (const call of pushSnapshotMock.mock.calls) {
      const payload = call[0] as { familyState: { profiles: Array<{ id: string }> } };
      const includesOrphan = payload.familyState.profiles.some(
        (p) => p.id === activeProfileId
      );
      expect(includesOrphan).toBe(false);
    }

    const expectedPasswordHash = await hashProfilePassword("new-profile-pw");
    const matchingCall = pushSnapshotMock.mock.calls.find(
      (call) => (call[0] as { profileId: string }).profileId === activeProfileId
    );
    expect(matchingCall).toBeDefined();
    expect((matchingCall![0] as { profilePasswordHash: string }).profilePasswordHash).toBe(
      expectedPasswordHash
    );
  });

  it("requires password for protected profile and keeps generic error messaging", async () => {
    const protectedHash = await hashProfilePassword("secret-1234");
    const protectedSnapshot = {
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

    loginWithProfileLabel(/Léo/i);

    expect(screen.getByText("Profil protégé")).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText("Votre mot de passe"), {
      target: { value: "wrong-password" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Se connecter" }));

    await waitFor(() => {
      expect(
        screen.getByText("Authentification impossible. Vérifiez les informations saisies.")
      ).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText("Votre mot de passe"), {
      target: { value: "secret-1234" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Se connecter" }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Jour\s+1/i })).toBeInTheDocument();
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

    loginWithProfileLabel(/Léo/i);

    await waitFor(() => {
      expect(
        screen.getByText("Authentification impossible. Vérifiez les informations saisies.")
      ).toBeInTheDocument();
    });
    expect(screen.queryByRole("heading", { name: "Préparation des bagages" })).not.toBeInTheDocument();
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
    expect(screen.queryByRole("heading", { name: "Préparation des bagages" })).not.toBeInTheDocument();
  });

  it("does not show a button to remove a configured profile password", async () => {
    render(<App />);

    loginWithProfileLabel(/Maman/i);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Préparation des bagages" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Paramètres" }));

    fireEvent.change(screen.getAllByPlaceholderText("Minimum 4 caractères")[0], {
      target: { value: "safe-pass" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Définir le mot de passe" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Changer le mot de passe en session" })).toBeInTheDocument();
    });

    expect(screen.queryByRole("button", { name: "Retirer le mot de passe" })).not.toBeInTheDocument();
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

    loginWithProfileLabel(/Léo/i);

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

    loginWithProfileLabel(/Léo/i);

    expect(screen.queryByRole("button", { name: "Mot de passe oublié ?" })).not.toBeInTheDocument();
  });

  it("resets password via recovery answer and authenticates", async () => {
    const protectedHash = await hashProfilePassword("secret-1234");
    const recoveryHash = await hashOwnerRecoveryPhrase("my first travel");
    const expectedNewHash = await hashProfilePassword("new-pass");
    const pushSnapshotMock = vi.fn().mockResolvedValue(undefined);
    const protectedSnapshot = {
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

    loginWithProfileLabel(/Léo/i);
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
      expect(screen.getByRole("heading", { name: /Jour\s+1/i })).toBeInTheDocument();
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

    loginWithProfileLabel(/Léo/i);
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
    expect(screen.queryByRole("heading", { name: "Préparation des bagages" })).not.toBeInTheDocument();
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

    loginWithProfileLabel(/Léo/i);
    fireEvent.click(screen.getByRole("button", { name: "Mot de passe oublié ?" }));
    fireEvent.click(screen.getByRole("button", { name: "Annuler" }));

    expect(screen.getByPlaceholderText("Votre mot de passe")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Se connecter" })).toBeInTheDocument();
  });

  it("changes password in session using current password and keeps login flow behavior", async () => {
    const currentHash = await hashProfilePassword("secret-1234");
    const expectedNewHash = await hashProfilePassword("new-secret-1234");
    const pushSnapshotMock = vi.fn().mockResolvedValue(undefined);
    const protectedSnapshot = {
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

    loginWithProfileLabel(/Léo/i);
    fireEvent.change(screen.getByPlaceholderText("Votre mot de passe"), {
      target: { value: "secret-1234" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Se connecter" }));

    await waitFor(() => {
      expect(screen.getByText(/Jour\s+1/i)).toBeInTheDocument();
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

    loginWithProfileLabel(/Léo/i);

    expect(screen.getByText("Profil protégé")).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText("Votre mot de passe"), {
      target: { value: "wrong-password" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Se connecter" }));
    await waitFor(() => {
      expect(
        screen.getByText("Authentification impossible. Vérifiez les informations saisies.")
      ).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText("Votre mot de passe"), {
      target: { value: "secret-1234" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Se connecter" }));
    await waitFor(() => {
      expect(screen.getByText(/Jour\s+1/i)).toBeInTheDocument();
    });
  });

  it("rejects in-session current-password proof with generic error", async () => {
    const currentHash = await hashProfilePassword("secret-1234");
    const pushSnapshotMock = vi.fn().mockResolvedValue(undefined);
    const protectedSnapshot = {
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

    loginWithProfileLabel(/Léo/i);
    fireEvent.change(screen.getByPlaceholderText("Votre mot de passe"), {
      target: { value: "secret-1234" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Se connecter" }));

    await waitFor(() => {
      expect(screen.getByText(/Jour\s+1/i)).toBeInTheDocument();
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

    loginWithProfileLabel(/Léo/i);
    fireEvent.change(screen.getByPlaceholderText("Votre mot de passe"), {
      target: { value: "secret-1234" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Se connecter" }));

    await waitFor(() => {
      expect(screen.getByText(/Jour\s+1/i)).toBeInTheDocument();
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

    loginWithProfileLabel(/Léo/i);
    fireEvent.change(screen.getByPlaceholderText("Votre mot de passe"), {
      target: { value: "secret-1234" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Se connecter" }));

    await waitFor(() => {
      expect(screen.getByText(/Jour\s+1/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Paramètres" }));
    fireEvent.click(screen.getByRole("button", { name: "Changer le mot de passe en session" }));

    expect(screen.queryByRole("button", { name: "Réponse de récupération" })).not.toBeInTheDocument();
  });

  it("validates mismatch and minimum length in session password change flow", async () => {
    const currentHash = await hashProfilePassword("secret-1234");
    const protectedSnapshot = {
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

    loginWithProfileLabel(/Léo/i);
    fireEvent.change(screen.getByPlaceholderText("Votre mot de passe"), {
      target: { value: "secret-1234" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Se connecter" }));

    await waitFor(() => {
      expect(screen.getByText(/Jour\s+1/i)).toBeInTheDocument();
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

  // --- Story 10.9: show/hide visibility toggles ----------------------------

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

    loginWithProfileLabel(/Léo/i);

    const passwordInput = screen.getByPlaceholderText("Votre mot de passe");
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

    loginWithProfileLabel(/Léo/i);
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

    loginWithProfileLabel(/Léo/i);
    fireEvent.change(screen.getByPlaceholderText("Votre mot de passe"), {
      target: { value: "secret-1234" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Se connecter" }));

    await waitFor(() => {
      expect(screen.getByText(/Jour\s+1/i)).toBeInTheDocument();
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

describe("App profile deletion (story 18.3)", () => {
  beforeEach(() => {
    localStorage.clear();
    cloudSyncMock.mockReset();
    claimRoleForProfileMock.mockReset();
    deleteProfileMock.mockReset();
    claimRoleForProfileMock.mockResolvedValue(null);
    deleteProfileMock.mockResolvedValue(undefined);
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
      deleteProfile: deleteProfileMock,
      familyId: "famille-voyage-2026",
    });
  });

  it("non-owner profile sees delete action in settings; owner profile does not", async () => {
    render(<App />);

    // Login as non-owner (Léo = p2, utilisateur)
    loginWithProfileLabel(/Léo/i);

    await waitFor(() => {
      expect(screen.getByText(/Jour\s+1/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Paramètres" }));

    expect(screen.getByRole("button", { name: "Supprimer mon profil" })).toBeInTheDocument();
  });

  it("owner profile does not see delete action in settings", async () => {
    render(<App />);

    // Login as owner (Maman = p1, proprietaire)
    loginWithProfileLabel(/Maman/i);

    await waitFor(() => {
      expect(screen.getByText(/Jour\s+1/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Paramètres" }));

    expect(screen.queryByRole("button", { name: "Supprimer mon profil" })).not.toBeInTheDocument();
  });

  it("visiteur profile sees delete action in settings and can delete itself, same as a voyageur (story 24.x)", async () => {
    cloudSyncMock.mockReturnValue({
      cloudEnabled: true,
      cloudReady: true,
      cloudAuthError: null,
      cloudActorUid: "actor-1",
      cloudSnapshot: {
        ...baseSnapshot,
        phase: "during" as const,
        launchGateCompletedCycleByProfile: {
          ...(baseSnapshot.launchGateCompletedCycleByProfile as Record<string, number>),
          p3: 1,
        },
        familyState: {
          ...baseSnapshot.familyState,
          profiles: [
            ...baseSnapshot.familyState.profiles,
            { id: "p3", role: "visiteur" as const },
          ],
        },
        profiles: {
          ...baseSnapshot.profiles,
          p3: {
            profileId: "p3",
            surname: "Tonton",
            role: "visiteur" as const,
            createdAt: 1,
            lastSyncAt: 1,
            checklist: {},
            gameResults: [],
            phase: "during" as const,
          },
        },
      },
      pushSnapshot: vi.fn().mockResolvedValue(undefined),
      claimRoleForProfile: claimRoleForProfileMock,
      deleteProfile: deleteProfileMock,
      familyId: "famille-voyage-2026",
    });

    render(<App />);

    // Login as visiteur (Tonton = p3, no password configured)
    loginWithProfileLabel(/Tonton/i);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Paramètres" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Paramètres" }));

    expect(screen.getByRole("button", { name: "Supprimer mon profil" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Supprimer mon profil" }));
    fireEvent.click(screen.getByRole("button", { name: "Supprimer définitivement" }));

    await waitFor(() => {
      expect(deleteProfileMock).toHaveBeenCalledWith("p3");
    });
  });

  it("no-password flow: warning dialog shows and confirm deletes and redirects to login screen", async () => {
    render(<App />);

    loginWithProfileLabel(/Léo/i);

    await waitFor(() => {
      expect(screen.getByText(/Jour\s+1/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Paramètres" }));
    fireEvent.click(screen.getByRole("button", { name: "Supprimer mon profil" }));

    // Warning dialog should be visible — check for unique text
    expect(screen.getByText(/irréversible/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Supprimer définitivement" }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Se connecter" })).toBeInTheDocument();
    });

    expect(deleteProfileMock).toHaveBeenCalledOnce();
    expect(deleteProfileMock).toHaveBeenCalledWith("p2");
  });

  it("password-protected flow: wrong credential blocks deletion and keeps data intact", async () => {
    const protectedHash = await hashProfilePassword("correct-pw");
    const protectedSnapshot = {
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
      deleteProfile: deleteProfileMock,
      familyId: "famille-voyage-2026",
    });

    render(<App />);

    loginWithProfileLabel(/Léo/i);
    fireEvent.change(screen.getByPlaceholderText("Votre mot de passe"), {
      target: { value: "correct-pw" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Se connecter" }));

    await waitFor(() => {
      expect(screen.getByText(/Jour\s+1/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Paramètres" }));
    fireEvent.click(screen.getByRole("button", { name: "Supprimer mon profil" }));
    fireEvent.click(screen.getByRole("button", { name: "Continuer" }));

    fireEvent.change(screen.getByPlaceholderText("Mot de passe du profil"), {
      target: { value: "wrong-password" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Supprimer définitivement" }));

    await waitFor(() => {
      expect(screen.getByText("Authentification impossible. Vérifiez les informations saisies.")).toBeInTheDocument();
    });

    expect(deleteProfileMock).not.toHaveBeenCalled();
    // Should still be in settings (not redirected to login)
    expect(screen.queryByRole("heading", { name: "Se connecter" })).not.toBeInTheDocument();
  });

  it("password-protected flow: correct credential deletes and redirects to login screen", async () => {
    const protectedHash = await hashProfilePassword("my-secret");
    const protectedSnapshot = {
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
      deleteProfile: deleteProfileMock,
      familyId: "famille-voyage-2026",
    });

    render(<App />);

    loginWithProfileLabel(/Léo/i);
    fireEvent.change(screen.getByPlaceholderText("Votre mot de passe"), {
      target: { value: "my-secret" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Se connecter" }));

    await waitFor(() => {
      expect(screen.getByText(/Jour\s+1/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Paramètres" }));
    fireEvent.click(screen.getByRole("button", { name: "Supprimer mon profil" }));
    fireEvent.click(screen.getByRole("button", { name: "Continuer" }));

    fireEvent.change(screen.getByPlaceholderText("Mot de passe du profil"), {
      target: { value: "my-secret" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Supprimer définitivement" }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Se connecter" })).toBeInTheDocument();
    });

    expect(deleteProfileMock).toHaveBeenCalledOnce();
    expect(deleteProfileMock).toHaveBeenCalledWith("p2");
  });

  it("deletion does not affect sibling profile: Maman still visible after Léo is deleted", async () => {
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
      deleteProfile: deleteProfileMock,
      familyId: "famille-voyage-2026",
    });

    render(<App />);

    loginWithProfileLabel(/Léo/i);

    await waitFor(() => {
      expect(screen.getByText(/Jour\s+1/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Paramètres" }));
    fireEvent.click(screen.getByRole("button", { name: "Supprimer mon profil" }));
    fireEvent.click(screen.getByRole("button", { name: "Supprimer définitivement" }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Se connecter" })).toBeInTheDocument();
    });

    // Maman (owner) should still appear in the profile selection list
    fireEvent.click(screen.getByRole("button", { name: "Afficher les profils disponibles" }));
    expect(screen.getByText(/Maman/i)).toBeInTheDocument();
  });

  it("does not resurrect the deleted profile if the cloud snapshot echoes the deletion before local state resets", async () => {
    let resolveDelete: () => void = () => {};
    const deleteInFlight = new Promise<void>((resolve) => {
      resolveDelete = resolve;
    });
    const inFlightDeleteProfileMock = vi.fn().mockImplementation(() => deleteInFlight);
    const pushSnapshotMock = vi.fn().mockResolvedValue(undefined);

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

    const snapshotWithoutP2 = {
      ...unlockedSnapshot,
      familyState: {
        ...unlockedSnapshot.familyState,
        profiles: unlockedSnapshot.familyState.profiles.filter((p) => p.id !== "p2"),
      },
      profiles: { p1: unlockedSnapshot.profiles.p1 },
    };

    let currentReturn = {
      cloudEnabled: true,
      cloudReady: true,
      cloudAuthError: null,
      cloudActorUid: "actor-1",
      cloudSnapshot: unlockedSnapshot,
      pushSnapshot: pushSnapshotMock,
      claimRoleForProfile: claimRoleForProfileMock,
      deleteProfile: inFlightDeleteProfileMock,
      familyId: "famille-voyage-2026",
    };
    cloudSyncMock.mockImplementation(() => currentReturn);

    const { rerender } = render(<App />);

    loginWithProfileLabel(/Léo/i);

    await waitFor(() => {
      expect(screen.getByText(/Jour\s+1/i)).toBeInTheDocument();
    });

    // Ordinary session sync pushes happen while logged in, before any
    // deletion is attempted; only calls from here on are relevant to the race.
    pushSnapshotMock.mockClear();

    fireEvent.click(screen.getByRole("button", { name: "Paramètres" }));
    fireEvent.click(screen.getByRole("button", { name: "Supprimer mon profil" }));
    fireEvent.click(screen.getByRole("button", { name: "Supprimer définitivement" }));

    // The cloud delete call is now in-flight. Simulate Firebase's realtime
    // listener echoing the server-side deletion back to the client before
    // deleteOwnProfile has had a chance to reset local profile state
    // (role/surname still point at the profile being deleted).
    currentReturn = { ...currentReturn, cloudSnapshot: snapshotWithoutP2 };
    rerender(<App />);

    expect(pushSnapshotMock).not.toHaveBeenCalled();

    resolveDelete();

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Se connecter" })).toBeInTheDocument();
    });

    expect(pushSnapshotMock).not.toHaveBeenCalled();
  });
});

// --- Metadata hydration (story 10.4) -----------------------------------------

describe("App profile metadata hydration (story 10.4)", () => {
  beforeEach(() => {
    localStorage.clear();
    cloudSyncMock.mockReset();
  });

  it("hydrates gender and householdRole from cloud snapshot on auto-login", async () => {
    localStorage.setItem("jp-active-profile-id", "p2");

    const snapshotWithMeta = {
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

    // In during phase, auto-login lands on dashboard first.
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

  it("profile switch resets checklist metadata state to defaults", async () => {
    localStorage.setItem("jp-active-profile-id", "p2");

    const snapshotWithMeta = {
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
      expect(screen.getByText(/Jour\s+1/i)).toBeInTheDocument();
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

    loginWithProfileLabel(/Maman/i);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Préparation des bagages" })).toBeInTheDocument();
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

    loginWithProfileLabel(/Maman/i);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Préparation des bagages" })).toBeInTheDocument();
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

    loginWithProfileLabel(/Maman/i);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Préparation des bagages" })).toBeInTheDocument();
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




