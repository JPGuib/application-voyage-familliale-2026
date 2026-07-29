---
baseline_commit: bb79ebaec527a35901ed7e6cf4fadbcd8d24896c
---

# Story 18.1: Re-lock The App As Owner

Status: done

## Story

As an owner,
I want to re-lock the app at any time,
so that all family profiles are restricted to Checklist again until the next successful unlock.

## Acceptance Criteria

1. From Settings, the owner can trigger re-lock after entering the correct owner code.
2. After re-lock, all family profiles (including owner for this story) can only access Checklist (and Settings), on all devices.
3. Any profile currently on another screen when re-lock is triggered is auto-redirected to Checklist without manual refresh.
4. Wrong code during re-lock shows an error; no permanent attempt cap is introduced in this story.
5. From the re-locked state, entering the correct owner code unlocks normally (full lock-unlock cycle works).
6. No extra confirmation dialog appears before re-lock is applied.

## Tasks / Subtasks

- [x] Implement owner re-lock action in Settings (AC: 1, 6)
  - [x] Add a dedicated UI action under owner settings.
  - [x] Reuse existing owner-code prompt/verification pattern.
- [x] Apply family-wide phase update to before (AC: 2, 3, 5)
  - [x] On success, write phase="before" through existing cloud snapshot write path.
  - [x] Keep local state in sync with cloud write flow.
- [x] Enforce access-control changes for owner during before phase (AC: 2)
  - [x] Owner must be restricted to Checklist/Settings in before phase for 18.1 scope.
  - [x] Keep owner-code-actions access restricted to owner role.
- [x] Preserve unlock flow and error handling invariants (AC: 4, 5)
  - [x] Keep current code verification and lockout behavior coherent with existing UX.
- [x] Extend tests (unit + integration + cloud sync) (AC: 1-6)
  - [x] Update obsolete owner-before access tests.
  - [x] Add lock propagation and redirect coverage.

## Developer Context Section

### Epic Context And Business Value

Epic 18 addresses owner access and profile management quality gaps. Story 18.1 is P0 because it restores owner control over the global lock state and prevents uncontrolled access after initial unlock.

### Story Foundation (From Source Spec)

- Re-lock is owner-initiated and immediate after valid code.
- Scope is family-wide lock state, not profile-local state.
- In this story, owner is intentionally restricted like other users while locked.
- Owner privileged access while locked is explicitly deferred to Story 18.2.

### Input Discovery Result

- No PRD/Epics/Architecture/UX files were found in configured planning artifacts folder guidelines/_bmad-output/planning-artifacts using the create-story input patterns.
- Source story context was resolved from docs/specs-stories/epic-18/18.1-reverrouillage.md and backlog summary docs.

## Technical Requirements

- Use existing owner code verification utility; do not introduce a second verification mechanism.
- Keep phase values limited to before or during.
- Re-lock must write through existing cloud write orchestration to keep multi-device consistency.
- Re-lock operation must be idempotent when already locked.
- Maintain current denied-access message behavior and safe-screen fallback behavior.

## Architecture Compliance

### Existing Components To Reuse

- src/app/owner-code.ts
  - Current state: central hash/verify logic with sha256 prefix validation.
  - Story change: reuse verifyOwnerCode in lock flow.
  - Preserve: no plaintext code storage, no alternate hash format.

- src/services/cloudSyncProvider.ts
  - Current state: pushCloudSnapshot writes family-wide phase when owner can write family state.
  - Story change: write phase=before on successful re-lock.
  - Preserve: owner-only family-state writes, profile-scoped checklist/game isolation.

- src/hooks/useCloudSync.ts
  - Current state: wraps push snapshot and offline queue behavior.
  - Story change: no contract change; lock write must use existing pushSnapshot path.
  - Preserve: queue-on-offline behavior and cloud error handling strategy.

- src/app/access-control.ts
  - Current state: owner has full access in both phases.
  - Story change: for 18.1, owner in before must align with locked visibility (Checklist/Settings only).
  - Preserve: during-phase access matrix and owner-code-actions restrictions.

- src/app/App.tsx
  - Current state: unlock flow exists (start prompt + confirmStartJourney), navigation guard uses canAccessScreen and getSafeScreen.
  - Story change: add mirrored lock action/handler and trigger phase transition to before.
  - Preserve: existing unlock flow, profile switch reset behavior, cloud hydration behavior, no white-screen transitions.

## Library And Framework Requirements

- React + TypeScript app conventions already in place; follow existing component/state patterns.
- Firebase Realtime Database modular API usage is already established.
- Use update/onValue flow already used by cloudSyncProvider and avoid introducing alternate data channels.

## File Structure Requirements

Primary UPDATE targets:

- src/app/App.tsx
- src/app/access-control.ts
- src/app/access-control.test.ts
- src/app/App.access-control.integration.test.tsx
- src/services/cloudSyncProvider.test.ts

Potentially verify-only (no API changes expected):

- src/services/cloudSyncProvider.ts
- src/hooks/useCloudSync.ts
- firebase/database.rules.test.json
- firebase/database.rules.prod.json

## Testing Requirements

Unit:

- Update owner-before expectations in src/app/access-control.test.ts.
- Add explicit assertion: owner cannot access dashboard/guide/game/tips/results when phase=before.

Integration:

- Update src/app/App.access-control.integration.test.tsx where owner-before currently expects full travel access.
- Add scenario: owner triggers re-lock from unlocked state, then owner and user are constrained to Checklist.
- Add scenario: active non-checklist screen is redirected on phase change to before.
- Add scenario: wrong code does not change phase.

Cloud Sync:

- Extend src/services/cloudSyncProvider.test.ts to validate phase=before write path on owner mutation.
- Verify non-owner cannot mutate family-wide phase through existing ownership sanitization.

E2E intent:

- Unlock -> lock -> unlock cycle across profiles/devices with no manual refresh and no white-screen.

## Regression Guardrails

- Do not break existing unlock CTA behavior on Checklist.
- Do not break owner code recovery flow.
- Do not alter profile-specific checklist/game isolation.
- Do not introduce new localStorage-only phase source; cloud remains source of truth in cloud mode.
- Keep re-lock action free of extra confirmation modal for this story.

## Git Intelligence Summary

Recent commits show App.tsx as the main hotspot for behavior fixes (refresh bugs), and a recent documentation batch added Epic 18 specs and sprint status updates. This indicates high regression risk in App.tsx state transitions and navigation guards; tests must be expanded before/with implementation.

## Latest Tech Information

Firebase docs updates (July 2026) confirm:

- update() multi-path writes are atomic at commit level.
- onValue() should be attached at the lowest relevant path and fires on initial load plus changes.
- Web RTDB offline behavior queues local writes in-session but does not guarantee persistence after page close.
- Security Rules must enforce write authorization and data validation server-side.

Practical implication for this story:

- Keep lock propagation on existing family path write/listener model.
- Preserve owner-only write checks in app logic and verify rules still enforce that at backend.

## Project Context Reference

- Source story: docs/specs-stories/epic-18/18.1-reverrouillage.md
- Backlog context: docs/backlog-epics-stories.md
- Access control logic: src/app/access-control.ts
- Owner code logic: src/app/owner-code.ts
- Cloud sync provider: src/services/cloudSyncProvider.ts
- Main flow orchestration: src/app/App.tsx

## Dev Agent Record

### Agent Model Used

GPT-5.4

### Debug Log References

- create-story activation resolver run completed for workflow block
- artifact exploration completed with code map and targeted reads
- dev-story activation completed; baseline commit captured and sprint status moved to in-progress

### Completion Notes List

- Added an owner-only re-lock action in Settings with the existing owner-code validation UX and no extra confirmation step.
- Routed re-lock and unlock phase changes through the cloud snapshot write path and added a pending-phase guard to avoid temporary cloud hydration stalls after local phase changes.
- Updated locked-phase owner access so owner is restricted to Checklist, Settings, and owner-code actions while phase is before.
- Extended regression coverage for owner-before access, re-lock success, wrong-code failure, remote redirect on lock, full lock-unlock cycle, and owner/non-owner family-phase writes.
- Validation passed with `npm test` and `npm run build`.

### File List

- guidelines/_bmad-output/implementation-artifacts/18-1-reverrouillage.md
- guidelines/_bmad-output/implementation-artifacts/sprint-status.yaml
- src/app/App.tsx
- src/app/access-control.ts
- src/app/access-control.test.ts
- src/app/App.access-control.integration.test.tsx
- src/services/cloudSyncProvider.test.ts

## Change Log

- 2026-07-19: Implemented owner re-lock flow, tightened owner locked-phase access, aligned lock/unlock cloud phase writes, and added regression coverage for phase propagation and full lock-unlock cycle.
