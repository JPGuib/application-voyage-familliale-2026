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

  it("allows non-owner to write profile-scoped checklist", async () => {
    const nonOwnerDb = testEnv.authenticatedContext(NON_OWNER_UID).database();

    await assertSucceeds(nonOwnerDb.ref(`families/${FAMILY_ID}/checklists/${NON_OWNER_PROFILE_ID}/item-a`).set(true));
  });
});

if (!hasDatabaseEmulator) {
  console.warn(
    "Skipping firebase-rtdb.rules.test.ts because FIREBASE_DATABASE_EMULATOR_HOST is not set."
  );
}
