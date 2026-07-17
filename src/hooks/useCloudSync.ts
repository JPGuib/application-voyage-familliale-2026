import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { type Role, type SharedFamilyState } from "../app/owner-policy";
import {
  claimProfileRole,
  observeFamilySnapshot,
  pushCloudSnapshot,
} from "../services/cloudSyncProvider";
import {
  ensureFirebaseAnonymousAuth,
  getFirebaseAuthInstance,
  getFirebaseDatabaseInstance,
  isFirebaseConfigured,
  observeFirebaseUser,
} from "../services/firebaseConfig";
import type {
  ChecklistState,
  CloudGameHistoryEntry,
  CloudSyncSnapshot,
  CloudSyncWritePayload,
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
  ownerRecoveryHash?: string;
  ownerRecoveryConfiguredAt?: number;
  profileId: string;
  surname: string;
  role: Role;
  profilePasswordHash?: string;
  profileRecoveryHash?: string;
  profileRecoveryConfiguredAt?: number;
  checklist: ChecklistState;
  gameResults: CloudGameHistoryEntry[];
  phase: TravelPhase;
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

    const unsubscribe = observeFirebaseUser(
      (user) => {
        if (cancelled) {
          return;
        }

        setCloudUserUid(user?.uid ?? null);
        if (user) {
          setCloudAuthError(null);
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
        ownerRecoveryHash: snapshot.ownerRecoveryHash,
        ownerRecoveryConfiguredAt: snapshot.ownerRecoveryConfiguredAt,
        profileId: snapshot.profileId,
        surname: snapshot.surname,
        role: snapshot.role,
        profilePasswordHash: snapshot.profilePasswordHash,
        profileRecoveryHash: snapshot.profileRecoveryHash,
        profileRecoveryConfiguredAt: snapshot.profileRecoveryConfiguredAt,
        checklist: snapshot.checklist,
        gameResults: snapshot.gameResults,
        phase: snapshot.phase,
      };

      if (typeof navigator !== "undefined" && !navigator.onLine) {
        enqueuePendingMutation(mutation);
        return;
      }

      try {
        await pushCloudSnapshot(database, familyId, mutation);
        setCloudAuthError(null);
      } catch {
        setCloudAuthError("permission-denied");
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

  return {
    cloudEnabled: cloudRuntimeAvailable,
    cloudReady: isReady,
    cloudAuthError,
    cloudActorUid: cloudUserUid,
    cloudSnapshot,
    pushSnapshot,
    claimRoleForProfile,
    familyId,
  };
}
