---
baseline_commit: 16b9f720316e88b7a9e02492711bab043b04f976
---

# Story 21.2: Avis et commentaires sur les lieux visités

Status: review

## Story

As a family member (proprietaire, voyageur utilisateur, or visiteur),
I want to react to a place (j'aime / j'aime pas) and write a comment,
so that we can keep shared travel memories for each visited place.

## Acceptance Criteria

1. Depuis la fiche d'un lieu, un profil proprietaire, utilisateur (voyageur) ou visiteur peut:
   - poser une reaction binaire (like/dislike),
   - publier un commentaire texte optionnel.
2. Les avis de tous les profils de la famille sont visibles sur la fiche du lieu avec auteur lisible.
3. Un profil peut modifier et supprimer uniquement ses propres avis/commentaires.
4. La suppression d'un commentaire personnel reste possible meme si ce commentaire est ancien et que d'autres ont ete ajoutes ensuite.
5. La suppression d'un profil ne supprime pas ses commentaires historiques:
   - les commentaires restent visibles,
   - l'auteur est resolu en "Profil supprime" si le profil n'existe plus.
6. Les avis/commentaires persistent et se synchronisent entre appareils via Firebase RTDB.
7. Un lieu sans commentaire affiche un etat vide explicite (pas d'erreur).
8. Limite de saisie appliquee: commentaire <= 500 caracteres.

## Tasks / Subtasks

- [x] Modeliser les donnees de commentaires cloud (AC: 1,2,3,5,6)
  - [x] Ajouter les types dans src/types/cloud.ts
  - [x] Prevoir une cle stable par commentaire (commentId)
  - [x] Inclure placeId, authorProfileId, authorSurnameSnapshot, reaction, text, createdAt, updatedAt
- [x] Parser/synchroniser commentaires dans le provider cloud (AC: 2,5,6)
  - [x] Etendre parseCloudSnapshot dans src/services/cloudSyncProvider.ts
  - [x] Etendre pushCloudSnapshot pour ecrire/synchroniser les commentaires
  - [x] Garder compatibilite avec profils supprimes
- [x] Ajouter UI et logique de saisie sur fiche lieu (AC: 1,2,3,4,7,8)
  - [x] Etendre PlaceScreen/ContentDetailScreen dans src/app/App.tsx
  - [x] Ajouter liste commentaires + etat vide + formulaire
  - [x] Ajouter actions modifier/supprimer visibles seulement pour auteur
- [x] Gerer les droits role et non-regressions (AC: 1,3)
  - [x] Verifier que proprietaire/utilisateur/visiteur peuvent commenter
  - [x] Verifier qu'un profil ne peut pas modifier/supprimer le commentaire d'un autre
- [x] Couvrir par tests (AC: tous)
  - [x] Unit tests parse/push commentaires dans src/services/cloudSyncProvider.test.ts
  - [x] Integration tests UI/comments dans src/app (flux multi-profils)
  - [x] Regles RTDB: ajouter validations comments dans firebase/database.rules.test.json et tests associes

## Dev Notes

### Story Foundation

- Source story: docs/specs-stories/epic-21/21.2-avis-commentaires-lieux-visites.md
- Story predecessor: _bmad-output/implementation-artifacts/21-1-carte-interactive-globale.md
- Votre precision metier additionnelle integree:
  - "Les visiteurs peuvent aussi commenter comme les voyageurs"
  - "Un utilisateur peut supprimer son commentaire meme si d'autres commentaires ont ete ajoutes ensuite"
  - "Quand un utilisateur est supprime, on peut conserver ses commentaires"

### Architecture Compliance (must follow)

- Le mode cloud est deja autoritaire pour les donnees partagees:
  - lecture/hydratation via useCloudSync + parseCloudSnapshot
  - ecriture via pushSnapshot -> pushCloudSnapshot
- Eviter toute reinitialisation locale qui effacerait des commentaires en race condition.
- Respecter les patterns immutables React deja utilises dans App.tsx.
- Ne pas casser les flux existants (checklist, jeux, login, suppression profil).

### Existing UPDATE Files to Read/Modify

- src/app/App.tsx
  - Etat ecran place et navigation deja en place (openPlace, selectedPlaceId, PlaceScreen).
  - Les effets cloud sont sensibles aux races; toute nouvelle donnee doit suivre le meme schema d'hydratation/push.
- src/types/cloud.ts
  - Point d'entree des contrats partages cloud snapshot/payload.
- src/services/cloudSyncProvider.ts
  - Parsing et ecriture RTDB centralises.
- src/services/cloudSyncProvider.test.ts
  - Tests de contrat parse/write existants a etendre.
- firebase/database.rules.prod.json
  - Regles a etendre pour nouveau noeud de commentaires.
- src/services/firebase-rtdb.rules.test.ts
  - Ajouter tests d'autorisation/validation pour commentaires.

### Data Model Guardrails

- Recommande: stocker sous families/{familyId}/placeComments/{placeId}/{commentId}
- commentId: genere client-side (prefix profileId + timestamp + random) ou push key RTDB.
- Structure recommandee:
  - placeId: string (coherence defensive)
  - authorProfileId: string
  - authorSurnameSnapshot: string (evite perte d'affichage apres suppression profil)
  - reaction: "like" | "dislike"
  - text: string (0..500)
  - createdAt: number
  - updatedAt: number
- Regle "1 commentaire max par profil/lieu":
  - soit contrainte logique (upsert par pair placeId+authorProfileId),
  - soit stockage indexe par authorProfileId sous placeId.
  - Choix recommande: index par authorProfileId pour simplifier permission et suppression ciblée.

### Permission Guardrails

- Ecriture commentaire: auteur authentifie membre famille uniquement.
- Edition/suppression: uniquement auteur (authorProfileId == profile.id actif).
- Lecture: tous membres de la famille.
- Suppression profil (story 18.3): ne pas cascader suppression commentaires.

### UX Guardrails

- Section avis en bas de la fiche lieu, apres contenu principal.
- Etat vide explicite: "Soyez le premier a donner votre avis."
- Formulaire simple:
  - toggle reaction (j'aime/j'aime pas)
  - textarea commentaire optionnel
  - compteur caracteres (500 max)
- Message d'erreur clair sur depassement longueur ou echec sync.
- Rendre les controles d'edition/suppression uniquement pour auteur courant.

### Testing Requirements

- Unit:
  - parseCloudSnapshot parse correctement commentaires valides/invalides
  - conservation commentaires avec auteur supprime (fallback label)
  - upsert/suppression preserve les autres commentaires
- Integration UI:
  - proprietaire/utilisateur/visiteur peuvent commenter
  - utilisateur A ne peut pas supprimer commentaire utilisateur B
  - suppression d'un ancien commentaire fonctionne avec commentaires plus recents presents
- Rules tests:
  - author peut ecrire/editer/supprimer son commentaire
  - non-author refuse
  - membre non-famille refuse
  - validation champ reaction/text/length/date

### Library / Framework Requirements

- Conserver stack actuelle (React + TypeScript + Firebase RTDB).
- Pas de nouvelle librairie necessaire.
- Utiliser patterns existants de state update (setState immuable).

### Latest Tech Information (Web Research)

- Firebase RTDB recommande des cles uniques pour listes multi-client (`push()` keys) pour eviter conflits d'ecriture concurrents.
- Les rules RTDB doivent couvrir:
  - .read/.write d'autorisation,
  - .validate des schemas,
  - .indexOn pour futures queries si tri/filtrage devient necessaire.
- React useState:
  - ne jamais muter objets/tableaux en place,
  - utiliser copies immuables et updaters fonctionnels quand derive de l'etat precedent.

### Project Structure Notes

- Aligner avec structures existantes:
  - Types cloud: src/types/cloud.ts
  - Provider cloud: src/services/cloudSyncProvider.ts
  - UI story: src/app/App.tsx
  - Rules: firebase/database.rules.prod.json
  - Tests rules: src/services/firebase-rtdb.rules.test.ts
- Eviter de disperser la logique commentaire dans plusieurs fichiers sans necessite.

### References

- docs/specs-stories/epic-21/21.2-avis-commentaires-lieux-visites.md
- _bmad-output/implementation-artifacts/21-1-carte-interactive-globale.md
- src/app/App.tsx
- src/types/cloud.ts
- src/services/cloudSyncProvider.ts
- src/services/cloudSyncProvider.test.ts
- firebase/database.rules.prod.json
- src/services/firebase-rtdb.rules.test.ts
- https://firebase.google.com/docs/database/web/lists-of-data
- https://firebase.google.com/docs/database/security
- https://react.dev/reference/react/useState

## Dev Agent Record

### Agent Model Used

GPT-5.3-Codex

### Debug Log References

- Workflow activation resolved via _bmad/scripts/resolve_customization.py
- Story key targeted: 21-2-avis-commentaires-lieux-visites

### Completion Notes List

- Implemented profile-scoped place comments model across cloud types, provider parse/push, and app state hydration.
- Added place comments UI on place detail: reaction toggle, optional text (<=500), empty state, and author-only edit/delete actions.
- Added fallback author display "Profil supprime" when a comment author profile no longer exists.
- Added/updated tests: provider unit tests, new App integration tests for comments, and RTDB rules tests for permissions/validation.
- Full regression suite executed: 281 passed, 48 skipped.

### File List

- _bmad-output/implementation-artifacts/21-2-avis-commentaires-lieux-visites.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- src/types/cloud.ts
- src/services/cloudSyncProvider.ts
- src/hooks/useCloudSync.ts
- src/app/App.tsx
- src/services/cloudSyncProvider.test.ts
- src/hooks/useCloudSync.test.ts
- src/app/App.place-comments.integration.test.tsx
- firebase/database.rules.prod.json
- firebase/database.rules.test.json
- src/services/firebase-rtdb.rules.test.ts

## Change Log

- 2026-08-02: Implemented story 21.2 end-to-end (cloud model, sync, UI, rules, and tests); story moved to review.
