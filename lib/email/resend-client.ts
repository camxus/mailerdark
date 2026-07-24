import { Resend } from "resend";
import { EmailProviderError } from "./provider";

export function createResendClient(apiKey?: string): Resend {
  const key = apiKey || process.env.RESEND_API_KEY;
  if (!key) {
    throw new EmailProviderError(
      "RESEND_API_KEY is not set. Add it to .env or workspace settings to send real email or manage domains.",
      false
    );
  }
  return new Resend(key);
}
