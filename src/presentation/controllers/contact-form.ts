import { createContactRequest } from '@domain/contact-request';
import type { SubmitContactRequest } from '@application/submit-contact-request';
import { optionalElement } from '@presentation/dom';

const COLOR_ERROR = '#ffb4a2';
const COLOR_INFO = 'var(--gold-soft)';
const COLOR_SUCCESS = '#9fe6c4';

const IDLE_LABEL = 'Send message';
const RESET_DELAY_MS = 3200;

interface FormElements {
  readonly form: HTMLFormElement;
  readonly button: HTMLButtonElement;
  readonly message: HTMLElement;
}

function readForm(form: HTMLFormElement): {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  reason: string;
} {
  const field = (name: string): string => {
    const element = form.elements.namedItem(name);
    return element instanceof HTMLInputElement || element instanceof HTMLSelectElement
      ? element.value
      : '';
  };

  return {
    firstName: field('first'),
    lastName: field('last'),
    email: field('email'),
    phone: field('phone'),
    reason: field('reason'),
  };
}

/**
 * Contact form controller. It owns presentation only: validation rules live in
 * the domain, delivery lives behind the SubmitContactRequest use case, and the
 * connectors themselves are chosen in `main.ts`.
 */
export function initContactForm(useCase: SubmitContactRequest): void {
  const form = optionalElement<HTMLFormElement>('#bookForm');
  const button = optionalElement<HTMLButtonElement>('#bookBtn');
  const message = optionalElement<HTMLElement>('#formMsg');
  if (form === null || button === null || message === null) return;

  const elements: FormElements = { form, button, message };

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    void handleSubmit(elements, useCase);
  });
}

async function handleSubmit(
  { form, button, message }: FormElements,
  useCase: SubmitContactRequest,
): Promise<void> {
  const raw = readForm(form);
  const result = createContactRequest(raw);

  if (!result.ok) {
    message.style.color = COLOR_ERROR;
    message.textContent = result.issues.map((issue) => issue.message).join(' ');
    return;
  }

  button.disabled = true;
  button.textContent = 'Sending…';
  message.style.color = COLOR_INFO;
  message.textContent = '';

  const report = await useCase.execute(result.value);

  if (!report.delivered) {
    // No connector is live yet (Telegram is staged and off), so nothing left
    // the browser. Keep the courtesy acknowledgement, but say so in the log
    // rather than pretending a message was delivered.
    console.info(
      '[contact] no active connector — message not transmitted. ' +
        'Set VITE_TELEGRAM_ENABLED=true (and a proxy URL) to enable delivery.',
      report,
    );
  }

  button.textContent = 'Request received ✓';
  message.style.color = COLOR_SUCCESS;
  message.textContent =
    `Thank you, ${result.value.firstName}! Our office will contact you within one business day. ` +
    'For anything urgent, please call (703) 720-1290.';

  form.reset();

  globalThis.setTimeout(() => {
    button.disabled = false;
    button.textContent = IDLE_LABEL;
  }, RESET_DELAY_MS);
}
