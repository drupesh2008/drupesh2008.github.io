import type { Metadata } from 'next'
import Link from 'next/link'
import AtlasShell from '@/components/Atlas/AtlasShell'
import Hero from '@/components/Atlas/Hero'
import styles from '@/components/Atlas/Atlas.module.css'

export const metadata: Metadata = {
  title: 'About — D Rupesh Kumar',
  description:
    'Senior Vice President, Engineering — building agentic AI and fintech platforms. 7+ years shipping systems across SpaceTech, Geospatial, HR Tech, and FinTech.',
}

export default function About() {
  return (
    <AtlasShell active="about">
      <Hero
        scene="about"
        eyebrow="About me"
        title={<>People.<br />Systems.<br />A brighter tomorrow.</>}
        lede={<>Engineering leadership across<br />fintech, AI and geospatial technology.</>}
        meta={<>Currently SVP of Engineering at Motilal Oswal.<br />Previously SeekOut, Skyserve.ai and LocationIQ.</>}
        tag={<>&nbsp;</>}
        tagR={<>Different domains.<br />A more connected tomorrow.</>}
      />
      <section className={styles.strip}>
        <div className={styles.sec}>
          <h2>How I build</h2>
          <div className={styles.pillars}>
            <div><h3>Hands-on engineering</h3><p>Cloud-native platforms</p></div>
            <div><h3>Teams that ship</h3><p>Cross-domain experience</p></div>
            <div><h3>Systems at scale</h3><p>AI, maps and edge computing</p></div>
          </div>
          <div className={styles.actions}>
            <Link className={`${styles.btn} ${styles.btnLight}`} href="/journey/">Explore my journey →</Link>
            <Link className={`${styles.btn} ${styles.btnLight}`} href="/contact/">Get in touch</Link>
          </div>
        </div>
      </section>
    </AtlasShell>
  )
}
