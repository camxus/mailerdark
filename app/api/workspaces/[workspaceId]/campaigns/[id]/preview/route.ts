import { db } from "@/lib/db";
import { ok, fail, withErrorHandling } from "@/lib/api/response";
import { requireWorkspaceAccess } from "@/lib/auth/require-workspace-access";
import { previewSchema } from "@/lib/validation/campaign.schema";
import { renderCampaignEmail } from "@/lib/email/render";
import { resolveAudience } from "@/lib/audience/resolve";

type RouteParams = { params: Promise<{ workspaceId: string; id: string }> };

export const POST = withErrorHandling(async (req: Request, { params }: RouteParams) => {
  const { workspaceId, id } = await params;
  const auth = await requireWorkspaceAccess(req, workspaceId, "campaigns:read");
  if (!auth.ok) return auth.response;

  const campaign = await db.campaign.findFirst({ where: { id, workspaceId } });
  if (!campaign) return fail(404, "NOT_FOUND", "Campaign not found.");

  const body = previewSchema.parse(await req.json().catch(() => ({})));

  let subscriber: { email: string; customFields: Record<string, unknown> } | null = null;
  let usingSampleData = false;

  if (body.subscriberId) {
    const found = await db.subscriber.findFirst({
      where: { id: body.subscriberId, workspaceId },
    });
    if (!found) return fail(404, "NOT_FOUND", "Subscriber not found.");
    subscriber = { email: found.email, customFields: found.customFields as Record<string, unknown> };
  } else {
    const audience = campaign.audience as { groupIds?: string[]; fieldFilters?: never[] };
    const [match] = await resolveAudience(workspaceId, audience).catch(() => []);
    if (match) {
      subscriber = { email: match.email, customFields: match.customFields as Record<string, unknown> };
    }
  }

  if (!subscriber) {
    // No matching subscriber yet — render against sample values for every
    // defined field so the template can still be reviewed before sending.
    const fields = await db.field.findMany({ where: { workspaceId } });
    subscriber = {
      email: "jane@example.com",
      customFields: Object.fromEntries(fields.map((f) => [f.key, sampleValueFor(f.type)])),
    };
    usingSampleData = true;
  }

  const rendered = renderCampaignEmail({
    subject: campaign.subject,
    htmlContent: campaign.htmlContent,
    subscriber,
  });

  return ok({ ...rendered, usingSampleData, previewedAs: subscriber.email });
});

function sampleValueFor(type: string) {
  switch (type) {
    case "NUMBER":
      return 42;
    case "DATE":
      return new Date().toISOString().slice(0, 10);
    case "BOOLEAN":
      return true;
    default:
      return "Sample value";
  }
}
