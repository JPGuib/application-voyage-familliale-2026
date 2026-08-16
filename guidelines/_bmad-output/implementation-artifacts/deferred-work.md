- source_spec: `guidelines/_bmad-output/implementation-artifacts/spec-integrer-mots-croises-turquie.md`
	summary: Validate every restored `jp-screen` value against role, phase, and connectivity before applying it.
	evidence: Adversarial review found the existing cloud restoration paths assign persisted screens directly, which can bypass access policy for any restricted route; this behavior predates the crossword integration and requires a dedicated cross-route fix.
# Deferred Work

## Deferred from: code review of 9-2-reinitialiser-le-code-via-le-flow-code-oublie (2026-07-16)

- `recoveryError` cleared by all field change handlers regardless of error context — all three `onRecovery*Change` handlers unconditionally clear `recoveryError`; a "Phrase incorrecte" error disappears when typing in the new-code field. Cosmetic UX inconsistency. [src/app/App.tsx — recovery change handlers]
- Double-submit race on reset button — no `disabled` prop during async execution; rapid double-clicks can fire two concurrent resets. Low actual risk in family travel context. [src/app/App.tsx — recovery modal button]
- `ChecklistScreen` prop count explosion — 11 new props added solely to host the recovery modal; second call site (travel phase) requires 11 no-op stubs. Pre-existing architectural pattern, consider extracting recovery modal as sibling component. [src/app/App.tsx — `ChecklistScreen`]
- Recovery modal inputs have no accessible labels — password inputs use only placeholder attributes; no `<label>` or `aria-label`. Pre-existing pattern, a11y improvement out of scope for this story. [src/app/App.tsx — recovery modal inputs]
- `openForgotCodeFlow` navigates to settings with no in-flow explanation — when no recovery phrase configured, modal closes and app navigates silently to settings. Settings screen shows "Aucune phrase configurée pour le moment." which explains the situation. A toast message before navigation would improve UX. [src/app/App.tsx — `openForgotCodeFlow`]

## Deferred from: code review of 10-1-regles-visibilite-rubriques-role-deblocage.md (2026-07-17)

- Place screen can render blank content when selected place is missing because rendering returns `null`; this appears pre-existing and should be handled in a dedicated navigation resilience pass. [src/app/App.tsx — `renderScreen` place branch]

## Deferred from: code review of 10-4-adaptation-checklist-par-profil (2026-07-17)

- SettingsScreen local metadata state stale on concurrent cloud sync — `useState<Gender>(profile.gender)` captures gender at mount time; cloud sync during open session can be silently overwritten on Save. Low frequency in single-family context. [src/app/App.tsx:SettingsScreen ~line 2161]
- profileFilterInput.role defaults to "utilisateur" during null-role bootstrap — owner checklist briefly under-filtered until role hydration; access-control guards prevent checklist render before hydration in practice. [src/app/App.tsx ~line 3212]
- Profile-switch test doesn't assert cross-profile filter leakage (AC6) — test terminates at login screen, never renders a second profile to confirm metadata is reset. Partial coverage gap. [src/app/App.login-flow.integration.test.tsx — metadata hydration suite]
- No integration test for localStorage metadata persistence in non-cloud mode — parse guards for gender/householdRole exist and appear correct but lack integration-level verification. [src/app/App.tsx ~line 2571]
