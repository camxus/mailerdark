import { db } from "@/lib/db";
import { fail, withErrorHandling } from "@/lib/api/response";
import { requireWorkspaceAccess } from "@/lib/auth/require-workspace-access";
import { z } from "zod";

export const maxDuration = 60;

const generateSchema = z.object({
  prompt: z.string().min(1).max(2000),
  currentHtml: z.string().max(50000).optional(),
  model: z.string().optional(),
});

const SYSTEM_PROMPT = `You are an expert HTML email designer and copywriter. When asked to write or edit an email:
- Always return ONLY valid HTML email code, nothing else. No markdown code fences, no explanations before or after.
- Use inline CSS only (no <style> blocks, no external stylesheets) for maximum email client compatibility.
- Use table-based layouts for Outlook compatibility.
- Keep designs clean, readable, and mobile-friendly.
- Support merge fields in {{double_braces}} format for personalisation.
- The base palette is: background #f6f5f1, accent teal #0e7c7b, text #14171a, muted #4b5358.
- If given existing HTML to edit, preserve the overall structure unless asked to change it.
- Always include an unsubscribe link placeholder: <a href="{{unsubscribe_url}}">Unsubscribe</a>`;

type RouteParams = { params: Promise<{ workspaceId: string }> };

export const POST = withErrorHandling(async (req: Request, { params }: RouteParams) => {
  const { workspaceId } = await params;
  const auth = await requireWorkspaceAccess(req, workspaceId, "campaigns:write");
  if (!auth.ok) return auth.response;

  const body = generateSchema.parse(await req.json());
  const settings = await db.workspaceSettings.findUnique({ where: { workspaceId } });

  const isCustom = settings?.aiMode === "custom";
  const apiKey = isCustom ? settings?.customKey : settings?.openRouterKey;
  const model = body.model ?? settings?.selectedModel ?? "openai/gpt-4o-mini";

  if (!apiKey) {
    return fail(422, "NO_AI_KEY", "No AI API key configured. Go to Settings → AI & Integrations.");
  }

  const endpoint = isCustom
    ? (settings?.customEndpoint?.replace(/\/$/, "") ?? "") + "/chat/completions"
    : "https://openrouter.ai/api/v1/chat/completions";

  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    ...(body.currentHtml
      ? [{ role: "user", content: `Current email HTML:\n\`\`\`html\n${body.currentHtml}\n\`\`\`` }]
      : []),
    { role: "user", content: body.prompt },
  ];

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
  };
  if (!isCustom) {
    headers["HTTP-Referer"] = "https://mailerdark.app";
    headers["X-Title"] = "Mailerdark AI Editor";
  }

  const upstream = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify({ model, messages, stream: true, temperature: 0.7 }),
  });

  if (!upstream.ok) {
    const errText = await upstream.text();
    return fail(502, "AI_ERROR", `AI provider returned ${upstream.status}: ${errText.slice(0, 300)}`);
  }

  // Pass the SSE stream directly through to the browser — the API key
  // is on the server side only; the browser only sees the stream chunks.
  return new Response(upstream.body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
});
