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

  if (domain.resendDomainId) {
    await removeDomain(domain.resendDomainId).catch((error) => {
      // Don't block local cleanup on a provider-side failure (e.g. it was
      // already removed directly in the Resend dashboard).
      console.error("Failed to remove domain from Resend:", error);
    });
  }

  await db.sendingDomain.delete({ where: { id } });

  return ok({ id });
});
