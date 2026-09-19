export type NotificationPermissionStatus = NotificationPermission | "unsupported";

export type NotificationPreferences = {
  notif_checklist: boolean;
  notif_game: boolean;
  notif_comments: boolean;
  lastGameReminderDate?: string;
  lastGameReminderSlot?: string;
};

export type PendingGameReminderSlot = {
  id: string;
  gameDay: number;
  scheduledAt: Date;
};

export const DEFAULT_NOTIFICATION_PREFS: NotificationPreferences = {
  notif_checklist: false,
  notif_game: false,
  notif_comments: false,
};

export const NOTIFICATION_PREFS_STORAGE_KEY = "jp-notification-prefs-by-profile";

type NotificationPrefsByProfile = Record<string, NotificationPreferences>;

function normalizePreferences(value: Partial<NotificationPreferences> | null | undefined): NotificationPreferences {
  return {
    notif_checklist: Boolean(value?.notif_checklist),
    notif_game: Boolean(value?.notif_game),
    notif_comments: Boolean(value?.notif_comments),
    ...(value?.lastGameReminderDate ? { lastGameReminderDate: value.lastGameReminderDate } : {}),
    ...(value?.lastGameReminderSlot ? { lastGameReminderSlot: value.lastGameReminderSlot } : {}),
  };
}

export function areNotificationsSupported(): boolean {
  return typeof window !== "undefined" && typeof window.Notification !== "undefined";
}

export function getNotificationPermissionStatus(): NotificationPermissionStatus {
  if (!areNotificationsSupported()) {
    return "unsupported";
  }
  return window.Notification.permission;
}

export async function requestPermission(): Promise<NotificationPermission> {
  if (!areNotificationsSupported()) {
    return "denied";
  }
  return window.Notification.requestPermission();
}

export function areNotificationsEnabled(): boolean {
  return areNotificationsSupported() && window.Notification.permission === "granted";
}

function canUseServiceWorkerNotifications(): boolean {
  return typeof navigator !== "undefined" && "serviceWorker" in navigator;
}

function showNotificationWithServiceWorker(title: string, body: string): void {
  if (!canUseServiceWorkerNotifications()) {
    return;
  }

  void navigator.serviceWorker
    .getRegistration()
    .then((registration) => {
      if (!registration || typeof registration.showNotification !== "function") {
        return;
      }
      return registration.showNotification(title, {
        body,
        icon: "/icons/icon-192.png",
      });
    })
    .catch(() => {
      // Silent failure: notifications are optional and must never crash the app.
    });
}

export function showNotification(title: string, body: string): boolean {
  if (!areNotificationsEnabled()) {
    return false;
  }

  try {
    new window.Notification(title, {
      body,
      icon: "/icons/icon-192.png",
    });
    return true;
  } catch {
    // Some Android/PWA contexts reject `new Notification(...)` and require
    // ServiceWorkerRegistration.showNotification().
    showNotificationWithServiceWorker(title, body);
    return canUseServiceWorkerNotifications();
  }
}

export function readNotificationPrefsByProfile(): NotificationPrefsByProfile {
  try {
    const raw = localStorage.getItem(NOTIFICATION_PREFS_STORAGE_KEY);
    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") {
      return {};
    }

    const next: NotificationPrefsByProfile = {};
    for (const [profileId, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (!profileId) {
        continue;
      }
      if (!value || typeof value !== "object") {
        continue;
      }
      next[profileId] = normalizePreferences(value as Partial<NotificationPreferences>);
    }

    return next;
  } catch {
    return {};
  }
}

export function readNotificationPreferences(profileId: string): NotificationPreferences {
  const byProfile = readNotificationPrefsByProfile();
  return byProfile[profileId] ?? DEFAULT_NOTIFICATION_PREFS;
}

export function saveNotificationPreferences(
  profileId: string,
  preferences: NotificationPreferences
): NotificationPreferences {
  const byProfile = readNotificationPrefsByProfile();
  const normalized = normalizePreferences(preferences);
  byProfile[profileId] = normalized;
  localStorage.setItem(NOTIFICATION_PREFS_STORAGE_KEY, JSON.stringify(byProfile));
  return normalized;
}

export function updateNotificationPreferences(
  profileId: string,
  updates: Partial<NotificationPreferences>
): NotificationPreferences {
  const current = readNotificationPreferences(profileId);
  const merged = normalizePreferences({
    ...current,
    ...updates,
  });
  return saveNotificationPreferences(profileId, merged);
}

export function shouldTriggerChecklistReminder(
  daysUntilStart: number | null,
  checklistPercent: number,
  preferences: NotificationPreferences
): boolean {
  return (daysUntilStart === 3 || daysUntilStart === 1) && preferences.notif_checklist && checklistPercent < 100;
}

const GAME_REMINDER_TIMES = [
  { dayOffset: 0, hour: 18 },
  { dayOffset: 1, hour: 9 },
  { dayOffset: 1, hour: 12 },
  { dayOffset: 1, hour: 16 },
] as const;

export function getPendingGameReminderSlots(
  tripStartDate: string | null | undefined,
  gameDay: number,
  now: Date = new Date()
): PendingGameReminderSlot[] {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(tripStartDate ?? "");
  if (!match || gameDay < 1) {
    return [];
  }

  const [, year, month, day] = match;
  const gameDate = new Date(Number(year), Number(month) - 1, Number(day));
  if (
    gameDate.getFullYear() !== Number(year) ||
    gameDate.getMonth() !== Number(month) - 1 ||
    gameDate.getDate() !== Number(day)
  ) {
    return [];
  }
  gameDate.setDate(gameDate.getDate() + gameDay - 1);

  return GAME_REMINDER_TIMES.map((slot, index) => {
    const scheduledAt = new Date(gameDate);
    scheduledAt.setDate(scheduledAt.getDate() + slot.dayOffset);
    scheduledAt.setHours(slot.hour, 0, 0, 0);
    return { id: `${tripStartDate}:${gameDay}:${index}`, gameDay, scheduledAt };
  }).filter((slot) => slot.scheduledAt.getTime() >= now.getTime() - 60_000);
}

function parseGameReminderSlot(slotId: string | undefined): {
  tripStartDate: string;
  order: number;
} | null {
  const match = /^(\d{4}-\d{2}-\d{2}):(\d+):([0-3])$/.exec(slotId ?? "");
  if (!match) return null;
  return {
    tripStartDate: match[1],
    order: Number(match[2]) * GAME_REMINDER_TIMES.length + Number(match[3]),
  };
}

export function shouldTriggerGameReminder(
  gameDay: number,
  gameHistory: Array<{ day: number }>,
  reminderSlotId: string,
  preferences: NotificationPreferences
): boolean {
  if (!preferences.notif_game || gameHistory.some((entry) => entry.day === gameDay)) {
    return false;
  }

  const currentSlot = parseGameReminderSlot(reminderSlotId);
  const lastSlot = parseGameReminderSlot(preferences.lastGameReminderSlot);
  return (
    currentSlot !== null &&
    (lastSlot === null ||
      lastSlot.tripStartDate !== currentSlot.tripStartDate ||
      currentSlot.order > lastSlot.order)
  );
}
