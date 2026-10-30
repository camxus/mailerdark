"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCampaignRecipients, useExportCampaign, type CampaignRecipient } from "@/lib/queries/campaigns";
import type { CampaignStats } from "@/lib/queries/campaigns";

type StatusFilter = "all" | "sent" | "failed" | "non_receiver";

const statusTone: Record<string, "neutral" | "teal" | "green" | "red" | "amber"> = {
  SENT: "green",
  FAILED: "red",
  BOUNCED: "amber",
  QUEUED: "neutral",
};

export function CampaignStatsModal({
  workspaceId,
  campaignId,
  stats,
  onClose,
}: {
  workspaceId: string;
  campaignId: string;
  stats: CampaignStats;
  onClose: () => void;
}) {
  const [filter, setFilter] = useState<StatusFilter>("all");
  const { data: recipients } = useCampaignRecipients(workspaceId, campaignId);
  const exportCsv = useExportCampaign(workspaceId, campaignId);

  const filtered = recipients?.filter((r) => {
    if (filter === "all") return true;
    if (filter === "sent") return r.status === "SENT";
    if (filter === "failed") return r.status === "FAILED";
    if (filter === "non_receiver") return r.status !== "SENT";
    return true;
  });

  return (
    <Modal title="Campaign stats" onClose={onClose}>
      <div className="space-y-5">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-md border border-line bg-canvas p-3">
            <p className="text-xs text-ink-soft">Sent</p>
            <p className="mt-1 text-lg font-semibold text-ink">{stats.sent}</p>
          </div>
          <div className="rounded-md border border-line bg-canvas p-3">
            <p className="text-xs text-ink-soft">Failed</p>
            <p className="mt-1 text-lg font-semibold text-ink">{stats.failed}</p>
          </div>
          <div className="rounded-md border border-line bg-canvas p-3">
            <p className="text-xs text-ink-soft">Opens</p>
            <p className="mt-1 text-lg font-semibold text-ink">{stats.uniqueOpens}</p>
          </div>
          <div className="rounded-md border border-line bg-canvas p-3">
            <p className="text-xs text-ink-soft">Clicks</p>
            <p className="mt-1 text-lg font-semibold text-ink">{stats.uniqueClicks}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {([
            { key: "all", label: "All" },
            { key: "sent", label: "Sent" },
            { key: "failed", label: "Failed" },
            { key: "non_receiver", label: "Non-receivers" },
          ] as { key: StatusFilter; label: string }[]).map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                filter === f.key
                  ? "bg-teal text-white"
                  : "bg-surface border border-line text-ink hover:bg-canvas"
              }`}
            >
              {f.label}
            </button>
          ))}
          <div className="flex-1" />
          <Button
            variant="secondary"
            onClick={() => exportCsv.mutate()}
            disabled={exportCsv.isPending}
          >
            {exportCsv.isPending ? "Exporting…" : "Export CSV"}
          </Button>
        </div>

        <div className="table-container">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-ink-soft">
                <th className="px-3 py-2 font-medium">Email</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium hidden sm:table-cell">Sent At</th>
                <th className="px-3 py-2 font-medium text-right">Opens</th>
                <th className="px-3 py-2 font-medium text-right">Clicks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {filtered?.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-sm text-ink-soft">
                    No recipients match this filter.
                  </td>
                </tr>
              )}
              {filtered?.map((r) => (
                <tr key={r.id} className="hover:bg-canvas">
                  <td className="px-3 py-2 text-ink">{r.email}</td>
                  <td className="px-3 py-2">
                    <Badge tone={statusTone[r.status] ?? "neutral"}>{r.status.toLowerCase()}</Badge>
                  </td>
                  <td className="px-3 py-2 text-ink-soft hidden sm:table-cell">
                    {r.sentAt ? new Date(r.sentAt).toLocaleString() : "—"}
                  </td>
                  <td className="px-3 py-2 text-right text-ink-soft">{r.opens}</td>
                  <td className="px-3 py-2 text-right text-ink-soft">{r.clicks}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Modal>
  );
}
