"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input, Label, FieldError } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useTestSendCampaign } from "@/lib/queries/campaigns";

export function TestSendDialog({
  workspaceId,
  campaignId,
  onClose,
}: {
  workspaceId: string;
  campaignId: string;
  onClose: () => void;
}) {
  const [emails, setEmails] = useState("");
  const testSend = useTestSendCampaign(workspaceId, campaignId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const list = emails
      .split(",")
      .map((e) => e.trim())
      .filter(Boolean);
    await testSend.mutateAsync(list);
  }

  return (
    <Modal title="Send a test email" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="emails">Test addresses</Label>
          <Input
            id="emails"
            value={emails}
            onChange={(e) => setEmails(e.target.value)}
            placeholder="you@example.com, teammate@example.com"
            required
          />
          <p className="mt-1 text-xs text-ink-soft">Comma-separated, up to 10 addresses.</p>
        </div>

        <FieldError>{testSend.error?.message}</FieldError>

        {testSend.data && (
          <ul className="space-y-1 text-sm">
            {testSend.data.results.map((r) => (
              <li key={r.email} className="flex items-center justify-between">
                <span className="text-ink">{r.email}</span>
                <Badge tone={r.ok ? "green" : "red"}>{r.ok ? "sent" : r.error ?? "failed"}</Badge>
              </li>
            ))}
          </ul>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="secondary" onClick={onClose}>
            Close
          </Button>
          <Button type="submit" disabled={testSend.isPending}>
            {testSend.isPending ? "Sending…" : "Send test"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
