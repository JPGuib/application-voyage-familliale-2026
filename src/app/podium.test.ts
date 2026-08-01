import { describe, expect, it } from "vitest";
import { computePodium } from "./podium";

describe("computePodium", () => {
  it("excludes the owner even if they have the highest score", () => {
    const podium = computePodium([
      { profileId: "owner", surname: "Papa", role: "proprietaire", gameResults: [{ totalScore: 999 }] },
      { profileId: "a", surname: "Ana", role: "utilisateur", gameResults: [{ totalScore: 40 }] },
    ]);

    expect(podium.map((entry) => entry.profileId)).toEqual(["a"]);
  });

  it("ranks non-owner profiles by cumulative score across all days", () => {
    const podium = computePodium([
      {
        profileId: "a",
        surname: "Ana",
        role: "utilisateur",
        gameResults: [{ totalScore: 10 }, { totalScore: 20 }],
      },
      { profileId: "b", surname: "Bo", role: "utilisateur", gameResults: [{ totalScore: 50 }] },
    ]);

    expect(podium).toEqual([
      { profileId: "b", surname: "Bo", total: 50, rank: 1 },
      { profileId: "a", surname: "Ana", total: 30, rank: 2 },
    ]);
  });

  it("shares the same rank for tied totals", () => {
    const podium = computePodium([
      { profileId: "a", surname: "Ana", role: "utilisateur", gameResults: [{ totalScore: 30 }] },
      { profileId: "b", surname: "Bo", role: "utilisateur", gameResults: [{ totalScore: 30 }] },
      { profileId: "c", surname: "Cy", role: "utilisateur", gameResults: [{ totalScore: 10 }] },
    ]);

    expect(podium).toEqual([
      { profileId: "a", surname: "Ana", total: 30, rank: 1 },
      { profileId: "b", surname: "Bo", total: 30, rank: 1 },
      { profileId: "c", surname: "Cy", total: 10, rank: 3 },
    ]);
  });

  it("includes a profile that never played, at 0 points", () => {
    const podium = computePodium([
      { profileId: "a", surname: "Ana", role: "utilisateur", gameResults: [] },
    ]);

    expect(podium).toEqual([{ profileId: "a", surname: "Ana", total: 0, rank: 1 }]);
  });

  it("returns an empty podium when there are no non-owner profiles", () => {
    const podium = computePodium([
      { profileId: "owner", surname: "Papa", role: "proprietaire", gameResults: [] },
    ]);

    expect(podium).toEqual([]);
  });

  it("excludes a visitor even if they have the highest score (story 24.3)", () => {
    const podium = computePodium([
      { profileId: "owner", surname: "Papa", role: "proprietaire", gameResults: [{ totalScore: 999 }] },
      { profileId: "visitor", surname: "Tonton", role: "visiteur", gameResults: [{ totalScore: 500 }] },
      { profileId: "a", surname: "Ana", role: "utilisateur", gameResults: [{ totalScore: 40 }] },
    ]);

    expect(podium.map((entry) => entry.profileId)).toEqual(["a"]);
  });
});
