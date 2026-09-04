import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, EyeOff, LogOut, Pencil, Plus, Users, User as UserIcon } from "lucide-react";
import { ChatScreen } from "./ChatScreen";
import {
  buildDirectConversationDraft,
  buildGroupConversationDraft,
  canLeaveChatConversation,
  canRenameChatConversation,
  CUSTOM_CHAT_NAME_MAX_LENGTH,
  formatChatMessageTimestamp,
  listSelectableChatMembers,
  resolveChatAuthorSnapshotLabel,
  resolveChatConversationDisplayName,
  sanitizeChatConversationName,
  sortChatConversationsByActivity,
  truncateChatMessagePreview,
  type ChatMemberProfile,
  type ChatProfileLookup,
} from "./chat";
import type { CloudChatConversation, CloudChatConversationsMap, CloudChatMessage, CloudChatMessagesLog } from "../types/cloud";

// Écran d'accueil du Chat (story 28.2) : liste des conversations dont le
// profil courant est membre (Voyage + groupes personnalisés + 1-to-1),
// création d'une nouvelle conversation en 2 étapes (type puis membres), et
// gestion d'une conversation ouverte (renommage, départ, masquage local),
// cf. docs/specs-stories/epic-28/28.2-groupes-et-conversations-1-to-1.md.
// ChatScreen reste un composant "dumb" d'affichage des messages d'UNE
// conversation (story 28.1) ; toute la navigation multi-conversations est
// gérée ici, en état local, sans toucher au routage global de App.tsx.
type ChatHomeMode =
  | "list"
  | "create-type"
  | "create-group"
  | "create-direct"
  | "conversation"
  | "rename"
  | "leave-confirm";

export function ChatHomeScreen({
  currentProfileId,
  cloudEnabled,
  eligibleProfiles,
  profilesById,
  onBack,
  subscribeToChatConversations,
  subscribeToChatMessages,
  onSendMessage,
  onCreateConversation,
  onRenameConversation,
  onLeaveConversation,
  hiddenConversationIds,
  onHideConversation,
  onUnhideConversation,
}: {
  currentProfileId: string;
  cloudEnabled: boolean;
  eligibleProfiles: readonly ChatMemberProfile[];
  profilesById: ChatProfileLookup;
  onBack: () => void;
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
  onSendMessage: (conversationId: string, text: string) => Promise<void>;
  onCreateConversation: (conversation: CloudChatConversation) => Promise<void>;
  onRenameConversation: (conversationId: string, name: string) => Promise<void>;
  onLeaveConversation: (conversationId: string) => Promise<void>;
  hiddenConversationIds: readonly string[];
  onHideConversation: (conversationId: string) => void;
  onUnhideConversation: (conversationId: string) => void;
}) {
  const [mode, setMode] = useState<ChatHomeMode>("list");
  const [conversations, setConversations] = useState<CloudChatConversationsMap>({});
  const [loadError, setLoadError] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  // Conversation tout juste créée : gardée en mémoire le temps que le
  // listener temps réel ci-dessus rattrape la nouvelle entrée, pour ne pas
  // afficher un écran vide entre la création et la première mise à jour de
  // `conversations`.
  const [justCreated, setJustCreated] = useState<CloudChatConversation | null>(null);

  const [lastMessageByConversation, setLastMessageByConversation] = useState<
    Record<string, CloudChatMessage | undefined>
  >({});

  const [createName, setCreateName] = useState("");
  const [createSelectedGroupMemberIds, setCreateSelectedGroupMemberIds] = useState<string[]>([]);
  const [createSelectedDirectMemberId, setCreateSelectedDirectMemberId] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const [renameDraft, setRenameDraft] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionPending, setActionPending] = useState(false);
  const [showHiddenList, setShowHiddenList] = useState(false);

  useEffect(() => {
    if (!cloudEnabled) {
      return;
    }
    setLoadError(false);
    return subscribeToChatConversations(
      (nextConversations) => setConversations(nextConversations),
      () => setLoadError(true)
    );
  }, [cloudEnabled, subscribeToChatConversations]);

  const joinedConversations = useMemo(() => {
    const values = Object.values(conversations);
    if (justCreated && !conversations[justCreated.conversationId]) {
      values.push(justCreated);
    }
    return values.filter((conversation) => conversation.memberProfileIds[currentProfileId] === true);
  }, [conversations, currentProfileId, justCreated]);

  const visibleConversations = useMemo(
    () => joinedConversations.filter((conversation) => !hiddenConversationIds.includes(conversation.conversationId)),
    [joinedConversations, hiddenConversationIds]
  );

  const hiddenConversations = useMemo(
    () => joinedConversations.filter((conversation) => hiddenConversationIds.includes(conversation.conversationId)),
    [joinedConversations, hiddenConversationIds]
  );

  const sortedVisibleConversations = useMemo(
    () =>
      sortChatConversationsByActivity(
        visibleConversations,
        (conversation) => lastMessageByConversation[conversation.conversationId]?.createdAt ?? conversation.createdAt
      ),
    [visibleConversations, lastMessageByConversation]
  );

  // Aperçu du dernier message de chaque conversation visible (story 28.2) :
  // un abonnement léger par conversation (limité à 1 message), pas de champ
  // dénormalisé côté cloud pour rester sur le modèle déjà déployé et validé
  // en story 28.1 (cf. observeChatMessages).
  const visibleConversationIdsKey = sortedVisibleConversations.map((c) => c.conversationId).sort().join(",");
  useEffect(() => {
    if (!cloudEnabled || visibleConversationIdsKey === "") {
      return;
    }
    const ids = visibleConversationIdsKey.split(",");
    const unsubscribes = ids.map((conversationId) =>
      subscribeToChatMessages(conversationId, 1, (messages) => {
        const [onlyMessage] = Object.values(messages);
        setLastMessageByConversation((previous) => ({ ...previous, [conversationId]: onlyMessage }));
      })
    );
    return () => {
      for (const unsubscribe of unsubscribes) unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cloudEnabled, visibleConversationIdsKey]);

  const activeConversation: CloudChatConversation | null =
    (activeConversationId ? conversations[activeConversationId] : null) ??
    (justCreated && justCreated.conversationId === activeConversationId ? justCreated : null);

  const openConversation = (conversationId: string) => {
    setActiveConversationId(conversationId);
    setActionError(null);
    setMode("conversation");
  };

  const resetCreateForm = () => {
    setCreateName("");
    setCreateSelectedGroupMemberIds([]);
    setCreateSelectedDirectMemberId(null);
    setCreateError(null);
  };

  const selectableMembers = useMemo(
    () => listSelectableChatMembers(eligibleProfiles, currentProfileId),
    [eligibleProfiles, currentProfileId]
  );

  const labelForProfile = (profileId: string, role: ChatMemberProfile["role"]) =>
    resolveChatAuthorSnapshotLabel(role, profilesById[profileId]?.surname ?? "");

  const handleCreateGroup = async () => {
    const name = sanitizeChatConversationName(createName);
    if (!name || createSelectedGroupMemberIds.length === 0 || creating) {
      setCreateError("Choisissez un nom et au moins un autre membre.");
      return;
    }

    setCreating(true);
    setCreateError(null);
    try {
      const draft = buildGroupConversationDraft(name, currentProfileId, createSelectedGroupMemberIds, Date.now());
      await onCreateConversation(draft);
      setJustCreated(draft);
      resetCreateForm();
      openConversation(draft.conversationId);
    } catch {
      setCreateError("Impossible de créer le groupe. Vérifiez votre connexion et réessayez.");
    } finally {
      setCreating(false);
    }
  };

  const handleCreateDirect = async () => {
    if (!createSelectedDirectMemberId || creating) {
      setCreateError("Choisissez un interlocuteur.");
      return;
    }

    setCreating(true);
    setCreateError(null);
    try {
      const draft = buildDirectConversationDraft(currentProfileId, createSelectedDirectMemberId, Date.now());
      await onCreateConversation(draft);
      setJustCreated(draft);
      resetCreateForm();
      openConversation(draft.conversationId);
    } catch {
      setCreateError("Impossible de créer la conversation. Vérifiez votre connexion et réessayez.");
    } finally {
      setCreating(false);
    }
  };

  const handleConfirmRename = async () => {
    const name = sanitizeChatConversationName(renameDraft);
    if (!activeConversationId || !name || actionPending) {
      return;
    }

    setActionPending(true);
    setActionError(null);
    try {
      await onRenameConversation(activeConversationId, name);
      setMode("conversation");
    } catch {
      setActionError("Renommage impossible. Vérifiez votre connexion et réessayez.");
    } finally {
      setActionPending(false);
    }
  };

  const handleConfirmLeave = async () => {
    if (!activeConversationId || actionPending) {
      return;
    }

    setActionPending(true);
    setActionError(null);
    try {
      await onLeaveConversation(activeConversationId);
      setActiveConversationId(null);
      setMode("list");
    } catch {
      setActionError("Impossible de quitter le groupe. Vérifiez votre connexion et réessayez.");
    } finally {
      setActionPending(false);
    }
  };

  if (mode === "create-type") {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        <ChatSectionHeader title="Nouvelle conversation" onBack={() => setMode("list")} />
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <button
            type="button"
            onClick={() => {
              resetCreateForm();
              setMode("create-group");
            }}
            className="w-full flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-4 text-left"
          >
            <Users size={22} className="text-[#2E7D32]" />
            <div className="flex-1">
              <p className="text-sm font-black text-foreground">Groupe</p>
              <p className="text-xs font-semibold text-muted-foreground">
                Choisissez un nom et plusieurs membres
              </p>
            </div>
            <ChevronRight size={18} className="text-muted-foreground" />
          </button>
          <button
            type="button"
            onClick={() => {
              resetCreateForm();
              setMode("create-direct");
            }}
            className="w-full flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-4 text-left"
          >
            <UserIcon size={22} className="text-[#2E7D32]" />
            <div className="flex-1">
              <p className="text-sm font-black text-foreground">Discussion 1-to-1</p>
              <p className="text-xs font-semibold text-muted-foreground">Choisissez un seul interlocuteur</p>
            </div>
            <ChevronRight size={18} className="text-muted-foreground" />
          </button>
        </div>
      </div>
    );
  }

  if (mode === "create-group") {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        <ChatSectionHeader title="Nouveau groupe" onBack={() => setMode("create-type")} />
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div>
            <p className="text-xs font-extrabold text-muted-foreground uppercase tracking-widest mb-2">
              Nom du groupe *
            </p>
            <input
              value={createName}
              onChange={(event) => setCreateName(event.target.value.slice(0, CUSTOM_CHAT_NAME_MAX_LENGTH))}
              placeholder="Ex: Les grands, Team plage…"
              className="w-full rounded-xl bg-input-background px-3 py-3 text-sm font-semibold text-foreground outline-none ring-2 ring-transparent focus:ring-primary/30"
            />
          </div>

          <div>
            <p className="text-xs font-extrabold text-muted-foreground uppercase tracking-widest mb-2">
              Membres *
            </p>
            <div className="space-y-2">
              {selectableMembers.map((member) => {
                const checked = createSelectedGroupMemberIds.includes(member.profileId);
                return (
                  <button
                    key={member.profileId}
                    type="button"
                    onClick={() =>
                      setCreateSelectedGroupMemberIds((previous) =>
                        checked
                          ? previous.filter((id) => id !== member.profileId)
                          : [...previous, member.profileId]
                      )
                    }
                    className={`w-full flex items-center justify-between rounded-xl border px-3 py-3 text-left text-sm font-bold ${
                      checked ? "border-[#2E7D32] bg-[#2E7D32]/10 text-[#2E7D32]" : "border-border text-foreground"
                    }`}
                  >
                    {labelForProfile(member.profileId, member.role)}
                    {checked && <span className="text-xs font-black">✓</span>}
                  </button>
                );
              })}
              {selectableMembers.length === 0 && (
                <p className="text-xs font-semibold text-muted-foreground">
                  Aucun autre membre disponible pour l'instant.
                </p>
              )}
            </div>
          </div>

          {createError && <p className="text-xs font-semibold text-destructive">{createError}</p>}
        </div>
        <div className="flex-shrink-0 px-4 pb-8 pt-3 bg-background border-t border-border">
          <button
            type="button"
            disabled={creating}
            onClick={() => void handleCreateGroup()}
            className="w-full rounded-2xl py-4 text-base font-black bg-[#2E7D32] text-white disabled:opacity-50"
          >
            Créer le groupe
          </button>
        </div>
      </div>
    );
  }

  if (mode === "create-direct") {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        <ChatSectionHeader title="Nouvelle discussion" onBack={() => setMode("create-type")} />
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {selectableMembers.map((member) => {
            const checked = createSelectedDirectMemberId === member.profileId;
            return (
              <button
                key={member.profileId}
                type="button"
                onClick={() => setCreateSelectedDirectMemberId(member.profileId)}
                className={`w-full flex items-center justify-between rounded-xl border px-3 py-3 text-left text-sm font-bold ${
                  checked ? "border-[#2E7D32] bg-[#2E7D32]/10 text-[#2E7D32]" : "border-border text-foreground"
                }`}
              >
                {labelForProfile(member.profileId, member.role)}
                {checked && <span className="text-xs font-black">✓</span>}
              </button>
            );
          })}
          {selectableMembers.length === 0 && (
            <p className="text-xs font-semibold text-muted-foreground">
              Aucun autre membre disponible pour l'instant.
            </p>
          )}
          {createError && <p className="text-xs font-semibold text-destructive">{createError}</p>}
        </div>
        <div className="flex-shrink-0 px-4 pb-8 pt-3 bg-background border-t border-border">
          <button
            type="button"
            disabled={creating}
            onClick={() => void handleCreateDirect()}
            className="w-full rounded-2xl py-4 text-base font-black bg-[#2E7D32] text-white disabled:opacity-50"
          >
            Démarrer la discussion
          </button>
        </div>
      </div>
    );
  }

  if (mode === "rename" && activeConversation) {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        <ChatSectionHeader title="Renommer le groupe" onBack={() => setMode("conversation")} />
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <input
            value={renameDraft}
            onChange={(event) => setRenameDraft(event.target.value.slice(0, CUSTOM_CHAT_NAME_MAX_LENGTH))}
            placeholder="Nom du groupe"
            className="w-full rounded-xl bg-input-background px-3 py-3 text-sm font-semibold text-foreground outline-none ring-2 ring-transparent focus:ring-primary/30"
          />
          {actionError && <p className="text-xs font-semibold text-destructive">{actionError}</p>}
        </div>
        <div className="flex-shrink-0 px-4 pb-8 pt-3 bg-background border-t border-border">
          <button
            type="button"
            disabled={actionPending || sanitizeChatConversationName(renameDraft).length === 0}
            onClick={() => void handleConfirmRename()}
            className="w-full rounded-2xl py-4 text-base font-black bg-[#2E7D32] text-white disabled:opacity-50"
          >
            Enregistrer
          </button>
        </div>
      </div>
    );
  }

  if (mode === "leave-confirm" && activeConversation) {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        <ChatSectionHeader title="Quitter le groupe" onBack={() => setMode("conversation")} />
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <p className="text-sm font-semibold text-foreground">
            Tu ne recevras plus les messages de ce groupe. L'historique reste visible pour les autres membres.
          </p>
          {actionError && <p className="text-xs font-semibold text-destructive">{actionError}</p>}
        </div>
        <div className="flex-shrink-0 px-4 pb-8 pt-3 bg-background border-t border-border grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setMode("conversation")}
            className="w-full rounded-2xl py-4 text-sm font-black border border-border text-foreground"
          >
            Annuler
          </button>
          <button
            type="button"
            disabled={actionPending}
            onClick={() => void handleConfirmLeave()}
            className="w-full rounded-2xl py-4 text-sm font-black bg-destructive text-white disabled:opacity-50"
          >
            Quitter
          </button>
        </div>
      </div>
    );
  }

  if (mode === "conversation" && activeConversationId && activeConversation) {
    const displayName = resolveChatConversationDisplayName(activeConversation, currentProfileId, profilesById);
    const canRename = canRenameChatConversation(activeConversation);
    const canLeave = canLeaveChatConversation(activeConversation);
    const canHide = activeConversation.type === "direct";

    return (
      <ChatScreen
        conversationId={activeConversationId}
        conversationName={displayName}
        currentProfileId={currentProfileId}
        cloudEnabled={cloudEnabled}
        onBack={() => {
          setActiveConversationId(null);
          setMode("list");
        }}
        subscribeToChatMessages={subscribeToChatMessages}
        onSendMessage={(text) => onSendMessage(activeConversationId, text)}
        headerActions={
          canRename || canLeave || canHide ? (
            <div className="flex items-center gap-1 flex-shrink-0">
              {canRename && (
                <button
                  type="button"
                  aria-label="Renommer le groupe"
                  onClick={() => {
                    setRenameDraft(activeConversation.name);
                    setActionError(null);
                    setMode("rename");
                  }}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-white/85"
                >
                  <Pencil size={16} />
                </button>
              )}
              {canHide && (
                <button
                  type="button"
                  aria-label="Masquer cette conversation"
                  onClick={() => {
                    onHideConversation(activeConversationId);
                    setActiveConversationId(null);
                    setMode("list");
                  }}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-white/85"
                >
                  <EyeOff size={16} />
                </button>
              )}
              {canLeave && (
                <button
                  type="button"
                  aria-label="Quitter le groupe"
                  onClick={() => {
                    setActionError(null);
                    setMode("leave-confirm");
                  }}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-white/85"
                >
                  <LogOut size={16} />
                </button>
              )}
            </div>
          ) : undefined
        }
      />
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="bg-[#2E7D32] text-white px-6 pt-12 pb-4 flex-shrink-0">
        <button onClick={onBack} className="flex items-center gap-1 text-white/85 text-sm font-bold mb-3">
          <ChevronLeft size={18} /> Accueil
        </button>
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-2xl font-black">Chat</h1>
          <button
            type="button"
            aria-label="Nouvelle conversation"
            onClick={() => {
              resetCreateForm();
              setMode("create-type");
            }}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15"
          >
            <Plus size={20} />
          </button>
        </div>
      </div>

      {!cloudEnabled ? (
        <div className="p-4">
          <div className="rounded-2xl border border-border bg-muted/40 px-4 py-3 text-sm font-semibold text-foreground">
            Le Chat nécessite la synchronisation cloud, indisponible pour le moment.
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {loadError && (
            <div className="rounded-2xl border border-[#F57F17] bg-[#FFF8E1] px-4 py-3 text-xs font-semibold text-[#8D6E63]">
              Impossible de charger les conversations. Vérifiez votre connexion.
            </div>
          )}

          {sortedVisibleConversations.map((conversation) => {
            const displayName = resolveChatConversationDisplayName(conversation, currentProfileId, profilesById);
            const lastMessage = lastMessageByConversation[conversation.conversationId];
            const timestamp = lastMessage ? formatChatMessageTimestamp(lastMessage.createdAt) : null;

            return (
              <button
                key={conversation.conversationId}
                type="button"
                onClick={() => openConversation(conversation.conversationId)}
                className="w-full flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 text-left"
              >
                <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-[#2E7D32]/10 text-[#2E7D32]">
                  {conversation.type === "direct" ? <UserIcon size={20} /> : <Users size={20} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black text-foreground truncate">{displayName}</p>
                  <p className="text-xs font-semibold text-muted-foreground truncate">
                    {lastMessage ? truncateChatMessagePreview(lastMessage.text) : "Aucun message pour l'instant"}
                  </p>
                </div>
                {timestamp && (
                  <span className="flex-shrink-0 text-[10px] font-bold text-muted-foreground">
                    {timestamp.dateLabel ? timestamp.dateLabel : timestamp.time}
                  </span>
                )}
              </button>
            );
          })}

          {sortedVisibleConversations.length === 0 && !loadError && (
            <p className="text-center text-sm text-muted-foreground mt-6">
              Aucune conversation pour l'instant.
            </p>
          )}

          {hiddenConversations.length > 0 && (
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowHiddenList((previous) => !previous)}
                className="text-xs font-bold text-muted-foreground underline"
              >
                {showHiddenList ? "Masquer les conversations cachées" : `Conversations masquées (${hiddenConversations.length})`}
              </button>
              {showHiddenList && (
                <div className="mt-2 space-y-2">
                  {hiddenConversations.map((conversation) => {
                    const displayName = resolveChatConversationDisplayName(conversation, currentProfileId, profilesById);
                    return (
                      <div
                        key={conversation.conversationId}
                        className="flex items-center justify-between rounded-xl border border-border px-3 py-2"
                      >
                        <span className="text-xs font-bold text-foreground truncate">{displayName}</span>
                        <button
                          type="button"
                          onClick={() => onUnhideConversation(conversation.conversationId)}
                          className="text-xs font-black text-[#2E7D32]"
                        >
                          Réafficher
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ChatSectionHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div className="bg-[#2E7D32] text-white px-6 pt-12 pb-4 flex-shrink-0">
      <button onClick={onBack} className="flex items-center gap-1 text-white/85 text-sm font-bold mb-3">
        <ChevronLeft size={18} /> Retour
      </button>
      <h1 className="text-2xl font-black">{title}</h1>
    </div>
  );
}

