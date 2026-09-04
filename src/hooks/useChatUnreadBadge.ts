import { useEffect, useMemo, useState } from "react";
import { isChatEligibleRole } from "../app/chat";
import type { Role } from "../app/owner-policy";
import type {
  CloudChatConversationsMap,
  CloudChatMessage,
  CloudChatMessagesLog,
  CloudChatReadStateMap,
} from "../types/cloud";

// Badge de messages non lus sur l'icône Chat de la navigation principale
// (story 28.4). Contrairement à ChatHomeScreen (chargé "à la demande"
// pendant que la rubrique Chat est ouverte, cf. commentaires dans
// cloudSyncProvider.ts), ce hook doit rester monté en permanence dès qu'un
// profil est connecté : la pastille doit apparaître même si l'utilisateur
// n'a jamais ouvert le Chat. Volontairement léger (un seul message par
// conversation suffit à savoir s'il y a du non-lu) : le calcul du compteur
// exact par conversation reste dans ChatHomeScreen (cf.
// computeUnreadChatMessageCount), qui a de toute façon besoin de charger
// plus d'historique pour ses aperçus.
export function useChatUnreadBadge({
  cloudEnabled,
  currentProfileId,
  currentProfileRole,
  subscribeToChatConversations,
  subscribeToChatMessages,
  subscribeToChatReadState,
}: {
  cloudEnabled: boolean;
  currentProfileId: string;
  currentProfileRole: Role;
  subscribeToChatConversations: (
    onSnapshot: (conversations: CloudChatConversationsMap) => void,
    onError?: () => void
  ) => () => void;
  subscribeToChatMessages: (
    conversationId: string,
    messageLimit: number,
    onSnapshot: (messages: CloudChatMessagesLog) => void,
    onError?: () => void
  ) => () => void;
  subscribeToChatReadState: (
    onSnapshot: (readState: CloudChatReadStateMap) => void,
    onError?: () => void
  ) => () => void;
}): { hasUnreadChat: boolean } {
  // Un visiteur n'a de toute façon jamais accès au Chat (cf.
  // isChatEligibleRole) : pas de pastille, pas d'abonnement Firebase inutile
  // (règle métier story 28.4, critère d'acceptation #4).
  const eligible = cloudEnabled && isChatEligibleRole(currentProfileRole);

  const [conversations, setConversations] = useState<CloudChatConversationsMap>({});
  const [readState, setReadState] = useState<CloudChatReadStateMap>({});
  const [lastMessageByConversation, setLastMessageByConversation] = useState<
    Record<string, CloudChatMessage | undefined>
  >({});

  useEffect(() => {
    if (!eligible) {
      // Retourner la même référence quand c'est déjà vide (plutôt qu'un
      // `{}` neuf) permet à React de ne pas re-rendre : sans ça, un appelant
      // dont l'identité de `subscribeToChatConversations` change à chaque
      // rendu (cf. les valeurs par défaut de secours dans App.tsx, recréées
      // tant que useCloudSync() ne fournit pas la fonction) provoquerait une
      // boucle de rendu infinie — ce hook est le premier consommateur Chat
      // monté en permanence, donc le premier à révéler ce piège.
      setConversations((previous) => (Object.keys(previous).length === 0 ? previous : {}));
      return;
    }
    return subscribeToChatConversations((next) => setConversations(next));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eligible, subscribeToChatConversations]);

  useEffect(() => {
    if (!eligible) {
      setReadState((previous) => (Object.keys(previous).length === 0 ? previous : {}));
      return;
    }
    return subscribeToChatReadState((next) => setReadState(next));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eligible, subscribeToChatReadState]);

  const joinedConversationIds = useMemo(
    () =>
      Object.values(conversations)
        .filter((conversation) => conversation.memberProfileIds[currentProfileId] === true)
        .map((conversation) => conversation.conversationId)
        .sort(),
    [conversations, currentProfileId]
  );
  const joinedConversationIdsKey = joinedConversationIds.join(",");

  useEffect(() => {
    if (!eligible || joinedConversationIdsKey === "") {
      setLastMessageByConversation((previous) => (Object.keys(previous).length === 0 ? previous : {}));
      return;
    }
    const ids = joinedConversationIdsKey.split(",");
    const unsubscribes = ids.map((conversationId) =>
      subscribeToChatMessages(conversationId, 1, (messages) => {
        const [latest] = Object.values(messages);
        setLastMessageByConversation((previous) => ({ ...previous, [conversationId]: latest }));
      })
    );
    return () => {
      for (const unsubscribe of unsubscribes) unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eligible, joinedConversationIdsKey, subscribeToChatMessages]);

  const hasUnreadChat = useMemo(
    () =>
      joinedConversationIds.some((conversationId) => {
        const latest = lastMessageByConversation[conversationId];
        if (!latest) {
          return false;
        }
        const lastReadAt = readState[conversationId]?.[currentProfileId]?.lastReadAt ?? 0;
        return latest.createdAt > lastReadAt;
      }),
    [joinedConversationIds, lastMessageByConversation, readState, currentProfileId]
  );

  return { hasUnreadChat };
}
