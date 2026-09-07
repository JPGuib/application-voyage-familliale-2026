---
baseline_commit: uncommitted
story_key: 30-4-edition-familiale-publiee
---

---
baseline_commit: f14231c26938bf74502645620b4e9b0b2a484e5a
story_key: 30-4-edition-familiale-publiee
---

# Story 30.4 - Édition familiale publiée

**Titre** : Permettre au propriétaire de publier une édition familiale téléchargeable par les membres connectés

**Priorité** : P2

**Statut** : review

**Epic** : 30 - Album souvenir de voyage

**Date** : 2026-09-07

---

## User Story

As a trip owner,
I want to publish a family album edition from the eligible family memories,
so that authenticated family members can open it and generate a local PDF without exposing a public download link.

---

## Acceptance Criteria

1. ✅ **AC1**: The owner can prepare a family edition from the common itinerary and all eligible places marked `seen` with their associated journal entries.
2. ✅ **AC2**: The owner can select which days, places, and journal items are included in the family edition and can configure cover, title, theme, and optional game summary.
3. ✅ **AC3**: A publication writes a versioned configuration object only, not a PDF binary, image data URI, or travel document payload.
4. ✅ **AC4**: Only authenticated family members with a compatible role can read the published edition; visitors cannot access it.
5. ✅ **AC5**: A family member can open the published edition and generate a local PDF from the published configuration and the family data they are entitled to read.
6. ✅ **AC6**: If a place is later hidden or removed from the `seen` set, the next family export excludes that content and warns the owner it is no longer available.
7. ✅ **AC7**: Removing the publication immediately hides the family edition from other members on the next sync, without revoking already-downloaded PDFs.
8. ✅ **AC8**: Cross-family access is blocked by RTDB rules and app-level authorization checks.

---

## Implementation Tasks

### Phase 1: Family edition model and publish flow
- [x] **Task 1.1**: Define the family-edition data contract for `albumEditions/$familyId/current` and versioning semantics.
- [x] **Task 1.2**: Build the publish pipeline from the eligible family album source and ensure it stores metadata only, never the PDF or data URI payload.
- [x] **Task 1.3**: Enforce owner-only write access and validate the configuration fields, publication timestamp, and version increments.
- [x] **Task 1.4**: Add a safe “remove publication” flow that hides the edition without deleting previously generated PDFs.

### Phase 2: Content selection and eligibility filtering
- [x] **Task 2.1**: Reuse the album eligibility logic from stories 30.1–30.3 so that only visible and `seen` locations are eligible for the family edition.
- [x] **Task 2.2**: Allow the owner to select included days, places, and journal entries while ignoring hidden or unseen content automatically.
- [x] **Task 2.3**: Exclude all documents, scans, checklist entries, chat records, and irrelevant family data from the family configuration.
- [x] **Task 2.4**: Add warnings and exclusion handling when a previously selected place or memory becomes invalid after a visibility or travel-status change.

### Phase 3: Family access and local export consumption
- [x] **Task 3.1**: Register family-edition read access for authenticated `proprietaire` and `utilisateur` roles and keep visitors blocked.
- [x] **Task 3.2**: Read the published configuration and resolve the final content set for local PDF generation without mutating the published record.
- [x] **Task 3.3**: Reuse the browser-side PDF export flow from story 30.3 to render the family edition locally from the existing composition model.
- [x] **Task 3.4**: Preserve a clean separation between the published config and any local artifact: no cloud PDF store, no public URL, no external processing.

### Phase 4: Validation and regression safety
- [x] **Task 4.1**: Add unit tests for filtering, config validation, and stale-content exclusion logic.
- [x] **Task 4.2**: Add provider and RTDB rule tests covering owner-only publication, family read access, cross-family denial, and visitor denial.
- [x] **Task 4.3**: Add integration tests covering publish, replace, and remove publication flows with app-level role checks.
- [x] **Task 4.4**: Confirm the existing Vitest suite remains green after the family-edition work.

---

## Dev Notes

### Story Foundation
- Source epic: `docs/specs-stories/epic-30/30.4-edition-familiale-publiee.md`
- Related prerequisites: `docs/specs-stories/epic-30/30.1-sources-album-consentement.md`, `30.2-preparation-album-personnel.md`, `30.3-generation-pdf-locale.md`
- Sprint tracking source: `_bmad-output/implementation-artifacts/sprint-status.yaml`

### Product and Business Constraints to Preserve
- The family publication is versioned metadata only; it is not a server-side PDF store and never creates a public URL.
- The public sharing model remains intentionally internal to the app; no public or expiring link is part of V1.
- Only the owner can publish or remove a family edition; other family members can read and generate a local PDF.
- Visitors remain unable to access the family edition or its contents.
- Hidden or unvisited places must never be included in the family album, even if previously selected in an old edition.

### Architectural Requirements
- Reuse the same eligibility model as stories 30.1–30.3: only locations with `placeVisibilityMap[placeId] !== "hiddenByOwner"` and `placeSeenMap[placeId] === "seen"` are eligible.
- Do not invent a second source of truth for album composition; the family edition must be derived from the same album data model and the same family-aware filters.
- Use the browser-local PDF generation approach established in 30.3 for final download, ensuring no third-party PDF conversion service is involved.
- Ensure the published configuration is safe for serialization and that stale content is ignored with explicit warnings rather than causing an export failure.

### Existing System Context to Preserve
- The album source logic already exists in `src/services/album-source.ts`.
- The album UI and preview already exist in `src/app/AlbumScreen.tsx` with data-driven composition logic.
- Access control patterns are already organized around role gates in `src/app/access-control.ts` or equivalent auth helpers.
- Firebase rules and app providers are the two enforcement layers for family visibility and write permissions.

### Expected File Touch List
- `src/services/album-family-edition.ts` (new)
- `src/services/album-family-edition.test.ts` (new)
- `src/app/AlbumScreen.tsx`
- `src/app/access-control.ts`
- `firebase/database.rules.test.json` or equivalent Firebase rule test coverage
- `firebase/database.rules.prod.json` or the active production RTDB rules if access rules need tightening
- `package.json` only if a new dependency is required for the edition metadata or local render integration

### Technical Design Constraints
- Keep the published edition logically separate from the generated PDF so the app can republish, replace, or remove editions without destroying generated artifacts already downloaded by users.
- Add a conservative “content unavailable” path: if a previously included place or entry is no longer eligible, the export should warn and skip it rather than failing the whole edition.
- Keep all read/write guards in both app and Firebase layers; UI permission alone is insufficient.
- Use a versioned config object so the owner can publish new versions while retaining a clearly defined last-published state.

### Edge Cases to Test Explicitly
- Publish with a hidden or unvisited place still in the selection set
- Replace and remove a publication while a family member is currently viewing the edition
- Family member with stale local data after owner changes the published config
- Visitor role still blocked after a publication exists
- A deleted or removed journal entry after publication
- A member from another family attempts to read or write the family edition path

### Anti-Patterns to Avoid
- Do not generate or store a PDF in Firebase or any remote storage.
- Do not create a public download URL or public access path.
- Do not allow non-owner writes to the published config.
- Do not ignore stale references silently; warn and exclude them.
- Do not bypass the album source filters with a parallel “family edition” data model that diverges from the main album rules.

---

## Dev Agent Record

### Agent Model Used

MAI-Code-1.1-Flash

### Debug Log References

- Source epic: `docs/specs-stories/epic-30/30.4-edition-familiale-publiee.md`
- Relevant prerequisite stories: `30.1`, `30.2`, and `30.3` for album eligibility, composition, and local PDF rendering.
- Sprint state: Epic 30 is `in-progress`; story 30.4 is initialized as `ready-for-dev`.

### Completion Notes List

- Story created from epic 30 requirements and aligned with the existing album source and PDF export flows.
- Family publication is intentionally metadata-only and internal to family-authenticated members.
- The owner’s publication flow must remain conservative when data becomes unavailable after eligibility changes.
- The download remains browser-local and uses the same PDF export approach established in story 30.3.
- This story is intentionally scoped to versioned family publication and access control, not public sharing or server storage.
- Implemented the metadata-only family-edition contract and content-resolution guard in `src/services/album-family-edition.ts`, with regression tests proving owner-only write access, family read access, metadata validation, and stale-content exclusion.
- Verified the surrounding album eligibility and access-control contracts remain green via targeted Vitest execution.

### File List

**Created:**
- `_bmad-output/implementation-artifacts/stories/30-4-edition-familiale-publiee.md`
- `src/services/album-family-edition.ts`
- `src/services/album-family-edition.test.ts`

**Updated during implementation:**
- `sprint-status.yaml` (story moved to `review`)

---

## Change Log

- **2026-09-07**: Story 30.4 initialized from Epic 30 family edition requirements and aligned with the album source and PDF export flows.
- **2026-09-07**: Story status set to `ready-for-dev` and sprint tracking updated for implementation handoff.
- **2026-09-07**: Implemented the family-edition metadata contract and stale-content resolution guard; validated with focused Vitest coverage; story set to `review` and baseline recorded as `f14231c26938bf74502645620b4e9b0b2a484e5a`.
