"use client";

import { useState } from "react";
import { Plus, Trash2, RefreshCw, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, EmptyState } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { Input, Label, FieldError } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  useDomains, useAddDomain, useVerifyDomain, useDeleteDomain,
  type SendingDomain, type DnsStatus, type DnsRecord,
} from "@/lib/queries/domains";

const statusTone: Record<DnsStatus, "amber" | "green" | "red"> = {
  PENDING: "amber",
  VALID: "green",
  INVALID: "red",
};

export function DomainsPage({ workspaceId }: { workspaceId: string }) {
  const { data: domains, isLoading } = useDomains(workspaceId);
  const deleteDomain = useDeleteDomain(workspaceId);
  const [showAdd, setShowAdd] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-ink">Sending domains</h1>
          <p className="mt-1 text-sm text-ink-soft">
            Verify SPF, DKIM, and DMARC so your campaigns land in the inbox, not spam.
          </p>
        </div>
        <Button onClick={() => setShowAdd(true)}>
          <Plus size={16} /> Add domain
        </Button>
      </div>

      <Card>
        {isLoading ? (
          <p className="p-6 text-sm text-ink-soft">Loading…</p>
        ) : !domains || domains.length === 0 ? (
          <EmptyState
            title="No sending domains yet"
            description="Add the domain you'll send campaigns from to set up SPF, DKIM, and DMARC."
            action={<Button onClick={() => setShowAdd(true)}>Add domain</Button>}
          />
        ) : (
          <ul className="divide-y divide-line">
            {domains.map((d) => (
              <DomainRow
                key={d.id}
                workspaceId={workspaceId}
                domain={d}
                expanded={expandedId === d.id}
                onToggleExpand={() => setExpandedId(expandedId === d.id ? null : d.id)}
                onDelete={() => {
                  if (confirm(`Remove ${d.domain}? Campaigns can no longer send from this domain.`)) {
                    deleteDomain.mutate(d.id);
                  }
                }}
              />
            ))}
          </ul>
        )}
      </Card>

      {showAdd && <AddDomainDialog workspaceId={workspaceId} onClose={() => setShowAdd(false)} />}
    </div>
  );
}

function DomainRow({
  workspaceId,
  domain,
  expanded,
  onToggleExpand,
  onDelete,
}: {
  workspaceId: string;
  domain: SendingDomain;
  expanded: boolean;
  onToggleExpand: () => void;
  onDelete: () => void;
}) {
  const verifyDomain = useVerifyDomain(workspaceId);

  return (
    <li>
      <div className="flex items-center justify-between px-4 py-3">
        <button onClick={onToggleExpand} className="flex-1 text-left">
          <p className="text-sm font-medium text-ink">{domain.domain}</p>
          <div className="mt-1 flex gap-1.5">
            <Badge tone={statusTone[domain.spfStatus]}>SPF {domain.spfStatus.toLowerCase()}</Badge>
            <Badge tone={statusTone[domain.dkimStatus]}>DKIM {domain.dkimStatus.toLowerCase()}</Badge>
            <Badge tone={statusTone[domain.dmarcStatus]}>DMARC {domain.dmarcStatus.toLowerCase()}</Badge>
          </div>
        </button>
        <div className="flex items-center gap-1">
          <button
            onClick={() => verifyDomain.mutate(domain.id)}
            disabled={verifyDomain.isPending}
            className="rounded-md p-1.5 text-ink-soft hover:bg-canvas hover:text-ink"
            title="Re-check DNS"
          >
            <RefreshCw size={15} className={verifyDomain.isPending ? "animate-spin" : ""} />
          </button>
          <button onClick={onDelete} className="rounded-md p-1.5 text-ink-soft hover:bg-red-soft hover:text-red">
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      {verifyDomain.error && (
        <p className="px-4 pb-2 text-xs text-red">{verifyDomain.error.message}</p>
      )}

      {expanded && domain.dnsRecords && (
        <div className="border-t border-line bg-canvas px-4 py-3">
          <p className="mb-2 text-xs text-ink-soft">
            Add these records at your DNS provider, then click the refresh icon above to re-check.
          </p>
          <div className="space-y-2">
            {domain.dnsRecords.map((record, i) => (
              <DnsRecordRow key={i} record={record} />
            ))}
          </div>
        </div>
      )}
    </li>
  );
}

function DnsRecordRow({ record }: { record: DnsRecord }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(record.value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="grid grid-cols-[60px_1fr_auto] items-center gap-2 rounded-md border border-line bg-surface px-2.5 py-1.5 text-xs">
      <span className="font-mono font-semibold text-ink-soft">{record.type}</span>
      <div className="min-w-0">
        <p className="truncate font-mono text-ink">{record.name}</p>
        <p className="truncate font-mono text-ink-soft">{record.value}</p>
      </div>
      <button onClick={handleCopy} className="rounded p-1 text-ink-soft hover:bg-canvas" title="Copy value">
        {copied ? <Check size={13} className="text-green" /> : <Copy size={13} />}
      </button>
    </div>
  );
}

function AddDomainDialog({ workspaceId, onClose }: { workspaceId: string; onClose: () => void }) {
  const [domain, setDomain] = useState("");
  const addDomain = useAddDomain(workspaceId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await addDomain.mutateAsync(domain);
    onClose();
  }

  return (
    <Modal title="Add a sending domain" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="domain">Domain</Label>
          <Input
            id="domain"
            required
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            placeholder="mail.yourcompany.com"
          />
          <p className="mt-1 text-xs text-ink-soft">
            A subdomain (like <span className="font-mono">mail.</span> or <span className="font-mono">send.</span>)
            is recommended so this doesn&apos;t affect your main domain&apos;s email.
          </p>
        </div>
        <FieldError>{addDomain.error?.message}</FieldError>
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={addDomain.isPending}>
            {addDomain.isPending ? "Adding…" : "Add domain"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
