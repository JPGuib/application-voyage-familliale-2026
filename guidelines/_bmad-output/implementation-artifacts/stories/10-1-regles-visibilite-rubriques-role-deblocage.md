---
baseline_commit: 797627e
---

# Story 10.1 - Visibility rules by role and unlock state

Status: done
Epic: 10 - Advanced profile management and checklist personalization
Story Key: 10-1-regles-visibilite-rubriques-role-deblocage
Date: 2026-07-17

## Story
As a family app user,
I want each section to be visible according to my role and unlock state,
so that non-authorized profiles only see what they are allowed to access while owner and unlocked users keep a smooth experience.

## Business Value
- Reduces accidental access to advanced sections before owner-approved unlock.
- Clarifies product behavior for owner vs user profiles.
- Prepares secure foundations for Epic 10 follow-up stories (10.2, 10.3, 10.4, 10.6-10.9).

## Acceptance Criteria
1. Owner profile sees all sections from the start (no unlock required).
2. User profile before unlock sees only Checklist and Settings.
3. User profile after unlock sees all sections except Owner Code management.
4. Navigation (dashboard quick actions and bottom navigation) adapts dynamically to profile access.
5. Direct internal navigation to a blocked section is denied and redirected to an allowed section.
6. UI shows explicit reason when access is denied (example: unlock required).
7. Unlock state remains effective after refresh and cloud hydration.
8. No regression on existing cloud login/switch profile/recovery/phase flows.

## Access Matrix (Target Behavior)
| Section | Owner (before unlock) | Owner (after unlock) | User (before unlock) | User (after unlock) |
|---|---|---|---|---|
| checklist | yes | yes | yes | yes |
| dashboard | yes | yes | no | yes |
| guide | yes | yes | no | yes |
| game | yes | yes | no | yes |
| tips | yes | yes | no | yes |
| results | yes | yes | no | yes |
| settings | yes | yes | yes | yes |
| owner-code-actions | yes | yes | no | no |

## Scope
### In scope
- Introduce a dedicated access-control policy module with explicit predicates.
- Apply policy consistently to visible navigation items and route/screen transitions.
- Add deny feedback text for blocked sections.
- Keep logic aligned with existing role invariant from owner-policy.

### Out of scope
- Profile password authentication (10.2).
- Checklist item filtering by profile attributes (10.4).
- Checklist content updates (10.5).

## Developer Guardrails

### Technical Requirements
- Add a pure domain helper, suggested path: src/app/access-control.ts.
- Avoid embedding ad-hoc access conditions directly in JSX branches; centralize in policy functions.
- Reuse existing role source of truth (`profile.role`) and phase source of truth (`phase`) already hydrated from cloud.
- Do not add new persistence keys for access. Derive effective access from existing runtime state.

### Architecture Compliance
- Keep cloud as authoritative source for shared state (ADR 11.3).
- Do not reintroduce local authoritative business state.
- Preserve owner uniqueness invariants enforced by owner-policy.
- Keep profile-scoped data isolation unchanged (checklist/gameResults per profile).

### Library/Framework Requirements
- Keep existing stack: React 18.3.1, Vite 6.x, Vitest 3.x, Firebase JS SDK 12.x.
- Keep Firebase RTDB writes behind existing pushSnapshot path; no direct writes from UI.
- Continue React Router-free internal screen state pattern already used in App.tsx.

### File Structure Requirements
- UPDATE src/app/App.tsx
  - Current state: monolithic screen renderer with profile/phase/cloud guards and bottom nav.
  - Change required: gate navigation and screen transitions by access policy.
  - Must preserve: cloud bootstrap, profile setup/login flows, recovery flows, during-phase checklist behavior.
- UPDATE src/types/cloud.ts (optional, only if new typed access flag is strictly needed)
  - Current state: CloudSyncSnapshot contains familyState, phase, profiles, owner hashes.
  - Change required: prefer no schema change for 10.1 unless absolutely required.
  - Must preserve: backward-compatible parsing and existing types consumed by tests.
- UPDATE src/services/cloudSyncProvider.ts (optional, only if schema changed)
  - Current state: parser supports family-wide phase with legacy fallback.
  - Change required: avoid modifying parser unless required by accepted design.
  - Must preserve: phase migration behavior and profile isolation.
- NEW src/app/access-control.ts
- NEW/UPDATE tests under src/app/ for policy unit and App integration coverage.

### Testing Requirements
- Add unit tests for policy matrix:
  - owner before/after unlock,
  - user before/after unlock,
  - owner-only actions.
- Add integration tests for App behavior:
  - user before unlock cannot open dashboard/guide/game/tips/results,
  - user after unlock can access those sections,
  - user never sees owner-code actions in settings,
  - owner keeps full access.
- Run regression tests at minimum:
  - src/app/App.login-flow.integration.test.tsx
  - src/app/owner-recovery.integration.test.ts
  - src/services/cloudSyncProvider.test.ts

## Implementation Tasks
- [x] Create access policy module (AC: 1, 2, 3).
- [x] Integrate policy into menu visibility and navigation guard rails in App (AC: 4, 5, 6).
- [x] Ensure blocked navigation redirects to safe screen and displays clear message (AC: 5, 6).
- [x] Verify unlock continuity through existing hydration lifecycle (AC: 7).
- [x] Add/adjust unit and integration tests (AC: 1-8).
- [x] Run targeted and regression test suites.

### Review Findings
- [x] [Review][Patch] Dashboard fallback omits required quickActions prop [src/app/App.tsx:3640]
- [x] [Review][Patch] Access policy fails open when role is null in during phase [src/app/access-control.ts:56]
- [x] [Review][Patch] Before-phase blocked screens can render briefly before redirect [src/app/App.tsx:2720]
- [x] [Review][Patch] Tests do not fully cover required owner-after-unlock and user-after-unlock access matrix [src/app/access-control.test.ts:20]
- [x] [Review][Defer] Place screen returns null when selected place is missing, causing blank content [src/app/App.tsx:3319] — deferred, pre-existing

## Known Risks and Regression Traps
- App.tsx currently assumes bottom nav always renders during travel phase; access filtering must not break active screen fallback.
- If a blocked screen is currently active after profile switch, app must auto-redirect without render loop.
- Do not break no-op checklist behavior in during phase.
- Do not alter owner recovery security checks while adding visibility logic.

## Git Intelligence Summary (Recent Patterns)
- Story 9.2 and 9.3 were implemented by extending App.tsx and adding focused domain helpers + tests.
- Team pattern: introduce small pure helper modules (example owner-recovery-guards.ts) and test them directly.
- Sprint status and story files are updated alongside code changes in the same delivery cycle.

## Latest Technical Information
- Firebase RTDB web guidance (updated 2026-07) keeps modular SDK usage and strict rule-based protection as baseline; this aligns with existing provider design.
- React Router docs indicate v7-to-v8 upgrade path but current app uses in-component state routing; do not migrate routing framework in this story.
- Vite guidance confirms Node 20.19+ / 22.12+ and standard dev/build flow already aligned with repository scripts.

## Source References
- Backlog story definition and matrix: BACKLOG.md (EPIC-10 / STORY 10.1)
- Priority/dependency notes impacting 10.1: docs/backlog-epics-stories.md
- Cloud authority and migration invariants: guidelines/_bmad-output/planning-artifacts/adr-11-3-source-of-truth-cloud-local.md
- Family-wide phase contract constraints: guidelines/_bmad-output/planning-artifacts/adr-11-6-deblocage-famille-wide-contract.md
- Current implementation baseline: src/app/App.tsx, src/app/owner-policy.ts, src/hooks/useCloudSync.ts, src/services/cloudSyncProvider.ts, src/types/cloud.ts

## Completion Status
- Story context generation completed with exhaustive artifact scan and code-level guardrails.
- Status set to ready-for-dev.
- Completion note: Ultimate context engine analysis completed - comprehensive developer guide created.

## Open Questions (for later, no blocker for dev start)
- Should owner access remain full in before phase exactly as current behavior, or should some sections become owner-unlock-gated in future UX iterations?
- Should denied-access copy be centralized in i18n-ready constants now, or deferred until localization work starts?

## Dev Agent Record

### Implementation Plan
- Add a pure access policy module that maps role + phase to allowed sections and safe navigation fallback.
- Integrate policy in App navigation entry points (quick actions, bottom nav, direct screen transitions, and place deep-link).
- Add guard effect to auto-redirect blocked active screens and display explicit deny feedback.
- Preserve existing cloud/profile/recovery invariants and avoid introducing new persisted access flags.
- Add policy unit tests and App integration tests for owner/user before/after unlock matrix and denied navigation messaging.

### Debug Log
- Added new policy helpers in src/app/access-control.ts and wired them into src/app/App.tsx.
- Implemented filtered quick actions and bottom navigation visibility using centralized policy predicates.
- Added blocked-navigation fallback and deny-feedback pill message in the app shell.
- Preserved checklist startup behavior for before phase to avoid regressions in owner recovery/login flows.
- Verified no schema or cloud parser changes were required (src/types/cloud.ts and src/services/cloudSyncProvider.ts unchanged).

### Completion Notes
- Implemented AC1-AC7 with centralized policy-driven access control and dynamic navigation rendering.
- Added explicit denied-access UI reason on blocked section attempts and safe redirect behavior.
- Confirmed unlock continuity through cloud hydration by policy deriving access from existing role + phase state.
- Added test coverage:
  - src/app/access-control.test.ts (policy matrix unit tests)
  - src/app/App.access-control.integration.test.tsx (App access behavior integration)
- Validation executed successfully:
  - npm run test -- src/app/access-control.test.ts src/app/App.access-control.integration.test.tsx
  - npm run test -- src/app/access-control.test.ts src/app/App.access-control.integration.test.tsx src/app/App.login-flow.integration.test.tsx src/app/owner-recovery.integration.test.ts src/services/cloudSyncProvider.test.ts
  - npm run test (full suite: 62 passed, 3 skipped emulator-dependent)

## File List
- src/app/access-control.ts (new)
- src/app/access-control.test.ts (new)
- src/app/App.access-control.integration.test.tsx (new)
- src/app/App.tsx (updated)
- guidelines/_bmad-output/implementation-artifacts/stories/10-1-regles-visibilite-rubriques-role-deblocage.md (updated)
- guidelines/_bmad-output/implementation-artifacts/sprint-status.yaml (updated)

## Change Log
- 2026-07-17: Implemented role/unlock visibility policy, dynamic navigation guards, denied-access feedback, and comprehensive tests for Story 10.1.
