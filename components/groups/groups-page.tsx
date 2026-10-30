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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
          <div className="table-container">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-ink-soft">
                  <th className="px-3 py-2 sm:px-4 sm:py-3 font-medium">Name</th>
                  <th className="px-3 py-2 sm:px-4 sm:py-3 font-medium hidden sm:table-cell">Description</th>
                  <th className="px-3 py-2 sm:px-4 sm:py-3 font-medium hidden md:table-cell">Subscribers</th>
                  <th className="px-3 py-2 sm:px-4 sm:py-3 hidden lg:table-cell"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {groups.map((g) => (
                  <tr key={g.id} className="hover:bg-canvas">
                    <td className="px-3 py-2 sm:px-4 sm:py-3">
                      <div>
                        <Link
                          href={`/w/${workspaceId}/subscribers?groupId=${g.id}`}
                          className="font-medium text-ink hover:text-teal-dark"
                        >
                          {g.name}
                        </Link>
                        <div className="mt-1 sm:hidden text-xs text-ink-soft">{g.description || "—"}</div>
                      </div>
                    </td>
                    <td className="px-3 py-2 sm:px-4 sm:py-3 text-ink-soft hidden sm:table-cell">{g.description || "—"}</td>
                    <td className="px-3 py-2 sm:px-4 sm:py-3 text-ink-soft hidden md:table-cell">{g.subscriberCount}</td>
                    <td className="px-3 py-2 sm:px-4 sm:py-3 hidden lg:table-cell">
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
          </div>
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
