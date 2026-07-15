# Story 8.1 - Stocker un hash du code proprietaire

Statut: done
Epic: 8 - Durcissement proprietaire unique global
Backlog source: BACKLOG-001
Date: 2026-07-10

## User Story
As a proprietaire,
I want stocker une empreinte du code au lieu du code en clair,
So that la securite des donnees est renforcee.

## Acceptance Criteria
- AC1: Lors de creation/mise a jour du code proprietaire, seule une valeur hashee est persistee.
- AC2: Aucun stockage en clair dans localStorage ni dans le payload cloud.
- AC3: Le deblocage "On est partis" continue de fonctionner via verification hash.
- AC4: Migration de compatibilite: un ancien code en clair est converti en hash au premier chargement.

## Scope technique
- Remplacer la persistance du code proprietaire en clair par une empreinte deterministe.
- Conserver l API fonctionnelle existante cote UI.
- Nommer explicitement les champs hashes (ownerCodeHash) et supprimer toute ambiguité de naming.

## Taches implementation
- [x] Introduire une fonction de hash applicative (Web Crypto API) + helper de verification.
- [x] Mettre a jour la logique de sauvegarde dans App pour n ecrire que ownerCodeHash.
- [x] Mettre a jour cloudSyncProvider/useCloudSync pour manipuler ownerCodeHash uniquement.
- [x] Ajouter une migration de lecture pour convertir l ancien format clair vers hash.
- [x] Ajouter logs de migration en mode dev.

## Tests
- [x] Unit: hash stable pour une meme entree, verification true/false.
- [ ] Unit: migration clair -> hash executee une seule fois.
- [x] Integration: set code proprietaire, verifier absence de valeur claire en stockage.
- [x] Integration: deblocage voyage reussi avec code correct, refuse avec code incorrect.

## Definition of Done
- [x] Aucune occurrence de code proprietaire en clair dans stockage local/cloud.
- [x] Tests associes passent en CI.
- [x] Documentation inline mise a jour.

## Evidence
- Tests executes: `npm run test` (15 tests, 15 passes).
- Build execute: `npm run build` (succes, artefacts PWA generes).
