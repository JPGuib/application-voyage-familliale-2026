import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { describe, beforeAll, afterAll, beforeEach, it } from "vitest";

const PROJECT_ID = "application-voyage-test";
const FAMILY_ID = "famille-voyage-2026";
const OWNER_UID = "owner-uid";
const NON_OWNER_UID = "user-uid";
const VISITOR_UID = "visitor-uid";
const OWNER_PROFILE_ID = "profile-owner";
const NON_OWNER_PROFILE_ID = "profile-user";
const VISITOR_PROFILE_ID = "profile-visitor";
const COMMENT_PLACE_ID = "sainte-sophie";

const hasDatabaseEmulator = Boolean(process.env.FIREBASE_DATABASE_EMULATOR_HOST);

const rulesPath = resolve(process.cwd(), "firebase", "database.rules.test.json");
const rtdbRules = readFileSync(rulesPath, "utf8");

const suite = hasDatabaseEmulator ? describe : describe.skip;

suite("firebase rtdb rules owner phase guard", () => {
  let testEnv: RulesTestEnvironment;

  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      database: {
        rules: rtdbRules,
      },
    });
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  beforeEach(async () => {
    await testEnv.clearDatabase();

    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.database();
      await db.ref(`familyMembers/${FAMILY_ID}/${OWNER_UID}`).set(true);
      await db.ref(`familyMembers/${FAMILY_ID}/${NON_OWNER_UID}`).set(true);
      await db.ref(`familyMembers/${FAMILY_ID}/${VISITOR_UID}`).set(true);
      await db.ref(`ownerMembers/${FAMILY_ID}/${OWNER_UID}`).set(true);
      await db.ref(`families/${FAMILY_ID}/ownerUid`).set(OWNER_UID);
      await db.ref(`families/${FAMILY_ID}/ownerProfileId`).set(OWNER_PROFILE_ID);
      await db.ref(`families/${FAMILY_ID}/phase`).set("before");
      await db.ref(`families/${FAMILY_ID}/profiles/${OWNER_PROFILE_ID}`).set({
        surname: "Owner",
        role: "proprietaire",
        createdAt: 1,
        lastSyncAt: 1,
        memberUids: {
          [OWNER_UID]: true,
        },
      });
      await db.ref(`families/${FAMILY_ID}/profiles/${NON_OWNER_PROFILE_ID}`).set({
        surname: "User",
        role: "utilisateur",
        createdAt: 1,
        lastSyncAt: 1,
        memberUids: {
          [NON_OWNER_UID]: true,
        },
      });
      await db.ref(`families/${FAMILY_ID}/profiles/${VISITOR_PROFILE_ID}`).set({
        surname: "Visitor",
        role: "visiteur",
        createdAt: 1,
        lastSyncAt: 1,
        memberUids: {
          [VISITOR_UID]: true,
        },
      });
    });
  });

  it("allows owner to write family-wide phase", async () => {
    const ownerDb = testEnv.authenticatedContext(OWNER_UID).database();

    await assertSucceeds(ownerDb.ref(`families/${FAMILY_ID}/phase`).set("during"));
  });

  it("denies non-owner from writing family-wide phase", async () => {
    const nonOwnerDb = testEnv.authenticatedContext(NON_OWNER_UID).database();

    await assertFails(nonOwnerDb.ref(`families/${FAMILY_ID}/phase`).set("during"));
  });

  it("allows owner to write family-wide launchGateCycle", async () => {
    const ownerDb = testEnv.authenticatedContext(OWNER_UID).database();

    await assertSucceeds(ownerDb.ref(`families/${FAMILY_ID}/launchGateCycle`).set(2));
  });

  it("denies non-owner from writing family-wide launchGateCycle", async () => {
    const nonOwnerDb = testEnv.authenticatedContext(NON_OWNER_UID).database();

    await assertFails(nonOwnerDb.ref(`families/${FAMILY_ID}/launchGateCycle`).set(2));
  });

  it("allows a family member to write own launchGateCompletedCycle", async () => {
    const ownerDb = testEnv.authenticatedContext(OWNER_UID).database();

    await assertSucceeds(
      ownerDb
        .ref(`families/${FAMILY_ID}/profiles/${OWNER_PROFILE_ID}/launchGateCompletedCycle`)
        .set(1)
    );
  });

  it("denies negative launchGateCompletedCycle", async () => {
    const ownerDb = testEnv.authenticatedContext(OWNER_UID).database();

    await assertFails(
      ownerDb
        .ref(`families/${FAMILY_ID}/profiles/${OWNER_PROFILE_ID}/launchGateCompletedCycle`)
        .set(-1)
    );
  });

  it("allows owner to write family-wide tripStartDate", async () => {
    const ownerDb = testEnv.authenticatedContext(OWNER_UID).database();

    await assertSucceeds(
      ownerDb.ref(`families/${FAMILY_ID}/tripStartDate`).set("2026-08-16")
    );
  });

  it("denies non-owner from writing family-wide tripStartDate", async () => {
    const nonOwnerDb = testEnv.authenticatedContext(NON_OWNER_UID).database();

    await assertFails(
      nonOwnerDb.ref(`families/${FAMILY_ID}/tripStartDate`).set("2026-08-16")
    );
  });

  it("denies a malformed tripStartDate value", async () => {
    const ownerDb = testEnv.authenticatedContext(OWNER_UID).database();

    await assertFails(
      ownerDb.ref(`families/${FAMILY_ID}/tripStartDate`).set("16/08/2026")
    );
  });

  it("allows owner to force-open a gameDayOverrides entry", async () => {
    const ownerDb = testEnv.authenticatedContext(OWNER_UID).database();

    await assertSucceeds(ownerDb.ref(`families/${FAMILY_ID}/gameDayOverrides/3`).set("open"));
  });

  it("allows owner to clear a gameDayOverrides entry", async () => {
    const ownerDb = testEnv.authenticatedContext(OWNER_UID).database();

    await assertSucceeds(ownerDb.ref(`families/${FAMILY_ID}/gameDayOverrides/3`).set(null));
  });

  it("denies non-owner from writing a gameDayOverrides entry", async () => {
    const nonOwnerDb = testEnv.authenticatedContext(NON_OWNER_UID).database();

    await assertFails(nonOwnerDb.ref(`families/${FAMILY_ID}/gameDayOverrides/3`).set("closed"));
  });

  it("denies an invalid gameDayOverrides value", async () => {
    const ownerDb = testEnv.authenticatedContext(OWNER_UID).database();

    await assertFails(ownerDb.ref(`families/${FAMILY_ID}/gameDayOverrides/3`).set("maybe"));
  });

  it("allows owner to set hidden visibility for a place", async () => {
    const ownerDb = testEnv.authenticatedContext(OWNER_UID).database();

    await assertSucceeds(
      ownerDb.ref(`families/${FAMILY_ID}/placeVisibilityMap/sainte-sophie`).set("hiddenByOwner")
    );
  });

  it("denies non-owner from writing place visibility map", async () => {
    const nonOwnerDb = testEnv.authenticatedContext(NON_OWNER_UID).database();

    await assertFails(
      nonOwnerDb.ref(`families/${FAMILY_ID}/placeVisibilityMap/sainte-sophie`).set("hiddenByOwner")
    );
  });

  it("denies invalid place visibility value", async () => {
    const ownerDb = testEnv.authenticatedContext(OWNER_UID).database();

    await assertFails(
      ownerDb.ref(`families/${FAMILY_ID}/placeVisibilityMap/sainte-sophie`).set("secret")
    );
  });

  it("allows owner to mark a place as seen", async () => {
    const ownerDb = testEnv.authenticatedContext(OWNER_UID).database();

    await assertSucceeds(
      ownerDb.ref(`families/${FAMILY_ID}/placeSeenMap/sainte-sophie`).set("seen")
    );
  });

  it("denies non-owner from writing the place-seen map", async () => {
    const nonOwnerDb = testEnv.authenticatedContext(NON_OWNER_UID).database();

    await assertFails(
      nonOwnerDb.ref(`families/${FAMILY_ID}/placeSeenMap/sainte-sophie`).set("seen")
    );
  });

  it("denies invalid place-seen value", async () => {
    const ownerDb = testEnv.authenticatedContext(OWNER_UID).database();

    await assertFails(
      ownerDb.ref(`families/${FAMILY_ID}/placeSeenMap/sainte-sophie`).set("maybe")
    );
  });

  it("allows owner to move a place to another day", async () => {
    const ownerDb = testEnv.authenticatedContext(OWNER_UID).database();

    await assertSucceeds(
      ownerDb.ref(`families/${FAMILY_ID}/placeDayOverrides/sainte-sophie`).set([3])
    );
  });

  it("allows owner to set per-day place ordering with object payload", async () => {
    const ownerDb = testEnv.authenticatedContext(OWNER_UID).database();

    await assertSucceeds(
      ownerDb.ref(`families/${FAMILY_ID}/placeDayOverrides/sainte-sophie`).set({
        days: [3],
        orderByDay: {
          3: 5,
        },
      })
    );
  });

  it("denies non-owner from writing place day overrides", async () => {
    const nonOwnerDb = testEnv.authenticatedContext(NON_OWNER_UID).database();

    await assertFails(
      nonOwnerDb.ref(`families/${FAMILY_ID}/placeDayOverrides/sainte-sophie`).set([3])
    );
  });

  it("denies invalid place day override values", async () => {
    const ownerDb = testEnv.authenticatedContext(OWNER_UID).database();

    await assertFails(
      ownerDb.ref(`families/${FAMILY_ID}/placeDayOverrides/sainte-sophie`).set([0, "foo"])
    );
  });

  it("denies invalid per-day order values in place day overrides", async () => {
    const ownerDb = testEnv.authenticatedContext(OWNER_UID).database();

    await assertFails(
      ownerDb.ref(`families/${FAMILY_ID}/placeDayOverrides/sainte-sophie`).set({
        days: [3],
        orderByDay: {
          3: 0,
        },
      })
    );
  });

  it("allows owner to set a content override for a place", async () => {
    const ownerDb = testEnv.authenticatedContext(OWNER_UID).database();

    await assertSucceeds(
      ownerDb.ref(`families/${FAMILY_ID}/contentOverrides/places/sainte-sophie`).set({
        history: "Texte corrigé par le propriétaire.",
        anecdotes: ["Une anecdote corrigée."],
      })
    );
  });

  it("denies non-owner from writing a content override", async () => {
    const nonOwnerDb = testEnv.authenticatedContext(NON_OWNER_UID).database();

    await assertFails(
      nonOwnerDb.ref(`families/${FAMILY_ID}/contentOverrides/places/sainte-sophie`).set({
        history: "Tentative non autorisée.",
      })
    );
  });

  it("denies a content override with a history text that is too long", async () => {
    const ownerDb = testEnv.authenticatedContext(OWNER_UID).database();

    await assertFails(
      ownerDb
        .ref(`families/${FAMILY_ID}/contentOverrides/places/sainte-sophie/history`)
        .set("x".repeat(6001))
    );
  });

  it("denies an unknown field inside a content override", async () => {
    const ownerDb = testEnv.authenticatedContext(OWNER_UID).database();

    await assertFails(
      ownerDb.ref(`families/${FAMILY_ID}/contentOverrides/places/sainte-sophie`).set({
        unknownField: "not allowed",
      })
    );
  });

  it("allows owner to add a custom document", async () => {
    const ownerDb = testEnv.authenticatedContext(OWNER_UID).database();

    await assertSucceeds(
      ownerDb.ref(`families/${FAMILY_ID}/documentCatalogAdditions/doc-custom-1`).set({
        id: "doc-custom-1",
        category: "PAPIERS",
        title: "Copie passeport",
        content: "Scan ajouté par le propriétaire.",
      })
    );
  });

  it("denies non-owner from adding a custom document", async () => {
    const nonOwnerDb = testEnv.authenticatedContext(NON_OWNER_UID).database();

    await assertFails(
      nonOwnerDb.ref(`families/${FAMILY_ID}/documentCatalogAdditions/doc-custom-1`).set({
        id: "doc-custom-1",
        category: "PAPIERS",
        title: "Copie passeport",
        content: "Tentative non autorisée.",
      })
    );
  });

  it("denies a custom document with an invalid category", async () => {
    const ownerDb = testEnv.authenticatedContext(OWNER_UID).database();

    await assertFails(
      ownerDb.ref(`families/${FAMILY_ID}/documentCatalogAdditions/doc-custom-1`).set({
        id: "doc-custom-1",
        category: "INVALIDE",
        title: "Copie passeport",
        content: "Contenu",
      })
    );
  });

  it("denies a custom document missing a required field", async () => {
    const ownerDb = testEnv.authenticatedContext(OWNER_UID).database();

    await assertFails(
      ownerDb.ref(`families/${FAMILY_ID}/documentCatalogAdditions/doc-custom-1`).set({
        id: "doc-custom-1",
        category: "PAPIERS",
        title: "Copie passeport",
      })
    );
  });

  it("allows owner to edit an existing default document", async () => {
    const ownerDb = testEnv.authenticatedContext(OWNER_UID).database();

    await assertSucceeds(
      ownerDb.ref(`families/${FAMILY_ID}/documentCatalogEdits/vol-nantes-paris-af7507`).set({
        id: "vol-nantes-paris-af7507",
        category: "VOLS",
        title: "Nantes → Paris (corrigé)",
        content: "Texte corrigé par le propriétaire.",
      })
    );
  });

  it("denies non-owner from editing an existing default document", async () => {
    const nonOwnerDb = testEnv.authenticatedContext(NON_OWNER_UID).database();

    await assertFails(
      nonOwnerDb.ref(`families/${FAMILY_ID}/documentCatalogEdits/vol-nantes-paris-af7507`).set({
        id: "vol-nantes-paris-af7507",
        category: "VOLS",
        title: "Tentative non autorisée",
        content: "Contenu",
      })
    );
  });

  it("allows owner to permanently remove a default document", async () => {
    const ownerDb = testEnv.authenticatedContext(OWNER_UID).database();

    await assertSucceeds(
      ownerDb.ref(`families/${FAMILY_ID}/documentCatalogRemovals/vol-nantes-paris-af7507`).set(true)
    );
  });

  it("denies non-owner from removing a default document", async () => {
    const nonOwnerDb = testEnv.authenticatedContext(NON_OWNER_UID).database();

    await assertFails(
      nonOwnerDb.ref(`families/${FAMILY_ID}/documentCatalogRemovals/vol-nantes-paris-af7507`).set(true)
    );
  });

  it("allows non-owner to write profile-scoped checklist", async () => {
    const nonOwnerDb = testEnv.authenticatedContext(NON_OWNER_UID).database();

    await assertSucceeds(nonOwnerDb.ref(`families/${FAMILY_ID}/checklists/${NON_OWNER_PROFILE_ID}/item-a`).set(true));
  });

  it("allows owner to write ownerCodePlain", async () => {
    const ownerDb = testEnv.authenticatedContext(OWNER_UID).database();

    await assertSucceeds(ownerDb.ref(`families/${FAMILY_ID}/ownerCodePlain`).set("1234"));
  });

  it("denies non-owner from writing ownerCodePlain", async () => {
    const nonOwnerDb = testEnv.authenticatedContext(NON_OWNER_UID).database();

    await assertFails(nonOwnerDb.ref(`families/${FAMILY_ID}/ownerCodePlain`).set("1234"));
  });

  it("denies an ownerCodePlain value shorter than 4 characters", async () => {
    const ownerDb = testEnv.authenticatedContext(OWNER_UID).database();

    await assertFails(ownerDb.ref(`families/${FAMILY_ID}/ownerCodePlain`).set("123"));
  });

  it("allows a profile role of visiteur (story 24.1/24.3)", async () => {
    const nonOwnerDb = testEnv.authenticatedContext(NON_OWNER_UID).database();

    await assertSucceeds(
      nonOwnerDb.ref(`families/${FAMILY_ID}/profiles/${NON_OWNER_PROFILE_ID}/role`).set("visiteur")
    );
  });

  it("denies an unknown profile role value", async () => {
    const nonOwnerDb = testEnv.authenticatedContext(NON_OWNER_UID).database();

    await assertFails(
      nonOwnerDb.ref(`families/${FAMILY_ID}/profiles/${NON_OWNER_PROFILE_ID}/role`).set("invite")
    );
  });

  it("allows owner to write travelerCodeHash (story 24.2)", async () => {
    const ownerDb = testEnv.authenticatedContext(OWNER_UID).database();

    await assertSucceeds(
      ownerDb.ref(`families/${FAMILY_ID}/travelerCodeHash`).set(`sha256:${"a".repeat(64)}`)
    );
  });

  it("denies non-owner from writing travelerCodeHash", async () => {
    const nonOwnerDb = testEnv.authenticatedContext(NON_OWNER_UID).database();

    await assertFails(
      nonOwnerDb.ref(`families/${FAMILY_ID}/travelerCodeHash`).set(`sha256:${"a".repeat(64)}`)
    );
  });

  it("allows owner to write and clear travelerCodePlain", async () => {
    const ownerDb = testEnv.authenticatedContext(OWNER_UID).database();

    await assertSucceeds(ownerDb.ref(`families/${FAMILY_ID}/travelerCodePlain`).set("5678"));
    await assertSucceeds(ownerDb.ref(`families/${FAMILY_ID}/travelerCodePlain`).set(null));
  });

  it("denies a travelerCodePlain value shorter than 4 characters", async () => {
    const ownerDb = testEnv.authenticatedContext(OWNER_UID).database();

    await assertFails(ownerDb.ref(`families/${FAMILY_ID}/travelerCodePlain`).set("123"));
  });

  it("allows a family member to create their own place comment", async () => {
    const nonOwnerDb = testEnv.authenticatedContext(NON_OWNER_UID).database();

    await assertSucceeds(
      nonOwnerDb.ref(`families/${FAMILY_ID}/placeComments/${COMMENT_PLACE_ID}/${NON_OWNER_PROFILE_ID}`).set({
        commentId: NON_OWNER_PROFILE_ID,
        placeId: COMMENT_PLACE_ID,
        authorProfileId: NON_OWNER_PROFILE_ID,
        authorSurnameSnapshot: "User",
        reaction: "like",
        text: "Super visite",
        createdAt: 10,
        updatedAt: 10,
        authorUid: NON_OWNER_UID,
      })
    );
  });

  it("allows visitor role to create comments like other members", async () => {
    const visitorDb = testEnv.authenticatedContext(VISITOR_UID).database();

    await assertSucceeds(
      visitorDb.ref(`families/${FAMILY_ID}/placeComments/${COMMENT_PLACE_ID}/${VISITOR_PROFILE_ID}`).set({
        commentId: VISITOR_PROFILE_ID,
        placeId: COMMENT_PLACE_ID,
        authorProfileId: VISITOR_PROFILE_ID,
        authorSurnameSnapshot: "Visitor",
        reaction: "dislike",
        text: "Trop de monde",
        createdAt: 11,
        updatedAt: 11,
        authorUid: VISITOR_UID,
      })
    );
  });

  it("allows a family member to create a comment without reaction", async () => {
    const nonOwnerDb = testEnv.authenticatedContext(NON_OWNER_UID).database();

    await assertSucceeds(
      nonOwnerDb.ref(`families/${FAMILY_ID}/placeComments/${COMMENT_PLACE_ID}/${NON_OWNER_PROFILE_ID}`).set({
        commentId: NON_OWNER_PROFILE_ID,
        placeId: COMMENT_PLACE_ID,
        authorProfileId: NON_OWNER_PROFILE_ID,
        authorSurnameSnapshot: "User",
        text: "Commentaire seul",
        createdAt: 10,
        updatedAt: 10,
        authorUid: NON_OWNER_UID,
      })
    );
  });

  it("denies a non-author from updating someone else's comment", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.database();
      await db.ref(`families/${FAMILY_ID}/placeComments/${COMMENT_PLACE_ID}/${NON_OWNER_PROFILE_ID}`).set({
        commentId: NON_OWNER_PROFILE_ID,
        placeId: COMMENT_PLACE_ID,
        authorProfileId: NON_OWNER_PROFILE_ID,
        authorSurnameSnapshot: "User",
        reaction: "like",
        text: "Initial",
        createdAt: 10,
        updatedAt: 10,
        authorUid: NON_OWNER_UID,
      });
    });

    const visitorDb = testEnv.authenticatedContext(VISITOR_UID).database();
    await assertFails(
      visitorDb.ref(`families/${FAMILY_ID}/placeComments/${COMMENT_PLACE_ID}/${NON_OWNER_PROFILE_ID}`).set({
        commentId: NON_OWNER_PROFILE_ID,
        placeId: COMMENT_PLACE_ID,
        authorProfileId: NON_OWNER_PROFILE_ID,
        authorSurnameSnapshot: "User",
        reaction: "dislike",
        text: "Hijack",
        createdAt: 10,
        updatedAt: 12,
        authorUid: VISITOR_UID,
      })
    );
  });

  it("allows author to delete own older comment even when newer ones exist", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.database();
      await db.ref(`families/${FAMILY_ID}/placeComments/${COMMENT_PLACE_ID}/${NON_OWNER_PROFILE_ID}`).set({
        commentId: NON_OWNER_PROFILE_ID,
        placeId: COMMENT_PLACE_ID,
        authorProfileId: NON_OWNER_PROFILE_ID,
        authorSurnameSnapshot: "User",
        reaction: "like",
        text: "Ancien",
        createdAt: 10,
        updatedAt: 10,
        authorUid: NON_OWNER_UID,
      });
      await db.ref(`families/${FAMILY_ID}/placeComments/${COMMENT_PLACE_ID}/${VISITOR_PROFILE_ID}`).set({
        commentId: VISITOR_PROFILE_ID,
        placeId: COMMENT_PLACE_ID,
        authorProfileId: VISITOR_PROFILE_ID,
        authorSurnameSnapshot: "Visitor",
        reaction: "dislike",
        text: "Recent",
        createdAt: 12,
        updatedAt: 12,
        authorUid: VISITOR_UID,
      });
    });

    const nonOwnerDb = testEnv.authenticatedContext(NON_OWNER_UID).database();
    await assertSucceeds(
      nonOwnerDb.ref(`families/${FAMILY_ID}/placeComments/${COMMENT_PLACE_ID}/${NON_OWNER_PROFILE_ID}`).set(null)
    );
  });

  it("denies place comment text longer than 500 characters", async () => {
    const nonOwnerDb = testEnv.authenticatedContext(NON_OWNER_UID).database();

    await assertFails(
      nonOwnerDb.ref(`families/${FAMILY_ID}/placeComments/${COMMENT_PLACE_ID}/${NON_OWNER_PROFILE_ID}`).set({
        commentId: NON_OWNER_PROFILE_ID,
        placeId: COMMENT_PLACE_ID,
        authorProfileId: NON_OWNER_PROFILE_ID,
        authorSurnameSnapshot: "User",
        reaction: "like",
        text: "a".repeat(501),
        createdAt: 10,
        updatedAt: 10,
        authorUid: NON_OWNER_UID,
      })
    );
  });

  it("allows a profile to write its own destinationSurvey vote before unlock", async () => {
    const nonOwnerDb = testEnv.authenticatedContext(NON_OWNER_UID).database();

    await assertSucceeds(
      nonOwnerDb.ref(`families/${FAMILY_ID}/destinationSurvey/${NON_OWNER_PROFILE_ID}`).set({
        profileId: NON_OWNER_PROFILE_ID,
        proposals: ["Istanbul", "Ankara"],
        updatedAt: 123,
        authorUid: NON_OWNER_UID,
      })
    );
  });

  it("denies writing destinationSurvey for another profile", async () => {
    const nonOwnerDb = testEnv.authenticatedContext(NON_OWNER_UID).database();

    await assertFails(
      nonOwnerDb.ref(`families/${FAMILY_ID}/destinationSurvey/${OWNER_PROFILE_ID}`).set({
        profileId: OWNER_PROFILE_ID,
        proposals: ["Istanbul"],
        updatedAt: 124,
        authorUid: NON_OWNER_UID,
      })
    );
  });

  it("denies destinationSurvey writes once phase is during", async () => {
    const ownerDb = testEnv.authenticatedContext(OWNER_UID).database();
    await ownerDb.ref(`families/${FAMILY_ID}/phase`).set("during");

    const nonOwnerDb = testEnv.authenticatedContext(NON_OWNER_UID).database();
    await assertFails(
      nonOwnerDb.ref(`families/${FAMILY_ID}/destinationSurvey/${NON_OWNER_PROFILE_ID}`).set({
        profileId: NON_OWNER_PROFILE_ID,
        proposals: ["Istanbul"],
        updatedAt: 125,
        authorUid: NON_OWNER_UID,
      })
    );
  });

  it("allows a profile to write its own challenge reaction", async () => {
    const nonOwnerDb = testEnv.authenticatedContext(NON_OWNER_UID).database();

    await assertSucceeds(
      nonOwnerDb.ref(`families/${FAMILY_ID}/challengeReactions/3/${VISITOR_PROFILE_ID}/${NON_OWNER_PROFILE_ID}`).set({
        day: 3,
        targetProfileId: VISITOR_PROFILE_ID,
        reactorProfileId: NON_OWNER_PROFILE_ID,
        emoji: "clap",
        updatedAt: 123,
        authorUid: NON_OWNER_UID,
      })
    );
  });

  it("denies writing a challenge reaction on behalf of another profile", async () => {
    const nonOwnerDb = testEnv.authenticatedContext(NON_OWNER_UID).database();

    await assertFails(
      nonOwnerDb.ref(`families/${FAMILY_ID}/challengeReactions/3/${VISITOR_PROFILE_ID}/${VISITOR_PROFILE_ID}`).set({
        day: 3,
        targetProfileId: VISITOR_PROFILE_ID,
        reactorProfileId: VISITOR_PROFILE_ID,
        emoji: "wow",
        updatedAt: 124,
        authorUid: NON_OWNER_UID,
      })
    );
  });

  // Story 28.1 : conversation de groupe "Voyage" créée automatiquement,
  // messagerie texte réservée aux membres, aucune édition/suppression.
  describe("chat (story 28.1)", () => {
    const voyageConversation = {
      conversationId: "voyage",
      type: "group",
      name: "Voyage",
      isDefaultVoyage: true,
      memberProfileIds: { [OWNER_PROFILE_ID]: true, [NON_OWNER_PROFILE_ID]: true },
      createdAt: 100,
      createdByProfileId: OWNER_PROFILE_ID,
    };

    it("allows a family member to create the Voyage conversation with eligible members", async () => {
      const ownerDb = testEnv.authenticatedContext(OWNER_UID).database();

      await assertSucceeds(
        ownerDb.ref(`chatConversations/${FAMILY_ID}/voyage`).set(voyageConversation)
      );
    });

    it("denies creating a conversation that claims isDefaultVoyage for a non-'voyage' id", async () => {
      const ownerDb = testEnv.authenticatedContext(OWNER_UID).database();

      await assertFails(
        ownerDb.ref(`chatConversations/${FAMILY_ID}/custom-group`).set({
          ...voyageConversation,
          conversationId: "custom-group",
          isDefaultVoyage: true,
        })
      );
    });

    it("denies adding a visiteur profile to the Voyage conversation members", async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.database().ref(`chatConversations/${FAMILY_ID}/voyage`).set(voyageConversation);
      });

      const ownerDb = testEnv.authenticatedContext(OWNER_UID).database();
      await assertFails(
        ownerDb.ref(`chatConversations/${FAMILY_ID}/voyage/memberProfileIds/${VISITOR_PROFILE_ID}`).set(true)
      );
    });

    it("denies renaming the Voyage conversation, even for the owner", async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.database().ref(`chatConversations/${FAMILY_ID}/voyage`).set(voyageConversation);
      });

      const ownerDb = testEnv.authenticatedContext(OWNER_UID).database();
      await assertFails(ownerDb.ref(`chatConversations/${FAMILY_ID}/voyage/name`).set("Autre nom"));
    });

    it("denies deleting the Voyage conversation, even for the owner", async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.database().ref(`chatConversations/${FAMILY_ID}/voyage`).set(voyageConversation);
      });

      const ownerDb = testEnv.authenticatedContext(OWNER_UID).database();
      await assertFails(ownerDb.ref(`chatConversations/${FAMILY_ID}/voyage`).set(null));
    });

    it("denies a member from unilaterally leaving the Voyage conversation while their profile still exists", async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.database().ref(`chatConversations/${FAMILY_ID}/voyage`).set(voyageConversation);
      });

      const nonOwnerDb = testEnv.authenticatedContext(NON_OWNER_UID).database();
      await assertFails(
        nonOwnerDb.ref(`chatConversations/${FAMILY_ID}/voyage/memberProfileIds/${NON_OWNER_PROFILE_ID}`).set(null)
      );
    });

    it("allows removing a deleted profile from the Voyage conversation in the same atomic update", async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.database().ref(`chatConversations/${FAMILY_ID}/voyage`).set(voyageConversation);
      });

      const ownerDb = testEnv.authenticatedContext(OWNER_UID).database();
      await assertSucceeds(
        ownerDb.ref().update({
          [`families/${FAMILY_ID}/profiles/${NON_OWNER_PROFILE_ID}`]: null,
          [`chatConversations/${FAMILY_ID}/voyage/memberProfileIds/${NON_OWNER_PROFILE_ID}`]: null,
        })
      );
    });

    it("allows a member to send a text message in the Voyage conversation", async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.database().ref(`chatConversations/${FAMILY_ID}/voyage`).set(voyageConversation);
      });

      const nonOwnerDb = testEnv.authenticatedContext(NON_OWNER_UID).database();
      await assertSucceeds(
        nonOwnerDb.ref(`chatMessages/${FAMILY_ID}/voyage/message-1`).set({
          messageId: "message-1",
          conversationId: "voyage",
          authorProfileId: NON_OWNER_PROFILE_ID,
          authorSurnameSnapshot: "User",
          authorUid: NON_OWNER_UID,
          kind: "text",
          text: "Salut la famille",
          createdAt: 200,
        })
      );
    });

    it("denies sending a message on behalf of a profile that is not a member of the conversation", async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.database().ref(`chatConversations/${FAMILY_ID}/voyage`).set({
          ...voyageConversation,
          memberProfileIds: { [OWNER_PROFILE_ID]: true },
        });
      });

      const nonOwnerDb = testEnv.authenticatedContext(NON_OWNER_UID).database();
      await assertFails(
        nonOwnerDb.ref(`chatMessages/${FAMILY_ID}/voyage/message-2`).set({
          messageId: "message-2",
          conversationId: "voyage",
          authorProfileId: NON_OWNER_PROFILE_ID,
          authorSurnameSnapshot: "User",
          authorUid: NON_OWNER_UID,
          kind: "text",
          text: "Je ne suis pas membre",
          createdAt: 201,
        })
      );
    });

    it("denies a visiteur from sending a message even if somehow listed as a member", async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.database().ref(`chatConversations/${FAMILY_ID}/voyage`).set({
          ...voyageConversation,
          memberProfileIds: { ...voyageConversation.memberProfileIds, [VISITOR_PROFILE_ID]: true },
        });
      });

      const visitorDb = testEnv.authenticatedContext(VISITOR_UID).database();
      await assertFails(
        visitorDb.ref(`chatMessages/${FAMILY_ID}/voyage/message-3`).set({
          messageId: "message-3",
          conversationId: "voyage",
          authorProfileId: VISITOR_PROFILE_ID,
          authorSurnameSnapshot: "Visitor",
          authorUid: VISITOR_UID,
          kind: "text",
          text: "Je ne devrais pas pouvoir écrire",
          createdAt: 202,
        })
      );
    });

    it("denies editing an already-sent message", async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.database().ref(`chatConversations/${FAMILY_ID}/voyage`).set(voyageConversation);
        await context.database().ref(`chatMessages/${FAMILY_ID}/voyage/message-4`).set({
          messageId: "message-4",
          conversationId: "voyage",
          authorProfileId: NON_OWNER_PROFILE_ID,
          authorSurnameSnapshot: "User",
          authorUid: NON_OWNER_UID,
          kind: "text",
          text: "Message initial",
          createdAt: 203,
        });
      });

      const nonOwnerDb = testEnv.authenticatedContext(NON_OWNER_UID).database();
      await assertFails(
        nonOwnerDb.ref(`chatMessages/${FAMILY_ID}/voyage/message-4/text`).set("Message modifié")
      );
    });

    it("denies deleting an already-sent message", async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.database().ref(`chatConversations/${FAMILY_ID}/voyage`).set(voyageConversation);
        await context.database().ref(`chatMessages/${FAMILY_ID}/voyage/message-5`).set({
          messageId: "message-5",
          conversationId: "voyage",
          authorProfileId: NON_OWNER_PROFILE_ID,
          authorSurnameSnapshot: "User",
          authorUid: NON_OWNER_UID,
          kind: "text",
          text: "Message à ne pas supprimer",
          createdAt: 204,
        });
      });

      const nonOwnerDb = testEnv.authenticatedContext(NON_OWNER_UID).database();
      await assertFails(nonOwnerDb.ref(`chatMessages/${FAMILY_ID}/voyage/message-5`).set(null));
    });

    it("denies a message text longer than 2000 characters", async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.database().ref(`chatConversations/${FAMILY_ID}/voyage`).set(voyageConversation);
      });

      const nonOwnerDb = testEnv.authenticatedContext(NON_OWNER_UID).database();
      await assertFails(
        nonOwnerDb.ref(`chatMessages/${FAMILY_ID}/voyage/message-6`).set({
          messageId: "message-6",
          conversationId: "voyage",
          authorProfileId: NON_OWNER_PROFILE_ID,
          authorSurnameSnapshot: "User",
          authorUid: NON_OWNER_UID,
          kind: "text",
          text: "a".repeat(2001),
          createdAt: 205,
        })
      );
    });
  });

  describe("chat groups and 1-to-1 conversations (story 28.2)", () => {
    function customGroupPayload(overrides: Record<string, unknown> = {}) {
      return {
        conversationId: "custom-group",
        type: "group",
        name: "Les grands",
        isDefaultVoyage: false,
        memberProfileIds: { [OWNER_PROFILE_ID]: true, [NON_OWNER_PROFILE_ID]: true },
        createdAt: 100,
        createdByProfileId: OWNER_PROFILE_ID,
        ...overrides,
      };
    }

    function directPayload(overrides: Record<string, unknown> = {}) {
      return {
        conversationId: "custom-direct",
        type: "direct",
        name: "Conversation",
        isDefaultVoyage: false,
        memberProfileIds: { [OWNER_PROFILE_ID]: true, [NON_OWNER_PROFILE_ID]: true },
        createdAt: 100,
        createdByProfileId: OWNER_PROFILE_ID,
        ...overrides,
      };
    }

    it("allows a member to create a named custom group with eligible members", async () => {
      const ownerDb = testEnv.authenticatedContext(OWNER_UID).database();

      await assertSucceeds(
        ownerDb.ref(`chatConversations/${FAMILY_ID}/custom-group`).set(customGroupPayload())
      );
    });

    it("allows a member to create a 1-to-1 conversation with exactly two members", async () => {
      const ownerDb = testEnv.authenticatedContext(OWNER_UID).database();

      await assertSucceeds(
        ownerDb.ref(`chatConversations/${FAMILY_ID}/custom-direct`).set(directPayload())
      );
    });

    // Note : le nombre de membres (exactement 2 pour un 1-to-1, au moins 2
    // pour un groupe) n'est PAS vérifiable côté règles RTDB — il n'existe
    // pas d'équivalent rules de `numChildren()` (propre au SDK client, pas
    // au langage des règles ; une première version de ces règles s'appuyait
    // dessus à tort et a été rejetée par la console Firebase avec l'erreur
    // "No such method/property 'numChildren'"). Cette contrainte reste donc
    // uniquement appliquée côté client (cf. ChatHomeScreen : sélecteur à
    // choix unique pour un 1-to-1, au moins un membre coché pour un groupe).

    it("denies including a visiteur profile as a member at creation", async () => {
      const ownerDb = testEnv.authenticatedContext(OWNER_UID).database();

      await assertFails(
        ownerDb.ref(`chatConversations/${FAMILY_ID}/custom-group`).set(
          customGroupPayload({
            memberProfileIds: { [OWNER_PROFILE_ID]: true, [VISITOR_PROFILE_ID]: true },
          })
        )
      );
    });

    it("denies impersonating another profile as createdByProfileId", async () => {
      const nonOwnerDb = testEnv.authenticatedContext(NON_OWNER_UID).database();

      await assertFails(
        nonOwnerDb.ref(`chatConversations/${FAMILY_ID}/custom-group`).set(customGroupPayload())
      );
    });

    it("allows any member (not just the creator) to rename a custom group", async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.database().ref(`chatConversations/${FAMILY_ID}/custom-group`).set(customGroupPayload());
      });

      const nonOwnerDb = testEnv.authenticatedContext(NON_OWNER_UID).database();
      await assertSucceeds(
        nonOwnerDb.ref(`chatConversations/${FAMILY_ID}/custom-group/name`).set("Nouveau nom")
      );
    });

    it("allows a member to leave a custom group (self-only)", async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.database().ref(`chatConversations/${FAMILY_ID}/custom-group`).set(customGroupPayload());
      });

      const nonOwnerDb = testEnv.authenticatedContext(NON_OWNER_UID).database();
      await assertSucceeds(
        nonOwnerDb.ref(`chatConversations/${FAMILY_ID}/custom-group/memberProfileIds/${NON_OWNER_PROFILE_ID}`).set(null)
      );
    });

    it("denies a member from removing someone else's membership in a custom group", async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.database().ref(`chatConversations/${FAMILY_ID}/custom-group`).set(customGroupPayload());
      });

      const nonOwnerDb = testEnv.authenticatedContext(NON_OWNER_UID).database();
      await assertFails(
        nonOwnerDb.ref(`chatConversations/${FAMILY_ID}/custom-group/memberProfileIds/${OWNER_PROFILE_ID}`).set(null)
      );
    });

    it("denies adding a new member to a custom group after its creation (composition is fixed in v1)", async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.database().ref(`chatConversations/${FAMILY_ID}/custom-group`).set(
          customGroupPayload({ memberProfileIds: { [OWNER_PROFILE_ID]: true } })
        );
      });

      const ownerDb = testEnv.authenticatedContext(OWNER_UID).database();
      await assertFails(
        ownerDb.ref(`chatConversations/${FAMILY_ID}/custom-group/memberProfileIds/${NON_OWNER_PROFILE_ID}`).set(true)
      );
    });

    it("allows removing a deleted profile from a custom group in the same atomic update", async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.database().ref(`chatConversations/${FAMILY_ID}/custom-group`).set(customGroupPayload());
      });

      const ownerDb = testEnv.authenticatedContext(OWNER_UID).database();
      await assertSucceeds(
        ownerDb.ref().update({
          [`families/${FAMILY_ID}/profiles/${NON_OWNER_PROFILE_ID}`]: null,
          [`chatConversations/${FAMILY_ID}/custom-group/memberProfileIds/${NON_OWNER_PROFILE_ID}`]: null,
        })
      );
    });
  });

  // Story 28.3 : sondages du propriétaire, uniquement dans "Voyage".
  describe("chat polls (story 28.3)", () => {
    const voyageConversation = {
      conversationId: "voyage",
      type: "group",
      name: "Voyage",
      isDefaultVoyage: true,
      memberProfileIds: { [OWNER_PROFILE_ID]: true, [NON_OWNER_PROFILE_ID]: true },
      createdAt: 100,
      createdByProfileId: OWNER_PROFILE_ID,
    };

    function pollPayload(overrides: Record<string, unknown> = {}) {
      return {
        messageId: "poll-1",
        conversationId: "voyage",
        authorProfileId: OWNER_PROFILE_ID,
        authorSurnameSnapshot: "Organisateur",
        authorUid: OWNER_UID,
        kind: "poll",
        pollType: "oui_non",
        pollQuestion: "On part tôt demain ?",
        pollClosed: false,
        createdAt: 300,
        ...overrides,
      };
    }

    it("allows the proprietaire to create a poll in the Voyage conversation", async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.database().ref(`chatConversations/${FAMILY_ID}/voyage`).set(voyageConversation);
      });

      const ownerDb = testEnv.authenticatedContext(OWNER_UID).database();
      await assertSucceeds(ownerDb.ref(`chatMessages/${FAMILY_ID}/voyage/poll-1`).set(pollPayload()));
    });

    it("denies a non-owner from creating a poll, even in the Voyage conversation", async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.database().ref(`chatConversations/${FAMILY_ID}/voyage`).set(voyageConversation);
      });

      const nonOwnerDb = testEnv.authenticatedContext(NON_OWNER_UID).database();
      await assertFails(
        nonOwnerDb.ref(`chatMessages/${FAMILY_ID}/voyage/poll-2`).set(
          pollPayload({
            messageId: "poll-2",
            authorProfileId: NON_OWNER_PROFILE_ID,
            authorSurnameSnapshot: "User",
            authorUid: NON_OWNER_UID,
          })
        )
      );
    });

    it("denies the owner from creating a poll in a custom group", async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.database().ref(`chatConversations/${FAMILY_ID}/custom-group`).set({
          conversationId: "custom-group",
          type: "group",
          name: "Les grands",
          isDefaultVoyage: false,
          memberProfileIds: { [OWNER_PROFILE_ID]: true, [NON_OWNER_PROFILE_ID]: true },
          createdAt: 100,
          createdByProfileId: OWNER_PROFILE_ID,
        });
      });

      const ownerDb = testEnv.authenticatedContext(OWNER_UID).database();
      await assertFails(
        ownerDb
          .ref(`chatMessages/${FAMILY_ID}/custom-group/poll-3`)
          .set(pollPayload({ messageId: "poll-3", conversationId: "custom-group" }))
      );
    });

    it("allows a member to submit their own poll response", async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.database().ref(`chatConversations/${FAMILY_ID}/voyage`).set(voyageConversation);
        await context.database().ref(`chatMessages/${FAMILY_ID}/voyage/poll-1`).set(pollPayload());
      });

      const nonOwnerDb = testEnv.authenticatedContext(NON_OWNER_UID).database();
      await assertSucceeds(
        nonOwnerDb.ref(`chatMessages/${FAMILY_ID}/voyage/poll-1/pollResponses/${NON_OWNER_PROFILE_ID}`).set({
          profileId: NON_OWNER_PROFILE_ID,
          value: "oui",
          updatedAt: 400,
          authorUid: NON_OWNER_UID,
        })
      );
    });

    it("denies submitting a poll response on behalf of another profile", async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.database().ref(`chatConversations/${FAMILY_ID}/voyage`).set(voyageConversation);
        await context.database().ref(`chatMessages/${FAMILY_ID}/voyage/poll-1`).set(pollPayload());
      });

      const nonOwnerDb = testEnv.authenticatedContext(NON_OWNER_UID).database();
      await assertFails(
        nonOwnerDb.ref(`chatMessages/${FAMILY_ID}/voyage/poll-1/pollResponses/${OWNER_PROFILE_ID}`).set({
          profileId: OWNER_PROFILE_ID,
          value: "oui",
          updatedAt: 400,
          authorUid: NON_OWNER_UID,
        })
      );
    });

    it("denies a value other than 'oui'/'non' for an oui_non poll", async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.database().ref(`chatConversations/${FAMILY_ID}/voyage`).set(voyageConversation);
        await context.database().ref(`chatMessages/${FAMILY_ID}/voyage/poll-1`).set(pollPayload());
      });

      const nonOwnerDb = testEnv.authenticatedContext(NON_OWNER_UID).database();
      await assertFails(
        nonOwnerDb.ref(`chatMessages/${FAMILY_ID}/voyage/poll-1/pollResponses/${NON_OWNER_PROFILE_ID}`).set({
          profileId: NON_OWNER_PROFILE_ID,
          value: "peut-être",
          updatedAt: 400,
          authorUid: NON_OWNER_UID,
        })
      );
    });

    it("denies a libre answer longer than 100 characters", async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.database().ref(`chatConversations/${FAMILY_ID}/voyage`).set(voyageConversation);
        await context
          .database()
          .ref(`chatMessages/${FAMILY_ID}/voyage/poll-1`)
          .set(pollPayload({ pollType: "libre", pollQuestion: "Comment vous sentez-vous ?" }));
      });

      const nonOwnerDb = testEnv.authenticatedContext(NON_OWNER_UID).database();
      await assertFails(
        nonOwnerDb.ref(`chatMessages/${FAMILY_ID}/voyage/poll-1/pollResponses/${NON_OWNER_PROFILE_ID}`).set({
          profileId: NON_OWNER_PROFILE_ID,
          value: "a".repeat(101),
          updatedAt: 400,
          authorUid: NON_OWNER_UID,
        })
      );
    });

    it("denies responding once the poll is closed", async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.database().ref(`chatConversations/${FAMILY_ID}/voyage`).set(voyageConversation);
        await context.database().ref(`chatMessages/${FAMILY_ID}/voyage/poll-1`).set(pollPayload({ pollClosed: true }));
      });

      const nonOwnerDb = testEnv.authenticatedContext(NON_OWNER_UID).database();
      await assertFails(
        nonOwnerDb.ref(`chatMessages/${FAMILY_ID}/voyage/poll-1/pollResponses/${NON_OWNER_PROFILE_ID}`).set({
          profileId: NON_OWNER_PROFILE_ID,
          value: "oui",
          updatedAt: 400,
          authorUid: NON_OWNER_UID,
        })
      );
    });

    it("allows the owner to close an open poll", async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.database().ref(`chatConversations/${FAMILY_ID}/voyage`).set(voyageConversation);
        await context.database().ref(`chatMessages/${FAMILY_ID}/voyage/poll-1`).set(pollPayload());
      });

      const ownerDb = testEnv.authenticatedContext(OWNER_UID).database();
      await assertSucceeds(ownerDb.ref(`chatMessages/${FAMILY_ID}/voyage/poll-1/pollClosed`).set(true));
    });

    it("denies a non-owner from closing the poll", async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.database().ref(`chatConversations/${FAMILY_ID}/voyage`).set(voyageConversation);
        await context.database().ref(`chatMessages/${FAMILY_ID}/voyage/poll-1`).set(pollPayload());
      });

      const nonOwnerDb = testEnv.authenticatedContext(NON_OWNER_UID).database();
      await assertFails(nonOwnerDb.ref(`chatMessages/${FAMILY_ID}/voyage/poll-1/pollClosed`).set(true));
    });
  });

  describe("chat read state (story 28.4)", () => {
    it("allows a family member to write their own read state on a conversation", async () => {
      const nonOwnerDb = testEnv.authenticatedContext(NON_OWNER_UID).database();

      await assertSucceeds(
        nonOwnerDb.ref(`chatReadState/${FAMILY_ID}/voyage/${NON_OWNER_PROFILE_ID}`).set({
          lastReadAt: 100,
          authorUid: NON_OWNER_UID,
        })
      );
    });

    it("denies a read state missing required fields", async () => {
      const nonOwnerDb = testEnv.authenticatedContext(NON_OWNER_UID).database();

      await assertFails(
        nonOwnerDb.ref(`chatReadState/${FAMILY_ID}/voyage/${NON_OWNER_PROFILE_ID}`).set({
          lastReadAt: 100,
        })
      );
    });

    it("denies lastReadAt going backwards (cas limite multi-appareils)", async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.database().ref(`chatReadState/${FAMILY_ID}/voyage/${NON_OWNER_PROFILE_ID}`).set({
          lastReadAt: 500,
          authorUid: NON_OWNER_UID,
        });
      });

      const nonOwnerDb = testEnv.authenticatedContext(NON_OWNER_UID).database();
      await assertFails(
        nonOwnerDb.ref(`chatReadState/${FAMILY_ID}/voyage/${NON_OWNER_PROFILE_ID}`).set({
          lastReadAt: 100,
          authorUid: NON_OWNER_UID,
        })
      );
    });

    it("allows lastReadAt to advance", async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.database().ref(`chatReadState/${FAMILY_ID}/voyage/${NON_OWNER_PROFILE_ID}`).set({
          lastReadAt: 100,
          authorUid: NON_OWNER_UID,
        });
      });

      const nonOwnerDb = testEnv.authenticatedContext(NON_OWNER_UID).database();
      await assertSucceeds(
        nonOwnerDb.ref(`chatReadState/${FAMILY_ID}/voyage/${NON_OWNER_PROFILE_ID}`).set({
          lastReadAt: 500,
          authorUid: NON_OWNER_UID,
        })
      );
    });

    it("denies a non-family-member from writing a read state", async () => {
      const outsiderDb = testEnv.unauthenticatedContext().database();

      await assertFails(
        outsiderDb.ref(`chatReadState/${FAMILY_ID}/voyage/${NON_OWNER_PROFILE_ID}`).set({
          lastReadAt: 100,
          authorUid: "outsider-uid",
        })
      );
    });
  });
});

if (!hasDatabaseEmulator) {
  console.warn(
    "Skipping firebase-rtdb.rules.test.ts because FIREBASE_DATABASE_EMULATOR_HOST is not set."
  );
}
