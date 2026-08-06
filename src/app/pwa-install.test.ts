import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  __resetInstallPromptStateForTests,
  captureInstallPromptEvents,
  detectInstallPlatformHint,
  hasDeferredInstallPrompt,
  installInstructions,
  isRunningInstalled,
  triggerInstallPrompt,
} from "./pwa-install";

describe("pwa install helpers", () => {
  beforeEach(() => {
    __resetInstallPromptStateForTests();
  });

  it("detects platform from the user agent string", () => {
    expect(detectInstallPlatformHint("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)")).toBe("ios");
    expect(detectInstallPlatformHint("Mozilla/5.0 (Linux; Android 14; Pixel 8)")).toBe("android");
    expect(detectInstallPlatformHint("Mozilla/5.0 (Windows NT 10.0; Win64; x64)")).toBe("desktop-or-other");
  });

  it("treats standalone display mode as installed", () => {
    const win = { matchMedia: vi.fn().mockReturnValue({ matches: true }) };
    expect(isRunningInstalled({ win, nav: {} })).toBe(true);
    expect(win.matchMedia).toHaveBeenCalledWith("(display-mode: standalone)");
  });

  it("treats iOS navigator.standalone as installed", () => {
    const win = { matchMedia: vi.fn().mockReturnValue({ matches: false }) };
    expect(isRunningInstalled({ win, nav: { standalone: true } })).toBe(true);
  });

  it("reports not installed when neither signal is present", () => {
    const win = { matchMedia: vi.fn().mockReturnValue({ matches: false }) };
    expect(isRunningInstalled({ win, nav: {} })).toBe(false);
  });

  it("defaults to not-installed when matchMedia is unavailable (e.g. older browsers, test env)", () => {
    expect(isRunningInstalled({ win: {} as Pick<Window, "matchMedia">, nav: {} })).toBe(false);
  });

  it("gives platform-specific install instructions", () => {
    expect(installInstructions("ios")).toMatch(/Partager/i);
    expect(installInstructions("android")).toMatch(/Installer/i);
    expect(installInstructions("desktop-or-other")).toMatch(/menu/i);
  });

  it("captures the native beforeinstallprompt event and replays it on demand", async () => {
    const listeners: Record<string, ((event: unknown) => void)[]> = {};
    const fakeWindow = {
      addEventListener: (type: string, handler: (event: unknown) => void) => {
        listeners[type] = [...(listeners[type] ?? []), handler];
      },
    } as unknown as Window;

    captureInstallPromptEvents(fakeWindow);
    expect(hasDeferredInstallPrompt()).toBe(false);

    const prompt = vi.fn().mockResolvedValue(undefined);
    const fakeEvent = {
      preventDefault: vi.fn(),
      prompt,
      userChoice: Promise.resolve({ outcome: "accepted" as const }),
    };
    listeners["beforeinstallprompt"]?.[0]?.(fakeEvent);
    expect(fakeEvent.preventDefault).toHaveBeenCalledTimes(1);
    expect(hasDeferredInstallPrompt()).toBe(true);

    const outcome = await triggerInstallPrompt();

    expect(outcome).toBe("accepted");
    expect(prompt).toHaveBeenCalledTimes(1);
    expect(hasDeferredInstallPrompt()).toBe(false);
  });

  it("reports unavailable when no native prompt was ever captured", async () => {
    expect(await triggerInstallPrompt()).toBe("unavailable");
  });

  it("clears the deferred prompt once the app is installed", () => {
    const listeners: Record<string, ((event: unknown) => void)[]> = {};
    const fakeWindow = {
      addEventListener: (type: string, handler: (event: unknown) => void) => {
        listeners[type] = [...(listeners[type] ?? []), handler];
      },
    } as unknown as Window;

    captureInstallPromptEvents(fakeWindow);
    listeners["beforeinstallprompt"]?.[0]?.({
      preventDefault: vi.fn(),
      prompt: vi.fn(),
      userChoice: Promise.resolve({ outcome: "accepted" as const }),
    });
    expect(hasDeferredInstallPrompt()).toBe(true);

    listeners["appinstalled"]?.[0]?.({});
    expect(hasDeferredInstallPrompt()).toBe(false);
  });
});
