"use client";

import { useState } from "react";
import { FileJson } from "lucide-react";
import { ApiKeysSection } from "./api-keys-section";
import { EndpointBrowser } from "./endpoint-browser";

const MCP_INTENTS = [
  { name: "create_campaign", description: "Creating an email campaign/newsletter/promotion" },
  { name: "create_automation", description: "Creating an automation workflow/onboarding flow" },
  { name: "create_group", description: "Creating a segment/group" },
  { name: "search_subscribers", description: "Finding/listing subscribers" },
  { name: "search_groups", description: "Finding/listing groups" },
  { name: "search_campaigns", description: "Finding/listing campaigns" },
  { name: "search_automations", description: "Finding/listing automations" },
  { name: "export_subscribers", description: "Exporting subscriber data" },
  { name: "export_groups", description: "Exporting group data" },
  { name: "export_campaigns", description: "Exporting campaign data" },
  { name: "campaign_analytics", description: "Getting campaign performance stats" },
  { name: "subscriber_analytics", description: "Getting subscriber stats" },
  { name: "generate_email", description: "Generating email content" },
  { name: "generate_newsletter", description: "Generating newsletter content" }
];

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
        <h2 className="mb-1 text-sm font-semibold text-ink">AI Assistant (MCP) Intents</h2>
        <p className="mb-4 text-sm text-ink-soft">
          Natural language commands sent to <code className="rounded bg-canvas px-1 py-0.5 font-mono text-xs">/ai/command</code> are classified into these intents.
        </p>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          {MCP_INTENTS.map((intent) => (
            <div key={intent.name} className="rounded-md border border-line bg-canvas p-3">
              <code className="font-mono text-xs font-medium text-teal">{intent.name}</code>
              <p className="mt-1 text-xs text-ink-soft">{intent.description}</p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="mb-1 text-sm font-semibold text-ink">Automation Flow Structure</h2>
        <p className="mb-4 text-sm text-ink-soft">
          Automations use a flow-based structure with nodes and edges. When creating automations via MCP, the LLM generates this structure.
        </p>
        <div className="rounded-md border border-line bg-canvas p-3">
          <pre className="font-mono text-xs text-ink overflow-auto">
{JSON.stringify({
  nodes: [
    { id: "trigger-1", type: "trigger", position: { x: 250, y: 40 }, data: { triggerType: "SUBSCRIBER_CREATED" } },
    { id: "delay-1", type: "delay", position: { x: 250, y: 140 }, data: { amount: 2, unit: "days" } },
    { id: "send-1", type: "sendEmail", position: { x: 250, y: 240 }, data: { subject: "Welcome!", htmlContent: "<p>Welcome to our service!</p>" } }
  ],
  edges: [
    { source: "trigger-1", target: "delay-1" },
    { source: "delay-1", target: "send-1" }
  ]
}, null, 2)}</pre>
        </div>
        <p className="mt-2 text-xs text-ink-soft">
          Node types: <code className="rounded bg-canvas px-1 py-0.5">trigger</code>, <code className="rounded bg-canvas px-1 py-0.5">delay</code>, <code className="rounded bg-canvas px-1 py-0.5">sendEmail</code>, <code className="rounded bg-canvas px-1 py-0.5">condition</code>, <code className="rounded bg-canvas px-1 py-0.5">action</code>
        </p>
      </div>

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