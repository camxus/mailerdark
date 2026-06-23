import { db } from "@/lib/db";
import { ok, fail, withErrorHandling } from "@/lib/api/response";
import { requireWorkspaceAccess } from "@/lib/auth/require-workspace-access";

type RouteParams = { params: Promise<{ workspaceId: string; id: string }> };

export const POST = withErrorHandling(async (req: Request, { params }: RouteParams) => {
  const { workspaceId, id } = await params;
  const auth = await requireWorkspaceAccess(req, workspaceId, "automations:write");
  if (!auth.ok) return auth.response;

  const automation = await db.automation.findFirst({ where: { id, workspaceId } });
  if (!automation) return fail(404, "NOT_FOUND", "Automation not found.");
  if (automation.status !== "ACTIVE") return fail(409, "NOT_ACTIVE", "Only active automations can be paused.");

  // In-flight AutomationRuns keep their position in the graph; they resume
  // when the automation is re-activated, not immediately.
  const updated = await db.automation.update({ where: { id }, data: { status: "PAUSED" } });
  return ok(updated);
});
