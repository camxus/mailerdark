import { ok, fail, withErrorHandling, NotFoundError } from "@/lib/api/response";
import { requireWorkspaceAccess } from "@/lib/auth/require-workspace-access";
import { continueCampaignSending } from "@/lib/campaigns/dispatch";
import { z } from "zod";

type RouteParams = { params: Promise<{ workspaceId: string; id: string }> };

const continueBodySchema = z.object({
  subscriberIds: z.array(z.string().uuid()).optional(),
});

export const maxDuration = 60;

export const POST = withErrorHandling(async (req: Request, { params }: RouteParams) => {
  const { workspaceId, id } = await params;
  const auth = await requireWorkspaceAccess(req, workspaceId, "campaigns:write");
  if (!auth.ok) return auth.response;

  try {
    const body = continueBodySchema.parse(await req.json());
    const result = await continueCampaignSending(workspaceId, id, body.subscriberIds);
    return ok(result);
  } catch (error) {
    if (error instanceof NotFoundError) return fail(404, "NOT_FOUND", error.message);
    if (error instanceof Error) return fail(409, "SEND_FAILED", error.message);
    throw error;
  }
});
