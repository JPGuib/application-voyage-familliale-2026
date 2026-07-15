# Sprint Planning - Application de voyage familiale 2026

Date: 2026-07-05
Sources:
- guidelines/_bmad-output/planning-artifacts/prd-application-voyage-familiale-2026.md
- guidelines/_bmad-output/planning-artifacts/epics-and-stories-application-voyage-familiale-2026.md
- guidelines/_bmad-output/planning-artifacts/architecture-spine-application-voyage-familiale-2026.md
- guidelines/_bmad-output/planning-artifacts/ux-designs/ux-application de voyage 2026-2026-07-05/EXPERIENCE.md

## Cadence proposee

- Sprint 1 (J1-J3): Epic 1 + Epic 2
- Sprint 2 (J4-J7): Epic 3 + Epic 4
- Sprint 3 (J8-J10): Epic 5 + Epic 6 + stabilisation

## Sprint 1 - Fondations produit

Objectif: securiser les parcours critiques avant depart.

Stories ciblees:
- 1-1-creer-un-profil-local
- 1-2-gerer-le-profil-dans-parametres
- 1-3-configurer-le-code-proprietaire
- 1-4-debloquer-on-est-partis-avec-code
- 2-1-cocher-decocher-les-items-de-checklist
- 2-2-afficher-la-progression-globale-en-temps-reel

Definition of Done sprint:
- Profil/role operationnels
- Deblocage phase par code valide
- Checklist persistante + progression fiable

## Sprint 2 - Experience quotidienne

Objectif: rendre l app utile chaque jour du voyage.

Stories ciblees:
- 3-1-afficher-le-contexte-du-jour-sur-dashboard
- 3-2-naviguer-vers-modules-internes
- 3-3-ouvrir-wanderlog-et-polarsteps
- 3-4-consulter-conseils-voyage-par-onglets
- 4-1-externaliser-le-contenu-voyage
- 4-2-mettre-a-jour-tout-le-contenu-en-turquie
- 4-3-afficher-la-liste-des-lieux-dans-guide
- 4-4-afficher-une-fiche-lieu-detaillee-avec-galerie
- 4-5-lire-laudio-du-lieu

Definition of Done sprint:
- Dashboard et modules navigables
- Contenu Turquie externalise et actif
- Guide + fiche lieu + audio fonctionnels

## Sprint 3 - Ludique, offline et release

Objectif: finaliser le MVP exploitable en conditions reelles.

Stories ciblees:
- 5-1-completer-le-quiz-du-jour
- 5-2-completer-une-enigme-du-jour
- 5-3-completer-un-defi-du-jour
- 5-4-calculer-et-afficher-resultats
- 6-1-activer-un-mode-hors-ligne-mvp
- 6-2-deployer-lapplication-sur-vercel

Definition of Done sprint:
- Jeu du jour complet + resultats persistants
- Hors ligne MVP actif (shell + contenu recent)
- Deploiement Vercel operationnel

## Risques sprint

- Scope creep sur le module Jeu si enigmes/defis deviennent trop complexes
- Variabilite du offline selon choix technique PWA
- Qualite des donnees contenu (media manquants)

## Mitigations

- Garder les stories de jeu strictement MVP
- Fixer la solution PWA au debut de l Epic 6
- Ajouter des fallbacks visuels et validations de schema contenu
