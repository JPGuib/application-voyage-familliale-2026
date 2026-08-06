import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import App from "./App";
import { PLACES } from "../content/places";

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

type AppRole = "proprietaire" | "utilisateur" | "visiteur";

type SnapshotRole = AppRole;

function makeProfile(id: string, surname: string, role: SnapshotRole) {
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
    phase: "during" as const,
  };
}

function makeSnapshot(activeRole: AppRole, visibility: Record<string, "visible" | "hiddenByOwner">) {
  const activeProfileId = activeRole === "proprietaire" ? "p1" : activeRole === "utilisateur" ? "p2" : "p3";

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
    placeVisibilityMap: visibility,
    destinationSurvey: {},
    gameDayOverrides: {},
    phase: "during" as const,
    tripStartDate: null,
    launchGateCycle: 1,
    launchGateCompletedCycleByProfile: {
      p1: 1,
      p2: 1,
      p3: 1,
    },
    profiles: {
      p1: makeProfile("p1", "Maman", "proprietaire"),
      p2: makeProfile("p2", "Leo", "utilisateur"),
      p3: makeProfile("p3", "Nina", "visiteur"),
      [activeProfileId]: makeProfile(
        activeProfileId,
        activeProfileId === "p1" ? "Maman" : activeProfileId === "p2" ? "Leo" : "Nina",
        activeRole
      ),
    },
    updatedAt: 1,
  };
}

describe("App place visibility integration (story 26.2)", () => {
  beforeEach(() => {
    localStorage.clear();
    cloudSyncMock.mockReset();
  });

  it("hides owner-marked places from non-owner guide and planning", async () => {
    localStorage.setItem("jp-active-profile-id", "p2");

    const hiddenPlace = PLACES[0];
    cloudSyncMock.mockReturnValue({
      cloudEnabled: true,
      cloudReady: true,
      cloudAuthError: null,
      cloudActorUid: "actor-user",
      cloudSnapshot: makeSnapshot("utilisateur", { [hiddenPlace.id]: "hiddenByOwner" }),
      pushSnapshot: vi.fn().mockResolvedValue(undefined),
      claimRoleForProfile: vi.fn().mockResolvedValue(null),
      familyId: "famille-voyage-2026",
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/Jour\s+1/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Séjour" }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Guide du séjour/i })).toBeInTheDocument();
    });

    expect(screen.queryByRole("button", { name: new RegExp(hiddenPlace.name, "i") })).not.toBeInTheDocument();

    const guideBack = document.querySelector('[data-tutorial-id="guide-back"]');
    expect(guideBack).not.toBeNull();
    fireEvent.click(guideBack as Element);
    await waitFor(() => {
      expect(screen.getByText(/Jour\s+1/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Planning complet/i }));
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Planning complet/i })).toBeInTheDocument();
    });

    expect(screen.queryByText(hiddenPlace.name)).not.toBeInTheDocument();
  });

  it("shows hidden-status badge for owner in guide", async () => {
    localStorage.setItem("jp-active-profile-id", "p1");

    const hiddenPlace = PLACES[0];
    cloudSyncMock.mockReturnValue({
      cloudEnabled: true,
      cloudReady: true,
      cloudAuthError: null,
      cloudActorUid: "actor-owner",
      cloudSnapshot: makeSnapshot("proprietaire", { [hiddenPlace.id]: "hiddenByOwner" }),
      pushSnapshot: vi.fn().mockResolvedValue(undefined),
      claimRoleForProfile: vi.fn().mockResolvedValue(null),
      familyId: "famille-voyage-2026",
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/Jour\s+1/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Séjour" }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Guide du séjour/i })).toBeInTheDocument();
    });

    expect(screen.getAllByRole("button", { name: new RegExp(hiddenPlace.name, "i") }).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Masqué par le propriétaire/i).length).toBeGreaterThan(0);
  });
});
