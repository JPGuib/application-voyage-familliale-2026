export type ScoreChartPoint = {
  day: number;
  label: string;
  dayScore: number;
  cumulativeScore: number;
};

/**
 * Converts a game history (any source with day + totalScore) into sorted,
 * cumulative chart points. Pure and deterministic — no side effects.
 */
export function buildScoreChartPoints(
  history: ReadonlyArray<{ day: number; totalScore: number }>
): ScoreChartPoint[] {
  const sorted = [...history].sort((a, b) => a.day - b.day);
  let cumulative = 0;
  return sorted.map((entry) => {
    cumulative += entry.totalScore;
    return {
      day: entry.day,
      label: `J${entry.day}`,
      dayScore: entry.totalScore,
      cumulativeScore: cumulative,
    };
  });
}
