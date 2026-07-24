import { db } from "@/lib/db";
import { ok, fail, withErrorHandling } from "@/lib/api/response";
import { requireWorkspaceAccess } from "@/lib/auth/require-workspace-access";
import { removeDomain } from "@/lib/dns/verify-domain";

type RouteParams = { params: Promise<{ workspaceId: string; id: string }> };

export const DELETE = withErrorHandling(async (req: Request, { params }: RouteParams) => {
  const { workspaceId, id } = await params;
  const auth = await requireWorkspaceAccess(req, workspaceId, "settings:write");
  if (!auth.ok) return auth.response;

  const domain = await db.sendingDomain.findFirst({ where: { id, workspaceId } });
  if (!domain) return fail(404, "NOT_FOUND", "Domain not found.");

  const [settings] = await Promise.all([
    db.workspaceSettings.findUnique({ where: { workspaceId } }),
  ]);

  if (domain.resendDomainId) {
    await removeDomain(domain.resendDomainId, settings?.resendApiKey || undefined).catch((error) => {
      console.error("Failed to remove domain from Resend:", error);
    });
  }

  await db.sendingDomain.delete({ where: { id } });

  return ok({ id });
});
