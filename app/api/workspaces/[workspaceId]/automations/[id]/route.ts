import { db } from "@/lib/db";
import { ok, fail, withErrorHandling } from "@/lib/api/response";
import { requireWorkspaceAccess } from "@/lib/auth/require-workspace-access";
import { updateAutomationSchema } from "@/lib/validation/automation.schema";

type RouteParams = { params: Promise<{ workspaceId: string; id: string }> };

export const GET = withErrorHandling(async (req: Request, { params }: RouteParams) => {
  const { workspaceId, id } = await params;
  const auth = await requireWorkspaceAccess(req, workspaceId, "automations:read");
  if (!auth.ok) return auth.response;

  const automation = await db.automation.findFirst({ where: { id, workspaceId } });
  if (!automation) return fail(404, "NOT_FOUND", "Automation not found.");
  return ok(automation);
});

export const PATCH = withErrorHandling(async (req: Request, { params }: RouteParams) => {
  const { workspaceId, id } = await params;
  const auth = await requireWorkspaceAccess(req, workspaceId, "automations:write");
  if (!auth.ok) return auth.response;

  const existing = await db.automation.findFirst({ where: { id, workspaceId } });
  if (!existing) return fail(404, "NOT_FOUND", "Automation not found.");
  if (existing.status === "ACTIVE") {
    return fail(409, "NOT_EDITABLE", "Pause the automation before editing its flow.");
  }

  const body = updateAutomationSchema.parse(await req.json());
  const automation = await db.automation.update({
    where: { id },
    data: {
      name: body.name,
      flowDefinition: body.flowDefinition ? (body.flowDefinition as object) : undefined,
    },
  });
  return ok(automation);
});

export const DELETE = withErrorHandling(async (req: Request, { params }: RouteParams) => {
  const { workspaceId, id } = await params;
  const auth = await requireWorkspaceAccess(req, workspaceId, "automations:write");
  if (!auth.ok) return auth.response;

  const existing = await db.automation.findFirst({ where: { id, workspaceId } });
  if (!existing) return fail(404, "NOT_FOUND", "Automation not found.");

  await db.automation.delete({ where: { id } });
  return ok({ id });
});
