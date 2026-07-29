---
baseline_commit: be037390239d4dc5b0505c38dbd19ae1ff70f34d
story_id: "10.6"
story_key: "10-6-recuperation-mot-de-passe-par-question-reponse-par-profil"
epic: "10"
generated_at: "2026-07-17"
---

# Story 10.6: Profile password recovery via security question and answer

Status: review
Epic: 10 - Advanced profile management and checklist personalization
Story Key: 10-6-recuperation-mot-de-passe-par-question-reponse-par-profil
Date: 2026-07-17

## Story
As a profile user,
I want to configure a recovery question and answer for my profile password,
so that I can securely prove profile ownership in a later reset flow without storing clear-text secrets.

## Business Value
- Improves resilience of per-profile password protection introduced in Story 10.2.
- Prepares Story 10.7 forgot-password flow with explicit, profile-scoped recovery data.
- Preserves hash-only security model while making recovery configuration more understandable for end users.

## Acceptance Criteria (BDD)
1. Profile-scoped security question persistence
   Given a connected profile opens settings
   When they configure recovery data
   Then the profile has a persisted non-empty recovery question text
   And the answer is persisted only as hash.

2. Hash-only answer invariant
   Given recovery answer data is saved
   When inspecting local and cloud state
   Then no clear-text recovery answer is stored
   And existing hash format validation remains enforced.

3. Backward compatibility
   Given legacy profiles without explicit question text
   When data is parsed/hydrated
   Then app remains functional with safe default behavior
   And no runtime crash occurs.

4. Settings UX consistency
   Given a profile configures recovery data in settings
   When entering a question and answer with valid lengths
   Then save action succeeds with clear feedback
   And invalid inputs are rejected with explicit validation messages.

5. Cloud synchronization contract
   Given cloud mode is enabled
   When profile recovery data is pushed and reloaded
   Then recovery question and answer hash remain profile-scoped
   And existing profile password/login flow keeps passing.

## Scope
### In scope
- Introduce explicit profile recovery question field (profile scoped).
- Keep answer storage hash-only and reuse existing hashing utility contract.
- Update settings UI to capture question + answer together.
- Update cloud types/provider parsing and write payload for new field.
- Add/update tests for parser and settings/login integration safeguards.

### Out of scope
- Forgot-password reset flow at login screen (Story 10.7).
- Owner-code recovery flow changes (Epic 9 scope).
- New dependencies or backend schema migration scripts.

## Developer Guardrails

### Technical Requirements
- Reuse existing `hashOwnerRecoveryPhrase` hashing implementation for recovery answer storage.
- Introduce profile-level question field separately from answer hash.
- Keep profile-scoped stores and payloads deterministic:
  - local: profile state keyed by `profile.id`
  - cloud: `profiles/{profileId}` fields only.
- Use trim normalization for question and answer inputs before validation.

### Architecture Compliance
- Preserve ADR 11.3 and ADR 11.6 boundaries:
  - family-wide state remains unchanged
  - profile recovery data remains profile-scoped.
- Do not change owner uniqueness policy or access-control guards.
- Do not alter login authentication contract except necessary non-breaking type/data updates.

### Library/Framework Requirements
- No new dependency.
- Keep React/Vite/Vitest/Firebase modular SDK usage unchanged.

### File Structure Requirements
- UPDATE src/app/App.tsx
  - Current state:
    - profile recovery settings use single input phrase and `profileRecoveryHashes` map.
  - Story changes:
    - add recovery question input/state and save validation.
    - persist profile question map locally and cloud payload.
  - Must preserve:
    - existing profile password setup/remove behavior
    - owner recovery and owner code sections
    - cloud login flow.

- UPDATE src/types/cloud.ts
  - Add profile-level `recoveryQuestion` to record/state/write payload.

- UPDATE src/services/cloudSyncProvider.ts
  - Parse optional `recoveryQuestion` with backward compatibility.
  - Push `recoveryQuestion` in profile updates.

- UPDATE src/services/cloudSyncProvider.test.ts
  - Validate parsing and fallback behavior for `recoveryQuestion`.

- UPDATE src/app/App.login-flow.integration.test.tsx (or nearest relevant integration test)
  - Ensure no regression in protected profile login flow after contract update.

## Current State (Files Read)
- src/app/App.tsx
  - Supports profile password hash and profile recovery hash only.
  - Settings UI allows setting profile recovery phrase but no explicit question field.
- src/types/cloud.ts
  - Defines `recoveryHash` and `recoveryConfiguredAt` but no `recoveryQuestion`.
- src/services/cloudSyncProvider.ts
  - Parses/writes `recoveryHash` and `recoveryConfiguredAt`.
- src/services/cloudSyncProvider.test.ts
  - Covers recovery hash parsing and metadata compatibility.
- src/app/App.login-flow.integration.test.tsx
  - Covers cloud login/password flows and fail-closed behavior.

## What This Story Changes
- Adds explicit recovery question storage per profile.
- Keeps answer hash semantics unchanged.
- Tightens settings validation to require both question and answer for profile recovery save.
- Extends cloud profile contract with backward-compatible optional question field.

## What Must Be Preserved
- Generic auth error messaging in login flow.
- Fail-closed behavior for malformed password hash.
- Owner-only code and owner recovery capabilities.
- Existing checklist/profile metadata behavior.

## Tasks / Subtasks
- [x] Task 1 - Extend profile recovery data model (AC: 1, 2, 3, 5)
  - [x] Add `recoveryQuestion` support in cloud types (`CloudProfileRecord`, `CloudProfileState`, `CloudSyncWritePayload`).
  - [x] Parse optional `recoveryQuestion` in cloud provider with backward compatibility.
  - [x] Include `recoveryQuestion` in cloud push payload and local profile-scoped state.

- [x] Task 2 - Implement settings UX for security question + answer (AC: 1, 2, 4)
  - [x] Replace profile recovery single-input save with two inputs: question and answer.
  - [x] Enforce validation: question min 8 chars, answer min 5 chars.
  - [x] Persist answer hash only and clear transient plaintext input after successful save.

- [x] Task 3 - Add/update tests and run regressions (AC: 3, 5)
  - [x] Add parser tests for `recoveryQuestion` presence/absence.
  - [x] Add integration assertion around settings recovery save feedback and non-regression login flow.
  - [x] Run targeted and full test suites.

## Testing Requirements
- Minimum targeted run:
  - npm run test -- src/services/cloudSyncProvider.test.ts src/app/App.login-flow.integration.test.tsx src/app/profile-password.test.ts
- Optional focused unit checks:
  - npm run test -- src/app/profile-login.test.ts src/app/access-control.test.ts
- Full regression:
  - npm test

## Previous Story Intelligence (10.5)
From guidelines/_bmad-output/implementation-artifacts/10-5-mise-a-jour-contenu-checklist.md:
- Delivery process currently enforces strong AC-driven tests and sprint-status updates.
- Recent changes were content-centric in checklist and should not be impacted by this story.
- Keep changes isolated to profile auth/recovery paths.

## Git Intelligence Summary
Recent implementation trend:
- Story outputs include explicit regression-focused tests.
- Cloud contracts and app behavior are kept synchronized in same change.
- Story files are updated with completion notes and precise file lists.

## Latest Tech Information (Web Research)
- Current guidance remains: never store plaintext secrets in app state persistence or cloud payloads.
- Keep auth UX fail-closed and generic messaging for invalid credential inputs.
- Use minimal schema extension to preserve backward compatibility.

## Risks and Guardrails
- Risk: accidental clear-text persistence of recovery answer.
  - Guardrail: keep hashing before any persistence writes and never serialize answer input state.
- Risk: breaking existing login flow with cloud contract updates.
  - Guardrail: maintain optional field parsing and run login integration tests.
- Risk: ambiguous recovery UX with partial inputs.
  - Guardrail: require both question and answer and show explicit validation messages.

## Source References
- BACKLOG.md
- docs/backlog-epics-stories.md
- guidelines/_bmad-output/implementation-artifacts/sprint-status.yaml
- guidelines/_bmad-output/implementation-artifacts/10-5-mise-a-jour-contenu-checklist.md
- src/app/App.tsx
- src/types/cloud.ts
- src/services/cloudSyncProvider.ts
- src/services/cloudSyncProvider.test.ts
- src/app/App.login-flow.integration.test.tsx

## Project Context Reference
- Persistent fact glob `file:{project-root}/**/project-context.md` resolved with no matching file.
- Story context assembled from backlog, current implementation, tests, and sprint tracking artifacts.

## Completion Status
- Implementation completed.
- Status set to review.
- Completion note: Profile recovery question/answer model and settings UX are delivered with passing targeted and full regressions.

## Dev Agent Record

### Agent Model Used
GPT-5.3-Codex

### Debug Log References
- Workflow activation and config resolution completed.
- Sprint status fully read and explicit story 10.6 target applied.
- Relevant code and tests analyzed before implementation.
- RED: `npm run test -- src/services/cloudSyncProvider.test.ts src/app/App.login-flow.integration.test.tsx` (expected failures on missing recovery question support/UI).
- GREEN: `npm run test -- src/services/cloudSyncProvider.test.ts src/app/App.login-flow.integration.test.tsx` (all passing).
- Regression: `npm test` (all passing; firebase rules tests skipped without emulator host).

### Implementation Plan
- Add optional `recoveryQuestion` field end-to-end (types, provider, app state).
- Update settings UI save action to require question + answer and persist answer hash only.
- Add parser + integration test coverage and run full regressions.

### Completion Notes List
- Added profile recovery question contract to cloud types and payloads.
- Implemented backward-compatible parse/push for `recoveryQuestion` in cloud provider.
- Added profile-scoped local persistence map for recovery questions.
- Updated Settings screen to configure question + answer with validation (question >= 8, answer >= 5).
- Preserved hash-only answer storage by hashing answer before persistence.
- Added integration test for recovery question settings and parser tests for presence/blank handling.
- Targeted and full Vitest suites passed.

### File List
- guidelines/_bmad-output/implementation-artifacts/10-6-recuperation-mot-de-passe-par-question-reponse-par-profil.md
- guidelines/_bmad-output/implementation-artifacts/sprint-status.yaml
- src/app/App.tsx
- src/types/cloud.ts
- src/services/cloudSyncProvider.ts
- src/services/cloudSyncProvider.test.ts
- src/app/App.login-flow.integration.test.tsx

## Change Log
- 2026-07-17: Created Story 10.6 context file with comprehensive implementation guidance and acceptance-driven task plan.
- 2026-07-17: Implemented Story 10.6 with profile recovery question + hashed answer support across settings, local/cloud persistence, and regression tests.
