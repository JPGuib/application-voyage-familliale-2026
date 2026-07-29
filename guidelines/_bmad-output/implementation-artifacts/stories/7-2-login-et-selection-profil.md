# Story 7.2 - Login et selection de profil

Statut: in-progress
Epic: 7 - Sync cloud multi-device
Backlog source: BACKLOG-004
Date: 2026-07-15

## User Story
As a membre de la famille,
I want choisir un profil existant ou en creer un au lancement,
So that je recupere mon contexte sans recreer mon profil.

## Acceptance Criteria
- AC1: Un ecran de selection apparait quand des profils cloud existent.
- AC2: Cliquer un profil restaure automatiquement son contexte (checklist, scores, phase).
- AC3: Le bouton creer un nouveau profil renvoie vers le flow de creation profil.
- AC4: Aucun profil existant n est recree accidentellement.
- AC5: Une deconnexion ramene a l ecran de selection.

## Taches implementation
- [x] Ajouter un ecran de login cloud avec liste des profils disponibles.
- [x] Ajouter la selection d un profil actif et restaurer son contexte.
- [x] Ajouter la creation d un nouveau profil depuis l ecran de login.
- [x] Bloquer la recreation accidentelle d un profil existant (anti-doublon par surnom normalise).
- [x] Ajouter la remise a zero de session pour changement de profil.
- [x] Ajouter/renforcer les tests d integration React sur le flow de login et switch profil.

## Tests
- [x] Unit: detection de doublon de profil par surnom (casse/accents/espaces).
- [x] Integration: selection profil existant restaure l ecran attendu en phase before (checklist).
- [x] Integration: creer nouveau profil passe par setup puis persiste correctement.
- [x] Integration: deconnexion revient a l ecran de selection.

## Definition of Done
- [x] Ecran de selection actif en mode cloud.
- [x] Restauration de contexte de base verifiee (retour ecran checklist en phase before).
- [x] Flow creation nouveau profil verifie.
- [x] Flow deconnexion/changement profil verifie.
- [x] Tests verts.
