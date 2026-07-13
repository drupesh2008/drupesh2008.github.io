import type Lenis from 'lenis'

let instance: Lenis | null = null

export function setLenisInstance(l: Lenis | null) {
  instance = l
}

/**
 * Smoothly scroll to a section by id. Uses Lenis when smooth scrolling is
 * active, and falls back to native scrollIntoView (e.g. reduced-motion users).
 */
export function scrollToSection(id: string) {
  if (typeof document === 'undefined') return
  const el = document.getElementById(id)
  if (!el) return
  if (instance) {
    instance.scrollTo(el, { offset: 0, duration: 1.2 })
  } else {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}
