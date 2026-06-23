"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input, Label, FieldError } from "@/components/ui/input";
import { useCreateGroup, useUpdateGroup, type Group } from "@/lib/queries/groups";

export function GroupDialog({
  workspaceId,
  group,
  onClose,
}: {
  workspaceId: string;
  group?: Group;
  onClose: () => void;
}) {
  const [name, setName] = useState(group?.name ?? "");
  const [description, setDescription] = useState(group?.description ?? "");
  const createGroup = useCreateGroup(workspaceId);
  const updateGroup = useUpdateGroup(workspaceId);

  const pending = createGroup.isPending || updateGroup.isPending;
  const error = createGroup.error ?? updateGroup.error;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (group) {
      await updateGroup.mutateAsync({ id: group.id, name, description });
    } else {
      await createGroup.mutateAsync({ name, description });
    }
    onClose();
  }

  return (
    <Modal title={group ? "Edit group" : "Create group"} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="name">Name</Label>
          <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="description">Description (optional)</Label>
          <Input
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <FieldError>{error?.message}</FieldError>
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : group ? "Save changes" : "Create group"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
