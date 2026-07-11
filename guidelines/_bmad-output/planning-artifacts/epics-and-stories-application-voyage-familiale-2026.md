---
stepsCompleted:
  - prd-created
  - epic-design
inputDocuments:
  - guidelines/_bmad-output/planning-artifacts/prd-application-voyage-familiale-2026.md
---

# Application de voyage familiale 2026 - Epic Breakdown

## Overview

Ce document decompose le PRD en epics et stories implementables pour le MVP de l application de voyage familiale 2026.

## Requirements Inventory

### Functional Requirements

- FR-1: Creer et stocker un Profil
- FR-2: Modifier un Profil depuis Parametres
- FR-3: Configurer le Code Proprietaire
- FR-4: Valider le deblocage On est partis
- FR-5: Gestion des items Checklist
- FR-6: Afficher progression Checklist
- FR-7: Afficher contexte jour
- FR-8: Naviguer vers modules et apps externes
- FR-9: Consulter la liste des Lieux
- FR-10: Consulter contenu detaille d un Lieu
- FR-11: Lire un Audio Lieu
- FR-12: Jouer au quiz/enigmes/defis du jour
- FR-13: Calculer et afficher Resultats
- FR-14: Consulter les sections Conseils
- FR-15: Charger le Contenu Voyage depuis fichiers structures
- FR-16: Fournir un shell offline et cache essentiel

### NonFunctional Requirements

- UX mobile-first simple, familial, gros boutons.
- Performance: ecran principal < 2.5s median en mobile.
- Fiabilite: persistance des donnees locales critiques.
- Accessibilite: lisibilite et cibles tactiles adequates.
- Observabilite dev: erreurs de contenu explicites.

### Additional Requirements

- Cible contenu: Turquie (zero references Japon/Kyoto).
- Liens externes: Wanderlog et Polarsteps.
- Deploiement gratuit sur Vercel.
- Option hors ligne MVP.

### UX Design Requirements

- Phase 1 Avant Depart: Checklist persistante + CTA On est partis.
- Phase 2 Pendant Voyage: Dashboard + bottom navigation.
- Ecrans: Guide, Fiche Lieu, Jeu du jour, Resultats, Conseils, Parametres.

### FR Coverage Map

- Epic 1 couvre FR-1, FR-2, FR-3, FR-4
- Epic 2 couvre FR-5, FR-6
- Epic 3 couvre FR-7, FR-8, FR-14
- Epic 4 couvre FR-9, FR-10, FR-11, FR-15
- Epic 5 couvre FR-12, FR-13
- Epic 6 couvre FR-16

## Epic List

- Epic 1: Identite, roles et deblocage securise
- Epic 2: Phase Avant Depart (Checklist)
- Epic 3: Dashboard et navigation modules
- Epic 4: Contenu Turquie (guide, fiche lieu, media)
- Epic 5: Jeu du jour et resultats
- Epic 6: Hors ligne et deploiement
- Epic 7: Synchronisation cloud et authentification multi-profils
- Epic 8: Durcissement proprietaire unique global
- Epic 9: Recuperation d urgence du code proprietaire

## Epic 1: Identite, roles et deblocage securise

Objectif: Mettre en place la gouvernance familiale via Profil, Role et Code Proprietaire pour controler l acces a la phase voyage.

### Story 1.1: Creer un profil local
As a membre de la famille,
I want creer un Profil avec Surnom et Role,
So that l application personnalise mon experience.

**Acceptance Criteria:**

**Given** l application est ouverte pour la premiere fois
**When** je saisis un Surnom valide et je choisis un Role
**Then** le Profil est cree
**And** les donnees sont sauvegardees localement

**Given** je valide sans Surnom ou sans Role
**When** je tente de continuer
**Then** la creation est refusee
**And** un message d erreur explicite est affiche

### Story 1.2: Gerer le profil dans Parametres
As a utilisateur,
I want modifier mon Surnom dans Parametres,
So that mon identite affichee reste a jour.

**Acceptance Criteria:**

**Given** je suis sur Parametres
**When** je modifie mon Surnom puis j enregistre
**Then** le nouveau Surnom est visible immediatement
**And** il persiste apres rechargement

### Story 1.3: Configurer le Code Proprietaire
As a Proprietaire,
I want definir et mettre a jour le Code Proprietaire,
So that seul un membre autorise peut debloquer la phase voyage.

**Acceptance Criteria:**

**Given** je suis un Profil Proprietaire
**When** j ouvre Parametres securite
**Then** je peux definir/modifier le Code Proprietaire
**And** la mise a jour invalide l ancien code

### Story 1.4: Debloquer On est partis avec code
As a Proprietaire,
I want saisir le Code Proprietaire au clic sur On est partis,
So that la Phase Pendant Voyage soit activee de maniere controlee.

**Acceptance Criteria:**

**Given** l application est en Phase Avant Depart
**When** je saisis un code correct
**Then** la phase passe a Pendant Voyage
**And** l etat persiste apres rechargement

**Given** je saisis un code incorrect
**When** je valide
**Then** la phase reste verrouillee
**And** un message d erreur est affiche

## Epic 2: Phase Avant Depart (Checklist)

Objectif: Offrir une checklist fiable et persistante pour preparer le voyage.

### Story 2.1: Cocher/decocher les items de checklist
As a membre de la famille,
I want cocher et decocher les items,
So that nous suivions l avancement de preparation.

**Acceptance Criteria:**

**Given** je suis sur la Checklist
**When** je coche ou decoche un item
**Then** l etat visuel est mis a jour immediatement
**And** il est persiste localement

### Story 2.2: Afficher la progression globale en temps reel
As a membre de la famille,
I want voir le pourcentage d avancement,
So that je sache ce qu il reste a preparer.

**Acceptance Criteria:**

**Given** des items sont coches
**When** le nombre d items changes
**Then** le ratio coches/total est recalculé correctement
**And** la barre de progression correspond au pourcentage

## Epic 3: Dashboard et navigation modules

Objectif: Fournir une entree quotidienne claire vers tous les modules utiles du voyage.

### Story 3.1: Afficher le contexte du jour sur Dashboard
As a utilisateur,
I want voir nom du voyage, jour courant et destination,
So that je comprenne le plan de la journee en un coup d oeil.

**Acceptance Criteria:**

**Given** la Phase Pendant Voyage est active
**When** j ouvre le Dashboard
**Then** nom du voyage, jour N/total et destination sont visibles
**And** les donnees proviennent du Contenu Voyage

### Story 3.2: Naviguer vers modules internes
As a utilisateur,
I want utiliser des acces rapides et la navigation basse,
So that j ouvre rapidement Guide, Jeu, Conseils et Resultats.

**Acceptance Criteria:**

**Given** je suis sur le Dashboard
**When** je clique un acces module
**Then** le bon ecran est ouvert
**And** la navigation retour fonctionne sans perte d etat critique

### Story 3.3: Ouvrir Wanderlog et Polarsteps
As a utilisateur,
I want ouvrir les apps externes depuis l application,
So that je garde un point d entree unique.

**Acceptance Criteria:**

**Given** je suis sur le Dashboard
**When** je clique sur Wanderlog ou Polarsteps
**Then** la bonne URL externe s ouvre
**And** aucune erreur de navigation interne n apparait

### Story 3.4: Consulter Conseils voyage par onglets
As a utilisateur,
I want naviguer entre Transport, Coutumes, Pratique, Meteo,
So that j accede rapidement aux infos utiles.

**Acceptance Criteria:**

**Given** je suis sur Conseils
**When** je change d onglet
**Then** le contenu associe s affiche instantanement
**And** les donnees viennent du Contenu Voyage

## Epic 4: Contenu Turquie (guide, fiche lieu, media)

Objectif: Migrer vers la Turquie et rendre le contenu facilement editable hors logique UI.

### Story 4.1: Externaliser le contenu voyage
As a mainteneur contenu,
I want charger les donnees depuis des fichiers structures,
So that je modifie le contenu sans retoucher la logique principale.

**Acceptance Criteria:**

**Given** des fichiers contenu valides
**When** l application demarre
**Then** les modules consomment ces donnees
**And** les modifications de contenu sont visibles apres rebuild

**Given** une donnee partielle ou invalide
**When** le parsing echoue
**Then** un fallback non bloquant est affiche
**And** un message explicite est journalise en dev

### Story 4.2: Mettre a jour tout le contenu en Turquie
As a utilisateur,
I want voir un contenu 100% Turquie,
So that l application corresponde au voyage reel.

**Acceptance Criteria:**

**Given** le MVP est package
**When** je parcours Checklist, Dashboard, Guide, Jeu, Conseils, Resultats
**Then** aucune reference Japon/Kyoto n apparait
**And** lieux/recits/conseils concernent la Turquie

### Story 4.3: Afficher la liste des lieux dans Guide
As a utilisateur,
I want voir les lieux visites et ouvrir leur fiche,
So that je prepare la visite avant d y aller.

**Acceptance Criteria:**

**Given** je suis sur Guide
**When** je consulte la liste
**Then** chaque Lieu affiche titre, resume et visuel
**And** l ouverture de fiche pointe vers le bon Lieu

### Story 4.4: Afficher une fiche lieu detaillee avec galerie
As a utilisateur,
I want voir description, anecdotes et galerie photos,
So that je comprends et visualise le lieu.

**Acceptance Criteria:**

**Given** je suis sur une Fiche Lieu
**When** le contenu est charge
**Then** description et anecdotes sont affichées
**And** au moins 3 photos sont navigables pour le Lieu

### Story 4.5: Lire l audio du lieu
As a utilisateur,
I want jouer et mettre en pause une narration audio,
So that je peux ecouter les explications en route.

**Acceptance Criteria:**

**Given** un Audio Lieu est disponible
**When** j appuie sur lecture/pause
**Then** le lecteur fonctionne correctement
**And** un message non bloquant apparait si fichier absent

## Epic 5: Jeu du jour et resultats

Objectif: Ajouter une couche ludique quotidienne et visualiser la progression de l equipe.

### Story 5.1: Completer le quiz du jour
As a famille,
I want repondre a un quiz lie aux lieux visites,
So that nous consolidions les apprentissages de la journee.

**Acceptance Criteria:**

**Given** j ouvre Jeu du jour
**When** je complete le quiz
**Then** un feedback immediat est affiche a chaque reponse
**And** le score quiz est enregistre pour la session

### Story 5.2: Completer une enigme du jour
As a famille,
I want resoudre une enigme contextuelle,
So that le jeu reste varie et stimulant.

**Acceptance Criteria:**

**Given** j ouvre la section enigme
**When** je propose une reponse validee
**Then** le resultat est affiche (reussite/echec)
**And** la progression de session est mise a jour

### Story 5.3: Completer un defi du jour
As a famille,
I want valider un defi simple lie a la visite,
So that nous participions activement pendant le voyage.

**Acceptance Criteria:**

**Given** j ouvre la section defi
**When** je marque le defi comme accompli
**Then** le defi passe a l etat termine
**And** des points de session sont attribues selon la regle definie

### Story 5.4: Calculer et afficher Resultats
As a famille,
I want voir score, badges et progression,
So that nous suivions nos performances sur le voyage.

**Acceptance Criteria:**

**Given** une session est terminee
**When** j ouvre Resultats
**Then** score final et badges sont calcules correctement
**And** les resultats persistent entre sessions locales

## Epic 6: Hors ligne et deploiement

Objectif: Assurer l usage terrain en connectivite degradee et livrer une version hebergee gratuite.

### Story 6.1: Activer un mode Hors Ligne MVP
As a utilisateur en deplacement,
I want ouvrir l application sans internet,
So that je consulte les informations essentielles hors ligne.

**Acceptance Criteria:**

**Given** le reseau est indisponible
**When** j ouvre l application
**Then** le shell applicatif se charge
**And** un indicateur hors ligne est visible

**Given** j ai deja consulte des contenus
**When** je suis hors ligne
**Then** les dernieres donnees restent accessibles

### Story 6.2: Deployer l application sur Vercel
As a proprietaire du projet,
I want publier automatiquement l application,
So that la famille dispose d une URL de production stable.

**Acceptance Criteria:**

**Given** le repository est connecte a Vercel
**When** un commit est pousse sur la branche principale
**Then** un deploiement de production est execute
**And** l URL de production est accessible

## Epic 7: Synchronisation cloud et authentification multi-profils

Objectif: Partager les donnees famille entre appareils et permettre la connexion/deconnexion de profils sur un meme device.

### Story 7.1: Synchroniser donnees multi-device (cloud sync)
As a famille en voyage,
I want partager mes donnees entre appareils,
So that profil, checklist, jeux et phase restent coherents partout.

**Acceptance Criteria:**

**Given** un profil met a jour ses donnees sur un appareil
**When** un second appareil ouvre l application
**Then** les donnees synchronisees sont visibles
**And** la lecture fonctionne meme apres reconnexion reseau

### Story 7.2: Login et selection profil
As a membre de la famille,
I want selectionner un profil existant ou en creer un,
So that je me connecte avec mon identite.

**Acceptance Criteria:**

**Given** des profils existent deja dans la famille
**When** j arrive sur l ecran de connexion
**Then** je peux selectionner un profil et continuer

**Given** je cree un nouveau profil
**When** je valide un surnom
**Then** un profil est cree et connecte

### Story 7.3: Deconnexion et changement profil
As a utilisateur partageant un appareil,
I want me deconnecter puis changer de profil,
So that chaque membre utilise son espace.

**Acceptance Criteria:**

**Given** je suis connecte
**When** je choisis de me deconnecter
**Then** je reviens a l ecran de selection profil
**And** je peux me reconnecter avec un autre profil

## Epic 8: Durcissement proprietaire unique global

Objectif: Clore BACKLOG-001 en finalisant les points securite et qualite restants autour du proprietaire unique.

### Story 8.1: Stocker un hash du code proprietaire
As a proprietaire,
I want stocker une empreinte du code au lieu du code en clair,
So that la securite des donnees est renforcee.

**Acceptance Criteria:**

**Given** un code proprietaire est cree ou modifie
**When** il est persiste localement/cloud
**Then** seule sa version hashee est stockee
**And** aucune valeur en clair n est ecrite dans la source partagee

### Story 8.2: Bloquer explicitement toute promotion manuelle vers proprietaire
As a mainteneur,
I want appliquer un garde-fou central sur toutes les mutations de role,
So that aucun bypass UI ne permette de promouvoir un utilisateur.

**Acceptance Criteria:**

**Given** un owner existe deja
**When** une mutation tente de promouvoir un autre profil
**Then** la mutation est refusee
**And** l evenement est journalise en mode developpement

### Story 8.3: Couvrir les invariants par tests d integration et E2E
As a equipe produit,
I want automatiser les cas owner unique critiques,
So that la regression est detectee avant release.

**Acceptance Criteria:**

**Given** un scenario multi-device concurrent est execute
**When** deux profils tentent le bootstrap owner
**Then** un seul owner final est conserve

**Given** un utilisateur non owner tente de modifier le code
**When** la requete est executee
**Then** la mutation est rejetee systematiquement

## Epic 9: Recuperation d urgence du code proprietaire

Objectif: Permettre au proprietaire de recuperer un acces legitime lorsqu il a oublie son code, sans introduire de faille pour les autres profils.

### Story 9.1: Configurer une phrase de recuperation proprietaire
As a proprietaire,
I want definir une phrase de recuperation,
So that je puisse reinitialiser mon code si je l oublie.

**Acceptance Criteria:**

**Given** je suis connecte avec le profil proprietaire
**When** j ouvre Parametres
**Then** je peux definir ou mettre a jour une phrase de recuperation
**And** elle est stockee uniquement sous forme hashee

### Story 9.2: Reinitialiser le code via le flow "Code oublie ?"
As a proprietaire,
I want verifier ma phrase de recuperation puis definir un nouveau code,
So that je retrouve l acces au deblocage du voyage.

**Acceptance Criteria:**

**Given** je suis le proprietaire et j ai configure une phrase de recuperation
**When** j utilise le flow "Code oublie ?" et je saisis la bonne phrase
**Then** je peux definir un nouveau code proprietaire
**And** le nouveau code est persiste sous forme hashee

**Given** la phrase de recuperation est incorrecte
**When** je valide
**Then** la reinitialisation est refusee
**And** la phase reste verrouillee

### Story 9.3: Couvrir les gardes de recuperation par tests
As a equipe produit,
I want automatiser les cas critiques du flow de recuperation,
So that une regression de securite soit detectee avant livraison.

**Acceptance Criteria:**

**Given** un user non-owner tente d utiliser le flow
**When** le test est execute
**Then** l action est refusee

**Given** aucun secret de recuperation n est configure
**When** le proprietaire clique "Code oublie ?"
**Then** l application oriente vers Parametres au lieu de reinitialiser le code
