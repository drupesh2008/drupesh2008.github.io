'use client'

import { motion } from 'framer-motion'
import SmoothScroll from '@/components/SmoothScroll'
import SpaceScene from '@/components/SpaceScene'
import ScrollHUD from '@/components/ScrollHUD'
import Hero from '@/components/Hero'
import WorkExperience from '@/components/WorkExperience/WorkExperience'
import Journey from '@/components/Journey/Journey'
import Skills from '@/components/Skills/Skills'
import Projects from '@/components/Projects/Projects'
import Contact from '@/components/Contact/Contact'
import styles from './OrbitalOdyssey.module.css'

const STATS = [
  { value: '1B+', label: 'Daily API requests' },
  { value: '50M+', label: 'Developer profiles' },
  { value: '80%', label: 'Perf gains delivered' },
  { value: '7+', label: 'Years shipping systems' },
]

function Section({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <motion.section
      id={id}
      className={styles.section}
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.7, ease: 'easeOut' }}
    >
      {children}
    </motion.section>
  )
}

function About() {
  return (
    <div className={styles.about}>
      <div className={styles.header}>
        <h2 className={styles.title}>About</h2>
        <div className={styles.underline} />
      </div>

      <p className={styles.lead}>
        I&apos;m a Senior Software Engineer and engineering leader with 7+ years shipping
        production systems where AI meets hard infrastructure.
      </p>
      <p className={styles.body}>
        Today I&apos;m SVP of Engineering at Motilal Oswal, leading agentic AI and
        re-architecting legacy fintech platforms into modern, cloud-native systems. Before that
        I built agentic AI for hiring at SeekOut, an ML-Ops platform for satellite edge computing
        as a founding engineer at Skyserve, and geolocation APIs serving a billion requests a day
        at LocationIQ.
      </p>

      <div className={styles.stats}>
        {STATS.map((s) => (
          <div key={s.label} className={styles.statCard}>
            <span className={styles.statValue}>{s.value}</span>
            <span className={styles.statLabel}>{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function OrbitalOdyssey() {
  return (
    <>
      <SmoothScroll />
      <SpaceScene />
      <ScrollHUD />

      <main className={styles.main}>
        <Hero />

        <div className={styles.belowFold}>
          <Section id="about">
            <About />
          </Section>
          <Section id="experience">
            <WorkExperience />
          </Section>
          <Section id="journey">
            <Journey />
          </Section>
          <Section id="skills">
            <Skills />
          </Section>
          <Section id="projects">
            <Projects />
          </Section>
          <Section id="contact">
            <Contact />
          </Section>
        </div>
      </main>
    </>
  )
}
