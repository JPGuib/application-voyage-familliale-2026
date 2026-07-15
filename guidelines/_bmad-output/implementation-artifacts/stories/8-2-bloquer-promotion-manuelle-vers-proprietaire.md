# Story 8.2 - Bloquer promotion manuelle vers proprietaire

Statut: done
Epic: 8 - Durcissement proprietaire unique global
Backlog source: BACKLOG-001
Date: 2026-07-10

## User Story
As a mainteneur,
I want appliquer un garde-fou central sur toutes les mutations de role,
So that aucun bypass UI ne permette de promouvoir un utilisateur.

## Acceptance Criteria
- AC1: Toute tentative de promotion vers proprietaire est refusee si ownerProfileId existe deja.
- AC2: Le refus est applique au niveau logique (pas uniquement UI).
- AC3: Les flux cloud/local utilisent la meme politique centrale.
- AC4: Les tentatives refusees sont journalisees en mode developpement.

## Scope technique
- Centraliser les mutations de role via owner-policy.
- Utiliser explicitement un guard central de mutation dans les chemins de mutation.
- Retirer les chemins de role implicites pouvant contourner le guard.

## Taches implementation
- [x] Identifier tous les points d entree mutation role (local + cloud).
- [x] Ajouter un service/fonction unique applyRoleMutation avec controle central.
- [x] Refuser avec retour explicite (resultat de mutation) en cas de violation.
- [x] Ajouter logs dev non verbeux sur tentative invalide.
- [x] Mettre a jour tests existants et ajouter cas tampering payload.

## Tests
- [x] Unit: canPromoteToOwner false si owner different deja present.
- [x] Unit: mutation refusee pour promotion invalide.
- [x] Integration: tentative de bypass via payload manuel rejetee.
- [x] Integration: role owner legitime conserve apres sync concurrente.

## Definition of Done
- [x] Aucune promotion invalide possible par UI ou payload direct.
- [x] Tous les chemins de mutation role passent par un guard central.
- [x] Tests de non-regression verts.

## Evidence
- Tests executes: `npm run test` (17 tests, 17 passes).
- Build execute: `npm run build` (succes).
