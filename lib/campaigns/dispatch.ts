import { db } from "@/lib/db";
import { NotFoundError } from "@/lib/api/response";
import { resolveAudience, type Audience } from "@/lib/audience/resolve";
import { renderCampaignEmail } from "@/lib/email/render";
import { getEmailProvider } from "@/lib/email/get-provider";
import { EmailProviderError } from "@/lib/email/provider";
import { publishEvent } from "@/lib/events/publish";

const BATCH_SIZE = 50;

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

  const existingJobs = await db.emailJob.findMany({
    where: { campaignId, subscriberId: { in: subscribers.map((s) => s.id) } },
  });
  const subscriberIdsWithJobs = new Set(existingJobs.map((j) => j.subscriberId));
  const newSubscribers = subscribers.filter((s) => !subscriberIdsWithJobs.has(s.id));

  const newJobs = await Promise.all(
    newSubscribers.map((s) =>
      db.emailJob.create({
        data: { workspaceId, subscriberId: s.id, campaignId, status: "QUEUED" },
      })
    )
  );

  const stillQueued = existingJobs.filter((j) => j.status === "QUEUED");
  const jobsToProcess = [...stillQueued, ...newJobs];

  let sentCount = 0;
  let failedCount = 0;

  for (const job of jobsToProcess) {
    const subscriber = subscribers.find((s) => s.id === job.subscriberId);
    if (!subscriber) continue;

    const rendered = renderCampaignEmail({
      subject: campaign.subject,
      htmlContent: campaign.htmlContent,
      subscriber: {
        email: subscriber.email,
        customFields: subscriber.customFields as Record<string, unknown>,
      },
      jobId: job.id,
    });

    try {
      await provider.send({
        to: subscriber.email,
        from: `${campaign.fromName} <${campaign.fromEmail}>`,
        replyTo: campaign.replyTo ?? undefined,
        subject: rendered.subject,
        html: rendered.html,
        idempotencyKey: job.id,
      });
      await db.emailJob.update({
        where: { id: job.id },
        data: { status: "SENT", sentAt: new Date() },
      });
      sentCount += 1;
    } catch (error) {
      const message = error instanceof EmailProviderError ? error.message : "Send failed.";
      await db.emailJob.update({
        where: { id: job.id },
        data: { status: "FAILED", error: message },
      });
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
