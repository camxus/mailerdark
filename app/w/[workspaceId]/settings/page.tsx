import Link from "next/link";
import { Card } from "@/components/ui/card";
import { ArrowRight } from "lucide-react";

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;

  const sections = [
    {
      href: `/w/${workspaceId}/settings/fields`,
      title: "Custom fields",
      description: "Define the data points you track about each subscriber.",
      available: true,
    },
    {
      href: `/w/${workspaceId}/settings/members`,
      title: "Members",
      description: "Manage who has access to this workspace.",
      available: true,
    },
    {
      href: `/w/${workspaceId}/settings/domains`,
      title: "Sending domains",
      description: "Verify SPF/DKIM/DMARC for your sending domain.",
      available: true,
    },
    {
      href: `/w/${workspaceId}/settings/api`,
      title: "API & documentation",
      description: "API keys and interactive API reference.",
      available: true,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-ink">Settings</h1>
        <p className="mt-1 text-sm text-ink-soft">Workspace configuration.</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {sections.map((s) => (
          <Card key={s.href} className="p-4">
            {s.available ? (
              <Link href={s.href} className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-ink">{s.title}</p>
                  <p className="mt-1 text-sm text-ink-soft">{s.description}</p>
                </div>
                <ArrowRight size={16} className="mt-1 shrink-0 text-ink-soft" />
              </Link>
            ) : (
              <div className="opacity-60">
                <p className="font-medium text-ink">{s.title}</p>
                <p className="mt-1 text-sm text-ink-soft">{s.description}</p>
                <p className="mt-2 text-xs font-medium text-amber">Coming in a later build phase</p>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
