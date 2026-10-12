import { cert, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { env, isFirebaseConfigured } from '../config/env.js';
import { AuthNotConfiguredError, TokenExpiredError, type VerifiedToken } from '../middleware/auth.js';

let app: App | null = null;

function getFirebaseApp(): App {
  if (!isFirebaseConfigured) throw new AuthNotConfiguredError('Firebase Admin credentials are not configured.');
  if (app) return app;
  app =
    getApps()[0] ??
    initializeApp({
      credential: cert({
        projectId: env.FIREBASE_PROJECT_ID,
        clientEmail: env.FIREBASE_CLIENT_EMAIL,
        // Hosting dashboards usually store the key with literal "\n" sequences.
        privateKey: env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, '\n'),
      }),
    });
  return app;
}

export function firebaseAuth(): Auth {
  return getAuth(getFirebaseApp());
}

/** Verifies signature, audience, expiry and — via checkRevoked — that the session wasn't revoked. */
export async function verifyFirebaseIdToken(token: string): Promise<VerifiedToken> {
  try {
    const decoded = await firebaseAuth().verifyIdToken(token, true);
    return { uid: decoded.uid, email: decoded.email };
  } catch (err) {
    if (err instanceof AuthNotConfiguredError) throw err;
    const code = (err as { code?: string }).code;
    if (code === 'auth/id-token-expired') throw new TokenExpiredError('expired');
    throw err;
  }
}
