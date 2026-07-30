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
  cloudSyncMock.mockImplementation(() => ({
    cloudEnabled: true,
    cloudReady: true,
    cloudAuthError: null,
    cloudActorUid: "actor-1",
    cloudSnapshot: makeSnapshot(ownerCodePlain),
    pushSnapshot: vi.fn().mockResolvedValue(undefined),
    claimRoleForProfile: vi.fn().mockResolvedValue(null),
    familyId: "famille-voyage-2026",
  }));

  render(<App />);

  await waitFor(() => {
    expect(screen.getByRole("heading", { name: /Préparer nos bagages/i })).toBeInTheDocument();
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

  it("shows the current code masked by default and reveals it on demand", async () => {
    await renderSettingsAsOwner("1234");

    expect(screen.getByText("Code actuel")).toBeInTheDocument();
    expect(screen.queryByText("1234")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Afficher le code actuel" }));
    expect(screen.getByText("1234")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Masquer le code actuel" }));
    expect(screen.queryByText("1234")).not.toBeInTheDocument();
  });

  it("keeps 'afficher le code saisi' (new code) independent from the current code reveal", async () => {
    await renderSettingsAsOwner("1234");

    const newCodeInputs = screen.getAllByPlaceholderText("Minimum 4 caractères");
    fireEvent.change(newCodeInputs[0], {
      target: { value: "5678" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Afficher le code saisi" }));

    expect(screen.getByDisplayValue("5678")).toBeInTheDocument();
    expect(screen.queryByText("1234")).not.toBeInTheDocument();
  });

  it("re-masks the current code after leaving and returning to settings", async () => {
    await renderSettingsAsOwner("1234");

    fireEvent.click(screen.getByRole("button", { name: "Afficher le code actuel" }));
    expect(screen.getByText("1234")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Accueil" }));
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Préparer nos bagages/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Paramètres/i }));
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Profil & paramètres/i })).toBeInTheDocument();
    });

    expect(screen.queryByText("1234")).not.toBeInTheDocument();
  });

  it("shows guidance instead of the code when it was set before this feature existed", async () => {
    await renderSettingsAsOwner("");

    expect(
      screen.getByText(/redéfinissez-le ci-dessous pour pouvoir le consulter/i)
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Afficher le code actuel" })).not.toBeInTheDocument();
  });
});
