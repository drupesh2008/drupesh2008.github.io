'use client'

/**
 * /learning — a free, open curriculum.
 *
 * No sign-in, no gating, no email wall. Every link goes to the original
 * author; nothing is mirrored here. Filtering is entirely client-side so the
 * page stays a static file and works with JavaScript disabled down to the
 * point of still rendering every track and link.
 */

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  TRACKS,
  TYPE_LABEL,
  DIFFICULTY_LABEL,
  MODULE_COUNT,
  RESOURCE_COUNT,
  type Difficulty,
  type ResourceType,
} from '@/data/learning'
import styles from './LearningHub.module.css'

const TYPES = Object.keys(TYPE_LABEL) as ResourceType[]
const DIFFICULTIES = Object.keys(DIFFICULTY_LABEL) as Difficulty[]

export default function LearningHub() {
  const [query, setQuery] = useState('')
  const [track, setTrack] = useState<string | null>(null)
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null)
  const [type, setType] = useState<ResourceType | null>(null)

  const q = query.trim().toLowerCase()
  const filtering = Boolean(q || track || difficulty || type)

  /* Filter modules and resources together: a module survives if it still has
     at least one resource once every active filter has been applied. */
  const visible = useMemo(() => {
    return TRACKS.map((t) => {
      if (track && t.id !== track) return { ...t, modules: [] }
      const modules = t.modules
        .filter((m) => !difficulty || m.difficulty === difficulty)
        .map((m) => {
          const resources = m.resources.filter((r) => {
            if (type && r.type !== type) return false
            if (!q) return true
            return (
              r.title.toLowerCase().includes(q) ||
              r.source.toLowerCase().includes(q) ||
              r.note.toLowerCase().includes(q) ||
              m.title.toLowerCase().includes(q) ||
              m.summary.toLowerCase().includes(q) ||
              t.title.toLowerCase().includes(q)
            )
          })
          return { ...m, resources }
        })
        .filter((m) => m.resources.length > 0)
      return { ...t, modules }
    }).filter((t) => t.modules.length > 0)
  }, [q, track, difficulty, type])

  const shown = visible.reduce((n, t) => n + t.modules.reduce((k, m) => k + m.resources.length, 0), 0)

  const reset = () => { setQuery(''); setTrack(null); setDifficulty(null); setType(null) }

  return (
    <div className={styles.root}>
      <div className={styles.wrap}>
        <div className={styles.top}>
          <Link className={styles.back} href="/">← Ground station</Link>
          <div className={styles.topLinks}>
            <Link href="/tech-blogs">Tech blogs</Link>
            <Link href="/about">About</Link>
          </div>
        </div>

        <header className={styles.head}>
          <div className={styles.eyebrow}><span className={styles.bar} /> Free · no sign-in · no paywall</div>
          <h1>Learning</h1>
          <p>
            A structured path through distributed systems, system design, data, AI engineering and the
            fundamentals underneath them — assembled from resources that are{' '}
            <strong>already free to read</strong>. Nothing here is mirrored or resold. Every link goes
            straight to the person who wrote it.
          </p>
          <div className={styles.stats}>
            <span><b>{TRACKS.length}</b> tracks</span>
            <span><b>{MODULE_COUNT}</b> modules</span>
            <span><b>{RESOURCE_COUNT}</b> resources</span>
            <span><b>0</b> accounts required</span>
          </div>
        </header>
      </div>

      <div className={styles.controls}>
        <div className={styles.wrap}>
          <input
            className={styles.search}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search topics, authors, resources…"
            aria-label="Search the curriculum"
          />
          <div className={styles.chipRow}>
            {TRACKS.map((t) => (
              <button
                key={t.id}
                type="button"
                className={`${styles.chip} ${track === t.id ? styles.on : ''}`}
                style={track === t.id ? { color: t.hex } : undefined}
                onClick={() => setTrack(track === t.id ? null : t.id)}
              >
                <span className={styles.chipDot} style={{ background: t.hex }} />
                {t.title}
              </button>
            ))}
          </div>
          <div className={styles.chipRow}>
            {DIFFICULTIES.map((d) => (
              <button
                key={d}
                type="button"
                className={`${styles.chip} ${difficulty === d ? styles.on : ''}`}
                onClick={() => setDifficulty(difficulty === d ? null : d)}
              >
                {DIFFICULTY_LABEL[d]}
              </button>
            ))}
            {TYPES.map((ty) => (
              <button
                key={ty}
                type="button"
                className={`${styles.chip} ${type === ty ? styles.on : ''}`}
                onClick={() => setType(type === ty ? null : ty)}
              >
                {TYPE_LABEL[ty]}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className={styles.wrap}>
        {filtering && (
          <div className={styles.stats} style={{ marginBottom: 24 }}>
            <span><b>{shown}</b> of {RESOURCE_COUNT} shown</span>
            <button
              type="button"
              onClick={reset}
              style={{
                background: 'none', border: 0, padding: 0, cursor: 'pointer',
                font: 'inherit', letterSpacing: 'inherit', textTransform: 'inherit', color: 'var(--signal)',
              }}
            >
              Clear filters
            </button>
          </div>
        )}

        {visible.length === 0 && (
          <div className={styles.empty}>
            Nothing matches that yet.
            <button type="button" onClick={reset}>Clear filters</button>
          </div>
        )}

        {visible.map((t) => (
          <section className={styles.track} key={t.id} id={t.id}>
            <div className={styles.trackHead}>
              <div className={styles.trackTitleRow}>
                <span className={styles.trackDot} style={{ background: t.hex }} />
                <h2 className={styles.trackTitle}>{t.title}</h2>
                <span className={styles.trackTagline}>{t.tagline}</span>
              </div>
              {!filtering && <p className={styles.trackBlurb}>{t.blurb}</p>}
            </div>

            {t.modules.map((m) => (
              <article className={styles.module} key={m.id} id={m.id}>
                <div className={styles.modHead}>
                  <h3 className={styles.modTitle}>{m.title}</h3>
                  <span className={styles.badge}>{DIFFICULTY_LABEL[m.difficulty]}</span>
                </div>
                <p className={styles.modSummary}>{m.summary}</p>
                <ul className={styles.resList}>
                  {m.resources.map((r) => {
                    const internal = r.url.startsWith('/')
                    const Inner = (
                      <>
                        <div className={styles.resTop}>
                          <span className={styles.resType} style={{ background: t.hex }}>
                            {TYPE_LABEL[r.type]}
                          </span>
                          <span className={styles.resTitle}>{r.title}</span>
                          <span className={styles.resSource}>{r.source}</span>
                          {!internal && <span className={styles.ext} aria-hidden="true">↗</span>}
                        </div>
                        <p className={styles.resNote}>{r.note}</p>
                      </>
                    )
                    return (
                      <li key={r.url}>
                        {internal ? (
                          <Link className={styles.res} href={r.url}>{Inner}</Link>
                        ) : (
                          <a
                            className={styles.res}
                            href={r.url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {Inner}
                          </a>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </article>
            ))}
          </section>
        ))}

        <footer className={styles.foot}>
          <p>
            Everything on this page is linked, not copied — the writing belongs to its authors and the
            links go directly to them. If you own something here and would rather it were not listed,
            open an issue on{' '}
            <a href="https://github.com/drupesh2008/drupesh2008.github.io" target="_blank" rel="noopener noreferrer">
              the repository
            </a>{' '}
            and it comes down.
          </p>
          <p>
            Suggestions are welcome the same way. The bar is simple: free to read without an account,
            and good enough that you would send it to a colleague.
          </p>
        </footer>
      </div>
    </div>
  )
}
