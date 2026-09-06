import crosswordData from "../../crossword-data.json";

export type CrosswordCellResult = "correct" | "wrong";

export type CrosswordPuzzleProgress = {
  entries: Record<string, string>;
  results: Record<string, CrosswordCellResult>;
};

export type CrosswordProgressSnapshot = {
  puzzleId: string;
  entries: Record<string, string>;
  results: Record<string, CrosswordCellResult>;
  puzzleProgress: Record<string, CrosswordPuzzleProgress>;
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

  const normalizePuzzleProgress = (puzzleId: string, value: unknown): CrosswordPuzzleProgress => {
    const playableCells = crosswordCellKeys(puzzleId);
    const progress = value && typeof value === "object" && !Array.isArray(value)
      ? value as Record<string, unknown>
      : {};
    const entries: Record<string, string> = {};
    const results: Record<string, CrosswordCellResult> = {};
    const rawEntries = progress.entries && typeof progress.entries === "object"
      ? progress.entries as Record<string, unknown>
      : {};
    const rawResults = progress.results && typeof progress.results === "object"
      ? progress.results as Record<string, unknown>
      : {};
    for (const [key, entry] of Object.entries(rawEntries)) {
      if (playableCells.has(key) && typeof entry === "string" && supportedLetter.test(entry)) entries[key] = entry;
    }
    for (const [key, result] of Object.entries(rawResults)) {
      if (playableCells.has(key) && entries[key] && (result === "correct" || result === "wrong")) results[key] = result;
    }
    return { entries, results };
  };
  const puzzleProgress: Record<string, CrosswordPuzzleProgress> = {};
  const rawPuzzleProgress = raw.puzzleProgress && typeof raw.puzzleProgress === "object" && !Array.isArray(raw.puzzleProgress)
    ? raw.puzzleProgress as Record<string, unknown>
    : {};
  for (const [puzzleId, progress] of Object.entries(rawPuzzleProgress)) {
    if (validPuzzleIds.has(puzzleId)) puzzleProgress[puzzleId] = normalizePuzzleProgress(puzzleId, progress);
  }
  if (!puzzleProgress[raw.puzzleId]) puzzleProgress[raw.puzzleId] = normalizePuzzleProgress(raw.puzzleId, raw);

  const completedPuzzleIds = Array.isArray(raw.completedPuzzleIds)
    ? Array.from(new Set(raw.completedPuzzleIds.filter((id): id is string => typeof id === "string" && validPuzzleIds.has(id))))
    : [];
  const updatedAt = typeof raw.updatedAt === "number" && Number.isFinite(raw.updatedAt) && raw.updatedAt >= 0
    ? raw.updatedAt
    : 0;

  return { puzzleId: raw.puzzleId, ...puzzleProgress[raw.puzzleId], puzzleProgress, completedPuzzleIds, updatedAt };
}