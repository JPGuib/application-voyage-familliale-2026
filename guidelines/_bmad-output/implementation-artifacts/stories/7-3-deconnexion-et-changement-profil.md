# Story 7.3 - Deconnexion et changement de profil

Statut: done
Epic: 7 - Sync cloud multi-device
Backlog source: BACKLOG-004
Date: 2026-07-15

## User Story
As a membre de la famille,
I want me deconnecter de mon profil courant,
So that je puisse revenir a la selection et changer de profil sans perdre les donnees cloud.

## Acceptance Criteria
- AC1: Un bouton de deconnexion/changement de profil est visible depuis Parametres.
- AC2: Le clic declenche un dialogue de confirmation avant action irreversible.
- AC3: La confirmation nettoie la session locale active et ramene a l ecran de selection cloud.
- AC4: Les donnees du profil precedent restent conservees dans le snapshot cloud (pas de perte).
- AC5: Aucun acces Dashboard n est possible tant qu aucun profil n est reconnecte.

## Etat actuel (verification 2026-07-15)
- OK: bouton de deconnexion present dans App.
- OK: dialogue de confirmation implemente avant deconnexion.
- OK: reset de session locale + retour ecran de selection implementes.
- OK: profil precedent toujours visible a la reconnexion (pas de perte cloud constatee).
- OK: test integration du switch profil, annulation et confirmation passes.

## Taches implementation
- [x] Ajouter action deconnexion/changement profil depuis Parametres.
- [x] Reinitialiser les etats de session locale et l identifiant de profil actif.
- [x] Revenir a l ecran de selection cloud apres deconnexion.
- [x] Ajouter un dialogue de confirmation (CTA confirmer/annuler) avant deconnexion.
- [x] Verifier l access guard: pas de dashboard sans profil actif apres deconnexion.

## Tests
- [x] Integration: deconnexion revient a l ecran de selection.
- [x] Integration: annuler confirmation conserve la session active.
- [x] Integration: confirmer deconnexion retire acces dashboard tant que profil non selectionne.
- [x] Regression: aucun effacement des donnees cloud du profil precedemment actif.

## Definition of Done
- [x] AC1 a AC5 valides.
- [x] Dialogue de confirmation livre et teste.
- [x] Suite de tests ciblee verte.
- [x] Story status passe a done dans le sprint status.
