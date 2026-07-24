"use client";

import { useState } from "react";
import { Key } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, FieldError } from "@/components/ui/input";
import { useSendingSettings, useUpdateSendingSettings } from "@/lib/queries/settings";

export function SendingSettingsPage({
  workspaceId,
}: {
  workspaceId: string;
}) {
  const { data: settings, isLoading } = useSendingSettings(workspaceId);
  const updateSettings = useUpdateSendingSettings(workspaceId);

  const [apiKey, setApiKey] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await updateSettings.mutateAsync({ resendApiKey: apiKey });
    setApiKey("");
  }

  if (isLoading) {
    return <p className="text-sm text-ink-soft">Loading…</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-ink">Sending settings</h1>
        <p className="mt-1 text-sm text-ink-soft">Configure your email sending provider.</p>
      </div>

      <Card className="p-4 sm:p-5">
        <div className="flex items-start gap-3 mb-4">
          <div className="rounded-md bg-surface p-2 text-ink-soft">
            <Key size={18} />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-ink">Resend API key</h2>
            <p className="mt-0.5 text-sm text-ink-soft">
              Use a workspace-specific Resend API key for sending emails. If not set, the server will fall back to the global RESEND_API_KEY.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="resendApiKey">API key</Label>
            <Input
              id="resendApiKey"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={settings?.resendApiKeySet ? "Enter a new key to replace" : "re_..."}
              className="mt-1.5"
            />
            {settings?.resendApiKeySet && (
              <p className="mt-1 text-xs text-ink-soft">
                Key saved ({settings.resendApiKeyMasked}) — enter a new one to replace it.
              </p>
            )}
          </div>

          <FieldError>{updateSettings.error?.message}</FieldError>

          <div className="flex justify-end">
            <Button type="submit" disabled={updateSettings.isPending}>
              {updateSettings.isPending ? "Saving…" : "Save settings"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
