'use client'

import { MotionConfig } from 'framer-motion'
import SmoothScroll from '@/components/SmoothScroll'
import SiteNav from '@/components/SiteNav'
import Hero from '@/components/Hero'
import { FadeUp } from '@/components/motion'
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
    <section id={id} className={styles.section}>
      {children}
    </section>
  )
}

function About() {
  return (
    <div className={styles.about}>
      <FadeUp className={styles.header}>
        <h2 className={styles.title}>About</h2>
        <div className={styles.underline} />
      </FadeUp>

      <FadeUp delay={0.05}>
        <p className={styles.lead}>
          I&apos;m an engineering leader and hands-on builder with 7+ years shipping production
          systems where AI meets hard infrastructure.
        </p>
      </FadeUp>

      <FadeUp delay={0.1}>
        <p className={styles.body}>
          Today I&apos;m SVP of Engineering at Motilal Oswal, where I built the e-KYC platform that
          onboards millions of retail customers, lead agentic AI across teams, and am
          re-architecting legacy fintech systems into a modern, cloud-native stack. Before that I
          built agentic AI for hiring at SeekOut, an ML-Ops platform for satellite edge computing as
          a founding engineer at Skyserve, and geolocation APIs serving a billion requests a day at
          LocationIQ.
        </p>
      </FadeUp>

      <FadeUp delay={0.15} className={styles.stats}>
        {STATS.map((s) => (
          <div key={s.label} className={styles.statCard}>
            <span className={styles.statValue}>{s.value}</span>
            <span className={styles.statLabel}>{s.label}</span>
          </div>
        ))}
      </FadeUp>
    </div>
  )
}

export default function OrbitalOdyssey() {
  return (
    <MotionConfig reducedMotion="user">
      <SmoothScroll />
      <SiteNav />

      <main className={styles.main}>
        <Hero />
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
      </main>
    </MotionConfig>
  )
}
