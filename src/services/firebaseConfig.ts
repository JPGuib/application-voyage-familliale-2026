import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  onAuthStateChanged,
  signInAnonymously,
  signOut,
  type Auth,
  type User,
} from "firebase/auth";
import { getDatabase, type Database } from "firebase/database";

type FirebaseEnv = {
  apiKey: string;
  authDomain: string;
  databaseURL: string;
  projectId: string;
  appId: string;
};

let hasLoggedFirebaseEnvMismatch = false;

function databaseUrlMatchesProjectId(databaseURL: string, projectId: string): boolean {
  try {
    const hostname = new URL(databaseURL).hostname.toLowerCase();
    const normalizedProjectId = projectId.toLowerCase();

    // Legacy domain: <project-id>.firebaseio.com
    if (hostname === `${normalizedProjectId}.firebaseio.com`) {
      return true;
    }

    // New default RTDB naming: <project-id>-default-rtdb.<region>.firebasedatabase.app
    return hostname.startsWith(`${normalizedProjectId}-`);
  } catch {
    return false;
  }
}

function readFirebaseEnv(): FirebaseEnv | null {
  const apiKey = import.meta.env.VITE_FIREBASE_API_KEY as string | undefined;
  const authDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined;
  const databaseURL = import.meta.env.VITE_FIREBASE_DATABASE_URL as string | undefined;
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined;
  const appId = import.meta.env.VITE_FIREBASE_APP_ID as string | undefined;

  if (!apiKey || !authDomain || !databaseURL || !projectId || !appId) {
    return null;
  }

  if (!databaseUrlMatchesProjectId(databaseURL, projectId)) {
    if (!hasLoggedFirebaseEnvMismatch) {
      hasLoggedFirebaseEnvMismatch = true;
      console.error(
        "[firebase-config] Invalid Firebase env: projectId and databaseURL target different backends.",
        { projectId, databaseURL }
      );
    }
    return null;
  }

  return {
    apiKey,
    authDomain,
    databaseURL,
    projectId,
    appId,
  };
}

export function isFirebaseConfigured(): boolean {
  return readFirebaseEnv() !== null;
}

export function getFirebaseApp(): FirebaseApp | null {
  const env = readFirebaseEnv();
  if (!env) {
    return null;
  }

  if (getApps().length > 0) {
    return getApps()[0];
  }

  return initializeApp(env);
}

export function getFirebaseDatabaseInstance(): Database | null {
  const app = getFirebaseApp();
  if (!app) {
    return null;
  }

  return getDatabase(app);
}

export function getFirebaseAuthInstance(): Auth | null {
  const app = getFirebaseApp();
  if (!app) {
    return null;
  }

  return getAuth(app);
}

export async function ensureFirebaseAnonymousAuth(): Promise<User | null> {
  const auth = getFirebaseAuthInstance();
  if (!auth) {
    return null;
  }

  if (auth.currentUser) {
    if (!navigator.onLine) {
      // Offline: return the cached identity without forcing a server round-trip.
      return auth.currentUser;
    }
    try {
      // Force token refresh so expired/invalid anonymous sessions are detected
      // during bootstrap instead of failing later as opaque permission errors.
      await auth.currentUser.getIdToken(true);
      return auth.currentUser;
    } catch {
      try {
        await signOut(auth);
      } catch {
        // Ignore sign-out errors and continue with a fresh sign-in attempt.
      }
    }
  }

  if (!navigator.onLine) {
    // Cannot create a new anonymous session without network; return null so
    // the caller can enter offline mode gracefully (no error thrown).
    return null;
  }

  const credential = await signInAnonymously(auth);
  return credential.user;
}

export function observeFirebaseUser(
  onUser: (user: User | null) => void,
  onError?: () => void
): () => void {
  const auth = getFirebaseAuthInstance();
  if (!auth) {
    onUser(null);
    return () => {};
  }

  return onAuthStateChanged(auth, onUser, () => onError?.());
}
