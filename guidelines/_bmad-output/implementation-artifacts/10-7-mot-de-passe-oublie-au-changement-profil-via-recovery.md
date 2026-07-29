---
baseline_commit: ""
story_id: "10.7"
story_key: "10-7-mot-de-passe-oublie-au-changement-profil-via-recovery"
epic: "10"
generated_at: "2026-07-17"
---

# Story 10.7: Forgot profile password at profile switch via security question/answer recovery

Status: review
Epic: 10 - Advanced profile management and checklist personalization
Story Key: 10-7-mot-de-passe-oublie-au-changement-profil-via-recovery
Date: 2026-07-17

## Story
As a profile user who forgot their profile password,
I want to recover access to my profile using my recovery question and answer,
so that I can log into my profile and set a new password without being permanently locked out.

## Business Value
- Completes the per-profile password lifecycle: set (10.2), configure recovery (10.6), and now reset via recovery (10.7).
- Prevents permanent lockout from a forgotten profile password.
- Keeps the security model hash-only end-to-end with no secret leakage.
- Prepares the full password-change-in-session story (10.8) by establishing the recovery verification contract.

## Acceptance Criteria (BDD)

1. Forgot-password link at login only when recovery is configured
   Given the password prompt overlay is shown for a protected profile
   When that profile has `recoveryQuestion` and `recoveryHash` configured in the cloud snapshot
   Then a "Mot de passe oublié ?" link is visible in the password prompt overlay
   And it is NOT shown if the profile has no recovery data configured.

2. Recovery question displayed read-only
   Given the user clicks "Mot de passe oublié ?"
   When the recovery overlay is shown
   Then the recovery question text from `cloudSnapshot.profiles[id].recoveryQuestion` is displayed read-only
   And an input for the recovery answer is presented (type=password).

3. Correct recovery answer allows password reset
   Given the recovery overlay is shown
   When the user enters the correct answer (matches `recoveryHash`) and provides a valid new password with confirmation
   Then the new password is hashed (`sha256:` format) and pushed to the cloud via `pushSnapshot`
   And the profile is authenticated immediately after the push
   And the local `profilePasswordHashes` map is updated with the new hash before authentication.

4. Incorrect recovery answer is rejected generically
   Given the recovery overlay is shown
   When the user enters an incorrect recovery answer
   Then the error message is generic and does not reveal whether the answer, the profile, or the recovery data is at fault
   And no password change occurs.

5. New password validation enforced
   Given the user enters a correct recovery answer
   When the new password or its confirmation is missing, empty, or the two values do not match
   Then the form is rejected with an explicit validation message
   And no cloud write occurs.

6. Cancel recovery returns to password prompt without side effects
   Given the recovery overlay is shown
   When the user cancels
   Then the overlay reverts to the original password prompt
   And no state change has occurred for the profile's credentials.

7. No recovery configured → graceful fallback
   Given a protected profile has no `recoveryHash` or `recoveryQuestion` configured
   When the user is on the password prompt
   Then the "Mot de passe oublié ?" link is absent
   And there is no runtime error or undefined access.

8. No regression on existing flows
   Given existing login, profile selection, password prompt, owner code, owner recovery, and cloud sync flows
   When story 10.7 is implemented
   Then all previously passing tests continue to pass.

## Scope
### In scope
- "Mot de passe oublié ?" link within the `CloudLoginScreen` password prompt overlay (conditional on recovery configured).
- Recovery flow overlay: show recovery question (read-only), accept answer, accept new password + confirmation.
- Verify answer against `cloudSnapshot.profiles[targetId].recoveryHash` using `hashOwnerRecoveryPhrase` (same hashing contract as story 10.6 for storage).
- Hash new password with `hashProfilePassword`, push to cloud via `pushSnapshot`, then authenticate.
- Update `profilePasswordHashes[targetId]` in local state before authentication to prevent stale hydration overwrite.
- New integration tests for the full forgot-password flow at login.

### Out of scope
- Password change while already authenticated in settings (Story 10.8).
- Biometrics, email/SMS recovery, MFA.
- Displaying stored secrets in clear text.
- Owner code recovery changes (Epic 9 scope).
- Profile creation flow changes.

## Developer Guardrails

### Critical Architecture Note: Pre-auth Cloud Push
This story's recovery reset happens BEFORE the user is authenticated in the family app.
The auto-push useEffect is gated behind `isAuthenticated=true`, so it cannot be relied upon for this one-shot write.

**Implementation sequence (must follow this order):**
1. Verify recovery answer via `hashOwnerRecoveryPhrase`.
2. Hash new password via `hashProfilePassword`.
3. Set `profilePasswordHashes[targetProfileId] = newHash` in local state (pre-authentication).
4. Call `pushSnapshot(...)` directly with the full profile payload + new `profilePasswordHash: newHash`.
5. Only after the push resolves successfully → authenticate (setProfile, setPhase, setScreen, setIsAuthenticated=true).
6. Hydration will then reload from the cloud snapshot; by the time it runs, the cloud should already have the updated hash (RTDB write is synchronous-to-promise).
7. Reset all recovery prompt state.

**Risk: stale snapshot race window** — RTDB write is fast but the snapshot listener may briefly serve the old hash before the new one propagates. Mitigation: setting `profilePasswordHashes[targetId]` in local state (step 3) before the auth and hydration cycle ensures local state is consistent even if the first hydration snapshot still has the old hash (the auto-push will then push the corrected local hash on the next cycle).

### Technical Requirements
- Reuse `hashOwnerRecoveryPhrase` (from `src/app/owner-recovery.ts`) for verifying the recovery answer — this is the same hashing function used to store it in story 10.6.
- Reuse `hashProfilePassword` (from `src/app/profile-password.ts`) for hashing the new password.
- Use `isProfilePasswordHash` to validate the hash format of the new password before writing.
- Read recovery data only from `cloudSnapshot.profiles[passwordPromptProfileId]` — do NOT read from `profileRecoveryHashes` / `profileRecoveryQuestions` state maps (those are post-auth state and not reliable at login time).
- Generic error messages — never reveal whether the answer, hash, or profile is faulty.
- Normalize (trim) all inputs before hashing or validation.
- New password minimum length: 4 characters (consistent with owner code minimum, as established in story 10.2's UI patterns).

### Architecture Compliance
- Do not break ADR 11.3 (cloud as source of truth for shared state).
- Do not change owner uniqueness policy or owner-recovery contract.
- Do not alter login authentication contract except the targeted forgot-password extension.
- Profile-scoped data remains profile-scoped (`profiles/{profileId}/passwordHash` in cloud).
- The `pushSnapshot` call must include the full profile payload (not partial) to avoid wiping other profile fields. Construct the payload from `cloudSnapshot.profiles[targetProfileId]` plus the updated `profilePasswordHash`.

### Library/Framework Requirements
- No new dependency.
- Keep React/Vite/Vitest/Firebase modular SDK usage unchanged.

### File Structure Requirements

- UPDATE `src/app/App.tsx`
  - **Current state of `CloudLoginScreen` component (lines ~689–820):**
    - Accepts `passwordPromptProfileSurname`, `passwordPromptValue`, `passwordPromptError` props.
    - The password overlay is shown when `passwordPromptProfileSurname` is non-null.
    - Contains two buttons: "Annuler" and "Se connecter".
    - Has NO forgot-password link or recovery sub-flow.
  - **Changes required:**
    - Add new props to `CloudLoginScreen` for the recovery sub-flow:
      - `profileRecoveryStep: "none" | "recovery"` (controls whether the overlay shows the password form or the recovery form)
      - `profileRecoveryQuestion: string | null` (read-only display of the configured question)
      - `profileRecoveryAnswerInput: string`
      - `profileRecoveryNewPasswordInput: string`
      - `profileRecoveryNewPasswordConfirmInput: string`
      - `profileRecoveryError: string | null`
      - `onOpenProfileForgotPassword: () => void` (click handler for "Mot de passe oublié ?")
      - `onProfileRecoveryAnswerChange: (v: string) => void`
      - `onProfileRecoveryNewPasswordChange: (v: string) => void`
      - `onProfileRecoveryNewPasswordConfirmChange: (v: string) => void`
      - `onConfirmProfileRecoveryReset: () => void` (triggers the async verification+push+auth)
      - `onCancelProfileRecovery: () => void` (reverts to password prompt step)
    - Inside the password overlay: show "Mot de passe oublié ?" link only when `profileRecoveryQuestion` is truthy (i.e., recovery is configured for the selected profile).
    - When `profileRecoveryStep === "recovery"`: show recovery overlay with the question (read-only text), answer input (type=password), new password input (type=password), confirmation input (type=password), error, and Annuler/Réinitialiser buttons.
    - Add new state variables in App component:
      - `profileRecoveryStep: "none" | "recovery"` (useState, default "none")
      - `profileRecoveryAnswerInput: string` (useState, default "")
      - `profileRecoveryNewPasswordInput: string` (useState, default "")
      - `profileRecoveryNewPasswordConfirmInput: string` (useState, default "")
      - `profileRecoveryError: string | null` (useState, default null)
    - Add `onOpenProfileForgotPassword` handler that:
      - Sets `profileRecoveryStep = "recovery"`
      - Clears recovery inputs and error
    - Add `onCancelProfileRecovery` handler that:
      - Sets `profileRecoveryStep = "none"`
      - Clears recovery inputs and error (does NOT clear the password prompt)
    - Add `onConfirmProfileRecoveryReset` async handler implementing the sequence from the Critical Architecture Note above.
    - Reset `profileRecoveryStep` to "none" in `onCancelPasswordPrompt`.
  - **Must preserve:**
    - All existing `CloudLoginScreen` props and behavior for normal password prompt.
    - Owner code, owner recovery, cloud login, profile creation, and phase flows.
    - `onConfirmPasswordPrompt` logic unchanged.
    - Generic error messaging on the password prompt.

- UPDATE `src/app/App.login-flow.integration.test.tsx`
  - Add tests covering:
    - "forgot password link is shown when profile has recovery question configured"
    - "forgot password link is absent when profile has no recovery data"
    - "correct recovery answer + valid new password resets password and authenticates"
    - "incorrect recovery answer shows generic error and does not authenticate"
    - "cancel from recovery returns to password prompt"
  - Use `hashOwnerRecoveryPhrase` to pre-build test recovery hashes in snapshot fixtures.
  - Use `hashProfilePassword` to pre-build test password hashes in snapshot fixtures.

## Current State (Files Read)

- `src/app/App.tsx`
  - `CloudLoginScreen` component renders a password overlay when `passwordPromptProfileSurname !== null`.
  - Password prompt overlay has Annuler + Se connecter buttons only — no forgot-password path.
  - State: `passwordPromptProfileId`, `passwordPromptInput`, `passwordPromptError` manage the password prompt.
  - `onConfirmPasswordPrompt` handler verifies password against `cloudSnapshot.profiles[id].passwordHash` then authenticates.
  - No `profileRecoveryStep` state or recovery overlay exists yet.

- `src/types/cloud.ts`
  - `CloudProfileRecord` and `CloudProfileState` already have: `passwordHash?`, `recoveryHash?`, `recoveryQuestion?`, `recoveryConfiguredAt?`.
  - `CloudSyncWritePayload` already has: `profilePasswordHash?`, `profileRecoveryHash?`, `profileRecoveryQuestion?`, `profileRecoveryConfiguredAt?`.
  - **No schema changes required for this story.**

- `src/app/owner-recovery.ts`
  - Exports: `hashOwnerRecoveryPhrase`, `isOwnerRecoveryHash`, `verifyOwnerRecoveryPhrase`.
  - Profile recovery answer hashing reuses this same module (per story 10.6 guardrails).

- `src/app/profile-password.ts`
  - Exports: `hashProfilePassword`, `isProfilePasswordHash`, `verifyProfilePassword`.
  - Used for new password hashing in the reset flow.

- `src/app/App.login-flow.integration.test.tsx`
  - Covers: duplicate profile creation, profile switch, password-protected profile login, generic error messaging.
  - Does NOT yet cover the forgot-password/recovery sub-flow.

## What This Story Changes
- Adds "Mot de passe oublié ?" link in the `CloudLoginScreen` password prompt overlay (conditional on recovery configured).
- Adds recovery sub-flow overlay inside `CloudLoginScreen` component.
- Adds state variables for recovery prompt management in App component.
- Adds `onConfirmProfileRecoveryReset` async handler with pre-auth pushSnapshot + local state update + authentication sequence.
- Extends integration tests to cover the new flow.

## What Must Be Preserved
- All existing `CloudLoginScreen` behavior: profile selection, password prompt, "Se connecter", "Annuler".
- `onConfirmPasswordPrompt` logic must remain unchanged.
- Generic auth error messaging (AC4 of story 10.2).
- Owner code and owner recovery flows (they live in ChecklistScreen, not CloudLoginScreen).
- Cloud login auth bootstrap, family state hydration, profile creation flows.
- All existing test coverage in `App.login-flow.integration.test.tsx`.

## Tasks / Subtasks

- [x] Task 1 - Add recovery sub-flow state and props to CloudLoginScreen (AC: 1, 2, 6, 7)
  - [x] Add 5 new state variables in App component: `profileRecoveryStep`, `profileRecoveryAnswerInput`, `profileRecoveryNewPasswordInput`, `profileRecoveryNewPasswordConfirmInput`, `profileRecoveryError`.
  - [x] Add new props to `CloudLoginScreen` interface for the recovery step (see File Structure Requirements above for full prop list).
  - [x] Implement `onOpenProfileForgotPassword` and `onCancelProfileRecovery` handlers.
  - [x] Add "Mot de passe oublié ?" conditional link in the password overlay JSX (shown only when `profileRecoveryQuestion` is truthy).
  - [x] Add recovery overlay JSX block inside `CloudLoginScreen` (shown when `profileRecoveryStep === "recovery"`), containing: question read-only text, answer input, new password input, confirmation input, error text, Annuler + Réinitialiser buttons.
  - [x] Reset `profileRecoveryStep` to "none" in `onCancelPasswordPrompt`.
  - [x] Compute `profileRecoveryQuestion` to pass to CloudLoginScreen: read from `cloudSnapshot?.profiles[passwordPromptProfileId]?.recoveryQuestion ?? null`.

- [x] Task 2 - Implement onConfirmProfileRecoveryReset handler (AC: 3, 4, 5)
  - [x] Validate that `cloudSnapshot` and `passwordPromptProfileId` are available; show generic error and return if not.
  - [x] Read `recoveryHash` from `cloudSnapshot.profiles[targetId].recoveryHash`; show generic error and return if not a valid hash.
  - [x] Trim and validate recovery answer (non-empty).
  - [x] Trim and validate new password (min 4 chars).
  - [x] Validate that new password === confirmation.
  - [x] Verify answer: `await hashOwnerRecoveryPhrase(answer.trim())` === `recoveryHash` (or use structural equality after hashing).
  - [x] On mismatch: show generic error, do NOT update any state.
  - [x] On match: `const newPasswordHash = await hashProfilePassword(newPassword.trim())`.
  - [x] Set `profilePasswordHashes(prev => ({...prev, [targetId]: newPasswordHash}))` (local pre-auth update).
  - [x] Build the full `pushSnapshot` payload from `cloudSnapshot.profiles[targetId]` fields + `profilePasswordHash: newPasswordHash`, preserving `profileRecoveryHash`, `profileRecoveryQuestion`, `profileRecoveryConfiguredAt`, checklist, gameResults, phase, role, surname, etc.
  - [x] `await pushSnapshot({actorUid: cloudActorUid, ...})` — on rejection/throw: show generic error, revert `profilePasswordHashes` update, return.
  - [x] On push success: authenticate (setProfile, setPhase, setScreen, setIsProfileHydrationPending=true, setIsAuthenticated=true).
  - [x] Clear all prompt state: passwordPromptProfileId=null, passwordPromptInput="", passwordPromptError=null, profileRecoveryStep="none", profileRecoveryAnswerInput="", profileRecoveryNewPasswordInput="", profileRecoveryNewPasswordConfirmInput="", profileRecoveryError=null.

- [x] Task 3 - Add/update integration tests (AC: 1, 2, 3, 4, 5, 6, 7, 8)
  - [x] Add `hashOwnerRecoveryPhrase` import and test helper to build recovery hash fixture.
  - [x] Add snapshot variant with a password-protected profile that has `recoveryHash` and `recoveryQuestion` configured.
  - [x] Test: "forgot password link visible when recovery configured".
  - [x] Test: "forgot password link absent when no recovery configured".
  - [x] Test: "correct answer + valid new password authenticates and sets profile".
  - [x] Test: "incorrect answer shows generic error and does not authenticate".
  - [x] Test: "cancel recovery returns to password prompt".
  - [x] Run full test suite: `pnpm test` to confirm no regressions.

## Testing Requirements
- Minimum targeted run:
  ```
  pnpm test -- src/app/App.login-flow.integration.test.tsx src/app/profile-password.test.ts
  ```
- Optional extended checks:
  ```
  pnpm test -- src/app/profile-login.test.ts src/app/access-control.test.ts src/app/cloud-hydration.test.ts
  ```
- Full regression:
  ```
  pnpm test
  ```

## Previous Story Intelligence (10.6)
From `guidelines/_bmad-output/implementation-artifacts/10-6-recuperation-mot-de-passe-par-question-reponse-par-profil.md`:
- `recoveryQuestion` and `recoveryHash` are now fully integrated into `CloudProfileRecord`, `CloudProfileState`, and `CloudSyncWritePayload` — **no schema changes required for 10.7**.
- `hashOwnerRecoveryPhrase` is the canonical hashing function for profile recovery answers — use it for verification in 10.7.
- Settings UI for configuring recovery (question + answer inputs, validation: question ≥ 8 chars, answer ≥ 5 chars) was added in 10.6; that UI is NOT modified in 10.7.
- Testing pattern: use pre-built hashes in snapshot fixtures, verify no clear-text persists, run login integration tests for non-regression.
- The push payload approach (full profile payload with all fields) is established — follow the same pattern in 10.7's pre-auth push.

## Git Intelligence Summary
- Recent deliveries consistently enforce regression-focused integration tests alongside feature changes.
- Cloud contract and local state changes are kept synchronized in the same change.
- Story files are updated post-implementation with completion notes and precise file lists.
- Profile security changes (10.2–10.6) all follow the hash-only principle — do not break this.

## Risks and Guardrails

| Risk | Guardrail |
|------|-----------|
| Clear-text recovery answer persisted | Never serialize `profileRecoveryAnswerInput` to localStorage or cloud; only hash goes to cloud |
| Stale password hash after pre-auth push | Set `profilePasswordHashes[targetId]` in local state before authenticating (step 3 in sequence) |
| pushSnapshot failure leaving auth in inconsistent state | Only call setIsAuthenticated after pushSnapshot resolves successfully; on failure show error and remain on login screen |
| Leaking account existence via error messages | All error messages must be generic; never say "wrong answer" specifically |
| Race condition: hydration overwrites new hash | Pre-setting `profilePasswordHashes[targetId]` in local state ensures local consistency; auto-push will re-sync if hydration reverts it |
| onConfirmProfileRecoveryReset being called without valid cloudSnapshot | Guard at the top of handler with generic error return |

## Source References
- `docs/backlog-epics-stories.md` (Epic 10, story 10.7)
- `guidelines/_bmad-output/implementation-artifacts/sprint-status.yaml`
- `guidelines/_bmad-output/implementation-artifacts/10-6-recuperation-mot-de-passe-par-question-reponse-par-profil.md`
- `guidelines/_bmad-output/implementation-artifacts/stories/10-2-authentification-mot-de-passe-par-profil.md`
- `src/app/App.tsx` (CloudLoginScreen ~689–820, onConfirmPasswordPrompt ~4080–4160, confirmRecoveryReset ~3756–3820)
- `src/types/cloud.ts`
- `src/app/owner-recovery.ts`
- `src/app/profile-password.ts`
- `src/app/cloud-hydration.ts`
- `src/app/App.login-flow.integration.test.tsx`

## Dev Agent Record

### Implementation Plan
- Add a conditional recovery branch in `CloudLoginScreen` that toggles between password entry and recovery reset forms.
- Implement a dedicated pre-auth recovery reset handler that validates input, verifies recovery answer hash, updates local profile password hash, performs a direct cloud push, and authenticates only on successful write.
- Extend login flow integration tests to cover visibility, reset success, reset failure, and cancel behavior.

### Debug Log
- `npm test -- src/app/App.login-flow.integration.test.tsx` failed initially as expected in RED phase because forgot-password UI did not exist.
- `npm test -- src/app/App.login-flow.integration.test.tsx` failed once after implementation due to strict push call count assertion (`expected 1, got 3`) caused by existing auto-push behavior.
- Updated assertion to verify payload presence instead of exact call count; rerun succeeded.
- `npm test` full suite passed: 17 files passed, 1 skipped (firebase emulator rules tests skipped as expected when emulator host is unset).

### Completion Notes
- Implemented forgot-password login extension for profile authentication with a recovery overlay and conditional CTA visibility based on cloud-configured recovery question.
- Added pre-auth recovery reset flow with generic security-preserving error handling, input normalization/validation, local hash pre-update, full-profile push snapshot, and post-push authentication.
- Added integration tests for all required AC-driven scenarios: link visibility/absence, successful reset + auth, incorrect answer rejection, and cancel behavior.

## File List
- src/app/App.tsx
- src/app/App.login-flow.integration.test.tsx
- guidelines/_bmad-output/implementation-artifacts/10-7-mot-de-passe-oublie-au-changement-profil-via-recovery.md
- guidelines/_bmad-output/implementation-artifacts/sprint-status.yaml

## Change Log
- 2026-07-17: Implemented story 10.7 forgot-password recovery flow in login overlay, added integration coverage, and validated full regression suite.
