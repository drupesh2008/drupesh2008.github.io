import type { CSSProperties } from 'react'

/**
 * The site's five accents, in both exposures.
 *
 * Dark pages (the landing, /learning, /tech-blogs) use the bright values
 * against the void; the light theme uses the ink values — the same family the
 * /about page already draws its category colours from (#0f766e, #6d28d9,
 * #b45309). One palette, two exposures, so every page reads as the same site.
 */
export const ACCENT_INK: Record<string, string> = {
  '#5EE9D5': '#0F766E', // teal — Skyserve, Distributed Systems
  '#4C8BF5': '#1D4ED8', // blue — LocationIQ, System Design
  '#FFB454': '#B45309', // amber — Motilal Oswal, Data & Storage
  '#A78BFA': '#6D28D9', // violet — SeekOut, AI Engineering
  '#7BD88F': '#15803D', // green — Deloitte, Foundations
}

/** the ink-on-paper counterpart of a bright accent (falls back to itself) */
export const inkOf = (hex: string) => ACCENT_INK[hex.toUpperCase()] ?? hex

/**
 * Both exposures as inline custom properties. Components set these on an
 * element and its stylesheet picks `--acc` normally, `--accInk` under
 * [data-theme="light"] — so a static inline style stays theme-correct.
 */
export const accVars = (hex: string) =>
  ({ '--acc': hex, '--accInk': inkOf(hex) }) as CSSProperties
