# Mailerdark — Architecture

A MailerLite-style email marketing platform built on Next.js (App Router) and Supabase (Postgres + Auth + Realtime + Storage).

## Platform Identity

| Layer | Name | Role |
|---|---|---|
| LAYER_1 | **SendEngine** | Composition, rendering, and delivery execution core |
| LAYER_2 | **Dashboard** | Client-facing interface for marketers (subscribers, campaigns, automations, analytics) |
| LAYER_3 | **APIGateway** | Next.js Route Handlers — backend API and request routing |

| System | Name | Role |
|---|---|---|
| SYSTEM_1 | **Workspace** | Top-level domain ownership and tenant isolation |
| SYSTEM_2 | **Campaign** | Lifecycle/state management for a send or automation run |
| SYSTEM_3 | **EmailJob** | Unit-of-work execution and tracking (one subscriber, one send) |

| Infra | Name | Role |
|---|---|---|
| INFRA_1 | **EventBus** | Inter-component communication: Postgres triggers + Supabase Realtime + job queue |
| INFRA_2 | **AuthSystem** | Identity, access, authorization — Supabase Auth (JWT) + scoped API keys |
| INFRA_3 | **WebhookGateway** | Inbound provider webhooks (bounces/opens/clicks) and outbound automation/integration webhooks |

| Client | Name | Role |
|---|---|---|
| CLIENT | **WebClient** | Next.js App Router dashboard, web-first |

## Architecture Principles

- **workspace-first** — every resource (subscriber, group, campaign, automation, domain, API key) belongs to exactly one `workspace_id`. There is no cross-workspace query path.
- **campaign-aware** — execution always happens inside the context of a `Campaign` or `AutomationRun`; there is no "bare" email send.
- **event-driven** — state changes (subscriber joins a group, campaign finishes sending, email opened) emit events that other systems react to, rather than being polled.
- **reactive UI** — the dashboard subscribes to Supabase Realtime channels scoped to the workspace; counts, statuses, and analytics update without a manual refresh.
- **entity-scoped routing** — both UI routes (`/w/[workspaceId]/...`) and API routes (`/api/workspaces/[workspaceId]/...`) are nested under the owning entity.
- **web-first** — no native client is planned; the dashboard is responsive but not optimized for native mobile.
- **queue-worker-pool delivery** — sending is never done inline on a request; campaigns and automation steps enqueue `EmailJob`s consumed by background workers (see WORKERS.md).
- **graph-execution automations** — an automation is a React Flow graph (nodes + edges) persisted as JSON; the worker walks the graph per-subscriber, persisting the subscriber's current node so runs survive restarts.

## Domain Hierarchy

```
Workspace            ← isolation boundary, owns all child resources
  └─ Subscriber       ← contact record, has Fields + Group memberships
  └─ Group            ← static or smart segment of Subscribers
  └─ Campaign          ← one-off send, scopes execution
       └─ EmailJob      ← unit of work per Subscriber
            └─ EmailEvent ← tracked outcome (open/click/bounce/complaint)
  └─ Automation         ← reusable flow, scopes execution
       └─ AutomationRun  ← one Subscriber's progress through the flow
            └─ EmailJob   ← unit of work emitted by a "Send Email" node
```

`Campaign` and `Automation` both sit at the SYSTEM_2 (lifecycle) level — a Campaign has one lifecycle (draft → scheduled → sending → sent/failed); an Automation has many concurrent lifecycles, one per `AutomationRun` (entered → running → completed/exited).

## Technology Stack

| Concern | Choice |
|---|---|
| Frontend framework | Next.js 14+ (App Router), React, TypeScript |
| Frontend state | Zustand (local UI state), TanStack Query (server state/cache) |
| Styling | Tailwind CSS |
| Automation canvas | React Flow |
| Realtime | Supabase Realtime (Postgres CDC over WebSocket) |
| Validation (both ends) | Zod |
| Backend runtime | Node.js via Next.js Route Handlers |
| Database | PostgreSQL (Supabase), Row Level Security per `workspace_id` |
| ORM | Prisma (migrations + typed queries); Supabase client used directly for Auth/Realtime/Storage |
| Background jobs | Queue table in Postgres processed by a worker process (pg-boss pattern), or BullMQ + Redis if higher throughput is needed |
| Outbound email | Pluggable provider interface (`EmailProvider`); default implementation targets Resend (domain verification API + delivery webhooks for opens/clicks/bounces) |
| Auth | Supabase Auth (email/password + OAuth) issuing JWTs; separate hashed API keys for the public API |

## High-Level Data Flow

1. A marketer imports or manually adds a **Subscriber** to a **Workspace**, optionally assigning **Fields** and **Groups**.
2. A **Group** assignment, field change, or campaign engagement event is written to Postgres and mirrored onto the **EventBus** (Realtime channel + queue row).
3. Any **Automation** whose trigger matches that event creates an **AutomationRun** for the subscriber, starting at the trigger node.
4. The **AutomationEngineWorker** advances runs: evaluating filter nodes against Subscriber fields/groups, waiting on delay nodes, and enqueuing an **EmailJob** at "Send Email" nodes.
5. A **Campaign** sent directly (not via automation) enqueues one **EmailJob** per matching subscriber at send time instead.
6. The **CampaignSenderWorker** picks up queued EmailJobs, renders the email (subject, from address, HTML body with merge fields), calls the **SendEngine**, and records the provider's message ID.
7. The email provider's delivery webhook lands on the **WebhookGateway**, which writes an **EmailEvent** (open/click/bounce/complaint/unsubscribe) and republishes it on the EventBus — closing the loop back into automations (e.g. "if opened" branches) and the Dashboard's live analytics.

## Multi-Tenancy & Isolation

Every table carries a `workspace_id` column. Supabase Row Level Security policies restrict all reads/writes to rows where `workspace_id` is in the set of workspaces the authenticated user (or API key) belongs to. The public API additionally scopes API keys to exactly one workspace at creation time — there is no "all workspaces" key.
