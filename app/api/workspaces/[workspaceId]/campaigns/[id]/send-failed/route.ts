import { ok, fail, withErrorHandling, NotFoundError } from "@/lib/api/response";
import { requireWorkspaceAccess } from "@/lib/auth/require-workspace-access";
import { sendFailedRecipients } from "@/lib/campaigns/dispatch";

type RouteParams = { params: Promise<{ workspaceId: string; id: string }> };

export const maxDuration = 60;

export const POST = withErrorHandling(async (req: Request, { params }: RouteParams) => {
  const { workspaceId, id } = await params;
  const auth = await requireWorkspaceAccess(req, workspaceId, "campaigns:write");
  if (!auth.ok) return auth.response;

  try {
    const result = await sendFailedRecipients(workspaceId, id);
    return ok(result);
  } catch (error) {
    if (error instanceof NotFoundError) return fail(404, "NOT_FOUND", error.message);
    if (error instanceof Error) return fail(409, "SEND_FAILED", error.message);
    throw error;
  }
});
