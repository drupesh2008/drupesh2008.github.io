'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
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
        {/* the mark goes back to the landing, not just to the top of this page */}
        <Link className={styles.mark} href="/" aria-label="Back to the ground station">
          <span className={styles.markName}>D. Rupesh Kumar</span>
        </Link>
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
          {/* route links, not scroll targets — these live on their own pages */}
          <Link className={styles.link} href="/learning">Learning</Link>
          <Link className={styles.link} href="/tech-blogs">Blogs</Link>
          <a className={styles.resume} href="/Rupesh_Resume_SSE.pdf" target="_blank" rel="noopener noreferrer">
            Résumé
          </a>
        </nav>
      </header>
    </>
  )
}
