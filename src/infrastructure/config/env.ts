/**
 * Configuration boundary. The only place that reads `import.meta.env`, so the
 * rest of the codebase takes plain typed values it can be tested against.
 */

export type TelegramMode = 'proxy' | 'direct';

export interface TelegramConfig {
  /** Master switch. Anything other than "true" leaves the connector off. */
  readonly enabled: boolean;
  readonly mode: TelegramMode;
  readonly proxyUrl: string;
  readonly botToken: string;
  readonly chatId: string;
}

export interface AppConfig {
  readonly telegram: TelegramConfig;
  /** What the contact form points people at while no connector is live. */
  readonly contactFallback: 'phone' | 'none';
}

const truthy = (value: string | undefined): boolean =>
  (value ?? '').trim().toLowerCase() === 'true';

const trimmed = (value: string | undefined): string => (value ?? '').trim();

export function loadConfig(env: ImportMetaEnv = import.meta.env): AppConfig {
  const mode = trimmed(env.VITE_TELEGRAM_MODE).toLowerCase() === 'direct' ? 'direct' : 'proxy';

  return {
    telegram: {
      enabled: truthy(env.VITE_TELEGRAM_ENABLED),
      mode,
      proxyUrl: trimmed(env.VITE_TELEGRAM_PROXY_URL),
      botToken: trimmed(env.VITE_TELEGRAM_BOT_TOKEN),
      chatId: trimmed(env.VITE_TELEGRAM_CHAT_ID),
    },
    contactFallback:
      trimmed(env.VITE_CONTACT_FALLBACK).toLowerCase() === 'none' ? 'none' : 'phone',
  };
}
