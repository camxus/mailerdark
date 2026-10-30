import { db } from "@/lib/db";
import { ok, fail, withErrorHandling } from "@/lib/api/response";
import { requireWorkspaceAccess } from "@/lib/auth/require-workspace-access";
import { resendCampaignSchema } from "@/lib/validation/campaign.schema";
import { resolveAudience, type Audience } from "@/lib/audience/resolve";

type RouteParams = { params: Promise<{ workspaceId: string; id: string }> };

// Resend can scan every EmailJob+EmailEvent for a large past send to
// compute the non-opener set — give it real headroom on platforms with a
// hard request timeout.
export const maxDuration = 30;

/**
 * Creates a new DRAFT campaign cloned from a SENT one, scoped to one of
 * three audiences. The clone is returned as a draft (not auto-sent) so the
 * subject/content can be reviewed or tweaked before using the existing
 * Send now / Schedule flow — this deliberately doesn't add a second,
 * parallel "send" code path.
 */
export const POST = withErrorHandling(async (req: Request, { params }: RouteParams) => {
  const { workspaceId, id } = await params;
  const auth = await requireWorkspaceAccess(req, workspaceId, "campaigns:write");
  if (!auth.ok) return auth.response;

  const original = await db.campaign.findFirst({ where: { id, workspaceId } });
  if (!original) return fail(404, "NOT_FOUND", "Campaign not found.");
  if (original.status !== "SENT") {
    return fail(409, "NOT_SENT", "Only a campaign that has finished sending can be resent.");
  }

  const { mode } = resendCampaignSchema.parse(await req.json());
  const originalAudience = original.audience as Audience;

  let newAudience: Audience;
  let subjectPrefix = "";

  if (mode === "non_openers") {
    const sentJobs = await db.emailJob.findMany({
      where: { campaignId: id, status: "SENT" },
      select: { subscriberId: true, events: { where: { type: "OPEN" }, select: { id: true }, take: 1 } },
    });
    const nonOpenerIds = sentJobs.filter((j) => j.events.length === 0).map((j) => j.subscriberId);

    if (nonOpenerIds.length === 0) {
      return fail(422, "NO_NON_OPENERS", "Everyone who received this campaign has already opened it.");
    }

    newAudience = { subscriberIds: nonOpenerIds };
    subjectPrefix = "Re: ";
  } else if (mode === "new_subscribers") {
    newAudience = {
      groupIds: originalAudience.groupIds,
      fieldFilters: originalAudience.fieldFilters,
      joinedAfter: (original.sentAt ?? original.createdAt).toISOString(),
    };
  } else if (mode === "failed") {
    const failedJobs = await db.emailJob.findMany({
      where: { campaignId: id, status: "FAILED" },
      select: { subscriberId: true },
    });
    const failedIds = failedJobs.map((j) => j.subscriberId);

    if (failedIds.length === 0) {
      return fail(422, "NO_FAILED", "No failed recipients for this campaign.");
    }

    newAudience = { subscriberIds: failedIds };
    subjectPrefix = "Retry: ";
  } else if (mode === "non_receivers") {
    const allRecipients = await resolveAudience(workspaceId, originalAudience);
    const sentJobSubscribers = await db.emailJob.findMany({
      where: { campaignId: id, status: "SENT" },
      select: { subscriberId: true },
    });
    const sentIds = new Set(sentJobSubscribers.map((j) => j.subscriberId));
    const nonReceiverIds = allRecipients.filter((s) => !sentIds.has(s.id)).map((s) => s.id);

    if (nonReceiverIds.length === 0) {
      return fail(422, "ALL_RECEIVED", "Everyone in the audience has already received this campaign.");
    }

    newAudience = { subscriberIds: nonReceiverIds };
    subjectPrefix = "Retry: ";
  } else {
    newAudience = originalAudience;
    subjectPrefix = "Re: ";
  }

  const recipients = await resolveAudience(workspaceId, newAudience);
  if (recipients.length === 0) {
    const reason =
      mode === "new_subscribers"
        ? "No one has joined this audience since the original send."
        : "No subscribers currently match this audience.";
    return fail(422, "EMPTY_AUDIENCE", reason);
  }

  const clone = await db.campaign.create({
    data: {
      workspaceId,
      subject: `${subjectPrefix}${original.subject}`,
      fromName: original.fromName,
      fromEmail: original.fromEmail,
      replyTo: original.replyTo,
      htmlContent: original.htmlContent,
      // @ts-expect-error Prisma Json type is incompatible with application Audience type
      audience: newAudience,
      status: "DRAFT",
    },
  });

  return ok({ ...clone, recipientCount: recipients.length }, 201);
});
