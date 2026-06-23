import { EmailProvider } from "./provider";
import { ResendEmailProvider } from "./providers/resend";

let provider: EmailProvider | null = null;

/** Single place to swap providers later — everything else depends on EmailProvider, not Resend directly. */
export function getEmailProvider(): EmailProvider {
  provider ??= new ResendEmailProvider();
  return provider;
}
