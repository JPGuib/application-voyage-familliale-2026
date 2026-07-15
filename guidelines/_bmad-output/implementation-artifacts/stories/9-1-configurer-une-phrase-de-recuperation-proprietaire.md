# Story 9.1 - Configurer une phrase de recuperation proprietaire

Statut: ready-for-dev
Epic: 9 - Recuperation d urgence du code proprietaire
Backlog source: BACKLOG-004
Date: 2026-07-10

## User Story
As a proprietaire,
I want definir une phrase de recuperation,
So that je puisse reinitialiser mon code si je l oublie.

## Acceptance Criteria
- AC1: Le proprietaire peut definir ou mettre a jour une phrase de recuperation depuis Parametres.
- AC2: La phrase est stockee uniquement sous forme hashee.
- AC3: Un user non-owner ne voit pas ce parametre.
- AC4: Si aucune phrase n est configuree, un message UX l indique clairement.

## Taches implementation
- [ ] Ajouter `ownerRecoveryHash` et `ownerRecoveryConfiguredAt` aux donnees locales/cloud.
- [ ] Reutiliser les helpers de hash/verify pour la phrase de recuperation.
- [ ] Ajouter une section Parametres proprietaire pour configurer la phrase.
- [ ] Ajouter feedback UX de configuration/mise a jour.

## Tests
- [ ] Unit: hash/verify phrase de recuperation.
- [ ] Integration: owner configure une phrase, user non-owner ne le peut pas.

## Definition of Done
- [ ] Phrase de recuperation configurable uniquement par owner.
- [ ] Persistance uniquement en hash.
- [ ] Tests verts.
