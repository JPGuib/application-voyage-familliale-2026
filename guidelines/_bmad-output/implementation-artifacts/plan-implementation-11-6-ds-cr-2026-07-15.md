# Plan Implementation 11-6 - Deblocage Famille-Wide (DS/CR)

Date: 2026-07-15
Scope: Enchainement immediat pre-11.6 avec cycle DS/CR et criteres d acceptation testables
Dependencies:
- 11-5 security rules hardening
- ADR 11.3 (cloud/local source of truth)
- Decision produit famille-wide deja tranchee

## Point 1 - Gate pre-DS: verrouiller le contrat 11-6

Objectif:
- Figer contractuellement ce qui devient famille-wide et ce qui reste profile-scoped.

Taches DS:
- Ajouter un addendum ADR 11.6 (schema + autorisations + migration).
- Definir le node autoritaire: families/{familyId}/phase.
- Definir explicitement les invariants:
  - phase famille-wide
  - checklist et gameResults restent profile-scoped
  - seul owner peut declencher before -> during

Taches CR:
- Verifier absence d ambiguite schema/ownership.
- Verifier compatibilite avec stories 11-7 et 11-8.

Criteres d acceptance testables:
- Un document ADR/decision unique contient les 3 invariants ci-dessus.
- Aucun fichier de spec ne mentionne encore phase profile-scoped comme cible finale.

## Point 2 - Gate pre-DS: aligner auth + membership avec les rules

Objectif:
- S assurer que le runtime satisfait les preconditions des rules prod.

Taches DS:
- Integrer un flux auth Firebase actif (minimum anonymous si choix retenu).
- Assurer que familyMembers/{familyId}/{uid} est provisionne selon le flux choisi.

Taches CR:
- Verifier qu un client sans auth ne peut pas entrer dans un mode cloud pseudo-fonctionnel.
- Verifier coherence avec l audit securite.

Criteres d acceptance testables:
- Sans auth: lecture/ecriture cloud refusees de maniere explicite (pas silencieuse).
- Avec auth + membership: lecture/ecriture cloud autorisees.

## Point 3 - DS-1: migration lecture phase (dual-read)

Objectif:
- Lire en priorite phase famille-wide, conserver fallback legacy transitoire.

Taches DS:
- Adapter parseCloudSnapshot pour:
  - lire families/{familyId}/phase (authoritative)
  - fallback temporaire vers phase/{profileId} si node famille absent
- Tagger le fallback en log dev pour suivre la migration.

Taches CR:
- Verifier qu aucune regression n apparait sur profils existants.
- Verifier que la priorite de lecture est bien famille-wide.

Criteres d acceptance testables:
- Cas A: phase famille presente => l app utilise cette valeur.
- Cas B: phase famille absente + legacy presente => fallback actif.
- Cas C: les deux presentes et divergentes => phase famille gagne.

## Point 4 - DS-2: migration ecriture phase (single-write)

Objectif:
- Ecrire uniquement la phase famille-wide pour stopper la divergence.

Taches DS:
- Modifier pushCloudSnapshot pour ecrire families/{familyId}/phase.
- Supprimer l ecriture phase/{profileId} des mutations normales.
- Conserver checklist/gameResults profile-scoped sans changement.

Taches CR:
- Verifier qu aucune ecriture profile-scoped de phase ne subsiste.
- Verifier que la mutation n ecrase pas de champs non cibles.

Criteres d acceptance testables:
- Une action de deblocage produit une ecriture unique sur phase famille.
- Aucun update runtime ne touche phase/{profileId} apres migration.

## Point 5 - DS-3: guard owner-only cote backend

Objectif:
- Rendre impossible le bypass du owner-only via client custom.

Taches DS:
- Renforcer database.rules.prod.json et test.json:
  - ecriture phase famille autorisee seulement si owner
  - membres non-owner conservent droits necessaires sur leur scope profile
- Documenter la logique de controle dans docs security.

Taches CR:
- Relecture securite orientee attaque (client SDK direct / REST).
- Validation des cas owner vs non-owner.

Criteres d acceptance testables:
- Owner authentifie peut ecrire phase famille-wide.
- Non-owner authentifie ne peut pas ecrire phase famille-wide.
- Non-owner conserve les ecritures autorisees sur ses donnees profile-scoped.

## Point 6 - DS-4: anti-stale replay sur champs partages

Objectif:
- Eviter que la queue offline ecrase un etat partage plus recent.

Taches DS:
- Isoler les mutations phase partagee des mutations routine profil.
- Ajouter precondition/version check (transaction ou compare updatedAt/version).
- En cas conflit, rejeter la mutation stale et rehydrater.

Taches CR:
- Verifier qu un replay offline ne downgrade jamais la phase famille.
- Verifier que les logs de conflit sont exploitables en debug.

Criteres d acceptance testables:
- Scenario stale payload: mutation rejetee, etat cloud conserve.
- Scenario sans conflit: mutation appliquee normalement.

## Point 7 - DS-5: ajustement App pour phase famille-wide

Objectif:
- Garantir un comportement UI coherent inter-profils et inter-appareils.

Taches DS:
- Hydrater phase depuis snapshot famille (plus cloudProfile.phase).
- Confirmer que switch profil ne remet jamais la phase a before si famille en during.
- Conserver reset explicite des donnees profile-scoped au switch profil.

Taches CR:
- Verifier parcours login/switch/refresh en mode cloud.
- Verifier absence de regressions sur checklist et game history.

Criteres d acceptance testables:
- Famille en during => tous profils voient phase during.
- Switch profil => pas de re-verrouillage.
- Refresh navigateur => pas d ecran blanc et phase correcte.

## Point 8 - DS-6: suite de tests automatisee ciblee 11-6

Objectif:
- Introduire des preuves non-regression executables.

Taches DS:
- Ajouter tests unitaires/integration pour parse + push phase famille-wide.
- Ajouter tests de gouvernance owner/non-owner sur unlock.
- Ajouter tests de migration dual-read.

Taches CR:
- Evaluer couverture des chemins critiques.
- Exiger test negatif sur tentative non-owner.

Criteres d acceptance testables:
- Tous tests nouveaux passent en local et CI.
- Au moins un test negatif non-owner et un test stale replay sont verts.

## Point 9 - DS-7: recette multi-appareils pre-release (11-8 prep)

Objectif:
- Valider le comportement reel en environnement test Firebase.

Taches DS:
- Executer protocole:
  - Appareil A owner debloque
  - Appareil B non-owner constate phase during
  - Switch profil sur A/B
  - Offline puis reconnexion avec queue
- Collecter traces minimales (phase, profileId, mutation intent, resultat).

Taches CR:
- Revue des traces et des ecarts.
- Decision go/no-go sur base des scenarios critiques.

Criteres d acceptance testables:
- 0 divergence de phase entre A et B apres stabilisation reseau.
- 0 re-verrouillage involontaire apres switch profil.
- 0 ecriture non-owner acceptee sur phase famille-wide.

## Point 10 - CR final + mise a jour sprint status

Objectif:
- Clore proprement 11-6 et preparer 11-7/11-8 sans dette cachee.

Taches DS:
- Mettre a jour la documentation de migration et runbook rollback.
- Mettre a jour sprint-status apres validation complete.

Taches CR:
- Controle final des diffs architecture/security/runtime/tests.
- Validation des preuves (tests + recette multi-device).

Criteres d acceptance testables:
- Statut 11-6 passe a done uniquement si les points 1 a 9 sont verifies.
- Aucun blocker architecture/security ouvert vers 11-7.

## Definition of Done 11-6 (synthese)

11-6 est done si et seulement si:
1. phase famille-wide est la source de verite runtime.
2. write path phase profile-scoped est retire des flux normaux.
3. backend enforce owner-only pour ecriture du deblocage famille.
4. stale replay ne peut pas degrader un etat partage plus recent.
5. tests cibles + recette multi-appareils sont verts.

## Statut execution et handoff (mise a jour 2026-07-15)

- Decision DS/CR 11-6: done.
- Enchainement immediat valide: 11-7 passe in-progress.
- 11-8 reste la gate finale obligatoire de non-regression multi-appareils avant cloture Epic 11.
