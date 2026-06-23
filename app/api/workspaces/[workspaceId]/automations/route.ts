import { db } from "@/lib/db";
import { ok, withErrorHandling } from "@/lib/api/response";
import { requireWorkspaceAccess } from "@/lib/auth/require-workspace-access";
import { createAutomationSchema } from "@/lib/validation/automation.schema";
import type { FlowDefinition } from "@/lib/automations/types";

type RouteParams = { params: Promise<{ workspaceId: string }> };

const defaultFlow = (triggerType: string): FlowDefinition => ({
  nodes: [
    { id: "trigger-1", type: "trigger", position: { x: 250, y: 40 }, data: { type: "trigger", triggerType: triggerType as never } },
    { id: "exit-1", type: "exit", position: { x: 250, y: 220 }, data: { type: "exit", label: "Done" } },
  ],
  edges: [{ id: "e1", source: "trigger-1", target: "exit-1" }],
});

export const GET = withErrorHandling(async (req: Request, { params }: RouteParams) => {
  const { workspaceId } = await params;
  const auth = await requireWorkspaceAccess(req, workspaceId, "automations:read");
  if (!auth.ok) return auth.response;

  const automations = await db.automation.findMany({
    where: { workspaceId },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { runs: { where: { status: { in: ["RUNNING", "WAITING"] } } } } } },
  });

  return ok(automations.map((a) => ({
    id: a.id, name: a.name, status: a.status, triggerType: a.triggerType,
    activeRuns: a._count.runs, createdAt: a.createdAt,
  })));
});

export const POST = withErrorHandling(async (req: Request, { params }: RouteParams) => {
  const { workspaceId } = await params;
  const auth = await requireWorkspaceAccess(req, workspaceId, "automations:write");
  if (!auth.ok) return auth.response;

  const body = createAutomationSchema.parse(await req.json());
  const automation = await db.automation.create({
    data: {
      workspaceId,
      name: body.name,
      triggerType: body.triggerType,
      flowDefinition: (body.flowDefinition ?? defaultFlow(body.triggerType)) as object,
    },
  });

  return ok(automation, 201);
});
