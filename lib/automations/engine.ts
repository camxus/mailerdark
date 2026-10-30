/**
 * Pure automation execution logic — no Prisma, no side effects.
 * The AutomationEngineWorker calls this and handles persistence.
 * See WORKERS.md for the worker design; this file is the testable core.
 */
import type { FlowDefinition, AutomationNodeData, FilterNodeData } from "./types";

type Subscriber = { email: string; customFields: Record<string, unknown>; groupIds?: string[] };

export type StepOutcome =
  | { action: "advance"; nextNodeId: string }
  | { action: "wait"; resumeAt: Date }
  | { action: "send_email"; nodeId: string; nextNodeId: string | null }
  | { action: "add_to_group"; groupId: string; nextNodeId: string | null }
  | { action: "remove_from_group"; groupId: string; nextNodeId: string | null }
  | { action: "complete" }
  | { action: "exit" };

export function advanceRun(
  currentNodeId: string,
  graph: FlowDefinition,
  subscriber: Subscriber
): StepOutcome {
  const node = graph.nodes.find((n) => n.id === currentNodeId);
  if (!node) return { action: "exit" };

  const data = node.data as AutomationNodeData;

  switch (data.type) {
    case "trigger": {
      const next = firstEdgeTarget(graph, currentNodeId);
      return next ? { action: "advance", nextNodeId: next } : { action: "complete" };
    }

    case "filter": {
      const matches = evaluateConditions(data.conditions, subscriber);
      const yesTarget = edgeTarget(graph, currentNodeId, "yes");
      const noTarget = edgeTarget(graph, currentNodeId, "no");
      const next = matches ? yesTarget : noTarget;
      return next ? { action: "advance", nextNodeId: next } : { action: "exit" };
    }

    case "delay": {
      const ms = delayMs(data.unit, data.amount);
      return { action: "wait", resumeAt: new Date(Date.now() + ms) };
    }

    case "sendEmail": {
      const nextNodeId = firstEdgeTarget(graph, currentNodeId) ?? null;
      return { action: "send_email", nodeId: currentNodeId, nextNodeId };
    }

    case "addToGroup": {
      const nextNodeId = firstEdgeTarget(graph, currentNodeId) ?? null;
      return { action: "add_to_group", groupId: data.groupId, nextNodeId };
    }

    case "removeFromGroup": {
      const nextNodeId = firstEdgeTarget(graph, currentNodeId) ?? null;
      return { action: "remove_from_group", groupId: data.groupId, nextNodeId };
    }

    case "exit":
      return { action: "exit" };

    default:
      return { action: "exit" };
  }
}

function firstEdgeTarget(graph: FlowDefinition, sourceId: string): string | undefined {
  return graph.edges.find((e) => e.source === sourceId)?.target;
}

function edgeTarget(graph: FlowDefinition, sourceId: string, handle: string): string | undefined {
  return graph.edges.find((e) => e.source === sourceId && e.sourceHandle === handle)?.target;
}

function delayMs(unit: "minutes" | "hours" | "days", amount: number): number {
  const map = { minutes: 60_000, hours: 3_600_000, days: 86_400_000 };
  return map[unit] * amount;
}

function evaluateConditions(
  conditions: FilterNodeData["conditions"],
  subscriber: Subscriber
): boolean {
  return conditions.every((c) => {
    const raw = c.fieldKey === "email" ? subscriber.email : subscriber.customFields?.[c.fieldKey];
    const value = raw === undefined || raw === null ? "" : String(raw);
    const compare = String(c.value ?? "");
    switch (c.operator) {
      case "equals": return value === compare;
      case "not_equals": return value !== compare;
      case "contains": return value.toLowerCase().includes(compare.toLowerCase());
      case "gt": return Number(raw) > Number(c.value);
      case "lt": return Number(raw) < Number(c.value);
      case "is_set": return raw !== undefined && raw !== null && raw !== "";
      case "is_not_set": return raw === undefined || raw === null || raw === "";
      default: return true;
    }
  });
}

/** Validates a flow definition before activation */
export function validateFlowDefinition(graph: FlowDefinition): string | null {
  const triggers = graph.nodes.filter((n) => n.data.type === "trigger");
  if (triggers.length === 0) return "The automation must have a trigger node.";
  if (triggers.length > 1) return "The automation can only have one trigger node.";

  const nodeIds = new Set(graph.nodes.map((n) => n.id));
  const orphaned = graph.nodes.filter(
    (n) =>
      n.data.type !== "trigger" &&
      !graph.edges.some((e) => e.target === n.id)
  );
  if (orphaned.length > 0) {
    return `Disconnected node(s): ${orphaned.map((n) => n.id).join(", ")}. All non-trigger nodes must be reachable.`;
  }

  for (const edge of graph.edges) {
    if (!nodeIds.has(edge.source)) return `Edge references unknown source node: ${edge.source}`;
    if (!nodeIds.has(edge.target)) return `Edge references unknown target node: ${edge.target}`;
  }

  return null;
}
