import { db } from "@/lib/db";
import { ok, fail, withErrorHandling } from "@/lib/api/response";
import { requireWorkspaceAccess } from "@/lib/auth/require-workspace-access";

type RouteParams = { params: Promise<{ workspaceId: string; id: string }> };

function escapeCsv(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export const GET = withErrorHandling(async (req: Request, { params }: RouteParams) => {
  const { workspaceId, id } = await params;
  const auth = await requireWorkspaceAccess(req, workspaceId, "campaigns:read");
  if (!auth.ok) return auth.response;

  const campaign = await db.campaign.findFirst({ where: { id, workspaceId } });
  if (!campaign) return fail(404, "NOT_FOUND", "Campaign not found.");

  const jobs = await db.emailJob.findMany({
    where: { campaignId: id },
    include: {
      subscriber: { select: { email: true } },
      events: {
        where: { type: { in: ["OPEN", "CLICK"] } },
        select: { type: true },
      },
    },
    orderBy: { queuedAt: "desc" },
  });

  const rows = jobs.map((job) => ({
    email: job.subscriber.email,
    status: job.status,
    sentAt: job.sentAt ? job.sentAt.toISOString() : "",
    error: job.error ?? "",
    opens: job.events.filter((e) => e.type === "OPEN").length,
    clicks: job.events.filter((e) => e.type === "CLICK").length,
  }));

  const header = ["Email", "Status", "Sent At", "Error", "Opens", "Clicks"];
  const csv = [
    header.join(","),
    ...rows.map((r) =>
      [
        escapeCsv(r.email),
        escapeCsv(r.status),
        escapeCsv(r.sentAt),
        escapeCsv(r.error),
        r.opens,
        r.clicks,
      ].join(",")
    ),
  ].join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="campaign-${id}-recipients.csv"`,
    },
  });
});
