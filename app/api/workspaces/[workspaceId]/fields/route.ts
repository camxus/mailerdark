import { db } from "@/lib/db";
import { ok, fail, withErrorHandling } from "@/lib/api/response";
import { requireWorkspaceAccess } from "@/lib/auth/require-workspace-access";
import { createFieldSchema } from "@/lib/validation/field.schema";

type RouteParams = { params: Promise<{ workspaceId: string }> };

export const GET = withErrorHandling(async (req: Request, { params }: RouteParams) => {
  const { workspaceId } = await params;
  const auth = await requireWorkspaceAccess(req, workspaceId, "subscribers:read");
  if (!auth.ok) return auth.response;

  const fields = await db.field.findMany({ where: { workspaceId }, orderBy: { createdAt: "asc" } });

  return ok(fields);
});

export const POST = withErrorHandling(async (req: Request, { params }: RouteParams) => {
  const { workspaceId } = await params;
  const auth = await requireWorkspaceAccess(req, workspaceId, "subscribers:write");
  if (!auth.ok) return auth.response;

  const body = createFieldSchema.parse(await req.json());

  const existing = await db.field.findUnique({
    where: { workspaceId_key: { workspaceId, key: body.key } },
  });
  if (existing) return fail(409, "FIELD_EXISTS", "A field with this key already exists.");

  const field = await db.field.create({ data: { workspaceId, ...body } });

  return ok(field, 201);
});
