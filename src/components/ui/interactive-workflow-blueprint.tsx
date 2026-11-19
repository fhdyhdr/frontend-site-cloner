import { useCallback, useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from "react";
import {
  ReactFlow, Handle, Position, getBezierPath, applyNodeChanges, applyEdgeChanges, useNodesInitialized, useReactFlow,
  type Node, type Edge, type NodeProps, type EdgeProps, type Connection,
  type ReactFlowInstance, type NodeChange, type EdgeChange,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { strToU8, zipSync } from "fflate";
import { BrandingShowcase } from "@/components/ui/branding-showcase";
import { AntigravityParticles } from "@/components/ui/antigravity-particles";
import { DShapesPatternBackground, type PatternFxControls } from "@/components/ui/dshapes-pattern-background";
import { DisplayNotchFrame } from "@/components/ui/dynamic-notch-frame";
import { Pattern } from "@/components/ui/v-collapsible-7";
import { buildScaffold, downloadSteps, exportTargets, type ExportTarget } from "@/lib/export-scaffold";

export type WorkflowKind = "trigger" | "agent" | "integration" | "review" | "delivery";
export interface WorkflowAction extends Record<string, unknown> {
  label: string;
  detail: string;
  kind: WorkflowKind;
  tool?: string;
  /** Optional tool mark; it is decorative beside the text label. */
  logo?: string;
}
export type WorkflowNode = Node<WorkflowAction, "blueprint">;
export interface WorkflowGraph { nodes: WorkflowNode[]; edges: Edge[] }
export interface WorkflowBlueprintProps {
  /** Initial graph. Change the component's key to load a different document. */
  initialGraph: WorkflowGraph;
  title?: string;
  className?: string;
  style?: CSSProperties;
  animated?: boolean;
  /** Fires after edits and node moves. Persistence belongs to the host app. */
  onChange?: (graph: WorkflowGraph) => void;
  /** Renders an "Open full editor" button under the download action. */
  onOpenEditor?: () => void;
  /**
   * The pattern's FX controls are rendered by the profile menu, not here. This
   * fires whenever the live control state changes so the host can place them.
   */
  onPatternFx?: (controls: PatternFxControls | null) => void;
}

const labels: Record<WorkflowKind, string> = {
  trigger: "Trigger", agent: "AI agent", integration: "Integration", review: "Review", delivery: "Delivery",
};
const glyphs: Record<WorkflowKind, string> = {
  trigger: "M13 3 5 13h5l-1 8 9-12h-5z",
  agent: "M12 3l2.2 5.5L20 10l-5.8 1.5L12 17l-2.2-5.5L4 10l5.8-1.5z",
  integration: "M10.5 13.5a3.5 3.5 0 0 0 4.95 0l2.5-2.5a3.5 3.5 0 0 0-4.95-4.95l-1 1 M13.5 10.5a3.5 3.5 0 0 0-4.95 0l-2.5 2.5a3.5 3.5 0 0 0 4.95 4.95l1-1",
  review: "M12 3 4 7v5c0 5 3.4 8.2 8 9 4.6-.8 8-4 8-9V7z M9 12l2 2 4-5",
  delivery: "M5 12h12M13 6l6 6-6 6",
};

function BrandMark({ src, fallback }: { src?: string; fallback: ReactNode }) {
  const [failed, setFailed] = useState(false);
  return src && !failed ? <img src={src} alt="" onError={() => setFailed(true)} /> : fallback;
}

function BlueprintNode({ data, selected }: NodeProps<WorkflowNode>) {
  return <div className="wb-node" data-kind={data.kind} data-selected={selected}>
    <Handle type="target" position={Position.Left} aria-label={`Input for ${data.label}`} />
    <div className="wb-node-head">
      <span className="wb-glyph"><BrandMark key={data.logo} src={data.logo} fallback={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={glyphs[data.kind]} /></svg>} /></span>
      <div><strong>{data.label}</strong><small>{labels[data.kind]}</small></div>
    </div>
    <div className="wb-node-body"><p>{data.detail}</p>{data.tool && <span>{data.tool}</span>}</div>
    <Handle type="source" position={Position.Right} aria-label={`Output for ${data.label}`} />
  </div>;
}

function BlueprintEdge(props: EdgeProps) {
  const gradient = `wb-${useId().replace(/:/g, "")}`;
  const [path] = getBezierPath(props);
  return <>
    <defs><linearGradient id={gradient}><stop stopColor="var(--wb-primary)" /><stop offset="1" stopColor="var(--wb-secondary)" /></linearGradient></defs>
    <path d={path} className="wb-edge-halo" />
    <path d={path} className="wb-edge" style={{ stroke: `url(#${gradient})` }} />
    <path d={path} className="wb-edge-pulse" />
    <circle cx={props.sourceX} cy={props.sourceY} r="4" className="wb-port" />
    <circle cx={props.targetX} cy={props.targetY} r="4" className="wb-port" />
  </>;
}
const nodeTypes = { blueprint: BlueprintNode };
const edgeTypes = { blueprint: BlueprintEdge };

function InitialViewport({ width }: { width: number }) {
  const ready = useNodesInitialized();
  const flow = useReactFlow();
  const previousWidth = useRef(0);
  useEffect(() => {
    if (!ready || !width || previousWidth.current === width) return;
    // React Flow measures its own pane in a ResizeObserver too. Wait for that
    // measurement before fitting, otherwise a resized canvas uses stale bounds.
    let nextFrame = 0;
    const frame = requestAnimationFrame(() => {
      nextFrame = requestAnimationFrame(() => {
        previousWidth.current = width;
        if (width < 600) void flow.setViewport({ x: 24, y: 20, zoom: 0.9 });
        else void flow.fitView({ padding: 0.10, maxZoom: 1 });
      });
    });
    return () => { cancelAnimationFrame(frame); cancelAnimationFrame(nextFrame); };
  }, [ready, width, flow]);
  return null;
}

/** Reject duplicate links, self-links and cycles for both handle and form connections. */
function canConnect(connection: Pick<Connection, "source" | "target">, graph: WorkflowGraph) {
  const { source, target } = connection;
  if (!source || !target || source === target || !graph.nodes.some(n => n.id === source) || !graph.nodes.some(n => n.id === target)) return false;
  if (graph.edges.some(e => e.source === source && e.target === target)) return false;
  const visited = new Set<string>();
  const reachesSource = (id: string): boolean => {
    if (id === source) return true;
    if (visited.has(id)) return false;
    visited.add(id);
    return graph.edges.filter(e => e.source === id).some(e => reachesSource(e.target));
  };
  return !reachesSource(target);
}

function normalizeGraph(graph: WorkflowGraph): WorkflowGraph {
  const ids = new Set(graph.nodes.map(n => n.id));
  return {
    nodes: graph.nodes.map(n => ({ ...n, type: "blueprint", ariaLabel: `${n.data.label}. ${labels[n.data.kind]}. ${n.data.detail}`, data: { ...n.data } })),
    edges: graph.edges.filter(e => ids.has(e.source) && ids.has(e.target)).map(e => ({ ...e, type: "blueprint", ariaLabel: `Connection from ${graph.nodes.find(n => n.id === e.source)?.data.label} to ${graph.nodes.find(n => n.id === e.target)?.data.label}` })),
  };
}

export default function WorkflowBlueprint({ initialGraph, title = "Workflow editor", className = "", style, animated = true, onChange, onOpenEditor, onPatternFx }: WorkflowBlueprintProps) {
  const [graph, setGraph] = useState(() => normalizeGraph(initialGraph));
  const [target, setTarget] = useState<ExportTarget>("static");
  const [siteUrl, setSiteUrl] = useState("");
  const [downloadStep, setDownloadStep] = useState<number | null>(null);
  const [width, setWidth] = useState(0);
  /* On a phone a swipe over the canvas must scroll the page, not pan the
     diagram. ReactFlow's pane ships with `touch-action: none`, so without this
     the particle box looks frozen while the rest of the page moves. */
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches,
  );
  /* Bumping this remounts ReactFlow. A refresh has to re-fit the viewport, which
     means the instance has to be rebuilt from scratch: fitView only runs on init,
     so reusing the old instance would leave the diagram wherever the user had
     panned it. Swap this for a real re-render call once the canvas renders an
     actual cloned site. */
  const [previewKey, setPreviewKey] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const refreshTimer = useRef<number | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const flowRef = useRef<ReactFlowInstance<WorkflowNode> | null>(null);
  const sequence = useRef(0);
  const uid = useId().replace(/:/g, "");
  const changed = useRef(false);
  const onChangeRef = useRef(onChange);
  const downloadTimers = useRef<number[]>([]);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 767px)");
    const sync = () => setIsMobile(query.matches);
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const timers = downloadTimers.current;
    return () => {
      timers.forEach(timer => window.clearTimeout(timer));
    };
  }, []);

  useEffect(() => {
    if (changed.current) onChangeRef.current?.(graph);
  }, [graph]);
  useEffect(() => () => {
    if (refreshTimer.current !== null) window.clearTimeout(refreshTimer.current);
  }, []);
  const refreshPreview = () => {
    if (refreshing) return;
    setRefreshing(true);
    if (refreshTimer.current !== null) window.clearTimeout(refreshTimer.current);
    /* The remount is pushed behind one frame so the button's spinning state is
       actually painted before the canvas is torn down and rebuilt. */
    refreshTimer.current = window.setTimeout(() => {
      setPreviewKey(key => key + 1);
      setRefreshing(false);
      refreshTimer.current = null;
    }, 260);
  };
  useEffect(() => {
    const element = canvasRef.current;
    if (!element) return;
    let latest = 0;
    let applied = 0;
    let timer: number | null = null;
    const commit = () => {
      timer = null;
      applied = latest;
      setWidth(latest);
    };
    const observer = new ResizeObserver(([entry]) => {
      latest = entry.contentRect.width;
      /* Every new width re-fits the diagram (see InitialViewport), so pushing
         every frame of a sidebar animation through here re-rendered this whole
         tree and re-fitted React Flow about a dozen times per toggle. The first
         measurement lands immediately; later ones are debounced until the box
         stops moving. */
      if (applied === 0) {
        commit();
        return;
      }
      if (timer !== null) window.clearTimeout(timer);
      timer = window.setTimeout(commit, 140);
    });
    observer.observe(element);
    return () => {
      observer.disconnect();
      if (timer !== null) window.clearTimeout(timer);
    };
  }, []);

  const commit = (next: WorkflowGraph) => {
    changed.current = true;
    setGraph(normalizeGraph(next));
  };
  const connect = (connection: Pick<Connection, "source" | "target">) => {
    if (!canConnect(connection, graph)) return;
    commit({ ...graph, edges: [...graph.edges, { id: `${uid}-edge-${++sequence.current}`, ...connection, type: "blueprint" }] });
  };
  const downloadZip = () => {
    if (downloadStep !== null && downloadStep < downloadSteps.length - 1) return;
    downloadTimers.current.forEach(timer => window.clearTimeout(timer));
    downloadTimers.current.length = 0;
    const at = (delay: number, callback: () => void) => {
      downloadTimers.current.push(window.setTimeout(callback, delay));
    };
    const files = buildScaffold(target, siteUrl.trim());
    let host = "";
    try {
      host = new URL(siteUrl).hostname.replace(/^www\./, "");
    } catch {
      host = "";
    }
    setDownloadStep(0);
    at(360, () => setDownloadStep(1));
    at(780, () => {
      const entries: Record<string, Uint8Array> = {};
      for (const [path, content] of Object.entries(files)) entries[path] = strToU8(content);
      const blob = new Blob([zipSync(entries) as BlobPart], { type: "application/zip" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${host || "site-clone"}-${target}.zip`;
      link.click();
      setDownloadStep(2);
      at(1000, () => URL.revokeObjectURL(url));
    });
    at(1500, () => setDownloadStep(3));
    at(2600, () => setDownloadStep(null));
  };
  const targetLabel = exportTargets.find(option => option.id === target)?.label ?? "";
  const onNodesChange = useCallback((changes: NodeChange<WorkflowNode>[]) => {
    changed.current = true;
    setGraph(g => {
      const viewport = flowRef.current?.getViewport();
      const canvas = canvasRef.current?.getBoundingClientRect();
      const boundedChanges = changes.map(change => {
        if (change.type !== "position" || !change.position || !viewport || !canvas) return change;
        const node = g.nodes.find(item => item.id === change.id);
        if (!node) return change;
        const inset = 4;
        const minX = (inset - viewport.x) / viewport.zoom;
        const minY = (inset - viewport.y) / viewport.zoom;
        const maxX = (canvas.width - inset - viewport.x) / viewport.zoom - (node.measured?.width ?? 196);
        const maxY = (canvas.height - inset - viewport.y) / viewport.zoom - (node.measured?.height ?? 166);
        return { ...change, position: {
          x: Math.max(minX, Math.min(change.position.x, Math.max(minX, maxX))),
          y: Math.max(minY, Math.min(change.position.y, Math.max(minY, maxY))),
        } };
      });
      return { ...g, nodes: applyNodeChanges(boundedChanges, g.nodes) };
    });
  }, []);
  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    changed.current = true;
    setGraph(g => ({ ...g, edges: applyEdgeChanges(changes, g.edges) }));
  }, []);

  return <section className={`wb-root ${className}`} style={style} aria-label={title} data-animated={animated}>
    <style>{styles}</style>
    <header className="wb-header">
      <form className="wb-clone-form" onSubmit={event => event.preventDefault()}>
        <input type="url" name="site-url" required inputMode="url" autoComplete="url" spellCheck={false} placeholder="https://example.com" aria-label="Site URL to clone" value={siteUrl} onChange={event => setSiteUrl(event.target.value)} />
        {/* Icon-only: the control sits directly beside Clone Site, where a text
            label would push the primary CTA around. The accessible name comes
            from aria-label, so the icon alone is still announced properly. */}
        <button
          type="button"
          className="wb-refresh"
          onClick={refreshPreview}
          disabled={refreshing}
          aria-label="Refresh preview"
          title="Refresh preview"
          data-refreshing={refreshing ? "true" : undefined}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M20 12a8 8 0 1 1-2.34-5.66" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square" />
            <path d="M20 4v5h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square" />
          </svg>
        </button>
        <button type="submit" className="wb-primary">Clone Site</button>
      </form>
    </header>
    <div className="wb-workspace">
      <div className="wb-canvas-column">
        <DisplayNotchFrame
          className="wb-canvas-frame-host"
          innerClassName="wb-canvas"
        >
          <div className="wb-canvas-inner" ref={canvasRef}>
            <AntigravityParticles className="wb-canvas-bg" />
            <ReactFlow<WorkflowNode> key={previewKey} nodes={graph.nodes} edges={graph.edges} nodeTypes={nodeTypes} edgeTypes={edgeTypes}
              onInit={instance => { flowRef.current = instance; }} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={connect}
              isValidConnection={connection => canConnect(connection, graph)}
              nodesFocusable edgesFocusable disableKeyboardA11y={false}
              panOnDrag={!isMobile} nodesDraggable={!isMobile}
              minZoom={0.3} maxZoom={1.5} zoomOnScroll={false} zoomOnDoubleClick={false} autoPanOnNodeDrag={false} preventScrolling={false}
              deleteKeyCode={null} snapToGrid snapGrid={[10, 10]} aria-label={`${title} diagram`} proOptions={{ hideAttribution: true }}
            >
              <InitialViewport width={width} />
            </ReactFlow>
          </div>
        </DisplayNotchFrame>
        {/* Decorative branding cards are desktop-only. On a phone the canvas and
            the Export panel are the whole page; three more stacked cards would
            push Export a full screen below the fold. */}
        <div className="hidden md:block"><BrandingShowcase /></div>
      </div>
      <aside className="wb-export" aria-label="Export project">
        <DShapesPatternBackground className="wb-export-pattern" defaultPresetId="prism" defaultOpacity={26} defaultEdgeFade={22} onControlsReady={onPatternFx} />
        {/* The copy sits on a translucent plate: the shape texture still reads
            through it, but the glyphs no longer collide with the icons. */}
        <div className="wb-export-head">
          <h3>Export</h3>
          <p>Pick a format for your cloned site, then download the ZIP.</p>
        </div>
        <Pattern className="wb-pattern-plate" target={target} onTargetChange={setTarget} step={downloadStep} />
        {/* Wrapper only groups the CTAs so they sit 10px apart instead of
            inheriting the panel's 16px gap. It has no background of its own, so
            the shape pattern runs straight through the button area. */}
        <div className="wb-export-ctas">
          <button
            type="button"
            className="wb-primary wb-download"
            onClick={downloadZip}
            data-label={downloadStep === null ? `Download ZIP ${targetLabel}` : downloadSteps[downloadStep].label}
          >
            {downloadStep === null ? `Download ZIP ${targetLabel}` : downloadSteps[downloadStep].label}
          </button>
          {onOpenEditor && (
            <button type="button" className="wb-primary wb-open-editor" onClick={onOpenEditor} data-label="Open full editor">
              Open full editor
            </button>
          )}
        </div>
      </aside>
    </div>
  </section>;
}

const styles = String.raw`
/* The shell paints the card tone, not --wb-bg. Every card inside (canvas,
   Export, branding) is a separate rounded block, so the shell colour is what
   shows through the 14px gaps between them - painting --wb-bg here left a
   #171717 lattice behind the cards. */
.wb-root{--wb-label-glow:#ffffff;--wb-bg:var(--color-background,Canvas);--wb-fg:var(--color-foreground,CanvasText);--wb-card:var(--color-card,Canvas);--wb-muted:var(--color-muted-foreground,GrayText);--wb-border:var(--color-border,GrayText);--wb-primary:var(--color-primary,Highlight);--wb-on-primary:var(--color-primary-foreground,HighlightText);--wb-action:var(--color-action,Highlight);--wb-action-on:var(--color-action-foreground,HighlightText);--wb-secondary:var(--color-chart-2,var(--wb-primary));--wb-ink-bright:#f2f4f5;/* Recessed well for the URL field. Dark: one step BELOW the #242424 header
   plate, so the field reads as cut into the card. Light: a soft warm grey on
   white, cool enough not to look dirty. Neither is mixed from --wb-muted any
   more - that mix is what produced the flat grey the field used to have. */
--wb-field:#1A1A1A;/* Edge for the URL field and the refresh control: the theme's ink itself, so
   the outline is pure black in light and pure white in dark rather than a grey
   that dissolves into the plate. */
--wb-field-edge:var(--wb-fg);/* Fill while the field is focused. It has to move AWAY from the plate, so it is
   brighter than --wb-field in both themes. A single ink mix cannot do that: it
   darkens the value, which turned the light theme's near-white field into the
   grey slab this replaces. Dark: #262626. */
--wb-field-focus:#262626;width:100%;min-width:0;border-radius:16px;overflow:hidden;background:var(--wb-card);color:var(--wb-fg);font-size:14px;line-height:1.5;font-family:inherit;container-type:inline-size;box-sizing:border-box;text-align:left;isolation:isolate}
/* #F2F4F5 only works on the dark plate. The light Export card is a pale grey
   surface, where that near-white washes straight out, so the token flips back to
   the app foreground once the theme is light. */
[data-theme="light"] .wb-root{--wb-ink-bright:var(--wb-fg);--wb-field:#F1F2F0;--wb-field-focus:#FFFFFF}
.wb-root *{box-sizing:border-box}.wb-root button,.wb-root select{font:inherit;color:inherit}.wb-root button{cursor:pointer}.wb-root button:disabled{opacity:.45;cursor:not-allowed}.wb-root button,.wb-root select{border:1px solid var(--wb-border);border-radius:0;background:var(--wb-card);min-height:40px;padding:8px 12px}.wb-root button:hover:enabled:not(.wb-primary):not(.wb-refresh){background:color-mix(in srgb,var(--wb-fg) 8%,var(--wb-card))}.wb-root :is(button,select,summary,input):focus-visible{outline:3px solid var(--wb-primary);outline-offset:3px}.wb-root .wb-primary{background:var(--wb-action);color:var(--wb-action-on);border-color:transparent}.wb-root .wb-primary:hover{background:var(--wb-action);filter:brightness(1.08)}
.wb-header{display:flex;align-items:center;gap:12px;padding:18px 20px;background:var(--wb-card)}.wb-clone-form{display:flex;flex:1;min-width:0;gap:8px}
/* URL field. The header plate is --wb-card (#242424 in dark, #FFFFFF in light),
   and the field has to sit ON that plate as a recessed well, not as a grey slab
   floating over it.

   It previously mixed --wb-muted into --wb-bg, which produced a muddy mid-grey
   in both themes: in dark it was LIGHTER than the card around it, so the field
   read as a lit block instead of a well. Deriving it from the card keeps the
   direction honest - always one step DOWN from whatever the plate is - and the
   value is pinned per theme because an automatic mix cannot land on the tone
   this header needs. The field is square-cornered like every other control on
   the page. */
.wb-clone-form input{
  flex:1;min-width:0;min-height:44px;padding:10px 14px;
  /* No border at rest. The recessed fill alone defines the field; a permanent
     hairline read as a drawn box around every visit. The pure black/white edge
     is reserved for focus, where it marks the active field. */
  border:1px solid transparent;
  border-radius:0;
  background:var(--wb-field);
  color:var(--wb-fg);font:inherit;font-size:14px;
  transition:background .15s ease,border-color .15s ease;
}
.wb-clone-form input::placeholder{color:color-mix(in srgb,var(--wb-muted) 82%,transparent)}
/* Hover only lifts the well a touch; it must never brighten past the plate or
   the field starts reading as a button. */
.wb-clone-form input:hover{background:color-mix(in srgb,var(--wb-field) 92%,var(--wb-fg))}
/* Focus: the pure theme ink replaces the old blue-ish --wb-primary ring. Black
   in light, white in dark - the highest contrast the theme has, so the active
   field is unmistakable and no third colour enters the header. The outline is
   dropped in favour of the border so the edge sits flush instead of floating
   2px outside the well.

   The fill only changes if it makes the field LIGHTER. Mixing ink into the
   value darkened it, which is right in dark mode (a focused well lifts off the
   plate) but wrong in light, where it turned the near-white field into a grey
   slab. So focus paints --wb-field-focus, defined per theme to move in the
   correct direction: brighter on white, brighter still on black. */
.wb-clone-form input:focus,
.wb-clone-form input:focus-visible{
  outline:none;
  border-color:var(--wb-field-edge);
  background:var(--wb-field-focus);
}
.wb-clone-form button{white-space:nowrap}/* No align-items:start here: the grid default (stretch) is what makes the
   Export panel run the full height of the taller left column, so its bottom
   edge lines up with the last branding card instead of stopping short. */
.wb-workspace{display:grid;grid-template-columns:minmax(0,1fr) 360px;gap:14px}.wb-canvas-column{min-width:0;display:flex;flex-direction:column;gap:14px;min-height:0}
/* ---------------------------------------------------------------------------
   Canvas viewport.

   No bezel and no notch: the frame is a pure layout passthrough now, so the
   diagram is the only thing inside it. These rules are the full geometry - the
   outer box carries the aspect ratio, and each layer below it just passes height
   through so ReactFlow can fill the slot.

     .wb-canvas-frame-host  sizing box (aspect ratio, min-height)
     .wb-canvas             host surface; the diagram's background lives here
     .wb-canvas-inner       positioning host for the particles + ReactFlow
   --------------------------------------------------------------------------- */
.wb-canvas-frame-host{aspect-ratio:16/9;min-height:320px;width:100%;display:flex;flex-direction:column;min-width:0}
/* Refresh control, icon only, sitting between the URL field and Clone Site.

   It is square and exactly as tall as the fields beside it (44px) so the header
   row stays on one baseline. At rest it is borderless: Clone Site is the filled
   primary, so this one only reveals its edge on interaction. The black/white
   border is reserved for hover and focus, matching the URL field's rule. */
.wb-root .wb-refresh{
  display:inline-flex;align-items:center;justify-content:center;
  width:44px;min-width:44px;min-height:44px;padding:0;
  border-radius:0;
  border:1px solid transparent;
  background:transparent;
  color:var(--wb-fg);
  transition:background .15s ease,color .15s ease,border-color .15s ease;
}
.wb-root .wb-refresh svg{width:16px;height:16px;flex-shrink:0}
/* Hover is a tint, not an inversion, and not the lime accent either.

   Two things had stacked up here. The rule used to fill with --wb-fg, which is
   the same ink as Clone Site, so on hover two identical black 44px blocks sat
   8px apart and the secondary read as a second submit button. On top of that,
   the generic ".wb-root button:hover:enabled:not(.wb-primary)" rule tinted every
   non-primary button with 12% of --wb-primary, and its specificity beat this
   one - so what actually painted was a pale lime block. Lime is an accent here,
   never a button fill.

   The generic rule now mixes with the ink and skips .wb-refresh outright, so
   there is no specificity race to lose.

   Strength steps: hover 8%, press 14%, focus keeps the full black/white rim, so
   focus stays the loudest state. */
.wb-root .wb-refresh:hover:enabled{background:color-mix(in srgb,var(--wb-fg) 8%,transparent);border-color:color-mix(in srgb,var(--wb-fg) 22%,transparent);color:var(--wb-fg)}
.wb-root .wb-refresh:active:enabled{background:color-mix(in srgb,var(--wb-fg) 14%,transparent)}
.wb-root .wb-refresh:focus-visible{outline:none;border-color:var(--wb-field-edge);background:color-mix(in srgb,var(--wb-fg) 8%,transparent)}
.wb-root .wb-refresh[data-refreshing="true"] svg{animation:wb-refresh-spin .7s linear infinite}
@keyframes wb-refresh-spin{to{transform:rotate(360deg)}}
@media (prefers-reduced-motion:reduce){
  .wb-root .wb-refresh[data-refreshing="true"] svg{animation:none}
}
.wb-canvas{flex:1;display:flex;flex-direction:column;min-height:0;min-width:0}
.wb-canvas-inner{position:relative;isolation:isolate;flex:1;min-height:0;min-width:0;display:flex;flex-direction:column}
/* The wrapper is inert: it must not add a box model of its own around the diagram.
   A plain block with no padding or border lets every layer below stretch to the
   full slot. */
.dn-frame-outer,.dn-frame-inner{display:flex;flex-direction:column;min-width:0;min-height:0;flex:1}
.dn-viewport{position:relative;flex:1;display:flex;flex-direction:column;min-height:0;padding:0}
.dn-frame-outer .dn-viewport>.wb-canvas-inner{flex:1}
/* The particle layer is absolutely positioned against .wb-canvas-inner and must not
   swallow pointer events, or ReactFlow panning breaks under it. */
.wb-canvas-bg{position:absolute;inset:0;z-index:0;pointer-events:none}
.wb-canvas-inner>.react-flow{position:relative;z-index:1;flex:1;min-height:0;background:transparent}
/* The pane inherits ReactFlow's grab cursor. Over the particles the user is
   not grabbing anything, so use a plain pointer instead. On touch screens the
   same pane ships with touch-action:none; allowing vertical pan-y is what
   lets a swipe scroll the page and carry the particle box with it. */
.wb-canvas-inner .react-flow__pane{cursor:pointer!important}
@media(max-width:767px){.wb-canvas-inner .react-flow__pane{touch-action:pan-y!important}}
.wb-export{
  /* The panel is driven off --wb-bg so the Export block reads as its own surface
     rather than blending into the neighbouring card. In dark it is pulled BELOW
     the workspace, so the panel reads as a recessed slab against the card beside
     it - that direction is deliberate and was reversed by mistake once, which
     left the panel lighter than the workspace and visibly wrong.
     The mix stops at #1A1A1A. The original 72% bg + 28% black landed on #161616,
     which read as a dense black hole; 86% keeps the recessed feel while staying
     a visible dark grey. Light mode overrides this with a white mix below. */
  --wb-panel:color-mix(in srgb,var(--wb-bg) 86%,#000);
  /* Plates sit one tonal step off the panel, away from it: lifted in dark,
     gently recessed in light. */
  --wb-plate:color-mix(in srgb,var(--wb-panel) 90%,var(--wb-fg));
  /* Card outline. Light mode wants a dark hairline, dark mode a white one, so
     the token is the foreground itself rather than a mix toward the border
     token: the foreground is already near-black in light and near-white in dark. */
  --wb-card-edge:color-mix(in srgb,var(--wb-fg) 38%,transparent);
  /* Surface for the Export header plate and the format card only. In dark it is
     pinned to #242424 - the same value as --wb-card - so both plates match the
     cards elsewhere in the app and sit clearly above the darker #1A1A1A panel.
     It is NOT derived from --wb-plate: the plate is mixed off the panel, which
     would keep drifting every time the panel tone moves. A fixed value keeps
     these two cards stable.
     Overridden in light mode below. Kept separate from --wb-plate so no other
     block inherits this surface. */
  --wb-export-surface:#242424;
  position:relative;isolation:isolate;overflow:hidden;border-radius:16px;background:var(--wb-panel);padding:26px 22px;min-width:0;display:flex;flex-direction:column;gap:16px}
/* Every panel child except the decorative layers is lifted above them. Using
   :not() keeps their own absolute positioning from fighting a
   position:relative applied by a blanket child selector. */
.wb-export>:not(.wb-export-pattern){position:relative;z-index:1}.wb-export h3{font-size:17px;letter-spacing:-.01em;margin:0;font-weight:650}/* The copy sits on a lifted plate, and --wb-muted (#9a9a97 in dark) against it
   read as washed-out grey. --wb-ink-bright is a near-white that is defined per
   theme at the root, so the paragraph reads crisp in dark and keeps a legible
   ink in light. */
.wb-export-head p{font-size:13.5px;line-height:1.65;color:var(--wb-ink-bright);margin:6px 0 0}
/* Header plate: the Export copy sits directly on the shape texture, and at this
   density the icons cut through the letterforms. A solid plate one step off the
   panel colour gives the text a stable ground while the pattern still reads in
   the gaps between the panel's blocks.

   No negative side margins: the plate must be exactly as wide as the format
   card and the CTA stack below it. The negative pull was -12px each side, which
   made this block 24px wider than its neighbours. The panel's own 22px padding
   is the common gutter; the plate only needs to reach it. */
.wb-export-head{
  margin:0 0 -10px;
  padding:12px 12px 10px;
  border-radius:12px;
  border:1px solid var(--wb-card-edge);
  background:var(--wb-export-surface);
  /* The panel's 16px flex gap lets a band of glyphs show between this plate and
     the format card, cutting across the second line of copy. The -10px bottom
     margin above pulls the gap shut so the two plates read as one block. */
}
.wb-root .wb-download{width:100%;min-height:46px;font-size:14.5px;font-weight:600;letter-spacing:.01em}.wb-root .wb-open-editor{width:100%;min-height:46px;font-size:14.5px;font-weight:600;text-align:center}

/* ---------- Export format card --------------------------------------------
 * Same solid plate as the Export header, so the card reads as one block instead
 * of letting the glyphs run behind the format names and the progress steps.
 * The tab strips keep the opaque bg-accent step, and the selected pill stays
 * opaque so its inverted label keeps full contrast. */
/* The component carries Tailwind's border class (1px solid, light grey) on its
   root. That token does not read against this plate in dark mode, so the outline
   is replaced with the panel's own foreground-derived hairline: dark in light
   mode, white in dark mode. */
.wb-root .wb-pattern-plate{
  background:var(--wb-export-surface);
  border:1px solid var(--wb-card-edge);
}
/* The strip is driven off the card it sits in, not the global accent token. In
   dark mode --color-accent is #1c1b1a - darker than the plate - so the strip
   punched a near-black hole in the card and the unselected tabs read as grey
   text on that hole.
   It also needs its own token rather than --wb-plate: the plates are no longer
   tied to --wb-plate, since light mode now paints them pure white. A strip mixed
   off --wb-plate would land near the page tone and read as a grey hole punched
   in a white card.
   --wb-tab-strip is therefore derived from the export surface itself, so the
   strip always sits one step below the card it lives in. In light that is a 5%
   ink mix over white (#F4F4F4): visibly not white, so the unselected tabs still
   read as a recessed strip, while staying bright enough that the card does not
   look grey again. In dark the same 9% foreground mix over #242424 applies. */
.wb-root .wb-export{--wb-tab-strip:color-mix(in srgb,var(--wb-fg) 9%,var(--wb-export-surface))}
[data-theme="light"] .wb-export{--wb-tab-strip:color-mix(in srgb,#1c1b1a 5%,#ffffff)}
.wb-root .wb-pattern-plate [role="tablist"]{background:var(--wb-tab-strip)}
/* Every control in the Export card is square-cornered. The tabs ship with
   Tailwind rounded-md/rounded-lg and the selected pill is a motion div, so they
   are overridden here rather than left to the shared button rule. */
.wb-root .wb-pattern-plate [role="tablist"]{border-radius:0}
.wb-root .wb-pattern-plate [role="tab"]{border-radius:0}
.wb-root .wb-pattern-plate [role="tab"] [class*="rounded"]{border-radius:0}
/* Tab labels and step labels ship as text-muted-foreground, which is #9a9a97 in
   dark - visibly grey against the plate. Inside this card they are lifted to the
   near-white ink. The selector only touches the muted class, so the selected
   pill keeps its own inverted (text-background) label. */
.wb-root .wb-pattern-plate .text-muted-foreground{color:var(--wb-ink-bright)}
.wb-root .wb-pattern-plate .text-muted-foreground:hover{color:var(--wb-ink-bright)}
/* The progress rows in tree-nav, plus the sliding hover pill and the branch
   markers, all ship rounded-lg / rounded-[1px]. */
.wb-root .wb-pattern-plate ul a{border-radius:0}
.wb-root .wb-pattern-plate ul [class*="rounded"]{border-radius:0}

/* ---------- Export CTAs ----------------------------------------------------
 * Solid, high-contrast primary buttons. The wrapper only controls the gap, so it
 * has no background or mask of its own.
 * These used to be lime. Lime is now reserved for accent marks (focus rings,
 * diagram nodes, dots, badges), so the CTA fill comes from the --wb-action tokens:
 * near-black in light, near-white in dark. The old rim was a 62% foreground mix,
 * which made sense when the fill was lime and needed an edge; against a fill that
 * is already the theme's ink it would just muddy the button, so the rim points at
 * the same token as the fill and the silhouette stays clean. */
.wb-export-ctas{display:flex;flex-direction:column;gap:10px}
.wb-root .wb-export-ctas .wb-primary{border:1px solid var(--color-action-border,var(--wb-action))}
.wb-node{border-color:color-mix(in srgb,var(--wb-node-accent,var(--wb-primary)) 68%,var(--wb-border));box-shadow:0 14px 32px -20px color-mix(in srgb,var(--wb-fg) 32%,transparent),0 0 26px -21px var(--wb-node-accent,var(--wb-primary))}.wb-node[data-kind=agent]{--wb-node-accent:var(--color-chart-2,var(--wb-primary))}.wb-node[data-kind=integration],.wb-node[data-kind=review]{--wb-node-accent:var(--color-chart-3,var(--wb-primary))}.wb-glyph img{width:23px;height:23px;object-fit:contain}

/* Interactive cell grid on the workspace surround. It lives inside the
   scrolling panel so the cells travel with the content instead of being
   painted fixed to the viewport. */
.wb-workspace-grid{position:absolute;inset:0;z-index:0;height:100%;pointer-events:none;color:var(--color-foreground,CanvasText)}
.wb-workspace-grid rect{stroke-width:1;stroke-opacity:.08}

/* Light mode keeps the Export panel clearly whiter than the #F7F7F5 dashboard
   surface and lifts its two plates back to pure white. These two overrides were
   accidentally dropped when the old random-glyph canvas CSS was removed; without
   them the panel inherited the dark-mode near-black mix and the labels/tabs
   lost their contrast. */
[data-theme="light"] .wb-export{--wb-panel:color-mix(in srgb,#fff 70%,var(--wb-bg) 30%)}
[data-theme="light"] .wb-export{--wb-export-surface:#FFFFFF}

/* ---------- Primary CTA shimmer --------------------------------------------
 * The Export CTAs used to carry the same travelling band as the canvas label,
 * tuned for the old lime fill. Once the buttons went near-black/near-white the
 * band had to be retuned for that ink, because a white sweep over white glyphs
 * is not a sheen, it is nothing.
 *
 * It lives on a ::after overlay rather than on the button's own text so the
 * label is duplicated (via attr(data-label)) into a clipped gradient. The base
 * label therefore stays fully solid: at any single moment the band only covers
 * a slice of the word, and the previous approach - painting the whole label in
 * the gradient - made the letters vanish outside that slice.
 *
 * The band starts completely off to the left and ends completely off to the
 * right (background-position 250% -> -150% of a 240%-wide layer), so there is a
 * real pause before each pass instead of a band that is always somewhere over
 * the text. */
.wb-root .wb-primary{position:relative;overflow:hidden;isolation:isolate}
.wb-root .wb-primary::after{
  content:attr(data-label);
  position:absolute;
  inset:0;
  display:flex;
  align-items:center;
  justify-content:center;
  padding:inherit;
  pointer-events:none;
  color:transparent;
  background-image:linear-gradient(100deg,
    transparent 0%,
    transparent 40%,
    var(--wb-cta-shimmer) 50%,
    transparent 60%,
    transparent 100%);
  background-size:240% 100%;
  background-position:250% 50%;
  background-repeat:no-repeat;
  -webkit-background-clip:text;
  background-clip:text;
  -webkit-text-fill-color:transparent;
  animation:wb-cta-shimmer 3.4s ease-in-out infinite;
}
/* The sheen has to travel in the direction the ink allows. On light the button
   is near-black, so a light band over the glyphs reads as light passing over
   dark ground. On dark the button is near-white, so a white band would be
   invisible - the band is inverted there and darkens a slice of the letters
   instead. Same gesture, opposite direction, chosen per theme. */
.wb-root .wb-primary{--wb-cta-shimmer:color-mix(in srgb,#000 34%,transparent)}
[data-theme="light"] .wb-root .wb-primary{--wb-cta-shimmer:color-mix(in srgb,#fff 52%,transparent)}
@keyframes wb-cta-shimmer{
  0%,14%{background-position:250% 50%}
  72%,100%{background-position:-150% 50%}
}
/* ---------- Hero shape pattern (Export panel background) -------------------
 * Adapted from the DShapes hero grid. The original renders 140 interactive
 * tiles; here the same SVG shapes are tiled into a fixed decorative strip that
 * is pinned behind the panel content.
 *
 * Opacity is kept very low so the pattern stays a texture and never competes
 * with the Export copy or buttons. Dark mode gets a slightly deeper cut because
 * a near-white glyph on a near-black panel reads brighter than dark ink on a
 * pale one. */
/* The DShapes glyph sheet is a dense 25-glyph SVG pattern. Its resting layer
   paints with currentColor, so the ink has to be named here rather than being
   pinned to a fixed neutral grey: neutral-800 vanished on the dark panel and
   neutral-200 vanished on the light one. A muted mix of the foreground tracks
   both themes and stays behind the panel copy.
 *
 * The panel is decorative, so the whole layer is pointer-events:none; the
 * Pattern FX controls re-enable it on themselves. */
/* The pattern layer sits at z-index 0, behind the panel's own children (which
   the rule below lifts to 1), so the solid plates read as solid blocks and the
   texture only shows in the gaps between them. The FX controls used to need a
   separate stacked overlay here; they now live in the profile menu. */
.wb-export-pattern{
  position:absolute;
  inset:0;
  z-index:0;
  overflow:hidden;
  pointer-events:none;
  contain:layout paint style;
  color:color-mix(in srgb,var(--wb-fg) 62%,transparent);
}
@container(max-width:1050px){.wb-workspace{grid-template-columns:1fr}}
@container(max-width:480px){.wb-header{padding:14px}.wb-clone-form{width:100%}.wb-canvas-frame-host{min-height:220px}}
@media(prefers-reduced-motion:reduce){.wb-root .wb-edge-pulse{animation:none}.ag-particles__layer{transition:none}.wb-root .wb-primary::after{display:none}}
`;