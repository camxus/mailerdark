"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCreateWorkspace, useWorkspaces } from "@/lib/queries/workspaces";
import { Button } from "@/components/ui/button";
import { Input, Label, FieldError } from "@/components/ui/input";
import { AuthShell } from "@/components/auth-shell";

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export default function OnboardingPage() {
  const router = useRouter();
  const { data: workspaces, isLoading } = useWorkspaces();
  const createWorkspace = useCreateWorkspace();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);

  // Already have a workspace (e.g. revisiting /onboarding) — skip ahead.
  useEffect(() => {
    if (!isLoading && workspaces && workspaces.length > 0) {
      router.replace(`/w/${workspaces[0].id}`);
    }
  }, [isLoading, workspaces, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const workspace = await createWorkspace.mutateAsync({ name, slug });
    router.push(`/w/${workspace.id}`);
  }

  return (
    <AuthShell title="Create your workspace">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="name">Workspace name</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (!slugTouched) setSlug(slugify(e.target.value));
            }}
            placeholder="Acme Inc."
            required
          />
        </div>
        <div>
          <Label htmlFor="slug">Workspace URL</Label>
          <div className="flex items-center gap-1.5 text-sm text-ink-soft">
            <span>mailerdark.app/w/</span>
            <Input
              id="slug"
              value={slug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(slugify(e.target.value));
              }}
              required
            />
          </div>
        </div>
        <FieldError>{createWorkspace.error?.message}</FieldError>
        <Button type="submit" disabled={createWorkspace.isPending} className="w-full">
          {createWorkspace.isPending ? "Creating…" : "Create workspace"}
        </Button>
      </form>
    </AuthShell>
  );
}
