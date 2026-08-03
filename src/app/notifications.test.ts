import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_NOTIFICATION_PREFS,
  areNotificationsSupported,
  readNotificationPreferences,
  requestPermission,
  saveNotificationPreferences,
  shouldTriggerChecklistReminder,
  shouldTriggerGameReminder,
  showNotification,
} from "./notifications";

describe("notifications", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.unstubAllGlobals();
  });

  it("returns false when Notification API is not available", () => {
    expect(areNotificationsSupported()).toBe(false);
  });

  it("returns denied when requesting permission without API support", async () => {
    await expect(requestPermission()).resolves.toBe("denied");
  });

  it("does not create browser notifications when permission is not granted", () => {
    const notificationSpy = vi.fn();
    class MockNotification {
      static permission: NotificationPermission = "default";
      static requestPermission = vi.fn().mockResolvedValue("default");

      constructor(title: string, options: NotificationOptions) {
        notificationSpy(title, options);
      }
    }
    vi.stubGlobal("Notification", MockNotification);

    const shown = showNotification("Titre", "Corps");

    expect(shown).toBe(false);
    expect(notificationSpy).not.toHaveBeenCalled();
  });

  it("falls back to service worker notification when Notification constructor throws", async () => {
    const showNotificationViaSw = vi.fn().mockResolvedValue(undefined);
    const getRegistration = vi.fn().mockResolvedValue({
      showNotification: showNotificationViaSw,
    });

    class ThrowingNotification {
      static permission: NotificationPermission = "granted";
      static requestPermission = vi.fn().mockResolvedValue("granted");

      constructor() {
        throw new TypeError("Illegal constructor");
      }
    }

    vi.stubGlobal("Notification", ThrowingNotification);
    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: {
        getRegistration,
      },
    });

    const shown = showNotification("Titre", "Corps");
    expect(shown).toBe(true);

    await Promise.resolve();
    await Promise.resolve();

    expect(getRegistration).toHaveBeenCalled();
    expect(showNotificationViaSw).toHaveBeenCalledWith("Titre", {
      body: "Corps",
      icon: "/icons/icon-192.png",
    });
  });

  it("returns default prefs when profile has no stored preferences", () => {
    expect(readNotificationPreferences("p1")).toEqual(DEFAULT_NOTIFICATION_PREFS);
  });

  it("saves preferences per profile without overwriting other profiles", () => {
    saveNotificationPreferences("p1", {
      notif_checklist: true,
      notif_game: false,
      notif_comments: false,
    });

    saveNotificationPreferences("p2", {
      notif_checklist: false,
      notif_game: true,
      notif_comments: true,
      lastGameReminderDate: "2026-08-03",
    });

    expect(readNotificationPreferences("p1")).toEqual({
      notif_checklist: true,
      notif_game: false,
      notif_comments: false,
    });
    expect(readNotificationPreferences("p2")).toEqual({
      notif_checklist: false,
      notif_game: true,
      notif_comments: true,
      lastGameReminderDate: "2026-08-03",
    });
  });

  it("triggers checklist reminder only for J-3/J-1 with incomplete checklist", () => {
    const prefs = {
      notif_checklist: true,
      notif_game: false,
      notif_comments: false,
    };

    expect(shouldTriggerChecklistReminder(3, 99, prefs)).toBe(true);
    expect(shouldTriggerChecklistReminder(1, 50, prefs)).toBe(true);
    expect(shouldTriggerChecklistReminder(3, 100, prefs)).toBe(false);
    expect(shouldTriggerChecklistReminder(2, 20, prefs)).toBe(false);
  });

  it("triggers game reminder only when user has not played and was not reminded today", () => {
    const prefs = {
      notif_checklist: false,
      notif_game: true,
      notif_comments: false,
      lastGameReminderDate: "2026-08-02",
    };

    expect(shouldTriggerGameReminder(4, [], "2026-08-03", prefs)).toBe(true);
    expect(shouldTriggerGameReminder(4, [{ day: 4 }], "2026-08-03", prefs)).toBe(false);
    expect(
      shouldTriggerGameReminder(4, [], "2026-08-03", {
        ...prefs,
        lastGameReminderDate: "2026-08-03",
      })
    ).toBe(false);
  });
});
