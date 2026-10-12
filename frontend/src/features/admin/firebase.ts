import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { browserLocalPersistence, getAuth, setPersistence, type Auth } from 'firebase/auth';
import { config, isFirebaseConfigured } from '@/lib/config';

let auth: Auth | null = null;

/** Only the public Firebase web config is used here; no admin credentials ever reach the browser. */
export function getFirebaseAuth(): Auth {
  if (!isFirebaseConfigured) throw new Error('Firebase is not configured. Set the VITE_FIREBASE_* variables.');
  if (auth) return auth;
  const app: FirebaseApp =
    getApps()[0] ??
    initializeApp({
      apiKey: config.firebase.apiKey,
      authDomain: config.firebase.authDomain,
      projectId: config.firebase.projectId,
      appId: config.firebase.appId,
    });
  auth = getAuth(app);
  void setPersistence(auth, browserLocalPersistence);
  return auth;
}
