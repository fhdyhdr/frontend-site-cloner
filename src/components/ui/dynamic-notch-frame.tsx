import type { ReactNode } from "react";

/* ---------------------------------------------------------------------------
   FrameSurface

   A passthrough viewport wrapper. It used to draw a square-outside /
   rounded-inside bezel with an animated notch hanging from the top edge; both are
   gone, so what remains is the layout contract the hosts depend on and nothing
   else:

     .dn-frame-outer   the sizing box (aspect ratio, min-height, flex column)
     .dn-frame-inner   the surface the host paints (grid, texture, background)
     .dn-viewport      the content slot

   No band, no border, no radius, no notch. The classes are kept so existing host
   CSS keeps resolving - only their paint was removed.
   --------------------------------------------------------------------------- */

export interface DisplayNotchFrameProps {
  children: ReactNode;
  className?: string;
  /** Extra class on the inner surface, for host-specific backgrounds. */
  innerClassName?: string;
}

export function DisplayNotchFrame({
  children,
  className = "",
  innerClassName = "",
}: DisplayNotchFrameProps) {
  return (
    <div className={`dn-frame-outer ${className}`.trim()}>
      <div className={`dn-frame-inner ${innerClassName}`.trim()}>
        <div className="dn-viewport">{children}</div>
      </div>
    </div>
  );
}
