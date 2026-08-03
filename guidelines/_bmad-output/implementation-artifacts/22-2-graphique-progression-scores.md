---
baseline_commit: 4dc056efa203a46b44f5ffc5d30916a3ca5a30b5
---

# Story 22.2: Score Progression Chart Over Time

Status: review

## Story

As a family member,
I want to view one profile's day-by-day score progression in the Results screen,
so that I can understand how performance evolved over the trip instead of only seeing final totals.

## Acceptance Criteria

1. The Results screen includes a chart view showing day-by-day progression for one selected profile.
2. The default selected profile is the current active profile.
3. A selector allows switching to another family profile.
4. The owner profile can be selected in this individual chart view, even though the owner remains excluded from the podium.
5. A profile with no game history shows an explicit empty state (no misleading zero-line chart, no error).
6. A profile with a single played day renders a single point safely (no crash, no broken polyline rendering).
7. A day where challenge is not completed still reflects real earned points for that day (including possible 0), then cumulative total follows actual data only.
8. No regression in existing Results features: podium behavior, latest session card, total score summary, badges, and day participation panel.

## Tasks / Subtasks

- [x] Add score progression data transformer (AC: 1, 5, 6, 7)
  - [x] Create a pure helper module (recommended: src/app/score-progression.ts) that converts GameHistoryEntry[] into chart points sorted by day.
  - [x] Include cumulative total computation (running sum over each day's totalScore).
  - [x] Ensure strict output for empty/single-day histories.
- [x] Integrate chart UI in Results screen (AC: 1, 2, 3, 4, 5, 6)
  - [x] Extend ResultsScreen props with current profile id.
  - [x] Add a profile selector dedicated to chart profile selection.
  - [x] Default chart profile to current active profile, with safe fallback if profile disappears.
  - [x] Keep owner excluded from podium while allowing owner selection in chart selector.
  - [x] Add explicit empty-state card for no history.
- [x] Reuse existing chart stack and style patterns (AC: 1)
  - [x] Use existing Recharts dependency and app chart wrapper components from src/app/components/ui/chart.tsx.
  - [x] Keep mobile readability (responsive container, simple axis labels, minimal clutter).
- [x] Add tests (AC: all)
  - [x] Unit tests for data transformation from GameHistoryEntry[] (empty, single day, gaps, zero-score day, unsorted input).
  - [x] Integration test: default profile selection is current profile.
  - [x] Integration test: switching selector changes rendered chart/profile summary.
  - [x] Integration test: owner profile can be selected for chart while owner is still absent from podium ranking.
  - [x] Integration test: no-history profile shows explicit empty-state message.

## Dev Notes

### Story Foundation (Source)

- Story source: docs/specs-stories/epic-22/22.2-graphique-progression-scores.md
- Epic neighbors:
  - 22.1 adds configurable notifications and already updated App.tsx with recent patterns.
  - 22.3 will later add collaborative challenge logic; avoid entangling this story with family-wide challenge semantics.

### Epic 22 Context (Cross-Story Guardrails)

- 22.1 is implemented with extensive App.tsx edits and tests. Respect existing screen composition and state effects.
- 22.2 must remain display-focused. Do not change scoring rules or write paths to cloud/local storage.
- 22.3 (future) introduces collaborative overlays. Keep 22.2 chart model generic enough to remain compatible.

### Architecture Compliance (Must Follow)

- Keep architecture style: React + TypeScript + Vite + Vitest.
- No new dependency is allowed for charting.
- Reuse existing chart infra in src/app/components/ui/chart.tsx (already based on Recharts).
- Preserve existing access control behavior around Results screen and role restrictions already validated by tests.
- Keep source-of-truth data unchanged: game history is read from existing state/snapshot wiring; no schema mutation.

### Existing Files to Read Before Modifying (Mandatory)

- src/app/App.tsx
  - ResultsScreen definition (~lines 3685+): current UI sections and score derivations.
  - ResultsScreen rendering call path (~lines 9607+): where props are passed.
  - Family members projection (~lines 8390+): role/surname/gameResults sourcing.
  - Preserve:
    - Podium logic usage and owner/visitor exclusion semantics.
    - Current cards: latest session, total score, badges, participation block.
- src/app/game-results.ts
  - GameHistoryEntry contract and sorting conventions.
  - Preserve parser constraints and entry shape.
- src/app/podium.ts
  - Preserve owner/visitor exclusion for podium only.
- src/app/components/ui/chart.tsx
  - Reusable chart container/tooltip/legend primitives and styling conventions.
- src/app/App.access-control.integration.test.tsx
  - Existing Results navigation expectation; ensure no route/screen regression.

### What This Story Changes

- Adds a one-profile-at-a-time progression chart view in Results.
- Adds a selector for target profile in that chart block.
- Introduces or reuses a pure data-mapping function for chart points and cumulative progression.

### What Must Be Preserved (Regression Guardrails)

- Podium stays unchanged (owner excluded there).
- Results screen title, navigation, and existing sections remain functional.
- Existing score storage/history semantics remain unchanged.
- Existing notification logic from 22.1 remains untouched.

### Recommended Implementation Blueprint

1. Data model for chart points (pure function)
   - Input: GameHistoryEntry[]
   - Output example:
     - { day: 1, label: "J1", dayScore: 35, cumulativeScore: 35 }
     - { day: 2, label: "J2", dayScore: 0, cumulativeScore: 35 }
     - { day: 3, label: "J3", dayScore: 42, cumulativeScore: 77 }
   - Rules:
     - Sort by day ascending before accumulation.
     - Use actual recorded totalScore for each day entry.
     - No synthetic points for missing days.

2. Profile selection model in ResultsScreen
   - Add local state: selectedProfileId.
   - Initialize with current profile id (prop passed from App).
   - Candidate profiles for selector:
     - Use familyMembers list from App projection.
     - Include owner and non-owner (exclude only visitor if product choice requires; default behavior here: include owner, and include all family profiles that can have game history).
   - Resolve selected profile display name and history from familyMembers.

3. Chart rendering strategy
   - Use existing chart wrapper from src/app/components/ui/chart.tsx and Recharts line chart primitives.
   - Render cumulative score line as primary signal.
   - Optional secondary bars/line for dayScore only if readability remains high on mobile.
   - For single point, ensure point marker is visible even with no segment.

4. Empty and edge states
   - No history: show explicit text card (for selected profile) instead of fake axis with zero line.
   - Single day: show one point and exact score labels.
   - Missing days: connect only actual recorded days; no interpolation assumptions.

### Technical Requirements

- Do not recompute game logic; only consume stored GameHistoryEntry data.
- Keep any new helper pure and deterministic.
- Keep component-level state minimal and localized to ResultsScreen.
- Do not introduce global state/store additions.

### Library / Framework Requirements

- Reuse installed dependency: recharts@2.15.2.
- Reuse app chart wrapper components in src/app/components/ui/chart.tsx.
- Do not add a new chart package.

### Testing Requirements

- Unit (new test file recommended: src/app/score-progression.test.ts)
  - Empty history -> empty points.
  - Single entry -> one point with correct cumulative value.
  - Unsorted entries -> sorted points by day.
  - Zero-score day -> cumulative unchanged for that step.
  - Non-consecutive days -> no synthetic day generation.
- Integration (new or existing App integration test file)
  - Results defaults to current profile in chart section.
  - Selector changes active profile visualization.
  - Owner profile is selectable in chart context.
  - Empty-state text appears for selected profile with no history.
- Regression smoke
  - Existing access-control integration around Results still passes.
  - Existing podium tests still pass unchanged.

### Previous Story Intelligence (22.1)

- 22.1 introduced substantial App.tsx wiring and robust test additions.
- Follow established patterns from that story:
  - Small focused helpers for business conditions.
  - Explicit branch coverage in tests.
  - Conservative state updates and clear UX fallback messages.
- Avoid repeating 22.1 mistake vectors:
  - Avoid giant inlined logic blocks in render body.
  - Keep derived data in isolated helper(s).

### Git Intelligence Summary (Recent 5 commits)

- Commits are story-oriented and incremental: "Story 22.1 v1/v2/v4/v4.1".
- High-impact files recently touched:
  - src/app/App.tsx
  - src/app/notifications.ts
  - src/app/notifications.test.ts
  - src/app/App.notifications.integration.test.tsx
  - guidelines/_bmad-output/implementation-artifacts/sprint-status.yaml
- Practical implication:
  - Keep changes isolated to Results-specific logic.
  - Add dedicated tests rather than overloading unrelated test files.

### Latest Tech Information

- Notifications API remains limited availability and secure-context only; this story must not add notification side effects from chart interactions.
- Recharts is already installed and project-local chart wrapper exists; use it to stay aligned with existing styling primitives and responsive behavior.
- Web research note: direct scraping of Recharts docs was unavailable in tool fetch, so rely on in-repo chart wrapper conventions as the authoritative implementation pattern.

### Project Context Reference

- Persistent fact source configured: file:{project-root}/**/project-context.md
- Discovery result: no project-context.md file found in workspace.
- Action: proceed using current repo architecture and implementation artifacts as authoritative context.

## Change Log

- 2026-08-03: Implementation complete — score progression chart with profile selector added to ResultsScreen; pure data transformer and comprehensive tests added (Claude Sonnet 4.6 via GitHub Copilot)

Status: review

Completion note: Ultimate context engine analysis completed - comprehensive developer guide created.

## Dev Agent Record

### Agent Model Used

GPT-5.3-Codex

### Debug Log References

- Workflow activation resolved from _bmad/scripts/resolve_customization.py
- Sources analyzed: epic 22 story files, previous implementation artifact 22-1, App/game-results/podium/chart code, sprint status, recent git commits.

### Completion Notes List

- Story context includes explicit anti-regression guardrails and file-level implementation guidance.
- Selector and chart behavior are fully specified for empty/single/multi-day histories.
- Existing dependency stack reused; no new library required.
- **Implementation (2026-08-03):** Created `src/app/score-progression.ts` with pure `buildScoreChartPoints` helper. Added chart section with profile selector to `ResultsScreen` in `src/app/App.tsx` using existing `ChartContainer`/recharts wrappers. 9 unit tests in `score-progression.test.ts` cover all edge cases. 5 integration tests in `App.score-progression.integration.test.tsx` cover AC 2–5 and regression. All 350 tests pass.

### File List

- guidelines/_bmad-output/implementation-artifacts/22-2-graphique-progression-scores.md
- src/app/score-progression.ts (new)
- src/app/score-progression.test.ts (new)
- src/app/App.score-progression.integration.test.tsx (new)
- src/app/App.tsx (modified: imports, SCORE_CHART_CONFIG, ResultsScreen)
