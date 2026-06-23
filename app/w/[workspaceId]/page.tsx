import Link from "next/link";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { SubscriberStatusBadge } from "@/components/ui/badge";

export default async function DashboardHomePage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;

  const [subscriberCount, subscribedCount, groupCount, recentSubscribers] = await Promise.all([
    db.subscriber.count({ where: { workspaceId } }),
    db.subscriber.count({ where: { workspaceId, status: "SUBSCRIBED" } }),
    db.group.count({ where: { workspaceId } }),
    db.subscriber.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-ink">Dashboard</h1>
        <p className="mt-1 text-sm text-ink-soft">A quick look at your audience.</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Total subscribers" value={subscriberCount} />
        <StatCard label="Subscribed" value={subscribedCount} />
        <StatCard label="Groups" value={groupCount} />
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-ink">Recently added</h2>
          <Link href={`/w/${workspaceId}/subscribers`} className="text-sm font-medium text-teal hover:text-teal-dark">
            View all
          </Link>
        </div>
        <Card>
          {recentSubscribers.length === 0 ? (
            <p className="p-6 text-sm text-ink-soft">No subscribers yet.</p>
          ) : (
            <ul className="divide-y divide-line">
              {recentSubscribers.map((s) => (
                <li key={s.id} className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm text-ink">{s.email}</span>
                  <SubscriberStatusBadge status={s.status} />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card className="p-4">
      <p className="text-sm text-ink-soft">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-ink">{value.toLocaleString()}</p>
    </Card>
  );
}
