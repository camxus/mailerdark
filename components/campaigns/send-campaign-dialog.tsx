"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { apiFetch, ApiError } from "@/lib/api-fetch";
import {
  useSendCampaignNow,
  useContinueCampaignSending,
  useSendFailedCampaign,
  type CampaignRecipient,
} from "@/lib/queries/campaigns";

type Mode = "send" | "continue" | "failed";

const statusTone: Record<string, "neutral" | "green" | "red"> = {
  SENT: "green",
  FAILED: "red",
  QUEUED: "neutral",
  PENDING: "neutral",
};

export function SendCampaignDialog({
  workspaceId,
  campaignId,
  mode,
  onClose,
}: {
  workspaceId: string;
  campaignId: string;
  mode: Mode;
  onClose: () => void;
}) {
  const sendNow = useSendCampaignNow(workspaceId, campaignId);
  const continueSending = useContinueCampaignSending(workspaceId, campaignId);
  const sendFailed = useSendFailedCampaign(workspaceId, campaignId);

  const [logs, setLogs] = useState<CampaignRecipient[]>([]);
  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const title =
    mode === "send"
      ? "Send campaign"
      : mode === "continue"
      ? "Continue sending"
      : "Send to failed";

  const actionLabel =
    mode === "send"
      ? "Send now"
      : mode === "continue"
      ? "Continue Sending"
      : "Send to all failed";

  useEffect(() => {
    let active = true;
    async function loadInitial() {
      try {
        const rows = await apiFetch<CampaignRecipient[]>(
          `/api/workspaces/${workspaceId}/campaigns/${campaignId}/recipients`
        );
        if (!active) return;
        let filtered = rows;
        if (mode === "continue") {
          filtered = rows.filter((r) => r.status !== "SENT");
        }
        if (mode === "failed") {
          filtered = rows.filter((r) => r.status === "FAILED");
        }
        setLogs(filtered);
        setSelectedEmails(new Set(filtered.map((r) => r.email)));
      } catch (cause) {
        if (!active) return;
        setError(
          cause instanceof Error ? cause.message : "Failed to load recipients."
        );
      }
    }
    loadInitial();
    return () => {
      active = false;
    };
  }, [workspaceId, campaignId, mode]);

  useEffect(() => {
    if (!loading || done) return;
    const interval = setInterval(async () => {
      try {
        const rows = await apiFetch<CampaignRecipient[]>(
          `/api/workspaces/${workspaceId}/campaigns/${campaignId}/recipients`
        );
        setLogs((prev) => {
          const prevEmails = new Set(prev.map((r) => r.email));
          const selectedRows = rows
            .filter((r) => selectedEmails.has(r.email))
            .map((r) => ({ ...r }));
          const addedSelected = selectedRows.filter((r) => !prevEmails.has(r.email));
          const addedSend =
            mode === "send"
              ? rows.filter((r) => !prevEmails.has(r.email))
              : [];
          const added = [...addedSelected, ...addedSend];
          if (added.length === 0) return prev;
          return [...prev, ...added];
        });
      } catch {
        // ignore transient polling errors while sending
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [loading, done, workspaceId, campaignId, selectedEmails, mode]);

  const completed = useMemo(() => {
    return logs.filter((r) => selectedEmails.has(r.email) && (r.status === "SENT" || r.status === "FAILED")).length;
  }, [logs, selectedEmails]);

  const progressTotal = selectedEmails.size > 0 ? selectedEmails.size : logs.length;
  const progressValue = progressTotal > 0 ? completed : 0;

  async function startSending() {
    setLoading(true);
    setDone(false);
    setError(null);

    try {
      if (mode === "send") {
        await sendNow.mutateAsync();
      } else if (mode === "continue") {
        await continueSending.mutateAsync(Array.from(selectedEmails));
      } else {
        await sendFailed.mutateAsync();
      }
      setDone(true);
    } catch (cause) {
      const message =
        cause instanceof ApiError
          ? cause.message
          : cause instanceof Error
          ? cause.message
          : "Send failed.";
      setError(message);
      setDone(false);
    } finally {
      setLoading(false);
    }
  }

  function toggleEmail(email: string) {
    setSelectedEmails((prev) => {
      const next = new Set(prev);
      if (next.has(email)) next.delete(email);
      else next.add(email);
      return next;
    });
  }

  return (
    <Modal title={title} onClose={onClose}>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-ink-soft">
            {mode === "continue"
              ? `${selectedEmails.size} recipients selected`
              : mode === "failed"
              ? `${logs.filter((r) => selectedEmails.has(r.email)).length} failed recipients`
              : `${logs.filter((r) => selectedEmails.has(r.email)).length} target recipients`}
          </p>
          {loading && (
            <div className="flex items-center gap-2 text-xs text-ink-soft">
              <Loader2 className="h-4 w-4 animate-spin" />
              Sending…
            </div>
          )}
        </div>

        {loading && progressTotal > 0 && (
          <ProgressBar value={progressValue} max={progressTotal} />
        )}

        {error && (
          <div className="rounded-md bg-red-soft p-3 text-sm text-red">{error}</div>
        )}

        <div className="max-h-72 overflow-auto rounded-md border border-line">
          <table className="w-full text-sm">
            <thead className="border-b border-line bg-canvas text-left text-xs uppercase tracking-wide text-ink-soft">
              <tr>
                <th className="w-10 px-3 py-2">
                  {mode === "continue" && !loading && (
                    <span className="sr-only">Select</span>
                  )}
                </th>
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2 hidden sm:table-cell">Error</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {logs.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-3 py-6 text-center text-ink-soft">
                    {mode === "continue"
                      ? "No remaining recipients."
                      : mode === "failed"
                      ? "No failed recipients."
                      : "No recipients found."}
                  </td>
                </tr>
              )}
              {logs
                .filter((r) => selectedEmails.has(r.email))
                .map((r) => (
                  <tr key={r.id} className="hover:bg-canvas">
                    <td className="px-3 py-2">
                      {mode === "continue" && !done && (
                        <input
                          type="checkbox"
                          checked
                          onChange={() => toggleEmail(r.email)}
                          className="h-4 w-4 rounded border-line text-teal"
                        />
                      )}
                    </td>
                    <td className="px-3 py-2 text-ink">{r.email}</td>
                    <td className="px-3 py-2">
                      <Badge tone={statusTone[r.status] ?? "neutral"}>
                        {r.status.toLowerCase()}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-xs text-ink-soft hidden sm:table-cell">
                      {r.error ?? "—"}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Close
          </Button>
          {!done && (
            <Button
              onClick={startSending}
              disabled={loading || (mode !== "send" && progressTotal === 0)}
            >
              {actionLabel}
            </Button>
          )}
          {done && (
            <Button
              variant="secondary"
              onClick={onClose}
              disabled={sendNow.isPending || continueSending.isPending || sendFailed.isPending}
            >
              Done
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
