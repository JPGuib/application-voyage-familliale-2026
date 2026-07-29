# Runbook Operatoire - 11-7 -> CR -> 11-8

Date: 2026-07-15  
Perimetre: finaliser 11-7 (deprecation code owner legacy), passer en CR, executer 11-8 (recette non-regression multi-appareils), clore Epic 11 sans regression.

## 1) Objectif et Definition of Done

Objectif:
- Supprimer les chemins legacy owner qui peuvent reintroduire ambiguite ou bypass.
- Prouver par tests + recette multi-appareils que le deblocage famille-wide reste robuste.

DoD globale (11-7 -> CR -> 11-8):
- 11-7 passe `review` puis `done` avec tests cibles verts.
- CR ne remonte aucun blocker securite/contrat/runtime.
- 11-8 passe `done` avec protocole multi-appareils valide.
- Build final vert (`npm run build`).

## 2) Roles et responsabilites

- DS (Delivery): implemente, execute tests, produit les preuves.
- CR (Code Review): verifie invariants, tests negatifs, et risques de regression.
- Decisionnaire Go/No-Go: responsable technique Epic 11.

## 3) Preconditions obligatoires

Checklist:
- [ ] Branche de travail propre et a jour.
- [ ] Acces Firebase test disponible (auth + membership).
- [ ] Stories 11-6 `done`, 11-7 `in-progress`, 11-8 `ready-for-dev` confirmes dans sprint-status.
- [ ] Environnement local operant (Node + dependances installees).

Commandes de verification:

```bash
git status
npm run test -- --version
```

No-Go immediat si:
- `git status` montre des changements non relies non compris.
- Les tests ne peuvent pas etre lances localement.

## 4) Checklist executable etape par etape

## Etape A - Baseline avant modifs (15-20 min)

Actions:
- [ ] Capturer un etat baseline des tests critiques owner/cloud.
- [ ] Capturer un build baseline.

Commandes:

```bash
npm run test -- src/app/owner-policy.test.ts src/app/owner-code.test.ts src/app/owner-governance.integration.test.ts src/services/cloudSyncProvider.test.ts src/services/firebase-rtdb.rules.test.ts
npm run build
```

Preuves a archiver:
- [ ] Log de tests baseline.
- [ ] Log de build baseline.

Gate Go/No-Go:
- Go si baseline verte ou ecarts connus documentes.
- No-Go si echec critique non explique.

## Etape B - Execution 11-7 (deprecation legacy) (45-90 min)

Intent 11-7:
- Retirer les branches legacy liees au code owner qui ne sont plus source de verite.
- Conserver uniquement le contrat owner courant aligne avec les regles etat famille-wide.

Actions code:
- [ ] Identifier references legacy owner dans logique app et sync cloud.
- [ ] Supprimer/neutraliser les chemins de fallback legacy non conformes.
- [ ] Verrouiller les invariants par tests negatifs explicites.
- [ ] Documenter les choix de migration dans les notes de changement.

Commandes de recherche utiles:

```bash
rg -n "legacy|owner.*code|code.*owner|fallback" src
```

Tests minimums a passer apres modifs:

```bash
npm run test -- src/app/owner-policy.test.ts src/app/owner-code.test.ts src/app/owner-governance.integration.test.ts src/services/cloudSyncProvider.test.ts
```

Gate Go/No-Go 11-7 -> CR:
- Go si:
  - [ ] Tests cibles 11-7 verts.
  - [ ] Aucune ecriture non-owner permise sur etat partage.
  - [ ] Aucun fallback legacy encore actif sans justification.
- No-Go si l un de ces points est faux.

## Etape C - CR structuree (30-45 min)

Checklist CR priorisee:
- [ ] Verifier contrat de donnees: source de verite unique pour etat partage.
- [ ] Verifier securite: owner-only bien enforce cote backend et non contournable.
- [ ] Verifier runtime: pas de regression switch profil / rehydratation cloud.
- [ ] Verifier tests: presence de cas negatifs (non-owner + stale replay si concerne).
- [ ] Verifier dette: pas de TODO bloquant cache dans diffs.

Commandes CR:

```bash
git diff --name-only
git diff
npm run test -- src/services/firebase-rtdb.rules.test.ts src/app/owner-governance.integration.test.ts
```

Issue handling:
- [ ] Bloquant: retour immediat en DS.
- [ ] Majeur non-bloquant: corriger avant passage 11-8.
- [ ] Mineur: creer action backlog si valide par decisionnaire.

Gate Go/No-Go CR -> 11-8:
- Go si 0 bloquant et preuves test presentes.
- No-Go sinon.

## Etape D - Execution 11-8 recette non-regression multi-appareils (45-75 min)

Prerequis 11-8:
- [ ] Build local vert.
- [ ] Deploy/test env accessible sur 2 appareils (A owner, B non-owner).

Protocole recette pas a pas:
- [ ] D1. Appareil A (owner) se connecte et declenche le deblocage.
- [ ] D2. Appareil B (non-owner) verifie la phase `during` sans action owner.
- [ ] D3. Sur A et B, changer de profil puis revenir: aucun re-verrouillage.
- [ ] D4. Simuler offline sur B, tenter action stale, reconnecter.
- [ ] D5. Verifier etat final converge (phase identique A/B, pas de downgrade).

Evidences obligatoires a collecter:
- [ ] Timestamp par etape (D1..D5).
- [ ] Profil/role utilise (owner vs non-owner).
- [ ] Resultat attendu vs observe.
- [ ] Extraits logs cloud pertinents (phase, intent mutation, resultat).

Gate Go/No-Go 11-8:
- Go si:
  - [ ] 0 divergence de phase apres stabilisation reseau.
  - [ ] 0 ecriture non-owner acceptee sur phase partagee.
  - [ ] 0 re-verrouillage involontaire apres switch profil.
- No-Go si l un des points echoue.

## Etape E - Cloture et mise a jour statut (10-15 min)

Actions finales:
- [ ] Rejouer la suite de tests complete.
- [ ] Refaire un build final.
- [ ] Mettre 11-7 a `done` (si CR validee).
- [ ] Mettre 11-8 a `done` (si recette validee).
- [ ] Mettre a jour `last_updated` du sprint-status.

Commandes finales:

```bash
npm run test
npm run build
```

Mise a jour attendue dans sprint-status:
- `11-7-finaliser-deprecation-code-owner-legacy-clair: done`
- `11-8-recette-non-regression-multi-appareils: done`
- `epic-11: done` (uniquement si aucun autre point ouvert)

## 5) Mode incident (rollback rapide)

Declencheurs rollback:
- Ecriture non-owner observee sur etat partage.
- Divergence de phase persistante A/B.
- Regression critique login/switch profil.

Procedure:
- [ ] Stopper promotion release.
- [ ] Revenir au dernier commit vert valide.
- [ ] Reexecuter tests critiques owner/cloud.
- [ ] Ouvrir incident avec cause probable + plan de correction.

## 6) Livrables de sortie

- [ ] Diff code 11-7 propre et relu.
- [ ] Rapport CR (bloquants/majeurs/mineurs).
- [ ] Journal recette 11-8 avec preuves D1..D5.
- [ ] Sprint status mis a jour.

Definition de succes finale:
- Sequence 11-7 -> CR -> 11-8 executee sans blocker, avec preuves testables et statut sprint coherent pour cloture Epic 11.
