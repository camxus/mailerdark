import { createHmac, timingSafeEqual } from "crypto";

/**
 * Resend signs webhooks using the Svix standard (https://www.svix.com/),
 * sent as three headers: svix-id, svix-timestamp, svix-signature. This is a
 * minimal from-scratch implementation of that one check, rather than
 * pulling in the full svix SDK for a single HMAC comparison.
 *
 * Algorithm (per the Svix/standard-webhooks spec):
 *   signedContent = `${svixId}.${svixTimestamp}.${rawBody}`
 *   secretBytes   = base64decode(secret without its "whsec_" prefix)
 *   expectedSig   = base64(HMAC_SHA256(secretBytes, signedContent))
 * `svix-signature` may contain multiple space-separated "v1,<sig>" values
 * (for secret rotation) — any match is accepted.
 */
const TOLERANCE_SECONDS = 5 * 60;

export function verifyWebhookSignature(input: {
  rawBody: string;
  svixId: string | null;
  svixTimestamp: string | null;
  svixSignature: string | null;
  secret: string;
}): boolean {
  const { rawBody, svixId, svixTimestamp, svixSignature, secret } = input;
  if (!svixId || !svixTimestamp || !svixSignature) return false;

  const timestamp = Number(svixTimestamp);
  if (!Number.isFinite(timestamp)) return false;
  const ageSeconds = Math.abs(Date.now() / 1000 - timestamp);
  if (ageSeconds > TOLERANCE_SECONDS) return false;

  const secretBytes = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const signedContent = `${svixId}.${svixTimestamp}.${rawBody}`;
  const expected = createHmac("sha256", secretBytes).update(signedContent).digest("base64");

  const candidates = svixSignature.split(" ").map((part) => part.split(",")[1]).filter(Boolean);

  return candidates.some((candidate) => {
    const a = Buffer.from(expected);
    const b = Buffer.from(candidate);
    return a.length === b.length && timingSafeEqual(a, b);
  });
}
