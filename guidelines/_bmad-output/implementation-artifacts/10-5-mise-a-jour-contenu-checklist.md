---
baseline_commit: fc5ef45
story_id: "10.5"
story_key: "10-5-mise-a-jour-contenu-checklist"
epic: "10"
generated_at: "2026-07-17"
---

# Story 10.5: Checklist content enrichment by gender and role

Status: review
Epic: 10 - Advanced profile management and checklist personalization
Story Key: 10-5-mise-a-jour-contenu-checklist
Date: 2026-07-17

## Story
As a family app user,
I want richer and better-targeted checklist content,
so that each profile sees useful preparation items aligned with gender, household role, and owner-only responsibilities.

## Business Value
- Increases practical usefulness of checklist feature introduced and filtered in stories 10.3 and 10.4.
- Improves perceived personalization quality without changing security model.
- Reduces noise for non-owner users while preserving owner-level full visibility.

## Acceptance Criteria (BDD)
1. Source content structure
   Given the source packing list document is updated
   When content is curated for implementation
   Then each item has explicit targeting metadata for gender and household role where needed
   And owner-only responsibilities are explicitly marked.

2. Minimum content volume
   Given checklist enrichment is complete
   When counting all checklist items shown in source and app content
   Then at least 50 items are present.

3. Balanced category coverage
   Given checklist categories are reviewed
   When validating content distribution
   Then key domains remain covered (documents, clothing, hygiene/health, electronics, transport, luggage)
   And no category regresses into unusable sparse content.

4. Role coverage
   Given targeting metadata is applied
   When reviewing item visibility by role
   Then each major role audience has enough relevant content
   And owner-only items are clearly identified.

5. Gender targeting quality
   Given items are gender-targeted where relevant
   When filtering by profile metadata
   Then male/female distinctions are intentional and explicit
   And neutral/unisex items remain visible to all.

6. Source/app synchronization
   Given curation and implementation are finalized
   When comparing source list and TypeScript checklist definitions
   Then the two remain synchronized for item intent and targeting.

7. UI filtering validation
   Given Story 10.4 filtering pipeline is active
   When running targeted profile combinations
   Then enriched content is displayed correctly with no empty-category rendering regressions.

## Scope
### In scope
- Curate checklist content from docs/liste a prendre.docx.
- Update checklist item labels and metadata in application content.
- Add/adjust role/gender/owner targeting tags on items.
- Validate filtered rendering against profile combinations.
- Update tests if existing assertions depend on checklist labels/counts.

### Out of scope
- New authentication or owner governance behavior.
- New checklist filtering algorithm (already delivered in 10.4).
- New checklist category taxonomy unless required to preserve usability.
- Security rule changes.

## Developer Guardrails

### Technical Requirements
- Reuse existing filtering model from src/app/checklist-filter.ts:
  - genderTargets: all | male | female
  - householdRoleTargets: all | parent | child
  - ownerOnly: boolean
- Do not introduce parallel filtering logic in new files.
- Keep filtering pure and deterministic; this story is primarily content/data shaping.
- Keep item IDs stable when possible to preserve checked-state continuity.
  - If an ID must change, document migration impact and update tests accordingly.

### Architecture Compliance
- Preserve cloud/local contracts from ADR 11.3 and ADR 11.6:
  - phase remains family-wide contract boundary
  - checklist state remains profile-scoped
- This story must not alter push/hydration contracts or ownership boundaries.
- Maintain owner override behavior: owner sees all items regardless of tags.

### Library/Framework Requirements
- No new dependencies are required.
- Keep React/Vite/Vitest/Firebase stack unchanged.
- Keep current checklist rendering path in src/app/App.tsx.

### File Structure Requirements
- UPDATE src/app/App.tsx
  - Current state:
    - CHECKLIST_CATEGORIES is defined inline and already tagged for part of content.
    - Checklist render uses visibleCategories computed via filterCategoriesForProfile.
  - Story changes:
    - Enrich item content and targeting metadata in CHECKLIST_CATEGORIES.
    - Preserve category IDs and existing rendering contract.
  - Must preserve:
    - progress counters based on visible item IDs
    - category hiding when empty
    - unlock/deblockage flows and access-control behavior.

- REVIEW / OPTIONAL UPDATE src/app/checklist-filter.test.ts
  - Update only if existing assertions depend on exact labels/counts changed by new content.
  - Keep AC8 matrix behavior validated (owner, parent male/female, teen/child mapping to child).

- REFERENCE SOURCE docs/liste a prendre.docx
  - Treat as source-of-content artifact.
  - Ensure TypeScript content mirrors intended item targeting after curation.

- NOTE src/content/places.ts
  - Story 10.5 backlog text mentions this file, but current runtime checklist content is in src/app/App.tsx.
  - Do not move checklist data to places.ts in this story.

## Current State (Files Read)
- src/app/App.tsx
  - Checklist categories and item metadata live inline.
  - Existing gender-targeted segments already exist for men/women clothing.
  - Optional women-targeted examples already present (pareo, evening handbag).
- src/app/checklist-filter.ts
  - Filtering and badge logic is centralized and reusable.
- src/content/places.ts
  - Travel places content only; not used by checklist pipeline.
- docs/liste a prendre.docx
  - Source file exists for content curation (binary doc source).

## What This Story Changes
- Increase and refine checklist item corpus and targeting metadata.
- Ensure content quality and practical coverage across profile audiences.
- Keep Story 10.4 filtering behavior while improving relevance of visible items.

## What Must Be Preserved
- Story 10.4 filtering invariants and badge vocabulary.
- Profile-scoped checklist checked-state persistence.
- Access-control and owner governance flows from 10.1/10.2/10.3/10.4.
- Existing cloud synchronization behavior and queue semantics.

## Tasks / Subtasks
- [x] Task 1 - Curate source content (AC: 1, 2, 3, 4, 5, 6)
  - [x] Review docs/liste a prendre.docx and normalize item wording for app UI.
  - [x] Build explicit targeting mapping per item (gender, household role, ownerOnly).
  - [x] Validate minimum quantity and balanced coverage before coding.

- [x] Task 2 - Apply enriched content in checklist data source (AC: 1, 2, 3, 4, 5, 6)
  - [x] Update CHECKLIST_CATEGORIES in src/app/App.tsx.
  - [x] Prefer additive updates; keep stable IDs for unchanged semantics.
  - [x] For changed semantics, create new IDs deliberately and document rationale.

- [x] Task 3 - Validate UI filtering behavior with enriched content (AC: 5, 7)
  - [x] Run profile matrix checks for owner, parent male, parent female, teen, child.
  - [x] Verify no empty-category regressions and consistent badges.
  - [x] Verify checklist totals/progress remain coherent for each filtered view.

- [x] Task 4 - Update and run tests (AC: 7)
  - [x] Update checklist-filter unit tests only where label/count assumptions changed.
  - [x] Keep coverage for owner override and role/gender intersections.
  - [x] Run targeted regression suite.

## Testing Requirements
- Minimum targeted run:
  - npm run test -- src/app/checklist-filter.test.ts src/app/App.access-control.integration.test.tsx src/app/App.login-flow.integration.test.tsx
- If checklist content refactor touches cloud payload assumptions indirectly, also run:
  - npm run test -- src/services/cloudSyncProvider.test.ts src/hooks/useCloudSync.test.ts
- Manual QA matrix (minimum):
  - owner profile
  - parent male profile
  - parent female profile
  - teen profile
  - child profile
- For each profile, verify:
  - visible categories/items relevance
  - badge clarity
  - progress counters based on visible items only
  - hidden items do not imply state deletion.

## Previous Story Intelligence (10.4)
From guidelines/_bmad-output/implementation-artifacts/10-4-adaptation-checklist-par-profil.md:
- Filtering engine and metadata model are already implemented and tested.
- Cloud metadata persistence for gender/householdRole was fixed; do not regress it.
- Badge wording normalization and owner-only wording were corrected in CRs.
- Checklist content is inline in App.tsx; old references to screen-specific files are outdated.

Implication for 10.5:
- This is a content-and-tagging hardening story, not a new filtering-engine story.
- Build on existing utilities and tests; avoid architectural changes.

## Git Intelligence Summary
Recent commit pattern (latest 5):
- fc5ef45 EPIC 10 CR 4
- d54f950 EPIC 10 CR 3
- eb0b125 EPIC 10.4 CR 2
- d87d487 EPIC 10.4 CR
- 68e9ff1 EPIC 10.4 DONE

Observed implementation pattern to preserve:
- Checklist updates concentrated in src/app/App.tsx + src/app/checklist-filter.ts/tests.
- Regression fixes quickly applied through focused CR commits.
- Story delivery includes sprint-status updates and explicit test coverage.

## Latest Tech Information (Web Research)
- React guidance: preserve component state by keeping stable tree positions; avoid structural changes that unintentionally reset checklist UI state.
- Firebase RTDB guidance:
  - use update() for multi-path partial writes when needed,
  - prefer listeners scoped to minimal path,
  - remember web offline persistence is session-bound (tab close can lose unsynced writes).
- Consequence for 10.5:
  - keep this story data/content focused,
  - avoid touching hydration/push architecture unless strictly necessary.

## Risks and Guardrails
- Risk: over-aggressive item ID renaming resets checked history.
  - Guardrail: keep IDs stable for semantic-equivalent items.
- Risk: biased or uneven targeting leaves some profiles with poor coverage.
  - Guardrail: validate profile matrix and coverage counts before merge.
- Risk: category-level badge noise from over-tagging.
  - Guardrail: tag only where targeting intent is explicit.
- Risk: drift between Word source and TS data.
  - Guardrail: include a final sync checklist in PR description.

## Source References
- BACKLOG.md (Story 10.5 section)
- guidelines/_bmad-output/implementation-artifacts/sprint-status.yaml
- guidelines/_bmad-output/implementation-artifacts/10-4-adaptation-checklist-par-profil.md
- guidelines/_bmad-output/planning-artifacts/adr-11-3-source-of-truth-cloud-local.md
- guidelines/_bmad-output/planning-artifacts/adr-11-6-deblocage-famille-wide-contract.md
- src/app/App.tsx
- src/app/checklist-filter.ts
- src/content/places.ts
- docs/liste a prendre.docx

## Project Context Reference
- Persistent fact glob file:{project-root}/**/project-context.md resolved with no matching file.
- Story context is built from backlog, existing implementation stories, source code, ADRs, and git history.

## Completion Status
- Story context generation completed with exhaustive artifact scan, architecture constraints, previous-story intelligence, git pattern review, and latest web guidance.
- Status set to ready-for-dev.
- Completion note: Ultimate context engine analysis completed - comprehensive developer guide created.

## Dev Agent Record

### Agent Model Used
GPT-5.3-Codex

### Debug Log References
- Workflow resolved via _bmad/scripts/resolve_customization.py (workflow key).
- Sprint status loaded and story key resolved from explicit user input 10.5.
- Discovery protocol executed on available planning artifacts and source code.
- Source curation extracted from docs/liste à prendre.docx via Python zip/xml read.
- RED phase: npm run test -- src/app/checklist-content.test.ts (failed on owner/role targeting gates).
- GREEN phase: npm run test -- src/app/checklist-content.test.ts (passed after metadata enrichment).
- Regression suites: npm run test -- src/app/checklist-filter.test.ts src/app/App.access-control.integration.test.tsx src/app/App.login-flow.integration.test.tsx; npm test.

### Implementation Plan
- Keep checklist taxonomy and item IDs stable while enriching targeting metadata.
- Mark coordinator responsibilities as ownerOnly + parent-targeted where intent is explicit.
- Add householdRoleTargets across parent/child audiences to improve profile relevance.
- Add content-level validation tests to enforce AC thresholds (volume, coverage, profile visibility matrix).

### Completion Notes List
- Story selected explicitly: 10.5
- Curated and synchronized checklist source from docs/liste à prendre.docx with in-app data.
- Enriched targeting metadata with explicit ownerOnly, parent, child, and gender tags while preserving IDs.
- Added acceptance-oriented content regression test: src/app/checklist-content.test.ts.
- Full regression suite passed: 133 tests green, 3 firebase-emulator tests skipped by environment.
- Story status moved to review and sprint tracking updated accordingly.

### File List
- guidelines/_bmad-output/implementation-artifacts/10-5-mise-a-jour-contenu-checklist.md
- guidelines/_bmad-output/implementation-artifacts/sprint-status.yaml
- src/app/App.tsx
- src/app/checklist-content.test.ts

## Change Log
- 2026-07-17: Implemented story 10.5 by enriching checklist targeting metadata in App.tsx, adding content quality/profile-matrix tests, and validating with targeted and full Vitest regression suites.
