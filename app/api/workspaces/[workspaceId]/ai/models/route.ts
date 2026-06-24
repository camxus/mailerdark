import { db } from "@/lib/db";
import { ok, fail, withErrorHandling } from "@/lib/api/response";
import { requireWorkspaceAccess } from "@/lib/auth/require-workspace-access";

type RouteParams = { params: Promise<{ workspaceId: string }> };

export const maxDuration = 15;

export const GET = withErrorHandling(async (req: Request, { params }: RouteParams) => {
  const { workspaceId } = await params;
  const auth = await requireWorkspaceAccess(req, workspaceId, "settings:write");
  if (!auth.ok) return auth.response;

  const settings = await db.workspaceSettings.findUnique({ where: { workspaceId } });
  const isCustom = settings?.aiMode === "custom";
  const apiKey = isCustom ? settings?.customKey : settings?.openRouterKey;

  if (!apiKey) {
    return fail(422, "NO_AI_KEY", "No AI API key configured. Go to Settings → AI & Integrations.");
  }

  if (isCustom) {
    // Custom endpoints don't have a standard model-listing API. Return a
    // synthetic entry so the model picker shows "Custom model" rather than
    // an empty list.
    return ok([{ id: settings?.selectedModel ?? "custom", name: "Custom model", context_length: 128000 }]);
  }

  const res = await fetch("https://openrouter.ai/api/v1/models", {
    headers: { Authorization: `Bearer ${apiKey}` },
    next: { revalidate: 300 }, // cache for 5 minutes on the edge
  });

  if (!res.ok) {
    return fail(502, "OPENROUTER_ERROR", `OpenRouter returned ${res.status}`);
  }

  const data = await res.json();
  // Sort by cheapest prompt price first, filter to chat models only
  const models = ((data.data ?? []) as { id: string; name: string; context_length: number; pricing: { prompt: string } }[])
    .filter((m) => m.id && m.name)
    .sort((a, b) => Number(a.pricing?.prompt ?? 0) - Number(b.pricing?.prompt ?? 0));

  return ok(models);
});
