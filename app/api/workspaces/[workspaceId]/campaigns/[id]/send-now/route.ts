import { ok, fail, withErrorHandling, NotFoundError } from "@/lib/api/response";
import { requireWorkspaceAccess } from "@/lib/auth/require-workspace-access";
import { dispatchCampaign } from "@/lib/campaigns/dispatch";

// Sends up to INLINE_SEND_LIMIT recipients with bounded concurrency (see
// lib/campaigns/dispatch.ts) — give it real headroom on platforms with a
// hard request timeout. Lower this (and INLINE_SEND_LIMIT) if your hosting
// plan caps function duration below 60s.
export const maxDuration = 60;

type RouteParams = { params: Promise<{ workspaceId: string; id: string }> };

export const POST = withErrorHandling(async (req: Request, { params }: RouteParams) => {
  const { workspaceId, id } = await params;
  const auth = await requireWorkspaceAccess(req, workspaceId, "campaigns:write");
  if (!auth.ok) return auth.response;

  try {
    const result = await dispatchCampaign(workspaceId, id);
    return ok(result);
  } catch (error) {
    if (error instanceof NotFoundError) return fail(404, "NOT_FOUND", error.message);
    if (error instanceof Error) return fail(409, "SEND_FAILED", error.message);
    throw error;
  }
});
