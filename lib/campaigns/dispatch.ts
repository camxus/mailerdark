import { db } from "@/lib/db";
import { NotFoundError } from "@/lib/api/response";
import { resolveAudience, type Audience } from "@/lib/audience/resolve";
import { renderCampaignEmail } from "@/lib/email/render";
import { getEmailProvider } from "@/lib/email/get-provider";
import { EmailProviderError } from "@/lib/email/provider";
import { publishEvent } from "@/lib/events/publish";

export async function dispatchCampaign(workspaceId: string, campaignId: string) {
  const campaign = await db.campaign.findFirst({ where: { id: campaignId, workspaceId } });
  if (!campaign) throw new NotFoundError("Campaign not found.");
  if (!["DRAFT", "SCHEDULED", "PAUSED"].includes(campaign.status)) {
    throw new Error("This campaign has already been sent or is currently sending.");
  }

  const subscribers = await resolveAudience(workspaceId, campaign.audience as Audience);
  if (subscribers.length === 0) {
    throw new Error("No subscribers match this campaign's audience.");
  }

  await db.campaign.update({ where: { id: campaignId }, data: { status: "SENDING" } });

  const [settings] = await Promise.all([
    db.workspaceSettings.findUnique({ where: { workspaceId } }),
  ]);

  const provider = getEmailProvider(settings?.resendApiKey || undefined);

  let sentCount = 0;
  let failedCount = 0;

  for (const subscriber of subscribers) {
    const rendered = renderCampaignEmail({
      subject: campaign.subject,
      htmlContent: campaign.htmlContent,
      subscriber: {
        email: subscriber.email,
        customFields: subscriber.customFields as Record<string, unknown>,
      },
    });

    try {
      await provider.send({
        to: subscriber.email,
        from: `${campaign.fromName} <${campaign.fromEmail}>`,
        replyTo: campaign.replyTo ?? undefined,
        subject: rendered.subject,
        html: rendered.html,
      });
      sentCount += 1;
    } catch (error) {
      const message = error instanceof EmailProviderError ? error.message : "Send failed.";
      console.error(`Failed to send to ${subscriber.email}: ${message}`);
      failedCount += 1;
    }
  }

  await db.campaign.update({
    where: { id: campaignId },
    data: { status: "SENT", sentAt: new Date() },
  });

  await publishEvent(workspaceId, "campaign:completed", { campaignId, sentCount, failedCount });

  return { totalRecipients: subscribers.length, sentCount, failedCount };
}
