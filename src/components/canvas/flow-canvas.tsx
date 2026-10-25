"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  BackgroundVariant,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import CustomNode from "@/components/canvas/custom-node";
import NodeConfigDrawer from "@/components/canvas/node-config-drawer";
import { onSaveWorkflow, onPublishWorkflow } from "@/actions/workflow";
import { 
  Save, 
  Loader2, 
  Check, 
  HardDrive, 
  MessageSquare, 
  Hash, 
  FileText, 
  Plus,
  Play,
  Terminal,
  X,
  CheckCircle2
} from "lucide-react";

// Register custom nodes
const nodeTypes = {
  custom: CustomNode,
};

type FlowCanvasProps = {
  workflowId: string;
  workflowName: string;
  initialNodes?: string | null;
  initialEdges?: string | null;
  isPublished?: boolean;
};

export default function FlowCanvas({
  workflowId,
  workflowName,
  initialNodes,
  initialEdges,
  isPublished = false,
}: FlowCanvasProps) {
  // Parse initial nodes and edges from database
  const parsedNodes: Node[] = initialNodes ? JSON.parse(initialNodes) : [];
  const parsedEdges: Edge[] = initialEdges ? JSON.parse(initialEdges) : [];

  const [nodes, setNodes, onNodesChange] = useNodesState(parsedNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(parsedEdges);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [published, setPublished] = useState(isPublished);

  // Execution States
  const [isExecuting, setIsExecuting] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [executionLogs, setExecutionLogs] = useState<string[]>([]);
  const [showLogsModal, setShowLogsModal] = useState(false);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to latest log line
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [executionLogs]);

  // Connect two nodes with an edge
  const onConnect = useCallback(
    (params: Connection) =>
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            animated: true,
            style: { stroke: "#ffffff", strokeWidth: 2 },
          },
          eds
        )
      ),
    [setEdges]
  );

  // Add a new node to the canvas
  const handleAddNode = (type: string, title: string, description: string) => {
    const newNode: Node = {
      id: `${Date.now()}`,
      type: "custom",
      position: {
        x: Math.random() * 200 + 200,
        y: Math.random() * 200 + 150,
      },
      data: {
        title,
        description,
        type,
      },
    };

    setNodes((nds) => [...nds, newNode]);
  };

  // Delete a specific node and all its attached edges
  const handleDeleteNode = useCallback(
    (nodeId: string) => {
      setNodes((nds) => nds.filter((n) => n.id !== nodeId));
      setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
      setSelectedNode(null);
    },
    [setNodes, setEdges]
  );

  // Save workflow to PostgreSQL
  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSaveWorkflow(
        workflowId,
        JSON.stringify(nodes),
        JSON.stringify(edges)
      );
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
    } catch (err) {
      console.error("Save error:", err);
    } finally {
      setIsSaving(false);
    }
  };

  // Toggle publish status
  const handleTogglePublish = async () => {
    const nextState = !published;
    setPublished(nextState);
    await onPublishWorkflow(workflowId, nextState);
  };

  // Execute Workflow Test Run (streaming real-time logs)
  const handleTestRun = async () => {
    setIsExecuting(true);
    setExecutionLogs([]);
    setShowLogsModal(true);
    setIsStreaming(true);

    try {
      // Save latest canvas layout first
      await onSaveWorkflow(
        workflowId,
        JSON.stringify(nodes),
        JSON.stringify(edges)
      );

      // Stream execution logs from the API route
      const response = await fetch("/api/workflows/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workflowId,
          triggerData: {
            fileName: "Q4_Financial_Report.pdf",
            userEmail: "lead_engineer@fuzzie.io",
            fileUrl: "https://drive.google.com/file/d/998877/view",
          },
        }),
      });

      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const { log } = JSON.parse(line) as { log: string };
            if (log === "__DONE__") {
              setIsStreaming(false);
              break;
            }
            setExecutionLogs((prev) => [...prev, log]);
          } catch {
            // skip malformed lines
          }
        }
      }
    } catch (err) {
      console.error("Execution error:", err);
      setExecutionLogs((prev) => [...prev, `❌ Client error: ${err instanceof Error ? err.message : String(err)}`]);
    } finally {
      setIsExecuting(false);
      setIsStreaming(false);
    }
  };

  return (
    <div className="relative w-full h-[calc(100vh-4rem)] bg-neutral-950 rounded-2xl overflow-hidden border border-neutral-800">
      {/* Top Header Bar */}
      <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between pointer-events-none">
        {/* Workflow Title Tag */}
        <div className="pointer-events-auto bg-neutral-900/90 backdrop-blur-md border border-neutral-800 px-4 py-2 rounded-xl shadow-lg">
          <h2 className="text-sm font-bold text-white leading-tight">{workflowName}</h2>
          <span className="text-[11px] text-neutral-400">Visual Automation Canvas</span>
        </div>

        {/* Action Buttons */}
        <div className="pointer-events-auto flex items-center gap-3">
          {/* Test Run Execution Button */}
          <button
            onClick={handleTestRun}
            disabled={isExecuting}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition shadow-lg shadow-indigo-600/20 disabled:opacity-50"
          >
            {isExecuting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Running...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Run Test Flow</span>
              </>
            )}
          </button>

          {/* Publish Switch */}
          <button
            onClick={handleTogglePublish}
            className={`px-4 py-2 text-xs font-semibold rounded-xl border transition ${
              published
                ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                : "bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-white"
            }`}
          >
            {published ? "● Live / Published" : "○ Draft Mode"}
          </button>

          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-black font-semibold text-xs hover:bg-neutral-200 transition shadow-lg"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Saving...</span>
              </>
            ) : isSaved ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>Saved!</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                <span>Save Flow</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Floating Add Nodes Panel (Left Side) */}
      <div className="absolute left-4 top-24 z-10 bg-neutral-900/90 backdrop-blur-md border border-neutral-800 p-3 rounded-2xl shadow-2xl space-y-2 w-56">
        <div className="flex items-center gap-1.5 px-2 py-1 text-xs font-bold text-neutral-300">
          <Plus className="w-3.5 h-3.5" />
          <span>Add Node Block</span>
        </div>

        <div className="space-y-1">
          {/* Discord Node Trigger */}
          <button
            onClick={() =>
              handleAddNode(
                "Discord",
                "Discord Message",
                "Send real-time alert to server"
              )
            }
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-neutral-300 hover:text-white hover:bg-neutral-800/80 transition"
          >
            <MessageSquare className="w-4 h-4 text-indigo-400" />
            <span>Discord Alert</span>
          </button>

          {/* Slack Node Trigger */}
          <button
            onClick={() =>
              handleAddNode(
                "Slack",
                "Slack Notification",
                "Post message to team channel"
              )
            }
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-neutral-300 hover:text-white hover:bg-neutral-800/80 transition"
          >
            <Hash className="w-4 h-4 text-emerald-400" />
            <span>Slack Channel</span>
          </button>

          {/* Notion Node Trigger */}
          <button
            onClick={() =>
              handleAddNode(
                "Notion",
                "Notion Database",
                "Create new item in database"
              )
            }
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-neutral-300 hover:text-white hover:bg-neutral-800/80 transition"
          >
            <FileText className="w-4 h-4 text-amber-400" />
            <span>Notion Record</span>
          </button>

          {/* Google Drive Trigger */}
          <button
            onClick={() =>
              handleAddNode(
                "Google Drive",
                "Google Drive File",
                "Trigger on new file upload"
              )
            }
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-neutral-300 hover:text-white hover:bg-neutral-800/80 transition"
          >
            <HardDrive className="w-4 h-4 text-blue-400" />
            <span>Google Drive</span>
          </button>
        </div>
      </div>

      {/* Main React Flow Canvas */}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={(_, node) => setSelectedNode(node)}
        onPaneClick={() => setSelectedNode(null)}
        nodeTypes={nodeTypes}
        fitView
        className="bg-neutral-950"
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={18}
          size={1.5}
          color="#333333"
        />
        <Controls className="!bg-neutral-900 !border-neutral-800 !fill-white [&>button]:!border-neutral-800 [&>button]:!bg-neutral-900 [&>button]:hover:!bg-neutral-800 [&>button>svg]:!fill-white" />
        <MiniMap
          nodeColor="#ffffff"
          maskColor="rgba(0, 0, 0, 0.7)"
          className="!bg-neutral-900 !border-neutral-800 !rounded-xl overflow-hidden"
        />
      </ReactFlow>

      {/* Slide-over Node Configuration Drawer */}
      <NodeConfigDrawer
        node={selectedNode}
        workflowId={workflowId}
        onClose={() => setSelectedNode(null)}
        onDeleteNode={handleDeleteNode}
      />

      {/* Terminal-style Execution Logs Modal */}
      {showLogsModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-950 border border-neutral-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-neutral-800 flex items-center justify-between bg-neutral-900/60">
              <div className="flex items-center gap-2.5">
                <Terminal className="w-4 h-4 text-indigo-400" />
                <h3 className="text-sm font-bold text-white">Execution Output Logs</h3>
                {isStreaming && (
                  <span className="flex items-center gap-1 text-[10px] font-semibold text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                    Running
                  </span>
                )}
              </div>
              <button
                onClick={() => { setShowLogsModal(false); }}
                disabled={isStreaming}
                className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Terminal Body */}
            <div className="p-5 font-mono text-xs space-y-2.5 max-h-80 overflow-y-auto bg-black/40">
              {executionLogs.length === 0 && isStreaming && (
                <div className="flex items-center gap-2 text-neutral-500">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Initializing workflow...</span>
                </div>
              )}
              {executionLogs.map((log, index) => {
                const isError = log.startsWith("❌");
                const isWarning = log.startsWith("⚠️");
                return (
                  <div
                    key={index}
                    className={`p-2.5 rounded-lg border flex items-start gap-2.5 animate-in fade-in slide-in-from-bottom-1 duration-300 ${
                      isError
                        ? "bg-rose-500/10 border-rose-500/20 text-rose-400"
                        : isWarning
                        ? "bg-amber-500/10 border-amber-500/20 text-amber-400"
                        : "bg-neutral-900/80 border-neutral-800/80 text-neutral-300"
                    }`}
                  >
                    {isError ? (
                      <X className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    )}
                    <span className="leading-relaxed">{log}</span>
                  </div>
                );
              })}
              {/* Auto-scroll anchor */}
              <div ref={logsEndRef} />
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3.5 border-t border-neutral-800 bg-neutral-900/40 flex justify-end">
              <button
                onClick={() => setShowLogsModal(false)}
                disabled={isStreaming}
                className="px-4 py-2 rounded-xl bg-white text-black font-bold text-xs hover:bg-neutral-200 transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isStreaming ? "Running..." : "Done"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
