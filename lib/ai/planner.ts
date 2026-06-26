import type { AIPlan, AIIntent, WorkspaceContext } from "./types";
import { db } from "@/lib/db";

export interface IntentWithEntities {
  intent: AIIntent;
  confidence: number;
  entities: Record<string, unknown>;
  summary: string;
}

export async function detectIntentAndEntities(text: string, workspaceId?: string): Promise<IntentWithEntities> {
  if (workspaceId) {
    const settings = await db.workspaceSettings.findUnique({ where: { workspaceId } });
    const apiKey = settings?.aiMode === "custom" ? settings?.customKey : settings?.openRouterKey;
    const model = settings?.selectedModel ?? "openai/gpt-4o-mini";

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
              {
                role: "system",
                content: `Analyze user request and return JSON with:
{
  "intent": "create_campaign|create_automation|create_group|search_subscribers|search_groups|search_campaigns|search_automations|export_subscribers|export_groups|export_campaigns|campaign_analytics|subscriber_analytics|generate_email|generate_newsletter|unknown",
  "confidence": 0.9,
  "entities": { "audience": "group name or id", "type": "welcome|newsletter|promotional", "topic": "topic text", "status": "active|inactive" },
  "summary": "one sentence summary"
}`,
              },
              { role: "user", content: text },
            ],
            temperature: 0.1,
          }),
        });

        if (response.ok) {
          const result = await response.json();
          const content = result.choices[0]?.message?.content?.trim();
          try {
            const parsed = JSON.parse(content) as IntentWithEntities;
            if (parsed.intent && isValidIntent(parsed.intent)) {
              return parsed;
            }
          } catch {
            // Fall through to regex
          }
        }
      } catch {
        // Fall through to regex detection
      }
    }
  }

  // Regex-based fallback
  const lower = text.toLowerCase();
  let intent: AIIntent = "unknown";

  if (lower.includes("campaign") || lower.includes("email") || lower.includes("newsletter")) {
    intent = "create_campaign";
  } else if (lower.includes("automation") || lower.includes("flow") || lower.includes("onboarding")) {
    intent = "create_automation";
  } else if (lower.includes("group") || lower.includes("segment")) {
    intent = "create_group";
  } else if (lower.includes("find") || lower.includes("search") || lower.includes("inactive")) {
    if (lower.includes("subscriber")) intent = "search_subscribers";
    else if (lower.includes("group")) intent = "search_groups";
    else if (lower.includes("campaign")) intent = "search_campaigns";
  } else if (lower.includes("export")) {
    if (lower.includes("subscriber")) intent = "export_subscribers";
    else if (lower.includes("group")) intent = "export_groups";
    else if (lower.includes("campaign")) intent = "export_campaigns";
  } else if (lower.includes("analytics") || lower.includes("performance") || lower.includes("open rate") || lower.includes("click rate")) {
    intent = lower.includes("campaign") ? "campaign_analytics" : "subscriber_analytics";
  } else if (lower.includes("generate") || lower.includes("create content")) {
    intent = lower.includes("newsletter") ? "generate_newsletter" : "generate_email";
  }

  return { intent, confidence: 0.7, entities: {}, summary: text };
}

function isValidIntent(intent: string): intent is AIIntent {
  const validIntents: AIIntent[] = [
    "create_campaign", "create_automation", "create_group",
    "search_subscribers", "search_groups", "search_campaigns", "search_automations",
    "export_subscribers", "export_groups", "export_campaigns",
    "campaign_analytics", "subscriber_analytics",
    "generate_email", "generate_newsletter", "unknown"
  ];
  return validIntents.includes(intent as AIIntent);
}

const GROUP_REGEX = /\b(all users|premium users|trial users|customers|active subscribers)\b/i;
const DELAY_REGEX = /(\d+)\s*(day|days|hour|hours|minute|minutes)s?/i;

export function planWithIntent(
  text: string,
  intentResult: IntentWithEntities,
  context: WorkspaceContext
): AIPlan {
  const extracted: Record<string, unknown> = { ...intentResult.entities };
  const missingFields: string[] = [];
  const steps: { type: string; [key: string]: unknown }[] = [];
  const intent = intentResult.intent;

  switch (intent) {
    case "create_campaign": {
      if (!extracted.audience && !extracted.matchingGroups) {
        const groupMatch = text.match(GROUP_REGEX);
        if (groupMatch) {
          const groupName = groupMatch[0];
          const matchingGroups = context.groups.filter((g) =>
            g.name.toLowerCase().includes(groupName.toLowerCase()) ||
            groupName.toLowerCase().includes(g.name.toLowerCase())
          );
          if (matchingGroups.length === 1) {
            extracted.audience = matchingGroups[0].id;
          } else if (matchingGroups.length > 1) {
            extracted.matchingGroups = matchingGroups;
            missingFields.push("ambiguous_group");
          } else {
            missingFields.push("audience");
          }
        } else {
          missingFields.push("audience");
        }
      }
      break;
    }

    case "create_automation": {
      extracted.trigger = "SUBSCRIBER_CREATED";
      const delayMatch = text.match(DELAY_REGEX);
      if (delayMatch) {
        const amount = Number(delayMatch[1]);
        const unit = delayMatch[2].startsWith("day") ? "days" :
                     delayMatch[2].startsWith("hour") ? "hours" : "minutes";
        steps.push({ type: "delay", amount, unit });
      }
      steps.push({ type: "send_email" });

      if (!extracted.audience && !extracted.matchingGroups) {
        const groupMatch = text.match(GROUP_REGEX);
        if (groupMatch) {
          const groupName = groupMatch[0];
          const matchingGroups = context.groups.filter((g) =>
            g.name.toLowerCase().includes(groupName.toLowerCase()) ||
            groupName.toLowerCase().includes(g.name.toLowerCase())
          );
          if (matchingGroups.length === 1) {
            extracted.audience = matchingGroups[0].id;
          } else if (matchingGroups.length > 1) {
            extracted.matchingGroups = matchingGroups;
            missingFields.push("ambiguous_group");
          }
        }
      }
      break;
    }

    case "search_subscribers": {
      if (!extracted.status) {
        if (text.toLowerCase().includes("inactive")) {
          extracted.status = "inactive";
        }
        if (text.toLowerCase().includes("active")) {
          extracted.status = "active";
        }
      }
      if (!extracted.audience && GROUP_REGEX.test(text)) {
        const groupMatch = text.match(GROUP_REGEX);
        if (groupMatch) {
          const matchingGroups = context.groups.filter((g) =>
            g.name.toLowerCase().includes(groupMatch![0].toLowerCase())
          );
          if (matchingGroups.length === 1) {
            extracted.audience = matchingGroups[0].id;
          } else if (matchingGroups.length > 1) {
            extracted.matchingGroups = matchingGroups;
            missingFields.push("ambiguous_group");
          }
        }
      }
      break;
    }

    case "generate_email":
    case "generate_newsletter": {
      if (!extracted.topic) {
        extracted.topic = text.replace(/(generate|create|write|draft).*(newsletter|email)/i, "").trim() || "general update";
      }
      break;
    }
  }

  return {
    intent,
    confidence: intentResult.confidence,
    summary: intentResult.summary,
    extracted,
    missingFields,
    steps,
    ...(extracted.matchingGroups ? { matchingGroups: extracted.matchingGroups as Array<{ id: string; name: string }> } : {}),
  };
}