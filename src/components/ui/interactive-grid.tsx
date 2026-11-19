import * as React from "react";

import { cn } from "@/lib/utils";

export interface InteractiveGridProps extends React.ComponentProps<"div"> {
  /** Side of a cell, in pixels. */
  cellSize?: number;
  /** How many recently visited cells keep fading behind the pointer. */
  trail?: number;
}

/** How long a cell takes to fade out once the pointer has left it. */
const FADE_MS = 700;

/**
 * A grid whose cell under the pointer lights up and leaves a fading trail
 * behind it, like a wake. It fills its positioned parent and tracks the pointer
 * over that parent, so the content on top stays clickable.
 *
 * The first version emitted an SVG `<rect>` for every cell - ~1,800 nodes at
 * this panel's size, each with its own transition rule - and re-rendered all of
 * them on pointer movement. This version paints the grid lines as two repeating
 * gradients and keeps a small, fixed pool of highlight boxes: one that tracks
 * the pointer and `trail` more that are recycled round-robin. Handing a box a
 * cell starts a Web Animation on its opacity, which the compositor runs without
 * touching layout, so the trail can be 18 fading cells while React still never
 * re-renders on mouse movement.
 *
 * The edge fade is still left to the caller as a `mask-image`, keeping this
 * component a plain, composable layer.
 */
export function InteractiveGrid({
  cellSize = 40,
  trail = 18,
  className,
  style,
  ...props
}: InteractiveGridProps) {
  const hostRef = React.useRef<HTMLDivElement>(null);
  const litRef = React.useRef<HTMLDivElement>(null);
  const trailRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const host = hostRef.current;
    const lit = litRef.current;
    const trailHost = trailRef.current;
    const parent = host?.parentElement;
    if (!host || !lit || !trailHost || !parent) return;

    const pool = Array.from(trailHost.children) as HTMLElement[];

    let column = -1;
    let row = -1;
    let frame = 0;
    let next: { x: number; y: number } | null = null;
    let seed = 0;
    /* The panel's box, cached. Reading it inside the pointer handler forced a
       layout on every single mouse-move event; the box only changes when the
       sidebar animates or the window resizes, so it is measured lazily at most
       once per animation frame instead. */
    let box: DOMRect | null = null;

    /* Park the cell the pointer just left in the pool and let it fade. Using an
       animation rather than a CSS transition means no forced reflow to restart
       it when a recycled box is reused before its previous fade has finished. */
    const shed = (col: number, row_: number) => {
      if (!pool.length) return;
      const box_ = pool[seed++ % pool.length];
      box_.style.transform = `translate3d(${col * cellSize}px, ${row_ * cellSize}px, 0)`;
      box_.getAnimations().forEach((animation) => animation.cancel());
      box_.animate([{ opacity: 0.28 }, { opacity: 0 }], {
        duration: FADE_MS,
        easing: "ease-out",
      });
    };

    const paint = () => {
      frame = 0;
      if (!next) return;
      const { x: clientX, y: clientY } = next;
      next = null;

      if (!box) box = host.getBoundingClientRect();
      const x = clientX - box.left;
      const y = clientY - box.top;

      const col = Math.floor(x / cellSize);
      const row_ = Math.floor(y / cellSize);
      if (col === column && row_ === row) return;
      if (column >= 0) shed(column, row);
      column = col;
      row = row_;

      // Entering a cell lights it instantly; only leaving fades.
      lit.style.transition = "none";
      lit.style.transform = `translate3d(${col * cellSize}px, ${row_ * cellSize}px, 0)`;
      lit.style.opacity = "0.28";
    };

    function onPointerMove(event: PointerEvent) {
      next = { x: event.clientX, y: event.clientY };
      if (!frame) frame = requestAnimationFrame(paint);
    }

    function onPointerLeave() {
      if (column >= 0) shed(column, row);
      column = -1;
      row = -1;
      next = null;
      if (frame) {
        cancelAnimationFrame(frame);
        frame = 0;
      }
      lit!.style.transition = "";
      lit!.style.opacity = "0";
    }

    const invalidate = () => {
      box = null;
    };

    const resizeObserver = new ResizeObserver(invalidate);
    resizeObserver.observe(host);
    window.addEventListener("scroll", invalidate, true);

    parent.addEventListener("pointermove", onPointerMove, { passive: true });
    parent.addEventListener("pointerleave", onPointerLeave);
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("scroll", invalidate, true);
      parent.removeEventListener("pointermove", onPointerMove);
      parent.removeEventListener("pointerleave", onPointerLeave);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [cellSize, trail]);

  return (
    <div
      ref={hostRef}
      data-slot="interactive-grid"
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden text-foreground",
        className,
      )}
      style={style}
      {...props}
    >
      {/* Cell edges: two 1px repeating gradients rather than one stroked rect
          per cell. The 14% matches the stroke opacity the SVG version used. */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)",
          backgroundSize: `${cellSize}px ${cellSize}px`,
          opacity: 0.14,
        }}
      />
      {/* The fading wake. Boxes are addressable by index from the effect; their
          resting opacity is 0 and each new assignment animates up and away. */}
      <div ref={trailRef} className="absolute inset-0">
        {Array.from({ length: trail }, (_, index) => (
          <div
            key={index}
            className="absolute left-0 top-0 bg-current opacity-0 motion-reduce:hidden"
            style={{ width: cellSize, height: cellSize }}
          />
        ))}
      </div>
      {/* The cell under the pointer. Fill opacity 0.28 matches the highlight the
          SVG version applied to the hovered cell. */}
      <div
        ref={litRef}
        className="absolute left-0 top-0 bg-current opacity-0 transition-opacity duration-700 ease-out motion-reduce:transition-none"
        style={{ width: cellSize, height: cellSize }}
      />
    </div>
  );
}

export default InteractiveGrid;
