import { db } from "@/lib/db";
import { ok, fail, withErrorHandling } from "@/lib/api/response";
import { requireWorkspaceAccess } from "@/lib/auth/require-workspace-access";
import { checkDomainStatus } from "@/lib/dns/verify-domain";

export const maxDuration = 30;

type RouteParams = { params: Promise<{ workspaceId: string; id: string }> };

export const POST = withErrorHandling(async (req: Request, { params }: RouteParams) => {
  const { workspaceId, id } = await params;
  const auth = await requireWorkspaceAccess(req, workspaceId, "settings:write");
  if (!auth.ok) return auth.response;

  const domain = await db.sendingDomain.findFirst({ where: { id, workspaceId } });
  if (!domain) return fail(404, "NOT_FOUND", "Domain not found.");
  if (!domain.resendDomainId) {
    return fail(409, "NOT_REGISTERED", "This domain was never registered with the email provider.");
  }

  let result;
  try {
    result = await checkDomainStatus(domain.resendDomainId, domain.domain);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to verify domain.";
    return fail(502, "PROVIDER_ERROR", message);
  }

  const updated = await db.sendingDomain.update({
    where: { id },
    data: {
      spfStatus: result.spfStatus,
      dkimStatus: result.dkimStatus,
      dmarcStatus: result.dmarcStatus,
      dnsRecords: result.dnsRecords as object,
      verifiedAt: result.fullyVerified ? new Date() : null,
    },
  });

  return ok(updated);
});
