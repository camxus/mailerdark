import {
  CreateEmailIdentityCommand,
  DeleteEmailIdentityCommand,
  GetEmailIdentityCommand,
  PutEmailIdentityMailFromAttributesCommand,
} from "@aws-sdk/client-sesv2";
import { getSesClient } from "@/lib/email/ses-client";

type Status = "PENDING" | "VALID" | "INVALID";

/** Same shape the UI already renders (components/domains/domains-page.tsx). */
export type SesDnsRecord = {
  record: string;
  name: string;
  value: string;
  type: string;
  ttl: string;
  status: string;
  priority?: number;
};

export type SesDomainState = {
  dnsRecords: SesDnsRecord[];
  spfStatus: Status;
  dkimStatus: Status;
};

function mapStatus(s: string | undefined): Status {
  if (s === "SUCCESS") return "VALID";
  if (s === "FAILED" || s === "TEMPORARY_FAILURE") return "INVALID";
  return "PENDING"; // PENDING | NOT_STARTED | undefined
}

const mailFromFor = (domain: string) => `mail.${domain}`;

/**
 * Creates the SES identity (Easy DKIM, 2048-bit) plus a custom MAIL FROM subdomain.
 * The MAIL FROM domain is what makes SPF *aligned* for DMARC, so SPF status here
 * means "MAIL FROM MX/TXT verified". Returns the exact records to publish.
 */
export async function registerSesDomain(domain: string): Promise<SesDomainState> {
  const ses = getSesClient();

  try {
    await ses.send(
      new CreateEmailIdentityCommand({
        EmailIdentity: domain,
        ConfigurationSetName: process.env.SES_CONFIGURATION_SET || undefined,
        DkimSigningAttributes: { NextSigningKeyLength: "RSA_2048_BIT" },
      })
    );
  } catch (error) {
    // Already exists in this AWS account (e.g. re-adding the domain): reuse it.
    if ((error as { name?: string }).name !== "AlreadyExistsException") throw error;
  }

  await ses.send(
    new PutEmailIdentityMailFromAttributesCommand({
      EmailIdentity: domain,
      MailFromDomain: mailFromFor(domain),
      BehaviorOnMxFailure: "USE_DEFAULT_VALUE",
    })
  );

  return readSesDomain(domain);
}

export async function readSesDomain(domain: string): Promise<SesDomainState> {
  const out = await getSesClient().send(new GetEmailIdentityCommand({ EmailIdentity: domain }));

  const dkimStatus = mapStatus(out.DkimAttributes?.Status);
  const spfStatus = mapStatus(out.MailFromAttributes?.MailFromDomainStatus);
  const mailFrom = out.MailFromAttributes?.MailFromDomain ?? mailFromFor(domain);
  const region = process.env.SES_REGION;

  const dnsRecords: SesDnsRecord[] = [
    ...(out.DkimAttributes?.Tokens ?? []).map((token) => ({
      record: "DKIM",
      type: "CNAME",
      name: `${token}._domainkey.${domain}`,
      value: `${token}.dkim.amazonses.com`,
      ttl: "Auto",
      status: out.DkimAttributes?.Status === "SUCCESS" ? "verified" : "pending",
    })),
    {
      record: "SPF",
      type: "MX",
      name: mailFrom,
      value: `feedback-smtp.${region}.amazonses.com`,
      ttl: "Auto",
      priority: 10,
      status: spfStatus === "VALID" ? "verified" : "pending",
    },
    {
      record: "SPF",
      type: "TXT",
      name: mailFrom,
      value: "v=spf1 include:amazonses.com ~all",
      ttl: "Auto",
      status: spfStatus === "VALID" ? "verified" : "pending",
    },
  ];

  return { dnsRecords, spfStatus, dkimStatus };
}

export async function removeSesDomain(domain: string): Promise<void> {
  try {
    await getSesClient().send(new DeleteEmailIdentityCommand({ EmailIdentity: domain }));
  } catch (error) {
    if ((error as { name?: string }).name !== "NotFoundException") throw error;
  }
}
