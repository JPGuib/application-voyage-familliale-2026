import type { Role } from "./owner-policy";
import type { CloudChatConversation, CloudChatMessage } from "../types/cloud";

// Identifiant fixe de la conversation de groupe "Voyage" créée automatiquement
// (story 28.1) : contrairement aux groupes personnalisés/1-to-1 de la story
// 28.2, une seule conversation existe par famille pour ce périmètre, d'où un
// id déterministe plutôt que généré, ce qui rend ensureVoyageConversation
// idempotent sans avoir besoin de connaître un id existant au préalable.
export const VOYAGE_CONVERSATION_ID = "voyage";
export const VOYAGE_CONVERSATION_NAME = "Voyage";

// "Organisateur" à la place du surnom : cf. règle métier story 28.1.
export const ORGANISATEUR_LABEL = "Organisateur";

export const CHAT_MESSAGE_MAX_LENGTH = 2000;

export type ChatMemberProfile = {
  profileId: string;
  role: Role;
};

// Un profil visiteur n'est jamais joignable en chat (story 28.1 §règles
// métier, repris en story 28.2 pour les groupes personnalisés).
export function isChatEligibleRole(role: Role): boolean {
  return role !== "visiteur";
}

// Surnom figé au moment de l'envoi d'un message : "Organisateur" pour le
// profil propriétaire (peu importe son surnom réel), sinon son surnom
// courant. Appelé une seule fois à la création du message ; le résultat est
// stocké dans authorSurnameSnapshot et n'est plus jamais recalculé, ce qui
// garantit qu'un changement de propriétaire ou un renommage ultérieur ne
// modifie pas rétroactivement l'auteur affiché des anciens messages (cf.
// cas limites de la story 28.1).
export function resolveChatAuthorSnapshotLabel(role: Role, surname: string): string {
  if (role === "proprietaire") {
    return ORGANISATEUR_LABEL;
  }

  const trimmed = surname.trim();
  return trimmed.length > 0 ? trimmed : "Profil";
}

// Construit la conversation "Voyage" à créer si elle n'existe pas encore
// (à la création de la famille, ou à la première ouverture de la rubrique
// Chat si la famille existait déjà sans conversation, cf. story 28.1).
export function buildVoyageConversationSeed(
  profiles: readonly ChatMemberProfile[],
  createdByProfileId: string,
  createdAt: number
): CloudChatConversation {
  const memberProfileIds: Record<string, true> = {};
  for (const profile of profiles) {
    if (isChatEligibleRole(profile.role)) {
      memberProfileIds[profile.profileId] = true;
    }
  }

  return {
    conversationId: VOYAGE_CONVERSATION_ID,
    type: "group",
    name: VOYAGE_CONVERSATION_NAME,
    isDefaultVoyage: true,
    memberProfileIds,
    createdAt,
    createdByProfileId,
  };
}

// Diff entre les membres attendus (tous les profils proprietaire/utilisateur
// actuels) et les membres déjà enregistrés dans la conversation "Voyage" :
// ne renvoie que les profils à ajouter (jamais de retrait automatique dans
// ce périmètre, cf. Hors périmètre story 28.1/28.2).
export function computeMissingVoyageMembers(
  conversation: Pick<CloudChatConversation, "memberProfileIds"> | null,
  eligibleProfileIds: readonly string[]
): string[] {
  const existing = conversation?.memberProfileIds ?? {};
  return eligibleProfileIds.filter((profileId) => existing[profileId] !== true);
}

export function sortChatMessagesAscending(messages: readonly CloudChatMessage[]): CloudChatMessage[] {
  return [...messages].sort((a, b) => a.createdAt - b.createdAt);
}

// Regroupement visuel des messages consécutifs du même auteur (look
// WhatsApp/WeChat demandé par la story 28.1) : suppose des messages déjà
// triés par createdAt croissant.
export function groupConsecutiveChatMessages(
  messages: readonly CloudChatMessage[]
): CloudChatMessage[][] {
  const groups: CloudChatMessage[][] = [];

  for (const message of messages) {
    const lastGroup = groups[groups.length - 1];
    if (lastGroup && lastGroup[0].authorProfileId === message.authorProfileId) {
      lastGroup.push(message);
    } else {
      groups.push([message]);
    }
  }

  return groups;
}

export type ChatMessageTimestamp = {
  time: string;
  dateLabel: string | null;
};

function isSameCalendarDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

// Heure d'envoi toujours affichée ; date affichée seulement si le message ne
// date pas du jour courant (règle métier story 28.1).
export function formatChatMessageTimestamp(
  createdAt: number,
  now: number = Date.now()
): ChatMessageTimestamp {
  const messageDate = new Date(createdAt);
  const nowDate = new Date(now);

  const time = new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(messageDate);

  if (isSameCalendarDay(messageDate, nowDate)) {
    return { time, dateLabel: null };
  }

  const dateLabel = new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
  }).format(messageDate);

  return { time, dateLabel };
}

export function sanitizeChatMessageText(rawText: string): string {
  return rawText.trim().slice(0, CHAT_MESSAGE_MAX_LENGTH);
}
