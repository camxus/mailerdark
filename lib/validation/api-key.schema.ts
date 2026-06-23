import { z } from "zod";
import { ALL_SCOPES } from "@/lib/api-keys/generate";

export const createApiKeySchema = z.object({
  name: z.string().min(1).max(120),
  scopes: z.array(z.enum(ALL_SCOPES)).min(1),
});

export type CreateApiKeyInput = z.infer<typeof createApiKeySchema>;
