import type { WorkspaceContext } from "./types";
import { db } from "@/lib/db";
import { campaignTemplates } from "@/lib/templates/campaign-templates";
import { automationTemplates } from "@/lib/templates/automation-templates";

export async function loadWorkspaceContext(workspaceId: string): Promise<WorkspaceContext> {
  const [groups, campaigns, automations] = await Promise.all([
    db.group.findMany({
      where: { workspaceId },
      select: { id: true, name: true },
    }),
    db.campaign.findMany({
      where: { workspaceId },
      select: { id: true, subject: true },
      take: 50,
    }),
    db.automation.findMany({
      where: { workspaceId },
      select: { id: true, name: true },
      take: 50,
    }),
  ]);

  return {
    groups: groups.map((g) => ({ id: g.id, name: g.name })),
    campaigns: campaigns.map((c) => ({ id: c.id, name: c.subject, subject: c.subject })),
    automations: automations.map((a) => ({ id: a.id, name: a.name })),
    templates: [
      ...campaignTemplates.map((t) => ({ id: t.id, name: t.name, category: t.category })),
      ...automationTemplates.map((t) => ({ id: t.id, name: t.name, category: "automation" })),
    ],
  };
}