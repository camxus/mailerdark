import { db } from "@/lib/db";
import { ok, fail, withErrorHandling } from "@/lib/api/response";
import { requireWorkspaceAccess } from "@/lib/auth/require-workspace-access";

type RouteParams = { params: Promise<{ workspaceId: string; id: string }> };

export const POST = withErrorHandling(async (req: Request, { params }: RouteParams) => {
  const { workspaceId, id } = await params;
  const auth = await requireWorkspaceAccess(req, workspaceId, "campaigns:write");
  if (!auth.ok) return auth.response;

  const campaign = await db.campaign.findFirst({ where: { id, workspaceId } });
  if (!campaign) return fail(404, "NOT_FOUND", "Campaign not found.");
  if (campaign.status !== "SENDING" && campaign.status !== "SCHEDULED") {
    return fail(409, "INVALID_STATUS", "Only a sending or scheduled campaign can be paused.");
  }

  // Any EmailJobs already sent stay sent; remaining QUEUED jobs are left in
  // place so resuming (re-running send-now once support for that lands)
  // picks up where it left off rather than re-sending everyone.
  const updated = await db.campaign.update({ where: { id }, data: { status: "PAUSED" } });

  return ok(updated);
});
