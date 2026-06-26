import { loadWorkspaceContext } from "@/lib/ai/context";
import { detectIntentAndEntities, planWithIntent } from "@/lib/ai/planner";
import { updateStatelessSession, generateVerificationQuestions } from "@/lib/ai/session";
import type { AIPlan } from "@/lib/ai/types";

export async function POST(request: Request) {
  const segments = request.url.split("/");
  const workspaceId = segments[4];

  const { command, existingPlan, collectedValues, answers } = await request.json();

  if (answers && existingPlan) {
    const updated = updateStatelessSession(existingPlan, collectedValues || {}, answers);
    if (updated.completed) {
      const tools = await import("@/lib/ai/tools/index");
      const result = await executeIntent(updated.plan.intent, updated.plan, workspaceId, tools);
      return Response.json({ status: "success", result, session: { plan: updated.plan, collectedValues: updated.collectedValues } });
    }
    return Response.json({ status: "needs_clarification", session: { plan: updated.plan, collectedValues: updated.collectedValues } });
  }

  const context = await loadWorkspaceContext(workspaceId);
  const intentResult = await detectIntentAndEntities(command, workspaceId);
  const plan = planWithIntent(command, intentResult, context);

  const questions = generateVerificationQuestions(plan, context);

  if (questions.length > 0) {
    const sessionId = `session_${Date.now()}`;
    return Response.json({ status: "needs_clarification", sessionId, plan, questions });
  }

  const tools = await import("@/lib/ai/tools/index");
  const result = await executeIntent(plan.intent, plan, workspaceId, tools);
  return Response.json({ status: "success", result, plan });
}

async function executeIntent(intent: string, plan: AIPlan, workspaceId: string, tools: typeof import("@/lib/ai/tools/index")) {
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