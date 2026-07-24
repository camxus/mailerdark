import { EmailProvider, EmailProviderError, SendEmailInput, SendEmailResult } from "../provider";
import { createResendClient } from "../resend-client";

export class ResendEmailProvider implements EmailProvider {
  constructor(private readonly apiKey?: string) {}

  async send(input: SendEmailInput): Promise<SendEmailResult> {
    const resend = createResendClient(this.apiKey);

    const { data, error } = await resend.emails.send(
      {
        from: input.from,
        to: input.to,
        replyTo: input.replyTo,
        subject: input.subject,
        html: input.html,
        text: input.text,
        headers: input.headers,
      },
      input.idempotencyKey ? { idempotencyKey: input.idempotencyKey } : undefined
    );

    if (error) {
      const retryable = /rate.?limit|timeout|temporar/i.test(error.message ?? "");
      throw new EmailProviderError(error.message ?? "Resend send failed", retryable);
    }

    if (!data) {
      throw new EmailProviderError("Resend returned no message id", true);
    }

    return { providerMessageId: data.id };
  }
}
