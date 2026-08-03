---
baseline_commit: 625a6a0
---

# Story 20.3: EUR <-> TRY Currency Converter

Status: review

## Story

As a family traveler (owner, voyageur, or visiteur),
I want to convert EUR amounts to TRY and TRY amounts to EUR in real time,
so that I can quickly estimate local prices while traveling.

## Acceptance Criteria

1. The currency converter is accessible from the app (from Tips / Payment tab, aligned with current UX).
2. Entering an amount in EUR updates TRY instantly, and entering an amount in TRY updates EUR instantly.
3. On network failure, the UI uses cached last-known rate when available, otherwise a hardcoded fallback rate, and always shows freshness/source messaging.
4. Any non-numeric or negative input shows no blocking error and no invalid conversion output.
5. The converter remains accessible to all roles (proprietaire, utilisateur, visiteur) without any unlock gate.
6. UI includes a clear disclaimer that the value is approximate and excludes banking fees.

## Tasks / Subtasks

- [x] Build conversion domain module (AC: 2,3,4,6)
  - [x] Create `src/app/exchange-rate.ts` with typed fetch + parsing + fallback policy
  - [x] Implement deterministic conversion helpers and rounding rules
  - [x] Add local cache read/write helpers (timestamp + source)
- [x] Integrate converter into existing Tips payment flow (AC: 1,2,4,5,6)
  - [x] Update `src/app/App.tsx` (`TipsScreen`) to render two linked numeric inputs
  - [x] Preserve current weather card and payment tips card behavior
  - [x] Show explicit freshness/source message and approximation disclaimer
- [x] Keep static content compatibility (AC: 1,6)
  - [x] Update `src/content/tips.ts` only where needed (do not break existing payment cards)
  - [x] Keep existing text formatting through `renderFormattedText`
- [x] Add tests and regression safety net (AC: all)
  - [x] Add `src/app/exchange-rate.test.ts` for math, fallback chain, invalid input
  - [x] Extend UI tests around Tips flow for bidirectional inputs and non-blocking invalid input
  - [x] Verify no regression on weather and existing payment tab rendering

## Dev Notes

### Story Foundation

- Source story: `docs/specs-stories/epic-20/20.3-convertisseur-devises-eur-try.md`
- Epic context source: `docs/specs-stories/epic-20/20.1-planning-complet-itineraire.md`, `docs/specs-stories/epic-20/20.2-documents-voyage-centralises.md`
- Sprint tracking source: `_bmad-output/implementation-artifacts/sprint-status.yaml`
- Product intent: lightweight, practical travel utility; no finance advice; offline-tolerant behavior.

### Epic 20 Context and Dependencies

- Epic 20 is additive and low-regression by design (planning artifact confirms low architecture risk).
- Story 20.2 is marked `canceled` in sprint tracking, so 20.3 must not assume a dedicated "Docs importants" screen exists.
- Therefore, the safe integration point is current `TipsScreen` Payment tab in `src/app/App.tsx`.

### Previous Story Intelligence (Story 20.2)

- 20.2 intent (documents centralization) emphasized read-only content reuse and offline consultability.
- Actionable carry-over for 20.3:
  - Keep data local-first behavior and graceful offline degradation.
  - Avoid introducing network-only UX states that block use.
  - Reuse current information architecture rather than adding a new heavy navigation branch.

### Git Intelligence Summary

- Last 3 commits (`625a6a0`, `b8736a3`, `537872c`) modified `src/app/App.tsx` only.
- Practical implication:
  - `App.tsx` is currently a hot file; keep edits minimal and scoped to `TipsScreen`.
  - Prefer extracting converter logic into a focused helper module to reduce risk in the monolithic screen file.

### Architecture Compliance (Must Follow)

- Reuse established free/no-key API philosophy from weather (`src/app/weather.ts` using Open-Meteo).
- Keep role access unchanged: no role guard, no unlock condition, no ownership restriction.
- Preserve current Tips page structure:
  - Header and weather block remain untouched functionally.
  - Existing tabs and `content[tab]` rendering remain intact.
  - Payment tab keeps existing educational cards from `TIPS.payment`.
- Do not introduce new global state or cloud sync writes for exchange rates.
- Converter failure must never crash Tips screen.

### Existing UPDATE Files Read and What Must Be Preserved

- `src/app/App.tsx`
  - Current state: `TipsScreen` already includes weather retrieval and tabbed content, with a static exchange-rate info card shown when `tab === "payment"`.
  - Story change: replace static-only rate display with dynamic converter UI + dynamic rate metadata while keeping existing payment cards.
  - Preserve: navigation flow (`onBack` to dashboard), weather block UX, tab switching behavior, and no extra role gating.

- `src/content/tips.ts`
  - Current state: contains static payment tips and `exchangeRate` static block used in Tips screen.
  - Story change: retain static educational payment tips; static `exchangeRate` can be reduced to fallback guidance text if needed.
  - Preserve: existing categories and text rendering compatibility.

- `src/app/weather.ts`
  - Current state: resilient fetch pattern (no key API, non-throwing UI usage, simple error state).
  - Story change: reuse the same resilience philosophy for currency fetch flow.
  - Preserve: weather hook contract and existing weather tests.

- `src/app/weather.test.ts`
  - Current state: utility-level deterministic tests for parsing and decision rules.
  - Story change: mirror this approach in `exchange-rate.test.ts`.
  - Preserve: current test structure and naming style (French assertions are acceptable in this codebase).

### Library / Framework Requirements

- Keep current stack only: React + TypeScript + Vitest.
- Do not add new dependency for conversion math.
- Use native `fetch` with robust guards.
- No backend change, no Firebase schema/rules change.

### Latest Technical Information (Web Research)

- Frankfurter v2 API (`https://api.frankfurter.dev`) is free, no API key, and supports pair endpoint:
  - `GET /v2/rate/EUR/TRY`
  - Optional parameters include provider/date when needed.
- Frankfurter docs explicitly state conversion should be performed client-side after fetching rate.
- API provides standard HTTP errors (`400`, `404`, `422`) with JSON error message.
- Free rate APIs can be rate-limited for abuse: cache latest successful rate locally to reduce calls.
- Live sample from `open.er-api.com` confirms current EUR/TRY is available and includes update timestamps; can serve as fallback provider strategy reference if Frankfurter fails repeatedly.

### Suggested Technical Design

- New module: `src/app/exchange-rate.ts`
  - `type ExchangeRateSnapshot = { rate: number; fetchedAtIso: string; source: "live" | "cache" | "fallback" }`
  - `async function getEurTryRate(now = new Date()): Promise<ExchangeRateSnapshot>`
  - `function convertEurToTry(amountEur: number, rate: number): number`
  - `function convertTryToEur(amountTry: number, rate: number): number`
  - `function normalizeNumericInput(raw: string): number | null`
- Cache contract in localStorage:
  - Key: `jp-eur-try-rate-cache-v1`
  - Value JSON: `{ rate: number, fetchedAtIso: string }`
  - Reads/writes wrapped in `try/catch` (same defensive pattern as current app state persistence)
- Hardcoded fallback constant:
  - `const FALLBACK_EUR_TRY_RATE = 54`
  - Must be labeled in UI as non-updated indicative rate.

### UX and Behavior Guardrails

- Two linked inputs inside Payment tab:
  - EUR input (prefix `EUR`/`€`)
  - TRY input (prefix `TRY`/`₺`)
- Update rule:
  - Track last edited side to prevent feedback loops.
  - Recompute opposite field on each valid positive/zero numeric change.
- Invalid or negative input:
  - Keep field text but clear computed opposite value.
  - No toast, no blocking alert, no crash.
- Messaging (mandatory):
  - `Live rate fetched at ...` OR `Using last known rate from ...` OR `Using indicative fallback rate (not updated)`
  - `Approximate rate only, banking fees not included.`

### Performance and Resilience Requirements

- Fetch on Payment tab open (or first Tips screen mount) and memoize state for current session.
- Avoid refetching on every keystroke.
- Timeout/network failure must fall back silently to cache/fallback path.
- Keep rendering responsive on low-end mobile devices.

### Testing Requirements

- Unit (`src/app/exchange-rate.test.ts`):
  - parses valid API payload (`rate` numeric)
  - rejects malformed payload
  - conversion math correctness and rounding
  - invalid/negative input normalization
  - cache hit/miss behavior
  - fallback selection when fetch and cache both fail
- Integration/UI:
  - Payment tab shows converter block
  - EUR edit updates TRY, TRY edit updates EUR
  - invalid input does not throw and does not display broken values
  - source/freshness message changes by data source
  - weather section still renders unaffected

### Project Structure Notes

- Align with existing app structure:
  - UI integration: `src/app/App.tsx`
  - Domain utility and API wiring: `src/app/exchange-rate.ts` (new)
  - Tests: `src/app/exchange-rate.test.ts` (new) + existing App tests extension
  - Content constants: `src/content/tips.ts`
- Avoid scattering conversion logic into unrelated service/cloud files.

### Anti-Patterns to Avoid

- Do not hardcode daily rate text directly in JSX.
- Do not add a new navigation screen just for converter.
- Do not require authentication or specific role.
- Do not block input on formatting edge cases.
- Do not write exchange rate to Firebase/cloud snapshot.

### References

- `docs/specs-stories/epic-20/20.3-convertisseur-devises-eur-try.md`
- `docs/specs-stories/epic-20/20.2-documents-voyage-centralises.md`
- `_bmad-output/planning-artifacts/roadmap-priorisation-epics-19-26-2026-07-31.md`
- `src/app/App.tsx`
- `src/app/weather.ts`
- `src/app/weather.test.ts`
- `src/content/tips.ts`
- `https://frankfurter.dev/docs/`
- `https://api.frankfurter.dev/v2/rate/EUR/TRY`
- `https://open.er-api.com/v6/latest/EUR`

## Dev Agent Record

### Agent Model Used

GPT-5.3-Codex

### Debug Log References

- Workflow activation resolved via `_bmad/scripts/resolve_customization.py`
- Story target provided by user: `20.3` + `docs/specs-stories/epic-20/20.3-convertisseur-devises-eur-try.md`
- Sprint status updated in `_bmad-output/implementation-artifacts/sprint-status.yaml`

### Completion Notes List

- Created `src/app/exchange-rate.ts`: ExchangeRateSnapshot type, getEurTryRate() with live/cache/fallback chain, convertEurToTry(), convertTryToEur(), normalizeNumericInput(), readRateCache(), writeRateCache().
- Modified TipsScreen in `src/app/App.tsx`: replaced static TIPS.exchangeRate block with dynamic two-input EUR↔TRY converter, rate fetched on mount via useEffect, feedback-loop-free via lastEdited ref, freshness/disclaimer message shown.
- `src/content/tips.ts` left unchanged — no breaking changes to existing payment cards.
- Added 24 unit tests in `src/app/exchange-rate.test.ts`: conversion math, rounding, input normalization, cache read/write, all 3 fetch outcome paths.
- Added 10 integration tests in `src/app/App.tips-screen.integration.test.tsx`: converter block visible, bidirectional inputs, invalid/negative input does not crash, source message per snapshot, static payment cards preserved, weather block unaffected.
- Full regression suite: 317 tests pass (0 failures). Build succeeds cleanly.

### File List

- `src/app/exchange-rate.ts` (new)
- `src/app/exchange-rate.test.ts` (new)
- `src/app/App.tips-screen.integration.test.tsx` (new)
- `src/app/App.tsx` (modified — TipsScreen: import exchange-rate, added converter state/handlers, replaced static exchange rate card with dynamic converter UI)
- `_bmad-output/implementation-artifacts/20-3-convertisseur-devises-eur-try.md` (story file)
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

### Change Log

- 2026-08-03: Implemented story 20.3 — EUR↔TRY currency converter in TipsScreen Payment tab. Created exchange-rate.ts domain module with live fetch (Frankfurter v2), localStorage cache, and hardcoded fallback. Replaced static rate card with interactive two-input converter. Added 24 unit + 10 integration tests. All 317 tests pass, build clean.
