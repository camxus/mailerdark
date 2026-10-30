"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input, Label, FieldError } from "@/components/ui/input";
import { useCreateSubscriber } from "@/lib/queries/subscribers";
import { useGroups } from "@/lib/queries/groups";
import { useFields } from "@/lib/queries/fields";

export function AddSubscriberDialog({
  workspaceId,
  onClose,
}: {
  workspaceId: string;
  onClose: () => void;
}) {
  const [email, setEmail] = useState("");
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [customFields, setCustomFields] = useState<Record<string, unknown>>({});
  const { data: groups } = useGroups(workspaceId);
  const { data: fields } = useFields(workspaceId);
  const createSubscriber = useCreateSubscriber(workspaceId);

  useEffect(() => {
    if (fields?.length) {
      const initial: Record<string, unknown> = {};
      fields.forEach((f) => {
        initial[f.key] = f.type === "BOOLEAN" ? false : "";
      });
      setCustomFields(initial);
    }
  }, [fields]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cleanedFields: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(customFields)) {
      if (value === "" || value === null || value === undefined || (typeof value === "boolean" && value === false)) {
        continue;
      }
      cleanedFields[key] = value;
    }
    await createSubscriber.mutateAsync({ email, groupIds: selectedGroups, customFields: cleanedFields });
    onClose();
  }

  return (
    <Modal title="Add subscriber" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="jane@example.com"
          />
        </div>

        {fields && fields.length > 0 && (
          <div className="space-y-3">
            {fields.map((field) => (
              <div key={field.id}>
                <Label htmlFor={field.key}>{field.label}</Label>
                {field.type === "BOOLEAN" ? (
                  <input
                    id={field.key}
                    type="checkbox"
                    checked={Boolean(customFields[field.key])}
                    onChange={(e) =>
                      setCustomFields((prev) => ({ ...prev, [field.key]: e.target.checked }))
                    }
                    className="h-4 w-4 rounded border border-line bg-surface accent-teal"
                  />
                ) : field.type === "DATE" ? (
                  <Input
                    id={field.key}
                    type="date"
                    value={typeof customFields[field.key] === "string" ? (customFields[field.key] as string) : ""}
                    onChange={(e) =>
                      setCustomFields((prev) => ({ ...prev, [field.key]: e.target.value }))
                    }
                  />
                ) : field.type === "NUMBER" ? (
                  <Input
                    id={field.key}
                    type="number"
                    value={typeof customFields[field.key] === "number" || typeof customFields[field.key] === "string" ? (customFields[field.key] as string | number) : ""}
                    onChange={(e) =>
                      setCustomFields((prev) => ({
                        ...prev,
                        [field.key]: e.target.value === "" ? null : Number(e.target.value),
                      }))
                    }
                  />
                ) : (
                  <Input
                    id={field.key}
                    type="text"
                    value={typeof customFields[field.key] === "string" ? (customFields[field.key] as string) : ""}
                    onChange={(e) =>
                      setCustomFields((prev) => ({ ...prev, [field.key]: e.target.value }))
                    }
                  />
                )}
              </div>
            ))}
          </div>
        )}

        {groups && groups.length > 0 && (
          <div>
            <Label>Groups</Label>
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

        <FieldError>{createSubscriber.error?.message}</FieldError>

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={createSubscriber.isPending}>
            {createSubscriber.isPending ? "Adding…" : "Add subscriber"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
