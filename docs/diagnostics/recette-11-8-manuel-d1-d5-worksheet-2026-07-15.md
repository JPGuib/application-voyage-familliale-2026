# Worksheet execution manuelle - Story 11.8 (D1..D5)

Date: 2026-07-15
Projet: application de voyage 2026
Story: 11-8-recette-non-regression-multi-appareils
Objectif: valider en conditions reelles la non-regression multi-appareils avant passage en done.

## 1) Preconditions

- [x] Build local vert.
- [x] Test env deploye et accessible.
- [x] Appareil A disponible (owner).
- [x] Appareil B disponible (non-owner).
- [x] Meme Family Sync ID sur A et B.
- [x] Logs navigateur consultables sur A et B.

## 2) Configuration de test

- Family ID: application-voyage-familliale-2026
- Appareil A (owner): ADMIN
- Appareil B (non-owner): JPG
- Navigateur A: edge
- Navigateur B: chrome sur Andriod
- URL test env: 
- Heure debut:

## 3) Scenarios D1..D5

### D1 - Deblocage owner depuis A

- [x] A se connecte avec profil owner.
- [x] A declenche le deblocage vers phase during.
- [x] A reste sans ecran blanc.

Attendu:
- phase= during sur A
- absence erreur bloquante UI

Observe:
- Resultat:
- Notes:
- Timestamp:
- Evidence (screenshot/log):

### D2 - Verification non-owner sur B

- [x] B se connecte comme non-owner sur la meme famille.
- [x] B voit phase during sans action owner.

Attendu:
- phase coherente avec A
- aucune action owner requise cote B

Observe:
- Resultat:
- Notes:
- Timestamp:
- Evidence (screenshot/log):

### D3 - Switch profil A/B sans contamination

- [x] Sur A: changer de profil puis revenir.
- [x] Sur B: changer de profil puis revenir.

Attendu:
- pas de re-verrouillage involontaire
- pas de contamination de checklist/resultats entre profils

Observe:
- Resultat: OK apres correctifs. Le switch owner -> utilisateur -> owner ne rebascule plus durablement sur la checklist; l etat debloque est conserve sans refresh.
- Notes:
- Timestamp:
- Evidence (screenshot/log):

### D4 - Offline stale action sur B puis reconnexion

- [X] Mettre B offline.
- [X] Tenter une action stale sur B.
- [X] Reconnecter B.

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

- [X] Verifier phase finale identique sur A et B.
- [X] Verifier absence de downgrade de phase.
- [X] Verifier coherence owner uniqueness.

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

- D1: GO
- D2: GO
- D3: GO
- D4: GO
- D5: GO

Criteres Go obligatoires:
- [x] 0 divergence de phase apres stabilisation reseau
- [x] 0 ecriture non-owner acceptee sur phase partagee
- [x] 0 re-verrouillage involontaire apres switch profil

Decision finale:
- [x] GO
- [ ] NO-GO

Motif de decision:

## 5) Actions de cloture

Si GO:
- [x] Mettre story 11-8 en done
- [ ] Mettre epic-11 en done (si aucun autre point ouvert)
- [x] Mettre a jour last_updated dans sprint-status

Si NO-GO:
- [ ] Ouvrir incident avec cause probable
- [ ] Lister corrections necessaires
- [ ] Replanifier une nouvelle execution D1..D5

## 6) Sign-off

Responsable execution:
Relecteur:
Date/heure fin:
