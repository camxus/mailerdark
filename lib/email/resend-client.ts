import { Resend } from "resend";
import { EmailProviderError } from "./provider";

let client: Resend | null = null;

export function getResendClient(): Resend {
  if (!process.env.RESEND_API_KEY) {
    throw new EmailProviderError(
      "RESEND_API_KEY is not set. Add it to .env to send real email or manage domains.",
      false
    );
  }
  client ??= new Resend(process.env.RESEND_API_KEY);
  return client;
}
