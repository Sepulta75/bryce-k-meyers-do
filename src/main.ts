/**
 * Composition root — the only module that wires concrete infrastructure to the
 * application layer. Everything below it is transport-agnostic.
 */
import '@styles/main.css';

import { buildConnectors } from '@application/connector-registry';
import { SubmitContactRequest } from '@application/submit-contact-request';
import { loadConfig } from '@infrastructure/config/env';
import { initContactForm } from '@presentation/controllers/contact-form';
import { initStaticInteractions } from '@presentation/controllers/site-chrome';

const config = loadConfig();
const { connectors, memorySink } = buildConnectors(config);
const submitContactRequest = new SubmitContactRequest(connectors);

initStaticInteractions();
initContactForm(submitContactRequest);

// Small debug surface: open the console and run `__connectors.status()` to see
// which channels are wired up and why they are on or off.
const debugSurface = {
  status: () => connectors.map((connector) => connector.status()),
  lastMessage: () => memorySink.peek(),
  config,
};

(globalThis as unknown as { __connectors: typeof debugSurface }).__connectors = debugSurface;

if (config.telegram.enabled) {
  console.info('[connectors] telegram enabled:', debugSurface.status());
} else {
  console.info('[connectors] all delivery channels are staged and disabled.');
}
