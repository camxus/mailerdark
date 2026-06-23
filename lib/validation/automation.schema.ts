import { z } from "zod";

const triggerNodeDataSchema = z.object({
  type: z.literal("trigger"),
  triggerType: z.enum([
    "SUBSCRIBER_CREATED",
    "SUBSCRIBER_ADDED_TO_GROUP",
    "FIELD_CHANGED",
    "CAMPAIGN_OPENED",
    "CAMPAIGN_CLICKED",
    "DATE_BASED",
  ]),
  groupId: z.string().uuid().optional(),
  fieldKey: z.string().optional(),
  campaignId: z.string().uuid().optional(),
});

const conditionSchema = z.object({
  fieldKey: z.string(),
  operator: z.enum(["equals", "not_equals", "contains", "gt", "lt", "is_set", "is_not_set"]),
  value: z.unknown().optional(),
});

const filterNodeDataSchema = z.object({
  type: z.literal("filter"),
  conditions: z.array(conditionSchema).min(1),
});

const delayNodeDataSchema = z.object({
  type: z.literal("delay"),
  unit: z.enum(["minutes", "hours", "days"]),
  amount: z.number().int().min(1),
});

const sendEmailNodeDataSchema = z.object({
  type: z.literal("sendEmail"),
  subject: z.string().min(1),
  fromName: z.string().min(1),
  fromEmail: z.string().email(),
  replyTo: z.string().email().optional(),
  htmlContent: z.string().min(1),
});

const groupActionNodeDataSchema = z.object({
  type: z.enum(["addToGroup", "removeFromGroup"]),
  groupId: z.string().uuid(),
  groupName: z.string().optional(),
});

const exitNodeDataSchema = z.object({
  type: z.literal("exit"),
  label: z.string().optional(),
});

const automationNodeDataSchema = z.discriminatedUnion("type", [
  triggerNodeDataSchema,
  filterNodeDataSchema,
  delayNodeDataSchema,
  sendEmailNodeDataSchema,
  groupActionNodeDataSchema,
  exitNodeDataSchema,
]);

const flowNodeSchema = z.object({
  id: z.string(),
  type: z.string(),
  position: z.object({ x: z.number(), y: z.number() }),
  data: automationNodeDataSchema,
});

const flowEdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  sourceHandle: z.string().nullable().optional(),
  label: z.string().optional(),
});

export const flowDefinitionSchema = z.object({
  nodes: z.array(flowNodeSchema),
  edges: z.array(flowEdgeSchema),
});

export const createAutomationSchema = z.object({
  name: z.string().min(1).max(120),
  triggerType: z.enum([
    "SUBSCRIBER_CREATED",
    "SUBSCRIBER_ADDED_TO_GROUP",
    "FIELD_CHANGED",
    "CAMPAIGN_OPENED",
    "CAMPAIGN_CLICKED",
    "DATE_BASED",
  ]),
  flowDefinition: flowDefinitionSchema.optional(),
});

export const updateAutomationSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  flowDefinition: flowDefinitionSchema.optional(),
});

export type CreateAutomationInput = z.infer<typeof createAutomationSchema>;
