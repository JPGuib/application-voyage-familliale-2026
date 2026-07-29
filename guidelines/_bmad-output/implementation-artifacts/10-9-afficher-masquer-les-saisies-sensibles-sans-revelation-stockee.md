---
baseline_commit: "72c2e07eee40672c76a43bc04958951e8d1ff65d"
story_id: "10.9"
story_key: "10-9-afficher-masquer-les-saisies-sensibles-sans-revelation-stockee"
epic: "10"
generated_at: "2026-07-17"
---

# Story 10.9: Show or hide sensitive inputs without revealing stored secrets

Status: review
Epic: 10 - Advanced profile management and checklist personalization
Story Key: 10-9-afficher-masquer-les-saisies-sensibles-sans-revelation-stockee
Date: 2026-07-17

## Story
As a profile user,
I want to temporarily show or hide what I type in sensitive fields,
so that I can avoid typing mistakes on mobile and still keep stored secrets non-recoverable.

## Business Value
- Reduces UX friction on mobile and shared-device usage for password/recovery/code entry.
- Prevents support churn caused by hidden-character typos.
- Preserves the existing hash-only security model (no stored-secret revelation).
- Completes the password lifecycle introduced in stories 10.2, 10.6, 10.7, and 10.8.

## Acceptance Criteria (BDD)

1. Sensitive input fields expose a local show/hide toggle
   Given the user is on any screen with a sensitive input
   When the user taps the visibility control
   Then only the current input display mode switches between masked and plain text
   And the underlying typed value remains unchanged.

2. Default state remains masked
   Given a sensitive input field is first rendered
   When no interaction occurred
   Then the field is masked by default (password mode).

3. Stored secrets cannot be revealed
   Given a secret is stored as a hash in cloud or local state
   When the user uses show/hide controls
   Then no feature displays the original stored secret value
   And no reverse transformation from hash to clear text is introduced.

4. Scope covers existing sensitive flows in login, settings, and unlock dialogs
   Given the current app supports profile password, profile recovery, owner code, and owner recovery flows
   When story 10.9 is implemented
   Then all existing sensitive entry points in these flows have consistent show/hide behavior
   And existing flow semantics are preserved.

5. Session and persistence safety
   Given show/hide controls are used during typing
   When values are written to app state or cloud payloads
   Then only trimmed user input values are used for existing validation/hashing paths
   And no new clear-text secret persistence key/path is created.

6. Accessibility and labeling
   Given a sensitive input has a visibility toggle
   When assistive technology is used
   Then the control has a clear text label indicating current action (Show/Hide typed value)
   And keyboard/touch interactions remain functional.

7. Non-regression
   Given existing tests for login, forgot-password, in-session password change, owner recovery, and start-unlock
   When 10.9 changes are introduced
   Then existing tests continue passing
   And new tests verify visibility behavior in representative sensitive flows.

## Scope
### In scope
- Add or normalize show/hide behavior for sensitive inputs already present in UI.
- Ensure behavior consistency across overlays and settings blocks.
- Add focused tests for display-mode toggling and regression safety.

### Out of scope
- Revealing any already stored secret.
- Changing hash algorithms, cloud schema, or authentication contracts.
- New recovery channels (email/SMS/MFA).
- Security policy redesign beyond current story boundaries.

## Developer Guardrails

### Critical implementation sequence
1. Inventory all sensitive input entry points already in `src/app/App.tsx`.
2. Ensure each entry point has local visibility state with default masked mode.
3. Reuse existing state lifecycles (open, submit, cancel, reset) without changing auth/write contracts.
4. Ensure no toggle mutates persisted hash fields or payload contracts.
5. Add tests for visibility toggles in at least login prompt, in-session password change, and checklist unlock/recovery dialog.

### Technical requirements
- Reuse existing UI patterns and state style in `App.tsx` (local `useState<boolean>` flags + text button toggle).
- Keep existing generic auth/recovery errors unchanged.
- Keep existing hash-only utilities unchanged:
  - `src/app/profile-password.ts`
  - `src/app/owner-recovery.ts`
  - `src/app/owner-code.ts`
- No new dependency.

### Architecture compliance
- Preserve ADR 11.3 cloud-authoritative behavior for shared profile data.
- Do not change `pushSnapshot` payload semantics.
- Do not alter owner policy/ownership invariants.
- Do not bypass re-authentication requirements in current password-change flow.

### Library/framework requirements
- React + Vite + Vitest + Firebase modular SDK unchanged.
- Native HTML `input` `type=password|text` switching only; no third-party visibility widget.

### File structure requirements
- UPDATE `src/app/App.tsx`
  - Current state:
    - Multiple sensitive forms already include some show/hide controls.
    - Coverage is not guaranteed to be globally consistent across all sensitive entry points.
  - Story changes:
    - Normalize visibility toggle behavior and labels across all sensitive inputs in:
      - `CloudLoginScreen` password prompt and recovery reset fields.
      - `SettingsScreen` profile password setup/change/recovery and owner code/recovery fields.
      - `ChecklistScreen` start unlock and owner recovery dialogs.
    - Ensure default masked mode on each flow open/reset.
    - Ensure toggles only affect input display mode.
  - Must preserve:
    - Existing 10.7 and 10.8 auth/recovery semantics.
    - Existing owner recovery guard behavior and lockout handling.
    - Existing cloud hydration and push guard behavior.

- UPDATE `src/app/App.login-flow.integration.test.tsx`
  - Add tests confirming visibility controls in login-related sensitive forms:
    - password prompt show/hide
    - forgot-password recovery inputs show/hide where applicable
  - Preserve all existing authentication behavior assertions.

- OPTIONAL UPDATE `src/app/owner-recovery.integration.test.ts` or related integration suites
  - Add coverage for checklist unlock/recovery modal show/hide consistency if not covered via App integration tests.

## Current State (Files Read Completely)
- `src/app/App.tsx`
  - Sensitive inputs exist in three main areas:
    - Checklist unlock/recovery overlays (`ChecklistScreen`) already using local show/hide booleans.
    - Login prompt and login-recovery overlay (`CloudLoginScreen`) currently use masked password types without dedicated show/hide toggles.
    - Settings blocks for profile/owner secret management include mixed show/hide support.
  - `changeProfilePasswordInSession` and login recovery handlers preserve generic error messaging and hash-only writes.

- `src/app/App.login-flow.integration.test.tsx`
  - Strong coverage for 10.7/10.8 auth behavior and recovery flows.
  - No explicit assertions yet for visibility toggle behavior in login-sensitive fields.

- `src/app/profile-password.ts`
  - Trims input and verifies strict `sha256:` hash format.

- `src/app/owner-recovery.ts`
  - Trims input and verifies strict `sha256:` hash format.

## What this story changes
- Introduces/normalizes show-hide UX on login-sensitive fields where missing.
- Aligns all sensitive entry points to the same visibility behavior expectations.
- Adds explicit regression tests for visibility toggles without changing auth logic.

## What must be preserved
- Hash-only storage invariants and non-reversibility.
- Generic auth/recovery error responses.
- Existing cloud write and hydration contracts.
- Existing owner-only rules and lockout behavior.

## Tasks / Subtasks

- [x] Task 1 - Normalize sensitive field visibility toggles across UI (AC: 1, 2, 4, 6)
  - [x] Inventory all sensitive inputs in login/settings/unlock flows.
  - [x] Add missing show/hide toggles where absent.
  - [x] Ensure labels are explicit and consistent.
  - [x] Default all to masked mode on first render and after flow reset/cancel.

- [x] Task 2 - Guard security invariants while toggling (AC: 3, 5)
  - [x] Confirm toggles do not alter hashing, validation, or push payload contracts.
  - [x] Confirm no new clear-text persistence path is introduced.
  - [x] Confirm stored hashes are never rendered as recoverable secrets.

- [x] Task 3 - Add test coverage and run regression (AC: 7)
  - [x] Add integration tests for visibility toggles in login prompt and in-session sensitive forms.
  - [x] Keep existing auth behavior tests unchanged and passing.
  - [x] Run targeted tests and full suite.

## Testing requirements
- Minimum targeted run:
  - `pnpm test -- src/app/App.login-flow.integration.test.tsx`
- Recommended focused run:
  - `pnpm test -- src/app/owner-recovery.integration.test.ts src/app/owner-recovery.test.ts src/app/profile-password.test.ts`
- Full regression:
  - `pnpm test`

## Previous story intelligence (10.8)
- Story 10.8 established dual proof in-session password change with strict generic errors and rollback on cloud push failure.
- Story 10.9 must not alter that verification/write sequence; only input visibility UX may evolve.
- Existing pattern in this codebase uses local boolean state and explicit button labels for show/hide.

## Git intelligence summary
- Last 5 commits are concentrated in:
  - `src/app/App.tsx`
  - `src/app/App.login-flow.integration.test.tsx`
  - cloud sync/provider/types and sprint status updates
- Working convention: feature behavior and regression tests are committed together.
- Story context/status files are synchronized with implementation lifecycle.

## Latest technical information (web research)
Source checked: MDN input password reference (last modified 2026-06-09) and OWASP Authentication Cheat Sheet (2026 content).
- MDN: temporary plain-text display toggling is a valid UX pattern for password fields; default masked behavior remains expected.
- MDN: use semantic input attributes (`type=password`, `autocomplete=current-password|new-password` where relevant).
- OWASP: keep generic authentication error responses to avoid discrepancy factors.
- OWASP: sensitive changes should keep re-authentication semantics intact.

## Risks and guardrails
- Risk: accidental secret leakage by displaying stored hash/source value.
  - Guardrail: toggles only apply to live input control type; never map from persisted hash to UI clear text.
- Risk: behavioral regression in 10.7/10.8 recovery and in-session password change flows.
  - Guardrail: preserve handlers and only augment presentation state.
- Risk: inconsistent UX across screens.
  - Guardrail: normalize labels/default state and add integration assertions.

## Source references
- docs/backlog-epics-stories.md (Epic 10 reprioritization and 10.9 definition)
- guidelines/_bmad-output/implementation-artifacts/sprint-status.yaml
- guidelines/_bmad-output/implementation-artifacts/10-8-changement-mot-de-passe-en-session-ancien-ou-recovery.md
- guidelines/_bmad-output/implementation-artifacts/10-7-mot-de-passe-oublie-au-changement-profil-via-recovery.md
- guidelines/_bmad-output/planning-artifacts/adr-11-3-source-of-truth-cloud-local.md
- guidelines/_bmad-output/planning-artifacts/adr-11-6-deblocage-famille-wide-contract.md
- src/app/App.tsx
- src/app/App.login-flow.integration.test.tsx
- src/app/profile-password.ts
- src/app/owner-recovery.ts
- https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/password
- https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html

## Project context reference
- Persistent facts configured: `file:{project-root}/**/project-context.md`
- Resolution result: no matching project-context file found in workspace.

## Completion status
- Ultimate context engine analysis completed - comprehensive developer guide created.
- Story status set to ready-for-dev.

## Dev agent record

### Agent model used
GPT-5.3-Codex

### Debug log references
- Workflow activation resolved via `_bmad/scripts/resolve_customization.py`.
- Sprint status fully read and story target resolved from user argument 10.9.
- Exhaustive reads performed on prior stories 10.7 and 10.8, current App/login integration code, and available planning ADRs.
- Git intelligence extracted from last 5 commits and touched files.
- Web references validated for current password visibility and auth error guidance.

### Completion notes list
- Story 10.9 context prepared with explicit anti-regression and anti-leakage guardrails.
- UPDATE-file analysis documented for App + integration tests.
- No UX planning artifact found in planning-artifacts UX folder; fallback context used from code and backlog.
- **Task 1 complete**: Normalized show/hide toggles across all sensitive inputs.
  - `CloudLoginScreen`: added 4 local useState flags (showPasswordPrompt, showRecoveryAnswer, showRecoveryNewPassword, showRecoveryConfirm) + 2 useEffect resets (on overlay close and on recovery step change). All 4 password inputs now toggle between masked/plain text with consistent French button labels.
  - `SettingsScreen` password change flow: added 3 local useState flags (showPasswordProofInput, showPasswordChangeInput, showPasswordChangeConfirmInput). All 3 inputs now toggle. Flags are reset in resetPasswordChangeFlow.
- **Task 2 complete**: Security invariants verified by implementation. Toggles only affect `input type` attribute (password/text). No handler, hash utility, or push payload was modified. No clear-text persistence path created.
- **Task 3 complete**: Added 3 integration tests in App.login-flow.integration.test.tsx:
  - "defaults password prompt input to masked mode and toggles visibility"
  - "defaults recovery overlay inputs to masked mode and toggles each independently"
  - "defaults in-session password change inputs to masked mode and toggles visibility"
  - All 28 tests in the file pass. Full suite: 154 passed, 0 failed, 3 skipped (Firebase emulator, environment-dependent).

### File list
- guidelines/_bmad-output/implementation-artifacts/10-9-afficher-masquer-les-saisies-sensibles-sans-revelation-stockee.md
- guidelines/_bmad-output/implementation-artifacts/sprint-status.yaml
- src/app/App.tsx
- src/app/App.login-flow.integration.test.tsx

### Change log
- 2026-07-17: Implemented story 10.9 — normalized show/hide visibility toggles across all sensitive inputs in CloudLoginScreen (password prompt + recovery flow: 4 toggles) and SettingsScreen password change flow (3 toggles). Added 3 integration tests for visibility toggle behavior. All 154 tests pass.
