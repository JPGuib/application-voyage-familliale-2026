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

function makeSnapshot(placeComments: Record<string, unknown>, activeRole: "utilisateur" | "visiteur" = "visiteur") {
  const activeProfileId = activeRole === "visiteur" ? "p3" : "p2";
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
    profiles: {
      p1: makeProfile("p1", "Maman", "proprietaire"),
      p2: makeProfile("p2", "Leo", "utilisateur"),
      p3: makeProfile("p3", "Nina", "visiteur"),
      [activeProfileId]: makeProfile(activeProfileId, activeProfileId === "p2" ? "Leo" : "Nina", activeProfileId === "p2" ? "utilisateur" : "visiteur"),
    },
    updatedAt: 1,
  };
}

describe("App place comments integration (story 21.2)", () => {
  beforeEach(() => {
    localStorage.clear();
    cloudSyncMock.mockReset();
  });

  it("lets a visitor publish a like reaction with optional comment", async () => {
    localStorage.setItem("jp-active-profile-id", "p3");

    cloudSyncMock.mockReturnValue({
      cloudEnabled: true,
      cloudReady: true,
      cloudAuthError: null,
      cloudActorUid: "actor-visitor",
      cloudSnapshot: makeSnapshot({}),
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

    fireEvent.click(screen.getByRole("button", { name: new RegExp(PLACES[0].name, "i") }));

    await waitFor(() => {
      expect(screen.getByText("Avis de la famille")).toBeInTheDocument();
      expect(screen.getByText("Soyez le premier a donner votre avis.")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /J'aime$/i }));
    fireEvent.change(screen.getByPlaceholderText("Votre commentaire (optionnel)"), {
      target: { value: "Superbe experience en famille" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Publier" }));

    expect(screen.getAllByText("Superbe experience en famille").length).toBeGreaterThan(0);
    expect(screen.getByText("Nina")).toBeInTheDocument();
  });

  it("does not show edit/delete actions for another profile comment", async () => {
    localStorage.setItem("jp-active-profile-id", "p3");

    const placeId = PLACES[0].id;
    cloudSyncMock.mockReturnValue({
      cloudEnabled: true,
      cloudReady: true,
      cloudAuthError: null,
      cloudActorUid: "actor-visitor",
      cloudSnapshot: makeSnapshot({
        [placeId]: {
          p2: {
            commentId: "p2",
            placeId,
            authorProfileId: "p2",
            authorSurnameSnapshot: "Leo",
            reaction: "dislike",
            text: "Beaucoup de monde",
            createdAt: 10,
            updatedAt: 10,
            authorUid: "actor-user",
          },
        },
      }),
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

    fireEvent.click(screen.getByRole("button", { name: new RegExp(PLACES[0].name, "i") }));

    await waitFor(() => {
      expect(screen.getByText("Beaucoup de monde")).toBeInTheDocument();
    });

    expect(screen.queryByRole("button", { name: /Supprimer/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Modifier/i })).not.toBeInTheDocument();
  });

  it("lets a visitor publish a comment without selecting a reaction", async () => {
    localStorage.setItem("jp-active-profile-id", "p3");

    cloudSyncMock.mockReturnValue({
      cloudEnabled: true,
      cloudReady: true,
      cloudAuthError: null,
      cloudActorUid: "actor-visitor",
      cloudSnapshot: makeSnapshot({}),
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

    fireEvent.click(screen.getByRole("button", { name: new RegExp(PLACES[0].name, "i") }));

    await waitFor(() => {
      expect(screen.getByText("Avis de la famille")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText("Votre commentaire (optionnel)"), {
      target: { value: "Commentaire sans reaction" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Publier" }));

    expect(screen.getAllByText("Commentaire sans reaction").length).toBeGreaterThan(0);
    expect(screen.getByText("Commentaire")).toBeInTheDocument();
  });

  it("lets a user with an existing comment add a new comment to the thread", async () => {
    localStorage.setItem("jp-active-profile-id", "p2");

    const placeId = PLACES[0].id;
    cloudSyncMock.mockReturnValue({
      cloudEnabled: true,
      cloudReady: true,
      cloudAuthError: null,
      cloudActorUid: "actor-user",
      cloudSnapshot: makeSnapshot(
        {
          [placeId]: {
            p2: {
              commentId: "p2",
              placeId,
              authorProfileId: "p2",
              authorSurnameSnapshot: "Leo",
              reaction: "like",
              text: "Mon avis initial",
              createdAt: 10,
              updatedAt: 10,
              authorUid: "actor-user",
            },
            p3: {
              commentId: "p3",
              placeId,
              authorProfileId: "p3",
              authorSurnameSnapshot: "Nina",
              reaction: "dislike",
              text: "Avis voisin",
              createdAt: 20,
              updatedAt: 20,
              authorUid: "actor-visitor",
            },
          },
        },
        "utilisateur"
      ),
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

    fireEvent.click(screen.getByRole("button", { name: new RegExp(PLACES[0].name, "i") }));

    await waitFor(() => {
      expect(screen.getAllByText("Mon avis initial").length).toBeGreaterThan(0);
      expect(screen.getByText("Avis voisin")).toBeInTheDocument();
    });

    // "Republier" should no longer be present
    expect(screen.queryByRole("button", { name: "Republier" })).not.toBeInTheDocument();

    // "Commenter" button should be present instead
    expect(screen.getByRole("button", { name: "Commenter" })).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText("Votre commentaire"), {
      target: { value: "Nouveau commentaire dans le fil" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Commenter" }));

    expect(screen.getAllByText("Nouveau commentaire dans le fil").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Mon avis initial").length).toBeGreaterThan(0);
    expect(screen.getByText("Avis voisin")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Supprimer/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Modifier/i })).not.toBeInTheDocument();
  });

  it("lets a user update their reaction without changing the comment text", async () => {
    localStorage.setItem("jp-active-profile-id", "p2");

    const placeId = PLACES[0].id;
    cloudSyncMock.mockReturnValue({
      cloudEnabled: true,
      cloudReady: true,
      cloudAuthError: null,
      cloudActorUid: "actor-user",
      cloudSnapshot: makeSnapshot(
        {
          [placeId]: {
            p2: {
              commentId: "p2",
              placeId,
              authorProfileId: "p2",
              authorSurnameSnapshot: "Leo",
              reaction: "like",
              text: "Mon avis initial",
              createdAt: 10,
              updatedAt: 10,
              authorUid: "actor-user",
            },
          },
        },
        "utilisateur"
      ),
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

    fireEvent.click(screen.getByRole("button", { name: new RegExp(PLACES[0].name, "i") }));

    await waitFor(() => {
      expect(screen.getAllByText("Mon avis initial").length).toBeGreaterThan(0);
    });

    // Clicking "J'aime pas" under "Ma réaction" should immediately update the reaction
    const reactionSection = screen.getByText("Ma réaction");
    expect(reactionSection).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /J'aime pas$/i }));

    // The existing comment entry in the thread should now reflect "J'aime pas"
    await waitFor(() => {
      expect(screen.getAllByText("J'aime pas").length).toBeGreaterThan(0);
    });
  });
});
