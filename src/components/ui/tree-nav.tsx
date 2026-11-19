"use client";

import * as React from "react";
import {
  animate,
  motion,
  useMotionValue,
  useTransform,
  type MotionValue,
} from "framer-motion";

import { cn } from "@/lib/utils";
import { usePrefersReducedMotion } from "@/components/ui/tree-nav-utils/use-typewriter";

export interface TreeNavItem {
  label: string;
  href: string;
  /** Small pill after the label, e.g. "New". */
  badge?: string;
  /** Opens in a new tab. */
  external?: boolean;
}

type LinkComponent =
  | "a"
  | React.ComponentType<
      React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }
    >;

export interface TreeNavProps {
  items: TreeNavItem[];
  /** href of the current page; the marker and background rest on this row. */
  activeHref?: string;
  /** Slide the marker and background to the hovered row and spring back on leave. */
  followHover?: boolean;
  /** Element used for links, e.g. Next's Link. Defaults to a plain anchor. */
  linkComponent?: LinkComponent;
  onSelect?: (
    item: TreeNavItem,
    event: React.MouseEvent<HTMLAnchorElement>,
  ) => void;
  className?: string;
}

const ROW_H = 40;
const MARKER = 8;
/** Checkpoint diamonds: a hair smaller than the travelling marker, so the marker
 *  covers one exactly when it lands on a row. */
const CHECKPOINT = 7;
/** Horizontal centre of the rail inside the 24px gutter. */
const RAIL_X = 12;

// Critically damped (no overshoot) with a ~0.3s response: Apple's default for
// repositioning UI, tightened a little for a hover highlight. Springs re-target from the live value and carry velocity,
// so sweeping the pointer down the list never stutters or snaps.
const GLIDE = { type: "spring", visualDuration: 0.22, bounce: 0 } as const;
const FADE = { duration: 0.12, ease: "easeOut" } as const;

/**
 * One checkpoint diamond on the rail.
 *
 * The muted diamond is always painted, so the list reads as a route with stops
 * even before the pointer arrives. A second, solid copy fades in as the accent
 * run reaches that row - the fill follows the travelling marker instead of the
 * row being hovered, so sweeping the pointer down lights the checkpoints in
 * order and they stay lit behind the marker.
 */
function RailCheckpoint({
  y,
  tipY,
  presence,
}: {
  y: number;
  tipY: MotionValue<number>;
  presence: MotionValue<number>;
}) {
  const filled = useTransform([tipY, presence], ([tip, shown]: number[]) => {
    if (shown < 0.02) return 0;
    // Ramp over the last 14px of the approach, so the diamond lights up as the
    // marker arrives rather than popping.
    const ramp = Math.min(1, Math.max(0, (tip - (y - 14)) / 14));
    return ramp * shown;
  });
  const box = {
    insetInlineStart: RAIL_X - CHECKPOINT / 2,
    top: y - CHECKPOINT / 2,
    width: CHECKPOINT,
    height: CHECKPOINT,
  };

  return (
    <>
      <span
        aria-hidden
        className="absolute rotate-45 rounded-[1px] bg-foreground/[0.16]"
        style={box}
      />
      <motion.span
        aria-hidden
        className="absolute rotate-45 rounded-[1px] bg-foreground will-change-[opacity]"
        style={{ ...box, opacity: filled }}
      />
    </>
  );
}

export function TreeNav({
  items,
  activeHref,
  followHover = true,
  linkComponent: Link = "a",
  onSelect,
  className,
}: TreeNavProps) {
  const listRef = React.useRef<HTMLUListElement>(null);
  const rowRefs = React.useRef<(HTMLLIElement | null)[]>([]);
  const centersRef = React.useRef<number[]>([]);
  const hoveredRef = React.useRef<number | null>(null);
  const reduced = usePrefersReducedMotion();
  const activeIndex = items.findIndex((item) => item.href === activeHref);
  // Handlers and the measurer read these through refs so they never go stale
  // and never need to be re-created; the sync runs before the measure effect.
  const reducedRef = React.useRef(reduced);
  const activeRef = React.useRef(activeIndex);
  React.useLayoutEffect(() => {
    reducedRef.current = reduced;
    activeRef.current = activeIndex;
  });

  // Rail length is the only measurement that renders; everything that moves is
  // a motion value, so hovering never re-renders the list.
  const [end, setEnd] = React.useState(0);
  const [centers, setCenters] = React.useState<number[]>([]);
  const [measured, setMeasured] = React.useState(false);

  const centerY = useMotionValue(0);
  const visibility = useMotionValue(0);
  const pillY = useTransform(centerY, (v) => v - ROW_H / 2);
  const markerY = useTransform(centerY, (v) => v - MARKER / 2);
  const accentScale = useTransform(centerY, (v) =>
    end > 0 ? Math.min(1, v / end) : 0,
  );

  const moveTo = React.useCallback(
    (index: number | null, immediate = false) => {
      const centers = centersRef.current;
      if (index === null || index < 0 || index >= centers.length) {
        animate(visibility, 0, FADE);
        return;
      }
      const target = centers[index];
      // Coming back from hidden: appear on the row instead of travelling from
      // wherever the marker was last parked.
      const jump = immediate || reducedRef.current || visibility.get() < 0.05;
      if (jump) centerY.jump(target);
      else animate(centerY, target, GLIDE);
      animate(visibility, 1, FADE);
    },
    [centerY, visibility],
  );

  React.useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const measure = () => {
      const next = rowRefs.current
        .slice(0, items.length)
        .map((el) => (el ? el.offsetTop + el.offsetHeight / 2 : 0));
      centersRef.current = next;
      setCenters(next);
      setEnd(next.length > 0 ? next[next.length - 1] : 0);
      setMeasured(true);
      // A re-measure is a layout change, not motion: settle instantly.
      moveTo(hoveredRef.current ?? activeRef.current, true);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(list);
    return () => observer.disconnect();
  }, [items.length, moveTo]);

  // Route changes glide; a hover in progress keeps priority.
  React.useEffect(() => {
    if (hoveredRef.current === null) moveTo(activeIndex);
  }, [activeIndex, moveTo]);

  const enter = (index: number) => {
    if (!followHover) return;
    hoveredRef.current = index;
    moveTo(index);
  };
  const leave = () => {
    if (!followHover) return;
    hoveredRef.current = null;
    moveTo(activeRef.current);
  };

  return (
    <ul
      ref={listRef}
      className={cn("relative m-0 flex list-none flex-col gap-1 ps-6", className)}
      onPointerLeave={leave}
    >
      {/* Tree rail with checkpoint diamonds, an accent run that grows to the
          marked row, and the diamond marker. All motion is transform + opacity.
          The rail stays visible at rest (a mild ink wash rather than the border
          token, which all but disappears on the translucent corner panels). */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 start-0 w-5"
      >
        <span
          className="absolute top-0 w-px bg-foreground/[0.12]"
          style={{ insetInlineStart: RAIL_X - 0.5, height: end }}
        />
        <motion.span
          className="absolute top-0 w-px origin-top bg-foreground will-change-transform"
          style={{
            insetInlineStart: RAIL_X - 0.5,
            height: end,
            scaleY: accentScale,
            opacity: visibility,
          }}
        />
        {centers.map((y, index) => (
          <RailCheckpoint
            key={items[index]?.href ?? index}
            y={y}
            tipY={centerY}
            presence={visibility}
          />
        ))}
        <motion.span
          className="absolute top-0 rounded-[1px] bg-foreground will-change-transform"
          style={{
            insetInlineStart: RAIL_X - MARKER / 2,
            width: MARKER,
            height: MARKER,
            y: markerY,
            rotate: 45,
            opacity: visibility,
          }}
        />
      </span>

      {/* One shared background: rests on the active row, follows the pointer,
          springs back on leave. */}
      <motion.span
        aria-hidden
        className="pointer-events-none absolute end-0 start-6 top-0 rounded-lg bg-foreground/[0.04] will-change-transform"
        style={{ height: ROW_H, y: pillY, opacity: visibility }}
      />

      {items.map((item, index) => {
        const isActive = index === activeIndex;
        return (
          <li
            key={item.href}
            ref={(el) => {
              rowRefs.current[index] = el;
            }}
            className="relative"
            onPointerEnter={() => enter(index)}
          >
            <Link
              href={item.href}
              target={item.external ? "_blank" : undefined}
              rel={item.external ? "noreferrer" : undefined}
              aria-current={isActive ? "step" : undefined}
              onClick={onSelect ? (event) => onSelect(item, event) : undefined}
              onFocus={() => enter(index)}
              onBlur={leave}
              className={cn(
                "flex h-[40px] items-center gap-2 rounded-lg px-3.5 text-[14px] leading-5 antialiased transition-colors duration-150 ease-out",
                // Before the first measurement the pill has no position yet, so
                // the active row paints its own background for that one frame.
                isActive && !measured && "bg-foreground/[0.04]",
                isActive
                  ? "font-medium text-foreground"
                  : "font-normal text-muted-foreground hover:text-foreground",
              )}
            >
              <span className="truncate">{item.label}</span>
              {item.badge && (
                <span className="inline-flex h-5 shrink-0 items-center rounded-md bg-primary/10 px-1.5 text-xs font-medium leading-none text-primary-ink">
                  {item.badge}
                </span>
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export default TreeNav;
