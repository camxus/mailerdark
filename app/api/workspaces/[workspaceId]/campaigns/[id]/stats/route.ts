import { db } from "@/lib/db";
import { ok, fail, withErrorHandling } from "@/lib/api/response";
import { requireWorkspaceAccess } from "@/lib/auth/require-workspace-access";

type RouteParams = { params: Promise<{ workspaceId: string; id: string }> };

export const GET = withErrorHandling(async (req: Request, { params }: RouteParams) => {
  const { workspaceId, id } = await params;
  const auth = await requireWorkspaceAccess(req, workspaceId, "campaigns:read");
  if (!auth.ok) return auth.response;

  const campaign = await db.campaign.findFirst({ where: { id, workspaceId } });
  if (!campaign) return fail(404, "NOT_FOUND", "Campaign not found.");

  const [sent, failed, queued, opens, clicks, unsubscribes] = await Promise.all([
    db.emailJob.count({ where: { campaignId: id, status: "SENT" } }),
    db.emailJob.count({ where: { campaignId: id, status: "FAILED" } }),
    db.emailJob.count({ where: { campaignId: id, status: "QUEUED" } }),
    db.emailEvent.count({ where: { type: "OPEN", job: { campaignId: id } } }),
    db.emailEvent.count({ where: { type: "CLICK", job: { campaignId: id } } }),
    db.emailEvent.count({ where: { type: "UNSUBSCRIBE", job: { campaignId: id } } }),
  ]);

  // Distinct opens/clicks (a subscriber may trigger the pixel more than once).
  const [uniqueOpens, uniqueClicks] = await Promise.all([
    db.emailEvent.findMany({
      where: { type: "OPEN", job: { campaignId: id } },
      distinct: ["jobId"],
      select: { jobId: true },
    }),
    db.emailEvent.findMany({
      where: { type: "CLICK", job: { campaignId: id } },
      distinct: ["jobId"],
      select: { jobId: true },
    }),
  ]);

  const total = sent + failed + queued;

  return ok({
    status: campaign.status,
    total,
    sent,
    failed,
    queued,
    opens,
    uniqueOpens: uniqueOpens.length,
    clicks,
    uniqueClicks: uniqueClicks.length,
    unsubscribes,
    openRate: sent > 0 ? uniqueOpens.length / sent : 0,
    clickRate: sent > 0 ? uniqueClicks.length / sent : 0,
  });
});
