const env = import.meta.env;

function trimSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

export const config = {
  apiBaseUrl: trimSlash(env.VITE_API_BASE_URL || 'http://localhost:4000'),
  siteUrl: trimSlash(env.VITE_SITE_URL || (typeof window !== 'undefined' ? window.location.origin : '')),
  /** Dev-only in-browser API with sample data. Never active in production builds. */
  useMockApi: env.DEV && env.VITE_USE_MOCK_API === 'true',
  firebase: {
    apiKey: env.VITE_FIREBASE_API_KEY as string | undefined,
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
    projectId: env.VITE_FIREBASE_PROJECT_ID as string | undefined,
    appId: env.VITE_FIREBASE_APP_ID as string | undefined,
  },
};

export const isFirebaseConfigured = Boolean(
  config.firebase.apiKey && config.firebase.authDomain && config.firebase.projectId,
);
