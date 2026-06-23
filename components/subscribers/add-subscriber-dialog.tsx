"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input, Label, FieldError } from "@/components/ui/input";
import { useCreateSubscriber } from "@/lib/queries/subscribers";
import { useGroups } from "@/lib/queries/groups";

export function AddSubscriberDialog({
  workspaceId,
  onClose,
}: {
  workspaceId: string;
  onClose: () => void;
}) {
  const [email, setEmail] = useState("");
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const { data: groups } = useGroups(workspaceId);
  const createSubscriber = useCreateSubscriber(workspaceId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await createSubscriber.mutateAsync({ email, groupIds: selectedGroups });
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
