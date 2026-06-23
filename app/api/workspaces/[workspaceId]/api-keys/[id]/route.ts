import { db } from "@/lib/db";
import { ok, fail, withErrorHandling } from "@/lib/api/response";
import { requireWorkspaceAccess } from "@/lib/auth/require-workspace-access";

type RouteParams = { params: Promise<{ workspaceId: string; id: string }> };

export const DELETE = withErrorHandling(async (req: Request, { params }: RouteParams) => {
  const { workspaceId, id } = await params;
  const auth = await requireWorkspaceAccess(req, workspaceId, "settings:write");
  if (!auth.ok) return auth.response;

  const key = await db.apiKey.findFirst({ where: { id, workspaceId } });
  if (!key) return fail(404, "NOT_FOUND", "API key not found.");

  await db.apiKey.delete({ where: { id } });

  return ok({ id });
});
