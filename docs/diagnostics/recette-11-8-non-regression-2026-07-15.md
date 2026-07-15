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
