'use client'

import { useEffect } from 'react'
import Lenis from 'lenis'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { setLenisInstance } from './lenisInstance'

/**
 * Side-effect-only component that drives Lenis smooth scrolling for the whole
 * page. Disabled entirely when the user prefers reduced motion.
 */
export default function SmoothScroll() {
  const reduced = useReducedMotion()

  useEffect(() => {
    if (reduced) return

    const lenis = new Lenis({
      duration: 1.1,
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 1.6,
    })
    setLenisInstance(lenis)

    let rafId = 0
    const raf = (time: number) => {
      lenis.raf(time)
      rafId = requestAnimationFrame(raf)
    }
    rafId = requestAnimationFrame(raf)

    return () => {
      cancelAnimationFrame(rafId)
      lenis.destroy()
      setLenisInstance(null)
    }
  }, [reduced])

  return null
}
