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

function makeProfile(
  id: string,
  role: "proprietaire" | "utilisateur" | "visiteur",
  phase: "before" | "during"
) {
  return {
    profileId: id,
    surname: id,
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
    destinationSurvey: {},
    gameDayOverrides: {},
    phase,
    tripStartDate: "2026-08-16",
    launchGateCycle: phase === "during" ? 1 : 0,
    launchGateCompletedCycleByProfile: {},
    profiles: {
      p1: makeProfile("p1", "proprietaire", phase),
      p2: makeProfile("p2", "utilisateur", phase),
      p3: makeProfile("p3", "visiteur", phase),
    },
    updatedAt: 1,
  };
}

describe("App launch gate integration", () => {
  beforeEach(() => {
    localStorage.clear();
    cloudSyncMock.mockReset();
  });

  it("shows the dedicated launch gate screen for visitor when phase is before", async () => {
    localStorage.setItem("jp-active-profile-id", "p3");

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
      expect(screen.getByRole("heading", { name: /On est parti/i })).toBeInTheDocument();
    });

    expect(screen.getByRole("button", { name: /Voir le lancement/i })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /Préparation des bagages/i })).not.toBeInTheDocument();
  });

  it("keeps traveler on checklist flow before unlock", async () => {
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
      expect(screen.getByRole("heading", { name: /Préparation des bagages/i })).toBeInTheDocument();
    });

    expect(screen.queryByRole("heading", { name: /On est parti/i })).not.toBeInTheDocument();
  });

  it("keeps owner on normal flow without forcing launch gate", async () => {
    localStorage.setItem("jp-active-profile-id", "p1");

    cloudSyncMock.mockReturnValue({
      cloudEnabled: true,
      cloudReady: true,
      cloudAuthError: null,
      cloudActorUid: "owner-uid",
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
      expect(screen.getByRole("heading", { name: /Préparation des bagages/i })).toBeInTheDocument();
    });

    expect(screen.queryByRole("heading", { name: /On est parti/i })).not.toBeInTheDocument();
  });

  it("shows a clear locked message when non-owner presses launch CTA before unlock", async () => {
    localStorage.setItem("jp-active-profile-id", "p3");

    cloudSyncMock.mockReturnValue({
      cloudEnabled: true,
      cloudReady: true,
      cloudAuthError: null,
      cloudActorUid: "visitor-uid",
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
      expect(screen.getByRole("heading", { name: /On est parti/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Voir le lancement/i }));

    expect(screen.getByText(/Le voyage n a pas commence/i)).toBeInTheDocument();
  });

  it("allows non-owner to enter app only after fallback sequence completes", async () => {
    localStorage.setItem("jp-active-profile-id", "p2");

    const snapshot = makeSnapshot("during");
    snapshot.launchGateCompletedCycleByProfile = {};

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
      expect(screen.getByRole("heading", { name: /On est parti/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Voir le lancement/i }));

    const video = document.querySelector("video");
    expect(video).not.toBeNull();
    fireEvent.error(video as HTMLVideoElement);

    await waitFor(() => {
      expect(screen.getByText(/Étape 1 \/ 6/i)).toBeInTheDocument();
    });

    for (let index = 0; index < 5; index += 1) {
      fireEvent.click(screen.getByRole("button", { name: /Suivant/i }));
    }

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Entrer/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Entrer/i }));

    await waitFor(() => {
      expect(screen.getByText(/Destination du jour/i)).toBeInTheDocument();
    });
  });

  it("forces launch gate again after a new unlock cycle", async () => {
    localStorage.setItem("jp-active-profile-id", "p2");

    let snapshot = makeSnapshot("during");
    snapshot.launchGateCycle = 1;
    snapshot.launchGateCompletedCycleByProfile = { p2: 1 };

    cloudSyncMock.mockImplementation(() => ({
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
    }));

    const view = render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/Destination du jour/i)).toBeInTheDocument();
    });

    snapshot = {
      ...snapshot,
      launchGateCycle: 2,
      launchGateCompletedCycleByProfile: { p2: 1 },
    };
    view.rerender(<App />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /On est parti/i })).toBeInTheDocument();
    });
  });

  it("preserves visitor restrictions after entering the app", async () => {
    localStorage.setItem("jp-active-profile-id", "p3");

    const snapshot = makeSnapshot("during");
    snapshot.launchGateCompletedCycleByProfile = {};

    cloudSyncMock.mockReturnValue({
      cloudEnabled: true,
      cloudReady: true,
      cloudAuthError: null,
      cloudActorUid: "visitor-uid",
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
      expect(screen.getByRole("heading", { name: /On est parti/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Voir le lancement/i }));
    const video = document.querySelector("video");
    fireEvent.error(video as HTMLVideoElement);

    for (let index = 0; index < 5; index += 1) {
      fireEvent.click(screen.getByRole("button", { name: /Suivant/i }));
    }
    fireEvent.click(screen.getByRole("button", { name: /Entrer/i }));

    await waitFor(() => {
      expect(screen.getByText(/Destination du jour/i)).toBeInTheDocument();
    });

    expect(screen.queryByRole("button", { name: /Checklist/i })).not.toBeInTheDocument();
  });

  it("allows owner to open replay from settings at any time", async () => {
    localStorage.setItem("jp-active-profile-id", "p1");

    const snapshot = makeSnapshot("during");
    cloudSyncMock.mockReturnValue({
      cloudEnabled: true,
      cloudReady: true,
      cloudAuthError: null,
      cloudActorUid: "owner-uid",
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
      expect(screen.getByText(/Destination du jour/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Paramètres/i }));
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Profil & paramètres/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Rejouer le rituel de départ/i }));
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /On est parti/i })).toBeInTheDocument();
    });
  });

  it("keeps gate active after refresh during playback and does not grant entry", async () => {
    localStorage.setItem("jp-active-profile-id", "p2");

    const snapshot = makeSnapshot("during");
    snapshot.launchGateCompletedCycleByProfile = {};

    cloudSyncMock.mockImplementation(() => ({
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
    }));

    const view = render(<App />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /On est parti/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Voir le lancement/i }));
    expect(document.querySelector("video")).not.toBeNull();

    view.rerender(<App />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /On est parti/i })).toBeInTheDocument();
    });

    expect(screen.queryByText(/Destination du jour/i)).not.toBeInTheDocument();
  });

  it("keeps gate active after refresh during fallback progression and before final entry", async () => {
    localStorage.setItem("jp-active-profile-id", "p2");

    const snapshot = makeSnapshot("during");
    snapshot.launchGateCompletedCycleByProfile = {};

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

    const view = render(<App />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /On est parti/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Voir le lancement/i }));
    fireEvent.error(document.querySelector("video") as HTMLVideoElement);

    await waitFor(() => {
      expect(screen.getByText(/Étape 1 \/ 6/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Suivant/i }));
    fireEvent.click(screen.getByRole("button", { name: /Suivant/i }));
    expect(screen.queryByRole("button", { name: /Entrer/i })).not.toBeInTheDocument();

    view.rerender(<App />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /On est parti/i })).toBeInTheDocument();
    });

    expect(screen.queryByRole("button", { name: /Entrer/i })).not.toBeInTheDocument();
  });

  it("applies completion per profile and keeps gate for other family members", async () => {
    localStorage.setItem("jp-active-profile-id", "p3");

    const snapshot = makeSnapshot("during");
    snapshot.launchGateCycle = 1;
    snapshot.launchGateCompletedCycleByProfile = { p2: 1 };

    cloudSyncMock.mockReturnValue({
      cloudEnabled: true,
      cloudReady: true,
      cloudAuthError: null,
      cloudActorUid: "visitor-uid",
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
      expect(screen.getByRole("heading", { name: /On est parti/i })).toBeInTheDocument();
    });

    expect(screen.queryByText(/Destination du jour/i)).not.toBeInTheDocument();
  });
});
