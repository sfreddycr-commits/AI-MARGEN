/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/react" />

declare module '*.module.css' {
  const classes: Readonly<Record<string, string>>;
  export default classes;
}

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  /** Solo desarrollo: muestra módulos pendientes deshabilitados para revisar el layout. */
  readonly VITE_SHOW_UPCOMING?: string;
}
