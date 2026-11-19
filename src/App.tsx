import { useCallback, useEffect, useState } from "react";
import { Home, LayoutGrid, Moon, Settings, Sun } from "lucide-react";
import {
  SidebarWithTabs,
  type NavItem,
} from "@/components/ui/sidebar-with-chrome-like-tabs";
import { DashboardPage } from "@/pages/dashboard";
import ExpandableProfileMenu, {
  type ProfileTheme,
} from "@/components/ui/grid-row-profile-expander";
import {
  PatternFxPanel,
  type PatternFxControls,
} from "@/components/ui/dshapes-pattern-background";
import { PlaceholderPage } from "@/pages/placeholders";
import { ProjectsPage } from "@/pages/projects";
import ContinueWithGoogle from "@/components/ui/button-github";
import { Icon } from "@/components/icons";
import "./styles/dashboard.css";

type Theme = "light" | "dark";

/** Keep in sync with `transition` duration for `[data-theme-switching]` in index.css. */
const THEME_FADE_MS = 170;

const navItems: NavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: Home },
  { id: "projects", label: "Project", icon: LayoutGrid },
  { id: "settings", label: "Setting", icon: Settings },
];

const placeholders: Record<string, { title: string; description: string }> = {
  settings: {
    title: "Setting",
    description: "Configure your workspace, notifications, and connections.",
  },
};

const logo = (
  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-sidebar-primary">
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4 text-sidebar-primary-foreground"
      aria-hidden="true"
    >
      <path d="M4 7h6l3 5 3-5h4" />
      <path d="M4 17h4l3-5" />
      <path d="M16 17h4" />
    </svg>
  </div>
);

/** Same portrait the testimonial card uses, for the collapsed-sidebar avatar. */
const PROFILE_IMAGE =
  "https://cdn.21st.dev/assets/mirror/51/513d06f542692036ff0bb17938f04b3efd60567ba2cae08049469d21f18e0524.jpg";

function getInitialTheme(): Theme {
  const stored = localStorage.getItem("flowdeck-theme");
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function App() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);
  const [toast, setToast] = useState<string | null>(null);
  const [patternFx, setPatternFx] = useState<PatternFxControls | null>(null);

  /**
   * The profile menu's switcher has three states, the app has two. "System"
   * resolves against the OS preference once, at click time; the app's own theme
   * effect then persists whichever value it settled on.
   */
  const handleProfileTheme = (next: ProfileTheme) => {
    if (next === "system") {
      setTheme(
        window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light",
      );
      return;
    }
    setTheme(next);
  };

  useEffect(() => {
    const root = document.documentElement;
    // Cross-fade the palette: hold a shared colour transition on every element
    // while the new theme fades in, then release it. THEME_FADE_MS must stay in
    // sync with `transition-duration` in index.css.
    root.dataset.themeSwitching = "";
    root.dataset.theme = theme;
    const done = window.setTimeout(() => {
      delete root.dataset.themeSwitching;
    }, THEME_FADE_MS);
    localStorage.setItem("flowdeck-theme", theme);
    return () => {
      window.clearTimeout(done);
      delete root.dataset.themeSwitching;
    };
  }, [theme]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3400);
    return () => clearTimeout(timer);
  }, [toast]);

  const notify = useCallback((message: string) => setToast(message), []);

  const renderContent = useCallback(
    (navId: string) => {
      if (navId === "projects") return <ProjectsPage />;
      const placeholder = placeholders[navId];
      if (placeholder) {
        return (
          <PlaceholderPage
            title={placeholder.title}
            description={placeholder.description}
          />
        );
      }
      return <DashboardPage onNotify={notify} onPatternFx={setPatternFx} />;
    },
    [notify],
  );

  return (
    <>
      <SidebarWithTabs
        logo={logo}
        companyName="Flowdeck"
        navItems={navItems}
        renderContent={renderContent}
        defaultNavId="dashboard"
        headerActions={
          <>
            {/* Sits to the LEFT of the theme toggle. The narrow-viewport rule
                below hides it before the tab strip runs out of room. */}
            <ContinueWithGoogle />
            <button
              type="button"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground"
            >
              {theme === "dark" ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </button>
          </>
        }
        footer={
          <div className="relative flex justify-center">
            <ExpandableProfileMenu
              name="Maya Renata"
              email="maya.renata@flowdeck.io"
              theme={theme}
              onThemeChange={handleProfileTheme}
            >
              {patternFx ? <PatternFxPanel controls={patternFx} /> : null}
            </ExpandableProfileMenu>
          </div>
        }
        profile={
          <img
            src={PROFILE_IMAGE}
            alt="Maya Renata"
            className="h-8 w-8 flex-shrink-0 rounded-full object-cover"
          />
        }
      />

      <div
        className={`toast ${toast ? "is-visible" : ""}`}
        role="status"
        aria-live="polite"
      >
        <Icon name="sparkles" size={16} />
        <span>{toast}</span>
      </div>
    </>
  );
}

export default App;
