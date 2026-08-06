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
});

if (!hasDatabaseEmulator) {
  console.warn(
    "Skipping firebase-rtdb.rules.test.ts because FIREBASE_DATABASE_EMULATOR_HOST is not set."
  );
}
