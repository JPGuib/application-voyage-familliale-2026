# Architecture Brief - Epic 11.3 Continuite Numerique

Date: 2026-07-15
Statut: input pour session Architect BMAD avant implementation 11.3
Scope: source de verite cloud pour state partage + migration de persistance

## Contexte

Stories deja livrees:
- 11.1 corrige le trou de rendu phase/screen (ecran blanc)
- 11.2 introduit un bootstrap d'auth atomique avant rendu metier
- 11.4 ajoute une garde stricte de push cloud et reset explicite au switch profil

Story cible:
- 11.3 source de verite cloud pour state partage

## Probleme a trancher

Le code garde encore un double modele local + cloud pour des donnees metier. Cela cree des risques de divergence inter-navigateurs/appareils et des transitions de session complexes.

## Objectif architecture

Definir un contrat d'ownership des donnees:
- quelles donnees sont metier partagees (cloud source of truth)
- quelles donnees restent locales (cache technique/session device)
- quelles regles de lecture/ecriture/migration appliquer pour eviter les regressions

## Decisions attendues de l'Architect

1. Data ownership matrix (obligatoire)
- profile courant: cloud ou local?
- familyState: cloud unique
- ownerCodeHash: cloud unique
- phase: cloud (decision 11.6 famille-wide attendue)
- checklist: cloud profile-scoped
- gameHistory: cloud profile-scoped
- unlockFailedAttempts / unlockLockedUntil: local vs cloud (justifier)
- selected screen UI: local session

2. Read path contract (cold start)
- ordre exact de resolution au demarrage
- conditions de rendu ecran login vs app
- politique fallback si cloud indisponible

3. Write path contract
- conditions strictes autorisant un push cloud
- anti-boucle local<->cloud
- debounce/dedup strategy

4. Migration strategy
- handling des cles localStorage historiques
- compatibilite clients deja deployes
- rollback/fail-safe en cas de schema mismatch

5. Observabilite
- events/logs minimum a ajouter en dev
- signaux de sante pour diagnostiquer divergence

## Contraintes

- Conserver UX mobile-first actuelle
- Limiter les modifications cassees: preferer migration incrementale
- Eviter d'introduire une dependance backend supplementaire
- Respecter les stories 11.5 (rules) et 11.6 (phase famille-wide)

## Artifacts de reference

- planning artifacts: architecture spine
- diagnostic continuite numerique
- stories 11.1, 11.2, 11.4, 11.3
- implementation actuelle App.tsx, useCloudSync.ts, cloudSyncProvider.ts

## Proposition d'output Architect BMAD

1. ADR court: Source of Truth & Persistence Boundaries
2. Tableau ownership des etats (cloud/local)
3. Sequence diagram startup et sync
4. Plan de migration en 2 etapes max
5. Liste de tests d'acceptation architecture (pre-implementation)
