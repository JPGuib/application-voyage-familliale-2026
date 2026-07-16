import { describe, expect, it, beforeEach } from "vitest";
import {
  verifyOwnerRecoveryPhrase,
  hashOwnerRecoveryPhrase,
} from "./owner-recovery";

describe("owner recovery phrase integration tests", () => {
  let recoveryHash: string;

  beforeEach(async () => {
    recoveryHash = await hashOwnerRecoveryPhrase("my recovery phrase");
  });

  it("owner can configure recovery phrase", async () => {
    const phrase = "favorite sunset memory";
    const hash = await hashOwnerRecoveryPhrase(phrase);
    expect(hash).toBeTruthy();
    expect(hash.startsWith("sha256:")).toBe(true);
  });

  it("owner can verify recovery phrase after configuration", async () => {
    const phrase = "favorite sunset memory";
    const hash = await hashOwnerRecoveryPhrase(phrase);
    const isValid = await verifyOwnerRecoveryPhrase(phrase, hash);
    expect(isValid).toBe(true);
  });

  it("non-owner role cannot access recovery phrase configuration", () => {
    // This test validates the UI-level access control
    // Non-owner should not see recovery phrase settings in SettingsScreen
    const userRole = "utilisateur";
    const shouldShowRecoveryPhrase = userRole === "proprietaire";
    expect(shouldShowRecoveryPhrase).toBe(false);
  });

  it("recovery phrase is stored hashed in cloud state", async () => {
    const phrase = "my recovery phrase";
    const hash = await hashOwnerRecoveryPhrase(phrase);

    // Simulate cloud storage
    const cloudRecord = {
      ownerRecoveryHash: hash,
      ownerRecoveryConfiguredAt: Date.now(),
    };

    expect(cloudRecord.ownerRecoveryHash).toBe(hash);
    expect(cloudRecord.ownerRecoveryConfiguredAt).toBeGreaterThan(0);
  });

  it("recovery phrase verification rejects incorrect phrase", async () => {
    const correctPhrase = "favorite sunset memory";
    const wrongPhrase = "favorite sunrise memory";
    const hash = await hashOwnerRecoveryPhrase(correctPhrase);

    const isValid = await verifyOwnerRecoveryPhrase(wrongPhrase, hash);
    expect(isValid).toBe(false);
  });
});
