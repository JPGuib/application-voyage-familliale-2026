/**
 * Home screen install detection + native install prompt capture.
 *
 * Story 27.3: offline content survival depends heavily on the app being
 * installed to the home screen (mandatory in practice on iOS Safari, which
 * can purge Cache Storage/IndexedDB after ~7 days of tab-only usage). This
 * module only detects/encourages installation; it never forces it.
 */

export type InstallPlatformHint = "ios" | "android" | "desktop-or-other";

export type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform?: string }>;
};

let deferredInstallPrompt: BeforeInstallPromptEvent | null = null;
let listenerAttached = false;

/**
 * Captures the browser's native "beforeinstallprompt" event (Chrome/Android)
 * so it can be replayed later from an explicit user action, as required by
 * browsers to show their install UI. Safe to call multiple times; only
 * attaches the listener once per process. No-op on platforms that never
 * fire this event (iOS Safari, browsers where the app is already installed).
 */
export function captureInstallPromptEvents(win: Window = window): void {
  if (listenerAttached || typeof win === "undefined" || typeof win.addEventListener !== "function") {
    return;
  }
  listenerAttached = true;
  win.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredInstallPrompt = event as BeforeInstallPromptEvent;
  });
  win.addEventListener("appinstalled", () => {
    deferredInstallPrompt = null;
  });
}

export function hasDeferredInstallPrompt(): boolean {
  return deferredInstallPrompt !== null;
}

/** Replays the captured native install prompt. Must run from a user gesture. */
export async function triggerInstallPrompt(): Promise<"accepted" | "dismissed" | "unavailable"> {
  if (!deferredInstallPrompt) {
    return "unavailable";
  }
  const prompt = deferredInstallPrompt;
  deferredInstallPrompt = null;
  await prompt.prompt();
  const choice = await prompt.userChoice;
  return choice.outcome;
}

/** Test-only reset so the module-level singleton does not leak across tests. */
export function __resetInstallPromptStateForTests(): void {
  deferredInstallPrompt = null;
  listenerAttached = false;
}

export function detectInstallPlatformHint(userAgent?: string): InstallPlatformHint {
  const ua = (userAgent ?? (typeof navigator !== "undefined" ? navigator.userAgent : "")).toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) {
    return "ios";
  }
  if (/android/.test(ua)) {
    return "android";
  }
  return "desktop-or-other";
}

/**
 * True when the app currently runs as an installed/standalone app rather
 * than a regular browser tab. Deliberately defensive: browsers that do not
 * implement `matchMedia` (or test environments) are treated as "not
 * installed", which is the safer default for showing the install reminder.
 */
export function isRunningInstalled(options?: {
  win?: Pick<Window, "matchMedia">;
  nav?: { standalone?: boolean };
}): boolean {
  const win = options?.win ?? (typeof window !== "undefined" ? window : undefined);
  const nav =
    options?.nav ?? (typeof navigator !== "undefined" ? (navigator as Navigator & { standalone?: boolean }) : undefined);

  let standaloneDisplay = false;
  if (win && typeof win.matchMedia === "function") {
    try {
      standaloneDisplay = win.matchMedia("(display-mode: standalone)").matches;
    } catch {
      standaloneDisplay = false;
    }
  }

  const iosStandalone = nav?.standalone === true;
  return standaloneDisplay || iosStandalone;
}

export function installInstructions(platform: InstallPlatformHint): string {
  if (platform === "ios") {
    return 'Sur iPhone/iPad : appuyez sur Partager, puis "Sur l\'ecran d\'accueil".';
  }
  if (platform === "android") {
    return 'Sur Android : appuyez sur le menu du navigateur, puis "Installer l\'application" (ou utilisez le bouton ci-dessous).';
  }
  return "Utilisez le menu de votre navigateur pour installer l'application sur l'ecran d'accueil.";
}
