"use client";

import type { NodeProps } from "@xyflow/react";
import { NodeShell } from "./node-shell";
import type { TriggerNodeData, FilterNodeData, DelayNodeData, SendEmailNodeData, AddToGroupNodeData, RemoveFromGroupNodeData, ExitNodeData } from "@/lib/automations/types";

const triggerLabels: Record<string, string> = {
  SUBSCRIBER_CREATED: "Subscriber created",
  SUBSCRIBER_ADDED_TO_GROUP: "Added to group",
  FIELD_CHANGED: "Field changed",
  CAMPAIGN_OPENED: "Campaign opened",
  CAMPAIGN_CLICKED: "Campaign clicked",
  DATE_BASED: "Date based",
};

export function TriggerNode({ data }: NodeProps) {
  const d = data as TriggerNodeData;
  return (
    <NodeShell label="Trigger" icon="⚡" accent="teal" hasInput={false}>
      <p className="font-medium">{triggerLabels[d.triggerType] ?? d.triggerType}</p>
    </NodeShell>
  );
}

export function FilterNode({ data }: NodeProps) {
  const d = data as FilterNodeData;
  return (
    <NodeShell label="Filter" icon="🔀" accent="amber" yesNo hasOutput={false}>
      <p>{d.conditions.length} condition{d.conditions.length !== 1 ? "s" : ""}</p>
    </NodeShell>
  );
}

export function DelayNode({ data }: NodeProps) {
  const d = data as DelayNodeData;
  return (
    <NodeShell label="Wait" icon="⏱" accent="neutral">
      <p>{d.amount} {d.unit}</p>
    </NodeShell>
  );
}

export function SendEmailNode({ data }: NodeProps) {
  const d = data as SendEmailNodeData;
  return (
    <NodeShell label="Send email" icon="✉️" accent="teal">
      <p className="truncate max-w-[160px]">{d.subject || "No subject"}</p>
      {d.fromEmail && <p className="opacity-70">from {d.fromEmail}</p>}
    </NodeShell>
  );
}

export function AddToGroupNode({ data }: NodeProps) {
  const d = data as AddToGroupNodeData;
  return (
    <NodeShell label="Add to group" icon="➕" accent="green">
      <p>{d.groupName ?? d.groupId}</p>
    </NodeShell>
  );
}

export function RemoveFromGroupNode({ data }: NodeProps) {
  const d = data as RemoveFromGroupNodeData;
  return (
    <NodeShell label="Remove from group" icon="➖" accent="red">
      <p>{d.groupName ?? d.groupId}</p>
    </NodeShell>
  );
}

export function ExitNode({ data }: NodeProps) {
  const d = data as ExitNodeData;
  return (
    <NodeShell label="Exit" icon="🏁" accent="neutral" hasOutput={false}>
      {d.label && <p>{d.label}</p>}
    </NodeShell>
  );
}
