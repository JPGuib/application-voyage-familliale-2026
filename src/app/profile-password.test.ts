import { describe, expect, it } from "vitest";
import {
  hashProfilePassword,
  isProfilePasswordHash,
  verifyProfilePassword,
} from "./profile-password";

describe("profile password hashing", () => {
  it("returns deterministic sha256 hash format", async () => {
    const valueA = await hashProfilePassword("abc123");
    const valueB = await hashProfilePassword("abc123");

    expect(valueA).toBe(valueB);
    expect(isProfilePasswordHash(valueA)).toBe(true);
  });

  it("verifies correct and incorrect profile passwords", async () => {
    const hash = await hashProfilePassword("my profile secret");

    await expect(verifyProfilePassword("my profile secret", hash)).resolves.toBe(true);
    await expect(verifyProfilePassword("my profile secret!", hash)).resolves.toBe(false);
  });

  it("rejects invalid and legacy clear-text stored values", async () => {
    await expect(verifyProfilePassword("4321", "4321")).resolves.toBe(false);
    await expect(verifyProfilePassword("4321", "sha256:abc")).resolves.toBe(false);
    expect(isProfilePasswordHash("")).toBe(false);
    expect(isProfilePasswordHash("invalid")).toBe(false);
  });
});
