import type { PrismaClient } from "@prisma/client";
import { advanceRun } from "@/lib/automations/engine";
import { renderCampaignEmail } from "@/lib/email/render";
import { getEmailProvider } from "@/lib/email/get-provider";
import type { FlowDefinition, SendEmailNodeData } from "@/lib/automations/types";

/**
 * One pass of the AutomationEngineWorker (see WORKERS.md):
 *  1. Check the `events` table for recent subscriber events that should
 *     start an AutomationRun on any ACTIVE automation whose trigger matches.
 *  2. Advance any RUNNING AutomationRun by one step, and wake any
 *     WAITING run whose `resumeAt` has passed.
 *
 * EVENT_LOOKBACK_MS deliberately doesn't rely on in-memory "have I seen
 * this before" state — that works for a long-lived `--watch` process but
 * means nothing to a stateless Vercel Cron invocation, which is a fresh
 * process every time. Instead this always scans a generous trailing
 * window, and correctness against double-starting a run comes from the
 * `alreadyRunning` check below, not from the window being exact.
 */
const EVENT_LOOKBACK_MS = Number(process.env.WORKER_EVENT_LOOKBACK_MS ?? 15 * 60_000);

export async function runAutomationEnginePass(db: PrismaClient) {
  await fanOutTriggers(db);
  await advanceRuns(db);
}

async function fanOutTriggers(db: PrismaClient) {
  const events = await db.event.findMany({
    where: { createdAt: { gt: new Date(Date.now() - EVENT_LOOKBACK_MS) } },
    orderBy: { createdAt: "asc" },
    take: 200,
  });

  for (const event of events) {
    const triggerType = eventTypeToTrigger(event.type);
    if (!triggerType) continue;

    const automations = await db.automation.findMany({
      where: { workspaceId: event.workspaceId, status: "ACTIVE", triggerType },
    });

    const payload = event.payload as Record<string, unknown>;
    const subscriberId = payload.subscriberId as string | undefined;
    if (!subscriberId) continue;

    for (const automation of automations) {
      // This is the actual idempotency guard — if the same event gets
      // scanned again in an overlapping window, this stops a second run
      // from being created, regardless of how the lookback window lines up.
      const alreadyRunning = await db.automationRun.findFirst({
        where: { automationId: automation.id, subscriberId, status: { in: ["RUNNING", "WAITING"] } },
      });
      if (alreadyRunning) continue;

      const graph = automation.flowDefinition as FlowDefinition;
      const triggerNode = graph.nodes.find((n) => n.data.type === "trigger");
      if (!triggerNode) continue;

      await db.automationRun.create({
        data: { automationId: automation.id, subscriberId, status: "RUNNING", currentNodeId: triggerNode.id },
      });
      console.log(`[automation-engine] started run for subscriber ${subscriberId} on automation ${automation.id}`);
    }
  }
}

async function advanceRuns(db: PrismaClient) {
  // Wake delayed runs whose time has come
  await db.automationRun.updateMany({
    where: { status: "WAITING", resumeAt: { lte: new Date() } },
    data: { status: "RUNNING" },
  });

  const runs = await db.automationRun.findMany({
    where: { status: "RUNNING" },
    take: 50,
    include: { subscriber: true, automation: true },
  });

  for (const run of runs) {
    if (!run.currentNodeId) {
      await db.automationRun.update({ where: { id: run.id }, data: { status: "COMPLETED", finishedAt: new Date() } });
      continue;
    }

    const graph = run.automation.flowDefinition as FlowDefinition;
    const subscriber = {
      email: run.subscriber.email,
      customFields: run.subscriber.customFields as Record<string, unknown>,
    };

    try {
      const outcome = advanceRun(run.currentNodeId, graph, subscriber);

      switch (outcome.action) {
        case "advance":
          await db.automationRun.update({ where: { id: run.id }, data: { currentNodeId: outcome.nextNodeId } });
          break;

        case "wait":
          await db.automationRun.update({ where: { id: run.id }, data: { status: "WAITING", resumeAt: outcome.resumeAt } });
          break;

        case "send_email": {
          const node = graph.nodes.find((n) => n.id === outcome.nodeId);
          const emailData = node?.data as SendEmailNodeData | undefined;
          if (emailData && emailData.fromEmail && emailData.subject) {
            const job = await db.emailJob.create({
              data: { workspaceId: run.automation.workspaceId, subscriberId: run.subscriberId, automationRunId: run.id, status: "QUEUED" },
            });
            const rendered = renderCampaignEmail({ subject: emailData.subject, htmlContent: emailData.htmlContent, subscriber, jobId: job.id });
            const provider = getEmailProvider();
            await provider.send({ to: subscriber.email, from: `${emailData.fromName} <${emailData.fromEmail}>`, replyTo: emailData.replyTo, subject: rendered.subject, html: rendered.html, idempotencyKey: job.id });
            await db.emailJob.update({ where: { id: job.id }, data: { status: "SENT", sentAt: new Date() } });
          }
          await db.automationRun.update({ where: { id: run.id }, data: { currentNodeId: outcome.nextNodeId ?? null, status: outcome.nextNodeId ? "RUNNING" : "COMPLETED", finishedAt: outcome.nextNodeId ? undefined : new Date() } });
          break;
        }

        case "add_to_group":
          await db.subscriberGroup.upsert({ where: { subscriberId_groupId: { subscriberId: run.subscriberId, groupId: outcome.groupId } }, create: { subscriberId: run.subscriberId, groupId: outcome.groupId }, update: {} });
          await db.automationRun.update({ where: { id: run.id }, data: { currentNodeId: outcome.nextNodeId ?? null, status: outcome.nextNodeId ? "RUNNING" : "COMPLETED", finishedAt: outcome.nextNodeId ? undefined : new Date() } });
          break;

        case "remove_from_group":
          await db.subscriberGroup.deleteMany({ where: { subscriberId: run.subscriberId, groupId: outcome.groupId } });
          await db.automationRun.update({ where: { id: run.id }, data: { currentNodeId: outcome.nextNodeId ?? null, status: outcome.nextNodeId ? "RUNNING" : "COMPLETED", finishedAt: outcome.nextNodeId ? undefined : new Date() } });
          break;

        case "complete":
          await db.automationRun.update({ where: { id: run.id }, data: { status: "COMPLETED", finishedAt: new Date() } });
          break;

        case "exit":
          await db.automationRun.update({ where: { id: run.id }, data: { status: "EXITED", finishedAt: new Date() } });
          break;
      }
    } catch (error) {
      console.error(`[automation-engine] run ${run.id} failed:`, error);
      await db.automationRun.update({ where: { id: run.id }, data: { status: "FAILED", finishedAt: new Date() } });
    }
  }
}

function eventTypeToTrigger(eventType: string): string | null {
  const map: Record<string, string> = {
    "subscriber:created": "SUBSCRIBER_CREATED",
    "subscriber:group-added": "SUBSCRIBER_ADDED_TO_GROUP",
    "subscriber:updated": "FIELD_CHANGED",
    "email:opened": "CAMPAIGN_OPENED",
    "email:clicked": "CAMPAIGN_CLICKED",
  };
  return map[eventType] ?? null;
}
