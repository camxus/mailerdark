import { SESv2Client } from "@aws-sdk/client-sesv2";
import { EmailProviderError } from "./provider";

let client: SESv2Client | null = null;

/**
 * Credentials use SES_* names on purpose: Vercel reserves AWS_ACCESS_KEY_ID /
 * AWS_SECRET_ACCESS_KEY / AWS_REGION for its own runtime and won't let you set them.
 */
export function getSesClient(): SESv2Client {
  if (client) return client;

  const region = process.env.SES_REGION;
  const accessKeyId = process.env.SES_ACCESS_KEY_ID;
  const secretAccessKey = process.env.SES_SECRET_ACCESS_KEY;
  if (!region || !accessKeyId || !secretAccessKey) {
    throw new EmailProviderError(
      "SES_REGION, SES_ACCESS_KEY_ID and SES_SECRET_ACCESS_KEY must be set when EMAIL_PROVIDER=ses.",
      false
    );
  }

  client = new SESv2Client({ region, credentials: { accessKeyId, secretAccessKey } });
  return client;
}
