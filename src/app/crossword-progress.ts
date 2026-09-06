import crosswordData from "../../crossword-data.json";

export type CrosswordCellResult = "correct" | "wrong";

export type CrosswordProgressSnapshot = {
  puzzleId: string;
  entries: Record<string, string>;
  results: Record<string, CrosswordCellResult>;
  completedPuzzleIds: string[];
  updatedAt: number;
};

type CrosswordPuzzle = {
  id: string;
  words: Array<{ word: string; r: number; c: number; horiz: boolean }>;
};

const puzzles = crosswordData.puzzles as CrosswordPuzzle[];
const validPuzzleIds = new Set(puzzles.map((puzzle) => puzzle.id));
const supportedLetter = /^[A-ZÇĞİÖŞÜ]$/;

export function findCrosswordPuzzle(id: string | undefined): CrosswordPuzzle {
  return puzzles.find((puzzle) => puzzle.id === id) ?? puzzles[0];
}

export function crosswordCellKeys(puzzleId: string): Set<string> {
  const keys = new Set<string>();
  const puzzle = findCrosswordPuzzle(puzzleId);
  for (const word of puzzle.words) {
    for (let position = 0; position < word.word.length; position += 1) {
      keys.add(`${word.horiz ? word.r : word.r + position},${word.horiz ? word.c + position : word.c}`);
    }
  }
  return keys;
}

export function normalizeCrosswordProgress(value: unknown): CrosswordProgressSnapshot | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  if (typeof raw.puzzleId !== "string" || !validPuzzleIds.has(raw.puzzleId)) return null;

  const playableCells = crosswordCellKeys(raw.puzzleId);
  const entries: Record<string, string> = {};
  const results: Record<string, CrosswordCellResult> = {};
  const rawEntries = raw.entries && typeof raw.entries === "object" ? raw.entries as Record<string, unknown> : {};
  const rawResults = raw.results && typeof raw.results === "object" ? raw.results as Record<string, unknown> : {};
  for (const [key, entry] of Object.entries(rawEntries)) {
    if (playableCells.has(key) && typeof entry === "string" && supportedLetter.test(entry)) {
      entries[key] = entry;
    }
  }
  for (const [key, result] of Object.entries(rawResults)) {
    if (playableCells.has(key) && entries[key] && (result === "correct" || result === "wrong")) {
      results[key] = result;
    }
  }

  const completedPuzzleIds = Array.isArray(raw.completedPuzzleIds)
    ? Array.from(new Set(raw.completedPuzzleIds.filter((id): id is string => typeof id === "string" && validPuzzleIds.has(id))))
    : [];
  const updatedAt = typeof raw.updatedAt === "number" && Number.isFinite(raw.updatedAt) && raw.updatedAt >= 0
    ? raw.updatedAt
    : 0;

  return { puzzleId: raw.puzzleId, entries, results, completedPuzzleIds, updatedAt };
}