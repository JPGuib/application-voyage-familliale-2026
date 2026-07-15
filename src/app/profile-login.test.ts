import { describe, expect, it } from "vitest";
import { findDuplicateProfileBySurname } from "./profile-login";

describe("findDuplicateProfileBySurname", () => {
  const candidates = [
    { id: "p-1", surname: "Maman" },
    { id: "p-2", surname: "Léo" },
    { id: "p-3", surname: "  Papa  ", role: "utilisateur" },
  ] as const;

  it("returns null when input is empty", () => {
    expect(findDuplicateProfileBySurname(candidates, "   ")).toBeNull();
  });

  it("finds duplicate with case-insensitive match", () => {
    expect(findDuplicateProfileBySurname(candidates, "mAmAn")?.id).toBe("p-1");
  });

  it("finds duplicate when accents differ", () => {
    expect(findDuplicateProfileBySurname(candidates, "Leo")?.id).toBe("p-2");
  });

  it("finds duplicate with normalized spaces", () => {
    expect(findDuplicateProfileBySurname(candidates, "papa")?.id).toBe("p-3");
  });

  it("returns null when no duplicate exists", () => {
    expect(findDuplicateProfileBySurname(candidates, "Emma")).toBeNull();
  });
});
