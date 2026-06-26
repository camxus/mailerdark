import type { AIPlan } from "./types";
import { detectIntentAndEntities, planWithIntent } from "./planner";
import { loadWorkspaceContext } from "./context";
import { generateVerificationQuestions } from "./session";

export async function processCommand(
  command: string,
  workspaceId: string
): Promise<{
  status: "success" | "needs_clarification";
  result?: unknown;
  plan?: AIPlan;
  questions?: unknown[];
}> {
  const context = await loadWorkspaceContext(workspaceId);
  const intentResult = await detectIntentAndEntities(command, workspaceId);
  const plan = planWithIntent(command, intentResult, context);
  const questions = generateVerificationQuestions(plan, context);

  if (questions.length > 0) {
    return { status: "needs_clarification", plan, questions };
  }

  const {
    createCampaign, createAutomation, createGroup,
    searchSubscribers, searchGroups, searchCampaigns, searchAutomations,
    exportSubscribers, exportGroups, exportCampaigns,
    campaignAnalytics, subscriberAnalytics,
    generateEmail, generateNewsletter
  } = await import("./tools/index");

  switch (plan.intent) {
    case "create_campaign":
      return { status: "success", result: await createCampaign(plan, workspaceId) };
    case "create_automation":
      return { status: "success", result: await createAutomation(plan, workspaceId) };
    case "create_group":
      return { status: "success", result: await createGroup(plan, workspaceId) };
    case "search_subscribers":
      return { status: "success", result: await searchSubscribers(plan, workspaceId) };
    case "search_groups":
      return { status: "success", result: await searchGroups(plan, workspaceId) };
    case "search_campaigns":
      return { status: "success", result: await searchCampaigns(plan, workspaceId) };
    case "search_automations":
      return { status: "success", result: await searchAutomations(plan, workspaceId) };
    case "export_subscribers":
      return { status: "success", result: await exportSubscribers(plan, workspaceId) };
    case "export_groups":
      return { status: "success", result: await exportGroups(plan, workspaceId) };
    case "export_campaigns":
      return { status: "success", result: await exportCampaigns(plan, workspaceId) };
    case "campaign_analytics":
      return { status: "success", result: await campaignAnalytics(plan, workspaceId) };
    case "subscriber_analytics":
      return { status: "success", result: await subscriberAnalytics(plan, workspaceId) };
    case "generate_email":
      return { status: "success", result: await generateEmail(plan, workspaceId) };
    case "generate_newsletter":
      return { status: "success", result: await generateNewsletter(plan, workspaceId) };
    default:
      throw new Error(`Unknown intent: ${plan.intent}`);
  }
}