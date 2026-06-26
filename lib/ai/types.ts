export type AIIntent =
  | "create_campaign"
  | "create_automation"
  | "create_group"
  | "search_subscribers"
  | "search_groups"
  | "search_campaigns"
  | "search_automations"
  | "export_subscribers"
  | "export_groups"
  | "export_campaigns"
  | "campaign_analytics"
  | "subscriber_analytics"
  | "generate_email"
  | "generate_newsletter"
  | "unknown";

export interface PlanStep {
  type: string;
  [key: string]: unknown;
}

export interface VerificationQuestion {
  id: string;
  type: "text" | "textarea" | "number" | "date" | "select" | "multiselect";
  label: string;
  options?: string[];
}

export interface AIPlan {
  intent: AIIntent;
  confidence: number;
  summary: string;
  extracted: Record<string, unknown>;
  missingFields: string[];
  steps: PlanStep[];
  matchingGroups?: Array<{ id: string; name: string }>;
  trigger?: string;
}

export interface WorkspaceContext {
  groups: Array<{ id: string; name: string }>;
  campaigns: Array<{ id: string; name: string; subject: string }>;
  automations: Array<{ id: string; name: string }>;
  templates: Array<{ id: string; name: string; category: string }>;
}

export interface AIConversationState {
  sessionId: string;
  workspaceId: string;
  plan: AIPlan;
  collectedValues: Record<string, unknown>;
  pendingQuestions: VerificationQuestion[];
  completed: boolean;
}

export interface VerificationState {
  sessionId: string;
  plan: AIPlan;
  questions: VerificationQuestion[];
}