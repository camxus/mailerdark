import { db } from "@/lib/db";
import { ok, fail, withErrorHandling } from "@/lib/api/response";
import { requireWorkspaceAccess } from "@/lib/auth/require-workspace-access";
import { createGroupSchema } from "@/lib/validation/group.schema";

type RouteParams = { params: Promise<{ workspaceId: string }> };

export const GET = withErrorHandling(async (req: Request, { params }: RouteParams) => {
  const { workspaceId } = await params;
  const auth = await requireWorkspaceAccess(req, workspaceId, "subscribers:read");
  if (!auth.ok) return auth.response;

  const groups = await db.group.findMany({
    where: { workspaceId },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { subscribers: true } } },
  });

  return ok(
    groups.map((g) => ({
      id: g.id,
      name: g.name,
      description: g.description,
      subscriberCount: g._count.subscribers,
      createdAt: g.createdAt,
    }))
  );
});

export const POST = withErrorHandling(async (req: Request, { params }: RouteParams) => {
  const { workspaceId } = await params;
  const auth = await requireWorkspaceAccess(req, workspaceId, "subscribers:write");
  if (!auth.ok) return auth.response;

  const body = createGroupSchema.parse(await req.json());

  const existing = await db.group.findUnique({
    where: { workspaceId_name: { workspaceId, name: body.name } },
  });
  if (existing) return fail(409, "GROUP_EXISTS", "A group with this name already exists.");

  const group = await db.group.create({ data: { workspaceId, ...body } });

  return ok({ id: group.id, name: group.name, description: group.description, subscriberCount: 0 }, 201);
});
