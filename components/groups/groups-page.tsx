"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, EmptyState } from "@/components/ui/card";
import { useGroups, useDeleteGroup, type Group } from "@/lib/queries/groups";
import { GroupDialog } from "./group-dialog";

export function GroupsPage({ workspaceId }: { workspaceId: string }) {
  const { data: groups, isLoading } = useGroups(workspaceId);
  const deleteGroup = useDeleteGroup(workspaceId);
  const [dialogGroup, setDialogGroup] = useState<Group | "new" | null>(null);

  async function handleDelete(group: Group) {
    if (!confirm(`Delete "${group.name}"? Subscribers will keep their other group memberships.`)) {
      return;
    }
    await deleteGroup.mutateAsync(group.id);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-ink">Groups</h1>
          <p className="mt-1 text-sm text-ink-soft">Segment subscribers for campaigns and automations.</p>
        </div>
        <Button onClick={() => setDialogGroup("new")}>
          <Plus size={16} /> Create group
        </Button>
      </div>

      <Card>
        {isLoading ? (
          <p className="p-6 text-sm text-ink-soft">Loading…</p>
        ) : !groups || groups.length === 0 ? (
          <EmptyState
            title="No groups yet"
            description="Groups let you target campaigns and automations at a subset of your subscribers."
            action={<Button onClick={() => setDialogGroup("new")}>Create group</Button>}
          />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-ink-soft">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Description</th>
                <th className="px-4 py-3 font-medium">Subscribers</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {groups.map((g) => (
                <tr key={g.id} className="hover:bg-canvas">
                  <td className="px-4 py-3">
                    <Link
                      href={`/w/${workspaceId}/subscribers?groupId=${g.id}`}
                      className="font-medium text-ink hover:text-teal-dark"
                    >
                      {g.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-ink-soft">{g.description || "—"}</td>
                  <td className="px-4 py-3 text-ink-soft">{g.subscriberCount}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => setDialogGroup(g)}
                        className="rounded-md p-1.5 text-ink-soft hover:bg-canvas hover:text-ink"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => handleDelete(g)}
                        className="rounded-md p-1.5 text-ink-soft hover:bg-red-soft hover:text-red"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {dialogGroup && (
        <GroupDialog
          workspaceId={workspaceId}
          group={dialogGroup === "new" ? undefined : dialogGroup}
          onClose={() => setDialogGroup(null)}
        />
      )}
    </div>
  );
}
