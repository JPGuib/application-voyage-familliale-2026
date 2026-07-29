# Story 11.4 - Isolation stricte switch profil et garde push auth

Statut: ready-for-dev
Epic: 11 - Continuite numerique post-diagnostic (stabilisation multi-appareils)
Backlog source: Story 11.4
Date: 2026-07-15

## User Story
As a utilisateur,
I want changer de profil sans contamination de donnees,
So that chaque profil conserve son propre espace.

## Acceptance Criteria
- AC1: Le changement de profil reinitialise explicitement les states profile-scopes en memoire.
- AC2: Aucune ecriture cloud n est emise tant que le nouveau profil n est pas authentifie et coherent.
- AC3: Les checklists et resultats de deux profils restent isoles en toutes circonstances.
- AC4: Les scenarios historiques C1=C2 ne sont plus reproductibles.

## Taches implementation
- [ ] Ajouter une routine de reset state au switch profil.
- [ ] Ajouter une garde stricte sur push cloud (auth + profil actif valide).
- [ ] Verifier les effets React dependants du profil actif pour eviter state residuel.
- [ ] Ajouter instrumentation dev sur les push refuses.

## Tests
- [ ] Integration: switch profil A->B sans reprise de checklist A.
- [ ] Integration: create profile puis login immediat sans contamination.
- [ ] E2E: sequences multi-switch sur meme appareil.

## Definition of Done
- [ ] Isolation inter-profils prouvee par tests.
- [ ] Garde push auth active et couverte.
- [ ] Build et tests verts.
