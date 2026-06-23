import { z } from "zod";

export const createSubscriberSchema = z.object({
  email: z.string().email(),
  status: z.enum(["SUBSCRIBED", "UNSUBSCRIBED", "BOUNCED", "CLEANED"]).optional(),
  customFields: z.record(z.string(), z.unknown()).optional(),
  groupIds: z.array(z.string().uuid()).optional(),
});

export const updateSubscriberSchema = z.object({
  email: z.string().email().optional(),
  status: z.enum(["SUBSCRIBED", "UNSUBSCRIBED", "BOUNCED", "CLEANED"]).optional(),
  customFields: z.record(z.string(), z.unknown()).optional(),
});

export const fieldFilterSchema = z.object({
  fieldKey: z.string(),
  operator: z.enum(["equals", "not_equals", "contains", "gt", "lt", "is_set", "is_not_set"]),
  value: z.unknown().optional(),
});

export const listSubscribersQuerySchema = z.object({
  groupId: z.string().uuid().optional(),
  status: z.enum(["SUBSCRIBED", "UNSUBSCRIBED", "BOUNCED", "CLEANED"]).optional(),
  search: z.string().optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

export const importSubscribersSchema = z.object({
  subscribers: z
    .array(
      z.object({
        email: z.string().email(),
        customFields: z.record(z.string(), z.unknown()).optional(),
      })
    )
    .min(1)
    .max(5000),
  groupIds: z.array(z.string().uuid()).optional(),
});

export type CreateSubscriberInput = z.infer<typeof createSubscriberSchema>;
export type UpdateSubscriberInput = z.infer<typeof updateSubscriberSchema>;
export type FieldFilter = z.infer<typeof fieldFilterSchema>;
