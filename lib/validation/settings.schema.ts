import { z } from "zod";

export const updateGeneralSettingsSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  fromName: z.string().max(120).optional(),
  fromEmail: z.string().email().optional(),
  timezone: z.string().max(80).optional(),
});

export const updateAiSettingsSchema = z.object({
  aiMode: z.enum(["openrouter", "custom"]).optional(),
  openRouterKey: z.string().max(200).optional(),
  customEndpoint: z.string().url().or(z.literal("")).optional(),
  customKey: z.string().max(200).optional(),
  selectedModel: z.string().max(200).optional(),
});

export type UpdateGeneralSettingsInput = z.infer<typeof updateGeneralSettingsSchema>;
export type UpdateAiSettingsInput = z.infer<typeof updateAiSettingsSchema>;
