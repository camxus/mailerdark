import type { PrismaClient } from "@prisma/client";
import { checkDomainStatus } from "@/lib/dns/verify-domain";

/**
 * One pass of the DnsVerificationWorker (see WORKERS.md): re-checks every
 * SendingDomain that isn't fully verified yet. DNS propagation can take up
 * to 48 hours, so this only logs on a status transition rather than
 * alerting on every still-pending check.
 */
export async function runDnsVerifierPass(db: PrismaClient) {
  const pending = await db.sendingDomain.findMany({
    where: {
      resendDomainId: { not: null },
      OR: [{ spfStatus: { not: "VALID" } }, { dkimStatus: { not: "VALID" } }, { dmarcStatus: { not: "VALID" } }],
    },
  });

  for (const domain of pending) {
    if (!domain.resendDomainId) continue;

    try {
      const result = await checkDomainStatus(domain.resendDomainId, domain.domain);
      const wasVerified = Boolean(domain.verifiedAt);

      await db.sendingDomain.update({
        where: { id: domain.id },
        data: {
          spfStatus: result.spfStatus,
          dkimStatus: result.dkimStatus,
          dmarcStatus: result.dmarcStatus,
          dnsRecords: result.dnsRecords as object,
          verifiedAt: result.fullyVerified ? new Date() : null,
        },
      });

      if (result.fullyVerified && !wasVerified) {
        console.log(`[dns-verifier] ${domain.domain} is now fully verified`);
      }
    } catch (error) {
      console.error(`[dns-verifier] check failed for ${domain.domain}:`, error);
    }
  }

  return { checked: pending.length };
}
