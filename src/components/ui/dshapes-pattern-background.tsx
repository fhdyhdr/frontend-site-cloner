import React, { useEffect, useId, useRef, useState } from "react";

import { cn } from "@/lib/utils";

export interface PatternPreset {
  id: string;
  name: string;
  gradientCss: string;
  accentHex: string;
  secondaryHex: string;
  glowRgba: string;
}

/**
 * Spectrums available to the Pattern FX panel.
 *
 * The default is the third entry (Cobalt Prism), resolved by id in the
 * component, not by array position - reordering this list stays safe. The
 * textures stay high in chroma on purpose: the gradient layer renders at a
 * fraction of the pattern opacity (it is a tint over the ink layer, not a solid
 * fill), so a muted palette washes out to grey on screen.
 */
export const GRADIENT_PRESETS: PatternPreset[] = [
  {
    id: "acid",
    name: "Flowdeck Lime",
    gradientCss: "linear-gradient(90deg, #ccff00 0%, #00e58c 50%, #9dff00 100%)",
    accentHex: "#ccff00",
    secondaryHex: "#00e58c",
    glowRgba: "rgba(204, 255, 0, 0.3)",
  },
  {
    id: "dshapes",
    name: "DShapes Magenta",
    gradientCss: "linear-gradient(90deg, #ff00e5 0%, #ff0040 48%, #ff00d4 100%)",
    accentHex: "#ff00e5",
    secondaryHex: "#ff0040",
    glowRgba: "rgba(255, 0, 140, 0.3)",
  },
  {
    id: "prism",
    name: "Cobalt Prism",
    gradientCss: "linear-gradient(90deg, #00c8ff 0%, #4d5cff 48%, #ff4d9e 100%)",
    accentHex: "#00c8ff",
    secondaryHex: "#ff4d9e",
    glowRgba: "rgba(77, 92, 255, 0.3)",
  },
  {
    id: "solar",
    name: "Solar Crimson",
    gradientCss: "linear-gradient(90deg, #ffb800 0%, #ff2d55 50%, #ff0033 100%)",
    accentHex: "#ffb800",
    secondaryHex: "#ff2d55",
    glowRgba: "rgba(255, 45, 85, 0.3)",
  },
];

interface DShapesPatternBackgroundProps {
  /**
   * Fallbacks used only until a user has touched the FX controls. Once they do,
   * the stored values win - see readStoredFx below.
   */
  defaultPresetId?: string;
  defaultOpacity?: number;
  defaultEdgeFade?: number;
  /**
   * The FX controls no longer render inside this component. They used to float
   * over the Export panel, which put them on top of the plates; they now live in
   * the profile menu. Pass `onControlsReady` to publish the control block upward
   * once the pattern mounts.
   */
  onControlsReady?: (controls: PatternFxControls | null) => void;
  /** Set false to keep the panel stateless (handy for embedded demos). */
  persist?: boolean;
  className?: string;
}

/** localStorage key. Versioned so a future shape change can start clean. */
const FX_STORAGE_KEY = "flowdeck-pattern-fx-v1";

type StoredFx = { presetId: string; opacity: number; edgeFade: number };

/**
 * Read the saved controls, ignoring anything malformed. localStorage is shared
 * with other tabs and users can edit it by hand, so a single bad value must not
 * be able to blank out the pattern: each field is validated on its own and any
 * survivor is used while the rest fall back to the defaults.
 */
function readStoredFx(): Partial<StoredFx> {
  try {
    const raw = localStorage.getItem(FX_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Partial<StoredFx>;
    if (!parsed || typeof parsed !== "object") return {};
    const out: Partial<StoredFx> = {};
    if (
      typeof parsed.presetId === "string" &&
      GRADIENT_PRESETS.some((p) => p.id === parsed.presetId)
    ) {
      out.presetId = parsed.presetId;
    }
    if (typeof parsed.opacity === "number" && Number.isFinite(parsed.opacity)) {
      out.opacity = Math.max(12, Math.min(85, Math.round(parsed.opacity)));
    }
    if (typeof parsed.edgeFade === "number" && Number.isFinite(parsed.edgeFade)) {
      out.edgeFade = Math.max(0, Math.min(45, Math.round(parsed.edgeFade)));
    }
    return out;
  } catch {
    return {};
  }
}

function writeStoredFx(value: StoredFx) {
  try {
    localStorage.setItem(FX_STORAGE_KEY, JSON.stringify(value));
  } catch {
    /* Private mode / quota exceeded: the panel still works, it just forgets. */
  }
}

/** Live pattern state plus its setters, published to the profile menu. */
export interface PatternFxControls {
  preset: PatternPreset;
  opacity: number;
  edgeFade: number;
  setPreset: (preset: PatternPreset) => void;
  setOpacity: (value: number) => void;
  setEdgeFade: (value: number) => void;
}

/**
 * The controls block itself. Rendered by the profile menu, not by the pattern,
 * so it can sit inside a completely different part of the tree while still
 * driving this layer.
 */
export function PatternFxPanel({ controls }: { controls: PatternFxControls }) {
  const { preset, opacity, edgeFade, setPreset, setOpacity, setEdgeFade } = controls;
  return (
    <div className="epm-fx">
      <span className="epm-fx-label">Pattern FX</span>
      <div className="epm-fx-swatches">
        {GRADIENT_PRESETS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              setPreset(item);
            }}
            title={item.name}
            aria-label={item.name}
            aria-pressed={item.id === preset.id}
            className={cn("epm-fx-swatch", item.id === preset.id && "epm-active")}
            style={{ backgroundImage: item.gradientCss }}
          />
        ))}
      </div>
      <div className="epm-fx-row">
        <div className="epm-fx-row-head">
          <span>Opacity</span>
          <span>{opacity}%</span>
        </div>
        <input
          type="range"
          min={12}
          max={85}
          value={opacity}
          onChange={(event) => setOpacity(Number(event.target.value))}
          onClick={(event) => event.stopPropagation()}
          aria-label="Pattern opacity"
          className="epm-fx-range"
        />
      </div>
      <div className="epm-fx-row">
        <div className="epm-fx-row-head">
          <span>Edge fade</span>
          <span>{edgeFade}%</span>
        </div>
        <input
          type="range"
          min={0}
          max={45}
          value={edgeFade}
          onChange={(event) => setEdgeFade(Number(event.target.value))}
          onClick={(event) => event.stopPropagation()}
          aria-label="Edge fade"
          className="epm-fx-range"
        />
      </div>
    </div>
  );
}

/**
 * Drop-in Pattern Background with a 25-glyph dense abstract SVG grid, 4-side
 * edge fade, a smooth hover gradient spotlight, and optional Pattern FX
 * controls. Place inside any `relative overflow-hidden` container.
 *
 * Adaptations for this app:
 *
 *  - The glyph sheet is memoised per colour pair. It is ~25 hand-built shapes,
 *    and previously each of the three layers rebuilt the whole tree on every
 *    render - including on every pointer move, since the spotlight position is
 *    state.
 *  - The pointer handler writes the spotlight position through a ref plus a
 *    rAF, so moving the mouse no longer triggers a React render per event.
 *  - Colours come from the SVG's own `color` (currentColor) in the base layer,
 *    so the resting texture follows the theme instead of being pinned to a
 *    neutral grey that vanished on the dark panel.
 */
export const DShapesPatternBackground: React.FC<DShapesPatternBackgroundProps> = ({
  defaultPresetId = "prism",
  defaultOpacity = 26,
  defaultEdgeFade = 22,
  onControlsReady,
  persist = true,
  className,
}) => {
  const uid = useId().replace(/:/g, "");
  const basePatternId = `dshapes-base-${uid}`;
  const glowPatternId = `dshapes-glow-${uid}`;
  const spotPatternId = `dshapes-spot-${uid}`;
  const gradId = `dshapes-grad-${uid}`;
  const spotGradId = `dshapes-spot-grad-${uid}`;

  /* Read storage once, lazily, so the very first paint already uses the saved
     values instead of flashing the defaults and then correcting itself. */
  const [stored] = useState(() => (persist ? readStoredFx() : {}));

  const [preset, setPreset] = useState<PatternPreset>(
    () =>
      GRADIENT_PRESETS.find(
        (p) => p.id === (stored.presetId ?? defaultPresetId),
      ) || GRADIENT_PRESETS[0],
  );
  const [opacity, setOpacity] = useState(stored.opacity ?? defaultOpacity);
  const [edgeFade, setEdgeFade] = useState(stored.edgeFade ?? defaultEdgeFade);
  const [hovering, setHovering] = useState(false);

  /* Write on every change. Cheap (three primitives) and it keeps the effect
     below simple - a debounce would only add a window where a fast refresh
     loses the last drag. */
  useEffect(() => {
    if (!persist) return;
    writeStoredFx({ presetId: preset.id, opacity, edgeFade });
  }, [persist, preset.id, opacity, edgeFade]);

  /* Publish the live controls so the profile menu can render them. The setter
     identity is stable per render, so the effect re-runs on any change and the
     menu always holds the current values. */
  useEffect(() => {
    onControlsReady?.({ preset, opacity, edgeFade, setPreset, setOpacity, setEdgeFade });
  }, [onControlsReady, preset, opacity, edgeFade]);

  useEffect(() => () => onControlsReady?.(null), [onControlsReady]);

  const containerRef = useRef<HTMLDivElement>(null);
  const spotRef = useRef({ x: 160, y: 240 });
  const spotSvgRef = useRef<SVGSVGElement>(null);
  const rafRef = useRef(0);

  const normalizedOpacity = Math.max(0.08, Math.min(0.95, opacity / 100));
  const clampedFade = Math.max(0, Math.min(48, edgeFade));
  const horizontalMask =
    clampedFade > 0
      ? `linear-gradient(to right, transparent 0%, #000 ${clampedFade}%, #000 ${100 - clampedFade}%, transparent 100%)`
      : undefined;
  const verticalMask =
    clampedFade > 0
      ? `linear-gradient(to bottom, transparent 0%, #000 ${clampedFade}%, #000 ${100 - clampedFade}%, transparent 100%)`
      : undefined;

  /**
   * The layer itself is pointer-events:none (it must never block the panel's
   * buttons), so hover events can never reach it. Listening on the window and
   * hit-testing the pointer against our own rect gives the same spotlight
   * without putting this decorative layer in front of any content.
   *
   * The mask is painted straight from the ref inside a rAF, so pointer movement
   * costs one frame of work rather than a React render per event.
   */
  useEffect(() => {
    const host = containerRef.current;
    if (!host) return;

    /* Cached, for the same reason as the grid: a rect read per pointer-move
       event forces a layout. It is refreshed on resize and scroll instead. */
    let box: DOMRect | null = null;
    let hovered = false;

    const paint = () => {
      rafRef.current = 0;
      const svg = spotSvgRef.current;
      if (!svg) return;
      const { x, y } = spotRef.current;
      const mask = `radial-gradient(230px circle at ${x}px ${y}px, rgba(0,0,0,1) 0%, rgba(0,0,0,0.3) 55%, transparent 100%)`;
      svg.style.maskImage = mask;
      svg.style.webkitMaskImage = mask;
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (!box) box = host.getBoundingClientRect();
      const inside =
        e.clientX >= box.left &&
        e.clientX <= box.right &&
        e.clientY >= box.top &&
        e.clientY <= box.bottom;

      if (!inside) {
        if (hovered) {
          hovered = false;
          setHovering(false);
        }
        return;
      }

      spotRef.current = { x: e.clientX - box.left, y: e.clientY - box.top };
      if (!hovered) {
        hovered = true;
        setHovering(true);
      }
      if (!rafRef.current) rafRef.current = requestAnimationFrame(paint);
    };

    const handleLeave = () => {
      if (!hovered) return;
      hovered = false;
      setHovering(false);
    };

    const invalidate = () => {
      box = null;
    };

    const resizeObserver = new ResizeObserver(invalidate);
    resizeObserver.observe(host);
    window.addEventListener("scroll", invalidate, true);
    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("blur", handleLeave);
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("scroll", invalidate, true);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("blur", handleLeave);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const glyphs = (strokeColor: string, fillColor: string) => (
    <g stroke={strokeColor} fill="none" strokeLinecap="round" strokeLinejoin="round">
      <g transform="translate(18, 18)" fill={fillColor} stroke="none">
        <circle cx="0" cy="0" r="2.2" />
        {[0, 45, 90, 135, 180, 225, 270, 315].map((d) => {
          const r = (d * Math.PI) / 180;
          return <circle key={`a${d}`} cx={Math.cos(r) * 8.2} cy={Math.sin(r) * 8.2} r="1.6" />;
        })}
        {[15, 55, 95, 135, 175, 215, 255, 295, 335].map((d) => {
          const r = (d * Math.PI) / 180;
          return <circle key={`b${d}`} cx={Math.cos(r) * 15.8} cy={Math.sin(r) * 15.8} r="1.9" />;
        })}
      </g>
      <g transform="translate(54, 18)" strokeWidth="2.1">
        <polygon points="0,-17.5 15.2,-8.8 15.2,8.8 0,17.5 -15.2,8.8 -15.2,-8.8" />
        <path d="M-6,-13.5 L8,-4 M8,-12 L12,4 M14,0 L0,13.5 M6,13.5 L-8,4 M-8,12 L-12,-4 M-14,0 L0,-13.5" strokeWidth="1.4" />
      </g>
      <g transform="translate(90, 18)" strokeWidth="2">
        <circle cx="0" cy="-7" r="8" />
        <circle cx="-6.5" cy="5.5" r="8" />
        <circle cx="6.5" cy="5.5" r="8" />
      </g>
      <g transform="translate(126, 18)" strokeWidth="1.7">
        <polygon points="0,-17.5 15.2,-8.8 15.2,8.8 0,17.5 -15.2,8.8 -15.2,-8.8" />
        <polyline points="-15.2,-8.8 0,0 15.2,-8.8" />
        <line x1="0" y1="0" x2="0" y2="17.5" />
        <polygon points="0,-9 7.8,-4.5 7.8,4.5 0,9 -7.8,4.5 -7.8,-4.5" strokeWidth="1.2" />
      </g>
      <g transform="translate(162, 18)" fill={fillColor} stroke="none" opacity="0.88">
        <path d="M0,-18.5 C2.2,-6.2 6.2,-2.2 18.5,0 C6.2,2.2 2.2,6.2 0,18.5 C-2.2,6.2 -6.2,2.2 -18.5,0 C-6.2,-2.2 -2.2,-6.2 0,-18.5 Z" />
      </g>
      <g transform="translate(18, 54)" strokeWidth="1.5">
        <circle cx="0" cy="0" r="16.8" />
        <ellipse cx="0" cy="0" rx="7.8" ry="16.8" />
        <line x1="-16.8" y1="0" x2="16.8" y2="0" />
        <path d="M-14,-8.4 Q0,-5 14,-8.4" />
        <path d="M-14,8.4 Q0,5 14,8.4" />
      </g>
      <g transform="translate(54, 54)" strokeWidth="1.5">
        <ellipse cx="0" cy="0" rx="17.5" ry="6.8" transform="rotate(30)" />
        <ellipse cx="0" cy="0" rx="17.5" ry="6.8" transform="rotate(-30)" />
        <ellipse cx="0" cy="0" rx="17.5" ry="6.8" transform="rotate(90)" />
        <circle cx="0" cy="0" r="2.8" fill={fillColor} stroke="none" />
      </g>
      <g transform="translate(90, 54)" fill={fillColor} stroke="none" opacity="0.85">
        <rect x="-14.5" y="-12.5" width="29" height="3.2" rx="1.6" />
        <rect x="-17" y="-6.6" width="34" height="3.5" rx="1.75" />
        <rect x="-17.5" y="-0.6" width="35" height="3.5" rx="1.75" />
        <rect x="-16" y="5.4" width="32" height="3.2" rx="1.6" />
        <rect x="-11.5" y="11.4" width="23" height="3" rx="1.5" />
      </g>
      <g transform="translate(126, 54)" strokeWidth="1.3">
        <polygon points="0,-17.5 15.2,-8.8 15.2,8.8 0,17.5 -15.2,8.8 -15.2,-8.8" />
        <polygon points="0,-10.8 9.4,-5.4 9.4,5.4 0,10.8 -9.4,5.4 -9.4,-5.4" />
        <line x1="0" y1="-17.5" x2="0" y2="17.5" />
        <line x1="-15.2" y1="-8.8" x2="15.2" y2="8.8" />
        <line x1="15.2" y1="-8.8" x2="-15.2" y2="8.8" />
      </g>
      <g transform="translate(162, 54)" strokeWidth="2">
        {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((d) => {
          const r = (d * Math.PI) / 180;
          return (
            <line
              key={`s${d}`}
              x1={Math.cos(r) * 5.2}
              y1={Math.sin(r) * 5.2}
              x2={Math.cos(r) * 17.2}
              y2={Math.sin(r) * 17.2}
            />
          );
        })}
      </g>
      <g transform="translate(18, 90)" strokeWidth="2.8">
        <path d="M-15,0 C-15,-9 -4.5,-9 0,0 C4.5,9 15,9 15,0 C15,-9 4.5,-9 0,0 C-4.5,9 -15,9 -15,0 Z" />
      </g>
      <g transform="translate(54, 90)" strokeWidth="1.5">
        {[0, 60, 120, 180, 240, 300].map((d) => (
          <ellipse key={`f${d}`} cx="0" cy="-9.2" rx="4.4" ry="8.8" transform={`rotate(${d})`} />
        ))}
      </g>
      <g transform="translate(90, 90)" strokeWidth="1.4">
        <polygon points="0,-6.2 5.4,-3.1 5.4,3.1 0,6.2 -5.4,3.1 -5.4,-3.1" />
        <polygon points="0,-16.8 5.4,-13.7 5.4,-7.5 0,-4.4 -5.4,-7.5 -5.4,-13.7" />
        <polygon points="9.2,-11.5 14.6,-8.4 14.6,-2.2 9.2,0.9 3.8,-2.2 3.8,-8.4" />
        <polygon points="-9.2,-11.5 -3.8,-8.4 -3.8,-2.2 -9.2,0.9 -14.6,-2.2 -14.6,-8.4" />
        <polygon points="0,4.4 5.4,7.5 5.4,13.7 0,16.8 -5.4,13.7 -5.4,7.5" />
      </g>
      <g transform="translate(126, 90)" strokeWidth="1.8">
        <circle cx="0" cy="0" r="16.8" />
        <circle cx="0" cy="0" r="11.5" />
        <circle cx="0" cy="0" r="6.2" />
        <circle cx="0" cy="0" r="2.2" fill={fillColor} stroke="none" />
      </g>
      <g transform="translate(162, 90)" strokeWidth="1.8">
        <circle cx="-8" cy="0" r="8" />
        <circle cx="0" cy="0" r="8" />
        <circle cx="8" cy="0" r="8" />
      </g>
      <g transform="translate(18, 126)" fill={fillColor} stroke="none" opacity="0.85">
        {[-10.5, 0, 10.5].map((dx) =>
          [-10.5, 0, 10.5].map((dy) => (
            <path
              key={`d${dx}${dy}`}
              d={`M${dx},${dy - 4.5} L${dx + 4.5},${dy} L${dx},${dy + 4.5} L${dx - 4.5},${dy} Z`}
            />
          )),
        )}
      </g>
      <g transform="translate(54, 126)" strokeWidth="1.3">
        <rect x="-15.8" y="-15.8" width="31.6" height="31.6" />
        <rect x="-12" y="-12" width="24" height="24" transform="rotate(14)" />
        <rect x="-8.4" y="-8.4" width="16.8" height="16.8" transform="rotate(28)" />
        <rect x="-4.8" y="-4.8" width="9.6" height="9.6" transform="rotate(42)" />
      </g>
      <g transform="translate(90, 126)" strokeWidth="1.8">
        <polygon points="0,-14 16,-7.5 0,-1 -16,-7.5" />
        <polyline points="-16,0 0,6.5 16,0" />
        <polyline points="-16,7.5 0,14 16,7.5" />
      </g>
      <g transform="translate(126, 126)" fill={fillColor} stroke="none" opacity="0.82">
        {[0, 60, 120, 180, 240, 300].map((d) => (
          <polygon key={`m${d}`} points="0,-2 -4.8,-17 4.8,-17" transform={`rotate(${d})`} />
        ))}
      </g>
      <g transform="translate(162, 126)" fill={fillColor} stroke="none" opacity="0.85">
        <rect x="-5.2" y="-16" width="10.4" height="10.4" rx="1.6" />
        <rect x="-5.2" y="5.6" width="10.4" height="10.4" rx="1.6" />
        <rect x="-16" y="-5.2" width="10.4" height="10.4" rx="1.6" />
        <rect x="5.6" y="-5.2" width="10.4" height="10.4" rx="1.6" />
      </g>
      <g transform="translate(18, 162)" strokeWidth="2.2">
        <polygon points="0,-16.5 15.8,13 -15.8,13" />
        <polygon points="0,-6 6.2,6.2 -6.2,6.2" />
      </g>
      <g transform="translate(54, 162)" fill={fillColor} stroke="none" opacity="0.88">
        <path d="M-15,3.5 A15,10.5 0 0,0 15,3.5 A11.8,7.8 0 0,1 -15,3.5 Z" />
        <path d="M0,-15 C1.2,-9.5 3.2,-7.2 8.5,-6 C3.2,-4.8 1.2,-2.5 0,2.5 C-1.2,-2.5 -3.2,-4.8 -8.5,-6 C-3.2,-7.2 -1.2,-9.5 0,-15 Z" />
      </g>
      <g transform="translate(90, 162)" strokeWidth="2.2">
        <path d="M-15,15 L-15,2 Q-15,-15 2,-15 L15,-15" />
        <path d="M-7.5,15 L-7.5,4 Q-7.5,-7.5 4,-7.5 L15,-7.5" />
        <path d="M0,15 L0,6.5 Q0,0 6.5,0 L15,0" />
      </g>
      <g transform="translate(126, 162)" strokeWidth="1.5">
        <ellipse cx="0" cy="0" rx="17.5" ry="6.8" transform="rotate(-24)" />
        <ellipse cx="0" cy="0" rx="11.5" ry="15.8" transform="rotate(18)" />
      </g>
      <g transform="translate(162, 162)" strokeWidth="1.8">
        <polygon points="0,-16.8 16.8,0 0,16.8 -16.8,0" />
        <polygon points="0,-9.5 9.5,0 0,9.5 -9.5,0" />
        <line x1="0" y1="-16.8" x2="0" y2="16.8" />
        <line x1="-16.8" y1="0" x2="16.8" y2="0" />
      </g>
    </g>
  );

  return (
    <div
      ref={containerRef}
      className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}
    >
        {/* Pattern layers with the 4-side edge fade */}
        <div
          aria-hidden="true"
          className="absolute inset-0 select-none"
          style={{ maskImage: horizontalMask, WebkitMaskImage: horizontalMask }}
        >
          <div
            className="h-full w-full"
            style={{ maskImage: verticalMask, WebkitMaskImage: verticalMask }}
          >
            <svg className="dshapes-base h-full w-full" style={{ opacity: normalizedOpacity }}>
              <defs>
                <pattern id={basePatternId} width="180" height="180" patternUnits="userSpaceOnUse">
                  {glyphs("currentColor", "currentColor")}
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill={`url(#${basePatternId})`} />
            </svg>

            <svg
              className="absolute inset-0 h-full w-full transition-opacity duration-500 ease-out"
              style={{
                /* Weighted up from 0.52: at the lower value the tint sat so far
                   under the ink layer that the saturated palette read as grey. */
                opacity: Math.min(0.95, normalizedOpacity * 0.82),
                maskImage:
                  "radial-gradient(ellipse 85% 55% at 50% 78%, rgba(0,0,0,0.88) 0%, transparent 100%)",
                WebkitMaskImage:
                  "radial-gradient(ellipse 85% 55% at 50% 78%, rgba(0,0,0,0.88) 0%, transparent 100%)",
              }}
            >
              <defs>
                <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor={preset.accentHex} />
                  <stop offset="50%" stopColor={preset.secondaryHex} />
                  <stop offset="100%" stopColor={preset.accentHex} />
                </linearGradient>
                <pattern id={glowPatternId} width="180" height="180" patternUnits="userSpaceOnUse">
                  {glyphs(`url(#${gradId})`, `url(#${gradId})`)}
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill={`url(#${glowPatternId})`} />
            </svg>

            <svg
              ref={spotSvgRef}
              className="absolute inset-0 h-full w-full transition-opacity duration-500 ease-out"
              style={{
                opacity: hovering ? Math.min(0.95, normalizedOpacity + 0.42) : 0,
                maskImage: "radial-gradient(230px circle at 160px 240px, rgba(0,0,0,0) 0%, transparent 100%)",
                WebkitMaskImage:
                  "radial-gradient(230px circle at 160px 240px, rgba(0,0,0,0) 0%, transparent 100%)",
              }}
            >
              <defs>
                <linearGradient id={spotGradId} x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor={preset.accentHex} />
                  <stop offset="50%" stopColor={preset.secondaryHex} />
                  <stop offset="100%" stopColor={preset.accentHex} />
                </linearGradient>
                <pattern id={spotPatternId} width="180" height="180" patternUnits="userSpaceOnUse">
                  {glyphs(`url(#${spotGradId})`, `url(#${spotGradId})`)}
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill={`url(#${spotPatternId})`} />
            </svg>

            {/* Bottom glow. Anchored at 50% 75% with a soft circle falloff: the
                tint rises out of the lower edge without reaching the sides. */}
            <div
              className="absolute inset-x-0 bottom-0 h-56 opacity-50 transition-all duration-300 dark:opacity-75"
              style={{
                background: `radial-gradient(circle at 50% 75%, ${preset.glowRgba} 0%, transparent 70%)`,
              }}
            />
          </div>
        </div>
      </div>
  );
};

export default DShapesPatternBackground;
