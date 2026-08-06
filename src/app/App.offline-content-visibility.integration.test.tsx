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

function makeSnapshot(activeRole: AppRole, placeVisibility: Record<string, "visible" | "hiddenByOwner">) {
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
    placeVisibilityMap: placeVisibility,
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

describe("App offline content visibility integration (story 27.4)", () => {
  beforeEach(() => {
    localStorage.clear();
    cloudSyncMock.mockReset();
    // Restore the connectivity state jsdom starts with (some tests below
    // flip it to false and never flip it back).
    Object.defineProperty(window.navigator, "onLine", { value: true, configurable: true });
  });

  it("hides the same owner-marked places from a non-owner while offline as it would online (AC2)", async () => {
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

    // Airplane mode from the very first render, per AC2's "au meme instant".
    Object.defineProperty(window.navigator, "onLine", { value: false, configurable: true });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/Jour\s+1/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Séjour" }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Guide du séjour/i })).toBeInTheDocument();
    });

    expect(screen.queryByRole("button", { name: new RegExp(hiddenPlace.name, "i") })).not.toBeInTheDocument();
  });

  it("shows a not-yet-downloaded content section as needing a connection while offline (AC4)", async () => {
    localStorage.setItem("jp-active-profile-id", "p1");

    cloudSyncMock.mockReturnValue({
      cloudEnabled: true,
      cloudReady: true,
      cloudAuthError: null,
      cloudActorUid: "actor-owner",
      cloudSnapshot: makeSnapshot("proprietaire", {}),
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

    // Nothing has been downloaded yet (story 27.2 registry is untouched) and
    // the app is online: no alarming badge should be shown.
    expect(screen.queryByText(/Nécessite une connexion/i)).not.toBeInTheDocument();

    fireEvent(window, new Event("offline"));

    await waitFor(() => {
      expect(screen.getByText(/Nécessite une connexion/i)).toBeInTheDocument();
    });
  });

  it("keeps content already on screen visible when connectivity drops mid-consultation (AC6)", async () => {
    localStorage.setItem("jp-active-profile-id", "p1");
    const visiblePlace = PLACES[0];

    cloudSyncMock.mockReturnValue({
      cloudEnabled: true,
      cloudReady: true,
      cloudAuthError: null,
      cloudActorUid: "actor-owner",
      cloudSnapshot: makeSnapshot("proprietaire", {}),
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

    fireEvent.click(
      document.querySelector(`[data-tutorial-id="guide-place-${visiblePlace.id}"]`) as Element
    );
    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 1, name: new RegExp(visiblePlace.name, "i") })).toBeInTheDocument();
    });

    // Connectivity drops while the place detail screen is already open.
    fireEvent(window, new Event("offline"));

    // No crash, no reload: the same place detail content is still shown.
    expect(screen.getByRole("heading", { level: 1, name: new RegExp(visiblePlace.name, "i") })).toBeInTheDocument();
  });

  it("still blocks direct/restored access to a place hidden by the owner while offline (AC3)", async () => {
    localStorage.setItem("jp-active-profile-id", "p2");
    const targetPlace = PLACES[0];
    let currentSnapshot = makeSnapshot("utilisateur", {});

    cloudSyncMock.mockImplementation(() => ({
      cloudEnabled: true,
      cloudReady: true,
      cloudAuthError: null,
      cloudActorUid: "actor-user",
      cloudSnapshot: currentSnapshot,
      pushSnapshot: vi.fn().mockResolvedValue(undefined),
      claimRoleForProfile: vi.fn().mockResolvedValue(null),
      familyId: "famille-voyage-2026",
    }));

    const view = render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/Jour\s+1/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Séjour" }));
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Guide du séjour/i })).toBeInTheDocument();
    });

    fireEvent.click(
      document.querySelector(`[data-tutorial-id="guide-place-${targetPlace.id}"]`) as Element
    );
    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 1, name: new RegExp(targetPlace.name, "i") })).toBeInTheDocument();
    });

    // The profile goes offline while still viewing the place...
    fireEvent(window, new Event("offline"));

    // ...and the last-known cloud state resolves to "hidden by owner" (e.g.
    // an in-flight sync that was already under way when the connection
    // dropped, or the state restored from local storage after a reload).
    currentSnapshot = makeSnapshot("utilisateur", { [targetPlace.id]: "hiddenByOwner" });
    view.rerender(<App />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Guide du séjour/i })).toBeInTheDocument();
    });
    expect(screen.getByText(/Ce lieu est masqué par le propriétaire/i)).toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 1, name: new RegExp(targetPlace.name, "i") })).not.toBeInTheDocument();
  });
});
