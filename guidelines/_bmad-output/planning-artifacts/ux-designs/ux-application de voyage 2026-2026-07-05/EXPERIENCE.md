---
name: Application de voyage familiale 2026
status: final
sources:
  - guidelines/_bmad-output/planning-artifacts/prd-application-voyage-familiale-2026.md
  - guidelines/_bmad-output/planning-artifacts/architecture-spine-application-voyage-familiale-2026.md
  - guidelines/_bmad-output/planning-artifacts/epics-and-stories-application-voyage-familiale-2026.md
updated: 2026-07-05
---

# Application de voyage familiale 2026 - Experience Spine

## Foundation

Produit web mobile-first, consultable desktop, avec comportement principal pense smartphone.

- Identite visuelle reference: DESIGN.md associe.
- Navigation principale en mode voyage via barre basse.
- Etat applicatif pilote par `Phase Avant Depart` / `Phase Pendant Voyage`.
- Le contenu est fourni par fichiers structures et non code inline.

## Information Architecture

| Surface | Reached from | Purpose |
|---|---|---|
| Onboarding Profil | Premier lancement | Definir Surnom + Role |
| Checklist Avant Depart | Etat initial | Preparation et progression |
| Verrouillage On est partis | CTA checklist | Verification Code Proprietaire |
| Dashboard | Deblocage reussi | Resume jour + hubs modules |
| Guide | Dashboard/nav basse | Lister lieux du jour |
| Fiche Lieu | Guide | Histoire, anecdotes, galerie, audio |
| Jeu du jour | Dashboard/nav basse | Quiz, enigmes, defis |
| Resultats | Dashboard/nav basse | Score, badges, progression |
| Conseils | Dashboard/nav basse | Transport, coutumes, pratique, meteo |
| Parametres | Dashboard ou nav utilitaire | Profil, role, code proprietaire |

Regles IA:
- Aucune surface Phase Pendant Voyage accessible sans deblocage valide.
- Retour ecran toujours disponible sans perdre les donnees deja validees.

## Voice and Tone

Microcopy clair, familial, direct.

| Do | Don't |
|---|---|
| "On est partis" | "Activer la phase 2" |
| "Code incorrect, reessaie" | "Erreur 401" |
| "Aucun reseau, contenu recent disponible" | "Offline mode active" |
| "Bravo, 4 bonnes reponses" | "Score calcule: 80" |

## Component Patterns

| Component | Use | Behavioral rules |
|---|---|---|
| CTA On est partis | Fin checklist | Ouvre modal/code, ne debloque jamais sans validation |
| Carte action rapide | Dashboard | Un tap = une destination; pas de sous-menu caché |
| Item checklist | Avant depart | Toggle instantane + persistence locale immediate |
| Carte lieu | Guide | Ouvre la fiche lieu cible sans latence perceptible |
| Lecteur audio lieu | Fiche lieu | Play/Pause, feedback clair si media indisponible |
| Onglets conseils | Conseils | Bascules instantanees sans rechargement total ecran |
| Item navigation basse | Phase voyage | Indique ecran actif de maniere visible |

## State Patterns

| State | Surface | Treatment |
|---|---|---|
| Initial vide | Onboarding | Demande Surnom + Role avant acces |
| Code invalide | Verrouillage | Message d erreur explicite + nouvelle tentative |
| Contenu partiel | Guide/Fiche/Conseils | Fallback textuel + visuel neutre |
| Offline | Toutes surfaces phase voyage | Badge hors ligne + utilisation dernier contenu disponible |
| Audio absent | Fiche lieu | Message non bloquant, navigation conservee |
| Jeu termine | Jeu du jour | Redirection claire vers recap et Resultats |

## Interaction Primitives

- Tap simple comme interaction principale.
- Scroll vertical unique par surface.
- Transitions courtes, informatives, sans animations lourdes.
- Feedback immediat apres action (toggle, validation, reponse quiz).
- Interactions interdites: menus profonds, double validation inutile, gestes caches critiques.

## Accessibility Floor

- Cibles tactiles >= 44px.
- Libelles action explicites (pas uniquement icones).
- Contraste suffisant selon tokens DESIGN.
- Navigation clavier minimale valide sur desktop (tab + enter).
- Messages d erreur comprehensibles pour adulte/enfant.
- Alternative texte pour media non charge.

## Key Flows

### Flow 1 - Preparation et deblocage (Sam, parent proprietaire)

1. Sam ouvre l app, configure son Profil (Surnom + Role Proprietaire).
2. Il complete la Checklist avec la famille.
3. Il clique sur On est partis.
4. Il saisit le Code Proprietaire.
5. **Climax:** validation reussie, la Phase Pendant Voyage est debloquee.
6. Le Dashboard apparait avec le contexte du jour.

Failure path: code incorrect -> message immediat -> phase reste verrouillee.

### Flow 2 - Consultation d un lieu (Lea, enfant)

1. Lea ouvre Dashboard puis Guide.
2. Elle choisit un Lieu.
3. Elle lit la presentation et les anecdotes.
4. Elle parcourt la galerie puis lance l audio.
5. **Climax:** elle comprend le lieu avant la visite.
6. Elle revient au Dashboard.

Failure path: audio indisponible -> message non bloquant, la fiche reste consultable.

### Flow 3 - Jeu familial et progression

1. La famille ouvre Jeu du jour.
2. Elle repond aux questions/defis.
3. Feedback immediat sur chaque reponse.
4. Ecran recap de fin de session.
5. **Climax:** score final et badges visibles dans Resultats.
6. Le score persiste pour la suite du voyage.

Failure path: sortie prematuree -> reprendre la session sans perte des reponses deja enregistrees.

## Responsive & Platform

- Mobile prioritaire (iPhone 12-17, Galaxy A53): plein ecran, navigation basse toujours visible en phase voyage.
- Desktop web: coque mobile centree pour conserver la meme logique cognitive.
- PWA MVP: shell et dernier contenu consulte disponibles hors ligne.
- Les interactions restent identiques sur toutes plateformes (pas de divergence fonctionnelle entre mobile et desktop).
