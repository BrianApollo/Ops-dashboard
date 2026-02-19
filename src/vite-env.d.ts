/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_AIRTABLE_API_KEY: string;
  readonly VITE_AIRTABLE_BASE_ID: string;
  readonly VITE_FB_APP_ID: string;
  readonly VITE_FB_APP_SECRET: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
