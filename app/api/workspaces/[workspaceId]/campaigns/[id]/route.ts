import { db } from "@/lib/db";
import { ok, fail, withErrorHandling } from "@/lib/api/response";
import { requireWorkspaceAccess } from "@/lib/auth/require-workspace-access";
import { updateCampaignSchema } from "@/lib/validation/campaign.schema";

type RouteParams = { params: Promise<{ workspaceId: string; id: string }> };

export const GET = withErrorHandling(async (req: Request, { params }: RouteParams) => {
  const { workspaceId, id } = await params;
  const auth = await requireWorkspaceAccess(req, workspaceId, "campaigns:read");
  if (!auth.ok) return auth.response;

  const campaign = await db.campaign.findFirst({ where: { id, workspaceId } });
  if (!campaign) return fail(404, "NOT_FOUND", "Campaign not found.");

  return ok(campaign);
});

export const PATCH = withErrorHandling(async (req: Request, { params }: RouteParams) => {
  const { workspaceId, id } = await params;
  const auth = await requireWorkspaceAccess(req, workspaceId, "campaigns:write");
  if (!auth.ok) return auth.response;

  const existing = await db.campaign.findFirst({ where: { id, workspaceId } });
  if (!existing) return fail(404, "NOT_FOUND", "Campaign not found.");
  if (existing.status !== "DRAFT") {
    return fail(409, "NOT_EDITABLE", "Only draft campaigns can be edited.");
  }

  const body = updateCampaignSchema.parse(await req.json());

  const campaign = await db.campaign.update({ where: { id }, data: body });

  return ok(campaign);
});

export const DELETE = withErrorHandling(async (req: Request, { params }: RouteParams) => {
  const { workspaceId, id } = await params;
  const auth = await requireWorkspaceAccess(req, workspaceId, "campaigns:write");
  if (!auth.ok) return auth.response;

  const existing = await db.campaign.findFirst({ where: { id, workspaceId } });
  if (!existing) return fail(404, "NOT_FOUND", "Campaign not found.");
  if (existing.status !== "DRAFT") {
    return fail(409, "NOT_DELETABLE", "Only draft campaigns can be deleted.");
  }

  await db.campaign.delete({ where: { id } });

  return ok({ id });
});
