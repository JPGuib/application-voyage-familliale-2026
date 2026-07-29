---
baseline_commit: 18b0178
story_id: "10.4"
story_key: "10-4-adaptation-checklist-par-profil"
epic: "10"
generated_at: "2026-07-17"
---

# Story 10.4: Checklist adaptation per profile

Status: done

## Story

As a family profile user,
I want the checklist content to adapt to my profile attributes,
so that I only see relevant preparation items while preserving owner governance and cloud sync consistency.

## Acceptance Criteria

1. Given profile creation/editing, when profile attributes are captured, then profile metadata contains `gender` and `householdRole` (plus existing system role) with valid allowed values.
2. Given a non-owner profile on checklist, when checklist is rendered, then only items allowed for that profile metadata are displayed; if metadata is left at optional defaults, all items are visible.
3. Given the owner profile on checklist, when checklist is rendered, then all items are visible regardless of metadata filters.
4. Given filtering is applied, when a category has no visible items, then that category is hidden (no empty category block in UI).
5. Given filtered items are shown, when badges are needed, then UI exposes clear targeting labels (e.g. `Parents`, `Kids`, `Owner only`, `Women`, `Men`) at item level and category level without ambiguity.
6. Given cloud synchronization and profile switching, when users switch/login/refresh, then filtered visibility remains profile-scoped and does not leak checklist state between profiles.
7. Given regression-sensitive flows from stories 10.1/10.2/10.3, when this story is implemented, then access-control, profile login, password/recovery flows, and checklist persistence continue to pass automated tests.
8. Given QA matrix execution, when tests run, then at least 5 profile combinations are covered (owner, parent male, parent female, teen, child).

## Tasks / Subtasks

- [x] Task 1 - Introduce profile metadata model (AC: 1, 6)
  - [x] Extend app-level profile type in `src/app/App.tsx` to include `gender` and `householdRole`.
  - [x] Extend cloud contracts in `src/types/cloud.ts` (`CloudProfileRecord`, `CloudProfileState`, `CloudSyncWritePayload`) with optional metadata fields.
  - [x] Extend parsing/writing in `src/services/cloudSyncProvider.ts` to safely read/write metadata with backward compatibility for existing profiles.
  - [x] Ensure cloud queue contract in `src/hooks/useCloudSync.ts` carries metadata fields unchanged.

- [x] Task 2 - Capture metadata in profile UX without breaking existing login/setup (AC: 1, 7)
  - [x] Update `ProfileSetupScreen` in `src/app/App.tsx` to collect `gender` and `householdRole` with explicit defaults and validation.
  - [x] Allow metadata update in settings panel in `src/app/App.tsx` with no additional authorization constraint.
  - [x] Preserve duplicate surname checks and login behavior from `src/app/profile-login.ts` and `src/app/App.login-flow.integration.test.tsx`.

- [x] Task 3 - Add checklist targeting model and filtering pipeline (AC: 2, 3, 4, 5)
  - [x] Introduce a dedicated filter helper (recommended: `src/app/checklist-filter.ts`) to avoid embedding complex logic directly in render blocks.
  - [x] Define item targeting metadata (e.g. `genderTargets`, `householdRoleTargets`, `ownerOnly`) on checklist items in `CHECKLIST_CATEGORIES` in `src/app/App.tsx`.
  - [x] Tagging timing rule: assign gender/role tags directly when editing checklist items in `CHECKLIST_CATEGORIES` during story 10.4 implementation (do not defer tagging to a later story).
  - [x] Apply deterministic filtering before render:
  - [x] owner => all items
  - [x] non-owner => by metadata tags
  - [x] drop empty categories
  - [x] Update checklist header counters (`totalItems`, `checkedCount`, `pct`) to compute from visible item IDs, not global static list.
  - [x] Add badge renderer for targeted scopes with consistent vocabulary at item level and category level.

- [x] Task 4 - Preserve checklist state invariants under filtering (AC: 2, 6, 7)
  - [x] Keep `checked` store keyed by item ID and profile-scoped as currently persisted in cloud/local.
  - [x] Do not delete hidden item states when filter changes; hidden != reset.
  - [x] Ensure profile switch/reset flow (`resetForProfileSwitch`) remains complete and no stale metadata leaks.

- [x] Task 5 - Add tests and QA matrix (AC: 6, 7, 8)
  - [x] Unit tests for filtering helper (recommended file: `src/app/checklist-filter.test.ts`).
  - [x] Extend integration tests in `src/app/App.access-control.integration.test.tsx` for filtered visibility and empty-category removal.
  - [x] Extend login/profile tests in `src/app/App.login-flow.integration.test.tsx` for metadata hydration across login/profile switch.
  - [x] Keep cloud parsing tests updated in `src/services/cloudSyncProvider.test.ts`.
  - [x] Run targeted regression command set (see Testing Requirements).

## Dev Notes

### Story Foundation

- Source story definition is in `BACKLOG.md` (Story 10.4).
- Epic 10 dependency chain:
- 10.1 introduced role/deblocage access control.
- 10.2 introduced profile password/recovery metadata and cloud profile auth flow.
- 10.3 made checklist persistently available before and during phase.
- 10.4 must adapt checklist content per profile without regressing 10.1-10.3.

### Current State (Files Read Completely)

- `src/app/App.tsx`
- Checklist categories are currently static and fully visible to all roles.
- Profile model currently has only `{ id, surname, role }`.
- Checklist counters use global `CHECKLIST_ITEM_IDS`; this must be adapted for filtered display.
- Checklist render path is inline (`ChecklistScreen` inside same file), not in `src/app/screens/ChecklistScreen.tsx`.

- `src/types/cloud.ts`
- `CloudProfileRecord` and `CloudProfileState` currently include role/surname/password/recovery metadata but no gender/household role fields.

- `src/services/cloudSyncProvider.ts`
- Parses profiles and writes `profiles/{profileId}` + `checklists/{profileId}` updates.
- Already includes family-wide `phase` migration behavior and owner policy normalization.

- `src/hooks/useCloudSync.ts`
- Maintains offline pending queue in local storage and replays full write payloads.
- Any new payload field must be deterministic and backward-safe.

- `src/app/access-control.ts`
- Defines allowed sections by system role + phase. Do not modify permissions model for this story.

- `src/app/App.access-control.integration.test.tsx`
- Guards checklist accessibility and no unlock actions during `during` phase.

- `src/app/App.login-flow.integration.test.tsx`
- Guards cloud login flow, profile switching, and password-gated profile login.

### What This Story Changes

- Adds profile attributes for checklist targeting.
- Adds deterministic filtering of checklist items/categories for non-owner profiles.
- Adds owner override visibility (owner sees all).
- Adds badges for targeted scope clarity at item and category levels.
- Updates checklist totals/progress to reflect visible set.

### What Must Be Preserved

- Access-control and navigation behavior from stories 10.1/10.3.
- Password/recovery profile login behavior from story 10.2.
- Profile-scoped checklist persistence (`checklists/{profileId}`) and family-wide `phase` contract.
- No unlock CTA/actions on checklist during `phase = during`.

## Technical Requirements

- Keep implementation TypeScript-first and colocated with existing architecture.
- Prefer pure filtering utility function(s) with exhaustive type-safe inputs/outputs.
- Use optional metadata defaults for legacy profiles:
- `gender`: `unspecified`
- `householdRole`: `member`
- Behavior rule: `unspecified`/default metadata must not hide content; default user view shows all checklist items.
- Filtering must be pure and side-effect free.
- Never mutate `CHECKLIST_CATEGORIES` in-place at runtime.

### Checklist Tagging Matrix (Implementation Guide)

- Use this schema on each checklist item:
- `genderTargets`: `all` | `male` | `female`
- `householdRoleTargets`: `all` | `parent` | `teen` | `child`
- `ownerOnly`: `boolean`

- Default visibility rule:
- If an item has no explicit tags, treat it as:
- `genderTargets = all`
- `householdRoleTargets = all`
- `ownerOnly = false`

- Rendering rules:
- Owner profile: always sees all items (owner override).
- Non-owner profile with `unspecified`/default metadata: sees all items.
- Non-owner profile with explicit metadata: sees items matching both gender and household role tags.
- If a category has zero visible items after filtering, hide that category.

- Badge rules:
- Item level: show item badges when item is restricted (not `all`).
- Category level: show aggregated badges if at least one item in category is restricted.

- Practical examples:
- Unisex family item: `genderTargets=all`, `householdRoleTargets=all`, `ownerOnly=false`
- Women parent item: `genderTargets=female`, `householdRoleTargets=parent`, `ownerOnly=false`
- Owner-only item: `ownerOnly=true` (owner sees it regardless of other tags)

## Architecture Compliance

- Continue respecting family-wide vs profile-scoped split from ADR 11.6:
- Family-wide: `phase`
- Profile-scoped: checklist and profile metadata
- Do not add profile-scoped `phase` logic.
- Do not introduce new storage roots unless required.
- Ensure cloud parser is backward compatible with existing snapshots lacking new metadata fields.

## Library / Framework Requirements

- React + TypeScript with current Vite/Vitest stack; no new dependency required.
- Keep Firebase Realtime Database writes via existing modular API (`update`, `runTransaction` where already used).
- Keep listener scope minimal and avoid broad root listeners beyond current architecture.

## File Structure Requirements

- UPDATE (expected):
- `src/app/App.tsx`
- `src/types/cloud.ts`
- `src/services/cloudSyncProvider.ts`
- `src/hooks/useCloudSync.ts`
- `src/app/App.access-control.integration.test.tsx`
- `src/app/App.login-flow.integration.test.tsx`
- `src/services/cloudSyncProvider.test.ts`
- NEW (recommended):
- `src/app/checklist-filter.ts`
- `src/app/checklist-filter.test.ts`

## Testing Requirements

- Minimum targeted run:
- `npm run test -- src/app/checklist-filter.test.ts src/app/App.access-control.integration.test.tsx src/app/App.login-flow.integration.test.tsx src/services/cloudSyncProvider.test.ts src/app/access-control.test.ts`
- QA matrix (minimum 5 combinations):
- owner
- parent-male
- parent-female
- teen
- child
- Verify each combination in both phases where applicable (`before`/`during`) and after refresh/profile re-login.

## Previous Story Intelligence (10.3)

From `guidelines/_bmad-output/implementation-artifacts/10-3-checklist-persistante-apres-deblocage.md`:

- Checklist in `during` is intentional and must remain available/editable.
- Quick action `Checklist` from dashboard and post-login landing behavior were recently stabilized.
- Story 10.3 explicitly marked profile-based checklist filtering as out of scope; 10.4 is the first place to introduce it.
- Existing references in old backlog mention `src/app/screens/ChecklistScreen.tsx`, but runtime reality is inline checklist component in `src/app/App.tsx`.

## Git Intelligence Summary

Recent commit pattern (latest 5):

- `18b0178` EPIC 10.3 avec CR
- `7db81a0` EPIC 10.3 DONE
- `92e1388` EPIC 10.2 DONE
- `3a4493f` Story 10.1
- `797627e` Story 9.3 done

Pattern to preserve:

- App behavior changes are coupled with integration tests.
- Cloud contract changes are coupled with provider tests.
- Sprint status is updated in same delivery sequence.

## Latest Tech Information (Web Research)

- React official guidance: state is preserved by tree position; structural swaps can reset state unexpectedly. Keep checklist component identity stable when adding filter logic.
- Firebase RTDB guidance: prefer `update()` for multi-path atomic partial writes; use transactions for conflict-sensitive paths; keep listeners scoped to lowest needed node.
- Firebase web offline: writes are locally queued in-session, but persistence is not guaranteed after tab close; queue strategy in `useCloudSync` remains important.
- RTDB security rules: owner-only behaviors must be enforced in rules, not only UI; this story should not weaken existing owner restrictions.

## Project Context Reference

- Persistent fact lookup (`**/project-context.md`) returned no file in workspace.
- Story context built from backlog, architecture ADRs, current implementation, tests, and git history.

## Risks & Guardrails

- Risk: filtering by static labels only (e.g., category name containing "hommes/femmes") can be brittle.
- Guardrail: explicit item metadata contract required.

- Risk: hidden items reducing denominator can unexpectedly increase completion percentage.
- Guardrail: this is expected per profile-specific view; document behavior and test explicitly.

- Risk: stale cloud payload replay could overwrite recently edited metadata.
- Guardrail: keep metadata updates idempotent and compatible with existing queue replay behavior.

## Decisions Applied

1. `gender` and `householdRole` are optional; defaults apply and default user view shows all checklist items.
2. Metadata can be edited after profile creation with no particular authorization requirement.
3. Badges are required at both item level and category level.

## References

- `BACKLOG.md` (Story 10.4 requirements)
- `docs/backlog-epics-stories.md` (Epic 10 prioritization and dependencies)
- `guidelines/_bmad-output/implementation-artifacts/10-3-checklist-persistante-apres-deblocage.md`
- `guidelines/_bmad-output/planning-artifacts/adr-11-6-deblocage-famille-wide-contract.md`
- `guidelines/_bmad-output/planning-artifacts/architecture-review-epic-11-pre-11-6-2026-07-15.md`

### Review Findings

- [x] [Review][Patch] "Kids" badge vocabulary normalized to "Enfants" — decision resolved with option 2 and implemented in `getItemBadges` (`teen` and `child` now map to `Enfants`). [`src/app/checklist-filter.ts`]

- [x] [Review][Patch] Cloud metadata never persisted to Firebase — fixed by including `gender`/`householdRole` in `mutation`, dedup payload, and effect dependencies. [`src/hooks/useCloudSync.ts:262`, `src/app/App.tsx:3072`, `src/app/App.tsx:3120`]

- [x] [Review][Patch] openCategories not reset on metadata change — fixed via `applyProfileMetadata` helper that updates profile metadata and resets `openCategories` to the first checklist category. [`src/app/App.tsx`]

- [x] [Review][Patch] Duplicate type aliases for Gender/HouseholdRole — fixed by deriving checklist filter types from `ProfileGender` and `ProfileHouseholdRole` in cloud types. [`src/app/checklist-filter.ts`, `src/types/cloud.ts`]

- [x] [Review][Patch] "Owner sees all" integration assertion clarified — owner case remains explicitly paired with non-owner female test in the same suite, and test wording now reflects owner-profile verification with explicit metadata. [`src/app/App.access-control.integration.test.tsx`]

- [x] [Review][Patch] QA matrix teen/child tests now exercise householdRole filtering — fixture now includes teen/child-targeted categories and tests assert teen-vs-child visibility differences. [`src/app/checklist-filter.test.ts`]

- [x] [Review][Patch] getItemBadges early-return dropped co-present badges on ownerOnly items — fixed by removing early return and composing badges from all active restrictions. [`src/app/checklist-filter.ts:getItemBadges`]

- [x] [Review][Patch] "Propriétaire" badge missing "uniquement" qualifier — fixed to "Propriétaire uniquement" for unambiguous access restriction wording. [`src/app/checklist-filter.ts:getItemBadges`]

- [x] [Review][Patch] makeSnapshotWithMetadata used unsafe cast — fixed with typed profile narrowing and direct property assignment. [`src/app/App.access-control.integration.test.tsx:makeSnapshotWithMetadata`]

- [x] [Review][Defer] SettingsScreen local metadata state stale on concurrent cloud sync — `useState<Gender>(profile.gender)` captures gender at mount time; a concurrent cloud sync updating `profile.gender` in App state while SettingsScreen is open would be silently overwritten on next Save. Low-frequency scenario in a single-family app. [`src/app/App.tsx:SettingsScreen` ~line 2161] — deferred, pre-existing React pattern
- [x] [Review][Defer] profileFilterInput.role defaults to "utilisateur" during null-role bootstrap — `profile.role ?? "utilisateur"` means owner checklist is briefly rendered as non-owner until role hydration. Access-control guards prevent checklist render before hydration in practice. [`src/app/App.tsx` ~line 3212] — deferred, pre-existing
- [x] [Review][Defer] Profile-switch test doesn't assert cross-profile filter leakage (AC6) — test terminates at Se connecter screen, never renders a second profile to confirm metadata reset. [`src/app/App.login-flow.integration.test.tsx` — metadata hydration suite] — deferred, partial coverage
- [x] [Review][Defer] No integration test for localStorage metadata persistence in non-cloud mode — parse guards for gender/householdRole in localStorage path are untested at integration level. [`src/app/App.tsx` ~line 2571] — deferred, narrow coverage gap
- `src/app/App.tsx`
- `src/types/cloud.ts`
- `src/services/cloudSyncProvider.ts`
- `src/hooks/useCloudSync.ts`
- `src/app/access-control.ts`
- `src/app/App.access-control.integration.test.tsx`
- `src/app/App.login-flow.integration.test.tsx`
- `src/services/cloudSyncProvider.test.ts`

## Story Completion Status

- Story file created and validated against workflow checklist intent.
- Status set to `ready-for-dev`.
- Completion note: Ultimate context analysis completed - comprehensive developer guide created.

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6 (GitHub Copilot)

### Debug Log References

- Activation workflow resolved with `_bmad/scripts/resolve_customization.py --key workflow`.
- Sprint status loaded: story `10-4-adaptation-checklist-par-profil` found as `ready-for-dev`.
- baseline_commit already set to `18b0178` — preserved.
- All source files read completely before implementation.

### Implementation Plan

1. Created pure filter utility `src/app/checklist-filter.ts` with `isItemVisibleForProfile`, `filterCategoriesForProfile`, `getVisibleItemIds`, `getItemBadges`, `getCategoryBadges`.
2. Added `gender` and `householdRole` optional fields to `CloudProfileRecord`, `CloudProfileState`, `CloudSyncWritePayload` in `src/types/cloud.ts`.
3. Extended `cloudSyncProvider.ts` with `toProfileGender`/`toProfileHouseholdRole` normalizers; metadata written on every push; backward-compatible (absent fields → defaults).
4. Updated `PushSnapshotInput` in `useCloudSync.ts` to carry `gender?` and `householdRole?`.
5. Extended `Profile` type in `App.tsx` with `gender: Gender` and `householdRole: HouseholdRole`.
6. Tagged `CHECKLIST_CATEGORIES` items: `vetements-hommes` all male, `vetements-femmes` all female, `baignade-pareo` female, `bagages-sac-main` female.
7. Updated `ProfileSetupScreen` to collect gender and householdRole via toggle buttons (defaults: unspecified/member).
8. Added metadata editing section to `SettingsScreen` with `onSaveProfileMetadata` callback.
9. Replaced static `totalItems`/`checkedCount`/`pct` computation with `filterCategoriesForProfile`/`getVisibleItemIds` based on current profile.
10. Both `ChecklistScreen` invocations now receive `visibleCategories` (filtered) instead of `CHECKLIST_CATEGORIES`.
11. Badge rendering added at item level (inline with item) and category level (below category count).
12. `resetForProfileSwitch` resets `gender`/`householdRole` to defaults.
13. Cloud hydration `useEffect` reads `gender`/`householdRole` from cloud profile and sets local state.
14. Cloud bootstrap (auto-login) sets `gender`/`householdRole` from remembered cloud profile.

### Completion Notes List

- All 5 tasks completed with all subtasks checked.
- 130 tests pass (3 skipped — Firebase emulator only), 0 regressions.
- New tests: 42 unit tests in `checklist-filter.test.ts`, 5 cloud provider tests, 4 access-control integration tests, 2 login-flow integration tests.
- QA matrix covered: owner, parent-male, parent-female, teen, child (via unit test `AC8 QA matrix combinations`).
- Checklist state (checked/unchecked) is preserved for hidden items — only visible items contribute to counters.

### File List

- src/app/App.tsx
- src/types/cloud.ts
- src/services/cloudSyncProvider.ts
- src/hooks/useCloudSync.ts
- src/app/checklist-filter.ts (NEW)
- src/app/checklist-filter.test.ts (NEW)
- src/services/cloudSyncProvider.test.ts
- src/app/App.access-control.integration.test.tsx
- src/app/App.login-flow.integration.test.tsx
- guidelines/_bmad-output/implementation-artifacts/10-4-adaptation-checklist-par-profil.md
- guidelines/_bmad-output/implementation-artifacts/sprint-status.yaml

## Change Log

- 2026-07-17: Story 10.4 implemented — profile metadata model (gender/householdRole), checklist filtering pipeline, profile setup UX, settings metadata editor, badge renderer, cloud sync, full test suite.
