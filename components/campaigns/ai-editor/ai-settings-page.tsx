"use client";

import { useState } from "react";
import { Check, AlertCircle, RefreshCw } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, FieldError } from "@/components/ui/input";
import { useAiSettings, useUpdateAiSettings, useAiModels } from "@/lib/queries/settings";

export function AiSettingsPage({ workspaceId }: { workspaceId: string }) {
  const { data: settings, isLoading } = useAiSettings(workspaceId);
  const updateSettings = useUpdateAiSettings(workspaceId);
  const [mode, setMode] = useState<"openrouter" | "custom">("openrouter");
  const [openRouterKey, setOpenRouterKey] = useState("");
  const [customEndpoint, setCustomEndpoint] = useState("");
  const [customKey, setCustomKey] = useState("");
  const [selectedModel, setSelectedModel] = useState("");
  const [initialized, setInitialized] = useState(false);
  const [saved, setSaved] = useState(false);

  // Populate state from loaded settings once
  if (settings && !initialized) {
    setMode(settings.aiMode === "custom" ? "custom" : "openrouter");
    setCustomEndpoint(settings.customEndpoint ?? "");
    setSelectedModel(settings.selectedModel ?? "openai/gpt-4o-mini");
    setInitialized(true);
  }

  const { data: models, isLoading: modelsLoading, refetch: refetchModels } =
    useAiModels(workspaceId, Boolean(settings?.openRouterKeySet && mode === "openrouter"));

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    await updateSettings.mutateAsync({
      aiMode: mode,
      ...(openRouterKey ? { openRouterKey } : {}),
      customEndpoint: mode === "custom" ? customEndpoint : "",
      ...(customKey ? { customKey } : {}),
      selectedModel,
    });
    setOpenRouterKey("");
    setCustomKey("");
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  if (isLoading) return <p className="text-sm text-ink-soft">Loading…</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-ink">AI & Integrations</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Connect an AI provider for the AI Editor in your campaign builder. Your API key is stored
          encrypted on our servers and is never sent to the browser.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Mode toggle */}
        <Card className="p-5 space-y-4">
          <h2 className="text-sm font-semibold text-ink">Provider</h2>
          <div className="flex gap-3">
            {(["openrouter", "custom"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`flex-1 rounded-lg border-2 px-4 py-3 text-left transition-colors ${
                  mode === m
                    ? "border-teal bg-teal-soft"
                    : "border-line bg-surface hover:bg-canvas"
                }`}
              >
                <p className={`text-sm font-semibold ${mode === m ? "text-teal-dark" : "text-ink"}`}>
                  {m === "openrouter" ? "OpenRouter" : "Custom endpoint"}
                </p>
                <p className="mt-0.5 text-xs text-ink-soft">
                  {m === "openrouter"
                    ? "Access 200+ models (GPT-4o, Claude, Llama, Gemini…) with one key"
                    : "Any OpenAI-compatible API — Ollama, LM Studio, Azure OpenAI, etc."}
                </p>
              </button>
            ))}
          </div>
        </Card>

        {/* OpenRouter config */}
        {mode === "openrouter" && (
          <Card className="p-5 space-y-4">
            <h2 className="text-sm font-semibold text-ink">OpenRouter</h2>
            <div>
              <Label htmlFor="orKey">API key</Label>
              {settings?.openRouterKeySet && (
                <p className="mb-1.5 text-xs text-green flex items-center gap-1">
                  <Check size={12} /> Key saved ({settings.openRouterKeyMasked}) — enter a new one to replace it
                </p>
              )}
              <Input
                id="orKey"
                type="password"
                value={openRouterKey}
                onChange={(e) => setOpenRouterKey(e.target.value)}
                placeholder="sk-or-v1-…"
              />
              <p className="mt-1 text-xs text-ink-soft">
                Get one at{" "}
                <a href="https://openrouter.ai/keys" target="_blank" rel="noreferrer"
                  className="text-teal hover:text-teal-dark">
                  openrouter.ai/keys
                </a>
              </p>
            </div>

            {settings?.openRouterKeySet && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <Label>Model</Label>
                  <button
                    type="button"
                    onClick={() => refetchModels()}
                    className="text-xs text-ink-soft hover:text-ink flex items-center gap-1"
                  >
                    <RefreshCw size={11} className={modelsLoading ? "animate-spin" : ""} />
                    Refresh
                  </button>
                </div>
                {modelsLoading ? (
                  <p className="text-xs text-ink-soft">Loading models…</p>
                ) : models && models.length > 0 ? (
                  <select
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    className="w-full rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink"
                  >
                    {models.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                        {m.pricing?.prompt ? ` — $${(Number(m.pricing.prompt) * 1_000_000).toFixed(2)}/M tokens` : ""}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="text-xs text-ink-soft">Save your key first, then refresh to load models.</p>
                )}
              </div>
            )}
          </Card>
        )}

        {/* Custom endpoint config */}
        {mode === "custom" && (
          <Card className="p-5 space-y-4">
            <h2 className="text-sm font-semibold text-ink">Custom endpoint</h2>
            <div>
              <Label htmlFor="endpoint">Base URL</Label>
              <Input
                id="endpoint"
                value={customEndpoint}
                onChange={(e) => setCustomEndpoint(e.target.value)}
                placeholder="http://localhost:11434/v1"
              />
              <p className="mt-1 text-xs text-ink-soft">
                Must expose a <code className="font-mono">/chat/completions</code> endpoint compatible with the OpenAI API.
              </p>
            </div>
            <div>
              <Label htmlFor="customKey">API key (optional)</Label>
              {settings?.customKeySet && (
                <p className="mb-1.5 text-xs text-green flex items-center gap-1">
                  <Check size={12} /> Key saved ({settings.customKeyMasked})
                </p>
              )}
              <Input
                id="customKey"
                type="password"
                value={customKey}
                onChange={(e) => setCustomKey(e.target.value)}
                placeholder="Leave blank if your endpoint doesn't require auth"
              />
            </div>
            <div>
              <Label htmlFor="customModel">Model name</Label>
              <Input
                id="customModel"
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                placeholder="llama3.2, mistral, gpt-4o, etc."
              />
            </div>
          </Card>
        )}

        {updateSettings.error && (
          <div className="flex items-center gap-2 rounded-md border border-red bg-red-soft px-3 py-2 text-sm text-red">
            <AlertCircle size={14} />
            {updateSettings.error.message}
          </div>
        )}

        <FieldError>{null}</FieldError>

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={updateSettings.isPending}>
            {updateSettings.isPending ? "Saving…" : "Save settings"}
          </Button>
          {saved && (
            <span className="flex items-center gap-1 text-sm text-green">
              <Check size={14} /> Saved
            </span>
          )}
        </div>
      </form>
    </div>
  );
}
