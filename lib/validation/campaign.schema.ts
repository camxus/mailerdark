import { z } from "zod";
import { fieldFilterSchema } from "./subscriber.schema";

export const audienceSchema = z.object({
  groupIds: z.array(z.string().uuid()).optional(),
  fieldFilters: z.array(fieldFilterSchema).optional(),
  // Frozen exact recipient list — set by "Resend to non-openers", where the
  // set of people who didn't open is a historical fact about one specific
  // past send, not something a live group/field filter can express. When
  // present, this is the base set (still narrowed by status=SUBSCRIBED and,
  // if also present, groupIds/fieldFilters); it deliberately does NOT
  // re-evaluate who currently matches, unlike every other audience field.
  subscriberIds: z.array(z.string().uuid()).optional(),
  // Restricts to subscribers whose createdAt is after this instant — set by
  // "Resend to new subscribers" (joinedAfter = the original campaign's sentAt).
  joinedAfter: z.string().datetime().optional(),
});

export const createCampaignSchema = z.object({
  subject: z.string().min(1).max(200),
  fromName: z.string().min(1).max(120),
  fromEmail: z.string().email(),
  replyTo: z.string().email().optional(),
  htmlContent: z.string().min(1),
  audience: audienceSchema.optional(),
});

export const updateCampaignSchema = z.object({
  subject: z.string().min(1).max(200).optional(),
  fromName: z.string().min(1).max(120).optional(),
  fromEmail: z.string().email().optional(),
  replyTo: z.string().email().optional(),
  htmlContent: z.string().min(1).optional(),
  audience: audienceSchema.optional(),
});

export const testSendSchema = z.object({
  emails: z.array(z.string().email()).min(1).max(10),
});

export const scheduleCampaignSchema = z.object({
  scheduledAt: z.string().datetime(),
});

export const previewSchema = z.object({
  subscriberId: z.string().uuid().optional(),
});

export const resendCampaignSchema = z.object({
  mode: z.enum(["non_openers", "new_subscribers", "duplicate"]),
});

export type Audience = z.infer<typeof audienceSchema>;
export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;
export type UpdateCampaignInput = z.infer<typeof updateCampaignSchema>;
export type ResendMode = z.infer<typeof resendCampaignSchema>["mode"];
