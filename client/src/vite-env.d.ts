/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_SESSIONS_MODE?: 'local' | 'remote' | string;
  readonly VITE_EDGE_CONFIG?: string;
  readonly VITE_BLOB_READ_WRITE_TOKEN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module '*.frag?raw' {
  const source: string;
  export default source;
}
