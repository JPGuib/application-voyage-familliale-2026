// Infos du groupe (epic 29) : pense-bête/fil d'annonces partagé par le
// groupe (heure de lever, rappels pratiques, "RDV dans 30 min"...), distinct
// de l'agenda de visite. Construit en miroir de chat.ts (epic 28), qui est
// le précédent le plus proche dans cette base de code — voir
// docs/specs-stories/epic-29/29.1-tableau-infos-du-groupe.md.
import type { CloudGroupInfoItem } from "../types/cloud";

// Un visiteur n'a aucun accès à cette rubrique (ni lecture ni écriture),
// exactement comme pour le Chat — on réutilise directement isChatEligibleRole
// plutôt que de dupliquer la même règle (cf. chat.ts).
export { isChatEligibleRole, resolveChatAuthorSnapshotLabel } from "./chat";

export const GROUP_INFO_TEXT_MAX_LENGTH = 1000;
export const GROUP_INFO_TIME_MAX_LENGTH = 20;

export function sanitizeGroupInfoText(rawText: string): string {
  return rawText.trim().slice(0, GROUP_INFO_TEXT_MAX_LENGTH);
}

// Heure libre optionnelle ("7h00", "vers midi"...) : une chaîne vide après
// nettoyage devient `null` plutôt que "", pour ne pas afficher une heure
// fantôme dans l'UI.
export function sanitizeGroupInfoTime(rawTime: string): string | null {
  const trimmed = rawTime.trim().slice(0, GROUP_INFO_TIME_MAX_LENGTH);
  return trimmed.length > 0 ? trimmed : null;
}

// itemId généré côté client, même idiome que buildChatPollMessage dans
// chat.ts (auteur + horodatage), suffisamment unique pour ce périmètre (pas
// deux items du même auteur à la même milliseconde).
export function buildGroupInfoItem(
  day: number,
  time: string | null,
  text: string,
  authorProfileId: string,
  authorSurnameSnapshot: string,
  authorUid: string,
  createdAt: number
): CloudGroupInfoItem {
  return {
    itemId: `${authorProfileId}-${createdAt}`,
    day,
    time,
    text: sanitizeGroupInfoText(text),
    authorProfileId,
    authorSurnameSnapshot,
    authorUid,
    createdAt,
    pinned: false,
    doneBy: {},
  };
}

// L'auteur peut modifier/supprimer son propre item ; le propriétaire peut
// modifier/supprimer n'importe quel item (même logique que canUpdateOwnerCode
// ailleurs dans l'appli) — isOwner est calculé par l'appelant, cette fonction
// ne recalcule jamais elle-même la propriété.
export function canEditGroupInfoItem(
  actorProfileId: string,
  item: Pick<CloudGroupInfoItem, "authorProfileId">,
  isOwner: boolean
): boolean {
  return isOwner || actorProfileId === item.authorProfileId;
}

// Suppression : même règle que l'édition (pas de raison de les distinguer
// dans ce périmètre, contrairement à canRenameChatConversation/
// canLeaveChatConversation qui diffèrent vraiment côté Chat).
export const canDeleteGroupInfoItem = canEditGroupInfoItem;

// Épingler/désépingler : réservé au propriétaire, indépendamment de qui a
// écrit l'item (règle métier actée avec Jean-Philippe).
export function canPinGroupInfoItem(isOwner: boolean): boolean {
  return isOwner;
}

// Même idiome que `isPastDay` dans App.tsx (ResultsScreen) : un jour est
// révolu s'il est strictement avant le jour courant du voyage.
export function isGroupInfoDayPast(day: number, currentDay: number): boolean {
  return day < currentDay;
}

export function groupInfoDoneByProfile(
  item: Pick<CloudGroupInfoItem, "doneBy">,
  profileId: string
): boolean {
  return item.doneBy[profileId] === true;
}

// Tri d'affichage : épinglés d'abord (récent en premier parmi eux), puis le
// reste par jour croissant, puis heure (les items avec heure renseignée
// avant ceux sans heure — la valeur elle-même est du texte libre, pas
// analysée comme une vraie heure), puis ordre de création.
export function sortGroupInfoItems(items: readonly CloudGroupInfoItem[]): CloudGroupInfoItem[] {
  return [...items].sort((a, b) => {
    if (a.pinned !== b.pinned) {
      return a.pinned ? -1 : 1;
    }
    if (a.pinned && b.pinned) {
      return b.createdAt - a.createdAt;
    }
    if (a.day !== b.day) {
      return a.day - b.day;
    }
    const aHasTime = a.time !== null && a.time.length > 0;
    const bHasTime = b.time !== null && b.time.length > 0;
    if (aHasTime !== bHasTime) {
      return aHasTime ? -1 : 1;
    }
    return a.createdAt - b.createdAt;
  });
}

// Regroupement par jour pour l'affichage (hors items épinglés, déjà rendus
// dans leur propre section "Épinglé" par l'appelant) : conserve l'ordre de
// sortGroupInfoItems à l'intérieur de chaque jour.
export function groupGroupInfoItemsByDay(
  items: readonly CloudGroupInfoItem[]
): Array<{ day: number; items: CloudGroupInfoItem[] }> {
  const byDay = new Map<number, CloudGroupInfoItem[]>();
  for (const item of items) {
    const existing = byDay.get(item.day);
    if (existing) {
      existing.push(item);
    } else {
      byDay.set(item.day, [item]);
    }
  }
  return [...byDay.entries()]
    .sort(([dayA], [dayB]) => dayA - dayB)
    .map(([day, dayItems]) => ({ day, items: dayItems }));
}

// --- Badge non-lu (mêmes formules que computeUnreadChatMessageCount /
// shouldAdvanceChatReadState dans chat.ts, appliquées à un seul tableau
// partagé plutôt qu'à des conversations multiples) ---------------------

export function computeHasUnreadGroupInfo(
  items: readonly CloudGroupInfoItem[],
  lastReadAt: number | null | undefined
): boolean {
  const threshold = lastReadAt ?? 0;
  return items.some((item) => item.createdAt > threshold);
}

// `lastReadAt` ne doit jamais reculer (même cas limite multi-appareils que
// shouldAdvanceChatReadState) — réutilisée par la transaction Firebase
// (markGroupInfoRead dans cloudSyncProvider.ts).
export function shouldAdvanceGroupInfoReadState(
  currentLastReadAt: number | null | undefined,
  candidateLastReadAt: number
): boolean {
  return candidateLastReadAt > (currentLastReadAt ?? 0);
}
