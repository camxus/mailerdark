import { db } from "@/lib/db";
import { ok, fail, withErrorHandling } from "@/lib/api/response";
import { requireWorkspaceAccess } from "@/lib/auth/require-workspace-access";
import { updateGroupSchema } from "@/lib/validation/group.schema";

type RouteParams = { params: Promise<{ workspaceId: string; id: string }> };

export const PATCH = withErrorHandling(async (req: Request, { params }: RouteParams) => {
  const { workspaceId, id } = await params;
  const auth = await requireWorkspaceAccess(req, workspaceId, "subscribers:write");
  if (!auth.ok) return auth.response;

  const body = updateGroupSchema.parse(await req.json());

  const existing = await db.group.findFirst({ where: { id, workspaceId } });
  if (!existing) return fail(404, "NOT_FOUND", "Group not found.");

  const group = await db.group.update({ where: { id }, data: body });

  return ok({ id: group.id, name: group.name, description: group.description });
});

export const DELETE = withErrorHandling(async (req: Request, { params }: RouteParams) => {
  const { workspaceId, id } = await params;
  const auth = await requireWorkspaceAccess(req, workspaceId, "subscribers:write");
  if (!auth.ok) return auth.response;

  const existing = await db.group.findFirst({ where: { id, workspaceId } });
  if (!existing) return fail(404, "NOT_FOUND", "Group not found.");

  await db.group.delete({ where: { id } });

  return ok({ id });
});
