# Recette 11.8 - Non-regression multi-appareils

Date: 2026-07-15
Story: 11-8-recette-non-regression-multi-appareils
Epic: 11

## 1. Protocole de recette (environnement test)

Objectif: valider la continuite numerique apres correctifs Epic 11, en couvrant les scenarios historiques de regression.

Scenarios cibles:
- D1: Refresh en phase `during` sans ecran blanc.
- D2: Switch de profil sur meme appareil sans contamination de donnees.
- D3: Coherence de donnees partagees pour un meme `familyId` (synchronisation inter-clients).

Execution choisie pour cette passe:
- Validation automatisee par tests de parsing/synchronisation cloud (source de verite partagee).
- Validation regression globale applicative via suite Vitest complete.

## 2. Resultats d execution

### D1 - Refresh during
- Test: `uses family-wide phase when available`
- Fichier: `src/services/cloudSyncProvider.test.ts`
- Resultat: PASS
- Observation: la phase partagee reste `during` lorsque la valeur famille-wide est disponible.

### D2 - Switch profil sans contamination
- Test: `keeps checklist and game history isolated per profile`
- Fichier: `src/services/cloudSyncProvider.test.ts`
- Resultat: PASS
- Observation: checklists et historiques de jeu restent isoles par `profileId`.

### D3 - Coherence inter-clients meme familyId
- Test: `normalizes owner uniqueness and exposes shared phase coherently`
- Fichier: `src/services/cloudSyncProvider.test.ts`
- Resultat: PASS
- Observation: coherences invariants maintenues (owner unique + phase partagee coherent).

## 3. Preuves

Commandes executees:
- `npm run test -- src/services/cloudSyncProvider.test.ts`
- `npm run test`

Sorties synthese:
- Cible cloud sync: 5/5 PASS.
- Suite complete: 26 PASS, 3 SKIP (RTDB rules skip sans variable `FIREBASE_DATABASE_EMULATOR_HOST`).

## 4. Residual Risks

- Les tests RTDB rules restent skips dans cette execution (absence variable emulateur).
- Les scenarios manuels strictement multi-navigateurs Chrome/Edge n ont pas ete rejoues en UI ici; la couverture fournie est automatisee au niveau synchronisation/invariants.

## 5. Conclusion

Validation automatisee non-regression obtenue pour AC1-AC3 via tests cloud sync + regression globale.
Traces de recette versionnees dans `docs/diagnostics` (AC4).

## 6. Execution manuelle stricte D1..D5 (a completer)

Worksheet terrain cree pour validation multi-appareils reelle:
- `docs/diagnostics/recette-11-8-manuel-d1-d5-worksheet-2026-07-15.md`

Condition de cloture finale recommandee:
- completer D1..D5 avec evidences, puis passer la story 11-8 de `review` a `done`.

## 7. Incident KO releve en execution manuelle

KO constate sur D3 (switch profil A/B):
- symptome: retour au flux checklist a debloquer apres switch owner -> utilisateur -> owner, alors que la phase etait deja `during`.

Cause probable analysee:
- la rehydratation depuis `cloudSnapshot` etait declenchee uniquement sur changement de snapshot,
  pas sur changement d authentification/profil; apres switch, l etat local pouvait rester sur `before`.

Correctif applique:
- `src/app/App.tsx`: effet de rehydratation cloud declenche aussi sur `isAuthenticated` et `profile.id`.
- `src/app/cloud-hydration.ts`: extraction de la logique de decision de rehydratation.
- `src/app/cloud-hydration.test.ts`: test unitaire de non-regression sur la decision de rehydratation.

Validation technique post-fix:
- `npm run test -- src/app/cloud-hydration.test.ts src/services/cloudSyncProvider.test.ts src/app/owner-governance.integration.test.ts` => PASS.
- `npm run test` => PASS (RTDB rules toujours skip sans emulateur).
- `npm run build` => PASS.

Action restante:
- rejouer D3 manuellement (et idealement D1..D5 rapide) pour confirmer le GO terrain avant passage story 11-8 en `done`.

## 8. Second KO terrain et correctif complementaire

KO complementaire observe:
- scenario: owner debloque -> switch utilisateur -> retour owner.
- symptome: ecran alterne entre etat debloque et checklist, puis retour stable debloque seulement apres refresh manuel.

Cause probable analysee:
- course entre rehydratation cloud et push cloud au moment du retour owner.
- un push pouvait partir avant rehydratation complete du profil existant, avec un etat local transitoire (`phase=before`).

Correctif complementaire applique:
- `src/app/cloud-hydration.ts`: ajout `shouldPushCloudSnapshot` pour bloquer les pushes avant preconditions de rehydratation.
- `src/app/App.tsx`:
    - memorisation du `hydratedCloudProfileId` applique,
    - blocage push tant que le profil cloud courant n est pas rehydrate,
    - reset explicite de ce marqueur lors du switch profil.
- `src/app/cloud-hydration.test.ts`: ajout tests de non-regression sur les decisions de push.

Validation technique post-fix #2:
- tests cibles: PASS (`cloud-hydration`, `cloudSyncProvider`, `owner-governance`).
- suite complete: PASS (RTDB rules skip sans emulateur).
- build: PASS.

Action restante finale:
- rejouer D3 manuel (owner -> user -> owner) sans refresh, puis confirmer GO/NO-GO.

## 9. Troisieme ajustement (scintillement persistant + refresh KO)

Symptome remonte:
- scintillement checklist <-> ecran debloque au retour owner,
- puis apres refresh, retour sur checklist (phase `before`).

Durcissement applique:
- blocage total des pushes cloud si `cloudSnapshot` absent,
- maintien d un etat `isProfileHydrationPending` pour masquer l UI metier tant que le profil connecte n est pas hydrate,
- ecran de chargement affiche pendant cette fenetre pour eliminer le clignotement,
- reinitialisation explicite des marqueurs de push/hydratation au switch profil.

Fichiers impactes:
- `src/app/App.tsx`
- `src/app/cloud-hydration.ts`
- `src/app/cloud-hydration.test.ts`

Validation post-ajustement:
- tests cibles: PASS
- suite complete: PASS
- build: PASS

Action terrain attendue:
- rejouer D3 strictement sans refresh manuel et confirmer stabilite.
