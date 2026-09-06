---
title: 'Persist per-profile crossword progress in Firebase'
type: 'feature'
created: '2026-09-06'
status: 'done'
review_loop_iteration: 0
baseline_commit: '91924ed'
context:
  - '{project-root}/guidelines/_bmad-output/planning-artifacts/adr-11-3-source-of-truth-cloud-local.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Crossword answers and the active puzzle currently live only in `CrosswordScreen` React state. Closing, refreshing, or switching profile loses a traveler's work, contrary to the app's per-profile cloud continuity model.

**Approach:** Persist a compact, strictly validated crossword snapshot under the existing family RTDB document, scoped by `profileId`. Restore it when the authenticated profile opens the game and update it after meaningful crossword state changes, using the established cloud snapshot guards and offline queue.

## Boundaries & Constraints

**Always:** Store progress independently for each application profile; retain entries, selected puzzle, check feedback, and completion history; reject malformed/unrecognized persisted values without breaking the game; preserve all current gameplay, access policy, 21 bundled grids, Firebase membership authorization, offline retry behavior, and cloud-before-local source-of-truth rules.

**Ask First:** Changes to puzzle content, new scoring/rewards, sharing progress between profiles, or resetting another user's crossword progress.

**Never:** Store crossword answers in an unauthenticated/global path; weaken RTDB membership rules; overwrite a local edit with an older cloud echo; use localStorage as the authoritative persistence mechanism; merge crossword state into the incompatible daily `gameProgress` schema.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|---------------|----------------------------|----------------|
| Resume on reload | Authenticated profile has a valid saved crossword snapshot | The saved puzzle, entries, feedback, and completed puzzle IDs are restored | Missing snapshot opens the first puzzle with empty entries |
| Profile isolation | Profile A and B each have saved snapshots | Switching/re-authenticating restores only the active profile's snapshot | No A state is displayed or written while B is active |
| Save game action | Player enters, reveals, checks, resets, or changes puzzle | Local UI changes immediately and a guarded cloud update is queued/pushed | Offline mutation follows the existing retry queue; no gameplay error blocks input |
| Invalid remote data | Snapshot has an invalid puzzle ID, cell key/value, status, or completed list | Invalid fields are discarded and valid data remains usable | Screen safely falls back to a valid puzzle and empty/default fields where needed |
| Multi-device echo | Local save is awaiting cloud confirmation | The older incoming snapshot does not erase the local newer state | Hydration defers until the corresponding cloud state arrives |

</frozen-after-approval>

## Code Map

- `src/app/CrosswordScreen.tsx` -- owns the interactive grid; must accept an optional restored snapshot and report durable state transitions to its parent.
- `src/app/App.tsx` -- owns active profile state, cloud hydration, guarded snapshot writes, and the crossword route.
- `src/services/cloudSyncProvider.ts` -- parses family RTDB snapshots, writes the atomic update payload, queues offline writes, and cleans profile data on deletion.
- `src/types/cloud.ts` -- declares cloud snapshot and write-payload contracts.
- `firebase/database.rules.prod.json` -- validates permitted `crosswordProgress` payloads under a member-authorized family.
- `src/services/cloudSyncProvider.test.ts` and `src/app/App.crossword.integration.test.tsx` -- protect parsing/writing and per-profile resume behavior.

## Tasks & Acceptance

**Execution:**
- [x] `src/types/cloud.ts`, `src/services/cloudSyncProvider.ts` -- introduce a bounded `CloudCrosswordProgress` record and carry it through parse, snapshot, write, pending queue, and profile deletion flows -- provide the single authoritative per-profile storage path.
- [x] `firebase/database.rules.prod.json` and RTDB rule tests -- allow only null or a schema-valid crossword record under `families/$familyId/crosswordProgress/$profileId` for authorized family members -- retain server-side data shape enforcement.
- [x] `src/app/App.tsx` -- hydrate active-profile crossword state, preserve local mutations until their matching cloud echo, and pass restored/saved state at the crossword route -- prevent stale snapshot rollback and profile leakage.
- [x] `src/app/CrosswordScreen.tsx` -- define an exported UI persistence snapshot, restore only valid current-puzzle data, and notify the parent after durable user actions -- keep gameplay behavior intact.
- [x] `src/services/cloudSyncProvider.test.ts`, `src/app/CrosswordScreen.test.tsx`, `src/app/App.crossword.integration.test.tsx` -- test valid/malformed snapshots, writes/clears/deletion, resume after remount, profile isolation, and offline-compatible immediate interaction -- cover the matrix above.

**Acceptance Criteria:**
- Given an authenticated traveler has entered crossword letters, when they refresh or return to the game, then the same profile resumes the saved grid with its entries and completion state.
- Given two profiles use the same family, when either one opens the crossword, then only that profile's own progress is shown and mutations are saved under that profile.
- Given Firebase is temporarily unavailable, when a player changes crossword progress, then the UI remains usable and the update is retried through the existing pending-write mechanism.
- Given a stored record is malformed or references an unknown puzzle, when it hydrates, then the crossword remains playable with safe defaults and no invalid values rendered.
- Given a cloud update is in flight, when an earlier remote snapshot arrives, then it does not revert the active player's newer crossword changes.

## Design Notes

Use a dedicated `crosswordProgress/$profileId` branch, not `gameProgress/$profileId`: daily-game validation requires day/phase fields and its reset semantics are unrelated. The payload should remain bounded: `puzzleId`, a cell-key-to-single-supported-letter map, a cell-key-to-result map, completed puzzle IDs, and `updatedAt`; transient focus/direction are intentionally not persisted. The cloud parser must accept only puzzle IDs bundled by the client and filter entries against the derived playable cells for that puzzle.

## Verification

**Commands:**
- `npm run test -- src/services/cloudSyncProvider.test.ts src/app/CrosswordScreen.test.tsx src/app/App.crossword.integration.test.tsx` -- expected: parse/write, UI restore, and active-profile isolation tests pass.
- `npm run test -- firebase/firebase-rtdb.rules.test.ts` -- expected: production-shaped crossword data is allowed only for authenticated family members; malformed data is rejected.
- `npm run build` -- expected: Vite TypeScript build succeeds.

**Manual checks (if no CLI):**
- On two profiles and two browser sessions, enter different letters in the same grid, reload each session, switch profiles, use reset/reveal/check, then verify each profile resumes only its own cloud-synced state.

## Suggested Review Order

**Cloud State And Synchronization**

- The parent owns profile-scoped state and rejects older cloud echoes while a save is pending.
  [App.tsx:13699](../../../../src/app/App.tsx#L13699)

- The crossword route restores the active profile and immediately routes durable changes into cloud state.
  [App.tsx:18844](../../../../src/app/App.tsx#L18844)

- The provider parses the dedicated RTDB branch and atomically writes only the active profile's progress.
  [cloudSyncProvider.ts:1772](../../../../src/services/cloudSyncProvider.ts#L1772)

**Game Persistence Boundary**

- The screen restores normalized state and publishes only meaningful grid transitions.
  [CrosswordScreen.tsx:160](../../../../src/app/CrosswordScreen.tsx#L160)

- Clearing a letter removes it and its verification result before persistence.
  [CrosswordScreen.tsx:281](../../../../src/app/CrosswordScreen.tsx#L281)

- Shared normalization admits only bundled grids and playable cells.
  [crossword-progress.ts:24](../../../../src/app/crossword-progress.ts#L24)

**Schema And Tests**

- Cloud types define the dedicated, bounded snapshot shape.
  [cloud.ts:55](../../../../src/types/cloud.ts#L55)

- RTDB rules restrict progress to the profile's authenticated family member and validate its structure.
  [database.rules.prod.json:625](../../../../firebase/database.rules.prod.json#L625)

- Tests cover parsing, targeted writes, deletion cleanup, UI restoration, and profile isolation.
  [cloudSyncProvider.test.ts:583](../../../../src/services/cloudSyncProvider.test.ts#L583)
