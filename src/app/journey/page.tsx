import type { Metadata } from 'next'
import Link from 'next/link'
import AtlasShell from '@/components/Atlas/AtlasShell'
import Hero from '@/components/Atlas/Hero'
import styles from '@/components/Atlas/Atlas.module.css'
import { journeyEntries } from '@/data/journey'

export const metadata: Metadata = {
  title: 'Journey — D Rupesh Kumar',
  description: 'From founding CLAY in 2017 to leading engineering at Motilal Oswal: hardware, geospatial, SpaceTech, AI and fintech.',
}

export default function Journey() {
  return (
    <AtlasShell active="journey">
      <Hero
        scene="journey"
        eyebrow="Journey"
        title={<>A founder’s<br />beginning.<br />A builder’s journey.</>}
        lede={<>CLAY was the first island.<br />The journey kept growing.</>}
        right
        tagR={<>Different domains.<br />A more connected tomorrow.</>}
      />
      <section className={styles.strip}>
        <div className={styles.sec}>
          <p className={styles.kicker}>Selected chapter</p>
          <h2>CLAY - Entrepreneurship</h2>
          <p>Founded a location-based social networking platform. Backend APIs / Android app / Real-time location / User matching.</p>
          <div className={styles.actions}>
            <Link className={`${styles.btn} ${styles.btnDark}`} href="/journey/clay/">Explore the founder story →</Link>
          </div>
        </div>
        <div className={styles.sec} style={{ paddingTop: 0 }}>
          <h2>Every chapter</h2>
          <ol className={styles.timeline}>
            {journeyEntries.map((e) => (
              <li key={e.id}>
                <h3>{e.title}{e.badge && <span className={styles.badge}>{e.badge.text}</span>}</h3>
                <time>{e.period}</time>
                <p>{e.description}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </AtlasShell>
  )
}
