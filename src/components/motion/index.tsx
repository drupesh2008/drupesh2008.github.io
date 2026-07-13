'use client'

import { ReactNode, useRef, useState } from 'react'
import {
  motion,
  useMotionValue,
  useScroll,
  useVelocity,
  useSpring,
  useTransform,
  useAnimationFrame,
  useReducedMotion,
  wrap,
} from 'framer-motion'

const EASE = [0.16, 1, 0.3, 1] as const

/** Masked line reveal — the inner element slides up from behind an overflow clip. */
export function Reveal({
  children,
  delay = 0,
  className,
  onMount = false,
}: {
  children: ReactNode
  delay?: number
  className?: string
  onMount?: boolean
}) {
  // A masked reveal starts translated fully out of the clip, so observing the
  // moving element with whileInView never fires for content already on screen.
  // onMount plays immediately (use it for above-the-fold headings).
  const trigger = onMount
    ? { animate: { y: '0%' } }
    : {
        whileInView: { y: '0%' },
        viewport: { once: true, margin: '0px 0px -8% 0px' },
      }
  return (
    <span className={className} style={{ display: 'block', overflow: 'hidden', paddingBottom: '0.08em' }}>
      <motion.span
        style={{ display: 'block', willChange: 'transform' }}
        initial={{ y: '115%' }}
        {...trigger}
        transition={{ duration: 0.9, ease: EASE, delay }}
      >
        {children}
      </motion.span>
    </span>
  )
}

/** Fade + rise for blocks entering the viewport. */
export function FadeUp({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode
  delay?: number
  className?: string
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 26 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -8% 0px' }}
      transition={{ duration: 0.7, ease: EASE, delay }}
    >
      {children}
    </motion.div>
  )
}

/** Magnetic hover — pulls toward the cursor, springs back on leave (pointer devices only). */
export function Magnetic({
  children,
  className,
  strength = 0.35,
}: {
  children: ReactNode
  className?: string
  strength?: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  return (
    <motion.div
      ref={ref}
      className={className}
      onMouseMove={(e) => {
        const el = ref.current
        if (!el) return
        const r = el.getBoundingClientRect()
        setPos({
          x: (e.clientX - (r.left + r.width / 2)) * strength,
          y: (e.clientY - (r.top + r.height / 2)) * strength,
        })
      }}
      onMouseLeave={() => setPos({ x: 0, y: 0 })}
      animate={{ x: pos.x, y: pos.y }}
      transition={{ type: 'spring', stiffness: 260, damping: 18, mass: 0.4 }}
      style={{ display: 'inline-block' }}
    >
      {children}
    </motion.div>
  )
}

/** Velocity-reactive marquee — drifts continuously and speeds/reverses with scroll. */
export function Marquee({
  children,
  baseVelocity = 2.5,
  className,
}: {
  children: ReactNode
  baseVelocity?: number
  className?: string
}) {
  const reduced = useReducedMotion()
  const baseX = useMotionValue(0)
  const { scrollY } = useScroll()
  const scrollVelocity = useVelocity(scrollY)
  const smoothVelocity = useSpring(scrollVelocity, { damping: 50, stiffness: 400 })
  const velocityFactor = useTransform(smoothVelocity, [0, 1000], [0, 5], { clamp: false })
  const x = useTransform(baseX, (v) => `${wrap(-20, -45, v)}%`)
  const directionFactor = useRef(1)

  useAnimationFrame((_, delta) => {
    if (reduced) return
    let moveBy = directionFactor.current * baseVelocity * (delta / 1000)
    if (velocityFactor.get() < 0) directionFactor.current = -1
    else if (velocityFactor.get() > 0) directionFactor.current = 1
    moveBy += directionFactor.current * moveBy * velocityFactor.get()
    baseX.set(baseX.get() + moveBy)
  })

  return (
    <div className={className} style={{ overflow: 'hidden', display: 'flex', flexWrap: 'nowrap', whiteSpace: 'nowrap' }}>
      <motion.div style={{ x, display: 'flex', flexWrap: 'nowrap', whiteSpace: 'nowrap' }}>
        {[0, 1, 2, 3].map((i) => (
          <span key={i} style={{ display: 'block', flexShrink: 0, paddingRight: '1rem' }}>
            {children}
          </span>
        ))}
      </motion.div>
    </div>
  )
}
