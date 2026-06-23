# Mailerdark — Code Styles & Project Structure

## Naming Conventions

| Element | Convention | Example |
|---|---|---|
| Routes (URL segments) | kebab-case | `/sending-domains`, `/api-keys` |
| Database columns/tables | snake_case | `subscriber_id`, `email_jobs` |
| TypeScript variables/functions | camelCase | `getSubscriberById`, `flowDefinition` |
| React components | PascalCase | `AutomationCanvas`, `CampaignPreviewPane` |
| Event names | kebab-case, `entity:action` | `subscriber:created`, `campaign:completed` |
| Environment variables | UPPER_SNAKE_CASE | `SUPABASE_SERVICE_ROLE_KEY`, `EMAIL_PROVIDER_API_KEY` |
| Zod schema files | `{entity}.schema.ts` | `subscriber.schema.ts` |

## Project Structure

```
app/
  (dashboard)/
    w/[workspaceId]/
      subscribers/
      groups/
      campaigns/
        [campaignId]/edit/
      automations/
        [automationId]/build/      ← React Flow canvas
      settings/
        domains/
        api-keys/
        api/                        ← API documentation page
  api/
    workspaces/[workspaceId]/
      subscribers/route.ts
      subscribers/[id]/route.ts
      campaigns/route.ts
      campaigns/[id]/send-now/route.ts
      automations/route.ts
      ...
    t/
      open/[jobId]/route.ts
      click/[jobId]/route.ts
    webhooks/
      email-provider/route.ts
components/
  subscribers/
  campaigns/
  automations/
    nodes/                          ← one file per React Flow node type
  ui/                                ← shared primitives (buttons, inputs, table)
lib/
  db.ts                              ← Prisma client singleton
  supabase/
    server.ts                       ← server-side Supabase client (cookies-based)
    client.ts                       ← browser Supabase client
  validation/                       ← Zod schemas, shared by client and server
  email/
    provider.ts                     ← EmailProvider interface
    providers/resend.ts
    render.ts                       ← merge-field substitution + MJML/HTML render
  events/
    publish.ts                      ← writes an Event row + Realtime broadcast
  automations/
    engine.ts                       ← graph-walking logic, pure functions where possible
workers/
  campaign-sender.ts
  automation-engine.ts
  dns-verifier.ts
  webhook-ingest.ts
  analytics-aggregator.ts
prisma/
  schema.prisma
  migrations/
```

## API Route Pattern

Every Route Handler follows the same shape: parse params, validate body with Zod, authorize against the workspace, perform the operation, return the standard envelope.

```typescript
// app/api/workspaces/[workspaceId]/subscribers/route.ts
import { z } from "zod";
import { requireWorkspaceAccess } from "@/lib/auth/require-workspace-access";
import { db } from "@/lib/db";

const createSubscriberSchema = z.object({
  email: z.string().email(),
  customFields: z.record(z.unknown()).optional(),
  groupIds: z.array(z.string().uuid()).optional(),
});

export async function POST(req: Request, { params }: { params: { workspaceId: string } }) {
  const auth = await requireWorkspaceAccess(req, params.workspaceId, "subscribers:write");
  if (!auth.ok) return auth.response;

  const body = createSubscriberSchema.safeParse(await req.json());
  if (!body.success) {
    return Response.json(
      { data: null, error: { code: "VALIDATION_ERROR", message: body.error.message } },
      { status: 422 }
    );
  }

  const subscriber = await db.subscriber.create({
    data: { workspaceId: params.workspaceId, ...body.data },
  });

  return Response.json({ data: subscriber, error: null }, { status: 201 });
}
```

## Error Handling

- Validation failures: `422` with `code: "VALIDATION_ERROR"`.
- Auth/permission failures: `401` (no session) or `403` (`code: "FORBIDDEN"`, wrong workspace or missing scope).
- Not found: `404` with `code: "NOT_FOUND"`.
- Everything else is caught by a shared `withErrorHandling` wrapper that logs the error server-side and returns `500` with `code: "INTERNAL_ERROR"` and no internal detail leaked to the client.

## Frontend Data Fetching

- All server data flows through TanStack Query hooks in `lib/queries/{entity}.ts` (e.g. `useSubscribers`, `useCampaign`). Mutations invalidate the relevant query keys on success.
- Supabase Realtime subscriptions update the TanStack Query cache directly (`queryClient.setQueryData`) rather than triggering a full refetch, so live updates (e.g. campaign send progress) feel instant.
- Local-only UI state (canvas zoom, selected node, modal open/closed) lives in small Zustand stores colocated with the feature, never in TanStack Query.

## Automation Node Typing

Every React Flow node's `data` field is discriminated by `type`, and a single Zod union (`automationNodeSchema`) validates the whole `flowDefinition` blob both when saving from the canvas and before the engine executes it:

```typescript
const sendEmailNode = z.object({
  type: z.literal("sendEmail"),
  data: z.object({ subject: z.string(), fromName: z.string(), fromEmail: z.string().email(), htmlContent: z.string() }),
});
// ...filterNode, delayNode, addToGroupNode, removeFromGroupNode, exitNode, triggerNode
const automationNodeSchema = z.discriminatedUnion("type", [
  triggerNode, filterNode, delayNode, sendEmailNode, addToGroupNode, removeFromGroupNode, exitNode,
]);
```

## Testing Conventions

- Unit tests colocated as `*.test.ts` next to the file under test.
- API route tests hit the Route Handler directly with a mocked `db` and a fake workspace-scoped session.
- The automation engine is tested as pure functions (`advanceRun(run, graph, subscriber) → nextState`) so graph logic can be tested without a database or worker process.
