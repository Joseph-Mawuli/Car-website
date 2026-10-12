import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { User } from 'firebase/auth';
import { adminApi } from './api';
import { ApiError, setTokenProvider, setUnauthorizedHandler } from '@/lib/api';
import { config, isFirebaseConfigured } from '@/lib/config';
import type { CurrentStaff, Permission, StaffRole } from '@/types';

type Status = 'loading' | 'signedOut' | 'signedIn' | 'notConfigured';

interface AuthContextValue {
  status: Status;
  staff: CurrentStaff | null;
  /** Message to show on the login screen (expired session, access revoked…). */
  notice: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: (notice?: string) => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  can: (permission: Permission) => boolean;
  refreshProfile: () => Promise<void>;
  /** Dev preview only: sign in as a sample role against the in-browser mock API. */
  previewSignIn?: (role: StaffRole) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function friendlyAuthError(err: unknown): string {
  const code = (err as { code?: string })?.code ?? '';
  if (['auth/invalid-credential', 'auth/wrong-password', 'auth/user-not-found', 'auth/invalid-email'].includes(code)) {
    return 'Incorrect email or password.';
  }
  if (code === 'auth/user-disabled') return 'This account has been disabled. Contact the dealership owner.';
  if (code === 'auth/too-many-requests') return 'Too many attempts. Please wait a few minutes and try again.';
  if (code === 'auth/network-request-failed') return 'Network error. Check your connection and try again.';
  if (err instanceof ApiError) return err.message;
  return 'Sign-in failed. Please try again.';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const useMock = import.meta.env.DEV && config.useMockApi;
  const [status, setStatus] = useState<Status>(useMock ? 'signedOut' : isFirebaseConfigured ? 'loading' : 'notConfigured');
  const [staff, setStaff] = useState<CurrentStaff | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const userRef = useRef<User | null>(null);

  const loadProfile = useCallback(async () => {
    try {
      const profile = await adminApi.me();
      setStaff(profile);
      setStatus('signedIn');
    } catch (err) {
      setStaff(null);
      setStatus('signedOut');
      setTokenProvider(null);
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        setNotice(err.message);
        if (!useMock) {
          const { signOut } = await import('firebase/auth');
          const { getFirebaseAuth } = await import('./firebase');
          await signOut(getFirebaseAuth());
        }
      } else {
        setNotice(err instanceof ApiError ? err.message : 'Could not load your staff profile. Please try again.');
      }
    }
  }, [useMock]);

  useEffect(() => {
    if (useMock || !isFirebaseConfigured) return;
    let unsubscribe = () => {};
    let cancelled = false;
    (async () => {
      const [{ onIdTokenChanged }, { getFirebaseAuth }] = await Promise.all([import('firebase/auth'), import('./firebase')]);
      if (cancelled) return;
      let lastUid: string | null = null;
      unsubscribe = onIdTokenChanged(getFirebaseAuth(), (user) => {
        userRef.current = user;
        if (!user) {
          lastUid = null;
          setTokenProvider(null);
          setStaff(null);
          setStatus('signedOut');
          return;
        }
        setTokenProvider((force) => user.getIdToken(force));
        // Token refreshes fire this listener too; only reload the profile when the user changes.
        if (user.uid !== lastUid) {
          lastUid = user.uid;
          setStatus('loading');
          void loadProfile();
        }
      });
    })();
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [useMock, loadProfile]);

  const signIn = useCallback(async (email: string, password: string) => {
    setNotice(null);
    try {
      const [{ signInWithEmailAndPassword }, { getFirebaseAuth }] = await Promise.all([import('firebase/auth'), import('./firebase')]);
      await signInWithEmailAndPassword(getFirebaseAuth(), email, password);
    } catch (err) {
      throw new Error(friendlyAuthError(err), { cause: err });
    }
  }, []);

  const signOut = useCallback(
    async (message?: string) => {
      setNotice(message ?? null);
      setStaff(null);
      setTokenProvider(null);
      setStatus('signedOut');
      if (!useMock && isFirebaseConfigured) {
        const [{ signOut: fbSignOut }, { getFirebaseAuth }] = await Promise.all([import('firebase/auth'), import('./firebase')]);
        await fbSignOut(getFirebaseAuth());
      }
    },
    [useMock],
  );

  const sendPasswordReset = useCallback(async (email: string) => {
    const [{ sendPasswordResetEmail }, { getFirebaseAuth }] = await Promise.all([import('firebase/auth'), import('./firebase')]);
    try {
      await sendPasswordResetEmail(getFirebaseAuth(), email, { url: `${config.siteUrl}/admin/login` });
    } catch (err) {
      // Don't reveal whether an account exists for this email.
      if ((err as { code?: string }).code === 'auth/user-not-found') return;
      throw new Error(friendlyAuthError(err), { cause: err });
    }
  }, []);

  const previewSignIn = useMemo(() => {
    if (!(import.meta.env.DEV && config.useMockApi)) return undefined;
    return async (role: StaffRole) => {
      const mock = await import('@/mocks/mockApi');
      mock.setMockRole(role);
      setTokenProvider(async () => `preview-${role}`);
      setStatus('loading');
      await loadProfile();
    };
  }, [loadProfile]);

  useEffect(() => {
    setUnauthorizedHandler((error) => {
      void signOut(error.code === 'session_expired' ? 'Your session has expired. Please sign in again.' : error.message);
    });
    return () => setUnauthorizedHandler(null);
  }, [signOut]);

  const can = useCallback((permission: Permission) => Boolean(staff?.permissions.includes(permission)), [staff]);

  const value = useMemo<AuthContextValue>(
    () => ({ status, staff, notice, signIn, signOut, sendPasswordReset, can, refreshProfile: loadProfile, previewSignIn }),
    [status, staff, notice, signIn, signOut, sendPasswordReset, can, loadProfile, previewSignIn],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
