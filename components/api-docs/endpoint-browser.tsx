"use client";

import { apiGroups } from "@/lib/openapi/spec";
import { EndpointCard } from "./endpoint-card";

export function EndpointBrowser({ workspaceId, defaultApiKey }: { workspaceId: string; defaultApiKey: string }) {
  return (
    <div className="space-y-6">
      {apiGroups.map((group) => (
        <div key={group.name}>
          <h2 className="mb-3 text-sm font-semibold text-ink">{group.name}</h2>
          <div className="space-y-2">
            {group.endpoints.map((endpoint) => (
              <EndpointCard
                key={endpoint.id}
                endpoint={endpoint}
                workspaceId={workspaceId}
                defaultApiKey={defaultApiKey}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
