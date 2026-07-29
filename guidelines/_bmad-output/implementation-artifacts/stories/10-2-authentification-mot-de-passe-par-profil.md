---
baseline_commit: 3a4493f
---

# Story 10.2 - Password authentication per profile

Status: done
Epic: 10 - Advanced profile management and checklist personalization
Story Key: 10-2-authentification-mot-de-passe-par-profil
Date: 2026-07-17

## Story
As a family app user,
I want each profile to be optionally protected by its own password,
so that profile access remains private without breaking existing cloud multi-profile behavior.

## Business Value
- Adds per-profile privacy without forcing passwords for every profile.
- Protects profile switch/login flow from accidental access on shared devices.
- Prepares follow-up recovery and password lifecycle stories (10.6, 10.7, 10.8).

## Acceptance Criteria (BDD)
1. Optional protection at profile level
   Given a user creates or updates a profile
   When they choose not to configure a password
   Then the profile remains directly selectable with no password prompt
   And existing login flow remains unchanged.

2. Password stored as hash only
   Given a user configures a profile password
   When the value is persisted
   Then only a hash representation is stored
   And no clear-text password is persisted in cloud or local storage.

3. Authentication on protected profile selection
   Given at least one profile has a configured password
   When that protected profile is selected on the cloud login screen
   Then the app prompts for password before authentication completes
   And entering a valid password authenticates that profile.

4. Secure error messaging
   Given a protected profile authentication attempt fails
   When the app displays feedback
   Then the message is generic and does not leak secret/account details.

5. Recovery phrase configuration support
   Given a profile owner opens Settings
   When they configure or update recovery phrase for that same profile
   Then the phrase is stored hashed and linked to that profile
   And can be used by Story 10.6+ flows later.

6. No regressions for unprotected profiles and existing cloud auth/session flows
   Given current login/profile switch/phase hydration behavior
   When story 10.2 is implemented
   Then login for unprotected profiles, profile switching, cloud hydration and owner-code flows still pass existing tests.

## Scope
### In scope
- Optional per-profile password setup and update.
- Password verification gate on profile selection.
- Per-profile recovery phrase setup data model (hash only).
- UI and integration tests for protected and unprotected profile login behavior.

### Out of scope
- MFA, email/SMS recovery, biometrics.
- Displaying already configured secrets.
- Migrating owner code security model.

## Developer Guardrails

### Technical Requirements
- Reuse existing hashing pattern from `owner-code` and `owner-recovery` modules; do not introduce plain-text secret storage.
- Keep cloud-authoritative shared state model from ADR 11.3.
- Preserve profile isolation: password/recovery metadata must be profile-scoped, not family-wide.
- Keep error messages non-enumerating and generic.
- Keep behavior unchanged for profiles with no configured password.

### Architecture Compliance
- Respect cloud ownership boundaries:
  - family-wide: ownerProfileId, ownerCodeHash, phase
  - profile-scoped: checklist, gameResults, profile metadata
- For 10.2, password metadata must be profile-scoped (`profiles/{profileId}/...`) to avoid cross-profile leakage.
- Do not reintroduce local authoritative business state; local cache only for technical/session concerns.
- Do not bypass existing push guards (`shouldPushCloudSnapshot`, auth/bootstrap guards).

### Library/Framework Requirements
- Keep current stack and patterns used in repository:
  - React 18.3.1 (peer), Vite 6.4.3, Vitest 3.x, Firebase JS SDK 12.x.
- Avoid adding new crypto/password libraries in this story unless explicitly approved.
- Keep browser Web Crypto based hashing approach consistent with existing modules.
- Security note from current best-practice review:
  - Slow KDFs (Argon2id/scrypt/PBKDF2) are preferred in general,
  - but this client-only app currently standardizes on SHA-256 hash format for owner secrets.
  - Do not break existing `sha256:` contract in this story; if upgraded later, do it behind a dedicated migration ADR/story.

### File Structure Requirements
- UPDATE `src/app/App.tsx`
  - Current state:
    - cloud login screen with profile selection and direct login,
    - owner-code and owner-recovery flows in Settings and checklist unlock,
    - cloud hydration and guarded push flows.
  - Story changes:
    - inject protected-profile auth step before `setIsAuthenticated(true)` on selected profile,
    - add per-profile password/recovery settings section,
    - preserve existing owner-code/recovery and access-control behavior.
  - Must preserve:
    - cloud bootstrap and `isProfileHydrationPending` behavior,
    - no regression for unprotected profiles,
    - no regression for profile switch reset logic.

- UPDATE `src/types/cloud.ts`
  - Current state:
    - `CloudProfileState` has surname/role/checklist/gameResults/phase.
  - Story changes:
    - extend profile-scoped cloud types with optional password/recovery hash fields.
  - Must preserve:
    - backwards-compatible parsing of snapshots without new fields.

- UPDATE `src/services/cloudSyncProvider.ts`
  - Current state:
    - parse and write profile records via `profiles/{profileId}`,
    - family-wide fields updated only for owner-authorized writes.
  - Story changes:
    - parse/write new optional profile password/recovery hash fields.
  - Must preserve:
    - existing family-wide write guard and role sanitation,
    - phase handling (family-wide + legacy fallback behavior).

- UPDATE `src/hooks/useCloudSync.ts` (if write payload/type changes are needed)
  - Current state:
    - builds `CloudSyncWritePayload`, queues offline writes.
  - Story changes:
    - include profile-scoped auth metadata only if type contract changes.
  - Must preserve:
    - queue flush behavior and current auth error semantics.

- UPDATE `src/app/App.login-flow.integration.test.tsx`
  - Add coverage for protected profile login prompt and fallback behavior.

- NEW `src/app/profile-password.ts`
  - Pure helper module for per-profile password hash/verify/format checks.
  - Mirror existing style of `owner-code.ts` and `owner-recovery.ts`.

- NEW `src/app/profile-password.test.ts`
  - Unit tests for deterministic format/verification and invalid inputs.

## Testing Requirements
- Unit tests
  - `profile-password` hashing/verifying behavior.
  - format validation and bad-input handling.

- Integration tests
  - Protected profile requires password before login completion.
  - Wrong password stays on auth prompt with generic message.
  - Unprotected profile logs in exactly as before.
  - Profile switch/logout still returns to cloud selection flow.

- Regression minimum set
  - `src/app/App.login-flow.integration.test.tsx`
  - `src/app/owner-recovery.integration.test.ts`
  - `src/app/App.access-control.integration.test.tsx`
  - `src/services/cloudSyncProvider.test.ts`

## Previous Story Intelligence (10.1)
- 10.1 introduced centralized policy module and avoided schema changes when not required.
- Review in 10.1 highlighted real regressions from subtle UI flow shifts (missing props, fail-open behavior).
- Practical lesson for 10.2: keep auth gate isolated and explicit; avoid broad refactors in `App.tsx`.
- Keep deny/error copy explicit but non-sensitive.

## Git Intelligence Summary
- Recent pattern across 9.2, 9.3, 10.1:
  - add focused domain helper modules,
  - wire into `App.tsx`,
  - add targeted unit/integration tests,
  - update sprint story docs/status in same delivery cycle.
- Existing auth and recovery work already lives in `src/app/*` helpers plus `App.tsx` orchestration.
- Prefer incremental, test-backed changes over framework or architecture rewrites.

## Latest Technical Information (for this implementation)
- React package latest published is currently 19.x while repository runtime remains pinned to React 18.3.1 peer contract.
  - Do not upgrade React in this story.
- Vite/Vitest latest are newer than repository pins.
  - Do not upgrade toolchain in this story.
- OWASP guidance recommends slow password KDFs (Argon2id/scrypt/PBKDF2) for account passwords.
  - Current app model uses SHA-256 hash-only client-side for owner secrets.
  - Keep consistency for this story and open a separate hardening story if moving to stronger KDF/migration.

## Source References
- Functional source for Story 10.2: `BACKLOG.md` (Story 10.2 section)
- Priority/dependency context: `docs/backlog-epics-stories.md`
- Prior story baseline and known traps: `guidelines/_bmad-output/implementation-artifacts/stories/10-1-regles-visibilite-rubriques-role-deblocage.md`
- Cloud source-of-truth constraints: `guidelines/_bmad-output/planning-artifacts/adr-11-3-source-of-truth-cloud-local.md`
- Family-wide phase contract constraints: `guidelines/_bmad-output/planning-artifacts/adr-11-6-deblocage-famille-wide-contract.md`
- Current implementation files analyzed:
  - `src/app/App.tsx`
  - `src/types/cloud.ts`
  - `src/services/cloudSyncProvider.ts`
  - `src/hooks/useCloudSync.ts`
  - `src/app/profile-login.ts`
  - `src/app/App.login-flow.integration.test.tsx`

## Project Context Reference
- Persistent fact file `project-context.md` not found in workspace at activation time.
- Story guidance therefore derives from available backlog, ADR/planning artifacts, implementation stories, and source code analysis.

## Completion Status
- Story context generation completed with exhaustive artifact scan, previous-story learnings, git intelligence, architecture constraints, and latest security notes.
- Status set to ready-for-dev.
- Completion note: Ultimate context engine analysis completed - comprehensive developer guide created.

## Open Questions (saved for end; not blocking dev start)
- Should profile recovery phrase configuration be limited to profile owner only, or allowed to family owner for all profiles?
- For protected profiles, should attempt throttling/temporary lockout be local-only (device scope) or profile-scoped in cloud?
- Should protected-profile prompt include show/hide input now, or defer to Story 10.9 for one consistent sensitive-input UX?

## Tasks/Subtasks
- [x] Task 1 - Implement profile password domain helper (AC: 2, 4)
  - [x] Add `src/app/profile-password.ts` with SHA-256 hash format `sha256:` and hash/verify helpers.
  - [x] Add deterministic hash format validation and invalid-input guards.
  - [x] Ensure verification rejects non-hash/legacy clear-text values.
- [x] Task 2 - Extend cloud profile contract for per-profile auth metadata (AC: 2, 5)
  - [x] Update `src/types/cloud.ts` to add optional profile-scoped password/recovery hash fields.
  - [x] Update `src/services/cloudSyncProvider.ts` to parse and persist profile-scoped hash metadata.
  - [x] Preserve backward compatibility for snapshots without new fields and preserve family-wide write guards.
- [x] Task 3 - Add protected-profile login gate and generic error handling (AC: 1, 3, 4, 6)
  - [x] Update `src/app/App.tsx` cloud login flow to require password for protected profiles before setting authenticated session.
  - [x] Keep unprotected profile flow unchanged.
  - [x] Display a generic auth error message on password mismatch.
- [x] Task 4 - Add profile-scoped password/recovery configuration in settings (AC: 1, 2, 5, 6)
  - [x] Update settings flow in `src/app/App.tsx` to save/update current profile password hash (optional field).
  - [x] Update settings flow in `src/app/App.tsx` to save/update current profile recovery hash (profile-scoped).
  - [x] Ensure no clear-text secret is persisted.
- [x] Task 5 - Add/extend automated tests and run regression suite (AC: 1, 2, 3, 4, 5, 6)
  - [x] Add unit tests in `src/app/profile-password.test.ts`.
  - [x] Extend `src/app/App.login-flow.integration.test.tsx` for protected/unprotected login behaviors and generic error feedback.
  - [x] Extend `src/services/cloudSyncProvider.test.ts` for profile-scoped password/recovery hash parse behavior.
  - [x] Run required regression suite and confirm no regressions.

## Change Log
- 2026-07-17: Added executable Tasks/Subtasks for Story 10.2 and moved status to in-progress.
- 2026-07-17: Implemented profile-scoped password and recovery hash support in app/cloud contracts.
- 2026-07-17: Added protected cloud profile login prompt with generic authentication error messaging.
- 2026-07-17: Added test coverage (`profile-password`, login-flow integration, cloudSyncProvider) and passed full test suite.
- 2026-07-17: Applied review corrections (fail-closed on malformed hash, explicit profile password removal, recovery metadata consistency) and moved status to done.

## Dev Agent Record

### Agent Model Used
GPT-5.3-Codex

### Debug Log References
- Activation workflow resolved via `resolve_customization.py` with empty prepend/append and persistent fact glob.
- Artifact inventory from BMAD output + backlog + source code + recent git commits.
- Added explicit task breakdown mapped to ACs to unblock execution workflow.
- Implemented red-green cycle: new unit test first failing for missing module, then helper/module implementation and passing tests.
- Full regression validation executed via `npm run test` (70 passed, 3 skipped emulator-gated).

### Completion Notes List
- Selected explicit target story 10.2 from user input.
- Generated comprehensive implementation guide with guardrails and regression traps.
- Updated sprint status story key to ready-for-dev.
- Story execution started; status moved to in-progress after task checklist creation.
- Implemented `profile-password` helper with deterministic SHA-256 hash contract and strict hash validation.
- Extended cloud profile model and sync provider to parse/persist profile-scoped `passwordHash` and `recoveryHash` metadata.
- Added protected-profile auth gate in cloud login flow with mandatory password prompt before authentication.
- Enforced generic secure login failure message: "Authentification impossible. Vérifiez les informations saisies."
- Added per-profile password and recovery phrase settings (hash-only persistence, no clear text storage).
- Added/updated tests and validated complete suite with no regressions in required login/recovery/access-control/cloud provider flows.
- Hardened login flow to fail closed when a profile password hash is malformed.
- Added explicit settings action to remove profile password and return profile to optional unprotected mode.
- Normalized cloud recovery metadata persistence: empty recovery hash now clears both `recoveryHash` and `recoveryConfiguredAt`.
- Executed global validation: full tests passed (`74 passed`, `3 skipped` emulator-gated) and production build passed.

### File List
- src/app/profile-password.ts (new)
- src/app/profile-password.test.ts (new)
- src/app/App.tsx (updated)
- src/app/App.login-flow.integration.test.tsx (updated)
- src/types/cloud.ts (updated)
- src/services/cloudSyncProvider.ts (updated)
- src/services/cloudSyncProvider.test.ts (updated)
- src/hooks/useCloudSync.ts (updated)
- guidelines/_bmad-output/implementation-artifacts/sprint-status.yaml (updated)
- guidelines/_bmad-output/implementation-artifacts/stories/10-2-authentification-mot-de-passe-par-profil.md (updated)
