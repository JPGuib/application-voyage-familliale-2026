# Story 9.3 - Couvrir les gardes de recuperation par tests

Statut: ready-for-dev
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
- [ ] Ajouter tests unitaires sur guards owner recovery.
- [ ] Ajouter tests integration sur flow reset.
- [ ] Ajouter scenario e2e minimal owner forgot code -> reset -> unlock.
- [ ] Documenter les preconditions de test.

## Tests
- [ ] Unit: refus reset si profil actif != owner.
- [ ] Unit: refus reset si ownerRecoveryHash absent.
- [ ] Integration: nouveau code actif apres reset.
- [ ] E2E: owner reset puis debloque le voyage.

## Definition of Done
- [ ] Couverture critique du flow de recuperation.
- [ ] Scenarios reproductibles.
- [ ] Pipeline verte.
