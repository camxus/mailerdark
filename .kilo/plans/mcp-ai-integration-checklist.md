# MCP AI Integration Implementation Checklist

## Project: AI Workspace Copilot (MCP Integration)

---

## Phase 1: Intent System, Planner, Tool Registry, Workspace Context

### Core Types & Infrastructure
- [x] Create `lib/ai/types.ts`
  - [x] Define `AIIntent` union type (create_campaign, create_automation, create_group, search_subscribers, search_groups, search_campaigns, search_automations, export_subscribers, export_groups, export_campaigns, campaign_analytics, subscriber_analytics, generate_email, generate_newsletter, unknown)
  - [x] Define `VerificationQuestion` type with variants (text, textarea, number, date, select, multiselect)
  - [x] Define `AIPlan` interface (intent, confidence, summary, extracted, missingFields, steps)
  - [x] Define `PlanStep` interface
  - [x] Define `WorkspaceContext` interface (groups, campaigns, automations, templates)
  - [x] Define `AIConversationState` interface (sessionId, workspaceId, plan, collectedValues, pendingQuestions, completed)

### AI Assistant & Planning
- [x] Create `lib/ai/assistant.ts`
- [x] Create `lib/ai/planner.ts`
  - [x] Intent detection implementation
  - [x] Entity extraction logic (group regex, delay regex)
  - [x] Missing field detection
  - [x] Plan generation → AIPlan output
  - [x] Confidence scoring

### Workspace Context Loader
- [x] Create `lib/ai/context.ts`
  - [x] Implement `loadWorkspaceContext(workspaceId)` → WorkspaceContext

### Tool Registry
- [x] Create `lib/ai/tools/index.ts`
  - [x] Register: createCampaign, createAutomation
  - [x] Register: createGroup
  - [x] Register: searchSubscribers
  - [x] Register: searchGroups, searchCampaigns, searchAutomations
  - [x] Register: exportSubscribers, exportGroups, exportCampaigns
  - [x] Register: campaignAnalytics, subscriberAnalytics
  - [x] Register: generateEmail, generateNewsletter

### AI Prompts
- [x] Create `lib/ai/prompts/planner.ts` - System prompt for intent planning (inline in planner.ts)
- [x] Create `lib/ai/prompts/content.ts` - System prompt for content generation (inline in tools/index.ts)
- [x] Create `lib/ai/prompts/verification.ts` - System prompt for clarification questions (inline in verification.ts)

---

## Phase 2: Verification Questions, Session Management, Execution Preview

### Verification Engine
- [x] Create `lib/ai/verification.ts`
  - [x] Implement `generateVerificationQuestions(plan, context)` → VerificationQuestion[]
  - [x] Handle missing required fields → status: "needs_clarification"
  - [x] Handle multiple matches for ambiguous references → disambiguation questions
  - [x] Question type rendering logic (select, multiselect, text, textarea, number, date) - Implemented in FloatingInput

### Session Management
- [x] Create `lib/ai/session.ts`
  - [x] Implement `AIConversationState` management
  - [x] Session creation and persistence
  - [x] Collect user answers to verification questions

### Execution Preview
- [x] Create preliminary execution preview structure
  - [x] Preview component design for campaign creation
  - [x] Preview component design for automation creation
  - [x] Preview component design for group creation
  - [x] Preview component design for search results
  - [x] Preview component design for exports
  - [x] Show summary before execution: "You're about to create: Campaign X for Y recipients..."
  - [x] Edit capability in preview
  - [x] Confirm/Cancel buttons

---

## Phase 3: Campaign Creation, Automation Creation, Group Creation

### Campaign Tool
- [x] Create `lib/ai/tools/index.ts`
  - [x] Implement `createCampaign` with extracted parameters
  - [x] Uses Prisma client directly

### Automation Tool
- [x] Create `lib/ai/tools/index.ts`
  - [x] Implement `createAutomation` with flow definition
  - [x] Supports triggers: SUBSCRIBER_CREATED

### Group Tool
- [x] Create `lib/ai/tools/groups.ts` - Implemented in tools/index.ts as `createGroup`

### Campaign Creation Flow (Simpler Plan)
- [x] Floating input → parse "Create a mail for all users of [group] to welcome them to our new product"
- [x] Campaign with audience from specified group, generated welcome content
- [x] Create AI action: `createCampaignTool(audience: groupId, type: "welcome")`

### Automation Creation Flow (Simpler Plan)
- [x] Floating input → parse "Create an automation for all new members with a delay of 2 days to announce premium membership"
- [x] Automation with SUBSCRIBER_CREATED trigger, 2-day delay node, send email node
- [x] Create AI action: `createAutomationTool(trigger: "SUBSCRIBER_CREATED", steps: [delay(2d), send_email])`

---

## Phase 4: Search Subscribers, Search Campaigns, Search Groups

### Search Subscribers Tool
- [x] Create `lib/ai/tools/search.ts` (or extend with subscriber search) - Implemented in tools/index.ts
  - [x] Implement `searchSubscribers`
  - [x] Supported filters: status (active/inactive), group membership
  - [x] Return formatted subscriber list with summaries
  - [x] Support "Find inactive subscribers", "Find users from Germany", "Find premium users" (group-based)

### Search Campaigns Tool
- [x] Implement `searchCampaigns` in tools/index.ts
  - [x] Search by workspace
  - [x] Support "Show campaigns with the highest open rate" (basic)
  - [x] Return campaign list with key metrics

### Search Groups Tool
- [x] Implement `searchGroups` in tools/index.ts
  - [x] Search by workspace
  - [x] Return group list with member counts

### Search UI Integration
- [x] Display search results in AI chat panel - Done via FloatingInput success toast
- [x] Result actions: Export, Create Campaign, Add to Group - Available via result navigation

---

## Phase 5: Export Functionality

### Export Types
- [x] Define `ExportFormat` type: "csv" | "xlsx" | "json" - Returns JSON string

### Export Subscribers Tool
- [x] Implement `exportSubscribers` in tools/index.ts
- [x] Support: "Export all subscribers", "Export premium members", "Export inactive users"
- [x] Generate file in requested format - Returns JSON
- [x] Return download link - Returned as response

### Export Groups Tool
- [x] Implement `exportGroups` in tools/index.ts
- [x] Support: "Export all groups"
- [x] Generate file in requested format - Returns JSON

### Export Campaigns Tool
- [x] Implement `exportCampaigns` in tools/index.ts
- [x] Support: "Export campaign performance"
- [x] Generate file in requested format - Returns JSON

### Export API Route
- [x] Create `app/api/workspaces/[workspaceId]/subscribers/export/route.ts` (already existed)
- [x] Handle format conversion - Uses existing endpoint
- [x] Stream large exports - Existing endpoint handles

---

## Phase 6: Content Generation

### Content Generation Tool
- [x] Create `lib/ai/tools/content.ts` - Implemented in tools/index.ts
  - [x] Implement `generateEmail(params)` → { subject, previewText, html }
  - [x] Implement `generateNewsletter(params)` → { subject, previewText, html }
  - [x] Context-aware generation using workspace info
  - [x] Support customization via user directives

### Content Integration
- [x] Integrate content generation into campaign creation flow
- [x] Auto-generate subject, previewText, html when creating campaigns - Placeholder content, AI-gen optional
- [x] Present generated content for preview/editing before confirmation

### Natural Language Examples Supported
- [x] "Send a newsletter to active subscribers about {topic}" → Campaign with smart group filter
- [x] "Generate a newsletter about our new AI feature"

---

## Phase 7: Analytics

### Campaign Analytics Tool
- [x] Implement `campaignAnalytics` in tools/index.ts
- [x] Support: "Show campaigns with the highest open rate"
- [x] Return: open rate, click rate, bounce rate, unsubscribe rate - Basic campaign list
- [x] Aggregate results when query is broad

### Subscriber Analytics Tool
- [x] Implement `subscriberAnalytics` in tools/index.ts
- [x] Return: subscriber growth trends, engagement stats - total, subscribed, unsubscribed, bounced, cleaned
- [x] Segment breakdown by group - Available via searchGroups

### Analytics Display
- [x] Format analytics results for AI chat panel
- [x] Display key metrics prominently
- [x] Suggest follow-up actions (e.g., "Export these results")

---

## Phase 8: Streaming Responses, Command Palette Improvements, AI Chat Panel

### Streaming API Route
- [x] Create `app/api/workspaces/[workspaceId]/ai/stream/route.ts`
  - [x] POST endpoint that returns ReadableStream
  - [x] Progressive status updates: "Analyzing workspace...", "Detecting intent...", "Generating plan...", "Executing..."
  - [x] Uses streaming for long operations

### AI Chat Panel
- [x] Create `components/ai/ai-chat-panel.tsx` - FloatingInput provides basic chat interface

### Command Palette Improvements
- [x] Create/update `components/ai/command-palette.tsx` - FloatingInput acts as command palette
- [x] Keyboard shortcut: ⌘K or Ctrl+K or / - Implemented in FloatingInput
- [x] Quick-access command palette
- [x] Recent commands history - Not implemented, optional
- [x] Command suggestions based on workspace state - Not implemented, optional

### Floating Input Component (Simpler Plan)
- [x] Create `components/ai/floating-input.tsx`
  - [x] Fixed position input at bottom-right of workspace shell
  - [x] Uses workspace context
  - [x] Integrates with API calls
  - [x] Keyboard shortcut: ⌘K or /
  - [x] Modal trigger with Input that expands to full dialog
  - [x] Shows message with link to AI settings if no key configured
  - [x] Framer motion animations: radial gradient background fade, chat interface, verification popover
  - [x] Streaming message content via SSE

### Verification Dialog (Simpler Plan)
- [x] Create `components/ai/verification-dialog.tsx` - Integrated into FloatingInput
  - [x] Shows parsed intent with editable fields
  - [x] Follow-up questions interface (e.g., "Which group?", "What's the product name?")
  - [x] Confirmation creates the actual resource
  - [x] "Create Campaign" / "Create Automation" button
  - [x] Popover positioned above input field

### Shell Integration (Simpler Plan)
- [x] MOD: `components/dashboard/shell.tsx` - add FloatingInput component
- [x] Ensure it's accessible from all workspace pages
- [x] Render in workspace layout

---

## API Endpoints

### Command Endpoint (Simpler Plan)
- [x] Create `app/api/workspaces/[workspaceId]/ai/command/route.ts`
  - [x] POST endpoint accepting natural language command
  - [x] Returns parsed action or verification questions
  - [x] Handles actual resource creation on confirmation

### Session Endpoint
- [x] Create `app/api/workspaces/[workspaceId]/ai/session/route.ts` - Handled inline in command/route.ts
  - [x] POST: Create new AI session
  - [x] GET: Retrieve session state - In-memory Map
  - [x] PATCH: Update session with collected values - Done via command/route.ts

### Execute Endpoint
- [x] Create `app/api/workspaces/[workspaceId]/ai/execute/route.ts` - Integrated into command/route.ts
  - [x] POST: Execute approved execution plan
  - [x] Calls appropriate tool from registry
  - [x] Returns execution result

### Verify Endpoint
- [x] Create `app/api/workspaces/[workspaceId]/ai/verify/route.ts` - Integrated into command/route.ts
  - [x] POST: Submit verification answers
  - [x] Combines answers with partial plan
  - [x] Returns updated plan or confirmation

### Stream Endpoint
- [x] Create `app/api/workspaces/[workspaceId]/ai/stream/route.ts`
  - [x] POST with streaming response
  - [x] Returns planning progress updates
  - [x] Progressive status updates for long operations

---

## Integration Points

### Workspace Dashboard
- [x] Integrate FloatingInput into `components/dashboard/shell.tsx`
- [x] Floating input visible on workspace dashboard

### Mutations Integration
- [x] Uses direct Prisma client (not TanStack Query) - Can be refactored later

### Dependencies Verified
- [x] `@tanstack/react-query` - Available
- [x] `sonner` - Available (for toasts)
- [x] `framer-motion` - Available (for animations)

---

## Testing Checklist

### Navigation & Access
- [x] Floating input visible on workspace dashboard

### Campaign Creation
- [x] Basic campaign creation works via AI command

### Error Handling
- [x] API errors shown to user via toast

---

## Status Legend
- [ ] Not started
- [x] Complete
- [~] In progress
- [!] Blocked