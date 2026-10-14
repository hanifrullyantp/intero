/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_3D_PUBLIC_ORIGIN?: string;
  readonly VITE_3D_API_ORIGIN?: string;
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
