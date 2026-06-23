import { db } from "@/lib/db";
import { ok, withErrorHandling } from "@/lib/api/response";
import { requireWorkspaceAccess } from "@/lib/auth/require-workspace-access";
import { createApiKeySchema } from "@/lib/validation/api-key.schema";
import { generateApiKey } from "@/lib/api-keys/generate";

type RouteParams = { params: Promise<{ workspaceId: string }> };

export const GET = withErrorHandling(async (req: Request, { params }: RouteParams) => {
  const { workspaceId } = await params;
  const auth = await requireWorkspaceAccess(req, workspaceId, "settings:write");
  if (!auth.ok) return auth.response;

  const keys = await db.apiKey.findMany({
    where: { workspaceId },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, scopes: true, createdAt: true, lastUsedAt: true },
  });

  return ok(keys);
});

export const POST = withErrorHandling(async (req: Request, { params }: RouteParams) => {
  const { workspaceId } = await params;
  const auth = await requireWorkspaceAccess(req, workspaceId, "settings:write");
  if (!auth.ok) return auth.response;

  const body = createApiKeySchema.parse(await req.json());
  const { rawKey, hashedKey } = generateApiKey();

  const key = await db.apiKey.create({
    data: { workspaceId, name: body.name, scopes: body.scopes, hashedKey },
  });

  // rawKey is returned exactly once — it is not retrievable after this response.
  return ok({ id: key.id, name: key.name, scopes: key.scopes, createdAt: key.createdAt, rawKey }, 201);
});
