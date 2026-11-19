"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { downloadSteps, exportTargets, type ExportTarget } from "@/lib/export-scaffold";
import { TreeNav, type TreeNavItem } from "@/components/ui/tree-nav";

type Language = "auto" | "jsx" | "tsx";

const languages: { id: Language; label: string }[] = [
  { id: "auto", label: "Auto" },
  { id: "jsx", label: "JSX" },
  { id: "tsx", label: "TSX" },
];

const steps: TreeNavItem[] = downloadSteps.map((step) => ({
  label: step.label,
  href: `#${step.id}`,
}));

/** The sidebar tabs animate with this spring, so the export tabs match it. */
const tabSpring = { type: "spring", bounce: 0.15, duration: 0.4 } as const;
const expand = { duration: 0.22, ease: "easeOut" } as const;

/**
 * Sliding background shared between the tabs of one row.
 *
 * The highlight deliberately flips polarity between themes so the selected tab
 * is always the *opposite* of the tab strip behind it:
 *   light → strip is `bg-accent` (#DCDCDC), pill is `bg-foreground` (near-black)
 *   dark  → strip is `bg-accent` (#1C1B1A), pill is `bg-foreground` (#EAEAE7)
 * `text-background` keeps the label readable on that inverted pill. Using
 * `bg-background` here (the old value) put the pill at #171717 in dark — darker
 * than the strip, so "selected" read as recessed instead of raised.
 */
function TabPill({ layoutId }: { layoutId: string }) {
  return (
    <motion.span
      aria-hidden="true"
      className="absolute inset-0 rounded-md bg-foreground shadow-sm"
      layoutId={layoutId}
      transition={tabSpring}
    />
  );
}

export interface PatternProps {
  /** Active export target. Leave undefined for internal state. */
  target?: ExportTarget;
  onTargetChange?: (target: ExportTarget) => void;
  /** Index of the download step in progress; null while idle. */
  step?: number | null;
  className?: string;
}

export function Pattern({
  target,
  onTargetChange,
  step = null,
  className,
}: PatternProps) {
  const [internalTarget, setInternalTarget] = useState<ExportTarget>("static");
  const [language, setLanguage] = useState<Language>("auto");

  const active = target ?? internalTarget;
  const showLanguages = active !== "static";
  const activeStep = step === null ? undefined : steps[step]?.href;

  const selectTarget = (next: ExportTarget) => {
    setInternalTarget(next);
    onTargetChange?.(next);
  };

  return (
    <div
      className={cn(
        "w-full overflow-hidden rounded-xl border bg-card p-1.5 text-card-foreground shadow-sm",
        className,
      )}
    >
      <div
        role="tablist"
        aria-label="Export format"
        className="grid grid-cols-3 gap-1 rounded-lg bg-accent p-1"
      >
        {exportTargets.map((option) => {
          const activeTab = active === option.id;
          return (
            <div
              key={option.id}
              role="tab"
              tabIndex={0}
              aria-selected={activeTab}
              onClick={() => selectTarget(option.id)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  selectTarget(option.id);
                }
              }}
              className={cn(
                "relative flex h-[38px] cursor-pointer items-center justify-center rounded-md text-[14px] font-medium transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/40",
                activeTab
                  ? "text-background"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {activeTab && <TabPill layoutId="export-target-pill" />}
              <span className="relative">{option.label}</span>
            </div>
          );
        })}
      </div>

      <AnimatePresence initial={false}>
        {showLanguages && (
          <motion.div
            key="languages"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={expand}
            className="mt-1.5 overflow-hidden"
          >
            <div
              role="tablist"
              aria-label="Language"
              className="grid grid-cols-3 gap-1 rounded-lg bg-accent/70 p-1"
            >
              {languages.map((option) => {
                const activeTab = language === option.id;
                return (
                  <div
                    key={option.id}
                    role="tab"
                    tabIndex={0}
                    aria-selected={activeTab}
                    onClick={() => setLanguage(option.id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setLanguage(option.id);
                      }
                    }}
                    className={cn(
                      "relative flex h-[32px] cursor-pointer items-center justify-center rounded-md text-[12px] font-medium transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/40",
                      activeTab
                        ? "text-background"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {activeTab && <TabPill layoutId="export-language-pill" />}
                    <span className="relative">{option.label}</span>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <TreeNav
        className="mt-3"
        items={steps}
        activeHref={activeStep}
        onSelect={(_, event) => event.preventDefault()}
      />
    </div>
  );
}

export default Pattern;
