import { describe, expect, it } from "vitest";
import {
  applyProfileRoleMutation,
  assignRoleOnProfileCreation,
  canPromoteToOwner,
  canUpdateOwnerCode,
  claimRoleFirstWriterWins,
  enforceOwnerUniqueness,
  type SharedFamilyState,
} from "./owner-policy";

function makeState(overrides: Partial<SharedFamilyState> = {}): SharedFamilyState {
  return {
    version: 1,
    ownerProfileId: null,
    profiles: [],
    ...overrides,
  };
}

describe("owner policy", () => {
  it("assigne proprietaire si aucun owner n'existe", () => {
    const role = assignRoleOnProfileCreation(makeState());
    expect(role).toBe("proprietaire");
  });

  it("assigne utilisateur si un owner existe", () => {
    const role = assignRoleOnProfileCreation(
      makeState({
        ownerProfileId: "owner-1",
        profiles: [{ id: "owner-1", role: "proprietaire" }],
      })
    );
    expect(role).toBe("utilisateur");
  });

  it("refuse la promotion owner pour un autre profil", () => {
    const allowed = canPromoteToOwner(
      makeState({
        ownerProfileId: "owner-1",
        profiles: [{ id: "owner-1", role: "proprietaire" }],
      }),
      "user-2"
    );
    expect(allowed).toBe(false);
  });

  it("autorise la mise a jour du code seulement pour l'owner", () => {
    const state = makeState({
      ownerProfileId: "owner-1",
      profiles: [
        { id: "owner-1", role: "proprietaire" },
        { id: "user-2", role: "utilisateur" },
      ],
    });

    expect(canUpdateOwnerCode(state, "owner-1")).toBe(true);
    expect(canUpdateOwnerCode(state, "user-2")).toBe(false);
  });

  it("normalise un etat avec plusieurs owners", () => {
    const normalized = enforceOwnerUniqueness(
      makeState({
        ownerProfileId: "owner-1",
        profiles: [
          { id: "owner-1", role: "proprietaire" },
          { id: "owner-2", role: "proprietaire" },
          { id: "user-1", role: "utilisateur" },
        ],
      })
    );

    expect(normalized.ownerProfileId).toBe("owner-1");
    expect(normalized.profiles.find((profile) => profile.id === "owner-1")?.role).toBe("proprietaire");
    expect(normalized.profiles.find((profile) => profile.id === "owner-2")?.role).toBe("utilisateur");
    expect(normalized.profiles.find((profile) => profile.id === "user-1")?.role).toBe("utilisateur");
  });

  it("attribue proprietaire au premier profil via first-writer-wins", () => {
    const result = claimRoleFirstWriterWins(makeState(), "owner-1");

    expect(result.assignedRole).toBe("proprietaire");
    expect(result.state.ownerProfileId).toBe("owner-1");
    expect(result.state.profiles.find((profile) => profile.id === "owner-1")?.role).toBe("proprietaire");
  });

  it("attribue utilisateur si un owner existe deja via first-writer-wins", () => {
    const state = makeState({
      ownerProfileId: "owner-1",
      profiles: [{ id: "owner-1", role: "proprietaire" }],
    });
    const result = claimRoleFirstWriterWins(state, "user-2");

    expect(result.assignedRole).toBe("utilisateur");
    expect(result.state.ownerProfileId).toBe("owner-1");
    expect(result.state.profiles.find((profile) => profile.id === "user-2")?.role).toBe("utilisateur");
  });

  it("refuse explicitement la promotion manuelle vers proprietaire", () => {
    const state = makeState({
      ownerProfileId: "owner-1",
      profiles: [
        { id: "owner-1", role: "proprietaire" },
        { id: "user-2", role: "utilisateur" },
      ],
    });

    const result = applyProfileRoleMutation(state, "user-2", "proprietaire");

    expect(result.rejected).toBe(true);
    expect(result.reason).toBe("owner-already-exists");
    expect(result.role).toBe("utilisateur");
    expect(result.state.ownerProfileId).toBe("owner-1");
  });

  it("refuse la demotion du proprietaire en utilisateur", () => {
    const state = makeState({
      ownerProfileId: "owner-1",
      profiles: [{ id: "owner-1", role: "proprietaire" }],
    });

    const result = applyProfileRoleMutation(state, "owner-1", "utilisateur");

    expect(result.rejected).toBe(true);
    expect(result.reason).toBe("cannot-demote-owner");
    expect(result.role).toBe("proprietaire");
    expect(result.state.ownerProfileId).toBe("owner-1");
  });
});
