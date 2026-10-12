/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_SITE_URL?: string;
  readonly VITE_USE_MOCK_API?: string;
  readonly VITE_FIREBASE_API_KEY?: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN?: string;
  readonly VITE_FIREBASE_PROJECT_ID?: string;
  readonly VITE_FIREBASE_APP_ID?: string;
  readonly VITE_PUBLIC_PHONE?: string;
  readonly VITE_PUBLIC_WHATSAPP?: string;
  readonly VITE_PUBLIC_EMAIL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
