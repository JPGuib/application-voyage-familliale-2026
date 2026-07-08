import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getDatabase, type Database } from "firebase/database";

type FirebaseEnv = {
  apiKey: string;
  authDomain: string;
  databaseURL: string;
  projectId: string;
  appId: string;
};

function readFirebaseEnv(): FirebaseEnv | null {
  const apiKey = import.meta.env.VITE_FIREBASE_API_KEY as string | undefined;
  const authDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined;
  const databaseURL = import.meta.env.VITE_FIREBASE_DATABASE_URL as string | undefined;
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined;
  const appId = import.meta.env.VITE_FIREBASE_APP_ID as string | undefined;

  if (!apiKey || !authDomain || !databaseURL || !projectId || !appId) {
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
