import { db } from "@/lib/db";
import { runDnsVerifierPass } from "@/lib/workers/dns-verifier-pass";
import { verifyCronRequest } from "@/lib/cron/verify-cron-request";

export const maxDuration = 60;

export async function GET(req: Request) {
  if (!verifyCronRequest(req)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const result = await runDnsVerifierPass(db);
  return Response.json({ ok: true, ...result });
}
