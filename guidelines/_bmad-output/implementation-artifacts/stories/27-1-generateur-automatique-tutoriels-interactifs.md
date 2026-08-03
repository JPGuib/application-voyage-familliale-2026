---
baseline_commit: 82e7a39
---

# Story 27.1 - Generateur automatique de tutoriels interactifs

Statut: ready-for-dev
Epic: 27 - Guide d utilisation intelligent et automatisation tutoriels
Date: 2026-08-03

## Story

As a product owner and maintainer,
I want an automatic tutorial generation pipeline based on actual app screens,
so that onboarding guides stay up to date with minimal manual maintenance.

## Business Value

- Reduces documentation drift when UI changes.
- Lowers maintenance cost for onboarding and help flows.
- Improves user adoption with role and level specific guided tours.
- Creates a reusable architecture for other generated UX assets.

## Acceptance Criteria

1. Page analysis captures actionable interactive elements (buttons, links, forms, tabs, tables, cards, modals) with stable metadata.
Given an application route,
When the analyzer runs,
Then each eligible element is stored with selector, visible text, aria-label, title, placeholder, role, visibility, DOM path, and order index.

2. Non relevant elements are excluded with deterministic rules before LLM calls.
Given a captured element list,
When classification runs,
Then hidden, decorative, and non interactive controls are removed unless explicitly allowlisted.

3. Element scoring is reproducible.
Given the same snapshot input,
When scoring runs,
Then the same element importance score and category are produced (outside optional LLM text generation fields).

4. LLM provider abstraction supports multiple backends.
Given configured provider settings,
When generation runs,
Then OpenAI, Azure OpenAI, GitHub Models, and Ollama are callable behind one provider interface.

5. Tutorial steps are generated as structured data.
Given relevant elements,
When tutorial authoring runs,
Then each step has id, selector, title, description, category, priority, and target audience level.

6. Driver.js output is generated from canonical structured files.
Given generated tutorial JSON or YAML,
When emitter runs,
Then a Driver.js compatible JavaScript or TypeScript file is produced without hand editing.

7. Regeneration is incremental.
Given an existing tutorial catalog,
When UI changes are detected,
Then unchanged steps keep previous descriptions, modified steps are updated, new steps are added, and removed elements are archived or deleted per policy.

8. Developer command is operational.
Given a local dev environment,
When running generate-tutorials,
Then the pipeline performs analysis, optional LLM enrichment, emits Driver.js files, and writes a human readable diff report.

9. App integration exposes tutorial launch from a dedicated menu entry.
Given an authenticated user on main navigation,
When selecting the new onboarding guide entry,
Then a selected tutorial profile (decouverte, premiere utilisation, avance, administration) can be launched.

10. Testability and CI compatibility are demonstrated.
Given CI execution,
When test and generation checks run,
Then unit tests, fixture based integration tests, and deterministic snapshot checks pass.

## Scope Boundaries

In scope:
- Route prioritaire unique en V1: Accueil (dashboard) uniquement.
- New generator services in Python.
- Structured tutorial storage format (JSON canonical only in V1).
- Driver.js emitter.
- Incremental regeneration engine.
- New menu and runtime loader in app.

Out of scope (this story):
- Full visual editor for tutorial steps.
- Real time in browser generation while users navigate.
- Multi language translation pipeline beyond baseline French copy generation.
- YAML export in V1.
- Full app crawl in V1 (other routes after validation on Accueil).

## Implementation Tasks

- [ ] Task 1 - Generator package skeleton and contracts (AC: 1,4,8)
  - [ ] Create Python package under tools/tutorial_generator.
  - [ ] Define domain models (ElementSnapshot, TutorialStep, TutorialFlow, GenerationReport).
  - [ ] Add config model for provider, routes, and output targets.

- [ ] Task 2 - DOM analysis service (AC: 1,2,3)
  - [ ] Implement Playwright based page crawler and snapshot capture.
  - [ ] Restrict capture target to Accueil route only for V1.
  - [ ] Build extraction for semantic attributes and stable selector candidates.
  - [ ] Implement filter rules and scoring heuristic layer.

- [ ] Task 3 - LLM enrichment service abstraction (AC: 4,5)
  - [ ] Implement provider adapter interface with one shared request contract (optional path).
  - [ ] Add no-LLM deterministic description generator as default mode.
  - [ ] Add optional LiteLLM adapter behind feature flag for later enrichment.

- [ ] Task 4 - Tutorial assembly and dedup engine (AC: 5,7)
  - [ ] Group elements into coherent flow clusters.
  - [ ] Build priority sorting and duplicate detection.
  - [ ] Keep stable ids to preserve previous descriptions across regenerations.

- [ ] Task 5 - Driver.js emitter and app runtime loader (AC: 6,9)
  - [ ] Generate typed output file for Driver.js step arrays.
  - [ ] Add app side loader utility and launch function.
  - [ ] Add new navigation entry and screen integration.

- [ ] Task 6 - Incremental regeneration and reporting (AC: 7,8)
  - [ ] Compute diff against previous catalog (added, changed, removed, unchanged).
  - [ ] Persist updated catalog and diff report.
  - [ ] Add archive policy for removed elements.

- [ ] Task 7 - Quality gates and CI wiring (AC: 10)
  - [ ] Add pytest unit tests for services and deterministic fixtures.
  - [ ] Add integration tests on sample pages.
  - [ ] Add CI script step to validate generation output consistency.

## Dev Notes

### Artifact Discovery Summary

- Sprint tracking loaded from guidelines/_bmad-output/implementation-artifacts/sprint-status.yaml.
- Planning artifacts currently sparse for PRD and epic definitions in guidelines/_bmad-output/planning-artifacts.
- Architecture references available from Epic 11 continuity docs and ADR files.
- Existing app has established generated-content pattern via scripts converting source docs to src/content/generated files.

### Existing Project Patterns To Reuse

1. Generated content convention already exists:
- scripts/convert-visites-guidees.mjs generates src/content/generated/visites-guidees.ts.
- scripts/convert-jours-destinations.mjs generates src/content/generated/jours-destinations.ts.
- Generated files include explicit do not edit headers.

2. Monolithic UI integration point:
- src/app/App.tsx owns bottom navigation and screen routing.
- New onboarding menu must integrate without regressing role based access and existing screens.

3. Testing baseline:
- Vitest is standard for TS and integration tests.
- Python tests must be isolated and runnable in CI without browser UI (headless Playwright).

### Proposed Architecture (Service Oriented, Python First)

Root:
- tools/tutorial_generator/

Modules and responsibilities:
- tutorial_generator/config.py
  - Loads generator configuration (routes, provider, output, scoring thresholds).

- tutorial_generator/models.py
  - Dataclasses or pydantic models:
    - ElementSnapshot
    - TutorialStep
    - TutorialFlow
    - TutorialCatalog
    - GenerationReport

- tutorial_generator/services/page_analyzer.py
  - Opens pages with Playwright.
  - Captures normalized interactive elements.
  - Produces deterministic element fingerprints.

- tutorial_generator/services/element_classifier.py
  - Rule based filtering of non relevant elements.
  - Importance scoring and category assignment.

- tutorial_generator/services/llm_provider.py
  - Provider interface and request or response DTOs.

- tutorial_generator/services/providers/litellm_provider.py
  - Default provider adapter through LiteLLM.
  - Supports OpenAI, Azure OpenAI, GitHub Models, Ollama from one API.

- tutorial_generator/services/step_author.py
  - Generates step title and descriptions.
  - Keeps token efficient and deterministic prompt strategy.

- tutorial_generator/services/flow_builder.py
  - Builds ordered flows by user level: decouverte, premiere-utilisation, avance, administration.
  - Handles dedup and logical grouping.

- tutorial_generator/services/catalog_diff.py
  - Computes incremental diff with prior catalog.
  - Preserves existing text for unchanged fingerprints.

- tutorial_generator/services/driverjs_emitter.py
  - Emits Driver.js data file from canonical catalog.

- tutorial_generator/repositories/catalog_repository.py
  - Reads and writes JSON source of truth.
  - Optional YAML export.

- tutorial_generator/cli.py
  - Exposes command generate-tutorials.

### Data Contracts

Canonical storage (JSON):
- version
- generated_at
- app_version
- routes[]
- elements[]
- flows[]
- metadata

V1 cost-control rule:
- JSON is the single source of truth.
- No YAML file is produced in V1.

Element identity:
- element_fingerprint = hash(route + stable_selector + role + normalized_text)

Tutorial step:
- step_id
- element_fingerprint
- selector
- title
- description
- category
- priority
- audience_level
- source_route

Diff report:
- added_steps
- updated_steps
- removed_steps
- unchanged_steps
- preserved_descriptions_count
- llm_calls_count
- warnings

### Interfaces Between Modules

- IPageAnalyzer.analyze(route) -> list[ElementSnapshot]
- IElementClassifier.classify(elements) -> list[ClassifiedElement]
- ILlmProvider.generate_step_content(context) -> GeneratedCopy
- IFlowBuilder.build(elements, profile) -> TutorialFlow
- IDriverEmitter.emit(catalog) -> str
- ICatalogRepository.load() or save(catalog)
- ICatalogDiff.diff(old_catalog, new_catalog) -> GenerationReport

### Update Files To Read Completely Before Dev Starts

Mandatory full reads before coding:
- src/app/App.tsx
- src/main.tsx
- package.json
- scripts/convert-visites-guidees.mjs
- src/content/generated/visites-guidees.ts

Preservation requirements:
- Preserve existing bottom nav behaviors and access gating.
- Preserve existing generated-content approach and warnings.
- Do not manually edit generated output files in source folders.

### File Structure Requirements

New files (proposed):
- tools/tutorial_generator/__init__.py
- tools/tutorial_generator/cli.py
- tools/tutorial_generator/config.py
- tools/tutorial_generator/models.py
- tools/tutorial_generator/services/page_analyzer.py
- tools/tutorial_generator/services/element_classifier.py
- tools/tutorial_generator/services/llm_provider.py
- tools/tutorial_generator/services/providers/litellm_provider.py
- tools/tutorial_generator/services/step_author.py
- tools/tutorial_generator/services/flow_builder.py
- tools/tutorial_generator/services/catalog_diff.py
- tools/tutorial_generator/services/driverjs_emitter.py
- tools/tutorial_generator/repositories/catalog_repository.py
- tools/tutorial_generator/tests/test_element_classifier.py
- tools/tutorial_generator/tests/test_catalog_diff.py
- tools/tutorial_generator/tests/test_driverjs_emitter.py
- tools/tutorial_generator/tests/fixtures/sample_dom_snapshot.json
- docs/tutorials/tutorial-catalog.schema.json
- docs/tutorials/tutorial-catalog.json
- docs/tutorials/tutorial-diff-report.md
- src/app/tutorials/driver-runtime.ts
- src/app/tutorials/tutorial-loader.ts

Likely updates:
- package.json (script generate:tutorials)
- src/app/App.tsx (new menu and launch entry)

### Library and Framework Requirements

Frontend:
- Driver.js pinned to a current stable version (observed npm: 1.8.0).
- Use official imports from driver.js and driver.js/dist/driver.css.

Python tooling:
- Playwright for Python for DOM analysis and page automation.
- LiteLLM optional only (not required for V1 default path).
- pydantic optional for schema validation if team confirms dependency policy.

Default generation mode (V1):
- IA disabled by default.
- Step title/description generated by deterministic templates from element metadata.
- Optional IA enrichment can be enabled route by route after baseline quality validation.

### Security and Privacy Guardrails

- Never send sensitive text fields to LLM by default (password, code, hidden inputs).
- Add redaction strategy before external LLM calls.
- Allow no-network mode where only rule based generation runs.
- Log provider and model used for traceability.

V1 simplification:
- Keep no-network deterministic mode as the default execution path.

### Performance Guardrails

- Cache page snapshots per route and app build hash.
- Batch LLM calls with max token budgeting.
- Incremental regeneration should avoid full catalog rewrite when not needed.

V1 scope guard:
- Analyze only Accueil route to minimize runtime, token usage, and disk output.

### Testing Requirements

Python unit tests:
- Selector stability scoring
- Filter exclusion rules
- Fingerprint stability
- Catalog diff behavior
- Driver.js emitter schema compliance

Integration tests:
- Analyze representative app routes and assert expected interactive element coverage.
- Regeneration keeps unchanged descriptions for untouched elements.

Frontend tests:
- Navigation entry for tutorial menu appears in expected contexts.
- Driver runtime can load generated flow and start tour without crashing.

CI requirements:
- Command for deterministic generation check.
- Failing diff check when schema breaks.

### Git Intelligence Summary

Recent commits analyzed:
- 82e7a39 260803 v10
- 99b9e37 260803 v9
- 781d878 Bug Fix Github
- a312493 Story 25.2 v10
- d5c3988 Sotry 25.2 V9

Actionable interpretation:
- Main branch is active with frequent App.tsx touchpoints.
- Keep app integration minimal and isolated from core business flows.
- Prefer additive files and strict regression tests around navigation.

### Latest Technical Information

Driver.js:
- npm package observed at version 1.8.0.
- Supports step level skipMissingElement and waitForElement, useful for dynamic modals.
- Configuration hooks support custom next or done behavior needed for multi screen tours.

Playwright Python:
- Recommended with pytest-playwright plugin.
- Supports headless CI on Windows and Linux.

LiteLLM:
- Unified provider interface for OpenAI style completions across multiple vendors.
- Useful for pluggable provider strategy and future cost or routing controls.

### Risks and Mitigations

- Risk: unstable selectors generate noisy diffs.
  - Mitigation: weighted selector strategy with fallback hierarchy and fingerprint tests.

- Risk: LLM hallucinated descriptions.
  - Mitigation: strict prompt templates, max length rules, and optional human review mode.

- Risk: runtime regressions in navigation.
  - Mitigation: focused integration tests around App navigation and role access checks.

### Definition of Done

- Canonical tutorial catalog is generated from app screens.
- Driver.js output file is generated and loaded by app menu.
- Incremental regeneration preserves unchanged descriptions.
- Reports clearly show added, changed, and removed tutorial steps.
- Test suite and CI checks are green.

## References

- guidelines/_bmad-output/implementation-artifacts/sprint-status.yaml
- guidelines/_bmad-output/planning-artifacts/architecture-brief-epic-11-3-continuite.md
- guidelines/_bmad-output/planning-artifacts/architecture-review-epic-11-pre-11-6-2026-07-15.md
- guidelines/_bmad-output/planning-artifacts/adr-11-3-source-of-truth-cloud-local.md
- docs/backlog-epics-stories.md
- scripts/convert-visites-guidees.mjs
- scripts/convert-jours-destinations.mjs
- src/app/App.tsx
- package.json
- https://driverjs.com/docs/installation
- https://driverjs.com/docs/configuration
- https://www.npmjs.com/package/driver.js
- https://playwright.dev/python/docs/intro
- https://docs.litellm.ai/docs/

## Dev Agent Record

### Agent Model Used

GPT-5.3-Codex

### Debug Log References

- Workflow activation resolved via _bmad/scripts/resolve_customization.py (workflow).
- Sprint status fully scanned to detect backlog and status conventions.
- New topic was provided by user and formalized as new story 27.1.

### Completion Notes

- Story context intentionally created as a new epic candidate because no existing backlog story matched this subject.
- Architecture and service boundaries defined to avoid coupling analysis, LLM generation, and Driver.js emission.
- Includes concrete module contracts, file organization, and CI test strategy.

### File List

- guidelines/_bmad-output/implementation-artifacts/stories/27-1-generateur-automatique-tutoriels-interactifs.md
- guidelines/_bmad-output/implementation-artifacts/sprint-status.yaml

### Change Log

- 2026-08-03: Created story 27.1 (ready-for-dev) for automatic interactive tutorial generation and updated sprint status.