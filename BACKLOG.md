# Backlog: Éléments identifiés post-déploiement MVP

## BACKLOG-001: Force 1 seul propriétaire par appareil

### Objectif
Respecter le design §8.1 du PRD : "Un seul Profil actif par appareil (mode mono-profil) en v1."

### Problème actuel
Actuellement, le rôle peut être changé librement dans Paramètres :
- Sam crée profil "Sam (Propriétaire)" → définit code
- Plus tard, Sam peut changer son rôle en "Utilisateur" dans Paramètres
- Aucune validation / immutabilité n'est forcée

### Impact
- **Sécurité** : Code propriétaire devrait être non-changeable une fois défini
- **UX** : Utilisateurs peuvent se "mettre en utilisateur" et perdre l'accès au déblocage

### Solution proposée
1. **Une fois code propriétaire défini** :
   - Rôle "Propriétaire" devient **immutable**
   - Section "Changer le rôle" disparaît des Paramètres
   - Message : "Vous êtes propriétaire et ne pouvez pas changer ce rôle"

2. **Réinitialisation du code** :
   - Ajouter option "Réinitialiser le code" (dangerous action)
   - Requiert authentification ou confirmation triple

3. **Changement précoce** :
   - Avant de définir le code → changement rôle toujours possible
   - Une fois code défini → Propriétaire immutable

### Fichiers à modifier
- `src/app/App.tsx` : 
  - `ProfileSettingsScreen` component (ajouter condition immutabilité)
  - Handlers de changement de rôle (ajouter guard)
  - État : checker `ownerCode.length > 0` pour bloquer changement

### Effort estimé
- Frontend : ~2-3 heures (guard logic + UI adjustments)
- QA : ~1 heure

### Dépendances
- Aucune (chaîne logique purement client)

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
- ☐ **BACKLOG-001** : Force 1 seul propriétaire (sécurité)
- ☐ **BACKLOG-004** : Réinitialisation d'urgence (UX critical)

### v2 (prochaine itération majeure)
- ☐ **BACKLOG-002** : Cloud sync (feature)
- ☐ **BACKLOG-003** : Multi-profil (feature)

---

## Notes

- Tous les backlog items sont **complètement orthogonaux** → peuvent être implémentés indépendamment
- BACKLOG-002 bloquerait BACKLOG-003 (dependency: cloud sync → multi-profil)
- BACKLOG-001 peut être mergé avant cloud sync sans conflit
