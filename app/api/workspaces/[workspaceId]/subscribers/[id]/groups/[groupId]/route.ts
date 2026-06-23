import { db } from "@/lib/db";
import { ok, fail, withErrorHandling } from "@/lib/api/response";
import { requireWorkspaceAccess } from "@/lib/auth/require-workspace-access";
import { publishEvent } from "@/lib/events/publish";

type RouteParams = { params: Promise<{ workspaceId: string; id: string; groupId: string }> };

export const POST = withErrorHandling(async (req: Request, { params }: RouteParams) => {
  const { workspaceId, id, groupId } = await params;
  const auth = await requireWorkspaceAccess(req, workspaceId, "subscribers:write");
  if (!auth.ok) return auth.response;

  const [subscriber, group] = await Promise.all([
    db.subscriber.findFirst({ where: { id, workspaceId } }),
    db.group.findFirst({ where: { id: groupId, workspaceId } }),
  ]);
  if (!subscriber) return fail(404, "NOT_FOUND", "Subscriber not found.");
  if (!group) return fail(404, "NOT_FOUND", "Group not found.");

  await db.subscriberGroup.upsert({
    where: { subscriberId_groupId: { subscriberId: id, groupId } },
    create: { subscriberId: id, groupId },
    update: {},
  });

  await publishEvent(workspaceId, "subscriber:group-added", { subscriberId: id, groupId });

  return ok({ subscriberId: id, groupId });
});

export const DELETE = withErrorHandling(async (req: Request, { params }: RouteParams) => {
  const { workspaceId, id, groupId } = await params;
  const auth = await requireWorkspaceAccess(req, workspaceId, "subscribers:write");
  if (!auth.ok) return auth.response;

  await db.subscriberGroup.deleteMany({
    where: { subscriberId: id, groupId, subscriber: { workspaceId } },
  });

  await publishEvent(workspaceId, "subscriber:group-removed", { subscriberId: id, groupId });

  return ok({ subscriberId: id, groupId });
});
