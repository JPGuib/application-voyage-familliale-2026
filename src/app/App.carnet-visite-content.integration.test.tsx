import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import App from "./App";
import { HISTOIRE_TOPICS } from "../content/histoire";
import { GEOGRAPHIE_ECONOMIE_TOPICS } from "../content/geographie-economie";
import { CULTURE_TRADITION_TOPICS } from "../content/culture-tradition";

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

function makeSnapshot(activeRole: "utilisateur" | "visiteur" | "proprietaire") {
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

function mockCloudSync(activeRole: "utilisateur" | "visiteur" | "proprietaire", actorUid: string) {
  cloudSyncMock.mockReturnValue({
    cloudEnabled: true,
    cloudReady: true,
    cloudAuthError: null,
    cloudActorUid: actorUid,
    cloudSnapshot: makeSnapshot(activeRole),
    pushSnapshot: vi.fn().mockResolvedValue(undefined),
    claimRoleForProfile: vi.fn().mockResolvedValue(null),
    familyId: "famille-voyage-2026",
  });
}

// Le carnet de contenu est chargé à la demande (subscribeToContentVisitLog),
// absent des mocks ci-dessus comme pour le carnet de lieu — vérifie en
// filigrane que le fallback no-op défini dans App.tsx tient sans planter.
async function openFirstTopic(navLabel: string, topicName: string) {
  render(<App />);

  await waitFor(() => {
    expect(screen.getByText(/Jour\s+1/i)).toBeInTheDocument();
  });

  fireEvent.click(screen.getByRole("button", { name: navLabel }));
  fireEvent.click(screen.getAllByRole("button", { name: new RegExp(topicName, "i") })[0]);

  await waitFor(() => {
    expect(screen.getByText("Carnet de visite")).toBeInTheDocument();
  });
}

describe("App carnet de visite integration for Histoire/Culture/Géographie", () => {
  beforeEach(() => {
    localStorage.clear();
    cloudSyncMock.mockReset();
  });

  it("lets a traveler add a text-only entry on an Histoire topic, with no photo affordance", async () => {
    localStorage.setItem("jp-active-profile-id", "p2");
    mockCloudSync("utilisateur", "actor-user");

    await openFirstTopic("Histoire", HISTOIRE_TOPICS[0].name);

    expect(screen.getByText(/Personne n'a encore ajouté de souvenir ici/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Ajouter un souvenir/i }));

    // Pas d'ajout de photo possible sur ces rubriques (demande explicite).
    expect(screen.queryByLabelText("Ajouter une photo depuis l'appareil")).not.toBeInTheDocument();

    fireEvent.change(
      screen.getByPlaceholderText("Ce que vous avez appris, vu ou entendu..."),
      { target: { value: "Une anecdote lue dans un livre avant le voyage" } }
    );
    fireEvent.click(screen.getByRole("button", { name: /Ajouter au carnet/i }));

    expect(screen.getByText("Une anecdote lue dans un livre avant le voyage")).toBeInTheDocument();
    expect(screen.getByText("Leo")).toBeInTheDocument();
  });

  it("does not show the add-entry form to a visiteur on a Culture topic", async () => {
    localStorage.setItem("jp-active-profile-id", "p3");
    mockCloudSync("visiteur", "actor-visitor");

    await openFirstTopic("Culture", CULTURE_TRADITION_TOPICS[0].name);

    expect(screen.queryByRole("button", { name: /Ajouter un souvenir/i })).not.toBeInTheDocument();
  });

  it("keeps carnet entries isolated per section/topic (no cross-source id collision)", async () => {
    localStorage.setItem("jp-active-profile-id", "p2");
    // Seed le cache local avec une entrée pour un topic Géographie — ne doit
    // JAMAIS apparaître sur le topic Histoire, même si un id de topic était
    // réutilisé d'une rubrique à l'autre (cf. carnetContentKey = source+itemId).
    localStorage.setItem(
      "jp-carnet-content-cache",
      JSON.stringify({
        [`geographie-economie::${GEOGRAPHIE_ECONOMIE_TOPICS[0].id}`]: {
          "p1-1": {
            entryId: "p1-1",
            source: "geographie-economie",
            itemId: GEOGRAPHIE_ECONOMIE_TOPICS[0].id,
            authorProfileId: "p1",
            authorSurnameSnapshot: "Maman",
            text: "Souvenir géographie uniquement",
            createdAt: 1,
            updatedAt: 1,
            authorUid: "actor-owner",
          },
        },
      })
    );

    mockCloudSync("utilisateur", "actor-user");

    await openFirstTopic("Histoire", HISTOIRE_TOPICS[0].name);

    expect(screen.queryByText("Souvenir géographie uniquement")).not.toBeInTheDocument();
  });
});
