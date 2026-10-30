import { db } from "@/lib/db";
import { ok, fail, withErrorHandling } from "@/lib/api/response";
import { requireWorkspaceAccess } from "@/lib/auth/require-workspace-access";
import { validateFlowDefinition } from "@/lib/automations/engine";
import type { FlowDefinition } from "@/lib/automations/types";

type RouteParams = { params: Promise<{ workspaceId: string; id: string }> };

export const POST = withErrorHandling(async (req: Request, { params }: RouteParams) => {
  const { workspaceId, id } = await params;
  const auth = await requireWorkspaceAccess(req, workspaceId, "automations:write");
  if (!auth.ok) return auth.response;

  const automation = await db.automation.findFirst({ where: { id, workspaceId } });
  if (!automation) return fail(404, "NOT_FOUND", "Automation not found.");
  if (automation.status === "ACTIVE") return fail(409, "ALREADY_ACTIVE", "Automation is already active.");

  const error = validateFlowDefinition(automation.flowDefinition as FlowDefinition);
  if (error) return fail(422, "INVALID_FLOW", error);

  const updated = await db.automation.update({ where: { id }, data: { status: "ACTIVE" } });
  return ok(updated);
});
