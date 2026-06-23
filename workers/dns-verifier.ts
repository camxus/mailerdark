/**
 * DnsVerificationWorker CLI entry point — for running on a host that
 * supports a persistent process. The actual pass logic lives in
 * lib/workers/dns-verifier-pass.ts, shared with
 * app/api/cron/dns-verifier/route.ts. See README.md → "Deploying to
 * Vercel" for which path fits your hosting.
 *
 * Run on an interval (e.g. cron every 10 minutes), or with --watch:
 *   npm run worker:dns-verifier
 *   npm run worker:dns-verifier -- --watch
 */
import { PrismaClient } from "@prisma/client";
import { runDnsVerifierPass } from "../lib/workers/dns-verifier-pass";

const db = new PrismaClient();
const POLL_INTERVAL_MS = Number(process.env.WORKER_POLL_INTERVAL_MS ?? 10 * 60_000);

async function runOnce() {
  const { checked } = await runDnsVerifierPass(db);
  console.log(`[dns-verifier] pass complete — checked ${checked} domain(s)`);
}

async function main() {
  const watch = process.argv.includes("--watch");
  if (!watch) {
    await runOnce();
    await db.$disconnect();
    return;
  }
  console.log(`[dns-verifier] watching, polling every ${POLL_INTERVAL_MS}ms`);
  while (true) {
    await runOnce().catch((e) => console.error("[dns-verifier] pass failed:", e));
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
