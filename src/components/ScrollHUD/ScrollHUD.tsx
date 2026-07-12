'use client'

import { motion, useScroll } from 'framer-motion'
import { useMobileDetect } from '@/hooks/useMobileDetect'
import { useScrollSpy } from '@/hooks/useScrollSpy'
import { scrollToSection } from '@/components/SmoothScroll/lenisInstance'
import styles from './ScrollHUD.module.css'

const SECTIONS = [
  { id: 'about', label: 'About' },
  { id: 'experience', label: 'Experience' },
  { id: 'journey', label: 'Journey' },
  { id: 'skills', label: 'Skills' },
  { id: 'projects', label: 'Projects' },
  { id: 'contact', label: 'Contact' },
]
const IDS = SECTIONS.map((s) => s.id)

const R = 46

/**
 * The former orbital-ring navigation, repurposed as a fixed scroll HUD:
 * a progress ring with section "satellites" you can click to travel to.
 * On mobile it collapses to a slim top progress bar.
 */
export default function ScrollHUD() {
  const { scrollYProgress } = useScroll()
  const active = useScrollSpy(IDS)
  const isMobile = useMobileDetect()

  if (isMobile) {
    return (
      <motion.div
        className={styles.progressBar}
        style={{ scaleX: scrollYProgress }}
        aria-hidden="true"
      />
    )
  }

  return (
    <nav className={styles.hud} aria-label="Section navigation">
      <svg className={styles.ring} width="120" height="120" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={R} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="2" />
        <g transform="rotate(-90 60 60)">
          <motion.circle
            cx="60"
            cy="60"
            r={R}
            fill="none"
            stroke="var(--accent-primary)"
            strokeWidth="2"
            strokeLinecap="round"
            style={{ pathLength: scrollYProgress }}
          />
        </g>
        {SECTIONS.map((s, i) => {
          const angle = (i / SECTIONS.length) * Math.PI * 2 - Math.PI / 2
          const cx = 60 + Math.cos(angle) * R
          const cy = 60 + Math.sin(angle) * R
          const isActive = active === s.id
          return (
            <circle
              key={s.id}
              className={styles.node}
              cx={cx}
              cy={cy}
              r={isActive ? 5 : 3}
              fill={isActive ? 'var(--accent-primary)' : 'rgba(255,255,255,0.3)'}
              onClick={() => scrollToSection(s.id)}
            >
              <title>{s.label}</title>
            </circle>
          )
        })}
      </svg>

      <button className={styles.center} onClick={() => scrollToSection('home')} aria-label="Back to top">
        DRK
      </button>

      <ul className={styles.labels}>
        {SECTIONS.map((s) => (
          <li key={s.id}>
            <button
              className={`${styles.label} ${active === s.id ? styles.labelActive : ''}`}
              onClick={() => scrollToSection(s.id)}
            >
              {s.label}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  )
}
