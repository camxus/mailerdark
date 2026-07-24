import { db } from "@/lib/db";
import { ok, withErrorHandling } from "@/lib/api/response";
import { requireWorkspaceAccess } from "@/lib/auth/require-workspace-access";
import { updateSendingSettingsSchema } from "@/lib/validation/settings.schema";

type RouteParams = { params: Promise<{ workspaceId: string }> };

function maskKey(key: string | null | undefined): string {
  if (!key || key.length <= 4) return key ? "••••" : "";
  return `••••${key.slice(-4)}`;
}

export const GET = withErrorHandling(async (req: Request, { params }: RouteParams) => {
  const { workspaceId } = await params;
  const auth = await requireWorkspaceAccess(req, workspaceId, "settings:write");
  if (!auth.ok) return auth.response;

  const settings = await db.workspaceSettings.upsert({
    where: { workspaceId },
    create: { workspaceId },
    update: {},
  });

  return ok({
    resendApiKeyMasked: maskKey(settings.resendApiKey),
    resendApiKeySet: Boolean(settings.resendApiKey),
  });
});

export const PATCH = withErrorHandling(async (req: Request, { params }: RouteParams) => {
  const { workspaceId } = await params;
  const auth = await requireWorkspaceAccess(req, workspaceId, "settings:write");
  if (!auth.ok) return auth.response;

  const body = updateSendingSettingsSchema.parse(await req.json());

  const data: Record<string, unknown> = {};
  if (body.resendApiKey !== undefined) {
    data.resendApiKey = body.resendApiKey || null;
  }

  const settings = await db.workspaceSettings.upsert({
    where: { workspaceId },
    create: { workspaceId, ...data },
    update: data,
  });

  return ok({
    resendApiKeyMasked: maskKey(settings.resendApiKey),
    resendApiKeySet: Boolean(settings.resendApiKey),
  });
});
