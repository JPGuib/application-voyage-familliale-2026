import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import App from "./App";

const cloudSyncMock = vi.fn();
const startGlobalTutorialMock = vi.fn().mockResolvedValue(undefined);

vi.mock("../hooks/useCloudSync", () => ({
  useCloudSync: () => cloudSyncMock(),
}));

vi.mock("./tutorials/driver-runtime", () => ({
  startGlobalTutorial: (...args: unknown[]) => startGlobalTutorialMock(...args),
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

function makeSnapshot(phase: "before" | "during") {
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
    ownerRecoveryHash: "",
    phase,
    profiles: {
      p1: {
        profileId: "p1",
        surname: "Maman",
        role: "proprietaire" as const,
        createdAt: 1,
        lastSyncAt: 1,
        checklist: {},
        gameResults: [],
        phase,
      },
      p2: {
        profileId: "p2",
        surname: "Leo",
        role: "utilisateur" as const,
        createdAt: 1,
        lastSyncAt: 1,
        checklist: {},
        gameResults: [],
        phase,
      },
    },
    updatedAt: 1,
  };
}

describe("App tutorial integration (Accueil)", () => {
  beforeEach(() => {
    localStorage.clear();
    cloudSyncMock.mockReset();
    startGlobalTutorialMock.mockClear();
  });

  it("renders tutorial anchors on dashboard and triggers global tutorial launch", async () => {
    localStorage.setItem("jp-active-profile-id", "p1");

    const snapshot = makeSnapshot("during");
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

    const { container } = render(<App />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Jour 1/ })).toBeInTheDocument();
    });

    expect(container.querySelector('[data-tutorial-id="dashboard-settings"]')).toBeTruthy();
    expect(container.querySelector('[data-tutorial-id="dashboard-today-card"]')).toBeTruthy();
    expect(container.querySelector('[data-tutorial-id="dashboard-planning"]')).toBeTruthy();
    expect(container.querySelector('[data-tutorial-id="dashboard-map-preview"]')).toBeTruthy();
    expect(container.querySelector('[data-tutorial-id="bottom-nav-dashboard"]')).toBeTruthy();
    expect(container.querySelector('[data-tutorial-id="dashboard-start-tutorial"]')).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /Tutoriel interactif/i }));

    await waitFor(() => {
      expect(startGlobalTutorialMock).toHaveBeenCalledTimes(1);
    });
  });
});
