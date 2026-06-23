"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, FieldError } from "@/components/ui/input";
import { useMembers, useAddMember } from "@/lib/queries/members";

export function MembersPage({ workspaceId }: { workspaceId: string }) {
  const { data: members, isLoading } = useMembers(workspaceId);
  const addMember = useAddMember(workspaceId);
  const [email, setEmail] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await addMember.mutateAsync({ email, role: "MEMBER" });
    setEmail("");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-ink">Members</h1>
        <p className="mt-1 text-sm text-ink-soft">People with access to this workspace.</p>
      </div>

      <Card>
        {isLoading ? (
          <p className="p-6 text-sm text-ink-soft">Loading…</p>
        ) : (
          <ul className="divide-y divide-line">
            {members?.map((m) => (
              <li key={m.userId} className="flex items-center justify-between px-4 py-3">
                <span className="text-sm text-ink">{m.email}</span>
                <Badge tone={m.role === "OWNER" ? "teal" : "neutral"}>{m.role.toLowerCase()}</Badge>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="p-4">
        <h2 className="mb-1 text-sm font-semibold text-ink">Add a member</h2>
        <p className="mb-3 text-sm text-ink-soft">
          They need a Mailerdark account already — invite-by-email for new accounts arrives once
          outbound sending is wired up.
        </p>
        <form onSubmit={handleSubmit} className="flex items-start gap-2">
          <div className="flex-1">
            <Input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="teammate@example.com"
            />
            <FieldError>{addMember.error?.message}</FieldError>
          </div>
          <Button type="submit" disabled={addMember.isPending}>
            {addMember.isPending ? "Adding…" : "Add"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
