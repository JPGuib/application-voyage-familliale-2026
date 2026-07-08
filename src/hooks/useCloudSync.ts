import { useCallback, useEffect, useMemo, useState } from "react";
import { onValue, ref, runTransaction, update } from "firebase/database";
import {
  assignRoleOnProfileCreation,
  enforceOwnerUniqueness,
  parseSharedFamilyState,
  upsertProfile,
  type Role,
  type SharedFamilyState,
} from "../app/owner-policy";
import {
  getFirebaseDatabaseInstance,
  isFirebaseConfigured,
} from "../services/firebaseConfig";

type CloudSnapshot = {
  familyState: SharedFamilyState;
  ownerCode: string;
};

type ClaimRoleResult = {
  assignedRole: Role;
  familyState: SharedFamilyState;
};

function parseStateFromUnknown(raw: unknown): SharedFamilyState {
  if (!raw || typeof raw !== "object") {
    return enforceOwnerUniqueness(parseSharedFamilyState(null));
  }
  return enforceOwnerUniqueness(parseSharedFamilyState(JSON.stringify(raw)));
}

export function useCloudSync() {
  const isEnabled = isFirebaseConfigured();
  const database = useMemo(() => getFirebaseDatabaseInstance(), []);
  const familyId = (import.meta.env.VITE_FAMILY_SYNC_ID as string | undefined) || "famille-voyage-2026";
  const sharedPath = useMemo(() => `families/${familyId}/shared`, [familyId]);

  const [isReady, setIsReady] = useState<boolean>(() => !isEnabled || !database);
  const [cloudSnapshot, setCloudSnapshot] = useState<CloudSnapshot | null>(null);

  useEffect(() => {
    if (!isEnabled || !database) {
      setIsReady(true);
      return;
    }

    const sharedRef = ref(database, sharedPath);
    const unsubscribe = onValue(
      sharedRef,
      (snapshot) => {
        const value = snapshot.val() as { state?: unknown; ownerCode?: unknown } | null;
        const nextFamilyState = parseStateFromUnknown(value?.state ?? null);
        const ownerCode = typeof value?.ownerCode === "string" ? value.ownerCode : "";

        setCloudSnapshot({ familyState: nextFamilyState, ownerCode });
        setIsReady(true);
      },
      () => {
        setIsReady(true);
      }
    );

    return () => unsubscribe();
  }, [database, isEnabled, sharedPath]);

  const pushSnapshot = useCallback(
    async (snapshot: CloudSnapshot) => {
      if (!isEnabled || !database) {
        return;
      }

      const normalized = enforceOwnerUniqueness(snapshot.familyState);
      await update(ref(database, sharedPath), {
        state: normalized,
        ownerCode: snapshot.ownerCode,
        updatedAt: Date.now(),
      });
    },
    [database, isEnabled, sharedPath]
  );

  const claimRoleForProfile = useCallback(
    async (profileId: string): Promise<ClaimRoleResult | null> => {
      if (!isEnabled || !database) {
        return null;
      }

      const stateRef = ref(database, `${sharedPath}/state`);
      const transactionResult = await runTransaction(stateRef, (current) => {
        const currentState = parseStateFromUnknown(current);
        const assignedRole = assignRoleOnProfileCreation(currentState);

        const withProfile = upsertProfile(currentState, { id: profileId, role: assignedRole });
        const withOwner =
          assignedRole === "proprietaire"
            ? { ...withProfile, ownerProfileId: profileId }
            : withProfile;

        return enforceOwnerUniqueness(withOwner);
      });

      const resultingState = parseStateFromUnknown(transactionResult.snapshot.val());
      const assignedRole: Role = resultingState.ownerProfileId === profileId ? "proprietaire" : "utilisateur";

      return {
        assignedRole,
        familyState: resultingState,
      };
    },
    [database, isEnabled, sharedPath]
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
