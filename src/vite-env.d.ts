/// <reference types="vite/client" />

interface ImportMetaEnv {
  // Client-side only — NO secrets here
  readonly VITE_FB_APP_ID: string; // Public identifier (needed by FB SDK)
  readonly VITE_CF_STORAGE_WORKER_URL: string;
  readonly VITE_CF_R2_PUBLIC_URL: string;
  readonly VITE_CF_R2_DOMAIN: string;
  readonly VITE_ENABLE_REAL_CAMPAIGN_LAUNCH: string;
  readonly VITE_GOOGLE_DRIVE_PRODUCTS_ROOT_ID: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
