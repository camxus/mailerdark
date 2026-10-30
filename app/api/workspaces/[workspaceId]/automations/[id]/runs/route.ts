import { db } from "@/lib/db";
import { ok, fail, withErrorHandling } from "@/lib/api/response";
import { requireWorkspaceAccess } from "@/lib/auth/require-workspace-access";

type RouteParams = { params: Promise<{ workspaceId: string; id: string }> };

export const GET = withErrorHandling(async (req: Request, { params }: RouteParams) => {
  const { workspaceId, id } = await params;
  const auth = await requireWorkspaceAccess(req, workspaceId, "automations:read");
  if (!auth.ok) return auth.response;

  const automation = await db.automation.findFirst({ where: { id, workspaceId } });
  if (!automation) return fail(404, "NOT_FOUND", "Automation not found.");

  const runs = await db.automationRun.findMany({
    where: { automationId: id },
    orderBy: { startedAt: "desc" },
    take: 100,
    include: { subscriber: { select: { email: true } } },
  });

  return ok(runs.map((r) => ({
    id: r.id,
    subscriberEmail: r.subscriber.email,
    status: r.status,
    currentNodeId: r.currentNodeId,
    resumeAt: r.resumeAt,
    startedAt: r.startedAt,
    finishedAt: r.finishedAt,
  })));
});
