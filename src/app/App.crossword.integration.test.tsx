import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
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
    todaySubtitle: "Jour de découverte",
  },
}));

function ownerSnapshot(crosswordProgress: Record<string, unknown> = {}) {
  return {
    familyState: {
      version: 1,
      ownerProfileId: "p1",
      profiles: [{ id: "p1", role: "proprietaire" as const }],
    },
    ownerCodeHash: "hash",
    ownerRecoveryHash: "",
    phase: "during" as const,
    launchGateCycle: 1,
    launchGateCompletedCycleByProfile: { p1: 1 },
    crosswordProgress,
    profiles: {
      p1: {
        profileId: "p1",
        surname: "Maman",
        role: "proprietaire" as const,
        createdAt: 1,
        lastSyncAt: 1,
        checklist: {},
        gameResults: [],
        phase: "during" as const,
      },
    },
    updatedAt: 1,
  };
}

describe("App crossword navigation", () => {
  beforeEach(() => {
    cleanup();
    localStorage.clear();
    localStorage.setItem("jp-active-profile-id", "p1");
    Object.defineProperty(navigator, "onLine", { configurable: true, value: true });
    cloudSyncMock.mockReturnValue({
      cloudEnabled: true,
      cloudReady: true,
      cloudAuthError: null,
      cloudActorUid: "actor-1",
      cloudSnapshot: ownerSnapshot(),
      pushSnapshot: vi.fn().mockResolvedValue(undefined),
      claimRoleForProfile: vi.fn().mockResolvedValue(null),
      familyId: "famille-voyage-2026",
    });
  });

  it("launches the crossword from the arcade hub and returns to the hub", async () => {
    render(<App />);

    await waitFor(() => expect(screen.getByText(/Jour\s+1/i)).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /Espace ludique/i }));
    await waitFor(() => expect(screen.getByRole("heading", { name: /Jeux/i })).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: /Mots fléchés Turquie/i }));
    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "Mots fléchés Turquie" })).toBeInTheDocument()
    );
    expect(screen.getByRole("grid", { name: /Panorama de la Turquie/ })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Retour aux jeux" }));
    await waitFor(() => expect(screen.getByRole("heading", { name: /Jeux/i })).toBeInTheDocument());
  });

  it("launches the bundled crossword through the arcade hub while offline", async () => {
    Object.defineProperty(navigator, "onLine", { configurable: true, value: false });
    render(<App />);

    await waitFor(() => expect(screen.getByText(/Jour\s+1/i)).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /Espace ludique/i }));
    await waitFor(() => expect(screen.getByRole("heading", { name: /Jeux/i })).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: /Mots fléchés Turquie/i }));
    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "Mots fléchés Turquie" })).toBeInTheDocument()
    );
  });

  it("restores only the active profile's saved crossword and saves its next change directly", async () => {
    const saveCrosswordProgress = vi.fn().mockResolvedValue(undefined);
    cloudSyncMock.mockReturnValue({
      cloudEnabled: true,
      cloudReady: true,
      cloudAuthError: null,
      cloudActorUid: "actor-1",
      cloudSnapshot: ownerSnapshot({
        p1: {
          puzzleId: "turquie-general",
          entries: { "0,6": "A" },
          results: { "0,6": "correct" },
          completedPuzzleIds: [],
          updatedAt: 1,
        },
        p2: {
          puzzleId: "turquie-general",
          entries: { "0,6": "Z" },
          results: { "0,6": "wrong" },
          completedPuzzleIds: [],
          updatedAt: 1,
        },
      }),
      pushSnapshot: vi.fn().mockResolvedValue(undefined),
      saveCrosswordProgress,
      claimRoleForProfile: vi.fn().mockResolvedValue(null),
      familyId: "famille-voyage-2026",
    });
    render(<App />);

    await waitFor(() => expect(screen.getByText(/Jour\s+1/i)).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /Espace ludique/i }));
    fireEvent.click(await screen.findByRole("button", { name: /Mots fléchés Turquie/i }));

    const first = await screen.findByRole("textbox", { name: "Case ligne 1, colonne 7" });
    expect(first).toHaveValue("A");
    expect(first.closest("[role='gridcell']")).toHaveAttribute("data-status", "correct");

    fireEvent.change(first, { target: { value: "N" } });
    await waitFor(() =>
      expect(saveCrosswordProgress).toHaveBeenCalledWith(
        "p1",
        expect.objectContaining({ entries: { "0,6": "N" } })
      )
    );
  });
});