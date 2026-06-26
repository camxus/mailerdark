# AI Workspace Copilot - MCP Integration Plan

## Overview

Implement a workspace-wide AI Copilot capable of understanding natural language commands and converting them into campaigns, automations, groups, searches, exports, analytics, and content generation workflows.

The system should function as an intelligent operator rather than a simple text parser.

---

# Goals

Users should be able to type:

* Create a welcome campaign for premium users
* Create an onboarding automation for new subscribers
* Find inactive subscribers
* Export all premium members
* Generate a newsletter about our new AI feature
* Show campaigns with the highest open rate
* Create a group of users who joined this month

And have the AI:

1. Understand intent
2. Resolve workspace context
3. Ask clarification questions when necessary
4. Generate an execution plan
5. Present a preview
6. Execute actions
7. Return results

---

# Architecture

```text
User
 ↓
AI Planner
 ↓
Execution Plan
 ↓
Missing Fields?
 ↓
Verification Questions
 ↓
Execution Preview
 ↓
Tool Execution
 ↓
Success Response
```

---

# Core Components

## Planner

Location:

```text
lib/ai/planner.ts
```

Responsibilities:

* Intent detection
* Entity extraction
* Workspace context understanding
* Missing field detection
* Plan generation

### Example

Input:

```text
Create an onboarding email for new users
```

Output:

```ts
{
  intent: "create_campaign",

  confidence: 0.95,

  summary: "Create onboarding campaign",

  extracted: {
    audience: null,
    emailType: "welcome"
  },

  missingFields: [
    "audience"
  ]
}
```

---

# Intent System

```ts
export type AIIntent =
  | "create_campaign"
  | "create_automation"
  | "create_group"

  | "search_subscribers"
  | "search_groups"
  | "search_campaigns"
  | "search_automations"

  | "export_subscribers"
  | "export_groups"
  | "export_campaigns"

  | "campaign_analytics"
  | "subscriber_analytics"

  | "generate_email"
  | "generate_newsletter"

  | "unknown";
```

---

# Workspace Context

Location:

```text
lib/ai/context.ts
```

Before planning, load workspace data.

```ts
export interface WorkspaceContext {
  groups: Group[];

  campaigns: Campaign[];

  automations: Automation[];

  templates: Template[];
}
```

Example:

```text
Groups:
- Premium Users
- Trial Users
- Customers

Templates:
- Welcome
- Newsletter
- Promotion
```

This allows AI to resolve references automatically.

Example:

```text
Send newsletter to premium users
```

Automatically resolves:

```ts
groupId: "grp_premium"
```

without clarification.

---

# Planning Output

```ts
export interface AIPlan {
  intent: AIIntent;

  confidence: number;

  summary: string;

  extracted: Record<string, unknown>;

  missingFields: string[];

  steps: PlanStep[];
}
```

---

# Clarification Engine

Location:

```text
lib/ai/verification.ts
```

When required fields are missing:

```ts
{
  status: "needs_clarification",

  questions: [...]
}
```

---

# Verification Question Types

```ts
export type VerificationQuestion =
  | {
      id: string;
      type: "text";
      label: string;
    }
  | {
      id: string;
      type: "textarea";
      label: string;
    }
  | {
      id: string;
      type: "number";
      label: string;
    }
  | {
      id: string;
      type: "date";
      label: string;
    }
  | {
      id: string;
      type: "select";
      label: string;
      options: string[];
    }
  | {
      id: string;
      type: "multiselect";
      label: string;
      options: string[];
    };
```

---

# Examples

## Missing Audience

User:

```text
Create a newsletter
```

AI:

```ts
{
  status: "needs_clarification",

  questions: [
    {
      id: "audience",
      type: "select",
      label: "Who should receive this newsletter?",
      options: [
        "All Subscribers",
        "Premium Users",
        "Trial Users"
      ]
    }
  ]
}
```

---

## Multiple Matches

User:

```text
Send email to customers
```

Workspace:

```text
Customers
Customers EU
Customers US
```

AI:

```ts
{
  status: "needs_clarification",

  questions: [
    {
      id: "group",
      type: "select",
      options: [
        "Customers",
        "Customers EU",
        "Customers US"
      ]
    }
  ]
}
```

---

# Conversation State

Location:

```text
lib/ai/session.ts
```

```ts
export interface AIConversationState {
  sessionId: string;

  workspaceId: string;

  plan: AIPlan;

  collectedValues: Record<string, unknown>;

  pendingQuestions: VerificationQuestion[];

  completed: boolean;
}
```

---

# Tool Registry

Location:

```text
lib/ai/tools/index.ts
```

```ts
export const tools = {
  createCampaign,
  createAutomation,
  createGroup,

  searchSubscribers,
  searchGroups,
  searchCampaigns,
  searchAutomations,

  exportSubscribers,
  exportGroups,
  exportCampaigns,

  campaignAnalytics,
  subscriberAnalytics,

  generateEmail,
  generateNewsletter
};
```

---

# Search Functionality

## Search Subscribers

Examples:

```text
Find inactive subscribers

Find users from Germany

Find premium users

Find users who joined this month
```

Planner:

```ts
{
  intent: "search_subscribers",

  filters: {
    status: "inactive"
  }
}
```

Tool:

```ts
searchSubscribers()
```

Result:

```text
Found 1,247 inactive subscribers.

Actions:
- Export
- Create Campaign
- Add to Group
```

---

# Export Functionality

Supported formats:

```ts
export type ExportFormat =
  | "csv"
  | "xlsx"
  | "json";
```

---

## Export Subscribers

Examples:

```text
Export all subscribers

Export premium members

Export inactive users
```

Intent:

```ts
{
  intent: "export_subscribers"
}
```

---

## Export Groups

Examples:

```text
Export all groups
```

Intent:

```ts
{
  intent: "export_groups"
}
```

---

## Export Campaigns

Examples:

```text
Export campaign performance
```

Intent:

```ts
{
  intent: "export_campaigns"
}
```

---

# Content Generation

Location:

```text
lib/ai/tools/content.ts
```

Functions:

```ts
generateEmail()
generateNewsletter()
```

Generated fields:

```ts
{
  subject,
  previewText,
  html
}
```

---

# Campaign Creation Flow

User:

```text
Create welcome email for premium users
```

Planner:

```ts
{
  intent: "create_campaign",

  extracted: {
    audience: "Premium Users",
    type: "welcome"
  }
}
```

Generate:

```ts
{
  subject,
  previewText,
  html
}
```

Show preview.

---

# Automation Creation Flow

User:

```text
Create automation for new subscribers with a 2 day delay
```

Generated plan:

```ts
{
  trigger: "SUBSCRIBER_CREATED",

  steps: [
    {
      type: "delay",
      days: 2
    },
    {
      type: "send_email"
    }
  ]
}
```

---

# Execution Preview

Before any create action:

```text
You're about to create:

Campaign:
Welcome Campaign

Audience:
Premium Users

Recipients:
2,483

Subject:
Welcome to Premium

[Edit]
[Create]
```

Nothing executes automatically.

User must confirm.

---

# Floating Command Palette

Location:

```text
components/ai/command-palette.tsx
```

Keyboard shortcuts:

```text
⌘K
Ctrl+K
/
```

Capabilities:

* Create campaign
* Create automation
* Search subscribers
* Export data
* Analytics
* Generate content

---

# Streaming Responses

Location:

```text
app/api/workspaces/[workspaceId]/ai/stream/route.ts
```

Example:

```text
Analyzing workspace...

Found Premium Users group...

Generating campaign...

Preparing preview...
```

Uses:

```ts
ReadableStream
```

for progressive updates.

---

# API Endpoints

```text
app/api/workspaces/[workspaceId]/ai/

├── command/route.ts
├── execute/route.ts
├── session/route.ts
├── stream/route.ts
└── verify/route.ts
```

---

# File Structure

```text
lib/
└── ai/
    ├── planner.ts
    ├── context.ts
    ├── session.ts
    ├── verification.ts
    ├── types.ts
    │
    ├── prompts/
    │   ├── planner.ts
    │   ├── content.ts
    │   └── verification.ts
    │
    └── tools/
        ├── campaign.ts
        ├── automation.ts
        ├── groups.ts
        ├── search.ts
        ├── exports.ts
        ├── analytics.ts
        ├── content.ts
        └── index.ts

components/
└── ai/
    ├── command-palette.tsx
    ├── floating-input.tsx
    ├── verification-dialog.tsx
    ├── execution-preview.tsx
    └── ai-chat-panel.tsx

app/api/workspaces/[workspaceId]/
└── ai/
    ├── command/
    ├── execute/
    ├── session/
    ├── stream/
    └── verify/
```

# Phase Order

## Phase 1

* Intent system
* Planner
* Tool registry
* Workspace context

## Phase 2

* Verification questions
* Session management
* Execution preview

## Phase 3

* Campaign creation
* Automation creation
* Group creation

## Phase 4

* Search subscribers
* Search campaigns
* Search groups

## Phase 5

* Export functionality

## Phase 6

* Content generation

## Phase 7

* Analytics

## Phase 8

* Streaming responses
* Command palette improvements
* AI chat panel

```
```
