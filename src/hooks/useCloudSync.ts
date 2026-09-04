import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { type Role, type SharedFamilyState } from "../app/owner-policy";
import type { ChatMemberProfile } from "../app/chat";
import {
  claimProfileRole,
  closeChatPoll,
  createChatConversation,
  deleteProfileFromCloud,
  deleteContentVisitLogEntry,
  deleteDocumentPhoto,
  deletePlaceVisitLogEntry,
  ensureFamilyMembership,
  ensureOwnerMembership,
  ensureProfileMembership,
  ensureVoyageConversationMembers,
  leaveChatConversation,
  markChatConversationRead,
  observeChatConversations,
  observeChatMessages,
  observeChatReadState,
  observeContentVisitLog,
  observeDocumentPhotos,
  observeFamilySnapshot,
  observePlaceVisitLog,
  renameChatConversation,
  sendChatMessage,
  submitChatPollResponse,
  pushDestinationSurveyVoteOnly,
  pushCloudSnapshot,
  pushFamilyPhaseChange,
  pushContentOverride,
  pushGameDayOverride,
  pushGameScoring,
  pushPlaceVisibility,
  pushPlaceSeen,
  pushPlaceDayOverride,
  pushTripStartDate,
  resetGameProgressInCloud,
  resetGameResultsInCloud,
  upsertContentVisitLogEntry,
  upsertDocumentPhoto,
  upsertPlaceVisitLogEntry,
} from "../services/cloudSyncProvider";
import {
  ensureFirebaseAnonymousAuth,
  getFirebaseAuthInstance,
  getFirebaseDatabaseInstance,
  isFirebaseConfigured,
  observeFirebaseUser,
} from "../services/firebaseConfig";
import type {
  ChecklistCustomItem,
  ChecklistRemovalState,
  ChecklistState,
  CloudCandyCrushChallenge,
  CloudCarnetVisiteEntry,
  CloudCarnetVisiteLog,
  CloudCarnetContentEntry,
  CloudCarnetContentLog,
  CloudChallengeBestVotesByDay,
  CloudChallengeReactionsByDay,
  CloudChatConversation,
  CloudChatConversationsMap,
  CloudChatMessage,
  CloudChatMessagesLog,
  CloudChatPollResponse,
  CloudChatReadStateMap,
  CloudDestinationSurveyVote,
  CloudDocumentPhotoMap,
  CloudGameHistoryEntry,
  CloudGameProgress,
  CloudPlaceCommentsByPlace,
  CloudSyncSnapshot,
  CloudSyncWritePayload,
  ContentOverrideMap,
  ContentOverridePatch,
  ContentSource,
  DocumentCatalogRemovalState,
  DocumentVisibilityState,
  GameDayOverride,
  PlaceDayOverrideMap,
  PlaceDayOrderOverrideMap,
  PlaceVisibilityState,
  PlaceSeenState,
  ProfileGender,
  ProfileHouseholdRole,
  TravelPhase,
} from "../types/cloud";
import type { GameScoringConfig } from "../content/game";
import type { TravelDocument } from "../content/documents";
import type { Place } from "../content/places";

type ClaimRoleResult = {
  assignedRole: Role;
  familyState: SharedFamilyState;
};

type PushSnapshotInput = {
  actorUid: string;
  canWriteFamilyState: boolean;
  familyState: SharedFamilyState;
  ownerCodeHash: string;
  ownerCodePlain?: string;
  travelerCodeHash?: string;
  travelerCodePlain?: string;
  ownerRecoveryHash?: string;
  ownerRecoveryConfiguredAt?: number;
  profileId: string;
  surname: string;
  role: Role;
  profilePasswordHash?: string;
  profileRecoveryHash?: string;
  profileRecoveryQuestion?: string;
  profileRecoveryAnswer?: string;
  profileRecoveryConfiguredAt?: number;
  gender?: ProfileGender;
  householdRole?: ProfileHouseholdRole;
  checklist: ChecklistState;
  profileCustomChecklistItems: ChecklistCustomItem[];
  ownerGlobalChecklistAdditions: ChecklistCustomItem[];
  ownerGlobalChecklistRemovals: ChecklistRemovalState;
  placeComments: CloudPlaceCommentsByPlace;
  placeVisibilityMap?: Record<string, PlaceVisibilityState>;
  placeSeenMap?: Record<string, PlaceSeenState>;
  placeDayOverrides?: PlaceDayOverrideMap;
  placeDayOrderOverrides?: PlaceDayOrderOverrideMap;
  documentVisibilityMap?: Record<string, DocumentVisibilityState>;
  contentOverrides?: ContentOverrideMap;
  ownerGlobalDocumentAdditions?: TravelDocument[];
  ownerGlobalDocumentEdits?: Record<string, TravelDocument>;
  ownerGlobalDocumentRemovals?: DocumentCatalogRemovalState;
  ownerGlobalPlaceAdditions?: Place[];
  profileDestinationSurveyVote?: CloudDestinationSurveyVote | null;
  challengeReactions?: CloudChallengeReactionsByDay;
  challengeBestVotes?: CloudChallengeBestVotesByDay;
  launchGateCycle?: number;
  launchGateCompletedCycleForProfile?: number | null;
  resetDestinationSurvey?: boolean;
  gameResults: CloudGameHistoryEntry[];
  gameProgress: CloudGameProgress;
  candyCrushChallenge: CloudCandyCrushChallenge;
  phase: TravelPhase;
  tripStartDate?: string | null;
  gameScoring: GameScoringConfig;
};

const PENDING_QUEUE_KEY_PREFIX = "jp-cloud-pending";

function getPendingQueueKey(familyId: string): string {
  return `${PENDING_QUEUE_KEY_PREFIX}:${familyId}`;
}

function readPendingQueue(key: string): CloudSyncWritePayload[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as CloudSyncWritePayload[]) : [];
  } catch {
    return [];
  }
}

function writePendingQueue(key: string, queue: CloudSyncWritePayload[]): void {
  try {
    if (queue.length === 0) {
      localStorage.removeItem(key);
      return;
    }
    localStorage.setItem(key, JSON.stringify(queue));
  } catch {
    // Ignore storage write failures, local mode remains functional.
  }
}

export function useCloudSync() {
  const isEnabled = isFirebaseConfigured();
  const database = useMemo(() => getFirebaseDatabaseInstance(), []);
  const auth = useMemo(() => getFirebaseAuthInstance(), []);
  const familyId = (import.meta.env.VITE_FAMILY_SYNC_ID as string | undefined) || "famille-voyage-2026";
  const pendingQueueKey = useMemo(() => getPendingQueueKey(familyId), [familyId]);
  const cloudRuntimeAvailable = isEnabled && Boolean(database) && Boolean(auth);

  const [isReady, setIsReady] = useState<boolean>(() => !cloudRuntimeAvailable);
  const [isAuthReady, setIsAuthReady] = useState<boolean>(() => !cloudRuntimeAvailable);
  const [isAuthBootstrapping, setIsAuthBootstrapping] = useState<boolean>(
    () => cloudRuntimeAvailable
  );
  const [cloudAuthError, setCloudAuthError] = useState<string | null>(null);
  const [cloudUserUid, setCloudUserUid] = useState<string | null>(null);
  const [isMembershipReady, setIsMembershipReady] = useState<boolean>(
    () => !cloudRuntimeAvailable
  );
  const [cloudReadRetryNonce, setCloudReadRetryNonce] = useState(0);
  const [bootstrapNonce, setBootstrapNonce] = useState(0);
  const offlineSnapshotCacheKey = `jp-offline-snapshot-${familyId}`;
  const [cloudSnapshot, setCloudSnapshot] = useState<CloudSyncSnapshot | null>(() => {
    // Pre-load the last known snapshot so the auto-restore can proceed on
    // a cold start while offline (RTDB onValue never fires without network).
    if (!cloudRuntimeAvailable || navigator.onLine) return null;
    try {
      const raw = localStorage.getItem(`jp-offline-snapshot-${familyId}`);
      return raw ? (JSON.parse(raw) as CloudSyncSnapshot) : null;
    } catch {
      return null;
    }
  });
  const isFlushingQueueRef = useRef(false);
  const permissionDeniedRetryCountRef = useRef(0);

  useEffect(() => {
    if (!cloudRuntimeAvailable) {
      setIsAuthReady(true);
      return;
    }

    if (!navigator.onLine) {
      // Offline cold start: skip Firebase bootstrap entirely.  The cached
      // snapshot (loaded in useState) lets the app render normally.  The
      // bootstrapNonce effect re-runs this block once the device reconnects.
      setIsAuthBootstrapping(false);
      setIsAuthReady(true);
      setIsMembershipReady(true);
      return;
    }

    let cancelled = false;
    setIsAuthReady(false);
    setIsAuthBootstrapping(true);
    setCloudUserUid(null);
    setIsMembershipReady(false);

    const unsubscribe = observeFirebaseUser(
      (user) => {
        if (cancelled) {
          return;
        }

        setCloudUserUid(user?.uid ?? null);
        if (user) {
          setCloudAuthError(null);
          if (database) {
            // On attend la confirmation (succès OU échec) de l'inscription
            // dans familyMembers avant d'autoriser la lecture de la famille :
            // sans cette attente, la lecture pouvait démarrer juste avant que
            // l'appartenance soit enregistrée et échouer ("permission-denied"),
            // notamment sur un rechargement complet de la page.
            void ensureFamilyMembership(database, familyId, user.uid)
              .catch(() => {
                // Non bloquant : si l'écriture échoue, la lecture de
                // observeFamilySnapshot remontera de toute façon "permission-denied".
              })
              .finally(() => {
                if (!cancelled) {
                  setIsMembershipReady(true);
                }
              });
          } else {
            setIsMembershipReady(true);
          }
        }
      },
      () => {
        if (cancelled) {
          return;
        }

        setCloudUserUid(null);
        setCloudAuthError("auth-unavailable");
        setIsAuthReady(true);
        setIsReady(true);
      }
    );

    void ensureFirebaseAnonymousAuth().catch(() => {
      if (cancelled) {
        return;
      }

      setCloudUserUid(null);
      setIsMembershipReady(false);
      setCloudAuthError("auth-unavailable");
      setIsReady(true);
    }).finally(() => {
      if (cancelled) {
        return;
      }

      setIsAuthBootstrapping(false);
      setIsAuthReady(true);
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
    // bootstrapNonce increments when the device comes back online after an
    // offline cold start, triggering a full Firebase re-bootstrap.
  }, [cloudRuntimeAvailable, bootstrapNonce]);

  const flushPendingQueue = useCallback(async () => {
    if (!isEnabled || !database || !cloudUserUid) {
      return;
    }
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      return;
    }
    if (isFlushingQueueRef.current) {
      return;
    }

    isFlushingQueueRef.current = true;
    try {
      const queue = readPendingQueue(pendingQueueKey);
      // Owner-scoped writes (phase, launchGateCycle, owner settings) must not
      // be replayed from stale offline queues: they can revert a freshly
      // confirmed owner action and create before/during flicker loops.
      const replayableQueue = queue.filter((mutation) => !mutation.canWriteFamilyState);
      if (replayableQueue.length !== queue.length) {
        writePendingQueue(pendingQueueKey, replayableQueue);
      }

      if (replayableQueue.length === 0) {
        return;
      }

      const remaining: CloudSyncWritePayload[] = [];
      for (const mutation of replayableQueue) {
        try {
          await pushCloudSnapshot(database, familyId, mutation);
        } catch {
          remaining.push(mutation);
        }
      }

      writePendingQueue(pendingQueueKey, remaining);
    } finally {
      isFlushingQueueRef.current = false;
    }
  }, [cloudUserUid, database, familyId, isEnabled, pendingQueueKey]);

  useEffect(() => {
    if (!cloudRuntimeAvailable) {
      setIsReady(true);
      return;
    }

    if (!isAuthReady || isAuthBootstrapping) {
      setIsReady(false);
      return;
    }

    if (!cloudUserUid) {
      if (!navigator.onLine) {
        try {
          const hasCachedSnapshot = localStorage.getItem(offlineSnapshotCacheKey) !== null;
          if (hasCachedSnapshot) {
            // Offline with cached data: treat as ready without surfacing an auth
            // error — the RTDB listener will catch up when connectivity returns.
            setIsReady(true);
            return;
          }
        } catch { /* ignore */ }
      }
      setCloudAuthError((previous) => previous ?? "auth-required");
      setIsReady(true);
      return;
    }

    if (!isMembershipReady) {
      setIsReady(false);
      return;
    }

    const unsubscribe = observeFamilySnapshot(
      database,
      familyId,
      (snapshot) => {
        permissionDeniedRetryCountRef.current = 0;
        setCloudAuthError(null);
        setCloudSnapshot(snapshot);
        // Keep a local cache so the app can start offline on next cold boot.
        try { localStorage.setItem(offlineSnapshotCacheKey, JSON.stringify(snapshot)); } catch { }
        setIsReady(true);
      },
      () => {
        if (permissionDeniedRetryCountRef.current >= 2 || !cloudUserUid) {
          setCloudAuthError("permission-denied");
          setIsReady(true);
          return;
        }

        permissionDeniedRetryCountRef.current += 1;
        setCloudAuthError(null);
        setIsReady(false);

        void ensureFamilyMembership(database, familyId, cloudUserUid)
          .catch(() => {
            // Best effort retry only; persistent configuration/rules issues
            // still surface as the cloud access blocked screen.
          })
          .finally(() => {
            setCloudReadRetryNonce((previous) => previous + 1);
          });
      }
    );

    return () => unsubscribe();
  }, [
    cloudRuntimeAvailable,
    cloudUserUid,
    database,
    familyId,
    isAuthBootstrapping,
    isAuthReady,
    isMembershipReady,
    offlineSnapshotCacheKey,
    cloudReadRetryNonce,
  ]);

  const retryCloudAccess = useCallback(async (): Promise<void> => {
    if (!cloudRuntimeAvailable) {
      return;
    }

    permissionDeniedRetryCountRef.current = 0;
    setCloudAuthError(null);
    setIsReady(false);

    if (database && cloudUserUid) {
      try {
        await ensureFamilyMembership(database, familyId, cloudUserUid);
      } catch {
        // Keep best effort behavior; the observer will still surface errors.
      }
    }

    setCloudReadRetryNonce((previous) => previous + 1);
  }, [cloudRuntimeAvailable, database, cloudUserUid, familyId]);

  useEffect(() => {
    if (!cloudRuntimeAvailable || !isAuthReady || !cloudUserUid) {
      return;
    }

    const handleOnline = () => {
      void flushPendingQueue();
    };

    window.addEventListener("online", handleOnline);
    void flushPendingQueue();

    return () => {
      window.removeEventListener("online", handleOnline);
    };
  }, [cloudRuntimeAvailable, cloudUserUid, database, flushPendingQueue, isAuthReady]);

  // When the device reconnects after an offline cold start (cloudUserUid is
  // still null because the bootstrap was skipped), bump bootstrapNonce to
  // trigger the full Firebase auth + snapshot flow.
  useEffect(() => {
    if (!cloudRuntimeAvailable) return;
    const handleOnline = () => {
      if (!cloudUserUid) setBootstrapNonce((n) => n + 1);
    };
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [cloudRuntimeAvailable, cloudUserUid]);

  const enqueuePendingMutation = useCallback(
    (mutation: CloudSyncWritePayload) => {
      const queue = readPendingQueue(pendingQueueKey);
      queue.push(mutation);
      writePendingQueue(pendingQueueKey, queue);
    },
    [pendingQueueKey]
  );

  const pushSnapshot = useCallback(
    async (snapshot: PushSnapshotInput): Promise<boolean> => {
      if (!isEnabled || !database || !cloudUserUid) {
        setCloudAuthError("auth-required");
        return false;
      }

      const mutation: CloudSyncWritePayload = {
        actorUid: snapshot.actorUid,
        canWriteFamilyState: snapshot.canWriteFamilyState,
        familyState: snapshot.familyState,
        ownerCodeHash: snapshot.ownerCodeHash,
        ownerCodePlain: snapshot.ownerCodePlain,
        travelerCodeHash: snapshot.travelerCodeHash,
        travelerCodePlain: snapshot.travelerCodePlain,
        ownerRecoveryHash: snapshot.ownerRecoveryHash,
        ownerRecoveryConfiguredAt: snapshot.ownerRecoveryConfiguredAt,
        profileId: snapshot.profileId,
        surname: snapshot.surname,
        role: snapshot.role,
        profilePasswordHash: snapshot.profilePasswordHash,
        profileRecoveryHash: snapshot.profileRecoveryHash,
        profileRecoveryQuestion: snapshot.profileRecoveryQuestion,
        profileRecoveryAnswer: snapshot.profileRecoveryAnswer,
        profileRecoveryConfiguredAt: snapshot.profileRecoveryConfiguredAt,
        gender: snapshot.gender,
        householdRole: snapshot.householdRole,
        checklist: snapshot.checklist,
        profileCustomChecklistItems: snapshot.profileCustomChecklistItems,
        ownerGlobalChecklistAdditions: snapshot.ownerGlobalChecklistAdditions,
        ownerGlobalChecklistRemovals: snapshot.ownerGlobalChecklistRemovals,
        placeComments: snapshot.placeComments,
        placeVisibilityMap: snapshot.placeVisibilityMap,
        placeSeenMap: snapshot.placeSeenMap,
        placeDayOverrides: snapshot.placeDayOverrides,
        placeDayOrderOverrides: snapshot.placeDayOrderOverrides,
        documentVisibilityMap: snapshot.documentVisibilityMap,
        contentOverrides: snapshot.contentOverrides,
        ownerGlobalDocumentAdditions: snapshot.ownerGlobalDocumentAdditions,
        ownerGlobalDocumentEdits: snapshot.ownerGlobalDocumentEdits,
        ownerGlobalDocumentRemovals: snapshot.ownerGlobalDocumentRemovals,
        ownerGlobalPlaceAdditions: snapshot.ownerGlobalPlaceAdditions,
        profileDestinationSurveyVote: snapshot.profileDestinationSurveyVote,
        challengeReactions: snapshot.challengeReactions,
        challengeBestVotes: snapshot.challengeBestVotes,
        launchGateCycle: snapshot.launchGateCycle,
        launchGateCompletedCycleForProfile: snapshot.launchGateCompletedCycleForProfile,
        gameResults: snapshot.gameResults,
        gameProgress: snapshot.gameProgress,
        candyCrushChallenge: snapshot.candyCrushChallenge,
        phase: snapshot.phase,
        tripStartDate: snapshot.tripStartDate,
        gameScoring: snapshot.gameScoring,
      };

      if (typeof navigator !== "undefined" && !navigator.onLine) {
        enqueuePendingMutation({
          ...mutation,
          canWriteFamilyState: false,
        });
        return;
      }

      try {
        // Re-assert membership before any family write. If the anonymous uid
        // changed or membership was removed, writes under /families/* fail.
        await ensureFamilyMembership(database, familyId, cloudUserUid);
        await ensureProfileMembership(database, familyId, mutation.profileId, cloudUserUid);
        if (mutation.canWriteFamilyState) {
          // Owner-scoped writes depend on ownerMembers/{familyId}/{uid}.
          await ensureOwnerMembership(database, familyId, cloudUserUid);
        }
        const normalizedMutationForPush = {
          ...mutation,
          profileDestinationSurveyVote:
            mutation.phase === "before" ? mutation.profileDestinationSurveyVote : null,
        };
        await pushCloudSnapshot(database, familyId, normalizedMutationForPush);
        setCloudAuthError(null);
        return true;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        const isPermissionDenied = errorMessage.includes("PERMISSION_DENIED");

        if (isPermissionDenied) {
          const hasSurveyVote = Boolean(mutation.profileDestinationSurveyVote);
          const hasSurveyVoteForPush =
            mutation.phase === "before" && Boolean(mutation.profileDestinationSurveyVote);
          const ownerCodeHashLooksValid = /^sha256:[0-9a-f]{64}$/.test(
            mutation.ownerCodeHash.trim()
          );
          const runtimeProjectId =
            (database.app.options as { projectId?: string })?.projectId
            ?? null;
          const runtimeDatabaseUrl =
            (database.app.options as { databaseURL?: string })?.databaseURL
            ?? ((import.meta.env.VITE_FIREBASE_DATABASE_URL as string | undefined) ?? null);
          console.error(
            `[cloud-sync] permission-denied runtime projectId=${runtimeProjectId ?? "null"} databaseURL=${runtimeDatabaseUrl ?? "null"} familyId=${familyId} actorUid=${cloudUserUid} profileId=${mutation.profileId} phase=${mutation.phase} canWriteFamilyState=${String(mutation.canWriteFamilyState)} hasSurveyVote=${String(hasSurveyVote)} hasSurveyVoteForPush=${String(hasSurveyVoteForPush)} ownerCodeHashLooksValid=${String(ownerCodeHashLooksValid)}`
          );
          console.error("[cloud-sync] permission-denied details", {
            familyId,
            actorUid: cloudUserUid,
            projectId: runtimeProjectId,
            databaseURL: runtimeDatabaseUrl,
            canWriteFamilyState: mutation.canWriteFamilyState,
            phase: mutation.phase,
            profileId: mutation.profileId,
            hasSurveyVote,
            hasSurveyVoteForPush,
            ownerCodeHashLooksValid,
          });
        }

        if (mutation.canWriteFamilyState && isPermissionDenied) {
          try {
            await ensureFamilyMembership(database, familyId, cloudUserUid);
            await ensureOwnerMembership(database, familyId, cloudUserUid);
            await pushCloudSnapshot(database, familyId, {
              ...mutation,
              profileDestinationSurveyVote:
                mutation.phase === "before" ? mutation.profileDestinationSurveyVote : null,
            });
            setCloudAuthError(null);
            return true;
          } catch {
            if (mutation.resetDestinationSurvey) {
              try {
                // Firebase rules can deny destinationSurvey resets in the same
                // owner phase-change write. Fall back to phase update only to
                // prevent owner UI loops/flicker on lock/unlock toggles.
                await pushCloudSnapshot(database, familyId, {
                  ...mutation,
                  resetDestinationSurvey: false,
                });
                setCloudAuthError(null);
                return true;
              } catch {
                // Fall through to queue + logging below.
              }
            }
          }
        }

        if (
          isPermissionDenied &&
          mutation.phase === "before" &&
          mutation.profileDestinationSurveyVote
        ) {
          try {
            await ensureFamilyMembership(database, familyId, cloudUserUid);
            await pushDestinationSurveyVoteOnly(database, familyId, {
              actorUid: mutation.actorUid,
              profileId: mutation.profileId,
              vote: mutation.profileDestinationSurveyVote,
              phase: mutation.phase,
            });
            console.info("[cloud-sync] survey-only fallback write succeeded", {
              familyId,
              profileId: mutation.profileId,
            });
            setCloudAuthError(null);
            return true;
          } catch (fallbackError) {
            console.error("[cloud-sync] survey-only fallback write failed", fallbackError, {
              familyId,
              profileId: mutation.profileId,
            });
          }
        }

        if (isPermissionDenied) {
          // PERMISSION_DENIED is generally a permanent condition until config/rules/auth
          // are fixed; re-queueing would create endless retries and UI instability.
          writePendingQueue(pendingQueueKey, []);
          return false;
        }

        // Conservé volontairement (pas seulement en dev) : un échec d'écriture
        // silencieux ici est difficile à diagnostiquer sans ce log.
        console.error("[cloud-sync] pushCloudSnapshot a échoué :", err, mutation);
        // Keep the app usable on transient write failures; read-subscription errors
        // still control the blocking cloud access state. Never queue owner-scoped
        // family writes, otherwise stale replay can revert phase transitions.
        enqueuePendingMutation({
          ...mutation,
          canWriteFamilyState: false,
        });
        return false;
      }
    },
    [cloudUserUid, database, enqueuePendingMutation, familyId, isEnabled, pendingQueueKey]
  );

  const claimRoleForProfile = useCallback(
    async (profileId: string, surname: string): Promise<ClaimRoleResult | null> => {
      if (!isEnabled || !database || !cloudUserUid) {
        setCloudAuthError("auth-required");
        return null;
      }

      try {
        const result = await claimProfileRole(
          database,
          familyId,
          profileId,
          surname,
          cloudUserUid
        );
        setCloudAuthError(null);
        return result;
      } catch {
        // The root-level transaction is structurally denied by Firebase security
        // rules, so this failure is expected and handled locally via auto-push.
        // Do NOT propagate a fatal auth error here.
        return null;
      }
    },
    [cloudUserUid, database, familyId, isEnabled]
  );

  const pushOwnerPhaseChange = useCallback(
    async (payload: {
      phase: TravelPhase;
      launchGateCycle?: number;
      resetDestinationSurvey?: boolean;
      profileIdsForSurveyReset?: string[];
    }): Promise<boolean> => {
      if (!isEnabled || !database || !cloudUserUid) {
        setCloudAuthError("auth-required");
        return false;
      }

      try {
        await ensureFamilyMembership(database, familyId, cloudUserUid);
        await ensureOwnerMembership(database, familyId, cloudUserUid);
        await pushFamilyPhaseChange(database, familyId, payload);
        setCloudAuthError(null);
        return true;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        const isPermissionDenied = errorMessage.includes("PERMISSION_DENIED");
        if (isPermissionDenied) {
          const runtimeProjectId =
            (database.app.options as { projectId?: string })?.projectId ?? null;
          const runtimeDatabaseUrl =
            (database.app.options as { databaseURL?: string })?.databaseURL
            ?? ((import.meta.env.VITE_FIREBASE_DATABASE_URL as string | undefined) ?? null);
          console.error(
            `[cloud-sync] owner-phase-change denied projectId=${runtimeProjectId ?? "null"} databaseURL=${runtimeDatabaseUrl ?? "null"} familyId=${familyId} actorUid=${cloudUserUid} phase=${payload.phase} launchGateCycle=${String(payload.launchGateCycle ?? "none")} resetDestinationSurvey=${String(Boolean(payload.resetDestinationSurvey))}`
          );
          console.error("[cloud-sync] owner-phase-change denied details", {
            familyId,
            actorUid: cloudUserUid,
            projectId: runtimeProjectId,
            databaseURL: runtimeDatabaseUrl,
            phase: payload.phase,
            launchGateCycle: payload.launchGateCycle,
            resetDestinationSurvey: Boolean(payload.resetDestinationSurvey),
            profileIdsForSurveyResetCount: payload.profileIdsForSurveyReset?.length ?? 0,
          });
        }
        return false;
      }
    },
    [cloudUserUid, database, familyId, isEnabled]
  );

  const deleteProfile = useCallback(
    async (profileIdToDelete: string): Promise<void> => {
      if (!isEnabled || !database || !cloudUserUid) {
        throw new Error("auth-required");
      }
      await deleteProfileFromCloud(database, familyId, profileIdToDelete);
    },
    [cloudUserUid, database, familyId, isEnabled]
  );

  const setGameDayOverride = useCallback(
    async (day: number, value: GameDayOverride | null): Promise<void> => {
      if (!isEnabled || !database || !cloudUserUid) {
        throw new Error("auth-required");
      }
      await pushGameDayOverride(database, familyId, day, value);
    },
    [cloudUserUid, database, familyId, isEnabled]
  );

  const setPlaceVisibility = useCallback(
    async (placeId: string, visibility: PlaceVisibilityState | null): Promise<void> => {
      if (!isEnabled || !database || !cloudUserUid) {
        throw new Error("auth-required");
      }

      await ensureFamilyMembership(database, familyId, cloudUserUid);
      await ensureOwnerMembership(database, familyId, cloudUserUid);
      await pushPlaceVisibility(database, familyId, placeId, visibility);
    },
    [cloudUserUid, database, familyId, isEnabled]
  );

  const setPlaceSeen = useCallback(
    async (placeId: string, seen: PlaceSeenState | null): Promise<void> => {
      if (!isEnabled || !database || !cloudUserUid) {
        throw new Error("auth-required");
      }

      await ensureFamilyMembership(database, familyId, cloudUserUid);
      await ensureOwnerMembership(database, familyId, cloudUserUid);
      await pushPlaceSeen(database, familyId, placeId, seen);
    },
    [cloudUserUid, database, familyId, isEnabled]
  );

  const setContentOverride = useCallback(
    async (
      source: ContentSource,
      itemId: string,
      patch: ContentOverridePatch | null
    ): Promise<void> => {
      if (!isEnabled || !database || !cloudUserUid) {
        throw new Error("auth-required");
      }

      await ensureFamilyMembership(database, familyId, cloudUserUid);
      await ensureOwnerMembership(database, familyId, cloudUserUid);
      await pushContentOverride(database, familyId, source, itemId, patch);
    },
    [cloudUserUid, database, familyId, isEnabled]
  );

  const setPlaceDayOverride = useCallback(
    async (
      placeId: string,
      days: number[] | null,
      dayOrderByDay?: Record<number, number> | null
    ): Promise<void> => {
      if (!isEnabled || !database || !cloudUserUid) {
        throw new Error("auth-required");
      }

      const runtimeProjectId =
        (database.app.options as { projectId?: string })?.projectId ?? null;
      const runtimeDatabaseUrl =
        (database.app.options as { databaseURL?: string })?.databaseURL
        ?? ((import.meta.env.VITE_FIREBASE_DATABASE_URL as string | undefined) ?? null);

      console.info("[place-day-override] cloud write start", {
        familyId,
        placeId,
        days,
        dayOrderByDay,
        actorUid: cloudUserUid,
        projectId: runtimeProjectId,
        databaseURL: runtimeDatabaseUrl,
      });

      try {
        await ensureFamilyMembership(database, familyId, cloudUserUid);
        console.info("[place-day-override] family membership ok", {
          familyId,
          actorUid: cloudUserUid,
        });

        await ensureOwnerMembership(database, familyId, cloudUserUid);
        console.info("[place-day-override] owner membership ok", {
          familyId,
          actorUid: cloudUserUid,
        });

        await pushPlaceDayOverride(database, familyId, placeId, days, dayOrderByDay);
        console.info("[place-day-override] cloud write committed", {
          familyId,
          placeId,
          days,
          dayOrderByDay,
          actorUid: cloudUserUid,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("[place-day-override] cloud write failed", {
          familyId,
          placeId,
          days,
          dayOrderByDay,
          actorUid: cloudUserUid,
          projectId: runtimeProjectId,
          databaseURL: runtimeDatabaseUrl,
          errorMessage,
          error,
        });
        throw error;
      }
    },
    [cloudUserUid, database, familyId, isEnabled]
  );

  const setTripStartDate = useCallback(
    async (tripStartDate: string): Promise<boolean> => {
      if (!isEnabled || !database || !cloudUserUid) {
        setCloudAuthError("auth-required");
        return false;
      }

      try {
        await ensureFamilyMembership(database, familyId, cloudUserUid);
        await ensureOwnerMembership(database, familyId, cloudUserUid);
        await pushTripStartDate(database, familyId, tripStartDate);
        setCloudAuthError(null);
        return true;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        const isPermissionDenied = errorMessage.includes("PERMISSION_DENIED");
        if (isPermissionDenied) {
          const runtimeProjectId =
            (database.app.options as { projectId?: string })?.projectId ?? null;
          const runtimeDatabaseUrl =
            (database.app.options as { databaseURL?: string })?.databaseURL
            ?? ((import.meta.env.VITE_FIREBASE_DATABASE_URL as string | undefined) ?? null);
          console.error(
            `[cloud-sync] trip-start-date denied projectId=${runtimeProjectId ?? "null"} databaseURL=${runtimeDatabaseUrl ?? "null"} familyId=${familyId} actorUid=${cloudUserUid} tripStartDate=${tripStartDate}`
          );
        }
        return false;
      }
    },
    [cloudUserUid, database, familyId, isEnabled]
  );

  const setGameScoring = useCallback(
    async (scoring: GameScoringConfig): Promise<boolean> => {
      if (!isEnabled || !database || !cloudUserUid) {
        setCloudAuthError("auth-required");
        return false;
      }

      try {
        await ensureFamilyMembership(database, familyId, cloudUserUid);
        await ensureOwnerMembership(database, familyId, cloudUserUid);
        await pushGameScoring(database, familyId, scoring);
        setCloudAuthError(null);
        return true;
      } catch (error) {
        console.error("[cloud-sync] game scoring write failed", {
          familyId,
          actorUid: cloudUserUid,
          error,
        });
        return false;
      }
    },
    [cloudUserUid, database, familyId, isEnabled]
  );

  const resetGameResults = useCallback(
    async (day?: number): Promise<void> => {
      if (!isEnabled || !database || !cloudUserUid || !cloudSnapshot) {
        throw new Error("auth-required");
      }
      const currentResultsByProfile: Record<string, CloudGameHistoryEntry[]> = {};
      const currentProgressByProfile: Record<string, CloudGameProgress> = {};
      const currentChallengeReactionsByDay = cloudSnapshot.challengeReactions ?? {};
      const currentChallengeBestVotesByDay = cloudSnapshot.challengeBestVotes ?? {};
      for (const [profileId, profileState] of Object.entries(cloudSnapshot.profiles)) {
        currentResultsByProfile[profileId] = profileState.gameResults;
        currentProgressByProfile[profileId] = profileState.gameProgress;
      }
      await resetGameResultsInCloud(
        database,
        familyId,
        currentResultsByProfile,
        currentProgressByProfile,
        currentChallengeReactionsByDay,
        currentChallengeBestVotesByDay,
        day
      );
    },
    [cloudSnapshot, cloudUserUid, database, familyId, isEnabled]
  );

  // Réinitialisation propriétaire de la partie EN COURS (non terminée) d'un
  // profil donné (ne touche pas gameResults, cf. cloudSyncProvider.ts).
  const resetGameProgress = useCallback(
    async (profileId: string): Promise<void> => {
      if (!isEnabled || !database || !cloudUserUid) {
        throw new Error("auth-required");
      }
      await resetGameProgressInCloud(database, familyId, profileId);
    },
    [cloudUserUid, database, familyId, isEnabled]
  );

  // À appeler dès que l'app détermine, côté client, que le profil courant est
  // bien le propriétaire (ownerProfileId === profile.id). Enregistre cet
  // appareil/navigateur comme un "ownerMember" reconnu par les règles Firebase,
  // ce qui permet à plusieurs appareils d'agir comme propriétaire (chacun ayant
  // sa propre identité anonyme Firebase, distincte d'un appareil à l'autre).
  const registerAsOwnerDevice = useCallback(async (): Promise<void> => {
    if (!isEnabled || !database || !cloudUserUid) {
      return;
    }
    try {
      await ensureOwnerMembership(database, familyId, cloudUserUid);
    } catch {
      // Non bloquant : les écritures réservées au propriétaire échoueront
      // simplement si cet enregistrement n'a pas abouti.
    }
  }, [cloudUserUid, database, familyId, isEnabled]);

  // Carnet de visite : chemin séparé de families/$familyId, chargé à la
  // demande par lieu (cf. observePlaceVisitLog dans cloudSyncProvider.ts) —
  // pas de dépendance à ownerMembers, voyageur et propriétaire peuvent tous
  // les deux écrire (le rôle "visiteur" est refusé côté règles Firebase en
  // lisant families/$familyId/profiles/$authorProfileId/role).
  const subscribeToPlaceVisitLog = useCallback(
    (
      placeId: string,
      onSnapshot: (log: CloudCarnetVisiteLog) => void,
      onError?: () => void
    ): (() => void) => {
      if (!isEnabled || !database) {
        return () => {};
      }
      return observePlaceVisitLog(database, familyId, placeId, onSnapshot, onError);
    },
    [database, familyId, isEnabled]
  );

  const upsertCarnetVisiteEntry = useCallback(
    async (entry: CloudCarnetVisiteEntry): Promise<void> => {
      if (!isEnabled || !database || !cloudUserUid) {
        throw new Error("auth-required");
      }

      await ensureFamilyMembership(database, familyId, cloudUserUid);
      await upsertPlaceVisitLogEntry(database, familyId, entry);
    },
    [cloudUserUid, database, familyId, isEnabled]
  );

  const deleteCarnetVisiteEntry = useCallback(
    async (placeId: string, entryId: string): Promise<void> => {
      if (!isEnabled || !database || !cloudUserUid) {
        throw new Error("auth-required");
      }

      await ensureFamilyMembership(database, familyId, cloudUserUid);
      await deletePlaceVisitLogEntry(database, familyId, placeId, entryId);
    },
    [cloudUserUid, database, familyId, isEnabled]
  );

  // Même principe que le carnet de visite des lieux ci-dessus, pour les
  // rubriques de contenu (Histoire, Culture et tradition, Géographie et
  // économie) — chemin séparé contentVisitLogs, chargé à la demande par
  // [source, itemId], sans photos.
  const subscribeToContentVisitLog = useCallback(
    (
      source: ContentSource,
      itemId: string,
      onSnapshot: (log: CloudCarnetContentLog) => void,
      onError?: () => void
    ): (() => void) => {
      if (!isEnabled || !database) {
        return () => {};
      }
      return observeContentVisitLog(database, familyId, source, itemId, onSnapshot, onError);
    },
    [database, familyId, isEnabled]
  );

  const upsertCarnetContentEntry = useCallback(
    async (entry: CloudCarnetContentEntry): Promise<void> => {
      if (!isEnabled || !database || !cloudUserUid) {
        throw new Error("auth-required");
      }

      await ensureFamilyMembership(database, familyId, cloudUserUid);
      await upsertContentVisitLogEntry(database, familyId, entry);
    },
    [cloudUserUid, database, familyId, isEnabled]
  );

  const deleteCarnetContentEntry = useCallback(
    async (source: ContentSource, itemId: string, entryId: string): Promise<void> => {
      if (!isEnabled || !database || !cloudUserUid) {
        throw new Error("auth-required");
      }

      await ensureFamilyMembership(database, familyId, cloudUserUid);
      await deleteContentVisitLogEntry(database, familyId, source, itemId, entryId);
    },
    [cloudUserUid, database, familyId, isEnabled]
  );

  // Photos ajoutées par le propriétaire à un document existant (Documents et
  // informations importants) : chemin séparé documentPhotos, chargé à la
  // demande pendant que la fiche "Docs" de ce document est ouverte — même
  // esprit que subscribeToPlaceVisitLog ci-dessus, mais écriture réservée au
  // propriétaire (ensureOwnerMembership), comme setPlaceVisibility.
  const subscribeToDocumentPhotos = useCallback(
    (
      documentId: string,
      onSnapshot: (photos: CloudDocumentPhotoMap) => void,
      onError?: () => void
    ): (() => void) => {
      if (!isEnabled || !database) {
        return () => {};
      }
      return observeDocumentPhotos(database, familyId, documentId, onSnapshot, onError);
    },
    [database, familyId, isEnabled]
  );

  const addDocumentPhoto = useCallback(
    async (documentId: string, photoId: string, dataUri: string): Promise<void> => {
      if (!isEnabled || !database || !cloudUserUid) {
        throw new Error("auth-required");
      }

      await ensureFamilyMembership(database, familyId, cloudUserUid);
      await ensureOwnerMembership(database, familyId, cloudUserUid);
      await upsertDocumentPhoto(database, familyId, documentId, photoId, dataUri);
    },
    [cloudUserUid, database, familyId, isEnabled]
  );

  const removeDocumentPhoto = useCallback(
    async (documentId: string, photoId: string): Promise<void> => {
      if (!isEnabled || !database || !cloudUserUid) {
        throw new Error("auth-required");
      }

      await ensureFamilyMembership(database, familyId, cloudUserUid);
      await ensureOwnerMembership(database, familyId, cloudUserUid);
      await deleteDocumentPhoto(database, familyId, documentId, photoId);
    },
    [cloudUserUid, database, familyId, isEnabled]
  );

  // Chat familial (story 28.1) : chargé à la demande pendant que la rubrique
  // Chat est ouverte, même esprit que subscribeToDocumentPhotos ci-dessus.
  const subscribeToChatMessages = useCallback(
    (
      conversationId: string,
      messageLimit: number,
      onSnapshot: (messages: CloudChatMessagesLog) => void,
      onError?: () => void
    ): (() => void) => {
      if (!isEnabled || !database) {
        return () => {};
      }
      return observeChatMessages(database, familyId, conversationId, messageLimit, onSnapshot, onError);
    },
    [database, familyId, isEnabled]
  );

  const sendChatMessageToCloud = useCallback(
    async (message: CloudChatMessage): Promise<void> => {
      if (!isEnabled || !database || !cloudUserUid) {
        throw new Error("auth-required");
      }

      await ensureFamilyMembership(database, familyId, cloudUserUid);
      await sendChatMessage(database, familyId, message);
    },
    [cloudUserUid, database, familyId, isEnabled]
  );

  // Idempotent : crée la conversation "Voyage" si elle n'existe pas encore,
  // sinon y ajoute les profils proprietaire/utilisateur pas encore membres
  // (nouveau profil créé après coup). Appelé automatiquement dès que la
  // liste des profils change (voir l'effet dédié dans App.tsx).
  const ensureVoyageConversation = useCallback(
    async (eligibleProfiles: ChatMemberProfile[], createdByProfileId: string): Promise<void> => {
      if (!isEnabled || !database || !cloudUserUid) {
        return;
      }

      await ensureFamilyMembership(database, familyId, cloudUserUid);
      await ensureVoyageConversationMembers(database, familyId, eligibleProfiles, createdByProfileId);
    },
    [cloudUserUid, database, familyId, isEnabled]
  );

  // Story 28.2 : liste de toutes les conversations de la famille, chargée à
  // la demande pendant que l'écran d'accueil du Chat est ouvert (même
  // esprit que subscribeToChatMessages ci-dessus).
  const subscribeToChatConversations = useCallback(
    (
      onSnapshot: (conversations: CloudChatConversationsMap) => void,
      onError?: () => void
    ): (() => void) => {
      if (!isEnabled || !database) {
        return () => {};
      }
      return observeChatConversations(database, familyId, onSnapshot, onError);
    },
    [database, familyId, isEnabled]
  );

  const createChatConversationInCloud = useCallback(
    async (conversation: CloudChatConversation): Promise<void> => {
      if (!isEnabled || !database || !cloudUserUid) {
        throw new Error("auth-required");
      }

      await ensureFamilyMembership(database, familyId, cloudUserUid);
      await createChatConversation(database, familyId, conversation);
    },
    [cloudUserUid, database, familyId, isEnabled]
  );

  const renameChatConversationInCloud = useCallback(
    async (conversationId: string, name: string): Promise<void> => {
      if (!isEnabled || !database || !cloudUserUid) {
        throw new Error("auth-required");
      }

      await ensureFamilyMembership(database, familyId, cloudUserUid);
      await renameChatConversation(database, familyId, conversationId, name);
    },
    [cloudUserUid, database, familyId, isEnabled]
  );

  const leaveChatConversationInCloud = useCallback(
    async (conversationId: string, profileId: string): Promise<void> => {
      if (!isEnabled || !database || !cloudUserUid) {
        throw new Error("auth-required");
      }

      await ensureFamilyMembership(database, familyId, cloudUserUid);
      await leaveChatConversation(database, familyId, conversationId, profileId);
    },
    [cloudUserUid, database, familyId, isEnabled]
  );

  // Badge de messages non lus (story 28.4) : chargé en continu (pas "à la
  // demande" comme les autres abonnements Chat ci-dessus) car la pastille de
  // navigation doit rester à jour même quand la rubrique Chat n'est pas
  // ouverte, cf. useChatUnreadBadge.
  const subscribeToChatReadState = useCallback(
    (onSnapshot: (readState: CloudChatReadStateMap) => void, onError?: () => void): (() => void) => {
      if (!isEnabled || !database) {
        return () => {};
      }
      return observeChatReadState(database, familyId, onSnapshot, onError);
    },
    [database, familyId, isEnabled]
  );

  const markChatConversationReadInCloud = useCallback(
    async (conversationId: string, profileId: string, lastReadAt: number): Promise<void> => {
      if (!isEnabled || !database || !cloudUserUid) {
        throw new Error("auth-required");
      }

      await ensureFamilyMembership(database, familyId, cloudUserUid);
      await markChatConversationRead(database, familyId, conversationId, profileId, cloudUserUid, lastReadAt);
    },
    [cloudUserUid, database, familyId, isEnabled]
  );

  // Sondages du propriétaire dans "Voyage" (story 28.3) : la création du
  // sondage réutilise sendChatMessageToCloud ci-dessus (c'est un simple
  // message d'un kind particulier), seules la réponse et la clôture ont
  // besoin d'un chemin d'écriture dédié.
  const submitChatPollResponseInCloud = useCallback(
    async (
      conversationId: string,
      messageId: string,
      response: CloudChatPollResponse
    ): Promise<void> => {
      if (!isEnabled || !database || !cloudUserUid) {
        throw new Error("auth-required");
      }

      await ensureFamilyMembership(database, familyId, cloudUserUid);
      await submitChatPollResponse(database, familyId, conversationId, messageId, response);
    },
    [cloudUserUid, database, familyId, isEnabled]
  );

  const closeChatPollInCloud = useCallback(
    async (conversationId: string, messageId: string): Promise<void> => {
      if (!isEnabled || !database || !cloudUserUid) {
        throw new Error("auth-required");
      }

      await ensureFamilyMembership(database, familyId, cloudUserUid);
      await ensureOwnerMembership(database, familyId, cloudUserUid);
      await closeChatPoll(database, familyId, conversationId, messageId);
    },
    [cloudUserUid, database, familyId, isEnabled]
  );

  return {
    cloudEnabled: cloudRuntimeAvailable,
    cloudReady: isReady,
    cloudAuthError,
    cloudActorUid: cloudUserUid,
    cloudSnapshot,
    pushSnapshot,
    claimRoleForProfile,
    deleteProfile,
    setGameDayOverride,
    setPlaceVisibility,
    setPlaceSeen,
    subscribeToPlaceVisitLog,
    upsertCarnetVisiteEntry,
    deleteCarnetVisiteEntry,
    subscribeToContentVisitLog,
    upsertCarnetContentEntry,
    deleteCarnetContentEntry,
    subscribeToDocumentPhotos,
    addDocumentPhoto,
    removeDocumentPhoto,
    subscribeToChatMessages,
    sendChatMessage: sendChatMessageToCloud,
    ensureVoyageConversation,
    subscribeToChatConversations,
    createChatConversation: createChatConversationInCloud,
    renameChatConversation: renameChatConversationInCloud,
    leaveChatConversation: leaveChatConversationInCloud,
    subscribeToChatReadState,
    markChatConversationRead: markChatConversationReadInCloud,
    submitChatPollResponse: submitChatPollResponseInCloud,
    closeChatPoll: closeChatPollInCloud,
    setPlaceDayOverride,
    setContentOverride,
    setTripStartDate,
    setGameScoring,
    resetGameResults,
    resetGameProgress,
    registerAsOwnerDevice,
    pushOwnerPhaseChange,
    retryCloudAccess,
    familyId,
  };
}
