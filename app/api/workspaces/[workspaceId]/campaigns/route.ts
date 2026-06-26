import { db } from "@/lib/db";
import { ok, withErrorHandling } from "@/lib/api/response";
import { requireWorkspaceAccess } from "@/lib/auth/require-workspace-access";

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

  const workspace = await db.workspace.findFirst({
    where: { id: workspaceId },
    include: { settings: true },
  });

  const campaign = await db.campaign.create({
    data: {
      workspaceId,
      subject: "Untitled campaign",
      fromName: workspace?.settings?.fromName ?? "Admin",
      fromEmail: workspace?.settings?.fromEmail ?? "noreply@example.com",
      htmlContent: "<p>Write your email here…</p>",
      audience: {},
    },
  });

  return ok(campaign, 201);
});
