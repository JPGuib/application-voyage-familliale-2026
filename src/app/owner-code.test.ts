import { describe, expect, it } from "vitest";
import { hashOwnerCode, isOwnerCodeHash, verifyOwnerCode } from "./owner-code";

describe("owner code hashing", () => {
  it("returns deterministic sha256 hash format", async () => {
    const valueA = await hashOwnerCode("1234");
    const valueB = await hashOwnerCode("1234");

    expect(valueA).toBe(valueB);
    expect(isOwnerCodeHash(valueA)).toBe(true);
  });

  it("verifies correct and incorrect owner codes", async () => {
    const hash = await hashOwnerCode("abcd");

    await expect(verifyOwnerCode("abcd", hash)).resolves.toBe(true);
    await expect(verifyOwnerCode("abce", hash)).resolves.toBe(false);
  });

  it("rejects legacy clear-text stored values", async () => {
    await expect(verifyOwnerCode("4321", "4321")).resolves.toBe(false);
    await expect(verifyOwnerCode("9999", "4321")).resolves.toBe(false);
  });
});
