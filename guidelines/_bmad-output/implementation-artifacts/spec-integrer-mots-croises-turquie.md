---
title: 'Integrate Turkey crossword game'
type: 'feature'
created: '2026-08-16'
status: 'done'
review_loop_iteration: 0
baseline_commit: '97148e8'
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The standalone "Mots croisés Turquie" game exists only as a root HTML file plus JSON data, so travelers cannot discover or launch it from the application's recreational games space. Its separate page shell also does not follow the application's navigation, components, colors, or responsive behavior.

**Approach:** Port the crossword behavior into an isolated React game screen, bundle the existing 21-puzzle data, and expose it through the typed arcade route and hub card. Preserve the original gameplay while presenting controls, feedback, and navigation with the application's established UI conventions.

## Boundaries & Constraints

**Always:** Keep all 21 supplied puzzles and their clues; support puzzle selection, keyboard/touch letter entry, word highlighting, directional navigation, checking, single-cell reveal, reset confirmation, progress, and completion feedback; return from the game to the arcade hub; use the same `game` access policy as other arcade games; remain usable on narrow mobile screens and desktop; use app design tokens and Lucide icons where applicable; keep game styles isolated from other screens.

**Ask First:** Any change to puzzle wording or answers, addition of scoring/cloud persistence, removal of the original source files, or expansion into another game/hub defect.

**Never:** Embed the standalone page in an iframe, depend on a runtime network request for bundled puzzle data, weaken existing role/phase restrictions, or refactor unrelated arcade games.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Launch and play | Eligible traveler opens the arcade card and enters letters | The selected grid renders, focus advances in the active word, clues highlight, and progress reflects solved words | Invalid characters are ignored and incomplete entries remain editable |
| Crossing cell | A cell belongs to horizontal and vertical words | Re-selecting the focused crossing switches direction; arrows select a valid neighboring cell | Focus stays on the current cell when no neighbor exists |
| Puzzle change | Traveler selects another of the 21 puzzles | The new grid and clues load with fresh local entries and zeroed progress | Unknown puzzle identifiers fall back to the first puzzle |
| Check/reveal/reset | Traveler checks entries, reveals the focused cell, or confirms reset | Correct/wrong cells receive accessible feedback, reveal updates progress, and reset clears the current grid | Reveal is disabled without a selected cell; cancelled reset preserves entries |
| Completion | Every cell is correct | A visible completion message appears and the progress count is complete | Editing a solved cell incorrectly removes completion state |

</frozen-after-approval>

## Code Map

- `crossword-data.json` -- canonical supplied data for the 21 crossword grids, bundled through a static import.
- `mots-croises-turquie.html` -- behavioral reference for the port; remains unchanged unless removal is separately approved.
- `src/app/CrosswordScreen.tsx` -- new React game screen owning board derivation, focus, controls, and responsive app-aligned presentation.
- `src/app/ArcadeHubScreen.tsx` -- adds the discoverable crossword launcher card and callback.
- `src/app/App.tsx` -- registers the typed crossword screen and hub-to-game/back navigation.
- `src/app/access-control.ts` -- maps the crossword route to the shared `game` section.
- `src/app/access-control.test.ts` -- verifies role and travel-phase policy for the new route.
- `src/app/CrosswordScreen.test.tsx` -- focused gameplay and edge-case coverage.

## Tasks & Acceptance

**Execution:**
- [x] `src/app/CrosswordScreen.tsx` -- port the supplied data-driven game into React with isolated responsive styling and accessible controls -- preserve gameplay while matching application UI.
- [x] `src/app/ArcadeHubScreen.tsx`, `src/app/App.tsx` -- add the hub card, typed route, launch callback, and return path -- make the game discoverable and navigable.
- [x] `src/app/access-control.ts`, `src/app/access-control.test.ts` -- add the crossword to the existing arcade access mapping and policy matrix -- prevent route-level policy drift.
- [x] `src/app/CrosswordScreen.test.tsx` -- cover rendering, valid/invalid entry, crossing direction, puzzle switching, check/reveal/reset, and completion transitions -- protect the behavior matrix.

**Acceptance Criteria:**
- Given an owner at any phase or a traveler after departure, when they open the games hub, then a "Mots croisés Turquie" card launches the crossword screen.
- Given a traveler before departure or a visitor at any phase, when access is evaluated for the crossword route, then it is denied consistently with the other arcade games.
- Given any supported viewport, when the crossword renders, then the board remains operable without overlapping controls or clues and the app-style back action returns to the games hub.
- Given the application is built for offline use, when assets are bundled, then all puzzle data is available without a runtime fetch.

## Design Notes

Use the arcade header pattern (`#0F5257`, back action, compact title/subtitle), app surfaces (`bg-card`, `border-border`) and restrained Turkish accents for grid state. Derive numbering and crossing membership from immutable puzzle data instead of mutating imported words. Size cells with a stable CSS variable and allow board-only horizontal scrolling on small grids rather than shrinking labels or the entire screen.

## Verification

**Commands:**
- `npm run test -- src/app/CrosswordScreen.test.tsx src/app/access-control.test.ts` -- expected: focused interaction and access-policy tests pass.
- `npm run build` -- expected: TypeScript/Vite production build succeeds and statically bundles crossword data.

**Manual checks (if no CLI):**
- Launch from the games hub at mobile and desktop widths; play a crossing word, switch puzzles, exercise each control, complete a small grid, and return to the hub with no layout overlap.

## Suggested Review Order

**Game Design**

- React screen owns responsive layout, focus state, controls, and accessible feedback.
	[CrosswordScreen.tsx:150](../../../src/app/CrosswordScreen.tsx#L150)

- Immutable derivation builds crossings and numbering from the supplied puzzle data.
	[CrosswordScreen.tsx:111](../../../src/app/CrosswordScreen.tsx#L111)

- Entry filtering and active-word navigation preserve valid letters and crossing behavior.
	[CrosswordScreen.tsx:234](../../../src/app/CrosswordScreen.tsx#L234)

**Navigation And Policy**

- Arcade card is the user-facing launch point for all 21 grids.
	[ArcadeHubScreen.tsx:61](../../../src/app/ArcadeHubScreen.tsx#L61)

- Typed route registration handles persistence, launch, and return to the hub.
	[App.tsx:14605](../../../src/app/App.tsx#L14605)

- Shared game-section mapping preserves owner, traveler, and visitor restrictions.
	[access-control.ts:125](../../../src/app/access-control.ts#L125)

**Verification**

- Component tests cover gameplay controls, overlap edge cases, and completion transitions.
	[CrosswordScreen.test.tsx:24](../../../src/app/CrosswordScreen.test.tsx#L24)

- App integration tests prove online and offline hub launch paths.
	[App.crossword.integration.test.tsx:49](../../../src/app/App.crossword.integration.test.tsx#L49)

- Policy matrix locks the crossword to the same access rules as other games.
	[access-control.test.ts:125](../../../src/app/access-control.test.ts#L125)