/**
 * Cue Foundations · Grid-Row Profile Expander
 * ────────────────────────────────────────────
 * A beige profile card that expands upward via the grid-row 0fr-to-1fr trick to
 * reveal a nested menu and light/dark/system theme switcher.
 *
 * The full AI prompt used to design this lives at:
 *   lib/prompts/grid-row-profile-expander.md
 *
 * Awwwards-tier premium version → https://cuedesign.space/component/cue186
 *
 * Original Cue ID: cue186
 * Category: Navigation
 * ────────────────────────────────────────────
 *
 * Adaptations for this app:
 *
 *  - The original toggled a `dark-mode` class on <body>. This app themes through
 *    `document.documentElement.dataset.theme`, so the switcher writes that
 *    instead and the styles read from `[data-theme="dark"]` rather than
 *    `body.dark-mode`. Keeping one mechanism means the rest of the shell follows
 *    the same switch.
 *  - `applyTheme` is lifted to the caller so the app's own theme state stays the
 *    single source of truth.
 *  - The component exposes a `children` slot under the menu lists, which is where
 *    the Pattern FX controls now live. They used to float over the Export panel.
 */

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";

export type ProfileTheme = "light" | "dark" | "system";

type MenuItem = {
  label: string;
  icon: ReactNode;
  onClick?: () => void;
  danger?: boolean;
};

type Section = MenuItem[];

const iconHome = (
  <svg viewBox="0 0 24 24">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);
const iconPages = (
  <svg viewBox="0 0 24 24">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>
);
const iconActivity = (
  <svg viewBox="0 0 24 24">
    <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
    <polyline points="16 7 22 7 22 13" />
  </svg>
);
const iconSite = (
  <svg viewBox="0 0 24 24">
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);
const iconUser = (
  <svg viewBox="0 0 24 24">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);
const iconDocs = (
  <svg viewBox="0 0 24 24">
    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
  </svg>
);
const iconSignout = (
  <svg viewBox="0 0 24 24">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);

const iconSun = (
  <svg viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="5" />
    <line x1="12" y1="1" x2="12" y2="3" />
    <line x1="12" y1="21" x2="12" y2="23" />
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
    <line x1="1" y1="12" x2="3" y2="12" />
    <line x1="21" y1="12" x2="23" y2="12" />
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
  </svg>
);
const iconMoon = (
  <svg viewBox="0 0 24 24">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
);
const iconMonitor = (
  <svg viewBox="0 0 24 24">
    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
    <line x1="8" y1="21" x2="16" y2="21" />
    <line x1="12" y1="17" x2="12" y2="21" />
  </svg>
);

const DEFAULT_SECTIONS: Section[] = [
  [
    { label: "Home", icon: iconHome },
    { label: "Pages", icon: iconPages },
    { label: "Activity stream", icon: iconActivity },
    { label: "Site settings", icon: iconSite },
  ],
  [
    { label: "My preferences & profile", icon: iconUser },
    { label: "Documentations", icon: iconDocs },
    { label: "Sign out", icon: iconSignout, danger: true },
  ],
];

/**
 * The Pattern FX block lives inside the menu, far from the Export panel whose
 * pattern it controls. Rather than thread half a dozen props through, the
 * pattern publishes its controls through this context and the menu renders
 * whatever is registered.
 */
const PatternFxSlot = createContext<ReactNode>(null);

export function PatternFxSlotProvider({
  value,
  children,
}: {
  value: ReactNode;
  children: ReactNode;
}) {
  return <PatternFxSlot.Provider value={value}>{children}</PatternFxSlot.Provider>;
}

export default function ExpandableProfileMenu({
  name = "Maya Renata",
  email = "maya.renata@flowdeck.io",
  avatarSrc,
  sections = DEFAULT_SECTIONS,
  theme = "light",
  onThemeChange,
  children,
}: {
  name?: string;
  email?: string;
  avatarSrc?: string;
  sections?: Section[];
  theme?: ProfileTheme;
  onThemeChange?: (theme: ProfileTheme) => void;
  children?: ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const injectedFx = useContext(PatternFxSlot);
  const extra = children ?? injectedFx;

  useEffect(() => {
    /* The toggle's own click reaches document too, so the "click outside" check
       runs on the next tick. Without that, the same click that expands the card
       immediately collapses it again. */
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setExpanded(false);
    };
    const onDocDeferred = (e: MouseEvent) => {
      window.setTimeout(() => onDoc(e), 0);
    };
    document.addEventListener("click", onDocDeferred);
    return () => document.removeEventListener("click", onDocDeferred);
  }, []);

  return (
    <>
      <style>{css}</style>
      <div
        ref={wrapRef}
        className={`epm-wrapper${expanded ? " epm-expanded" : ""}`}
      >
        <div className="epm-content-grid">
          <div className="epm-content-inner">
            <div className="epm-content">
              <div className="epm-white-box">
                {sections.map((sec, si) => (
                  <div key={si}>
                    <ul className="epm-list">
                      {sec.map((it, ii) => (
                        <li
                          key={ii}
                          className={it.danger ? "epm-sign-out" : ""}
                          onClick={(e) => {
                            e.stopPropagation();
                            it.onClick?.();
                          }}
                        >
                          {it.icon}
                          {it.label}
                        </li>
                      ))}
                    </ul>
                    {si < sections.length - 1 && (
                      <div className="epm-divider" />
                    )}
                  </div>
                ))}
              </div>

              {extra}

              <div className="epm-theme-switcher">
                <button
                  type="button"
                  className={`epm-theme-btn${theme === "light" ? " epm-active" : ""}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onThemeChange?.("light");
                  }}
                  aria-label="Light theme"
                >
                  {iconSun}
                </button>
                <button
                  type="button"
                  className={`epm-theme-btn${theme === "dark" ? " epm-active" : ""}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onThemeChange?.("dark");
                  }}
                  aria-label="Dark theme"
                >
                  {iconMoon}
                </button>
                <button
                  type="button"
                  className={`epm-theme-btn${theme === "system" ? " epm-active" : ""}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onThemeChange?.("system");
                  }}
                  aria-label="System theme"
                >
                  {iconMonitor}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div
          className="epm-profile-trigger"
          onClick={() => setExpanded((v) => !v)}
        >
          {avatarSrc ? (
            <img src={avatarSrc} alt="" className="epm-avatar" />
          ) : (
            <span className="epm-avatar epm-avatar-fallback" aria-hidden="true">
              {name
                .split(" ")
                .map((w) => w[0])
                .slice(0, 2)
                .join("")
                .toUpperCase()}
            </span>
          )}
          <div className="epm-profile-info">
            <span className="epm-name" title={name}>{name}</span>
            <span className="epm-email" title={email}>{email}</span>
          </div>
        </div>
      </div>
    </>
  );
}

/* Every rule that touches colour is scoped through :global-style attribute
   selectors rather than a body class, so the card follows the app theme in both
   directions and never fights the shell's own tokens. */
const css = `
.epm-wrapper {
  background: #F6F5F0;
  border-radius: 16px;
  border: 1px solid rgba(0,0,0,0.05);
  /* Fills whatever column it is dropped into (the sidebar footer is ~210px),
     and caps at the design's 320px when there is room. The old
     min(320px, 100vw - 32px) ignored the actual parent, so inside the narrow
     sidebar the card came out at the viewport-derived width instead. */
  width: 100%;
  max-width: 320px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  font-family: inherit;
  color: #333333;
}

/* The card is anchored to the bottom of the sidebar, so the menu has to open
   upward. The grid trick only animates height, so the expanded block is placed
   before the trigger in the DOM - see the component structure. */
.epm-content-grid {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}
.epm-wrapper.epm-expanded .epm-content-grid { grid-template-rows: 1fr; }

.epm-content-inner {
  overflow: hidden;
  opacity: 0;
  transform: translateY(10px);
  transition: opacity 0.3s ease, transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}
.epm-wrapper.epm-expanded .epm-content-inner {
  opacity: 1;
  transform: translateY(0);
}

.epm-content { display: flex; flex-direction: column; }

.epm-white-box {
  background: #FFFFFF;
  border-radius: 12px;
  margin: 4px;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.epm-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.epm-list li {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  color: #374151;
  transition: background 0.2s, color 0.2s;
}
.epm-list li:hover { background: #F3F4F6; color: #111827; }
.epm-list li svg {
  width: 18px;
  height: 18px;
  stroke: #9CA3AF;
  fill: none;
  stroke-width: 1.5;
  stroke-linecap: round;
  stroke-linejoin: round;
  flex-shrink: 0;
  transition: stroke 0.2s;
}
.epm-list li:hover svg { stroke: #4B5563; }

.epm-divider {
  height: 1px;
  background: #F3F4F6;
  margin: 0 4px;
}

.epm-list li.epm-sign-out { color: #DC2626; }
.epm-list li.epm-sign-out svg { stroke: #DC2626; }
.epm-list li.epm-sign-out:hover { background: #FEF2F2; color: #B91C1C; }
.epm-list li.epm-sign-out:hover svg { stroke: #B91C1C; }

.epm-theme-switcher {
  display: flex;
  background: rgba(0,0,0,0.04);
  padding: 4px;
  border-radius: 12px;
  margin: 0 4px 4px 4px;
}
.epm-theme-btn {
  flex: 1;
  border: none;
  background: transparent;
  height: 32px;
  min-height: 0;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #9CA3AF;
  transition: all 0.2s;
}
.epm-theme-btn svg {
  width: 16px;
  height: 16px;
  stroke: currentColor;
  fill: none;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.epm-theme-btn.epm-active {
  background: #FFFFFF;
  color: #111827;
  box-shadow: 0 2px 6px rgba(0,0,0,0.05);
}

/* The sidebar footer is only ~210px wide, so the horizontal padding and the
   avatar are trimmed from the design's 16px/40px to keep the full email on one
   line rather than truncated. */
.epm-profile-trigger {
  background: transparent;
  padding: 12px 10px 14px 10px;
  display: flex;
  align-items: center;
  gap: 9px;
  cursor: pointer;
  transition: background 0.2s;
}
.epm-profile-trigger:hover { background: rgba(0,0,0,0.02); }

.epm-avatar {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid #FFFFFF;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  flex-shrink: 0;
}
.epm-avatar-fallback {
  display: grid;
  place-items: center;
  background: #E8E6DE;
  color: #6B7280;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: .02em;
}

/* The card lives in a ~210px sidebar column. Both lines have to truncate on
   their own: display block plus min-width 0 on the flex parent is what lets
   text-overflow actually bite, since a flex item's default min-width is auto
   and refuses to shrink below its content. */
.epm-profile-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  flex: 1;
}
.epm-name {
  display: block;
  min-width: 0;
  max-width: 100%;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.35;
  color: #111827;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.epm-email {
  display: block;
  min-width: 0;
  max-width: 100%;
  font-size: 12px;
  font-weight: 400;
  line-height: 1.35;
  color: #9CA3AF;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ---------- Pattern FX block, inside the menu ---------------------------- */
.epm-fx {
  margin: 0 4px 4px 4px;
  padding: 10px;
  border-radius: 12px;
  background: #FFFFFF;
  display: flex;
  flex-direction: column;
  gap: 9px;
}
.epm-fx-label {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: .1em;
  text-transform: uppercase;
  color: #9CA3AF;
}
.epm-fx-swatches { display: flex; align-items: center; gap: 7px; }
.epm-fx-swatch {
  height: 20px;
  width: 20px;
  padding: 0;
  min-height: 0;
  border: none;
  border-radius: 999px;
  cursor: pointer;
  transition: box-shadow .15s, opacity .15s;
  opacity: .8;
}
.epm-fx-swatch:hover { opacity: 1; }
.epm-fx-swatch.epm-active { opacity: 1; box-shadow: 0 0 0 2px #FFFFFF, 0 0 0 3.5px #111827; }
.epm-fx-row { display: flex; flex-direction: column; gap: 4px; }
.epm-fx-row-head {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: #6B7280;
}
.epm-fx-range {
  width: 100%;
  height: 14px;
  accent-color: #111827;
  cursor: pointer;
}

/* ---------- Dark theme ------------------------------------------------ */
[data-theme="dark"] .epm-wrapper {
  background: #1A1A1A;
  border-color: rgba(255,255,255,0.1);
  color: #D1D5DB;
}
[data-theme="dark"] .epm-white-box { background: #262626; }
[data-theme="dark"] .epm-list li { color: #D1D5DB; }
[data-theme="dark"] .epm-list li:hover { background: #333333; color: #FFFFFF; }
[data-theme="dark"] .epm-list li svg { stroke: #9CA3AF; }
[data-theme="dark"] .epm-list li:hover svg { stroke: #E5E7EB; }
[data-theme="dark"] .epm-divider { background: #333333; }
[data-theme="dark"] .epm-theme-switcher { background: rgba(255,255,255,0.05); }
[data-theme="dark"] .epm-theme-btn.epm-active { background: #333333; color: #FFFFFF; }
[data-theme="dark"] .epm-profile-trigger:hover { background: rgba(255,255,255,0.05); }
[data-theme="dark"] .epm-name { color: #FFFFFF; }
[data-theme="dark"] .epm-avatar { border-color: #262626; }
[data-theme="dark"] .epm-avatar-fallback { background: #333333; color: #D1D5DB; }
[data-theme="dark"] .epm-list li.epm-sign-out { color: #EF4444; }
[data-theme="dark"] .epm-list li.epm-sign-out svg { stroke: #EF4444; }
[data-theme="dark"] .epm-list li.epm-sign-out:hover { background: rgba(239,68,68,0.1); color: #F87171; }
[data-theme="dark"] .epm-list li.epm-sign-out:hover svg { stroke: #F87171; }

[data-theme="dark"] .epm-fx { background: #262626; }
[data-theme="dark"] .epm-fx-label { color: #9CA3AF; }
[data-theme="dark"] .epm-fx-row-head { color: #9CA3AF; }
[data-theme="dark"] .epm-fx-swatch.epm-active { box-shadow: 0 0 0 2px #262626, 0 0 0 3.5px #FFFFFF; }
[data-theme="dark"] .epm-fx-range { accent-color: #FFFFFF; }

@media (prefers-reduced-motion: reduce) {
  .epm-wrapper, .epm-content-grid, .epm-content-inner {
    transition: none !important;
  }
  .epm-content-inner { transform: none !important; }
}
`;
