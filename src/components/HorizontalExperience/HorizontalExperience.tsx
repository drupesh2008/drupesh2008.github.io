'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import { experiences } from '@/data/experience'
import { useMobileDetect } from '@/hooks/useMobileDetect'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import styles from './HorizontalExperience.module.css'

const TAG_TEXT: Record<string, string> = {
  teal: 'var(--c-teal)',
  violet: 'var(--c-violet)',
  amber: 'var(--c-amber)',
}
const TAG_SURFACE: Record<string, { bg: string; border: string }> = {
  teal: { bg: 'var(--tag-teal-bg)', border: 'var(--tag-teal-border)' },
  violet: { bg: 'var(--tag-violet-bg)', border: 'var(--tag-violet-border)' },
  amber: { bg: 'var(--tag-amber-bg)', border: 'var(--tag-amber-border)' },
}

function Cards({ horizontal }: { horizontal: boolean }) {
  return (
    <>
      <div className={styles.intro}>
        <span className={styles.kicker}>Experience</span>
        <h2 className={styles.title}>
          Where I&apos;ve
          <br />
          shipped.
        </h2>
        {horizontal && (
          <span className={styles.hint}>
            Scroll <span className={styles.arrow}>↓</span>
          </span>
        )}
      </div>

      {experiences.map((c, i) => (
        <article key={c.id} className={styles.card}>
          <div className={styles.cardTop}>
            <span className={styles.index}>{String(i + 1).padStart(2, '0')}</span>
            <span className={styles.period}>{c.period}</span>
          </div>
          <h3 className={styles.company}>{c.company}</h3>
          <span className={styles.role}>{c.role}</span>
          <ul className={styles.bullets}>
            {c.bullets.map((b, j) => (
              <li key={j} className={styles.bullet}>
                {b}
              </li>
            ))}
          </ul>
          <div className={styles.tags}>
            {c.techTags.map((t) => (
              <span
                key={t.name}
                className={styles.tag}
                style={{
                  color: TAG_TEXT[t.color],
                  background: TAG_SURFACE[t.color].bg,
                  borderColor: TAG_SURFACE[t.color].border,
                }}
              >
                {t.name}
              </span>
            ))}
          </div>
        </article>
      ))}
    </>
  )
}

export default function HorizontalExperience() {
  const isMobile = useMobileDetect()
  const reduced = useReducedMotion()
  const horizontal = !isMobile && !reduced

  const wrapRef = useRef<HTMLElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const [distance, setDistance] = useState(0)

  const { scrollYProgress } = useScroll({ target: wrapRef, offset: ['start start', 'end end'] })
  const x = useTransform(scrollYProgress, [0, 1], [0, -distance])

  useEffect(() => {
    if (!horizontal) {
      setDistance(0)
      return
    }
    const measure = () => {
      const track = trackRef.current
      if (!track) return
      setDistance(Math.max(0, track.scrollWidth - window.innerWidth))
    }
    measure()
    const t = setTimeout(measure, 350) // re-measure once fonts/layout settle
    window.addEventListener('resize', measure)
    return () => {
      clearTimeout(t)
      window.removeEventListener('resize', measure)
    }
  }, [horizontal])

  if (!horizontal) {
    return (
      <section id="experience" className={styles.stackSection}>
        <div className={styles.stack}>
          <Cards horizontal={false} />
        </div>
      </section>
    )
  }

  return (
    <section
      id="experience"
      ref={wrapRef}
      className={styles.wrap}
      style={{ height: `calc(100vh + ${distance}px)` }}
    >
      <div className={styles.sticky}>
        <motion.div ref={trackRef} className={styles.track} style={{ x }}>
          <Cards horizontal />
        </motion.div>
      </div>
    </section>
  )
}
