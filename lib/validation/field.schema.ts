import { z } from "zod";

const keyPattern = /^[a-z][a-z0-9_]*$/;

export const createFieldSchema = z.object({
  key: z
    .string()
    .min(1)
    .max(60)
    .regex(keyPattern, "Use lowercase letters, numbers, and underscores only, starting with a letter."),
  label: z.string().min(1).max(120),
  type: z.enum(["TEXT", "NUMBER", "DATE", "BOOLEAN"]),
});

export const updateFieldSchema = z.object({
  label: z.string().min(1).max(120),
});

export type CreateFieldInput = z.infer<typeof createFieldSchema>;
export type UpdateFieldInput = z.infer<typeof updateFieldSchema>;
