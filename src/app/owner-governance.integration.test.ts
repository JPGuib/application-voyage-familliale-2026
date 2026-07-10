import { describe, expect, it } from "vitest";
import {
  canUpdateOwnerCode,
  claimRoleFirstWriterWins,
  enforceOwnerUniqueness,
  type SharedFamilyState,
} from "./owner-policy";
import { hashOwnerCode, verifyOwnerCode } from "./owner-code";

function makeState(overrides: Partial<SharedFamilyState> = {}): SharedFamilyState {
  return {
    version: 1,
    ownerProfileId: null,
    profiles: [],
    ...overrides,
  };
}

describe("owner governance integration", () => {
  it("normalise les donnees corrompues avec deux owners", () => {
    const corrupted = makeState({
      ownerProfileId: "owner-a",
      profiles: [
        { id: "owner-a", role: "proprietaire" },
        { id: "owner-b", role: "proprietaire" },
        { id: "user-c", role: "utilisateur" },
      ],
    });

    const normalized = enforceOwnerUniqueness(corrupted);

    expect(normalized.ownerProfileId).toBe("owner-a");
    expect(normalized.profiles.find((profile) => profile.id === "owner-a")?.role).toBe("proprietaire");
    expect(normalized.profiles.find((profile) => profile.id === "owner-b")?.role).toBe("utilisateur");
    expect(normalized.profiles.find((profile) => profile.id === "user-c")?.role).toBe("utilisateur");
  });

  it("garantit un seul owner final apres double claim concurrent simplifie", () => {
    const bootstrap = makeState();

    // Deux appareils lisent un etat vide au meme instant.
    const deviceAProposal = claimRoleFirstWriterWins(bootstrap, "profile-a");
    const deviceBProposal = claimRoleFirstWriterWins(bootstrap, "profile-b");

    // Ordonnancement transactionnel: A est commit puis B est rejoue sur l etat committe.
    const finalState = claimRoleFirstWriterWins(deviceAProposal.state, "profile-b").state;

    const owners = finalState.profiles.filter((profile) => profile.role === "proprietaire");
    expect(owners).toHaveLength(1);
    expect(finalState.ownerProfileId).toBe("profile-a");

    // Le calcul de B sur snapshot stale propose owner, mais l etat final reste unique.
    expect(deviceBProposal.assignedRole).toBe("proprietaire");
    expect(finalState.profiles.find((profile) => profile.id === "profile-b")?.role).toBe("utilisateur");
  });

  it("refuse la mise a jour owner code par un user non-owner", async () => {
    const state = makeState({
      ownerProfileId: "owner-a",
      profiles: [
        { id: "owner-a", role: "proprietaire" },
        { id: "user-b", role: "utilisateur" },
      ],
    });

    const ownerCodeHash = await hashOwnerCode("1234");

    expect(canUpdateOwnerCode(state, "user-b")).toBe(false);
    await expect(verifyOwnerCode("1234", ownerCodeHash)).resolves.toBe(true);
    await expect(verifyOwnerCode("9999", ownerCodeHash)).resolves.toBe(false);
  });

  it("couvre un parcours familial minimal owner + user", async () => {
    let familyState = makeState();

    const ownerClaim = claimRoleFirstWriterWins(familyState, "owner-a");
    familyState = ownerClaim.state;
    expect(ownerClaim.assignedRole).toBe("proprietaire");

    const ownerCodeHash = await hashOwnerCode("abcd");

    const userClaim = claimRoleFirstWriterWins(familyState, "user-b");
    familyState = userClaim.state;
    expect(userClaim.assignedRole).toBe("utilisateur");

    expect(canUpdateOwnerCode(familyState, "owner-a")).toBe(true);
    expect(canUpdateOwnerCode(familyState, "user-b")).toBe(false);

    await expect(verifyOwnerCode("abcd", ownerCodeHash)).resolves.toBe(true);
    await expect(verifyOwnerCode("dcba", ownerCodeHash)).resolves.toBe(false);
  });
});
