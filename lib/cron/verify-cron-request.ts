/**
 * Vercel automatically provisions a CRON_SECRET env var and sends it as
 * `Authorization: Bearer ${CRON_SECRET}` on every Vercel Cron invocation —
 * see https://vercel.com/docs/cron-jobs/manage-cron-jobs. Checking it here
 * stops these routes from being triggered by anyone who finds the URL.
 *
 * Set CRON_SECRET yourself if you're calling these routes from a scheduler
 * other than Vercel Cron (GitHub Actions, cron-job.org, etc).
 */
export function verifyCronRequest(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const header = req.headers.get("authorization");
  return header === `Bearer ${secret}`;
}
