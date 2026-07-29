# Architecture Review - Epic 11 (Pre-11.6)

Date: 2026-07-15
Reviewer: Copilot (architecture risk review)
Scope: readiness review before starting story 11-6 (deblocage famille-wide)
Inputs:
- guidelines/_bmad-output/planning-artifacts/architecture-brief-epic-11-3-continuite.md
- guidelines/_bmad-output/planning-artifacts/adr-11-3-source-of-truth-cloud-local.md
- docs/backlog-epics-stories.md
- src/app/App.tsx
- src/hooks/useCloudSync.ts
- src/services/cloudSyncProvider.ts
- firebase/database.rules.prod.json
- firebase/database.rules.test.json
- docs/security/firebase-rules-audit.md

## Verdict

NO-GO for 11-6 as-is.

Rationale: product decision for family-wide unlock is clear, but current runtime + rules model still implement profile-scoped phase and contain security/consistency gaps that can cause unauthorized or stale family-wide state writes.

## Findings (ordered by severity)

### 1) BLOCKER - No Firebase Auth integration while production rules require auth.uid

Evidence:
- RTDB prod rules gate all reads/writes with auth + membership under familyMembers: firebase/database.rules.prod.json
- App cloud stack initializes app + database only, no auth sign-in flow or auth token lifecycle: src/services/firebaseConfig.ts
- Security audit already warns that sync is blocked without Firebase Auth active: docs/security/firebase-rules-audit.md

Risk:
- In prod profile, cloud sync can be denied by design, causing silent fallback/queue behavior and non-deterministic UX.
- 11-6 depends on cloud as source of truth for family-wide phase; without auth, this cannot be relied upon.

Required gate before 11-6:
- Implement and validate Firebase Auth path (at minimum anonymous or explicit account strategy) and membership bootstrap process.

### 2) BLOCKER - Data model still profile-scoped for phase, conflicting with family-wide decision

Evidence:
- Product decision explicitly requires family-wide unlock and moving phase to families/{familyId}/phase: docs/backlog-epics-stories.md
- Cloud provider writes phase at profile scope (phase/{profileId}): src/services/cloudSyncProvider.ts
- Snapshot parser reads phase at profile scope: src/services/cloudSyncProvider.ts
- App hydration reads phase from cloudProfile.phase (profile-scoped): src/app/App.tsx

Risk:
- 11-6 semantics (one unlock shared by all profiles/devices) cannot be guaranteed.
- Profile switch may appear to re-lock or desync state depending on which profile subtree was last updated.

Required gate before 11-6:
- Introduce explicit migration contract for phase:
  - write/read families/{familyId}/phase as authoritative
  - temporary backward-compatible read of phase/{profileId}
  - one-way migration and deprecation plan

### 3) HIGH - Rules permit any authenticated family member to write full family subtree

Evidence:
- families/$familyId has broad write permission for any member: firebase/database.rules.prod.json
- Owner-only behavior for unlock is currently enforced in UI/domain logic, not in DB rules: src/app/App.tsx and src/app/owner-policy.ts

Risk:
- A non-owner authenticated member can bypass UI and write unlock state directly via SDK/REST.
- For 11-6 (family-wide unlock), this is a direct authorization vulnerability.

Required gate before 11-6:
- Harden RTDB rules to enforce owner-only writes for unlock/phase transition path.
- Keep profile-scoped user data writable per-profile, but guard family-wide unlock node by owner identity.

### 4) HIGH - Offline queue replays whole snapshots without conflict control (stale overwrite risk)

Evidence:
- Queue stores full CloudSyncWritePayload objects in localStorage and flushes sequentially on reconnect: src/hooks/useCloudSync.ts
- pushCloudSnapshot updates ownerProfileId, ownerCodeHash, checklist/gameResults, and phase from payload in one update call: src/services/cloudSyncProvider.ts
- No conflict detection (version/etag/precondition) before apply.

Risk:
- Stale offline payload can overwrite newer cloud values when connection returns.
- Impact is amplified with family-wide phase, because stale phase/owner fields can rollback critical shared state.

Required gate before 11-6:
- Add optimistic concurrency strategy (e.g., version compare via transaction) or split writes by bounded intent.
- At minimum, isolate family-wide phase writes from routine profile/checklist writes.

### 5) MEDIUM - ownerCodeHash validation may reject early lifecycle payloads

Evidence:
- Rules require ownerCodeHash format sha256:... at write path: firebase/database.rules.prod.json
- App push payload always includes ownerCodeHash; initial value may be empty during early lifecycle: src/app/App.tsx and src/services/cloudSyncProvider.ts

Risk:
- Valid functional writes may fail until code owner is configured, creating retry noise and hidden sync failures.

Required gate before 11-6:
- Decide explicit lifecycle rule: allow null/empty until configured OR ensure app does not write ownerCodeHash until valid hash exists.

## Positive signals

- Owner uniqueness invariants and role governance tests are in place and passing:
  - src/app/owner-policy.test.ts
  - src/app/owner-governance.integration.test.ts
- Existing cloud push guard prevents unauthenticated app-level push during bootstrap: src/app/App.tsx

## Test evidence executed during review

Command run:
- npm run test -- src/app/owner-governance.integration.test.ts src/app/owner-policy.test.ts

Result:
- 13/13 tests passed.

## Readiness decision for 11-6

Current status: NO-GO.

Go conditions (minimum):
1. Auth + membership flow operational in test environment.
2. Phase migrated to family-wide authoritative node with backward-compatible read migration.
3. Rules enforce owner-only unlock/phase write path.
4. Stale replay protection for shared family fields (phase/ownerCodeHash/ownerProfileId).

## Recommended immediate sequence

1. Close 11-5 with a hardening addendum for auth + owner-only phase writes in rules.
2. Add a short ADR update for 11-6 schema/authorization contract.
3. Implement 11-6 in two steps:
   - Step A: dual-read + single-write family-wide phase
   - Step B: remove profile phase writes after validation
4. Add targeted tests:
   - Rules tests: non-owner cannot write family-wide phase
   - Integration: profile switch does not re-lock when family phase is during
   - Offline replay: stale queued payload cannot downgrade family phase
