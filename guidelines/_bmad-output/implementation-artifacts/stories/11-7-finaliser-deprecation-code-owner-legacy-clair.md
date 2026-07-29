# Story 11.7 - Finaliser deprecation code owner legacy clair

Statut: done
Epic: 11 - Continuite numerique post-diagnostic (stabilisation multi-appareils)
Backlog source: Story 11.7
Date: 2026-07-15

## User Story
As a equipe securite,
I want supprimer completement le support du code owner en clair,
So that aucun secret sensible ne reste en legacy.

## Acceptance Criteria
- AC1: Le fallback `jp-owner-code` en clair n est plus utilise.
- AC2: Seul `jp-owner-code-hash` est accepte pour les flux actifs.
- AC3: Une migration sure est prevue pour les anciens clients si necessaire.
- AC4: Aucun secret sensible n est persiste en clair apres execution.

## Taches implementation
- [x] Retirer la lecture legacy du code clair.
- [x] Verifier tous les chemins de persistance owner code.
- [x] Ajouter logs migration/surveillance pour rollout.
- [x] Mettre a jour docs securite.

## Tests
- [x] Unit: verification hash uniquement.
- [x] Integration: client legacy migre sans code en clair.
- [x] Regression: deblocage owner reste fonctionnel.

## Definition of Done
- [x] Plus aucun chemin runtime ne lit/ecrit le code clair.
- [x] Migration legacy couverte.
- [x] Build et tests verts.

## Sequencement
- Story active juste apres 11-6 done.
- 11-8 est conservee comme gate finale de non-regression multi-appareils avant cloture Epic 11.

## Dev Agent Record

### Debug Log
- 2026-07-15: suppression du fallback runtime clear-text dans `owner-code` et `App`.
- 2026-07-15: ajout d une migration legacy dediee (`jp-owner-code` -> `jp-owner-code-hash`) avec purge de la cle clear-text.
- 2026-07-15: execution des tests cibles owner/cloud et de la suite complete Vitest.
- 2026-07-15: validation build production Vite reussie.

### Completion Notes
- Verification owner code en mode hash-only: les valeurs non hash ne sont plus acceptees.
- Initialisation runtime `ownerCodeHash` alignee sur `jp-owner-code-hash` uniquement.
- Migration legacy maintenue dans un effet dedie avec logs de surveillance (`console.info`/`console.warn`) et purge clear-text.
- Documentation securite ajoutee pour tracer decisions, migration et observabilite rollout.
- Gate de regression validee: tests cibles + suite complete + build vert.

## File List
- src/app/owner-code.ts
- src/app/owner-code.test.ts
- src/app/App.tsx
- docs/security/owner-code-deprecation-11-7.md

## Change Log
- 2026-07-15: deprecation complete du support owner code en clair en runtime, migration legacy dediee et documentation securite associee.
- 2026-07-15: story validee et cloturee en done apres completion des gates de tests et build.
