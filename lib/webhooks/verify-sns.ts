import { createVerify } from "crypto";

export type SnsMessage = {
  Type: "Notification" | "SubscriptionConfirmation" | "UnsubscribeConfirmation";
  MessageId: string;
  TopicArn: string;
  Subject?: string;
  Message: string;
  Timestamp: string;
  SignatureVersion: string;
  Signature: string;
  SigningCertURL: string;
  SubscribeURL?: string;
  Token?: string;
};

const SNS_HOST = /^sns\.[a-z0-9-]+\.amazonaws\.com(\.cn)?$/;
const certCache = new Map<string, string>();

/** Only ever fetch certs / confirm subscriptions on genuine SNS hosts (prevents SSRF via forged payloads). */
export function isSnsUrl(raw: string | undefined): boolean {
  if (!raw) return false;
  try {
    const url = new URL(raw);
    return url.protocol === "https:" && SNS_HOST.test(url.hostname);
  } catch {
    return false;
  }
}

function stringToSign(m: SnsMessage): string {
  const keys =
    m.Type === "Notification"
      ? ["Message", "MessageId", ...(m.Subject !== undefined ? ["Subject"] : []), "Timestamp", "TopicArn", "Type"]
      : ["Message", "MessageId", "SubscribeURL", "Timestamp", "Token", "TopicArn", "Type"];
  const record = m as unknown as Record<string, string>;
  return keys.map((k) => `${k}\n${record[k]}\n`).join("");
}

/** Verifies an SNS HTTP(S) message signature per AWS's documented algorithm (SignatureVersion 1 and 2). */
export async function verifySnsMessage(m: SnsMessage): Promise<boolean> {
  if (m.SignatureVersion !== "1" && m.SignatureVersion !== "2") return false;
  if (!isSnsUrl(m.SigningCertURL)) return false;

  let cert = certCache.get(m.SigningCertURL);
  if (!cert) {
    const res = await fetch(m.SigningCertURL);
    if (!res.ok) return false;
    cert = await res.text();
    certCache.set(m.SigningCertURL, cert);
  }

  const verifier = createVerify(m.SignatureVersion === "2" ? "RSA-SHA256" : "RSA-SHA1");
  verifier.update(stringToSign(m), "utf8");
  return verifier.verify(cert, m.Signature, "base64");
}
