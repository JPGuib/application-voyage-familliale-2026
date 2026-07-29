# Story 11.5 - Auditer et versionner les Security Rules Firebase

Statut: ready-for-dev
Epic: 11 - Continuite numerique post-diagnostic (stabilisation multi-appareils)
Backlog source: Story 11.5
Date: 2026-07-15

## User Story
As a equipe securite,
I want versionner et auditer les regles Firebase,
So that les droits read/write soient maitrisables et reproductibles.

## Acceptance Criteria
- AC1: Les regles RTDB/Firestore de test et prod sont exportees et versionnees dans le repo.
- AC2: Les regles interdisent l acces non autorise aux donnees d un autre profil/famille.
- AC3: Un guide de verification (test + review) est ajoute pour les evolutions futures.
- AC4: Les environnements test/prod sont clairement distingues.

## Taches implementation
- [ ] Exporter les regles depuis Firebase Console.
- [ ] Ajouter les fichiers de regles et config associee au repo.
- [ ] Documenter la procedure d audit et de deploiement rules.
- [ ] Ajouter checklist de verification securite dans docs.

## Tests
- [ ] Verification manuelle: user non autorise ne lit/crit pas un profil tiers.
- [ ] Verification manuelle: acces legitime sur profil/famille autorises.
- [ ] Revue pair securite des regles versionnees.

## Definition of Done
- [ ] Security Rules versionnees et auditees.
- [ ] Procedure de verification documentee.
- [ ] Preuve de controle d acces disponible.
