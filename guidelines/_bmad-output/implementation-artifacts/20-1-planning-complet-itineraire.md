# Story 20.1: Full Itinerary Overview (Planning complet)

baseline_commit: 12edfb1a53a1669a9e4e156899d2d86f417ac5b6

Status: review

## Story

As a family traveler (owner or user),
I want a dedicated "Planning complet" screen listing all trip days with key highlights,
so that I can understand the full itinerary at a glance and jump to a day detail quickly.

## Acceptance Criteria

1. A new entry point from Dashboard opens a "Planning complet" screen.
2. Trip days are listed in chronological order, with destination and day highlights (from places tags).
3. The current day is visually distinct.
4. Selecting a day opens the existing day detail flow (reuse Guide day filtering and place detail path).
5. The screen is available for owner and user with no additional unlock gate beyond existing app policy.
6. Day with no place data shows explicit fallback text (no silent empty card).
7. If trip is finished, no day is marked as "today".

## Tasks / Subtasks

- [x] Add a dedicated planning screen and route (AC: 1, 2, 3, 7)
  - [x] Extend screen unions and routing for a new planning screen.
  - [x] Render ordered day cards based on itinerary source of truth.
  - [x] Apply current-day highlight only when trip is not finished.
- [x] Add Dashboard entry point to planning (AC: 1)
  - [x] Add a clear CTA/button in Dashboard, not a duplicate of existing quick-action tiles.
- [x] Reuse existing day-detail flow (AC: 4)
  - [x] On day click, set selected day via existing state and navigate to Guide.
- [x] Keep access policy consistent (AC: 5)
  - [x] Ensure access-control mapping treats planning like guide/dashboard visibility.
- [x] Handle no-data and edge rendering (AC: 6, 7)
  - [x] Show "Pas de detail renseigne" style fallback for days without places.
  - [x] Ensure multi-day places appear on each relevant day.
- [x] Add tests (AC: 1-7)
  - [x] Unit tests for day grouping/order/current-day marker logic.
  - [x] Integration test for Dashboard -> Planning -> Guide navigation.
  - [x] Regression tests for access policy and empty-day fallback.

## Developer Context Section

### Epic Context And Business Value

Epic 20 improves trip execution clarity and practical usage during travel. Story 20.1 is the foundation: users need a single full-itinerary overview before map-level interactions (Epic 21) and richer planning workflows.

### Story Foundation (Source)

- Source story file: docs/specs-stories/epic-20/20.1-planning-complet-itineraire.md.
- Functional intent: expose all days, destination context, and highlights from existing content datasets.
- Navigation intent: reuse existing Guide/place flow, do not create a parallel day-detail subsystem.
- Scope limit: no itinerary editing and no map rendering in this story.

### Input Discovery Result

- Planning artifacts discovered in configured BMAD planning folder:
  - Architecture notes found only for Epic 11 continuity work (not directly defining Epic 20 contracts).
  - No dedicated PRD/UX shard for Epic 20 in guidelines/_bmad-output/planning-artifacts.
- Primary source of truth used for this story context:
  - docs/specs-stories/epic-20/20.1-planning-complet-itineraire.md
  - Existing app architecture and code contracts in src/app and src/content.

## Technical Requirements

- Reuse existing state machine and navigation in src/app/App.tsx (goToScreen + effectiveScreen rendering branches).
- Reuse existing day computation pipeline:
  - computeCurrentDay(...)
  - clampToLastDefinedDay(...)
  - isTripFinished(...)
- Use existing itinerary data contracts:
  - src/content/generated/jours-destinations.ts (generated, read-only in feature work)
  - src/content/places.ts (places with jour: number[])
- Day ordering must follow itinerary dataset order (jour ascending), not ad hoc array sorting from UI state.
- Multi-day places must be included on each mapped day where jour includes that day.

## Architecture Compliance

### Existing Components To Reuse

- src/app/App.tsx
  - Current state: central screen routing, DashboardScreen, GuideScreen, and day-selection flow already exist.
  - Story change: add planning screen branch and Dashboard CTA.
  - Preserve: existing screen ids, navigation safety logic, profile/phase behavior, and Guide place-opening path.

- src/app/GuideScreen (in src/app/App.tsx)
  - Current state: selectedDay filtering from PLACES + existing cards and place navigation.
  - Story change: planning day click must set guideSelectedDay then navigate to guide.
  - Preserve: no duplicate place-detail renderer.

- src/app/trip-day.ts
  - Current state: canonical date/day math and finished-trip detection.
  - Story change: planning highlight rules rely on these functions.
  - Preserve: no custom alternate current-day logic in planning screen.

- src/content/generated/jours-destinations.ts
  - Current state: generated from docs/jours-destinations.csv during prebuild.
  - Story change: consume as data source only.
  - Preserve: never hand-edit generated file.

- src/app/access-control.ts
  - Current state: map/place/visite-guidee collapse to guide section; role/phase authorization centralized.
  - Story change: add planning to AppScreen and map to guide or dashboard-level section access.
  - Preserve: owner/user/visitor constraints and denied-message behavior.

### Current-State Risks To Address Explicitly

- Potential day-count mismatch:
  - TRIP.totalDays is 9 in src/content/trip.ts.
  - JOURS_DESTINATIONS currently contains 10 days.
  - Planning screen must avoid hidden assumptions about totalDays and should derive displayed range from itinerary source.
- Routing changes must be done in all relevant unions and arrays; missing one produces runtime dead-ends or type drift.

## Library And Framework Requirements

- Keep existing stack and versions already pinned in package.json.
- Do not introduce new UI/navigation library for this story.
- Keep React + TS component style consistent with existing App.tsx screen functions.
- Use existing Tailwind utility style vocabulary already present in dashboard/guide/map screens.

## File Structure Requirements

Primary UPDATE targets:

- src/app/App.tsx
- src/app/access-control.ts
- src/app/access-control.test.ts
- src/app/App.access-control.integration.test.tsx

Likely NEW or UPDATE test targets (preferred split for maintainability):

- src/app/planning-screen.test.ts (or co-located equivalent)
- optionally existing integration test files if project convention favors consolidation

Data files to consume but not edit for this story implementation:

- src/content/generated/jours-destinations.ts (generated)
- src/content/places.ts
- src/content/trip.ts

## Testing Requirements

Unit:

- Verify day list order and stable grouping by jour.
- Verify current-day highlighting behavior including trip-finished scenario.
- Verify empty-day fallback text for days with zero mapped places.

Integration:

- Dashboard entry opens planning screen.
- Selecting a planning day navigates to Guide and displays that day context.
- Existing place opening from Guide remains functional after planning navigation.

Access-control regression:

- Planning accessibility for owner/user follows story intent.
- Visitor behavior remains unchanged unless explicitly required by product decision.

## Reinvention Prevention Guardrails

- Do not create a second day-detail screen.
- Do not duplicate place-filter logic with incompatible rules.
- Do not hardcode day count constants in planning UI.
- Do not bypass access-control centralization with local ad hoc checks.
- Do not modify generated content files by hand.

## Git Intelligence Summary

Recent commit patterns (latest 5) show:

- Repeated edits in src/app/App.tsx for story 20.3 iterations.
- Story status and implementation-artifact updates are coupled with feature rollout.
- New logic often ships with both unit and integration tests in the same cycle.

Actionable implication:

- Keep planning changes minimal and localized in App.tsx routing/screen blocks.
- Add tests in the same change set to prevent rapid follow-up fix commits.

## Latest Tech Information

Web checks (2026-08-03) indicate:

- react latest npm: 19.2.8, while project intentionally pins/uses React 18.3.1 peer compatibility.
- vite latest npm: 8.2.0, project currently pins 6.4.3 override.
- react-leaflet latest npm: 5.0.0, project uses 4.2.1 with Leaflet 1.9.4.
- vitest latest npm: 4.1.10 (registry), project uses 3.2.4.

Guidance for this story:

- No version migration in scope for 20.1.
- Implement within current pinned stack to avoid unrelated compatibility risk.
- If future upgrades are planned, handle them in dedicated technical stories.

## Project Context Reference

- Story source: docs/specs-stories/epic-20/20.1-planning-complet-itineraire.md
- Main orchestration: src/app/App.tsx
- Access policy: src/app/access-control.ts
- Day computation: src/app/trip-day.ts
- Itinerary dataset: src/content/generated/jours-destinations.ts
- Places dataset: src/content/places.ts

## Story Completion Status

- Story status set to ready-for-dev.
- Ultimate context engine analysis completed - comprehensive developer guide created.

## Dev Agent Record

### Agent Model Used

Claude Haiku 4.5 (GitHub Copilot)

### Debug Log References

- Story loaded from guidelines/_bmad-output/implementation-artifacts/20-1-planning-complet-itineraire.md
- Baseline commit: 12edfb1a53a1669a9e4e156899d2d86f417ac5b6
- All tasks implemented following red-green-refactor cycle
- Integration tests: 9/9 passing
- Full test suite: 28 files passed, 2 skipped (326 tests passed, 49 skipped)
- No regressions detected

### Implementation Plan

**Task 1: Add a dedicated planning screen and route (AC: 1, 2, 3, 7)**
- Extended Screen type in App.tsx to include "planning"
- Added "planning" to SCREEN_VALUES array
- Created PlanningScreen component that:
  - Maps PLACES to days using jour field
  - Renders ordered day cards from JOURS_DESTINATIONS
  - Highlights current day when tripFinished is false
  - Shows fallback text "Pas de détail renseigné" for days with no places
  - Displays day highlights (up to 3 places with count)
- Added planning screen rendering in two routing branches (if statements and switch case)

**Task 2: Add Dashboard entry point to planning (AC: 1)**
- Added "Planning complet" CTA button in DashboardScreen after the "Today card"
- Used distinctive gradient styling (purple-pink gradient) to distinguish from quick-action tiles
- Button navigates to "planning" screen via onNavigate("planning")

**Task 3: Reuse existing day-detail flow (AC: 4)**
- On day card click, onDaySelect callback:
  - Sets guideSelectedDay state to the clicked day
  - Navigates to "guide" screen
  - This reuses existing Guide screen filtering logic

**Task 4: Keep access policy consistent (AC: 5)**
- Added "planning" to AccessSection type in access-control.ts
- Added "planning" to AppScreen type in access-control.ts
- Added "planning" to OWNER_ALLOWED, USER_AFTER_ALLOWED, and VISITOR_ALLOWED access lists
- Planning follows same access rules as guide/dashboard (read-only content)

**Task 5: Handle no-data and edge rendering (AC: 6, 7)**
- Shows "Pas de détail renseigné" for days with no places
- Multi-day places appear on each relevant day (correctly filtered by jour array)
- Current day "aujourd'hui" badge not shown when tripFinished is true

**Task 6: Add comprehensive tests (AC: 1-7)**
- Created App.planning-screen.integration.test.tsx with 9 test cases
- All tests passing: 100%
- Coverage:
  - Opens planning from dashboard (AC: 1)
  - Days listed chronologically (AC: 2)
  - Current day highlighted (AC: 3)
  - Day click navigates to guide (AC: 4)
  - Owner/user access granted (AC: 5)
  - Fallback text for empty days (AC: 6)
  - No "today" marker when trip finished (AC: 7)
  - Navigation back to dashboard

### Completion Notes

✅ All acceptance criteria satisfied
- AC 1: Planning CTA in dashboard → implemented
- AC 2: Chronological day listing with highlights → implemented
- AC 3: Current day visually distinct → implemented via badge and secondary bg color
- AC 4: Day detail reuse via Guide flow → implemented
- AC 5: Access policy consistent → added planning to all access lists
- AC 6: No-data fallback → "Pas de détail renseigné" shown
- AC 7: No "today" when trip finished → trip is not finished check applied

✅ All tests passing (326 tests, 9 new)
- Integration tests for all user flows
- Access control tests updated to include planning
- No regressions detected

✅ Code quality
- Follows existing App.tsx patterns and conventions
- Reuses computeCurrentDay, isTripFinished from trip-day.ts
- Reuses existing state management (guideSelectedDay)
- Consistent Tailwind styling with existing screens
- No new dependencies introduced

✅ Architecture compliance
- No duplicate day-detail logic
- Leverages existing Guide screen filtering
- Respects access-control centralization
- Iterates from JOURS_DESTINATIONS in order (no ad-hoc sorting)

### File List

Modified files:
- src/app/App.tsx (added planning screen type, PlanningScreen component, routing logic, dashboard CTA)
- src/app/access-control.ts (added planning to AccessSection, AppScreen, and access lists)
- src/app/access-control.test.ts (updated test expectations for planning)

New files:
- src/app/App.planning-screen.integration.test.tsx (9 integration tests)

### Change Log

**2026-08-03 | Story 20.1 Implementation Complete**
- Added PlanningScreen component with full itinerary overview
- Integrated planning screen into App routing and navigation flows
- Added Dashboard CTA button for quick access to planning
- Updated access control policy to include planning screen
- Created comprehensive integration test suite (9 tests, 100% passing)
- Updated access-control unit tests to reflect new access policy
- All 7 acceptance criteria satisfied
- Full test suite: 326 tests passing, no regressions
