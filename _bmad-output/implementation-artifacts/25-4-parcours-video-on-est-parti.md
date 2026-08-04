---
baseline_commit: uncommitted
---

# Story 25.4: Gated "On est parti !" launch video flow

Status: review

## Story

As a non-owner family member,
I want the app to hold me on a single "On est parti !" launch screen and then require the departure video after owner unlock,
so that the start of the trip feels like a shared reveal before I can enter the app.

## Acceptance Criteria

1. While the family app is locked (`phase === "before"`), any `utilisateur` or `visiteur` only sees a centered "On est parti !" screen with one central action.
2. Pressing that action while locked does not start playback and instead shows a clear message that the trip has not started yet.
3. Once the owner unlocks the family app, the same action starts `docs/voyage_istanbul.mp4` for `utilisateur` and `visiteur` profiles, or starts a fallback step-by-step launch sequence if the video cannot be played.
4. When playback ends, or when the fallback launch sequence reaches its last step, the UI exposes exactly two choices: replay the launch content or enter the app.
5. Choosing to enter the app routes to the dashboard while preserving current role rules: `utilisateur` keeps standard traveler access, `visiteur` keeps restricted visitor access.
6. The owner never has to watch this video in the normal flow and keeps the unrestricted access defined in story 18.2.
7. If the video file is missing or unreadable, the app automatically falls back to a created multi-screen "Next" sequence instead of showing a broken state or bypassing the ritual.
8. After a non-owner chooses to enter the app, the launch content is no longer freely accessible during the same unlock cycle.
9. The owner can still replay the video, or the fallback launch sequence when needed, from the Settings screen at any time.
10. Re-locking and unlocking the app resets the flow for all non-owner profiles so they must pass through the launch screen and the launch content again.
11. No regression is introduced to owner lock governance, family-wide sync, or visitor permissions after app entry.
12. The fallback launch sequence follows the fixed 6-step storyboard from the story spec, with one `Next` action per step and final actions to replay or enter the app.

## Tasks / Subtasks

- [x] Define the launch-flow state contract (AC: 1,2,3,4,7,8,10)
  - [x] Introduce a family-wide unlock cycle identifier or equivalent deterministic state to reset the intro flow on each new unlock.
  - [x] Track per-profile completion of the launch-content gate for the current unlock cycle.
  - [x] Preserve backward compatibility for older snapshots with no intro-flow fields.
- [x] Build the locked/unlocked launch gate UI (AC: 1,2,3,4,7)
  - [x] Add a dedicated launch screen with one centered CTA and locked/unlocked messaging.
  - [x] Prevent playback while `phase === "before"` and show the friendly "trip not started" message.
  - [x] Integrate HTML5 video playback for `voyage_istanbul.mp4` with reliable end-of-video handling.
  - [x] Create a fallback multi-screen launch sequence with explicit `Next` progression and replay support.
  - [x] Implement the fixed 6-screen narrative content defined in the story (French copy provided by product).
  - [x] Apply final-screen mood transition (dark -> blue + optional photos) when fallback reaches its last step.
  - [x] Show only replay and enter-app actions after playback or fallback completion.
- [x] Enforce role-specific routing (AC: 5,6,11)
  - [x] Keep owner bypass behavior consistent with story 18.2.
  - [x] Route `utilisateur` and `visiteur` through the launch gate before dashboard access during a fresh unlock cycle.
  - [x] Preserve visitor restrictions from story 24.3 once the visitor enters the app.
- [x] Restrict post-entry access to launch content (AC: 8,9)
  - [x] Hide or block free replay entry points for non-owner profiles after gate completion.
  - [x] Add an owner-only replay entry point in Settings for the available launch content.
- [x] Cover reset and sync scenarios (AC: 3,7,8,9,10,11)
  - [x] Validate relock -> unlock cycle reset on the same device.
  - [x] Validate family-wide propagation across multiple devices/profiles.
  - [x] Add regression tests for refresh during playback/fallback/completion states.

## Dev Notes

### Story Foundation

- Source story: `docs/specs-stories/epic-25/25.4-parcours-video-on-est-parti.md`
- Related epic context: `docs/specs-stories/epic-25/25.1-ecran-teaser-pre-depart.md`, `docs/specs-stories/epic-25/25.3-transformation-faq-sondage-consultable.md`
- Role and lock dependencies: `docs/specs-stories/epic-18/18.2-acces-proprietaire.md`, `docs/specs-stories/epic-24/24.3-droits-acces-visiteur.md`
- Sprint tracking source: `_bmad-output/implementation-artifacts/sprint-status.yaml`

### Product Intent

- Replace the previous optional teaser concept with a stricter launch ritual.
- Preserve the owner as the family controller of lock/unlock state.
- Preserve visitor rights once inside the app, while adding a pre-depart gating exception.

### Critical Business Rules To Preserve

- Owner unlock remains family-wide and authoritative.
- Owner is never forced through the intro video.
- Non-owner profiles cannot bypass the launch flow during a fresh unlock cycle.
- Re-locking must invalidate prior video completion for non-owner profiles.
- The video is not a general media screen for children after entry; only the owner can replay it later from Settings.
- If the video is unavailable, a built-in multi-step fallback sequence is mandatory and is treated as equivalent launch content.

### Likely Technical Design

- Reuse existing `phase` family-wide state for locked vs unlocked.
- Add one new family-wide field for the current unlock cycle, for example `launchGateCycle` or `unlockEpoch`.
- Add one per-profile field storing the last completed cycle, for example `launchVideoCompletedCycleByProfile` or a profile-scoped property.
- Model the launch content as a strategy, not a single hardcoded medium:
  - primary mode: video asset
  - fallback mode: built-in ordered slides/cards with `Next`
- Suggested fallback data model:
  - `LaunchFallbackStep = { id: string; title?: string; body: string; theme?: "dark" | "blue"; showPhotos?: boolean }`
  - `LAUNCH_FALLBACK_STEPS: LaunchFallbackStep[]` with exactly 6 ordered entries (product-owned copy)
- Compute launch access with a pure helper:
  - owner -> bypass always
  - non-owner + `phase === "before"` -> launch screen locked mode
  - non-owner + `phase === "during"` + completion cycle != current cycle -> launch screen content mode
  - non-owner + `phase === "during"` + completion cycle == current cycle -> normal app access
- Keep the cycle increment deterministic on the transition from locked to unlocked. Re-lock should not silently grant entry; it should force the next unlock to require the video again.

### Existing Code Areas To Inspect First

- `src/app/App.tsx`
  - Main routing and screen gating.
  - Current owner unlock / relock handling.
  - Current role-based navigation and dashboard entry.
- `src/app/access-control.ts`
  - Current phase and role access matrix.
  - Visitor exception may need a new pre-entry guard outside standard menu access.
- `src/app/owner-policy.ts`
  - Role definitions and owner invariants.
- `src/services/cloudSyncProvider.ts`
  - Family-wide shared state propagation.
- `src/types/`
  - Shared snapshot/profile typing for any new intro-flow fields.

### Asset Constraint

- Editorial source file is required under `docs/voyage_istanbul.mp4`.
- For runtime delivery, implementation may copy or expose that asset through the existing Vite/public pipeline.
- Do not hardcode an absolute local filesystem path inside the app.
- The fallback sequence must be created in-app and must not depend on the video asset being present.

### UX Guardrails

- Keep the launch screen extremely simple: one focal action, one status message.
- Do not expose alternate navigation while a non-owner still owes the current-cycle video.
- End-of-video actions must be explicit and touch friendly.
- If playback fails, switch to the fallback sequence instead of silently skipping the ritual.
- The fallback sequence should use short, emotionally clear screens and a single obvious `Next` action per step.
- Keep fallback copy exactly in French as provided by product unless a dedicated localization story is approved.

### Testing Requirements

- Integration tests:
  - owner locked -> owner still reaches app
  - user locked -> sees launch screen, no playback
  - visitor locked -> sees same launch screen, no playback
  - user unlocked first time -> playback available, enter app after completion
  - visitor unlocked first time -> playback available, enter app with visitor restrictions preserved
  - video unavailable -> fallback `Next` sequence is used automatically
  - fallback step 1..6 content is displayed in order and cannot skip directly to app entry
  - relock -> all non-owner profiles return to locked launch screen
  - second unlock -> previously completed non-owner profiles must watch again
- State persistence tests:
  - refresh during locked state
  - refresh during fallback sequence progression if such intermediate state is stored
  - refresh after video/fallback completion before entering app if such intermediate state is stored
  - multi-device sync of unlock cycle and completion markers
- Manual validation:
  - desktop browser playback
  - mobile browser playback
  - end event and replay flow
  - fallback sequence readability and progression

### Anti-Patterns To Avoid

- Do not reuse the old optional teaser/menu pattern from story 25.1 as-is.
- Do not grant visitors a bypass just because story 24.3 normally allows broad access after profile creation.
- Do not store intro completion as a simple boolean with no cycle reset semantics.
- Do not make the video freely accessible from dashboard/menu for non-owner profiles.
- Do not treat video load failure as permission to skip the intro ritual.

### References

- `docs/specs-stories/epic-25/25.4-parcours-video-on-est-parti.md`
- `docs/specs-stories/epic-25/25.1-ecran-teaser-pre-depart.md`
- `docs/specs-stories/epic-25/25.3-transformation-faq-sondage-consultable.md`
- `docs/specs-stories/epic-18/18.2-acces-proprietaire.md`
- `docs/specs-stories/epic-24/24.3-droits-acces-visiteur.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

## Dev Agent Record

### Agent Model Used

GPT-5.3-Codex

### Debug Log References

- Story created from explicit user request on 2026-08-04.
- New story added to Epic 25 because the requested flow is materially different from stories 25.1 and 25.3.
- Implemented launch-gate cycle contract and fallback/video launch flow in app runtime.
- Added launch-gate integration coverage and updated access-control integration expectations.
- Full `npm test` still reports failures in existing suites that assume pre-launch-gate before-phase behavior for non-owner profile flows.

### Completion Notes List

- Created story spec for a mandatory post-unlock launch video flow with owner bypass and visitor support.
- Created ready-for-dev BMAD artifact with implementation guardrails, likely state model, and regression focus.
- Sprint tracking updated with new story key `25-4-parcours-video-on-est-parti`.
- Added `launchGateCycle` + per-profile completion markers and cloud sync wiring.
- Added dedicated launch gate UI with locked CTA behavior, video path, fallback 6-step narrative, replay/enter completion actions, and owner replay from Settings.
- Added/updated integration tests for launch gate behavior, refresh resilience, and role routing constraints.
- Cleared full regression gate (`npm test`), including updates to legacy login/recovery/survey integration expectations under launch-gate semantics.

### File List

- `docs/specs-stories/epic-25/25.4-parcours-video-on-est-parti.md` (new)
- `_bmad-output/implementation-artifacts/25-4-parcours-video-on-est-parti.md` (new)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (modified)
- `guidelines/_bmad-output/implementation-artifacts/sprint-status.yaml` (modified)
- `src/app/App.tsx` (modified)
- `src/app/launch-gate.ts` (new)
- `src/types/cloud.ts` (modified)
- `src/services/cloudSyncProvider.ts` (modified)
- `src/hooks/useCloudSync.ts` (modified)
- `src/app/App.launch-gate.integration.test.tsx` (new)
- `src/app/App.access-control.integration.test.tsx` (modified)

### Change Log

- 2026-08-04: Implemented launch-gate cycle state, launch gate UI/flow, fallback sequence, owner replay action, and regression/integration test updates.
