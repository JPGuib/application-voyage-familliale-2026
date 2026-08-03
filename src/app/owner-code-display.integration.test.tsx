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

function makeSnapshot(ownerCodePlain: string) {
  return {
    familyState: {
      version: 1,
      ownerProfileId: "p1",
      profiles: [{ id: "p1", role: "proprietaire" as const }],
    },
    ownerCodeHash: "hash",
    ownerCodePlain,
    ownerRecoveryHash: "",
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
    },
    updatedAt: 1,
  };
}

async function renderSettingsAsOwner(ownerCodePlain: string) {
  localStorage.setItem("jp-active-profile-id", "p1");
  const snapshot = makeSnapshot(ownerCodePlain);
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

  fireEvent.click(screen.getByRole("button", { name: /Paramètres/i }));

  await waitFor(() => {
    expect(screen.getByRole("heading", { name: /Profil & paramètres/i })).toBeInTheDocument();
  });
}

describe("owner code display in settings (story 18.8)", () => {
  beforeEach(() => {
    localStorage.clear();
    cloudSyncMock.mockReset();
  });

  it("no longer shows the recovery phrase section", async () => {
    await renderSettingsAsOwner("1234");

    expect(screen.queryByText("Phrase de récupération")).not.toBeInTheDocument();
  });

  it("pre-fills the single code field with the current code, masked by default, revealed via the eye icon", async () => {
    await renderSettingsAsOwner("1234");

    const codeInput = screen.getByDisplayValue("1234") as HTMLInputElement;
    expect(codeInput).toHaveAttribute("type", "password");

    fireEvent.click(screen.getByRole("button", { name: "Afficher le code" }));
    expect(codeInput).toHaveAttribute("type", "text");

    fireEvent.click(screen.getByRole("button", { name: "Masquer le code" }));
    expect(codeInput).toHaveAttribute("type", "password");
  });

  it("lets the owner edit the pre-filled field and save a new code", async () => {
    await renderSettingsAsOwner("1234");

    const codeInput = screen.getByDisplayValue("1234");
    fireEvent.change(codeInput, { target: { value: "5678" } });
    fireEvent.click(screen.getByRole("button", { name: "Mettre à jour le code" }));

    await waitFor(() => {
      expect(screen.getByText("Code propriétaire mis à jour.")).toBeInTheDocument();
    });
    expect(screen.getByDisplayValue("5678")).toBeInTheDocument();
  });

  it("re-masks the code field after leaving and returning to settings", async () => {
    await renderSettingsAsOwner("1234");

    fireEvent.click(screen.getByRole("button", { name: "Afficher le code" }));
    expect(screen.getByDisplayValue("1234")).toHaveAttribute("type", "text");

    fireEvent.click(screen.getAllByRole("button", { name: "Accueil" })[0]);
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Préparation des bagages/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Paramètres/i }));
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Profil & paramètres/i })).toBeInTheDocument();
    });

    expect(screen.getByDisplayValue("1234")).toHaveAttribute("type", "password");
  });

  it("shows guidance and an empty field when the code was set before this feature existed", async () => {
    await renderSettingsAsOwner("");

    expect(
      screen.getByText(/saisissez-le à nouveau ci-dessous pour pouvoir le consulter/i)
    ).toBeInTheDocument();
    const [ownerCodeInput] = screen.getAllByPlaceholderText("Minimum 4 caractères");
    expect(ownerCodeInput).toHaveValue("");
  });
});
