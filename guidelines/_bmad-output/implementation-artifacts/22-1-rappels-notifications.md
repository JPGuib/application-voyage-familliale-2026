---
baseline_commit: ""
---

# Story 22.1: Rappels et notifications avec préférences configurables

Status: review

## Story

As a family member (proprietaire, voyageur, or visiteur),
I want to opt-in to browser/PWA notifications for specific event types (checklist reminder, game reminder, new comment on a place),
so that I receive timely, relevant reminders without being forced to re-open the app.

## Acceptance Criteria

1. Un profil peut activer/désactiver les notifications depuis Paramètres.
2. Les préférences de notification sont **granulaires par type** : le profil peut activer/désactiver indépendamment :
   - `notif_checklist` — rappel avant départ (J-3 et J-1) si la checklist n'est pas à 100 %.
   - `notif_game` — rappel si le défi du jour n'est pas encore complété ce jour-là.
   - `notif_comments` — notification quand un autre membre de la famille publie un commentaire sur un lieu.
3. La permission navigateur n'est demandée qu'une seule fois, à la première activation d'un type dans les Paramètres (pas au premier lancement).
4. Refuser la permission désactive silencieusement les notifications sans bloquer l'app.
5. Un profil dont la checklist est déjà à 100 % ne reçoit pas de rappel checklist, même si `notif_checklist` est activé.
6. Un profil qui a déjà complété le défi du jour ne reçoit pas de rappel jeu.
7. Quand un autre profil publie un commentaire sur un lieu, les profils ayant `notif_comments` activé reçoivent une notification (titre : "Nouveau commentaire", corps : "{Prénom} a commenté {Nom du lieu}").
8. Les rappels checklist et jeu sont des **notifications programmées localement** (Web Notification API + `setTimeout`/`setInterval`) : ils se déclenchent uniquement si l'app est ouverte dans l'onglet ou en arrière-plan (Service Worker limité — voir contraintes iOS).
9. Les notifications de commentaires se déclenchent en **temps réel** (via le listener RTDB déjà en place dans `useCloudSync`), si l'app est ouverte.
10. Les préférences de notification sont stockées **par profil, localement** (localStorage) ; elles ne se synchronisent pas entre appareils (comportement attendu : chaque appareil/navigateur gère sa propre permission OS).

## Tasks / Subtasks

- [x] Créer le module de notification (AC: 1,2,3,4,8,9)
  - [x] Créer `src/app/notifications.ts` : types `NotificationPreferences`, `NotificationPermissionStatus`, fonctions `requestPermission()`, `showNotification(title, body)`, `areNotificationsEnabled()`.
  - [x] Créer `src/app/notifications.test.ts` : couvrir les branches granted/denied/default, les cas iOS (API absente), et l'absence d'effet secondaire si non autorisé.
- [x] Stocker les préférences par profil (AC: 2,10)
  - [x] Ajouter storage key `jp-notification-prefs-by-profile` (objet `Record<profileId, NotificationPreferences>`).
  - [x] Ajouter helpers read/write dans `notifications.ts`.
- [x] Étendre SettingsScreen (AC: 1,2,3,4)
  - [x] Ajouter une section "Notifications" dans `SettingsScreen` (App.tsx).
  - [x] Afficher l'état de la permission OS (accordée / refusée / non demandée).
  - [x] Afficher trois toggles (checklist / jeu / commentaires), désactivés si la permission OS est refusée.
  - [x] Au premier toggle ON : appeler `Notification.requestPermission()`.
- [x] Rappel checklist J-3 / J-1 (AC: 5,8)
  - [x] Dans App.tsx, ajouter un effet (après hydratation cloud) qui calcule `computeDaysUntilStart` et programme (via `setTimeout`) une notification si daysUntilStart ∈ {3,1} et `notif_checklist` activé et checklist du profil < 100 %.
  - [x] La progression checklist utilise la formule déjà calculée en ligne 7102–7103 de App.tsx.
- [x] Rappel jeu du jour (AC: 6,8)
  - [x] Ajouter un effet qui, chaque jour, détecte si le profil n'a pas de `gameHistory` pour `currentDay` et déclenche une notification si `notif_game` activé.
  - [x] Éviter les notifications multiples (stocker la date du dernier rappel jeu dans `jp-notification-prefs-by-profile`).
- [x] Notification de commentaire en temps réel (AC: 7,9)
  - [x] Dans `useCloudSync` ou dans App.tsx, détecter les ajouts de commentaires (`placeComments` snapshot diff) : si l'auteur n'est pas le profil courant et que `notif_comments` est activé, appeler `showNotification`.
  - [x] Résoudre le nom du lieu depuis `PLACES_CONTENT` (déjà importé dans App.tsx).
- [x] Tests (AC: tous)
  - [x] Unit `notifications.test.ts` : requestPermission, showNotification, prefs read/write.
  - [x] Unit `App.tsx` checklist-progress trigger condition (utiliser vitest + mock Notification API).
  - [x] Integration : commenter depuis un profil A → profil B reçoit la notification (mocker `showNotification`).

## Dev Notes

### Story Foundation

- Source story : `docs/specs-stories/epic-22/22.1-rappels-notifications.md`
- Ajouts métier de l'utilisateur (non présents dans le spec d'origine) :
  - **Notification de nouveau commentaire** : quand un membre commente un lieu, les autres profils activés reçoivent une notification.
  - **Granularité configurable** : checklist / jeu / commentaires sont des toggles indépendants.

### Predecessor Story Intelligence (21.2)

- Story 21.2 a introduit `placeComments` dans `CloudSyncSnapshot` (voir `src/types/cloud.ts`).
- Structure : `families/{familyId}/placeComments/{placeId}/{authorProfileId}` (upsert par profil/lieu).
- Le listener RTDB dans `useCloudSync` synchronise déjà `placeComments` en temps réel — la détection d'un nouveau commentaire peut se faire par diff de l'objet `placeComments` entre deux snapshots.
- `authorSurnameSnapshot` est persisté dans chaque commentaire : utiliser ce champ pour le corps de la notification.

### Architecture Compliance (must follow)

- Ne PAS ajouter de dépendance externe. La Notification API est native au navigateur.
- Respecter le schéma localStorage `jp-*` déjà en vigueur.
- Les préférences de notification ne font PAS partie de `CloudSyncWritePayload` (délibéré : local par appareil).
- La logique de déclenchement des rappels checklist/jeu doit rester dans App.tsx comme effet React, à l'instar des autres effets cloud. Ne pas déplacer de logique dans un Service Worker pour cette story (complexité PWA non justifiée pour MVP).
- `computeDaysUntilStart` et `computeCurrentDay` sont dans `src/app/trip-day.ts` — les importer plutôt que recalculer.

### Existing Files to Read Before Modifying

- `src/app/App.tsx`
  - Lignes 293–298 : pattern de déclaration des STORAGE_KEY constants — suivre le même style.
  - Lignes 303–304 : type `Screen` — ne pas ajouter d'écran supplémentaire pour les notifications (section dans SettingsScreen suffisante).
  - Lignes 4117+ : `SettingsScreen` — ajouter la section Notifications après les sections existantes, avant le bas de la page ; suivre les patterns de section et de toggle déjà utilisés (cf. gameDayOverride toggles).
  - Lignes 7102–7103 : calcul `pct` checklist (formule `Math.round((checkedCount / totalItems) * 100)`) — réutiliser directement, ne pas dupliquer.
  - Lignes 5513–5515 : pattern session token/localStorage — les clés de notification suivront le même schéma.
- `src/app/trip-day.ts` : `computeDaysUntilStart`, `computeCurrentDay` — lire avant tout usage.
- `src/types/cloud.ts` : `CloudPlaceComment`, `CloudPlaceCommentsByPlace` — types à utiliser pour le diff de commentaires.
- `src/app/game-results.ts` : `parseGameHistory` — pour vérifier si le profil a joué aujourd'hui.
- `src/hooks/useCloudSync.ts` — comprendre comment le snapshot RTDB est exposé en React state avant d'y accrocher la détection de nouveaux commentaires.

### NotificationPreferences Type (à créer)

```typescript
// src/app/notifications.ts
export type NotificationPreferences = {
  notif_checklist: boolean; // Rappel checklist J-3/J-1
  notif_game: boolean;      // Rappel défi du jour
  notif_comments: boolean;  // Nouveau commentaire d'un autre profil
  lastGameReminderDate?: string; // "YYYY-MM-DD" pour éviter multi-rappels
};

export const DEFAULT_NOTIFICATION_PREFS: NotificationPreferences = {
  notif_checklist: false,
  notif_game: false,
  notif_comments: false,
};
```

### Storage Key

```typescript
const NOTIFICATION_PREFS_STORAGE_KEY = "jp-notification-prefs-by-profile";
// Forme : Record<profileId, NotificationPreferences>
```

### Notification API Guards

La Notification API n'est pas disponible sur tous les environnements (notamment iOS Safari < 16.4, et SSR/test). Toujours guarded :

```typescript
export function areNotificationsSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export async function requestPermission(): Promise<NotificationPermission> {
  if (!areNotificationsSupported()) return "denied";
  return Notification.requestPermission();
}

export function showNotification(title: string, body: string): void {
  if (!areNotificationsSupported()) return;
  if (Notification.permission !== "granted") return;
  new Notification(title, { body, icon: "/icons/icon-192.png" });
}
```

### Trigger Logic — Checklist Reminder

```typescript
// Dans App.tsx, dans un useEffect dépendant de [tripStartDate, checklistProgress, notifPrefs]
const daysUntil = computeDaysUntilStart(tripStartDate);
if (
  (daysUntil === 3 || daysUntil === 1) &&
  notifPrefs.notif_checklist &&
  checklistPct < 100
) {
  showNotification(
    "Checklist avant le départ",
    `Il reste ${daysUntil} jour(s) avant le départ — votre checklist n'est pas complète.`
  );
}
```

### Trigger Logic — Game Reminder

```typescript
// Dans App.tsx, dans un useEffect dépendant de [currentDay, gameHistory, notifPrefs]
const today = new Date().toISOString().slice(0, 10);
const alreadyPlayedToday = gameHistory.some((e) => e.day === currentDay);
if (
  !alreadyPlayedToday &&
  notifPrefs.notif_game &&
  notifPrefs.lastGameReminderDate !== today
) {
  showNotification("Défi du jour", "Tu n'as pas encore joué aujourd'hui !");
  // Persister lastGameReminderDate pour éviter multi-notification
  saveNotifPrefs(profileId, { ...notifPrefs, lastGameReminderDate: today });
}
```

### Trigger Logic — Comment Notification

```typescript
// Dans App.tsx, dans un useEffect dépendant de [placeComments, profile.id, notifPrefs]
// Comparer placeComments avec la ref précédente (useRef)
// Pour chaque nouveau commentaire dont authorProfileId !== profile.id :
if (notifPrefs.notif_comments) {
  const placeName = PLACES_CONTENT.find((p) => p.id === comment.placeId)?.title ?? comment.placeId;
  showNotification(
    "Nouveau commentaire",
    `${comment.authorSurnameSnapshot} a commenté ${placeName}`
  );
}
```

### UX Guardrails

- Section "Notifications" dans SettingsScreen, visible pour tous les rôles.
- Afficher clairement si la permission OS est accordée / refusée / non encore demandée.
- Si la permission est refusée par l'OS, afficher un message explicatif ("Autorisez les notifications dans les paramètres de votre navigateur") et désactiver les toggles.
- Ne pas demander la permission au lancement : uniquement au premier toggle ON dans les Paramètres.
- Moment recommandé dans la page : après la section "Profil & paramètres", avant la section propriétaire.
- Labels des toggles :
  - "Rappel checklist (J-3 et J-1 avant le départ)"
  - "Rappel défi du jour"
  - "Commentaires de la famille sur les lieux"

### iOS / PWA Contrainte Connue

- iOS Safari < 16.4 : `Notification` API absente → `areNotificationsSupported()` retourne `false`, dégradation silencieuse.
- iOS Safari ≥ 16.4 : Support partiel, requiert d'avoir ajouté l'app à l'écran d'accueil (mode standalone) pour que les notifications fonctionnent.
- Cette story ne couvre PAS les push notifications via Service Worker + backend (hors périmètre). Toutes les notifications sont des `new Notification(...)` client-side, déclenchées quand l'app est ouverte.
- La validation manuelle sur Android Chrome et iOS Safari est requise avant de clore la story (cf. spec).

### Testing Requirements

- **Unit — `src/app/notifications.test.ts`** :
  - `areNotificationsSupported()` retourne false si `window.Notification` absent.
  - `requestPermission()` retourne "denied" si API absente.
  - `showNotification()` ne lance pas d'erreur si `Notification.permission !== "granted"`.
  - `readNotifPrefs()` retourne `DEFAULT_NOTIFICATION_PREFS` si absent de localStorage.
  - `saveNotifPrefs()` persist correctement, sans écraser les autres profils.
- **Unit — conditions de déclenchement** :
  - Checklist : rappel si daysUntil ∈ {3,1} ET pct < 100 ; pas de rappel si pct === 100.
  - Game : rappel si pas joué aujourd'hui ET lastGameReminderDate ≠ today ; pas de 2e rappel le même jour.
  - Commentaire : notification si auteur ≠ profil courant ET notif_comments activé.
- **Integration** :
  - Toggler "notif_comments" dans SettingsScreen et simuler un ajout de commentaire cloud → vérifier que `showNotification` est appelé (mock).
  - Refuser la permission → toggles désactivés, aucune notification.

### Library / Framework Requirements

- Stack inchangée : React + TypeScript + Vite.
- Notification API native — aucune librairie supplémentaire.
- Mocker `window.Notification` dans Vitest avec `vi.stubGlobal("Notification", ...)`.

### Latest Tech Information

- **Web Notification API (2025)** : `Notification.requestPermission()` retourne une `Promise<NotificationPermission>` ("granted" | "denied" | "default"). L'appel synchrone (callback) est déprécié.
- **iOS 16.4+ PWA** : `Notification` est disponible uniquement en mode standalone (`window.navigator.standalone === true`). Prévoir un message adapté si l'app n'est pas installée.
- **Vitest mock Notification** : utiliser `vi.stubGlobal("Notification", MockNotification)` avec une classe mock qui capture les instances créées.

## Story Status

Status: review

Notes: Context engine analysis completed — includes user's additional requirements (comment notifications + granular per-type preferences). iOS Safari constraints documented. All trigger logic and storage patterns specified.

## Dev Agent Record

### Implementation Plan

- Add a dedicated notification module with browser capability guards, permission handling, and per-profile local preference persistence.
- Wire notification preferences into app state by profile id, then extend Settings with granular toggles and permission status UX.
- Add local scheduling effects for checklist/game reminders and comment diff-based realtime notifications.
- Validate with unit tests for module behavior and integration tests for realtime notification and denied-permission UX.

### Debug Log

- RED phase confirmed: `notifications.test.ts` initially failed because `notifications.ts` did not exist.
- Implemented `notifications.ts` and helper trigger predicates; GREEN phase passed targeted notification unit tests.
- Added app integration and resolved ordering by moving reminder effects below derived values (`daysUntilStart`, `pct`, `currentDay`).
- Added notification integration tests; both realtime comment and denied-permission settings scenarios pass.
- Full suite executed successfully (`334 passed`, `49 skipped`).

### Completion Notes

- Implemented per-profile notification preferences using `jp-notification-prefs-by-profile` with safe read/write helpers and defaults.
- Added Notification settings section with OS permission status and three granular toggles (`checklist`, `game`, `comments`).
- First toggle activation now requests browser permission; denied permission fails silently without blocking app usage.
- Implemented checklist reminder trigger for J-3/J-1 with incomplete checklist only.
- Implemented game reminder trigger with duplicate prevention via `lastGameReminderDate`.
- Implemented realtime comment notifications by diffing `placeComments` snapshots and filtering out self-authored comments.

## File List

- src/app/notifications.ts
- src/app/notifications.test.ts
- src/app/App.tsx
- src/app/App.notifications.integration.test.tsx
- guidelines/_bmad-output/implementation-artifacts/sprint-status.yaml
- guidelines/_bmad-output/implementation-artifacts/22-1-rappels-notifications.md

## Change Log

- 2026-08-03: Implemented local notification foundation, per-profile preference storage, Settings toggles/permission UX, checklist/game/comment triggers, and related unit/integration tests. Story moved to review.
