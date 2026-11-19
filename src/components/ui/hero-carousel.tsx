// A full-bleed editorial hero driven by a filmstrip.
//
// Every card shares one top edge. The focused card unfurls to full height while
// its neighbours stay clipped to half, so the strip reads as a row of cropped
// heads with one complete portrait standing in the middle of it. Changing the
// focus re-grades the whole background to that image.
//
// Geometry is measured, never hard-coded: one ResizeObserver reads the stage and
// every size below is a ratio of it, so the same component is pixel-identical in
// a 600px preview box and on a 4K display.
import * as React from "react"
import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
} from "framer-motion"

import { cn } from "@/lib/utils"

export interface HeroCarouselItem {
  /** Stable key; falls back to the index. @default undefined */
  id?: string | number
  /** Headline for the active slide. Newlines become separate reveal lines. */
  title: string
  /** Image URL, used both in the card and as the graded background. */
  image: string
  /** Byline printed beside the headline, e.g. "BY AURELIA STUDIO." @default undefined */
  credit?: string
  /** Right-aligned facts, e.g. ["SAT NOV 15", "5-10 PM", "MIAMI"]. @default undefined */
  meta?: string[]
  /**
   * CSS colour the background is graded to. The photo keeps its luminance and
   * takes this hue, which is what makes the backdrop swing on every change.
   * @default "#8a8a8a"
   */
  accent?: string
}

export interface HeroCarouselProps {
  /** Slides, in strip order. */
  items: HeroCarouselItem[]
  /** Focused slide when controlled. Leave unset for internal state. @default undefined */
  index?: number
  /** Focused slide on mount when uncontrolled. @default 0 */
  defaultIndex?: number
  /** Fires on every focus change, from any input. @default undefined */
  onIndexChange?: (index: number) => void
  /** Wordmark in the middle of the top bar. @default undefined */
  brand?: React.ReactNode
  /** Renders the "Back" control when provided. @default undefined */
  onBack?: () => void
  /** Renders the "Menu" control when provided. @default undefined */
  onMenu?: () => void
  /** Advance on a timer. Pauses on hover, drag and focus. @default false */
  autoplay?: boolean
  /** Milliseconds between autoplay steps. @default 4000 */
  autoplayDelay?: number
  /** Extra classes for the stage. @default undefined */
  className?: string
}

/* Ratios lifted from the reference layout, all relative to the stage box. */
const CARD_H = 0.264 // active card height ÷ stage height
const CARD_AR = 0.75 // active card is 3:4
const GAP = 0.038 // gap ÷ card width
const STRIP_TOP = 0.5 // strip's shared top edge, down the stage
const TITLE = 0.067 // headline cap size ÷ stage height
const LABEL = 0.0103 // small mono label ÷ stage height
const PAD = 0.017 // page gutter ÷ stage width
const RAIL = 0.2 // progress rail width ÷ stage width

/** Wheel distance that commits to a step, and the lockout after one. */
const WHEEL_THRESHOLD = 60
const WHEEL_COOLDOWN = 420

/* Film grain, as a self-contained SVG so the component carries no assets. */
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.82' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")"

const clamp = (n: number, min: number, max: number) =>
  Math.min(max, Math.max(min, n))

/* ── Backdrop colour ─────────────────────────────────────────────────────────

   The stage is a flat field, so the colour has to come from the photograph
   itself: the lake shot gets its own cyan wall, the abstract its deep blue.

   The sample is deliberately NOT the average. Averaging a photo drags every
   particle of colour to the same muddy grey - a sunset and a glacier both come
   out taupe - so instead the pixels are bucketed by hue and the bucket with
   the most chroma on screen wins. That is the colour the eye reads the picture
   as, and its own lightness is kept, so a night shot still yields a dark wall.

   Cost is one 32×32 decode per image, cached per URL. */

const SWATCH = 32
/* `null` is a real value here: "asked, and the pixels could not be read", so
   the declared accent is used instead of asking again on every render. */
const swatchCache = new Map<string, string | null>()
const swatchPending = new Map<string, Promise<string | null>>()

interface Sample {
  h: number
  s: number
  l: number
  w: number
}

const rgbToHsl = (r: number, g: number, b: number): Sample => {
  const [rn, gn, bn] = [r / 255, g / 255, b / 255]
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const l = (max + min) / 2
  const d = max - min
  if (d === 0) return { h: 0, s: 0, l, w: 0 }
  const s = d / (1 - Math.abs(2 * l - 1))
  const h =
    max === rn
      ? ((gn - bn) / d + (gn < bn ? 6 : 0)) * 60
      : max === gn
        ? ((bn - rn) / d + 2) * 60
        : ((rn - gn) / d + 4) * 60
  return { h, s, l, w: 0 }
}

/* Hue buckets. Twelve is coarse enough that one texture lands in one bucket
   and fine enough that a red sky and a blue sea stay apart. */
const BUCKETS = 12

function dominant(data: Uint8ClampedArray): Sample | null {
  const black = { h: 0, s: 0, l: 0, w: 0 }
  const bins: Sample[] = Array.from({ length: BUCKETS }, () => ({
    h: 0,
    s: 0,
    l: 0,
    w: 0,
  }))
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3]! < 250) continue
    const px = rgbToHsl(data[i]!, data[i + 1]!, data[i + 2]!)
    // Near-greys carry no hue to offer; they would only wash the winner out.
    // They keep their own tally so a black-and-white photo still gets a
    // properly dark wall rather than nothing at all.
    if (px.s < 0.18) {
      // Chroma-weightless, but still area on screen - so one unit each.
      black.w += 1
      black.l += px.l
      continue
    }
    const bin = bins[Math.min(BUCKETS - 1, Math.floor(px.h / (360 / BUCKETS)))]!
    // Weight by chroma: a saturated pixel says more about the colour of the
    // picture than a barely tinted one.
    const w = px.s * px.s
    bin.w += w
    bin.h += px.h * w
    bin.s += px.s * w
    bin.l += px.l * w
  }

  let best: Sample | null = null
  for (const bin of bins) {
    if (bin.w <= 0) continue
    if (!best || bin.w > best.w) best = bin
  }
  if (!best) {
    if (!black.w) return null
    return { h: 0, s: 0, l: black.l / black.w, w: black.w }
  }
  const { w } = best
  const s = best.s / w
  const l = best.l / w
  return {
    h: best.h / w,
    s: s < 0.02 ? 0 : s,
    l,
    w: w,
  }
}

/* A colour cut from the photograph: the hue and chroma of its strongest
   cluster, held to a lightness band where white type still reads. */
const toCss = (px: Sample) => {
  const s = Math.min(0.72, Math.max(0.24, px.s * 1.25))
  const l = Math.min(0.62, Math.max(0.18, px.l * 0.9))
  return `hsl(${Math.round(px.h)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%)`
}

/* The pixels, or null. Two ways in, because no single one covers every CDN:

   1. `fetch` + `createImageBitmap` - one request, no shared cache entries, and
      it works whenever the host serves CORS headers.
   2. An <img crossorigin> - needed when the host sends no CORS header at all.
      That is the case where the photo still displays (plain `<img>` is not
      blocked) but a scripted read is not allowed; browsers sometimes hand it
      over anyway if the element it loaded from is already in the image cache,
      in which case this is the only route that works.

   Both end at the same 32×32 resample. A null simply means "no sample", and the
   declared accent stands. */
const loadPixels = (src: string) =>
  fetch(src, { credentials: "omit" })
    .then((response) => (response.ok ? response.blob() : Promise.reject()))
    .then((blob) => createImageBitmap(blob))
    .then((bitmap) => ({ image: bitmap as CanvasImageSource }))
    .catch(() => {
      const img = new Image()
      img.crossOrigin = "anonymous"
      img.src = src
      return img.decode().then(() => ({ image: img as CanvasImageSource }))
    })

const readPixels = async (src: string) => {
  const loaded = await loadPixels(src)
  const canvas = document.createElement("canvas")
  canvas.width = SWATCH
  canvas.height = SWATCH
  const ctx = canvas.getContext("2d", { willReadFrequently: true })
  if (!ctx) return null
  ctx.drawImage(loaded.image, 0, 0, SWATCH, SWATCH)
  if ("close" in loaded.image) loaded.image.close()
  return ctx.getImageData(0, 0, SWATCH, SWATCH).data
}

const readSwatch = async (src: string) => {
  try {
    const data = await readPixels(src)
    if (!data) return null
    const px = dominant(data)
    return px ? toCss(px) : null
  } catch {
    return null
  }
}

/* Read a photo's colour. One read per URL, cached module-wide so re-showing a
   slide - or reopening the view - never pays for it twice. */
const sample = (src: string) => {
  if (!src) return Promise.resolve(null)
  // Already read: hand it straight back, no repaint needed.
  if (swatchCache.has(src)) return Promise.resolve(swatchCache.get(src) ?? null)
  const pending = swatchPending.get(src)
  if (pending) return pending
  const job = readSwatch(src).then((value) => {
    swatchCache.set(src, value)
    swatchPending.delete(src)
    return value
  })
  swatchPending.set(src, job)
  return job
}

/** Declared accent for a slide, once the photo has been read. */
export function HeroCarousel({
  items,
  index: controlled,
  defaultIndex = 0,
  onIndexChange,
  brand,
  onBack,
  onMenu,
  autoplay = false,
  autoplayDelay = 4000,
  className,
}: HeroCarouselProps) {
  const stageRef = React.useRef<HTMLDivElement>(null)
  const [box, setBox] = React.useState({ w: 0, h: 0 })
  const [uncontrolled, setUncontrolled] = React.useState(defaultIndex)
  const [dragging, setDragging] = React.useState(false)
  const [paused, setPaused] = React.useState(false)
  const reduced = useReducedMotion()
  /* The focused photo's own colour, once it has been read. Held in state rather
     than pulled from a module cache so the render always matches the slide on
     screen.
     Every slide is read up front: the carousel mounts the moment the pack tab is
     pressed, so waiting for the focus to change would show the stand-in colour
     first and then swap it. A slide already in the module cache is seeded below,
     in render, so the first paint after a remount is already correct. */
  const [swatches, setSwatches] = React.useState<Record<string, string>>({})
  const seeded = React.useMemo(() => {
    const known: Record<string, string> = {}
    for (const item of items) {
      const value = item?.image ? swatchCache.get(item.image) : null
      if (item?.image && value) known[item.image] = value
    }
    return known
  }, [items])
  const slideKey = items.map((item) => item?.image).join("\n")
  React.useEffect(() => {
    let live = true
    for (const item of items) {
      if (!item?.image) continue
      void sample(item.image).then((value) => {
        if (!value || !live) return
        setSwatches((prev) =>
          prev[item.image] === value ? prev : { ...prev, [item.image]: value }
        )
      })
    }
    return () => {
      live = false
    }
    // Keyed on the URLs: `items` is rebuilt on every render by the host.
  }, [slideKey]) // eslint-disable-line react-hooks/exhaustive-deps

  const last = items.length - 1
  const index = clamp(controlled ?? uncontrolled, 0, Math.max(0, last))

  const go = React.useCallback(
    (next: number) => {
      const clamped = clamp(next, 0, Math.max(0, last))
      if (controlled === undefined) setUncontrolled(clamped)
      if (clamped !== index) onIndexChange?.(clamped)
    },
    [controlled, index, last, onIndexChange]
  )

  // One observer feeds every measurement below.
  React.useEffect(() => {
    const stage = stageRef.current
    if (!stage) return
    const read = () =>
      setBox({ w: stage.clientWidth, h: stage.clientHeight })
    read()
    const ro = new ResizeObserver(read)
    ro.observe(stage)
    return () => ro.disconnect()
  }, [])

  const fullH = clamp(box.h * CARD_H, 96, 360)
  const halfH = fullH / 2
  const cardW = fullH * CARD_AR
  const gap = Math.max(4, Math.round(cardW * GAP))
  const step = cardW + gap
  const pad = Math.max(16, Math.round(box.w * PAD))
  const label = Math.max(9, Math.round(box.h * LABEL))

  // Centre the focused card: the track slides, the card never moves itself.
  const xFor = React.useCallback(
    (i: number) => box.w / 2 - (i * step + cardW / 2),
    [box.w, step, cardW]
  )
  const x = useMotionValue(0)
  const target = xFor(index)

  const swing = reduced
    ? { duration: 0 }
    : { duration: 0.7, ease: "easeOut" as const }
  const spring = reduced
    ? { duration: 0 }
    : { type: "spring" as const, stiffness: 260, damping: 34, mass: 0.9 }

  // The track is driven by a motion value rather than an `animate` prop so a
  // drag that starts mid-spring reads the real position, not where the spring
  // was headed - otherwise the release snaps a card off.
  React.useEffect(() => {
    if (dragging) return
    const run = animate(x, target, spring)
    return () => run.stop()
    // `spring` is a literal, so `reduced` (all it derives from) stands in for it.
  }, [target, dragging, reduced, x]) // eslint-disable-line react-hooks/exhaustive-deps

  // Wheel and trackpad. Both axes step the strip.
  React.useEffect(() => {
    const stage = stageRef.current
    if (!stage) return
    let acc = 0
    let until = 0

    const onWheel = (e: WheelEvent) => {
      // Trackpads report the dominant axis; take whichever is stronger.
      const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY
      // Scroll chaining: once the strip is against an end, hand the gesture
      // back to the page. Without this a full-height carousel is a scroll trap
      // with no way past it.
      const stuck = (delta > 0 && index === last) || (delta < 0 && index === 0)
      if (stuck) {
        acc = 0
        return
      }
      e.preventDefault()
      const now = e.timeStamp
      if (now < until) return
      acc += delta
      if (Math.abs(acc) < WHEEL_THRESHOLD) return
      go(index + Math.sign(acc))
      acc = 0
      until = now + WHEEL_COOLDOWN
    }

    stage.addEventListener("wheel", onWheel, { passive: false })
    return () => stage.removeEventListener("wheel", onWheel)
  }, [go, index, last])

  React.useEffect(() => {
    if (!autoplay || paused || dragging || items.length < 2) return
    const id = window.setTimeout(
      () => go(index === last ? 0 : index + 1),
      autoplayDelay
    )
    return () => window.clearTimeout(id)
  }, [autoplay, autoplayDelay, dragging, go, index, items.length, last, paused])

  const active = items[index]
  if (!active) return null

  const lines = active.title.split("\n")
  const accent =
    swatches[active.image] ?? seeded[active.image] ?? active.accent ?? "#8a8a8a"

  /* Step count and nudge. A one-slide set still renders a rail and a counter,
     and taking it from `items.length - 1` would divide by zero below. */
  const steps = Math.max(1, items.length)

  return (
    <div
      ref={stageRef}
      tabIndex={0}
      role="group"
      aria-roledescription="carousel"
      aria-label="Featured looks"
      onKeyDown={(e) => {
        const keys: Record<string, number> = {
          ArrowLeft: index - 1,
          ArrowRight: index + 1,
          Home: 0,
          End: last,
        }
        if (!(e.key in keys)) return
        e.preventDefault()
        go(keys[e.key]!)
      }}
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className={cn(
        "relative h-full min-h-[24rem] w-full overflow-hidden bg-black text-white select-none",
        "outline-none focus-visible:ring-1 focus-visible:ring-white/30 focus-visible:ring-inset",
        className
      )}
    >
      {/* ── Background: a flat colour pulled from the focused photo ──
          Nothing but a fill, so the strip and the headline are the only
          pictures on screen. Keyed on the colour, not the slide: when two
          slides resolve to the same wall there is nothing to swap, and
          remounting would only blink. The wash and the grain below live outside
          this swap, which is why the exchange never flickers. */}
      <AnimatePresence initial={false}>
        <motion.div
          key={accent}
          className="absolute inset-0"
          style={{ backgroundColor: accent }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={swing}
        />
      </AnimatePresence>

      {/* Corner and edge shadows: a flat panel would otherwise read as a
          printed swatch. They also push the strip forward a little. */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_-10%,rgba(255,255,255,0.16),transparent_60%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(100%_100%_at_50%_50%,transparent_35%,rgba(0,0,0,0.35))]" />

      {/* Grain, above the swap so it never flickers. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.14] mix-blend-overlay"
        style={{ backgroundImage: GRAIN, backgroundSize: "180px 180px" }}
      />

      {/* ── Top bar: a centred cluster, not edge-to-edge ── */}
      <div
        className="absolute inset-x-0 flex items-center justify-center"
        style={{ top: Math.max(16, box.h * 0.029), gap: `${Math.max(20, box.w * 0.06)}px` }}
      >
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="opacity-90 transition-opacity hover:opacity-100"
            style={{ fontSize: label * 1.15 }}
          >
            <span aria-hidden>↖</span> Back
          </button>
        ) : null}
        {brand ? (
          <div
            className="font-semibold tracking-[0.06em]"
            style={{ fontSize: label * 1.35 }}
          >
            {brand}
          </div>
        ) : null}
        {onMenu ? (
          <button
            type="button"
            onClick={onMenu}
            className="opacity-90 transition-opacity hover:opacity-100"
            style={{ fontSize: label * 1.15 }}
          >
            Menu <span aria-hidden>☰</span>
          </button>
        ) : null}
      </div>

      {/* ── Headline block, sitting just above the strip's top edge ── */}
      <div
        className="absolute inset-x-0 top-0 flex flex-col justify-end"
        style={{
          height: `${STRIP_TOP * 100}%`,
          paddingLeft: pad,
          paddingRight: pad,
          paddingBottom: Math.round(box.h * 0.028),
        }}
      >
        <div className="flex w-full flex-wrap items-end gap-x-[6vw] gap-y-2">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.h2
              key={index}
              className="font-semibold leading-[0.88] tracking-[-0.03em]"
              style={{ fontSize: Math.max(24, Math.round(box.h * TITLE)) }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.18 } }}
            >
              {lines.map((line, i) => (
                // Each line wipes up from behind its own edge.
                <span key={i} className="block overflow-hidden">
                  <motion.span
                    className="block"
                    initial={{ y: "110%" }}
                    animate={{ y: 0 }}
                    transition={
                      reduced
                        ? { duration: 0 }
                        : { duration: 0.62, delay: i * 0.07, ease: [0.22, 1, 0.36, 1] }
                    }
                  >
                    {line}
                  </motion.span>
                </span>
              ))}
            </motion.h2>
          </AnimatePresence>

          {active.credit ? (
            <motion.p
              key={`credit-${index}`}
              className="font-mono uppercase tracking-[0.14em] opacity-80"
              style={{ fontSize: label }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.8 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              {active.credit}
            </motion.p>
          ) : null}

          {active.meta?.length ? (
            <div
              className="ml-auto flex items-end"
              style={{ gap: `${Math.max(16, box.w * 0.055)}px` }}
            >
              {active.meta.map((fact, i) => (
                <motion.span
                  key={`${index}-${fact}`}
                  className="font-mono whitespace-nowrap uppercase tracking-[0.14em] opacity-80"
                  style={{ fontSize: label }}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 0.8, y: 0 }}
                  transition={
                    reduced ? { duration: 0 } : { duration: 0.45, delay: 0.12 + i * 0.06 }
                  }
                >
                  {fact}
                </motion.span>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      {/* ── The strip: one shared top edge, the focused card twice as tall ── */}
      <div
        className="absolute inset-x-0"
        style={{ top: `${STRIP_TOP * 100}%`, height: fullH }}
      >
        <motion.div
          className="flex box-border items-start pt-3"
          style={{ gap, x, cursor: dragging ? "grabbing" : "grab" }}
          drag="x"
          dragMomentum={false}
          dragElastic={0.08}
          dragConstraints={{ left: xFor(last), right: xFor(0) }}
          onDragStart={() => setDragging(true)}
          onDragEnd={(_, info) => {
            setDragging(false)
            // Land on whatever card the release sits nearest, nudged by throw
            // velocity so a flick clears more than one card.
            const thrown = x.get() + info.velocity.x * 0.12
            go(Math.round((box.w / 2 - thrown - cardW / 2) / step))
          }}
        >
          {items.map((item, i) => (
            <motion.button
              key={item.id ?? i}
              type="button"
              aria-label={item.title.replace(/\n/g, " ")}
              aria-current={i === index}
              onClick={() => go(i)}
              className="relative shrink-0 overflow-hidden rounded-none bg-white/5"
              style={{ width: cardW }}
              animate={{ height: i === index ? fullH : halfH }}
              transition={spring}
            >
              {/* The focused card is exactly 3:4, so object-position does
                  nothing to it - it only picks which band of the portrait the
                  half-height neighbours keep. Anchored just above centre so a
                  clipped card still shows a face, not a forehead. */}
              <img
                src={item.image}
                alt=""
                draggable={false}
                className="absolute inset-0 h-full w-full object-cover"
                style={{ objectPosition: "50% 26%" }}
              />
              {/* Unfocused cards sit back a touch without going grey. */}
              <motion.span
                aria-hidden
                className="absolute inset-0 bg-black"
                animate={{ opacity: i === index ? 0 : 0.12 }}
                transition={spring}
              />
            </motion.button>
          ))}
        </motion.div>
      </div>

      {/* ── Position rail ── */}
      <div
        className="absolute"
        style={{ left: pad, bottom: Math.max(14, box.h * 0.022), width: box.w * RAIL }}
      >
        <div
          className="flex justify-between font-mono tabular-nums opacity-80"
          style={{ fontSize: label }}
        >
          <span>{String(index + 1).padStart(2, "0")}</span>
          <span>{String(items.length).padStart(2, "0")}</span>
        </div>
        <div className="relative mt-2 h-px w-full bg-white/25">
          <motion.div
            className="absolute inset-y-0 bg-white"
            style={{ width: `${100 / steps}%` }}
            animate={{ left: `${(index / steps) * 100}%` }}
            transition={spring}
          />
        </div>
      </div>
    </div>
  )
}
