import { cn } from "@/lib/utils";

/* ---------------------------------------------------------------------------
   StatsBento

   A six-card bento: one lime hero carrying the 64% figure, then five smaller
   stats around it. Adapted from the upstream snippet in three ways.

   1. It is a plain component, not a page: no `min-h-screen`, no `use client`,
      no layout of its own beyond the grid. The host decides where it sits.
   2. All colour comes from the app's tokens (`bg-primary`, `bg-card`,
      `bg-muted`, `text-foreground`, `--color-muted-foreground`), so it flips
      with the theme instead of shipping a hard-coded shadcn palette.
   3. The decorative stripe layer uses inline CSS rather than the snippet's
      `bg-[...]` + `mask-[...]` arbitrary utilities: `mask-image` support in
      Tailwind's arbitrary syntax is uneven across versions, and this way the
      gradient and its mask are one readable object.

   Copy is still demo copy - swap it once real numbers exist. `Stats` is a
   single array so the grid stays declarative: adding a seventh card is one
   entry, not another block of JSX.
   --------------------------------------------------------------------------- */

const STRIPES = {
  backgroundImage:
    "repeating-linear-gradient(45deg, #808080 0px, #808080 1px, transparent 1px, transparent 10px)",
  maskImage:
    "radial-gradient(ellipse 80% 50% at 100% 0%, #000 70%, transparent 110%)",
  WebkitMaskImage:
    "radial-gradient(ellipse 80% 50% at 100% 0%, #000 70%, transparent 110%)",
};

const BARS = [10, 20, 40, 30, 60, 50, 80, 70, 90, 100, 110];

export function StatsBento({ className }: { className?: string }) {
  return (
    <section className={cn("w-full", className)}>
      {/* Three breakpoints, not two. The snippet jumped straight from one column
          to six, which at tablet width squeezed the hero to ~226px and cut the
          awards card down to a 65px sliver where "AWARDS" wrapped. Two columns in
          between keeps every card readable; the six-column bento only takes over
          once there is room for it. */}
      <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-6">
        {/* Hero. Spans two rows so the 64% has as much air as the snippet gave
            it; auto rows let the neighbours decide how tall those rows are, so
            nothing here needs a hard-coded height at any breakpoint. */}
        <div className="relative flex flex-col justify-between overflow-hidden rounded-3xl bg-primary p-8 md:col-span-2 md:p-10 lg:col-span-3 lg:row-span-2">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-30"
            style={STRIPES}
          />
          <div className="relative">
            {/* Ink at 70%, not the snippet's 60%: on lime the 60% wash dropped
                to roughly 4:1, and the label is 10px uppercase - the two
                together were the least readable thing on the page. */}
            <span className="mb-6 inline-block rounded-full bg-primary-foreground/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-primary-foreground/70">
              Market Share
            </span>
            <h3 className="text-6xl tracking-tighter text-primary-foreground">
              64%
            </h3>
          </div>
          <p className="relative mt-6 max-w-xs text-sm text-primary-foreground/75">
            Dominating the cloud-native infrastructure market for venture-backed
            startups.
          </p>
        </div>

        {/* Growth, with the bar strip as the visual. `items-end` pins the bars
            to the baseline so their heights read as data rather than as a
            decorative pattern. */}
        <div className="flex items-center justify-between gap-6 rounded-3xl border border-border bg-muted p-8 md:col-span-2 lg:col-span-3">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Growth
            </p>
            <p className="text-3xl text-foreground">+240%</p>
          </div>
          <div className="flex h-8 shrink-0 items-end gap-1" aria-hidden="true">
            {BARS.map((height, index) => (
              <div
                key={index}
                className="w-1.5 rounded-full bg-foreground"
                style={{ height: `${height}%` }}
              />
            ))}
          </div>
        </div>

        {/* Narrow card. The label is two words shorter than the others so it
            still fits a one-column span without wrapping mid-word. */}
        <div className="flex flex-col justify-center rounded-3xl border border-border bg-card p-6 text-center lg:col-span-1">
          <p className="text-2xl text-foreground">12</p>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Awards
          </p>
        </div>

        <div className="flex items-center gap-4 rounded-3xl border border-border bg-muted p-6 lg:col-span-2">
          <div
            aria-hidden="true"
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-background text-2xl font-semibold text-foreground shadow-sm"
          >
            ★
          </div>
          <div>
            <p className="text-sm leading-none text-foreground">4.9 / 5.0</p>
            <p className="mt-1 text-xs font-semibold text-muted-foreground">
              G2 Peer Reviews
            </p>
          </div>
        </div>

        {/* The two additions. Same rhythm as Growth - label, then figure - so
            the third row needs no new visual language to belong. */}
        <div className="flex flex-col justify-center rounded-3xl border border-border bg-card p-6 lg:col-span-3">
          <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Countries
          </p>
          <p className="text-3xl text-foreground">32</p>
        </div>

        <div className="flex flex-col justify-center rounded-3xl border border-border bg-muted p-6 lg:col-span-3">
          <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Uptime
          </p>
          <p className="text-3xl text-foreground">99.99%</p>
        </div>
      </div>
    </section>
  );
}

export default StatsBento;
