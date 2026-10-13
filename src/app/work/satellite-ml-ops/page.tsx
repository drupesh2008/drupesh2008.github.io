import type { Metadata } from 'next'
import Link from 'next/link'
import AtlasShell from '@/components/Atlas/AtlasShell'
import Hero from '@/components/Atlas/Hero'
import styles from '@/components/Atlas/Atlas.module.css'

export const metadata: Metadata = {
  title: 'Satellite ML Ops — D Rupesh Kumar',
  description: 'An ML Ops platform for satellite edge computing at Skyserve.ai: model onboarding from months to 2-3 days.',
}

export default function Project() {
  return (
    <AtlasShell active="work">
      <Hero
        scene="project"
        eyebrow="Atlas / SpaceTech / Case study"
        title={<>Satellite<br />ML Ops</>}
        lede={<>From model onboarding<br />to the edge of space.</>}
        meta="Skyserve.ai / Lead & Founding Engineer / 2022-2024"
        right
        actions={<Link className={`${styles.btn} ${styles.btnLight}`} href="/work/">Back to work</Link>}
        tagR={<>Higher perspective.<br />A more connected tomorrow.</>}
      />
      <section className={styles.strip} aria-label="Outcomes">
        <div className={`${styles.stripInner} ${styles.cols3}`}>
          <div className={styles.stat}><b>2-3 days</b><span>Model onboarding</span></div>
          <div className={styles.stat}><b>700+</b><span>Datasets processed</span></div>
          <div className={styles.stat}><b>4</b><span>Products shipped</span></div>
        </div>
      </section>
      <section className={styles.strip}>
        <div className={styles.sec}>
          <h2>The challenge</h2>
          <p>Make satellite AI models easier to onboard and deploy. The platform cut AI model onboarding for satellite edge computing from months to 2-3 days.</p>
          <ul>
            <li>Data rendering system processing 700+ datasets, with 70% faster rendering.</li>
            <li>Led a 6-person engineering team shipping 4 products: SURGE, STORM, a synthetic image generator (250+ frames) and an analytics dashboard.</li>
          </ul>
        </div>
      </section>
    </AtlasShell>
  )
}
