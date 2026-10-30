import { db } from "@/lib/db";
import { NotFoundError } from "@/lib/api/response";
import { resolveAudience, type Audience } from "@/lib/audience/resolve";
import { renderCampaignEmail } from "@/lib/email/render";
import { getEmailProvider } from "@/lib/email/get-provider";
import { EmailProviderError } from "@/lib/email/provider";
import { publishEvent } from "@/lib/events/publish";

export type SendCampaignResult = {
  totalRecipients: number;
  sentCount: number;
  failedCount: number;
  results: { email: string; status: "SENT" | "FAILED"; error?: string }[];
  remaining: number;
};

export async function dispatchCampaign(
  workspaceId: string,
  campaignId: string
): Promise<SendCampaignResult> {
  const campaign = await db.campaign.findFirst({
    where: { id: campaignId, workspaceId },
  });
  if (!campaign) throw new NotFoundError("Campaign not found.");
  if (!["DRAFT", "SCHEDULED", "PAUSED", "SENDING"].includes(campaign.status)) {
    throw new Error("This campaign has already been sent or is currently sending.");
  }

  const subscribers = await resolveAudience(
    workspaceId,
    campaign.audience as Audience
  );
  if (subscribers.length === 0) {
    throw new Error("No subscribers match this campaign's audience.");
  }

  await db.campaign.update({
    where: { id: campaignId },
    data: { status: "SENDING" },
  });

  const existingJobs = await db.emailJob.findMany({
    where: {
      campaignId,
      subscriberId: { in: subscribers.map((s) => s.id) },
    },
  });

  return sendSubscribers(workspaceId, campaign, subscribers, existingJobs);
}

export async function continueCampaignSending(
  workspaceId: string,
  campaignId: string,
  subscriberIds?: string[]
): Promise<SendCampaignResult> {
  const campaign = await db.campaign.findFirst({
    where: { id: campaignId, workspaceId },
  });
  if (!campaign) throw new NotFoundError("Campaign not found.");
  if (campaign.status !== "PAUSED" && campaign.status !== "SENDING") {
    throw new Error("Only a paused or stuck sending campaign can be continued.");
  }

  const subscribers = await resolveAudience(
    workspaceId,
    campaign.audience as Audience
  );
  const sentJobSubscribers = await db.emailJob.findMany({
    where: {
      campaignId,
      status: "SENT",
    },
    select: { subscriberId: true },
  });
  const sentIds = new Set(sentJobSubscribers.map((j) => j.subscriberId));
  const remaining = subscribers.filter((s) => !sentIds.has(s.id));

  const targetSubscribers = subscriberIds
    ? remaining.filter((s) => subscriberIds.includes(s.id))
    : remaining;

  if (targetSubscribers.length === 0) {
    await db.campaign.update({
      where: { id: campaignId },
      data: { status: "SENT", sentAt: new Date() },
    });
    return {
      totalRecipients: targetSubscribers.length,
      sentCount: targetSubscribers.length,
      failedCount: 0,
      results: [],
      remaining: 0,
    };
  }

  await db.campaign.update({
    where: { id: campaignId },
    data: { status: "SENDING" },
  });

  const existingJobs = await db.emailJob.findMany({
    where: {
      campaignId,
      subscriberId: { in: targetSubscribers.map((s) => s.id) },
    },
  });

  return sendSubscribers(workspaceId, campaign, targetSubscribers, existingJobs);
}

export async function sendFailedRecipients(
  workspaceId: string,
  campaignId: string
): Promise<SendCampaignResult> {
  const campaign = await db.campaign.findFirst({
    where: { id: campaignId, workspaceId },
  });
  if (!campaign) throw new NotFoundError("Campaign not found.");
  if (!["SENT", "FAILED", "PAUSED"].includes(campaign.status)) {
    throw new Error(
      "Send to failed is only available for sent, failed, or paused campaigns."
    );
  }

  const failedJobs = await db.emailJob.findMany({
    where: {
      campaignId,
      status: "FAILED",
    },
    include: { subscriber: true },
  });

  if (failedJobs.length === 0) {
    throw new Error("No failed recipients to resend.");
  }

  const subscribers = failedJobs
    .map((j) => j.subscriber)
    .filter((s): s is NonNullable<typeof s> => Boolean(s));

  await db.campaign.update({
    where: { id: campaignId },
    data: { status: "SENDING" },
  });

  return sendSubscribers(workspaceId, campaign, subscribers, failedJobs);
}

async function sendSubscribers(
  workspaceId: string,
  campaign: NonNullable<
    Awaited<ReturnType<typeof db.campaign.findFirst>>
  >,
  subscribers: NonNullable<
    Awaited<ReturnType<typeof resolveAudience>>
  >,
  existingJobs?: Awaited<ReturnType<typeof db.emailJob.findMany>>
): Promise<SendCampaignResult> {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const [settings, sentToday] = await Promise.all([
    db.workspaceSettings.findUnique({ where: { workspaceId } }),
    db.emailJob.count({
      where: {
        workspaceId,
        status: "SENT",
        sentAt: { gte: today },
      },
    }),
  ]);

  const provider = getEmailProvider(settings?.resendApiKey || undefined);

  const limit = settings?.dailySendLimit ?? 100;
  if (limit > 0 && sentToday >= limit) {
    throw new Error(`Daily send limit of ${limit} reached. Try again tomorrow.`);
  }

  const remainingCapacity = limit > 0 ? limit - sentToday : subscribers.length;
  const jobsBySubscriber = new Map<
    string,
    NonNullable<typeof existingJobs> extends (infer J)[] ? J : never
  >();
  for (const job of existingJobs ?? []) {
    const current = jobsBySubscriber.get(job.subscriberId);
    if (!current || job.status === "SENT") {
      jobsBySubscriber.set(job.subscriberId, job);
    }
  }

  let sentCount = 0;
  let failedCount = 0;
  const results: SendCampaignResult["results"] = [];

  for (const subscriber of subscribers) {
    if (limit > 0 && sentCount + failedCount >= remainingCapacity) {
      break;
    }

    let job = jobsBySubscriber.get(subscriber.id);
    if (job?.status === "SENT") {
      continue;
    }

    if (!job) {
      job = await db.emailJob.create({
        data: {
          workspaceId,
          subscriberId: subscriber.id,
          campaignId: campaign.id,
          status: "SENT",
          sentAt: new Date(),
        },
      });
      jobsBySubscriber.set(subscriber.id, job);
    }

    const rendered = renderCampaignEmail({
      subject: campaign.subject,
      htmlContent: campaign.htmlContent,
      subscriber: {
        email: subscriber.email,
        customFields: subscriber.customFields as Record<string, unknown>,
      },
      jobId: job.id,
    });

    let succeeded = false;
    let error: string | undefined;

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
        data: {
          status: "SENT",
          sentAt: new Date(),
          providerMessageId: result.providerMessageId ?? null,
        },
      });
      succeeded = true;
      sentCount += 1;
    } catch (cause) {
      error =
        cause instanceof EmailProviderError ? cause.message : "Send failed.";

      await db.emailJob.update({
        where: { id: job.id },
        data: { status: "FAILED", error },
      });
      failedCount += 1;
    }

    results.push({ email: subscriber.email, status: succeeded ? "SENT" : "FAILED", error });
  }

  const processedAll = sentCount + failedCount === subscribers.length;
  const finalStatus = processedAll ? "SENT" : "PAUSED";
  const remaining = processedAll ? 0 : subscribers.length - sentCount - failedCount;

  await db.campaign.update({
    where: { id: campaign.id },
    data: { status: finalStatus, sentAt: finalStatus === "SENT" ? new Date() : undefined },
  });

  await publishEvent(workspaceId, "campaign:completed", {
    campaignId: campaign.id,
    sentCount,
    failedCount,
  });

  return {
    totalRecipients: subscribers.length,
    sentCount,
    failedCount,
    results,
    remaining,
  };
}
