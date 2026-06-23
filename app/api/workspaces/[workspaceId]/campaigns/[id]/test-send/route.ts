import { db } from "@/lib/db";
import { ok, fail, withErrorHandling } from "@/lib/api/response";
import { requireWorkspaceAccess } from "@/lib/auth/require-workspace-access";
import { testSendSchema } from "@/lib/validation/campaign.schema";
import { renderCampaignEmail } from "@/lib/email/render";
import { getEmailProvider } from "@/lib/email/get-provider";
import { EmailProviderError } from "@/lib/email/provider";

export const maxDuration = 30;

type RouteParams = { params: Promise<{ workspaceId: string; id: string }> };

export const POST = withErrorHandling(async (req: Request, { params }: RouteParams) => {
  const { workspaceId, id } = await params;
  const auth = await requireWorkspaceAccess(req, workspaceId, "campaigns:write");
  if (!auth.ok) return auth.response;

  const campaign = await db.campaign.findFirst({ where: { id, workspaceId } });
  if (!campaign) return fail(404, "NOT_FOUND", "Campaign not found.");

  const body = testSendSchema.parse(await req.json());
  const provider = getEmailProvider();

  const results: { email: string; ok: boolean; error?: string }[] = [];

  for (const email of body.emails) {
    // If the test address happens to be a real subscriber, use their real
    // field values so the test reflects what they'd actually receive.
    const subscriber = await db.subscriber.findUnique({
      where: { workspaceId_email: { workspaceId, email } },
    });

    const rendered = renderCampaignEmail({
      subject: `[TEST] ${campaign.subject}`,
      htmlContent: campaign.htmlContent,
      subscriber: {
        email,
        customFields: (subscriber?.customFields as Record<string, unknown>) ?? {},
      },
    });

    try {
      await provider.send({
        to: email,
        from: `${campaign.fromName} <${campaign.fromEmail}>`,
        replyTo: campaign.replyTo ?? undefined,
        subject: rendered.subject,
        html: rendered.html,
      });
      results.push({ email, ok: true });
    } catch (error) {
      const message = error instanceof EmailProviderError ? error.message : "Send failed.";
      results.push({ email, ok: false, error: message });
    }
  }

  return ok({ results });
});
