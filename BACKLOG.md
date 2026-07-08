# Backlog: Éléments identifiés post-déploiement MVP

## BACKLOG-001: Propriétaire unique global (toute l'application)

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
- ☐ **BACKLOG-001** : Propriétaire unique global (règle métier)
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
