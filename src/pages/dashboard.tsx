import WorkflowBlueprintDemo from "@/pages/usage";
import type { PatternFxControls } from "@/components/ui/dshapes-pattern-background";

export function DashboardPage({
  onNotify,
  onPatternFx,
}: {
  onNotify: (message: string) => void;
  onPatternFx?: (controls: PatternFxControls | null) => void;
}) {
  return (
    <div className="page">
      <section className="card builder-card" aria-labelledby="builder-title">
        <div className="card-head">
          <div>
            <div className="card-title-row">
              <h2 id="builder-title">Workflow canvas</h2>
              <span className="badge badge-live"><i /> Live canvas</span>
            </div>
            <p>Chat with your spreadsheets — ask a question, get a checked answer with a chart.</p>
          </div>
          <div className="card-head-actions">
            <span className="owner"><span className="avatar avatar-teal">MR</span> Maya owns this flow</span>
          </div>
        </div>
        <WorkflowBlueprintDemo
          onOpenEditor={() => onNotify("The full editor is this same canvas — scroll and explore.")}
          onPatternFx={onPatternFx}
        />
      </section>
    </div>
  );
}
