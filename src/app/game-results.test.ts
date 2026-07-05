import { describe, expect, it } from "vitest";
import {
  computeBadges,
  parseGameHistory,
  upsertGameHistory,
  type GameHistoryEntry,
} from "./game-results";

function makeEntry(overrides: Partial<GameHistoryEntry> = {}): GameHistoryEntry {
  return {
    day: 1,
    location: "Istanbul",
    quizScore: 80,
    correctCount: 4,
    riddleSolved: false,
    challengeDone: false,
    durationSec: 180,
    totalScore: 80,
    completedAt: "2026-07-05T10:00:00.000Z",
    ...overrides,
  };
}

describe("computeBadges", () => {
  it("debloque les badges selon les regles explicites", () => {
    const history = [
      makeEntry({ day: 1, location: "Istanbul", durationSec: 110, correctCount: 5 }),
      makeEntry({ day: 2, location: "Cappadoce" }),
      makeEntry({ day: 3, location: "Pamukkale" }),
      makeEntry({ day: 4, location: "Izmir" }),
      makeEntry({ day: 5, location: "Bursa" }),
    ];

    const badges = computeBadges(history, 5);

    expect(badges.find((badge) => badge.name === "Maître Culture")?.earned).toBe(true);
    expect(badges.find((badge) => badge.name === "Grand Explorateur")?.earned).toBe(true);
    expect(badges.find((badge) => badge.name === "Éclair")?.earned).toBe(true);
    expect(badges.find((badge) => badge.name === "Sans faute !")?.earned).toBe(true);
  });

  it("laisse les badges verrouilles quand les conditions ne sont pas atteintes", () => {
    const history = [makeEntry({ day: 1, location: "Istanbul", durationSec: 220, correctCount: 3 })];

    const badges = computeBadges(history, 5);

    expect(badges.find((badge) => badge.name === "Maître Culture")?.earned).toBe(false);
    expect(badges.find((badge) => badge.name === "Grand Explorateur")?.earned).toBe(false);
    expect(badges.find((badge) => badge.name === "Éclair")?.earned).toBe(false);
    expect(badges.find((badge) => badge.name === "Sans faute !")?.earned).toBe(false);
  });
});

describe("persistence helpers", () => {
  it("remplace une session existante du meme jour et trie par jour", () => {
    const previous = [
      makeEntry({ day: 3, totalScore: 60 }),
      makeEntry({ day: 1, totalScore: 70 }),
    ];

    const updated = upsertGameHistory(previous, makeEntry({ day: 3, totalScore: 95 }));

    expect(updated).toHaveLength(2);
    expect(updated[0].day).toBe(1);
    expect(updated[1].day).toBe(3);
    expect(updated[1].totalScore).toBe(95);
  });

  it("parse une sauvegarde valide et ignore les entrees invalides", () => {
    const raw = JSON.stringify([
      makeEntry({ day: 2 }),
      { day: "broken" },
      makeEntry({ day: 4, location: "Izmir" }),
    ]);

    const parsed = parseGameHistory(raw);

    expect(parsed).toHaveLength(2);
    expect(parsed.map((entry) => entry.day)).toEqual([2, 4]);
  });

  it("retourne une liste vide pour une sauvegarde illisible", () => {
    expect(parseGameHistory("{bad-json")).toEqual([]);
    expect(parseGameHistory(null)).toEqual([]);
  });
});
