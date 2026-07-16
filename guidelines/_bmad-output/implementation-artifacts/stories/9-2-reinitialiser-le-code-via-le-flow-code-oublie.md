---
baseline_commit: fcddf9881e059581032a1bc4c7faf869ba2e3dc1
---

# Story 9.2 - Reinitialiser le code via le flow Code oublie

Statut: review
Epic: 9 - Recuperation d urgence du code proprietaire
Backlog source: BACKLOG-004
Date: 2026-07-10

## User Story
As a proprietaire,
I want verifier ma phrase de recuperation puis definir un nouveau code,
So that je retrouve l acces au deblocage du voyage.

## Acceptance Criteria
- AC1: Le lien `Code oublie ?` est visible depuis la popup de validation.
- AC2: Si la phrase de recuperation est correcte, le proprietaire peut definir un nouveau code.
- AC3: Si la phrase est incorrecte, le code n est pas modifie.
- AC4: Si aucune phrase n est configuree, le flow redirige vers Parametres/affiche un guidance message.

## Taches implementation
- [x] Ajouter le CTA `Code oublie ?` dans le flow de validation proprietaire.
- [x] Ajouter un modal/ecran de verification de phrase de recuperation.
- [x] Ajouter la saisie du nouveau code + confirmation.
- [x] Hasher et persister le nouveau code proprietaire.
- [x] Garder la phase verrouillee tant que le nouveau code n est pas confirme.

## Tests
- [x] Integration: reset reussi avec phrase correcte.
- [x] Integration: reset refuse avec phrase incorrecte.
- [x] Integration: reset indisponible sans secret configure.

## Definition of Done
- [x] Flow complet `Code oublie ?` operationnel.
- [x] Aucun secret en clair persiste.
- [x] Build et tests verts.

## Dev Agent Record

### Debug Log
- 2026-07-16: Added recovery reset flow integration tests first (red), then implemented owner forgot-code modal and reset logic in checklist validation flow.
- 2026-07-16: Full regression run completed with 51 passing tests, 3 skipped emulator rules tests.

### Implementation Plan
- Add a `Code oublie ?` action in owner validation popup.
- Introduce a dedicated recovery reset modal requiring phrase verification and new code confirmation.
- Keep journey locked until recovery phrase is valid and new owner code hash is persisted.
- Redirect to settings when no recovery phrase exists.
- Validate with dedicated integration tests plus full suite.

### Completion Notes
- Implemented owner forgot-code UX directly from the validation popup.
- Added strict phrase verification before owner code reset.
- Added new code + confirmation validation with clear error messaging.
- Persisted new owner code as SHA-256 hash only (no clear-text secret).
- Added integration tests for success, rejection, and missing recovery phrase guidance.

## File List
- src/app/App.tsx
- src/app/owner-recovery.integration.test.ts
- guidelines/_bmad-output/implementation-artifacts/sprint-status.yaml
- guidelines/_bmad-output/implementation-artifacts/stories/9-2-reinitialiser-le-code-via-le-flow-code-oublie.md

## Change Log
- 2026-07-16: Story 9.2 implemented and validated (forgot-code owner reset flow, integration tests, full regression pass).
