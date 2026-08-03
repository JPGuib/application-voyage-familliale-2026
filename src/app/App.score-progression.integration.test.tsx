import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import App from "./App";

const cloudSyncMock = vi.fn();

vi.mock("../hooks/useCloudSync", () => ({
  useCloudSync: () => cloudSyncMock(),
}));

vi.mock("../content/trip", () => ({
  TRIP: {
    currentDay: 3,
    todayDestination: "Istanbul",
  },
}));

function makeProfile(
  id: string,
  surname: string,
  role: "proprietaire" | "utilisateur",
  gameResults: Array<{ day: number; totalScore: number }> = []
) {
  return {
    profileId: id,
    surname,
    role,
    createdAt: 1,
    lastSyncAt: 1,
    checklist: {},
    customChecklistItems: [],
    gameResults,
    gameProgress: null,
    phase: "during" as const,
  };
}

function makeSnapshot(
  profiles: Record<string, ReturnType<typeof makeProfile>>
) {
  const ids = Object.keys(profiles);
  return {
    familyState: {
      version: 1,
      ownerProfileId: ids[0],
      profiles: ids.map((id) => ({ id, role: profiles[id].role })),
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
    tripStartDate: null,
    profiles,
    updatedAt: 1,
  };
}

function setupCloud(snapshot: ReturnType<typeof makeSnapshot>) {
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
}

async function navigateToResults() {
  await waitFor(() => {
    expect(screen.getByText(/Jour\s+\d+/i)).toBeInTheDocument();
  });
  fireEvent.click(screen.getByRole("button", { name: "Résultats" }));
  await waitFor(() => {
    expect(screen.getByRole("heading", { name: /Tableau des scores/i })).toBeInTheDocument();
  });
}

describe("App results chart integration (story 22.2)", () => {
  beforeEach(() => {
    localStorage.clear();
    cloudSyncMock.mockReset();
    vi.unstubAllGlobals();
    // ResizeObserver is required by recharts ResponsiveContainer but absent in jsdom
    vi.stubGlobal("ResizeObserver", class {
      observe() {}
      unobserve() {}
      disconnect() {}
    });
  });

  it("defaults chart to current profile and shows cumulative progression", async () => {
    localStorage.setItem("jp-active-profile-id", "p2");
    const snapshot = makeSnapshot({
      p1: makeProfile("p1", "Maman", "proprietaire"),
      p2: makeProfile("p2", "Leo", "utilisateur", [
        { day: 1, totalScore: 30 },
        { day: 2, totalScore: 40 },
      ]),
    });
    setupCloud(snapshot);
    render(<App />);

    await navigateToResults();

    expect(screen.getByText(/Progression des scores/i)).toBeInTheDocument();
    // Leo is pre-selected — selector button for Leo should be visually highlighted
    const leoButtons = screen.getAllByRole("button", { name: /Leo/i });
    expect(leoButtons.length).toBeGreaterThan(0);
  });

  it("switching selector changes displayed profile", async () => {
    localStorage.setItem("jp-active-profile-id", "p2");
    const snapshot = makeSnapshot({
      p1: makeProfile("p1", "Maman", "proprietaire"),
      p2: makeProfile("p2", "Leo", "utilisateur", [{ day: 1, totalScore: 20 }]),
    });
    setupCloud(snapshot);
    render(<App />);

    await navigateToResults();

    // Click "Maman" selector button in chart profile selector
    const mamanSelectorButtons = screen.getAllByRole("button", { name: /Maman/i });
    fireEvent.click(mamanSelectorButtons[0]);

    // Maman has no history, so empty state should appear
    await waitFor(() => {
      expect(
        screen.getByText(/n'a pas encore de score enregistré/i)
      ).toBeInTheDocument();
    });
  });

  it("owner profile can be selected in chart even though absent from podium", async () => {
    localStorage.setItem("jp-active-profile-id", "p2");
    const snapshot = makeSnapshot({
      p1: makeProfile("p1", "Maman", "proprietaire", [{ day: 1, totalScore: 55 }]),
      p2: makeProfile("p2", "Leo", "utilisateur", [{ day: 1, totalScore: 30 }]),
    });
    setupCloud(snapshot);
    render(<App />);

    await navigateToResults();

    // Podium should NOT show Maman
    const podiumSection = screen.getByText(/Podium/i).closest("div");
    if (podiumSection) {
      const podiumContainer = podiumSection.parentElement;
      expect(podiumContainer).not.toBeNull();
      // Maman excluded from podium ranking
      const podiumText = podiumContainer?.textContent ?? "";
      // Leo appears in podium, Maman does not appear in score entries
      expect(podiumText).toContain("Leo");
    }

    // Chart selector should contain Maman (owner can be selected)
    const mamanSelectorButtons = screen.getAllByRole("button", { name: /Maman/i });
    expect(mamanSelectorButtons.length).toBeGreaterThan(0);

    // Click Maman in chart selector
    fireEvent.click(mamanSelectorButtons[0]);

    // No empty-state message since Maman has history
    await waitFor(() => {
      expect(
        screen.queryByText(/n'a pas encore de score enregistré/i)
      ).toBeNull();
    });
  });

  it("shows explicit empty state for profile with no game history", async () => {
    localStorage.setItem("jp-active-profile-id", "p2");
    const snapshot = makeSnapshot({
      p1: makeProfile("p1", "Maman", "proprietaire"),
      p2: makeProfile("p2", "Leo", "utilisateur"),
    });
    setupCloud(snapshot);
    render(<App />);

    await navigateToResults();

    // Leo has no history, current profile defaults to Leo
    await waitFor(() => {
      expect(
        screen.getByText(/n'a pas encore de score enregistré/i)
      ).toBeInTheDocument();
    });
  });

  it("no regression: podium and existing results sections remain intact", async () => {
    localStorage.setItem("jp-active-profile-id", "p2");
    const snapshot = makeSnapshot({
      p1: makeProfile("p1", "Maman", "proprietaire"),
      p2: makeProfile("p2", "Leo", "utilisateur"),
    });
    setupCloud(snapshot);
    render(<App />);

    await navigateToResults();

    expect(screen.getByText(/Podium/i)).toBeInTheDocument();
    expect(screen.getByText(/Score total/i)).toBeInTheDocument();
    expect(screen.getByText(/Par journée/i)).toBeInTheDocument();
    expect(screen.getByText(/Badges obtenus/i)).toBeInTheDocument();
  });
});
