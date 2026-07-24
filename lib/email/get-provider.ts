import { EmailProvider } from "./provider";
import { ResendEmailProvider } from "./providers/resend";

let provider: EmailProvider | null = null;
let currentApiKey: string | undefined;

/** Single place to swap providers later — everything else depends on EmailProvider, not Resend directly. */
export function getEmailProvider(apiKey?: string): EmailProvider {
  if (provider && currentApiKey === apiKey) {
    return provider;
  }
  provider = new ResendEmailProvider(apiKey);
  currentApiKey = apiKey;
  return provider;
}
