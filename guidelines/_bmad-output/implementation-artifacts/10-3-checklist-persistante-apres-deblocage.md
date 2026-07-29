---
baseline_commit: 92e138852259f8a5f8cf2697e27562a52921a704
---

# Story 10.3: Checklist persistante apres deblocage

Status: done

## Story

As a family profile user,
I want to keep consulting and updating the checklist after unlock,
so that checklist tracking remains useful before departure and during travel.

## Acceptance Criteria

1. Given the app is in phase `before`, when a profile opens checklist, then checklist is visible and editable.
2. Given the app is in phase `during`, when a profile opens checklist, then checklist is visible and editable.
3. Given any checklist item is toggled in either phase, when state is persisted/synced, then item state remains consistent after refresh/profile re-login on same profile.
4. Given phase transitions to `during`, when current screen is `checklist`, then app preserves valid navigation and does not block checklist access.
5. Given unlock has already happened, when user is on checklist in `during`, then owner unlock prompts/actions are not exposed.
6. Given existing access-control rules from story 10.1, when this story is implemented, then no regression is introduced on role-based restrictions.
7. Given a profile is on dashboard in phase `during`, when they open quick actions, then a dedicated `Checklist` entry is visible and opens checklist.
8. Given app phase is already `during`, when user changes profile and logs in again, then landing screen is dashboard (Accueil) and not checklist.

## Tasks / Subtasks

- [x] Task 1 - Validate and finalize checklist behavior in both phases (AC: 1, 2, 4, 5)
  - [x] Confirm checklist render path in `before` and `during` uses same source state (`checked`, `openCategories`) in `src/app/App.tsx`.
  - [x] Keep checklist reachable via navigation in `during` without reopening unlock flow.
  - [x] Ensure unlock CTA behavior is no-op in `during` (already scaffolded) and texts remain coherent.

- [x] Task 4 - Add persistent checklist entry from dashboard (AC: 7)
  - [x] Add a dedicated quick action tile `Checklist` on home screen.
  - [x] Ensure quick action is guarded by existing access-control and opens checklist directly.

- [x] Task 5 - Align post-login landing after profile switch in unlocked phase (AC: 8)
  - [x] When reconnecting to a profile while phase is `during`, force landing screen to dashboard.
  - [x] Preserve current `before` behavior and access-control guards.

- [x] Task 2 - Ensure persistence and cloud sync invariants are preserved (AC: 3)
  - [x] Keep `checked` profile-scoped in cloud payload (`checklists/{profileId}`) and local fallback keys unchanged.
  - [x] Verify no phase write/read change is introduced by this story (family-wide phase remains authoritative contract).

- [x] Task 3 - Add non-regression tests (AC: 1, 2, 3, 5, 6)
  - [x] Extend `src/app/App.access-control.integration.test.tsx` with a test asserting checklist remains accessible after unlock in `during`.
  - [x] Add/extend tests validating no unlock modal/actions are triggered in `during` checklist path.
  - [x] Run targeted tests for access-control and cloud sync contract.

## Dev Notes

### Story Foundation

- Epic context: Epic 10 focuses on profile-level security and checklist behavior refinements.
- Story value: remove functional friction by allowing checklist usage after journey unlock.
- Out of scope: profile-based checklist filtering (story 10.4), checklist content enrichment (story 10.5).

### Current State (Files Read)

- `src/app/App.tsx`
  - `ChecklistScreen` always renders checklist content from `checked` state and category definitions.
  - In `during` switch branch, checklist is already renderable with unlock callbacks intentionally no-op.
  - Access gating uses `canAccessScreen` and `getSafeScreen`; checklist is currently allowed in both phases for owner/user.
  - Bottom nav is hidden on checklist unless dashboard is accessible, which is expected for restricted users.

- `src/app/access-control.ts`
  - `USER_BEFORE_ALLOWED = ["checklist", "settings"]`.
  - `USER_AFTER_ALLOWED` includes `checklist` plus travel sections.
  - Owner has full section access including checklist.

- `src/services/cloudSyncProvider.ts`
  - Checklist remains profile-scoped in cloud (`checklists/{profileId}`).
  - Family-wide `phase` is authoritative (`families/{familyId}/phase`), with legacy read fallback in parser.

- `src/hooks/useCloudSync.ts`
  - Snapshot push/observe behavior and offline queueing already in place; story 10.3 must not alter this contract.

### What This Story Changes

- Stabilize and test the behavior so checklist is intentionally first-class in `during` (consult + edit), not only in `before`.
- Ensure UX copy/CTA logic does not suggest unlocking when already in `during`.
- Confirm no accidental redirect/regression from existing navigation guards.

### What Must Be Preserved

- Role-based access rules introduced in story 10.1.
- Profile-scoped checklist isolation.
- Family-wide phase semantics and cloud hydration/push guardrails.
- Existing unlock security flow for `before` phase only.

### Architecture Compliance

- Keep source-of-truth split from ADR 11.6:
  - Family-wide: `phase`.
  - Profile-scoped: `checklist`, `gameResults`, profile metadata.
- Do not reintroduce profile-scoped phase writes.
- Avoid adding new storage keys unless required by AC.

### Library / Framework Requirements

- React + TypeScript patterns already used in `src/app/App.tsx` must be followed.
- Firebase Realtime Database integration must continue using current modular API and existing provider hooks.
- No new dependency is required for this story.

### File Structure Requirements

- Primary updates: `src/app/App.tsx`, `src/app/App.access-control.integration.test.tsx`.
- Possible test support updates: `src/app/access-control.test.ts` (only if needed by behavior assertions).
- Do not create `screens/ChecklistScreen.tsx`; checklist is currently inline in `App.tsx` and should remain consistent with current architecture.

### Testing Requirements

- Minimum run:
  - `npm run test -- src/app/App.access-control.integration.test.tsx src/app/access-control.test.ts src/services/cloudSyncProvider.test.ts`
- Assertions to include:
  - Checklist available/editable in `before` and `during`.
  - No unlock prompt/action in `during` checklist.
  - No regression for user restrictions in `before`.

### Previous Story Intelligence (10.2)

From recent commits (`92e1388`, `3a4493f`):
- Story 10.2 introduced profile password and recovery hash fields in cloud contract (`src/types/cloud.ts`, `src/services/cloudSyncProvider.ts`, `src/hooks/useCloudSync.ts`).
- Story 10.1 introduced explicit access-control module and integration tests.
- Practical implication: do not couple 10.3 changes to password/recovery flows; focus on checklist visibility/persistence only.

### Git Intelligence Summary

Recent commit signals:
- `EPIC 10.2 DONE` touched app + cloud provider + cloud types + tests.
- `Story 10.1` touched access-control core and integration tests.
- Pattern to continue: behavior change accompanied by integration test and sprint status update.

### Latest Tech Information

- React guidance (state preservation/reset): preserve component identity/position to avoid accidental state resets in navigation transitions.
- Firebase RTDB guidance: keep listeners scoped to needed paths; use `update()` for partial atomic updates; be aware web offline writes are session-bound.
- This story aligns with current stack; no mandatory library upgrade required.

### Project Context Reference

- Persistent fact lookup (`**/project-context.md`) returned no file in this workspace.
- Story context therefore relies on backlog/architecture artifacts and live codebase analysis.

### References

- `BACKLOG.md` (Story 10.3 scope and acceptance)
- `docs/backlog-epics-stories.md` (Epic 10 priorities and dependencies)
- `src/app/App.tsx`
- `src/app/access-control.ts`
- `src/app/App.access-control.integration.test.tsx`
- `src/services/cloudSyncProvider.ts`
- `src/hooks/useCloudSync.ts`
- `src/types/cloud.ts`
- `guidelines/_bmad-output/planning-artifacts/adr-11-6-deblocage-famille-wide-contract.md`
- `guidelines/_bmad-output/planning-artifacts/architecture-review-epic-11-pre-11-6-2026-07-15.md`

## Story Completion Status

- Story status set to `done`.
- Completion note: implementation complete and validated by automated tests plus manual QA.

## Dev Agent Record

### Agent Model Used

GPT-5.3-Codex

### Debug Log References

- Activation workflow resolved via `_bmad/scripts/resolve_customization.py`.
- Source analysis completed across backlog, architecture artifacts, git history, and implementation code.
- RED phase confirmed by failing tests in `src/app/App.access-control.integration.test.tsx` before implementation.
- GREEN phase validated with `npm run test -- src/app/App.access-control.integration.test.tsx`.
- Story validation run completed with `npm run test -- src/app/App.access-control.integration.test.tsx src/app/access-control.test.ts src/services/cloudSyncProvider.test.ts`.
- Full regression suite passed with `npm run test`.

### Implementation Plan

- Keep checklist as first-class screen in `during` by removing the forced redirect from checklist to dashboard.
- Preserve existing access control contracts (`canAccessScreen` / `getSafeScreen`) and only adjust checklist UX behavior.
- Hide unlock CTA/actions in `during` while preserving checklist consult/edit interactions.
- Extend integration tests to lock behavior for phase transition and unlock-action absence.

### Completion Notes List

- Story key resolved from sprint status: `10-3-checklist-persistante-apres-deblocage`.
- Previous story markdown artifact for epic 10 not present in implementation folder; git history used as continuity source.
- Removed automatic checklist -> dashboard redirect when phase is `during`.
- Added checklist UI mode without unlock CTA in `during` while keeping editability.
- Extended integration coverage for checklist persistence after phase transition and hidden unlock actions.
- Confirmed no cloud contract regression (`checklists/{profileId}` profile scope and family-wide `phase` contract unchanged).
- All targeted and full regression tests passed.
- 2026-07-17 (reopen): added dashboard quick action for checklist and post-login landing on dashboard when phase is already `during`.
- 2026-07-17: manual tests validated by PO; story closed to done.

### File List

- guidelines/_bmad-output/implementation-artifacts/10-3-checklist-persistante-apres-deblocage.md
- guidelines/_bmad-output/implementation-artifacts/sprint-status.yaml
- src/app/App.tsx
- src/app/App.access-control.integration.test.tsx
- src/app/App.login-flow.integration.test.tsx

### Change Log

- 2026-07-17: Story 10.3 implemented and validated.
- 2026-07-17: Checklist remains accessible after transition to `during` and unlock prompts/actions are not exposed in `during`.
- 2026-07-17: Added non-regression integration tests and updated existing assertions for checklist-first post-unlock flow.
- 2026-07-17: Story 10.3 reopened to include persistent checklist entry from home and post-switch landing fix in unlocked phase.
- 2026-07-17: Story 10.3 marked done after successful manual validation.