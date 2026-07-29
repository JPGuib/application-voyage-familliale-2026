# Story 11.6 - Decider et appliquer deblocage famille-wide

Statut: done
Epic: 11 - Continuite numerique post-diagnostic (stabilisation multi-appareils)
Backlog source: Story 11.6
Date: 2026-07-15

## User Story
As a product owner,
I want appliquer un modele de deblocage famille-wide,
So that le comportement inter-profils reste coherent et previsible.

## Acceptance Criteria
- AC1: Le schema de persistance implemente un etat de phase famille unique.
- AC2: Changer de profil ne re-verrouille pas la famille si deja debloquee.
- AC3: Seul le proprietaire peut declencher le deblocage via le code.
- AC4: Les ecrans et regles d acces utilisent ce modele unique sans ambiguite.

## Taches implementation
- [x] Mettre a jour le modele cloud pour phase famille-wide.
- [x] Adapter les lectures/ecritures pour supprimer la divergence phase par profil.
- [x] Verifier les gardes role owner sur l action de deblocage.
- [x] Mettre a jour la documentation produit et technique.

## Tests
- [x] Integration: deblocage owner sur appareil A visible sur appareil B.
- [x] Integration: switch profil apres deblocage conserve acces attendu.
- [x] Integration: user non-owner ne peut pas declencher le deblocage.

## Definition of Done
- [x] Deblocage famille-wide operationnel et teste.
- [x] Gardes owner enforcees.
- [x] Build et tests verts.

## Transition
- 11-6 est closee et validee.
- Enchainement immediat sur 11-7 (deprecation owner code legacy).
- 11-8 reste la gate finale obligatoire de non-regression multi-appareils avant cloture Epic 11.
