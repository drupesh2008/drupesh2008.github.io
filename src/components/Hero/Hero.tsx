'use client'

import { motion } from 'framer-motion'
import { fadeInUp, staggerContainer, textReveal } from '@/animations/variants'
import styles from './Hero.module.css'

const Hero = () => {
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
    }
  }

  const handleResumeDownload = () => {
    window.open('/Rupesh_Resume_SSE.pdf', '_blank')
  }

  return (
    <section className={styles.hero} id="hero">
      <motion.div
        className={styles.container}
        variants={staggerContainer}
        initial="initial"
        animate="animate"
      >
        {/* Navigation Tabs */}
        <motion.nav className={styles.navigation} variants={fadeInUp}>
          <div className={styles.navTabs}>
            <button
              className={styles.navTab}
              onClick={() => scrollToSection('about')}
            >
              About
            </button>
            <button
              className={styles.navTab}
              onClick={() => scrollToSection('experience')}
            >
              Experience
            </button>
            <button
              className={styles.navTab}
              onClick={() => scrollToSection('projects')}
            >
              Projects
            </button>
            <button
              className={styles.navTab}
              onClick={() => scrollToSection('blog')}
            >
              Blog
            </button>
            <button
              className={styles.navTab}
              onClick={() => scrollToSection('contact')}
            >
              Contact
            </button>
          </div>
        </motion.nav>

        {/* Main Content */}
        <motion.div className={styles.content} variants={fadeInUp}>
          <motion.h1 className={styles.name} variants={textReveal}>
            Hi there, I'm{' '}
            <span className={styles.highlight}>D Rupesh Kumar</span>
          </motion.h1>

          <motion.h2 className={styles.title} variants={textReveal}>
            Backend Developer & Entrepreneur
          </motion.h2>

          <motion.p className={styles.description} variants={textReveal}>
            Developer with 6+ years of professional experience in SpaceTech, Geospatial,
            and HR Tech domains. Currently reshaping the Hiring world to enable fast hiring 
            processes and better visibility to all candidates through Agentic AI, Data Engineering,
            and large-scale distributed systems.
          </motion.p>

          <motion.div className={styles.badges} variants={fadeInUp}>
            <span className={styles.badge}>Backend Developer</span>
            <span className={styles.badge}>Entrepreneur</span>
            <span className={styles.badge}>Founding Engineer</span>
            <span className={styles.badge}>SpaceTech</span>
            <span className={styles.badge}>GeoSpatial</span>
            <span className={styles.badge}>Infrastructure Engineering</span>
          </motion.div>

          <motion.div className={styles.actions} variants={fadeInUp}>
            <button className={styles.primaryButton}>
              View Projects
            </button>
            <button 
              className={styles.secondaryButton}
              onClick={handleResumeDownload}
            >
              Download Resume
            </button>
          </motion.div>
        </motion.div>

        {/* Scroll Indicator */}
        <motion.div
          className={styles.scrollIndicator}
          animate={{
            y: [0, 10, 0]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          <div className={styles.scrollArrow}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path
                d="M7 13L12 18L17 13"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M7 6L12 11L17 6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <span className={styles.scrollText}>Scroll to explore</span>
        </motion.div>

        {/* Floating Elements */}
        <motion.div
          className={styles.floatingElements}
          animate={{
            y: [0, -10, 0],
            rotate: [0, 5, 0]
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          <div className={styles.floatingDot}></div>
          <div className={styles.floatingDot}></div>
          <div className={styles.floatingDot}></div>
        </motion.div>
      </motion.div>
    </section>
  )
}

export default Hero 