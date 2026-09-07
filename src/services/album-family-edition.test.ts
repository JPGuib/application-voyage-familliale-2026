import { describe, expect, it } from "vitest";
import {
  buildFamilyEditionConfig,
  canReadFamilyEdition,
  canWriteFamilyEdition,
  resolveFamilyEditionContent,
  validateFamilyEditionConfig,
} from "./album-family-edition";

describe("album family edition", () => {
  const familySnapshot = {
    eligiblePlaces: {
      placeA: { placeId: "placeA", name: "Place A", shortDesc: "" },
      placeB: { placeId: "placeB", name: "Place B", shortDesc: "" },
      placeHidden: { placeId: "placeHidden", name: "Hidden Place", shortDesc: "" },
    },
    placeVisitLogs: {
      placeA: {
        entry1: {
          entryId: "entry1",
          placeId: "placeA",
          authorProfileId: "profile-1",
          authorSurnameSnapshot: "Alice",
          text: "Text A",
          photos: { photoA: "data:image/png;base64,aaa" },
          createdAt: 1,
          updatedAt: 2,
        },
      },
      placeB: {
        entry2: {
          entryId: "entry2",
          placeId: "placeB",
          authorProfileId: "profile-2",
          authorSurnameSnapshot: "Bob",
          text: "Text B",
          photos: { photoB: "data:image/png;base64,bbb" },
          createdAt: 3,
          updatedAt: 4,
        },
      },
      placeHidden: {
        entry3: {
          entryId: "entry3",
          placeId: "placeHidden",
          authorProfileId: "profile-3",
          authorSurnameSnapshot: "Charlie",
          text: "Hidden",
          photos: {},
          createdAt: 5,
          updatedAt: 6,
        },
      },
    },
    requiredProfiles: {
      "profile-1": { profileId: "profile-1", surname: "Alice" },
      "profile-2": { profileId: "profile-2", surname: "Bob" },
      "profile-3": { profileId: "profile-3", surname: "Charlie" },
    },
    gameResults: {
      "profile-1": [{ day: 1, totalScore: 42, riddleSolved: true, challengeDone: true, correctCount: 9 }],
    },
    tripStartDate: "2026-08-01",
    phase: "during",
    generatedAt: 1,
  } as any;

  it("allows owner and authenticated family members to read a family edition, but blocks visitors", () => {
    expect(canReadFamilyEdition("proprietaire")).toBe(true);
    expect(canReadFamilyEdition("utilisateur")).toBe(true);
    expect(canReadFamilyEdition("visiteur")).toBe(false);
    expect(canReadFamilyEdition(null)).toBe(false);
  });

  it("allows only the owner to publish or remove the family edition", () => {
    expect(canWriteFamilyEdition("proprietaire")).toBe(true);
    expect(canWriteFamilyEdition("utilisateur")).toBe(false);
    expect(canWriteFamilyEdition("visiteur")).toBe(false);
  });

  it("validates the metadata-only family configuration and rejects public PDF payloads", () => {
    const valid = buildFamilyEditionConfig({
      title: "Edition familiale",
      subtitle: "Sommaire",
      cover: { kind: "placeImage", sourceId: "placeA" },
      includedPlaceIds: { placeA: true },
      includedCarnetEntryIds: { entry1: true },
      includeGames: true,
      themeId: "default",
      publishedByProfileId: "profile-owner",
      publishedByUid: "owner-uid",
    });

    expect(validateFamilyEditionConfig(valid).valid).toBe(true);

    const invalid = {
      ...valid,
      pdfUrl: "https://public.example.com/famille.pdf",
    };

    expect(validateFamilyEditionConfig(invalid).valid).toBe(false);
  });

  it("keeps only eligible content and warns when stale references are excluded", () => {
    const config = buildFamilyEditionConfig({
      title: "Edition familiale",
      subtitle: "Sommaire",
      cover: { kind: "none" },
      includedPlaceIds: { placeA: true, placeHidden: true },
      includedCarnetEntryIds: { entry1: true, entry3: true },
      includeGames: false,
      themeId: "default",
      publishedByProfileId: "profile-owner",
      publishedByUid: "owner-uid",
    });

    const result = resolveFamilyEditionContent(familySnapshot as any, config as any, {
      placeVisibilityMap: { placeA: "visible", placeHidden: "hiddenByOwner" },
      placeSeenMap: { placeA: "seen", placeHidden: "seen" },
    });

    expect(result.includedPlaceIds).toEqual({ placeA: true });
    expect(result.includedCarnetEntryIds).toEqual({ entry1: true });
    expect(result.warnings.some((warning) => warning.includes("placeHidden"))).toBe(true);
  });
});
