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
});
