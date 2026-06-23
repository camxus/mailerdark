# Mailerdark — Workers

Background workers run as a separate Node.js process (or Supabase Edge Functions on a cron schedule, for the lighter-weight ones). They consume from a Postgres-backed queue table (`email_jobs` for sends, `events` for the EventBus) — no external broker is required at launch; BullMQ + Redis is a drop-in upgrade if volume demands it.

## CampaignSenderWorker

- **Trigger:** polls `EmailJob` rows with `status = QUEUED`, ordered by `queuedAt`.
- **Concurrency:** configurable batch size (default 50 concurrent sends), capped to stay under the email provider's rate limit.
- **Process:** render the email (merge fields via `lib/email/render.ts`), call `EmailProvider.send()`, store `providerMessageId`, set `status = SENT` and `sentAt`. On provider error, set `status = FAILED` and record `error`.
- **Retry policy:** up to 3 attempts with exponential backoff for 5xx/timeout errors from the provider; permanent failures (invalid address) are not retried and immediately mark the subscriber `BOUNCED` if the error indicates a hard bounce.
- **Idempotency:** `EmailJob.id` is passed to the provider as an idempotency key where supported, preventing duplicate sends on worker restart.
- **Completion:** once every `EmailJob` for a `Campaign` reaches a terminal state, the worker flips the campaign to `SENT` and writes a `campaign:completed` `Event` (or `campaign:failed` if the failure rate exceeds a threshold).

## AutomationEngineWorker

- **Trigger:** (a) new `Event` rows matching an active automation's `triggerType` create a fresh `AutomationRun`; (b) existing `AutomationRun`s with `status = WAITING` and `resumeAt <= now()` are picked up to continue.
- **Concurrency:** safe to run multiple instances; row-level locking (`SELECT ... FOR UPDATE SKIP LOCKED`) on `AutomationRun` prevents two workers from advancing the same run.
- **Process:** load the automation's `flowDefinition`, call the pure `advanceRun(run, graph, subscriber)` function from `lib/automations/engine.ts`. Depending on the node reached: enqueue an `EmailJob` (Send Email node), set `resumeAt` and `status = WAITING` (Delay node), write a `SubscriberGroup` row (Add/Remove to Group node), evaluate a boolean against subscriber fields/groups to choose an outgoing edge (Filter node), or set `status = COMPLETED`/`EXITED`.
- **Retry policy:** node execution is wrapped in a transaction per step; a failure marks the run `FAILED` with the error attached rather than retrying indefinitely, to avoid infinite loops on bad data.

## DnsVerificationWorker

- **Trigger:** runs on a fixed interval (e.g. every 10 minutes) over `SendingDomain` rows where any status is `PENDING`; also runnable on-demand from the "Verify" button (`POST /domains/{id}/verify`).
- **Process:** uses Node's `dns.resolveTxt`/`dns.resolveCname` to check for the expected SPF TXT record, DKIM CNAME/TXT record, and DMARC TXT record, and cross-checks against the email provider's own domain-verification API as a second source of truth. Updates `spfStatus`, `dkimStatus`, `dmarcStatus` independently, and sets `verifiedAt` once all three are `VALID`.
- **Notes:** DNS propagation can take up to 48 hours; the worker does not alert on every failed check, only on a status transition (e.g. `PENDING → VALID`) or after a configurable number of consecutive failures.

## WebhookIngestWorker

- **Trigger:** invoked synchronously by the `/api/webhooks/email-provider` route handler — verification and parsing happen inline; this "worker" is the queued, retryable half of that pipeline for events that need slower follow-up processing (e.g. cascading an automation trigger).
- **Process:** verifies the provider's signature header against the raw request body, maps the provider's event payload to a Mailerdark `EventType`, inserts an `EmailEvent`, and writes a corresponding `Event` row (`email:opened`, `email:bounced`, etc.) for downstream consumers (AutomationEngineWorker, AnalyticsAggregatorWorker).
- **Idempotency:** the provider's own event ID is stored and checked to discard duplicate webhook deliveries, which providers send routinely on retry.

## AnalyticsAggregatorWorker

- **Trigger:** consumes new `EmailEvent` and `Event` rows (via `LISTEN/NOTIFY` or polling) and on a periodic rollup schedule (every minute) for dashboard summaries.
- **Process:** maintains denormalized counters (`campaign_id → {sent, opened, clicked, bounced, unsubscribed}` and equivalent per-automation, per-node aggregates) so dashboard queries never need to scan raw `EmailEvent` history.
- **Output:** writes to summary tables read directly by the Dashboard's TanStack Query hooks, and broadcasts deltas over the relevant Supabase Realtime channel so open dashboards update without polling.

## Operational Notes

- All workers log structured JSON (job id, duration, outcome) to stdout for collection by whatever hosting platform is used.
- A `WORKER_CONCURRENCY` and per-worker `*_POLL_INTERVAL_MS` environment variable control throughput without code changes.
- Workers share the same Prisma client and Zod schemas as the API layer — no duplicated validation logic between "what the API accepted" and "what the worker assumes."
- **Implementation note:** each worker's core logic lives in `lib/workers/{name}-pass.ts` as a single `run{Name}Pass(db)` function, deliberately decoupled from any particular execution model. `workers/{name}.ts` is a thin CLI wrapper around it for hosts that support a persistent process (`--watch`, polling on an interval). `app/api/cron/{name}/route.ts` calls the same function once per invocation, for triggering via Vercel Cron (or any external scheduler hitting that URL with the right `CRON_SECRET`). Both paths are real and supported — see README.md → "Deploying to Vercel" for which one fits a given deployment target.
