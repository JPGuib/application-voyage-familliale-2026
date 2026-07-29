---
baseline_commit: 647603980d5b192aa30cdcfb9fa72dc1313e6378
---

# Story 18.3: Delete Own Profile

Status: review

## Story

As a non-owner user,
I want to permanently delete my own profile and all data linked to it,
so that I can leave the family app without impacting other users.

## Acceptance Criteria

1. In Settings, a non-owner profile sees a destructive action "Delete my profile".
2. Owner profile never sees this action.
3. Clicking "Delete my profile" shows an explicit irreversible warning dialog.
4. If profile has a password, deletion requires confirmation by password OR existing recovery mechanism.
5. If profile has no password, warning confirmation alone is sufficient.
6. On success, delete profile, checklist, game history/results, and private custom checklist data tied to that profile.
7. No impact on other profiles, owner shared checklist catalog, family-wide phase, owner code/recovery, or other family-wide data.
8. After successful deletion, redirect to profile selection screen.
9. Wrong password/recovery answer cancels deletion and keeps all data intact.

## Tasks / Subtasks

- [x] Add Settings UI destructive flow for non-owner only (AC: 1, 2, 3)
  - [x] Add a visually distinct danger section/button in settings for `utilisateur` role only.
  - [x] Add explicit irreversible warning popup listing deleted data categories.
- [x] Implement secure confirmation branch (AC: 4, 5, 9)
  - [x] If `currentProfilePasswordHash` exists, require password or recovery answer verification.
  - [x] Reuse existing verification primitives (`verifyProfilePassword`, `hashOwnerRecoveryPhrase`, existing generic auth error style).
  - [x] If no password hash exists, allow warning-confirm-only path.
- [x] Implement atomic profile deletion (AC: 6, 7)
  - [x] Remove profile from family state and enforce owner invariants.
  - [x] Delete profile-scoped cloud nodes in one multi-location `update()` using `null` values.
  - [x] Delete matching local in-memory/localStorage profile-scoped records.
  - [x] Keep all family-wide and owner-shared records untouched.
- [x] Session and navigation cleanup (AC: 8)
  - [x] If deleted profile is active, clear active profile/session token and route to profile selection.
  - [x] Ensure the app does not keep running with a missing active profile.
- [x] Multi-device consistency and hydration safety (AC: 8, edge case)
  - [x] On snapshot updates, if active profile no longer exists, fail closed to login/profile selection.
- [x] Tests (unit/integration/e2e style) (AC: all)
  - [x] Add integration tests for success path with password, success path without password, and owner invisibility.
  - [x] Add negative tests for wrong credentials and no-deletion side effects.
  - [x] Add cloud provider tests for atomic multi-path delete payload.
  - [x] Add regression tests ensuring other profiles and family-wide phase remain unchanged.

## Dev Notes

### Story Foundation

- Source story defines permanent deletion for non-owner only and strict no-impact on other users.
- Recovery mechanism behavior is reused, not redesigned in this story.
- UX requires explicit irreversible warning and destructive styling.

### Epic Context (Story 18 dependencies)

- Story 18.1 and 18.2 established family-wide lock state and owner-specific privileges.
- This story must preserve those invariants:
  - owner remains non-deletable,
  - family-wide lock/unlock data remains intact,
  - non-owner behavior remains constrained.

### Previous Story Intelligence (18.2)

- Owner-only gates are already enforced via role checks and policy helpers.
- Settings screen already carries privileged actions and profile-security actions.
- Reuse existing settings and auth UX patterns instead of creating parallel flows.

### Git Intelligence Summary

Recent commits indicate active work in Epic 18 and refresh/login stability. Keep implementation conservative:
- avoid broad navigation refactors,
- avoid changing global phase semantics,
- prefer focused changes in settings/auth/profile-state handling.

## Developer Context Section

### Current State: Critical UPDATE Files Read

- `src/app/App.tsx`
  - Owns login/profile selection, settings actions, profile password/recovery verification flows, session token handling, and route fallback behavior.
  - Holds profile-scoped stores in memory and syncs with cloud snapshots.
  - Already contains role-gated settings behavior and destructive action pattern (`window.confirm`) for password removal.
- `src/hooks/useCloudSync.ts`
  - Provides `pushSnapshot` and role-claim operations; queues offline writes.
  - No dedicated profile-deletion API yet.
- `src/services/cloudSyncProvider.ts`
  - Implements RTDB `update()` write model and profile/family parsing.
  - Already supports multi-path updates; ideal place for a delete helper.
- `src/types/cloud.ts`
  - Defines cloud snapshot and payload contracts that must remain consistent.
- `firebase/database.rules.prod.json`
  - Confirms writes are path-constrained and role-gated by membership/owner checks.
- `src/app/App.login-flow.integration.test.tsx`
  - Existing tests already cover password/recovery UX patterns and are the right place to add profile deletion scenarios.
- `src/services/cloudSyncProvider.test.ts`
  - Existing tests already validate profile isolation and write payload behavior.

### What This Story Changes

- Adds a non-owner-only profile deletion flow in Settings.
- Adds secure confirmation path based on existing password/recovery primitives.
- Adds profile-scoped data deletion in cloud and local state.
- Adds missing-profile fail-closed guard in active session hydration/navigation.

### What Must Be Preserved

- Owner profile must never be deletable.
- Family-wide data (`phase`, owner code, owner recovery, owner shared checklist catalog) must remain unchanged.
- Other profiles' checklist/game/history/password/recovery must remain unchanged.
- Existing login and recovery generic error messaging behavior must stay consistent.
- Existing owner-only lock/unlock and access-control behavior from 18.1/18.2 must not regress.

## Technical Requirements

- Use current stack and libraries only (React 18.3.1 + Firebase JS SDK v12).
- Do not introduce new dependencies.
- Deletion operation for cloud must be atomic and multi-path.
- Keep updates immutable in React state transitions.
- Keep auth failures fail-closed with generic error messaging where already established.

## Architecture Compliance

- Cloud remains source of truth for shared/profile-scoped business state.
- Local storage is session/cache support only in cloud-authoritative mode.
- Family-wide phase remains at `families/{familyId}/phase`; do not reintroduce profile-scoped phase writes.
- Profile deletion must update both:
  - `familyState.profiles` and owner uniqueness constraints,
  - profile-scoped cloud branches for the deleted profile.

## Library and Framework Requirements

- React: keep state updates immutable (`setX(prev => next)` patterns where needed).
- Firebase RTDB:
  - Use one `update(ref(...), updates)` payload for multi-location deletion.
  - Use `null` values in updates map to delete child paths.
- Testing: use Vitest + Testing Library patterns already present.

## File Structure Requirements

Expected UPDATE targets (minimum):
- `src/app/App.tsx`
- `src/hooks/useCloudSync.ts` (if adding dedicated deletion method)
- `src/services/cloudSyncProvider.ts`
- `src/types/cloud.ts` (only if contract extension is needed)
- `src/app/App.login-flow.integration.test.tsx`
- `src/services/cloudSyncProvider.test.ts`
- `src/services/firebase-rtdb.rules.test.ts` (if rule-level scenario coverage is expanded)

Potential NEW file (optional, if cleaner):
- `src/app/profile-deletion.ts` for pure helpers (targeted guard/plan computation), with corresponding unit test.

## Data Deletion Contract (Must Implement)

For target `profileIdToDelete` (non-owner only), delete only profile-scoped branches:

- `profiles/{profileIdToDelete}` => `null`
- `checklists/{profileIdToDelete}` => `null`
- `gameResults/{profileIdToDelete}` => `null`

And update family structure safely:
- Remove this profile from `familyState.profiles` and write normalized roles.
- Keep `ownerProfileId` unchanged.
- Keep `ownerUid`, `phase`, `ownerCodeHash`, `checklistCatalogAdditions`, `checklistCatalogRemovals`, and other profile branches untouched.

Local state cleanup must remove entries for deleted profile from:
- `profilePasswordHashes`
- `profileRecoveryHashes`
- `profileRecoveryQuestions`
- `customChecklistItemsByProfile`
- any active checklist/history view bound to deleted profile session

## Testing Requirements

- Unit/pure tests
  - optional helper for deletion plan and profile eligibility.
- Integration tests (`App.login-flow.integration.test.tsx`)
  - non-owner sees delete action; owner does not.
  - no-password flow succeeds and redirects to login/profile selection.
  - password-protected flow: wrong credential blocks deletion; correct credential deletes.
  - deletion does not alter sibling profile data.
- Cloud provider tests (`cloudSyncProvider.test.ts`)
  - verify one atomic `update` payload contains exact null-delete paths for target profile and no unrelated null paths.
- Regression checks
  - lock/access behavior unaffected.
  - active missing profile fails closed to selection screen.

## Latest Tech Information

Validated references:
- Firebase RTDB docs: `update()` supports multi-location atomic updates; setting a child path to `null` deletes it.
- React docs (`useState`): preserve immutable updates and avoid mutating existing objects/arrays.

No framework migration is required for this story.

## Project Context Reference

No `project-context.md` file was discovered from configured persistent facts glob. Context was derived from:
- `docs/specs-stories/epic-18/18.3-suppression-profil.md`
- `docs/specs-stories/epic-18/18.2-acces-proprietaire.md`
- `docs/specs-stories/epic-18/18.1-reverrouillage.md`
- `docs/specs-stories/epic-12/12.3-categories-personnalisees.md`
- `guidelines/_bmad-output/planning-artifacts/adr-11-3-source-of-truth-cloud-local.md`
- `guidelines/_bmad-output/planning-artifacts/adr-11-6-deblocage-famille-wide-contract.md`

## References

- `docs/specs-stories/epic-18/18.3-suppression-profil.md`
- `docs/specs-stories/epic-18/18.2-acces-proprietaire.md`
- `docs/specs-stories/epic-18/18.1-reverrouillage.md`
- `docs/specs-stories/epic-12/12.3-categories-personnalisees.md`
- `src/app/App.tsx`
- `src/hooks/useCloudSync.ts`
- `src/services/cloudSyncProvider.ts`
- `src/services/cloudSyncProvider.test.ts`
- `src/services/firebase-rtdb.rules.test.ts`
- `firebase/database.rules.prod.json`
- `src/types/cloud.ts`
- `package.json`
- Firebase docs: https://firebase.google.com/docs/database/web/read-and-write
- React docs: https://react.dev/reference/react/useState

## Story Completion Status

- Story status set to `ready-for-dev`.
- Completion note: Ultimate context engine analysis completed - comprehensive developer guide created.

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6

### Debug Log References

- No blockers. All tasks implemented in a single session.

### Completion Notes List

- `deleteProfileFromCloud` added to `cloudSyncProvider.ts`: atomic Firebase RTDB `update()` nulling `profiles/{id}`, `checklists/{id}`, `gameResults/{id}` plus `updatedAt`.
- `deleteProfile` callback added to `useCloudSync.ts` hook and exposed in hook return.
- `deleteOwnProfile` handler added to `App.tsx`: guards owner role, verifies by password or recovery answer when hash present, executes cloud deletion, cleans up local profile-scoped state, calls `resetForProfileSwitch()`.
- `SettingsScreen` updated: new `onDeleteOwnProfile` prop, "Zone dangereuse" section (utilisateur only), irreversible warning dialog with conditional credential step.
- Hydration guard added in cloud snapshot effect: if active profile is no longer in cloud snapshot (deleted from another device) and was previously hydrated, redirects to profile selection.
- 10 new tests added (4 cloud provider unit tests + 6 integration tests). All 170 tests pass.
- Owner profile never sees the delete action (AC 2 enforced in SettingsScreen via `profile.role === "utilisateur"` guard).
- Firebase RTDB rules analysis confirmed all written paths (`profiles/$id`, `checklists/$id`, `gameResults/$id`, `ownerProfileId`, `updatedAt`) are writable by any authenticated family member.

### File List

- `guidelines/_bmad-output/implementation-artifacts/18-3-suppression-profil.md`
- `src/services/cloudSyncProvider.ts`
- `src/hooks/useCloudSync.ts`
- `src/app/App.tsx`
- `src/services/cloudSyncProvider.test.ts`
- `src/app/App.login-flow.integration.test.tsx`

## Change Log

- 2026-07-19: Story 18.3 implemented — profile deletion for non-owner users with secure confirmation, atomic cloud deletion, local state cleanup, multi-device hydration guard, and comprehensive tests.
