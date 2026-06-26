"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Search, Plus, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, EmptyState } from "@/components/ui/card";
import { SubscriberStatusBadge } from "@/components/ui/badge";
import { useSubscribers } from "@/lib/queries/subscribers";
import { useGroups } from "@/lib/queries/groups";
import { AddSubscriberDialog } from "./add-subscriber-dialog";
import { ImportSubscribersDialog } from "./import-subscribers-dialog";
import { apiFetch } from "@/lib/api-fetch";

export function SubscribersPage({ workspaceId }: { workspaceId: string }) {
  const searchParams = useSearchParams();
  const [search, setSearch] = useState("");
  const [groupId, setGroupId] = useState<string | undefined>(
    searchParams.get("groupId") ?? undefined
  );
  const [status, setStatus] = useState<string | undefined>();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);

  const { data, isLoading } = useSubscribers(workspaceId, { search, groupId, status });
  const { data: groups } = useGroups(workspaceId);

  async function handleExport() {
    const result = await apiFetch<{ csv: string }>(`/api/workspaces/${workspaceId}/subscribers/export`, {
      method: "POST",
      body: JSON.stringify({ search, groupId, status }),
    });
    const blob = new Blob([result.csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "subscribers.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-ink">Subscribers</h1>
          <p className="mt-1 text-sm text-ink-soft">Everyone in your audience, in one place.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setShowImportDialog(true)}>
            <Plus size={16} /> Import
          </Button>
          <Button variant="secondary" onClick={handleExport}>
            <FileDown size={16} /> Export
          </Button>
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus size={16} /> Add subscriber
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-64">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by email"
            className="pl-9"
          />
        </div>
        <select
          value={groupId ?? ""}
          onChange={(e) => setGroupId(e.target.value || undefined)}
          className="rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink"
        >
          <option value="">All groups</option>
          {groups?.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
        <select
          value={status ?? ""}
          onChange={(e) => setStatus(e.target.value || undefined)}
          className="rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink"
        >
          <option value="">All statuses</option>
          <option value="SUBSCRIBED">Subscribed</option>
          <option value="UNSUBSCRIBED">Unsubscribed</option>
          <option value="BOUNCED">Bounced</option>
          <option value="CLEANED">Cleaned</option>
        </select>
      </div>

      <Card>
        {isLoading ? (
          <p className="p-6 text-sm text-ink-soft">Loading…</p>
        ) : !data || data.subscribers.length === 0 ? (
          <EmptyState
            title="No subscribers found"
            description="Add your first subscriber, or adjust your search and filters."
            action={<Button onClick={() => setShowAddDialog(true)}>Add subscriber</Button>}
          />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-ink-soft">
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Groups</th>
                <th className="px-4 py-3 font-medium">Added</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {data.subscribers.map((s) => (
                <tr key={s.id} className="hover:bg-canvas">
                  <td className="px-4 py-3">
                    <Link
                      href={`/w/${workspaceId}/subscribers/${s.id}`}
                      className="font-medium text-ink hover:text-teal-dark"
                    >
                      {s.email}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <SubscriberStatusBadge status={s.status} />
                  </td>
                  <td className="px-4 py-3 text-ink-soft">
                    {s.groups.length > 0 ? s.groups.map((g) => g.name).join(", ") : "—"}
                  </td>
                  <td className="px-4 py-3 text-ink-soft">
                    {new Date(s.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {showAddDialog && (
        <AddSubscriberDialog workspaceId={workspaceId} onClose={() => setShowAddDialog(false)} />
      )}
      {showImportDialog && (
        <ImportSubscribersDialog workspaceId={workspaceId} onClose={() => setShowImportDialog(false)} />
      )}
    </div>
  );
}
