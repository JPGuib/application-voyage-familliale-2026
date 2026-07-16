---
baseline_commit: f0881b2f4f6604173dbacff652bd94aac2bd0dda
story_key: 9-1-configurer-une-phrase-de-recuperation-proprietaire
---

# Story 9.1 - Configurer une phrase de recuperation proprietaire

Statut: review
Epic: 9 - Recuperation d urgence du code proprietaire
Backlog source: BACKLOG-004
Date: 2026-07-10

## User Story
As a proprietaire,
I want definir une phrase de recuperation,
So that je puisse reinitialiser mon code si je l oublie.

## Acceptance Criteria
- ✅ AC1: Le proprietaire peut definir ou mettre a jour une phrase de recuperation depuis Parametres.
- ✅ AC2: La phrase est stockee uniquement sous forme hashee.
- ✅ AC3: Un user non-owner ne voit pas ce parametre.
- ✅ AC4: Si aucune phrase n est configuree, un message UX l indique clairement.

## Taches implementation
- [x] Ajouter `ownerRecoveryHash` et `ownerRecoveryConfiguredAt` aux donnees locales/cloud.
- [x] Reutiliser les helpers de hash/verify pour la phrase de recuperation.
- [x] Ajouter une section Parametres proprietaire pour configurer la phrase.
- [x] Ajouter feedback UX de configuration/mise a jour.

## Tests
- [x] Unit: hash/verify phrase de recuperation.
- [x] Integration: owner configure une phrase, user non-owner ne le peut pas.

## Definition of Done
- [x] Phrase de recuperation configurable uniquement par owner.
- [x] Persistance uniquement en hash.
- [x] Tests verts.

## Dev Agent Record

### Implementation Summary
Implemented owner recovery phrase configuration feature with secure hashing and cloud synchronization.

### Files Created
- `src/app/owner-recovery.ts` - Core hashing and verification utilities (mirrors owner-code.ts pattern)
- `src/app/owner-recovery.test.ts` - Unit tests for hash/verify functions
- `src/app/owner-recovery.integration.test.ts` - Integration tests for ownership and role-based access

### Files Modified
- `src/types/cloud.ts` - Added `ownerRecoveryHash` and `ownerRecoveryConfiguredAt` fields to CloudSyncSnapshot and CloudSyncWritePayload
- `src/app/App.tsx` - Enhanced with:
  - Import of recovery utilities
  - State management for `ownerRecoveryHash` with localStorage persistence
  - Cloud sync integration for recovery hash
  - SettingsScreen component updated with recovery phrase section (owner-only)
  - Recovery phrase handlers with validation (min 5 chars)
  - Props passed to both SettingsScreen instances (before/during phases)
- `src/hooks/useCloudSync.ts` - Updated PushSnapshotInput and CloudSyncWritePayload creation to include recovery fields

### Architecture Patterns Used
- Same SHA256 hashing pattern as owner-code.ts for consistency
- Owner-only access control using `canUpdateOwnerCode` (reused logic)
- Async save handlers with feedback messaging (mirrors onSaveOwnerCode pattern)
- Local storage persistence + cloud sync bidirectional sync

### Test Coverage
- 4 unit tests: hash format validation, phrase verification, legacy format rejection
- 5 integration tests: phrase configuration, verification, non-owner access blocking, cloud persistence

### Validation Gates Passed
- All 56 tests pass (53 passed, 3 skipped Firebase emulator)
- Zero TypeScript errors
- Owner-only access enforced at both UI and handler level
- Phrase hashing works correctly with SHA256 deterministic output
- Cloud sync ready: both local and cloud payloads include recovery fields

## Change Log
- 2026-07-16: Implemented recovery phrase configuration with hashing, cloud sync, and role-based UI access
