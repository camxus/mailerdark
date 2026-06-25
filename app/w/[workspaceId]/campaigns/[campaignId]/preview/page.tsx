import { db } from "@/lib/db";
import { renderCampaignEmail } from "@/lib/email/render";
import { notFound } from "next/navigation";

export const runtime = "nodejs";

export default async function Page({
  params,
}: {
  params: Promise<{ workspaceId: string; campaignId: string }>;
}) {
  const { workspaceId, campaignId } = await params;

  const campaign = await db.campaign.findFirst({
    where: { id: campaignId, workspaceId },
    select: { htmlContent: true, subject: true },
  });

  if (!campaign) {
    notFound();
  }

  const { html } = renderCampaignEmail({
    subject: campaign.subject,
    htmlContent: campaign.htmlContent,
    subscriber: { email: "preview@example.com", customFields: { first_name: "Preview" } },
  });

  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <title>{campaign.subject}</title>
      </head>
      <body dangerouslySetInnerHTML={{ __html: html }} />
    </html>
  );
}