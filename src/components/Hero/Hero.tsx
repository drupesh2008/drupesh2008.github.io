'use client'

import { useRef } from 'react'
import dynamic from 'next/dynamic'
import { motion, useScroll, useTransform } from 'framer-motion'
import { Reveal, FadeUp, Magnetic, Marquee } from '@/components/motion'
import { scrollToSection } from '@/components/SmoothScroll'
import { useMobileDetect } from '@/hooks/useMobileDetect'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import styles from './Hero.module.css'

const GlassScene = dynamic(() => import('@/components/GlassHero'), { ssr: false })

const DOMAINS = [
  { name: 'FinTech', note: 'e-KYC' },
  { name: 'SpaceTech', note: 'edge computing' },
  { name: 'Geospatial', note: 'location without GPS' },
  { name: 'HR Tech', note: 'sourcing' },
]

const MARQUEE = [
  'Agentic AI',
  'e-KYC',
  'Satellite edge',
  '1B requests / day',
  'Voice AI',
  'Geospatial',
  '50M profiles',
]

export default function Hero() {
  const ref = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] })
  const contentY = useTransform(scrollYProgress, [0, 1], [0, -60])
  const contentOpacity = useTransform(scrollYProgress, [0, 0.75], [1, 0])
  const isMobile = useMobileDetect()
  const reduced = useReducedMotion()

  return (
    <section id="home" className={styles.hero} ref={ref}>
      {!isMobile && !reduced && <GlassScene />}
      <motion.div className={styles.inner} style={{ y: contentY, opacity: contentOpacity }}>
        <FadeUp className={styles.eyebrow} delay={0.1}>
          <span className={styles.dot} /> Senior Vice President, Engineering — Motilal Oswal
        </FadeUp>

        <h1 className={styles.name}>
          <span className="srOnly">D Rupesh Kumar</span>
          <span aria-hidden="true">
            <Reveal onMount delay={0.05}>D Rupesh</Reveal>
            <Reveal onMount delay={0.13}>Kumar</Reveal>
          </span>
        </h1>

        <div className={styles.lower}>
          <FadeUp className={styles.statement} delay={0.32}>
            Using <span className={styles.accent}>agentic AI</span> to build fintech platforms that
            onboard millions.
          </FadeUp>

          <div className={styles.lowerRight}>
            <FadeUp className={styles.domains} delay={0.42}>
              {DOMAINS.map((d) => (
                <span key={d.name} className={styles.domain}>
                  <span className={styles.domainName}>{d.name}</span>
                  <span className={styles.domainNote}>{d.note}</span>
                </span>
              ))}
            </FadeUp>

            <FadeUp className={styles.ctas} delay={0.5}>
              <Magnetic>
                <button className={styles.ctaPrimary} onClick={() => scrollToSection('experience')}>
                  View my work
                </button>
              </Magnetic>
              <Magnetic>
                <a
                  className={styles.ctaSecondary}
                  href="/Rupesh_Resume_SSE.pdf"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Résumé
                </a>
              </Magnetic>
            </FadeUp>
          </div>
        </div>
      </motion.div>

      <div className={styles.marquee} aria-hidden="true">
        <Marquee baseVelocity={2.4}>
          {MARQUEE.map((m, i) => (
            <span key={i} className={styles.marqueeItem}>
              {m}
              <span className={styles.marqueeStar}>✳</span>
            </span>
          ))}
        </Marquee>
      </div>
    </section>
  )
}
