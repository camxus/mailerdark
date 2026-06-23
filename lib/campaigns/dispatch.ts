import { db } from "@/lib/db";
import { NotFoundError } from "@/lib/api/response";
import { resolveAudience, type Audience } from "@/lib/audience/resolve";
import { renderCampaignEmail } from "@/lib/email/render";
import { getEmailProvider } from "@/lib/email/get-provider";
import { EmailProviderError } from "@/lib/email/provider";
import { publishEvent } from "@/lib/events/publish";
import { mapWithConcurrency } from "@/lib/utils/concurrency";

/**
 * Sends are processed inline, up to INLINE_SEND_LIMIT recipients, so a
 * "Send now" click works out of the box with no separate process running.
 * Anything beyond the limit is left QUEUED for workers/campaign-sender.ts
 * (see WORKERS.md) — run it as a standalone process, or on Vercel via the
 * /api/cron/campaign-sender route. See README.md → "Deploying to Vercel".
 *
 * The inline batch itself is sent with bounded concurrency rather than one
 * at a time: at SEND_CONCURRENCY=10, 200 recipients finishes in roughly
 * 1/10th the wall-clock time of a sequential loop, which matters a lot on
 * a platform with a hard per-request execution time limit.
 */
const INLINE_SEND_LIMIT = 200;
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

  // Resuming a paused (or partially-deferred) campaign shouldn't re-send to
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

  // Process new jobs plus any previously-queued jobs that never got sent
  // (left over from a deferred batch or an earlier pause).
  const stillQueued = existingJobs.filter((j) => j.status === "QUEUED");
  const jobsToProcessNow = [...stillQueued, ...newJobs].slice(0, INLINE_SEND_LIMIT);
  const totalPending = stillQueued.length + newJobs.length;
  const deferredCount = totalPending - jobsToProcessNow.length;
  const provider = getEmailProvider();

  let sentCount = 0;
  let failedCount = 0;

  await mapWithConcurrency(jobsToProcessNow, SEND_CONCURRENCY, async (job) => {
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

  const fullyComplete = deferredCount === 0;
  await db.campaign.update({
    where: { id: campaignId },
    data: {
      status: fullyComplete ? "SENT" : "SENDING",
      sentAt: fullyComplete ? new Date() : undefined,
    },
  });

  if (fullyComplete) {
    await publishEvent(workspaceId, "campaign:completed", { campaignId, sentCount, failedCount });
  }

  return { totalRecipients: existingJobs.length + newJobs.length, sentCount, failedCount, deferredCount };
}
