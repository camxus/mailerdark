import { z } from "zod";

const domainPattern = /^(?!-)[a-z0-9-]+(\.[a-z0-9-]+)+$/i;

export const createDomainSchema = z.object({
  domain: z.string().min(3).max(255).regex(domainPattern, "Enter a valid domain, e.g. mail.yourcompany.com"),
});

export type CreateDomainInput = z.infer<typeof createDomainSchema>;
