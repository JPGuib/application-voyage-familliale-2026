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
const SECOND_OWNER_DEVICE_UID = "owner-second-device-uid";
const OWNER_PROFILE_ID = "profile-owner";
const NON_OWNER_PROFILE_ID = "profile-user";

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
      await db.ref(`ownerMembers/${FAMILY_ID}/${OWNER_UID}`).set(true);
      await db.ref(`families/${FAMILY_ID}/ownerUid`).set(OWNER_UID);
      await db.ref(`families/${FAMILY_ID}/ownerProfileId`).set(OWNER_PROFILE_ID);
      await db.ref(`families/${FAMILY_ID}/phase`).set("before");
      await db.ref(`families/${FAMILY_ID}/profiles/${OWNER_PROFILE_ID}`).set({
        surname: "Owner",
        role: "proprietaire",
        createdAt: 1,
        lastSyncAt: 1,
      });
      await db.ref(`families/${FAMILY_ID}/profiles/${NON_OWNER_PROFILE_ID}`).set({
        surname: "User",
        role: "utilisateur",
        createdAt: 1,
        lastSyncAt: 1,
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

  it("allows owner to clear ownerCodePlain", async () => {
    const ownerDb = testEnv.authenticatedContext(OWNER_UID).database();

    await assertSucceeds(ownerDb.ref(`families/${FAMILY_ID}/ownerCodePlain`).set(null));
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

  it("allows any authenticated user to self-register in ownerMembers", async () => {
    const secondDeviceDb = testEnv.authenticatedContext(SECOND_OWNER_DEVICE_UID).database();

    await assertSucceeds(
      secondDeviceDb.ref(`ownerMembers/${FAMILY_ID}/${SECOND_OWNER_DEVICE_UID}`).set(true)
    );
  });

  it("denies registering someone else's uid in ownerMembers", async () => {
    const secondDeviceDb = testEnv.authenticatedContext(SECOND_OWNER_DEVICE_UID).database();

    await assertFails(
      secondDeviceDb.ref(`ownerMembers/${FAMILY_ID}/${OWNER_UID}`).set(true)
    );
  });

  it("allows a second registered owner device to write family-wide phase", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context
        .database()
        .ref(`familyMembers/${FAMILY_ID}/${SECOND_OWNER_DEVICE_UID}`)
        .set(true);
      await context
        .database()
        .ref(`ownerMembers/${FAMILY_ID}/${SECOND_OWNER_DEVICE_UID}`)
        .set(true);
    });

    const secondDeviceDb = testEnv.authenticatedContext(SECOND_OWNER_DEVICE_UID).database();

    await assertSucceeds(secondDeviceDb.ref(`families/${FAMILY_ID}/phase`).set("during"));
    await assertSucceeds(
      secondDeviceDb.ref(`families/${FAMILY_ID}/tripStartDate`).set("2026-08-16")
    );
  });

  it("denies phase write from a device not registered in ownerMembers, even if familyMembers-listed", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context
        .database()
        .ref(`familyMembers/${FAMILY_ID}/${SECOND_OWNER_DEVICE_UID}`)
        .set(true);
      // Volontairement pas ajouté à ownerMembers.
    });

    const secondDeviceDb = testEnv.authenticatedContext(SECOND_OWNER_DEVICE_UID).database();

    await assertFails(secondDeviceDb.ref(`families/${FAMILY_ID}/phase`).set("during"));
  });
});

if (!hasDatabaseEmulator) {
  console.warn(
    "Skipping firebase-rtdb.rules.test.ts because FIREBASE_DATABASE_EMULATOR_HOST is not set."
  );
}
