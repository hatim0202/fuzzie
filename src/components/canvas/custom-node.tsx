"use client";

import { memo } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { HardDrive, MessageSquare, Hash, FileText, Zap } from "lucide-react";

// Helper to choose node icon according to type
const getNodeIcon = (type?: string) => {
  switch (type?.toLowerCase()) {
    case "discord":
      return <MessageSquare className="w-5 h-5 text-indigo-400" />;
    case "slack":
      return <Hash className="w-5 h-5 text-emerald-400" />;
    case "notion":
      return <FileText className="w-5 h-5 text-amber-400" />;
    case "google drive":
      return <HardDrive className="w-5 h-5 text-blue-400" />;
    default:
      return <Zap className="w-5 h-5 text-white" />;
  }
};

export type CustomNodeData = {
  title: string;
  description: string;
  type: string;
};

function CustomNode({ data, selected }: NodeProps) {
  const nodeData = data as unknown as CustomNodeData;

  return (
    <div
      className={`relative min-w-[260px] p-4 rounded-2xl bg-neutral-900 border transition shadow-xl ${
        selected
          ? "border-white ring-2 ring-white/20"
          : "border-neutral-800 hover:border-neutral-750"
      }`}
    >
      {/* Top Target Handle (Input Port) */}
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-white !border-2 !border-neutral-900"
      />

      {/* Node Content */}
      <div className="flex items-start gap-3.5">
        {/* App Icon */}
        <div className="p-2.5 rounded-xl bg-neutral-950 border border-neutral-800">
          {getNodeIcon(nodeData?.type)}
        </div>

        {/* Text Info */}
        <div className="flex-1 space-y-1">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-white text-sm">
              {nodeData?.title || "Custom Node"}
            </h4>
          </div>
          <p className="text-xs text-neutral-400 leading-snug line-clamp-2">
            {nodeData?.description || "Configure action settings"}
          </p>
        </div>
      </div>

      {/* Node Type Badge */}
      <div className="mt-3 pt-2.5 border-t border-neutral-850 flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
          {nodeData?.type || "Action"}
        </span>
        <span className="w-2 h-2 rounded-full bg-emerald-400" />
      </div>

      {/* Bottom Source Handle (Output Port) */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-white !border-2 !border-neutral-900"
      />
    </div>
  );
}

export default memo(CustomNode);
