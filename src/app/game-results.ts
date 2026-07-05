export type GameHistoryEntry = {
  day: number;
  location: string;
  quizScore: number;
  correctCount: number;
  riddleSolved: boolean;
  challengeDone: boolean;
  durationSec: number;
  totalScore: number;
  completedAt: string;
};

type Badge = {
  icon: string;
  name: string;
  desc: string;
  earned: boolean;
};

export function parseGameHistory(raw: string | null): GameHistoryEntry[] {
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter(
      (entry) =>
        typeof entry?.day === "number" &&
        typeof entry?.location === "string" &&
        typeof entry?.quizScore === "number" &&
        typeof entry?.correctCount === "number" &&
        typeof entry?.riddleSolved === "boolean" &&
        typeof entry?.challengeDone === "boolean" &&
        typeof entry?.durationSec === "number" &&
        typeof entry?.totalScore === "number" &&
        typeof entry?.completedAt === "string"
    ) as GameHistoryEntry[];
  } catch {
    return [];
  }
}

export function upsertGameHistory(
  previous: GameHistoryEntry[],
  entry: GameHistoryEntry
): GameHistoryEntry[] {
  const filtered = previous.filter((item) => item.day !== entry.day);
  return [...filtered, entry].sort((a, b) => a.day - b.day);
}

export function computeBadges(
  history: GameHistoryEntry[],
  questionCount: number
): Badge[] {
  return [
    {
      icon: "🏛️",
      name: "Maître Culture",
      desc: "5 quiz complétés",
      earned: history.length >= 5,
    },
    {
      icon: "🗺️",
      name: "Grand Explorateur",
      desc: "4 lieux découverts",
      earned: new Set(history.map((entry) => entry.location)).size >= 4,
    },
    {
      icon: "⚡",
      name: "Éclair",
      desc: "Quiz en moins de 2 min",
      earned: history.some((entry) => entry.durationSec > 0 && entry.durationSec <= 120),
    },
    {
      icon: "🎯",
      name: "Sans faute !",
      desc: "Score parfait",
      earned: history.some((entry) => entry.correctCount === questionCount),
    },
  ];
}
