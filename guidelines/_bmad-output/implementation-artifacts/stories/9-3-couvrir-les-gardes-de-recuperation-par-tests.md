---
baseline_commit: 889570fa709acd373e5a7b24178afa3e7c983b83
---

# Story 9.3 - Couvrir les gardes de recuperation par tests

Statut: done
Epic: 9 - Recuperation d urgence du code proprietaire
Backlog source: BACKLOG-004
Date: 2026-07-10

## User Story
As a equipe produit,
I want automatiser les cas critiques du flow de recuperation,
So that une regression de securite soit detectee avant livraison.

## Acceptance Criteria
- AC1: Un user non-owner ne peut pas lancer ni terminer le flow de recuperation.
- AC2: Sans phrase de recuperation configuree, le reset n est pas possible.
- AC3: Avec phrase correcte, un nouveau code peut etre defini puis reutilise pour debloquer la phase.

## Taches implementation
- [x] Ajouter tests unitaires sur guards owner recovery.
- [x] Ajouter tests integration sur flow reset.
- [x] Ajouter scenario e2e minimal owner forgot code -> reset -> unlock.
- [x] Documenter les preconditions de test.

## Tests
- [x] Unit: refus reset si profil actif != owner.
- [x] Unit: refus reset si ownerRecoveryHash absent.
- [x] Integration: nouveau code actif apres reset.
- [x] E2E: owner reset puis debloque le voyage.

### Preconditions de test
- Les tests UI mockent useCloudSync pour forcer un contexte local (cloud desactive).
- Le profil actif et l etat famille sont prepares en localStorage avant rendu.
- Le hash du code owner et le hash de phrase de recuperation sont generes avec les utilitaires de production.
- Pour le scenario e2e minimal, un rechargement applicatif est simule (unmount + render) afin de verifier la reutilisation du nouveau code en phase before.

## Definition of Done
- [x] Couverture critique du flow de recuperation.
- [x] Scenarios reproductibles.
- [x] Pipeline verte.

## Dev Agent Record

### Implementation Plan
- Introduire un module pur de guards de recuperation owner pour couvrir explicitement les regles AC1/AC2 en unit tests.
- Reutiliser ce module dans le flow App (ouverture forgot code + confirmation reset) pour aligner logique runtime et logique testee.
- Completer les tests d integration avec le cas non-owner qui tente d ouvrir le flow de recuperation.
- Ajouter un scenario e2e minimal qui valide reset puis reutilisation du nouveau code pour debloquer.
- Executer tests cibles, regression complete et build avant passage en review.

### Debug Log
- RED: echec initial attendu sur import manquant de owner-recovery-guards et sur hypothese e2e invalide (bouton indisponible apres reset car phase deja during).
- GREEN: ajout de owner-recovery-guards.ts, integration dans App.tsx, ajustement du e2e avec rechargement simule en phase before.
- REFACTOR: centralisation des checks guard dans evaluateOwnerRecoveryGuards pour eviter la divergence entre tests et runtime.

### Completion Notes
- AC1: couvert par unit tests guards + integration non-owner bloque sur forgot flow et impossible d atteindre reset.
- AC2: couvert par unit tests guards (ownerRecoveryHash absent => reset refuse) et comportement App maintenu vers message/redirect settings.
- AC3: couvert par integration (nouveau hash actif, ancien code invalide) et e2e minimal reset -> relance before -> debloquage avec nouveau code.
- Validation executee: npx vitest cible (3 fichiers), npm run test (56 pass, 3 skip rules emul), npm run build (OK).

## File List
- src/app/owner-recovery-guards.ts (new)
- src/app/owner-recovery-guards.test.ts (new)
- src/app/owner-recovery.integration.test.ts (modified)
- src/app/owner-recovery.e2e.test.tsx (new)
- src/app/App.tsx (modified)
- guidelines/_bmad-output/implementation-artifacts/stories/9-3-couvrir-les-gardes-de-recuperation-par-tests.md (modified)
- guidelines/_bmad-output/implementation-artifacts/sprint-status.yaml (modified)

## Change Log
- 2026-07-16: Added owner recovery guard test coverage (unit/integration/e2e), centralized guard evaluation in app flow, documented test preconditions, and validated full regression/build.
