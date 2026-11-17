/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Master switch for the Telegram connector. Off unless explicitly "true". */
  readonly VITE_TELEGRAM_ENABLED?: string;
  /** "proxy" (recommended) sends to your own endpoint; "direct" calls the Bot API from the browser. */
  readonly VITE_TELEGRAM_MODE?: string;
  /** Endpoint of your server-side relay. Preferred in production. */
  readonly VITE_TELEGRAM_PROXY_URL?: string;
  /**
   * Bot API token. NEVER use this in a public build: every visitor can read it.
   * Kept only so local/demo runs can exercise the direct path.
   */
  readonly VITE_TELEGRAM_BOT_TOKEN?: string;
  /** Destination chat or channel id for direct mode. */
  readonly VITE_TELEGRAM_CHAT_ID?: string;
  /** What the contact form offers when no connector is active: "phone" or "none". */
  readonly VITE_CONTACT_FALLBACK?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
