"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import {
  Users,
  ListTree,
  Send,
  Workflow,
  Settings,
  ChevronsUpDown,
  LogOut,
  LayoutDashboard,
  Menu,
  X,
} from "lucide-react";
import { cx } from "@/lib/cx";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

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
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Close mobile nav on route change
  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  return (
    <div className="flex min-h-screen bg-canvas">
      {/* Mobile overlay */}
      {mobileNavOpen && (
        <div 
          className="fixed inset-0 z-40 bg-ink/50 lg:hidden"
          onClick={() => setMobileNavOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cx(
        "fixed inset-y-0 left-0 z-50 w-64 flex flex-col border-r border-line bg-surface transition-transform lg:relative lg:translate-x-0 lg:w-60",
        mobileNavOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="border-b border-line p-4 flex items-center justify-between lg:hidden">
          <span className="text-lg font-semibold tracking-tight text-ink">Mailerdark</span>
          <button
            onClick={() => setMobileNavOpen(false)}
            className="rounded-md p-1.5 text-ink-soft hover:bg-canvas"
          >
            <X size={18} />
          </button>
        </div>
        <div className="hidden lg:block border-b border-line p-4">
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
        <div className="lg:hidden border-t border-line p-3">
          <WorkspaceSwitcher current={workspace} workspaces={workspaces} />
        </div>
        <UserMenu email={userEmail} />
      </aside>

      {/* Mobile header */}
      <header className="fixed top-0 left-0 right-0 z-30 flex h-14 items-center justify-between border-b border-line bg-surface px-4 lg:hidden">
        <button
          onClick={() => setMobileNavOpen(true)}
          className="rounded-md p-1.5 text-ink-soft hover:bg-canvas"
        >
          <Menu size={20} />
        </button>
        <span className="text-lg font-semibold tracking-tight text-ink">Mailerdark</span>
        <div className="w-9">{/* spacer */}</div>
      </header>

      <main className="flex-1 overflow-y-auto pt-14 lg:pt-0">
        <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</div>
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
