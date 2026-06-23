# Mailerdark — Build Checklist

## Phase 0 — Project Setup

- [ ] Initialize Next.js (App Router, TypeScript, Tailwind)
- [ ] Create Supabase project; capture URL, anon key, service role key
- [ ] Add Prisma, point `DATABASE_URL` at the Supabase Postgres connection string
- [ ] Write initial `schema.prisma` from MODELS.md, run first migration
- [ ] Enable Row Level Security on every tenant table; write the `workspace_id` policy
- [ ] Configure environment variables per CODE_STYLES.md naming convention

## Phase 1 — Auth & Workspace System

- [ ] Supabase Auth: email/password sign-up + sign-in pages
- [ ] On first sign-in, create a `User` row mirroring `auth.users`
- [ ] Workspace creation flow; creator becomes `OWNER`
- [ ] Workspace switcher in the dashboard shell
- [ ] `requireWorkspaceAccess` helper enforcing membership + role/scope
- [ ] Member invite flow (email invite, role assignment)

## Phase 2 — Subscribers, Fields & Groups

- [ ] Field definitions CRUD (Settings → Fields)
- [ ] Subscriber CRUD (table view with search, filter by group/field, pagination)
- [ ] Subscriber detail drawer: profile, custom field editor, group membership, activity timeline
- [ ] Group CRUD with live subscriber counts
- [ ] CSV import with column-to-field mapping and dedupe-by-email
- [ ] Group/field filter builder component (reused by Campaign audience picker and Automation filter nodes)

## Phase 3 — Campaign System

- [x] Campaign list (status, audience size, key stats)
- [x] Campaign editor: subject, from name/email, reply-to, HTML editor
- [x] Audience picker (group + field filter combination) reusing the Phase 2 filter builder
- [x] Live preview pane rendering merge fields against a real or sample subscriber
- [x] Test-send to arbitrary addresses
- [x] Schedule vs. send-now flows
- [x] Campaign stats page (sent/opened/clicked/bounced/unsubscribed)

## Phase 4 — Automation Engine (React Flow)

- [x] Automation list with status and active-run count
- [x] React Flow canvas with custom node types: Trigger, Filter, Delay, Send Email, Add to Group, Remove from Group, Exit
- [x] Node configuration side panels (each node type has tailored config fields)
- [x] Graph validation before activation (single trigger, no orphan nodes, no invalid edge refs)
- [x] `lib/automations/engine.ts`: pure `advanceRun` function covering every node type
- [x] Trigger wiring: subscriber-created, added-to-group, field-changed, campaign-opened/clicked

## Phase 5 — Sending & Worker System

- [x] `EmailProvider` interface + Resend implementation
- [x] Merge-field rendering (`lib/email/render.ts`)
- [x] `EmailJob` queue table + `campaign-sender` worker
- [x] `automation-engine` worker polling `AutomationRun`s in `WAITING`/`RUNNING` state
- [ ] Rate limiting / throttling to respect provider sending limits
- [ ] Retry + backoff policy for transient send failures

## Phase 6 — Tracking & Analytics

- [x] Signed tracking pixel endpoint (`/t/open/{jobId}`)
- [x] Signed click-redirect endpoint (`/t/click/{jobId}`)
- [x] One-click unsubscribe endpoint (RFC 8058 compliant headers on outbound mail)
- [x] Inbound provider webhook handler with signature verification (`/api/webhooks/email-provider`, Svix-style HMAC check)
- [ ] `analytics-aggregator` worker rolling `EmailEvent`s into per-campaign/per-automation summary tables (campaign stats currently computed live via `count()` queries — fine at this scale, revisit if `EmailEvent` volume grows large)
- [ ] Dashboard analytics widgets wired to Realtime for live updates during a send (currently short-interval polling while a campaign is `SENDING` — see `useCampaignStats`)

## Phase 7 — WebClient UI Polish

- [ ] Dashboard home: subscriber growth, recent campaign performance, active automations
- [ ] Responsive layout pass (desktop-first, usable on tablet)
- [ ] Empty states and onboarding checklist for new workspaces
- [ ] Toasts/optimistic UI for all mutations

## Phase 8 — Sending Domains & DNS Validation

- [x] Add-domain flow showing required SPF/DKIM/DMARC records (records come directly from Resend's Domains API, not guessed)
- [x] DNS lookup via Node's `dns` module (`resolveTxt`) cross-checked against the provider's verification API — SPF/DKIM status from Resend, DMARC checked independently since Resend doesn't track it
- [x] `dns-verifier` worker re-checking pending domains on an interval
- [x] Status badges (Pending/Valid/Invalid) per record type in Settings → Domains

## Phase 9 — Public API & Documentation Page

- [x] API key generation/revocation UI, raw key shown once
- [x] Scoped API key middleware (separate from session auth) — see `requireWorkspaceAccess`
- [x] OpenAPI 3.1 spec generated from `lib/openapi/spec.ts`, served at `/api/openapi`
- [x] Interactive API Documentation page rendering the spec with "Try it" + code snippets (curl/Node/Python)
- [ ] Rate limiting on the public API distinct from dashboard usage

## Phase 10 — Settings & Workspace Administration

- [ ] Workspace profile (name, default from-address, timezone)
- [ ] Member management (roles, removal)
- [ ] Billing/plan placeholder (if monetization is in scope later)
- [ ] Audit log of sensitive actions (API key created, domain added, member role changed)
