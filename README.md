# Mailerdark

A MailerLite-style email marketing platform: subscribers, custom fields, groups, campaigns, and (coming next) a React Flow automation builder — built on Next.js (App Router) and Supabase.

This README covers Phases 0–2 from `CHECKLIST.md`: project setup, authentication & workspaces, and subscribers/fields/groups. See `ARCHITECTURE.md`, `MODELS.md`, `API_REFERENCE.md`, `CODE_STYLES.md`, `CHECKLIST.md`, and `WORKERS.md` in the project root for the full design.

## 1. Create a Supabase project

1. Create a project at [supabase.com](https://supabase.com).
2. In **Settings → API**, copy the Project URL and anon public key.
3. In **Settings → Database**, copy both the pooled ("Transaction") connection string and the direct connection string.

## 2. Configure environment variables

Copy `.env.example` to `.env` and fill in the Supabase values from step 1. You can leave `RESEND_API_KEY` blank for now — it's only needed once campaign sending (Phase 5) is wired up.

```bash
cp .env.example .env
```

## 3. Install dependencies and set up the database

```bash
npm install
npx prisma generate
npx prisma migrate dev --name init
```

`prisma migrate dev` creates every table from `prisma/schema.prisma` (including tables future phases will use — Campaign, Automation, EmailJob, etc. — so later phases are additive, not migrations that reshape what's already there).

## 4. Apply Row Level Security and the auth sync trigger

Prisma manages table structure but not RLS policies or `auth` schema triggers. In the Supabase SQL editor, run the contents of:

```
supabase/sql/001_init.sql
```

This also wires up a trigger that mirrors `auth.users` into `public.users` whenever someone signs up — without it, new sign-ups would hit a foreign key error the first time they try to create a workspace.

## 5. Run the app

```bash
npm run dev
```

Visit `http://localhost:3000`, sign up, and you'll land on the onboarding screen to create your first workspace.

## Deploying to Vercel

The Next.js app — every page, every API route, the tracking pixel/click/unsubscribe endpoints, and the inbound webhook handler — deploys to Vercel as-is. Import the repo, set the environment variables from `.env.example` in the Vercel project settings, and deploy. `prisma generate` runs automatically via the `postinstall` script, so the build doesn't need any extra configuration. Use the **pooled** `DATABASE_URL` (port 6543, `?pgbouncer=true`) for the app and the **direct** `DIRECT_URL` for migrations, exactly as in `.env.example` — Vercel's serverless functions open far more concurrent connections than a single long-running server would, and Supabase's pooler is what keeps that from exhausting Postgres' connection limit.

The one thing that genuinely doesn't fit the serverless model is the three background workers (`workers/campaign-sender.ts`, `workers/automation-engine.ts`, `workers/dns-verifier.ts`). As CLI scripts with a `--watch` loop, they assume a persistent process — and Vercel has no such thing; every function invocation is ephemeral and time-limited. That's not a small gap, so there are two real ways to handle it, both fully wired up in this repo:

**Option A — Vercel Cron (stay 100% on Vercel).** Each worker's logic also lives behind `/api/cron/campaign-sender`, `/api/cron/automation-engine`, and `/api/cron/dns-verifier`, authenticated with the `CRON_SECRET` Vercel injects automatically into cron invocations. `vercel.json` schedules them every 5 / 5 / 15 minutes. **This cadence needs Vercel's Pro plan** — Hobby restricts cron jobs to roughly once a day, which is too infrequent for automation delay steps or timely scheduled-campaign sends. If you're on Hobby, either upgrade, or use Option B.

**Option B — run the CLI workers somewhere with a persistent process.** A $5–7/mo box on Railway, Render, or Fly.io (or any small VPS) running `npm run worker:campaign-sender -- --watch` etc., pointed at the same `DATABASE_URL` and `RESEND_API_KEY`, reacts within seconds instead of minutes — useful if automation delays need to feel closer to real-time. The Next.js app itself still deploys to Vercel; only these three scripts run elsewhere.

Either way, "Send now" and test sends in the dashboard work immediately with no worker running at all — they're handled inline, in the request itself, for up to 200 recipients (sent with 10-way concurrency to comfortably clear Vercel's function time limit). The cron/worker only matters for: campaigns over that size, *scheduled* sends, automation delay steps, and periodic DNS re-checks.

## What's implemented so far

- Email/password auth via Supabase Auth, with session refresh handled in `middleware.ts`
- Workspace creation, switching, and role-based membership (Owner/Admin/Member)
- Subscribers: create, list (search + filter by group/status), view, edit, delete, group assignment
- Custom fields: create/delete, typed (text/number/date/boolean), used as the keys in each subscriber's `customFields`
- Groups: create, edit, delete, with live subscriber counts
- Campaigns: compose (subject/from/reply-to/HTML), a shared group+field audience filter (also used by automations), live preview with merge-field substitution and sample-data fallback, test sends, schedule vs. send-now, pause, and a stats panel (sent/opens/clicks/failed/queued)
- Automations: a React Flow canvas with 7 node types (Trigger, Filter, Delay, Send Email, Add/Remove from Group, Exit), per-node config panels, graph validation before activation, pause/resume, and a recent-runs table. `workers/automation-engine.ts` turns subscriber events into `AutomationRun`s and advances them step by step
- Real outbound delivery via Resend, behind an `EmailProvider` interface so swapping providers later doesn't touch calling code
- Full tracking: signed open pixel, click-redirect (rewrites every link in a sent email to route through it), one-click unsubscribe, and an inbound webhook handler (`/api/webhooks/email-provider`) that verifies Resend's Svix-style signature and handles bounces/complaints
- Sending domains: add a domain and get real SPF/DKIM/DMARC records back from Resend's Domains API (not guessed), verify on demand or via the `dns-verifier` background worker, with DMARC checked independently through Node's `dns` module since Resend doesn't track it
- A full public API: API key generation with scopes (raw key shown once, sha256-hashed at rest), an OpenAPI 3.1 document generated from a single source of truth (`lib/openapi/spec.ts`, served at `/api/openapi`), and an interactive "API & Documentation" settings page where every endpoint can be expanded, filled in, and actually run against your real data — with live cURL/Node/Python snippets
- `workers/campaign-sender.ts` and `workers/automation-engine.ts` — handle deferred large-audience sends, scheduled campaigns, and automation step execution outside the request/response cycle

## What's next

A few smaller items round out the original `CHECKLIST.md`:

- An `analytics-aggregator` worker that rolls `EmailEvent`s into denormalized summary tables — not yet needed since campaign stats are computed live via `count()` queries, which is plenty fast at the scale this scaffold targets
- Supabase Realtime wiring for live dashboard updates during a send (currently short-interval polling — see `useCampaignStats`) — a nice upgrade, not a functional gap
- Rate limiting on the public API, and general UI polish (Phase 7: dashboard charts, responsive pass, toasts)

To run the background workers locally alongside `npm run dev`:

```bash
npm run worker:campaign-sender -- --watch
npm run worker:automation-engine -- --watch
npm run worker:dns-verifier -- --watch
```

Two deliberate deviations from `API_REFERENCE.md`/`MODELS.md`, both noted inline in the code:

- The tracking pixel route is `/t/open/{jobId}` rather than `/t/open/{jobId}.png` — Next.js route segments don't carry a literal file extension well; the response still serves `image/png` either way.
- `SendingDomain` gained two fields beyond the original spec (`resendDomainId`, `dnsRecords`) to store what Resend's real Domains API actually returns, rather than inventing DNS record values ourselves.

## A note on this environment

This project was scaffolded in a sandboxed environment without general internet access, so two things couldn't be verified end-to-end here and are worth double-checking on your machine:

- `npx prisma generate` needs to download a platform-specific query engine binary from Prisma's CDN — this works normally wherever you run it with full internet access.
- `npm run build` / `npm run dev` should be run after step 3 above; the project type-checks cleanly once the Prisma client is generated (verified here with `tsc --noEmit` against everything except the Prisma-generated types themselves, which only exist after `prisma generate` runs).

## Sending with AWS SES + SNS instead of Resend

Set `EMAIL_PROVIDER=ses` (default is Resend). Mail is sent through Amazon SES; bounces, complaints
and rejects arrive via an SNS topic at `/api/webhooks/ses-sns`. Sending domains use SES Easy DKIM plus
a custom MAIL FROM subdomain (`mail.<domain>`), so SPF/DKIM/DMARC all align. The per-workspace Resend
API key in Settings is ignored in this mode. SNS does not send campaigns; SES does.

### Deployment steps

Prerequisites: an AWS account, [Terraform](https://developer.hashicorp.com/terraform/install) >= 1.5,
AWS CLI credentials with permission to create SES/SNS/IAM resources, and the app already deployed to
Vercel (steps 1-4 of the sections above).

1. **Install dependencies** (adds `@aws-sdk/client-sesv2`):
   ```
   npm install
   ```
2. **Create the AWS resources** (SNS topic, SES configuration set, IAM user). Pick the same region you
   will use for SES:
   ```
   cd infra/aws
   terraform init
   terraform apply -var region=eu-west-1
   ```
3. **Set the Vercel environment variables** from the Terraform outputs (see `.env.ses.example`):
   ```
   terraform output                                  # EMAIL_PROVIDER, SES_REGION, SES_CONFIGURATION_SET, SNS_TOPIC_ARN, SES_ACCESS_KEY_ID
   terraform output -raw SES_SECRET_ACCESS_KEY       # secret key
   ```
   Use the `SES_*` names exactly. Vercel reserves `AWS_*` names. `RESEND_API_KEY` and
   `RESEND_WEBHOOK_SECRET` are not needed in this mode.
4. **Redeploy to Vercel** so the new env vars and the `/api/webhooks/ses-sns` route are live.
5. **Subscribe the webhook to SNS.** The route confirms the subscription automatically:
   ```
   terraform apply -var region=eu-west-1 -var webhook_url=https://<your-app>/api/webhooks/ses-sns
   ```
   In the AWS console (SNS > Subscriptions), the status should read **Confirmed**.
6. **Add and verify your sending domain** in the app (Settings > Sending domains). Publish the DKIM
   CNAMEs and the MAIL FROM MX and TXT records shown there, add a DMARC TXT record at
   `_dmarc.<your-domain>`, then press refresh. DNS can take up to 48 hours; the `dns-verifier` cron
   re-checks automatically.
7. **Request SES production access** (SES console > Account dashboard). New accounts are in the
   sandbox: verified recipients only and 200 emails a day. Until this is approved, test sends to
   unverified addresses will fail.
8. **Send a test campaign** to your own address, then check that a deliberate bounce works: send to
   `bounce@simulator.amazonses.com` (works even in the sandbox) and confirm the subscriber is marked
   bounced.

### Troubleshooting

- **Subscription stuck on "Pending confirmation":** the webhook wasn't reachable or `SNS_TOPIC_ARN`
  doesn't match the topic. Fix the env var, redeploy, then re-run step 5.
- **`MessageRejected` / `Email address is not verified`:** the account is still in the SES sandbox or
  the domain isn't verified yet (steps 6 and 7).
- **Credentials error on send:** check that `SES_REGION`, `SES_ACCESS_KEY_ID` and `SES_SECRET_ACCESS_KEY`
  are set for the Production environment in Vercel.

To tear everything down: `cd infra/aws && terraform destroy`. Sending domains created through the app
live in SES but outside Terraform, so remove them in the app first.

More detail: `infra/aws/README.md`.
