import { db } from "@/lib/db";
import { ok, withErrorHandling } from "@/lib/api/response";
import { requireWorkspaceAccess } from "@/lib/auth/require-workspace-access";
import { updateAiSettingsSchema } from "@/lib/validation/settings.schema";

type RouteParams = { params: Promise<{ workspaceId: string }> };

/** Masks all but the last 4 chars of an API key so the UI can show the user their key is set without revealing it. */
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

  // Never return the raw key — the UI only needs to know if it's set and show the last 4 chars.
  return ok({
    aiMode: settings.aiMode,
    openRouterKeyMasked: maskKey(settings.openRouterKey),
    openRouterKeySet: Boolean(settings.openRouterKey),
    customEndpoint: settings.customEndpoint,
    customKeyMasked: maskKey(settings.customKey),
    customKeySet: Boolean(settings.customKey),
    selectedModel: settings.selectedModel,
  });
});

export const PATCH = withErrorHandling(async (req: Request, { params }: RouteParams) => {
  const { workspaceId } = await params;
  const auth = await requireWorkspaceAccess(req, workspaceId, "settings:write");
  if (!auth.ok) return auth.response;

  const body = updateAiSettingsSchema.parse(await req.json());

  // A blank string on the key fields means "clear it" — the schema allows
  // empty strings for that purpose. We store null rather than "".
  const data: Record<string, unknown> = {};
  if (body.aiMode !== undefined) data.aiMode = body.aiMode;
  if (body.selectedModel !== undefined) data.selectedModel = body.selectedModel;
  if (body.customEndpoint !== undefined) data.customEndpoint = body.customEndpoint || null;
  if (body.openRouterKey !== undefined) data.openRouterKey = body.openRouterKey || null;
  if (body.customKey !== undefined) data.customKey = body.customKey || null;

  const settings = await db.workspaceSettings.upsert({
    where: { workspaceId },
    create: { workspaceId, ...data },
    update: data,
  });

  return ok({
    aiMode: settings.aiMode,
    openRouterKeyMasked: maskKey(settings.openRouterKey),
    openRouterKeySet: Boolean(settings.openRouterKey),
    customEndpoint: settings.customEndpoint,
    customKeyMasked: maskKey(settings.customKey),
    customKeySet: Boolean(settings.customKey),
    selectedModel: settings.selectedModel,
  });
});
