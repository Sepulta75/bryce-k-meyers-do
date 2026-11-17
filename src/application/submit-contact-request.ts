import { describeContactRequest, type ContactRequest } from '@domain/contact-request';
import type { MessageConnector } from '@domain/ports/message-connector';

export interface DeliveryAttempt {
  readonly connectorId: string;
  readonly ok: boolean;
  readonly detail: string;
}

export interface DeliveryReport {
  /** True when at least one active connector accepted the message. */
  readonly delivered: boolean;
  /** Id of the connector that accepted it, if any. */
  readonly via: string | null;
  readonly attempts: readonly DeliveryAttempt[];
}

/**
 * Use case: deliver a contact request through the first connector that is
 * enabled and ready. Connectors that are disabled are skipped without an
 * error — that is the intended state for a channel that is staged but off.
 */
export class SubmitContactRequest {
  constructor(private readonly connectors: readonly MessageConnector[]) {}

  async execute(request: ContactRequest): Promise<DeliveryReport> {
    const active = this.connectors.filter((c) => c.status().readiness === 'ready');

    if (active.length === 0) {
      return { delivered: false, via: null, attempts: [] };
    }

    const message = {
      subject: `New enquiry — ${request.firstName} ${request.lastName}`,
      body: describeContactRequest(request),
      replyTo: request.email,
    };

    const attempts: DeliveryAttempt[] = [];

    for (const connector of active) {
      const outcome = await connector.send(message);
      attempts.push({ connectorId: connector.id, ok: outcome.ok, detail: outcome.detail });
      if (outcome.ok) {
        return { delivered: true, via: connector.id, attempts };
      }
    }

    return { delivered: false, via: null, attempts };
  }
}
