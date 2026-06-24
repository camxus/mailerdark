"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Send, StopCircle, Wand2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAiSettings, useAiModels } from "@/lib/queries/settings";

const QUICK_PROMPTS = [
  "Write a welcome email for new subscribers",
  "Write a re-engagement email for inactive subscribers",
  "Rewrite this email to be more concise",
  "Add a clear call-to-action button",
  "Make the tone more friendly and conversational",
  "Add a product feature announcement section",
  "Improve the subject line suggestions",
];

export function AiEditorPanel({
  workspaceId,
  currentHtml,
  onApply,
}: {
  workspaceId: string;
  currentHtml: string;
  onApply: (html: string) => void;
}) {
  const { data: settings } = useAiSettings(workspaceId);
  const { data: models } = useAiModels(workspaceId, Boolean(settings?.openRouterKeySet));
  const [prompt, setPrompt] = useState("");
  const [selectedModel, setSelectedModel] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [output, setOutput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const activeModel = selectedModel || settings?.selectedModel || "openai/gpt-4o-mini";
  const hasKey = settings?.openRouterKeySet || settings?.customKeySet;

  async function handleGenerate() {
    if (!prompt.trim() || streaming) return;
    setStreaming(true);
    setOutput("");
    setError(null);
    abortRef.current = new AbortController();

    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/ai/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, currentHtml, model: activeModel }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) {
        const body = await res.json();
        setError(body.error?.message ?? "Generation failed.");
        setStreaming(false);
        return;
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n").filter((l) => l.startsWith("data: "));
        for (const line of lines) {
          const data = line.slice(6).trim();
          if (data === "[DONE]") break;
          try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices?.[0]?.delta?.content ?? "";
            if (delta) {
              accumulated += delta;
              setOutput(accumulated);
            }
          } catch { /* skip malformed SSE line */ }
        }
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setError((err as Error).message);
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }

  function handleStop() {
    abortRef.current?.abort();
    setStreaming(false);
  }

  if (!hasKey) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
        <Wand2 size={28} className="text-ink-soft" />
        <p className="text-sm font-medium text-ink">AI editor not configured</p>
        <p className="text-sm text-ink-soft">
          Connect OpenRouter or a custom model endpoint to generate and refine emails with AI.
        </p>
        <Link
          href={`/w/${workspaceId}/settings/ai`}
          className="mt-1 text-sm font-medium text-teal hover:text-teal-dark"
        >
          Go to AI & Integrations settings →
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Model picker */}
      <div className="flex items-center gap-2 border-b border-line px-3 py-2">
        <Badge tone="teal">AI</Badge>
        {models && models.length > 1 ? (
          <select
            value={activeModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="flex-1 rounded border border-line bg-surface px-2 py-1 text-xs text-ink"
          >
            {models.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        ) : (
          <span className="flex-1 truncate text-xs text-ink-soft">{activeModel}</span>
        )}
        <Link
          href={`/w/${workspaceId}/settings/ai`}
          className="text-xs text-ink-soft hover:text-ink"
          title="AI settings"
        >
          Settings
        </Link>
      </div>

      {/* Quick prompts */}
      <div className="border-b border-line px-3 py-2">
        <p className="mb-1.5 text-xs text-ink-soft">Quick prompts</p>
        <div className="flex flex-wrap gap-1">
          {QUICK_PROMPTS.map((q) => (
            <button
              key={q}
              onClick={() => setPrompt(q)}
              className="rounded-full border border-line bg-canvas px-2 py-0.5 text-xs text-ink-soft hover:bg-surface hover:text-ink"
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Output */}
      <div className="flex-1 overflow-auto p-3">
        {error && (
          <div className="mb-3 rounded-md border border-red bg-red-soft px-3 py-2 text-xs text-red">
            {error}
          </div>
        )}
        {output ? (
          <div className="space-y-2">
            <pre className="whitespace-pre-wrap break-words font-mono text-xs text-ink leading-relaxed">
              {output}
              {streaming && <span className="inline-block w-1.5 h-3 bg-teal ml-0.5 animate-pulse" />}
            </pre>
            {!streaming && (
              <div className="flex gap-2 pt-1">
                <Button onClick={() => onApply(output)} className="flex-1 text-xs">
                  Apply to editor
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => setOutput("")}
                  className="text-xs"
                  title="Discard"
                >
                  <RotateCcw size={13} />
                </Button>
              </div>
            )}
          </div>
        ) : (
          !streaming && (
            <p className="text-xs text-ink-soft">
              Describe what you want and click Generate. The AI will write or edit the email HTML.
              Your current email content is automatically included as context.
            </p>
          )
        )}
      </div>

      {/* Prompt input */}
      <div className="border-t border-line p-3 space-y-2">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleGenerate();
          }}
          placeholder="Describe what you want… (⌘↵ to generate)"
          rows={3}
          className="w-full resize-none rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-soft/60 focus:outline-1 focus:outline-teal"
        />
        <div className="flex gap-2">
          {streaming ? (
            <Button variant="danger" onClick={handleStop} className="flex-1 text-sm">
              <StopCircle size={15} /> Stop
            </Button>
          ) : (
            <Button onClick={handleGenerate} disabled={!prompt.trim()} className="flex-1 text-sm">
              <Send size={14} /> Generate
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
