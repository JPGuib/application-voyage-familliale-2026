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

### Objectif
Permettre au propriétaire de réinitialiser son code s'il l'oublie.

### Problème actuel
- Code propriétaire = clé unique du déblocage
- Si oublié → **App inutilisable** (phase verrouillée)
- Aucun mécanisme de "réinitialiser mon code"

### Solution proposée (v1.1 ou v2)
1. Écran "Oublié le code?" depuis écran de déblocage
2. Vérification d'identité (ex: question secrète, email, etc.)
3. Réinitialisation du code stocké
4. Nouveau code envoyé / affiché

### Effort estimé
- Frontend : ~2-3 heures
- Logique : ~1 heure

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
