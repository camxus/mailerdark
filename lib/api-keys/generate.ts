import { randomBytes, createHash } from "crypto";

export const ALL_SCOPES = [
  "subscribers:read",
  "subscribers:write",
  "campaigns:read",
  "campaigns:write",
  "automations:read",
  "automations:write",
  "settings:write",
] as const;

export type ApiScope = (typeof ALL_SCOPES)[number];

/** Returns { rawKey, hashedKey } — only rawKey is ever shown to the person, and only once. */
export function generateApiKey(): { rawKey: string; hashedKey: string } {
  const rawKey = `flw_live_${randomBytes(24).toString("hex")}`;
  const hashedKey = createHash("sha256").update(rawKey).digest("hex");
  return { rawKey, hashedKey };
}
