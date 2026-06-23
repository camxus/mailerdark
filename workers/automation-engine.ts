/**
 * AutomationEngineWorker CLI entry point — for running on a host that
 * supports a persistent process. The actual pass logic lives in
 * lib/workers/automation-engine-pass.ts, shared with
 * app/api/cron/automation-engine/route.ts. See README.md → "Deploying to
 * Vercel" for which path fits your hosting.
 *
 * Run once or with --watch:
 *   npm run worker:automation-engine
 *   npm run worker:automation-engine -- --watch
 */
import { PrismaClient } from "@prisma/client";
import { runAutomationEnginePass } from "../lib/workers/automation-engine-pass";

const db = new PrismaClient();
const POLL_INTERVAL_MS = Number(process.env.WORKER_POLL_INTERVAL_MS ?? 15_000);

async function runOnce() {
  await runAutomationEnginePass(db);
  console.log("[automation-engine] pass complete");
}

async function main() {
  const watch = process.argv.includes("--watch");
  if (!watch) {
    await runOnce();
    await db.$disconnect();
    return;
  }
  console.log(`[automation-engine] watching, polling every ${POLL_INTERVAL_MS}ms`);
  while (true) {
    await runOnce().catch((e) => console.error("[automation-engine] pass failed:", e));
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
