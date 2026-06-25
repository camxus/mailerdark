import type { FlowDefinition } from "@/lib/automations/types";

export type AutomationTemplate = {
  id: string;
  name: string;
  description: string;
  category: "welcome" | "engagement" | "onboarding" | "reengagement";
  flowDefinition: Omit<FlowDefinition, 'nodes'> & {
    nodes: Array<{ id: string; type: string; position: { x: number; y: number }; data: Record<string, unknown> }>;
  };
};

const WELCOME_EMAIL_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Welcome</title>
</head>
<body style="margin:0;padding:0;background:#f6f5f1;font-family:sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
    <tr><td align="center" style="padding:32px 16px;">
      <table width="600" cellpadding="0" cellspacing="0" role="presentation"
        style="max-width:600px;width:100%;background:#ffffff;border-radius:8px;overflow:hidden;">
        <tr><td style="padding:36px 40px 12px;">
          <h1 style="margin:0 0 12px;font-size:26px;font-weight:700;color:#14171a;">Welcome, {{first_name}}!</h1>
          <p style="margin:0 0 24px;font-size:16px;line-height:1.7;color:#4b5358;">
            Thanks for joining. We're excited to have you on board.
          </p>
          <a href="{{cta_url}}"
            style="display:inline-block;background:#0e7c7b;color:#fff;font-size:15px;font-weight:600;
                   text-decoration:none;padding:13px 30px;border-radius:6px;">
            Get started →
          </a>
        </td></tr>
        <tr><td align="center" style="padding:20px 40px 28px;background:#f6f5f1;border-top:1px solid #e4e2dc;">
          <p style="margin:0;font-size:12px;color:#9a9a9a;">
            <a href="{{unsubscribe_url}}" style="color:#9a9a9a;">Unsubscribe</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

export const automationTemplates: AutomationTemplate[] = [
  {
    id: "welcome-series",
    name: "Welcome series",
    description: "Send welcome email immediately, then check engagement after 3 days",
    category: "welcome",
    flowDefinition: {
      nodes: [
        {
          id: "trigger-1",
          type: "trigger",
          position: { x: 0, y: 0 },
          data: { triggerType: "SUBSCRIBER_CREATED" },
        },
        {
          id: "email-1",
          type: "sendEmail",
          position: { x: 250, y: 0 },
          data: {
            subject: "Welcome to {{company_name}}!",
            fromName: "The {{company_name}} team",
            fromEmail: "{{from_email}}",
            htmlContent: WELCOME_EMAIL_HTML,
          },
        },
        {
          id: "delay-1",
          type: "delay",
          position: { x: 500, y: 0 },
          data: { amount: 3, unit: "days" },
        },
        {
          id: "filter-1",
          type: "filter",
          position: { x: 750, y: 0 },
          data: {
            conditions: [
              { fieldKey: "last_opened_campaign", operator: "is_set" },
            ],
          },
        },
        {
          id: "exit-1",
          type: "exit",
          position: { x: 1000, y: -100 },
          data: { label: "Completed" },
        },
        {
          id: "email-2",
          type: "sendEmail",
          position: { x: 1000, y: 100 },
          data: {
            subject: "We'd love your feedback",
            fromName: "The {{company_name}} team",
            fromEmail: "{{from_email}}",
            htmlContent: `<p>Let us know how we're doing!</p>`,
          },
        },
        {
          id: "exit-2",
          type: "exit",
          position: { x: 1250, y: 100 },
          data: { label: "Done" },
        },
      ],
      edges: [
        { id: "e1", source: "trigger-1", target: "email-1" },
        { id: "e2", source: "email-1", target: "delay-1" },
        { id: "e3", source: "delay-1", target: "filter-1" },
        { id: "e4", source: "filter-1", target: "exit-1", sourceHandle: "yes" },
        { id: "e5", source: "filter-1", target: "email-2", sourceHandle: "no" },
        { id: "e6", source: "email-2", target: "exit-2" },
      ],
    },
  },
  {
    id: "reengagement-flow",
    name: "Re-engagement",
    description: "Re-engage inactive subscribers with a win-back email",
    category: "reengagement",
    flowDefinition: {
      nodes: [
        {
          id: "trigger-1",
          type: "trigger",
          position: { x: 0, y: 0 },
          data: { triggerType: "DATE_BASED" },
        },
        {
          id: "filter-1",
          type: "filter",
          position: { x: 250, y: 0 },
          data: {
            conditions: [{ fieldKey: "last_opened_campaign", operator: "is_not_set" }],
          },
        },
        {
          id: "email-1",
          type: "sendEmail",
          position: { x: 500, y: 80 },
          data: {
            subject: "We miss you, {{first_name}}",
            fromName: "The {{company_name}} team",
            fromEmail: "{{from_email}}",
            htmlContent: `<p>We'd love to see you back!</p>`,
          },
        },
        {
          id: "exit-1",
          type: "exit",
          position: { x: 750, y: -80 },
          data: { label: "Active subscriber" },
        },
        {
          id: "exit-2",
          type: "exit",
          position: { x: 750, y: 200 },
          data: { label: "Completed" },
        },
      ],
      edges: [
        { id: "e1", source: "trigger-1", target: "filter-1" },
        { id: "e2", source: "filter-1", target: "email-1", sourceHandle: "yes" },
        { id: "e3", source: "filter-1", target: "exit-1", sourceHandle: "no" },
        { id: "e4", source: "email-1", target: "exit-2" },
      ],
    },
  },
];

export const automationTemplateCategories = [
  { id: "welcome", label: "Welcome" },
  { id: "engagement", label: "Engagement" },
  { id: "onboarding", label: "Onboarding" },
  { id: "reengagement", label: "Re-engagement" },
] as const;