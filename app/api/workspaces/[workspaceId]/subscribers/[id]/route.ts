import { db } from "@/lib/db";
import { ok, fail, withErrorHandling } from "@/lib/api/response";
import { requireWorkspaceAccess } from "@/lib/auth/require-workspace-access";
import { publishEvent } from "@/lib/events/publish";
import { updateSubscriberSchema } from "@/lib/validation/subscriber.schema";

type RouteParams = { params: Promise<{ workspaceId: string; id: string }> };

export const GET = withErrorHandling(async (req: Request, { params }: RouteParams) => {
  const { workspaceId, id } = await params;
  const auth = await requireWorkspaceAccess(req, workspaceId, "subscribers:read");
  if (!auth.ok) return auth.response;

  const subscriber = await db.subscriber.findFirst({
    where: { id, workspaceId },
    include: {
      groups: { include: { group: true } },
      emailJobs: {
        orderBy: { queuedAt: "desc" },
        take: 20,
        include: { campaign: { select: { id: true, subject: true } }, events: true },
      },
    },
  });

  if (!subscriber) return fail(404, "NOT_FOUND", "Subscriber not found.");

  return ok({
    id: subscriber.id,
    email: subscriber.email,
    status: subscriber.status,
    customFields: subscriber.customFields,
    createdAt: subscriber.createdAt,
    unsubscribedAt: subscriber.unsubscribedAt,
    groups: subscriber.groups.map((g) => ({ id: g.group.id, name: g.group.name })),
    activity: subscriber.emailJobs.map((job) => ({
      id: job.id,
      campaign: job.campaign ? { id: job.campaign.id, subject: job.campaign.subject } : null,
      status: job.status,
      sentAt: job.sentAt,
      events: job.events.map((e) => ({ type: e.type, occurredAt: e.occurredAt })),
    })),
  });
});

export const PATCH = withErrorHandling(async (req: Request, { params }: RouteParams) => {
  const { workspaceId, id } = await params;
  const auth = await requireWorkspaceAccess(req, workspaceId, "subscribers:write");
  if (!auth.ok) return auth.response;

  const body = updateSubscriberSchema.parse(await req.json());

  const existing = await db.subscriber.findFirst({ where: { id, workspaceId } });
  if (!existing) return fail(404, "NOT_FOUND", "Subscriber not found.");

  const subscriber = await db.subscriber.update({
    where: { id },
    data: {
      ...body,
      customFields: body.customFields
        ? { ...(existing.customFields as object), ...body.customFields }
        : undefined,
      unsubscribedAt: body.status === "UNSUBSCRIBED" ? new Date() : undefined,
    },
    include: { groups: { include: { group: true } } },
  });

  await publishEvent(workspaceId, "subscriber:updated", { subscriberId: subscriber.id });
  if (body.status === "UNSUBSCRIBED") {
    await publishEvent(workspaceId, "subscriber:unsubscribed", { subscriberId: subscriber.id });
  }

  return ok({
    id: subscriber.id,
    email: subscriber.email,
    status: subscriber.status,
    customFields: subscriber.customFields,
    groups: subscriber.groups.map((g) => ({ id: g.group.id, name: g.group.name })),
  });
});

export const DELETE = withErrorHandling(async (req: Request, { params }: RouteParams) => {
  const { workspaceId, id } = await params;
  const auth = await requireWorkspaceAccess(req, workspaceId, "subscribers:write");
  if (!auth.ok) return auth.response;

  const existing = await db.subscriber.findFirst({ where: { id, workspaceId } });
  if (!existing) return fail(404, "NOT_FOUND", "Subscriber not found.");

  await db.subscriber.delete({ where: { id } });

  return ok({ id });
});
