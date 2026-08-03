export type NotificationPermissionStatus = NotificationPermission | "unsupported";

export type NotificationPreferences = {
  notif_checklist: boolean;
  notif_game: boolean;
  notif_comments: boolean;
  lastGameReminderDate?: string;
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

export function showNotification(title: string, body: string): boolean {
  if (!areNotificationsEnabled()) {
    return false;
  }
  new window.Notification(title, {
    body,
    icon: "/icons/icon-192.png",
  });
  return true;
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

export function shouldTriggerGameReminder(
  currentDay: number,
  gameHistory: Array<{ day: number }>,
  todayIsoDate: string,
  preferences: NotificationPreferences
): boolean {
  const alreadyPlayedToday = gameHistory.some((entry) => entry.day === currentDay);
  if (alreadyPlayedToday) {
    return false;
  }

  return preferences.notif_game && preferences.lastGameReminderDate !== todayIsoDate;
}
