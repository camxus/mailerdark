"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Search, Plus, Upload, Trash2, X, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, EmptyState } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu } from "@/components/ui/dropdown-menu";
import { SubscriberStatusBadge } from "@/components/ui/badge";
import { useSubscribers, useBatchDeleteSubscribers } from "@/lib/queries/subscribers";
import { useGroups } from "@/lib/queries/groups";
import { AddSubscriberDialog } from "./add-subscriber-dialog";
import { ImportSubscribersDialog } from "./import-subscribers-dialog";

const PAGE_SIZE = 25;

export function SubscribersPage({ workspaceId }: { workspaceId: string }) {
  const searchParams = useSearchParams();
  const [search, setSearch] = useState("");
  const [groupId, setGroupId] = useState<string | undefined>(
    searchParams.get("groupId") ?? undefined
  );
  const [status, setStatus] = useState<string | undefined>();
  const [cursor, setCursor] = useState<string | undefined>();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);

  const { data, isLoading, refetch } = useSubscribers(workspaceId, {
    search, groupId, status, cursor, limit: PAGE_SIZE,
  });
  const batchDelete = useBatchDeleteSubscribers(workspaceId);
  const { data: groups } = useGroups(workspaceId);

  const pageSubscribers = data?.subscribers ?? [];
  const stats = data?.stats;
  const hasMore = Boolean(data?.nextCursor);

  const selectedCount = selectedIds.size;
  const allSelected = pageSubscribers.length > 0 && selectedCount === pageSubscribers.length;

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pageSubscribers.map((s) => s.id)));
    }
  }

  async function handleBatchDelete() {
    if (!confirm(`Delete ${selectedCount} subscribers? This can't be undone.`)) return;
    await batchDelete.mutateAsync(Array.from(selectedIds));
    setSelectedIds(new Set());
    refetch();
  }

  const statusCounts = useMemo(() => {
    if (!stats?.byStatus) return {};
    return stats.byStatus;
  }, [stats]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-ink">Subscribers</h1>
          <p className="mt-1 text-sm text-ink-soft">Everyone in your audience, in one place.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus size={16} /> Add subscriber
          </Button>
          <Button variant="secondary" onClick={() => setShowImportDialog(true)}>
            <Upload size={16} /> Import CSV
          </Button>
        </div>
      </div>

      {stats && (
        <Card className="p-4">
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <span className="font-medium text-ink">Total: {stats.total}</span>
            <div className="flex flex-wrap gap-2">
              {Object.entries(statusCounts).map(([s, count]) => (
                <Badge key={s} tone={s === "SUBSCRIBED" ? "teal" : s === "UNSUBSCRIBED" ? "amber" : "neutral"}>
                  {s.toLowerCase()}: {count}
                </Badge>
              ))}
            </div>
          </div>
        </Card>
      )}

      {selectedCount > 0 && (
        <Card className="p-3 flex items-center justify-between">
          <span className="text-sm text-ink">{selectedCount} selected</span>
          <div className="flex gap-2">
            <Button variant="danger" onClick={handleBatchDelete} disabled={batchDelete.isPending}>
              <Trash2 size={15} /> Delete
            </Button>
            <Button variant="secondary" onClick={() => setSelectedIds(new Set())}>
              <X size={15} /> Clear
            </Button>
          </div>
        </Card>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
        <div className="relative w-full sm:w-64">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
          <Input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCursor(undefined); }}
            placeholder="Search by email"
            className="pl-9 w-full"
          />
        </div>
        <select
          value={groupId ?? ""}
          onChange={(e) => { setGroupId(e.target.value || undefined); setCursor(undefined); }}
          className="w-full sm:w-auto rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink"
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
          onChange={(e) => { setStatus(e.target.value || undefined); setCursor(undefined); }}
          className="w-full sm:w-auto rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink"
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
        ) : !data || pageSubscribers.length === 0 ? (
          <EmptyState
            title="No subscribers found"
            description="Add your first subscriber, or adjust your search and filters."
            action={<Button onClick={() => setShowAddDialog(true)}>Add subscriber</Button>}
          />
        ) : (
          <div className="table-container">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-ink-soft">
                  <th className="px-3 py-2 sm:px-4 sm:py-3 w-10">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleSelectAll}
                      className="h-4 w-4 rounded border border-line bg-surface accent-teal"
                    />
                  </th>
                  <th className="px-3 py-2 sm:px-4 sm:py-3 font-medium">Email</th>
                  <th className="px-3 py-2 sm:px-4 sm:py-3 font-medium hidden sm:table-cell">Status</th>
                  <th className="px-3 py-2 sm:px-4 sm:py-3 font-medium hidden md:table-cell">Groups</th>
                  <th className="px-3 py-2 sm:px-4 sm:py-3 font-medium hidden lg:table-cell">Added</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {pageSubscribers.map((s) => {
                  const checked = selectedIds.has(s.id);
                  return (
                    <tr key={s.id} className={checked ? "bg-teal-soft/40" : "hover:bg-canvas"}>
                      <td className="px-3 py-2 sm:px-4 sm:py-3">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleSelect(s.id)}
                          className="h-4 w-4 rounded border border-line bg-surface accent-teal"
                        />
                      </td>
                      <td className="px-3 py-2 sm:px-4 sm:py-3">
                        <div>
                          <Link
                            href={`/w/${workspaceId}/subscribers/${s.id}`}
                            className="font-medium text-ink hover:text-teal-dark"
                          >
                            {s.email}
                          </Link>
                          <div className="mt-1 sm:hidden">
                            <SubscriberStatusBadge status={s.status} />
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2 sm:px-4 sm:py-3 hidden sm:table-cell">
                        <SubscriberStatusBadge status={s.status} />
                      </td>
                      <td className="px-3 py-2 sm:px-4 sm:py-3 text-ink-soft hidden md:table-cell">
                        {s.groups.length > 0 ? s.groups.map((g) => g.name).join(", ") : "—"}
                      </td>
                      <td className="px-3 py-2 sm:px-4 sm:py-3 text-ink-soft hidden lg:table-cell">
                        {new Date(s.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {hasMore && (
        <div className="flex justify-center">
          <Button
            variant="secondary"
            onClick={() => setCursor(data!.nextCursor!)}
            disabled={isLoading}
            className="gap-1"
          >
            Load more <ChevronDown size={16} />
          </Button>
        </div>
      )}

      {showAddDialog && (
        <AddSubscriberDialog workspaceId={workspaceId} onClose={() => setShowAddDialog(false)} />
      )}
      {showImportDialog && (
        <ImportSubscribersDialog workspaceId={workspaceId} onClose={() => setShowImportDialog(false)} />
      )}
    </div>
  );
}
