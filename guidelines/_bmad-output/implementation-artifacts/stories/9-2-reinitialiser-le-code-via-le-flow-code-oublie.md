# Story 9.2 - Reinitialiser le code via le flow Code oublie

Statut: ready-for-dev
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
- [ ] Ajouter le CTA `Code oublie ?` dans le flow de validation proprietaire.
- [ ] Ajouter un modal/ecran de verification de phrase de recuperation.
- [ ] Ajouter la saisie du nouveau code + confirmation.
- [ ] Hasher et persister le nouveau code proprietaire.
- [ ] Garder la phase verrouillee tant que le nouveau code n est pas confirme.

## Tests
- [ ] Integration: reset reussi avec phrase correcte.
- [ ] Integration: reset refuse avec phrase incorrecte.
- [ ] Integration: reset indisponible sans secret configure.

## Definition of Done
- [ ] Flow complet `Code oublie ?` operationnel.
- [ ] Aucun secret en clair persiste.
- [ ] Build et tests verts.
