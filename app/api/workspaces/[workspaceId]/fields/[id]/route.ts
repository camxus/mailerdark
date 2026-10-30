import { db } from "@/lib/db";
import { ok, fail, withErrorHandling } from "@/lib/api/response";
import { requireWorkspaceAccess } from "@/lib/auth/require-workspace-access";
import { updateFieldSchema } from "@/lib/validation/field.schema";

type RouteParams = { params: Promise<{ workspaceId: string; id: string }> };

export const PATCH = withErrorHandling(async (req: Request, { params }: RouteParams) => {
  const { workspaceId, id } = await params;
  const auth = await requireWorkspaceAccess(req, workspaceId, "subscribers:write");
  if (!auth.ok) return auth.response;

  const body = updateFieldSchema.parse(await req.json());

  const existing = await db.field.findFirst({ where: { id, workspaceId } });
  if (!existing) return fail(404, "NOT_FOUND", "Field not found.");

  const field = await db.field.update({ where: { id }, data: body });

  return ok(field);
});

export const DELETE = withErrorHandling(async (req: Request, { params }: RouteParams) => {
  const { workspaceId, id } = await params;
  const auth = await requireWorkspaceAccess(req, workspaceId, "subscribers:write");
  if (!auth.ok) return auth.response;

  const existing = await db.field.findFirst({ where: { id, workspaceId } });
  if (!existing) return fail(404, "NOT_FOUND", "Field not found.");

  await db.field.delete({ where: { id } });

  return ok({ id });
});
