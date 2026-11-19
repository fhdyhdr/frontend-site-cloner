import {
  useState,
  useRef,
  useCallback,
  useMemo,
  useEffect,
} from "react";
import type {
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
  ReactNode,
} from "react";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import {
  X,
  Plus,
  PanelLeft,
  MoreHorizontal,
  ChevronRight,
  ChevronLeft,
  Trash2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { InteractiveGrid } from "@/components/ui/interactive-grid";

/**
 * Represents a navigation item in the sidebar.
 */
export interface NavItem {
  /** Unique identifier for the navigation item */
  id: string;
  /** Label text to display */
  label: string;
  /** Icon component to render */
  icon: LucideIcon;
}

/**
 * Represents a single browser-like tab.
 */
export interface Tab {
  /** Unique identifier for the tab */
  id: string;
  /** ID of the active navigation item within this tab */
  activeNavId: string;
}

/**
 * Props for the main SidebarWithTabs component.
 */
export interface SidebarWithTabsProps {
  /** Optional custom logo component */
  logo?: ReactNode;
  /** Name of the company/application */
  companyName?: string;
  /** List of navigation items */
  navItems: NavItem[];
  /** Function to render content based on the active navigation ID */
  renderContent: (navId: string) => ReactNode;
  /** ID of the default active navigation item */
  defaultNavId?: string;
  /** Optional footer content (e.g. user profile) */
  footer?: ReactNode;
  /**
   * Compact avatar shown in the footer while the sidebar is collapsed. Falls
   * back to `logo` only when omitted, so collapsing no longer swaps the user's
   * profile out for the app mark.
   */
  profile?: ReactNode;
  /** Optional actions rendered at the end of the tab bar */
  headerActions?: ReactNode;
}

/**
 * Individual tab component ensuring accessibility and animation.
 */
function ChromeTab({
  tab,
  isActive,
  isFirst,
  isLast,
  canClose,
  navItems,
  hasRightNeighborActive,
  onTabClick,
  onTabClose,
  onCloseOthers,
  onCloseToRight,
  onCloseToLeft,
  hasOtherTabs,
  hasTabsToRight,
  hasTabsToLeft,
  activeSurface,
}: {
  tab: Tab;
  isActive: boolean;
  /* The leftmost tab keeps its rounded top-left corner but draws no left
     shoulder: the flare is the one part of the shape that reads as a curve
     spilling out of the tab, and at the very start of the strip there is no
     neighbouring tab for it to blend into, only the gutter. Its left edge
     instead runs straight down onto the workspace panel's left edge, which
     already sits at the same x (md:pl-3 on both). */
  isFirst: boolean;
  isLast: boolean;
  canClose: boolean;
  navItems: NavItem[];
  hasRightNeighborActive: boolean;
  onTabClick: () => void;
  onTabClose: () => void;
  onCloseOthers: () => void;
  onCloseToRight: () => void;
  onCloseToLeft: () => void;
  hasOtherTabs: boolean;
  hasTabsToRight: boolean;
  hasTabsToLeft: boolean;
  /* Mirrors the workspace panel's own surface class, so the active tab is painted
     with exactly the same fill as the panel it is attached to. Without this the
     tab used bg-background (#EAEAE7) while the Dashboard panel is #F7F7F5, and
     the two read as different sheets rather than one continuous surface. */
  activeSurface?: string;
}) {
  const nav = navItems.find((n) => n.id === tab.activeNavId);
  const Icon = nav?.icon;
  const label = nav?.label || "New Tab";
  const tabRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isActive && tabRef.current) {
      // Standard scroll into view
      tabRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });

      if (isLast) {
        // Tiny timeout to let layout settle
        setTimeout(() => {
          const plusBtn = tabRef.current
            ?.closest(".flex")
            ?.querySelector(".new-tab-btn");
          if (plusBtn) {
            plusBtn.scrollIntoView({
              behavior: "smooth",
              block: "nearest",
              inline: "center",
            });
          }
        }, 250);
      }
    }
  }, [isActive, isLast]);

  const handleAuxClick = (e: ReactMouseEvent) => {
    if (e.button === 1 && canClose) {
      e.preventDefault();
      onTabClose();
    }
  };

  const handleKeyDown = (e: ReactKeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onTabClick();
    } else if (e.key === "Delete" || e.key === "Backspace") {
      if (canClose) {
        e.preventDefault();
        onTabClose();
      }
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      const nextTab = (e.target as HTMLElement)
        .closest("li")
        ?.nextElementSibling?.querySelector('[role="tab"]') as HTMLElement;
      nextTab?.focus();
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      const prevTab = (e.target as HTMLElement)
        .closest("li")
        ?.previousElementSibling?.querySelector('[role="tab"]') as HTMLElement;
      prevTab?.focus();
    }
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger>
        <div
          role="tab"
          aria-selected={isActive}
          tabIndex={isActive ? 0 : -1}
          className={cn(
            "relative flex items-center gap-2 px-4 py-2.5 ml-[10px] sm:ml-0 text-sm cursor-pointer active:cursor-grabbing transition-colors duration-150 min-w-[140px] max-w-[220px] outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar",
            isActive
              ? "text-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
          onClick={onTabClick}
          onAuxClick={handleAuxClick}
          onKeyDown={handleKeyDown}
          ref={tabRef}
        >
          {isActive && (
            <motion.div
              className={cn(
                "absolute inset-0 rounded-t-xl",
                /* The strip carries md:pl-3 (11.25px), the same inset as the
                   workspace panel below, and the left shoulder is exactly that
                   wide. So the first tab starts on the panel's left edge AND
                   still has room for its rounded corner plus shoulder inside the
                   scroll container - nothing is clipped. */
                activeSurface ?? "bg-background",
              )}
              layoutId="activeTabBg"
              transition={{ type: "spring", bounce: 0.15, duration: 0.4 }}
            >
              {!isFirst && (
                <div className="absolute -left-3 bottom-0 w-3 h-3 overflow-hidden">
                  <div className="absolute right-0 bottom-0 w-6 h-6 bg-sidebar rounded-full z-1" />
                  <div className={cn("absolute inset-0", activeSurface ?? "bg-background")} />
                </div>
              )}
              <div className="absolute -right-3 bottom-0 w-3 h-3 overflow-hidden">
                <div className="absolute left-0 bottom-0 w-6 h-6 bg-sidebar rounded-full z-1" />
                <div className={cn("absolute inset-0", activeSurface ?? "bg-background")} />
              </div>
            </motion.div>
          )}

          <div className="relative flex items-center gap-2 flex-1 min-w-0">
            {Icon && <Icon className="h-4 w-4 flex-shrink-0" />}
            <span className="truncate flex-1 font-medium select-none">
              {label}
            </span>

            {canClose && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onTabClose();
                }}
                aria-label={`Close ${label} tab`}
                className={cn(
                  "flex h-5 w-5 items-center justify-center rounded-full transition-colors flex-shrink-0",
                  isActive
                    ? "hover:bg-muted text-muted-foreground hover:text-foreground"
                    : "opacity-0 group-hover:opacity-100 hover:bg-sidebar-accent text-muted-foreground hover:text-sidebar-foreground",
                )}
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {!isActive && !hasRightNeighborActive && (
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[1px] h-4 bg-sidebar-border" />
          )}
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-48">
        <ContextMenuItem onClick={onTabClose} disabled={!canClose}>
          Close Tab
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={onCloseOthers} disabled={!hasOtherTabs}>
          Close Other Tabs
        </ContextMenuItem>
        <ContextMenuItem onClick={onCloseToRight} disabled={!hasTabsToRight}>
          <ChevronRight className="mr-2 h-4 w-4" />
          Close Tabs to the Right
        </ContextMenuItem>
        <ContextMenuItem onClick={onCloseToLeft} disabled={!hasTabsToLeft}>
          <ChevronLeft className="mr-2 h-4 w-4" />
          Close Tabs to the Left
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

/**
 * Navigation items list component.
 */
function SidebarNavigation({
  navItems,
  activeNavId,
  isCollapsed,
  onItemClick,
}: {
  navItems: NavItem[];
  activeNavId: string;
  isCollapsed: boolean;
  onItemClick: (item: NavItem) => void;
}) {
  return (
    <nav className="space-y-1 px-3">
      {navItems.map((item) => {
        const isActive = item.id === activeNavId;
        const NavButton = (
          <button
            key={item.id}
            onClick={() => onItemClick(item)}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors duration-150 text-left relative",
              isActive
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              isCollapsed && "justify-center px-0",
            )}
          >
            <item.icon
              className={cn(
                "h-5 w-5 flex-shrink-0",
                isActive
                  ? "text-sidebar-accent-foreground"
                  : "text-muted-foreground",
              )}
            />
            {!isCollapsed && (
              <span className="sidebar-reveal font-medium text-sm whitespace-nowrap overflow-hidden">
                {item.label}
              </span>
            )}
            {isActive && !isCollapsed && (
              <motion.div
                layoutId="activeNavIndicator"
                className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-sidebar-primary rounded-r-full"
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              />
            )}
          </button>
        );

        if (isCollapsed) {
          return (
            <Tooltip key={item.id}>
              <TooltipTrigger asChild>{NavButton}</TooltipTrigger>
              <TooltipContent side="right" className="font-medium">
                {item.label}
              </TooltipContent>
            </Tooltip>
          );
        }

        return NavButton;
      })}
    </nav>
  );
}

/**
 * Mobile primary navigation. Replaces the old hamburger + slide-out sheet: on
 * small screens the sidebar is gone entirely and these three destinations live
 * in one fixed bar at the bottom of the viewport.
 */
function MobileBottomNav({
  navItems,
  activeNavId,
  onItemClick,
}: {
  navItems: NavItem[];
  activeNavId: string;
  onItemClick: (item: NavItem) => void;
}) {
  return (
    <nav className="mobile-bottom-nav md:hidden" aria-label="Primary navigation">
      <div
        className="mobile-bottom-nav__inner"
        style={{ gridTemplateColumns: `repeat(${navItems.length}, minmax(0, 1fr))` }}
      >
        {navItems.map((item) => {
          const isActive = item.id === activeNavId;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onItemClick(item)}
              aria-current={isActive ? "page" : undefined}
              className={cn("mobile-bottom-nav__item", isActive && "is-active")}
            >
              <span className="mobile-bottom-nav__icon">
                <Icon className="h-[19px] w-[19px]" strokeWidth={2} aria-hidden="true" />
              </span>
              <span className="mobile-bottom-nav__label">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

/**
 * Button to add a new tab, supporting tap-to-add and hold-for-menu interactions.
 */
function NewTabButton({
  navItems,
  onAddTab,
}: {
  navItems: NavItem[];
  onAddTab: (navId?: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPress = useRef(false);
  const lastTouchTime = useRef(0);

  const handleTouchStart = () => {
    lastTouchTime.current = Date.now();
    isLongPress.current = false;
    timerRef.current = setTimeout(() => {
      isLongPress.current = true;
      setIsOpen(true);
    }, 500);
  };

  const handleTouchEnd = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const handleClick = (e: ReactMouseEvent) => {
    const isTouch = Date.now() - lastTouchTime.current < 1000;
    if (isTouch) {
      if (isLongPress.current) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      setIsOpen(false);
      onAddTab();
    } else {
      onAddTab();
    }
  };

  return (
    <HoverCard
      open={isOpen}
      onOpenChange={(open) => {
        // Prevent opening on touch interaction (simulated hover) unless it's a confirmed long press
        const isTouch = Date.now() - lastTouchTime.current < 1000;
        if (open && isTouch && !isLongPress.current) {
          return;
        }
        setIsOpen(open);
      }}
      openDelay={200}
      closeDelay={100}
    >
      <HoverCardTrigger asChild>
        <button
          onClick={handleClick}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          aria-label="Open a new tab"
          className="flex h-9 w-9 items-center justify-center text-muted-foreground transition-colors hover:text-foreground ml-1 mb-0.5 flex-shrink-0 new-tab-btn"
        >
          <Plus className="h-4 w-4" />
        </button>
      </HoverCardTrigger>
      <HoverCardContent
        align="start"
        className="w-48 p-1 bg-popover border-border"
        sideOffset={8}
      >
        <div className="text-xs text-muted-foreground px-2 py-1.5 font-medium">
          Quick Open
        </div>
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onAddTab(item.id)}
            className="w-full flex items-center gap-2 px-2 py-2 text-sm text-popover-foreground hover:bg-accent rounded-md transition-colors"
          >
            <item.icon className="h-4 w-4 text-muted-foreground" />
            <span>{item.label}</span>
          </button>
        ))}
      </HoverCardContent>
    </HoverCard>
  );
}

/**
 * Main Layout component featuring a sidebar and tabbed navigation.
 */
export function SidebarWithTabs({
  logo,
  companyName = "Acme Inc",
  navItems,
  renderContent,
  defaultNavId,
  footer,
  profile,
  headerActions,
}: SidebarWithTabsProps) {
  const defaultNav = defaultNavId || navItems[0]?.id || "";
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeTabId, setActiveTabId] = useState("");
  const [isClient, setIsClient] = useState(false);
  const tabCounterRef = useRef(1);

  // Load state from localStorage on mount
  // Hydrate state from storage
  useEffect(() => {
    setIsClient(true);
    const savedState = localStorage.getItem("sidebar-tabs-state");

    if (savedState) {
      try {
        const parsed = JSON.parse(savedState);
        const savedTabs: Tab[] = Array.isArray(parsed?.tabs)
          ? parsed.tabs
          : [];
        // Drop tabs that point at nav items which no longer exist.
        const validTabs = savedTabs.filter(
          (tab) =>
            tab &&
            typeof tab.id === "string" &&
            navItems.some((item) => item.id === tab.activeNavId),
        );

        if (validTabs.length > 0) {
          const savedActiveId = validTabs.some(
            (tab) => tab.id === parsed.activeTabId,
          )
            ? parsed.activeTabId
            : validTabs[0].id;

          setTabs(validTabs);
          setActiveTabId(savedActiveId);

          // Sync tab counter
          const maxId = validTabs.reduce((max: number, tab: Tab) => {
            const match = tab.id.match(/tab-(\d+)-/);
            return match ? Math.max(max, parseInt(match[1], 10)) : max;
          }, 1);
          tabCounterRef.current = maxId;
        } else {
          setTabs([{ id: "tab-1", activeNavId: defaultNav }]);
          setActiveTabId("tab-1");
        }
      } catch (error) {
        console.error("State structure mismatch", error);
        // Reset to default on error
        setTabs([{ id: "tab-1", activeNavId: defaultNav }]);
        setActiveTabId("tab-1");
      }
    } else {
      setTabs([{ id: "tab-1", activeNavId: defaultNav }]);
      setActiveTabId("tab-1");
    }
  }, [defaultNav]);

  // Persist state efficiently
  useEffect(() => {
    if (!isClient || tabs.length === 0) return;

    const handler = setTimeout(() => {
      localStorage.setItem(
        "sidebar-tabs-state",
        JSON.stringify({ tabs, activeTabId }),
      );
    }, 500); // Debounce to prevent heavy writes

    return () => clearTimeout(handler);
  }, [tabs, activeTabId, isClient]);

  useEffect(() => {
    if (isClient && tabs.length === 0) {
      setTabs([{ id: "tab-1", activeNavId: defaultNav }]);
      setActiveTabId("tab-1");
    }
  }, [isClient, tabs.length, defaultNav]);

  const activeTab = tabs.find((t) => t.id === activeTabId);
  const activeNavId = activeTab?.activeNavId || defaultNav;
  const activeTabIndex = tabs.findIndex((t) => t.id === activeTabId);
  /* Memoised so collapsing the sidebar (a width animation running every frame)
     or touching the tab list does not hand the page a brand-new element and
     re-render the whole canvas for no visible change. Only a real page swap
     should re-render it. */
  const content = useMemo(
    () => renderContent(activeNavId),
    [renderContent, activeNavId],
  );

  const setActiveNav = useCallback(
    (navId: string) => {
      setTabs((prev) =>
        prev.map((tab) =>
          tab.id === activeTabId ? { ...tab, activeNavId: navId } : tab,
        ),
      );
    },
    [activeTabId],
  );

  const addTab = useCallback(
    (navId?: string) => {
      tabCounterRef.current += 1;
      const newTabId = `tab-${tabCounterRef.current}-${Date.now()}`;
      const newTab: Tab = {
        id: newTabId,
        activeNavId: navId || defaultNav,
      };
      setTabs((prev) => [...prev, newTab]);
      setActiveTabId(newTabId);
    },
    [defaultNav],
  );

  const closeTab = useCallback(
    (tabId: string) => {
      if (tabs.length === 1) return;
      const tabIndex = tabs.findIndex((t) => t.id === tabId);
      const newTabs = tabs.filter((t) => t.id !== tabId);
      setTabs(newTabs);

      if (activeTabId === tabId) {
        // Select the next tab (right) if available, otherwise the previous (left)
        const newActiveIndex =
          tabIndex === newTabs.length ? tabIndex - 1 : tabIndex;
        // Ensure we have a valid index
        const safeIndex = Math.max(0, newActiveIndex);
        if (newTabs[safeIndex]) {
          setActiveTabId(newTabs[safeIndex].id);
        }
      }
    },
    [tabs, activeTabId],
  );

  const closeOthers = useCallback((tabId: string) => {
    setTabs((prev) => prev.filter((t) => t.id === tabId));
    setActiveTabId(tabId);
  }, []);

  const closeToRight = useCallback(
    (tabId: string) => {
      const index = tabs.findIndex((t) => t.id === tabId);
      const newTabs = tabs.slice(0, index + 1);
      setTabs(newTabs);
      if (!newTabs.find((t) => t.id === activeTabId)) {
        setActiveTabId(tabId);
      }
    },
    [tabs, activeTabId],
  );

  const closeToLeft = useCallback(
    (tabId: string) => {
      const index = tabs.findIndex((t) => t.id === tabId);
      const newTabs = tabs.slice(index);
      setTabs(newTabs);
      if (!newTabs.find((t) => t.id === activeTabId)) {
        setActiveTabId(tabId);
      }
    },
    [tabs, activeTabId],
  );

  const closeAll = useCallback(() => {
    if (tabs.length <= 1) return;
    const firstTab = tabs[0];
    setTabs([firstTab]);
    setActiveTabId(firstTab.id);
  }, [tabs]);

  const setActiveTab = useCallback((tabId: string) => {
    setActiveTabId(tabId);
  }, []);

  const handleNavItemClick = useCallback(
    (item: NavItem) => {
      setActiveNav(item.id);
    },
    [setActiveNav],
  );

  const canCloseTab = tabs.length > 1;
  const hasOtherTabs = tabs.length > 1;
  const contentRef = useRef<HTMLDivElement>(null);

  /* The page cross-fade, replayed without a remount: one composited animation
     on the wrapper whenever the visible page actually changes. Switching tabs
     that point at the same page stays silent, which is correct - nothing
     visible changed. */
  useEffect(() => {
    const element = contentRef.current;
    if (!element) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    element.animate([{ opacity: 0 }, { opacity: 1 }], {
      duration: 170,
      easing: "ease-out",
    });
  }, [activeNavId]);

  return (
    <TooltipProvider delayDuration={0}>
      <div className="flex h-screen w-full bg-sidebar overflow-hidden md:pb-[15px] md:pr-[15px] md:pt-[10px]">
        <motion.aside
          initial={false}
          animate={{ width: isCollapsed ? 64 : 240 }}
          /* A tween rather than a spring: the old spring re-laid the sidebar out
             for ~500ms, and every one of those frames also resized the workspace
             panel and the flow canvas inside it. This curve reaches its final
             width in 280ms but spends most of that easing out, so it still reads
             as a glide rather than a snap. */
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          className="hidden md:flex flex-col bg-sidebar overflow-hidden"
        >
          <div className="flex flex-col h-full overflow-hidden">
            <div
              className={cn(
                "flex items-center h-[52px] px-4 border-b border-sidebar-border",
                isCollapsed ? "justify-center" : "justify-between",
              )}
            >
              <div className="flex items-center gap-3 min-w-0">
                {logo || (
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-primary flex-shrink-0">
                    <span className="text-sm font-bold text-sidebar-primary-foreground">
                      A
                    </span>
                  </div>
                )}
                {!isCollapsed && (
                  <span className="sidebar-reveal text-sm font-bold text-sidebar-foreground truncate tracking-tight whitespace-nowrap ml-3">
                    {companyName}
                  </span>
                )}
              </div>
              {!isCollapsed && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsCollapsed(!isCollapsed)}
                  aria-label="Collapse sidebar"
                  className="h-8 w-8 text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent flex-shrink-0"
                >
                  <PanelLeft className="h-4 w-4" />
                </Button>
              )}
            </div>

            {isCollapsed && (
              <div className="flex justify-center py-2 border-b border-sidebar-border">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsCollapsed(!isCollapsed)}
                  aria-label="Expand sidebar"
                  className="h-8 w-8 text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent flex-shrink-0"
                >
                  <PanelLeft className="h-4 w-4 rotate-180" />
                </Button>
              </div>
            )}

            <div className="flex-1 py-4 overflow-y-auto scrollbar-hide">
              <SidebarNavigation
                navItems={navItems}
                activeNavId={activeNavId}
                isCollapsed={isCollapsed}
                onItemClick={handleNavItemClick}
              />
            </div>

            {/* The footer hosts the profile card, whose menu expands upward out
                of the card itself. It cannot be a fixed 73px box with
                overflow-hidden any more: the expanded menu is taller than that,
                so the height is a minimum and the overflow is visible. */}
            <div className="relative p-4 border-t border-sidebar-border min-h-[73px] flex items-center justify-center">
              {!isCollapsed ? (
                footer ? (
                  <div className="sidebar-reveal w-full">{footer}</div>
                ) : null
              ) : (
                <div className="sidebar-reveal flex justify-center">
                  {profile || logo || (
                    <div className="w-8 h-8 rounded-full bg-muted flex-shrink-0" />
                  )}
                </div>
              )}
            </div>
          </div>
        </motion.aside>

        <div className="flex flex-1 flex-col overflow-hidden relative">
          <div className="flex items-end bg-sidebar pt-2">
            {/* Mobile keeps one quiet brand line instead of the desktop tab strip.
                The tabs remain available on md+ where there is room for them. */}
            <span className="mobile-top-brand md:hidden">{companyName}</span>

            <div
              className="hidden items-end overflow-x-auto scrollbar-hide flex-1 md:flex md:pl-3"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
              <Reorder.Group
                as="ol"
                axis="x"
                values={tabs}
                onReorder={setTabs}
                className="flex items-end"
                role="tablist"
              >
                <AnimatePresence initial={false}>
                  {tabs.map((tab, index) => {
                    const isActive = tab.id === activeTabId;
                    const isLast = index === tabs.length - 1;
                    const hasRightNeighborActive =
                      index < tabs.length - 1 &&
                      tabs[index + 1].id === activeTabId;

                    return (
                      <Reorder.Item
                        value={tab}
                        as="li"
                        layout
                        key={tab.id}
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: "auto" }}
                        exit={{ opacity: 0, width: 0 }}
                        whileDrag={{ cursor: "grabbing" }}
                        transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                        className="relative group flex-shrink-0"
                        style={{ zIndex: isActive ? 10 : 1 }}
                      >
                        <ChromeTab
                          tab={tab}
                          isActive={isActive}
                          isFirst={index === 0}
                          isLast={isLast}
                          canClose={canCloseTab}
                          navItems={navItems}
                          hasRightNeighborActive={hasRightNeighborActive}
                          onTabClick={() => setActiveTab(tab.id)}
                          onTabClose={() => closeTab(tab.id)}
                          onCloseOthers={() => closeOthers(tab.id)}
                          onCloseToRight={() => closeToRight(tab.id)}
                          onCloseToLeft={() => closeToLeft(tab.id)}
                          hasOtherTabs={hasOtherTabs}
                          hasTabsToRight={index < tabs.length - 1}
                          hasTabsToLeft={index > 0}
                          activeSurface={
                            tab.activeNavId === "dashboard"
                              ? "wb-workspace-surface"
                              : undefined
                          }
                        />
                      </Reorder.Item>
                    );
                  })}
                </AnimatePresence>
              </Reorder.Group>

              <motion.div layout className="flex-shrink-0">
                <NewTabButton navItems={navItems} onAddTab={addTab} />
              </motion.div>
            </div>

            {headerActions && (
              <div className="mobile-top-actions flex items-center gap-1 mb-0.5 mr-1 flex-shrink-0 md:ml-0">
                {headerActions}
              </div>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  aria-label="Tab options"
                  className="hidden h-9 w-9 items-center justify-center text-muted-foreground transition-colors hover:text-foreground hover:bg-sidebar-accent rounded-lg mr-2 mb-0.5 flex-shrink-0 md:flex"
                >
                  <MoreHorizontal className="h-5 w-5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => addTab()}>
                  <Plus className="mr-2 h-4 w-4" />
                  New Tab
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={closeAll}
                  disabled={!hasOtherTabs}
                  className={cn(
                    hasOtherTabs && "text-red-500 focus:text-red-500",
                  )}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Close All Tabs
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <main className="relative flex-1 overflow-hidden bg-sidebar p-0 pb-[calc(76px+env(safe-area-inset-bottom))] md:pb-3 md:pr-3 md:pl-3">
            <div
              className={cn(
                "relative z-10 h-full bg-background overflow-auto transition-[border-radius] duration-300 ease-in-out",
                "md:rounded-br-3xl md:rounded-bl-3xl md:rounded-tr-3xl",
                activeTabIndex !== 0 && "md:rounded-tl-3xl",
                /* The Dashboard's grid backdrop gets its own, whiter surface in
                   light mode - see .wb-workspace-surface in index.css. Scoped to
                   the same condition as the grid itself so the other, plain
                   placeholder pages keep the standard workspace tone. */
                activeNavId === "dashboard" && "wb-workspace-surface",
              )}
            >
              {/* No key and no AnimatePresence here. Keying on the tab id
                  remounted the entire page on every tab add or tab switch -
                  ReactFlow tore down and rebuilt its nodes and the pattern
                  layers re-rendered - all to buy a 150ms cross-fade. Rendering
                  the active nav directly keeps the mounted tree alive whenever
                  the tab changes but the page does not, which is the common
                  case: a new tab opens on Dashboard. The fade is kept, but
                  played on this wrapper by an effect (see `contentRef`) so it
                  costs one animation instead of a remount. */}
              <div ref={contentRef} className="h-full">{content}</div>
              {/* Cell grid for the workspace surround: the recessed area the
                  Workflow canvas card floats on, not the card itself.

                  Only the Dashboard renders it. Project and Setting are plain
                  pages with no card to float, so a textured backdrop there
                  would just be noise.

                  It lives *inside* the scrolling panel rather than on <main>,
                  because <main> paints bg-sidebar (#242424) - the same colour
                  as the outermost strip - and a transparent panel made the
                  workspace melt into that strip. Keeping the panel's own
                  bg-background (#171717) preserves the seam between the strip
                  and the workspace.

                  Being inside the panel means the grid must be taken out of
                  flow and kept behind the content, and it is scrolled with the
                  page so the cells stay pinned to the surface. The radial mask
                  is the edge fade: cells dissolve before the rounded corners,
                  so the grid reads as a surface extending past the frame. */}
              {activeNavId === "dashboard" && (
                <InteractiveGrid
                  cellSize={40}
                  className="wb-workspace-grid hidden md:block [mask-image:radial-gradient(ellipse_70%_65%_at_50%_50%,#000_30%,transparent_100%)] [-webkit-mask-image:radial-gradient(ellipse_70%_65%_at_50%_50%,#000_30%,transparent_100%)]"
                />
              )}
            </div>
          </main>
        </div>

        <MobileBottomNav
          navItems={navItems}
          activeNavId={activeNavId}
          onItemClick={handleNavItemClick}
        />
      </div>
    </TooltipProvider>
  );
}
