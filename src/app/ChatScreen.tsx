import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, Send, Smile } from "lucide-react";
import {
  CHAT_MESSAGE_MAX_LENGTH,
  formatChatMessageTimestamp,
  groupConsecutiveChatMessages,
  sortChatMessagesAscending,
} from "./chat";
import type { CloudChatMessagesLog } from "../types/cloud";

const INITIAL_MESSAGE_LIMIT = 50;
const LOAD_MORE_STEP = 50;

// Sélecteur d'emoji intégré à l'app (story 28.1 : "texte + emoji Unicode via
// le clavier natif OU un sélecteur d'emoji dans l'app"), volontairement une
// liste courte et curatée plutôt qu'un picker exhaustif à catégories.
const QUICK_EMOJIS = [
  "😀", "😂", "🥰", "😍", "😎", "😢", "😮", "😡",
  "🤔", "😴", "🥳", "👍", "👎", "🙏", "👏", "🙌",
  "❤️", "🔥", "🎉", "✈️", "🌞", "🌙", "☕", "🍕",
  "🏖️", "📸", "🗺️", "🚗", "⛱️", "🥵", "🥶", "💤",
];

export function ChatScreen({
  conversationId,
  conversationName,
  currentProfileId,
  cloudEnabled,
  onBack,
  subscribeToChatMessages,
  onSendMessage,
}: {
  conversationId: string;
  conversationName: string;
  currentProfileId: string;
  cloudEnabled: boolean;
  onBack: () => void;
  subscribeToChatMessages: (
    conversationId: string,
    messageLimit: number,
    onSnapshot: (messages: CloudChatMessagesLog) => void,
    onError?: () => void
  ) => () => void;
  onSendMessage: (text: string) => Promise<void>;
}) {
  const [messageLimit, setMessageLimit] = useState(INITIAL_MESSAGE_LIMIT);
  const [messagesLog, setMessagesLog] = useState<CloudChatMessagesLog>({});
  const [loadError, setLoadError] = useState(false);
  const [draftText, setDraftText] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const scrollAnchorRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (!cloudEnabled) {
      return;
    }

    setLoadError(false);
    const unsubscribe = subscribeToChatMessages(
      conversationId,
      messageLimit,
      (messages) => setMessagesLog(messages),
      () => setLoadError(true)
    );

    return () => unsubscribe();
  }, [cloudEnabled, conversationId, messageLimit, subscribeToChatMessages]);

  const sortedMessages = useMemo(
    () => sortChatMessagesAscending(Object.values(messagesLog)),
    [messagesLog]
  );
  const messageGroups = useMemo(
    () => groupConsecutiveChatMessages(sortedMessages),
    [sortedMessages]
  );
  const mayHaveOlderMessages = sortedMessages.length >= messageLimit;

  useEffect(() => {
    const anchor = scrollAnchorRef.current;
    if (anchor && typeof anchor.scrollIntoView === "function") {
      anchor.scrollIntoView({ block: "end" });
    }
  }, [sortedMessages.length]);

  const insertEmoji = (emoji: string) => {
    const textarea = textareaRef.current;
    const start = textarea?.selectionStart ?? draftText.length;
    const end = textarea?.selectionEnd ?? draftText.length;
    const next = (draftText.slice(0, start) + emoji + draftText.slice(end)).slice(0, CHAT_MESSAGE_MAX_LENGTH);
    setDraftText(next);
    setShowEmojiPicker(false);

    const cursor = start + emoji.length;
    requestAnimationFrame(() => {
      textarea?.focus();
      textarea?.setSelectionRange(cursor, cursor);
    });
  };

  const handleSend = async () => {
    const trimmed = draftText.trim();
    if (!trimmed || sending) {
      return;
    }

    setSending(true);
    setSendError(null);
    try {
      await onSendMessage(trimmed);
      setDraftText("");
    } catch {
      setSendError("Message non envoyé. Vérifiez votre connexion et réessayez.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="bg-[#2E7D32] text-white px-6 pt-12 pb-4 flex-shrink-0">
        <button onClick={onBack} className="flex items-center gap-1 text-white/85 text-sm font-bold mb-3">
          <ChevronLeft size={18} /> Accueil
        </button>
        <h1 className="text-2xl font-black">{conversationName}</h1>
      </div>

      {!cloudEnabled ? (
        <div className="p-4">
          <div className="rounded-2xl border border-border bg-muted/40 px-4 py-3 text-sm font-semibold text-foreground">
            Le Chat nécessite la synchronisation cloud, indisponible pour le moment.
          </div>
        </div>
      ) : (
        <>
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
            {loadError && (
              <div className="rounded-2xl border border-[#F57F17] bg-[#FFF8E1] px-4 py-3 text-xs font-semibold text-[#8D6E63]">
                Impossible de charger les messages. Vérifiez votre connexion.
              </div>
            )}

            {mayHaveOlderMessages && (
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={() => setMessageLimit((current) => current + LOAD_MORE_STEP)}
                  className="rounded-full border border-border px-3 py-1.5 text-xs font-bold text-foreground"
                >
                  Charger les messages plus anciens
                </button>
              </div>
            )}

            {messageGroups.length === 0 && !loadError && (
              <p className="text-center text-sm text-muted-foreground mt-6">
                Aucun message pour l'instant. Soyez le premier à écrire !
              </p>
            )}

            {/* Pas d'avatar/photo par groupe (retiré le 2026-09-04, retour de
                Jean-Philippe) : il n'y a pas de photo de profil dans l'app
                aujourd'hui, une simple initiale sans visage n'apportait rien.
                À réintroduire ici si une photo de profil par utilisateur est
                ajoutée un jour dans les paramètres. */}
            {messageGroups.map((group) => {
              const first = group[0];
              const isOwnGroup = first.authorProfileId === currentProfileId;

              return (
                <div
                  key={first.messageId}
                  className={`flex items-start ${isOwnGroup ? "justify-end" : "justify-start"}`}
                >
                  <div className={`flex max-w-[75%] flex-col gap-1 ${isOwnGroup ? "items-end" : "items-start"}`}>
                    <span className="px-1 text-xs font-bold text-muted-foreground">
                      {first.authorSurnameSnapshot}
                    </span>

                    {group.map((message) => {
                      const { time, dateLabel } = formatChatMessageTimestamp(message.createdAt);
                      return (
                        <div
                          key={message.messageId}
                          className={`rounded-2xl px-3 py-2 text-sm font-medium ${
                            isOwnGroup
                              ? "bg-[#2E7D32] text-white"
                              : "bg-muted text-foreground border border-border"
                          }`}
                        >
                          <p className="whitespace-pre-wrap break-words">{message.text}</p>
                          <p
                            className={`mt-1 text-right text-[10px] font-semibold ${
                              isOwnGroup ? "text-white/75" : "text-muted-foreground"
                            }`}
                          >
                            {dateLabel ? `${dateLabel} · ${time}` : time}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            <div ref={scrollAnchorRef} />
          </div>

          <div className="flex-shrink-0 border-t border-border bg-background p-3">
            {sendError && <p className="mb-2 text-xs font-semibold text-destructive">{sendError}</p>}

            {showEmojiPicker && (
              <div className="mb-2 grid grid-cols-8 gap-1 rounded-2xl border border-border bg-card p-2">
                {QUICK_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => insertEmoji(emoji)}
                    className="flex h-9 items-center justify-center rounded-lg text-lg hover:bg-muted"
                    aria-label={`Ajouter ${emoji}`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}

            <div className="flex items-end gap-2">
              <button
                type="button"
                onClick={() => setShowEmojiPicker((current) => !current)}
                className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-border ${
                  showEmojiPicker ? "bg-muted text-foreground" : "text-muted-foreground"
                }`}
                aria-label="Choisir un emoji"
              >
                <Smile size={18} />
              </button>
              <textarea
                ref={textareaRef}
                value={draftText}
                onChange={(event) => setDraftText(event.target.value.slice(0, CHAT_MESSAGE_MAX_LENGTH))}
                onFocus={() => setShowEmojiPicker(false)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void handleSend();
                  }
                }}
                placeholder="Écrire un message…"
                rows={1}
                className="flex-1 resize-none rounded-2xl border border-border bg-card px-3 py-2 text-sm text-foreground outline-none"
              />
              <button
                type="button"
                disabled={sending || draftText.trim().length === 0}
                onClick={() => void handleSend()}
                className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#2E7D32] text-white disabled:opacity-50"
                aria-label="Envoyer"
              >
                <Send size={18} />
              </button>
            </div>
            <p className="mt-1 text-right text-[10px] text-muted-foreground">
              {draftText.length}/{CHAT_MESSAGE_MAX_LENGTH}
            </p>
          </div>
        </>
      )}
    </div>
  );
}
