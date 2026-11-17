/**
 * Ports — the contracts the application layer depends on. Adapters in
 * `infrastructure/` implement these; nothing here knows about Telegram, fetch,
 * or the DOM.
 */

export interface OutboundMessage {
  /** Short one-line subject, e.g. "New enquiry — Jane Doe". */
  readonly subject: string;
  /** Plain-text body. */
  readonly body: string;
  /** Address a human should reply to. */
  readonly replyTo: string;
}

export type ConnectorReadiness = 'ready' | 'disabled' | 'misconfigured';

export interface ConnectorStatus {
  readonly id: string;
  readonly label: string;
  /** Off means the connector is installed but deliberately not wired up. */
  readonly enabled: boolean;
  readonly readiness: ConnectorReadiness;
  readonly detail: string;
}

export interface SendOutcome {
  readonly ok: boolean;
  readonly detail: string;
}

/** A delivery channel the contact form can plug into. */
export interface MessageConnector {
  readonly id: string;
  readonly label: string;
  status(): ConnectorStatus;
  send(message: OutboundMessage): Promise<SendOutcome>;
}
