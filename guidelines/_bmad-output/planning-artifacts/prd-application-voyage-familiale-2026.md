---
title: Application de voyage familiale 2026
created: 2026-07-05
updated: 2026-07-05
---

# PRD: Application de voyage familiale 2026
Version de travail v1 (MVP).

## 0. Document Purpose
Ce PRD sert de reference unique pour l equipe produit, le developpement et les parties prenantes familiales. Il decrit la vision, le vocabulaire metier, le scope MVP, les exigences fonctionnelles et les criteres de succes pour transformer le prototype issu de Figma en produit utilisable pendant le voyage en Turquie. La structure suit BMAD: Glossaire -> Features/FR -> MVP -> Metrics -> Questions ouvertes. Ce document se base sur [docs/Projet d'application - description.docx](docs/Projet%20d'application%20-%20description.docx).

## 1. Vision
L Application de voyage familiale 2026 est un compagnon de voyage mobile-first, consultable aussi sur navigateur desktop, qui centralise l experience familiale avant et pendant le sejour en Turquie. Elle ne remplace pas Wanderlog ni Polarsteps: elle les orchestre autour d une experience simple, ludique et adaptee aux adultes comme aux enfants.

Avant le depart, l application aide la famille a preparer le voyage via une Checklist persistante. Au depart reel, le Proprietaire valide le passage en phase voyage via un code secret. Pendant le voyage, l application devient le tableau de bord quotidien: guide des lieux, jeux du jour, resultats, conseils pratiques et acces aux outils externes.

La proposition de valeur est triple: reduire le stress logistique, rendre le voyage plus interactif/pedagogique, et garder une interface tres simple a utiliser sur smartphone avec option d usage hors ligne.

## 2. Target User

### 2.1 Jobs To Be Done
- Se preparer sereinement avant le depart sans oublier les essentiels.
- Coordonner la famille avec un point d entree unique, simple et visuel.
- Donner un role clair au responsable du voyage (controle du passage en phase 2).
- Rendre chaque journee plus engageante avec contenu et mini-jeux.
- Consulter les infos utiles meme avec connectivite limitee.

### 2.2 Non-Users (v1)
- Agences de voyage professionnelles et usage B2B.
- Gestion multi-familles dans une meme instance.
- Utilisateurs cherchant un outil de reservation complet (transport/hotel).

### 2.3 Key User Journeys
- **UJ-1. Parent proprietaire prepare le depart familial.**
	- **Persona + contexte:** Sam, parent organisateur, centralise la preparation avant le sejour.
	- **Entry state:** app ouverte en Phase Avant Depart, Profil configure en Proprietaire.
	- **Path:** ouvre Checklist -> coche/decocher par categorie -> suit progression globale.
	- **Climax:** tous les indispensables sont verifies.
	- **Resolution:** la famille est prete; Phase Pendant Voyage reste verrouillee.

- **UJ-2. Proprietaire debloque le voyage le jour J.**
	- **Persona + contexte:** Sam lance officiellement le depart.
	- **Entry state:** bouton On est partis visible, app en phase verrouillee.
	- **Path:** appuie sur bouton -> saisit Code Proprietaire -> validation.
	- **Climax:** deblocage reussi du Tableau de bord et des modules.
	- **Resolution:** toute la famille accede a la Phase Pendant Voyage.
	- **Edge case:** code faux -> message d erreur et nouvelle tentative.

- **UJ-3. Enfant et parent consultent le contenu du jour.**
	- **Persona + contexte:** Lea (utilisateur) veut preparer la visite de la journee.
	- **Entry state:** app en phase voyage, Dashboard affiche Jour N.
	- **Path:** ouvre Guide -> choisit un Lieu -> lit histoire/anecdotes -> lance Audio Lieu.
	- **Climax:** comprend ce qu ils vont visiter avant d arriver sur place.
	- **Resolution:** revient au Dashboard pour lancer le Jeu du jour.

- **UJ-4. Famille joue et suit sa progression.**
	- **Persona + contexte:** la famille joue le soir pour reviser la journee.
	- **Entry state:** module Jeu du jour ouvert.
	- **Path:** repond au quiz/defi -> voit feedback immediat -> consulte Resultats.
	- **Climax:** score et badges mettent en valeur les apprentissages.
	- **Resolution:** motivation pour la journee suivante.

- **UJ-5. Consultation avec reseau faible.**
	- **Persona + contexte:** Sam est sans reseau stable dans les transports.
	- **Entry state:** app installee, dernier contenu deja charge.
	- **Path:** ouvre app hors ligne -> consulte contenu cache -> voit indicateur hors ligne.
	- **Climax:** accede aux infos essentielles sans internet.
	- **Resolution:** reprise automatique quand le reseau revient.

## 3. Glossary
- **Application** - Produit web/mobile du voyage familial 2026.
- **Profil** - Identite locale d un membre (Surnom + Role).
- **Surnom** - Nom affiche dans l interface pour un membre.
- **Role** - Type d acces d un Profil: Proprietaire ou Utilisateur.
- **Proprietaire** - Role ayant le droit de configurer le Code Proprietaire et de debloquer la phase voyage.
- **Utilisateur** - Role standard sans droit d administration du deblocage.
- **Code Proprietaire** - Code secret requis pour activer On est partis.
- **Phase Avant Depart** - Etat initial: Checklist accessible, modules voyage verrouilles.
- **Phase Pendant Voyage** - Etat actif apres deblocage: Dashboard + modules accessibles.
- **Checklist** - Liste de preparation persistante organisee en categories.
- **Dashboard** - Ecran d accueil quotidien en phase voyage.
- **Lieu** - Point d interet touristique avec contenu (textes, media, anecdotes).
- **Audio Lieu** - Narration associee a un Lieu.
- **Jeu du jour** - Module ludique (quiz, enigmes, defis).
- **Resultats** - Ecran score, badges et progression.
- **Conseils** - Informations pratiques destination (transport, coutumes, pratique, meteo).
- **Contenu Voyage** - Ensemble des donnees editees (textes, photos, audios, quiz, conseils).
- **Mode Hors Ligne** - Capacite a consulter les ressources essentielles sans internet.

## 4. Features

### 4.1 Profils, Roles et Parametres
**Description:** L Application gere au moins un Profil local avec Surnom et Role. Le menu Parametres permet de consulter/modifier les informations du Profil et les preferences de base. Cette feature realise UJ-1 et UJ-2. [ASSUMPTION: v1 fonctionne en local device, sans compte cloud ni authentification serveur.]

**Functional Requirements:**

#### FR-1: Creer et stocker un Profil
Un utilisateur peut creer un Profil avec Surnom et Role.

**Consequences (testables):**
- Surnom vide -> creation refusee avec message explicite.
- Role non choisi -> creation refusee.
- Surnom et Role persistents apres rechargement.

#### FR-2: Modifier un Profil depuis Parametres
Un utilisateur peut modifier son Surnom et consulter son Role dans Parametres.

**Consequences (testables):**
- Modification du Surnom visible immediatement dans l UI.
- Le Role est affiche en lecture selon permissions.
- Les modifications persistent au rechargement.

### 4.2 Deblocage de la Phase Pendant Voyage
**Description:** Le bouton On est partis doit declencher une verification du Code Proprietaire avant de passer de la Phase Avant Depart a la Phase Pendant Voyage. Realise UJ-2.

**Functional Requirements:**

#### FR-3: Configurer le Code Proprietaire
Le Proprietaire peut definir ou changer le Code Proprietaire depuis Parametres.

**Consequences (testables):**
- Seul un Profil Proprietaire voit l option de configuration.
- Le nouveau code remplace l ancien des validation.
- Un message confirme la mise a jour du code.

#### FR-4: Valider le deblocage On est partis
Le passage en Phase Pendant Voyage exige la saisie d un Code Proprietaire valide.

**Consequences (testables):**
- Code correct -> phase changee en Pendant Voyage.
- Code incorrect -> phase conservee + message d erreur.
- Le statut de phase persiste au rechargement.

**Feature-specific NFRs:**
- Les erreurs de saisie doivent etre explicites et non bloquantes pour la navigation.

### 4.3 Checklist Avant Depart
**Description:** La Checklist couvre les categories de preparation et suit la progression globale de la famille. Realise UJ-1.

**Functional Requirements:**

#### FR-5: Gestions des items Checklist
L utilisateur peut cocher/decocher chaque item de Checklist.

**Consequences (testables):**
- Etat coche/decochage instantane pour chaque item.
- Persistance locale de tous les items.
- Restauration exacte apres fermeture/reouverture.

#### FR-6: Afficher progression Checklist
Le systeme calcule et affiche la progression totale en temps reel.

**Consequences (testables):**
- Le ratio items coches/total est correct a chaque action.
- Le pourcentage affiche correspond au calcul.
- La barre de progression reflte le pourcentage.

### 4.4 Dashboard et Navigation Voyage
**Description:** Le Dashboard presente le contexte quotidien (nom voyage, jour, destination) et les acces rapides vers les modules internes et liens externes Wanderlog/Polarsteps. Realise UJ-3.

**Functional Requirements:**

#### FR-7: Afficher contexte jour
Le Dashboard affiche les informations clefs du jour de voyage.

**Consequences (testables):**
- Nom du voyage, jour courant, total jours et destination visibles.
- Affichage adapte mobile et desktop.
- Donnees issues du Contenu Voyage.

#### FR-8: Naviguer vers modules et apps externes
Le Dashboard fournit des acces vers Guide, Jeu du jour, Conseils, Resultats, Wanderlog et Polarsteps.

**Consequences (testables):**
- Chaque acces interne ouvre le bon ecran.
- Chaque lien externe ouvre la bonne URL.
- La navigation reste possible depuis barre basse en Phase Pendant Voyage.

### 4.5 Guide de voyage et Fiche Lieu
**Description:** Le Guide liste les Lieux du jour et permet d ouvrir une Fiche Lieu detaillee avec presentation, histoire, anecdotes, galerie photos et Audio Lieu. Realise UJ-3.

**Functional Requirements:**

#### FR-9: Consulter la liste des Lieux
L utilisateur peut consulter la liste des Lieux et ouvrir une Fiche Lieu.

**Consequences (testables):**
- Chaque Lieu affiche titre, resume court et visuel.
- L action d ouverture dirige vers la bonne fiche detail.
- La navigation retour renvoie au Guide sans perte de contexte.

#### FR-10: Consulter contenu detaille d un Lieu
Une Fiche Lieu affiche textes descriptifs, anecdotes et galerie photos.

**Consequences (testables):**
- Au moins 3 photos sont consultables par Lieu en MVP [ASSUMPTION].
- Le texte descriptif et les anecdotes s affichent depuis Contenu Voyage.
- En absence de media, un fallback visuel est affiche sans crash.

#### FR-11: Lire un Audio Lieu
L utilisateur peut lancer/pause un Audio Lieu associe.

**Consequences (testables):**
- Bouton lecture/pause fonctionnel.
- Si fichier absent/non lisible, message d erreur non bloquant.
- Le lecteur n interrompt pas la navigation globale.

### 4.6 Jeu du jour et Resultats
**Description:** Le Jeu du jour propose quiz, enigmes et defis en lien avec les Lieux visites. Resultats consolide score, badges et progression equipe. Realise UJ-4.

**Functional Requirements:**

#### FR-12: Jouer au quiz/enigmes/defis du jour
L utilisateur peut completer une session de Jeu du jour.

**Consequences (testables):**
- Au moins un quiz fonctionnel est disponible en MVP.
- Le feedback de bonne/mauvaise reponse est immediat.
- La session se termine par un recapitulatif.

**Out of Scope:**
- Classement multi-familles global.

#### FR-13: Calculer et afficher Resultats
Le systeme calcule score et badges puis les affiche dans Resultats.

**Consequences (testables):**
- Le score final correspond aux reponses donnees.
- Les badges se debloquent selon regles explicites.
- Les resultats sont persistents localement entre sessions.

### 4.7 Conseils Voyage
**Description:** Le module Conseils regroupe informations transport, coutumes locales, pratique et meteo utile. Realise UJ-3.

**Functional Requirements:**

#### FR-14: Consulter les sections Conseils
L utilisateur peut naviguer entre Transport, Coutumes, Pratique, Meteo.

**Consequences (testables):**
- Chaque onglet affiche son contenu associe.
- Les donnees viennent du Contenu Voyage.
- Le changement d onglet est instantane sur mobile.

### 4.8 Gestion du Contenu Voyage
**Description:** Le contenu doit etre editable simplement sans modifier la logique UI principale. Realise UJ-3 et UJ-4.

**Functional Requirements:**

#### FR-15: Charger le Contenu Voyage depuis fichiers structures
L Application charge les donnees depuis des fichiers de contenu dedies (textes, photos, audios, quiz, conseils).

**Consequences (testables):**
- Les ecrans se mettent a jour quand les fichiers de contenu changent.
- Une erreur de schema remonte un message explicite en dev.
- Le produit reste fonctionnel avec contenu partiel (fallback).

### 4.9 Mode Hors Ligne MVP
**Description:** L Application doit rester consultable pour les informations essentielles en reseau faible/inexistant. Realise UJ-5.

**Functional Requirements:**

#### FR-16: Fournir un shell offline et cache essentiel
L Application propose un mode Hors Ligne avec cache des ressources critiques.

**Consequences (testables):**
- Sans reseau, l app se lance et affiche un etat hors ligne.
- Les dernieres donnees visitees restent consultables.
- Le retour reseau supprime l etat d indisponibilite.

## 5. Non-Goals (Explicit)
- Pas de reservation transport/hotel integree dans v1.
- Pas de comptes cloud/multi-devices synchronises en temps reel dans v1.
- Pas de back-office admin complet en v1 (edition via fichiers contenus).
- Pas de classement public ou social inter-familles en v1.
- Pas d application native iOS/Android en v1 (web app mobile-first).

## 6. MVP Scope

### 6.1 In Scope
- Profils locaux avec Surnom + Role.
- Code Proprietaire pour deblocage On est partis.
- Checklist persistante avant depart.
- Dashboard jour + navigation modules + liens externes.
- Guide + Fiche Lieu + Audio Lieu + galerie.
- Jeu du jour MVP (quiz minimum) + Resultats.
- Conseils (transport, coutumes, pratique, meteo).
- Contenu Turquie externalise et editable.
- Mode Hors Ligne de base.
- Deploiement Vercel gratuit.

### 6.2 Out of Scope for MVP
- Synchronisation cloud multi-utilisateurs en temps reel (v2).
- Defis multijoueurs asynchrones avances (v2).
- Administration contenu via interface CMS graphique (v2).
- Analytics avancees produit (v2).

## 7. Success Metrics

**Primary**
- **SM-1**: 95% des sessions de deblocage passent sans erreur fonctionnelle. Valide FR-3, FR-4.
- **SM-2**: 90% des items Checklist modifies sont restores apres rechargement. Valide FR-5, FR-6.
- **SM-3**: 100% des ecrans MVP affichent du contenu Turquie coherent (zero reference Japon). Valide FR-7 a FR-15.

**Secondary**
- **SM-4**: Temps median de chargement ecran principal < 2.5s sur reseau mobile standard. Valide FR-7, FR-16.
- **SM-5**: 80% des sessions Jeu du jour atteignent l ecran Resultats. Valide FR-12, FR-13.

**Counter-metrics (do not optimize)**
- **SM-C1**: Ne pas maximiser le temps passe dans l app au detriment de simplicite familiale.
- **SM-C2**: Ne pas augmenter la complexite Parametres pour ajouter des options non essentielles.

## 8. Decisions verrouillees pour MVP
1. Un seul Profil actif par appareil (mode mono-profil) en v1.
2. Code Proprietaire: apres 3 erreurs consecutives, temporisation de 30 secondes avant nouvelle tentative.
3. Meteo v1: statique depuis le Contenu Voyage (pas d API externe en MVP).
4. Contenu Voyage v1: fichiers thematiques separes (`trip.json`, `places.json`, `game.json`, `tips.json`).
5. Frequence de mise a jour contenu: avant depart puis mises a jour manuelles ponctuelles (pas de sync automatique).

## 9. Assumptions Index
- §4.5 - [ASSUMPTION: au moins 3 photos sont consultables par Lieu en MVP.]

## 10. Cross-Cutting NFRs
- **Performance:** ecran principal interactif en moins de 2.5s median sur mobile 4G.
- **Accessibilite:** contrastes lisibles, cibles tactiles larges, textes comprehensibles enfant/adulte.
- **Fiabilite:** pas de perte de donnees locales critiques (Checklist, Phase, Resultats).
- **Securite (niveau MVP):** code stocke localement; aucun secret serveur.
- **Observabilite:** logs dev explicites sur erreurs de chargement Contenu Voyage.

## 11. Platform, IA et Ton
- **Platform v1:** web app React/Vite, mobile-first, consultable desktop, deployee sur Vercel.
- **Information Architecture:** Phase Avant Depart -> Checklist; Phase Pendant Voyage -> Dashboard, Guide, Fiche Lieu, Jeu du jour, Resultats, Conseils, Parametres.
- **Ton produit:** chaleureux, simple, pedagogique, familial; design colore mais elegant.
