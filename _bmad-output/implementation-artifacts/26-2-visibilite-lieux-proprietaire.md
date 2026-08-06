---
baseline_commit: uncommitted
---

# Story 26.2: Pilotage proprietaire de la visibilite des lieux (surprise)

Status: review

## Story

As a proprietaire,
I want to decide for each place whether it is visible or hidden for non-owner profiles,
so that I can keep surprise places secret while preserving a coherent shared itinerary.

## Acceptance Criteria

1. The owner can toggle each place visibility between `visible` and `hiddenByOwner`.
2. Only owner identities can write place visibility state; non-owner profiles cannot modify it.
3. Hidden places are not shown in Guide or Planning for `utilisateur` and `visiteur`.
4. Hidden places remain visible to the owner with a clear hidden-status indicator.
5. Visibility state is persisted in cloud family-shared state and propagates across devices/profiles.
6. Direct access to a hidden place by a non-owner is blocked with safe redirection and explicit message.
7. No regression is introduced to game logic (quiz, riddle, challenge, scoring, day lock).

## Tasks / Subtasks

- [x] Extend cloud domain model for place visibility (AC: 1,2,5)
  - [x] Add typed place visibility map in `src/types/cloud.ts` (`Record<placeId, "visible" | "hiddenByOwner">`)
  - [x] Parse/hydrate this field in `src/services/cloudSyncProvider.ts`
  - [x] Include this field in cloud push payload in `src/hooks/useCloudSync.ts` / provider update path
- [x] Secure writes at RTDB rules level (AC: 2)
  - [x] Add rules branch under `families/{familyId}` for place visibility writes owner-only in `firebase/database.rules.prod.json`
  - [x] Mirror in test rules `firebase/database.rules.test.json`
  - [x] Add coverage in `firebase/firebase-rtdb.rules.test.ts` for owner allow / non-owner deny
- [x] Add owner UI controls for visibility toggles (AC: 1,4)
  - [x] Add owner-only toggle control in Guide place cards and/or Place detail in `src/app/App.tsx`
  - [x] Add hidden badge/indicator visible to owner only
- [x] Apply filtering in Guide and Planning (AC: 3,4)
  - [x] Filter day place lists in `GuideScreen` by role + visibility map in `src/app/App.tsx`
  - [x] Filter planning day badges/previews in `PlanningScreen` by role + visibility map
  - [x] Preserve day card visibility when all places are hidden; show explicit empty state text
- [x] Add guard for direct hidden-place access (AC: 6)
  - [x] In place opening/navigation logic (`openPlace` / place resolution), block non-owner access to hidden places
  - [x] Reuse existing safe-screen redirection and access-denied messaging pattern
- [x] Regression and feature tests (AC: all)
  - [x] Add integration tests in `src/app/App.place-comments.integration.test.tsx` or dedicated new test file for role-based place visibility rendering
  - [x] Add/extend planning integration tests in `src/app/App.planning-screen.integration.test.tsx`
  - [x] Add non-regression checks for game access/behavior (existing game integration suites)

## Dev Notes

### Story Foundation

- Source story: `docs/specs-stories/epic-26/26.2-visibilite-lieux-proprietaire.md`
- Sprint tracking source: `_bmad-output/implementation-artifacts/sprint-status.yaml`
- Product clarification to preserve: owner is the only decision-maker for place visibility; decision propagates to all non-owners.

### Existing System Context (must preserve)

- Guide and Planning currently derive places from static `PLACES`/`PLACES_WITH_AUTO_GPS` in `src/app/App.tsx`.
- Role access matrix is centralized in `src/app/access-control.ts`; this story is content-filtering, not section authorization redesign.
- Cloud synchronization already handles family-wide owner-governed fields (phase, tripStartDate, gameDayOverrides) in:
  - `src/types/cloud.ts`
  - `src/services/cloudSyncProvider.ts`
  - `src/hooks/useCloudSync.ts`
- RTDB owner-only write patterns already exist in rules (ownerCodeHash/phase/tripStartDate/gameDayOverrides); reuse the same authorization style.

### Technical Design Constraints

- Use additive schema extension (backward compatible): missing visibility entries default to `visible`.
- Do not modify `src/content/places.ts` structure for persisted visibility; visibility is runtime cloud state.
- Keep game modules untouched (no dependency on place visibility state).
- Prefer pure helper function for filtering, e.g. `isPlaceVisibleForRole(placeId, role, visibilityMap)`.

### Expected File Touch List

- `src/types/cloud.ts`
- `src/services/cloudSyncProvider.ts`
- `src/hooks/useCloudSync.ts`
- `src/app/App.tsx`
- `firebase/database.rules.prod.json`
- `firebase/database.rules.test.json`
- `firebase/firebase-rtdb.rules.test.ts`
- `src/app/App.planning-screen.integration.test.tsx`
- `src/app/App.access-control.integration.test.tsx` (if messaging/guard coverage is added there)
- Optional new test file: `src/app/App.place-visibility.integration.test.tsx`

### Edge Cases To Test Explicitly

- All places hidden for selected day: non-owner sees empty state, owner still sees cards.
- Hidden place selected before visibility update arrives: once snapshot updates, non-owner is redirected safely.
- Multi-day place hidden: disappears consistently from every impacted day for non-owner.

### Anti-Patterns To Avoid

- Do not rely only on UI hiding controls; rules must enforce owner-only writes.
- Do not mix visibility with role authorization list in `access-control.ts`.
- Do not hide whole day cards in Planning when only places are hidden.
- Do not store visibility only in localStorage when cloud is enabled.

## Dev Agent Record

### Agent Model Used

GPT-5.3-Codex

### Debug Log References

- Story implementation artifact created on 2026-08-06 from explicit user request.

### Completion Notes List

- Implemented owner-controlled place visibility model in cloud types, cloud snapshot parsing, and cloud push pipeline.
- Added owner-only visibility write enforcement in RTDB production and test rules, plus rule coverage tests.
- Added owner UI controls and hidden-status indicator in Guide, role-aware filtering in Guide and Planning, and hidden-place direct access guard with safe redirection.
- Added dedicated integration tests for place visibility behavior and full regression validation across the repository.
- Full suite result: 394 passed, 62 skipped (Firebase emulator-dependent rule suites skipped).

### File List

- `src/types/cloud.ts`
- `src/services/cloudSyncProvider.ts`
- `src/hooks/useCloudSync.ts`
- `src/app/App.tsx`
- `firebase/database.rules.prod.json`
- `firebase/database.rules.test.json`
- `src/services/firebase-rtdb.rules.test.ts`
- `firebase/firebase-rtdb.rules.test.ts`
- `src/services/cloudSyncProvider.test.ts`
- `src/app/App.place-visibility.integration.test.tsx`
- `_bmad-output/implementation-artifacts/26-2-visibilite-lieux-proprietaire.md`

### Change Log

- 2026-08-06: Added ready-for-dev implementation artifact for story 26.2.
- 2026-08-06: Implemented story 26.2 place-visibility controls, cloud/rules wiring, and integration/regression tests; status moved to review.
