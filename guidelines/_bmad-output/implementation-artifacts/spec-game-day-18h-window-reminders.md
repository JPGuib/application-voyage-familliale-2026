---
title: 'Fenêtre 18 h du jeu du jour et rappels conditionnels'
type: 'feature'
created: '2026-09-19'
status: 'done'
baseline_commit: 'eb3d29298f759b1116c0f05c1250bef1f4e30f6d'
review_loop_iteration: 1
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Le défi J bascule actuellement à minuit et son unique rappel peut partir à n'importe quelle heure. Les voyageurs tardifs perdent donc l'accès au défi précédent et les rappels attendus.

**Approach:** Distinguer le jour calendaire de l'itinéraire du jour de jeu actif. Ouvrir le défi J de J à 18:00 inclus jusqu'à J+1 à 18:00 exclu, puis programmer quatre notifications locales à 18:00, 09:00, 12:00 et 16:00 tant que le profil courant n'a pas terminé ce défi.

## Boundaries & Constraints

**Always:** Utiliser l'heure locale de l'appareil comme heure du séjour. Conserver le `currentDay` calendaire pour l'itinéraire et appliquer la fenêtre 18 h uniquement aux jeux. Employer le même jour de jeu pour contenu, reprise, enregistrement, historique, verrouillage et rappels. À 18:00, fermer J-1 et ouvrir J. Ne jamais notifier un profil ayant terminé le défi. Dédupliquer chaque créneau par profil et jour, y compris après rechargement.

**Ask First:** Toute autre modification des droits par rôle ou du comportement de rejeu après le voyage. Toute introduction d'un fuseau de séjour configuré ou de notifications push serveur. Décisions de revue approuvées : `open` contourne la fenêtre automatique ; les dérogations sont masquées après la dernière fenêtre et ne ciblent jamais un jour de rejeu.

**Never:** Modifier le jour de destination, le planning ou l'album. Envoyer les rappels manqués en rafale. Promettre une notification application fermée. Ajouter une dépendance ou un backend.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|----------------------------|----------------|
| Avant première ouverture | Jour 1, 17:59 | Aucun défi automatique jouable | Afficher que le jeu ouvre à 18 h |
| Ouverture J | Jour J, 18:00 | Le défi J devient jouable et le rappel 18 h est éligible | Une seule notification pour ce créneau |
| Nuit suivante | J+1, 09:00/12:00/16:00, défi J non terminé | Le défi J reste jouable et le rappel du créneau est éligible | Aucun rappel déjà envoyé n'est répété |
| Partie terminée | Historique contient le jour J | Aucun rappel ultérieur pour J et rejeu verrouillé comme aujourd'hui | Les timers restants deviennent sans effet |
| Bascule suivante | J+1, 18:00 | Le défi J ferme et le défi J+1 ouvre | Une progression obsolète de J n'est pas reprise pour J+1 |
| Fin du voyage | Dernier jour J, jusqu'à J+1 17:59 | Le dernier défi reste jouable pendant toute sa fenêtre | Le rejeu post-voyage ne remplace pas la session active |
| Application inactive | Créneau passé pendant fermeture complète | Aucun push ni rafale au retour | Programmer les créneaux encore futurs de la fenêtre active |

</frozen-after-approval>

## Code Map

- `src/app/trip-day.ts` -- calcul calendaire existant et nouvelle résolution testable de la fenêtre de jeu.
- `src/app/trip-day.test.ts` -- limites 17:59/18:00, premier et dernier jours.
- `src/app/notifications.ts` -- décision et déduplication des quatre créneaux de rappel.
- `src/app/notifications.test.ts` -- matrice des rappels, partie terminée et créneaux déjà envoyés.
- `src/app/App.tsx` -- intégration du jour de jeu dans le contenu, la progression, l'historique, le verrouillage et les timers.
- `src/app/App.game-lock.integration.test.tsx` -- comportement utilisateur avant, pendant et après une fenêtre.

## Tasks & Acceptance

**Execution:**
- [x] `src/app/trip-day.ts`, `src/app/trip-day.test.ts` -- ajouter un calcul pur du jour de jeu actif fondé sur la date de départ, l'heure locale et les bornes du voyage.
- [x] `src/app/notifications.ts`, `src/app/notifications.test.ts` -- remplacer le rappel quotidien unique par les créneaux 18 h, 09 h, 12 h et 16 h, persistés et dédupliqués par profil/jour/créneau.
- [x] `src/app/App.tsx` -- employer le jour de jeu actif sur tous les chemins de lecture et d'écriture, afficher l'indisponibilité hors fenêtre et programmer/nettoyer les rappels locaux.
- [x] `src/app/App.game-lock.integration.test.tsx` -- couvrir l'ouverture à 18 h, le maintien jusqu'au lendemain et la fermeture à 18 h sans régression du verrouillage après participation.

**Acceptance Criteria:**
- Given le jour calendaire J avant 18 h, when un membre ouvre le jeu, then le défi J n'est pas encore jouable et le défi J-1 reste disponible s'il existe et n'a pas été terminé.
- Given le jour calendaire J à partir de 18 h, when un membre ouvre le jeu, then tout le cycle de jeu charge et enregistre exclusivement le défi J.
- Given un défi non terminé et les notifications de jeu activées, when l'application reste ouverte aux quatre créneaux, then le profil reçoit au plus un rappel à chacun des créneaux 18 h, 09 h, 12 h et 16 h.
- Given le défi terminé avant un créneau, when ce créneau arrive, then aucune notification de jeu n'est affichée.
- Given le dernier défi du voyage, when il est entre J 18 h et J+1 18 h, then il reste une session normale avec score persistant et non un rejeu post-voyage.

## Spec Change Log

- 2026-09-19 (review 1): la revue a détecté une ambiguïté sur la priorité des dérogations. Le propriétaire a décidé que `open` rend le défi ciblé jouable hors fenêtre et que les dérogations disparaissent après la dernière fenêtre. Évite une ouverture forcée sans effet et des overrides écrits depuis le rejeu. KEEP : jour d'itinéraire distinct, fenêtre automatique 18 h–18 h, dernier défi normal jusqu'à sa fermeture.

## Design Notes

Le calcul retourne un jour de jeu nullable sans modifier `computeCurrentDay`. `null` représente l'absence de fenêtre avant J1 18 h ou après la dernière fenêtre. Les dérogations propriétaire restent inchangées.

Un identifiant persistant et chronologique du dernier créneau affiché évite les doublons sans stockage croissant. Chaque callback revérifie l'historique avant notification.

## Verification

**Commands:**
- `npm run test:single -- src/app/trip-day.test.ts src/app/notifications.test.ts` -- tous les tests unitaires ciblés passent.
- `npm run test:single -- src/app/App.game-lock.integration.test.tsx` -- les scénarios de fenêtre et de verrouillage passent.
- `npm run build` -- TypeScript et Vite compilent sans erreur.

## Suggested Review Order

**Fenêtre et horloge**

- Le jour jouable reste distinct du jour d'itinéraire et accepte l'ouverture forcée.
	[App.tsx:12746](../../../src/app/App.tsx#L12746)

- Le calcul pur fixe exactement les bornes locales 18 h–18 h.
	[trip-day.ts:40](../../../src/app/trip-day.ts#L40)

- Les réveils à minuit et 18 h maintiennent les deux calendriers à jour.
	[App.tsx:12762](../../../src/app/App.tsx#L12762)

**Progression et rappels**

- La progression n'est jamais poussée pendant une transition de fenêtre.
	[App.tsx:12940](../../../src/app/App.tsx#L12940)

- Les quatre créneaux sont datés, persistants et isolés par voyage.
	[notifications.ts:175](../../../src/app/notifications.ts#L175)

- Le scheduler préarme 18 h et revérifie jour, historique et fermeture propriétaire.
	[App.tsx:16760](../../../src/app/App.tsx#L16760)

**Preuves**

- Les bornes 17:59/18:00 et la dernière fenêtre sont couvertes unitairement.
	[trip-day.test.ts:48](../../../src/app/trip-day.test.ts#L48)

- L'ouverture forcée hors fenêtre et le masquage post-voyage sont intégrés.
	[App.game-lock.integration.test.tsx:199](../../../src/app/App.game-lock.integration.test.tsx#L199)

- Le rappel d'ouverture est testé sur une application restant montée.
	[App.notifications.integration.test.tsx:204](../../../src/app/App.notifications.integration.test.tsx#L204)