import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { AlbumScreen } from "./AlbumScreen";
import type { AlbumSource } from "../types/cloud";

const emptySource: AlbumSource = {
  tripStartDate: null,
  phase: "after",
  generatedAt: 1,
  eligiblePlaces: {},
  placeVisitLogs: {},
  requiredProfiles: {},
  gameResults: {},
};

const sourceWithPhoto: AlbumSource = {
  ...emptySource,
  eligiblePlaces: {
    "place-1": { placeId: "place-1", name: "Istanbul", shortDesc: "Ville historique" },
  },
  placeVisitLogs: {
    "place-1": {
      "entry-1": {
        entryId: "entry-1",
        placeId: "place-1",
        authorProfileId: "profile-1",
        authorSurnameSnapshot: "Alex",
        text: "Un souvenir",
        photos: { "photo-1": "data:image/jpeg;base64,album-cover" },
        createdAt: 1,
        updatedAt: 1,
      },
    },
  },
};

const sourceWithEditorialOnly: AlbumSource = {
  ...emptySource,
  eligiblePlaces: {
    "place-1": {
      placeId: "place-1",
      name: "Istanbul",
      shortDesc: "Ville historique",
      image: "/images/guide/Istanbul photo 1.webp",
      photos: ["/images/guide/Istanbul photo 1.webp", "/images/places/Bosphore.webp"],
      historyLabel: "Présentation",
      history: "Istanbul est la plus grande ville de Turquie.",
      anecdotesLabel: "Le saviez-vous ?",
      anecdotes: ["Le Bosphore coupe la ville en deux."],
    },
  },
  // Aucune entrée de carnet pour ce lieu : seul le socle éditorial est disponible.
  placeVisitLogs: {},
};

describe("AlbumScreen preview", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  function renderAlbum(albumSource: AlbumSource) {
    render(
      <AlbumScreen
        profileId="profile-1"
        currentDay={1}
        lastDefinedDay={1}
        role="proprietaire"
        albumSource={albumSource}
      />
    );
  }

  it("keeps a minimal album structure when there are no locations or memories", () => {
    renderAlbum(emptySource);

    fireEvent.click(screen.getByRole("button", { name: /Voir l'aperçu/i }));

    expect(screen.getByText("Itinéraire du voyage")).toBeInTheDocument();
    expect(screen.getByText(/Aucun lieu marqué comme visité/)).toBeInTheDocument();
    expect(screen.getByText("Souvenirs personnels")).toBeInTheDocument();
    expect(screen.getByText(/Aucun souvenir n'est encore disponible/)).toBeInTheDocument();
  });

  it("renders the stored source for the selected cover photo", () => {
    localStorage.setItem(
      "album-draft-profile-1",
      JSON.stringify({
        profileId: "profile-1",
        title: "Mon voyage",
        subtitle: "Souvenirs",
        coverPhotoId: "photo-1",
        includedLocationIds: ["place-1"],
        includeGameSummary: false,
        theme: "default",
        createdAt: 1,
        updatedAt: 1,
      })
    );

    renderAlbum(sourceWithPhoto);
    fireEvent.click(screen.getByRole("button", { name: /Voir l'aperçu/i }));

    expect(screen.getByRole("img", { name: "Couverture" })).toHaveAttribute(
      "src",
      "data:image/jpeg;base64,album-cover"
    );
  });

  it("selects all eligible locations by default for a new profile draft", () => {
    renderAlbum(sourceWithPhoto);

    expect(screen.getByRole("checkbox", { name: "Istanbul" })).toBeChecked();
  });

  it("keeps an unchecked eligible location available to add again", () => {
    renderAlbum(sourceWithPhoto);

    const location = screen.getByRole("checkbox", { name: "Istanbul" });
    fireEvent.click(location);

    expect(screen.getByRole("checkbox", { name: "Istanbul" })).not.toBeChecked();
    expect(screen.getByText("Istanbul")).toBeInTheDocument();
  });

  it("restores the default location selection when resetting the draft", () => {
    renderAlbum(sourceWithPhoto);

    fireEvent.click(screen.getByRole("checkbox", { name: "Istanbul" }));
    fireEvent.click(screen.getByRole("button", { name: "Réinitialiser" }));

    expect(screen.getByRole("checkbox", { name: "Istanbul" })).toBeChecked();
  });

  it("offers a local PDF export action from the album screen", () => {
    renderAlbum(sourceWithPhoto);

    fireEvent.click(screen.getByRole("button", { name: /Voir l'aperçu/i }));

    expect(screen.getByRole("button", { name: /Télécharger le PDF/i })).toBeInTheDocument();
  });

  it("shows the editorial content (présentation, anecdotes, galerie) for a place without any journal entry (story 30.5)", () => {
    renderAlbum(sourceWithEditorialOnly);

    fireEvent.click(screen.getByRole("button", { name: /Voir l'aperçu/i }));

    expect(screen.getByText("Présentation")).toBeInTheDocument();
    expect(screen.getByText("Istanbul est la plus grande ville de Turquie.")).toBeInTheDocument();
    expect(screen.getByText("Le saviez-vous ?")).toBeInTheDocument();
    expect(screen.getByText("Le Bosphore coupe la ville en deux.")).toBeInTheDocument();
    // Ne doit pas afficher le message de repli "aucun souvenir" puisque le
    // socle éditorial est disponible même sans note de carnet.
    expect(screen.queryByText("Aucun souvenir détaillé pour ce lieu.")).not.toBeInTheDocument();
  });

  it("shows a graceful empty message for a place with no editorial content and no journal entry", () => {
    const bareSource: AlbumSource = {
      ...emptySource,
      eligiblePlaces: {
        "place-1": { placeId: "place-1", name: "Nantes - Paris", shortDesc: "Vol" },
      },
      placeVisitLogs: {},
    };

    renderAlbum(bareSource);
    fireEvent.click(screen.getByRole("button", { name: /Voir l'aperçu/i }));

    expect(screen.getByText("Aucun souvenir détaillé pour ce lieu.")).toBeInTheDocument();
  });

  it("does not show the adaptive-export notice for a trip with few places (story 30.5, export adaptatif)", () => {
    renderAlbum(sourceWithPhoto);
    fireEvent.click(screen.getByRole("button", { name: /Voir l'aperçu/i }));

    expect(screen.queryByText(/Voyage riche en lieux/)).not.toBeInTheDocument();
  });

  it("shows a non-blocking adaptive-export notice when many places are included (story 30.5, export adaptatif)", () => {
    const manyPlaces: AlbumSource["eligiblePlaces"] = {};
    for (let i = 0; i < 40; i += 1) {
      const placeId = `place-${i}`;
      manyPlaces[placeId] = { placeId, name: `Lieu ${i}`, shortDesc: "" };
    }
    const bigSource: AlbumSource = { ...emptySource, eligiblePlaces: manyPlaces, placeVisitLogs: {} };

    renderAlbum(bigSource);
    fireEvent.click(screen.getByRole("button", { name: /Voir l'aperçu/i }));

    expect(screen.getByText(/Voyage riche en lieux/)).toBeInTheDocument();
    // Le message reste informatif : l'aperçu continue de s'afficher normalement.
    expect(screen.getByText("Itinéraire du voyage")).toBeInTheDocument();
  });
});
