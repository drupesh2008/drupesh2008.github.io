'use client'

/**
 * /tech-blogs — one place to read what the good engineering teams published.
 *
 * Every card links straight to the publisher. We store a title, a date, the
 * excerpt they put in their own feed, and the canonical URL — nothing else,
 * and no article body. The index is refreshed by a scheduled workflow and
 * served as a static JSON file, so this page stays a static export.
 */

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { FEEDS, TOPICS, SECTORS, type FeedIndex, type Post } from '@/data/feeds'
import styles from './TechBlogs.module.css'

const PAGE = 30
const FRESH_HOURS = 36

const hostOf = (url: string) => {
  try { return new URL(url).hostname.replace(/^www\./, '') } catch { return '' }
}

const when = (iso: string) => {
  const d = new Date(iso)
  if (Number.isNaN(d.valueOf())) return ''
  const days = Math.floor((Date.now() - d.valueOf()) / 864e5)
  if (days <= 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 30) return `${days}d ago`
  return d.toLocaleDateString(undefined, { month: 'short', year: 'numeric' })
}

export default function TechBlogs() {
  const [index, setIndex] = useState<FeedIndex | null>(null)
  const [failedToLoad, setFailedToLoad] = useState(false)
  const [query, setQuery] = useState('')
  const [companies, setCompanies] = useState<string[]>([])
  const [topics, setTopics] = useState<string[]>([])
  const [limit, setLimit] = useState(PAGE)

  useEffect(() => {
    let alive = true
    fetch('/data/tech-blogs.json', { cache: 'no-cache' })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: FeedIndex) => { if (alive) setIndex(d) })
      .catch(() => { if (alive) setFailedToLoad(true) })
    return () => { alive = false }
  }, [])

  const posts = useMemo(() => index?.posts ?? [], [index])

  const toggle = (list: string[], set: (v: string[]) => void, id: string) => {
    set(list.includes(id) ? list.filter((x) => x !== id) : [...list, id])
    setLimit(PAGE)
  }

  const q = query.trim().toLowerCase()
  const filtered = useMemo(() => {
    return posts.filter((p: Post) => {
      if (companies.length && !companies.includes(p.slug)) return false
      if (topics.length && !p.topics.some((t) => topics.includes(t))) return false
      if (!q) return true
      return (
        p.title.toLowerCase().includes(q) ||
        p.excerpt.toLowerCase().includes(q) ||
        p.company.toLowerCase().includes(q)
      )
    })
  }, [posts, companies, topics, q])

  /* counts shown next to each filter, so empty options are obvious up front */
  const perCompany = useMemo(() => {
    const m = new Map<string, number>()
    for (const p of posts) m.set(p.slug, (m.get(p.slug) ?? 0) + 1)
    return m
  }, [posts])
  const perTopic = useMemo(() => {
    const m = new Map<string, number>()
    for (const p of posts) for (const t of p.topics) m.set(t, (m.get(t) ?? 0) + 1)
    return m
  }, [posts])

  /* count the sources actually carrying posts, not the ones we ask for — a
     handful sit behind a WAF or render their blog client-side, so they publish
     no feed we can read and would otherwise be advertised as live */
  const liveSources = perCompany.size

  const anyFilter = companies.length > 0 || topics.length > 0 || q.length > 0
  const reset = () => { setCompanies([]); setTopics([]); setQuery(''); setLimit(PAGE) }

  const freshCutoff = Date.now() - FRESH_HOURS * 36e5
  const updated = index?.generatedAt ? when(index.generatedAt) : null

  return (
    <div className={styles.root}>
      <div className={styles.wrap}>
        <div className={styles.top}>
          <Link className={styles.back} href="/">← Ground station</Link>
          <div className={styles.topLinks}>
            <Link href="/learning">Learning</Link>
            <Link href="/about">About</Link>
          </div>
        </div>

        <header className={styles.head}>
          <div className={styles.eyebrow}><span className={styles.bar} /> Free · no sign-in · links out</div>
          <h1>Industry tech blogs</h1>
          <p>
            The engineering writing from the teams worth reading, in one place, filtered by who wrote
            it and what it is about. Every card links <strong>straight to the original</strong> — nothing
            is republished here, and there is no reader wall between you and the author.
          </p>
          <div className={styles.meta}>
            <span><b>{posts.length}</b> posts</span>
            <span><b>{liveSources || FEEDS.length}</b> sources</span>
            {updated && <span>updated <b>{updated}</b></span>}
          </div>
        </header>

        <div className={styles.cols}>
          <aside className={styles.side}>
            <input
              className={styles.search}
              type="search"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setLimit(PAGE) }}
              placeholder="Search titles and excerpts…"
              aria-label="Search posts"
            />

            <div className={styles.group}>
              <div className={styles.groupHead}>
                <span>Topics</span>
                {topics.length > 0 && (
                  <button type="button" className={styles.clear} onClick={() => setTopics([])}>reset</button>
                )}
              </div>
              <div className={styles.opts}>
                {TOPICS.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    className={`${styles.opt} ${topics.includes(t.id) ? styles.on : ''}`}
                    onClick={() => toggle(topics, setTopics, t.id)}
                  >
                    {t.label}
                    <span className={styles.optCount}>{perTopic.get(t.id) ?? 0}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.group}>
              <div className={styles.groupHead}>
                <span>Companies</span>
                {companies.length > 0 && (
                  <button type="button" className={styles.clear} onClick={() => setCompanies([])}>reset</button>
                )}
              </div>
              <div className={styles.opts}>
                {SECTORS.map((sector) => {
                  const inSector = FEEDS.filter((f) => f.sector === sector)
                  if (!inSector.length) return null
                  return (
                    <div key={sector} style={{ display: 'contents' }}>
                      <div className={styles.sectorLabel}>{sector}</div>
                      {inSector.map((f) => {
                        /* a source with nothing to show is still worth listing — it says we
                           track it — but clicking it would only ever return an empty page */
                        const n = perCompany.get(f.slug) ?? 0
                        return (
                          <button
                            key={f.slug}
                            type="button"
                            disabled={index != null && n === 0}
                            title={index != null && n === 0 ? `${f.company} is not publishing a readable feed right now` : undefined}
                            className={`${styles.opt} ${companies.includes(f.slug) ? styles.on : ''}`}
                            onClick={() => toggle(companies, setCompanies, f.slug)}
                          >
                            {f.company}
                            <span className={styles.optCount}>{n}</span>
                          </button>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
            </div>
          </aside>

          <main>
            {anyFilter && (
              <div className={styles.meta} style={{ marginTop: 0, marginBottom: 14 }}>
                <span><b>{filtered.length}</b> matching</span>
                <button type="button" className={styles.clear} onClick={reset}>Clear all</button>
              </div>
            )}

            {!index && !failedToLoad && (
              <div className={styles.state}>Loading the index…</div>
            )}

            {failedToLoad && (
              <div className={styles.state}>
                <b>Could not load the index</b>
                The feed index could not be fetched. It is a static file at{' '}
                <code>/data/tech-blogs.json</code>, so this usually means the refresh workflow has not
                run yet.
              </div>
            )}

            {index && posts.length === 0 && (
              <div className={styles.state}>
                <b>Awaiting the first sync</b>
                The index is empty. Run the <em>Refresh tech blog feeds</em> workflow — it fetches every
                source and fills this page.
              </div>
            )}

            {index && posts.length > 0 && filtered.length === 0 && (
              <div className={styles.state}>
                <b>Nothing matches that</b>
                Try removing a filter.
              </div>
            )}

            {filtered.length > 0 && (
              <>
                <div className={styles.list}>
                  {filtered.slice(0, limit).map((p) => {
                    const isFresh = new Date(p.published).valueOf() > freshCutoff
                    return (
                      <a
                        key={p.id}
                        className={styles.card}
                        href={p.url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <div className={styles.cardTop}>
                          <span className={styles.company}>{p.company}</span>
                          <span className={styles.date}>{when(p.published)}</span>
                          {isFresh && <span className={styles.fresh}>New</span>}
                          <span className={styles.host}>{hostOf(p.url)} ↗</span>
                        </div>
                        <h2 className={styles.cardTitle}>{p.title}</h2>
                        {p.excerpt && <p className={styles.excerpt}>{p.excerpt}</p>}
                        {p.topics.length > 0 && (
                          <div className={styles.tags}>
                            {p.topics.map((t) => (
                              <span key={t} className={styles.tag}>
                                {TOPICS.find((x) => x.id === t)?.label ?? t}
                              </span>
                            ))}
                          </div>
                        )}
                      </a>
                    )
                  })}
                </div>
                {limit < filtered.length && (
                  <button type="button" className={styles.more} onClick={() => setLimit(limit + PAGE)}>
                    Show more ({filtered.length - limit} left)
                  </button>
                )}
              </>
            )}

            <footer className={styles.foot}>
              <p>
                This page is a directory. Titles, dates and excerpts come from each publisher&apos;s own
                RSS or Atom feed, and every link goes to their site — no article text is copied or
                rehosted, and nothing is served from here but the index itself.
              </p>
              <p>
                Want your blog added, or removed? Open an issue on{' '}
                <a href="https://github.com/drupesh2008/drupesh2008.github.io" target="_blank" rel="noopener noreferrer">
                  the repository
                </a>
                . The source list lives in <code>src/data/feeds.json</code>.
              </p>
              {index && index.failed?.length > 0 && (
                <p>
                  {index.failed.length} feed{index.failed.length > 1 ? 's are' : ' is'} currently
                  unreachable and showing older entries:{' '}
                  {index.failed.map((f) => f.slug).join(', ')}.
                </p>
              )}
            </footer>
          </main>
        </div>
      </div>
    </div>
  )
}
