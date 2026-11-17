/**
 * Domain layer — pure data and rules. No DOM, no network, no framework.
 */

export interface ContactRequest {
  readonly firstName: string;
  readonly lastName: string;
  readonly email: string;
  readonly phone?: string;
  readonly reason?: string;
  readonly note?: string;
}

export interface RawContactInput {
  readonly firstName: string;
  readonly lastName: string;
  readonly email: string;
  readonly phone?: string;
  readonly reason?: string;
  readonly note?: string;
}

export type ContactField = 'firstName' | 'lastName' | 'email';

export interface ValidationIssue {
  readonly field: ContactField;
  readonly message: string;
}

export type ContactRequestResult =
  | { readonly ok: true; readonly value: ContactRequest }
  | { readonly ok: false; readonly issues: readonly ValidationIssue[] };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Builds a valid {@link ContactRequest} or reports every problem at once, so the
 * form can show all issues in a single pass instead of one at a time.
 */
export function createContactRequest(input: RawContactInput): ContactRequestResult {
  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();
  const email = input.email.trim();
  const phone = input.phone?.trim();
  const reason = input.reason?.trim();
  const note = input.note?.trim();

  const issues: ValidationIssue[] = [];

  if (firstName.length === 0) {
    issues.push({ field: 'firstName', message: 'Please add your first name.' });
  }
  if (lastName.length === 0) {
    issues.push({ field: 'lastName', message: 'Please add your last name.' });
  }
  if (email.length === 0) {
    issues.push({ field: 'email', message: 'Please add an email address.' });
  } else if (!EMAIL_PATTERN.test(email)) {
    issues.push({ field: 'email', message: 'That email address does not look right.' });
  }

  if (issues.length > 0) {
    return { ok: false, issues };
  }

  return {
    ok: true,
    value: {
      firstName,
      lastName,
      email,
      ...(phone !== undefined && phone.length > 0 ? { phone } : {}),
      ...(reason !== undefined && reason.length > 0 ? { reason } : {}),
      ...(note !== undefined && note.length > 0 ? { note } : {}),
    },
  };
}

/** Human-readable summary used by every connector. */
export function describeContactRequest(request: ContactRequest): string {
  const lines = [
    'New enquiry from the Dr. Bryce K. Meyers website',
    '',
    `Name:   ${request.firstName} ${request.lastName}`,
    `Email:  ${request.email}`,
  ];
  if (request.phone !== undefined) {
    lines.push(`Phone:  ${request.phone}`);
  }
  if (request.reason !== undefined) {
    lines.push(`Reason: ${request.reason}`);
  }
  if (request.note !== undefined) {
    lines.push('', 'Note:', request.note);
  }
  return lines.join('\n');
}
