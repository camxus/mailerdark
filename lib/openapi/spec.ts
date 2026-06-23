/**
 * Single source of truth for Mailerdark's public API surface. Both the
 * machine-readable OpenAPI document (app/api/openapi/route.ts) and the
 * interactive "API & Documentation" settings page render from this list,
 * so they can never drift apart.
 *
 * Internal-only routes (auth, members, settings, tracking pixels, inbound
 * webhooks, the api-keys endpoints themselves) are deliberately excluded —
 * this covers what a workspace's own API key is meant to call.
 */

export type ApiParam = { name: string; type: string; required: boolean; description: string };

export type ApiEndpoint = {
  id: string;
  method: "GET" | "POST" | "PATCH" | "DELETE";
  path: string; // relative to /api/workspaces/{workspaceId}, with {placeholders}
  summary: string;
  description: string;
  scope: string;
  pathParams?: ApiParam[];
  queryParams?: ApiParam[];
  requestBodyExample?: object;
  responseExample: object;
};

export type ApiGroup = { name: string; endpoints: ApiEndpoint[] };

export const apiGroups: ApiGroup[] = [
  {
    name: "Subscribers",
    endpoints: [
      {
        id: "list-subscribers",
        method: "GET",
        path: "/subscribers",
        summary: "List subscribers",
        description: "Returns subscribers in this workspace, optionally filtered by group, status, or email search.",
        scope: "subscribers:read",
        queryParams: [
          { name: "groupId", type: "string", required: false, description: "Filter to members of this group." },
          { name: "status", type: "string", required: false, description: "SUBSCRIBED | UNSUBSCRIBED | BOUNCED | CLEANED" },
          { name: "search", type: "string", required: false, description: "Case-insensitive email substring match." },
          { name: "cursor", type: "string", required: false, description: "Subscriber id to page after." },
          { name: "limit", type: "number", required: false, description: "1–100, default 25." },
        ],
        responseExample: {
          subscribers: [{ id: "sub_123", email: "jane@example.com", status: "SUBSCRIBED", customFields: { first_name: "Jane" }, groups: [{ id: "grp_1", name: "Newsletter" }] }],
          nextCursor: null,
        },
      },
      {
        id: "create-subscriber",
        method: "POST",
        path: "/subscribers",
        summary: "Create a subscriber",
        description: "Adds a new subscriber, optionally assigning them to groups immediately.",
        scope: "subscribers:write",
        requestBodyExample: { email: "jane@example.com", customFields: { first_name: "Jane" }, groupIds: [] },
        responseExample: { id: "sub_123", email: "jane@example.com", status: "SUBSCRIBED", customFields: { first_name: "Jane" }, groups: [] },
      },
      {
        id: "get-subscriber",
        method: "GET",
        path: "/subscribers/{id}",
        summary: "Get a subscriber",
        description: "Returns full subscriber detail, including group membership and recent send activity.",
        scope: "subscribers:read",
        pathParams: [{ name: "id", type: "string", required: true, description: "Subscriber id." }],
        responseExample: { id: "sub_123", email: "jane@example.com", status: "SUBSCRIBED", customFields: {}, groups: [], activity: [] },
      },
      {
        id: "update-subscriber",
        method: "PATCH",
        path: "/subscribers/{id}",
        summary: "Update a subscriber",
        description: "Updates email, status, or custom field values. Custom fields are merged, not replaced.",
        scope: "subscribers:write",
        pathParams: [{ name: "id", type: "string", required: true, description: "Subscriber id." }],
        requestBodyExample: { status: "UNSUBSCRIBED" },
        responseExample: { id: "sub_123", email: "jane@example.com", status: "UNSUBSCRIBED" },
      },
      {
        id: "delete-subscriber",
        method: "DELETE",
        path: "/subscribers/{id}",
        summary: "Delete a subscriber",
        description: "Permanently removes a subscriber. This cannot be undone.",
        scope: "subscribers:write",
        pathParams: [{ name: "id", type: "string", required: true, description: "Subscriber id." }],
        responseExample: { id: "sub_123" },
      },
      {
        id: "add-subscriber-group",
        method: "POST",
        path: "/subscribers/{id}/groups/{groupId}",
        summary: "Add to group",
        description: "Adds a subscriber to a group. Idempotent — calling it twice is harmless.",
        scope: "subscribers:write",
        pathParams: [
          { name: "id", type: "string", required: true, description: "Subscriber id." },
          { name: "groupId", type: "string", required: true, description: "Group id." },
        ],
        responseExample: { subscriberId: "sub_123", groupId: "grp_1" },
      },
      {
        id: "remove-subscriber-group",
        method: "DELETE",
        path: "/subscribers/{id}/groups/{groupId}",
        summary: "Remove from group",
        description: "Removes a subscriber from a group.",
        scope: "subscribers:write",
        pathParams: [
          { name: "id", type: "string", required: true, description: "Subscriber id." },
          { name: "groupId", type: "string", required: true, description: "Group id." },
        ],
        responseExample: { subscriberId: "sub_123", groupId: "grp_1" },
      },
    ],
  },
  {
    name: "Groups",
    endpoints: [
      {
        id: "list-groups",
        method: "GET",
        path: "/groups",
        summary: "List groups",
        description: "Returns every group in this workspace with a live subscriber count.",
        scope: "subscribers:read",
        responseExample: [{ id: "grp_1", name: "Newsletter", description: null, subscriberCount: 1204 }],
      },
      {
        id: "create-group",
        method: "POST",
        path: "/groups",
        summary: "Create a group",
        description: "Creates a new group for segmentation.",
        scope: "subscribers:write",
        requestBodyExample: { name: "VIP Customers", description: "Top 10% by lifetime spend" },
        responseExample: { id: "grp_2", name: "VIP Customers", description: "Top 10% by lifetime spend", subscriberCount: 0 },
      },
      {
        id: "update-group",
        method: "PATCH",
        path: "/groups/{id}",
        summary: "Update a group",
        description: "Renames a group or changes its description.",
        scope: "subscribers:write",
        pathParams: [{ name: "id", type: "string", required: true, description: "Group id." }],
        requestBodyExample: { name: "VIP Customers 2024" },
        responseExample: { id: "grp_2", name: "VIP Customers 2024" },
      },
      {
        id: "delete-group",
        method: "DELETE",
        path: "/groups/{id}",
        summary: "Delete a group",
        description: "Deletes a group. Subscribers keep their other group memberships.",
        scope: "subscribers:write",
        pathParams: [{ name: "id", type: "string", required: true, description: "Group id." }],
        responseExample: { id: "grp_2" },
      },
    ],
  },
  {
    name: "Fields",
    endpoints: [
      {
        id: "list-fields",
        method: "GET",
        path: "/fields",
        summary: "List custom fields",
        description: "Returns every custom field definition for this workspace.",
        scope: "subscribers:read",
        responseExample: [{ id: "fld_1", key: "first_name", label: "First name", type: "TEXT" }],
      },
      {
        id: "create-field",
        method: "POST",
        path: "/fields",
        summary: "Create a custom field",
        description: "Defines a new custom field, available as {{key}} in campaign and automation content.",
        scope: "subscribers:write",
        requestBodyExample: { key: "plan", label: "Plan", type: "TEXT" },
        responseExample: { id: "fld_2", key: "plan", label: "Plan", type: "TEXT" },
      },
      {
        id: "delete-field",
        method: "DELETE",
        path: "/fields/{id}",
        summary: "Delete a custom field",
        description: "Deletes a field definition. Existing subscriber values for it are left untouched.",
        scope: "subscribers:write",
        pathParams: [{ name: "id", type: "string", required: true, description: "Field id." }],
        responseExample: { id: "fld_2" },
      },
    ],
  },
  {
    name: "Campaigns",
    endpoints: [
      {
        id: "list-campaigns",
        method: "GET",
        path: "/campaigns",
        summary: "List campaigns",
        description: "Returns campaigns with status and recipient counts.",
        scope: "campaigns:read",
        responseExample: [{ id: "cmp_1", subject: "March newsletter", status: "SENT", jobCount: 1204 }],
      },
      {
        id: "create-campaign",
        method: "POST",
        path: "/campaigns",
        summary: "Create a campaign",
        description: "Creates a draft campaign. Send it with the send-now or schedule endpoints once ready.",
        scope: "campaigns:write",
        requestBodyExample: {
          subject: "March newsletter",
          fromName: "Acme Inc.",
          fromEmail: "hello@mail.acme.com",
          htmlContent: "<p>Hi {{first_name}},</p>",
          audience: { groupIds: ["grp_1"] },
        },
        responseExample: { id: "cmp_2", status: "DRAFT" },
      },
      {
        id: "get-campaign",
        method: "GET",
        path: "/campaigns/{id}",
        summary: "Get a campaign",
        description: "Returns full campaign detail including HTML content and audience definition.",
        scope: "campaigns:read",
        pathParams: [{ name: "id", type: "string", required: true, description: "Campaign id." }],
        responseExample: { id: "cmp_2", subject: "March newsletter", status: "DRAFT" },
      },
      {
        id: "update-campaign",
        method: "PATCH",
        path: "/campaigns/{id}",
        summary: "Update a campaign",
        description: "Updates a draft campaign. Only draft campaigns can be edited.",
        scope: "campaigns:write",
        pathParams: [{ name: "id", type: "string", required: true, description: "Campaign id." }],
        requestBodyExample: { subject: "March newsletter (final)" },
        responseExample: { id: "cmp_2", subject: "March newsletter (final)" },
      },
      {
        id: "send-campaign-now",
        method: "POST",
        path: "/campaigns/{id}/send-now",
        summary: "Send now",
        description: "Resolves the audience and sends immediately.",
        scope: "campaigns:write",
        pathParams: [{ name: "id", type: "string", required: true, description: "Campaign id." }],
        responseExample: { totalRecipients: 1204, sentCount: 1204, failedCount: 0, deferredCount: 0 },
      },
      {
        id: "schedule-campaign",
        method: "POST",
        path: "/campaigns/{id}/schedule",
        summary: "Schedule a send",
        description: "Schedules a draft campaign for a future send time.",
        scope: "campaigns:write",
        pathParams: [{ name: "id", type: "string", required: true, description: "Campaign id." }],
        requestBodyExample: { scheduledAt: "2026-07-01T14:00:00.000Z" },
        responseExample: { id: "cmp_2", status: "SCHEDULED" },
      },
      {
        id: "campaign-stats",
        method: "GET",
        path: "/campaigns/{id}/stats",
        summary: "Get campaign stats",
        description: "Sent/opened/clicked/bounced/unsubscribed counts and rates.",
        scope: "campaigns:read",
        pathParams: [{ name: "id", type: "string", required: true, description: "Campaign id." }],
        responseExample: { sent: 1204, uniqueOpens: 612, openRate: 0.508, uniqueClicks: 89, clickRate: 0.074 },
      },
      {
        id: "resend-campaign",
        method: "POST",
        path: "/campaigns/{id}/resend",
        summary: "Resend",
        description:
          "Clones a SENT campaign into a new DRAFT scoped to one of three audiences: non-openers (frozen exact list), new subscribers (original audience criteria + a joined-after cutoff), or duplicate (the exact original audience again). Returns the new draft for review before sending — it is never sent automatically.",
        scope: "campaigns:write",
        pathParams: [{ name: "id", type: "string", required: true, description: "The original (sent) campaign id." }],
        requestBodyExample: { mode: "non_openers" },
        responseExample: { id: "cmp_3", status: "DRAFT", subject: "Re: March newsletter", recipientCount: 592 },
      },
    ],
  },
  {
    name: "Automations",
    endpoints: [
      {
        id: "list-automations",
        method: "GET",
        path: "/automations",
        summary: "List automations",
        description: "Returns automations with status and active-run counts.",
        scope: "automations:read",
        responseExample: [{ id: "aut_1", name: "Welcome series", status: "ACTIVE", activeRuns: 14 }],
      },
      {
        id: "get-automation",
        method: "GET",
        path: "/automations/{id}",
        summary: "Get an automation",
        description: "Returns the automation's full flow definition (nodes and edges).",
        scope: "automations:read",
        pathParams: [{ name: "id", type: "string", required: true, description: "Automation id." }],
        responseExample: { id: "aut_1", name: "Welcome series", status: "ACTIVE", flowDefinition: { nodes: [], edges: [] } },
      },
      {
        id: "activate-automation",
        method: "POST",
        path: "/automations/{id}/activate",
        summary: "Activate an automation",
        description: "Validates the flow graph and turns the automation on.",
        scope: "automations:write",
        pathParams: [{ name: "id", type: "string", required: true, description: "Automation id." }],
        responseExample: { id: "aut_1", status: "ACTIVE" },
      },
      {
        id: "pause-automation",
        method: "POST",
        path: "/automations/{id}/pause",
        summary: "Pause an automation",
        description: "Pauses the automation. In-flight runs hold their position until reactivated.",
        scope: "automations:write",
        pathParams: [{ name: "id", type: "string", required: true, description: "Automation id." }],
        responseExample: { id: "aut_1", status: "PAUSED" },
      },
      {
        id: "list-automation-runs",
        method: "GET",
        path: "/automations/{id}/runs",
        summary: "List automation runs",
        description: "Returns up to 100 recent runs with each subscriber's current status and node.",
        scope: "automations:read",
        pathParams: [{ name: "id", type: "string", required: true, description: "Automation id." }],
        responseExample: [{ id: "run_1", subscriberEmail: "jane@example.com", status: "WAITING", currentNodeId: "delay-1" }],
      },
    ],
  },
  {
    name: "Sending Domains",
    endpoints: [
      {
        id: "list-domains",
        method: "GET",
        path: "/domains",
        summary: "List sending domains",
        description: "Returns sending domains with SPF/DKIM/DMARC status.",
        scope: "settings:write",
        responseExample: [{ id: "dom_1", domain: "mail.acme.com", spfStatus: "VALID", dkimStatus: "VALID", dmarcStatus: "PENDING" }],
      },
      {
        id: "create-domain",
        method: "POST",
        path: "/domains",
        summary: "Add a sending domain",
        description: "Registers a domain and returns the DNS records you need to publish.",
        scope: "settings:write",
        requestBodyExample: { domain: "mail.acme.com" },
        responseExample: { id: "dom_1", domain: "mail.acme.com", dnsRecords: [{ record: "SPF", type: "TXT", name: "send", value: "v=spf1 include:..." }] },
      },
      {
        id: "verify-domain",
        method: "POST",
        path: "/domains/{id}/verify",
        summary: "Re-check a domain",
        description: "Re-checks DNS status for SPF, DKIM, and DMARC.",
        scope: "settings:write",
        pathParams: [{ name: "id", type: "string", required: true, description: "Domain id." }],
        responseExample: { id: "dom_1", spfStatus: "VALID", dkimStatus: "VALID", dmarcStatus: "VALID" },
      },
    ],
  },
];

export const allEndpoints: ApiEndpoint[] = apiGroups.flatMap((g) => g.endpoints);
