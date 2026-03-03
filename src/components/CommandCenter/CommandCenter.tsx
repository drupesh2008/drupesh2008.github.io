'use client'

import { AnimatePresence } from 'framer-motion'
import { useActiveSection } from '@/hooks/useActiveSection'
import { useMobileDetect } from '@/hooks/useMobileDetect'
import ParticleBackground from '@/components/ParticleBackground'
import OrbitalRing from '@/components/OrbitalRing'
import ContentPanel from '@/components/ContentPanel'
import MobileNav from '@/components/MobileNav'
import styles from './CommandCenter.module.css'

export default function CommandCenter() {
  const { activeSection, setSection, goHome } = useActiveSection()
  const isMobile = useMobileDetect()

  return (
    <div className={styles.viewport}>
      <ParticleBackground opacity={activeSection ? 0.3 : 1} />

      {isMobile ? (
        // Mobile layout
        activeSection ? (
          <div className={styles.mobileActive}>
            <ContentPanel section={activeSection} isMobile />
            <MobileNav active={activeSection} onSelect={setSection} onHome={goHome} />
          </div>
        ) : (
          <div className={styles.mobileHero}>
            <OrbitalRing mode="hero-mobile" onSelect={setSection} />
          </div>
        )
      ) : (
        // Desktop layout
        <AnimatePresence mode="wait">
          {activeSection ? (
            <div key="active" className={styles.activeLayout}>
              <OrbitalRing
                mode="compressed"
                activeSection={activeSection}
                onSelect={setSection}
                onHome={goHome}
              />
              <ContentPanel section={activeSection} />
            </div>
          ) : (
            <div key="hero" className={styles.heroLayout}>
              <OrbitalRing mode="hero" onSelect={setSection} />
            </div>
          )}
        </AnimatePresence>
      )}
    </div>
  )
}
