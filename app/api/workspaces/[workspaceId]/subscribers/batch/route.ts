import { db } from "@/lib/db";
import { ok, fail, withErrorHandling } from "@/lib/api/response";
import { requireWorkspaceAccess } from "@/lib/auth/require-workspace-access";
import { batchDeleteSubscribersSchema } from "@/lib/validation/subscriber.schema";

type RouteParams = { params: Promise<{ workspaceId: string }> };

export const POST = withErrorHandling(async (req: Request, { params }: RouteParams) => {
  const { workspaceId } = await params;
  const auth = await requireWorkspaceAccess(req, workspaceId, "subscribers:write");
  if (!auth.ok) return auth.response;

  const body = batchDeleteSubscribersSchema.parse(await req.json());

  const result = await db.subscriber.deleteMany({
    where: {
      workspaceId,
      id: { in: body.subscriberIds },
    },
  });

  return ok({ deleted: result.count });
});
