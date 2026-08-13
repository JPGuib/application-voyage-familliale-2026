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

function makeProfile(id: string, surname: string, role: "proprietaire" | "utilisateur") {
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
    challengeReactions: {},
    placeVisibilityMap: {},
    placeDayOverrides: {},
    placeDayOrderOverrides: {},
    documentVisibilityMap: {},
    gameDayOverrides: {},
    phase: "during" as const,
    tripStartDate: "2026-08-16",
    launchGateCycle: 1,
    launchGateCompletedCycleByProfile: {
      p1: 1,
      p2: 1,
    },
    profiles: {
      p1: makeProfile("p1", "Maman", "proprietaire"),
      p2: makeProfile("p2", "Leo", "utilisateur"),
    },
    updatedAt: 1,
  };
}

async function openSettings(setTripStartDate: ReturnType<typeof vi.fn>) {
  localStorage.setItem("jp-active-profile-id", "p1");
  cloudSyncMock.mockReturnValue({
    cloudEnabled: true,
    cloudReady: true,
    cloudAuthError: null,
    cloudActorUid: "actor-owner",
    cloudSnapshot: makeSnapshot(),
    pushSnapshot: vi.fn().mockResolvedValue(true),
    claimRoleForProfile: vi.fn().mockResolvedValue(null),
    deleteProfile: vi.fn().mockResolvedValue(undefined),
    setGameDayOverride: vi.fn().mockResolvedValue(undefined),
    setPlaceDayOverride: vi.fn().mockResolvedValue(undefined),
    setTripStartDate,
    resetGameResults: vi.fn().mockResolvedValue(undefined),
    resetGameProgress: vi.fn().mockResolvedValue(undefined),
    registerAsOwnerDevice: vi.fn().mockResolvedValue(undefined),
    pushOwnerPhaseChange: vi.fn().mockResolvedValue(true),
    retryCloudAccess: vi.fn().mockResolvedValue(undefined),
    familyId: "famille-voyage-2026",
  });

  render(<App />);

  await waitFor(() => {
    expect(screen.getByRole("button", { name: /Paramètres/i })).toBeInTheDocument();
  });

  fireEvent.click(screen.getByRole("button", { name: /Paramètres/i }));

  await waitFor(() => {
    expect(screen.getByText(/Date de début du voyage/i)).toBeInTheDocument();
  });
}

describe("App trip start date save", () => {
  beforeEach(() => {
    localStorage.clear();
    cloudSyncMock.mockReset();
  });

  it("persists the owner trip start date to cloud before reporting success", async () => {
    const setTripStartDate = vi.fn().mockResolvedValue(true);
    await openSettings(setTripStartDate);

    fireEvent.change(screen.getByDisplayValue("2026-08-16"), {
      target: { value: "2026-08-12" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Enregistrer la date de début/i }));

    await waitFor(() => {
      expect(setTripStartDate).toHaveBeenCalledWith("2026-08-12");
    });
    expect(screen.getByText("Date de début du voyage mise à jour.")).toBeInTheDocument();
    expect(screen.getByText(/12 août 2026/i)).toBeInTheDocument();
  });

  it("keeps the previous date and shows an error when the cloud write fails", async () => {
    const setTripStartDate = vi.fn().mockResolvedValue(false);
    await openSettings(setTripStartDate);

    fireEvent.change(screen.getByDisplayValue("2026-08-16"), {
      target: { value: "2026-08-12" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Enregistrer la date de début/i }));

    await waitFor(() => {
      expect(setTripStartDate).toHaveBeenCalledWith("2026-08-12");
    });
    expect(
      screen.getByText("Enregistrement impossible. Verifiez la synchronisation cloud puis reessayez.")
    ).toBeInTheDocument();
    expect(screen.getByText(/16 août 2026/i)).toBeInTheDocument();
  });
});
