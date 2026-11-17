import type { MessageConnector } from '@domain/ports/message-connector';
import type { AppConfig } from '@infrastructure/config/env';
import { TelegramConnector } from '@infrastructure/connectors/telegram-connector';
import { MemorySink } from '@infrastructure/connectors/memory-sink';

export interface ConnectorBundle {
  readonly connectors: readonly MessageConnector[];
  readonly memorySink: MemorySink;
}

/**
 * Composition point for delivery channels. Add a channel by writing an adapter
 * that implements MessageConnector and appending it here — the use case and the
 * form do not change.
 */
export function buildConnectors(config: AppConfig): ConnectorBundle {
  const memorySink = new MemorySink();

  return {
    memorySink,
    connectors: [new TelegramConnector(config.telegram), memorySink],
  };
}
