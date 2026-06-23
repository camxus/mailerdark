import { EmailProvider, EmailProviderError, SendEmailInput, SendEmailResult } from "../provider";
import { getResendClient } from "../resend-client";

export class ResendEmailProvider implements EmailProvider {
  async send(input: SendEmailInput): Promise<SendEmailResult> {
    const resend = getResendClient();

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
      // Resend's SDK doesn't expose a status code here; treat rate limits
      // and transient-sounding messages as retryable, everything else as not.
      const retryable = /rate.?limit|timeout|temporar/i.test(error.message ?? "");
      throw new EmailProviderError(error.message ?? "Resend send failed", retryable);
    }

    if (!data) {
      throw new EmailProviderError("Resend returned no message id", true);
    }

    return { providerMessageId: data.id };
  }
}
