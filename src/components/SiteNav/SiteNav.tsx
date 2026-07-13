'use client'

import { useEffect, useState } from 'react'
import { motion, useScroll } from 'framer-motion'
import { scrollToSection } from '@/components/SmoothScroll'
import { useScrollSpy } from '@/hooks/useScrollSpy'
import styles from './SiteNav.module.css'

const LINKS = [
  { id: 'about', label: 'About' },
  { id: 'experience', label: 'Work' },
  { id: 'journey', label: 'Journey' },
  { id: 'skills', label: 'Skills' },
  { id: 'contact', label: 'Contact' },
]
const IDS = LINKS.map((l) => l.id)

export default function SiteNav() {
  const { scrollYProgress } = useScroll()
  const active = useScrollSpy(IDS)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <>
      <motion.div className={styles.progress} style={{ scaleX: scrollYProgress }} aria-hidden="true" />
      <header className={`${styles.nav} ${scrolled ? styles.navScrolled : ''}`}>
        <button className={styles.mark} onClick={() => scrollToSection('home')} aria-label="Back to top">
          <span className={styles.markName}>D. Rupesh Kumar</span>
        </button>
        <nav className={styles.links} aria-label="Sections">
          {LINKS.map((l) => (
            <button
              key={l.id}
              className={`${styles.link} ${active === l.id ? styles.linkActive : ''}`}
              onClick={() => scrollToSection(l.id)}
            >
              {l.label}
            </button>
          ))}
          <a className={styles.resume} href="/Rupesh_Resume_SSE.pdf" target="_blank" rel="noopener noreferrer">
            Résumé
          </a>
        </nav>
      </header>
    </>
  )
}
