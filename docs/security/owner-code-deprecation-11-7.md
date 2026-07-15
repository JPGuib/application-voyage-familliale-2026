# Story 11.7 - Owner Code Legacy Deprecation

Date: 2026-07-15
Status: Implemented

## Scope

This note documents the removal of clear-text owner code support (`jp-owner-code`) and the migration to hash-only validation (`jp-owner-code-hash`).

## Security Decisions

- Runtime owner-code verification now accepts only `sha256:`-prefixed hashes.
- Clear-text fallback is removed from active authentication flows.
- Legacy clear-text storage key is purged after migration handling.

## Migration Behavior

For non-cloud mode bootstrap:

1. Read `jp-owner-code-hash` as the single source of truth.
2. If `jp-owner-code` exists:
   - if a valid hash already exists, purge `jp-owner-code`;
   - otherwise, hash legacy content, persist hash through normal state persistence, then purge `jp-owner-code`.

This ensures old clients can transition without preserving clear-text storage beyond first migration pass.

## Rollout Observability

The app emits development logs for migration surveillance:

- `[owner-code] Legacy clear-text owner code key detected and purged.`
- `[owner-code] Legacy clear-text owner code migrated to hash-only storage.`

## Verification Targets

- Unit tests: hash-only verification enforced (`owner-code.test.ts`).
- Integration/regression: owner governance and unlock flow remain green.
