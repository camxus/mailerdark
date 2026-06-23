import { db } from "@/lib/db";
import { ok, fail, withErrorHandling } from "@/lib/api/response";
import { requireWorkspaceAccess } from "@/lib/auth/require-workspace-access";
import { createDomainSchema } from "@/lib/validation/domain.schema";
import { registerDomain } from "@/lib/dns/verify-domain";

export const maxDuration = 30;

type RouteParams = { params: Promise<{ workspaceId: string }> };

export const GET = withErrorHandling(async (req: Request, { params }: RouteParams) => {
  const { workspaceId } = await params;
  const auth = await requireWorkspaceAccess(req, workspaceId, "settings:write");
  if (!auth.ok) return auth.response;

  const domains = await db.sendingDomain.findMany({
    where: { workspaceId },
    orderBy: { createdAt: "desc" },
  });

  return ok(domains);
});

export const POST = withErrorHandling(async (req: Request, { params }: RouteParams) => {
  const { workspaceId } = await params;
  const auth = await requireWorkspaceAccess(req, workspaceId, "settings:write");
  if (!auth.ok) return auth.response;

  const body = createDomainSchema.parse(await req.json());

  const existing = await db.sendingDomain.findUnique({
    where: { workspaceId_domain: { workspaceId, domain: body.domain } },
  });
  if (existing) return fail(409, "DOMAIN_EXISTS", "This domain is already added.");

  let registration;
  try {
    registration = await registerDomain(body.domain);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to register domain.";
    return fail(502, "PROVIDER_ERROR", message);
  }

  const domain = await db.sendingDomain.create({
    data: {
      workspaceId,
      domain: body.domain,
      resendDomainId: registration.resendDomainId,
      dnsRecords: registration.dnsRecords as object,
      spfStatus: registration.spfStatus,
      dkimStatus: registration.dkimStatus,
    },
  });

  return ok(domain, 201);
});
