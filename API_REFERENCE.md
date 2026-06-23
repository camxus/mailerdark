# Mailerdark — API Reference

All routes live under `/api/workspaces/{workspaceId}/...` and require either a Supabase session JWT (dashboard) or a scoped API key sent as `Authorization: Bearer flw_live_...` (public/integration use). Every response uses the envelope:

```json
{ "data": ..., "error": null }
```

or, on failure:

```json
{ "data": null, "error": { "code": "VALIDATION_ERROR", "message": "..." } }
```

Request bodies are validated with the same Zod schema on client and server, imported from `lib/validation/`.

## Subscribers

| Method | Path | Description |
|---|---|---|
| GET | `/subscribers` | List subscribers. Query params: `groupId`, `status`, `search`, `cursor`, `limit` |
| POST | `/subscribers` | Create a subscriber. Body: `{ email, customFields?, groupIds? }` |
| GET | `/subscribers/{id}` | Get one subscriber, including groups and field values |
| PATCH | `/subscribers/{id}` | Update email, status, or custom fields |
| DELETE | `/subscribers/{id}` | Permanently remove a subscriber |
| POST | `/subscribers/import` | Bulk import via CSV (multipart) or JSON array; returns a job id for progress polling |
| POST | `/subscribers/{id}/groups/{groupId}` | Add subscriber to a group (emits `subscriber:group-added`) |
| DELETE | `/subscribers/{id}/groups/{groupId}` | Remove subscriber from a group |

## Fields

| Method | Path | Description |
|---|---|---|
| GET | `/fields` | List custom field definitions |
| POST | `/fields` | Create a field. Body: `{ key, label, type }` |
| PATCH | `/fields/{id}` | Rename a field or change its label |
| DELETE | `/fields/{id}` | Delete a field definition (values remain in `customFields` JSON unless purged) |

## Groups

| Method | Path | Description |
|---|---|---|
| GET | `/groups` | List groups with subscriber counts |
| POST | `/groups` | Create a group. Body: `{ name, description? }` |
| PATCH | `/groups/{id}` | Rename/update description |
| DELETE | `/groups/{id}` | Delete a group (subscribers are kept, membership rows removed) |

## Campaigns

| Method | Path | Description |
|---|---|---|
| GET | `/campaigns` | List campaigns with status and stats summary |
| POST | `/campaigns` | Create a draft campaign. Body: `{ subject, fromName, fromEmail, replyTo?, htmlContent, audience }` |
| GET | `/campaigns/{id}` | Get full campaign detail |
| PATCH | `/campaigns/{id}` | Update a draft campaign |
| DELETE | `/campaigns/{id}` | Delete a draft campaign |
| POST | `/campaigns/{id}/preview` | Render the HTML with merge fields substituted for a sample/specific subscriber; returns `{ html, text }` |
| POST | `/campaigns/{id}/test-send` | Send to one or more test addresses without affecting campaign stats |
| POST | `/campaigns/{id}/schedule` | Body: `{ scheduledAt }`. Moves status to `SCHEDULED` |
| POST | `/campaigns/{id}/send-now` | Resolves the audience, enqueues `EmailJob`s, moves status to `SENDING` |
| POST | `/campaigns/{id}/pause` | Pauses an in-flight send |
| GET | `/campaigns/{id}/stats` | Sent/opened/clicked/bounced/unsubscribed counts and rates |
| POST | `/campaigns/{id}/resend` | Body: `{ mode: "non_openers" \| "new_subscribers" \| "duplicate" }`. Clones a `SENT` campaign into a new `DRAFT` scoped to that audience — non-openers get a frozen exact recipient list, new-subscribers gets the original's group/field criteria plus a "joined after" cutoff, duplicate reuses the original audience verbatim. Returns the new draft for review before sending. |

## Automations

| Method | Path | Description |
|---|---|---|
| GET | `/automations` | List automations with status and active-run counts |
| POST | `/automations` | Create a draft automation. Body: `{ name, triggerType, flowDefinition }` |
| GET | `/automations/{id}` | Get full automation detail including `flowDefinition` |
| PATCH | `/automations/{id}` | Update name or `flowDefinition` (only while `DRAFT` or `PAUSED`) |
| DELETE | `/automations/{id}` | Delete an automation; cascades to its runs |
| POST | `/automations/{id}/activate` | Validates the graph (single trigger node, no orphans, no cycles outside delay loops) and sets status `ACTIVE` |
| POST | `/automations/{id}/pause` | Sets status `PAUSED`; in-flight runs hold their position |
| GET | `/automations/{id}/runs` | List `AutomationRun`s with status and current node |

## Sending Domains

| Method | Path | Description |
|---|---|---|
| GET | `/domains` | List sending domains with DNS status |
| POST | `/domains` | Add a domain. Returns the required SPF/DKIM/DMARC DNS records to publish |
| POST | `/domains/{id}/verify` | Re-checks SPF (TXT), DKIM (TXT/CNAME), and DMARC (TXT) records via DNS lookup and the provider's verification API; updates status fields |
| DELETE | `/domains/{id}` | Remove a sending domain |

## API Keys & Settings

| Method | Path | Description |
|---|---|---|
| GET | `/api-keys` | List keys (name, scopes, last used — never the raw key) |
| POST | `/api-keys` | Create a key. Raw key is returned once in the response and never stored |
| DELETE | `/api-keys/{id}` | Revoke a key |
| GET | `/settings` | Workspace settings: name, default from-address, timezone |
| PATCH | `/settings` | Update workspace settings |
| GET | `/members` | List workspace members and roles |
| POST | `/members/invite` | Invite a user by email with a role |
| PATCH | `/members/{userId}` | Change a member's role |
| DELETE | `/members/{userId}` | Remove a member |

## Tracking (unauthenticated, signed)

| Method | Path | Description |
|---|---|---|
| GET | `/t/open/{jobId}.png` | 1x1 tracking pixel; records an `OPEN` `EmailEvent` and returns a transparent PNG |
| GET | `/t/click/{jobId}` | Records a `CLICK` `EmailEvent` then 302-redirects to the original `?url=` target |
| GET | `/t/unsubscribe/{jobId}` | One-click unsubscribe link required by RFC 8058; sets subscriber status to `UNSUBSCRIBED` |

These URLs are signed (HMAC over `jobId` + secret) so they cannot be guessed or replayed for a different job.

## Inbound Provider Webhooks

| Method | Path | Description |
|---|---|---|
| POST | `/webhooks/email-provider` | Receives delivery/bounce/complaint events from the outbound provider; verifies the provider's signature header, writes `EmailEvent`s, and republishes to the EventBus |

## Public API Documentation Page

The dashboard's "API Documentation" page (`/w/{workspaceId}/settings/api`) renders this reference interactively: each endpoint is shown with a live "Try it" panel pre-filled with the user's own API key, generated request/response examples, and copyable `curl` / Node / Python snippets. It is generated from a single OpenAPI 3.1 document (`lib/openapi/spec.ts`) so the reference page and the machine-readable spec can never drift apart.
