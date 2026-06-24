import { db } from "@/lib/db";
import { ok, withErrorHandling } from "@/lib/api/response";
import { requireWorkspaceAccess } from "@/lib/auth/require-workspace-access";
import { updateGeneralSettingsSchema } from "@/lib/validation/settings.schema";

type RouteParams = { params: Promise<{ workspaceId: string }> };

async function getOrCreateSettings(workspaceId: string) {
  return db.workspaceSettings.upsert({
    where: { workspaceId },
    create: { workspaceId },
    update: {},
  });
}

export const GET = withErrorHandling(async (req: Request, { params }: RouteParams) => {
  const { workspaceId } = await params;
  const auth = await requireWorkspaceAccess(req, workspaceId, "settings:write");
  if (!auth.ok) return auth.response;

  const [workspace, settings] = await Promise.all([
    db.workspace.findUnique({ where: { id: workspaceId }, select: { name: true, slug: true } }),
    getOrCreateSettings(workspaceId),
  ]);

  return ok({
    name: workspace?.name,
    slug: workspace?.slug,
    fromName: settings.fromName,
    fromEmail: settings.fromEmail,
    timezone: settings.timezone,
  });
});

export const PATCH = withErrorHandling(async (req: Request, { params }: RouteParams) => {
  const { workspaceId } = await params;
  const auth = await requireWorkspaceAccess(req, workspaceId, "settings:write");
  if (!auth.ok) return auth.response;

  const body = updateGeneralSettingsSchema.parse(await req.json());
  const { name, ...settingsFields } = body;

  const [, settings] = await Promise.all([
    name ? db.workspace.update({ where: { id: workspaceId }, data: { name } }) : Promise.resolve(),
    db.workspaceSettings.upsert({
      where: { workspaceId },
      create: { workspaceId, ...settingsFields },
      update: settingsFields,
    }),
  ]);

  return ok(settings);
});
