import { describe, expect, it } from "vitest";
import {
  applyProfileRoleMutation,
  canUpdateOwnerCode,
  claimRoleFirstWriterWins,
  enforceOwnerUniqueness,
  parseSharedFamilyState,
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

  it("couvre un parcours complet propriétaire + code voyageur + création visiteur + reload (story 24.1/24.3)", async () => {
    let familyState = makeState();

    const ownerClaim = claimRoleFirstWriterWins(familyState, "owner-a");
    familyState = ownerClaim.state;
    expect(ownerClaim.assignedRole).toBe("proprietaire");

    const travelerCodeHash = await hashOwnerCode("famille2026");

    // Choix "Voyageur" avec le bon code : la course propriétaire/utilisateur
    // assigne d'abord "utilisateur" (comportement inchangé), le choix
    // voyageur ne fait que confirmer ce rôle.
    const travelerClaim = claimRoleFirstWriterWins(familyState, "user-b");
    familyState = travelerClaim.state;
    expect(travelerClaim.assignedRole).toBe("utilisateur");
    await expect(verifyOwnerCode("famille2026", travelerCodeHash)).resolves.toBe(true);

    // Choix "Visiteur" : après la course (qui renvoie "utilisateur" car un
    // propriétaire existe déjà), une mutation locale explicite bascule le
    // profil en "visiteur" — jamais appliquée si la course avait renvoyé
    // "proprietaire" (1er profil, hors scope de ce choix).
    const visitorPreClaim = claimRoleFirstWriterWins(familyState, "visitor-c");
    familyState = visitorPreClaim.state;
    expect(visitorPreClaim.assignedRole).toBe("utilisateur");

    const visitorMutation = applyProfileRoleMutation(familyState, "visitor-c", "visiteur");
    expect(visitorMutation.rejected).toBe(false);
    familyState = visitorMutation.state;
    expect(familyState.profiles.find((profile) => profile.id === "visitor-c")?.role).toBe("visiteur");

    // Un rechargement relit l'état persisté (JSON round-trip) et le
    // renormalise : le visiteur doit survivre, contrairement au bug latent
    // que corrige cet epic.
    const reloaded = parseSharedFamilyState(JSON.stringify(familyState));
    const renormalized = enforceOwnerUniqueness(reloaded);

    expect(renormalized.ownerProfileId).toBe("owner-a");
    expect(renormalized.profiles.find((profile) => profile.id === "user-b")?.role).toBe("utilisateur");
    expect(renormalized.profiles.find((profile) => profile.id === "visitor-c")?.role).toBe("visiteur");
  });
});
