import { EmailProvider } from "./provider";
import { ResendEmailProvider } from "./providers/resend";
import { SesEmailProvider } from "./providers/ses";

let provider: EmailProvider | null = null;
let currentApiKey: string | undefined;
let sesProvider: EmailProvider | null = null;

/** True when EMAIL_PROVIDER=ses. Default stays Resend so existing deployments keep working. */
export function isSesProvider(): boolean {
  return process.env.EMAIL_PROVIDER === "ses";
}

/**
 * Single place to swap providers — everything else depends on EmailProvider.
 * `apiKey` is the per-workspace Resend key; it is ignored for SES, which uses
 * one set of AWS credentials for the whole deployment.
 */
export function getEmailProvider(apiKey?: string): EmailProvider {
  if (isSesProvider()) {
    sesProvider ??= new SesEmailProvider();
    return sesProvider;
  }
  if (provider && currentApiKey === apiKey) {
    return provider;
  }
  provider = new ResendEmailProvider(apiKey);
  currentApiKey = apiKey;
  return provider;
}
