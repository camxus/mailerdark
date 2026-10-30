import { db } from "@/lib/db";
import { verifyJobSignature } from "@/lib/tracking/sign";
import { publishEvent } from "@/lib/events/publish";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  const url = new URL(req.url);
  const signature = url.searchParams.get("sig");
  const destination = url.searchParams.get("url");

  // No valid signature or destination — nothing safe to redirect to.
  if (!signature || !verifyJobSignature(jobId, signature) || !destination) {
    return new Response("Invalid or expired link.", { status: 400 });
  }

  // Only ever redirect to http(s) — guards against the `url` param being
  // abused as an open redirect to a javascript:/data: URI or similar.
  let target: URL;
  try {
    target = new URL(destination);
    if (target.protocol !== "http:" && target.protocol !== "https:") {
      throw new Error("Unsupported protocol");
    }
  } catch {
    return new Response("Invalid destination URL.", { status: 400 });
  }

  const job = await db.emailJob.findUnique({ where: { id: jobId } });
  if (job) {
    await db.emailEvent.create({
      data: {
        jobId,
        type: "CLICK",
        metadata: { url: target.toString(), userAgent: req.headers.get("user-agent") ?? undefined },
      },
    });
    await publishEvent(job.workspaceId, "email:clicked", { subscriberId: job.subscriberId, jobId });
  }

  return Response.redirect(target.toString(), 302);
}
