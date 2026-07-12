'use client'

import { motion } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import { scrollToSection } from '@/components/SmoothScroll/lenisInstance'
import styles from './Hero.module.css'

const NAME = 'D Rupesh Kumar'
const CHARS = NAME.split('')

// Decorative constellation drawn behind the name (viewBox coords, 0-100 x 0-80).
const STARS = [
  { x: 8, y: 24 },
  { x: 21, y: 58 },
  { x: 34, y: 30 },
  { x: 49, y: 66 },
  { x: 64, y: 28 },
  { x: 79, y: 56 },
  { x: 92, y: 26 },
]

// Domains worked directly in — shown as keyword chips with a short hook each.
const DOMAINS: { name: string; note: string; color: 'accentTeal' | 'accentViolet' | 'accentAmber' }[] = [
  { name: 'FinTech', note: 'e-KYC', color: 'accentTeal' },
  { name: 'SpaceTech', note: 'edge computing', color: 'accentViolet' },
  { name: 'Geospatial', note: 'location without GPS', color: 'accentAmber' },
  { name: 'HR Tech', note: 'sourcing', color: 'accentTeal' },
]

export default function Hero() {
  return (
    <section id="home" className={styles.hero}>
      <svg
        className={styles.constellation}
        viewBox="0 0 100 80"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <motion.polyline
          points={STARS.map((s) => `${s.x},${s.y}`).join(' ')}
          fill="none"
          stroke="rgba(100,255,218,0.22)"
          strokeWidth="0.14"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ delay: 0.3, duration: 1.8, ease: 'easeInOut' }}
        />
        {STARS.map((s, i) => (
          <motion.circle
            key={i}
            cx={s.x}
            cy={s.y}
            r="0.55"
            fill="#64ffda"
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: [0, 1, 0.55], scale: 1 }}
            transition={{ delay: 0.2 + i * 0.12, duration: 1.4, ease: 'easeOut' }}
          />
        ))}
      </svg>

      <div className={styles.inner}>
        <motion.span
          className={styles.hello}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15, duration: 1 }}
        >
          {'// hello world'}
        </motion.span>

        <h1 className={styles.name}>
          <span className="srOnly">{NAME}</span>
          <span aria-hidden="true" className={styles.nameChars}>
            {CHARS.map((ch, i) => (
              <motion.span
                key={i}
                className={ch === ' ' ? styles.space : styles.char}
                initial={{ opacity: 0, y: 26, filter: 'blur(14px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                transition={{ delay: 0.45 + i * 0.055, duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }}
              >
                {ch === ' ' ? ' ' : ch}
              </motion.span>
            ))}
          </span>
        </h1>

        <motion.div
          className={styles.underline}
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ scaleX: 1, opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.9, ease: 'easeOut' }}
        />

        <motion.p
          className={styles.title}
          initial={{ opacity: 0, y: 16, filter: 'blur(8px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ delay: 1.35, duration: 0.7 }}
        >
          Senior Vice President, Engineering
        </motion.p>

        <motion.p
          className={styles.tagline}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.55, duration: 0.7 }}
        >
          Using <span className={styles.accentTeal}>agentic AI</span> to build fintech platforms
          that onboard millions — in record time.
        </motion.p>

        <motion.div
          className={styles.domains}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.72, duration: 0.7 }}
        >
          {DOMAINS.map((d) => (
            <span key={d.name} className={styles.domain}>
              <span className={styles[d.color]}>{d.name}</span>
              {d.note ? <span className={styles.domainNote}>{d.note}</span> : null}
            </span>
          ))}
        </motion.div>

        <motion.div
          className={styles.ctas}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.9, duration: 0.6 }}
        >
          <button className={styles.ctaPrimary} onClick={() => scrollToSection('experience')}>
            View My Work
          </button>
          <a
            className={styles.ctaSecondary}
            href="/Rupesh_Resume_SSE.pdf"
            target="_blank"
            rel="noopener noreferrer"
          >
            Resume
          </a>
        </motion.div>
      </div>

      <motion.button
        className={styles.scrollCue}
        onClick={() => scrollToSection('about')}
        aria-label="Scroll to explore"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.1, duration: 0.8 }}
      >
        <span>SCROLL</span>
        <motion.span
          className={styles.chev}
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
        >
          <ChevronDown size={18} />
        </motion.span>
      </motion.button>
    </section>
  )
}
