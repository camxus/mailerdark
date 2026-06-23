import type { PrismaClient } from "@prisma/client";
import { renderCampaignEmail } from "@/lib/email/render";
import { getEmailProvider } from "@/lib/email/get-provider";
import { EmailProviderError } from "@/lib/email/provider";
import { resolveAudience, type Audience } from "@/lib/audience/resolve";
import { publishEvent } from "@/lib/events/publish";

const BATCH_SIZE = Number(process.env.WORKER_BATCH_SIZE ?? 50);

/**
 * One pass of the CampaignSenderWorker (see WORKERS.md):
 *  1. Promotes any SCHEDULED campaign whose scheduledAt has arrived into
 *     SENDING and creates its EmailJobs.
 *  2. Sends every QUEUED EmailJob — this is what actually delivers mail
 *     for audiences too large for the inline send-now path to finish
 *     within a single request (see INLINE_SEND_LIMIT in lib/campaigns/dispatch.ts).
 *
 * Takes `db` as a parameter rather than importing a singleton so the CLI
 * script (its own dedicated PrismaClient, long-lived process) and the
 * Vercel Cron route (the app's shared `lib/db.ts` client, one invocation)
 * can both call this without duplicating the logic.
 */
export async function runCampaignSenderPass(db: PrismaClient) {
  await promoteDueScheduledCampaigns(db);
  const { processed } = await sendQueuedBatch(db);
  return { processed };
}

async function promoteDueScheduledCampaigns(db: PrismaClient) {
  const due = await db.campaign.findMany({
    where: { status: "SCHEDULED", scheduledAt: { lte: new Date() } },
  });

  for (const campaign of due) {
    const subscribers = await resolveAudience(campaign.workspaceId, campaign.audience as Audience);
    await db.campaign.update({ where: { id: campaign.id }, data: { status: "SENDING" } });

    if (subscribers.length === 0) {
      await db.campaign.update({ where: { id: campaign.id }, data: { status: "SENT", sentAt: new Date() } });
      continue;
    }

    await db.$transaction(
      subscribers.map((s) =>
        db.emailJob.create({
          data: { workspaceId: campaign.workspaceId, subscriberId: s.id, campaignId: campaign.id, status: "QUEUED" },
        })
      )
    );

    console.log(`[campaign-sender] promoted scheduled campaign ${campaign.id} (${subscribers.length} recipients)`);
  }
}

async function sendQueuedBatch(db: PrismaClient) {
  const jobs = await db.emailJob.findMany({
    where: { status: "QUEUED" },
    take: BATCH_SIZE,
    orderBy: { queuedAt: "asc" },
    include: { subscriber: true, campaign: true },
  });

  if (jobs.length === 0) return { processed: 0 };

  const provider = getEmailProvider();

  for (const job of jobs) {
    if (!job.campaign) {
      // EmailJobs without a campaign belong to automations — left QUEUED
      // for the AutomationEngineWorker to pick up, not this one.
      continue;
    }

    const rendered = renderCampaignEmail({
      subject: job.campaign.subject,
      htmlContent: job.campaign.htmlContent,
      subscriber: {
        email: job.subscriber.email,
        customFields: job.subscriber.customFields as Record<string, unknown>,
      },
      jobId: job.id,
    });

    try {
      const result = await provider.send({
        to: job.subscriber.email,
        from: `${job.campaign.fromName} <${job.campaign.fromEmail}>`,
        replyTo: job.campaign.replyTo ?? undefined,
        subject: rendered.subject,
        html: rendered.html,
        idempotencyKey: job.id,
      });
      await db.emailJob.update({
        where: { id: job.id },
        data: { status: "SENT", sentAt: new Date(), providerMessageId: result.providerMessageId },
      });
    } catch (error) {
      const message = error instanceof EmailProviderError ? error.message : "Send failed.";
      const retryable = error instanceof EmailProviderError ? error.retryable : false;
      await db.emailJob.update({
        where: { id: job.id },
        data: { status: retryable ? "QUEUED" : "FAILED", error: message },
      });
    }
  }

  await closeOutFinishedCampaigns(db, jobs.map((j) => j.campaignId).filter((id): id is string => Boolean(id)));

  return { processed: jobs.length };
}

async function closeOutFinishedCampaigns(db: PrismaClient, campaignIds: string[]) {
  for (const campaignId of new Set(campaignIds)) {
    const remaining = await db.emailJob.count({ where: { campaignId, status: "QUEUED" } });
    if (remaining > 0) continue;

    const campaign = await db.campaign.findUnique({ where: { id: campaignId } });
    if (!campaign || campaign.status !== "SENDING") continue;

    const [sentCount, failedCount] = await Promise.all([
      db.emailJob.count({ where: { campaignId, status: "SENT" } }),
      db.emailJob.count({ where: { campaignId, status: "FAILED" } }),
    ]);

    await db.campaign.update({ where: { id: campaignId }, data: { status: "SENT", sentAt: new Date() } });
    await publishEvent(campaign.workspaceId, "campaign:completed", { campaignId, sentCount, failedCount });
    console.log(`[campaign-sender] campaign ${campaignId} complete (${sentCount} sent, ${failedCount} failed)`);
  }
}
