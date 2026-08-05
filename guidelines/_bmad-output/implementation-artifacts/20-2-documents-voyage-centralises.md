# Story 20.2: Centralized Travel Documents (Documents de voyage centralisés)

Status: review

## Story

As a family traveler (owner, user, or visitor),
I want a dedicated "Docs importants" screen listing flight info, accommodation, insurance, and misc reservations,
so that all critical travel documents are accessible in one place without searching through the Guide.

## Acceptance Criteria

1. A "Docs importants" button is accessible from the Dashboard (a dedicated button, not a quick-action tile).
2. The Vols category displays the three flight places already in `places.ts` (tag `"Vol"`) — name, `history`, and `anecdotes` — without any re-entry.
3. The Hébergement and Assurance/Santé categories exist in the screen (populated from `src/content/documents.ts`), even if their initial content is minimal.
4. The Réservations diverses category exists (from `src/content/documents.ts`), shown even if empty.
5. A category with no entries shows an explicit empty-state message; the category heading remains visible.
6. The screen works offline (no network request; all data is bundled content).
7. The screen is accessible to owner, user (before and after trip unlock), and visitor — no additional unlock gate.

## Tasks / Subtasks

- [x] Add `"documents"` to `AccessSection` and `AppScreen` unions and all allowed-sets in `src/app/access-control.ts` (AC: 7)
  - [x] Add `"documents"` to `AccessSection` type
  - [x] Add `"documents"` to `AppScreen` type
  - [x] Add `"documents"` to `OWNER_ALLOWED`, `USER_BEFORE_ALLOWED`, `USER_AFTER_ALLOWED`, `VISITOR_ALLOWED`
- [x] Create `src/content/documents.ts` with Hébergement, Assurance/Santé, Réservations diverses entries (AC: 3, 4)
  - [x] Define `TravelDocument` type (`{ id, category, title, content, details?: string[] }`)
  - [x] Add at least one placeholder entry per category so the file ships with real content
- [x] Create `DocumentsScreen` function component in `src/app/App.tsx` (AC: 2, 3, 4, 5)
  - [x] Filter `PLACES` by `tag === "Vol"` to populate the Vols category
  - [x] Read `DOCUMENTS` from `src/content/documents.ts` and group by category
  - [x] Render four category sections: Vols, Hébergement, Assurance/Santé, Réservations diverses
  - [x] Render each entry as a card (re-use card style from Guide/Place screen)
  - [x] Show explicit empty-state per category when no entries exist
  - [x] Include back button to Dashboard
- [x] Add `effectiveScreen === "documents"` rendering branch in App.tsx (AC: 1, 6)
- [x] Add Docs importants Dashboard button (AC: 1)
  - [x] Style consistent with Planning button (gradient bg, border, emoji, subtitle)
  - [x] Calls `onNavigate("documents")`
- [x] Add unit tests in `src/app/documents-screen.test.ts` (AC: 2, 3, 4, 5, 7)
  - [x] Vols populated from PLACES vol-tagged items with no re-entry
  - [x] Category with no documents shows empty state
  - [x] All role × phase combinations can access "documents" screen
- [x] Regression: update `ALL_SECTIONS` constant in `access-control.test.ts` and existing owner/user/visitor test expectations

## Developer Context Section

### Epic Context And Business Value

Epic 20 improves practical trip utility. Stories 20.1 (Planning) and 20.3 (Currency converter) are done. Story 20.2 was previously cancelled but is now being implemented. It closes the gap where flight reservation details, accommodation names and codes, and insurance cards are scattered or have no dedicated screen at all.

### Story Foundation (Source)

- Spec file: `docs/specs-stories/epic-20/20.2-documents-voyage-centralises.md`
- Vol data already exists in `src/content/places.ts` — three places with `tag: "Vol"` (see Existing Data below)
- New declarative content file `src/content/documents.ts` needed for all non-Vol categories
- UX constraint: reuse card/fiche visual style already used in the Guide for visual consistency

### Existing Data — Vol-Tagged Places

Three `PLACES` entries already carry all needed flight data:

| `id` | `name` | `jour` | `shortDesc` | `historyLabel` | `anecdotesLabel` |
|------|--------|--------|------------|----------------|-----------------|
| `"Nante-Paris"` | Nantes - Paris | [1] | Vol AF7507 - 19h45 → 20h55 | Détails du vol | Informations bagages |
| `"Paris-istanbul"` | Paris - Istanbul | [1] | Vol AF1390 - 22h55 → 03h30 | Détails du vol | Informations bagages |
| `"Istanbul-Nantes"` | Istanbul - Nantes | [10] | Vol TO3421 - 14h00 → 17h10 | Détails du vol | Informations bagages |

Each has `history` (flight number, airports, departure/arrival times, seat numbers, reservation code) and `anecdotes` array (baggage dimensions, weight limits). **Do not re-enter this data**; filter PLACES directly.

### Input Discovery Result

- No dedicated architecture shard for Epic 20
- Primary architectural references: story 20.1 file and live codebase
- `src/content/documents.ts` does not yet exist — must be created

---

## Technical Requirements

### Architecture compliance

- Follow the identical pattern used by `PlanningScreen` (added in story 20.1): a function component defined in `App.tsx`, mounted with a single `if (effectiveScreen === "documents")` branch.
- Navigation: `onBack` callback calls `goToScreen("dashboard")` — the same back-to-dashboard pattern used by Planning, Map, and all sub-screens.
- Access control: all role/phase authorization goes through `access-control.ts` only. Do not add ad-hoc checks inside `DocumentsScreen`.
- Offline: `PLACES` and `DOCUMENTS` are static content bundles — no fetch, no async loading needed.

### AppScreen and AccessSection changes — `src/app/access-control.ts`

**Step 1 — Add type entries** (both types must stay in sync):
```typescript
// AccessSection union — add after "settings":
| "documents"

// AppScreen union — add after "settings":
| "documents"
```

**Step 2 — Add to all four allowed sets**:
```typescript
// OWNER_ALLOWED — add "documents"
// USER_BEFORE_ALLOWED — add "documents" (accessible before trip unlock, like checklist)
// USER_AFTER_ALLOWED — add "documents"
// VISITOR_ALLOWED — add "documents"
```

`screenToSection` does not need a special case because `"documents"` screen maps to `"documents"` section by the identity fallback (`return screen`).

### Content file — `src/content/documents.ts`

Create this file. Define a literal type for document categories and a `TravelDocument` type:

```typescript
export type DocumentCategory =
  | "Hébergement"
  | "Assurance/Santé"
  | "Réservations diverses";

export type TravelDocument = {
  id: string;
  category: DocumentCategory;
  title: string;
  content: string;        // Markdown-formatted main text (mirrors `history` in places.ts)
  details?: string[];     // Bullet-point list (mirrors `anecdotes` in places.ts)
};

export const DOCUMENTS: TravelDocument[] = [
  // Hébergement entries here
  // Assurance/Santé entries here
  // Réservations diverses entries here
];
```

Populate with real travel data (hotel names, booking references, insurance card numbers, etc.) following the same markdown/field conventions used in `places.ts`. At minimum, one entry per category so the screen ships with real content, not just placeholders.

### DocumentsScreen component — inside `src/app/App.tsx`

Position it near `PlanningScreen` (around line 2554). Signature:

```typescript
function DocumentsScreen({
  onBack,
}: {
  onBack: () => void;
}) {
  // 1. Derive Vol entries directly from PLACES
  const volPlaces = PLACES.filter((p) => (p as { tag?: string }).tag === "Vol");

  // 2. Group DOCUMENTS by category
  const grouped = DOCUMENTS.reduce(
    (acc, doc) => {
      if (!acc[doc.category]) acc[doc.category] = [];
      acc[doc.category].push(doc);
      return acc;
    },
    {} as Record<DocumentCategory, TravelDocument[]>
  );

  // Render ...
}
```

**Category order**: Vols → Hébergement → Assurance/Santé → Réservations diverses.

**Entry card pattern** (mirrors Guide place cards):
- White/card background with rounded-2xl border
- Title in font-black, content as prose, details as bullet list
- `text-muted-foreground` for secondary info

**Empty state** (AC 5): show a `<p className="text-sm text-muted-foreground italic">Aucun document renseigné</p>` inside the category section when the list is empty, never hide the category heading.

**Header** (mirrors PlanningScreen header):
```tsx
<div className="relative bg-primary text-primary-foreground px-6 pt-12 pb-8 flex-shrink-0">
  <MemphisDecor />
  <button onClick={onBack} className="relative z-10 flex items-center gap-1 text-white/80 text-sm font-bold mb-3">
    <ChevronLeft size={18} /> Accueil
  </button>
  <h1 className="relative z-10 text-2xl font-black">Docs importants 📄</h1>
</div>
```

### Dashboard entry point — inside `DashboardScreen`

Add a button directly after the Planning button block (around line 2230), following the **exact same structural pattern**:

```tsx
{/* Docs importants button */}
<div className="px-4 mt-3">
  <button
    onClick={() => onNavigate("documents")}
    data-tutorial-id="dashboard-documents"
    className="w-full flex items-center justify-between px-4 py-3.5 rounded-2xl bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 active:scale-95 transition-transform"
  >
    <div className="flex items-center gap-3">
      <span className="text-2xl">📄</span>
      <div className="text-left">
        <p className="font-black text-sm text-foreground">Docs importants</p>
        <p className="text-xs text-muted-foreground">Vols, hébergement et réservations</p>
      </div>
    </div>
    <ChevronRight size={18} className="text-muted-foreground flex-shrink-0" />
  </button>
</div>
```

`DashboardScreen` already receives `onNavigate` typed as `(s: AppScreen) => void`; once `"documents"` is added to `AppScreen` (in `access-control.ts`) the TypeScript call is valid.

### Rendering branch — inside the main render logic of `App.tsx`

Immediately after the `planning` branch (around line 10278):

```typescript
if (effectiveScreen === "documents") {
  return (
    <DocumentsScreen
      onBack={() => goToScreen("dashboard")}
    />
  );
}
```

This branch must appear in **all three render paths** where `effectiveScreen` is evaluated (there are three `PlanningScreen` occurrences at lines 10258, 10601, 10927 — add the documents branch in each).

---

## File Structure Requirements

| File | Action | Notes |
|------|--------|-------|
| `src/app/access-control.ts` | UPDATE | Add `"documents"` to both type unions and all four allowed arrays |
| `src/app/access-control.test.ts` | UPDATE | Add `"documents"` to `ALL_SECTIONS` constant; fix any hardcoded `toEqual` arrays |
| `src/content/documents.ts` | NEW | `TravelDocument` type + `DOCUMENTS` array with real accommodation/insurance/reservation content |
| `src/app/App.tsx` | UPDATE | `DocumentsScreen` component + 3× rendering branch + Dashboard button |
| `src/app/documents-screen.test.ts` | NEW | Unit + access-control regression tests |

---

## Testing Requirements

### Unit tests — `src/app/documents-screen.test.ts`

```
describe("documents screen data helpers") {
  it("volPlaces: filters only tag=Vol from PLACES")
  it("volPlaces: contains the three expected flights (AF7507, AF1390, TO3421)")
  it("grouped documents: each non-vol category key exists even when empty")
}
```

### Access-control regression — same file or `access-control.test.ts`

```
describe("documents access policy") {
  it("owner can access 'documents' before and during trip")
  it("user can access 'documents' before trip unlock (USER_BEFORE_ALLOWED)")
  it("user can access 'documents' after trip unlock")
  it("visitor can access 'documents'")
  it("null role (not logged in) can access 'documents'")  // same as checklist
}
```

### Manual validation

- Test in airplane mode: documents screen loads with all content (no network).
- Verify Vols section shows 3 flight cards with reservation codes and baggage details.
- Verify empty-state message appears for any category with no entries.

---

## Reinvention Prevention Guardrails

- **Do not** create a second Place rendering system; reuse the existing card-visual vocabulary from the Guide.
- **Do not** re-enter flight data; always source from `PLACES.filter(tag === "Vol")`.
- **Do not** add ad-hoc role checks inside `DocumentsScreen`; all access control goes through `access-control.ts`.
- **Do not** add any network requests or async loading for documents; they are static content.
- **Do not** add `"documents"` to `QuickScreen` or `QUICK_ACTIONS` — the dedicated Dashboard button (like Planning) is the correct entry point, not a Quick Actions tile.
- **Do not** hardcode the category order in multiple places; use the declared category order in the render function.

---

## Previous Story Intelligence (20.1)

From story 20.1 (Planning complet):
- The `PlanningScreen` function component pattern is the exact template to follow: props `{ onBack, ...data }`, `PLACES.reduce(...)` for data derivation, header with `MemphisDecor`, content in a scrollable `div`.
- The Dashboard "Planning complet" button style (gradient, border, ChevronRight) is the reference for the Documents button.
- Three `PlanningScreen` render occurrences exist in App.tsx (lines ~10258, ~10601, ~10927); the Documents render branch must be added in all three.
- Recent commit pattern: keep changes minimal and localized in App.tsx routing blocks; ship tests in the same cycle.

---

## Latest Tech Information (2026-08-05)

No version migrations in scope. Implement within current pinned stack:
- React 18.3.1
- Vite 6.4.3
- Vitest 3.2.4
- Tailwind (existing config)
- TypeScript strict mode

---

## Project Context Reference

- Story spec: `docs/specs-stories/epic-20/20.2-documents-voyage-centralises.md`
- Vol data source: `src/content/places.ts` (3 entries with `tag: "Vol"`)
- Access control: `src/app/access-control.ts`
- Main orchestration: `src/app/App.tsx`
- Previous story (20.1): `guidelines/_bmad-output/implementation-artifacts/20-1-planning-complet-itineraire.md`

## Dev Agent Record

### Agent Model Used

GPT-5.3-Codex (GitHub Copilot)

### Debug Log References

- Story loaded from guidelines/_bmad-output/implementation-artifacts/20-2-documents-voyage-centralises.md
- Sprint status story key 20-2-documents-voyage-centralises was marked canceled before implementation and was moved to review at completion.
- Red phase verified: tests initially failed because documents modules were missing.
- Green phase: implementation completed with new content, helper, UI integration, and access-control updates.
- Targeted tests passing: src/app/documents-screen.test.ts + src/app/access-control.test.ts
- Full regression passing: 39 test files passed, 2 skipped (389 passed, 56 skipped)

### Implementation Plan

1. Add documents access surface in access-control unions and all role/phase allowed sets.
2. Create static bundled documents content file for non-flight categories.
3. Add documents helpers to enforce vol-source derivation and category grouping.
4. Implement DocumentsScreen in App.tsx with ordered categories and explicit empty states.
5. Add Dashboard dedicated button and documents routing branches.
6. Add story-specific unit tests and update regression expectations.
7. Run targeted tests then full suite for regression safety.

### Completion Notes

- Implemented dedicated Docs importants flow from Dashboard to Documents screen.
- Vols category is sourced from existing PLACES entries tagged Vol; no flight data re-entry added.
- Added static bundled documents content for Hébergement, Assurance/Santé, and Réservations diverses.
- Category headings always render; empty categories show explicit "Aucun document renseigné" state.
- Access policy now allows documents for owner, user before unlock, user after unlock, visitor, and null role.
- Implemented documents rendering in all current effectiveScreen render paths present in App.tsx.
- Full regression suite passed with no failures.

### File List

- src/app/access-control.ts
- src/app/access-control.test.ts
- src/content/documents.ts
- src/app/documents-screen.ts
- src/app/documents-screen.test.ts
- src/app/App.tsx
- guidelines/_bmad-output/implementation-artifacts/20-2-documents-voyage-centralises.md
- guidelines/_bmad-output/implementation-artifacts/sprint-status.yaml

### Change Log

- 2026-08-05: Implemented Story 20.2 Documents de voyage centralises (access control, dashboard entry, documents screen, bundled content, tests, and regression updates).
