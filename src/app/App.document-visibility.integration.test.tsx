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

type AppRole = "proprietaire" | "utilisateur" | "visiteur";

function makeProfile(id: string, surname: string, role: AppRole) {
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
    placeVisibilityMap: {},
    documentVisibilityMap: visibility,
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

describe("App document visibility integration (story 26.3)", () => {
  beforeEach(() => {
    localStorage.clear();
    cloudSyncMock.mockReset();
  });

  it("filters the active document category by day and title", async () => {
    localStorage.setItem("jp-active-profile-id", "p2");

    cloudSyncMock.mockReturnValue({
      cloudEnabled: true,
      cloudReady: true,
      cloudAuthError: null,
      cloudActorUid: "actor-user",
      cloudSnapshot: makeSnapshot("utilisateur", {}),
      pushSnapshot: vi.fn().mockResolvedValue(undefined),
      claimRoleForProfile: vi.fn().mockResolvedValue(null),
      familyId: "famille-voyage-2026",
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/Jour\s+1/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Documents" }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Documents et informations importants/i })).toBeInTheDocument();
    });

    expect(screen.getByText(/Nantes → Paris/i)).toBeInTheDocument();
    expect(screen.getByText(/Istanbul → Nantes/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Filtrer cette catégorie/i }));
    fireEvent.click(screen.getByRole("button", { name: /Tous les jours/i }));
    fireEvent.click(screen.getByRole("button", { name: /Jour 10/i }));

    await waitFor(() => {
      expect(screen.queryByText(/Nantes → Paris/i)).not.toBeInTheDocument();
    });
    expect(screen.getByText(/Istanbul → Nantes/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Filtrer les documents par titre/i), {
      target: { value: "Paris" },
    });

    await waitFor(() => {
      expect(screen.getByText(/Aucun document visible pour cette catégorie/i)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/Filtrer les documents par titre/i), {
      target: { value: "Istanbul" },
    });

    await waitFor(() => {
      expect(screen.getByText(/Istanbul → Nantes/i)).toBeInTheDocument();
    });
  });

  it("hides owner-marked documents from non-owner", async () => {
    localStorage.setItem("jp-active-profile-id", "p2");

    cloudSyncMock.mockReturnValue({
      cloudEnabled: true,
      cloudReady: true,
      cloudAuthError: null,
      cloudActorUid: "actor-user",
      cloudSnapshot: makeSnapshot("utilisateur", { "vol-nantes-paris-af7507": "hiddenByOwner" }),
      pushSnapshot: vi.fn().mockResolvedValue(undefined),
      claimRoleForProfile: vi.fn().mockResolvedValue(null),
      familyId: "famille-voyage-2026",
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/Jour\s+1/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Documents" }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Documents et informations importants/i })).toBeInTheDocument();
    });

    expect(screen.queryByText(/Nantes → Paris/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Masqué par le propriétaire/i)).not.toBeInTheDocument();
  });

  it("shows hidden-status indicator for owner on hidden documents", async () => {
    localStorage.setItem("jp-active-profile-id", "p1");

    cloudSyncMock.mockReturnValue({
      cloudEnabled: true,
      cloudReady: true,
      cloudAuthError: null,
      cloudActorUid: "actor-owner",
      cloudSnapshot: makeSnapshot("proprietaire", { "vol-nantes-paris-af7507": "hiddenByOwner" }),
      pushSnapshot: vi.fn().mockResolvedValue(undefined),
      claimRoleForProfile: vi.fn().mockResolvedValue(null),
      familyId: "famille-voyage-2026",
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/Jour\s+1/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Documents" }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Documents et informations importants/i })).toBeInTheDocument();
    });

    expect(screen.getByText(/Nantes → Paris/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Masqué par le propriétaire/i).length).toBeGreaterThan(0);
  });
});
