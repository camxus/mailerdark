"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input, Label, FieldError } from "@/components/ui/input";
import { useScheduleCampaign } from "@/lib/queries/campaigns";

export function ScheduleDialog({
  workspaceId,
  campaignId,
  onClose,
  onScheduled,
}: {
  workspaceId: string;
  campaignId: string;
  onClose: () => void;
  onScheduled: () => void;
}) {
  const [datetime, setDatetime] = useState("");
  const scheduleCampaign = useScheduleCampaign(workspaceId, campaignId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await scheduleCampaign.mutateAsync(new Date(datetime).toISOString());
    onScheduled();
  }

  return (
    <Modal title="Schedule send" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="datetime">Send at</Label>
          <Input
            id="datetime"
            type="datetime-local"
            value={datetime}
            onChange={(e) => setDatetime(e.target.value)}
            required
          />
          <p className="mt-1 text-xs text-ink-soft">In your browser&apos;s local time zone.</p>
        </div>
        <FieldError>{scheduleCampaign.error?.message}</FieldError>
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={scheduleCampaign.isPending}>
            {scheduleCampaign.isPending ? "Scheduling…" : "Schedule"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
