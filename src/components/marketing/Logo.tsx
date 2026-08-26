/**
 * Brand mark, inline.
 *
 * `public/logo.svg` is a dark tile with an embedded infinite `breathe`
 * animation. Loaded through next/image it sits in its own document, so the
 * page's `prefers-reduced-motion` rule cannot reach it, and its fixed dark
 * fill has no light-on-dark variant. Inlining it fixes both: the plate follows
 * `currentColor`, and the animation is gone.
 */
export function Logo({ className = 'size-7' }: { className?: string }) {
  return (
    <svg viewBox="0 0 30 30" className={className} aria-hidden focusable="false">
      {/*
        Plate and glyph are one path with `evenodd`, so the glyph is punched
        out rather than painted. The mark then works on any background: the
        plate takes `currentColor` and the cut-out shows whatever is behind.
        A two-colour version would go invisible whenever the glyph colour
        matched its container, which is exactly what happened on the dark
        auth panel.
      */}
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        fill="currentColor"
        d="M7.5 0.5 H22.5 A7 7 0 0 1 29.5 7.5 V22.5 A7 7 0 0 1 22.5 29.5 H7.5 A7 7 0 0 1 0.5 22.5 V7.5 A7 7 0 0 1 7.5 0.5 Z
           M24.51 7.1 H16.86 L5.7 22.91 h7.44 L24.3 7.1 Z
           M9.2 7.1 h15.31 v3.42 H9.2 Z
           M5.7 19.49 h15.31 v3.42 H5.7 Z"
      />
    </svg>
  );
}

/**
 * `inherit` makes the mark follow its container's colour, which is what the
 * dark auth panel needs — the default `--foreground` is near-black there.
 */
export function Wordmark({
  className = '',
  tone = 'default',
}: {
  className?: string;
  tone?: 'default' | 'inherit';
}) {
  const color = tone === 'inherit' ? 'text-current' : 'text-foreground';
  return (
    <span className={`flex items-center gap-2.5 ${className}`}>
      <Logo className={`size-7 ${color}`} />
      <span className={`text-[17px] font-semibold tracking-tight ${color}`}>VVisa</span>
    </span>
  );
}
