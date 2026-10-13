import type { Metadata } from 'next'
import Link from 'next/link'
import AtlasShell from '@/components/Atlas/AtlasShell'
import Hero from '@/components/Atlas/Hero'
import styles from '@/components/Atlas/Atlas.module.css'

export const metadata: Metadata = {
  title: 'CLAY — The founder story — D Rupesh Kumar',
  description: 'Founded CLAY (2017-2019), a location-based social networking platform, and built the full stack.',
}

const PARTS = [
  ['Backend APIs', 'Build & integrate'],
  ['Android app', 'Design & develop'],
  ['Real-time location', 'Map & connect'],
  ['User matching', 'Find relevant people'],
]

export default function Clay() {
  return (
    <AtlasShell active="journey">
      <Hero
        scene="clay"
        eyebrow="Atlas / Entrepreneurship / CLAY"
        title={<>CLAY.<br />The founder story.</>}
        lede="2017 - 2019 / Founder"
        meta="A location-based social networking platform."
        right
        tag={<>People<br />Places<br />A brighter tomorrow</>}
        tagR={<>People, places.<br />Ideas connect further.</>}
      />
      <section className={styles.strip}>
        <div className={styles.sec}>
          <h2>Built end to end</h2>
          <div className={styles.pillars}>
            {PARTS.map(([a, b]) => <div key={a}><h3>{a}</h3><p>{b}</p></div>)}
          </div>
          <p style={{ marginTop: 30 }}>Founded the platform and built the full stack.</p>
          <div className={styles.actions}>
            <Link className={`${styles.btn} ${styles.btnLight}`} href="/journey/">← Back to the journey</Link>
          </div>
        </div>
      </section>
    </AtlasShell>
  )
}
