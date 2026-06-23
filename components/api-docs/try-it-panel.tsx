"use client";

import { useMemo, useState } from "react";
import { Play, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { cx } from "@/lib/cx";
import type { ApiEndpoint } from "@/lib/openapi/spec";
import { buildSnippets } from "@/lib/openapi/build-snippets";

const methodTone: Record<string, string> = {
  GET: "text-teal-dark bg-teal-soft",
  POST: "text-green bg-green-soft",
  PATCH: "text-amber bg-amber-soft",
  DELETE: "text-red bg-red-soft",
};

export function TryItPanel({
  endpoint,
  workspaceId,
  defaultApiKey,
}: {
  endpoint: ApiEndpoint;
  workspaceId: string;
  defaultApiKey: string;
}) {
  const [apiKey, setApiKey] = useState(defaultApiKey);
  const [pathValues, setPathValues] = useState<Record<string, string>>({});
  const [queryValues, setQueryValues] = useState<Record<string, string>>({});
  const [body, setBody] = useState(
    endpoint.requestBodyExample ? JSON.stringify(endpoint.requestBodyExample, null, 2) : ""
  );
  const [snippetTab, setSnippetTab] = useState<"curl" | "node" | "python">("curl");
  const [running, setRunning] = useState(false);
  const [response, setResponse] = useState<{ status: number; body: string } | null>(null);

  const resolvedPath = useMemo(() => {
    let path = endpoint.path;
    for (const param of endpoint.pathParams ?? []) {
      path = path.replace(`{${param.name}}`, pathValues[param.name] || `{${param.name}}`);
    }
    return path;
  }, [endpoint, pathValues]);

  const url = useMemo(() => {
    const origin = typeof window !== "undefined" ? window.location.origin : "https://yourapp.com";
    const base = `${origin}/api/workspaces/${workspaceId}${resolvedPath}`;
    const query = (endpoint.queryParams ?? [])
      .filter((p) => queryValues[p.name])
      .map((p) => `${encodeURIComponent(p.name)}=${encodeURIComponent(queryValues[p.name])}`)
      .join("&");
    return query ? `${base}?${query}` : base;
  }, [workspaceId, resolvedPath, endpoint.queryParams, queryValues]);

  const snippets = buildSnippets({
    endpoint,
    url,
    apiKey,
    body: endpoint.requestBodyExample ? body : null,
  });

  async function handleRun() {
    setRunning(true);
    setResponse(null);
    try {
      const res = await fetch(url, {
        method: endpoint.method,
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: endpoint.requestBodyExample ? body : undefined,
      });
      const text = await res.text();
      let pretty = text;
      try {
        pretty = JSON.stringify(JSON.parse(text), null, 2);
      } catch {
        // leave as raw text if it's not JSON
      }
      setResponse({ status: res.status, body: pretty });
    } catch (error) {
      setResponse({ status: 0, body: error instanceof Error ? error.message : "Request failed." });
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="space-y-4 border-t border-line pt-4">
      <div>
        <Label htmlFor={`${endpoint.id}-key`}>API key</Label>
        <Input
          id={`${endpoint.id}-key`}
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="flw_live_…"
        />
      </div>

      {(endpoint.pathParams ?? []).map((p) => (
        <div key={p.name}>
          <Label htmlFor={`${endpoint.id}-${p.name}`}>{p.name}</Label>
          <Input
            id={`${endpoint.id}-${p.name}`}
            value={pathValues[p.name] ?? ""}
            onChange={(e) => setPathValues((v) => ({ ...v, [p.name]: e.target.value }))}
            placeholder={p.description}
          />
        </div>
      ))}

      {(endpoint.queryParams ?? []).map((p) => (
        <div key={p.name}>
          <Label htmlFor={`${endpoint.id}-${p.name}`}>{p.name} {!p.required && <span className="text-ink-soft font-normal">(optional)</span>}</Label>
          <Input
            id={`${endpoint.id}-${p.name}`}
            value={queryValues[p.name] ?? ""}
            onChange={(e) => setQueryValues((v) => ({ ...v, [p.name]: e.target.value }))}
            placeholder={p.description}
          />
        </div>
      ))}

      {endpoint.requestBodyExample && (
        <div>
          <Label htmlFor={`${endpoint.id}-body`}>Request body (JSON)</Label>
          <textarea
            id={`${endpoint.id}-body`}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={6}
            className="w-full rounded-md border border-line bg-surface px-3 py-2 font-mono text-xs text-ink"
          />
        </div>
      )}

      <div className="flex items-center gap-2">
        <Button onClick={handleRun} disabled={running || !apiKey}>
          <Play size={14} /> {running ? "Running…" : "Run request"}
        </Button>
        {!apiKey && <p className="text-xs text-ink-soft">Paste an API key above to try this live.</p>}
      </div>

      {response && (
        <div>
          <p className="mb-1 text-xs font-medium text-ink-soft">
            Response — <span className={response.status < 400 && response.status > 0 ? "text-green" : "text-red"}>{response.status || "Network error"}</span>
          </p>
          <pre className="max-h-64 overflow-auto rounded-md border border-line bg-canvas p-3 font-mono text-xs text-ink">{response.body}</pre>
        </div>
      )}

      <div>
        <div className="flex gap-1 border-b border-line">
          {(["curl", "node", "python"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setSnippetTab(tab)}
              className={cx(
                "px-2.5 py-1.5 text-xs font-medium capitalize transition-colors",
                snippetTab === tab ? "border-b-2 border-teal text-teal-dark" : "text-ink-soft hover:text-ink"
              )}
            >
              {tab === "curl" ? "cURL" : tab === "node" ? "Node.js" : "Python"}
            </button>
          ))}
        </div>
        <SnippetBlock code={snippets[snippetTab]} />
      </div>

      <div className="flex items-center gap-1.5 text-xs">
        <span className={cx("rounded px-1.5 py-0.5 font-mono font-semibold", methodTone[endpoint.method])}>
          {endpoint.method}
        </span>
        <code className="text-ink-soft">/api/workspaces/{`{workspaceId}`}{endpoint.path}</code>
      </div>
    </div>
  );
}

function SnippetBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="relative">
      <pre className="overflow-auto rounded-b-md border border-t-0 border-line bg-ink p-3 font-mono text-xs text-canvas">{code}</pre>
      <button
        onClick={handleCopy}
        className="absolute right-2 top-2 rounded p-1 text-canvas/70 hover:bg-white/10 hover:text-canvas"
      >
        {copied ? <Check size={13} /> : <Copy size={13} />}
      </button>
    </div>
  );
}
