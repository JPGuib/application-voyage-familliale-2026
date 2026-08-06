---
baseline_commit: HEAD
---

# Story 27.5: Offline lock for settings, game, and checklist + data-freshness indicator

Status: ready-for-dev

## Story

As a family app user (owner, traveler, or visitor),
I want the app to clearly block write actions in the settings screen, the daily game, and the checklist when I am offline, and to inform me how fresh the displayed state is,
so that I never accidentally get a sync conflict by modifying cloud-dependent state without connectivity.

## Acceptance Criteria

1. Offline: all modification actions in `SettingsScreen` (save buttons, password flows, code changes, lock/unlock, day-override, score resets, profile deletion, notification toggles) are visibly disabled with a tooltip/label "Nécessite une connexion".
2. Offline: read-only sections of `SettingsScreen` (role display, info labels, the current code display) remain readable and scrollable.
3. A discrete "Dernière synchronisation : [date/heure]" indicator is shown in `SettingsScreen` whenever the device is offline, sourced from `cloudSnapshot.profiles[profile.id]?.lastSyncAt` (Unix ms). Shown as "—" when no timestamp is available (first-time offline, or cloud disabled).
4. Returning online: all disabled actions in `SettingsScreen` re-enable automatically without any manual reload.
5. A form field in `SettingsScreen` that was being typed when the device went offline is **not** cleared — only the submit button becomes disabled until connectivity returns.
6. Offline: `GameScreen` is entirely blocked with an explicit "Jeu du jour non disponible hors ligne" message; all game-start/game-progression buttons are disabled. This applies to all roles that can access the game (owner and traveler; visitor cannot access game per existing access-control).
7. Offline: `ChecklistScreen` displays a prominent "Checklist non disponible hors ligne" message and all interactive elements (check/uncheck, add/remove items) are disabled. This applies to all roles that can access the checklist. Read-only display of existing checked state is acceptable.
8. Returning online from game or checklist: interactive elements re-enable automatically.
9. No regression on existing tests: `App.access-control.integration.test.tsx`, `App.place-visibility.integration.test.tsx`, `App.document-visibility.integration.test.tsx`, `App.game-lock.integration.test.tsx`.

## Tasks / Subtasks

- [ ] Add `isOnline` + `lastSyncAt` props to `SettingsScreen` and disable all write actions (AC: 1, 2, 3, 4, 5)
  - [ ] Add `isOnline: boolean` and `lastSyncAt: number | null` to `SettingsScreen` props type and destructuring
  - [ ] Compute `lastSyncAt` in App's main component: `cloudSnapshot?.profiles?.[profile.id]?.lastSyncAt ?? null`
  - [ ] Add an offline banner inside `SettingsScreen` (below the header, above the first card) when `!isOnline`, showing the last-sync timestamp
  - [ ] Add `disabled={!isOnline}` to all save/submit/action buttons in `SettingsScreen` (see list in Dev Notes)
  - [ ] Add a sub-label "Nécessite une connexion" next to each disabled button group (visible only when `!isOnline`)
  - [ ] Pass `isOnline={isOnline}` and `lastSyncAt={lastSyncAt}` at **both** `SettingsScreen` call sites in App.tsx (lines ~11321 and ~12071)
- [ ] Add `isOnline` prop to `GameScreen` and block offline (AC: 6, 8)
  - [ ] Add `isOnline: boolean` to `GameScreen` props type and destructuring
  - [ ] When `!isOnline`: render a full-screen overlay (same style as `OfflineBanner` but full-card, non-dismissible) with "Jeu du jour non disponible hors ligne — reconnectez-vous pour jouer"
  - [ ] All game action buttons disabled when `!isOnline` (`disabled={!isOnline}`)
  - [ ] Pass `isOnline={isOnline}` at both `GameScreen` call sites in App.tsx
- [ ] Add `isOnline` prop to `ChecklistScreen` and block offline (AC: 7, 8)
  - [ ] Add `isOnline: boolean` to `ChecklistScreen` props type and destructuring
  - [ ] When `!isOnline`: show a prominent banner at the top ("Checklist non disponible hors ligne") and set `disabled={!isOnline}` on all checkbox toggles and item management buttons
  - [ ] Pass `isOnline={isOnline}` at both `ChecklistScreen` call sites in App.tsx
- [ ] Write unit tests (AC: 1, 6, 7)
  - [ ] SettingsScreen: all write-action buttons render as disabled when `isOnline=false`
  - [ ] SettingsScreen: offline banner with last-sync label renders when `isOnline=false`
  - [ ] GameScreen: offline overlay renders and action buttons are disabled when `isOnline=false`
  - [ ] ChecklistScreen: offline banner renders and checkboxes are disabled when `isOnline=false`
- [ ] Write integration tests (AC: 4, 8, 9)
  - [ ] Toggle online→offline while SettingsScreen is open: write buttons become disabled, inputs retain their values (AC: 4, 5)
  - [ ] Toggle offline→online while SettingsScreen is open: write buttons become enabled again (AC: 4)
  - [ ] Toggle online→offline while GameScreen is open: overlay appears (AC: 8)
  - [ ] Toggle online→offline while ChecklistScreen is open: banner appears and checkboxes become disabled (AC: 8)
  - [ ] Non-regression: existing `App.game-lock.integration.test.tsx` suite passes unmodified

## Dev Notes

### Story Foundation

- Source spec: `docs/specs-stories/epic-27/27.5-verrouillage-reglages-hors-ligne.md`
- User-added requirement (conversation 2026-08-06): also disable "jeu du jour" and "checklist" offline for all user types that can normally access them.
- Epic 27 context: stories 27.1–27.4 already established the `isOnline` threading pattern and content-screen badges. This story extends the same pattern to settings, game, and checklist.

### Critical Pattern from Story 27.4 (Must Repeat)

**App.tsx renders most screens at TWO call sites** — an `if (effectiveScreen === ...)` chain AND a `switch (effectiveScreen)` chain. Missing one site was the real bug caught during 27.4. Verify **both** sites for `SettingsScreen`, `GameScreen`, and `ChecklistScreen` receive `isOnline`.

Search for the three function names in App.tsx to find all call sites before editing:
```
grep "SettingsScreen\|GameScreen\|ChecklistScreen" src/app/App.tsx
```

### `isOnline` Source of Truth

```tsx
// App.tsx — already defined, lines ~7428–7436
const [isOnline, setIsOnline] = useState(() =>
  typeof navigator === "undefined" ? true : navigator.onLine
);
// ... listeners already wired at lines ~9141–9148
```
Do NOT add a second connectivity hook. Thread the existing `isOnline` state as a prop, matching the 27.4 pattern for content screens.

### `lastSyncAt` Derivation

```tsx
// Derive in App main render or just before the SettingsScreen call sites:
const settingsLastSyncAt: number | null =
  cloudEnabled && cloudSnapshot
    ? (cloudSnapshot.profiles?.[profile.id]?.lastSyncAt ?? null)
    : null;
```
- `CloudProfileRecord.lastSyncAt` is a Unix ms timestamp (`number`), defined in `src/types/cloud.ts` line 81.
- Format for display: `new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(lastSyncAt))`
- When null or cloudDisabled: show "—".

### SettingsScreen — All Write Actions to Disable Offline

Add `disabled={!isOnline}` to the submit/action button of **each** of the following sections (confirmed by reading src/app/App.tsx lines 5860–7553):

| Section | Button label |
|---|---|
| Surnom | "Enregistrer le surnom" |
| Profil de préparation | Gender/household role buttons (the three/two toggle buttons) |
| Notifications | All three notification toggle buttons |
| Mot de passe du profil | "Définir le mot de passe", "Changer le mot de passe en session" flow + its confirm button |
| Récupération du mot de passe | "Définir la récupération" / "Mettre à jour la récupération" |
| Date de début du voyage (owner only) | "Enregistrer la date de début" |
| Code propriétaire (owner only) | "Définir / Mettre à jour le code", "Définir / Mettre à jour le code voyageur" |
| État de l'application (owner only) | "Bloquer / Débloquer l'application", "Rejouer le rituel de départ" |
| Journée de jeu (owner only) | "Forcer l'ouverture", "Forcer la fermeture", "Revenir à l'automatique" |
| Réinitialiser les scores (owner only) | "Réinitialiser tous les scores", "Réinitialiser ce jour" |
| Réinitialiser une partie (owner only) | "Réinitialiser" |
| Session | "Se déconnecter / Changer de profil" |
| Zone dangereuse | "Supprimer mon profil" |

**Tip**: also disable the confirm buttons inside the modal overlays (`showLockTogglePrompt`, `showDayOverridePrompt`, `showScoreResetPrompt`, `showGameProgressResetPrompt`, `showDeleteProfilePrompt`) — the overlay should still close via "Annuler".

Read-only elements that must **not** be disabled: the role badge display, the code display (eye/password field showing current code), the "Rôle" card, the notification status label, trip-day info display.

### SettingsScreen — Offline Banner UX

Reuse the existing `OfflineBanner` tone: dark pill, no alarm. Place it as the **first** item in the scrollable `div.flex-1.overflow-y-auto` area, conditional on `!isOnline`:
```tsx
{!isOnline && (
  <div className="rounded-2xl bg-[#1F2937] px-4 py-3 text-xs text-white font-semibold">
    <span className="font-black uppercase tracking-widest">Hors ligne</span>
    {" — "}
    Dernière synchronisation&nbsp;:&nbsp;
    {lastSyncAt
      ? new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short" }).format(new Date(lastSyncAt))
      : "—"}
    <p className="mt-1 text-white/70 text-[11px]">Les modifications de réglages nécessitent une connexion.</p>
  </div>
)}
```
The per-button "Nécessite une connexion" hint can be a small `{!isOnline && <span className="text-[10px] text-muted-foreground mt-1 block">Nécessite une connexion</span>}` beneath each disabled button. Keep it concise and non-alarming (family-friendly tone consistent with the rest of the app).

### GameScreen — Offline Block UX

`GameScreen` is a large screen (lines ~4705+). The offline block should be a **full-content overlay** rendered inside the screen's scrollable area when `!isOnline`:
```tsx
{!isOnline && (
  <div className="absolute inset-0 flex flex-col items-center justify-center bg-card/80 z-10 px-6 text-center">
    <span className="text-4xl mb-3">🎮</span>
    <p className="text-base font-black text-foreground">Jeu du jour non disponible hors ligne</p>
    <p className="text-sm text-muted-foreground mt-2">Reconnectez-vous pour jouer.</p>
  </div>
)}
```
Alternatively (simpler), keep the screen layout intact and just `disabled={!isOnline}` all action buttons (start quiz/riddle/challenge). Choose the overlay approach if the game shows questions mid-flow that make no sense to display offline; choose the disabled-buttons approach if read-only display is harmless. Prefer the overlay — game state is cloud-synced and showing a stale mid-game state offline is confusing.

### ChecklistScreen — Offline Block UX

`ChecklistScreen` (lines ~1719+) uses checkboxes and custom-item management. When offline:
- Show a banner at the top (inside the scrollable content area): "Checklist non disponible hors ligne — vos modifications seront possibles dès le retour de la connexion."
- All `<button>` and `<input type="checkbox">` elements inside the checklist grid: `disabled={!isOnline}`.
- Keep the items visible so the user can read their preparation list (no blank screen).

### Architecture Compliance

- Stack: React + TypeScript + Vite + Vitest. No new dependencies.
- Testing: Vitest + jsdom, matching existing integration test patterns in `src/app/App.*.integration.test.tsx`.
- The `isOnline` prop threading pattern is already established in 27.4 for 6 content screens. Follow the same prop-drill approach — do not introduce a context/store for connectivity.
- Do not modify `src/app/access-control.ts` — offline does not change role-based access, it adds an orthogonal connectivity guard.
- Do not introduce a `useOnlineStatus()` hook in child components — the single source of truth lives in App.tsx. This is an explicit constraint from story 27.4 dev notes ("Deduplicating the pre-existing `isOnline` detection … not touched").

### Regression Guardrails

- `App.access-control.integration.test.tsx` — visitor cannot access game/checklist per role; this story does not change that.
- `App.game-lock.integration.test.tsx` — game day locking by owner is a cloud write. The offline guard is additive (it means: you can't unlock/override the game day offline because SettingsScreen write actions are disabled too). Verify tests still pass.
- `App.place-visibility.integration.test.tsx` / `App.document-visibility.integration.test.tsx` — untouched by this story.
- Notification toggles in settings are **also** disabled offline (they fire cloud writes).

### File List (Expected Modifications)

| File | Change type |
|---|---|
| `src/app/App.tsx` | UPDATE — 3 prop additions + 2×3 call sites + disabled logic + banners |
| `src/app/App.settings-offline.test.tsx` (new) | NEW — unit + integration tests for settings offline behavior |
| `src/app/App.game-offline.test.tsx` (new) | NEW — unit + integration tests for game offline behavior |
| `src/app/App.checklist-offline.test.tsx` (new) | NEW — unit + integration tests for checklist offline behavior |

> Note: if the project collects all integration tests per feature directly in `App.tsx`-sibling files, the above test file split is natural. Check if there is a convention of one file per feature area vs. one large file — adapt accordingly.

### References

- `src/app/App.tsx` — SettingsScreen definition ~lines 5860–7553; GameScreen ~lines 4705+; ChecklistScreen ~lines 1719+
- `src/app/App.tsx` — isOnline state ~lines 7428–7436; listeners ~lines 9141–9148
- `src/app/App.tsx` — SettingsScreen call sites ~lines 11321 and ~12071; GameScreen and ChecklistScreen: search by component name
- `src/types/cloud.ts` — `CloudProfileRecord.lastSyncAt` at line 81 (Unix ms timestamp)
- `src/app/access-control.ts` — role-based screen access; visitor cannot access "game", "checklist", "results"
- `docs/specs-stories/epic-27/27.4-lecture-offline-coherente-contenu-visibilite.md` — previous story dev notes, dual-call-site bug history
- `docs/specs-stories/epic-27/27.2-telechargement-cache-offline.md` — "Offline support for game, checklist, tutorial, or settings" is explicitly out of scope of that story → this story 27.5 is the designated place to close those gaps

## Dev Agent Record

### Agent Model Used

GitHub Copilot (Claude Sonnet 4.6) — 2026-08-06

### Debug Log References

_None yet._

### Completion Notes List

_None yet._

### File List

_To be filled by dev agent after implementation._
