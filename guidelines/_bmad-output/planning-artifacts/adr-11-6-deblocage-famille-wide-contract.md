# ADR 11.6 - Deblocage Famille-Wide Contract

Date: 2026-07-15
Statut: propose (gate pre-implementation)
Story cible: 11-6 - Decider et appliquer deblocage famille-wide

## Decision

La phase voyage est famille-wide et autoritaire sous:
- families/{familyId}/phase

Le scope profile est conserve pour:
- checklists/{profileId}
- gameResults/{profileId}
- profiles/{profileId} metadata

## Invariants

1. Une seule phase active par famille: before | during.
2. Le switch de profil ne doit jamais re-verrouiller une famille deja en during.
3. Checklist et game history restent profile-scoped et ne changent pas de scope.

## Migration

1. Lecture dual-read transitoire:
- priorite: phase famille-wide
- fallback legacy: phase/{profileId}

2. Ecriture single-write immediate:
- ecrire uniquement families/{familyId}/phase
- ne plus ecrire phase/{profileId} dans les flux normaux

3. Cleanup:
- retirer lecture fallback legacy apres validation recette multi-device

## Autorisation

Le deblocage famille-wide doit rester owner-only.
Le controle UI est necessaire mais non suffisant; les Security Rules doivent egalement porter ce controle.

## Consequences

- Convergence inter-appareils simplifiee.
- Reduction du risque de divergence inter-profils.
- Necessite d un hardening rules + auth/membership coherent avec RTDB.
