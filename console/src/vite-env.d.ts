/// <reference types="vite/client" />

// Types for the VITE_* variables in .env files, so import.meta.env.VITE_PART_ANALYZER_URL is a string.
interface ImportMetaEnv {
  readonly VITE_PART_ANALYZER_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
