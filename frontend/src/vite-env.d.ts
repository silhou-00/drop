// Types for the build-time variables Vite exposes to the app. Only VITE_ variables reach the
// browser, and each one listed here is public by design.
/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_CONTACT_EMAIL: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
