'use client'

import { motion } from 'framer-motion'
import { House } from 'lucide-react'
import { orbitalStagger, identityReveal } from '@/animations/variants'
import type { ActiveSection } from '@/hooks/useActiveSection'
import OrbitalNode from './OrbitalNode'
import styles from './OrbitalRing.module.css'

const SECTIONS: (ActiveSection & string)[] = ['journey', 'experience', 'projects', 'contact', 'skills']

interface Props {
  mode: 'hero' | 'compressed' | 'hero-mobile'
  activeSection?: ActiveSection
  onSelect: (section: ActiveSection) => void
  onHome?: () => void
}

export default function OrbitalRing({ mode, activeSection, onSelect, onHome }: Props) {
  const isCompressed = mode === 'compressed'
  const isMobileHero = mode === 'hero-mobile'
  const ringSize = isCompressed ? 180 : isMobileHero ? 230 : 400
  const containerClass = isCompressed ? styles.compressed : isMobileHero ? styles.heroMobile : styles.hero

  return (
    <motion.div
      className={`${styles.container} ${containerClass}`}
      layout
      transition={{ type: 'spring', stiffness: 200, damping: 25 }}
    >
      {/* Ring SVG */}
      <svg
        className={styles.ringSvg}
        width={ringSize + 40}
        height={ringSize + 40}
        viewBox={`0 0 ${ringSize + 40} ${ringSize + 40}`}
      >
        <motion.circle
          cx={(ringSize + 40) / 2}
          cy={(ringSize + 40) / 2}
          r={ringSize / 2}
          fill="none"
          stroke={isCompressed ? 'var(--ring-stroke-compressed)' : 'var(--ring-stroke)'}
          strokeWidth={isCompressed ? 1 : 1.5}
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 1.5, ease: 'easeInOut' }}
        />
      </svg>

      {/* Center identity */}
      <motion.div
        className={styles.identity}
        variants={identityReveal}
        initial="initial"
        animate="animate"
        layout
        layoutId="identity"
      >
        {isCompressed ? (
          <>
            <span className={styles.initials}>DRK</span>
            <button
              className={styles.homeButton}
              onClick={onHome}
              aria-label="Return to home"
            >
              <House size={12} />
            </button>
          </>
        ) : (
          <>
            <h1 className={isMobileHero ? styles.nameMobile : styles.name}>
              D Rupesh Kumar
            </h1>
            <p className={isMobileHero ? styles.subtitleMobile : styles.subtitle}>
              Senior Software Engineer
            </p>
            <p className={isMobileHero ? styles.taglineMobile : styles.tagline}>
              {isMobileHero
                ? 'SpaceTech · Geospatial · HR Tech'
                : 'Building production systems across SpaceTech, Geospatial, and HR Tech'
              }
            </p>
          </>
        )}
      </motion.div>

      {/* Navigation nodes */}
      <motion.div
        className={styles.nodesContainer}
        variants={orbitalStagger}
        initial="initial"
        animate="animate"
      >
        {SECTIONS.map((section, i) => (
          <OrbitalNode
            key={section}
            section={section}
            mode={mode}
            isActive={activeSection === section}
            onSelect={onSelect}
            delay={i}
          />
        ))}
      </motion.div>

      {/* CTAs — hero mode only */}
      {!isCompressed && (
        <motion.div
          className={isMobileHero ? styles.ctasMobile : styles.ctas}
          initial={{ opacity: 0, y: 20, x: '-50%' }}
          animate={{ opacity: 1, y: 0, x: '-50%' }}
          transition={{ delay: 1.6, duration: 0.5 }}
        >
          <motion.button
            className={styles.ctaPrimary}
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onSelect('experience')}
          >
            View My Work
          </motion.button>
          <motion.a
            className={styles.ctaSecondary}
            href="/Rupesh_Resume_SSE.pdf"
            target="_blank"
            rel="noopener noreferrer"
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.97 }}
          >
            Resume
          </motion.a>
        </motion.div>
      )}

      {/* Hello world comment — hero only */}
      {!isCompressed && !isMobileHero && (
        <motion.span
          className={styles.helloWorld}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.8 }}
        >
          {'// hello world'}
        </motion.span>
      )}
      {isMobileHero && (
        <motion.span
          className={styles.helloWorldMobile}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.8 }}
        >
          {'// hello world'}
        </motion.span>
      )}
    </motion.div>
  )
}
