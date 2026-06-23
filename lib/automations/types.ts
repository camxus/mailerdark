// ─────────────────────────────────────────────────
// Automation node types — one per node variant.
// Each has a `type` discriminator and a `data` payload.
// The shape is consumed by:
//   • components/automations/nodes/* (React Flow rendering)
//   • lib/automations/engine.ts (server-side execution)
//   • lib/validation/automation.schema.ts (Zod validation on save)
// ─────────────────────────────────────────────────

export type TriggerNodeData = {
  triggerType:
    | "SUBSCRIBER_CREATED"
    | "SUBSCRIBER_ADDED_TO_GROUP"
    | "FIELD_CHANGED"
    | "CAMPAIGN_OPENED"
    | "CAMPAIGN_CLICKED"
    | "DATE_BASED";
  groupId?: string;   // for SUBSCRIBER_ADDED_TO_GROUP
  fieldKey?: string;  // for FIELD_CHANGED
  campaignId?: string; // for CAMPAIGN_OPENED / CAMPAIGN_CLICKED
};

export type FilterNodeData = {
  conditions: {
    fieldKey: string;
    operator: "equals" | "not_equals" | "contains" | "gt" | "lt" | "is_set" | "is_not_set";
    value?: unknown;
  }[];
  // "yes" edge = conditions match; "no" edge = they don't
};

export type DelayNodeData = {
  unit: "minutes" | "hours" | "days";
  amount: number;
};

export type SendEmailNodeData = {
  subject: string;
  fromName: string;
  fromEmail: string;
  replyTo?: string;
  htmlContent: string;
};

export type AddToGroupNodeData = { groupId: string; groupName?: string };
export type RemoveFromGroupNodeData = { groupId: string; groupName?: string };
export type ExitNodeData = { label?: string };

// ─────────────────────────────────────────────────
// Union covering every node the canvas can contain
// ─────────────────────────────────────────────────

export type AutomationNodeData =
  | ({ type: "trigger" } & TriggerNodeData)
  | ({ type: "filter" } & FilterNodeData)
  | ({ type: "delay" } & DelayNodeData)
  | ({ type: "sendEmail" } & SendEmailNodeData)
  | ({ type: "addToGroup" } & AddToGroupNodeData)
  | ({ type: "removeFromGroup" } & RemoveFromGroupNodeData)
  | ({ type: "exit" } & ExitNodeData);

export type AutomationNodeType = AutomationNodeData["type"];

export type FlowDefinition = {
  nodes: Array<{ id: string; type: AutomationNodeType; position: { x: number; y: number }; data: AutomationNodeData }>;
  edges: Array<{ id: string; source: string; target: string; sourceHandle?: string | null; label?: string }>;
};
