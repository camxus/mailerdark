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
    // Always derive from the original's live filter criteria (not any
    // frozen subscriberIds it might itself carry from an earlier resend) —
    // "new subscribers" only makes sense relative to a re-evaluable
    // definition of the audience, not a one-time snapshot.
    newAudience = {
      groupIds: originalAudience.groupIds,
      fieldFilters: originalAudience.fieldFilters,
      joinedAfter: (original.sentAt ?? original.createdAt).toISOString(),
    };
  } else {
    // duplicate — send to the exact same audience definition again,
    // verbatim, including a frozen list if that's what the original was.
    newAudience = originalAudience;
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
      audience: newAudience,
      status: "DRAFT",
    },
  });

  return ok({ ...clone, recipientCount: recipients.length }, 201);
});
