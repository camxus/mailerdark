# Mailerdark — Data Models

Canonical schema, expressed as Prisma models. `snake_case` in the database via `@map`/`@@map`, `camelCase` in application code. All tenant tables include `workspace_id` and are covered by an RLS policy of the form `workspace_id = auth.workspace_id()`.

## Core Tenancy

```prisma
model Workspace {
  id          String   @id @default(uuid())
  name        String
  slug        String   @unique
  createdAt   DateTime @default(now()) @map("created_at")
  members     WorkspaceMember[]
  subscribers Subscriber[]
  groups      Group[]
  fields      Field[]
  campaigns   Campaign[]
  automations Automation[]
  domains     SendingDomain[]
  apiKeys     ApiKey[]

  @@map("workspaces")
}

model User {
  id        String   @id @default(uuid()) // mirrors Supabase auth.users.id
  email     String   @unique
  fullName  String?  @map("full_name")
  createdAt DateTime @default(now()) @map("created_at")
  memberships WorkspaceMember[]

  @@map("users")
}

model WorkspaceMember {
  workspaceId String   @map("workspace_id")
  userId      String   @map("user_id")
  role        Role     @default(MEMBER)
  workspace   Workspace @relation(fields: [workspaceId], references: [id])
  user        User      @relation(fields: [userId], references: [id])

  @@id([workspaceId, userId])
  @@map("workspace_members")
}

enum Role {
  OWNER
  ADMIN
  MEMBER
}
```

## Subscribers, Fields, Groups

```prisma
model Subscriber {
  id           String   @id @default(uuid())
  workspaceId  String   @map("workspace_id")
  email        String
  status       SubscriberStatus @default(SUBSCRIBED)
  customFields Json     @default("{}") @map("custom_fields") // keyed by Field.key
  createdAt    DateTime @default(now()) @map("created_at")
  unsubscribedAt DateTime? @map("unsubscribed_at")

  groups       SubscriberGroup[]
  emailJobs    EmailJob[]
  automationRuns AutomationRun[]

  @@unique([workspaceId, email])
  @@map("subscribers")
}

enum SubscriberStatus {
  SUBSCRIBED
  UNSUBSCRIBED
  BOUNCED
  CLEANED
}

model Field {
  id          String   @id @default(uuid())
  workspaceId String   @map("workspace_id")
  key         String   // stable identifier, used as the customFields JSON key
  label       String
  type        FieldType
  createdAt   DateTime @default(now()) @map("created_at")

  @@unique([workspaceId, key])
  @@map("fields")
}

enum FieldType {
  TEXT
  NUMBER
  DATE
  BOOLEAN
}

model Group {
  id          String   @id @default(uuid())
  workspaceId String   @map("workspace_id")
  name        String
  description String?
  createdAt   DateTime @default(now()) @map("created_at")
  subscribers SubscriberGroup[]

  @@unique([workspaceId, name])
  @@map("groups")
}

model SubscriberGroup {
  subscriberId String @map("subscriber_id")
  groupId      String @map("group_id")
  addedAt      DateTime @default(now()) @map("added_at")
  subscriber   Subscriber @relation(fields: [subscriberId], references: [id])
  group        Group      @relation(fields: [groupId], references: [id])

  @@id([subscriberId, groupId])
  @@map("subscriber_groups")
}
```

## Campaigns

```prisma
model Campaign {
  id            String   @id @default(uuid())
  workspaceId   String   @map("workspace_id")
  subject       String
  fromName      String   @map("from_name")
  fromEmail     String   @map("from_email")
  replyTo       String?  @map("reply_to")
  htmlContent   String   @map("html_content")
  status        CampaignStatus @default(DRAFT)
  audience      Json     @map("audience") // { groupIds: string[], fieldFilters: FilterExpr[] }
  scheduledAt   DateTime? @map("scheduled_at")
  sentAt        DateTime? @map("sent_at")
  createdAt     DateTime @default(now()) @map("created_at")

  emailJobs     EmailJob[]

  @@map("campaigns")
}

enum CampaignStatus {
  DRAFT
  SCHEDULED
  SENDING
  SENT
  FAILED
  PAUSED
}
```

`audience.fieldFilters` is an array of `{ fieldKey, operator, value }` expressions (operators: `equals`, `not_equals`, `contains`, `gt`, `lt`, `is_set`, `is_not_set`), combined with the selected `groupIds` using AND semantics.

`audience` also supports two fields set only by the resend flow (`POST /campaigns/{id}/resend`), never by the campaign editor's UI directly: `subscriberIds` (a frozen exact recipient list — the "resend to non-openers" snapshot, which intentionally does not re-evaluate over time) and `joinedAfter` (an ISO timestamp cutoff — "resend to new subscribers", ANDed with any `groupIds`/`fieldFilters` still present). See `lib/audience/resolve.ts`.

## Automations

```prisma
model Automation {
  id            String   @id @default(uuid())
  workspaceId   String   @map("workspace_id")
  name          String
  status        AutomationStatus @default(DRAFT)
  triggerType   TriggerType @map("trigger_type")
  flowDefinition Json    @map("flow_definition") // React Flow { nodes, edges }
  createdAt     DateTime @default(now()) @map("created_at")

  runs          AutomationRun[]

  @@map("automations")
}

enum AutomationStatus {
  DRAFT
  ACTIVE
  PAUSED
}

enum TriggerType {
  SUBSCRIBER_ADDED_TO_GROUP
  FIELD_CHANGED
  SUBSCRIBER_CREATED
  CAMPAIGN_OPENED
  CAMPAIGN_CLICKED
  DATE_BASED
}

model AutomationRun {
  id            String   @id @default(uuid())
  automationId  String   @map("automation_id")
  subscriberId  String   @map("subscriber_id")
  status        RunStatus @default(RUNNING)
  currentNodeId String?  @map("current_node_id")
  resumeAt      DateTime? @map("resume_at") // for delay nodes
  startedAt     DateTime @default(now()) @map("started_at")
  finishedAt    DateTime? @map("finished_at")

  automation    Automation @relation(fields: [automationId], references: [id])
  subscriber    Subscriber @relation(fields: [subscriberId], references: [id])
  emailJobs     EmailJob[]

  @@map("automation_runs")
}

enum RunStatus {
  RUNNING
  WAITING
  COMPLETED
  EXITED
  FAILED
}
```

Each React Flow node has a `type` of `trigger`, `filter`, `delay`, `sendEmail`, `addToGroup`, `removeFromGroup`, or `exit`, and a `data` payload specific to that type (e.g. `sendEmail` carries `subject`, `fromName`, `fromEmail`, `htmlContent`).

## Sending & Tracking

```prisma
model EmailJob {
  id              String   @id @default(uuid())
  workspaceId     String   @map("workspace_id")
  subscriberId    String   @map("subscriber_id")
  campaignId      String?  @map("campaign_id")
  automationRunId String?  @map("automation_run_id")
  status          JobStatus @default(QUEUED)
  providerMessageId String? @map("provider_message_id")
  error           String?
  queuedAt        DateTime @default(now()) @map("queued_at")
  sentAt          DateTime? @map("sent_at")

  subscriber      Subscriber @relation(fields: [subscriberId], references: [id])
  campaign        Campaign?  @relation(fields: [campaignId], references: [id])
  automationRun   AutomationRun? @relation(fields: [automationRunId], references: [id])
  events          EmailEvent[]

  @@map("email_jobs")
}

enum JobStatus {
  QUEUED
  SENT
  FAILED
  BOUNCED
}

model EmailEvent {
  id        String   @id @default(uuid())
  jobId     String   @map("job_id")
  type      EventType
  metadata  Json     @default("{}") // ip, userAgent, linkUrl, bounceReason...
  occurredAt DateTime @default(now()) @map("occurred_at")

  job       EmailJob @relation(fields: [jobId], references: [id])

  @@map("email_events")
}

enum EventType {
  OPEN
  CLICK
  BOUNCE
  COMPLAINT
  UNSUBSCRIBE
}
```

## Sending Domains & API Access

```prisma
model SendingDomain {
  id             String    @id @default(uuid())
  workspaceId    String    @map("workspace_id")
  domain         String
  resendDomainId String?   @map("resend_domain_id") // Resend's own domain id, used for verify()/get()
  dnsRecords     Json?     @map("dns_records") // the SPF/DKIM/Tracking records Resend asks you to publish
  spfStatus      DnsStatus @default(PENDING) @map("spf_status")
  dkimStatus     DnsStatus @default(PENDING) @map("dkim_status")
  dmarcStatus    DnsStatus @default(PENDING) @map("dmarc_status") // verified independently via Node's dns module — Resend doesn't track DMARC
  verifiedAt     DateTime? @map("verified_at")
  createdAt      DateTime  @default(now()) @map("created_at")

  @@unique([workspaceId, domain])
  @@map("sending_domains")
}

enum DnsStatus {
  PENDING
  VALID
  INVALID
}

model ApiKey {
  id          String   @id @default(uuid())
  workspaceId String   @map("workspace_id")
  name        String
  hashedKey   String   @map("hashed_key") // sha256, raw key shown once on creation
  scopes      String[] // e.g. ["subscribers:read", "subscribers:write", "campaigns:write"]
  createdAt   DateTime @default(now()) @map("created_at")
  lastUsedAt  DateTime? @map("last_used_at")

  @@map("api_keys")
}
```

## Event Log (EventBus persistence)

```prisma
model Event {
  id        String   @id @default(uuid())
  workspaceId String @map("workspace_id")
  type      String   // kebab-case, e.g. "subscriber:created", "campaign:completed"
  payload   Json
  createdAt DateTime @default(now()) @map("created_at")

  @@map("events")
}
```

`Event` rows are the durable backbone of the EventBus: every state transition that other systems need to react to (automation triggers, webhook fan-out, analytics aggregation) is written here first, then processed by workers. See WORKERS.md.
