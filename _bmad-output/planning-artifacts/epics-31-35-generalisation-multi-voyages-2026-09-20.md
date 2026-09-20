# Généralisation multi-voyages — Epics 31 à 35

Date : 2026-09-20
Statut : backlog / réflexion validée pour cadrage
Source : trajectoire de généralisation discutée le 2026-09-20

## Objectif

Conserver l'instance Turquie 2026 comme référence tout en faisant évoluer un moteur commun capable d'accueillir d'autres voyages. La première cible est un moteur unique, plusieurs packs de contenu et un déploiement isolé par voyage. La création de voyages depuis une interface d'administration est hors périmètre de cette trajectoire.

## Décisions de cadrage

- La Turquie 2026 reste une instance fonctionnelle de référence et un scénario de non-régression.
- Le code commun constitue le moteur applicatif.
- Le contenu éditorial est regroupé par voyage dans un pack versionné.
- Les données vivantes de famille sont séparées du contenu éditorial.
- La première version opérationnelle privilégie un build et un espace Firebase isolés par voyage.
- Un changement de voyage sur un même appareil ne doit jamais mélanger les profils, progressions, photos ou préférences.
- Chaque contenu publié doit être validé avant d'être embarqué ou déployé.
- L'administration générale multi-voyages et l'édition complète en ligne sont reportées après validation de cette architecture.

## Modèle de séparation

| Catégorie | Exemples | Cycle de vie |
|---|---|---|
| Moteur | profils, jeux, guide, synchronisation, hors-ligne, album | évolue avec le code |
| Pack de voyage | itinéraire, lieux, textes, questions, cartes, médias | versionné par voyage |
| Données de famille | profils, scores, commentaires, photos, état du séjour | isolées par instance/famille |

---

# Epic 31 — Référence Turquie et contrat de généralisation

**Valeur :** protéger l'existant et rendre explicites les frontières entre moteur, pack de contenu et données de famille.

**Dépendances :** aucune. Prérequis des epics 32 à 35.

## 31.1 — Figer la Turquie 2026 comme instance de référence

**En tant que** responsable du produit,
**je veux** disposer d'une référence reproductible de l'instance Turquie,
**afin de** pouvoir faire évoluer le moteur sans régression silencieuse.

### Critères d'acceptation

- Une version de référence du code, du contenu, des médias, des règles Firebase et de la configuration de déploiement est identifiée.
- Les parcours critiques sont listés : premier accès, création de profils, déverrouillage, synchronisation, guide, jeux, mode hors-ligne et album.
- Les différences acceptables entre versions sont documentées.
- La validation de la référence peut être rejouée après une évolution du moteur.

## 31.2 — Cartographier les dépendances spécifiques au voyage

**En tant que** équipe de maintenance,
**je veux** identifier chaque donnée spécifique à la Turquie et chaque comportement générique,
**afin de** savoir ce qui doit entrer dans un pack de voyage.

### Critères d'acceptation

- Les contenus spécifiques sont inventoriés : identité, calendrier, lieux, rubriques, documents, jeux, visites guidées et médias.
- Les références directes à la Turquie dans le moteur sont recensées.
- Les données modifiables par une famille sont distinguées du contenu publié.
- Les éléments qui ne peuvent pas encore être généralisés sont signalés avec une décision attendue.

## 31.3 — Définir le contrat conceptuel d'un voyage

**En tant que** concepteur du produit,
**je veux** un contrat commun pour représenter un voyage,
**afin de** permettre à l'application de fonctionner sans connaître sa destination.

### Critères d'acceptation

- Le contrat couvre au minimum l'identité, la durée, le calendrier, les lieux, les contenus, les jeux, les médias et les paramètres visuels.
- Chaque élément éditorial possède un identifiant stable dans le pack.
- Les relations jour-lieu-question-jeu sont explicites.
- Les champs obligatoires, optionnels et compatibles avec les anciennes données sont documentés.
- Le contrat précise la version du format de pack et la version minimale du moteur.

## 31.4 — Définir la stratégie de version et de migration

**En tant que** responsable technique,
**je veux** une politique de versionnement des packs et des données,
**afin de** pouvoir faire évoluer le moteur sans rendre les anciens voyages illisibles.

### Critères d'acceptation

- Les versions du moteur, du pack et des données de famille sont distinguées.
- Les changements compatibles et incompatibles sont définis.
- Une stratégie est documentée pour les migrations de données locales et cloud.
- Une règle précise indique quand un ancien pack doit être reconstruit ou conservé tel quel.

---

# Epic 32 — Packs de contenu de voyage

**Valeur :** rendre le contenu Turquie remplaçable par un autre contenu sans dupliquer le moteur.

**Dépendances :** Epic 31.

## 32.1 — Créer le modèle de pack de voyage

**En tant que** développeur de contenu,
**je veux** un format de pack structuré,
**afin de** pouvoir préparer plusieurs voyages avec les mêmes règles.

### Critères d'acceptation

- Un pack contient les métadonnées du voyage et ses sous-ensembles éditoriaux.
- Les identifiants sont uniques dans le pack et stables entre deux builds.
- Le pack Turquie peut être représenté sans perte fonctionnelle.
- Le format est documenté avec un exemple minimal et un exemple complet.

## 32.2 — Brancher le moteur sur le pack actif

**En tant que** voyageur,
**je veux** que l'application affiche le contenu du voyage actif,
**afin de** retrouver les mêmes fonctionnalités quelle que soit la destination.

### Critères d'acceptation

- Les écrans génériques consomment le pack actif plutôt que des constantes propres à la Turquie.
- L'absence d'une rubrique optionnelle n'entraîne pas d'écran vide ou d'erreur.
- Les fonctionnalités existantes de l'instance Turquie restent disponibles.
- Aucun comportement métier ne dépend du nom d'une destination codé en dur.

## 32.3 — Valider automatiquement un pack avant publication

**En tant que** responsable du contenu,
**je veux** vérifier un pack avant son build,
**afin de** détecter les incohérences avant de les livrer aux familles.

### Critères d'acceptation

- La validation détecte les identifiants dupliqués ou manquants.
- Elle vérifie les jours, lieux, relations, coordonnées, médias et références de jeux.
- Elle signale les médias absents et les fichiers inutilisés selon une règle documentée.
- Le build échoue pour une erreur bloquante et avertit pour une anomalie non bloquante.
- Les messages indiquent le pack, le fichier et l'élément en erreur.

## 32.4 — Organiser les médias par pack

**En tant que** responsable du contenu,
**je veux** séparer les images et audios par voyage,
**afin de** ne pas mélanger ou précacher les médias de plusieurs instances.

### Critères d'acceptation

- Chaque média peut être rattaché sans ambiguïté à un pack et à un élément éditorial.
- Les chemins ou URLs ne dépendent pas d'un dossier Turquie global.
- Le mode hors-ligne ne précache que les médias de l'instance publiée.
- Le remplacement d'un média ne modifie pas les autres packs.

---

# Epic 33 — Isolation des instances et des données

**Valeur :** garantir qu'un nouveau voyage ne mélange jamais ses données avec la Turquie ou avec une autre famille.

**Dépendances :** Epic 31. Les travaux 33.2 et 33.3 utilisent le contrat de l'Epic 32.

## 33.1 — Namespace des données locales par voyage

**En tant que** utilisateur d'un appareil,
**je veux** que les données locales soient isolées par instance,
**afin de** pouvoir utiliser plusieurs voyages sans collision.

### Critères d'acceptation

- Les clés localStorage et sessionStorage sont rattachées à un identifiant d'instance.
- Un profil, une progression, une préférence ou une file d'attente d'un voyage n'est jamais relu par un autre voyage.
- Les données existantes Turquie sont migrées ou explicitement invalidées selon une stratégie documentée.
- Un changement d'instance ne supprime pas silencieusement les données de l'instance précédente.

## 33.2 — Scoper la synchronisation cloud par instance et famille

**En tant que** famille,
**je veux** que mon espace cloud soit isolé par voyage,
**afin de** protéger profils, scores, commentaires et photos.

### Critères d'acceptation

- Le chemin ou projet Firebase utilisé par une instance est déterministe et documenté.
- Deux instances ne peuvent pas lire ou écrire le même état familial par erreur.
- L'identifiant d'instance et l'identifiant de famille sont distincts.
- Les files d'écriture hors-ligne utilisent le même cloisonnement.

## 33.3 — Définir le comportement de sélection d'une instance

**En tant que** utilisateur,
**je veux** savoir quel voyage est actif,
**afin de** ne pas attribuer une action au mauvais voyage.

### Critères d'acceptation

- Le mode de sélection est défini pour la première cible : déploiement séparé, URL ou configuration.
- L'instance active est visible dans les endroits pertinents de l'application.
- Une instance inconnue ou mal configurée est refusée avec un message exploitable.
- Le changement d'instance ne réutilise pas automatiquement une session d'une autre instance.

## 33.4 — Adapter les règles de sécurité et tester l'isolation

**En tant que** responsable sécurité,
**je veux** vérifier l'isolation des espaces de données,
**afin de** empêcher les lectures et écritures croisées.

### Critères d'acceptation

- Les règles test et production couvrent le nouveau périmètre d'instance.
- Les tests refusent la lecture et l'écriture d'une autre famille ou d'une autre instance.
- Les données sensibles existantes restent protégées.
- Les scénarios multi-appareils et hors-ligne sont couverts.

---

# Epic 34 — Build et déploiement par voyage

**Valeur :** rendre la création d'une nouvelle instance répétable sans modifier manuellement le moteur.

**Dépendances :** Epics 31 à 33.

## 34.1 — Définir la configuration d'une instance

**En tant que** responsable du déploiement,
**je veux** une configuration déclarative par instance,
**afin de** créer un nouveau voyage avec une procédure reproductible.

### Critères d'acceptation

- La configuration contient au minimum l'identifiant, le pack, le nom, la version, la cible Firebase et les paramètres PWA.
- Les secrets et les paramètres publics sont distingués.
- La configuration Turquie actuelle peut être décrite sans perte.
- Une configuration invalide est détectée avant le build.

## 34.2 — Automatiser le build et le déploiement d'une instance

**En tant que** responsable produit,
**je veux** une procédure documentée de publication,
**afin de** ne pas dépendre d'opérations manuelles fragiles.

### Critères d'acceptation

- La procédure part d'un pack et d'une configuration d'instance identifiés.
- Elle exécute les validations de contenu avant le build.
- Elle produit les artefacts et l'URL de l'instance attendue.
- Elle indique clairement les variables Firebase et les règles à déployer.
- Une procédure de retour à la version précédente est documentée.

## 34.3 — Gérer le cache PWA et les mises à jour par instance

**En tant que** voyageur,
**je veux** que l'application hors-ligne corresponde toujours au voyage installé,
**afin de** ne pas voir d'anciens écrans ou médias après une mise à jour.

### Critères d'acceptation

- Le cache est séparé ou invalidé lorsqu'une instance ou une version de pack change.
- Une mise à jour du moteur ne mélange pas les fichiers d'un ancien pack avec ceux du nouveau.
- Le mode hors-ligne reste utilisable après une mise à jour complète.
- Les erreurs de mise à jour sont récupérables sans perte des données de famille.

## 34.4 — Documenter la checklist opérationnelle

**En tant que** personne qui prépare un nouveau voyage,
**je veux** une checklist complète,
**afin de** pouvoir créer une instance sans connaissance implicite du projet.

### Critères d'acceptation

- La checklist couvre contenu, médias, Firebase, règles, build, PWA, tests et publication.
- Elle distingue les actions obligatoires des actions facultatives.
- Elle contient une étape de test sur appareil mobile et hors-ligne.
- Elle indique les éléments à archiver pour retrouver une instance publiée.

---

# Epic 35 — Preuve par un second voyage

**Valeur :** démontrer que l'architecture est réellement générique avant d'investir dans une plateforme d'administration.

**Dépendances :** Epics 31 à 34.

## 35.1 — Créer un pack minimal de test indépendant

**En tant que** équipe technique,
**je veux** un second pack volontairement minimal,
**afin de** vérifier que le moteur ne dépend plus du contenu Turquie.

### Critères d'acceptation

- Le pack possède une identité, un itinéraire, quelques lieux, un document, un jeu et des médias distincts.
- Il utilise des noms, coordonnées et textes sans rapport avec la Turquie.
- Il peut être validé et construit avec la même procédure que la Turquie.
- Les écrans principaux affichent uniquement son contenu.

## 35.2 — Publier une instance de démonstration du second pack

**En tant que** responsable du produit,
**je veux** installer le second pack dans une instance isolée,
**afin de** tester le parcours complet avant un prochain vrai voyage.

### Critères d'acceptation

- L'instance possède une configuration, une URL et un espace cloud propres.
- Le premier accès, les profils, le déverrouillage et la synchronisation fonctionnent.
- Les données de démonstration ne sont pas visibles depuis l'instance Turquie.
- Le mode hors-ligne et l'album utilisent les médias du second pack.

## 35.3 — Ajouter les tests de non-régression inter-packs

**En tant que** mainteneur,
**je veux** tester plusieurs packs avec le même moteur,
**afin de** empêcher le retour de dépendances cachées à une destination.

### Critères d'acceptation

- Les tests vérifient au moins le dashboard, le guide, le calendrier, les jeux, les médias, le cloud et l'album.
- Un même scénario peut être exécuté avec la Turquie et le pack minimal.
- Les tests vérifient l'absence de collision entre données locales et cloud.
- Les erreurs de validation d'un pack sont testées.

## 35.4 — Valider la conservation de l'instance Turquie

**En tant que** responsable du produit,
**je veux** confirmer que la Turquie reste inchangée pour ses utilisateurs,
**afin de** pouvoir généraliser le moteur sans dégrader l'application existante.

### Critères d'acceptation

- Les parcours de référence Turquie restent passants.
- Les contenus et médias Turquie restent accessibles.
- Les données existantes ne sont pas réinitialisées par le nouveau mécanisme d'instance.
- La procédure de déploiement permet de publier une correction moteur sans changer le pack Turquie.

---

## Dépendances globales et ordre recommandé

```text
31.1 -> 31.2 -> 31.3 -> 31.4
                  |
                  v
            32.1 -> 32.2 -> 32.3 -> 32.4
                  |
                  v
            33.1 -> 33.2 -> 33.3 -> 33.4
                  |
                  v
            34.1 -> 34.2 -> 34.3 -> 34.4
                  |
                  v
            35.1 -> 35.2 -> 35.3 -> 35.4
```

Les stories peuvent être regroupées en lots, mais il est déconseillé de commencer 33 ou 34 avant que le contrat de pack de 31.3 et 32.1 soit stabilisé.

## Hors périmètre de cette trajectoire

- Interface d'administration générale pour créer et modifier des voyages.
- Catalogue public de voyages.
- Comptes utilisateurs partagés entre plusieurs familles.
- Fusion de deux voyages ou transfert automatique d'une famille d'un voyage vers un autre.
- Réécriture immédiate de tout le contenu dans une base distante.
- Migration automatique sans stratégie validée des anciennes données Turquie.

## Décisions restantes avant développement

1. Confirmer le choix initial : un déploiement séparé par voyage plutôt qu'une application multi-voyages dynamique.
2. Choisir si l'isolation cloud se fait par projet Firebase ou par racine `tripId` dans un même projet.
3. Décider si le pack est compilé dans l'application ou téléchargé au démarrage.
4. Définir le comportement attendu lorsqu'un même appareil connaît plusieurs instances.
5. Choisir le second voyage de démonstration et son niveau de réalisme.
