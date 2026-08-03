import { describe, it, expect } from "vitest";
import { buildScoreChartPoints } from "./score-progression";

describe("buildScoreChartPoints", () => {
  it("returns empty array for empty history", () => {
    expect(buildScoreChartPoints([])).toEqual([]);
  });

  it("returns one point for a single-day history", () => {
    const result = buildScoreChartPoints([{ day: 3, totalScore: 42 }]);
    expect(result).toEqual([
      { day: 3, label: "J3", dayScore: 42, cumulativeScore: 42 },
    ]);
  });

  it("sorts unsorted input by day ascending", () => {
    const result = buildScoreChartPoints([
      { day: 3, totalScore: 10 },
      { day: 1, totalScore: 20 },
      { day: 2, totalScore: 15 },
    ]);
    expect(result.map((p) => p.day)).toEqual([1, 2, 3]);
  });

  it("computes cumulative score correctly over multiple days", () => {
    const result = buildScoreChartPoints([
      { day: 1, totalScore: 35 },
      { day: 2, totalScore: 0 },
      { day: 3, totalScore: 42 },
    ]);
    expect(result).toEqual([
      { day: 1, label: "J1", dayScore: 35, cumulativeScore: 35 },
      { day: 2, label: "J2", dayScore: 0, cumulativeScore: 35 },
      { day: 3, label: "J3", dayScore: 42, cumulativeScore: 77 },
    ]);
  });

  it("zero-score day does not change cumulative from previous day", () => {
    const result = buildScoreChartPoints([
      { day: 1, totalScore: 50 },
      { day: 2, totalScore: 0 },
    ]);
    expect(result[1].cumulativeScore).toBe(50);
  });

  it("does not generate synthetic points for non-consecutive days", () => {
    const result = buildScoreChartPoints([
      { day: 1, totalScore: 10 },
      { day: 5, totalScore: 20 },
    ]);
    expect(result).toHaveLength(2);
    expect(result[0].day).toBe(1);
    expect(result[1].day).toBe(5);
  });

  it("uses totalScore as dayScore in each point", () => {
    const result = buildScoreChartPoints([{ day: 2, totalScore: 99 }]);
    expect(result[0].dayScore).toBe(99);
  });

  it("labels each point as J{day}", () => {
    const result = buildScoreChartPoints([
      { day: 1, totalScore: 0 },
      { day: 7, totalScore: 0 },
    ]);
    expect(result[0].label).toBe("J1");
    expect(result[1].label).toBe("J7");
  });

  it("does not mutate the input array", () => {
    const input = [
      { day: 3, totalScore: 5 },
      { day: 1, totalScore: 10 },
    ];
    const copy = [...input];
    buildScoreChartPoints(input);
    expect(input).toEqual(copy);
  });
});
