import { createHmac, timingSafeEqual } from "crypto";

function secret() {
  const value = process.env.TRACKING_SIGNING_SECRET;
  if (!value) {
    throw new Error("TRACKING_SIGNING_SECRET is not set.");
  }
  return value;
}

export function signJobId(jobId: string): string {
  return createHmac("sha256", secret()).update(jobId).digest("hex").slice(0, 32);
}

export function verifyJobSignature(jobId: string, signature: string): boolean {
  const expected = signJobId(jobId);
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function appUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

export function buildOpenTrackingUrl(jobId: string): string {
  return `${appUrl()}/t/open/${jobId}?sig=${signJobId(jobId)}`;
}

export function buildClickTrackingUrl(jobId: string, destinationUrl: string): string {
  const sig = signJobId(jobId);
  const encoded = encodeURIComponent(destinationUrl);
  return `${appUrl()}/t/click/${jobId}?sig=${sig}&url=${encoded}`;
}

export function buildUnsubscribeUrl(jobId: string): string {
  return `${appUrl()}/t/unsubscribe/${jobId}?sig=${signJobId(jobId)}`;
}
