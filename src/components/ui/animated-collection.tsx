import { useState } from "react";
import {
  AnimatePresence,
  LayoutGroup,
  motion,
  type Transition,
} from "framer-motion";
import {
  ArrowDown,
  Layers,
  LayoutGrid,
  List,
  Star,
  type LucideIcon,
} from "lucide-react";

import {
  HeroCarousel,
  type HeroCarouselItem,
} from "@/components/ui/hero-carousel";

import { cn } from "@/lib/utils";

/* ---------------------------------------------------------------------------
   LayoutSwitcher

   A collection browser with three arrangements, animated by shared-layout
   transitions so each item morphs between them instead of cross-fading:

     list  - a table: 4:3 thumbnail, name + description, updated/created on the
             right, hairline rows under a "Name / Updated" header
     card  - 4:3 covers filling the column, three per row, title and star badge
             underneath
     pack  - a full-bleed editorial filmstrip: one portrait in focus, its
             neighbours clipped to half height, the backdrop graded to that
             slide's accent

   Deliberately self-contained: it owns its shape, its animation, and its own
   demo data, and knows nothing about tabs, the sidebar, or how the app is
   served. `items` is the only seam the host needs.
   --------------------------------------------------------------------------- */

export interface CollectionItem {
  id: string;
  title: string;
  /** Category, shown under the title in card view. */
  subtitle: string;
  /** One-line summary, shown under the title in list view. */
  description: string;
  idNumber: string;
  image: string;
  updated: string;
  created: string;
  /** Hue the pack backdrop falls back to when the photo cannot be read. */
  accent?: string;
}

// Change Here
const ITEMS: CollectionItem[] = [
  {
    id: "1",
    title: "Cinematic Horizons",
    subtitle: "Photography",
    description:
      "A cinematic photo series built on long horizons, muted skies and generous negative space.",
    idNumber: "209",
    updated: "2 days ago",
    created: "Created 4 days ago",
    image:
      "https://cdn.21st.dev/assets/mirror/e7/e72c2fb7f948925301937887e4958f47525001b80b6b5872fa08666943269ee2.jpg",
  },
  {
    id: "2",
    title: "Abstract Dreams",
    subtitle: "Digital Art",
    description:
      "Generative abstract artwork exploring soft colour fields, film grain and organic motion.",
    idNumber: "808",
    updated: "3 days ago",
    created: "Created 3 days ago",
    image:
      "https://cdn.21st.dev/assets/mirror/36/36d057e8bb599af751d8a473e3b71cb199a74aa4faa1d95974691e1594a79f85.jpg",
  },
];

/* Two-line editorial headline: "Cinematic Horizons" becomes
   "Cinematic / Horizons". Single-word names stay on one line. */
function headline(title: string) {
  const words = title.trim().split(/\s+/);
  if (words.length < 2) return title;
  const split = Math.ceil(words.length / 2);
  return `${words.slice(0, split).join(" ")}\n${words.slice(split).join(" ")}`;
}

type ViewMode = "list" | "card" | "pack";

const snappySpring: Transition = {
  type: "spring",
  stiffness: 300,
  damping: 34,
  mass: 1,
};

/* One radius for the list and card covers.

   Declared once because both views used to repeat the value - and any one of
   them drifting makes the same photo look like a different object as it morphs
   between layouts. The pack stage carries its own rounding on the carousel. */
const COVER_RADIUS = "rounded-2xl";

export function LayoutSwitcher({
  items = ITEMS,
  title = "My Collection",
}: {
  items?: CollectionItem[];
  title?: string;
}) {
  const [view, setView] = useState<ViewMode>("list");

  /* The pack view is a different medium, not another arrangement of the same
     row: a carousel with its own geometry. It still reads from the collection,
     so list, card and pack always show the same set.

     Each slide's backdrop is the photograph's own colour - the carousel samples
     the image and keeps its lightness. `accent` is only a fallback for art that
     cannot be read (a cross-origin image served without CORS headers). */
  const slides: HeroCarouselItem[] = items.map((item) => ({
    id: item.id,
    title: headline(item.title),
    image: item.image,
    credit: item.subtitle.toUpperCase(),
    meta: [item.updated, `#${item.idNumber}`],
    accent: item.accent,
  }));

  return (
    <div className="w-full max-w-4xl p-4 font-sans selection:bg-primary/10 md:p-8">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-5">
          <h2 className="text-xl font-medium text-foreground">{title}</h2>

          <div className="flex w-fit rounded-full border border-border bg-muted p-1">
            <Tab
              active={view === "list"}
              onClick={() => setView("list")}
              icon={List}
              label="List view"
            />
            <Tab
              active={view === "card"}
              onClick={() => setView("card")}
              icon={LayoutGrid}
              label="Card view"
            />
            <Tab
              active={view === "pack"}
              onClick={() => setView("pack")}
              icon={Layers}
              label="Pack view"
            />
          </div>
        </div>
        <div className="h-px w-full bg-border" />

        {/* Content Section */}
        <div className="relative flex min-h-[350px] w-full flex-col items-center">
          {/* Pack is a different medium, not a fourth arrangement of the rows,
              so it swaps wholesale. The stage needs a real height: the carousel
              measures its own box, and inside a flex column `h-full` resolves
              against an auto-height parent, which collapsed every card to a
              sliver. The fixed ratio gives it one. */}
          <div className="relative aspect-[4/3] w-full sm:aspect-[16/10]">
            <AnimatePresence mode="wait" initial={false}>
              {view !== "pack" && (
                <motion.div
                  /* Stable across list and card: the rows and covers keep their
                     identity, which is what lets Framer Motion morph them. Only
                     pack swaps the whole subtree out (it has its own key). */
                  key="collection"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.16, ease: "easeOut" }}
                  className="w-full"
                >
                  <LayoutGroup>
                    {/* Column header. List only - a grid of cards has no rows
                        to label. The 64px spacer plus the 16px gap puts "Name"
                        exactly above the title of every row. */}
                    <AnimatePresence initial={false}>
                      {view === "list" && (
                        <motion.div
                          key="list-header"
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 40, opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.18, ease: "easeOut" }}
                          className="w-full overflow-hidden"
                        >
                          <div className="flex h-10 items-center gap-4 border-b border-border text-xs font-medium text-muted-foreground">
                            {/* "Name" starts at the table's left edge, not
                                above the titles: the first column is the
                                thumbnail plus its label, and a header indented
                                by a 60px thumbnail reads as if the table
                                started halfway across. */}
                            <span className="min-w-0 flex-1">Name</span>
                            <span className="hidden w-36 shrink-0 items-center justify-end gap-1 sm:flex">
                              Updated
                              <ArrowDown size={12} aria-hidden="true" />
                            </span>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                  <motion.div
                    layout
                    transition={snappySpring}
                    className={cn(
                      "relative w-full",
                      view === "list" && "flex flex-col",
                      view === "card" &&
                        "grid w-full grid-cols-1 gap-4 sm:grid-cols-3",
                    )}
                  >
                    {items.map((item) => (
                      <motion.div
                        key={item.id}
                        layout
                        transition={snappySpring}
                        className={cn(
                          "relative z-10",
                          view === "list" &&
                            "flex w-full items-center gap-4 border-b border-border/60 py-3",
                          view === "card" &&
                            "flex w-full flex-col items-start gap-3",
                        )}
                      >
                        <motion.div
                          layout
                          transition={snappySpring}
                          className={cn(
                            "relative z-10 aspect-[4/3] shrink-0 overflow-hidden border border-border/50 bg-background",
                            COVER_RADIUS,
                            view === "list" && "w-20",
                            view === "card" && "w-full shadow-sm",
                          )}
                        >
                          <motion.img
                            src={item.image}
                            alt={item.title}
                            className={cn(
                              "m-0! block h-full w-full object-cover p-0!",
                              COVER_RADIUS,
                            )}
                          />
                        </motion.div>

                        <AnimatePresence mode="popLayout" initial={false}>
                          {/* Two separate jobs.

                              Size: `layout="position"`, not `layout`. The
                              wrapper animates its own size, framer expresses
                              that as a scale, and anything inside a scaling node
                              is stretched with it - that was the text pulling
                              wide mid-morph. Position-only layout lets the
                              glyphs keep their true width.

                              Travel: the key includes the view, so a switch
                              swaps the panel instead of sliding it. In list the
                              text sits beside the thumbnail, in card under the
                              cover; animating that move dragged the label
                              diagonally across the photo, which read as the text
                              and the card colliding. Now the old panel fades out
                              where it was and the new one fades in where it
                              belongs, a beat after the photo starts moving. */}
                          <motion.div
                            key={`${item.id}-${view}`}
                            layout="position"
                            initial={{ opacity: 0 }}
                            animate={{
                              opacity: 1,
                              transition: {
                                /* The list row wants the caption beside the
                                   thumbnail - exactly where a shrinking card
                                   cover still sits for the first quarter
                                   second. Waiting lets the cover clear that
                                   column so the label never lands on top of
                                   the photo; the cover also paints above the
                                   label (z-10) for the few frames where the two
                                   still touch. */
                                duration: 0.15,
                                ease: "easeOut",
                                delay: 0.2,
                              },
                            }}
                            exit={{
                              opacity: 0,
                              transition: { duration: 0.1, ease: "easeOut" },
                            }}
                            className={cn(
                              "flex min-w-0 flex-1 items-center justify-between gap-6",
                              view === "card" && "w-full px-1",
                            )}
                          >
                            <div className="flex min-w-0 flex-col gap-0.5">
                              <h3 className="truncate text-[15px] font-medium leading-tight text-foreground">
                                {item.title}
                              </h3>

                              {view === "list" ? (
                                <p className="truncate text-[13px] leading-snug text-muted-foreground">
                                  {item.description}
                                </p>
                              ) : (
                                /* No leading icon: a 12px glyph plus its 6px
                                   gap pushed the category 18px right of the
                                   title above it, so the two lines never shared
                                   a left edge. */
                                <p className="truncate text-xs font-medium leading-snug text-muted-foreground">
                                  {item.subtitle}
                                </p>
                              )}
                            </div>

                            {view === "list" ? (
                              /* Fixed width so the timestamps line up under
                                 the "Updated" header instead of drifting row to
                                 row. */
                              <div className="hidden w-36 shrink-0 flex-col items-end gap-0.5 text-right sm:flex">
                                <span className="text-[13px] font-medium text-foreground/90">
                                  {item.updated}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {item.created}
                                </span>
                              </div>
                            ) : (
                              <div className="ml-2 flex shrink-0 items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-[10px] font-bold text-primary-ink">
                                <Star
                                  size={10}
                                  className="fill-yellow-500 text-yellow-500"
                                  aria-hidden="true"
                                />
                                <span>#{item.idNumber}</span>
                              </div>
                            )}
                          </motion.div>
                        </AnimatePresence>
                      </motion.div>
                    ))}
                  </motion.div>
                  </LayoutGroup>
                </motion.div>
              )}

              {view === "pack" && (
                <motion.div
                  key="pack"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.16, ease: "easeOut" }}
                  className="absolute inset-0"
                >
                  <HeroCarousel items={slides} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}

function Tab({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: LucideIcon;
  label: string;
}) {
  return (
    /* Colours live on the inner span, not on the button.

       index.css ships an unlayered `button { color: inherit }`, and an unlayered
       declaration outranks every `@layer utilities` class - which is where
       Tailwind puts `text-primary-foreground`. On the button the class silently
       lost, so the pill kept the page ink and the active label came out
       near-white on lime in dark mode. A span is not a button, so the utility
       applies there and the icon inherits it through currentColor. */
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className="group relative flex items-center gap-2 rounded-full px-4 py-2 outline-none"
    >
      {active && (
        <motion.div
          layoutId="active-tab"
          className="absolute inset-0 rounded-full bg-primary shadow-md"
          transition={snappySpring}
        />
      )}
      <span
        className={cn(
          "relative z-10 flex items-center gap-2 text-sm font-normal uppercase transition-colors",
          active
            ? "text-primary-foreground"
            : "text-muted-foreground group-hover:text-foreground",
        )}
      >
        <Icon
          size={16}
          aria-hidden="true"
          className={cn(
            "transition-transform duration-300",
            active && "scale-110",
          )}
        />
        {label}
      </span>
    </button>
  );
}

export default LayoutSwitcher;
