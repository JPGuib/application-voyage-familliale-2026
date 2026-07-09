import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { type Role, type SharedFamilyState } from "../app/owner-policy";
import {
  claimProfileRole,
  observeFamilySnapshot,
  pushCloudSnapshot,
} from "../services/cloudSyncProvider";
import {
  getFirebaseDatabaseInstance,
  isFirebaseConfigured,
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
  familyState: SharedFamilyState;
  ownerCodeHash: string;
  profileId: string;
  surname: string;
  role: Role;
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
  const familyId = (import.meta.env.VITE_FAMILY_SYNC_ID as string | undefined) || "famille-voyage-2026";
  const pendingQueueKey = useMemo(() => getPendingQueueKey(familyId), [familyId]);

  const [isReady, setIsReady] = useState<boolean>(() => !isEnabled || !database);
  const [cloudSnapshot, setCloudSnapshot] = useState<CloudSyncSnapshot | null>(null);
  const isFlushingQueueRef = useRef(false);

  const flushPendingQueue = useCallback(async () => {
    if (!isEnabled || !database) {
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
  }, [database, familyId, isEnabled, pendingQueueKey]);

  useEffect(() => {
    if (!isEnabled || !database) {
      setIsReady(true);
      return;
    }

    const unsubscribe = observeFamilySnapshot(
      database,
      familyId,
      (snapshot) => {
        setCloudSnapshot(snapshot);
        setIsReady(true);
      },
      () => {
        setIsReady(true);
      }
    );

    return () => unsubscribe();
  }, [database, familyId, isEnabled]);

  useEffect(() => {
    if (!isEnabled || !database) {
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
  }, [database, flushPendingQueue, isEnabled]);

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
      if (!isEnabled || !database) {
        return;
      }

      const mutation: CloudSyncWritePayload = {
        familyState: snapshot.familyState,
        ownerCodeHash: snapshot.ownerCodeHash,
        profileId: snapshot.profileId,
        surname: snapshot.surname,
        role: snapshot.role,
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
      } catch {
        enqueuePendingMutation(mutation);
      }
    },
    [database, enqueuePendingMutation, familyId, isEnabled]
  );

  const claimRoleForProfile = useCallback(
    async (profileId: string, surname: string): Promise<ClaimRoleResult | null> => {
      if (!isEnabled || !database) {
        return null;
      }

      return claimProfileRole(database, familyId, profileId, surname);
    },
    [database, familyId, isEnabled]
  );

  return {
    cloudEnabled: isEnabled && Boolean(database),
    cloudReady: isReady,
    cloudSnapshot,
    pushSnapshot,
    claimRoleForProfile,
    familyId,
  };
}
