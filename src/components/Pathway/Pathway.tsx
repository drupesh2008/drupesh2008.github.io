/**
 * The shell every course page under /learning shares.
 *
 * Structure and reading lists come from src/data/pathways.ts; the prose comes
 * from the page as a { stageId: <JSX> } map, so the data file stays data and
 * the writing lives with the route. A missing or misspelled stage id fails
 * the static build rather than shipping a hole in the course.
 *
 * Server component on purpose — the whole course renders to static HTML; the
 * only client bit is the theme toggle.
 */

import Link from 'next/link'
import type { ReactNode } from 'react'
import { pathwayById, nextPathway, TYPE_LABEL } from '@/data/pathways'
import { accVars } from '@/data/accents'
import ThemeToggle from '@/components/ThemeToggle'
import styles from './Pathway.module.css'

export function Callout({ title = 'The load-bearing idea', children }: { title?: string; children: ReactNode }) {
  return (
    <aside className={styles.callout}>
      <div className={styles.calloutCap}>{title}</div>
      <p>{children}</p>
    </aside>
  )
}

export function Fig({ caption, children }: { caption: string; children: ReactNode }) {
  return (
    <figure className={styles.fig}>
      <div className={styles.figArt}>{children}</div>
      <figcaption>{caption}</figcaption>
    </figure>
  )
}

/** a horizontally-scrollable comparison table; children = <table>…</table> */
export function Tbl({ children }: { children: ReactNode }) {
  return <div className={styles.tblWrap}>{children}</div>
}

/* re-exported so diagram files can share the vocabulary without a second import */
export { styles as pathwayStyles }

export default function Pathway({
  trackId,
  sections,
}: {
  trackId: string
  sections: Record<string, ReactNode>
}) {
  const track = pathwayById(trackId)
  const next = nextPathway(trackId)
  const resourceCount = track.stages.reduce((n, s) => n + s.resources.length, 0)

  for (const s of track.stages) {
    if (!sections[s.id]) throw new Error(`pathway ${trackId}: no prose for stage "${s.id}"`)
  }

  return (
    <div className={styles.root} style={accVars(track.hex)}>
      <div className={styles.wrap}>
        <div className={styles.top}>
          <Link className={styles.back} href="/learning">← All pathways</Link>
          <div className={styles.topLinks}>
            <Link href="/tech-blogs">Tech blogs</Link>
            <Link href="/about">About</Link>
            <ThemeToggle />
          </div>
        </div>

        <header className={styles.head}>
          <div className={styles.eyebrow}>
            <span className={styles.bar} /> Pathway {String(track.index).padStart(2, '0')} · zero → professional
          </div>
          <h1>{track.title}</h1>
          <p className={styles.tagline}>{track.tagline}</p>
          <p className={styles.blurb}>{track.blurb}</p>
          <div className={styles.meta}>
            <span><b>{track.stages.length}</b> stages</span>
            <span><b>~{track.minutes}</b> min read</span>
            <span><b>{resourceCount}</b> links out</span>
            <span><b>0</b> accounts required</span>
          </div>
        </header>

        <div className={styles.cols}>
          <aside className={styles.rail}>
            <div className={styles.railCap}><span className={styles.railBar} /> Stages</div>
            <ol className={styles.railList}>
              {track.stages.map((s, i) => (
                <li key={s.id}>
                  <a href={`#${s.id}`}>
                    <span className={styles.railNo}>{String(i + 1).padStart(2, '0')}</span>
                    {s.title}
                  </a>
                </li>
              ))}
              <li>
                <a href="#done">
                  <span className={styles.railNo}>··</span>
                  You are there when…
                </a>
              </li>
            </ol>
            <div className={styles.railFoot}>
              Free · no sign-in
              <br />
              <Link href="/learning">All pathways</Link>
            </div>
          </aside>

          <main>
            {track.stages.map((s, i) => (
              <section className={styles.stage} id={s.id} key={s.id}>
                <div className={styles.stageNo}>
                  Stage {String(i + 1).padStart(2, '0')} / {String(track.stages.length).padStart(2, '0')}
                </div>
                <h2>{s.title}</h2>
                <p className={styles.lede}>{s.lede}</p>
                <div className={styles.prose}>{sections[s.id]}</div>

                <div className={styles.reading}>
                  <div className={styles.readingCap}><span className={styles.railBar} /> Go deeper — free, no account</div>
                  {s.resources.map((r) => {
                    const internal = r.url.startsWith('/')
                    const body = (
                      <>
                        <div className={styles.resTop}>
                          <span className={styles.resType}>{TYPE_LABEL[r.type]}</span>
                          <span className={styles.resTitle}>{r.title}</span>
                          <span className={styles.resSource}>{r.source}</span>
                          {!internal && <span className={styles.ext} aria-hidden="true">↗</span>}
                        </div>
                        <p className={styles.resNote}>{r.note}</p>
                      </>
                    )
                    return internal ? (
                      <Link className={styles.res} href={r.url} key={r.url}>{body}</Link>
                    ) : (
                      <a className={styles.res} href={r.url} target="_blank" rel="noopener noreferrer" key={r.url}>
                        {body}
                      </a>
                    )
                  })}
                </div>
              </section>
            ))}

            <section className={styles.outcomes} id="done">
              <h2>You are there when…</h2>
              <ul className={styles.outcomeList}>
                {track.outcomes.map((o) => (
                  <li key={o}><span className={styles.tick}>▸</span>{o}</li>
                ))}
              </ul>

              <Link className={styles.next} href={`/learning/${next.id}`}>
                <div className={styles.nextCap}>Next pathway</div>
                <div className={styles.nextTitle}>
                  {next.title} <span className={styles.arr}>→</span>
                </div>
                <div className={styles.nextTag}>{next.tagline}</div>
              </Link>
            </section>

            <footer className={styles.foot}>
              <p>
                This course was written for this site and is free to read — no account, no paywall,
                no tracking beyond the site&rsquo;s own analytics. The links in each stage go straight to
                their authors; nothing is mirrored or resold. If you own something linked here and
                would rather it were not, open an issue on{' '}
                <a href="https://github.com/drupesh2008/drupesh2008.github.io" target="_blank" rel="noopener noreferrer">
                  the repository
                </a>{' '}
                and it comes down.
              </p>
            </footer>
          </main>
        </div>
      </div>
    </div>
  )
}
