import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import App from "./App";

const cloudSyncMock = vi.fn();

vi.mock("../hooks/useCloudSync", () => ({
  useCloudSync: () => cloudSyncMock(),
}));

vi.mock("../content/trip", () => ({
  TRIP: {
    currentDay: 1,
    todayDestination: "Istanbul",
  },
}));

type Snapshot = ReturnType<typeof buildSnapshot>;

function buildSnapshot(options: {
  leoGameResults?: Array<{ day: number; totalScore: number }>;
  gameDayOverrides?: Record<number, "open" | "closed">;
}) {
  const leoGameResults = (options.leoGameResults ?? []).map((entry) => ({
    day: entry.day,
    location: "Istanbul",
    quizScore: entry.totalScore,
    correctCount: 1,
    riddleSolved: false,
    challengeDone: false,
    durationSec: 60,
    totalScore: entry.totalScore,
    completedAt: "2026-07-15T10:00:00.000Z",
  }));

  return {
    familyState: {
      version: 1,
      ownerProfileId: "p1",
      profiles: [
        { id: "p1", role: "proprietaire" as const },
        { id: "p2", role: "utilisateur" as const },
      ],
    },
    ownerCodeHash: "",
    phase: "during" as const,
    launchGateCycle: 1,
    launchGateCompletedCycleByProfile: {
      p1: 1,
      p2: 1,
    },
    gameDayOverrides: options.gameDayOverrides ?? {},
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
      p2: {
        profileId: "p2",
        surname: "Léo",
        role: "utilisateur" as const,
        createdAt: 1,
        lastSyncAt: 1,
        checklist: {},
        gameResults: leoGameResults,
        phase: "during" as const,
      },
    },
    updatedAt: 1,
  };
}

function mockCloudSync(snapshot: Snapshot) {
  cloudSyncMock.mockReturnValue({
    cloudEnabled: true,
    cloudReady: true,
    cloudAuthError: null,
    cloudActorUid: "actor-1",
    cloudSnapshot: snapshot,
    pushSnapshot: vi.fn().mockResolvedValue(undefined),
    claimRoleForProfile: vi.fn().mockResolvedValue(null),
    deleteProfile: vi.fn().mockResolvedValue(undefined),
    setGameDayOverride: vi.fn().mockResolvedValue(undefined),
    resetGameResults: vi.fn().mockResolvedValue(undefined),
    registerAsOwnerDevice: vi.fn().mockResolvedValue(undefined),
    familyId: "famille-voyage-2026",
  });
}

async function loginAs(surnamePattern: RegExp) {
  fireEvent.click(screen.getByRole("button", { name: surnamePattern }));
  fireEvent.click(screen.getByRole("button", { name: "Se connecter avec ce profil" }));
  await waitFor(() => {
    expect(screen.getByRole("button", { name: "Jeu" })).toBeInTheDocument();
  });
}

function goToGameScreen() {
  fireEvent.click(screen.getByRole("button", { name: "Jeu" }));
}

describe("Story 19.1 — verrouillage du défi du jour + override propriétaire", () => {
  beforeEach(() => {
    localStorage.clear();
    cloudSyncMock.mockReset();
  });

  it("blocks a profile that already completed today's challenge and shows the score obtained", async () => {
    mockCloudSync(buildSnapshot({ leoGameResults: [{ day: 1, totalScore: 42 }] }));
    render(<App />);

    await loginAs(/Léo/i);
    goToGameScreen();

    await waitFor(() => {
      expect(screen.getByText("Défi du jour déjà relevé !")).toBeInTheDocument();
    });
    expect(screen.getByText("42 pts")).toBeInTheDocument();
    expect(screen.getByText("Revenez demain pour un nouveau défi !")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /C'est parti/i })).not.toBeInTheDocument();
  });

  it("still allows a profile that has not played today to start the challenge normally", async () => {
    mockCloudSync(buildSnapshot({ leoGameResults: [] }));
    render(<App />);

    await loginAs(/Léo/i);
    goToGameScreen();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /C'est parti/i })).toBeInTheDocument();
    });
    expect(screen.queryByText("Défi du jour déjà relevé !")).not.toBeInTheDocument();
  });

  it("lets the owner force-open the day, allowing replay even though the profile already played", async () => {
    mockCloudSync(
      buildSnapshot({
        leoGameResults: [{ day: 1, totalScore: 42 }],
        gameDayOverrides: { 1: "open" },
      })
    );
    render(<App />);

    await loginAs(/Léo/i);
    goToGameScreen();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /C'est parti/i })).toBeInTheDocument();
    });
    expect(screen.queryByText("Défi du jour déjà relevé !")).not.toBeInTheDocument();
  });

  it("lets the owner force-close the day, blocking play even for a profile that has not played yet", async () => {
    mockCloudSync(
      buildSnapshot({
        leoGameResults: [],
        gameDayOverrides: { 1: "closed" },
      })
    );
    render(<App />);

    await loginAs(/Léo/i);
    goToGameScreen();

    await waitFor(() => {
      expect(screen.getByText("Jeu fermé pour le moment")).toBeInTheDocument();
    });
    expect(screen.queryByRole("button", { name: /C'est parti/i })).not.toBeInTheDocument();
  });
});
