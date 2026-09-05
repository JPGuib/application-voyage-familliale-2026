import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, Pin, PinOff } from "lucide-react";
import {
  canDeleteGroupInfoItem,
  canEditGroupInfoItem,
  canPinGroupInfoItem,
  GROUP_INFO_TEXT_MAX_LENGTH,
  GROUP_INFO_TIME_MAX_LENGTH,
  groupGroupInfoItemsByDay,
  groupInfoDoneByProfile,
  isGroupInfoDayPast,
  sanitizeGroupInfoText,
  sanitizeGroupInfoTime,
  sortGroupInfoItems,
} from "./groupInfo";
import { formatTripDayLabel } from "./trip-day-format";
import type { CloudGroupInfoItem, CloudGroupInfoItemsLog } from "../types/cloud";

// Formulaire de composition/édition, factorisé car réutilisé pour la
// création d'un nouvel item et pour l'édition d'un item existant (mêmes
// champs jour/heure/texte, cf. Modèle de données de la story 29.1).
function GroupInfoItemForm({
  initialDay,
  initialTime,
  initialText,
  isOwner,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initialDay: number;
  initialTime: string | null;
  initialText: string;
  isOwner: boolean;
  submitLabel: string;
  onSubmit: (day: number, time: string | null, text: string) => Promise<void>;
  onCancel?: () => void;
}) {
  const [day, setDay] = useState(initialDay);
  const [time, setTime] = useState(initialTime ?? "");
  const [text, setText] = useState(initialText);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    const sanitizedText = sanitizeGroupInfoText(text);
    if (!sanitizedText || submitting) {
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(day, sanitizeGroupInfoTime(time), sanitizedText);
    } catch {
      setError("Non enregistré. Vérifiez votre connexion et réessayez.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          type="number"
          min={1}
          value={day}
          onChange={(event) => setDay(Math.max(1, Number(event.target.value) || 1))}
          aria-label="Jour"
          className="w-20 rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground outline-none"
        />
        <input
          value={time}
          onChange={(event) => setTime(event.target.value.slice(0, GROUP_INFO_TIME_MAX_LENGTH))}
          placeholder="Heure (optionnel, ex. 7h00)"
          aria-label="Heure"
          className="flex-1 rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground outline-none"
        />
      </div>
      <textarea
        value={text}
        onChange={(event) => setText(event.target.value.slice(0, GROUP_INFO_TEXT_MAX_LENGTH))}
        placeholder="Ne pas oublier… / Rendez-vous à…"
        rows={2}
        className="w-full resize-none rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground outline-none"
      />
      {error && <p className="text-xs font-semibold text-destructive">{error}</p>}
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] text-muted-foreground">
          {text.length}/{GROUP_INFO_TEXT_MAX_LENGTH}
        </p>
        <div className="flex gap-2">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="rounded-full border border-border px-3 py-1.5 text-xs font-bold text-foreground"
            >
              Annuler
            </button>
          )}
          <button
            type="button"
            disabled={submitting || sanitizeGroupInfoText(text).length === 0}
            onClick={() => void handleSubmit()}
            className="rounded-full bg-[#2E7D32] px-4 py-1.5 text-xs font-black text-white disabled:opacity-50"
          >
            {submitLabel}
          </button>
        </div>
      </div>
      {!isOwner && (
        <p className="text-[10px] text-muted-foreground">Seul le propriétaire peut épingler un item.</p>
      )}
    </div>
  );
}

function GroupInfoItemCard({
  item,
  currentProfileId,
  isOwner,
  onUpdateItem,
  onDeleteItem,
  onSetPinned,
  onSetDone,
}: {
  item: CloudGroupInfoItem;
  currentProfileId: string;
  isOwner: boolean;
  onUpdateItem: (itemId: string, day: number, time: string | null, text: string) => Promise<void>;
  onDeleteItem: (itemId: string) => Promise<void>;
  onSetPinned: (itemId: string, pinned: boolean) => Promise<void>;
  onSetDone: (itemId: string, done: boolean) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [pinning, setPinning] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const canEdit = canEditGroupInfoItem(currentProfileId, item, isOwner);
  const canDelete = canDeleteGroupInfoItem(currentProfileId, item, isOwner);
  const canPin = canPinGroupInfoItem(isOwner);
  const isDone = groupInfoDoneByProfile(item, currentProfileId);

  if (editing) {
    return (
      <div className="rounded-2xl border border-border bg-card p-3">
        <GroupInfoItemForm
          initialDay={item.day}
          initialTime={item.time}
          initialText={item.text}
          isOwner={isOwner}
          submitLabel="Enregistrer"
          onCancel={() => setEditing(false)}
          onSubmit={async (day, time, text) => {
            await onUpdateItem(item.itemId, day, time, text);
            setEditing(false);
          }}
        />
      </div>
    );
  }

  return (
    <div
      className={`rounded-2xl border p-3 ${
        item.pinned ? "border-[#2E7D32] bg-[#2E7D32]/5" : "border-border bg-card"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            {item.time && <span>{item.time}</span>}
            <span>{item.authorSurnameSnapshot}</span>
          </div>
          <p className="mt-1 whitespace-pre-wrap break-words text-sm font-medium text-foreground">
            {item.text}
          </p>
        </div>
        {canPin && (
          <button
            type="button"
            disabled={pinning}
            aria-label={item.pinned ? "Désépingler" : "Épingler"}
            onClick={async () => {
              setPinning(true);
              try {
                await onSetPinned(item.itemId, !item.pinned);
              } finally {
                setPinning(false);
              }
            }}
            className="flex-shrink-0 text-[#2E7D32] disabled:opacity-50"
          >
            {item.pinned ? <Pin size={18} fill="currentColor" /> : <PinOff size={18} />}
          </button>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={toggling}
          onClick={async () => {
            setToggling(true);
            try {
              await onSetDone(item.itemId, !isDone);
            } finally {
              setToggling(false);
            }
          }}
          className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-widest disabled:opacity-50 ${
            isDone ? "bg-[#E8F5E9] text-[#1B5E20]" : "bg-muted text-muted-foreground"
          }`}
        >
          {isDone ? "✓ Fait" : "Marquer comme fait"}
        </button>
        {canEdit && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="rounded-full bg-muted px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-foreground"
          >
            Modifier
          </button>
        )}
        {canDelete && (
          <button
            type="button"
            disabled={deleting}
            onClick={async () => {
              setDeleting(true);
              try {
                await onDeleteItem(item.itemId);
              } finally {
                setDeleting(false);
              }
            }}
            className="rounded-full bg-[#FDECEA] px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-[#B71C1C] disabled:opacity-50"
          >
            Supprimer
          </button>
        )}
      </div>
    </div>
  );
}

export function GroupInfoScreen({
  currentProfileId,
  isOwner,
  cloudEnabled,
  currentDay,
  tripStartDate,
  onBack,
  subscribeToGroupInfoItems,
  onAddItem,
  onUpdateItem,
  onDeleteItem,
  onSetPinned,
  onSetDone,
  onMarkRead,
}: {
  currentProfileId: string;
  isOwner: boolean;
  cloudEnabled: boolean;
  currentDay: number;
  tripStartDate: string | null;
  onBack: () => void;
  subscribeToGroupInfoItems: (
    onSnapshot: (items: CloudGroupInfoItemsLog) => void,
    onError?: () => void
  ) => () => void;
  onAddItem: (day: number, time: string | null, text: string) => Promise<void>;
  onUpdateItem: (itemId: string, day: number, time: string | null, text: string) => Promise<void>;
  onDeleteItem: (itemId: string) => Promise<void>;
  onSetPinned: (itemId: string, pinned: boolean) => Promise<void>;
  onSetDone: (itemId: string, done: boolean) => Promise<void>;
  onMarkRead: (lastReadAt: number) => void;
}) {
  const [itemsLog, setItemsLog] = useState<CloudGroupInfoItemsLog>({});
  const [loadError, setLoadError] = useState(false);
  const [showComposer, setShowComposer] = useState(false);
  const [showPastDays, setShowPastDays] = useState(false);

  useEffect(() => {
    if (!cloudEnabled) {
      return;
    }
    setLoadError(false);
    const unsubscribe = subscribeToGroupInfoItems(
      (items) => setItemsLog(items),
      () => setLoadError(true)
    );
    return () => unsubscribe();
  }, [cloudEnabled, subscribeToGroupInfoItems]);

  const allItems = useMemo(() => Object.values(itemsLog), [itemsLog]);

  // Marque le tableau comme lu jusqu'au dernier item connu, à l'ouverture et
  // à nouveau à chaque nouvel item chargé pendant que l'écran reste ouvert
  // (même comportement que le Chat, story 28.4, cf. onMarkConversationRead
  // dans ChatHomeScreen qui utilise aussi le createdAt du dernier élément
  // plutôt que l'heure de l'appareil) — indépendant des coches "fait" (cf.
  // groupInfo.ts).
  useEffect(() => {
    if (!cloudEnabled || allItems.length === 0) {
      return;
    }
    const latestCreatedAt = Math.max(...allItems.map((item) => item.createdAt));
    onMarkRead(latestCreatedAt);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cloudEnabled, allItems]);

  const sortedItems = useMemo(() => sortGroupInfoItems(allItems), [allItems]);
  const pinnedItems = useMemo(() => sortedItems.filter((item) => item.pinned), [sortedItems]);
  const unpinnedItems = useMemo(() => sortedItems.filter((item) => !item.pinned), [sortedItems]);
  const dayGroups = useMemo(() => groupGroupInfoItemsByDay(unpinnedItems), [unpinnedItems]);
  const pastDayGroups = useMemo(
    () => dayGroups.filter(({ day }) => isGroupInfoDayPast(day, currentDay)),
    [dayGroups, currentDay]
  );
  const currentAndFutureDayGroups = useMemo(
    () => dayGroups.filter(({ day }) => !isGroupInfoDayPast(day, currentDay)),
    [dayGroups, currentDay]
  );

  const renderItemCard = (item: CloudGroupInfoItem) => (
    <GroupInfoItemCard
      key={item.itemId}
      item={item}
      currentProfileId={currentProfileId}
      isOwner={isOwner}
      onUpdateItem={onUpdateItem}
      onDeleteItem={onDeleteItem}
      onSetPinned={onSetPinned}
      onSetDone={onSetDone}
    />
  );

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="bg-[#2E7D32] text-white px-6 pt-12 pb-4 flex-shrink-0">
        <button onClick={onBack} className="flex items-center gap-1 text-white/85 text-sm font-bold mb-3">
          <ChevronLeft size={18} /> Accueil
        </button>
        <h1 className="text-2xl font-black">Infos du groupe</h1>
      </div>

      {!cloudEnabled ? (
        <div className="p-4">
          <div className="rounded-2xl border border-border bg-muted/40 px-4 py-3 text-sm font-semibold text-foreground">
            Cette rubrique nécessite la synchronisation cloud, indisponible pour le moment.
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
          {loadError && (
            <div className="rounded-2xl border border-[#F57F17] bg-[#FFF8E1] px-4 py-3 text-xs font-semibold text-[#8D6E63]">
              Impossible de charger les infos du groupe. Vérifiez votre connexion.
            </div>
          )}

          {showComposer ? (
            <div className="rounded-2xl border border-border bg-card p-3">
              <GroupInfoItemForm
                initialDay={currentDay}
                initialTime={null}
                initialText=""
                isOwner={isOwner}
                submitLabel="Publier"
                onCancel={() => setShowComposer(false)}
                onSubmit={async (day, time, text) => {
                  await onAddItem(day, time, text);
                  setShowComposer(false);
                }}
              />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowComposer(true)}
              className="w-full rounded-2xl border border-dashed border-border px-4 py-3 text-sm font-bold text-muted-foreground"
            >
              + Ajouter une info
            </button>
          )}

          {pinnedItems.length > 0 && (
            <div className="space-y-3">
              <h2 className="flex items-center gap-1.5 text-sm font-black uppercase tracking-widest text-[#2E7D32]">
                <Pin size={14} fill="currentColor" /> Épinglé
              </h2>
              <div className="space-y-2">{pinnedItems.map(renderItemCard)}</div>
            </div>
          )}

          {pastDayGroups.length > 0 && !showPastDays && (
            <button
              type="button"
              onClick={() => setShowPastDays(true)}
              className="w-full rounded-full border border-border px-3 py-1.5 text-xs font-bold text-foreground"
            >
              Voir les jours précédents
            </button>
          )}

          {showPastDays &&
            pastDayGroups.map(({ day, items }) => (
              <div key={`past-day-${day}`} className="space-y-3">
                <h2 className="text-sm font-black uppercase tracking-widest text-muted-foreground">
                  {formatTripDayLabel(day, tripStartDate)}
                </h2>
                <div className="space-y-2">{items.map(renderItemCard)}</div>
              </div>
            ))}
          {showPastDays && pastDayGroups.length > 0 && (
            <button
              type="button"
              onClick={() => setShowPastDays(false)}
              className="w-full rounded-full border border-border px-3 py-1.5 text-xs font-bold text-foreground"
            >
              Masquer les jours précédents
            </button>
          )}

          {currentAndFutureDayGroups.map(({ day, items }) => (
            <div key={`day-${day}`} className="space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm font-black uppercase tracking-widest text-accent">
                  {formatTripDayLabel(day, tripStartDate)}
                </h2>
                {day === currentDay && (
                  <span className="text-[10px] font-black uppercase tracking-widest text-primary bg-primary/10 rounded-full px-2 py-0.5">
                    aujourd'hui
                  </span>
                )}
              </div>
              <div className="space-y-2">{items.map(renderItemCard)}</div>
            </div>
          ))}

          {sortedItems.length === 0 && !loadError && (
            <p className="text-center text-sm text-muted-foreground mt-6">
              Aucune info pour l'instant.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
