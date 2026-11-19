import { useEffect, useRef, useState } from "react";

type Theme = "light" | "dark";

interface ParticleScene {
  loaded: boolean;
  render(): void;
  resume(): void;
  stop(): void;
  kill(): void;
  onWindowResize(): void;
}

interface ParticleConstructor {
  new (options: {
    container: HTMLElement;
    theme: Theme;
    particlesScale: number;
    density: number;
    interactive: boolean;
    ringWidth: number;
    ringWidth2: number;
    ringDisplacement: number;
  }): ParticleScene;
}

/**
 * The original antigravity.google runtime is vendored under `src/vendor`; only
 * the DOMContentLoaded bootstrap was replaced with an export so React can own
 * the scene lifecycle. The dependency module installs the global cursor tracker on
 * first import, which is what makes the canvas react to the pointer even though
 * it sits behind ReactFlow with pointer-events:none.
 */
let runtimePromise: Promise<{ AntigravityParticles: ParticleConstructor }> | null = null;

function loadRuntime() {
  runtimePromise ??= import(
    // @ts-expect-error - vendored runtime is plain JS without type declarations
    "../../vendor/antigravity-main-particles.js"
  ) as Promise<{ AntigravityParticles: ParticleConstructor }>;
  return runtimePromise;
}

const CONFIG: Record<Theme, Omit<ConstructorParameters<ParticleConstructor>[0], "container" | "theme">> = {
  // Exact values from the source page: the top/hero section is light, the
  // bottom/download section is dark.
  light: {
    ringWidth: 0.006,
    ringWidth2: 0.107,
    ringDisplacement: 0.62,
    density: 230,
    particlesScale: 0.59,
    interactive: true,
  },
  dark: {
    ringWidth: 0.15,
    ringWidth2: 0.05,
    ringDisplacement: 0.23,
    density: 220,
    particlesScale: 0.65,
    interactive: true,
  },
};

function currentTheme(): Theme {
  return typeof document !== "undefined" && document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

export function AntigravityParticles({ className = "" }: { className?: string }) {
  const [theme, setTheme] = useState<Theme>(currentTheme);
  const lightRef = useRef<HTMLDivElement>(null);
  const darkRef = useRef<HTMLDivElement>(null);

  // The app writes the active theme to <html data-theme>; follow that attribute
  // instead of duplicating theme state in this component.
  useEffect(() => {
    const sync = () => setTheme(currentTheme());
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const container = (theme === "dark" ? darkRef : lightRef).current;
    if (!container) return;

    let disposed = false;
    let scene: ParticleScene | null = null;
    let frame = 0;
    let visible = true;
    let resizeObserver: ResizeObserver | null = null;
    let intersectionObserver: IntersectionObserver | null = null;
    let readyObserver: ResizeObserver | null = null;

    const draw = () => {
      frame = requestAnimationFrame(draw);
      if (!visible || document.hidden) return;
      scene?.render();
    };

    const start = () => {
      if (!scene || frame || !visible || document.hidden) return;
      scene.resume();
      frame = requestAnimationFrame(draw);
    };

    const stop = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      scene?.stop();
    };

    const onVisibility = () => {
      if (document.hidden) stop();
      else if (visible) start();
    };

    const create = (module: Awaited<ReturnType<typeof loadRuntime>>) => {
      if (disposed || scene) return;
      scene = new module.AntigravityParticles({
        ...CONFIG[theme],
        container,
        theme,
      });

      resizeObserver = new ResizeObserver(() => scene?.onWindowResize());
      resizeObserver.observe(container);

      intersectionObserver = new IntersectionObserver(
        ([entry]) => {
          visible = entry.isIntersecting;
          if (visible) start();
          else stop();
        },
        { root: null, rootMargin: "100px 0px", threshold: 0 },
      );
      intersectionObserver.observe(container);
      start();
    };

    // A route transition can mount this component before the canvas card has
    // been measured. Wait for a real box so the WebGL camera never gets a
    // zero-sized drawing buffer.
    void loadRuntime().then(module => {
      if (disposed) return;
      if (container.offsetWidth > 0 && container.offsetHeight > 0) {
        create(module);
        return;
      }
      readyObserver = new ResizeObserver(() => {
        if (container.offsetWidth > 0 && container.offsetHeight > 0) {
          readyObserver?.disconnect();
          readyObserver = null;
          create(module);
        }
      });
      readyObserver.observe(container);
    });

    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      disposed = true;
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
      readyObserver?.disconnect();
      resizeObserver?.disconnect();
      intersectionObserver?.disconnect();
      scene?.kill();
    };
  }, [theme]);

  return (
    <div className={`ag-particles ${className}`} aria-hidden="true">
      <style>{styles}</style>
      <div ref={lightRef} className="ag-particles__layer" data-active={theme === "light"} data-theme="light" />
      <div ref={darkRef} className="ag-particles__layer" data-active={theme === "dark"} data-theme="dark" />
    </div>
  );
}

const styles = String.raw`
.ag-particles{position:absolute;inset:0;z-index:0;overflow:hidden;pointer-events:none;background:var(--wb-card,Canvas)}
.ag-particles__layer{position:absolute;inset:0;opacity:0;visibility:hidden;transition:opacity .32s ease,visibility .32s ease}
.ag-particles__layer[data-active="true"]{opacity:1;visibility:visible}
.ag-particles__layer canvas{position:absolute;inset:0;width:100%;height:100%;display:block}
@media(prefers-reduced-motion:reduce){.ag-particles__layer{transition:none}}
`;

export default AntigravityParticles;
