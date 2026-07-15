# Backlog: Éléments identifiés post-déploiement MVP

## BACKLOG-001: Propriétaire unique global (toute l'application)

### Statut
- Statut backlog: LIVRE
- Epic de livraison: Epic 8 - Durcissement proprietaire unique global
- Stories de livraison: 8-1, 8-2, 8-3
- Date de livraison: 2026-07-10
- Remarque: la regle de proprietaire unique global est implementee et validee (tests + build verts), avec tracabilite dans les artefacts Epic 8.

### Objectif
Appliquer la règle métier suivante: un seul membre de la famille est Propriétaire pour toute l'application, et tous les autres profils sont Utilisateurs.

### Problème actuel
Actuellement, le rôle peut être choisi/changé localement sans contrainte globale:
- Plusieurs appareils peuvent se déclarer "Propriétaire"
- Le rôle peut être modifié librement dans Paramètres
- Les autres membres ne sont pas automatiquement forcés en "Utilisateur" une fois le Propriétaire défini

### Impact
- **Cohérence métier**: violation de la règle "1 seul Propriétaire famille"
- **Sécurité**: risque de codes propriétaires divergents selon appareil
- **UX**: ambiguïté des droits (qui peut débloquer "On est partis")

### Solution proposée
1. **Premier accès (bootstrap)**:
  - Le premier membre qui crée le profil devient Propriétaire
  - Il définit le Code Propriétaire
  - Son rôle Propriétaire devient immutable

2. **Accès suivants (autres membres)**:
  - Si un Propriétaire existe déjà, tout nouveau profil est créé automatiquement en Utilisateur
  - Le choix du rôle "Propriétaire" n'est plus proposé dans l'UI
  - Les Utilisateurs ne peuvent jamais s'élever en Propriétaire depuis Paramètres

3. **Règle globale à garantir**:
  - Cardinalité: exactement 1 Propriétaire actif pour la famille
  - Le Propriétaire existant conserve seul les droits de configuration du code et de déblocage

4. **Cas de réinitialisation**:
  - Le flux "code oublié / réinitialisation" est traité par BACKLOG-004

### Fichiers à modifier
- `src/app/App.tsx`:
  - Écran de création profil: auto-attribution du rôle selon existence du Propriétaire
  - `ProfileSettingsScreen`: masquer/supprimer tout changement de rôle vers Propriétaire
  - Guards métier: bloquer toute élévation de privilège côté logique
- Couche persistance/sync (BACKLOG-002):
  - stocker et lire un indicateur global `ownerProfileId`
  - appliquer la règle sur tous les appareils

### Effort estimé
- Frontend local (UI + guards): ~3-4 heures
- Sync/persistance globale (si multi-appareils): dépend de BACKLOG-002
- QA: ~2 heures

### Dépendances
- **Dépend de BACKLOG-002** pour garantir "1 seul Propriétaire" sur tous les appareils.
- Sans sync cloud, la règle ne peut être garantie que localement sur un appareil.

### Critères d'acceptation
- Si aucun Propriétaire n'existe, le premier profil peut devenir Propriétaire et définir un code.
- Si un Propriétaire existe déjà, tout nouveau profil est automatiquement Utilisateur.
- Aucun écran ne permet à un Utilisateur de devenir Propriétaire.
- En cas de tentative manuelle (tampering), la logique rejette le changement.
- Le même Propriétaire est reconnu sur tous les appareils connectés au même espace de données.

### Mini-spéc technique (prête à implémenter)

#### Données minimales (source partagée)
- `ownerProfileId: string | null` : identifiant unique du Propriétaire global.
- `profiles: Profile[]` où `Profile = { id, nickname, role, createdAt }`.
- `ownerCodeHash: string | null` : hash du code Propriétaire (pas de code en clair).

#### Règles métier codées
- Invariant 1: `ownerProfileId` est unique (0 ou 1 valeur).
- Invariant 2: si `ownerProfileId != null`, alors exactement un profil a `role = "owner"` et son `id` correspond à `ownerProfileId`.
- Invariant 3: tout profil avec `id != ownerProfileId` a `role = "user"`.
- Invariant 4: aucune action client ne peut promouvoir un `user` en `owner` après bootstrap.

#### Flux de création profil
1. Lire l'état partagé (`ownerProfileId`, `profiles`).
2. Si `ownerProfileId == null`:
   - créer profil avec `role = "owner"`.
   - définir le code propriétaire puis stocker `ownerCodeHash`.
   - écrire `ownerProfileId = profile.id` dans une transaction atomique.
3. Sinon:
   - créer profil avec `role = "user"`.
   - masquer tout choix de rôle dans l'UI.

#### Flux Paramètres
- Propriétaire:
  - peut modifier son surnom.
  - peut modifier/réinitialiser son code (cf. BACKLOG-004).
  - ne peut pas changer son rôle.
- Utilisateur:
  - peut modifier son surnom.
  - ne voit pas d'option pour gérer le code propriétaire.
  - ne voit pas d'option pour devenir propriétaire.

#### Garde logique obligatoire (au-delà de l'UI)
- Vérifier côté logique que toute mutation de rôle vers `owner` est rejetée si `ownerProfileId` existe déjà.
- Vérifier que la mise à jour du code propriétaire n'est autorisée que pour `profile.id === ownerProfileId`.
- Revalider les invariants au chargement des données; en cas d'incohérence, journaliser l'erreur et appliquer une stratégie de récupération sûre (conserver le premier owner valide et forcer les autres en user).

#### Notes d'implémentation recommandées
- Encapsuler les règles dans une fonction pure: `enforceOwnerUniqueness(state) => stateSafe`.
- Centraliser les mutations dans un service unique (`profileService` / `authzService`) pour éviter les contournements par l'UI.
- Prévoir un champ `version` dans les documents partagés pour faciliter les migrations futures.

#### Scénarios de test (minimum)
- Cas 1: premier lancement -> profil A devient owner, code exigé.
- Cas 2: second lancement autre membre -> profil B créé user automatiquement.
- Cas 3: tentative UI de B pour devenir owner -> impossible (contrôle non affiché).
- Cas 4: tentative API/manuelle de promotion B -> rejet logique.
- Cas 5: owner A modifie son code -> succès.
- Cas 6: user B tente de modifier le code owner -> rejet.
- Cas 7: données corrompues avec 2 owners -> récupération automatique vers 1 owner.
- Cas 8: multi-appareil simultané au bootstrap -> un seul owner final après transaction.

### Plan d'implémentation (tickets prêts à exécuter)

#### Lot 1 - Modèle de données et service métier
- [ ] T1. Créer un type `SharedFamilyState` (ownerProfileId, profiles, ownerCodeHash, version).
- [ ] T2. Créer un service `ownerPolicyService` avec:
  - `assignRoleOnProfileCreation(state, draftProfile)`
  - `canPromoteToOwner(state, actorProfileId)`
  - `canUpdateOwnerCode(state, actorProfileId)`
  - `enforceOwnerUniqueness(state)`
- [ ] T3. Couvrir le service par tests unitaires purs (invariants + cas tampering).

#### Lot 2 - Intégration UI (création profil + paramètres)
- [ ] T4. Écran création profil: si `ownerProfileId` absent, créer owner; sinon créer user automatiquement.
- [ ] T5. Supprimer le choix manuel du rôle "Propriétaire" dans le flow standard.
- [ ] T6. Écran paramètres:
  - owner: afficher gestion code, masquer changement de rôle
  - user: masquer gestion code et toute option de promotion
- [ ] T7. Ajouter messages UX explicites (droits owner réservés, rôle utilisateur automatique).

#### Lot 3 - Gardes de sécurité côté logique
- [ ] T8. Vérifier toutes les mutations de rôle via `ownerPolicyService` (pas de bypass UI).
- [ ] T9. Protéger les mutations du code propriétaire par contrôle `actorProfileId === ownerProfileId`.
- [ ] T10. Au chargement, exécuter `enforceOwnerUniqueness(state)` et journaliser les anomalies.

#### Lot 4 - Multi-appareil (pré-intégration BACKLOG-002)
- [ ] T11. Définir le contrat de persistance partagé pour `ownerProfileId` et transactions atomiques.
- [ ] T12. Implémenter la création owner en mode transaction (first-writer-wins).
- [ ] T13. Tester le cas de course (2 inscriptions simultanées) -> 1 owner final garanti.

#### Plan de tests détaillé

##### Tests unitaires
- [ ] U1. `assignRoleOnProfileCreation` retourne owner quand `ownerProfileId` est null.
- [ ] U2. `assignRoleOnProfileCreation` retourne user quand `ownerProfileId` existe.
- [ ] U3. `canPromoteToOwner` refuse toute promotion après bootstrap.
- [ ] U4. `canUpdateOwnerCode` autorise uniquement owner.
- [ ] U5. `enforceOwnerUniqueness` corrige un état avec plusieurs owners.

##### Tests d'intégration (UI)
- [ ] I1. Premier utilisateur crée un profil -> rôle owner + code demandé.
- [ ] I2. Deuxième utilisateur crée un profil -> rôle user automatique.
- [ ] I3. Utilisateur ne voit pas de contrôle "devenir propriétaire".
- [ ] I4. Owner voit les options code; user ne les voit pas.

##### Tests E2E
- [ ] E1. Parcours familial 5 membres: 1 owner + 4 users conformes.
- [ ] E2. Tentative de contournement via payload manuel -> mutation refusée.
- [ ] E3. Cas concurrent multi-appareil au premier lancement -> unicité conservée.

#### Definition of Done (DoD)
- [ ] DoD-1. Invariants owner unique validés en unit tests et E2E.
- [ ] DoD-2. Aucun chemin UI ne permet promotion user -> owner.
- [ ] DoD-3. Toute tentative logique invalide est rejetée et journalisée.
- [ ] DoD-4. Build production vert + non-régression des flows existants.
- [ ] DoD-5. Documentation backlog/tech alignée avec la règle métier familiale.

#### Estimation révisée (BACKLOG-001)
- Implémentation locale (Lots 1-3): 1.5 à 2.5 jours.
- Intégration multi-appareil transactionnelle (Lot 4, avec BACKLOG-002): +1 à 2 jours.

---

## BACKLOG-002: Synchronisation cloud multi-device

### Objectif
Permettre la continuité numérique entre appareils (iPhone, iPad, Android, desktop).

### Problème actuel
- **Chaque appareil = localStorage isolé**
- Données non synchronisées :
  - Profil (surnom, rôle)
  - Checklist (état des items)
  - Résultats des jeux
  - Code propriétaire (implicitement — chaque appareil peut avoir un code différent!)
  - Phase (Avant/Pendant voyage)

### Scénario utilisateur affecté
Sam sur iPhone:
- Crée profil "Sam", définit code "1234"
- Coche checklist à 50%
- Phase → "Pendant voyage"

Sam sur iPad:
- Ouvre app → pas de profil (premier lancement)
- Doit recréer profil
- Code ignoré → phase verrouillée
- Checklist à 0%

### Impact fonctionnel
- **FR-1, FR-2** : Profil non partagé
- **FR-5, FR-6** : Checklist non partagée
- **FR-12, FR-13** : Résultats non partagés
- **FR-3, FR-4** : Code propriétaire peut être différent par device!

### Solution proposée (v2)

#### Option 1 : Firebase Realtime DB (simple, gratuit tier)
```
users/[device-id]/
  ├── profile.json
  ├── checklist.json
  ├── gameHistory.json
  ├── phase.txt
  └── ownerCode.txt (chiffré)
```

#### Option 2 : Supabase (PostgreSQL, plus scalable)
```
tables:
  - users (id, created_at, ...)
  - profiles (user_id, surname, role, ...)
  - checklists (user_id, item_id, checked, ...)
  - game_history (user_id, score, badges, ...)
```

#### Architecture recommandée
1. **Auth** : Ajouter authentication simple (Google Sign-In ou anonymous)
2. **Provider** : React Context + custom hook `useCloudSync()`
3. **Conflict resolution** : Last-write-wins pour MVP
4. **Offline-first** : Sync en arrière-plan, cache local durant offline

### Fichiers à créer/modifier
- `src/hooks/useCloudSync.ts` (nouvelle)
- `src/services/firebaseConfig.ts` (nouvelle)
- `src/context/CloudSyncContext.tsx` (nouveau)
- `src/app/App.tsx` (modifier tous les localStorage en useCloudSync)

### Effort estimé
- Backend setup : ~3-4 heures
- Frontend refactor : ~8-10 heures
- QA + testing : ~3-4 heures
- **Total : ~15-20 heures**

### Risques
- ⚠️ Firebase pricing (payer si dépassement quotidien)
- ⚠️ Privacy : données stockées sur serveur tiers
- ⚠️ Complexité : gestion conflit sync, retry logic

### Dépendances
- Decision: Firebase vs Supabase
- Privacy/Legal review (RGPD si utilisateurs EU)

---

## BACKLOG-003: Authentification multi-user per device

### Objectif
Permettre plusieurs profils utilisateur sur un même appareil (ex: famille = 4 profils sur 1 iPad).

### Problème actuel
- Mono-profil par appareil
- Pas d'authentification : accès direct au profil existant
- Changement de profil = réinitialiser localStorage

### Impact
- **Use case** : Voyage en famille, 1 iPad partagé
- **Current** : Seul le profil existant est accessible
- **Desired** : Écran de sélection profil au lancement

### Solution proposée (v2 ou v3)
1. Ajouter table profils par device
2. Écran de login/sélection profil
3. Isolation localStorage par profil
4. Sync cloud avec `profile_id`

### Effort estimé
- Frontend : ~5-6 heures
- Dépend de BACKLOG-002 (cloud sync)

---

## BACKLOG-004: Mécanisme de réinitialisation d'urgence

### Statut
- Statut backlog: PRET A PLANIFIER
- Epic de livraison propose: Epic 9 - Recuperation d urgence du code proprietaire
- Stories proposees: 9-1, 9-2, 9-3
- Date de preparation: 2026-07-10
- Remarque: preparation effectuee sur la base du systeme owner unique + code hashe deja en place.

### Objectif
Permettre au propriétaire de réinitialiser son code s'il l'oublie.

### Problème actuel
- Code propriétaire = clé unique du déblocage
- Si oublié → **App inutilisable** (phase verrouillée)
- Aucun mécanisme de "réinitialiser mon code"

### Solution proposée (v1.1 ou v2)
1. Écran "Code oublié ?" depuis l écran de déblocage
2. Vérification d identité via une phrase de recuperation definie par le proprietaire
3. Réinitialisation du code stocké après verification réussie
4. Nouveau code saisi directement dans l application puis re-stocke en hash

### Option produit retenue pour preparation
Pour ce projet, la solution la plus realiste et la moins intrusive est:
- une **phrase de recuperation** configuree par le proprietaire dans Parametres,
- stockee sous forme de hash local/cloud,
- verifiee uniquement si le **profil actif est bien le proprietaire**.

Cette approche evite d introduire un systeme email/SMS externe et reste compatible avec le MVP actuel.

### Critères d'acceptation
- Si le profil actif est proprietaire, un lien "Code oublié ?" est visible depuis la popup de validation.
- Si aucune phrase de recuperation n est configuree, l application explique qu il faut la definir dans Parametres.
- Si la phrase de recuperation est correcte, le proprietaire peut definir un nouveau code.
- Le nouveau code est stocke uniquement sous forme de hash.
- Un utilisateur non proprietaire ne peut jamais reinitialiser le code proprietaire.
- Les erreurs de verification affichent un message explicite sans divulguer d information sensible.

### Mini-spéc technique (prête à implémenter)

#### Données minimales
- `ownerCodeHash: string | null`
- `ownerRecoveryHash: string | null`
- `ownerRecoveryConfiguredAt: number | null`

#### Règles métier codées
- Invariant 1: seule l identite `ownerProfileId` peut configurer ou reinitialiser le code proprietaire.
- Invariant 2: la phrase de recuperation n est jamais stockee en clair.
- Invariant 3: la reinitialisation du code ne debloque pas automatiquement la phase voyage; elle remplace seulement le secret.
- Invariant 4: si aucune phrase de recuperation n est configuree, aucun reset d urgence n est autorise.

#### Flux Paramètres
1. Proprietaire ouvre Parametres.
2. Il peut definir ou mettre a jour:
   - le code proprietaire
   - la phrase de recuperation
3. Les deux valeurs sont hashees avant persistance.

#### Flux "Code oublié ?"
1. Depuis la popup "Validation proprietaire", le proprietaire clique "Code oublié ?".
2. L application verifie que `profile.id === ownerProfileId`.
3. L application demande la phrase de recuperation.
4. Si verification OK:
   - ouvrir un ecran/modal de redefinition du code
   - demander le nouveau code + confirmation
   - sauvegarder le nouveau `ownerCodeHash`
5. Si verification KO:
   - afficher erreur
   - conserver la phase verrouillee

#### Migration / compatibilité
- Les proprietaires existants sans phrase de recuperation doivent voir un message incitatif dans Parametres.
- Le lien "Code oublié ?" reste visible, mais oriente vers la configuration prealable si `ownerRecoveryHash` est absent.

### Fichiers à modifier
- `src/app/App.tsx`
  - popup de validation: ajouter CTA "Code oublié ?"
  - Parametres proprietaire: ajouter configuration phrase de recuperation
  - flow de reinitialisation: saisie phrase + nouveau code
- `src/app/owner-code.ts`
  - reutiliser hash/verify pour la phrase de recuperation
- `src/types/cloud.ts`
  - etendre le snapshot/payload avec `ownerRecoveryHash`
- `src/services/cloudSyncProvider.ts`
  - lire/ecrire `ownerRecoveryHash`

### Plan d'implémentation (tickets prêts à exécuter)

#### Lot 1 - Modèle et persistance
- [ ] T1. Ajouter `ownerRecoveryHash` et `ownerRecoveryConfiguredAt` aux donnees partagees.
- [ ] T2. Etendre le stockage local/cloud pour synchroniser ces champs.
- [ ] T3. Ajouter helpers de hash/verification reutilisables pour la phrase de recuperation.

#### Lot 2 - Intégration UI
- [ ] T4. Ajouter une section "Phrase de recuperation" dans Parametres proprietaire.
- [ ] T5. Ajouter un CTA "Code oublié ?" dans la popup de validation.
- [ ] T6. Ajouter le flow de reset: verification phrase puis nouveau code + confirmation.
- [ ] T7. Ajouter messages UX explicites si phrase absente ou verification invalide.

#### Lot 3 - Gardes métier et qualité
- [ ] T8. Bloquer le flow de reset pour tout profil non proprietaire.
- [ ] T9. Empêcher toute persistance en clair de la phrase de recuperation.
- [ ] T10. Ajouter tests unitaires/integration sur verification, reset, refus user non-owner.

### Plan de tests détaillé

##### Tests unitaires
- [ ] U1. Hash/verify de la phrase de recuperation.
- [ ] U2. Refus de reset si `ownerRecoveryHash` absent.
- [ ] U3. Refus de reset si profil actif != owner.

##### Tests d'intégration
- [ ] I1. Owner configure une phrase de recuperation puis reset son code avec succes.
- [ ] I2. User non-owner ne voit pas ou ne peut pas utiliser le flow.
- [ ] I3. Phrase invalide -> code non modifie.

##### Tests E2E
- [ ] E1. Parcours complet: owner oublie son code, verifie sa phrase, definit un nouveau code, puis debloque la phase.

### Definition of Done (DoD)
- [ ] DoD-1. Reset d urgence disponible pour owner avec phrase configuree.
- [ ] DoD-2. Aucun secret de recuperation en clair dans stockage local/cloud.
- [ ] DoD-3. User non-owner bloque sur tous les chemins du flow.
- [ ] DoD-4. Tests et build verts.

### Effort estimé
- Frontend : ~3-4 heures
- Logique : ~2-3 heures
- QA/tests : ~2 heures

---

## Priorités recommandées

### v1.1 (patch urgent)
- ☑ **BACKLOG-001** : Propriétaire unique global (livré Epic 8: 8-1, 8-2, 8-3)
- ☐ **BACKLOG-004** : Réinitialisation d'urgence (UX critical)

### v2 (prochaine itération majeure)
- ☐ **BACKLOG-002** : Cloud sync (feature)
- ☐ **BACKLOG-003** : Multi-profil (feature)

---

## Plan de sprint proposé (exécutable)

### Sprint 1 - Fondation cloud + unicité propriétaire (7 à 10 jours)

**Objectif sprint**
- Mettre en place la source de vérité partagée et garantir techniquement qu'un seul owner existe pour toute la famille.

**Backlog inclus**
- BACKLOG-002 (partie socle): contrat de données, persistance cloud, transaction d'écriture atomique.
- BACKLOG-001 (noyau métier): service ownerPolicy + invariants + gardes logiques.

**Tickets ciblés**
- BACKLOG-001: T1, T2, T3, T8, T9, T10, T11, T12.
- BACKLOG-002: setup provider + couche sync minimale pour `ownerProfileId`, profils et code owner hashé.

**Tests ciblés**
- Unitaires: U1, U2, U3, U4, U5.
- Intégration technique: test transaction first-writer-wins.

**Livrables sprint**
- Service métier centralisé qui bloque toute promotion owner non autorisée.
- Persistance partagée active avec `ownerProfileId` unique.
- Cas concurrent au bootstrap maîtrisé au niveau données.

**Critères de sortie sprint**
- Les invariants owner unique passent en CI.
- Aucune mutation logique invalide n'est acceptée.
- Build production vert.

### Sprint 2 - Expérience utilisateur complète + parcours famille (7 à 10 jours)

**Objectif sprint**
- Finaliser l'expérience produit: création automatique des rôles, écrans paramètres alignés, parcours familial 1 owner + 4 users.

**Backlog inclus**
- BACKLOG-001 (intégration UI complète).
- BACKLOG-004 (réinitialisation d'urgence du code).
- BACKLOG-003 (préparation ou démarrage selon capacité équipe).

**Tickets ciblés**
- BACKLOG-001: T4, T5, T6, T7, T13.
- BACKLOG-004: flow "code oublié" + protections de sécurité.
- BACKLOG-003: cadrage technique + spike écran de sélection profil (si capacité).

**Tests ciblés**
- Intégration UI: I1, I2, I3, I4.
- E2E: E1, E2, E3.
- Non-régression sur déblocage "On est partis".

**Livrables sprint**
- Premier membre = owner, suivants = user automatique.
- Aucun chemin UI ne propose "devenir propriétaire" aux users.
- Flow de récupération code disponible pour owner.

**Critères de sortie sprint**
- Parcours famille 5 membres validé en E2E.
- Documentation produit/tech à jour.
- Release note v1.1 préparée.

### Dépendances et ordre de réalisation
- Ordre impératif: BACKLOG-002 socle -> BACKLOG-001 global -> BACKLOG-004 -> BACKLOG-003.
- BACKLOG-003 peut commencer en spike UX en parallèle du Sprint 2, mais sa livraison complète reste dépendante de BACKLOG-002.

### Risques sprint et mitigation
- Risque: course condition au premier owner.
- Mitigation: transaction atomique + test de concurrence systématique en CI.
- Risque: contournement via mutation directe.
- Mitigation: toutes les mutations passent par `ownerPolicyService`.
- Risque: complexité cloud trop large pour le sprint.
- Mitigation: limiter Sprint 1 au "minimum viable sync" centré identité/ownership.

### Capacity planning (équipe réduite)
- Si capacité faible: livrer d'abord Sprint 1 + BACKLOG-004 en mode minimal.
- Si capacité normale: dérouler Sprint 1 puis Sprint 2 complet.

## Notes

- Tous les backlog items sont **complètement orthogonaux** → peuvent être implémentés indépendamment
- BACKLOG-002 bloque BACKLOG-003 (dependency: cloud sync → multi-profil)
- BACKLOG-001 (version "globale") nécessite BACKLOG-002 pour être strictement vraie sur tous les appareils

---

## EPIC 7: Continuité numérique multi-device

### Vision
Permettre à chaque membre de la famille de se reconnecter avec son profil depuis n'importe quel appareil, récupérer son contexte personnel (profil, historique, préférences) et se déconnecter pour changer de profil.

### Scénario utilisateur complet
1. **JPG crée le profil propriétaire sur Ordi** → stocke profil + code dans cloud
2. **JPG ouvre l'app sur Galaxy A53** → reconnexion auto, récupère profil JPG, accès restauré
3. **Épouse crée profil sur iPhone** → système reconnaît pas de JPG sur iPhone, crée nouveau profil associé
4. **JPG veut se déconnecter sur Galaxy** → menu déconnexion → retour écran sélection profil
5. **Épouse se connecte sur Galaxy** → voir son profil, récupérer son contexte
6. **JPG se reconn ecte sur Galaxy** → retrouver son profil + état antérieur (checklist, scores, phase)

### Dépendances
- **Dépend de BACKLOG-002** (cloud sync): données persistées dans Firebase pour tous les profils
- **Dépend de BACKLOG-001** (propriétaire unique): garantie de l'unicité globale du propriétaire

### Impacté par
- EPIC-6 (Vercel): déploiement cloud de l'app
- EPIC-1 à EPIC-5 (toutes les features): données à synchroniser

---

## STORY 7.1: Synchroniser les données multi-device (Cloud Sync)

### ID
`7-1-synchroniser-donnees-multi-device-cloud-sync`

### Titre
Implémenter la synchronisation cloud Firebase pour tous les appareils

### Description
Mettre en place le système de synchronisation centralisé qui permet à chaque profil de récupérer et restaurer son état depuis la base de données Firebase Realtime Database.

### Scope
- **In scope**:
  - Créer une couche de persistance cloud (Firebase Realtime DB)
  - Implémenter `useCloudSync()` hook pour synchroniser profils, checklist, game results, phase
  - Déterminer une clé unique par profil (`profileId` ou `profileKey`)
  - Implémenter merge/conflict resolution (last-write-wins pour MVP)
  - Gestion du mode offline (cache local + sync lors reconnexion)
  - Intégration avec `owner-policy` pour propriétaire unique

- **Out of scope**:
  - Authentication (on suppose device_id ou anonymous login)
  - Suppression de profils
  - Historique complet de versions (optionnel v2)
  - Chiffrement des données (optionnel v2)

### Données à synchroniser
```
/families/{VITE_FAMILY_SYNC_ID}/
  ├── profiles/
  │   └── {profileId}/
  │       ├── surname: string
  │       ├── role: "owner" | "user"
  │       ├── createdAt: timestamp
  │       └── lastSyncAt: timestamp
  ├── ownerProfileId: string | null
  ├── ownerCodeHash: string | null
  ├── checklists/
  │   └── {profileId}/items.json (état complet)
  ├── gameResults/
  │   └── {profileId}/history.json
  └── phase/
      └── {profileId}/phase.txt ("before" | "during")
```

### Critères d'acceptation
- [ ] Firebase Realtime DB configurée et accessible via env vars
- [ ] `useCloudSync()` lit et écrit tous les champs importants
- [ ] Profil créé localement se propage à Firebase dans les 2 secondes
- [ ] Appareil B qui ouvre l'app récupère automatiquement l'état du profil depuis Firebase
- [ ] Mode offline: changements se mettent en queue locale, sync au reconnexion
- [ ] Propriétaire unique garanti par transactio n atomique (first-writer-wins)
- [ ] Pas de régression sur mode localStorage (fallback si Firebase absent)

### Fichiers à créer/modifier
- **Créer**:
  - `src/hooks/useCloudSync.ts` (amélioration de l'existant)
  - `src/services/cloudSyncProvider.ts` (couche d'abstraction)
  - `src/types/cloud.ts` (types partagés Cloud)
- **Modifier**:
  - `src/app/App.tsx` (remplacer localStorage par useCloudSync)
  - `src/app/owner-policy.ts` (intégrer transaction atomique pour ownerProfileId)
  - `vite.config.ts` (vérifier env vars)

### Estimation
- Implémentation: 2-3 jours
- QA + tests offline: 1 jour
- **Total: 3-4 jours**

### Risques
- ⚠️ **Race condition au premier owner**: 2 appareils créent owner simultanément
  - **Mitigation**: Transaction atomique Firebase (`set()` avec `exists()` check)
- ⚠️ **Perte de données offline**: changements locaux non syncés
  - **Mitigation**: Mettre en queue les mutations, retry automatique
- ⚠️ **Quotas Firebase**: usage quota gratuit dépassé
  - **Mitigation**: Surveiller usage, optimiser fréquence sync (pas de sync trop rapide)

---

## STORY 7.2: Login et sélection de profil

### ID
`7-2-login-et-selection-profil`

### Titre
Implémenter un écran de sélection/connexion profil au lancement

### Description
Ajouter un écran intermédiaire (avant d'accéder au dashboard) qui permet:
- De voir les profils existants pour ce device
- De se "connecter" à un profil existant (récupérer son contexte)
- De créer un nouveau profil si souhaité

### Scope
- **In scope**:
  - Écran de sélection profil multiface
  - Récupération profils de l'appareil depuis `useCloudSync()`
  - Création d'une session "profil courant" pour cet appareil
  - UX fluide (pas de friction pour reconnecter)

- **Out of scope**:
  - Authentification par mot de passe (v2)
  - Avatar/photo du profil (v2)
  - Historique de connexion (v2)

### Flow UX
```
Lancement app
  ├─ Si aucun profil cloud OU premier appareil → Écran création profil (EPIC-1)
  └─ Si profils cloud existent
      ├─ Afficher liste des profils de la famille
      ├─ Sélectionner un profil existant → Récupérer contexte → Dashboard
      └─ Bouton "Créer nouveau profil" → Écran création (EPIC-1)
```

### Critères d'acceptation
- [ ] Écran de sélection s'affiche si profils existent dans cloud
- [ ] Clique sur profil = restauration automatique du contexte (checklist, scores, phase)
- [ ] Bouton "Créer nouveau" → flow création profile normal
- [ ] Pas de re-création accidentelle d'un profil existant
- [ ] Déconnexion depuis dashboard → retour écran sélection

### Fichiers à créer/modifier
- **Créer**:
  - `src/app/screens/ProfileSelectionScreen.tsx`
  - `src/app/screens/ProfileLoginScreen.tsx` (si besoin distincte)
- **Modifier**:
  - `src/app/App.tsx` (ajouter routage vers écran sélection)
  - `src/hooks/useCloudSync.ts` (exposer fonction "lister profils disponibles")

### Estimation
- Design + UX: 4 heures
- Implémentation: 1-2 jours
- QA: 4-6 heures
- **Total: 2-3 jours**

---

## STORY 7.3: Déconnexion et changement de profil

### ID
`7-3-deconnexion-et-changement-profil`

### Titre
Ajouter fonctionnalité de déconnexion et changement de profil

### Description
Permettre à l'utilisateur de se déconnecter volontairement de son profil courant pour revenir à l'écran de sélection et choisir un autre profil.

### Scope
- **In scope**:
  - Ajouter menu "Déconnexion" dans paramètres ou header
  - Supprimer la session du profil courant (mode local: localStorage effacé OU mode cloud: session_id invalidée)
  - Retour à écran sélection profil

- **Out of scope**:
  - Suppression d'un profil (v2)
  - Synchronisation de l'historique après déconnexion (v2)

### Flux
```
Utilisateur dans Dashboard
  → Menu Paramètres / Profil
  → Bouton "Se déconnecter"
  → Confirmation "Êtes-vous sûr?"
  → Retour Écran Sélection Profil
  → Peut sélectionner un autre profil ou créer nouveau
```

### Critères d'acceptation
- [ ] Menu "Déconnexion" visible dans Paramètres (ou header/drawer)
- [ ] Clique = dialog confirmation
- [ ] Confirmation = nettoyage session + retour Sélection
- [ ] État précédent du profil conservé dans cloud (pas de perte de données)
- [ ] Pas d'accès au dashboard sans profil sélectionné

### Fichiers à créer/modifier
- **Modifier**:
  - `src/app/screens/SettingsScreen.tsx` (ajouter bouton déconnexion)
  - `src/app/App.tsx` (gérer transition vers écran sélection)
  - `src/hooks/useCloudSync.ts` (fonction logout/clearSession)

### Estimation
- Implémentation: 1 jour
- QA: 4 heures
- **Total: 1.5 jours**

---

## Roadmap EPIC 7

### Ordre recommandé
1. **STORY 7.1** (Cloud Sync) — semaine 1-2
   - Dépend de: Firebase setup en EPIC-6, BACKLOG-002 finalisation
   - Bloque: STORY 7.2 et 7.3

2. **STORY 7.2** (Sélection profil) — semaine 2-3
   - Dépend de: STORY 7.1
   - Bloque: fin d'EPIC-7

3. **STORY 7.3** (Déconnexion) — semaine 3-4
   - Dépend de: STORY 7.2
   - Bloque: release v2

### Estimation totale EPIC 7
- STORY 7.1: 3-4 jours
- STORY 7.2: 2-3 jours
- STORY 7.3: 1.5 jours
- **Total: ~7-10 jours** (1.5 semaine avec 5 jours/sem)

### Definition of Done (EPIC-7)
- [ ] Toutes les stories marquées "done"
- [ ] Continuité numérique validée en E2E (créer profil → sync → autre appareil → retrouver profil)
- [ ] Pas de perte de données entre déconnexion/reconnexion
- [ ] Mode offline testé (créer profil sans réseau, puis sync au reconnexion)
- [ ] Pas de régression sur EPIC 1-6
- [ ] Documentation mise à jour (DEPLOYMENT_GUIDE.md section multi-device)
- [ ] Build production vert

---

## EPIC-10: Gestion avancée des profils et personnalisation de la checklist

### Vision
Créer une expérience utilisateur sophistiquée avec des règles d'accès granulaires, une authentification optionnelle par profil, une checklist adaptée au contexte (voyage, genre, rôle), et une persistance complète des données.

### Objectif épique
Transformer le système de voyage en une plateforme multi-profil avec contrôle d'accès intelligent et une checklist hyper-personnalisée selon les besoins réels de chaque membre de la famille.

### Scénario utilisateur complet
1. **JPG (propriétaire)** crée profil → accès immédiat à TOUTES les rubriques
2. **Épouse (utilisateur)** crée profil + word de passe optionnel → voit uniquement checklist au départ
3. **Épouse déverrouille** via code propriétaire → accès aux jeux, conseils, résultats
4. **Enfant garçon** crée profil → voit checklist filtrée (pas d'habits fille, pas d'items parents)
5. **Enfant fille** crée profil → voit checklist filtrée différente + items parents (si elle a 16+)
6. **En voyage** → checklist reste consultable pour todos de retour
7. **Retour** → retrouve même checklist pour défaire les valises

### Dépendances
- **Dépend de BACKLOG-001** (propriétaire unique): règles de visibilité basées sur ce rôle
- **Dépend de BACKLOG-002** (cloud sync): persistance des profils et états de déblocage
- **Recommandé**: BACKLOG-003 (multi-profil par appareil)
- **Dépend de EPIC-9** (récupération d'urgence du code)

### Impacté par
- EPIC-1 à EPIC-7: toutes les données/rubriques nécessitent des gardes d'accès

---

## STORY 10.1: Règles de visibilité des rubriques selon rôle et déblocage

### ID
`10-1-regles-visibilite-rubriques-role-deblocage`

### Titre
Implémenter le contrôle d'accès granulaire aux rubriques selon profil et déblocage

### Description
Définir et coder les règles de visibilité des rubriques (Checklist, Jeux, Conseils, Résultats, Paramètres, Code Propriétaire) selon:
- Rôle du profil (propriétaire vs utilisateur)
- État de déblocage du code propriétaire

### Scope
- **In scope**:
  - Créer matrice d'accès aux rubriques
  - Implémenter fonction `canAccessRubric(rubricName, userRole, isOwnerCodeUnlocked)`
  - Adapter routing/menu dynamiquement
  - Ajouter messages explicites quand rubrique masquée
  - Implémenter gardes à tous les niveaux (UI + logique)

- **Out of scope**:
  - Authentification par mot de passe (Story 10.2)
  - Filtrage items par genre/rôle (Story 10.4)
  - Modification contenu checklist (Story 10.5)

### Matrice d'accès
| Rubrique | Owner (no code) | Owner (with code) | User (before unlock) | User (after unlock) |
|----------|-----------------|-------------------|----------------------|---------------------|
| Checklist | ✅ | ✅ | ✅ | ✅ |
| Jeux | ✅ | ✅ | ❌ | ✅ |
| Conseils/Tips | ✅ | ✅ | ❌ | ✅ |
| Résultats Jeux | ✅ | ✅ | ❌ | ✅ |
| Paramètres | ✅ | ✅ | ✅ | ✅ |
| Code Propriétaire | ✅ | ✅ | ❌ | ❌ |

### Critères d'acceptation
- [ ] Propriétaire voit TOUTES les rubriques dès le départ (sans déblocage)
- [ ] Utilisateur avant déblocage: voit UNIQUEMENT Checklist + Paramètres personnels
- [ ] Utilisateur après déblocage: voit tout SAUF Code Propriétaire
- [ ] Menu/onglets s'adapte dynamiquement selon profil
- [ ] Pas d'accès direct via URL (gardes en place)
- [ ] Messages explicites quand rubrique masquée ("Déverrouillez pour voir les jeux")
- [ ] État de déblocage persiste après rechargement
- [ ] Aucune régression sur les flows existants

### Fichiers à créer/modifier
- **Créer**:
  - `src/services/accessControlService.ts`: logique d'accès
- **Modifier**:
  - `src/types/cloud.ts`: ajouter `isOwnerCodeUnlocked: boolean`
  - `src/app/App.tsx`: routing + gardes
  - `src/app/screens/DashboardScreen.tsx`: affichage menu adaptés
  - `src/services/cloudSyncProvider.ts`: sync `isOwnerCodeUnlocked`

### Estimation
- Implémentation: 2-3 jours
- QA/tests: 1-2 jours
- **Total: 3-5 jours**

---

## STORY 10.2: Authentification par mot de passe par utilisateur

### ID
`10-2-authentification-mot-de-passe-par-profil`

### Titre
Ajouter protection optionnelle par mot de passe au niveau de chaque profil

### Description
Permettre à chaque profil utilisateur de définir optionnellement un mot de passe avec récupération en cas d'oubli (via phrase configurée).

### Scope
- **In scope**:
  - Option "Protéger ce profil" lors création
  - Interface gestion mot de passe dans Paramètres
  - Écran d'authentification à la sélection du profil
  - Mécanisme de récupération par phrase
  - Stockage sécurisé (hash)

- **Out of scope**:
  - Authentification multi-facteur
  - Récupération par email/SMS
  - Biométrie

### Flux UX
1. Création profil: option "Protéger par mot de passe?" (optionnel)
2. Paramètres: gérer/modifier mot de passe + configurer phrase récupération
3. Sélection profil: si protégé, demander mot de passe
4. Mot de passe oublié: vérifier phrase → réinitialiser

### Critères d'acceptation
- [ ] Profil peut optionnellement avoir mot de passe
- [ ] Mot de passe stocké en hash (jamais en clair)
- [ ] Sélection profil demande mot de passe si défini
- [ ] Phrase de récupération configurée en Paramètres
- [ ] Interface simple et intuitive
- [ ] Pas d'impact si profil sans mot de passe
- [ ] Message d'erreur sécurisé (pas d'info sur compte existant)

### Fichiers à créer/modifier
- `src/types/cloud.ts`: ajouter champs mot de passe
- `src/app/screens/ProfileSelectionScreen.tsx`: écran authentification
- `src/app/screens/SettingsScreen.tsx`: gestion mot de passe
- `src/services/authService.ts`: hash/verify

### Estimation
- Implémentation: 3-4 jours
- QA/tests: 1-2 jours
- **Total: 4-6 jours**

---

## STORY 10.3: Checklist persistante après déblocage

### ID
`10-3-checklist-persistante-apres-deblocage`

### Titre
Rendre la checklist consultable même après déblocage de la phase "Pendant voyage"

### Description
Garantir que la checklist reste visible et modifiable même après déblocage, pour utilisation avant voyage ET au retour.

### Scope
- **In scope**:
  - Checklist visible en phase "Avant" ET "Pendant"
  - Modifications toujours acceptées
  - Accès facile depuis menu/onglet
  - Contexte adapté (avant vs pendant)

- **Out of scope**:
  - Filtrage par profil (Story 10.4)
  - Modification contenu (Story 10.5)

### Critères d'acceptation
- [ ] Checklist visible phase "Avant voyage"
- [ ] Checklist visible phase "Pendant voyage"
- [ ] Modifications acceptées dans les deux phases
- [ ] État items persistant
- [ ] Accès facile depuis tous les écrans
- [ ] Pas de régression sur déblocage

### Fichiers à modifier
- `src/app/App.tsx`: garder accès checklist
- `src/app/screens/ChecklistScreen.tsx`: adapter affichage
- `src/types/cloud.ts`: ajouter `phaseContext`

### Estimation
- Implémentation: 1-2 jours
- QA/tests: 0.5-1 jour
- **Total: 1.5-3 jours**

---

## STORY 10.4: Adaptation de la checklist par profil utilisateur

### ID
`10-4-adaptation-checklist-par-profil`

### Titre
Filtrer la checklist selon genre, rôle parental et propriétaire

### Description
Adapter le contenu de la checklist selon:
- Genre du profil (M/F/autre)
- Rôle parental (parent/enfant/ado)
- Rôle système (propriétaire/utilisateur)

### Scope
- **In scope**:
  - Questions genre + rôle parental lors création
  - Filtrage items par profil
  - Affichage uniquement items pertinents
  - Propriétaire peut voir tous les items

- **Out of scope**:
  - Modification contenu items (Story 10.5)
  - Suppression items

### Critères d'acceptation
- [ ] Profil création: questions genre + rôle parental
- [ ] Checklist filtrée selon profil courant
- [ ] Propriétaire voit tous les items
- [ ] Pas d'items vides dans catégories
- [ ] UX claire (badges "Parents only", etc.)
- [ ] Testée avec 5+ combinaisons profil

### Fichiers à modifier
- `src/types/cloud.ts`: ajouter `userGender`, `userRole`
- `src/app/screens/ProfileCreationScreen.tsx`: questions
- `src/app/screens/ChecklistScreen.tsx`: filtrage

### Estimation
- Design/spec: 1 jour
- Implémentation: 2-3 jours
- QA/tests: 1-2 jours
- **Total: 4-6 jours**

---

## STORY 10.5: Mise à jour du contenu checklist par genre et rôle

### ID
`10-5-mise-a-jour-contenu-checklist`

### Titre
Enrichir la checklist avec items adaptés par genre et rôle

### Description
Mettre à jour `docs/liste à prendre.docx` et `src/content/places.ts` avec:
- Items filtrés par genre (habits homme/femme)
- Items filtrés par rôle parental (parents only, kids only)
- Items propriétaire uniquement
- Au moins 50+ items variés

### Scope
- **In scope**:
  - Curation contenu Word
  - Mapping vers TypeScript
  - Classification par genre/rôle
  - Validation couverture

- **Out of scope**:
  - Création nouvelles catégories
  - Suppression items existants

### Critères d'acceptation
- [ ] Word structuré avec colonnes Genre/Rôle/Propriétaire
- [ ] 50+ items minimum
- [ ] Couverture équilibrée (docs, habits, toilette, électronique, loisirs)
- [ ] Chaque rôle a ≥20 items pertinents
- [ ] Genre M/F distinction claire
- [ ] 5-10 owner-only items
- [ ] Word et `places.ts` en sync
- [ ] Testée en UI avec filtrage

### Fichiers à modifier
- `docs/liste à prendre.docx`: enrichissement
- `src/content/places.ts`: mapping

### Estimation
- Curation: 4-6 heures
- Mapping: 2-3 heures
- QA: 2-3 heures
- **Total: 1-2 jours**

---

## Roadmap EPIC-10

### Ordre recommandé
1. **STORY 10.1** (Visibilité rubriques) — semaine 1
   - Dépend de: BACKLOG-001, BACKLOG-002
   - Bloque: toutes autres stories

2. **STORY 10.3** (Checklist persistante) — semaine 1
   - Dépend de: STORY 10.1
   - Indépendant: peut être parallèle

3. **STORY 10.2** (Mot de passe) — semaine 2
   - Dépend de: BACKLOG-002, BACKLOG-003
   - Optionnel pour MVP

4. **STORY 10.4** (Filtrage par profil) — semaine 2-3
   - Dépend de: STORY 10.1
   - Bloque: STORY 10.5

5. **STORY 10.5** (Contenu checklist) — semaine 3
   - Dépend de: STORY 10.4
   - Peut commencer en parallèle (curation indépendante)

### Estimation totale EPIC-10
- STORY 10.1: 3-5 jours
- STORY 10.2: 4-6 jours
- STORY 10.3: 1.5-3 jours
- STORY 10.4: 4-6 jours
- STORY 10.5: 1-2 jours
- **Total: ~14-22 jours** (3-4 semaines avec 5 jours/sem)

### Definition of Done (EPIC-10)
- [ ] Toutes les stories marquées "done"
- [ ] Matrice d'accès validée (propriétaire = accès complet, user = accès progressif)
- [ ] Checklist visible avant ET après déblocage
- [ ] Checklists filtrées testées pour 5+ combinaisons (genre x rôle x déblocage)
- [ ] 50+ items dans checklist avec classification complète
- [ ] Pas d'accès direct aux rubriques via URL (gardes en place)
- [ ] Messages UX explicites pour rubriques masquées
- [ ] Pas de régression sur EPIC 1-7
- [ ] Documentation mise à jour
- [ ] Build production vert

### Fichiers à modifier
- `src/types/cloud.ts`: ajouter champs mot de passe
- `src/app/screens/ProfileSelectionScreen.tsx`: ajouter écran de saisie mot de passe
- `src/app/screens/ProfileSettingsScreen.tsx`: ajouter section gestion mot de passe
- `src/services/cloudSyncProvider.ts`: synchroniser les mots de passe
- Services d'authentification: valider mot de passe à chaque login

### Critères d'acceptation
- [ ] Chaque profil peut optionnellement définir un mot de passe
- [ ] Mot de passe stocké en hash sécurisé (jamais en clair)
- [ ] Sélection profil protégée par mot de passe si défini
- [ ] Mécanisme de récupération via phrase configurée
- [ ] Interface intuitive dans Paramètres
- [ ] Pas d'impact si profil sans mot de passe

### Effort estimé
- Implémentation: 3-4 jours
- QA/tests: 1-2 jours
- **Total: 4-6 jours**

### Dépendances
- BACKLOG-002 (cloud sync)
- BACKLOG-003 (multi-profil par appareil)

---

## BACKLOG-006: Checklist persistante après déblocage

### Statut
- Statut backlog: BACKLOG
- Date de création: 2026-07-11
- Remarque: Qualité de vie pour les utilisateurs – avoir accès à la checklist même après déblocage de la phase "On est partis"

### Objectif
Garantir que la checklist reste consultable et modifiable même après avoir déverrouillé la phase "Pendant voyage" avec le code propriétaire.

### Problème actuel
- **Phase verrouillée**: Avant déblocage, la checklist est bloquée
- **Phase ouverte**: Après déblocage "On est partis", l'interface change et la checklist peut ne pas être visible
- **Cas d'usage**: Lors du retour de vacances, l'utilisateur souhaite retrouver la checklist pour vérifier ce qui doit être rangé

### Impact
- **UX**: Meilleure accessibilité à la checklist en permanence
- **Voyage**: Utilité de la checklist avant ET pendant le voyage
- **Retour**: Permet de vérifier les items au retour (défaire les valises, ranger)

### Solution proposée (v2)

#### Modèle
- La checklist n'est jamais masquée, même en phase "Pendant voyage"
- Deux contextes: phase "Avant voyage" et "Pendant voyage"
- Items restent modifiables dans les deux phases

#### Flux UX
1. **Avant voyage** (phase "Avant"):
   - Utiliser normalement la checklist (cocher/décocher)
   - Voir le bouton de déblocage "On est partis"

2. **Après déblocage** (phase "Pendant"):
   - Dashboard change pour afficher contenu "voyage"
   - Accès à la checklist depuis menu/onglet/drawer
   - Peut toujours consulter et cocher items

3. **Retour de voyage**:
   - Même checklist accessible
   - Peut réinitialiser l'état de certains items

#### Données
- Aucune modification de stockage
- La checklist reste complète dans `localStorage` ou `cloud sync`
- Ajouter flag: `phaseContext` ("before" | "during") pour adapter affichage

### Fichiers à modifier
- `src/app/App.tsx`: 
  - Garder accès à checklist même en phase "Pendant"
  - Ajouter navigation/onglet pour accéder à checklist
- `src/app/components/ChecklistScreen.tsx`: 
  - Adapter affichage selon phase
  - Toujours accepter les modifications
- `src/types/cloud.ts`: ajouter `phaseContext`

### Critères d'acceptation
- [ ] Checklist visible lors de phase "Avant voyage"
- [ ] Checklist visible lors de phase "Pendant voyage"
- [ ] Modifications toujours acceptées dans les deux phases
- [ ] Items restent coché/décoché selon leur état
- [ ] Accès facile depuis tous les écrans
- [ ] Pas de régression sur le flow de déblocage

### Effort estimé
- Implémentation: 1-2 jours
- QA/tests: 0.5-1 jour
- **Total: 1.5-3 jours**

### Dépendances
- Aucune dépendance majeure (peut être implémenté indépendamment)

---

## BACKLOG-007: Adaptation de la checklist par profil utilisateur

### Statut
- Statut backlog: BACKLOG
- Date de création: 2026-07-11
- Remarque: Permet de personnaliser la checklist en fonction du profil (genre, rôle parent/enfant)

### Objectif
Adapter le contenu et la visibilité de la checklist selon le profil de l'utilisateur (propriétaire, genre, rôle familial).

### Problème actuel
- **Checklist générique**: Tous les profils voient la même checklist
- **Items non pertinents**: Les enfants voient les articles réservés aux adultes
- **Genres non respectés**: Pas de distinction homme/femme sur les vêtements
- **Responsabilités**: Certains items (ex: documents administratifs) ne concernent que les parents

### Impact
- **UX**: Checklist plus pertinente et moins surcharge cognitive
- **Précision**: Chaque profil voit uniquement ce qui le concerne
- **Gamification**: Meilleure motivation (items réalistes pour chacun)

### Solution proposée (v2)

#### Profils et attributs
Chaque profil utilisateur déclare:
1. **Rôle familial**: "owner" | "user"
2. **Genre**: "male" | "female" | "other" (déclaré lors création)
3. **Rôle parental**: "parent" | "enfant" | "ado"

#### Catégories d'articles dans la checklist
- **Communs**: Tous les profils voient (ex: passeport, billet avion)
- **Par genre**: Spécifiques hommes ou femmes (ex: vêtements, articles toilette)
- **Par rôle parental**: 
  - "Parent only": Documents, médicaments responsabilité
  - "Enfants/ados": Jouets, gadgets enfants
  - "All ages": Habits génériques, livres de voyage
- **Owner only**: Propriétaire seul voit (ex: codes de réservation, contrats)

#### Données étendues pour chaque profil
- `userGender: "male" | "female" | "other"`
- `userRole: "parent" | "enfant" | "ado"`

#### Données étendues pour chaque item checklist
- `visibility: "all" | "owner-only" | "parents-only" | "kids-only" | "males-only" | "females-only"`
- `applicableGenders: string[]` (ex: ["male", "other"])
- `applicableRoles: string[]` (ex: ["parent", "ado"])

### Fichiers à modifier
- `src/types/cloud.ts`: 
  - Étendre `Profile` avec `userGender`, `userRole`
  - Étendre `ChecklistItem` avec `visibility`, `applicableGenders`, `applicableRoles`
- `src/app/screens/ProfileCreationScreen.tsx`:
  - Ajouter questions: "Quel est votre genre?" et "Êtes-vous un parent ou un enfant?"
- `src/app/screens/ChecklistScreen.tsx`:
  - Filtrer items selon profil courant
  - Afficher uniquement items pertinents
- `src/content/places.ts` (ou équivalent):
  - Mettre à jour items checklist avec attributs `visibility`
  - Ajouter catégories par genre/rôle
- Mettre à jour `docs/liste à prendre.docx`: Ajouter colonne "Genre" et "Rôle" pour chaque item

### Critères d'acceptation
- [ ] Profil création: questions genre et rôle parental
- [ ] Checklist filtrée: affiche uniquement items pertinents pour le profil
- [ ] Propriétaire: voit tous les items ("view all" si souhaité)
- [ ] Items "communs": visibles pour tous
- [ ] Items genrés: visibles uniquement pour le genre approprié
- [ ] Items parentaux: visibles uniquement pour parents/ados selon rôle
- [ ] Pas d'items vides: aucune catégorie vide ne s'affiche
- [ ] UX intuitive: explication claire des items masqués (optionnel: badges "Parents only", etc.)

### Effort estimé
- Design/spec: 1 jour
- Implémentation données: 1-2 jours
- Implémentation UI/filtrage: 2-3 jours
- QA/tests: 1-2 jours
- **Total: 5-8 jours**

### Dépendances
- BACKLOG-002 (cloud sync) pour persistance des profils
- Recommandé: BACKLOG-005 (profils optionnels avec mot de passe)

---

## BACKLOG-008: Mise à jour du contenu checklist par genre et rôle

### Statut
- Statut backlog: BACKLOG
- Date de création: 2026-07-11
- Remarque: Tâche de content/curation pour remplir la checklist adaptée par profil

### Objectif
Mettre à jour le fichier source `docs/liste à prendre.docx` et le contenu applicatif pour refléter les différentes catégories par genre, rôle parental et propriétaire.

### Problème actuel
- **Checklist statique**: Le fichier `docs/liste à prendre.docx` contient une liste générique
- **Pas de distinction**: Aucune marque de genre ou rôle parental
- **Contenu technique**: Pas encore intégré dans `src/content/places.ts` avec les attributs de visibilité

### Impact
- **Contenu**:  Checklist réelle alignée avec les besoins réels de la famille
- **Maintenance**: Source unique (`docs/liste à prendre.docx`) pour mise à jour future
- **Implémentation**: Mapping clair entre contenu et code

### Solution proposée (v2)

#### Tâche 1: Mettre à jour le fichier Word
**Fichier**: `docs/liste à prendre.docx`

**Structure proposée**:
| Item | Catégorie | Genre | Rôle Parental | Propriétaire Only | Notes |
|------|-----------|-------|---------------|------------------|-------|
| Passeport | Documents | All | All | No | Commun |
| Visas | Documents | All | Parent | No | Parent only |
| Cartes d'assurance | Documents | All | Parent | Yes | Owner + parent |
| ... | ... | ... | ... | ... | ... |

**Colonnes à ajouter**:
- `Genre`: "All", "Male", "Female", "Other"
- `Rôle Parental`: "All", "Parent", "Enfant", "Ado"
- `Propriétaire only`: "Yes"/"No"
- `Catégorie`: groupement (Documents, Habits, Toilette, Électronique, Loisirs, etc.)

#### Tâche 2: Enrichir `src/content/places.ts`
**Fichier**: `src/content/places.ts`

Mettre à jour la structure `ChecklistItem`:
```typescript
export interface ChecklistItem {
  id: string;
  name: string;
  category: "documents" | "habits" | "toilette" | "electronics" | "loisirs" | "misc";
  visibility: "all" | "owner-only" | "parents-only" | "kids-only";
  applicableGenders: ("male" | "female" | "other")[];
  applicableRoles: ("parent" | "enfant" | "ado")[];
  notes?: string;
}
```

Remplir avec les données du fichier Word en mappant les colonnes appropriées.

#### Tâche 3: Valider et tester
- Relire le fichier Word pour complétude
- Vérifier la pertinence culturelle/familiale des items
- Tester en UI (filtrage par profil)
- Valider qu'aucune catégorie n'est vide pour les rôles principaux

### Fichiers à modifier
- `docs/liste à prendre.docx`: 
  - Ajouter colonnes de classification
  - Complétude du contenu
  - Ajouter explications/notes si nécessaire
- `src/content/places.ts`:
  - Enrichir structure ChecklistItem
  - Mapper toutes les entrées Word vers TypeScript

### Critères d'acceptation
- [ ] Fichier Word structuré avec colonnes de classification
- [ ] Au moins 50+ items dans la liste
- [ ] Couverture équilibrée: documents, habits, toilette, électronique, loisirs
- [ ] Chaque rôle (parent, enfant, ado) a ≥20 items pertinents
- [ ] Genre M/F a distinction claire sur habits/toilette
- [ ] Owner-only items: au moins 5-10 items (codes, réservations, etc.)
- [ ] Fichier Word et `places.ts` en sync (pas de divergence)
- [ ] QA: Tester filtrage complet par profil (5+ combinaisons)

### Effort estimé
- Curation contenu Word: 4-6 heures
- Mapping vers TypeScript: 2-3 heures
- QA/validation: 2-3 heures
- **Total: 1-2 jours**

### Notes
- Peut être fait partiellement en parallèle avec BACKLOG-007
- Après mise à jour initiale, approche "wiki community" pour future maintenance
- Considérer versioning du contenu (dates de MAJ dans Word)

### Dépendances
- Attend: BACKLOG-007 (structure technique pour visibilité)
- Peut commencer en parallèle: Curation contenu independent de la tech

---

## BACKLOG-009: Règles de visibilité des rubriques selon rôle et déblocage

### Statut
- Statut backlog: BACKLOG
- Date de création: 2026-07-11
- Remarque: Règle métier critique sur l'accès aux rubriques selon rôle et état de déblocage

### Objectif
Définir et implémenter les règles de visibilité des rubriques de l'application selon le profil utilisateur (propriétaire vs utilisateur) et l'état de déblocage du code propriétaire.

### Problème actuel
- **Accès inconsistent**: Pas de règle claire sur qui voit quoi avant/après déblocage
- **UX confusion**: Utilisateurs ne savent pas pourquoi certaines rubriques sont masquées
- **Rôle propriétaire**: Le propriétaire devrait avoir accès complet, indépendamment du code

### Impact
- Clarté métier sur les droits d'accès
- Meilleure UX: propriétaire a accès complet dès le démarrage
- Sécurité: utilisateurs ne voient que ce qui est autorisé

### Solution proposée

#### Règles de visibilité (matrice d'accès)

| Rubrique | Propriétaire (sans déblocage) | Utilisateur (avant déblocage) | Utilisateur (après déblocage) | Propriétaire (après déblocage) |
|----------|-------------------------------|------------------------------|-------------------------------|-------------------------------|
| Checklist | ✅ Visible | ✅ Visible | ✅ Visible | ✅ Visible |
| Jeux | ✅ Visible | ❌ Masqué | ✅ Visible | ✅ Visible |
| Conseils/Tips | ✅ Visible | ❌ Masqué | ✅ Visible | ✅ Visible |
| Résultats Jeux | ✅ Visible | ❌ Masqué | ✅ Visible | ✅ Visible |
| Paramètres | ✅ Visible | ✅ Visible | ✅ Visible | ✅ Visible |
| Code Propriétaire | ✅ Visible | ❌ Masqué | ❌ Masqué | ✅ Visible |

#### Détails des règles

**Propriétaire**:
- Voir TOUTES les rubriques TOUT LE TEMPS (avant et après déblocage du code)
- Pas de contrainte liée au code
- Accès complet aux paramètres (y compris gestion du code)

**Utilisateur (avant déblocage du code propriétaire)**:
- Voir uniquement:
  - Checklist (lecture/modification)
  - Paramètres personnels (profil, surnom)
- Masqué:
  - Jeux
  - Conseils/Tips
  - Résultats jeux
  - Code propriétaire
  - Toute autre rubrique hors voyage

**Utilisateur (après déblocage du code propriétaire)**:
- Voir toutes les rubriques SAUF:
  - Code propriétaire (reste masqué)
  - Gestion du code (reste réservé au propriétaire)
- Voir:
  - Checklist (lecture/modification)
  - Jeux
  - Conseils/Tips
  - Résultats jeux
  - Paramètres personnels

#### État de déblocage
- État global: `isOwnerCodeUnlocked: boolean`
- Stocké dans cloud sync
- Initialisé à `false` au premier lancement
- Basculé à `true` après validation réussie du code propriétaire
- Jamais réinitialisé (jusqu'à suppression de données)

### Fichiers à modifier
- `src/types/cloud.ts`: 
  - Ajouter `isOwnerCodeUnlocked: boolean` dans l'état global
- `src/app/App.tsx`:
  - Créer fonction `canAccessRubric(rubricName, userRole, isOwnerCodeUnlocked)` pour les gardes d'accès
  - Adapter le routing/menu selon les droits
- `src/app/screens/DashboardScreen.tsx` (ou équivalent):
  - Afficher/masquer les onglets et sections selon les droits
  - Afficher message explicite si rubrique masquée (ex: "Déverrouillez le voyage pour voir les jeux")
- `src/services/cloudSyncProvider.ts`:
  - Synchroniser l'état de déblocage
- Tous les écrans/rubriques:
  - Ajouter gardes de sécurité (ne jamais afficher hors des conditions d'accès)

### Critères d'acceptation
- [ ] Propriétaire voit toutes les rubriques même sans déblocage
- [ ] Utilisateur voit uniquement checklist + paramètres avant déblocage
- [ ] Utilisateur voit toutes les rubriques après déblocage (sauf code propriétaire)
- [ ] Menu/onglets adapté dynamiquement selon les droits
- [ ] Pas d'accès direct via URL (gardes en place)
- [ ] Messages UX explicites quand rubrique masquée (ex: message incitatif)
- [ ] Pas de régression sur les autres flows
- [ ] État de déblocage persiste après reload

### Effort estimé
- Implémentation: 2-3 jours
- QA/tests: 1-2 jours
- **Total: 3-5 jours**

### Dépendances
- BACKLOG-001 (propriétaire unique)
- BACKLOG-002 (cloud sync pour persister `isOwnerCodeUnlocked`)

### Notes
- Cette règle doit être implémentée en même temps que le déblocage du code (sinon utilisateurs verront rubriques verrouillées sans explication)
- Considérer une transition UX fluide: animation ou message toast quand déblocage réussit
- Peut être implémenté avant BACKLOG-005/007 (orthogonal)

---

## Consolidation et repriorisation globale (2026-07-15)

Source de consolidation:
- `docs/backlog-epics-stories.md` (diagnostic continuite et backlog post-tests)
- backlog existante des epics 9 et 10 (ce fichier)

### Priorites globales

1. P0 - Stabiliser la continuite numerique (nouvel epic prioritaire: ecran blanc, source de verite cloud, isolation de state, security rules)
2. P1 - Finaliser Epic 9 (recuperation d'urgence du code proprietaire)
3. P1 - Corriger regressions guide/photos et fiabilite dashboard
4. P1 - Checklist persistante apres deblocage (item 10.3 / BACKLOG-006)
5. P2 - Reste Epic 10 (auth profil, filtrage checklist, enrichissement contenu)

### Mapping de priorite Epic 9 et Epic 10

- Epic 9
  - 9.1 Configurer phrase de recuperation: P1
  - 9.2 Reinitialiser le code via code oublie: P1
  - 9.3 Couvrir les gardes par tests: P1

- Epic 10
  - 10.1 Regles visibilite rubriques: P2
  - 10.2 Authentification mot de passe par profil: P2
  - 10.3 Checklist persistante apres deblocage: P1
  - 10.4 Adaptation checklist par profil: P2
  - 10.5 Mise a jour contenu checklist: P2

### Rationalisation des doublons

- Les sujets d'isolation des donnees par profil (checklist/jeux) doivent etre traites dans l'epic de continuite numerique avant d'ouvrir des stories correctives paralleles.
- L'audit des Security Rules est un pre-requis de securite pour les epics 9 et 10.
