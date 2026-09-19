import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_NOTIFICATION_PREFS,
  areNotificationsSupported,
  getPendingGameReminderSlots,
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

  it("schedules the four future slots across the active game window", () => {
    const slots = getPendingGameReminderSlots(
      "2026-08-16",
      4,
      new Date(2026, 7, 19, 17, 59)
    );

    expect(slots.map((slot) => [slot.id, slot.scheduledAt.getDate(), slot.scheduledAt.getHours()])).toEqual([
      ["2026-08-16:4:0", 19, 18],
      ["2026-08-16:4:1", 20, 9],
      ["2026-08-16:4:2", 20, 12],
      ["2026-08-16:4:3", 20, 16],
    ]);
  });

  it("does not return missed slots when the app comes back later", () => {
    const slots = getPendingGameReminderSlots(
      "2026-08-16",
      4,
      new Date(2026, 7, 20, 10)
    );

    expect(slots.map((slot) => slot.id)).toEqual(["2026-08-16:4:2", "2026-08-16:4:3"]);
  });

  it("rejects impossible trip dates and keeps a just-due slot eligible", () => {
    expect(getPendingGameReminderSlots("2026-02-31", 1, new Date(2026, 1, 28))).toEqual([]);
    expect(
      getPendingGameReminderSlots("2026-08-16", 1, new Date(2026, 7, 16, 18, 0, 30)).map(
        (slot) => slot.id
      )
    ).toContain("2026-08-16:1:0");
  });

  it("triggers a slot only when the user has not played and it is newer than the persisted slot", () => {
    const prefs = {
      notif_checklist: false,
      notif_game: true,
      notif_comments: false,
      lastGameReminderSlot: "2026-08-16:4:1",
    };

    expect(shouldTriggerGameReminder(4, [], "2026-08-16:4:2", prefs)).toBe(true);
    expect(shouldTriggerGameReminder(4, [{ day: 4 }], "2026-08-16:4:2", prefs)).toBe(false);
    expect(shouldTriggerGameReminder(4, [], "2026-08-16:4:1", prefs)).toBe(false);
    expect(shouldTriggerGameReminder(4, [], "2026-08-16:4:0", prefs)).toBe(false);
    expect(
      shouldTriggerGameReminder(4, [], "2026-08-16:4:2", { ...prefs, notif_game: false })
    ).toBe(false);
    expect(shouldTriggerGameReminder(1, [], "2027-06-01:1:0", prefs)).toBe(true);
  });
});
