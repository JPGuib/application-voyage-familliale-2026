import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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
  includeVisitor?: boolean;
  tripStartDate?: string | null;
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

  const profiles: {
    p1: {
      profileId: string;
      surname: string;
      role: "proprietaire";
      createdAt: number;
      lastSyncAt: number;
      checklist: Record<string, never>;
      gameResults: never[];
      phase: "during";
    };
    p2: {
      profileId: string;
      surname: string;
      role: "utilisateur";
      createdAt: number;
      lastSyncAt: number;
      checklist: Record<string, never>;
      gameResults: {
        day: number;
        location: string;
        quizScore: number;
        correctCount: number;
        riddleSolved: boolean;
        challengeDone: boolean;
        durationSec: number;
        totalScore: number;
        completedAt: string;
      }[];
      phase: "during";
    };
    p3?: {
      profileId: string;
      surname: string;
      role: "visiteur";
      createdAt: number;
      lastSyncAt: number;
      checklist: Record<string, never>;
      gameResults: never[];
      phase: "during";
    };
  } = {
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
  };

  if (options.includeVisitor) {
    profiles.p3 = {
      profileId: "p3",
      surname: "Nina",
      role: "visiteur" as const,
      createdAt: 1,
      lastSyncAt: 1,
      checklist: {},
      gameResults: [],
      phase: "during" as const,
    };
  }

  return {
    familyState: {
      version: 1,
      ownerProfileId: "p1",
      profiles: [
        { id: "p1", role: "proprietaire" as const },
        { id: "p2", role: "utilisateur" as const },
        ...(options.includeVisitor ? [{ id: "p3", role: "visiteur" as const }] : []),
      ],
    },
    ownerCodeHash: "",
    phase: "during" as const,
    tripStartDate: options.tripStartDate ?? null,
    launchGateCycle: 1,
    launchGateCompletedCycleByProfile: {
      p1: 1,
      p2: 1,
      ...(options.includeVisitor ? { p3: 1 } : {}),
    },
    gameDayOverrides: options.gameDayOverrides ?? {},
    profiles,
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

function loginWithProfileLabel(profileLabelPattern: RegExp) {
  const input = screen.getByPlaceholderText("Sélectionnez un profil");
  const typedPrefix = profileLabelPattern.source.replace(/[^\p{L}\p{N}]/gu, "").slice(0, 3);
  fireEvent.change(input, { target: { value: typedPrefix } });

  const matchingProfileButton = screen.getByText(profileLabelPattern);
  fireEvent.click(matchingProfileButton);
  fireEvent.click(screen.getByRole("button", { name: "Se connecter" }));
}

async function loginAs(surnamePattern: RegExp) {
  loginWithProfileLabel(surnamePattern);
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

  it("allows visitors to replay post-trip with day picker and without score locking", async () => {
    mockCloudSync(
      buildSnapshot({
        includeVisitor: true,
        tripStartDate: "2026-07-01",
      })
    );
    render(<App />);

    await loginAs(/Nina/i);
    goToGameScreen();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /C'est parti/i })).toBeInTheDocument();
    });
    expect(screen.getByText(/Mode rejeu post-voyage/i)).toBeInTheDocument();
    expect(screen.getByText(/Jour à rejouer/i)).toBeInTheDocument();
    expect(screen.queryByText("Défi du jour déjà relevé !")).not.toBeInTheDocument();

    fireEvent.click(within(screen.getByRole("navigation")).getByRole("button", { name: "Accueil" }));
    await waitFor(() => {
      expect(screen.getByText(/Voyage terminé/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Espace ludique/i }));
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Jeux/i })).toBeInTheDocument();
    });
  });
});
