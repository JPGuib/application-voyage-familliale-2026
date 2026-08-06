---
baseline_commit: 1afac2f1d3af8259958a5d6e5029c6202148a784
---

# Story 26.3: Owner visibility control for important travel documents

Status: done
Epic: 26 - Sensitive content visibility and display controls
Story Key: 26-3-visibilite-documents-et-modes-affichage-sejour
Date: 2026-08-06

## Story
As an owner,
I want to toggle visibility of important travel documents for non-owner profiles,
so that I can keep selected documents hidden while maintaining coherent shared behavior across devices.

## Business Value
- Extends owner-controlled surprise/privacy behavior from places to travel documents.
- Prevents accidental disclosure of sensitive or timing-dependent documents to non-owner profiles.
- Preserves product consistency with existing owner-only governance patterns.

## Acceptance Criteria
1. The owner can toggle each important document visibility between `visible` and `hiddenByOwner`, and changes propagate to other profiles.
2. Non-owner profiles (`utilisateur`, `visiteur`) do not see document visibility controls and cannot modify this visibility state.
3. The owner always sees all important documents, including hidden ones, with a clear hidden-status indicator.
4. Non-owner profiles only see important documents marked visible.
5. No regression is introduced to existing place visibility logic.
6. No regression is introduced to game logic.

## Scope
### In scope
- Add cloud-backed visibility map for important documents.
- Add owner-only visibility toggle UI for document cards/list entries.
- Apply role-aware filtering for important documents rendering.
- Enforce owner-only writes in RTDB rules and tests.
- Add regression coverage for document visibility and nearby flows.

### Out of scope
- Stay display modes (`progressive` / `complete`).
- Per-non-owner individualized visibility policies.
- Time-based or rule-engine automatic reveal behavior.

## Developer Guardrails

### Technical Requirements
- Keep cloud schema additive and backward compatible.
- Default visibility for missing document state must be `visible`.
- Reuse owner visibility patterns already introduced for places.
- Keep game modules and score/day lock logic untouched.

### Architecture Compliance
- Cloud shared state remains source of truth for document visibility.
- No local-only authoritative visibility state.
- Do not couple document visibility behavior with access matrix policy module semantics.

### File Structure Requirements
- UPDATE `src/types/cloud.ts`
- UPDATE `src/services/cloudSyncProvider.ts`
- UPDATE `src/hooks/useCloudSync.ts`
- UPDATE `src/app/App.tsx`
- UPDATE `firebase/database.rules.prod.json`
- UPDATE `firebase/database.rules.test.json`
- UPDATE `firebase/firebase-rtdb.rules.test.ts`
- ADD/UPDATE `src/app/*document*visibility*.test*` as needed
- ADD/UPDATE integration tests covering role-based rendering for important documents

### Testing Requirements
- Unit tests for visibility defaulting/filtering helper behavior.
- Integration tests for owner vs non-owner document rendering and owner-only controls.
- RTDB rules tests: owner allow, non-owner deny for document visibility writes.
- Regression checks: place visibility behavior and game suites still green.

## Implementation Tasks
- [x] Extend cloud model for important-document visibility (AC: 1,4)
  - [x] Add typed map for document visibility state (`visible | hiddenByOwner`) in cloud types.
  - [x] Parse/hydrate this map from RTDB snapshot with backward-compatible default behavior.
  - [x] Include this map in outbound cloud synchronization payload.
- [x] Enforce owner-only writes in RTDB rules (AC: 2)
  - [x] Add production rules branch for document visibility writes under family state.
  - [x] Mirror the branch in test rules.
  - [x] Add rule tests that validate owner allow / non-owner deny.
- [x] Implement owner UI controls and status indicators (AC: 1,3)
  - [x] Add owner-only hide/show toggle on important document entries.
  - [x] Add hidden-status indicator visible to owner on hidden docs.
- [x] Apply role-aware document filtering (AC: 3,4)
  - [x] Ensure non-owner views include only visible documents.
  - [x] Ensure owner views include all documents regardless of visibility state.
  - [x] Ensure documents without explicit visibility remain visible by default.
- [x] Add automated tests for feature and regressions (AC: 1-6)
  - [x] Add/extend integration tests for document visibility propagation and rendering by role.
  - [x] Add/extend tests to ensure no regression in place visibility behavior.
  - [x] Run and keep green relevant game regression suites.

## Dev Notes

### Story Foundation
- Source story: `docs/specs-stories/epic-26/26.3-visibilite-documents-et-modes-affichage-sejour.md`
- Sprint tracking source: `guidelines/_bmad-output/implementation-artifacts/sprint-status.yaml`
- Product clarification to preserve: owner is the only decision-maker for document visibility; behavior remains family-wide and cloud-shared.

### Existing System Context (must preserve)
- Story 26.2 already implemented owner-controlled place visibility.
- Important documents are currently rendered from app content/state without per-document owner visibility control.
- Cloud synchronization and RTDB rule patterns already exist for owner-governed state updates.

### Technical Design Constraints
- Visibility default for documents without state must be `visible`.
- Keep schema backward compatible and additive.
- Use pure helpers for role + visibility decision logic where possible.

### Edge Cases To Test Explicitly
- All important documents hidden: owner still sees all with indicator; non-owner sees an explicit empty state.
- Document lacking explicit visibility entry: document remains visible to all profiles.
- Cloud update while another profile is open: rendering updates without navigation/runtime errors.

### Anti-Patterns To Avoid
- UI-only restrictions without RTDB enforcement.
- Mixing document visibility with unrelated game logic.
- Breaking existing place visibility behavior while introducing document visibility behavior.

## Dev Agent Record

### Agent Model Used
GPT-5.3-Codex

### Implementation Plan
- Pending implementation.

### Debug Log
- 2026-08-06: Story converted from spec note into executable BMAD story format by request.
- 2026-08-06: Added RED tests for document visibility integration, cloud parser/push, and RTDB rules coverage.
- 2026-08-06: Implemented cloud model/provider/hook support for `documentVisibilityMap`.
- 2026-08-06: Implemented owner-only document visibility toggle, owner hidden-status indicator, and non-owner filtering in Documents screen.
- 2026-08-06: Added/updated RTDB production and test rules for owner-only `documentVisibilityMap` writes.
- 2026-08-06: Validation runs executed:
  - `npm run test -- src/services/cloudSyncProvider.test.ts src/app/App.document-visibility.integration.test.tsx`
  - `npm run test -- src/app/App.place-visibility.integration.test.tsx src/app/App.game-lock.integration.test.tsx`
  - `npm run test` (398 passed, 65 skipped)
  - `npm run build` (success)

### Completion Notes
- Implemented owner-governed visibility state for important travel documents with backward-compatible default to visible when no explicit state exists.
- Added owner-only UI controls to hide/show documents and owner-visible hidden-status badges.
- Applied role-aware filtering so non-owners only see visible documents while owners always see all documents.
- Extended cloud sync snapshot parsing and outbound payloads to include `documentVisibilityMap`.
- Enforced owner-only document visibility writes in Firebase RTDB rules (prod/test rules + rule tests).
- Regression validation passed for document visibility, existing place visibility, and game lock behavior.

## File List
- `src/types/cloud.ts`
- `src/services/cloudSyncProvider.ts`
- `src/hooks/useCloudSync.ts`
- `src/app/App.tsx`
- `src/app/App.document-visibility.integration.test.tsx`
- `src/services/cloudSyncProvider.test.ts`
- `firebase/database.rules.prod.json`
- `firebase/database.rules.test.json`
- `firebase/firebase-rtdb.rules.test.ts`
- `guidelines/_bmad-output/implementation-artifacts/stories/26-3-visibilite-documents-et-modes-affichage-sejour.md`
- `guidelines/_bmad-output/implementation-artifacts/sprint-status.yaml`

## Change Log
- 2026-08-06: Created executable story artifact for 26.3 with AC-mapped implementation tasks.
- 2026-08-06: Implemented owner-controlled document visibility end-to-end (cloud model, app filtering/toggles, RTDB rules, and tests); story moved to review.
