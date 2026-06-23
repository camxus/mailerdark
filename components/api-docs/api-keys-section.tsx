"use client";

import { useState } from "react";
import { Plus, Trash2, Copy, Check, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { Input, Label, FieldError } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useApiKeys, useCreateApiKey, useRevokeApiKey, type CreatedApiKey } from "@/lib/queries/api-keys";
import { ALL_SCOPES, type ApiScope } from "@/lib/api-keys/generate";

export function ApiKeysSection({
  workspaceId,
  onKeyCreated,
}: {
  workspaceId: string;
  onKeyCreated?: (rawKey: string) => void;
}) {
  const { data: keys, isLoading } = useApiKeys(workspaceId);
  const revokeKey = useRevokeApiKey(workspaceId);
  const [showCreate, setShowCreate] = useState(false);
  const [revealedKey, setRevealedKey] = useState<CreatedApiKey | null>(null);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-ink">API keys</h2>
          <p className="text-sm text-ink-soft">Used to authenticate requests to the API below.</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus size={16} /> New key
        </Button>
      </div>

      <Card>
        {isLoading ? (
          <p className="p-6 text-sm text-ink-soft">Loading…</p>
        ) : !keys || keys.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <KeyRound size={20} className="text-ink-soft" />
            <p className="text-sm text-ink-soft">No API keys yet — create one to start calling the API.</p>
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {keys.map((k) => (
              <li key={k.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-ink">{k.name}</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {k.scopes.map((s) => (
                      <Badge key={s} tone="neutral">{s}</Badge>
                    ))}
                  </div>
                  <p className="mt-1 text-xs text-ink-soft">
                    {k.lastUsedAt ? `Last used ${new Date(k.lastUsedAt).toLocaleDateString()}` : "Never used"}
                  </p>
                </div>
                <button
                  onClick={() => {
                    if (confirm(`Revoke "${k.name}"? Any integration using it will stop working immediately.`)) {
                      revokeKey.mutate(k.id);
                    }
                  }}
                  className="rounded-md p-1.5 text-ink-soft hover:bg-red-soft hover:text-red"
                >
                  <Trash2 size={15} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {showCreate && (
        <CreateKeyDialog
          workspaceId={workspaceId}
          onClose={() => setShowCreate(false)}
          onCreated={(key) => {
            setShowCreate(false);
            setRevealedKey(key);
            onKeyCreated?.(key.rawKey);
          }}
        />
      )}

      {revealedKey && <RevealKeyDialog apiKey={revealedKey} onClose={() => setRevealedKey(null)} />}
    </div>
  );
}

function CreateKeyDialog({
  workspaceId,
  onClose,
  onCreated,
}: {
  workspaceId: string;
  onClose: () => void;
  onCreated: (key: CreatedApiKey) => void;
}) {
  const [name, setName] = useState("");
  const [scopes, setScopes] = useState<ApiScope[]>(["subscribers:read"]);
  const createKey = useCreateApiKey(workspaceId);

  function toggleScope(scope: ApiScope) {
    setScopes((prev) => (prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const key = await createKey.mutateAsync({ name, scopes });
    onCreated(key);
  }

  return (
    <Modal title="New API key" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="name">Name</Label>
          <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Zapier integration" />
        </div>
        <div>
          <Label>Scopes</Label>
          <div className="space-y-1.5">
            {ALL_SCOPES.map((scope) => (
              <label key={scope} className="flex items-center gap-2 text-sm text-ink">
                <input
                  type="checkbox"
                  checked={scopes.includes(scope)}
                  onChange={() => toggleScope(scope)}
                  className="rounded border-line"
                />
                <span className="font-mono text-xs">{scope}</span>
              </label>
            ))}
          </div>
        </div>
        <FieldError>{createKey.error?.message}</FieldError>
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={createKey.isPending || scopes.length === 0}>
            {createKey.isPending ? "Creating…" : "Create key"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function RevealKeyDialog({ apiKey, onClose }: { apiKey: CreatedApiKey; onClose: () => void }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(apiKey.rawKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <Modal title="Your new API key" onClose={onClose}>
      <div className="space-y-3">
        <p className="text-sm text-ink-soft">
          Copy this now — for your security, it won&apos;t be shown again.
        </p>
        <div className="flex items-center gap-2 rounded-md border border-line bg-canvas px-3 py-2">
          <code className="flex-1 overflow-x-auto whitespace-nowrap font-mono text-xs text-ink">{apiKey.rawKey}</code>
          <button onClick={handleCopy} className="shrink-0 rounded p-1 text-ink-soft hover:bg-surface">
            {copied ? <Check size={15} className="text-green" /> : <Copy size={15} />}
          </button>
        </div>
        <div className="flex justify-end pt-1">
          <Button onClick={onClose}>Done</Button>
        </div>
      </div>
    </Modal>
  );
}
