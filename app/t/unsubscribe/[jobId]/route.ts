import { db } from "@/lib/db";
import { verifyJobSignature } from "@/lib/tracking/sign";
import { publishEvent } from "@/lib/events/publish";

function htmlPage(message: string) {
  return new Response(
    `<!doctype html><html><head><meta charset="utf-8"><title>Unsubscribed</title></head>
     <body style="font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#f6f5f1;color:#14171a;">
       <p style="max-width:380px;text-align:center;">${message}</p>
     </body></html>`,
    { headers: { "Content-Type": "text/html; charset=utf-8" } }
  );
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  const signature = new URL(req.url).searchParams.get("sig");

  if (!signature || !verifyJobSignature(jobId, signature)) {
    return htmlPage("This unsubscribe link is invalid or has expired.");
  }

  const job = await db.emailJob.findUnique({ where: { id: jobId }, include: { subscriber: true } });
  if (!job) {
    return htmlPage("This unsubscribe link is invalid or has expired.");
  }

  await db.subscriber.update({
    where: { id: job.subscriberId },
    data: { status: "UNSUBSCRIBED", unsubscribedAt: new Date() },
  });

  await db.emailEvent.create({ data: { jobId, type: "UNSUBSCRIBE", metadata: {} } });
  await publishEvent(job.workspaceId, "subscriber:unsubscribed", { subscriberId: job.subscriberId });

  return htmlPage(`You've been unsubscribed and won't receive further emails at ${job.subscriber.email}.`);
}
