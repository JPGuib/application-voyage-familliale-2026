import { describe, expect, it } from "vitest";
import {
  computeCandyCrushPodium,
  mergeCandyCrushChallengeRecord,
  parseCandyCrushChallengeRecord,
} from "./candy-crush-challenge";

describe("parseCandyCrushChallengeRecord", () => {
  it("returns null for null/undefined", () => {
    expect(parseCandyCrushChallengeRecord(null)).toBeNull();
    expect(parseCandyCrushChallengeRecord(undefined)).toBeNull();
  });

  it("parses a valid record", () => {
    expect(parseCandyCrushChallengeRecord({ bestScore: 120, updatedAt: 42 })).toEqual({
      bestScore: 120,
      updatedAt: 42,
    });
  });

  it("parses a valid JSON string (localStorage shape)", () => {
    expect(
      parseCandyCrushChallengeRecord(JSON.stringify({ bestScore: 120, updatedAt: 42 }))
    ).toEqual({ bestScore: 120, updatedAt: 42 });
  });

  it("rejects malformed input", () => {
    expect(parseCandyCrushChallengeRecord({ bestScore: "120", updatedAt: 42 })).toBeNull();
    expect(parseCandyCrushChallengeRecord({ bestScore: -5, updatedAt: 42 })).toBeNull();
    expect(parseCandyCrushChallengeRecord("not json")).toBeNull();
    expect(parseCandyCrushChallengeRecord(42)).toBeNull();
  });
});

describe("mergeCandyCrushChallengeRecord", () => {
  it("keeps the higher bestScore regardless of side", () => {
    const local = { bestScore: 100, updatedAt: 10 };
    const cloud = { bestScore: 200, updatedAt: 5 };
    expect(mergeCandyCrushChallengeRecord(local, cloud)).toEqual(cloud);
    expect(mergeCandyCrushChallengeRecord(cloud, local)).toEqual(cloud);
  });

  it("never regresses a known record when the other side is null", () => {
    const known = { bestScore: 100, updatedAt: 10 };
    expect(mergeCandyCrushChallengeRecord(known, null)).toEqual(known);
    expect(mergeCandyCrushChallengeRecord(null, known)).toEqual(known);
  });

  it("returns null when both sides are null", () => {
    expect(mergeCandyCrushChallengeRecord(null, null)).toBeNull();
  });
});

describe("computeCandyCrushPodium", () => {
  it("ranks profiles by bestScore descending", () => {
    const podium = computeCandyCrushPodium([
      { profileId: "a", surname: "Ana", bestScore: 40 },
      { profileId: "b", surname: "Bo", bestScore: 120 },
    ]);

    expect(podium).toEqual([
      { profileId: "b", surname: "Bo", bestScore: 120, rank: 1 },
      { profileId: "a", surname: "Ana", bestScore: 40, rank: 2 },
    ]);
  });

  it("includes owner and visitor profiles (unlike the quiz podium)", () => {
    const podium = computeCandyCrushPodium([
      { profileId: "owner", surname: "Papa", bestScore: 999 },
      { profileId: "visitor", surname: "Tonton", bestScore: 500 },
      { profileId: "a", surname: "Ana", bestScore: 40 },
    ]);

    expect(podium.map((entry) => entry.profileId)).toEqual(["owner", "visitor", "a"]);
  });

  it("shares the same rank for tied scores", () => {
    const podium = computeCandyCrushPodium([
      { profileId: "a", surname: "Ana", bestScore: 30 },
      { profileId: "b", surname: "Bo", bestScore: 30 },
      { profileId: "c", surname: "Cy", bestScore: 10 },
    ]);

    expect(podium).toEqual([
      { profileId: "a", surname: "Ana", bestScore: 30, rank: 1 },
      { profileId: "b", surname: "Bo", bestScore: 30, rank: 1 },
      { profileId: "c", surname: "Cy", bestScore: 10, rank: 3 },
    ]);
  });

  it("excludes profiles that never played (bestScore 0)", () => {
    const podium = computeCandyCrushPodium([
      { profileId: "a", surname: "Ana", bestScore: 0 },
      { profileId: "b", surname: "Bo", bestScore: 10 },
    ]);

    expect(podium.map((entry) => entry.profileId)).toEqual(["b"]);
  });

  it("truncates to the top 5", () => {
    const entries = Array.from({ length: 8 }, (_, i) => ({
      profileId: `p${i}`,
      surname: `P${i}`,
      bestScore: 100 - i,
    }));

    const podium = computeCandyCrushPodium(entries);

    expect(podium).toHaveLength(5);
    expect(podium.map((entry) => entry.profileId)).toEqual(["p0", "p1", "p2", "p3", "p4"]);
  });

  it("returns an empty podium when nobody has played", () => {
    expect(computeCandyCrushPodium([])).toEqual([]);
  });
});
