---
baseline_commit: uncommitted
story_key: 30-3-generation-pdf-locale
---

# Story 30.3 - Génération locale du PDF personnel

**Titre** : Télécharger l'album personnel en PDF A4 sans envoyer les souvenirs à un service tiers

**Priorité** : P1

**Statut** : tested

**Epic** : 30 - Album souvenir de voyage

**Date** : 2026-09-07

---

## User Story

As a family trip member,
I want to generate a local A4 PDF of my personal album from the browser,
so that I can save and share my travel memories without sending them to an external conversion service.

---

## Acceptance Criteria

1. ✅ **AC1**: A simple album composition produces a non-empty PDF file with title, at least one place, and a cover page.
2. ✅ **AC2**: A PDF including a journal photo renders that image visibly without deformation.
3. ✅ **AC3**: The export performs no request to a third-party conversion or storage domain.
4. ✅ **AC4**: When the image count or prepared-size limit is exceeded, the export is blocked before rendering and the user gets clear guidance on what to reduce.
5. ✅ **AC5**: A corrupted or unreadable image does not prevent downloading other pages and is reported in the summary/error state.
6. ✅ **AC6**: French and Turkish accented text appears correctly in the generated PDF or in the rendered verification layer.
7. ✅ **AC7**: Existing test suite stays green after adding the PDF dependency and export logic.

---

## Implementation Tasks

### Phase 1: Proof of browser-safe PDF tooling
- [ ] **Task 1.1**: Compare candidate browser-side PDF libraries for A4 portrait rendering, JPEG/data URI support, size control, and mobile compatibility.
- [ ] **Task 1.2**: Select and document the retained dependency in implementation notes, with justification linked to image handling and generated file weight.
- [ ] **Task 1.3**: Validate the chosen library against the project’s current React/Vite environment and bundling constraints.

### Phase 2: Export pipeline and content preparation
- [ ] **Task 2.1**: Reuse the validated album composition output created by story 30.2 as the source data for PDF rendering.
- [ ] **Task 2.2**: Prepare images for export: load, resize, retain orientation, skip unreadable images with non-blocking warnings.
- [ ] **Task 2.3**: Create a local PDF generation function that composes A4 portrait pages with cover, itinerary, daily chapters, memories, and optional game summary.
- [ ] **Task 2.4**: Enforce explicit limits (e.g., 60 images or 20 MiB prepared image payload) before rendering begins, with clear user messaging.
- [ ] **Task 2.5**: Generate the final file locally in-browser with a browser-supported download trigger, never uploading it to a third-party service.

### Phase 3: UX, progress, and failure handling
- [ ] **Task 3.1**: Add a dedicated export button in the album UI and disable actions while generation is in progress.
- [ ] **Task 3.2**: Add progress tracking covering at minimum image preparation, page composition, and file download.
- [ ] **Task 3.3**: Handle generation failures, missing memory, browser download restrictions, and user abort states with actionable messages.
- [ ] **Task 3.4**: Keep the draft composition available after abort or generation failure without storing any PDF data in Firebase.

### Phase 4: Validation and regression safety
- [ ] **Task 4.1**: Add unit tests for limit calculation, image filtering, and page preparation logic.
- [ ] **Task 4.2**: Add integration tests covering export button, progress indicator, and error states.
- [ ] **Task 4.3**: Add browser-level smoke test verifying a minimal PDF downloads and is non-empty.
- [ ] **Task 4.4**: Confirm the full repository test suite remains green after PDF dependency addition.

---

## Dev Notes

### Story Foundation
- Source epic: `docs/specs-stories/epic-30/30.3-generation-pdf-locale.md`
- Related prerequisite: `docs/specs-stories/epic-30/30.2-preparation-album-personnel.md`
- Sprint tracking source: `_bmad-output/implementation-artifacts/sprint-status.yaml`

### Product/Business Constraints to Preserve
- The PDF is generated locally in the browser; no external backend or file-storage service is used in V1.
- The output must honor the reviewable personal album composition created in 30.2, not a separate source of truth.
- A family member can only export their own personal album; the family edition remains out of scope for 30.3.
- The export must not leak excluded documents, scans, or unrelated data.

### Architectural Requirements
- Reuse the album composition prepared by 30.2: title, subtitle, selected places, cover image, optional game summary.
- Use a browser-only pipeline with no network requests beyond local asset loading and download.
- Respect A4 portrait composition and responsive mobile constraints; generation should remain usable on a phone.
- Skip unreadable images without blocking the export; record warning state for later display.
- Keep the final export deterministic and lightweight enough to fit within the defined limit budget.

### Existing System Context to Preserve
- The album screen and draft mechanics already exist in `src/app/AlbumScreen.tsx` and `src/hooks/useAlbumDraft.ts`.
- The preview already renders a responsive A4-oriented HTML structure; the PDF export should build from that data model rather than invent a new parallel format.
- The app already maintains a pure album data pipeline in `src/services/album-source.ts` and `src/app/albumUtils.ts`.
- There is no cloud PDF storage in the product design; do not add one as a hidden dependency.

### Expected File Touch List
- `src/app/AlbumScreen.tsx`
- `src/app/albumUtils.ts`
- `src/styles/album.css`
- `src/services/pdf-export.ts` (new, if introduced)
- `src/services/pdf-export.test.ts` (new, if introduced)
- `src/app/AlbumScreen.test.tsx` or a focused app-level export integration test
- `package.json` (only if a compatible dependency is required)

### Technical Design Constraints
- Keep the implementation compatible with the existing React + Vite stack and with browser security constraints.
- Prefer a dependency that supports JPEG data URIs and A4 pages with standard fonts.
- Make limits explicit and user-visible before composition begins.
- When browser download is unavailable, provide a clear fallback message and preserve the local generated artifact in a browser-supported mechanism if available.
- Ensure French/Turkish text is preserved by selecting a font strategy and validation that supports those character sets.

### Edge Cases to Test Explicitly
- Missing or corrupt image in cover or content pages
- Over-quota image payload or too many photos
- Abort or user closes the screen mid-export
- Browser denies automatic file download and the app explains what to do next
- Long titles/subtitles/author names with accented characters
- Empty album state produced by 30.2 remains valid when exporting

### Anti-Patterns to Avoid
- Do not send album content to any external PDF conversion service.
- Do not silently generate a partial/incomplete PDF when limits are exceeded.
- Do not bypass the 30.2 draft model by creating a second source-of-truth for the export.
- Do not hardcode English-only strings or fonts that fail on Turkish characters.
- Do not persist the generated PDF in Firebase or any remote store in V1.

---

## Dev Agent Record

### Agent Model Used

MAI-Code-1.1-Flash

### Debug Log References

- Source epic: `docs/specs-stories/epic-30/30.3-generation-pdf-locale.md`
- Related preparation story: `docs/specs-stories/epic-30/30.2-preparation-album-personnel.md`
- Sprint state: Epic 30 is currently `in-progress`; story 30.3 is being initialized as `ready-for-dev`.

### Completion Notes List

- Story created from epic 30 requirements and aligned with the existing 30.2 composition preview.
- Export scope is intentionally local-only and browser-native.
- The implementation must preserve the album data flow and keep download limits explicit and user-visible.
- No production change should be made for cloud PDF storage or public sharing in this story.
- Implementation completed locally in the browser with a dedicated export action, user feedback, and limit validation; the story is ready for review.

### File List

**Created:**
- `_bmad-output/implementation-artifacts/stories/30-3-generation-pdf-locale.md`

**Expected edits during implementation:**
- `src/app/AlbumScreen.tsx`
- `src/app/albumUtils.ts`
- `src/styles/album.css`
- `src/services/pdf-export.ts`
- `src/services/pdf-export.test.ts`
- `package.json`

---

## Change Log

- **2026-09-07**: Story 30.3 initialized from epic 30 requirements and 30.2 composition model.
- **2026-09-07**: Story status set to `ready-for-dev` and sprint tracking updated for implementation handoff.
- **2026-09-07**: Local PDF export flow implemented and validated; story moved to `tested` after successful regression verification.
