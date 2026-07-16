import { describe, expect, it } from "vitest";
import {
  hashOwnerRecoveryPhrase,
  isOwnerRecoveryHash,
  verifyOwnerRecoveryPhrase,
} from "./owner-recovery";

describe("owner recovery phrase hashing", () => {
  it("returns deterministic sha256 hash format", async () => {
    const phraseA = await hashOwnerRecoveryPhrase("favorite sunset memory");
    const phraseB = await hashOwnerRecoveryPhrase("favorite sunset memory");

    expect(phraseA).toBe(phraseB);
    expect(isOwnerRecoveryHash(phraseA)).toBe(true);
  });

  it("verifies correct and incorrect recovery phrases", async () => {
    const hash = await hashOwnerRecoveryPhrase("my secret phrase");

    await expect(
      verifyOwnerRecoveryPhrase("my secret phrase", hash)
    ).resolves.toBe(true);
    await expect(
      verifyOwnerRecoveryPhrase("my secret phrase!", hash)
    ).resolves.toBe(false);
  });

  it("rejects legacy clear-text stored values", async () => {
    await expect(
      verifyOwnerRecoveryPhrase("test phrase", "test phrase")
    ).resolves.toBe(false);
  });

  it("validates hash format correctly", () => {
    expect(isOwnerRecoveryHash("sha256:abc")).toBe(false);
    expect(isOwnerRecoveryHash("sha256:" + "a".repeat(64))).toBe(true);
    expect(isOwnerRecoveryHash("invalid:format")).toBe(false);
  });
});
