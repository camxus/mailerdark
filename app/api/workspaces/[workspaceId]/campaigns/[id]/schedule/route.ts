import { db } from "@/lib/db";
import { ok, fail, withErrorHandling } from "@/lib/api/response";
import { requireWorkspaceAccess } from "@/lib/auth/require-workspace-access";
import { scheduleCampaignSchema } from "@/lib/validation/campaign.schema";

type RouteParams = { params: Promise<{ workspaceId: string; id: string }> };

export const POST = withErrorHandling(async (req: Request, { params }: RouteParams) => {
  const { workspaceId, id } = await params;
  const auth = await requireWorkspaceAccess(req, workspaceId, "campaigns:write");
  if (!auth.ok) return auth.response;

  const campaign = await db.campaign.findFirst({ where: { id, workspaceId } });
  if (!campaign) return fail(404, "NOT_FOUND", "Campaign not found.");
  if (campaign.status !== "DRAFT") {
    return fail(409, "INVALID_STATUS", "Only draft campaigns can be scheduled.");
  }

  const body = scheduleCampaignSchema.parse(await req.json());
  const scheduledAt = new Date(body.scheduledAt);
  if (scheduledAt.getTime() <= Date.now()) {
    return fail(422, "VALIDATION_ERROR", "Scheduled time must be in the future.");
  }

  const updated = await db.campaign.update({
    where: { id },
    data: { status: "SCHEDULED", scheduledAt },
  });

  return ok(updated);
});
