import { useMemo, useRef, useState } from "react";
import { ArrowLeft, Check, Eye, RotateCcw } from "lucide-react";
import crosswordData from "../../crossword-data.json";

type Direction = "across" | "down";

type CrosswordWord = {
  word: string;
  clue: string;
  r: number;
  c: number;
  horiz: boolean;
};

type CrosswordPuzzle = {
  id: string;
  title: string;
  rows: number;
  cols: number;
  words: CrosswordWord[];
};

type CellMembership = {
  wordIndex: number;
  direction: Direction;
  position: number;
};

type CellDefinition = {
  answer: string;
  memberships: CellMembership[];
};

type CellResult = "correct" | "wrong";

const puzzles = crosswordData.puzzles as CrosswordPuzzle[];

const SCOPED_CSS = `
.cw-root {
  --cw-accent: #0F5257;
  --cw-accent-strong: #093f43;
  --cw-red: #b3243b;
  --cw-gold: #c9972f;
  --cw-cell-size: 32px;
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow-y: auto;
  container-type: inline-size;
  background: var(--background);
  color: var(--foreground);
}
.cw-root * { box-sizing: border-box; }
.cw-header { display: flex; align-items: center; gap: 12px; padding: 14px 16px; background: var(--cw-accent); color: white; }
.cw-back { width: 40px; height: 40px; flex: 0 0 40px; display: grid; place-items: center; border: 1px solid rgba(255,255,255,.45); border-radius: 8px; background: transparent; color: white; cursor: pointer; }
.cw-heading { min-width: 0; }
.cw-heading h1 { margin: 0; font-size: 18px; line-height: 1.2; font-weight: 700; }
.cw-heading p { margin: 2px 0 0; font-size: 12px; line-height: 1.35; opacity: .82; }
.cw-main { max-width: 1180px; margin: 0 auto; padding: 16px; }
.cw-toolbar { display: flex; align-items: end; gap: 10px; flex-wrap: wrap; margin-bottom: 16px; }
.cw-picker { display: grid; gap: 5px; flex: 1 1 280px; }
.cw-picker label { font-size: 12px; font-weight: 700; color: var(--muted-foreground); }
.cw-picker select { width: 100%; min-height: 42px; border: 1px solid var(--border); border-radius: 8px; padding: 8px 10px; background: var(--card); color: var(--card-foreground); font: inherit; }
.cw-progress { min-height: 42px; display: flex; align-items: center; padding: 8px 12px; border: 1px solid var(--cw-gold); border-radius: 8px; background: var(--card); color: var(--foreground); font-size: 13px; font-weight: 700; white-space: nowrap; }
.cw-actions { display: flex; gap: 8px; flex-wrap: wrap; width: 100%; }
.cw-action { min-height: 40px; display: inline-flex; align-items: center; justify-content: center; gap: 7px; border: 1px solid var(--border); border-radius: 8px; padding: 8px 12px; background: var(--card); color: var(--card-foreground); font: inherit; font-size: 13px; font-weight: 700; cursor: pointer; }
.cw-action-primary { border-color: var(--cw-accent); background: var(--cw-accent); color: white; }
.cw-action-danger { color: var(--cw-red); }
.cw-action:disabled { opacity: .45; cursor: not-allowed; }
.cw-layout { display: grid; grid-template-columns: 1fr; gap: 20px; align-items: start; }
.cw-board-scroll {
  --cw-fit-height: calc(100dvh - 300px);
  --cw-fit-width: calc(100cqw - 56px);
  --cw-cell-size: min(
    32px,
    calc(var(--cw-fit-height) / var(--cw-rows, 10)),
    calc(var(--cw-fit-width) / var(--cw-cols, 10))
  );
  max-width: 100%;
  overflow: hidden;
  padding: 10px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--card);
}
.cw-board { display: grid; width: max-content; border-top: 1px solid var(--foreground); border-left: 1px solid var(--foreground); }
.cw-cell, .cw-block { width: var(--cw-cell-size); height: var(--cw-cell-size); }
.cw-block { visibility: hidden; }
.cw-cell { position: relative; border: 0; border-right: 1px solid var(--foreground); border-bottom: 1px solid var(--foreground); background: var(--card); color: var(--foreground); padding: 0; }
.cw-cell input {
  width: 100%;
  height: 100%;
  border: 0;
  outline: 0;
  padding: max(1px, calc(var(--cw-cell-size) * 0.14)) 1px 1px;
  background: transparent;
  color: var(--foreground);
  -webkit-text-fill-color: var(--foreground);
  opacity: 1;
  text-align: center;
  text-transform: uppercase;
  font-size: min(calc(var(--cw-cell-size) * 0.56), 15px);
  line-height: 1;
  font-weight: 800;
}
.cw-cell input:focus { box-shadow: inset 0 0 0 3px var(--cw-accent); }
.cw-cell.cw-highlight { background: #f7e6b7; color: #2a1c14; }
.cw-cell.cw-correct { background: #d8efe3; color: #145a3d; }
.cw-cell.cw-wrong { background: #f7d7d7; color: #7e1a29; }
.cw-number {
  position: absolute;
  top: 1px;
  left: 2px;
  z-index: 1;
  font-size: clamp(6px, calc(var(--cw-cell-size) * 0.25), 8px);
  line-height: 1;
  color: var(--cw-accent-strong);
  font-weight: 800;
  pointer-events: none;
}
.cw-clues { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
.cw-clue-group h2 { margin: 0 0 8px; color: var(--cw-red); font-size: 13px; text-transform: uppercase; }
.cw-clue-list { display: grid; gap: 4px; margin: 0; padding: 0; list-style: none; }
.cw-clue { width: 100%; display: grid; grid-template-columns: 24px 1fr; gap: 5px; border: 0; border-radius: 6px; padding: 7px; background: transparent; color: var(--foreground); text-align: left; font: inherit; font-size: 13px; line-height: 1.35; cursor: pointer; }
.cw-clue:hover { background: var(--muted); }
.cw-clue[aria-current="true"] { background: var(--cw-accent); color: white; }
.cw-clue.cw-done { color: #1f7a50; font-weight: 700; }
.cw-clue-number { font-weight: 800; }
.cw-win { margin: 18px 0 0; border-left: 4px solid var(--cw-gold); padding: 12px 14px; background: var(--cw-accent); color: white; border-radius: 6px; }
.cw-win strong { display: block; margin-bottom: 2px; }
@container (min-width: 840px) {
  .cw-layout { grid-template-columns: minmax(0, auto) minmax(280px, 1fr); }
}
@container (max-width: 820px) {
  .cw-clues { grid-template-columns: 1fr 1fr; }
}
@container (max-width: 560px) {
  .cw-main { padding: 12px; }
  .cw-board-scroll {
    --cw-fit-height: calc(100dvh - 270px);
    --cw-fit-width: calc(100cqw - 40px);
  }
  .cw-actions { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .cw-action { padding: 8px 5px; font-size: 12px; }
  .cw-clues { grid-template-columns: 1fr; }
}
`;

function cellKey(row: number, col: number) {
  return `${row},${col}`;
}

function derivePuzzle(puzzle: CrosswordPuzzle) {
  const cells = new Map<string, CellDefinition>();

  puzzle.words.forEach((word, wordIndex) => {
    for (let position = 0; position < word.word.length; position += 1) {
      const row = word.horiz ? word.r : word.r + position;
      const col = word.horiz ? word.c + position : word.c;
      const key = cellKey(row, col);
      const cell = cells.get(key) ?? { answer: word.word[position], memberships: [] };
      cell.memberships.push({
        wordIndex,
        direction: word.horiz ? "across" : "down",
        position,
      });
      cells.set(key, cell);
    }
  });

  const starts = Array.from(new Set(puzzle.words.map((word) => cellKey(word.r, word.c))))
    .map((key) => {
      const [row, col] = key.split(",").map(Number);
      return { key, row, col };
    })
    .sort((left, right) => left.row - right.row || left.col - right.col);
  const numbers = new Map(starts.map((start, index) => [start.key, index + 1]));

  return { cells, numbers };
}

function wordKeys(word: CrosswordWord) {
  return Array.from({ length: word.word.length }, (_, position) =>
    cellKey(word.horiz ? word.r : word.r + position, word.horiz ? word.c + position : word.c)
  );
}

function findPuzzle(id: string | undefined) {
  return puzzles.find((puzzle) => puzzle.id === id) ?? puzzles[0];
}

export function CrosswordScreen({
  onBack,
  initialPuzzleId,
}: {
  onBack: () => void;
  initialPuzzleId?: string;
}) {
  const [puzzle, setPuzzle] = useState(() => findPuzzle(initialPuzzleId));
  const [entries, setEntries] = useState<Record<string, string>>({});
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [direction, setDirection] = useState<Direction>("across");
  const [selectedWordIndex, setSelectedWordIndex] = useState<number | null>(null);
  const [results, setResults] = useState<Record<string, CellResult>>({});
  const [checkSummary, setCheckSummary] = useState("");
  const inputRefs = useRef(new Map<string, HTMLInputElement>());
  const toggleDirectionOnClick = useRef(false);
  const programmaticFocus = useRef(false);
  const { cells, numbers } = useMemo(() => derivePuzzle(puzzle), [puzzle]);

  const solvedWords = puzzle.words.map((word) =>
    wordKeys(word).every((key, index) => entries[key] === word.word[index])
  );
  const solvedCount = solvedWords.filter(Boolean).length;
  const isComplete = solvedCount === puzzle.words.length;
  const selectedMemberships = selectedKey ? cells.get(selectedKey)?.memberships ?? [] : [];
  const activeMembership = selectedMemberships.find(
    (membership) =>
      membership.direction === direction &&
      (selectedWordIndex === null || membership.wordIndex === selectedWordIndex)
  ) ?? selectedMemberships.find((membership) => membership.direction === direction) ?? selectedMemberships[0];
  const activeWordIndex = activeMembership?.wordIndex ?? selectedWordIndex;
  const highlightedKeys = new Set(
    activeWordIndex === null ? [] : wordKeys(puzzle.words[activeWordIndex])
  );

  function focusCell(key: string, preferredDirection?: Direction, preferredWordIndex?: number) {
    const memberships = cells.get(key)?.memberships;
    if (!memberships?.length) return;
    const nextDirection =
      memberships.find((membership) => membership.direction === preferredDirection)?.direction ??
      memberships.find((membership) => membership.direction === direction)?.direction ??
      memberships[0].direction;
    setSelectedKey(key);
    setDirection(nextDirection);
    setSelectedWordIndex(
      memberships.find(
        (membership) =>
          membership.direction === nextDirection &&
          (preferredWordIndex === undefined || membership.wordIndex === preferredWordIndex)
      )?.wordIndex ?? null
    );
    const input = inputRefs.current.get(key);
    if (input && document.activeElement !== input) {
      programmaticFocus.current = true;
      input.focus();
      programmaticFocus.current = false;
    }
  }

  function moveWithinWord(key: string, offset: -1 | 1) {
    const membership =
      cells.get(key)?.memberships.find((item) => item.direction === direction) ?? cells.get(key)?.memberships[0];
    if (!membership) return;
    const keys = wordKeys(puzzle.words[membership.wordIndex]);
    const nextKey = keys[membership.position + offset];
    if (nextKey) focusCell(nextKey, membership.direction);
  }

  function handleCellPointerDown(key: string) {
    toggleDirectionOnClick.current = selectedKey === key;
  }

  function handleCellClick(key: string) {
    const memberships = cells.get(key)?.memberships ?? [];
    if (toggleDirectionOnClick.current && memberships.length > 1) {
      const alternate = memberships.find((membership) => membership.direction !== direction);
      if (alternate) {
        setDirection(alternate.direction);
        setSelectedWordIndex(alternate.wordIndex);
      }
    }
    toggleDirectionOnClick.current = false;
  }

  function handleEntry(key: string, rawValue: string) {
    const value = rawValue.toUpperCase().replace(/[^A-ZÇĞİÖŞÜ]/g, "").slice(-1);
    if (rawValue && !value) return;
    setEntries((current) => ({ ...current, [key]: value }));
    setResults((current) => {
      const next = { ...current };
      delete next[key];
      return next;
    });
    if (value) moveWithinWord(key, 1);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>, row: number, col: number) {
    const key = cellKey(row, col);
    const arrows: Partial<Record<string, { row: number; col: number; direction: Direction }>> = {
      ArrowRight: { row, col: col + 1, direction: "across" },
      ArrowLeft: { row, col: col - 1, direction: "across" },
      ArrowDown: { row: row + 1, col, direction: "down" },
      ArrowUp: { row: row - 1, col, direction: "down" },
    };
    const target = arrows[event.key];
    if (target) {
      event.preventDefault();
      focusCell(cellKey(target.row, target.col), target.direction);
    } else if (event.key === "Backspace" && !entries[key]) {
      event.preventDefault();
      moveWithinWord(key, -1);
    }
  }

  function changePuzzle(id: string) {
    setPuzzle(findPuzzle(id));
    setEntries({});
    setResults({});
    setSelectedKey(null);
    setDirection("across");
    setSelectedWordIndex(null);
    setCheckSummary("");
  }

  function checkGrid() {
    const nextResults: Record<string, CellResult> = {};
    cells.forEach((cell, key) => {
      if (entries[key]) nextResults[key] = entries[key] === cell.answer ? "correct" : "wrong";
    });
    setResults(nextResults);
    const resultValues = Object.values(nextResults);
    const correctCount = resultValues.filter((result) => result === "correct").length;
    const wrongCount = resultValues.filter((result) => result === "wrong").length;
    setCheckSummary(`${correctCount} cases correctes, ${wrongCount} incorrectes.`);
  }

  function revealCell() {
    if (!selectedKey) return;
    const answer = cells.get(selectedKey)?.answer;
    if (!answer) return;
    setEntries((current) => ({ ...current, [selectedKey]: answer }));
    setResults((current) => ({ ...current, [selectedKey]: "correct" }));
    moveWithinWord(selectedKey, 1);
  }

  function resetGrid() {
    if (!window.confirm("Recommencer la grille depuis le début ?")) return;
    setEntries({});
    setResults({});
    setCheckSummary("");
  }

  return (
    <div className="cw-root">
      <style>{SCOPED_CSS}</style>
      <header className="cw-header">
        <button className="cw-back" type="button" onClick={onBack} aria-label="Retour aux jeux">
          <ArrowLeft size={20} aria-hidden="true" />
        </button>
        <div className="cw-heading">
          <h1>Mots croisés Turquie</h1>
          <p>21 grilles pour explorer le pays en famille</p>
        </div>
      </header>

      <main className="cw-main">
        <div className="cw-toolbar">
          <div className="cw-picker">
            <label htmlFor="crossword-puzzle">Grille</label>
            <select
              id="crossword-puzzle"
              value={puzzle.id}
              onChange={(event) => changePuzzle(event.target.value)}
            >
              {puzzles.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title} ({item.words.length} mots)
                </option>
              ))}
            </select>
          </div>
          <div className="cw-progress" role="status" aria-live="polite">
            {solvedCount} / {puzzle.words.length} mots trouvés
          </div>
          <span className="sr-only" role="log" aria-live="polite">{checkSummary}</span>
          <div className="cw-actions">
            <button className="cw-action cw-action-primary" type="button" onClick={checkGrid}>
              <Check size={16} aria-hidden="true" /> Vérifier
            </button>
            <button className="cw-action" type="button" onClick={revealCell} disabled={!selectedKey}>
              <Eye size={16} aria-hidden="true" /> Révéler
            </button>
            <button className="cw-action cw-action-danger" type="button" onClick={resetGrid}>
              <RotateCcw size={16} aria-hidden="true" /> Recommencer
            </button>
          </div>
        </div>

        <div className="cw-layout">
          <div
            className="cw-board-scroll"
            style={{
              ["--cw-rows" as "--cw-rows"]: puzzle.rows,
              ["--cw-cols" as "--cw-cols"]: puzzle.cols,
            }}
          >
            <div
              className="cw-board"
              role="grid"
              aria-label={`Grille : ${puzzle.title}`}
              style={{
                gridTemplateColumns: `repeat(${puzzle.cols}, var(--cw-cell-size))`,
                gridTemplateRows: `repeat(${puzzle.rows}, var(--cw-cell-size))`,
              }}
            >
              {Array.from({ length: puzzle.rows * puzzle.cols }, (_, index) => {
                const row = Math.floor(index / puzzle.cols);
                const col = index % puzzle.cols;
                const key = cellKey(row, col);
                const cell = cells.get(key);
                if (!cell) return <div className="cw-block" key={key} aria-hidden="true" />;
                const result = results[key];
                return (
                  <div
                    className={`cw-cell${highlightedKeys.has(key) ? " cw-highlight" : ""}${
                      result ? ` cw-${result}` : ""
                    }`}
                    key={key}
                    role="gridcell"
                    data-status={result}
                  >
                    {numbers.has(key) && <span className="cw-number">{numbers.get(key)}</span>}
                    <input
                      ref={(node) => {
                        if (node) inputRefs.current.set(key, node);
                        else inputRefs.current.delete(key);
                      }}
                      value={entries[key] ?? ""}
                      maxLength={1}
                      autoComplete="off"
                      spellCheck={false}
                      aria-label={`Case ligne ${row + 1}, colonne ${col + 1}`}
                      aria-invalid={result === "wrong"}
                      aria-description={result === "correct" ? "Case correcte" : undefined}
                      aria-describedby={
                        selectedKey === key && activeWordIndex !== null
                          ? `crossword-clue-${activeWordIndex}`
                          : undefined
                      }
                      onFocus={(event) => {
                        event.currentTarget.select();
                        if (!programmaticFocus.current) focusCell(key);
                      }}
                      onPointerDown={() => handleCellPointerDown(key)}
                      onClick={() => handleCellClick(key)}
                      onChange={(event) => handleEntry(key, event.target.value)}
                      onKeyDown={(event) => handleKeyDown(event, row, col)}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          <div className="cw-clues">
            {(["across", "down"] as Direction[]).map((clueDirection) => (
              <section className="cw-clue-group" key={clueDirection}>
                <h2>{clueDirection === "across" ? "Horizontal" : "Vertical"}</h2>
                <ul className="cw-clue-list">
                  {puzzle.words
                    .map((word, wordIndex) => ({ word, wordIndex }))
                    .filter(({ word }) => word.horiz === (clueDirection === "across"))
                    .sort(
                      (left, right) =>
                        (numbers.get(cellKey(left.word.r, left.word.c)) ?? 0) -
                        (numbers.get(cellKey(right.word.r, right.word.c)) ?? 0)
                    )
                    .map(({ word, wordIndex }) => (
                      <li key={`${clueDirection}-${wordIndex}`}>
                        <button
                          id={`crossword-clue-${wordIndex}`}
                          className={`cw-clue${solvedWords[wordIndex] ? " cw-done" : ""}`}
                          type="button"
                          aria-current={activeWordIndex === wordIndex}
                          onClick={() => {
                            setDirection(clueDirection);
                            focusCell(cellKey(word.r, word.c), clueDirection, wordIndex);
                          }}
                        >
                          <span className="cw-clue-number">
                            {numbers.get(cellKey(word.r, word.c))}.
                          </span>
                          <span>
                            {word.clue} ({word.word.length} lettres)
                          </span>
                        </button>
                      </li>
                    ))}
                </ul>
              </section>
            ))}
          </div>
        </div>

        {isComplete && (
          <div className="cw-win" role="alert">
            <strong>Tebrikler ! Bravo !</strong>
            Vous avez complété cette grille. İyi yolculuklar, bon voyage !
          </div>
        )}
      </main>
    </div>
  );
}