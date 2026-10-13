import type { Metadata } from 'next'
import Link from 'next/link'
import AtlasShell from '@/components/Atlas/AtlasShell'
import Hero from '@/components/Atlas/Hero'
import styles from '@/components/Atlas/Atlas.module.css'
import { projects } from '@/data/projects'
import { experiences } from '@/data/experience'

export const metadata: Metadata = {
  title: 'Work — D Rupesh Kumar',
  description: 'Selected work across fintech, AI, SpaceTech and geospatial systems, plus free learning projects.',
}

export default function Work() {
  return (
    <AtlasShell active="work">
      <Hero
        scene="project"
        eyebrow="Atlas / Work"
        title={<>Selected<br />work.</>}
        lede="Systems built across SpaceTech, geospatial, AI and fintech."
        right
        actions={<Link className={`${styles.btn} ${styles.btnDark}`} href="/work/satellite-ml-ops/">Satellite ML Ops →</Link>}
      />
      <section className={styles.strip}>
        <div className={styles.sec}>
          <h2>Roles</h2>
          <div className={styles.cards}>
            {experiences.map((e) => (
              <div key={e.id} className={styles.card}>
                <h3>{e.company}</h3>
                <p>{e.role}</p>
                <small>{e.period}</small>
              </div>
            ))}
          </div>
          <h2 style={{ marginTop: 48 }}>Projects on this site</h2>
          <div className={styles.cards}>
            {projects.map((p) => {
              const body = (<><h3>{p.name}</h3><p>{p.teaser.slice(0, 150).trimEnd()}…</p>{p.stats && <small>{p.stats}</small>}</>)
              return p.href ? (
                <Link key={p.id} href={p.href} className={styles.card}>{body}</Link>
              ) : (
                <div key={p.id} className={styles.card}>{body}</div>
              )
            })}
          </div>
        </div>
      </section>
    </AtlasShell>
  )
}
