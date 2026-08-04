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
    currentDay: 1,
    todayDestination: "Istanbul",
  },
}));

function makeProfile(id: string, surname: string, role: "proprietaire" | "utilisateur" | "visiteur") {
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

function makeSnapshot(placeComments: Record<string, unknown>) {
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
    placeComments,
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
    },
    updatedAt: 1,
  };
}

describe("App notifications integration (story 22.1)", () => {
  beforeEach(() => {
    localStorage.clear();
    cloudSyncMock.mockReset();
    vi.unstubAllGlobals();

    class MockNotification {
      static permission: NotificationPermission = "granted";
      static requestPermission = vi.fn().mockResolvedValue("granted");
      static instances: Array<{ title: string; body: string }> = [];

      constructor(title: string, options?: NotificationOptions) {
        MockNotification.instances.push({
          title,
          body: options?.body ?? "",
        });
      }
    }

    vi.stubGlobal("Notification", MockNotification);
    localStorage.setItem("jp-active-profile-id", "p3");
    localStorage.setItem(
      "jp-notification-prefs-by-profile",
      JSON.stringify({
        p3: {
          notif_checklist: false,
          notif_game: false,
          notif_comments: true,
        },
      })
    );
  });

  it("sends a real-time notification when another profile adds a place comment", async () => {
    const placeId = PLACES[0].id;
    let currentSnapshot = makeSnapshot({});

    cloudSyncMock.mockImplementation(() => ({
      cloudEnabled: true,
      cloudReady: true,
      cloudAuthError: null,
      cloudActorUid: "actor-visitor",
      cloudSnapshot: currentSnapshot,
      pushSnapshot: vi.fn().mockResolvedValue(undefined),
      claimRoleForProfile: vi.fn().mockResolvedValue(null),
      familyId: "famille-voyage-2026",
    }));

    const view = render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/Jour\s+1/i)).toBeInTheDocument();
    });

    const MockNotificationCtor = Notification as unknown as {
      instances: Array<{ title: string; body: string }>;
    };
    expect(MockNotificationCtor.instances).toHaveLength(0);

    currentSnapshot = makeSnapshot({
      [placeId]: {
        p2: {
          commentId: "p2",
          placeId,
          authorProfileId: "p2",
          authorSurnameSnapshot: "Leo",
          reaction: "like",
          text: "Super endroit",
          createdAt: 10,
          updatedAt: 10,
          authorUid: "actor-user",
        },
      },
    });

    view.rerender(<App />);

    await waitFor(() => {
      expect(MockNotificationCtor.instances).toHaveLength(1);
    });

    expect(MockNotificationCtor.instances[0]).toEqual({
      title: "Nouveau commentaire",
      body: expect.stringMatching(/Leo\s+a\s+commente/i),
    });
  });

  it("disables notification toggles in settings when permission is denied", async () => {
    class DeniedNotification {
      static permission: NotificationPermission = "denied";
      static requestPermission = vi.fn().mockResolvedValue("denied");
      constructor(_title: string, _options?: NotificationOptions) {
        // no-op
      }
    }
    vi.stubGlobal("Notification", DeniedNotification);

    cloudSyncMock.mockImplementation(() => ({
      cloudEnabled: true,
      cloudReady: true,
      cloudAuthError: null,
      cloudActorUid: "actor-visitor",
      cloudSnapshot: makeSnapshot({}),
      pushSnapshot: vi.fn().mockResolvedValue(undefined),
      claimRoleForProfile: vi.fn().mockResolvedValue(null),
      familyId: "famille-voyage-2026",
    }));

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/Jour\s+1/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Paramètres/i }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Profil & paramètres/i })).toBeInTheDocument();
    });

    expect(
      screen.getByRole("button", { name: /Rappel checklist \(J-3 et J-1 avant le depart\)/i })
    ).toBeDisabled();
    expect(screen.getByRole("button", { name: /Rappel defi du jour/i })).toBeDisabled();
    expect(
      screen.getByRole("button", { name: /Commentaires de la famille sur les lieux/i })
    ).toBeDisabled();
  });
});
