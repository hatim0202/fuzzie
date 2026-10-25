import { Workflow } from "lucide-react";
import { onGetWorkflows } from "@/actions/workflow";
import WorkflowForm from "@/components/forms/workflow-form";
import WorkflowCard from "@/components/workflows/workflow-card";

export const dynamic = "force-dynamic";

export default async function WorkflowsPage() {
  // 1. Fetch user's workflows from PostgreSQL
  const response = await onGetWorkflows();
  const workflows = response.workflows || [];

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header Section with Create Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800 pb-6">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Workflows</h1>
          <p className="text-sm text-neutral-400 mt-1">
            Create, manage, and monitor your visual automation flows.
          </p>
        </div>

        {/* Create Workflow Modal Trigger */}
        <WorkflowForm />
      </div>

      {/* Workflows List Grid */}
      {workflows.length === 0 ? (
        // Empty State Card
        <div className="p-12 rounded-2xl bg-neutral-950/60 border border-neutral-800/80 text-center space-y-4 max-w-md mx-auto my-12">
          <div className="w-12 h-12 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-center mx-auto text-neutral-400">
            <Workflow className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="font-semibold text-white text-base">No workflows created yet</h3>
            <p className="text-xs text-neutral-400">
              Start building your first automation by clicking the button above.
            </p>
          </div>
        </div>
      ) : (
        // Grid of Workflows
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {workflows.map((flow) => (
            <WorkflowCard key={flow.id} workflow={flow} />
          ))}
        </div>
      )}
    </div>
  );
}
