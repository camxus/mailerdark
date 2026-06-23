export type SendEmailInput = {
  to: string;
  from: string; // "Name <email@domain.com>"
  replyTo?: string;
  subject: string;
  html: string;
  text?: string;
  /** Passed through to the provider where supported, to dedupe retried sends. */
  idempotencyKey?: string;
  headers?: Record<string, string>;
};

export type SendEmailResult = {
  providerMessageId: string;
};

export interface EmailProvider {
  send(input: SendEmailInput): Promise<SendEmailResult>;
}

export class EmailProviderError extends Error {
  /** True if retrying later might succeed (rate limit, timeout, 5xx). */
  retryable: boolean;
  constructor(message: string, retryable: boolean) {
    super(message);
    this.retryable = retryable;
  }
}
