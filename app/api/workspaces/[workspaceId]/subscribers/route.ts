import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { ok, fail, withErrorHandling } from "@/lib/api/response";
import { requireWorkspaceAccess } from "@/lib/auth/require-workspace-access";
import { publishEvent } from "@/lib/events/publish";
import {
  createSubscriberSchema,
  listSubscribersQuerySchema,
} from "@/lib/validation/subscriber.schema";

type RouteParams = { params: Promise<{ workspaceId: string }> };

export const GET = withErrorHandling(async (req: Request, { params }: RouteParams) => {
  const { workspaceId } = await params;
  const auth = await requireWorkspaceAccess(req, workspaceId, "subscribers:read");
  if (!auth.ok) return auth.response;

  const url = new URL(req.url);
  const query = listSubscribersQuerySchema.parse({
    groupId: url.searchParams.get("groupId") ?? undefined,
    status: url.searchParams.get("status") ?? undefined,
    search: url.searchParams.get("search") ?? undefined,
    cursor: url.searchParams.get("cursor") ?? undefined,
    limit: url.searchParams.get("limit") ?? undefined,
  });

  const where: Prisma.SubscriberWhereInput = {
    workspaceId,
    ...(query.status ? { status: query.status } : {}),
    ...(query.groupId ? { groups: { some: { groupId: query.groupId } } } : {}),
    ...(query.search
      ? { email: { contains: query.search, mode: "insensitive" as const } }
      : {}),
  };

  const subscribers = await db.subscriber.findMany({
    where,
    take: query.limit + 1,
    ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
    orderBy: { createdAt: "desc" },
    include: { groups: { include: { group: true } } },
  });

  const hasMore = subscribers.length > query.limit;
  const page = hasMore ? subscribers.slice(0, query.limit) : subscribers;

  return ok({
    subscribers: page.map(serializeSubscriber),
    nextCursor: hasMore ? page[page.length - 1].id : null,
  });
});

export const POST = withErrorHandling(async (req: Request, { params }: RouteParams) => {
  const { workspaceId } = await params;
  const auth = await requireWorkspaceAccess(req, workspaceId, "subscribers:write");
  if (!auth.ok) return auth.response;

  const body = createSubscriberSchema.parse(await req.json());

  const existing = await db.subscriber.findUnique({
    where: { workspaceId_email: { workspaceId, email: body.email } },
  });
  if (existing) {
    return fail(409, "SUBSCRIBER_EXISTS", "A subscriber with this email already exists.");
  }

  const created = await db.subscriber.create({
    data: {
      workspaceId,
      email: body.email,
      status: body.status ?? "SUBSCRIBED",
      // @ts-expect-error Prisma Json type is incompatible with Record<string, unknown>
      customFields: body.customFields ?? {},
      groups: body.groupIds
        ? { create: body.groupIds.map((groupId) => ({ groupId })) }
        : undefined,
    },
  });

  const subscriber = await db.subscriber.findFirst({
    where: { id: created.id },
    include: { groups: { include: { group: true } } },
  });

  await publishEvent(workspaceId, "subscriber:created", { subscriberId: subscriber!.id });

  return ok(serializeSubscriber(subscriber!), 201);
});

function serializeSubscriber(
  subscriber: Prisma.SubscriberGetPayload<{ include: { groups: { include: { group: true } } } }>
) {
  return {
    id: subscriber.id,
    email: subscriber.email,
    status: subscriber.status,
    customFields: subscriber.customFields,
    createdAt: subscriber.createdAt,
    groups: subscriber.groups.map((g) => ({ id: g.group.id, name: g.group.name })),
  };
}
