# Story 8.3 - Couvrir invariants owner unique en integration et e2e

Statut: done
Epic: 8 - Durcissement proprietaire unique global
Backlog source: BACKLOG-001
Date: 2026-07-10

## User Story
As a equipe produit,
I want automatiser les cas owner unique critiques,
So that la regression est detectee avant release.

## Acceptance Criteria
- AC1: Cas concurrent bootstrap multi-device valide qu un seul owner final existe.
- AC2: Cas user non-owner modifiant code proprietaire est refuse.
- AC3: Cas donnees corrompues (2 owners) est normalise automatiquement.
- AC4: Les tests sont executes dans la pipeline projet.

## Scope technique
- Completer unit/integration autour owner-policy et cloudSyncProvider.
- Ajouter un scenario e2e minimal focalise gouvernance owner.
- Documenter les preconditions de test (firebase mock ou emulateur).

## Taches implementation
- [x] Ajouter fixtures et helpers de state family pour cas corrompus.
- [x] Ajouter tests integration first-writer-wins (course condition simplifiee).
- [x] Ajouter test integration blocage update ownerCode par user non-owner.
- [x] Ajouter test e2e parcours famille (1 owner + 1 user) avec changement profil.
- [x] Ajouter notes de run dans README/guide test.

## Tests
- [x] Unit: enforceOwnerUniqueness corrige tous les profils non-owner.
- [x] Integration: double claim simultane donne 1 owner final.
- [x] Integration: update code refuse pour user.
- [x] E2E: parcours complet connexion + verification droits owner.

## Definition of Done
- [x] Couverture test des invariants critiques owner unique.
- [x] Scenarios integration et e2e stables et reproductibles.
- [x] Rapport de tests sans regression bloquante.

## Evidence
- Nouveau fichier de tests: `src/app/owner-governance.integration.test.ts`.
- Tests executes: `npm run test` (21 tests, 21 passes).
- Build execute: `npm run build` (succes).
