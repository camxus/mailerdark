import { db } from "@/lib/db";
import { ok, withErrorHandling } from "@/lib/api/response";
import { requireWorkspaceAccess } from "@/lib/auth/require-workspace-access";

type RouteParams = { params: Promise<{ workspaceId: string; id: string }> };

export const GET = withErrorHandling(async (req: Request, { params }: RouteParams) => {
  const { workspaceId, id } = await params;
  const auth = await requireWorkspaceAccess(req, workspaceId, "campaigns:read");
  if (!auth.ok) return auth.response;

  const campaign = await db.campaign.findFirst({ where: { id, workspaceId } });
  if (!campaign) return ok([]);

  const jobs = await db.emailJob.findMany({
    where: { campaignId: id },
    include: {
      subscriber: { select: { email: true } },
      events: {
        where: { type: { in: ["OPEN", "CLICK"] } },
        select: { type: true },
      },
    },
    orderBy: { queuedAt: "desc" },
  });

  return ok(
    jobs.map((job) => ({
      id: job.id,
      email: job.subscriber.email,
      status: job.status,
      sentAt: job.sentAt,
      error: job.error,
      opens: job.events.filter((e) => e.type === "OPEN").length,
      clicks: job.events.filter((e) => e.type === "CLICK").length,
    }))
  );
});
