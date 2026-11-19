import { Button } from "@/components/ui/button";

/*
 * The Google "G" is inlined, quad-coloured, with the brand hues kept exactly as
 * published. Inlined rather than imported because lucide-react no longer ships
 * brand marks and this app has no other icon source for them.
 */
function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}

/*
 * Continue with Google (rainbow-bordered pill).
 *
 * The rainbow ring is a three-layer background: two opaque plates stacked over a
 * 90deg hue sweep, with `background-clip: padding-box, border-box, border-box`
 * so the first plate fills the padding box (the button body), the second fills
 * the border box (the ring), and the gradient is visible only through the
 * transparent border. That is why the ring comes from a background rather than
 * `border-color`, which cannot hold a gradient.
 *
 * Port notes against the source snippet:
 *  - `dark:` in this app is driven by `[data-theme="dark"]` (see the
 *    @custom-variant in index.css), not by a `.dark` class. The plates are
 *    therefore set from a CSS variable in index.css, so both the light and dark
 *    stacks keep all three layers in the same place. Patching only the first
 *    two layers from a utility class left the light plates behind in dark mode.
 *  - The repo star count is gone: this is a sign-in control, and a number next
 *    to it reads as something to click rather than as part of the label.
 *  - No hover scale, by request: the button keeps its size so it does not nudge
 *    the neighbouring theme toggle. Only the plate responds, via the glow.
 *  - The glow and the hue sweep are disabled under prefers-reduced-motion.
 */
export default function ContinueWithGoogle() {
  return (
    <Button type="button" className="sogh group" aria-label="Continue with Google">
      <GoogleIcon className="h-4 w-4 flex-shrink-0" />
      <span className="whitespace-nowrap">Continue with Google</span>
    </Button>
  );
}

export { ContinueWithGoogle, GoogleIcon };
