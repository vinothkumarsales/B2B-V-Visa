'use client';

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  type CSSProperties,
  type ElementType,
  type ReactNode,
} from 'react';
import { cn } from '@/lib/utils';

type Direction = 'up' | 'down' | 'left' | 'right' | 'none';

const OFFSET: Record<Direction, { x: string; y: string }> = {
  up: { x: '0px', y: '22px' },
  down: { x: '0px', y: '-22px' },
  left: { x: '32px', y: '0px' },
  right: { x: '-32px', y: '0px' },
  none: { x: '0px', y: '0px' },
};

/**
 * `inView` animates when the element scrolls into view (the default).
 * `mount` animates immediately — use it above the fold.
 */
export type RevealMode = 'inView' | 'mount';

/** Provided by <RevealGroup> so children pick up a staggered delay. */
const StaggerContext = createContext<{ stagger: number; base: number } | null>(null);
const IndexContext = createContext(0);

function prefersReducedMotion() {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/**
 * Drives the reveal for one element.
 *
 * The element renders visible. Script only hides it ("arms" it) when it is
 * genuinely off-screen and motion is allowed — so a script failure, a missing
 * IntersectionObserver, or a reduced-motion preference all degrade to plain
 * visible content rather than a blank page. A timeout backstops the observer.
 */
function useReveal(mode: RevealMode, attr: 'reveal' | 'revealScope' = 'reveal') {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion()) return;

    let observer: IntersectionObserver | undefined;
    let fallback: ReturnType<typeof setTimeout> | undefined;

    const play = () => {
      if (fallback) clearTimeout(fallback);
      observer?.disconnect();
      el.dataset[attr] = 'in';
    };

    const frame = requestAnimationFrame(() => {
      const rect = el.getBoundingClientRect();
      const viewportH = window.innerHeight || document.documentElement.clientHeight;
      const offScreen = rect.top > viewportH - 40;

      if (mode === 'mount' || !offScreen || typeof IntersectionObserver === 'undefined') {
        // On screen already (or explicitly mount-mode): animate in place.
        el.dataset[attr] = 'in';
        return;
      }

      // Off screen: safe to hide until it scrolls into view.
      el.dataset[attr] = 'armed';
      observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) play();
        },
        { rootMargin: '0px 0px -60px 0px' },
      );
      observer.observe(el);

      // Backstop: never leave content hidden if the observer never fires.
      fallback = setTimeout(play, 4000);
    });

    return () => {
      cancelAnimationFrame(frame);
      if (fallback) clearTimeout(fallback);
      observer?.disconnect();
    };
  }, [mode, attr]);

  return ref;
}

function revealStyle({
  direction,
  duration,
  delay,
  scale,
}: {
  direction: Direction;
  duration: number;
  delay: number;
  scale?: boolean;
}): CSSProperties {
  const { x, y } = OFFSET[direction];
  return {
    ['--vv-reveal-x' as string]: x,
    ['--vv-reveal-y' as string]: y,
    ['--vv-reveal-scale' as string]: scale ? '0.96' : '1',
    ['--vv-reveal-duration' as string]: `${duration}s`,
    ['--vv-reveal-delay' as string]: `${delay}s`,
  };
}

export type RevealProps = {
  children: ReactNode;
  direction?: Direction;
  mode?: RevealMode;
  /** Seconds before the animation starts. Added to any stagger from a group. */
  delay?: number;
  duration?: number;
  /** Start slightly scaled down — good for cards and media. */
  scale?: boolean;
  as?: ElementType;
  className?: string;
  style?: CSSProperties;
};

/** Reveals its children as they scroll into view. */
export function Reveal({
  children,
  direction = 'up',
  mode = 'inView',
  delay = 0,
  duration = 0.55,
  scale = false,
  as,
  className,
  style,
}: RevealProps) {
  const group = useContext(StaggerContext);
  const index = useContext(IndexContext);
  // Standalone reveals watch the viewport themselves; grouped ones are driven
  // by their parent's scope attribute and only carry the staggered delay.
  const ownRef = useReveal(mode);
  const Comp = (as ?? 'div') as ElementType;
  const totalDelay = group ? group.base + index * group.stagger + delay : delay;

  return (
    <Comp
      {...(group ? { 'data-reveal-child': '' } : { ref: ownRef })}
      className={cn(className)}
      style={{ ...revealStyle({ direction, duration, delay: totalDelay, scale }), ...style }}
    >
      {children}
    </Comp>
  );
}

export type RevealGroupProps = {
  children: ReactNode;
  mode?: RevealMode;
  /** Seconds between each child. */
  stagger?: number;
  delay?: number;
  as?: ElementType;
  className?: string;
  style?: CSSProperties;
};

/**
 * Staggers <Reveal> children.
 *
 * The group itself is never hidden — only its children carry the animation —
 * so the container's layout is unaffected.
 */
export function RevealGroup({
  children,
  mode = 'inView',
  stagger = 0.09,
  delay = 0,
  as,
  className,
  style,
}: RevealGroupProps) {
  const Comp = (as ?? 'div') as ElementType;
  const ref = useReveal(mode, 'revealScope');

  return (
    <StaggerContext.Provider value={{ stagger, base: delay }}>
      <Comp ref={ref} className={cn(className)} style={style}>
        {Array.isArray(children)
          ? children.map((child, i) => (
              <IndexContext.Provider key={i} value={i}>
                {child}
              </IndexContext.Provider>
            ))
          : children}
      </Comp>
    </StaggerContext.Provider>
  );
}
