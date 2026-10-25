import { redirect } from "next/navigation";
import { onGetWorkflow } from "@/actions/workflow";
import FlowCanvas from "@/components/canvas/flow-canvas";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ workflowId: string }>;
};

export default async function WorkflowEditorPage({ params }: Props) {
  // 1. Extract the dynamic workflowId from URL
  const { workflowId } = await params;

  // 2. Fetch workflow data from PostgreSQL
  const response = await onGetWorkflow(workflowId);

  if (response.status !== 200 || !response.workflow) {
    redirect("/dashboard/workflows");
  }

  const workflow = response.workflow;

  // 3. Render the visual canvas with saved data
  return (
    <FlowCanvas
      workflowId={workflow.id}
      workflowName={workflow.name}
      initialNodes={workflow.nodes}
      initialEdges={workflow.edges}
      isPublished={workflow.publish}
    />
  );
}
