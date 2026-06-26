import type { AIPlan } from "@/lib/ai/types";
import { db } from "@/lib/db";
import { AUTOMATION_FLOW_PROMPT, CAMPAIGN_EMAIL_PROMPT } from "../prompts";

export async function createCampaign(plan: AIPlan, workspaceId: string): Promise<{ id: string; name: string }> {
  const name = `AI: ${plan.summary}`;

  const htmlContent = await generateCampaignEmail(plan, workspaceId);

  const campaign = await db.campaign.create({
    data: {
      workspaceId,
      subject: name,
      fromName: "Marketing Team",
      fromEmail: "marketing@company.com",
      htmlContent,
      status: "DRAFT",
      audience: plan.extracted.audience ? { groupId: plan.extracted.audience as string } : {},
    },
  });
  return { id: campaign.id, name: campaign.subject };
}

async function generateCampaignEmail(plan: AIPlan, workspaceId: string): Promise<string> {
  const topic = (plan.extracted.topic as string) || plan.summary;
  const type = (plan.extracted.type as string) || "general";
  const settings = await db.workspaceSettings.findUnique({ where: { workspaceId } });
  const apiKey = settings?.aiMode === "custom" ? settings?.customKey : settings?.openRouterKey;
  const model = settings?.selectedModel ?? "openai/gpt-4o-mini";

  const prompt = CAMPAIGN_EMAIL_PROMPT.replace("{type}", type).replace("{topic}", topic);

  if (apiKey) {
    const endpoint = settings?.aiMode === "custom"
      ? (settings?.customEndpoint?.replace(/\/$/, "") ?? "") + "/chat/completions"
      : "https://openrouter.ai/api/v1/chat/completions";

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: prompt },
          ],
          temperature: 0.7,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        return result.choices[0]?.message?.content?.trim() || fallbackCampaignEmail(type, topic);
      }
    } catch {
      // Fall through to fallback
    }
  }

  return fallbackCampaignEmail(type, topic);
}

function fallbackCampaignEmail(type: string, topic: string): string {
  return `<html><body><h1>${type} - ${topic}</h1><p>Email content will go here.</p><p style="color:#4b5358;font-size:12px;">[Unsubscribe]</p></body></html>`;
}

export async function createAutomation(plan: AIPlan, workspaceId: string): Promise<{ id: string; name: string }> {
  const name = `AI: ${plan.summary}`;

  const flowDefinition = await generateAutomationFlow(plan, workspaceId);

  const automation = await db.automation.create({
    data: {
      workspaceId,
      name,
      status: "DRAFT",
      triggerType: (plan.extracted.trigger as "SUBSCRIBER_CREATED" | "DATE_BASED" | null) ?? "SUBSCRIBER_CREATED",
      flowDefinition: JSON.parse(JSON.stringify(flowDefinition)),
    },
  });
  return { id: automation.id, name: automation.name };
}

async function generateAutomationFlow(plan: AIPlan, workspaceId: string) {
  const settings = await db.workspaceSettings.findUnique({ where: { workspaceId } });
  const apiKey = settings?.aiMode === "custom" ? settings?.customKey : settings?.openRouterKey;

  if (apiKey) {
    const endpoint = settings?.aiMode === "custom"
      ? (settings?.customEndpoint?.replace(/\/$/, "") ?? "") + "/chat/completions"
      : "https://openrouter.ai/api/v1/chat/completions";

    const prompt = AUTOMATION_FLOW_PROMPT.replace("{request}", plan.summary);

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: settings?.selectedModel ?? "openai/gpt-4o-mini",
          messages: [
            { role: "system", content: prompt },
          ],
          temperature: 0.5,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        const content = result.choices[0]?.message?.content?.trim();
        try {
          const parsed = JSON.parse(content) as { nodes: unknown[]; edges: unknown[] };
          return parsed;
        } catch {
          // Fall through to fallback
        }
      }
    } catch {
      // Fall through to fallback
    }
  }

  return {
    nodes: [
      { id: "trigger-1", type: "trigger", position: { x: 250, y: 40 }, data: { type: "trigger", triggerType: "SUBSCRIBER_CREATED" } },
      { id: "send-1", type: "sendEmail", position: { x: 250, y: 140 }, data: { subject: plan.summary, htmlContent: `<p>Automation: ${plan.summary}</p>` } },
    ],
    edges: [{ source: "trigger-1", target: "send-1" }],
  };
}

export async function searchSubscribers(plan: AIPlan, workspaceId: string): Promise<Array<{ id: string; email: string; status: string }>> {
  const where: Record<string, unknown> = { workspaceId };

  if (plan.extracted.status === "inactive") {
    where.status = { in: ["UNSUBSCRIBED", "BOUNCED", "CLEANED"] };
  }

  const subscribers = await db.subscriber.findMany({
    where,
    select: { id: true, email: true, status: true },
    take: 100,
  });
  return subscribers;
}

export async function createGroup(plan: AIPlan, workspaceId: string): Promise<{ id: string; name: string }> {
  const name = plan.extracted.name as string || `AI Group: ${plan.summary}`;
  const group = await db.group.create({
    data: {
      workspaceId,
      name,
    },
  });
  return { id: group.id, name: group.name };
}

export async function searchGroups(plan: AIPlan, workspaceId: string): Promise<Array<{ id: string; name: string }>> {
  const groups = await db.group.findMany({
    where: { workspaceId },
    select: { id: true, name: true },
    take: 100,
  });
  return groups;
}

export async function searchCampaigns(plan: AIPlan, workspaceId: string): Promise<Array<{ id: string; name: string }>> {
  const campaigns = await db.campaign.findMany({
    where: { workspaceId },
    select: { id: true, subject: true },
    take: 100,
  });
  return campaigns.map((c) => ({ id: c.id, name: c.subject }));
}

export async function searchAutomations(plan: AIPlan, workspaceId: string): Promise<Array<{ id: string; name: string }>> {
  const automations = await db.automation.findMany({
    where: { workspaceId },
    select: { id: true, name: true },
    take: 100,
  });
  return automations;
}

export async function exportSubscribers(plan: AIPlan, workspaceId: string): Promise<string> {
  const subscribers = await searchSubscribers(plan, workspaceId);
  return JSON.stringify(subscribers, null, 2);
}

export async function exportGroups(plan: AIPlan, workspaceId: string): Promise<string> {
  const groups = await searchGroups(plan, workspaceId);
  return JSON.stringify(groups, null, 2);
}

export async function exportCampaigns(plan: AIPlan, workspaceId: string): Promise<string> {
  const campaigns = await searchCampaigns(plan, workspaceId);
  return JSON.stringify(campaigns, null, 2);
}

export async function campaignAnalytics(plan: AIPlan, workspaceId: string): Promise<unknown> {
  const campaigns = await db.campaign.findMany({
    where: { workspaceId },
    select: { id: true, subject: true, status: true, sentAt: true },
    take: 100,
  });
  return { campaigns };
}

export async function subscriberAnalytics(plan: AIPlan, workspaceId: string): Promise<unknown> {
  const [total, subscribed, unsubscribed, bounced, cleaned] = await Promise.all([
    db.subscriber.count({ where: { workspaceId } }),
    db.subscriber.count({ where: { workspaceId, status: "SUBSCRIBED" } }),
    db.subscriber.count({ where: { workspaceId, status: "UNSUBSCRIBED" } }),
    db.subscriber.count({ where: { workspaceId, status: "BOUNCED" } }),
    db.subscriber.count({ where: { workspaceId, status: "CLEANED" } }),
  ]);
  return { total, subscribed, unsubscribed, bounced, cleaned };
}

export async function generateEmail(plan: AIPlan, workspaceId: string): Promise<string> {
  const topic = plan.extracted.topic as string || plan.summary;
  const settings = await db.workspaceSettings.findUnique({ where: { workspaceId } });
  const apiKey = settings?.aiMode === "custom" ? settings?.customKey : settings?.openRouterKey;

  if (apiKey) {
    const endpoint = settings?.aiMode === "custom"
      ? (settings?.customEndpoint?.replace(/\/$/, "") ?? "") + "/chat/completions"
      : "https://openrouter.ai/api/v1/chat/completions";

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: settings?.selectedModel ?? "openai/gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: "You are an expert HTML email designer. Return ONLY valid HTML with inline CSS. Use palette: background #f6f5f1, accent teal #0e7c7b, text #14171a, muted #4b5358. Include unsubscribe placeholder.",
            },
            { role: "user", content: `Create an email about: ${topic}` },
          ],
          temperature: 0.7,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        return result.choices[0]?.message?.content?.trim() || fallbackEmail(topic);
      }
    } catch {
      // Fall through to fallback
    }
  }

  return fallbackEmail(topic);
}

function fallbackEmail(topic: string): string {
  return `<html><body><h1>${topic}</h1><p>Email content will go here.</p></body></html>`;
}

export async function generateNewsletter(plan: AIPlan, workspaceId: string): Promise<string> {
  const topic = plan.extracted.topic as string || plan.summary;
  const settings = await db.workspaceSettings.findUnique({ where: { workspaceId } });
  const apiKey = settings?.aiMode === "custom" ? settings?.customKey : settings?.openRouterKey;

  if (apiKey) {
    const endpoint = settings?.aiMode === "custom"
      ? (settings?.customEndpoint?.replace(/\/$/, "") ?? "") + "/chat/completions"
      : "https://openrouter.ai/api/v1/chat/completions";

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: settings?.selectedModel ?? "openai/gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: "You are an expert newsletter writer. Return ONLY valid HTML with inline CSS. Use palette: background #f6f5f1, accent teal #0e7c7b, text #14171a, muted #4b5358. Include unsubscribe placeholder.",
            },
            { role: "user", content: `Create a newsletter about: ${topic}` },
          ],
          temperature: 0.7,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        return result.choices[0]?.message?.content?.trim() || fallbackNewsletter(topic);
      }
    } catch {
      // Fall through to fallback
    }
  }

  return fallbackNewsletter(topic);
}

function fallbackNewsletter(topic: string): string {
  return `<html><body><h1>${topic}</h1><p>Newsletter content will go here.</p></body></html>`;
}