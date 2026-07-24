import { db } from "@/lib/db";
import { NotFoundError } from "@/lib/api/response";
import { resolveAudience, type Audience } from "@/lib/audience/resolve";
import { renderCampaignEmail } from "@/lib/email/render";
import { getEmailProvider } from "@/lib/email/get-provider";
import { EmailProviderError } from "@/lib/email/provider";
import { publishEvent } from "@/lib/events/publish";
import { mapWithConcurrency } from "@/lib/utils/concurrency";

/**
 * Sends are processed inline with bounded concurrency so a
 * "Send now" click sends all recipients in a single request.
 * The concurrency limit (SEND_CONCURRENCY=10) prevents overwhelming
 * the email provider while keeping wall-clock time low.
 */
const SEND_CONCURRENCY = 10;

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

  // Resuming a paused campaign shouldn't re-send to
  // anyone who already has a job — only fill in subscribers who don't.
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

  // All jobs are processed inline — no deferral to a background worker.
  const allJobs = [...existingJobs.filter((j) => j.status === "QUEUED"), ...newJobs];

  const [settings] = await Promise.all([
    db.workspaceSettings.findUnique({ where: { workspaceId } }),
  ]);

  const provider = getEmailProvider(settings?.resendApiKey || undefined);

  let sentCount = 0;
  let failedCount = 0;

  await mapWithConcurrency(allJobs, SEND_CONCURRENCY, async (job) => {
    const subscriber = subscribers.find((s) => s.id === job.subscriberId)!;
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
      const result = await provider.send({
        to: subscriber.email,
        from: `${campaign.fromName} <${campaign.fromEmail}>`,
        replyTo: campaign.replyTo ?? undefined,
        subject: rendered.subject,
        html: rendered.html,
        idempotencyKey: job.id,
      });
      await db.emailJob.update({
        where: { id: job.id },
        data: { status: "SENT", sentAt: new Date(), providerMessageId: result.providerMessageId },
      });
      sentCount += 1;
    } catch (error) {
      const message = error instanceof EmailProviderError ? error.message : "Send failed.";
      await db.emailJob.update({ where: { id: job.id }, data: { status: "FAILED", error: message } });
      failedCount += 1;
    }
  });

  await db.campaign.update({
    where: { id: campaignId },
    data: { status: "SENT", sentAt: new Date() },
  });

  await publishEvent(workspaceId, "campaign:completed", { campaignId, sentCount, failedCount });

  return { totalRecipients: allJobs.length, sentCount, failedCount };
}
