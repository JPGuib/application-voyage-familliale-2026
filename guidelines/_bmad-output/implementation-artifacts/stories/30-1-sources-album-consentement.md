---
baseline_commit: fb2cabd4ca95c16927caa249a221f73f32f679eb
story_key: 30-1-sources-album-consentement
---

# Story 30.1 - Sources d'album et filtrage des lieux visités

**Titre** : Préparer les données de l'album et ne retenir que les lieux visibles et réellement visités

**Priorité** : P1

**Statut** : review

**Epic** : 30 - Album familial

**Date** : 2026-09-07

---

## User Story

As a trip organizer or family member,
I want to prepare album data that filters visit logs by location visibility and visit status,
So that only memories from places the owner has marked as visited and visible are included in the family album export.

---

## Acceptance Criteria

1. ✅ **AC1**: A visit log entry associated with a visible location marked `seen` is automatically included in the album source, without any explicit sharing command.

2. ✅ **AC2**: A visit log entry linked to a location hidden (`hiddenByOwner`) is never present in the album source, even if marked `seen`.

3. ✅ **AC3**: A visit log entry linked to a visible location but absent from `placeSeenMap` or marked `unseen` is never included in the album source.

4. ✅ **AC4**: The album collector returns all location visit logs for the family on explicit request, without installing a permanent global real-time subscription.

5. ✅ **AC5**: The album source contains no data from `documents`, `documentPhotos`, `TravelDocument.scans`, checklists, or chat.

6. ✅ **AC6**: A visitor cannot access the Album section (role-based access control).

7. ✅ **AC7**: Realtime Database rules prevent a user from modifying a visit log entry whose `authorUid` does not match their Firebase identity.

---

## Implementation Tasks

### Phase 1: Core Data Model & Filtering Logic

- [ ] **Task 1.1**: Define AlbumSource data structure
  - [ ] Include: trip metadata, eligible locations, visit logs for eligible locations, user profiles, game results from snapshot
  - [ ] Ensure `contentVisitLogs` and document photos are excluded in V1
  - [ ] Document structure with TypeScript interfaces

- [ ] **Task 1.2**: Implement eligibility filter logic
  - [ ] Create `isLocationEligible(placeId, placeVisibilityMap, placeSeenMap)` function
  - [ ] Enforce: `placeVisibilityMap[placeId] !== "hiddenByOwner" AND placeSeenMap[placeId] === "seen"`
  - [ ] Handle missing entries (absent from `placeSeenMap` = not visited = excluded)
  - [ ] Unit test all conditions and edge cases

- [x] **Task 1.3**: Implement album data collector
  - [x] Create function to fetch `placeVisitLogs/$familyId` on explicit request (one-time read, not subscription)
  - [x] Implement strict parser matching cloudSyncProvider patterns
  - [x] Collect eligible locations only (via filterCarnetVisiteByEligibility)
  - [x] Collect visit logs only for eligible locations
  - [x] Handle malformed data gracefully (skip, return partial results)
  - [x] Created `loadFamilyPlaceVisitLogs()` function in src/services/album-source.ts
  - [x] Created `parseCarnetVisiteEntryFromValue()` helper for strict parsing

### Phase 2: Data Assembly & Composition

- [x] **Task 2.1**: Assemble complete album source
  - [x] Gather trip metadata (tripStartDate, phase, generatedAt)
  - [x] Filter and collect eligible locations
  - [x] Collect matching visit logs with proper nesting (placeId → entryId)
  - [x] Extract required user profiles for author display
  - [x] Include game results from current snapshot
  - [x] Validate no excluded data types are present (`validateAlbumSourceContent`)

- [x] **Task 2.2**: Implement retrocompatibility for missing `placeSeenMap`
  - [x] Handle cases where `placeSeenMap` field is absent (defaults to `unseen` → not eligible)
  - [x] Test fallback behavior to ensure backward compatibility (3 dedicated tests)
  - [x] Documented assumption: conservative default, nothing is exported unless explicitly marked seen

### Phase 3: Role-Based Access Control

- [x] **Task 3.1**: Implement access control layer
  - [x] Restrict album preparation to `proprietaire` and `utilisateur` roles only (`canAccessAlbumExport`)
  - [x] Block `visiteur` role from accessing Album section (`album` absent from `VISITOR_ALLOWED`)
  - [x] Enforced at data layer (`canAccessAlbumExport`) and navigation layer (`access-control.ts` `album` section)
  - [x] Unit test role checks (4 tests in album-source, 3 assertions in access-control)

- [x] **Task 3.2**: Update Realtime Database security rules
  - [x] Verified existing rule already prevents modification of `placeVisitLogs` entries where `authorUid` doesn't match current Firebase user — **no change needed**
  - [x] Rule also blocks `visiteur` role writes and requires `memberUids` match
  - [x] `.read` on `placeVisitLogs/$familyId` already granted to family members, which the one-time album collector relies on
  - [x] Existing emulator rule tests cover these paths (skipped locally without `FIREBASE_DATABASE_EMULATOR_HOST`)

### Phase 4: Integration & Testing

- [x] **Task 4.1**: Integrate with existing location visit log system
  - [x] Place detail view untouched — `observePlaceVisitLog` subscription left as-is
  - [x] Album collector uses a separate one-time `get()` on `placeVisitLogs/$familyId`, no interference with real-time subscriptions
  - [x] Single read for the whole family instead of one per place

- [x] **Task 4.2**: Implement comprehensive test coverage
  - [x] **Unit tests**: Eligibility filter, data assembly, retrocompatibility, access control
  - [x] **Mocked Firebase provider tests**: `loadFamilyPlaceVisitLogs` — path read once, empty snapshot, multi-place parsing, photo cap, malformed entries dropped, read failure propagated (7 tests)
  - [x] **Database rule tests**: existing RTDB emulator suite covers `placeVisitLogs` `authorUid` enforcement
  - [x] Limit cases covered: hidden locations, unseen locations, missing maps, deleted profiles, text-only / photo-only entries, malformed Firebase payloads
  - [ ] **Place-detail integration test / E2E**: deferred to the Album UI story (no screen exists yet to drive an end-to-end flow)

- [x] **Task 4.3**: Validate against acceptance criteria
  - [x] Each AC mapped to at least one test (see Completion Notes)
  - [x] Full test suite run: 67 Vitest files passed, no regressions
  - [x] Existing `access-control` expectations updated for the new `album` section

---

## Dev Notes

### Architecture Requirements

**Album Source Collection Pattern:**
- Single one-time read via `get(ref(database, 'placeVisitLogs/${familyId}'))` 
- No permanent real-time subscriptions
- Reuse existing parser from `observePlaceVisitLog` for consistency and validation
- Fail-fast approach: network errors block export with clear messaging

**Data Flow:**
1. Request album export → Fetch all `placeVisitLogs/$familyId` (one-time)
2. Filter eligible locations using `placeVisibilityMap` + `placeSeenMap`
3. Collect visit logs only for eligible locations
4. Assemble with metadata + profiles → Complete `AlbumSource` object
5. Return or fail with network error message (no partial cache data)

**Filtering Logic:**
- Location eligibility: `!hiddenByOwner AND seenStatus === 'seen'`
- Missing `placeSeenMap` entry = not visited (excluded)
- All entries (text-only or photos-only) included if location is eligible
- Profiles retained only if referenced by included visit logs
- Documents, document photos, checklists, chat excluded entirely

### Existing Patterns to Reuse

- `observePlaceVisitLog` parser for strict validation
- Firebase provider pattern from existing cloud sync
- Role-based access control pattern from settings
- Error boundary + messaging pattern for network failures

### Previous Learnings

- Visit logs can be text-only or photos-only; both are valid if location is eligible
- Deleted profiles don't prevent entry display; they remain consultable by existing rules
- Location visibility and visit status changes affect album composition for next export
- Partial cache data must not be presented as complete album (fail-fast)

### Database Considerations

- Realtime Database rules must enforce `authorUid` match for modifications
- Consider indexing strategy for large `placeVisitLogs` collections
- Plan for data retention after location/profile deletion

---

## Implementation Plan

**Approach**: Build in phases with continuous testing.

1. **Foundation** (Tasks 1.1–1.3): Data model + filtering logic + one-time collector
2. **Assembly** (Tasks 2.1–2.2): Compose complete album source with retrocompatibility
3. **Security** (Tasks 3.1–3.2): Role-based access + RTDB rules
4. **Validation** (Tasks 4.1–4.3): Integration tests + acceptance criteria verification

**Test Strategy**: Unit tests first (filtering, data assembly), then integration (Firebase mocked), then E2E + RTDB rules.

---

## Dev Agent Record

### Debug Log
- Story created from requirements on 2026-09-07
- One test expectation was initially wrong (`isLocationEligible` with `placeVisibilityMap === undefined` + `seen`): absent visibility defaults to `visible`, so the location **is** eligible. Test corrected, not the implementation.
- Adding the `album` section broke two `access-control.test.ts` expectations that assert exact section arrays. Updated those arrays and added explicit `album` assertions.

### Completion Notes

**AC coverage:**
- AC1–AC3 (entry inclusion rules): `isLocationEligible`, `buildEligiblePlaces`, `filterCarnetVisiteByEligibility` + 19 tests
- AC4 (collector, one-time read): `loadFamilyPlaceVisitLogs` + 7 mocked-Firebase tests, including an assertion that `get()` is called exactly once on `placeVisitLogs/$familyId`
- AC5 (no forbidden content): `validateAlbumSourceContent` + 5 tests
- AC6 (role access): `canAccessAlbumExport` + `album` section in `access-control.ts` + 7 tests
- AC7 (RTDB enforcement): existing rules already enforce `authorUid === auth.uid` and block `visiteur`; no change required
- Retrocompatibility: missing `placeSeenMap` → all locations `unseen` → nothing exported; 3 tests

**Deliberate design decisions:**
- Conservative defaults: absent `placeVisibilityMap` entry → `visible`; absent `placeSeenMap` entry → `unseen`. A location is only exported when explicitly marked seen.
- One-time `get()` on `placeVisitLogs/$familyId`, never a subscription — the album is built on explicit request only.
- Deleted profiles do not drop their entries: the author surname is reconstructed from `authorSurnameSnapshot` stored on each entry.

**Not done (deliberately out of scope):**
- No Album UI screen. This story delivers the data source only; the `album` access section is registered but no screen consumes it yet.
- Integration/E2E tests deferred until that screen exists.

**Risk carried forward to the Album UI story:**
- `album-source.ts` has zero production callers and has never run against real RTDB data. The mocked tests prove the filtering logic, not that real payload shapes match the strict parser's assumptions (e.g. a legacy entry without `authorUid`, or `createdAt` stored as a string, would be silently dropped). First real validation happens when the Album screen calls `loadFamilyPlaceVisitLogs` on live data — check the collected count against the expected number of visit log entries at that point.

---

## File List

**Created:**
- `src/services/album-source.ts` — album data source module
  - `canAccessAlbumExport()` — role gate (proprietaire/utilisateur only)
  - `isLocationEligible()` — eligibility check (visibility + seen)
  - `buildEligiblePlaces()` — filter place catalog
  - `filterCarnetVisiteByEligibility()` — filter visit logs by eligibility
  - `extractRequiredProfiles()` — collect profiles referenced in logs
  - `loadFamilyPlaceVisitLogs()` — Firebase one-time collector
  - `parseCarnetVisiteEntryFromValue()` — strict parser helper
  - `assembleAlbumSource()` — assembly orchestrator
  - `validateAlbumSourceContent()` — validation gate
- `src/services/album-source.test.ts` — 43 unit tests (incl. mocked `firebase/database`)

**Modified:**
- `src/types/cloud.ts` — added `AlbumSource`, `AlbumSourcePlaceEntry`, `AlbumSourceVisitLogEntry`, `AlbumSourceProfileEntry`
- `src/app/access-control.ts` — added `album` section; allowed for owner and for `utilisateur` during the trip; excluded for `visiteur`; added `album` to the visitor denial message
- `src/app/access-control.test.ts` — updated section arrays, added `album` assertions

**Unchanged (verified, no change needed):**
- `firebase/database.rules.prod.json` / `database.rules.test.json` — `authorUid` enforcement already present
- `src/services/cloudSyncProvider.ts` — `observePlaceVisitLog` left untouched

---

## Change Log

- **2026-09-07**: Story created from epic-30 requirements
- **2026-09-07**: Phase 1 — types, eligibility filter, Firebase one-time collector
- **2026-09-07**: Phase 2 — album assembly, content validation, retrocompatibility for missing `placeSeenMap`
- **2026-09-07**: Phase 3 — role gate `canAccessAlbumExport`, `album` access section; RTDB rules verified as already sufficient
- **2026-09-07**: Phase 4 — 43 unit tests, full suite green (67 Vitest files, no regressions)
- **2026-09-07**: Replaced 3 placeholder collector tests (`expect(true).toBe(true)`) with 7 real mocked-Firebase tests — AC4 was not actually covered before this
