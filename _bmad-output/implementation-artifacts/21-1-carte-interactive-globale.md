---
baseline_commit: 52d36e836a7a323b3e84a501cae29199e2b4dea9
---

# Story 21.1 — Carte Interactive Globale du Voyage

**Status:** review

**Story ID:** 21.1  
**Epic:** Epic 21 — Interactive Features & Enhancements  
**Priority:** P2  
**Date Created:** 2026-08-02

---

## 🎯 Overview

Add a new **Map screen** that displays all trip locations as interactive markers, filterable by day. Reuse existing geolocation logic and the place detail screen to avoid code duplication.

### Key Facts
- **Story Title:** Carte interactive globale du voyage
- **Business Value:** Provides visual navigation and contextual understanding of the trip geography
- **Affected Users:** All profiles, no unlock conditions
- **Technical Scope:** New screen component + map library integration + data filtering
- **No Regression Requirements:** Places without GPS coordinates must remain visible elsewhere (Guide screen unaffected)

---

## 📋 User Story & Acceptance Criteria

### User Story Statement
> **As a** traveler or family member exploring the trip  
> **I want** to see a visual map of all visited locations for each day or all days combined  
> **So that** I can understand the geographic layout, plan my visits better, and navigate to each place

### Acceptance Criteria (Testable)

1. ✅ **Map Screen Accessibility**
   - New "Map" screen accessible from Dashboard/bottom navigation menu
   - Screen displays by default with today's locations (computed via `computeCurrentDay()`)
   - Accessible to all profiles without unlock conditions

2. ✅ **Day Filtering**
   - Day selector dropdown/button at top of map screen
   - Options: current day (selected by default), all other days, "all days" toggle
   - Selecting a day updates markers immediately without page reload
   - "All days" view shows all places with coordinates from the entire trip

3. ✅ **Marker Display & Interaction**
   - One marker per place with GPS coordinates for the selected day(s)
   - Marker shows place name or icon on hover/tap
   - Clicking/tapping a marker opens the place detail screen (reuse existing `PlaceScreen`)
   - Details screen has a back button returning to the map with day selection preserved

4. ✅ **Handling Places Without Coordinates**
   - Places without GPS coordinates (empty `gps_*` fields) are **silently excluded** from map
   - No error messages or broken state when a day has no placeable locations
   - Guide screen and other screens show these places normally (no regression)

5. ✅ **Empty State Message**
   - When selected day has no places with coordinates, show explicit message:
     > "Aucun lieu avec coordonnées pour ce jour."  
     > "Consultez le guide pour voir tous les lieux de cette journée."
   - Include button to navigate to Guide screen for that day

6. ✅ **Offline Handling**
   - Map tile layer degrades gracefully when offline
   - Display message: *"Carte non disponible hors ligne"* (map tiles require network)
   - Markers and day selection UI remain interactive
   - User can still navigate to place details from markers (local data)

7. ✅ **No Blocking Issues**
   - Map never crashes app with broken coordinates or missing data
   - Always falls back to sensible defaults or empty state
   - Offline mode (story 6.1 MVP) supported; UI doesn't assume network always available

---

## 🏗️ Technical Requirements & Architecture Decisions

### Map Library Choice
- **Recommended:** Leaflet.js + OpenStreetMap (lightweight, PWA-compatible, no API key required)
- **Alternatives Considered:** Mapbox (overkill for MVP), Google Maps (requires API key, heavier)
- **Installation:** Add `leaflet` and `react-leaflet` to `package.json`
- **Styling:** Use default Leaflet CSS; custom Tailwind theming optional for future

### Data Flow & Coordinate Retrieval

#### Existing Infrastructure (Reuse Directly)
- **GPS Data Source:** `JOURS_DESTINATIONS` CSV → `jours-destinations.csv` columns:
  - `gps_matin` (morning)  
  - `gps_apresmidi` (afternoon)  
  - `gps_soir` (evening)  
  - Format: `"lat,lon"` (e.g., `"41.0082,28.9784"`)

- **Place-to-Day Relationship:** `PLACES` array has `jour?: number[]` property
  - Filters places for a given day: `PLACES.filter(p => p.jour?.includes(selectedDay))`
  - Fallback to `PLACES.filter(p => p.jour)` for "all days"

- **Current Day Computation:** `computeCurrentDay()` utility (already imported in App.tsx)
  - Drives default day selection on map load
  - Used consistently throughout the app (use same source of truth)

- **Coordinate Parsing:** `parseGpsString()` from `src/app/weather.ts`
  - Validates & converts GPS strings → `{ lat: number; lon: number }`
  - **Reuse directly; do NOT reinvent parsing**

### Component Architecture

#### MapScreen Component (New File)
```
src/app/MapScreen.tsx
├── MapContainer (Leaflet)
├── TileLayer (OpenStreetMap)
├── Day Selector (React state for selectedDay)
├── Marker Layer (dynamic, based on filtered places)
├── Empty State Message (if no places for day)
└── Offline Banner (if no tile layer available)
```

#### Screen Integration
- Add `"map"` to `Screen` type union in App.tsx
- Add button to Dashboard quick-actions or bottom navigation
- Route from Dashboard → MapScreen
- MapScreen → PlaceDetail (onClick marker) → back to MapScreen (preserves day selection)

#### State Management (Keep Simple)
- Store `selectedDay` in MapScreen component state
- Store `selectedPlaceIdFromMap` in parent (App.tsx) to route correctly
- Use same pattern as existing Guide/Place navigation

### File Structure Created
```
src/app/
├── MapScreen.tsx (new)
├── App.tsx (modified: add route, import MapScreen, add navigation button)
├── weather.ts (no changes; reuse parseGpsString)
```

---

## 🔌 Library Dependencies

### New Dependencies
```json
{
  "leaflet": "^1.9.4",
  "react-leaflet": "^4.2.3"
}
```

### CSS Import (MapScreen.tsx)
```typescript
import "leaflet/dist/leaflet.css";
```

### Type Definitions (Already Provided in leaflet)
- Leaflet includes TypeScript support by default
- `react-leaflet` provides typed React components

---

## 📐 Data Contract & Coordinates

### Expected Input (from CSV)
| Day | gps_matin | gps_apresmidi | gps_soir |
|-----|-----------|---------------|----------|
| 1   | "41.0082,28.9784" | "" | "" |
| 2   | "" | "37.7749,-122.4194" | "" |
| 3   | "" | "" | "48.8566,2.3522" |

### Processing Logic
1. Load `JOURS_DESTINATIONS` for selected day
2. Call `getScheduledCoordinates(dayEntry)` to get the active time slot's coordinates
3. For each place on that day, check if it has coordinates
4. Filter out places without coordinates
5. Render markers with place name, image, and onClick → PlaceDetail

### Fallback Behavior
- If `gps_*` fields all empty → place excluded from map
- If date before trip start → show "Jour 1" with trip start day coordinates
- If date after trip end → show last day with last day coordinates

---

## 🎨 UX & Design Patterns

### Screen Header (Leaflet Map)
- Reuse accent color from other screens (e.g., `bg-accent` like Guide screen)
- Title: "Carte interactive 🗺️"
- Subtitle: Current day or "Tous les jours"

### Day Selector
- Dropdown/select component (reuse existing UI patterns from Guide screen's day selector)
- Options: "Jour 1", "Jour 2", ..., "Tous les jours"
- Current day marked with badge "aujourd'hui"

### Markers
- Use default Leaflet pin markers (blue) or custom colors
- Hover shows place name (title)
- Click opens place detail screen

### Empty State
- Show centered card with message + guide link
- Keep day selector visible to encourage user to try another day

### Offline State
- Gray out tile layer, show banner: "Carte non disponible hors ligne"
- Markers remain clickable (local data)
- No error crash

---

## 📏 Implementation Guardrails (For Developer)

### Critical Checks Before Shipping
- [ ] Map loads without crashing if PLACES array is empty
- [ ] All places without GPS coordinates are silently filtered (no console errors)
- [ ] Day selector updates map markers immediately (no lag)
- [ ] Clicking a marker opens place detail **and preserves map day selection when returning**
- [ ] Offline mode: tiles don't load, but markers and navigation still work
- [ ] No new dependencies added beyond `leaflet` + `react-leaflet`
- [ ] Map screen accessible from bottom navigation and Dashboard
- [ ] All profiles can access (no ownership checks)

### Code Quality Standards (Existing App Patterns)
- Use existing Tailwind theme colors (primary, accent, muted-foreground)
- Follow App.tsx component structure (function-based, hooks)
- Reuse `renderFormattedText()` pattern from ContentDetailScreen for any place descriptions
- Keep component under 500 lines; break into sub-components if > 500 LOC
- Use TypeScript strict mode; avoid `any`
- Test with real Turkey trip data (10 days, varying coordinates per day)

### Performance Considerations
- Leaflet map is lightweight (~50KB gzipped)
- Marker count will be ~10-50 per day (acceptable)
- Day filtering is O(n) with n ≈ number of places total (negligible)
- Lazy-load Leaflet CSS only on MapScreen mount

---

## 🔄 Out of Scope (For Future Stories)

- Turn-by-turn navigation / GPS routing
- Itinerary visualization between places
- Multiple map layers (satellite, terrain, etc.)
- Place annotations or custom markers
- Clustering (only relevant if 100+ markers per day)
- Map export / screenshot
- Collaborative editing on map

---

## 🔍 Previous Story Intelligence

### Epic 21 Context
- Epic 21 focuses on interactive map and travel documentation features
- Story 21.1 is the **first story** in this epic (new capability)
- Story 21.2 (reviews/comments on places) will build on place infrastructure already in place

### Related Completed Stories (Guardrails)
- **Story 17.2** (géolocalisation météo): Established `getScheduledCoordinates()` and time-slot logic
  - Reuse **exactly** this approach for map markers
  - Avoid reimplementing coordinate selection logic
  
- **Story 4.4** (fiche lieu détaillée): Place detail screen (PlaceScreen component)
  - Reuse existing component; don't create new detail screen
  - Navigation: Map → click marker → PlaceScreen (existing) → back to Map
  
- **Story 6.1** (mode hors-ligne MVP): Offline handling patterns
  - Follow same degradation pattern (graceful fallback, no crashes)
  - Markers work offline, tiles don't load

### Git Commit Patterns (From Recent Work)
- Feature branches: `feature/21-1-carte-interactive`
- Commit messages: `feat(map): add interactive map screen` or `feat(ui): integrate Leaflet markers`
- Test files co-located: `MapScreen.test.ts` next to `MapScreen.tsx`

---

## 🧪 Testing Strategy

### Unit Tests (MapScreen.test.ts)
- Verify coordinate parsing and place filtering by day
- Test empty state rendering when day has no places
- Verify day selector state updates

### Integration Tests
- Navigate from Dashboard → Map screen
- Filter by different days
- Click marker → PlaceScreen → back to Map (state preservation)
- Navigate to Guide from empty state

### Manual Test Cases
1. **Desktop Browser:** Open map on all days of Turkey trip; verify markers appear correctly
2. **Mobile / Touch:** Tap markers; verify place detail opens; tap back; verify map state preserved
3. **Offline (DevTools):** Disable network; verify no tiles load but markers still show and are clickable
4. **Edge Cases:** Day with 0 places, place with invalid GPS format, before/after trip dates

---

## 🎯 Success Criteria (Demo Checklist)

- [ ] Map screen loads from Dashboard navigation
- [ ] Day filter dropdown works, updates markers instantly
- [ ] Clicking marker opens place detail screen
- [ ] Returning from place detail preserves selected day on map
- [ ] Empty day state shows friendly message + link to Guide
- [ ] Offline mode: tiles don't load, markers work
- [ ] No console errors for any test case
- [ ] Performance acceptable (<500ms load on 10-day trip)

---

## 📚 Reference & Documentation Links

- **Leaflet Docs:** https://leafletjs.com/reference.html
- **React Leaflet:** https://react-leaflet.js.org/
- **App Architecture:** See `src/app/App.tsx` (Screen routing, component patterns)
- **Coordinate Logic:** `src/app/weather.ts` (parseGpsString, getScheduledCoordinates)
- **Place Data:** `src/content/places.ts` and `src/content/trip.ts`
- **Day Data:** `src/content/trip.ts` (JOURS_DESTINATIONS, computeCurrentDay)
- **Styling:** Tailwind theming in default shadcn theme CSS

---

## 🚀 Deployment Notes

- New Leaflet CSS loaded only on MapScreen component (lazy import)
- No breaking changes to existing screens
- Backward compatible: places without coordinates work as before in Guide
- No new environment variables or secrets needed
- Offline mode (story 6.1) already handles network degradation; map follows same pattern

---

**Ready for Development!**  
This story provides all context needed for flawless implementation. The developer has:
- Clear business requirements & acceptance criteria
- Existing code patterns to follow (App.tsx routing, screen navigation)
- Specific data sources (PLACES, JOURS_DESTINATIONS, parseGpsString, getScheduledCoordinates)
- Library choice & setup instructions
- UX guardrails & edge cases
- Testing strategy & success checklist

No ambiguity, no reinventing wheels. 🎯

---

## 📋 Tasks/Subtasks

- [x] Install `leaflet@^1.9.4`, `react-leaflet@^4.2.1`, `@types/leaflet`
- [x] Create `src/app/MapScreen.tsx` with day selector, Leaflet map, markers, empty state, offline banner
- [x] Add "map" to `AppScreen` type in `access-control.ts`; map to "guide" section
- [x] Add "map" to `Screen` type, `SCREEN_VALUES`, `BOTTOM_NAV_ITEMS`, `QuickScreen`, `QUICK_ACTIONS` in `App.tsx`
- [x] Import `MapScreen` in `App.tsx`; add rendering branch in both `renderScreen()` paths
- [x] Write unit tests for `buildMarkers()` in `MapScreen.test.ts` (8 tests)
- [x] Run full test suite — 276 tests pass, 0 regressions
- [x] Verify production build completes successfully

---

## 🗂️ File List

- `src/app/MapScreen.tsx` — New interactive map screen component
- `src/app/MapScreen.test.ts` — Unit tests for buildMarkers logic
- `src/app/App.tsx` — Added "map" screen type, icon, routing, state, and navigation
- `src/app/access-control.ts` — Added "map" to AppScreen type; maps to "guide" section
- `package.json` — Added leaflet, react-leaflet, @types/leaflet dependencies

---

## 📝 Dev Agent Record

### Completion Notes

**Implementation Date:** 2026-08-02

**What was implemented:**
- New `MapScreen` component using Leaflet + OpenStreetMap tiles (no API key required)
- Day selector dropdown (today by default, all days option, per-day options with destination label)
- Markers derived from `JOURS_DESTINATIONS` GPS slots (matin/apresmidi/soir), deduplicated per day
- Marker popup shows day, destination, place count, and "Voir les lieux du guide" button
- Clicking marker → navigates to Guide screen with that day selected (via `onNavigateToGuide` prop)
- Empty state when no GPS data for selected day (with link to Guide)
- Offline banner using `navigator.onLine` listener
- Map accessible from bottom navigation (new "Carte" tab) and Dashboard quick actions
- All profiles can access the map screen (maps to "guide" section, no ownership restriction)

**Architectural decisions:**
- GPS data is at the day/time-slot level (JOURS_DESTINATIONS), not per individual place
- `buildMarkers()` exported for testability; deduplicates exact lat/lon pairs per day
- Marker click navigates to Guide (not PlaceScreen directly) because GPS-to-place mapping is 1-day:N-places
- Renamed lucide-react `Map` to `MapIcon` to avoid shadowing the built-in `Map` constructor

**Tests added:** 8 unit tests in `MapScreen.test.ts` — all pass

---

## 📅 Change Log

- **2026-08-02** — Story implemented and marked for review. New `MapScreen` component created, Leaflet integration added, access-control and App.tsx updated, 8 unit tests added. All 276 tests pass.
