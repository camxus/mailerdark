import { db } from "@/lib/db";
import { verifyWebhookSignature } from "@/lib/webhooks/verify-signature";
import { publishEvent } from "@/lib/events/publish";

/**
 * Resend → Mailerdark webhook handler.
 *
 * Configure this URL (https://yourapp.com/api/webhooks/email-provider) in
 * the Resend dashboard under Webhooks, subscribed to at least:
 *   email.bounced, email.complained, email.delivered, email.delivery_delayed
 * (email.opened / email.clicked are intentionally NOT required — those are
 * already tracked first-party via the signed pixel/redirect in
 * lib/email/render.ts, which works even for recipients whose mail client
 * doesn't trigger Resend's own engagement tracking.)
 *
 * Set RESEND_WEBHOOK_SECRET to the signing secret shown when you create
 * the webhook endpoint in Resend.
 */

type ResendWebhookPayload = {
  type: string;
  created_at: string;
  data: {
    email_id?: string;
    to?: string[];
    bounce?: { type?: string; message?: string };
  };
};

const eventTypeMap: Record<string, "BOUNCE" | "COMPLAINT"> = {
  "email.bounced": "BOUNCE",
  "email.complained": "COMPLAINT",
};

export async function POST(req: Request) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) {
    console.error("RESEND_WEBHOOK_SECRET is not set — rejecting webhook.");
    return new Response("Webhook not configured", { status: 500 });
  }

  const rawBody = await req.text();
  const verified = verifyWebhookSignature({
    rawBody,
    svixId: req.headers.get("svix-id"),
    svixTimestamp: req.headers.get("svix-timestamp"),
    svixSignature: req.headers.get("svix-signature"),
    secret,
  });

  if (!verified) {
    return new Response("Invalid signature", { status: 401 });
  }

  let payload: ResendWebhookPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const providerMessageId = payload.data?.email_id;
  if (!providerMessageId) {
    // Nothing we can correlate to a job (e.g. a test ping from the dashboard).
    return Response.json({ received: true });
  }

  const job = await db.emailJob.findFirst({ where: { providerMessageId } });
  if (!job) {
    return Response.json({ received: true });
  }

  const eventType = eventTypeMap[payload.type];

  if (eventType) {
    await db.emailEvent.create({
      data: {
        jobId: job.id,
        type: eventType,
        metadata: { bounceType: payload.data.bounce?.type, message: payload.data.bounce?.message },
      },
    });

    if (eventType === "BOUNCE") {
      await db.subscriber.update({ where: { id: job.subscriberId }, data: { status: "BOUNCED" } });
      await db.emailJob.update({ where: { id: job.id }, data: { status: "BOUNCED" } });
      await publishEvent(job.workspaceId, "email:bounced", { subscriberId: job.subscriberId, jobId: job.id });
    }

    if (eventType === "COMPLAINT") {
      // A spam complaint is a stronger signal than a simple unsubscribe —
      // suppress sending immediately rather than waiting for an explicit opt-out.
      await db.subscriber.update({
        where: { id: job.subscriberId },
        data: { status: "UNSUBSCRIBED", unsubscribedAt: new Date() },
      });
      await publishEvent(job.workspaceId, "subscriber:unsubscribed", { subscriberId: job.subscriberId });
    }
  }

  return Response.json({ received: true });
}
