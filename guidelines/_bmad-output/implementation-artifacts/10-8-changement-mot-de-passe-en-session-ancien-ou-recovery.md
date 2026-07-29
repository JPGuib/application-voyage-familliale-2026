---
baseline_commit: "72c2e07eee40672c76a43bc04958951e8d1ff65d"
story_id: "10.8"
story_key: "10-8-changement-mot-de-passe-en-session-ancien-ou-recovery"
epic: "10"
generated_at: "2026-07-17"
---

# Story 10.8: Change profile password in active session using current password OR recovery, with double confirmation

Status: review
Epic: 10 - Advanced profile management and checklist personalization
Story Key: 10-8-changement-mot-de-passe-en-session-ancien-ou-recovery
Date: 2026-07-17

## Story
As an authenticated profile user,
I want to change my profile password from Settings by proving identity with either my current password or my recovery answer,
so that I can keep access secure even when I forgot the current password.

## Business Value
- Completes the profile password lifecycle after stories 10.2 (password), 10.6 (recovery setup), and 10.7 (forgot-password at login).
- Reduces lockout risk while preserving hash-only secret handling.
- Aligns sensitive change behavior with re-authentication best practices for active sessions.

## Acceptance Criteria (BDD)

1. Password change section is available in active session Settings
   Given an authenticated profile opens Settings
   When the profile is connected and authenticated
   Then a dedicated password-change action is available
   And the flow is scoped to the current profile only.

2. Identity proof supports either current password or recovery answer
   Given a profile wants to change password
   When the profile has a configured current password hash
   Then the user can prove identity with current password
   And if profile recovery is configured, the user can alternatively prove identity with recovery answer.

3. Recovery fallback only appears when configured
   Given a profile has no recovery question/hash configured
   When the user opens the in-session password-change flow
   Then recovery option is not offered
   And no undefined access/runtime error occurs.

4. New password requires double confirmation
   Given identity proof succeeds
   When the user enters a new password and confirmation
   Then both values are required and must match
   And the new password must pass local validation (minimum 4 characters, trimmed).

5. Cloud and local state are updated atomically for current profile
   Given the new password is valid
   When the user confirms the password change
   Then the app hashes the new password with hashProfilePassword
   And updates profilePasswordHashes[currentProfileId]
   And pushes a full profile payload to cloud via pushSnapshot
   And preserves existing profile fields (surname, role, checklist, gameResults, recovery fields, metadata, phase).

6. Generic error messaging and no secret leakage
   Given any failure during identity proof or write
   When the flow fails
   Then the message is generic for auth failures
   And no clear-text secret is persisted in localStorage or cloud payload.

7. Success path keeps session active and clears transient secret inputs
   Given password change succeeds
   When cloud write resolves
   Then the user remains authenticated on the same profile
   And all temporary inputs/errors for this flow are reset.

8. Non-regression
   Given existing login, forgot-password (10.7), owner recovery, and cloud hydration flows
   When story 10.8 is implemented
   Then existing tests keep passing and new tests cover both proof paths.

## Scope
### In scope
- In-session password-change flow in Settings for authenticated profile.
- Identity proof branch: current password OR recovery answer (when configured).
- New password + confirmation validation and hash-only persistence.
- Cloud payload update for current profile password hash.
- Integration tests for positive and negative scenarios.

### Out of scope
- Login-screen forgot-password flow (already handled by 10.7).
- Owner code and owner recovery flows.
- MFA/email/SMS channels.
- Secret display of stored password/recovery hashes.

## Developer Guardrails

### Critical implementation sequence
1. Read current profile context from authenticated state and cloudSnapshot.profiles[profile.id].
2. Validate proof path:
   - Path A: verifyProfilePassword(currentPasswordInput, storedProfilePasswordHash)
   - Path B: hashOwnerRecoveryPhrase(recoveryAnswerInput) and compare to stored recoveryHash
3. Validate new password + confirm (trim, min length 4, equality).
4. Compute new hash with hashProfilePassword.
5. Update local state map profilePasswordHashes[profile.id] with new hash.
6. Push full profile payload for current profile using pushSnapshot.
7. On success: clear transient fields and show success feedback.
8. On failure: revert local hash if cloud push fails, keep session unchanged.

### Technical requirements
- Reuse existing utilities only:
  - src/app/profile-password.ts: hashProfilePassword, verifyProfilePassword, isProfilePasswordHash
  - src/app/owner-recovery.ts: hashOwnerRecoveryPhrase, isOwnerRecoveryHash
- Keep generic error text for proof failures (do not reveal which proof failed).
- Inputs must be normalized via trim before verification/hashing.
- No new dependency.

### Architecture compliance
- Keep ADR 11.3 intent: cloud remains source of truth for shared persisted profile state.
- Preserve profile scope of password/recovery data.
- Do not alter auth bootstrap or login routing behavior.
- Keep owner policy and owner uniqueness untouched.

### Library/framework requirements
- React + Vite + Vitest + Firebase modular SDK unchanged.
- Continue using pushSnapshot contract and existing cloud provider schema.

### File structure requirements
- UPDATE src/app/App.tsx
  - Current state:
    - Settings supports setting/removing profile password.
    - Recovery setup exists in settings; forgot-password at login exists (10.7).
    - No explicit in-session dual-proof change-password flow is defined as a separate guarded flow.
  - Story changes:
    - Add explicit password-change UX in Settings that requires identity proof by current password OR recovery answer.
    - Add new-password + confirm fields for this flow.
    - Implement write path with local update + pushSnapshot full payload for current profile.
    - Clear transient inputs and errors after success/cancel.
  - Must preserve:
    - Existing 10.7 login recovery flow.
    - Existing owner code/recovery settings blocks.
    - Existing cloud hydration and profile switch behaviors.

- UPDATE src/app/App.login-flow.integration.test.tsx
  - Add tests for in-session change-password flow:
    - current password proof success
    - recovery proof success (when configured)
    - proof failure (generic message)
    - validation failure for mismatch/short password
    - no recovery option when not configured
    - regression: login flow unchanged after in-session update

- OPTIONAL UPDATE src/app/profile-password.test.ts
  - Add focused assertions if needed for trimmed password behavior and hash-format guard in this story path.

## Current State (Files Read Completely)
- src/app/App.tsx
  - Settings currently has:
    - profile password set/update using one input
    - remove profile password action
    - profile recovery question/answer setup
  - Cloud login flow already includes 10.7 forgot-password recovery at login overlay.
  - pushSnapshot is used for cloud sync with full profile payloads.

- src/app/App.login-flow.integration.test.tsx
  - Already tests 10.7 forgot-password login path and recovery cancellation.
  - Does not yet cover an explicit in-session dual-proof password-change flow in Settings.

- src/app/profile-password.ts
  - Hash format: sha256: + 64 hex
  - verifyProfilePassword returns false on malformed/invalid input.

- src/app/owner-recovery.ts
  - Recovery answer hashing and verification is available and stable.

## What this story changes
- Introduces explicit sensitive in-session password change with dual proof mechanism.
- Prevents ad-hoc password replacement without identity proof.
- Harmonizes behavior with security guidance while preserving existing UX foundations.

## What must be preserved
- Hash-only storage invariants for password and recovery answer.
- Generic auth error strategy.
- Existing 10.7 login recovery flow behavior and tests.
- Existing profile switch/logout and hydration flows.

## Tasks / Subtasks

- [x] Task 1 - Add in-session dual-proof password-change flow in Settings (AC: 1, 2, 3, 4, 7)
  - [x] Add dedicated UI state for proof method selection (current password vs recovery, recovery only if configured).
  - [x] Add inputs for proof credential, new password, confirmation, and flow feedback.
  - [x] Ensure cancel/reset clears transient state.

- [x] Task 2 - Implement secure password change handler (AC: 2, 4, 5, 6, 7)
  - [x] Resolve current profile cloud record safely.
  - [x] Validate proof path and enforce generic proof failure message.
  - [x] Validate new password and confirmation.
  - [x] Hash new password, update local map, push full payload, revert on push failure.
  - [x] Keep session authenticated and profile unchanged on success.

- [x] Task 3 - Add regression and feature tests (AC: 8)
  - [x] Add integration tests for current-password proof success/failure.
  - [x] Add integration tests for recovery-proof success/failure and hidden recovery option when not configured.
  - [x] Add mismatch/short-password validation tests.
  - [x] Run targeted tests, then full suite.

## Testing requirements
- Minimum targeted run:
  - pnpm test -- src/app/App.login-flow.integration.test.tsx src/app/profile-password.test.ts
- Recommended focused run:
  - pnpm test -- src/app/profile-login.test.ts src/app/cloud-hydration.test.ts
- Full regression:
  - pnpm test

## Previous story intelligence (10.7)
- 10.7 established a pre-auth recovery reset flow at login and proved cloud push + local hash pre-update pattern.
- 10.8 must not duplicate login overlay logic; it should be in-session Settings logic.
- Preserve generic errors and avoid account-state leakage.
- Keep payload completeness on pushSnapshot to avoid accidental field loss.

## Git intelligence summary
- Recent commits in Epic 10 repeatedly modify:
  - src/app/App.tsx
  - src/app/App.login-flow.integration.test.tsx
  - src/types/cloud.ts and cloud provider files when contracts evolve
- Pattern to follow:
  - feature + regression tests in same change
  - sprint status synchronized after context creation and delivery

## Latest technical information (web research)
Source: OWASP Authentication Cheat Sheet and Forgot Password Cheat Sheet (2026 pages).
- Change-password features should require active-session re-authentication by current credential.
- Recovery and authentication failures should use generic messaging to prevent enumeration/discrepancy.
- Sensitive reset/change flows should require confirmation of new password and clear post-action state handling.
- Rate-limiting and lockout usability balance should be considered where brute force is possible.

## Risks and guardrails
- Risk: bypassing identity proof in active session.
  - Guardrail: enforce one of two proof paths before write.
- Risk: partial cloud writes wiping fields.
  - Guardrail: always push complete profile payload with unchanged fields preserved.
- Risk: stale local state after failed cloud push.
  - Guardrail: snapshot previous hash and revert on failure.
- Risk: leaking account details via errors.
  - Guardrail: keep generic proof failure message.

## Source references
- docs/backlog-epics-stories.md (Epic 10, story 10.8 item)
- guidelines/_bmad-output/implementation-artifacts/sprint-status.yaml
- guidelines/_bmad-output/implementation-artifacts/10-7-mot-de-passe-oublie-au-changement-profil-via-recovery.md
- guidelines/_bmad-output/implementation-artifacts/10-6-recuperation-mot-de-passe-par-question-reponse-par-profil.md
- src/app/App.tsx
- src/app/App.login-flow.integration.test.tsx
- src/app/profile-password.ts
- src/app/owner-recovery.ts
- https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html
- https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html

## Project context reference
- Persistent facts configured: file:{project-root}/**/project-context.md
- Resolution result: no matching file found in workspace.

## Completion status
- Ultimate context engine analysis completed - comprehensive developer guide created.
- Story status set to ready-for-dev.

## Dev agent record

### Agent model used
GPT-5.3-Codex

### Debug log references
- Workflow activation resolved via _bmad/scripts/resolve_customization.py.
- Sprint status fully read and target selected from user argument 10.8 and backlog order.
- Full read of App.tsx and login-flow integration tests completed before authoring story.
- OWASP references checked for current guidance alignment.
- Implemented in-session dual-proof UI and secure handler in `src/app/App.tsx`.
- Added comprehensive 10.8 coverage in `src/app/App.login-flow.integration.test.tsx`.
- Ran targeted tests (`npm test -- src/app/App.login-flow.integration.test.tsx src/app/profile-password.test.ts`) and full regression (`npm test`).

### Implementation plan
- Introduce an explicit in-session password-change panel under Settings visible for profiles with an existing password.
- Support proof method choice (`current-password` or `recovery` when configured) with trimmed input handling.
- Validate new password length and confirmation match, hash via `hashProfilePassword`, and keep generic auth error messaging.
- Update local password hash first, push a full cloud payload via `pushSnapshot`, and rollback local hash on cloud failure.
- Keep session continuity and clear transient flow inputs/errors on success and cancel.

### Completion notes list
- Implemented dedicated in-session password-change UX with dual proof (current password or recovery answer) and gated recovery option visibility.
- Added secure change handler with current profile cloud record resolution, generic auth failure messaging, trim-based validation, full payload push, and rollback on push failure.
- Preserved existing login recovery, owner flows, profile switching, and cloud hydration behavior.
- Added integration tests for current-password and recovery proof paths, validation failures, and no-recovery-option behavior.
- Verified non-regression with targeted tests and full suite: 151 passed, 3 skipped.

### File list
- guidelines/_bmad-output/implementation-artifacts/10-8-changement-mot-de-passe-en-session-ancien-ou-recovery.md
- src/app/App.tsx
- src/app/App.login-flow.integration.test.tsx
- guidelines/_bmad-output/implementation-artifacts/sprint-status.yaml

## Change log
- 2026-07-17: Implemented story 10.8 in-session dual-proof password change flow, added integration coverage, and validated via targeted + full regression test runs.
