"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, EmptyState } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { Input, Label, FieldError } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useFields, useCreateField, useDeleteField } from "@/lib/queries/fields";

const fieldTypeLabels: Record<string, string> = {
  TEXT: "Text",
  NUMBER: "Number",
  DATE: "Date",
  BOOLEAN: "True/false",
};

export function FieldsPage({ workspaceId }: { workspaceId: string }) {
  const { data: fields, isLoading } = useFields(workspaceId);
  const deleteField = useDeleteField(workspaceId);
  const [showDialog, setShowDialog] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-ink">Custom fields</h1>
          <p className="mt-1 text-sm text-ink-soft">
            Fields are available for personalization, filtering, and automation conditions.
          </p>
        </div>
        <Button onClick={() => setShowDialog(true)}>
          <Plus size={16} /> Add field
        </Button>
      </div>

      <Card>
        {isLoading ? (
          <p className="p-6 text-sm text-ink-soft">Loading…</p>
        ) : !fields || fields.length === 0 ? (
          <EmptyState
            title="No custom fields yet"
            description='Add fields like "first_name" or "plan" to personalize emails and target automations.'
            action={<Button onClick={() => setShowDialog(true)}>Add field</Button>}
          />
        ) : (
          <ul className="divide-y divide-line">
            {fields.map((f) => (
              <li key={f.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-ink">{f.label}</p>
                  <p className="font-mono text-xs text-ink-soft">{`{{${f.key}}}`}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge>{fieldTypeLabels[f.type]}</Badge>
                  <button
                    onClick={() => {
                      if (confirm(`Delete the "${f.label}" field?`)) deleteField.mutate(f.id);
                    }}
                    className="rounded-md p-1.5 text-ink-soft hover:bg-red-soft hover:text-red"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {showDialog && <AddFieldDialog workspaceId={workspaceId} onClose={() => setShowDialog(false)} />}
    </div>
  );
}

function AddFieldDialog({ workspaceId, onClose }: { workspaceId: string; onClose: () => void }) {
  const [key, setKey] = useState("");
  const [label, setLabel] = useState("");
  const [type, setType] = useState<"TEXT" | "NUMBER" | "DATE" | "BOOLEAN">("TEXT");
  const createField = useCreateField(workspaceId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await createField.mutateAsync({ key, label, type });
    onClose();
  }

  return (
    <Modal title="Add custom field" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="label">Label</Label>
          <Input
            id="label"
            required
            value={label}
            onChange={(e) => {
              setLabel(e.target.value);
              if (!key || key === slugify(label)) {
                setKey(slugify(e.target.value));
              }
            }}
            placeholder="First name"
          />
        </div>
        <div>
          <Label htmlFor="key">Key</Label>
          <Input
            id="key"
            required
            value={key}
            onChange={(e) => setKey(slugify(e.target.value))}
            placeholder="first_name"
          />
        </div>
        <div>
          <Label htmlFor="type">Type</Label>
          <select
            id="type"
            value={type}
            onChange={(e) => setType(e.target.value as typeof type)}
            className="w-full rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink"
          >
            <option value="TEXT">Text</option>
            <option value="NUMBER">Number</option>
            <option value="DATE">Date</option>
            <option value="BOOLEAN">True/false</option>
          </select>
        </div>
        <FieldError>{createField.error?.message}</FieldError>
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={createField.isPending}>
            {createField.isPending ? "Adding…" : "Add field"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s_]/g, "")
    .replace(/\s+/g, "_");
}
