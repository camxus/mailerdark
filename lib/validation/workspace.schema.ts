import { z } from "zod";

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const createWorkspaceSchema = z.object({
  name: z.string().min(2).max(80),
  slug: z
    .string()
    .min(2)
    .max(60)
    .regex(slugPattern, "Use lowercase letters, numbers, and hyphens only."),
});

export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>;
