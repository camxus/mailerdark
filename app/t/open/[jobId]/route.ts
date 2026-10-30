import { db } from "@/lib/db";
import { verifyJobSignature } from "@/lib/tracking/sign";

// A 1x1 transparent PNG, served as a static byte buffer.
const TRANSPARENT_PIXEL = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64"
);

export async function GET(
  req: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  const signature = new URL(req.url).searchParams.get("sig");

  if (signature && verifyJobSignature(jobId, signature)) {
    // Fire-and-forget from the response's perspective — the pixel must
    // render instantly regardless of whether the write succeeds.
    db.emailJob
      .findUnique({ where: { id: jobId } })
      .then((job) => {
        if (!job) return;
        return db.emailEvent.create({
          data: {
            jobId,
            type: "OPEN",
            metadata: { userAgent: req.headers.get("user-agent") ?? undefined },
          },
        });
      })
      .catch((error) => console.error("Failed to record open event:", error));
  }

  return new Response(TRANSPARENT_PIXEL, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}
