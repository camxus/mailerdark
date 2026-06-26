"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  Users,
  ListTree,
  Send,
  Workflow,
  Settings,
  ChevronsUpDown,
  LogOut,
  LayoutDashboard,
} from "lucide-react";
import { cx } from "@/lib/cx";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { FloatingInput } from "@/components/ai/floating-input";

type WorkspaceLite = { id: string; name: string; slug: string };

const navItems = (workspaceId: string) => [
  { href: `/w/${workspaceId}`, label: "Dashboard", icon: LayoutDashboard },
  { href: `/w/${workspaceId}/subscribers`, label: "Subscribers", icon: Users },
  { href: `/w/${workspaceId}/groups`, label: "Groups", icon: ListTree },
  { href: `/w/${workspaceId}/campaigns`, label: "Campaigns", icon: Send },
  { href: `/w/${workspaceId}/automations`, label: "Automations", icon: Workflow },
  { href: `/w/${workspaceId}/settings`, label: "Settings", icon: Settings },
];

export function DashboardShell({
  workspace,
  workspaces,
  userEmail,
  children,
}: {
  workspace: WorkspaceLite;
  workspaces: WorkspaceLite[];
  userEmail: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen bg-canvas">
      <aside className="flex w-60 flex-col border-r border-line bg-surface">
        <div className="border-b border-line p-4">
          <WorkspaceSwitcher current={workspace} workspaces={workspaces} />
        </div>
        <nav className="flex-1 space-y-0.5 p-3">
          {navItems(workspace.id).map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== `/w/${workspace.id}` && pathname.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cx(
                  "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium transition-colors",
                  active ? "bg-teal-soft text-teal-dark" : "text-ink-soft hover:bg-canvas hover:text-ink"
                )}
              >
                <Icon size={17} strokeWidth={2} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <UserMenu email={userEmail} />
      </aside>
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-5xl px-8 py-8">{children}</div>
        <FloatingInput workspaceId={workspace.id} />
      </main>
    </div>
  );
}

function WorkspaceSwitcher({
  current,
  workspaces,
}: {
  current: WorkspaceLite;
  workspaces: WorkspaceLite[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left hover:bg-canvas"
      >
        <span className="truncate font-semibold text-ink">{current.name}</span>
        <ChevronsUpDown size={15} className="text-ink-soft" />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-10 mt-1 w-full rounded-md border border-line bg-surface py-1 shadow-md">
          {workspaces.map((w) => (
            <button
              key={w.id}
              onClick={() => {
                setOpen(false);
                router.push(`/w/${w.id}`);
              }}
              className={cx(
                "block w-full truncate px-3 py-1.5 text-left text-sm hover:bg-canvas",
                w.id === current.id ? "font-medium text-teal-dark" : "text-ink"
              )}
            >
              {w.name}
            </button>
          ))}
          <Link
            href="/onboarding"
            className="block w-full border-t border-line px-3 py-1.5 text-left text-sm text-ink-soft hover:bg-canvas"
          >
            + New workspace
          </Link>
        </div>
      )}
    </div>
  );
}

function UserMenu({ email }: { email: string }) {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/sign-in");
    router.refresh();
  }

  return (
    <div className="flex items-center justify-between border-t border-line p-3">
      <span className="truncate text-sm text-ink-soft">{email}</span>
      <button
        onClick={handleSignOut}
        className="rounded-md p-1.5 text-ink-soft hover:bg-canvas hover:text-ink"
        title="Sign out"
      >
        <LogOut size={16} />
      </button>
    </div>
  );
}
