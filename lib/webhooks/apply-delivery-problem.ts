import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { publishEvent } from "@/lib/events/publish";

export type DeliveryProblem = {
  providerMessageId: string;
  type: "BOUNCE" | "COMPLAINT" | "FAILED";
  /**
   * Bounces only. Hard (permanent) bounces suppress the subscriber; soft/transient
   * ones are recorded but the subscriber stays SUBSCRIBED. Defaults to true, which
   * is the behaviour the Resend webhook has always had.
   */
  hard?: boolean;
  metadata?: Prisma.InputJsonObject;
  error?: string;
};

/**
 * Provider-agnostic handling of bounces, complaints and rejected sends. Shared by
 * /api/webhooks/email-provider (Resend) and /api/webhooks/ses-sns (SES via SNS).
 * Returns false if the message id doesn't map to one of our EmailJobs.
 */
export async function applyDeliveryProblem(input: DeliveryProblem): Promise<boolean> {
  const job = await db.emailJob.findFirst({ where: { providerMessageId: input.providerMessageId } });
  if (!job) return false;

  if (input.type === "FAILED") {
    await db.emailJob.update({
      where: { id: job.id },
      data: { status: "FAILED", error: input.error ?? "Rejected by provider" },
    });
    return true;
  }

  await db.emailEvent.create({
    data: { jobId: job.id, type: input.type, metadata: input.metadata ?? {} },
  });

  if (input.type === "BOUNCE" && input.hard !== false) {
    await db.subscriber.update({ where: { id: job.subscriberId }, data: { status: "BOUNCED" } });
    await db.emailJob.update({ where: { id: job.id }, data: { status: "BOUNCED" } });
    await publishEvent(job.workspaceId, "email:bounced", { subscriberId: job.subscriberId, jobId: job.id });
  }

  if (input.type === "COMPLAINT") {
    // A spam complaint is a stronger signal than a simple unsubscribe —
    // suppress sending immediately rather than waiting for an explicit opt-out.
    await db.subscriber.update({
      where: { id: job.subscriberId },
      data: { status: "UNSUBSCRIBED", unsubscribedAt: new Date() },
    });
    await publishEvent(job.workspaceId, "subscriber:unsubscribed", { subscriberId: job.subscriberId });
  }

  return true;
}
