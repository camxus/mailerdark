import { verifySnsMessage, isSnsUrl, type SnsMessage } from "@/lib/webhooks/verify-sns";
import { applyDeliveryProblem } from "@/lib/webhooks/apply-delivery-problem";

export const runtime = "nodejs";

/**
 * AWS SES → SNS → Mailerdark webhook handler (EMAIL_PROVIDER=ses).
 *
 * Flow: SES configuration set → SNS topic → HTTPS subscription to this URL
 * (https://yourapp.com/api/webhooks/ses-sns). See infra/aws.
 *
 * Opens and clicks are intentionally NOT routed here — they're tracked first-party
 * via the signed pixel/redirect in lib/email/render.ts, same as with Resend.
 *
 * Set SNS_TOPIC_ARN to the topic's ARN; messages from any other topic are rejected.
 */

type SesEvent = {
  eventType: string;
  mail?: { messageId?: string };
  bounce?: {
    bounceType?: string;
    bounceSubType?: string;
    bouncedRecipients?: { emailAddress?: string; diagnosticCode?: string }[];
  };
  complaint?: { complaintFeedbackType?: string };
  reject?: { reason?: string };
  failure?: { errorMessage?: string };
};

export async function POST(req: Request) {
  const expectedTopic = process.env.SNS_TOPIC_ARN;
  if (!expectedTopic) {
    console.error("SNS_TOPIC_ARN is not set — rejecting webhook.");
    return new Response("Webhook not configured", { status: 500 });
  }

  // SNS sends JSON with Content-Type: text/plain, so always read the raw text.
  let message: SnsMessage;
  try {
    message = JSON.parse(await req.text());
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  if (message.TopicArn !== expectedTopic) return new Response("Unknown topic", { status: 403 });
  if (!(await verifySnsMessage(message))) return new Response("Invalid signature", { status: 401 });

  if (message.Type === "SubscriptionConfirmation") {
    if (!isSnsUrl(message.SubscribeURL)) return new Response("Bad SubscribeURL", { status: 400 });
    await fetch(message.SubscribeURL!);
    return Response.json({ confirmed: true });
  }

  if (message.Type !== "Notification") return Response.json({ received: true });

  let event: SesEvent;
  try {
    event = JSON.parse(message.Message);
  } catch {
    return Response.json({ received: true }); // not an SES event (e.g. console test message)
  }

  const providerMessageId = event.mail?.messageId;
  if (!providerMessageId) return Response.json({ received: true });

  switch (event.eventType) {
    case "Bounce":
      await applyDeliveryProblem({
        providerMessageId,
        type: "BOUNCE",
        hard: event.bounce?.bounceType === "Permanent",
        metadata: {
          bounceType: event.bounce?.bounceType,
          bounceSubType: event.bounce?.bounceSubType,
          message: event.bounce?.bouncedRecipients?.[0]?.diagnosticCode,
        },
      });
      break;
    case "Complaint":
      await applyDeliveryProblem({
        providerMessageId,
        type: "COMPLAINT",
        metadata: { feedbackType: event.complaint?.complaintFeedbackType },
      });
      break;
    case "Reject":
      await applyDeliveryProblem({ providerMessageId, type: "FAILED", error: event.reject?.reason });
      break;
    case "Rendering Failure":
      await applyDeliveryProblem({ providerMessageId, type: "FAILED", error: event.failure?.errorMessage });
      break;
    default:
      break; // Delivery / DeliveryDelay etc. aren't acted on
  }

  // Non-2xx makes SNS retry, so throwing above (DB down, etc.) is the desired behaviour.
  return Response.json({ received: true });
}
