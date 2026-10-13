import type { Metadata } from 'next'
import Link from 'next/link'
import AtlasShell from '@/components/Atlas/AtlasShell'
import Hero from '@/components/Atlas/Hero'
import styles from '@/components/Atlas/Atlas.module.css'
import { PATHWAYS } from '@/data/pathways'
import { CATEGORIES, PAPER_COUNT } from '@/data/papers'
import { projects } from '@/data/projects'

export const metadata: Metadata = {
  title: 'D Rupesh Kumar - Engineering leader, free learning pathways, tech blogs and research papers',
  description:
    'Free learning pathways from zero to professional, an index of 1,000 engineering blog posts and 20 landmark research papers explained, by D Rupesh Kumar, SVP Engineering building agentic AI and fintech platforms.',
  alternates: { canonical: '/' },
}

const CHAIN = ['Hardware', 'Geospatial', 'SpaceTech', 'AI', 'Fintech']
const stat = (id: string) => projects.find((p) => p.id === id)?.stats ?? ''
const stages = PATHWAYS.reduce((n, p) => n + p.stages.length, 0)

export default function Home() {
  const ld = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'WebSite', '@id': 'https://crysthope.com/#site', url: 'https://crysthope.com/', name: 'D Rupesh Kumar', description: 'Engineering leadership, free learning pathways, tech blogs index and research papers explained.' },
      {
        '@type': 'Person', '@id': 'https://crysthope.com/#person', name: 'D Rupesh Kumar', url: 'https://crysthope.com/',
        jobTitle: 'Senior Vice President, Engineering', worksFor: { '@type': 'Organization', name: 'Motilal Oswal Financial Services' },
        sameAs: ['https://github.com/drupesh2008', 'https://in.linkedin.com/in/d-rupesh-kumar'],
        knowsAbout: ['Agentic AI', 'Fintech', 'Geospatial systems', 'Satellite ML Ops', 'Distributed systems', 'System design'],
      },
      {
        '@type': 'ItemList', name: 'Free learning pathways',
        itemListElement: PATHWAYS.map((p, i) => ({ '@type': 'ListItem', position: i + 1, name: p.title, url: `https://crysthope.com/learning/${p.id}/` })),
      },
    ],
  }
  return (
    <AtlasShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <Hero
        scene="home"
        eyebrow="Atlas"
        title={<>A world<br />of systems.</>}
        lede={<>Engineering leadership across<br />fintech, AI and geospatial technology.</>}
        actions={<>
          <Link className={`${styles.btn} ${styles.btnDark}`} href="/journey/">Explore the atlas →</Link>
          <Link className={`${styles.btn} ${styles.btnLight}`} href="/about/">Read my story</Link>
        </>}
        tagR={<>Different domains.<br />A more connected tomorrow.</>}
      />

      <section className={styles.strip} aria-label="Featured">
        <div className={`${styles.stripInner} ${styles.feature}`}>
          <div className={styles.featureBox}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/atlas/project-800.webp" alt="A SpaceTech island with a ground-station dish and a satellite in orbit" width={800} height={450} loading="lazy" decoding="async" />
          </div>
          <div>
            <p className={styles.kicker}>Featured project</p>
            <h2 style={{ margin: 0, fontSize: 'clamp(30px,3vw,40px)', fontWeight: 600 }}>Satellite ML Ops</h2>
            <p style={{ margin: '6px 0 14px', fontSize: 20, color: '#4a5258' }}>From model onboarding to edge deployment.</p>
            <Link className={`${styles.btn} ${styles.btnDark}`} href="/work/satellite-ml-ops/">View project →</Link>
          </div>
          <div>
            <p className={styles.kicker}>Journey across domains</p>
            <ol className={styles.chain}>
              {CHAIN.map((c, i) => (
                <li key={c} className={c === 'SpaceTech' ? styles.on : ''}>
                  <Link href="/journey/"><span className={styles.dot}>{i + 1}</span>{c}</Link>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>
      <section className={styles.strip} aria-labelledby="learn-h">
        <div className={styles.sec}>
          <div className={styles.sectionHead}>
            <div>
              <p className={styles.kicker}>Free to read</p>
              <h2 id="learn-h">Learn, read, explore</h2>
            </div>
            <p>Written and curated here: courses from zero to professional, the engineering blogs worth following, and the papers that shaped software. No sign-in, no paywall.</p>
          </div>
          <div className={styles.cards}>
            <Link href="/learning/" className={styles.card}><h3>Learning pathways</h3><p>Four courses: {PATHWAYS.map((p) => p.title).join(', ')}.</p><small>{stat('learning')}</small></Link>
            <Link href="/research-papers/" className={styles.card}><h3>Research papers, explained</h3><p>{PAPER_COUNT} landmark papers, from MapReduce to Raft, each in plain language with interactive demos.</p><small>{stat('research-papers')}</small></Link>
            <Link href="/tech-blogs/" className={styles.card}><h3>Industry tech blogs</h3><p>One reader over 90+ engineering blogs, filterable by company and topic, refreshed every six hours.</p><small>{stat('tech-blogs')}</small></Link>
          </div>
        </div>
      </section>

      <section className={styles.strip} aria-labelledby="paths-h">
        <div className={styles.sec}>
          <h2 id="paths-h">The four learning pathways</h2>
          <div className={styles.cards}>
            {PATHWAYS.map((p) => (
              <Link key={p.id} href={`/learning/${p.id}/`} className={styles.card}>
                <h3>{p.index}. {p.title}</h3>
                <p>{p.tagline}. {p.blurb.length > 170 ? p.blurb.slice(0, 167).trimEnd() + '...' : p.blurb}</p>
                <small>{p.stages.length} stages · about {Math.round(p.minutes / 60)} hours</small>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.strip} aria-labelledby="papers-h">
        <div className={styles.sec}>
          <h2 id="papers-h">{PAPER_COUNT} research papers, explained</h2>
          {CATEGORIES.map((c) => (
            <div key={c.id} style={{ marginTop: 18 }}>
              <h3 style={{ margin: 0, fontSize: 22 }}>{c.title}</h3>
              <ul className={styles.paperGrid}>
                {c.papers.map((p) => (
                  <li key={p.id}><Link href={`/research-papers/${p.id}/`}>{p.short}<small>{p.year} · {p.minutes} min</small></Link></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>


    </AtlasShell>
  )
}
