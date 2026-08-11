# Ajouter une rubrique (pack de thèmes) au Trivial

Le jeu propose plusieurs "packs" au moment de créer une partie (aujourd'hui :
Trivial Turquie et Culture Générale). Voici comment en ajouter un nouveau —
**tout se passe côté serveur**, aucune modification de l'application React
n'est nécessaire : le sélecteur de rubrique se met à jour tout seul.

## 1. Créer le fichier de questions

Créez un fichier `questions_<votre_pack>.json` à la racine du serveur (au
même niveau que `main.py`), avec une clé par thème et le même format que les
fichiers existants :

```json
{
  "mon_theme": [
    {"q": "Votre question ?", "choices": ["Bonne réponse", "Distracteur 1", "Distracteur 2", "Distracteur 3"], "answer": 0}
  ]
}
```

- `answer` est l'index (0 = premier choix) de la bonne réponse — vous pouvez
  toujours la mettre en premier, l'ordre est mélangé automatiquement à
  l'affichage.
- Un pack doit avoir **exactement 6 thèmes** (le plateau est prévu pour 6
  catégories × 4 cases = 24 cases).
- Comptez une dizaine de questions par thème minimum pour une partie qui ne
  se répète pas trop vite (voir la section sur l'ordre aléatoire plus bas).

## 2. Déclarer le pack dans `main.py`

Ouvrez `main.py`, repérez le dictionnaire `PACKS` en haut du fichier, et
ajoutez une nouvelle entrée sur le même modèle :

```python
PACKS: dict[str, dict] = {
    "turquie": { ... },
    "culture-generale": { ... },
    "mon-pack": {
        "label": "Mon Nouveau Pack 🎉",
        "categories": ["mon_theme", "theme2", "theme3", "theme4", "theme5", "theme6"],
        "category_labels": {
            "mon_theme": "Mon Thème",
            "theme2": "Deuxième Thème",
            # ... les 6 thèmes
        },
        "questions_file": "questions_mon_pack.json",
    },
}
```

- La clé du dictionnaire (`"mon-pack"`) est l'identifiant technique — pas
  d'espaces ni d'accents, des tirets si besoin.
- `categories` doit contenir exactement les mêmes clés que celles utilisées
  dans votre fichier JSON de questions.
- `category_labels` est ce qui s'affiche à l'écran (légende, en-tête des
  questions) — peut être différent des clés techniques.

## 3. Redéployer

Poussez les deux fichiers (`main.py` modifié + le nouveau
`questions_<votre_pack>.json`) sur votre dépôt GitHub, laissez Render
redéployer. C'est tout — la nouvelle rubrique apparaît automatiquement dans
le sélecteur au moment de créer une partie, sans toucher à l'application
React.

## Vérifier que ça fonctionne

Ouvrez `https://votre-serveur.onrender.com/packs` dans un navigateur : vous
devez voir votre nouveau pack dans la liste JSON retournée.

## Sur l'ordre aléatoire des questions

Déjà en place, rien à faire : à chaque question posée, le serveur pioche au
hasard (`random.choice`) parmi les questions **pas encore posées dans cette
partie** pour la catégorie concernée. Une fois tout le stock épuisé, il
recommence à piocher aléatoirement dans l'ensemble du lot (les questions
peuvent alors ressortir, mais toujours dans un ordre imprévisible — jamais
dans l'ordre du fichier JSON).
