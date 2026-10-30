import { db } from "@/lib/db";
import { runAutomationEnginePass } from "@/lib/workers/automation-engine-pass";
import { verifyCronRequest } from "@/lib/cron/verify-cron-request";

export const maxDuration = 60;

export async function GET(req: Request) {
  if (!verifyCronRequest(req)) {
    return new Response("Unauthorized", { status: 401 });
  }

  await runAutomationEnginePass(db);
  return Response.json({ ok: true });
}
