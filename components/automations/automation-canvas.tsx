"use client";

import { useCallback, useRef, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  type Connection,
  type NodeTypes,
  type Node,
  type Edge,
  BackgroundVariant,
  Panel,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Plus, Shuffle, Timer, Mail, UserPlus, UserMinus, Flag } from "lucide-react";
import {
  TriggerNode, FilterNode, DelayNode, SendEmailNode,
  AddToGroupNode, RemoveFromGroupNode, ExitNode,
} from "./nodes";
import { NodeConfigPanel } from "./node-config-panel";
import { Button } from "@/components/ui/button";
import type { AutomationNodeData, AutomationNodeType, FlowDefinition } from "@/lib/automations/types";

const nodeTypes: NodeTypes = {
  trigger: TriggerNode,
  filter: FilterNode,
  delay: DelayNode,
  sendEmail: SendEmailNode,
  addToGroup: AddToGroupNode,
  removeFromGroup: RemoveFromGroupNode,
  exit: ExitNode,
};

const defaultNodeData: Record<AutomationNodeType, AutomationNodeData> = {
  trigger: { type: "trigger", triggerType: "SUBSCRIBER_CREATED" },
  filter: { type: "filter", conditions: [{ fieldKey: "email", operator: "is_set" }] },
  delay: { type: "delay", unit: "hours", amount: 24 },
  sendEmail: { type: "sendEmail", subject: "", fromName: "", fromEmail: "", htmlContent: "<p>Hello {{email}},</p>" },
  addToGroup: { type: "addToGroup", groupId: "" },
  removeFromGroup: { type: "removeFromGroup", groupId: "" },
  exit: { type: "exit", label: "Done" },
};

const addableNodeTypes: { type: AutomationNodeType; label: string; icon: React.ReactNode }[] = [
  { type: "filter", label: "Filter", icon: <Shuffle size={16} /> },
  { type: "delay", label: "Wait", icon: <Timer size={16} /> },
  { type: "sendEmail", label: "Send email", icon: <Mail size={16} /> },
  { type: "addToGroup", label: "Add to group", icon: <UserPlus size={16} /> },
  { type: "removeFromGroup", label: "Remove from group", icon: <UserMinus size={16} /> },
  { type: "exit", label: "Exit", icon: <Flag size={16} /> },
];

export function AutomationCanvas({
  workspaceId,
  automationId,
  initialFlow,
  readonly = false,
  onSave,
  isSaving,
}: {
  workspaceId: string;
  automationId: string;
  initialFlow: FlowDefinition;
  readonly?: boolean;
  onSave?: (flow: FlowDefinition) => void;
  isSaving?: boolean;
}) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialFlow.nodes as Node[]);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialFlow.edges as Edge[]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const idCounter = useRef(0);

  const onConnect = useCallback(
    (connection: Connection) => setEdges((eds) => addEdge({ ...connection, id: `e-${idCounter.current++}` }, eds)),
    [setEdges]
  );

  const selectedNode = selectedNodeId ? nodes.find((n) => n.id === selectedNodeId) : null;

  function handleNodeClick(_: React.MouseEvent, node: Node) {
    setSelectedNodeId((prev) => (prev === node.id ? null : node.id));
  }

  function handleNodeDataUpdate(nodeId: string, newData: AutomationNodeData) {
    setNodes((nds) => nds.map((n) => n.id === nodeId ? { ...n, data: newData as Record<string, unknown> } : n));
  }

  function addNode(type: AutomationNodeType) {
    const id = `${type}-${idCounter.current++}`;
    const newNode: Node = {
      id,
      type,
      position: { x: 250, y: 80 + nodes.length * 160 },
      data: defaultNodeData[type] as Record<string, unknown>,
    };
    setNodes((nds) => [...nds, newNode]);
    setSelectedNodeId(id);
    setShowAddMenu(false);
  }

  function handleSave() {
    onSave?.({ nodes: nodes as FlowDefinition["nodes"], edges: edges as FlowDefinition["edges"] });
  }

  return (
    <div className="relative flex h-[600px] w-full rounded-lg border border-line overflow-hidden bg-canvas">
      <div className="flex-1 h-full">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={readonly ? undefined : onNodesChange}
          onEdgesChange={readonly ? undefined : onEdgesChange}
          onConnect={readonly ? undefined : onConnect}
          onNodeClick={handleNodeClick}
          nodeTypes={nodeTypes}
          fitView
          deleteKeyCode={readonly ? null : "Backspace"}
        >
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#e4e2dc" />
          <Controls showInteractive={!readonly} />
          <MiniMap nodeStrokeWidth={2} zoomable pannable />

          {!readonly && (
            <Panel position="top-left" className="flex gap-2">
              <div className="relative">
                <Button onClick={() => setShowAddMenu((v) => !v)} className="shadow-sm">
                  <Plus size={15} /> Add node
                </Button>
                {showAddMenu && (
                  <div className="absolute top-full left-0 mt-1 z-10 w-44 rounded-md border border-line bg-surface py-1 shadow-md">
                    {addableNodeTypes.map((t) => (
                      <button
                        key={t.type}
                        onClick={() => addNode(t.type)}
                        className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-ink hover:bg-canvas"
                      >
                        <span>{t.icon}</span>
                        {t.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {onSave && (
                <Button variant="secondary" onClick={handleSave} disabled={isSaving} className="shadow-sm">
                  {isSaving ? "Saving…" : "Save"}
                </Button>
              )}
            </Panel>
          )}
        </ReactFlow>
      </div>

      {selectedNode && (
        <NodeConfigPanel
          nodeId={selectedNode.id}
          data={selectedNode.data as AutomationNodeData}
          workspaceId={workspaceId}
          automationId={automationId}
          onUpdate={handleNodeDataUpdate}
          onClose={() => setSelectedNodeId(null)}
        />
      )}
    </div>
  );
}
