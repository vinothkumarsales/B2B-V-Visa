/**
 * Root-level route segments owned by the marketing site.
 *
 * `src/app/[uid]/` is a root dynamic segment serving partner portals. Next.js
 * resolves a static segment before a dynamic one, so any static route added at
 * the root would silently shadow a partner whose agency id matched that string.
 * Agency ids are Prisma-generated, so a real collision is very unlikely — but
 * the failure would be silent, which is why it is asserted rather than assumed.
 *
 * Two consequences worth remembering:
 *   1. `src/app/[slug]` can never exist alongside `[uid]` — Next throws
 *      "You cannot use different slug names for the same dynamic path".
 *      Every dynamic marketing template must live under a named prefix.
 *   2. Anything added here must also be added as a real route, and vice versa.
 */
export const RESERVED_ROOT_SLUGS = [
  'about',
  'community',
  'compare',
  'contact',
  'customers',
  'developers',
  'docs',
  'legal',
  'news',
  'projects',
  'recognition',
  'research',
  'resources',
  'security',
  'solutions',
  'visas',
] as const;

export type ReservedRootSlug = (typeof RESERVED_ROOT_SLUGS)[number];

const reserved = new Set<string>(RESERVED_ROOT_SLUGS);

/** True when a candidate partner uid would collide with a marketing route. */
export function isReservedRootSlug(value: string): boolean {
  return reserved.has(value.toLowerCase());
}
