import type {
  ConnectorStatus,
  MessageConnector,
  OutboundMessage,
  SendOutcome,
} from '@domain/ports/message-connector';

/**
 * A sink that keeps the most recent message in memory. It never reports
 * itself as ready, so it can never make the app claim a message was delivered —
 * it exists so the demo/debug surface can show what *would* have been sent.
 */
export class MemorySink implements MessageConnector {
  readonly id = 'memory-sink';
  readonly label = 'Local preview (nothing is sent)';

  private last: OutboundMessage | null = null;

  status(): ConnectorStatus {
    return {
      id: this.id,
      label: this.label,
      enabled: false,
      readiness: 'disabled',
      detail: 'Inspection only — holds the last composed message, transmits nothing.',
    };
  }

  send(message: OutboundMessage): Promise<SendOutcome> {
    this.last = message;
    return Promise.resolve({ ok: false, detail: 'Memory sink does not transmit.' });
  }

  peek(): OutboundMessage | null {
    return this.last;
  }
}
