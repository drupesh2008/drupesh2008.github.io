'use client'

import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import styles from './PageTracker.module.css'

const PageTracker = () => {
  const [activeSection, setActiveSection] = useState('hero')

  useEffect(() => {
    // Track sections in the order they appear: Hero, Experience, Skills, Projects, Contact
    const allSections = ['hero', 'experience', 'skills', 'current-work', 'contact']
    
    const handleScroll = () => {
      const scrollY = window.scrollY
      const viewportHeight = window.innerHeight
      const viewportMiddle = scrollY + viewportHeight / 2
      
      let currentSection = 'hero'
      
      // Check sections from bottom to top to find the active one
      for (let i = allSections.length - 1; i >= 0; i--) {
        const sectionId = allSections[i]
        const element = document.getElementById(sectionId)
        if (element) {
          const offsetTop = element.offsetTop
          const offsetHeight = element.offsetHeight
          const offsetBottom = offsetTop + offsetHeight
          
          // Check if viewport middle is within this section's bounds
          if (viewportMiddle >= offsetTop && viewportMiddle < offsetBottom) {
            currentSection = sectionId
            break
          }
          // If we've scrolled past this section's top, we're in it
          else if (scrollY >= offsetTop - viewportHeight * 0.3) {
            currentSection = sectionId
            break
          }
        }
      }
      
      setActiveSection(currentSection)
    }

    // Initial check with slight delay to ensure DOM is ready
    const timeoutId = setTimeout(handleScroll, 100)

    // Throttle scroll events for better performance
    let ticking = false
    const throttledHandleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          handleScroll()
          ticking = false
        })
        ticking = true
      }
    }

    window.addEventListener('scroll', throttledHandleScroll, { passive: true })
    window.addEventListener('resize', handleScroll)
    
    return () => {
      clearTimeout(timeoutId)
      window.removeEventListener('scroll', throttledHandleScroll)
      window.removeEventListener('resize', handleScroll)
    }
  }, [])

  // 5 sections total: Hero, Experience, Skills, Projects, Contact
  const sections = [
    { id: 'hero', label: 'Home' },
    { id: 'experience', label: 'Experience' },
    { id: 'skills', label: 'Skills' },
    { id: 'current-work', label: 'Projects' },
    { id: 'contact', label: 'Contact' }
  ]

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <motion.div 
      className={styles.pageTracker}
      initial={{ opacity: 0, x: 100 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay: 1 }}
    >
      <div className={styles.trackerContainer}>
        {sections.map((section, index) => (
          <div key={section.id} className={styles.trackerItemWrapper}>
            <motion.button
              className={`${styles.trackerItem} ${activeSection === section.id ? styles.active : ''}`}
              onClick={() => scrollToSection(section.id)}
              whileHover={{ scale: 1.2 }}
              whileTap={{ scale: 0.9 }}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              aria-label={`Go to ${section.label}`}
            >
              <div className={styles.trackerDot} />
            </motion.button>
            {index < sections.length - 1 && (
              <div className={styles.trackerLine} />
            )}
          </div>
        ))}
      </div>
    </motion.div>
  )
}

export default PageTracker 