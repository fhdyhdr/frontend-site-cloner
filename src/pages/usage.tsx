import WorkflowBlueprint, { type WorkflowGraph } from "@/components/ui/interactive-workflow-blueprint";
import type { PatternFxControls } from "@/components/ui/dshapes-pattern-background";

const graph: WorkflowGraph = {
  nodes: [],
  edges: [],
};

export default function WorkflowBlueprintDemo({
  onOpenEditor,
  onPatternFx,
}: {
  onOpenEditor?: () => void;
  onPatternFx?: (controls: PatternFxControls | null) => void;
}) {
  return (
    <div className="wb-demo-shell">
      <div className="wb-demo-toolbar">
        <span className="wb-demo-label"><i aria-hidden="true" /> Interactive preview</span>
      </div>
      <WorkflowBlueprint title="Chat with your spreadsheets" initialGraph={graph} onOpenEditor={onOpenEditor} onPatternFx={onPatternFx} />
    </div>
  );
}
