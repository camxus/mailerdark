"use client";

import { useState } from "react";
import { FileJson } from "lucide-react";
import { ApiKeysSection } from "./api-keys-section";
import { EndpointBrowser } from "./endpoint-browser";

export function ApiDocsPage({ workspaceId }: { workspaceId: string }) {
  const [lastCreatedKey, setLastCreatedKey] = useState("");

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-ink">API & documentation</h1>
          <p className="mt-1 text-sm text-ink-soft">
            Manage API keys and explore every endpoint — each one can be run for real, right here.
          </p>
        </div>
        <a
          href="/api/openapi"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 text-sm font-medium text-teal hover:text-teal-dark"
        >
          <FileJson size={15} /> OpenAPI spec (JSON)
        </a>
      </div>

      <ApiKeysSection workspaceId={workspaceId} onKeyCreated={setLastCreatedKey} />

      <div>
        <h2 className="mb-1 text-sm font-semibold text-ink">Endpoints</h2>
        <p className="mb-4 text-sm text-ink-soft">
          All requests are scoped to this workspace and authenticated with{" "}
          <code className="rounded bg-canvas px-1 py-0.5 font-mono text-xs">Authorization: Bearer flw_live_…</code>
        </p>
        <EndpointBrowser workspaceId={workspaceId} defaultApiKey={lastCreatedKey} />
      </div>
    </div>
  );
}
