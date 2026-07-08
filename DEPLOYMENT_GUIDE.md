# Guide de Déploiement : Application de Voyage Familiale 2026

## 1. Déploiement sur Vercel (Web)

### Prérequis
- Compte Vercel (gratuit)
- Repository GitHub avec le code
- Projet Firebase avec Realtime Database activée
- Variables d'environnement (local + Vercel):
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_DATABASE_URL`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_APP_ID`
   - `VITE_FAMILY_SYNC_ID`

### 1.0 Configuration `.env.local` (développement local)

1. Copiez `.env.example` vers `.env.local`
2. Renseignez les variables Firebase
3. Choisissez une valeur unique pour `VITE_FAMILY_SYNC_ID` (ex: `famille-voyage-2026`)
4. Utilisez exactement la même valeur sur tous les appareils de la famille

Exemple:

```bash
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_DATABASE_URL=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_APP_ID=...
VITE_FAMILY_SYNC_ID=famille-voyage-2026
```

Important:
- `.env.local` ne doit pas être versionné
- sans ces variables, l'app fonctionne en mode local (pas de sync multi-appareil)

### Étapes

#### 1.1 Connexion et import
1. Allez sur [vercel.com](https://vercel.com)
2. Connectez-vous avec GitHub
3. Cliquez **"New Project"**
4. Sélectionnez le repository du projet
5. Vercel détecte automatiquement Vite

#### 1.2 Configuration de build
Vercel reconnaît **vite.config.ts** automatiquement. Les paramètres à vérifier :

- **Build Command** : `npm run build` ✓ (défaut)
- **Output Directory** : `dist` ✓ (défaut)
- **Install Command** : `npm install` ✓ (défaut)

#### 1.3 Variables d'environnement Vercel (obligatoire pour la sync)
Dans **Project Settings -> Environment Variables**, ajoutez:

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_DATABASE_URL`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_FAMILY_SYNC_ID`

Appliquez au minimum à `Production` et `Preview`, puis redéployez.

#### 1.4 Déploiement
1. Cliquez **"Deploy"**
2. Attendez ~1-2 min
3. Vercel fournit une URL `https://[project].vercel.app`

#### 1.5 Accès en production
- **URL publique** : `https://[project].vercel.app`
- **Historique de déploiement** : Dashboard Vercel
- **Mise à jour** : git push déclenche automatiquement un redéploiement

**Service Worker** : Vercel expose les fichiers `sw.js` et `manifest.webmanifest` générés par Vite PWA.

---

## 2. Déploiement sur iOS 17+

### Prérequis
- Application accessible via HTTPS (URL Vercel valide)
- iPhone / iPad avec iOS 17+
- Safari (navigateur intégré)

### Installation sur écran d'accueil

#### 2.1 Depuis Safari
1. Ouvrez Safari
2. Naviguez vers `https://[project].vercel.app`
3. **Menu (3 points)** → **Partager** (share icon)
4. Descendez → **"Sur l'écran d'accueil"** (Add to Home Screen)
5. Nommez l'app (ex: "Voyage 2026")
6. Tapez **"Ajouter"**

#### 2.2 Résultat
- Icône apparaît sur l'écran d'accueil
- L'app s'ouvre en mode **fullscreen standalone** (pas de barre Safari)
- Icône PWA utilise `apple-touch-icon.png` (180×180 px)
- Nom court : "Voyage 2026" (depuis `manifest.webmanifest`)
- Fond : couleur thème "#FFF8F1" (depuis vite.config.ts)

### 2.3 Mode opératoire famille (iOS)
1. Vérifiez que l'URL Vercel est bien la version de production
2. Vérifiez que `VITE_FAMILY_SYNC_ID` est la même que sur Android/desktop
3. Le premier membre crée son profil et devient Propriétaire
4. Les autres membres créent leur profil: ils sont automatiquement Utilisateur
5. Si un ancien cache existe, forcez un rechargement Safari puis relancez l'app installée

### Fonctionnalités PWA disponibles

| Fonction | iOS 17 | Statut |
|---|---|---|
| **Installation** | ✅ | Via menu Partager |
| **Mode standalone** | ✅ | Plein écran sans barre Safari |
| **Service Worker** | ✅ | Offline depuis iOS 16.4 |
| **Cache persistant** | ✅ | localStorage + IndexedDB |
| **Push Notifications** | ⚠️ | Limité (opt-in utilisateur) |
| **Sync en arrière-plan** | ❌ | Non supporté en v1 |

### Gestion de l'orientation
- Configuration : `orientation: 'portrait'` (vite.config.ts)
- L'app reste en portrait même si l'appareil est pivoté

---

## 3. Déploiement sur Android 16 (Samsung Galaxy A53)

### Prérequis
- Samsung Galaxy A53 avec Android 16 + One UI 8.0
- Chrome 130+ (ou tout navigateur Chromium)
- Application accessible via HTTPS (URL Vercel)

### Installation sur écran d'accueil

#### 3.1 Depuis Chrome
1. Ouvrez Chrome
2. Naviguez vers `https://[project].vercel.app`
3. **Menu (3 points)** → **Installer l'app** (ou "Install app")
4. Tapez **"Installer"** dans la confirmation
5. L'app s'ajoute à l'écran d'accueil

**Alternative** : Long-press l'icône Chrome → **"Installer l'app"**

#### 3.2 Résultat
- Icône PWA apparaît sur l'écran d'accueil / Play Store personnel
- Mode standalone : pas de barre Chrome
- Icône utilise `icon-192.png` ou `icon-512.png`
- Nom court : "Voyage 2026"
- Fond splash : couleur thème "#B8A898"

### 3.3 Mode opératoire famille (Android)
1. Ouvrez exactement la même URL Vercel que sur iOS
2. Installez l'app via Chrome
3. Vérifiez que le premier profil Android n'essaie pas de devenir propriétaire si owner déjà créé
4. Si besoin, videz cache/site data Chrome et relancez l'app

### Fonctionnalités PWA disponibles

| Fonction | Android 16 | Statut |
|---|---|---|
| **Installation** | ✅ | Automatique (banneau Chrome) |
| **Mode standalone** | ✅ | Plein écran |
| **Service Worker** | ✅ | Fully supported |
| **Cache offline** | ✅ | localStorage + IndexedDB |
| **Sync en arrière-plan** | ✅ | (Non utilisé en v1) |
| **Push Notifications** | ✅ | Chrome support |

---

## 4. Architecture multi-device

### État actuel (MVP + sync minimale)
- **Cloud sync activable** via Firebase Realtime Database
- Si variables Firebase présentes: état famille partagé entre appareils
- Si variables absentes: fallback localStorage (mode local isolé)

### Conséquences
- **Avec cloud** : owner unique global + code propriétaire partagé
- **Sans cloud** : chaque appareil reste indépendant

### Exemple
1. Sam configure le profil "Sam (Propriétaire)" sur iPhone
   - Code propriétaire défini
   - État owner écrit dans Firebase
2. Sam ouvre l'app sur l'iPad
   - ✅ Le propriétaire global est déjà connu
   - ✅ Le profil créé sur iPad devient automatiquement Utilisateur
   - ✅ Le code propriétaire est identique

**Prochaine étape v2** : étendre la sync à checklist, résultats et phase de voyage.

---

## 5. Gestion des rôles (Propriétaire / Utilisateur)

### État actuel (MVP)
- **1 Profil par appareil** (mono-profil)
- Rôle peut être **Propriétaire** ou **Utilisateur**
- **Pas de contrainte** : le rôle peut être changé dans Paramètres

### Flux attendu
1. **Premier lancement** :
   - Écran de création de profil
   - Choix du Surnom
   - Choix du Rôle (Propriétaire / Utilisateur)
2. **Propriétaire** :
   - Accès à l'option "Définir le code propriétaire" (Paramètres)
   - Code requis pour débloquer "On est partis"
   - Phase Avant Départ → Phase Pendant Voyage
3. **Utilisateur** :
   - ❌ Pas d'accès à la configuration du code
   - Phase reste verrouillée jusqu'au déblocage par le propriétaire

### Problème identifié pour Backlog
**[BACKLOG-001] Force 1 seul propriétaire par appareil**
- Actuellement : rôle peut être changé librement dans Paramètres
- À faire : 
  - Une fois le code propriétaire défini → rôle Propriétaire immutable
  - Les autres profils / changements → force Utilisateur
  - Empêcher de réinitialiser le code une fois créé (ou password-protect)

---

## 6. Processus de déploiement complet

### Avant chaque release

```bash
# 1. Build local
npm run build

# 2. Tester hors ligne (si possible)
# - Ouvrir dist/index.html en local
# - Tester sans réseau

# 3. Validation final
npm run test
```

Checklist variables:
- Vérifier `.env.local` en local
- Vérifier les mêmes variables dans Vercel (Production)
- Vérifier `VITE_FAMILY_SYNC_ID` identique pour tous les appareils

### Release sur Vercel
```bash
# 1. Commit et push sur main
git add .
git commit -m "Release: [version]"
git push origin main

# 2. Vercel redéploie automatiquement
# - Vérifier le statut sur dashboard.vercel.com
# - Attendre ~1-2 min

# 3. Tester en production
# - iOS : Ajouter à l'écran d'accueil depuis Safari
# - Android : Installer via Chrome
# - Bureau : https://[project].vercel.app
```

Vérification post-déploiement (owner global):
1. Appareil A (premier lancement): créer le profil propriétaire
2. Appareil B (nouveau membre): vérifier création automatique en utilisateur
3. Appareil B: vérifier qu'il ne peut pas modifier le code propriétaire

### Rollback d'urgence
```bash
# Sur Vercel Dashboard :
# 1. "Deployments" → sélectionner un déploiement antérieur
# 2. Cliquer "..." → "Promote to Production"
```

---

## 7. Checklist de compatibilité

### iOS 17+ (Safari)

- ✅ JavaScript ES2022 (target: safari17)
- ✅ CSS moderne (Tailwind v4 avec `:is()`)
- ✅ Service Worker (depuis iOS 16.4)
- ✅ Icône PWA (apple-touch-icon.png)
- ✅ Meta tags `apple-mobile-web-app-*`
- ✅ Mode standalone
- ✅ Stockage localStorage / IndexedDB

### Android 16 (Chrome 130+)

- ✅ JavaScript ES2022 (target: chrome120)
- ✅ CSS Flexbox / Grid
- ✅ Service Worker complet
- ✅ Icônes PNG (icon-192, icon-512)
- ✅ Manifest.webmanifest W3C
- ✅ Mode standalone
- ✅ Stockage localStorage / IndexedDB

### Desktop (navigateur)

- ✅ Chrome / Edge / Safari / Firefox
- ✅ PWA install (optionnel)
- ✅ Offline support

---

## 8. Dépannage

### PWA n'apparaît pas sur iOS
- Vérifier : Safari → Partager → "Sur l'écran d'accueil" visible ?
- Vérifier HTTPS actif
- Vérifier `apple-touch-icon.png` existe dans `public/icons/`
- Vérifier meta tags dans `index.html`

### PWA n'apparaît pas sur Android
- Vérifier : Chrome → Menu → "Installer l'app" visible ?
- Vérifier HTTPS actif
- Vérifier `icon-192.png` et `icon-512.png` existent
- Vérifier `manifest.webmanifest` valide (Chrome DevTools)

### Offline ne fonctionne pas
- Vérifier Service Worker enregistré : DevTools → Application → Service Workers
- Vérifier `dist/sw.js` généré par vite-plugin-pwa
- Vérifier fichiers dans le cache : Application → Cache Storage

### Contenu ne se met pas à jour
- Vider le cache du navigateur
- Forcer le rechargement du SW : DevTools → unregister
- Attendre ~24h pour la mise à jour auto-update (si activée)

### Le propriétaire n'est pas le même selon les appareils
- Vérifier que `VITE_FAMILY_SYNC_ID` est identique partout
- Vérifier que les variables Firebase sont bien définies dans Vercel Production
- Vérifier que la base Firebase Realtime Database est accessible en lecture/écriture
- Vérifier que les appareils ouvrent la même URL de production

---

## 9. Ressources

- [Vercel Docs](https://vercel.com/docs)
- [Web App Manifests (MDN)](https://developer.mozilla.org/en-US/docs/Web/Manifest)
- [Service Workers (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [iOS PWA Support](https://webkit.org/blog/15459/the-future-of-web-apps-on-ios/)
- [Vite PWA Plugin](https://vite-pwa-org.netlify.app/)
- [Chrome DevTools PWA](https://developer.chrome.com/docs/devtools/progressive-web-apps/)
