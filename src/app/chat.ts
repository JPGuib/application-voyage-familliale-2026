import type { Role } from "./owner-policy";
import type {
  ChatPollType,
  CloudChatConversation,
  CloudChatMessage,
  CloudChatPollResponse,
  CloudChatPollResponsesByProfile,
} from "../types/cloud";

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

// --- Groupes personnalisés et conversations 1-to-1 (story 28.2) ---------

export const CUSTOM_CHAT_NAME_MAX_LENGTH = 60;

// Nom technique de remplissage stocké pour une conversation 1-to-1 (le champ
// `name` est obligatoire dans CloudChatConversation) : jamais affiché tel
// quel, cf. resolveChatConversationDisplayName ci-dessous qui recalcule
// toujours l'affichage à partir du profil courant de l'autre participant.
export const DIRECT_CONVERSATION_PLACEHOLDER_NAME = "Conversation";

function generateRandomIdSuffix(): string {
  return Math.random().toString(36).slice(2, 10);
}

// Id généré côté client (contrairement à VOYAGE_CONVERSATION_ID qui est
// déterministe) : les groupes personnalisés et conversations 1-to-1 sont
// multiples par famille, cf. story 28.2. Pas de déduplication en v1 (deux
// 1-to-1 entre les deux mêmes profils peuvent coexister, cf. Cas limites).
export function generateChatConversationId(): string {
  return `conv-${Date.now()}-${generateRandomIdSuffix()}`;
}

export function sanitizeChatConversationName(rawName: string): string {
  return rawName.trim().slice(0, CUSTOM_CHAT_NAME_MAX_LENGTH);
}

// Groupe personnalisé nommé (story 28.2 §règles métier) : le créateur est
// toujours inclus, avec au moins un autre membre (déjà filtré des visiteurs
// par l'appelant, cf. listSelectableChatMembers).
export function buildGroupConversationDraft(
  name: string,
  creatorProfileId: string,
  otherMemberProfileIds: readonly string[],
  createdAt: number
): CloudChatConversation {
  const memberProfileIds: Record<string, true> = { [creatorProfileId]: true };
  for (const profileId of otherMemberProfileIds) {
    memberProfileIds[profileId] = true;
  }

  return {
    conversationId: generateChatConversationId(),
    type: "group",
    name: sanitizeChatConversationName(name),
    isDefaultVoyage: false,
    memberProfileIds,
    createdAt,
    createdByProfileId: creatorProfileId,
  };
}

// Conversation 1-to-1 (story 28.2 §règles métier) : toujours exactement deux
// membres, jamais de nom saisi par l'utilisateur.
export function buildDirectConversationDraft(
  creatorProfileId: string,
  otherProfileId: string,
  createdAt: number
): CloudChatConversation {
  return {
    conversationId: generateChatConversationId(),
    type: "direct",
    name: DIRECT_CONVERSATION_PLACEHOLDER_NAME,
    isDefaultVoyage: false,
    memberProfileIds: { [creatorProfileId]: true, [otherProfileId]: true },
    createdAt,
    createdByProfileId: creatorProfileId,
  };
}

// La conversation "Voyage" reste figée (story 28.1) ; n'importe quel membre
// d'un groupe personnalisé ou d'une conversation 1-to-1 peut en revanche
// modifier le nom (tranché avec Jean-Philippe, story 28.2) — revérifié côté
// règles Firebase (isDefaultVoyage !== true), y compris pour le propriétaire.
export function canRenameChatConversation(
  conversation: Pick<CloudChatConversation, "isDefaultVoyage">
): boolean {
  return conversation.isDefaultVoyage !== true;
}

// Seul un groupe personnalisé (jamais "Voyage") peut être quitté ; une
// conversation 1-to-1 ne se "quitte" pas unilatéralement (elle reste
// accessible aux deux participants), seul un masquage local est proposé
// (cf. ChatHomeScreen, mécanisme purement local/hors cloud).
export function canLeaveChatConversation(
  conversation: Pick<CloudChatConversation, "isDefaultVoyage" | "type">
): boolean {
  return conversation.isDefaultVoyage !== true && conversation.type === "group";
}

export type ChatProfileLookup = Record<string, { surname: string; role: Role } | undefined>;

// Nom affiché d'une conversation : "Voyage"/nom du groupe tel quel, ou pour
// une conversation 1-to-1, recalculé à chaque appel à partir du profil
// courant de l'autre participant (jamais figé, contrairement à
// authorSurnameSnapshot sur les messages) — un renommage ultérieur du
// surnom de l'autre participant doit se refléter immédiatement ici. Si ce
// profil a été supprimé entre-temps (cas limite story 28.2), on retombe sur
// un libellé neutre plutôt que de planter l'écran.
export function resolveChatConversationDisplayName(
  conversation: Pick<CloudChatConversation, "type" | "name" | "memberProfileIds">,
  currentProfileId: string,
  profilesById: ChatProfileLookup
): string {
  if (conversation.type !== "direct") {
    return conversation.name;
  }

  const otherProfileId = Object.keys(conversation.memberProfileIds).find(
    (profileId) => profileId !== currentProfileId
  );
  const otherProfile = otherProfileId ? profilesById[otherProfileId] : undefined;

  if (!otherProfile) {
    return "Profil supprimé";
  }

  return resolveChatAuthorSnapshotLabel(otherProfile.role, otherProfile.surname);
}

// Membres proposés à la sélection lors de la création d'une conversation
// (story 28.2 §règles métier) : jamais les visiteurs, jamais le profil
// courant (déjà inclus automatiquement en tant que créateur).
export function listSelectableChatMembers(
  profiles: readonly ChatMemberProfile[],
  currentProfileId: string
): ChatMemberProfile[] {
  return profiles.filter(
    (profile) => isChatEligibleRole(profile.role) && profile.profileId !== currentProfileId
  );
}

// Aperçu tronqué à afficher dans la liste des conversations (story 28.2) :
// mis à plat sur une seule ligne (pas de retours à la ligne dans la liste).
export function truncateChatMessagePreview(text: string, maxLength: number = 60): string {
  const singleLine = text.replace(/\s+/g, " ").trim();
  return singleLine.length > maxLength ? `${singleLine.slice(0, maxLength - 1)}…` : singleLine;
}

// Texte source de l'aperçu ci-dessus pour le dernier message d'une
// conversation (story 28.2, puis story 28.3) : un sondage n'a pas de
// `text` (toujours ""), on affiche donc sa question à la place.
export function chatMessagePreviewSourceText(message: Pick<CloudChatMessage, "kind" | "text" | "pollQuestion">): string {
  return message.kind === "poll" ? `📊 ${message.pollQuestion ?? ""}` : message.text;
}

// Tri de la liste des conversations, la plus récemment active en premier
// (dernier message si connu, sinon date de création) ; clé secondaire sur
// conversationId pour un ordre stable entre deux rendus à activité égale.
export function sortChatConversationsByActivity<
  T extends { conversationId: string; createdAt: number }
>(conversations: readonly T[], lastActivityAt: (conversation: T) => number): T[] {
  return [...conversations].sort((a, b) => {
    const diff = lastActivityAt(b) - lastActivityAt(a);
    return diff !== 0 ? diff : a.conversationId.localeCompare(b.conversationId);
  });
}

// --- Badge de messages non lus (story 28.4) -----------------------------

// Nombre de messages chargés par conversation pour calculer le badge non-lu
// dans ChatHomeScreen, plafonné à l'historique chargé (cf. cas limite dédié
// de la story 28.4) — indépendant de INITIAL_MESSAGE_LIMIT dans ChatScreen
// (le badge n'a pas besoin d'afficher ces messages, seulement de les
// compter).
export const CHAT_UNREAD_COUNT_MESSAGE_LIMIT = 50;

// Plafond d'affichage du compteur par conversation ("9+", règle métier
// story 28.4) : purement visuel, ne change rien au calcul du non-lu.
export const UNREAD_BADGE_DISPLAY_CAP = 9;

// Non-lu = messages plus récents que le dernier passage sur la conversation
// (ou tous les messages chargés si le profil n'a jamais ouvert la
// conversation, cf. cas limite "profil ajouté après coup à un groupe
// existant").
export function computeUnreadChatMessageCount(
  messages: readonly CloudChatMessage[],
  lastReadAt: number | null | undefined
): number {
  const threshold = lastReadAt ?? 0;
  return messages.filter((message) => message.createdAt > threshold).length;
}

export function formatUnreadBadgeLabel(count: number): string {
  return count > UNREAD_BADGE_DISPLAY_CAP ? `${UNREAD_BADGE_DISPLAY_CAP}+` : String(count);
}

// `lastReadAt` ne doit jamais reculer (cas limite story 28.4 : deux
// appareils du même profil, un resté ouvert sur un ancien état ne doit pas
// écraser une lecture plus récente faite depuis un autre appareil).
// Comparaison pure, réutilisée à la fois par la transaction Firebase
// (markChatConversationRead dans cloudSyncProvider.ts) et testable
// indépendamment du SDK.
export function shouldAdvanceChatReadState(
  currentLastReadAt: number | null | undefined,
  candidateLastReadAt: number
): boolean {
  return candidateLastReadAt > (currentLastReadAt ?? 0);
}

// --- Sondages du propriétaire dans la conversation "Voyage" (story 28.3) --

// Libellé fixe affiché sur la bulle d'un sondage, quel que soit le surnom
// réel du propriétaire (cf. règle métier §Contraintes UX de la story : "Ton
// familial pour les libellés").
export const POLL_BUBBLE_LABEL = "Sondage de l'Organisateur";

// Les deux seules options possibles pour un sondage de type "oui_non" (pas
// de choix multiples dans ce périmètre, cf. Hors périmètre de la story).
export const POLL_OUI_NON_OPTIONS = ["oui", "non"] as const;

export const POLL_LIBRE_ANSWER_MAX_LENGTH = 100;

// Seul le propriétaire peut créer un sondage, et uniquement dans la
// conversation "Voyage" (jamais un groupe personnalisé ni un 1-to-1, cf.
// story 28.2) — règle métier exacte de la story 28.3, revérifiée côté
// règles Firebase (voir database.rules.*.json).
export function canCreateChatPoll(
  role: Role,
  conversation: Pick<CloudChatConversation, "isDefaultVoyage">
): boolean {
  return role === "proprietaire" && conversation.isDefaultVoyage === true;
}

// La question d'un sondage suit la même limite de longueur qu'un message
// texte classique (pas de nouveau champ magique dans les règles Firebase).
export function sanitizePollQuestion(rawQuestion: string): string {
  return rawQuestion.trim().slice(0, CHAT_MESSAGE_MAX_LENGTH);
}

export function sanitizePollLibreAnswer(rawAnswer: string): string {
  return rawAnswer.trim().slice(0, POLL_LIBRE_ANSWER_MAX_LENGTH);
}

// Construit le message spécial `kind: "poll"` à envoyer dans la conversation
// "Voyage" (cf. sendChatMessage, réutilisé tel quel pour ce kind : seul le
// contenu du message change, pas le mécanisme d'envoi). `text` reste ""
// et n'est jamais affiché pour ce kind (voir CloudChatMessage dans
// types/cloud.ts) ; `pollClosed` démarre toujours à false.
export function buildChatPollMessage(
  conversationId: string,
  pollType: ChatPollType,
  rawQuestion: string,
  authorProfileId: string,
  authorSurnameSnapshot: string,
  authorUid: string,
  createdAt: number
): CloudChatMessage {
  return {
    messageId: `${authorProfileId}-${createdAt}`,
    conversationId,
    authorProfileId,
    authorSurnameSnapshot,
    authorUid,
    kind: "poll",
    text: "",
    createdAt,
    pollType,
    pollQuestion: sanitizePollQuestion(rawQuestion),
    pollClosed: false,
  };
}

// Un sondage clos refuse toute nouvelle réponse ou modification, pour
// n'importe quel profil (règle métier exacte, revérifiée côté règles
// Firebase via pollClosed).
export function canRespondToChatPoll(poll: Pick<CloudChatMessage, "pollClosed">): boolean {
  return poll.pollClosed !== true;
}

// Validation de la forme d'une réponse avant envoi : "oui"/"non" strict pour
// un sondage fermé, texte non vide plafonné à 100 caractères pour un
// sondage libre.
export function isChatPollAnswerValueValid(pollType: ChatPollType, value: string): boolean {
  if (pollType === "oui_non") {
    return (POLL_OUI_NON_OPTIONS as readonly string[]).includes(value);
  }
  return value.length > 0 && value.length <= POLL_LIBRE_ANSWER_MAX_LENGTH;
}

export function buildChatPollResponse(
  profileId: string,
  value: string,
  authorUid: string,
  updatedAt: number
): CloudChatPollResponse {
  return { profileId, value, authorUid, updatedAt };
}

export function getChatPollResponseForProfile(
  responses: CloudChatPollResponsesByProfile | undefined,
  profileId: string
): CloudChatPollResponse | undefined {
  return responses?.[profileId];
}

// Décompte des deux options d'un sondage "oui_non" (critère d'acceptation
// #2 de la story) : les résultats restent nominatifs (voir
// getChatPollResponseForProfile/resolveChatAuthorSnapshotLabel côté UI pour
// afficher qui a répondu quoi), ce décompte n'est qu'un résumé chiffré.
export function computeOuiNonPollTally(
  responses: CloudChatPollResponsesByProfile | undefined
): { oui: number; non: number } {
  const values = Object.values(responses ?? {});
  return {
    oui: values.filter((response) => response.value === "oui").length,
    non: values.filter((response) => response.value === "non").length,
  };
}
