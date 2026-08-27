import Image from 'next/image';

/**
 * Brand assets.
 *
 * The supplied artwork is a wordmark ("v·visa" with the plane, plus the
 * "by mittoX" endorsement), not an icon — so there is no separate text label
 * beside it. The source PNG shipped with a baked white background and no alpha,
 * which would have shown as a white box on the dark surfaces this site uses, so
 * two composited variants are generated: the wordmark as supplied for light
 * surfaces, and a version with the neutral letterforms lifted to white (the
 * blue accent kept) for dark ones.
 *
 * Both variants are rendered and toggled with CSS rather than by reading the
 * theme in JS, so there is no flash on load and no hydration branch.
 */

const FULL = { w: 480, h: 220 };
const MARK = { w: 474, h: 156 };

export function Logo({
  className = 'h-8',
  variant = 'mark',
  priority = false,
}: {
  /** Height utility; width follows the intrinsic ratio. */
  className?: string;
  /** `mark` is the wordmark alone — use it anywhere under ~56px tall, where
   *  "by mittoX" would be too small to read. `full` is the complete lockup. */
  variant?: 'mark' | 'full';
  priority?: boolean;
}) {
  const dims = variant === 'full' ? FULL : MARK;
  const base = variant === 'full' ? '/logo-vvisa' : '/logo-vvisa-mark';

  return (
    <>
      <Image
        src={`${base}.png`}
        alt="v·visa by mittoX"
        width={dims.w}
        height={dims.h}
        priority={priority}
        className={`${className} w-auto dark:hidden`}
      />
      <Image
        src={`${base}-dark.png`}
        alt=""
        aria-hidden
        width={dims.w}
        height={dims.h}
        priority={priority}
        className={`${className} hidden w-auto dark:block`}
      />
    </>
  );
}

/**
 * The wordmark is the brand — `tone="inherit"` renders the light-on-dark
 * variant regardless of theme, for permanently dark surfaces such as the auth
 * panel and the inverted CTA band.
 */
export function Wordmark({
  className = 'h-8',
  tone = 'default',
  variant = 'mark',
  priority = false,
}: {
  className?: string;
  tone?: 'default' | 'inherit';
  variant?: 'mark' | 'full';
  priority?: boolean;
}) {
  const dims = variant === 'full' ? FULL : MARK;
  const base = variant === 'full' ? '/logo-vvisa' : '/logo-vvisa-mark';

  if (tone === 'inherit') {
    return (
      <Image
        src={`${base}-dark.png`}
        alt="v·visa by mittoX"
        width={dims.w}
        height={dims.h}
        priority={priority}
        className={`${className} w-auto`}
      />
    );
  }

  return <Logo className={className} variant={variant} priority={priority} />;
}
