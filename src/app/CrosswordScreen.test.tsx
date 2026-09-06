import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import crosswordData from "../../crossword-data.json";
import { CrosswordScreen } from "./CrosswordScreen";

function renderCrossword(initialPuzzleId?: string) {
  const onBack = vi.fn();
  render(<CrosswordScreen onBack={onBack} initialPuzzleId={initialPuzzleId} />);
  return { onBack };
}

function answerCells(puzzle: (typeof crosswordData.puzzles)[number]) {
  const answers = new Map<string, string>();
  puzzle.words.forEach((word) => {
    Array.from(word.word).forEach((letter, position) => {
      const row = word.horiz ? word.r : word.r + position;
      const col = word.horiz ? word.c + position : word.c;
      answers.set(`${row},${col}`, letter);
    });
  });
  return answers;
}

describe("CrosswordScreen", () => {
  it("renders all bundled puzzles, falls back to the first puzzle, and returns to the hub", async () => {
    const user = userEvent.setup();
    const { onBack } = renderCrossword("unknown-puzzle");

    const picker = screen.getByRole("combobox", { name: "Grille" });
    expect(within(picker).getAllByRole("option")).toHaveLength(21);
    expect(picker).toHaveValue("turquie-general");
    expect(screen.getByRole("grid", { name: /Panorama de la Turquie/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Révéler" })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Retour aux jeux" }));
    expect(onBack).toHaveBeenCalledOnce();
  });

  it("accepts valid letters, ignores invalid characters, advances, and keeps arrow boundaries stable", () => {
    renderCrossword();
    const first = screen.getByRole("textbox", { name: "Case ligne 1, colonne 7" });
    const second = screen.getByRole("textbox", { name: "Case ligne 2, colonne 7" });

    fireEvent.change(first, { target: { value: "1" } });
    expect(first).toHaveValue("");
    fireEvent.change(first, { target: { value: "a" } });
    expect(first).toHaveValue("A");
    expect(second).toHaveFocus();
    fireEvent.change(second, { target: { value: "N" } });
    fireEvent.change(second, { target: { value: "1" } });
    expect(second).toHaveValue("N");

    fireEvent.focus(second);
    fireEvent.keyDown(second, { key: "ArrowLeft" });
    expect(second).toHaveFocus();
    fireEvent.keyDown(second, { key: "ArrowDown" });
    expect(screen.getByRole("textbox", { name: "Case ligne 3, colonne 7" })).toHaveFocus();
  });

  it("switches direction when a focused crossing is selected again", async () => {
    const user = userEvent.setup();
    renderCrossword();
    const crossing = screen.getByRole("textbox", { name: "Case ligne 5, colonne 14" });

    await user.click(crossing);
    expect(screen.getByRole("button", { name: /Plus grande ville de Turquie/ })).toHaveAttribute(
      "aria-current",
      "true"
    );
    await user.click(crossing);
    expect(screen.getByRole("button", { name: /Cité antique rendue célèbre par Homère/ })).toHaveAttribute(
      "aria-current",
      "true"
    );
  });

  it("loads a selected puzzle with fresh entries and zero progress", async () => {
    const user = userEvent.setup();
    renderCrossword();
    const first = screen.getByRole("textbox", { name: "Case ligne 1, colonne 7" });
    fireEvent.change(first, { target: { value: "A" } });

    await user.selectOptions(screen.getByRole("combobox", { name: "Grille" }), "istanbul-quartiers");

    expect(screen.getByRole("grid", { name: /Istanbul, quartier par quartier/ })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("0 / 16 mots trouvés");
    expect(screen.getAllByRole("textbox").every((input) => (input as HTMLInputElement).value === "")).toBe(true);
  });

  it("restores validated progress and reports durable changes", () => {
    const onProgressChange = vi.fn();
    render(
      <CrosswordScreen
        onBack={vi.fn()}
        onProgressChange={onProgressChange}
        initialProgress={{
          puzzleId: "turquie-general",
          entries: { "0,6": "A", invalid: "Z" },
          results: { "0,6": "correct", invalid: "wrong" },
          completedPuzzleIds: ["turquie-general", "unknown"],
          updatedAt: 1,
        }}
      />
    );

    const first = screen.getByRole("textbox", { name: "Case ligne 1, colonne 7" });
    expect(first).toHaveValue("A");
    expect(first.closest("[role='gridcell']")).toHaveAttribute("data-status", "correct");

    fireEvent.change(first, { target: { value: "N" } });
    expect(onProgressChange).toHaveBeenCalledWith(expect.objectContaining({
      puzzleId: "turquie-general",
      entries: expect.objectContaining({ "0,6": "N" }),
      results: {},
      completedPuzzleIds: ["turquie-general"],
    }));
  });

  it("keeps an explicitly selected clue active when two across words share cells", async () => {
    const user = userEvent.setup();
    renderCrossword("nature-montagnes");

    await user.click(screen.getByRole("button", { name: /Étendue d'eau intérieure/ }));

    expect(screen.getByRole("button", { name: /Étendue d'eau intérieure/ })).toHaveAttribute(
      "aria-current",
      "true"
    );
    expect(screen.getByRole("textbox", { name: "Case ligne 9, colonne 2" })).toHaveFocus();
  });

  it("checks, reveals, and confirms before resetting the current grid", async () => {
    const user = userEvent.setup();
    const confirmSpy = vi.spyOn(window, "confirm");
    renderCrossword();
    const first = screen.getByRole("textbox", { name: "Case ligne 1, colonne 7" });

    fireEvent.change(first, { target: { value: "Z" } });
    fireEvent.focus(first);
    await user.click(screen.getByRole("button", { name: "Vérifier" }));
    expect(first).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("log")).toHaveTextContent("0 cases correctes, 1 incorrectes");

    await user.click(screen.getByRole("button", { name: "Révéler" }));
    expect(first).toHaveValue("A");
    expect(first.closest("[role='gridcell']")).toHaveAttribute("data-status", "correct");

    confirmSpy.mockReturnValueOnce(false);
    await user.click(screen.getByRole("button", { name: "Recommencer" }));
    expect(first).toHaveValue("A");

    confirmSpy.mockReturnValueOnce(true);
    await user.click(screen.getByRole("button", { name: "Recommencer" }));
    expect(first).toHaveValue("");
    confirmSpy.mockRestore();
  });

  it("shows completion only while every playable cell is correct", () => {
    const puzzle = crosswordData.puzzles[0];
    const { container } = render(<CrosswordScreen onBack={vi.fn()} />);
    const inputs = new Map(
      Array.from(container.querySelectorAll<HTMLInputElement>(".cw-cell input")).map((input) => [
        input.getAttribute("aria-label"),
        input,
      ])
    );
    const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;

    act(() => {
      answerCells(puzzle).forEach((answer, key) => {
        const [row, col] = key.split(",").map(Number);
        const input = inputs.get(`Case ligne ${row + 1}, colonne ${col + 1}`)!;
        valueSetter?.call(input, answer);
        input.dispatchEvent(new Event("input", { bubbles: true }));
      });
    });

    expect(screen.getByRole("alert")).toHaveTextContent("Tebrikler ! Bravo !");
    expect(screen.getByRole("status")).toHaveTextContent(`20 / 20 mots trouvés`);

    fireEvent.change(screen.getByRole("textbox", { name: "Case ligne 1, colonne 7" }), {
      target: { value: "Z" },
    });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});