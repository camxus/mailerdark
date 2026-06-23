import { db } from "@/lib/db";
import { runCampaignSenderPass } from "@/lib/workers/campaign-sender-pass";
import { verifyCronRequest } from "@/lib/cron/verify-cron-request";

// Give this one real headroom — sending a batch of emails through Resend
// involves a network round trip per message. 60s covers the default batch
// size comfortably; raise it (and your Vercel plan) if you increase
// WORKER_BATCH_SIZE. See README.md → "Deploying to Vercel".
export const maxDuration = 60;

export async function GET(req: Request) {
  if (!verifyCronRequest(req)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const result = await runCampaignSenderPass(db);
  return Response.json({ ok: true, ...result });
}
