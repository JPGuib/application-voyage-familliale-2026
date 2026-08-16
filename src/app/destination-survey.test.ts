import { describe, expect, it } from "vitest";
import {
  computeDestinationSurveyResults,
  destinationEquals,
  validateDestinationProposals,
} from "./destination-survey";

describe("destination-survey", () => {
  it("matches text case-insensitively with Unicode normalization and trim", () => {
    const composed = "Éphèse";
    const decomposed = "E\u0301phe\u0300se";

    expect(destinationEquals("  istanbul ", "ISTANBUL")).toBe(true);
    expect(destinationEquals(composed, decomposed)).toBe(true);
    expect(destinationEquals("Ankara", "Izmir")).toBe(false);
  });

  it("rejects more than three proposals with explicit message", () => {
    const result = validateDestinationProposals(["Istanbul", "Ankara", "Izmir", "Bursa"]);

    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/Maximum 3 propositions/i);
  });

  it("awards destination points by proposal order and excludes non-user roles from score", () => {
    const results = computeDestinationSurveyResults({
      destination: "Istanbul",
      participants: [
        { profileId: "u1", surname: "Lena", role: "utilisateur" },
        { profileId: "u2", surname: "Noah", role: "utilisateur" },
        { profileId: "u3", surname: "Mila", role: "utilisateur" },
        { profileId: "o1", surname: "Parent", role: "proprietaire" },
        { profileId: "v1", surname: "Guest", role: "visiteur" },
      ],
      votesByProfile: {
        u1: { profileId: "u1", proposals: ["Istanbul", "Ankara", "Izmir"], updatedAt: 1000 },
        u2: { profileId: "u2", proposals: ["Ankara", "ISTANBUL", "Izmir"], updatedAt: 1000 },
        u3: { profileId: "u3", proposals: ["Ankara", "Izmir", "Istanbul"], updatedAt: 2000 },
        o1: { profileId: "o1", proposals: ["Istanbul"], updatedAt: 900 },
        v1: { profileId: "v1", proposals: ["Istanbul"], updatedAt: 800 },
      },
      scoring: [
        { basePoints: 30, bonusPoints: 10 },
        { basePoints: 30, bonusPoints: 5 },
        { basePoints: 20, bonusPoints: 0 },
      ],
    });

    const byId = Object.fromEntries(results.rows.map((row) => [row.profileId, row]));

    expect(byId.u1.points).toBe(40);
    expect(byId.u1.rank).toBe(1);
    expect(byId.u2.points).toBe(35);
    expect(byId.u2.rank).toBe(2);
    expect(byId.u3.points).toBe(20);
    expect(byId.u3.rank).toBe(3);

    expect(byId.o1.isCorrect).toBe(true);
    expect(byId.o1.points).toBe(0);
    expect(byId.o1.rank).toBeNull();

    expect(byId.v1.isCorrect).toBe(true);
    expect(byId.v1.points).toBe(0);
    expect(byId.v1.rank).toBeNull();
  });
});
