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
    surveyDestination: "Istanbul",
    todayDestination: "Istanbul",
    todaySubtitle: "Jour de decouverte",
  },
}));

function makeProfile(
  id: string,
  surname: string,
  role: "proprietaire" | "utilisateur" | "visiteur",
  phase: "before" | "during"
) {
  return {
    profileId: id,
    surname,
    role,
    createdAt: 1,
    lastSyncAt: 1,
    checklist: {},
    customChecklistItems: [],
    gameResults: [],
    gameProgress: null,
    destinationSurveyVote: null,
    phase,
  };
}

function makeSnapshot(phase: "before" | "during") {
  return {
    familyState: {
      version: 1,
      ownerProfileId: "p1",
      profiles: [
        { id: "p1", role: "proprietaire" as const },
        { id: "p2", role: "utilisateur" as const },
        { id: "p3", role: "visiteur" as const },
      ],
    },
    ownerCodeHash: "hash",
    ownerCodePlain: "",
    travelerCodeHash: "",
    travelerCodePlain: "",
    ownerRecoveryHash: "",
    ownerGlobalChecklistAdditions: [],
    ownerGlobalChecklistRemovals: {},
    placeComments: {},
    destinationSurvey: {
      p1: {
        profileId: "p1",
        proposals: ["Istanbul"],
        updatedAt: 100,
        authorUid: "owner-uid",
      },
      p2: {
        profileId: "p2",
        proposals: ["ISTANBUL"],
        updatedAt: 100,
        authorUid: "user-uid",
      },
      p3: {
        profileId: "p3",
        proposals: ["Istanbul"],
        updatedAt: 90,
        authorUid: "visitor-uid",
      },
    },
    gameDayOverrides: {},
    phase,
    tripStartDate: "2026-08-16",
    profiles: {
      p1: makeProfile("p1", "Maman", "proprietaire", phase),
      p2: makeProfile("p2", "Leo", "utilisateur", phase),
      p3: makeProfile("p3", "Guest", "visiteur", phase),
    },
    updatedAt: 1,
  };
}

describe("App destination survey integration", () => {
  beforeEach(() => {
    localStorage.clear();
    cloudSyncMock.mockReset();
  });

  it("allows proposal editing and saving before unlock", async () => {
    localStorage.setItem("jp-active-profile-id", "p2");

    cloudSyncMock.mockReturnValue({
      cloudEnabled: true,
      cloudReady: true,
      cloudAuthError: null,
      cloudActorUid: "user-uid",
      cloudSnapshot: makeSnapshot("before"),
      pushSnapshot: vi.fn().mockResolvedValue(undefined),
      claimRoleForProfile: vi.fn().mockResolvedValue(null),
      deleteProfile: vi.fn().mockResolvedValue(undefined),
      setGameDayOverride: vi.fn().mockResolvedValue(undefined),
      resetGameResults: vi.fn().mockResolvedValue(undefined),
      resetGameProgress: vi.fn().mockResolvedValue(undefined),
      registerAsOwnerDevice: vi.fn().mockResolvedValue(undefined),
      familyId: "famille-voyage-2026",
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/Sondage destination/i)).toBeInTheDocument();
    });

    const firstProposal = screen.getByPlaceholderText(/Proposition 1/i);
    fireEvent.change(firstProposal, { target: { value: "Ankara" } });

    fireEvent.click(screen.getByRole("button", { name: /Enregistrer mes propositions/i }));

    await waitFor(() => {
      expect((firstProposal as HTMLInputElement).value).toBe("Ankara");
    });
  });

  it("shows destination results on the results screen after unlock and not in the checklist", async () => {
    localStorage.setItem("jp-active-profile-id", "p2");

    cloudSyncMock.mockReturnValue({
      cloudEnabled: true,
      cloudReady: true,
      cloudAuthError: null,
      cloudActorUid: "user-uid",
      cloudSnapshot: makeSnapshot("during"),
      pushSnapshot: vi.fn().mockResolvedValue(undefined),
      claimRoleForProfile: vi.fn().mockResolvedValue(null),
      deleteProfile: vi.fn().mockResolvedValue(undefined),
      setGameDayOverride: vi.fn().mockResolvedValue(undefined),
      resetGameResults: vi.fn().mockResolvedValue(undefined),
      resetGameProgress: vi.fn().mockResolvedValue(undefined),
      registerAsOwnerDevice: vi.fn().mockResolvedValue(undefined),
      familyId: "famille-voyage-2026",
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Checklist/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Checklist/i }));

    await waitFor(() => {
      expect(screen.getByText(/Voyage déjà débloqué/i)).toBeInTheDocument();
    });

    expect(screen.queryByText(/Sondage destination/i)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Résultats/i }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Tableau des scores/i })).toBeInTheDocument();
    });

    expect(screen.getAllByText(/Maman/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Leo/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Guest/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Challenge destination/i)).toBeInTheDocument();
    expect(screen.getByText(/Destination correcte:/i)).toBeInTheDocument();
    expect(screen.getAllByText(/pts/i).length).toBeGreaterThan(0);
  });

  it("applies destination points to current profile total and podium without summing all profiles", async () => {
    localStorage.setItem("jp-active-profile-id", "p2");
    localStorage.setItem(
      "jp-destination-survey",
      JSON.stringify({
        p2: {
          profileId: "p2",
          proposals: ["Ankara", "Istanbul", "Izmir"],
          updatedAt: 120,
          authorUid: "user-uid",
        },
      })
    );

    const snapshot = makeSnapshot("during");
    snapshot.destinationSurvey.p2 = {
      profileId: "p2",
      proposals: ["Ankara", "Istanbul", "Izmir"],
      updatedAt: 120,
      authorUid: "user-uid",
    };
    snapshot.destinationSurvey.p1 = {
      profileId: "p1",
      proposals: ["Istanbul", "Ankara", "Izmir"],
      updatedAt: 100,
      authorUid: "owner-uid",
    };
    snapshot.destinationSurvey.p3 = {
      profileId: "p3",
      proposals: ["Istanbul", "Ankara", "Izmir"],
      updatedAt: 90,
      authorUid: "visitor-uid",
    };

    cloudSyncMock.mockReturnValue({
      cloudEnabled: true,
      cloudReady: true,
      cloudAuthError: null,
      cloudActorUid: "user-uid",
      cloudSnapshot: snapshot,
      pushSnapshot: vi.fn().mockResolvedValue(undefined),
      claimRoleForProfile: vi.fn().mockResolvedValue(null),
      deleteProfile: vi.fn().mockResolvedValue(undefined),
      setGameDayOverride: vi.fn().mockResolvedValue(undefined),
      resetGameResults: vi.fn().mockResolvedValue(undefined),
      resetGameProgress: vi.fn().mockResolvedValue(undefined),
      registerAsOwnerDevice: vi.fn().mockResolvedValue(undefined),
      familyId: "famille-voyage-2026",
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getAllByRole("button", { name: /Résultats/i }).length).toBeGreaterThan(0);
    });

    fireEvent.click(screen.getAllByRole("button", { name: /Résultats/i })[0]);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Tableau des scores/i })).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText(/Les Explorateurs · 35 points au total/i)).toBeInTheDocument();
    });

    const podiumLabel = screen.getByText(/Podium/i);
    const podiumCard = podiumLabel.parentElement;
    expect(podiumCard?.textContent ?? "").toContain("Leo");
    expect(podiumCard?.textContent ?? "").toContain("35 pts");
  });
});
