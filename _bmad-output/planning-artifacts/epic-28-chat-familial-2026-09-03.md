# Epic 28 — Chat familial + sondages (CN1/CN2 du backlog)

Date: 2026-09-03
Auteur: Assistant (analyse à la demande de Jean-Philippe)
Scope: faisabilité + spécification de la nouvelle rubrique "Chat", en réponse aux items `CHAT/NETWORKING - CN1 - messagerie / chat en ligne` et `CN2 - sondage quotidien` de `docs/Backlog Appli.txt`.
Stories détaillées : `docs/specs-stories/epic-28/`.

## Verdict de faisabilité

Oui, réalisable avec l'architecture actuelle (Firebase Realtime Database + règles déclaratives, sans backend applicatif), en suivant le même pattern déjà utilisé pour le carnet de visite et les photos de documents (chemin dédié hors du snapshot famille principal, chargé à la demande — voir `observePlaceVisitLog`/`observeDocumentPhotos` dans `cloudSyncProvider.ts`). Aucune nouvelle dépendance ni service externe nécessaire.

**Une réserve technique importante** : l'app n'a pas de notification push serveur (pas de Firebase Cloud Messaging, pas de fonction cloud). Le point 5 de la demande ("l'icône fait apparaître qu'il y a des messages non lus") est réalisable comme **badge dans l'app** (pastille sur l'icône de nav + compteur par conversation), y compris via une notification navigateur si l'app est déjà ouverte dans un onglet (mécanisme `notifications.ts` existant). En revanche, une **notification qui réveille le téléphone alors que l'app est fermée** n'est pas possible sans ajouter une brique FCM + un minimum de logique serveur — hors périmètre proposé ici, à traiter comme une évolution séparée si besoin.

## Décisions de conception actées avec Jean-Philippe

- Le rôle **visiteur** (Epic 24) n'a **pas accès** à la rubrique Chat — cohérent avec les autres restrictions déjà appliquées à ce rôle (checklist, jeu, résultats).
- Le **propriétaire** participe aux conversations, mais son nom/surnom n'est jamais affiché : il apparaît sous l'étiquette fixe **"Organisateur"**.

## Découpage en stories

1. **28.1 — Conversation "Voyage" par défaut + messagerie texte** : groupe créé automatiquement avec tous les voyageurs + propriétaire, texte + emoji uniquement, horodatage, look inspiré WhatsApp/WeChat.
2. **28.2 — Groupes personnalisés et conversations en tête-à-tête** : création de groupes/1-to-1 entre voyageurs et propriétaire (jamais avec un visiteur).
3. **28.3 — Sondages du propriétaire** : uniquement dans la conversation "Voyage", type oui/non ou réponse libre ("humeur"), résultats nominatifs.
4. **28.4 — Badge de messages non lus** : pastille sur l'icône Chat + compteur par conversation.

Ordre recommandé : 28.1 → 28.2 → 28.4 → 28.3 (le sondage est un type de message particulier dans la conversation "Voyage", donc plus simple à poser une fois 28.1 stable ; 28.4 ne dépend que de 28.1).

## Point d'attention technique à trancher avant implémentation

**Confidentialité réelle des conversations privées (1-to-1 et groupes restreints) au niveau des règles Firebase.**

Deux options :
- **Option simple (recommandée pour un v1 familial)** : toutes les conversations de la famille sont lisibles par n'importe quel membre authentifié de la famille (même règle que `placeVisitLogs`), et le filtrage "je ne vois que mes conversations" se fait côté client (UI). Un membre de la famille technophile pourrait en théorie interroger la base directement et lire les messages d'un groupe dont il n'est pas membre. Risque jugé faible dans un contexte familial, cohérent avec le niveau de confidentialité déjà admis ailleurs dans l'app (commentaires, carnet de visite).
- **Option renforcée** : indexer chaque conversation par les `uid` de ses membres (`memberUids`) pour que la règle `.read` Firebase vérifie l'appartenance côté serveur, avec la complexité de maintenir cet index à jour (multi-appareils par profil, ajout/retrait de membres). Plus sûr, plus coûteux à construire et tester.

Recommandation : démarrer en option simple, avec un avertissement clair dans l'UI ("conversation privée entre vous, à ne pas confondre avec une confidentialité de niveau sécurité") si Jean-Philippe veut que les ados de la famille comprennent la limite réelle.
