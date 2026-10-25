"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Layers, ArrowRight, Trash2, Loader2 } from "lucide-react";
import { onDeleteWorkflow } from "@/actions/workflow";

type WorkflowCardProps = {
  workflow: {
    id: string;
    name: string;
    description: string | null;
    publish: boolean | null;
    createdAt: Date | string;
  };
};

export default function WorkflowCard({ workflow }: WorkflowCardProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!confirm(`Are you sure you want to delete workflow "${workflow.name}"?`)) {
      return;
    }

    setIsDeleting(true);
    try {
      const res = await onDeleteWorkflow(workflow.id);
      if (res.status === 200) {
        router.refresh();
      } else {
        alert(res.error || "Failed to delete workflow");
      }
    } catch (err) {
      console.error("Delete error:", err);
      alert("Failed to delete workflow");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="group relative p-6 rounded-2xl bg-neutral-950/80 border border-neutral-800/80 hover:border-neutral-700 transition flex flex-col justify-between space-y-4 hover:shadow-xl">
      {/* Card Top */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="p-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-300 group-hover:text-white transition">
            <Layers className="w-5 h-5" />
          </div>

          <div className="flex items-center gap-2">
            {/* Status Badge */}
            <span
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-full border ${
                workflow.publish
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                  : "bg-neutral-900 text-neutral-400 border-neutral-800"
              }`}
            >
              {workflow.publish ? "Published" : "Draft"}
            </span>

            {/* Delete Workflow Button */}
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              title="Delete Workflow"
              className="p-1.5 rounded-lg text-neutral-500 hover:text-red-400 hover:bg-red-500/10 transition disabled:opacity-50"
            >
              {isDeleting ? (
                <Loader2 className="w-4 h-4 animate-spin text-red-400" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        <div>
          <h3 className="font-bold text-white text-base group-hover:text-neutral-200 transition">
            {workflow.name}
          </h3>
          <p className="text-xs text-neutral-400 line-clamp-2 mt-1">
            {workflow.description || "No description provided."}
          </p>
        </div>
      </div>

      {/* Card Bottom / Action Link */}
      <div className="pt-3 border-t border-neutral-850">
        <Link
          href={`/dashboard/workflows/${workflow.id}`}
          className="flex items-center justify-between text-xs text-neutral-400 group-hover:text-white transition font-medium"
        >
          <span>Open Canvas</span>
          <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition text-indigo-400" />
        </Link>
      </div>
    </div>
  );
}
