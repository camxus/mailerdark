import { db } from "@/lib/db";
import { ok, withErrorHandling } from "@/lib/api/response";
import { requireWorkspaceAccess } from "@/lib/auth/require-workspace-access";
import { createCampaignSchema } from "@/lib/validation/campaign.schema";

type RouteParams = { params: Promise<{ workspaceId: string }> };

export const GET = withErrorHandling(async (req: Request, { params }: RouteParams) => {
  const { workspaceId } = await params;
  const auth = await requireWorkspaceAccess(req, workspaceId, "campaigns:read");
  if (!auth.ok) return auth.response;

  const campaigns = await db.campaign.findMany({
    where: { workspaceId },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { emailJobs: true } } },
  });

  return ok(
    campaigns.map((c) => ({
      id: c.id,
      subject: c.subject,
      status: c.status,
      scheduledAt: c.scheduledAt,
      sentAt: c.sentAt,
      createdAt: c.createdAt,
      jobCount: c._count.emailJobs,
    }))
  );
});

export const POST = withErrorHandling(async (req: Request, { params }: RouteParams) => {
  const { workspaceId } = await params;
  const auth = await requireWorkspaceAccess(req, workspaceId, "campaigns:write");
  if (!auth.ok) return auth.response;

  const body = createCampaignSchema.parse(await req.json());

  const campaign = await db.campaign.create({
    data: {
      workspaceId,
      subject: body.subject,
      fromName: body.fromName,
      fromEmail: body.fromEmail,
      replyTo: body.replyTo,
      htmlContent: body.htmlContent,
      // @ts-expect-error Prisma Json type is incompatible with application Audience type
      audience: body.audience ?? {},
    },
  });

  return ok(campaign, 201);
});
