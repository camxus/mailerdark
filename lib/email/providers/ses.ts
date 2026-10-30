import { SendEmailCommand } from "@aws-sdk/client-sesv2";
import { EmailProvider, EmailProviderError, SendEmailInput, SendEmailResult } from "../provider";
import { getSesClient } from "../ses-client";

const RETRYABLE_ERRORS = new Set([
  "TooManyRequestsException",
  "ThrottlingException",
  "LimitExceededException", // daily/per-second quota: may clear later
  "RequestTimeout",
  "ServiceUnavailable",
  "InternalFailure",
]);

/**
 * AWS SES (v2) implementation of EmailProvider.
 *
 * - `idempotencyKey` is ignored: SES has no equivalent. Duplicate protection is
 *   already handled by EmailJob state in lib/campaigns/dispatch.ts.
 * - Bounces/complaints come back asynchronously via SNS → /api/webhooks/ses-sns.
 *   The ConfigurationSetName is also attached to each verified identity at creation
 *   time (lib/dns/ses-domain.ts), but is set here too so every send is covered.
 */
export class SesEmailProvider implements EmailProvider {
  async send(input: SendEmailInput): Promise<SendEmailResult> {
    const ses = getSesClient();

    try {
      const res = await ses.send(
        new SendEmailCommand({
          FromEmailAddress: input.from,
          Destination: { ToAddresses: [input.to] },
          ReplyToAddresses: input.replyTo ? [input.replyTo] : undefined,
          ConfigurationSetName: process.env.SES_CONFIGURATION_SET || undefined,
          Content: {
            Simple: {
              Subject: { Data: input.subject, Charset: "UTF-8" },
              Body: {
                Html: { Data: input.html, Charset: "UTF-8" },
                ...(input.text ? { Text: { Data: input.text, Charset: "UTF-8" } } : {}),
              },
              Headers: input.headers
                ? Object.entries(input.headers).map(([Name, Value]) => ({ Name, Value }))
                : undefined,
            },
          },
        })
      );

      if (!res.MessageId) {
        throw new EmailProviderError("SES returned no MessageId", true);
      }
      return { providerMessageId: res.MessageId };
    } catch (cause) {
      if (cause instanceof EmailProviderError) throw cause;
      const err = cause as { name?: string; message?: string; $metadata?: { httpStatusCode?: number } };
      const status = err.$metadata?.httpStatusCode ?? 0;
      const retryable = RETRYABLE_ERRORS.has(err.name ?? "") || status >= 500;
      throw new EmailProviderError(err.message ?? "SES send failed", retryable);
    }
  }
}
