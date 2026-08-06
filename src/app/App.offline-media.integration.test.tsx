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

function makeSnapshot() {
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
    ownerCodePlain: "",
    travelerCodeHash: "",
    travelerCodePlain: "",
    ownerRecoveryHash: "",
    ownerGlobalChecklistAdditions: [],
    ownerGlobalChecklistRemovals: {},
    placeComments: {},
    gameDayOverrides: {},
    phase: "during" as const,
    tripStartDate: "2026-08-16",
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
        customChecklistItems: [],
        gameResults: [],
        gameProgress: null,
        phase: "during" as const,
      },
      p2: {
        profileId: "p2",
        surname: "Leo",
        role: "utilisateur" as const,
        createdAt: 1,
        lastSyncAt: 1,
        checklist: {},
        customChecklistItems: [],
        gameResults: [],
        gameProgress: null,
        phase: "during" as const,
      },
    },
    updatedAt: 1,
  };
}

describe("App offline media integration (story 27.2)", () => {
  beforeEach(() => {
    localStorage.clear();
    cloudSyncMock.mockReset();
    localStorage.setItem("jp-active-profile-id", "p1");

    cloudSyncMock.mockReturnValue({
      cloudEnabled: true,
      cloudReady: true,
      cloudAuthError: null,
      cloudActorUid: "actor-owner",
      cloudSnapshot: makeSnapshot(),
      pushSnapshot: vi.fn().mockResolvedValue(undefined),
      claimRoleForProfile: vi.fn().mockResolvedValue(null),
      familyId: "famille-voyage-2026",
    });
  });

  it("shows offline media quick progress section below travel photo links", async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/Polarsteps/i)).toBeInTheDocument();
    });

    expect(screen.getAllByText(/Offline media/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/% téléchargé/i)).toBeInTheDocument();
    expect(screen.getByText(/ressources en cache/i)).toBeInTheDocument();
  });

  it("opens offline media screen from dashboard navigation and shows six tracked sections", async () => {
    render(<App />);

    await waitFor(() => {
      expect(document.querySelector('[data-tutorial-id="dashboard-offline-media"]')).not.toBeNull();
    });

    fireEvent.click(document.querySelector('[data-tutorial-id="dashboard-offline-media"]') as Element);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Offline media/i })).toBeInTheDocument();
    });

    expect(screen.getByText(/Guide du sejour/i)).toBeInTheDocument();
    expect(screen.getByText(/Documents importants/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Histoire/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Geographie et economie/i)).toBeInTheDocument();
    expect(screen.getByText(/Culture et tradition/i)).toBeInTheDocument();
    expect(screen.getAllByText(/^Conseils$/i).length).toBeGreaterThan(0);
  });

  it("disables download actions when app goes offline", async () => {
    render(<App />);

    await waitFor(() => {
      expect(document.querySelector('[data-tutorial-id="dashboard-offline-media"]')).not.toBeNull();
    });

    fireEvent.click(document.querySelector('[data-tutorial-id="dashboard-offline-media"]') as Element);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Offline media/i })).toBeInTheDocument();
    });

    fireEvent(window, new Event("offline"));

    await waitFor(() => {
      expect(screen.getByText(/existing cache remains available/i)).toBeInTheDocument();
    });

    expect(screen.getByRole("button", { name: /Download all/i })).toBeDisabled();
  });

  it("invites the profile to install the app before downloading and checks persistent storage (story 27.3)", async () => {
    render(<App />);

    await waitFor(() => {
      expect(document.querySelector('[data-tutorial-id="dashboard-offline-media"]')).not.toBeNull();
    });

    fireEvent.click(document.querySelector('[data-tutorial-id="dashboard-offline-media"]') as Element);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Offline media/i })).toBeInTheDocument();
    });

    // jsdom has no matchMedia/navigator.standalone, so the app must default
    // to "not installed" and show the reminder rather than assume install.
    expect(screen.getByText(/install this app on your home screen/i)).toBeInTheDocument();
    expect(screen.getAllByText(/persistent storage/i).length).toBeGreaterThan(0);
  });
});
