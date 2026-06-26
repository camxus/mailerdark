# MCP Integration Plan

## Overview
Add a floating AI input component to the workspace dashboard that accepts natural language commands to create campaigns and automations, with an interactive verification interface for clarifying details.

## Architecture

### 1. AI Command Parsing Layer (`lib/ai/assistant.ts`)
- Natural language parser that extracts intent (create campaign vs automation)
- Entity extraction: groups, delays, content templates
- Generates structured action objects for verification

### 2. AI Tools Layer (`lib/ai/tools.ts`)
- `createCampaignTool`: Creates draft campaign with extracted parameters
- `createAutomationTool`: Creates draft automation with flow definition
- Tools use existing validation schemas and Prisma client

### 3. Floating AI Input Component (`components/ai/floating-input.tsx`)
- Fixed position input at bottom-right of workspace shell
- Uses `useSearchParams` to detect workspace context
- Integrates with existing TanStack Query mutations

### 4. Verification Modal (`components/ai/verification-dialog.tsx`)
- Shows parsed intent with editable fields
- Follow-up questions interface (e.g., "Which group?", "What's the product name?")
- Confirmation creates the actual resource

### 5. Integration Point (`components/dashboard/shell.tsx`)
- Add FloatingInput component to render in workspace layout
- Ensure it's accessible from all workspace pages

## Implementation Steps

### Phase 1: Core AI Types and Tools
1. Create `lib/ai/types.ts` with:
   - `AIAction` union type (CampaignAction | AutomationAction)
   - `VerificationQuestion` type for follow-up prompts

2. Create `lib/ai/tools.ts`:
   - Implement tool functions that return structured actions
   - Integrate with `lib/queries/campaigns.ts` and `lib/queries/automations.ts`

3. Create `lib/ai/assistant.ts`:
   - `parseCommand(text, workspace)` → AIAction
   - Uses existing OpenRouter integration from `app/api/workspaces/[workspaceId]/ai/generate/route.ts`

### Phase 2: UI Components
4. Create `components/ai/floating-input.tsx`:
   - Keyboard shortcut: ⌘K or /
   - Modal trigger with Input that expands to full dialog

5. Create `components/ai/verification-dialog.tsx`:
   - Displays extracted parameters
   - Allows editing before creation
   - Shows "Create Campaign" / "Create Automation" button

### Phase 3: Natural Language Examples to Support
- "Create a mail for all users of [group] to welcome them to our new product"
  → Campaign with audience from specified group, generated welcome content
  
- "Create an automation for all new members with a delay of 2 days to announce premium membership"
  → Automation with SUBSCRIBER_CREATED trigger, 2-day delay node, send email node

- "Send a newsletter to active subscribers about {topic}"
  → Campaign with smart group filter

### Phase 4: API Endpoints
6. Add `app/api/workspaces/[workspaceId]/ai/command/route.ts`:
   - POST endpoint accepting natural language command
   - Returns parsed action or verification questions
   - Handles actual resource creation on confirmation

## Key Files to Modify/Create
- NEW: `lib/ai/types.ts`
- NEW: `lib/ai/assistant.ts`
- NEW: `lib/ai/tools.ts`
- NEW: `app/api/workspaces/[workspaceId]/ai/command/route.ts`
- NEW: `components/ai/floating-input.tsx`
- NEW: `components/ai/verification-dialog.tsx`
- MOD: `components/dashboard/shell.tsx` - add floating input

## Dependencies
- Uses existing: `@tanstack/react-query`, `zod`, `sonner` (for toasts)
- Existing AI integration: OpenRouter via `/api/workspaces/[workspaceId]/ai/generate/route.ts`
- Existing queries: `useCreateCampaign`, `useCreateAutomation`, `useGroups`