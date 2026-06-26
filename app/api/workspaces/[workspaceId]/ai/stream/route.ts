import { loadWorkspaceContext } from "@/lib/ai/context";
import { detectIntentAndEntities, planWithIntent } from "@/lib/ai/planner";
import { generateVerificationQuestions } from "@/lib/ai/session";
import type { AIPlan } from "@/lib/ai/types";

export const runtime = "nodejs";
export const maxDuration = 60;

function formatSSE(data: unknown, event?: string): string {
  const lines = [];
  if (event) lines.push(`event: ${event}`);
  lines.push(`data: ${JSON.stringify(data)}`);
  return lines.join("\n") + "\n\n";
}

export async function POST(request: Request) {
  const segments = request.url.split("/");
  const workspaceId = segments[4];

  const { command } = await request.json();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        controller.enqueue(formatSSE({ status: "analyzing", message: "Loading workspace context..." }));

        const context = await loadWorkspaceContext(workspaceId);

        controller.enqueue(formatSSE({ status: "planning", message: "Detecting intent..." }));

        const intentResult = await detectIntentAndEntities(command, workspaceId);

        controller.enqueue(formatSSE({ status: "planning", message: "Generating plan...", intent: intentResult.intent }));

const plan = planWithIntent(command, intentResult, context);
        const questions = generateVerificationQuestions(plan, context);
        const sessionId = `session_${Date.now()}`;

        if (questions.length > 0) {
          controller.enqueue(formatSSE({
            status: "needs_clarification",
            sessionId,
            plan,
            questions,
          }));
          controller.close();
          return;
        }

        controller.enqueue(formatSSE({ status: "executing", message: "Executing action...", plan }));

        const tools = await import("@/lib/ai/tools/index");

        const result = await executeTools(tools, plan.intent, plan, workspaceId);

        controller.enqueue(formatSSE({ status: "complete", result, plan }, "complete"));
        controller.close();
      } catch (error) {
        controller.enqueue(formatSSE({ status: "error", error: String(error) }));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

async function executeTools(
  tools: typeof import("@/lib/ai/tools/index"),
  intent: string,
  plan: AIPlan,
  workspaceId: string
) {
  const {
    createCampaign, createAutomation, createGroup,
    searchSubscribers, searchGroups, searchCampaigns, searchAutomations,
    exportSubscribers, exportGroups, exportCampaigns,
    campaignAnalytics, subscriberAnalytics,
    generateEmail, generateNewsletter
  } = tools;

  switch (intent) {
    case "create_campaign":
      return createCampaign(plan, workspaceId);
    case "create_automation":
      return createAutomation(plan, workspaceId);
    case "create_group":
      return createGroup(plan, workspaceId);
    case "search_subscribers":
      return searchSubscribers(plan, workspaceId);
    case "search_groups":
      return searchGroups(plan, workspaceId);
    case "search_campaigns":
      return searchCampaigns(plan, workspaceId);
    case "search_automations":
      return searchAutomations(plan, workspaceId);
    case "export_subscribers":
      return exportSubscribers(plan, workspaceId);
    case "export_groups":
      return exportGroups(plan, workspaceId);
    case "export_campaigns":
      return exportCampaigns(plan, workspaceId);
    case "campaign_analytics":
      return campaignAnalytics(plan, workspaceId);
    case "subscriber_analytics":
      return subscriberAnalytics(plan, workspaceId);
    case "generate_email":
      return generateEmail(plan, workspaceId);
    case "generate_newsletter":
      return generateNewsletter(plan, workspaceId);
    case "unknown":
      throw new Error("Could not understand the request. Try rephrasing.");
    default:
      throw new Error(`Unknown intent: ${intent}`);
  }
}