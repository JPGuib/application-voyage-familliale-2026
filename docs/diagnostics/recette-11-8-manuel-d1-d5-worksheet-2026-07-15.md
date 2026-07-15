# Worksheet execution manuelle - Story 11.8 (D1..D5)

Date: 2026-07-15
Projet: application de voyage 2026
Story: 11-8-recette-non-regression-multi-appareils
Objectif: valider en conditions reelles la non-regression multi-appareils avant passage en done.

## 1) Preconditions

- [ ] Build local vert.
- [ ] Test env deploye et accessible.
- [ ] Appareil A disponible (owner).
- [ ] Appareil B disponible (non-owner).
- [ ] Meme Family Sync ID sur A et B.
- [ ] Logs navigateur consultables sur A et B.

## 2) Configuration de test

- Family ID:
- Appareil A (owner):
- Appareil B (non-owner):
- Navigateur A:
- Navigateur B:
- URL test env:
- Heure debut:

## 3) Scenarios D1..D5

### D1 - Deblocage owner depuis A

- [ ] A se connecte avec profil owner.
- [ ] A declenche le deblocage vers phase during.
- [ ] A reste sans ecran blanc.

Attendu:
- phase= during sur A
- absence erreur bloquante UI

Observe:
- Resultat:
- Notes:
- Timestamp:
- Evidence (screenshot/log):

### D2 - Verification non-owner sur B

- [ ] B se connecte comme non-owner sur la meme famille.
- [ ] B voit phase during sans action owner.

Attendu:
- phase coherente avec A
- aucune action owner requise cote B

Observe:
- Resultat:
- Notes:
- Timestamp:
- Evidence (screenshot/log):

### D3 - Switch profil A/B sans contamination

- [ ] Sur A: changer de profil puis revenir.
- [ ] Sur B: changer de profil puis revenir.

Attendu:
- pas de re-verrouillage involontaire
- pas de contamination de checklist/resultats entre profils

Observe:
- Resultat:
- Notes:
- Timestamp:
- Evidence (screenshot/log):

### D4 - Offline stale action sur B puis reconnexion

- [ ] Mettre B offline.
- [ ] Tenter une action stale sur B.
- [ ] Reconnecter B.

Attendu:
- convergence apres reconnexion
- aucune elevation non-owner
- aucune ecriture invalide sur phase partagee

Observe:
- Resultat:
- Notes:
- Timestamp:
- Evidence (screenshot/log):

### D5 - Verification convergence finale

- [ ] Verifier phase finale identique sur A et B.
- [ ] Verifier absence de downgrade de phase.
- [ ] Verifier coherence owner uniqueness.

Attendu:
- phase identique A/B
- owner unique
- aucun comportement bloquant reproduit

Observe:
- Resultat:
- Notes:
- Timestamp:
- Evidence (screenshot/log):

## 4) Tableau de synthese Go/No-Go

- D1:
- D2:
- D3:
- D4:
- D5:

Criteres Go obligatoires:
- [ ] 0 divergence de phase apres stabilisation reseau
- [ ] 0 ecriture non-owner acceptee sur phase partagee
- [ ] 0 re-verrouillage involontaire apres switch profil

Decision finale:
- [ ] GO
- [ ] NO-GO

Motif de decision:

## 5) Actions de cloture

Si GO:
- [ ] Mettre story 11-8 en done
- [ ] Mettre epic-11 en done (si aucun autre point ouvert)
- [ ] Mettre a jour last_updated dans sprint-status

Si NO-GO:
- [ ] Ouvrir incident avec cause probable
- [ ] Lister corrections necessaires
- [ ] Replanifier une nouvelle execution D1..D5

## 6) Sign-off

Responsable execution:
Relecteur:
Date/heure fin:
