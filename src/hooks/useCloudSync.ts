import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { type Role, type SharedFamilyState } from "../app/owner-policy";
import {
  claimProfileRole,
  deleteProfileFromCloud,
  ensureFamilyMembership,
  ensureOwnerMembership,
  observeFamilySnapshot,
  pushDestinationSurveyVoteOnly,
  pushCloudSnapshot,
  pushGameDayOverride,
  resetGameProgressInCloud,
  resetGameResultsInCloud,
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
  CloudDestinationSurveyVote,
  CloudGameHistoryEntry,
  CloudGameProgress,
  CloudPlaceCommentsByPlace,
  CloudSyncSnapshot,
  CloudSyncWritePayload,
  GameDayOverride,
  ProfileGender,
  ProfileHouseholdRole,
  TravelPhase,
} from "../types/cloud";

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
  profileDestinationSurveyVote?: CloudDestinationSurveyVote | null;
  gameResults: CloudGameHistoryEntry[];
  gameProgress: CloudGameProgress;
  phase: TravelPhase;
  tripStartDate?: string | null;
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
  const [cloudSnapshot, setCloudSnapshot] = useState<CloudSyncSnapshot | null>(null);
  const isFlushingQueueRef = useRef(false);

  useEffect(() => {
    if (!cloudRuntimeAvailable) {
      setIsAuthReady(true);
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
  }, [cloudRuntimeAvailable]);

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
      if (queue.length === 0) {
        return;
      }

      const remaining: CloudSyncWritePayload[] = [];
      for (const mutation of queue) {
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
        setCloudAuthError(null);
        setCloudSnapshot(snapshot);
        setIsReady(true);
      },
      () => {
        setCloudAuthError("permission-denied");
        setIsReady(true);
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
  ]);

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

  const enqueuePendingMutation = useCallback(
    (mutation: CloudSyncWritePayload) => {
      const queue = readPendingQueue(pendingQueueKey);
      queue.push(mutation);
      writePendingQueue(pendingQueueKey, queue);
    },
    [pendingQueueKey]
  );

  const pushSnapshot = useCallback(
    async (snapshot: PushSnapshotInput) => {
      if (!isEnabled || !database || !cloudUserUid) {
        setCloudAuthError("auth-required");
        return;
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
        profileDestinationSurveyVote: snapshot.profileDestinationSurveyVote,
        gameResults: snapshot.gameResults,
        gameProgress: snapshot.gameProgress,
        phase: snapshot.phase,
        tripStartDate: snapshot.tripStartDate,
      };

      if (typeof navigator !== "undefined" && !navigator.onLine) {
        enqueuePendingMutation(mutation);
        return;
      }

      try {
        if (mutation.canWriteFamilyState) {
          // Owner-scoped writes depend on ownerMembers/{familyId}/{uid}.
          await ensureOwnerMembership(database, familyId, cloudUserUid);
        }
        await pushCloudSnapshot(database, familyId, mutation);
        setCloudAuthError(null);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        const isPermissionDenied = errorMessage.includes("PERMISSION_DENIED");

        if (isPermissionDenied) {
          const hasSurveyVote = Boolean(mutation.profileDestinationSurveyVote);
          console.error("[cloud-sync] permission-denied details", {
            familyId,
            actorUid: cloudUserUid,
            projectId: (database.app.options as { projectId?: string })?.projectId,
            databaseURL: (database.app.options as { databaseURL?: string })?.databaseURL,
            canWriteFamilyState: mutation.canWriteFamilyState,
            phase: mutation.phase,
            profileId: mutation.profileId,
            hasSurveyVote,
          });
        }

        if (mutation.canWriteFamilyState && isPermissionDenied) {
          try {
            await ensureOwnerMembership(database, familyId, cloudUserUid);
            await pushCloudSnapshot(database, familyId, mutation);
            setCloudAuthError(null);
            return;
          } catch {
            // Fall through to queue + logging below.
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
            return;
          } catch (fallbackError) {
            console.error("[cloud-sync] survey-only fallback write failed", fallbackError, {
              familyId,
              profileId: mutation.profileId,
            });
          }
        }

        // Conservé volontairement (pas seulement en dev) : un échec d'écriture
        // silencieux ici est difficile à diagnostiquer sans ce log.
        console.error("[cloud-sync] pushCloudSnapshot a échoué :", err, mutation);
        // Keep the app usable on transient write failures; read-subscription errors
        // still control the blocking cloud access state.
        enqueuePendingMutation(mutation);
      }
    },
    [cloudUserUid, database, enqueuePendingMutation, familyId, isEnabled]
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
        setCloudAuthError("permission-denied");
        return null;
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

  const resetGameResults = useCallback(
    async (day?: number): Promise<void> => {
      if (!isEnabled || !database || !cloudUserUid || !cloudSnapshot) {
        throw new Error("auth-required");
      }
      const currentResultsByProfile: Record<string, CloudGameHistoryEntry[]> = {};
      const currentProgressByProfile: Record<string, CloudGameProgress> = {};
      for (const [profileId, profileState] of Object.entries(cloudSnapshot.profiles)) {
        currentResultsByProfile[profileId] = profileState.gameResults;
        currentProgressByProfile[profileId] = profileState.gameProgress;
      }
      await resetGameResultsInCloud(
        database,
        familyId,
        currentResultsByProfile,
        currentProgressByProfile,
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
    resetGameResults,
    resetGameProgress,
    registerAsOwnerDevice,
    familyId,
  };
}
