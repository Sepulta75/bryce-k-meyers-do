import type {
  ConnectorStatus,
  MessageConnector,
  OutboundMessage,
  SendOutcome,
} from '@domain/ports/message-connector';
import type { TelegramConfig } from '@infrastructure/config/env';

const SEND_TIMEOUT_MS = 8_000;

/**
 * Telegram Bot API adapter.
 *
 * Staged, not live: `VITE_TELEGRAM_ENABLED` must be the literal string "true"
 * before this connector will send anything. Until then it reports itself as
 * disabled and the form behaves exactly as it did before this refactor.
 *
 * Two transports:
 *   mode=proxy  (default) POSTs to your own relay endpoint, which holds the bot
 *               token. This is the only transport safe for a public build.
 *   mode=direct POSTs straight to api.telegram.org using a token bundled into
 *               the JavaScript. Anyone can read that token, so this mode is for
 *               local demos only and warns loudly at runtime.
 */
export class TelegramConnector implements MessageConnector {
  readonly id = 'telegram';
  readonly label = 'Telegram';

  constructor(private readonly config: TelegramConfig) {}

  status(): ConnectorStatus {
    if (!this.config.enabled) {
      return {
        id: this.id,
        label: this.label,
        enabled: false,
        readiness: 'disabled',
        detail: 'Disabled by configuration (VITE_TELEGRAM_ENABLED is not "true").',
      };
    }

    if (this.config.mode === 'direct') {
      const missing = [
        this.config.botToken.length === 0 ? 'VITE_TELEGRAM_BOT_TOKEN' : null,
        this.config.chatId.length === 0 ? 'VITE_TELEGRAM_CHAT_ID' : null,
      ].filter((v): v is string => v !== null);

      return missing.length > 0
        ? {
            id: this.id,
            label: this.label,
            enabled: true,
            readiness: 'misconfigured',
            detail: `Enabled, but missing ${missing.join(' and ')}.`,
          }
        : {
            id: this.id,
            label: this.label,
            enabled: true,
            readiness: 'ready',
            detail: 'Direct Bot API mode — the token is visible to every visitor.',
          };
    }

    return this.config.proxyUrl.length > 0
      ? {
          id: this.id,
          label: this.label,
          enabled: true,
          readiness: 'ready',
          detail: `Relaying through ${this.config.proxyUrl}`,
        }
      : {
          id: this.id,
          label: this.label,
          enabled: true,
          readiness: 'misconfigured',
          detail: 'Enabled in proxy mode, but VITE_TELEGRAM_PROXY_URL is empty.',
        };
  }

  async send(message: OutboundMessage): Promise<SendOutcome> {
    const status = this.status();
    if (status.readiness !== 'ready') {
      return { ok: false, detail: status.detail };
    }

    const controller = new AbortController();
    const timer = globalThis.setTimeout(() => { controller.abort(); }, SEND_TIMEOUT_MS);

    try {
      if (this.config.mode === 'direct') {
        console.warn(
          '[telegram] direct mode: the bot token is shipped to the browser and is public. ' +
            'Switch to proxy mode with VITE_TELEGRAM_PROXY_URL for anything real.',
        );
        return await this.sendDirect(message, controller.signal);
      }
      return await this.sendViaProxy(message, controller.signal);
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      return { ok: false, detail: `Network error: ${detail}` };
    } finally {
      globalThis.clearTimeout(timer);
    }
  }

  private async sendViaProxy(
    message: OutboundMessage,
    signal: AbortSignal,
  ): Promise<SendOutcome> {
    const response = await fetch(this.config.proxyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        channel: 'telegram',
        chatId: this.config.chatId,
        subject: message.subject,
        text: message.body,
        replyTo: message.replyTo,
      }),
      signal,
    });

    return response.ok
      ? { ok: true, detail: `Proxy accepted the message (HTTP ${String(response.status)}).` }
      : { ok: false, detail: `Proxy rejected the message (HTTP ${String(response.status)}).` };
  }

  private async sendDirect(
    message: OutboundMessage,
    signal: AbortSignal,
  ): Promise<SendOutcome> {
    const endpoint = `https://api.telegram.org/bot${this.config.botToken}/sendMessage`;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: this.config.chatId,
        text: message.body,
        disable_web_page_preview: true,
      }),
      signal,
    });

    if (response.ok) {
      return { ok: true, detail: 'Telegram accepted the message.' };
    }

    const payload: unknown = await response.json().catch(() => null);
    const description =
      typeof payload === 'object' && payload !== null && 'description' in payload
        ? String(payload.description)
        : `HTTP ${String(response.status)}`;

    return { ok: false, detail: `Telegram rejected the message: ${description}` };
  }
}
