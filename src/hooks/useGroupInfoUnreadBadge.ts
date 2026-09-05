import { useEffect, useMemo, useState } from "react";
import { isChatEligibleRole } from "../app/chat";
import { computeHasUnreadGroupInfo } from "../app/groupInfo";
import type { Role } from "../app/owner-policy";
import type { CloudGroupInfoItemsLog, CloudGroupInfoReadStateByProfile } from "../types/cloud";

// Badge non-lu sur l'icône "Infos du groupe" de la navigation principale
// (epic 29), même principe que useChatUnreadBadge (story 28.4) mais plus
// simple : un seul tableau partagé par famille, pas de dimension
// conversation/membres à recalculer.
export function useGroupInfoUnreadBadge({
  cloudEnabled,
  currentProfileId,
  currentProfileRole,
  subscribeToGroupInfoItems,
  subscribeToGroupInfoReadState,
}: {
  cloudEnabled: boolean;
  currentProfileId: string;
  currentProfileRole: Role;
  subscribeToGroupInfoItems: (
    onSnapshot: (items: CloudGroupInfoItemsLog) => void,
    onError?: () => void
  ) => () => void;
  subscribeToGroupInfoReadState: (
    onSnapshot: (readState: CloudGroupInfoReadStateByProfile) => void,
    onError?: () => void
  ) => () => void;
}): { hasUnreadGroupInfo: boolean } {
  // Un visiteur n'a aucun accès à cette rubrique (cf. isChatEligibleRole,
  // même règle que le Chat) : pas de pastille, pas d'abonnement Firebase
  // inutile.
  const eligible = cloudEnabled && isChatEligibleRole(currentProfileRole);

  const [items, setItems] = useState<CloudGroupInfoItemsLog>({});
  const [readState, setReadState] = useState<CloudGroupInfoReadStateByProfile>({});

  useEffect(() => {
    if (!eligible) {
      // Même garde-fou anti-boucle-infinie que useChatUnreadBadge : renvoyer
      // la même référence d'objet vide plutôt qu'un `{}` neuf quand
      // l'appelant fournit une fonction de secours dont l'identité change à
      // chaque rendu (cf. valeurs par défaut dans App.tsx tant que
      // useCloudSync() n'est pas prêt).
      setItems((previous) => (Object.keys(previous).length === 0 ? previous : {}));
      return;
    }
    return subscribeToGroupInfoItems((next) => setItems(next));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eligible, subscribeToGroupInfoItems]);

  useEffect(() => {
    if (!eligible) {
      setReadState((previous) => (Object.keys(previous).length === 0 ? previous : {}));
      return;
    }
    return subscribeToGroupInfoReadState((next) => setReadState(next));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eligible, subscribeToGroupInfoReadState]);

  const hasUnreadGroupInfo = useMemo(
    () => computeHasUnreadGroupInfo(Object.values(items), readState[currentProfileId]?.lastReadAt),
    [items, readState, currentProfileId]
  );

  return { hasUnreadGroupInfo };
}
