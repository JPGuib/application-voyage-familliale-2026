# Story 11.1 - Corriger le contrat de rendu phase/screen (ecran blanc)

Statut: ready-for-dev
Epic: 11 - Continuite numerique post-diagnostic (stabilisation multi-appareils)
Backlog source: Story 11.1
Date: 2026-07-15

## User Story
As a utilisateur,
I want ne jamais voir un ecran blanc apres refresh,
So that l application reste utilisable en continu.

## Acceptance Criteria
- AC1: En phase "during", un refresh affiche toujours un ecran valide (jamais `null`).
- AC2: Le cas `screen="checklist"` est explicitement gere en phase "during".
- AC3: Un fallback de navigation robuste est applique si `screen` est invalide.
- AC4: Aucune regression sur la navigation existante (dashboard, guide, game, tips, results, settings).

## Taches implementation
- [ ] Identifier et corriger le trou de rendu dans le switch principal.
- [ ] Ajouter une route/fallback deterministic pour les ecrans incompatibles avec la phase.
- [ ] Ajouter des tests d integration sur refresh en phase "during".
- [ ] Ajouter logs dev explicites en cas de fallback force.

## Tests
- [ ] Integration: refresh avec phase "during" + screen par defaut -> ecran valide.
- [ ] Integration: navigation vers checklist puis refresh -> fallback attendu.
- [ ] Non-regression: parcours dashboard -> modules -> retour.

## Definition of Done
- [ ] Plus aucun ecran blanc reproduit sur refresh en phase "during".
- [ ] Fallback de rendu documente et teste.
- [ ] Build et tests verts.
