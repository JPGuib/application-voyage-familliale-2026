# Story 11.3 - Source de verite cloud pour state partage

Statut: ready-for-dev
Epic: 11 - Continuite numerique post-diagnostic (stabilisation multi-appareils)
Backlog source: Story 11.3
Date: 2026-07-15

## User Story
As a equipe technique,
I want centraliser le state metier partage dans le cloud,
So that tous les navigateurs/appareils convergent vers les memes donnees.

## Acceptance Criteria
- AC1: Les donnees metier partagees ne font plus foi en localStorage.
- AC2: Le cloud devient source de verite pour familyState, phase, checklist, gameHistory, ownerCodeHash.
- AC3: Le local ne conserve qu un cache technique et la file offline.
- AC4: Les differences Chrome/Edge pour un meme familyId ne sont plus reproduites.

## Taches implementation
- [ ] Definir contract source-of-truth et responsibilities local vs cloud.
- [ ] Adapter l hydratation initiale pour privilegier cloud quand actif.
- [ ] Minimiser les ecritures locales metier a des usages de secours techniques.
- [ ] Mettre a jour la documentation technique de persistance.

## Tests
- [ ] Integration: mutation profil A visible sur navigateur B meme familyId.
- [ ] Integration: redemarrage navigateur conserve coherence avec snapshot cloud.
- [ ] Non-regression: mode offline avec replay queue.

## Definition of Done
- [ ] Source de verite cloud appliquee sur le perimetre cible.
- [ ] Coherence inter-navigateurs verifiee.
- [ ] Build et tests verts.
