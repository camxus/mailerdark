import { resolveTxt } from "dns/promises";
import { getResendClient } from "@/lib/email/resend-client";

export type DnsCheckStatus = "PENDING" | "VALID" | "INVALID";

export type DomainRegistration = {
  resendDomainId: string;
  dnsRecords: unknown;
  spfStatus: DnsCheckStatus;
  dkimStatus: DnsCheckStatus;
};

export type DomainCheckResult = {
  spfStatus: DnsCheckStatus;
  dkimStatus: DnsCheckStatus;
  dmarcStatus: DnsCheckStatus;
  dnsRecords: unknown;
  fullyVerified: boolean;
};

function mapRecordStatus(status: string | undefined): DnsCheckStatus {
  if (status === "verified") return "VALID";
  if (status === "failed" || status === "temporary_failure") return "INVALID";
  return "PENDING"; // 'pending' | 'not_started' | undefined
}

/**
 * Registers a domain with Resend. This is what produces the actual DNS
 * records (SPF TXT/MX, DKIM CNAME/TXT) the person needs to publish — we
 * don't invent record values ourselves, we surface exactly what Resend
 * requires for that specific domain.
 */
export async function registerDomain(domain: string): Promise<DomainRegistration> {
  const resend = getResendClient();
  const { data, error } = await resend.domains.create({ name: domain });

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to register domain with Resend.");
  }

  const spfRecord = data.records.find((r) => r.record === "SPF");
  const dkimRecord = data.records.find((r) => r.record === "DKIM");

  return {
    resendDomainId: data.id,
    dnsRecords: data.records,
    spfStatus: mapRecordStatus(spfRecord?.status),
    dkimStatus: mapRecordStatus(dkimRecord?.status),
  };
}

/**
 * Re-checks a previously registered domain. SPF/DKIM status comes from
 * Resend (they're the ones actually sending mail through these records).
 * DMARC is checked independently via a direct DNS TXT lookup, since
 * Resend's domain verification doesn't track or require DMARC at all —
 * it's a policy record the domain owner manages on their own, not
 * something tied to Resend's sending setup.
 */
export async function checkDomainStatus(resendDomainId: string, domain: string): Promise<DomainCheckResult> {
  const resend = getResendClient();

  // Ask Resend to re-run its own check, then fetch the resulting status —
  // verify() alone doesn't return per-record detail, get() does.
  await resend.domains.verify(resendDomainId).catch(() => null);
  const { data, error } = await resend.domains.get(resendDomainId);

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to fetch domain status from Resend.");
  }

  const spfRecord = data.records.find((r) => r.record === "SPF");
  const dkimRecord = data.records.find((r) => r.record === "DKIM");
  const spfStatus = mapRecordStatus(spfRecord?.status);
  const dkimStatus = mapRecordStatus(dkimRecord?.status);
  const dmarcStatus = await checkDmarcRecord(domain);

  return {
    spfStatus,
    dkimStatus,
    dmarcStatus,
    dnsRecords: data.records,
    fullyVerified: spfStatus === "VALID" && dkimStatus === "VALID" && dmarcStatus === "VALID",
  };
}

async function checkDmarcRecord(domain: string): Promise<DnsCheckStatus> {
  try {
    const records = await resolveTxt(`_dmarc.${domain}`);
    const flattened = records.map((parts) => parts.join(""));
    const hasDmarc = flattened.some((txt) => txt.toUpperCase().startsWith("V=DMARC1"));
    return hasDmarc ? "VALID" : "INVALID";
  } catch {
    // ENOTFOUND/ENODATA — no record published yet, distinct from "checked and broken".
    return "PENDING";
  }
}

export async function removeDomain(resendDomainId: string): Promise<void> {
  const resend = getResendClient();
  await resend.domains.remove(resendDomainId);
}
