import * as React from "react";
import { motion, type HTMLMotionProps, type Variants } from "framer-motion";
import { cn } from "@/lib/utils";

// JSDoc for props documentation
export interface BrandingCardProps
  extends Omit<HTMLMotionProps<"div">, "children"> {
  /** The main category label displayed at the top. */
  category: string;
  /** The primary title for the branding element. */
  title: string;
  /** The subtitle or specific name (e.g., font name). */
  subtitle: string;
  /** The visual element to display, typically text or an icon. */
  displayElement: React.ReactNode;
  /** An array of color strings (e.g., hex, rgb) for the palette. */
  colors: string[];
}

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: "easeOut",
      when: "beforeChildren",
      staggerChildren: 0.1,
    },
  },
};

/** Normalise any hex input to `#RRGGBB` (uppercase). */
function toHex(color: string) {
  const value = color.trim();
  return (value.startsWith("#") ? value : `#${value}`).toUpperCase();
}

/** Pick black or white text depending on the swatch luminance. */
function contrastText(hex: string) {
  const raw = hex.replace("#", "");
  const full =
    raw.length === 3
      ? raw
          .split("")
          .map((char) => char + char)
          .join("")
      : raw.padEnd(6, "0").slice(0, 6);
  const channel = (start: number) => {
    const value = parseInt(full.slice(start, start + 2), 16) / 255;
    return value <= 0.03928
      ? value / 12.92
      : Math.pow((value + 0.055) / 1.055, 2.4);
  };
  const luminance =
    0.2126 * channel(0) + 0.7152 * channel(2) + 0.0722 * channel(4);
  return luminance > 0.5 ? "#111111" : "#FFFFFF";
}

/** Clipboard write with a legacy fallback for non-secure contexts. */
async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const field = document.createElement("textarea");
      field.value = text;
      field.style.position = "fixed";
      field.style.opacity = "0";
      document.body.appendChild(field);
      field.select();
      const copied = document.execCommand("copy");
      document.body.removeChild(field);
      return copied;
    } catch {
      return false;
    }
  }
}

const BrandingCard = React.forwardRef<HTMLDivElement, BrandingCardProps>(
  (
    { className, category, title, subtitle, displayElement, colors, ...props },
    ref,
  ) => {
    const [copied, setCopied] = React.useState<string | null>(null);
    const timer = React.useRef<number | undefined>(undefined);

    React.useEffect(() => {
      return () => {
        if (timer.current !== undefined) window.clearTimeout(timer.current);
      };
    }, []);

    const handleCopy = (color: string) => {
      void copyToClipboard(color).then((ok) => {
        if (!ok) return;
        setCopied(color);
        if (timer.current !== undefined) window.clearTimeout(timer.current);
        timer.current = window.setTimeout(() => setCopied(null), 1200);
      });
    };

    return (
      <motion.div
        ref={ref}
        className={cn(
          "w-full max-w-sm overflow-hidden rounded-xl bg-card text-card-foreground shadow-sm transition-shadow duration-300 hover:shadow-lg",
          className,
        )}
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        whileHover={{ y: -5, transition: { duration: 0.2 } }}
        aria-label={`${category}: ${title}`}
        role="group"
        {...props}
      >
        {/* Main content area */}
        <div className="p-6">
          <p className="mb-4 text-xs font-medium uppercase tracking-widest text-muted-foreground">
            {category}
          </p>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-semibold tracking-tight">{title}</h3>
              <p className="text-lg text-muted-foreground">{subtitle}</p>
            </div>
            <div className="text-5xl font-bold tracking-tighter">
              {displayElement}
            </div>
          </div>
        </div>

        {/* Color palette section */}
        <div className="flex h-24 w-full">
          {colors.map((color, index) => {
            const hex = toHex(color);
            const text = contrastText(hex);
            const isCopied = copied === hex;

            return (
              <motion.div
                key={`${hex}-${index}`}
                role="button"
                tabIndex={0}
                title={`Copy ${hex}`}
                aria-label={isCopied ? `${hex} copied` : `Copy color ${hex}`}
                onClick={() => handleCopy(hex)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    handleCopy(hex);
                  }
                }}
                className="group flex h-full min-w-0 flex-1 cursor-pointer select-none items-center justify-center overflow-hidden text-xs font-semibold tracking-wider outline-none transition-[flex-grow] duration-300 ease-out hover:[flex-grow:2] focus-visible:[flex-grow:2] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/70"
                style={{ backgroundColor: hex, color: text }}
              >
                <span className="pointer-events-none whitespace-nowrap opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100">
                  {isCopied ? "Copied" : hex}
                </span>
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    );
  },
);

BrandingCard.displayName = "BrandingCard";

export { BrandingCard };
