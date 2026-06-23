"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cx } from "@/lib/cx";
import type { ApiEndpoint } from "@/lib/openapi/spec";
import { TryItPanel } from "./try-it-panel";

const methodTone: Record<string, string> = {
  GET: "text-teal-dark bg-teal-soft",
  POST: "text-green bg-green-soft",
  PATCH: "text-amber bg-amber-soft",
  DELETE: "text-red bg-red-soft",
};

export function EndpointCard({
  endpoint,
  workspaceId,
  defaultApiKey,
}: {
  endpoint: ApiEndpoint;
  workspaceId: string;
  defaultApiKey: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Card>
      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-center gap-3 px-4 py-3 text-left">
        <span className={cx("shrink-0 rounded px-1.5 py-0.5 font-mono text-xs font-semibold", methodTone[endpoint.method])}>
          {endpoint.method}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-ink">{endpoint.summary}</p>
          <p className="truncate font-mono text-xs text-ink-soft">{endpoint.path}</p>
        </div>
        <ChevronDown size={16} className={cx("shrink-0 text-ink-soft transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="space-y-4 border-t border-line px-4 py-4">
          <p className="text-sm text-ink-soft">{endpoint.description}</p>
          <p className="text-xs text-ink-soft">
            Requires scope <code className="rounded bg-canvas px-1 py-0.5 font-mono">{endpoint.scope}</code>
          </p>

          <div>
            <p className="mb-1 text-xs font-medium text-ink-soft">Example response</p>
            <pre className="overflow-auto rounded-md border border-line bg-canvas p-3 font-mono text-xs text-ink">
              {JSON.stringify({ data: endpoint.responseExample, error: null }, null, 2)}
            </pre>
          </div>

          <TryItPanel endpoint={endpoint} workspaceId={workspaceId} defaultApiKey={defaultApiKey} />
        </div>
      )}
    </Card>
  );
}
