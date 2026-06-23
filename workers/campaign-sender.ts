/**
 * CampaignSenderWorker CLI entry point — for running on a host that
 * supports a persistent process (a small VPS, Railway, Render, Fly.io,
 * etc). The actual pass logic lives in lib/workers/campaign-sender-pass.ts,
 * shared with app/api/cron/campaign-sender/route.ts so Vercel deployments
 * can trigger the same logic via Vercel Cron instead. See README.md →
 * "Deploying to Vercel" for which path fits your hosting.
 *
 * Run once:
 *   npm run worker:campaign-sender
 *
 * Or keep it running continuously, polling every WORKER_POLL_INTERVAL_MS:
 *   npm run worker:campaign-sender -- --watch
 */
import { PrismaClient } from "@prisma/client";
import { runCampaignSenderPass } from "../lib/workers/campaign-sender-pass";

const db = new PrismaClient();
const POLL_INTERVAL_MS = Number(process.env.WORKER_POLL_INTERVAL_MS ?? 30_000);

async function runOnce() {
  const { processed } = await runCampaignSenderPass(db);
  console.log(`[campaign-sender] pass complete — ${processed} job(s) processed`);
}

async function main() {
  const watch = process.argv.includes("--watch");

  if (!watch) {
    await runOnce();
    await db.$disconnect();
    return;
  }

  console.log(`[campaign-sender] watching, polling every ${POLL_INTERVAL_MS}ms`);
  while (true) {
    await runOnce().catch((error) => console.error("[campaign-sender] pass failed:", error));
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
}

main().catch((error) => {
  console.error("[campaign-sender] fatal error:", error);
  process.exit(1);
});
