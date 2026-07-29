# Story 11.2 - Initialisation atomique avant rendu metier

Statut: ready-for-dev
Epic: 11 - Continuite numerique post-diagnostic (stabilisation multi-appareils)
Backlog source: Story 11.2
Date: 2026-07-15

## User Story
As a utilisateur,
I want attendre un snapshot coherent avant affichage metier,
So that les ecrans ne se basent pas sur un state transitoire.

## Acceptance Criteria
- AC1: En mode cloud, un ecran de chargement est affiche tant que le profil actif n est pas resolu.
- AC2: Aucun ecran metier ne s affiche avec des donnees partiellement initialisees.
- AC3: Le passage loading -> app est atomique et sans flicker critique.
- AC4: En mode local-only, le comportement actuel reste rapide et stable.

## Taches implementation
- [ ] Definir un state d initialisation global explicite.
- [ ] Bloquer le rendu des ecrans metier tant que les prerequis ne sont pas satisfaits.
- [ ] Synchroniser proprement auto-login, cloudReady, cloudSnapshot et profil actif.
- [ ] Documenter les cas limites (hors-ligne, profil supprime, snapshot indisponible).

## Tests
- [ ] Integration: cloud lent -> loading puis rendu correct.
- [ ] Integration: profil actif absent du snapshot -> flow login manuel sans crash.
- [ ] Non-regression: mode sans Firebase configure.

## Definition of Done
- [ ] Initialisation atomique en place et testee.
- [ ] Aucun rendu metier premature observe.
- [ ] Build et tests verts.
