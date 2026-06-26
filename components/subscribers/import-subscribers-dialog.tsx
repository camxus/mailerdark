"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input, Label, FieldError } from "@/components/ui/input";
import { useGroups } from "@/lib/queries/groups";
import { useImportSubscribers } from "@/lib/queries/subscribers";
import { useFields, useCreateField } from "@/lib/queries/fields";

export function ImportSubscribersDialog({
  workspaceId,
  onClose,
}: {
  workspaceId: string;
  onClose: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const { data: groups } = useGroups(workspaceId);
  const { data: fields } = useFields(workspaceId);
  const importSubscribers = useImportSubscribers(workspaceId);
  const createField = useCreateField(workspaceId);

  async function validateAndCreateFields(headers: string[]) {
    const fieldKeys = headers.filter((h) => h.toLowerCase() !== "email");
    const keyToLabel: Record<string, string> = {};

    for (const key of fieldKeys) {
      if (!/^[a-z][a-z0-9_]*$/.test(key.toLowerCase())) {
        setError(`Invalid field key format: "${key}". Must start with a letter and contain only lowercase letters, numbers, and underscores.`);
        return null;
      }

      const existing = fields?.find((field) => field.key === key.toLowerCase());
      if (existing) {
        keyToLabel[key.toLowerCase()] = existing.key;
      } else {
        // Create field if it doesn't exist
        try {
          const created = await createField.mutateAsync({ key: key.toLowerCase(), label: key, type: "TEXT" });
          keyToLabel[key.toLowerCase()] = created.key;
        } catch {
          setError(`Failed to create field: ${key}`);
          return null;
        }
      }
    }

    return keyToLabel;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setError(null);

    const text = await file.text();
    const lines = text.trim().split(/\r?\n/);
    if (lines.length === 0) {
      setError("CSV file is empty.");
      return;
    }

    const headers = lines[0].split(",").map((h) => h.trim());
    const emailIndex = headers.findIndex((h) => h.toLowerCase() === "email");

    if (emailIndex === -1) {
      setError("CSV must have an 'email' column.");
      return;
    }

    const keyToLabel = await validateAndCreateFields(headers);
    if (!keyToLabel) return;

    const subscribers = lines.slice(1).map((line) => {
      const values = line.split(",").map((v) => v.trim());
      const email = values[emailIndex];
      const customFields: Record<string, unknown> = {};

      headers.forEach((header, i) => {
        if (i !== emailIndex && values[i] && keyToLabel[header.toLowerCase()]) {
          customFields[keyToLabel[header.toLowerCase()]] = values[i];
        }
      });

      return { email, customFields };
    }).filter((s) => s.email);

    if (subscribers.length === 0) {
      setError("No valid email addresses found in CSV.");
      return;
    }

    await importSubscribers.mutateAsync({ subscribers, groupIds: selectedGroups });
    onClose();
  }

  return (
    <Modal title="Import subscribers" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="csv-file">CSV file</Label>
          <Input
            id="csv-file"
            type="file"
            accept=".csv,text/csv"
            required
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          <p className="mt-1 text-xs text-ink-soft">
            Must include an &lsquo;email&rsquo; column. Additional columns become custom fields (auto-created if needed).
          </p>
        </div>

        {groups && groups.length > 0 && (
          <div>
            <Label>Add to groups (optional)</Label>
            <div className="flex flex-wrap gap-2">
              {groups.map((g) => {
                const checked = selectedGroups.includes(g.id);
                return (
                  <button
                    type="button"
                    key={g.id}
                    onClick={() =>
                      setSelectedGroups((prev) =>
                        checked ? prev.filter((id) => id !== g.id) : [...prev, g.id]
                      )
                    }
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                      checked
                        ? "border-teal bg-teal-soft text-teal-dark"
                        : "border-line bg-surface text-ink-soft hover:bg-canvas"
                    }`}
                  >
                    {g.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <FieldError>{error || importSubscribers.error?.message}</FieldError>

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={importSubscribers.isPending || !file}>
            {importSubscribers.isPending ? "Importing…" : "Import"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}