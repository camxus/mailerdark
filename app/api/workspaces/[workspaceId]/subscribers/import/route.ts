import { db } from "@/lib/db";
import { ok, withErrorHandling } from "@/lib/api/response";
import { requireWorkspaceAccess } from "@/lib/auth/require-workspace-access";
import { publishEvent } from "@/lib/events/publish";
import { importSubscribersSchema } from "@/lib/validation/subscriber.schema";

type RouteParams = { params: Promise<{ workspaceId: string }> };

/**
 * Synchronous import for now — fine up to ~5,000 rows (enforced by the
 * schema). If/when CSV uploads need to support larger files, swap this for
 * an enqueued job and have the client poll a `/import-jobs/{id}` endpoint
 * instead of waiting on the request.
 */
export const POST = withErrorHandling(async (req: Request, { params }: RouteParams) => {
  const { workspaceId } = await params;
  const auth = await requireWorkspaceAccess(req, workspaceId, "subscribers:write");
  if (!auth.ok) return auth.response;

  const body = importSubscribersSchema.parse(await req.json());

  let created = 0;
  let skipped = 0;

  for (const row of body.subscribers) {
    const existing = await db.subscriber.findUnique({
      where: { workspaceId_email: { workspaceId, email: row.email } },
    });

    if (existing) {
      skipped += 1;
      continue;
    }

    await db.subscriber.create({
      data: {
        workspaceId,
        email: row.email,
        customFields: row.customFields ?? {},
        groups: body.groupIds
          ? { create: body.groupIds.map((groupId) => ({ groupId })) }
          : undefined,
      },
    });
    created += 1;
  }

  await publishEvent(workspaceId, "subscriber:created", { importedCount: created });

  return ok({ created, skipped, total: body.subscribers.length });
});
