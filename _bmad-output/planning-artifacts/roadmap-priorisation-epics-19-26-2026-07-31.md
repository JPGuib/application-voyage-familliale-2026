# Priorisation Epics 19 à 26

Date: 2026-07-31
Auteur: Assistant (analyse à la demande de Jean-Philippe)
Scope: recommandation d'ordonnancement pour les epics 19-26 (tous en statut `backlog` dans `_bmad-output/implementation-artifacts/sprint-status.yaml` au moment de l'analyse), sur la base des 21 fiches story dans `docs/specs-stories/epic-19` à `epic-26`.
Critères: impact architecture/design, effort de tests, risque de régression, dépendances inter-epics.

## Ordre recommandé

1. **Epic 19 — Corrections score/défi/podium**
   Seules stories notées P1 en pied de fiche (19.1/19.2/19.3), malgré un P2 en en-tête — signe d'une remontée de priorité lors du raffinement. Corrige des bugs déjà visibles (score "/100" erroné, cumul par jour faux). Pose les règles de calcul (exclusion propriétaire, égalités, verrouillage par jour) réutilisées ensuite par 22.2, 24.3, 25.2. Risque de régression limité à l'écran Résultats/Jeu, déjà bien couvert (unitaire + intégration + e2e prévus dans les fiches).

2. **Epic 24 — Rôle Voyageur/Visiteur**
   Point le plus sensible du backlog restant. La story 24.1 signale elle-même que `enforceOwnerUniqueness` (`owner-policy.ts`) écrase aujourd'hui tout profil non-propriétaire en "utilisateur" à chaque rechargement — zone adjacente aux bugs de sync/profils fantômes déjà rencontrés (cf. `project_cloud_sync_races.md`). Changement de modèle d'identité, à traiter isolément avec une suite de non-régression complète sur les invariants owner/user (epics 8/9/11), plutôt qu'en parallèle d'autres livraisons.

3. **Epic 26 — Formulaire de connexion classique**
   Dépend explicitement de 24.1 (mentionné dans la fiche). Touche l'écran d'entrée le plus critique de l'app. À enchaîner juste après le 24 pendant que le contexte auth/rôles est encore frais.

4. **Epic 21 — Carte interactive + Avis/commentaires**
   Additif, indépendant des epics précédents. 21.2 introduit un nouveau modèle de données family-wide (commentaires par profil/lieu) — vérifier l'allowlist des règles Firebase (`database.rules.*.json`) pour les nouveaux champs cloud (cf. `project_firebase_rules_field_allowlist.md`). Ce mécanisme de commentaire est réutilisé par 25.1, d'où l'intérêt de le poser avant l'epic 25. 21.1 (carte) n'a aucune dépendance et peut être avancé librement.

5. **Epic 20 — Planning, Docs, Convertisseur**
   Purement additif, lecture seule, aucune dépendance ni impact auth/sync. Risque de régression quasi nul. Bon candidat pour combler un sprint entre deux epics plus sensibles ; peut être avancé sans casser l'ordre logique.

6. **Epic 25 — Teaser / Sondage / FAQ**
   Dépend explicitement de 21.2 (réutilise le mécanisme de commentaire), et implicitement de 24 et 19 (exclusion propriétaire/visiteur du score du sondage). Séquence interne obligatoire : 25.1 → 25.2 → 25.3.

7. **Epic 22 — Rappels, graphique, défi collaboratif**
   22.1 (notifications) porte un risque technique signalé par la story elle-même (limitations iOS Safari PWA) — à valider par un spike technique avant chiffrage. 22.2 est trivial une fois 19.2 en place. 22.3 est additif sur le jeu existant. Rien ici n'est bloquant pour les epics suivants.

8. **Epic 23 — Réinitialisation nouveau voyage**
   Totalement indépendant, aucun epic n'en dépend, priorité P3 assumée par la story elle-même. Action destructrice à isoler et bien tester (ne pas supprimer profils/rôles), sans urgence à programmer.

## Dépendances qui forcent l'ordre

- 26 → nécessite 24.1
- 25.1 → nécessite 21.2 ; 25.2/25.3 → nécessitent 25.1 + 19.2 + 24.3
- 22.2 → nécessite 19.2
- 19, 20, 21.1, 23 → indépendants, replaçables librement dans le planning

## Point d'attention prioritaire

L'epic 24 touche `owner-policy.ts`, une zone déjà fragile par le passé (cf. `project_cloud_sync_races.md`). Recommandation : le traiter seul, avec une passe de non-régression dédiée, plutôt que de le paralléliser avec d'autres epics.
