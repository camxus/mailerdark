"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { X, Plus, Trash2, ExternalLink } from "lucide-react";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useGroups } from "@/lib/queries/groups";
import type { AutomationNodeData, FilterNodeData } from "@/lib/automations/types";
import Link from "next/link";

const HtmlEditor = dynamic(
  () => import("@/components/ui/html-editor").then((m) => m.HtmlEditor),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-40 items-center justify-center rounded-md border border-line bg-canvas text-xs text-ink-soft">
        Loading editor…
      </div>
    ),
  }
);

export function NodeConfigPanel({
  nodeId,
  data,
  workspaceId,
  automationId,
  onUpdate,
  onClose,
}: {
  nodeId: string;
  data: AutomationNodeData;
  workspaceId: string;
  automationId: string;
  onUpdate: (nodeId: string, newData: AutomationNodeData) => void;
  onClose: () => void;
}) {
  function patch(partial: Partial<AutomationNodeData>) {
    onUpdate(nodeId, { ...data, ...partial } as AutomationNodeData);
  }

  return (
    <div className="absolute right-0 top-0 z-10 flex h-full w-72 flex-col border-l border-line bg-surface shadow-lg">
      <div className="flex items-center justify-between border-b border-line p-4">
        <h3 className="text-sm font-semibold text-ink capitalize">{data.type} node</h3>
        <button onClick={onClose} className="rounded-md p-1 text-ink-soft hover:bg-canvas">
          <X size={16} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {data.type === "trigger" && <TriggerConfig data={data} patch={patch} />}
        {data.type === "filter" && <FilterConfig data={data} patch={patch} />}
        {data.type === "delay" && <DelayConfig data={data} patch={patch} />}
        {data.type === "sendEmail" && <SendEmailConfig data={data} patch={patch} workspaceId={workspaceId} automationId={automationId} nodeId={nodeId} />}
        {(data.type === "addToGroup" || data.type === "removeFromGroup") && (
          <GroupActionConfig data={data} workspaceId={workspaceId} patch={patch} />
        )}
        {data.type === "exit" && <ExitConfig data={data} patch={patch} />}
      </div>
    </div>
  );
}

// ── Trigger ──────────────────────────────────────

function TriggerConfig({ data, patch }: { data: Extract<AutomationNodeData, { type: "trigger" }>; patch: (p: object) => void }) {
  return (
    <div>
      <Label>Trigger event</Label>
      <select value={data.triggerType} onChange={(e) => patch({ triggerType: e.target.value })}
        className="w-full rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink">
        <option value="SUBSCRIBER_CREATED">Subscriber created</option>
        <option value="SUBSCRIBER_ADDED_TO_GROUP">Added to group</option>
        <option value="FIELD_CHANGED">Field changed</option>
        <option value="CAMPAIGN_OPENED">Campaign opened</option>
        <option value="CAMPAIGN_CLICKED">Campaign clicked</option>
        <option value="DATE_BASED">Date based</option>
      </select>
    </div>
  );
}

// ── Filter ──────────────────────────────────────

function FilterConfig({ data, patch }: { data: Extract<AutomationNodeData, { type: "filter" }>; patch: (p: object) => void }) {
  const conditions = data.conditions;

  function updateCondition(i: number, partial: Partial<FilterNodeData["conditions"][0]>) {
    patch({ conditions: conditions.map((c, idx) => idx === i ? { ...c, ...partial } : c) });
  }

  function addCondition() {
    patch({ conditions: [...conditions, { fieldKey: "email", operator: "equals", value: "" }] });
  }

  function removeCondition(i: number) {
    patch({ conditions: conditions.filter((_, idx) => idx !== i) });
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-ink-soft">All conditions must be true (AND logic).</p>
      {conditions.map((c, i) => (
        <div key={i} className="space-y-1.5 rounded-md border border-line p-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-ink-soft">Condition {i + 1}</span>
            <button onClick={() => removeCondition(i)} className="text-red hover:opacity-70"><Trash2 size={13} /></button>
          </div>
          <Input value={c.fieldKey} onChange={(e) => updateCondition(i, { fieldKey: e.target.value })} placeholder="field_key or email" className="!py-1.5 text-xs" />
          <select value={c.operator} onChange={(e) => updateCondition(i, { operator: e.target.value as typeof c.operator })}
            className="w-full rounded border border-line bg-surface px-2 py-1.5 text-xs text-ink">
            <option value="equals">is</option>
            <option value="not_equals">is not</option>
            <option value="contains">contains</option>
            <option value="gt">greater than</option>
            <option value="lt">less than</option>
            <option value="is_set">is set</option>
            <option value="is_not_set">is not set</option>
          </select>
          {c.operator !== "is_set" && c.operator !== "is_not_set" && (
            <Input value={String(c.value ?? "")} onChange={(e) => updateCondition(i, { value: e.target.value })} placeholder="Value" className="!py-1.5 text-xs" />
          )}
        </div>
      ))}
      <Button type="button" variant="ghost" onClick={addCondition} className="w-full !py-1.5 text-xs">
        <Plus size={13} /> Add condition
      </Button>
    </div>
  );
}

// ── Delay ──────────────────────────────────────

function DelayConfig({ data, patch }: { data: Extract<AutomationNodeData, { type: "delay" }>; patch: (p: object) => void }) {
  return (
    <div className="flex gap-2">
      <div className="flex-1">
        <Label>Amount</Label>
        <Input type="number" min={1} value={data.amount} onChange={(e) => patch({ amount: Number(e.target.value) })} />
      </div>
      <div className="flex-1">
        <Label>Unit</Label>
        <select value={data.unit} onChange={(e) => patch({ unit: e.target.value })}
          className="w-full rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink">
          <option value="minutes">Minutes</option>
          <option value="hours">Hours</option>
          <option value="days">Days</option>
        </select>
      </div>
    </div>
  );
}

// ── Send Email ──────────────────────────────────────

function SendEmailConfig({ data, patch, workspaceId, automationId, nodeId }: { data: Extract<AutomationNodeData, { type: "sendEmail" }>; patch: (p: object) => void; workspaceId: string; automationId: string; nodeId: string }) {
  const [showFullEditor, setShowFullEditor] = useState(false);

  return (
    <div className="space-y-3">
      <div><Label>Subject</Label><Input value={data.subject} onChange={(e) => patch({ subject: e.target.value })} placeholder="Subject line (supports {{field}})" /></div>
      <div><Label>From name</Label><Input value={data.fromName} onChange={(e) => patch({ fromName: e.target.value })} /></div>
      <div><Label>From email</Label><Input type="email" value={data.fromEmail} onChange={(e) => patch({ fromEmail: e.target.value })} /></div>
      <div><Label>Reply-to (optional)</Label><Input type="email" value={data.replyTo ?? ""} onChange={(e) => patch({ replyTo: e.target.value || undefined })} /></div>
      <div>
        <div className="mb-2 flex items-center justify-between">
          <Label>HTML content</Label>
          <Link
            href={`/w/${workspaceId}/automations/${automationId}/node-email/${nodeId}`}
            className="rounded-md p-1 text-ink-soft hover:bg-canvas"
            title="Open email editor page"
          >
            <ExternalLink size={14} />
          </Link>
        </div>
        <HtmlEditor
          value={data.htmlContent}
          onChange={(v) => patch({ htmlContent: v })}
          minHeight="120px"
        />
        {showFullEditor && (
          <FullEditorDialog
            html={data.htmlContent}
            onChange={(v) => patch({ htmlContent: v })}
            onClose={() => setShowFullEditor(false)}
          />
        )}

        {data.htmlContent && (
          <div className="mt-3 rounded border border-line bg-canvas p-2">
            <p className="mb-1 text-xs font-medium text-ink-soft">Preview</p>
            <div
              className="max-h-32 overflow-hidden rounded"
              style={{ fontSize: 0 }}
              dangerouslySetInnerHTML={{ __html: data.htmlContent }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function FullEditorDialog({
  html,
  onChange,
  onClose,
}: {
  html: string;
  onChange: (v: string) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
      <div className="flex h-[700px] w-full max-w-5xl flex-col rounded-lg border border-line bg-surface shadow-lg">
        <div className="flex items-center justify-between border-b border-line p-4">
          <h2 className="text-base font-semibold text-ink">Edit email content</h2>
          <button onClick={onClose} className="rounded-md p-1 text-ink-soft hover:bg-canvas">
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 p-4">
          <HtmlEditor
            value={html}
            onChange={onChange}
            minHeight="500px"
          />
        </div>
        <div className="border-t border-line p-4">
          <div className="flex justify-end">
            <Button onClick={onClose}>Done</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Group actions ──────────────────────────────────────

function GroupActionConfig({ data, workspaceId, patch }: {
  data: Extract<AutomationNodeData, { type: "addToGroup" | "removeFromGroup" }>;
  workspaceId: string;
  patch: (p: object) => void;
}) {
  const { data: groups } = useGroups(workspaceId);
  return (
    <div>
      <Label>Group</Label>
      <select value={data.groupId} onChange={(e) => {
        const g = groups?.find((g) => g.id === e.target.value);
        patch({ groupId: e.target.value, groupName: g?.name });
      }} className="w-full rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink">
        <option value="">Select a group…</option>
        {groups?.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
      </select>
    </div>
  );
}

// ── Exit ──────────────────────────────────────

function ExitConfig({ data, patch }: { data: Extract<AutomationNodeData, { type: "exit" }>; patch: (p: object) => void }) {
  return (
    <div><Label>Label (optional)</Label>
      <Input value={data.label ?? ""} onChange={(e) => patch({ label: e.target.value || undefined })} placeholder="e.g. Completed, Unsubscribed…" />
    </div>
  );
}
