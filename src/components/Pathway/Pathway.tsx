/**
 * The two views every course under /learning is built from.
 *
 * PathwayOverview — /learning/[track]/ — the course cover: hero, outcomes,
 * and the chapter list, each row a real link to its own page.
 *
 * StageView — /learning/[track]/[stage]/ — ONE chapter per page, with a
 * progress marker and a previous/next pager. Deliberately paginated: a
 * bounded read finishes, and finishing is the point.
 *
 * Structure and reading lists come from src/data/pathways.ts; the prose
 * comes from the content modules under src/app/learning/_content, keyed by
 * stage id. A stage without prose fails the static build — no holes ship.
 *
 * Server components throughout; the theme toggle is the only client bit.
 */

import Link from 'next/link'
import type { ReactNode } from 'react'
import { pathwayById, nextPathway, TYPE_LABEL, type Pathway } from '@/data/pathways'
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

function TopBar({ backHref, backLabel }: { backHref: string; backLabel: string }) {
  return (
    <div className={styles.top}>
      <Link className={styles.back} href={backHref}>← {backLabel}</Link>
      <div className={styles.topLinks}>
        <Link href="/learning">All pathways</Link>
        <Link href="/tech-blogs">Tech blogs</Link>
        <ThemeToggle />
      </div>
    </div>
  )
}

/* ════════════════════════════════════════════════════════════════════
   The course cover
   ════════════════════════════════════════════════════════════════════ */
export function PathwayOverview({ trackId }: { trackId: string }) {
  const track = pathwayById(trackId)
  const next = nextPathway(trackId)
  const resourceCount = track.stages.reduce((n, s) => n + s.resources.length, 0)

  return (
    <div className={styles.root} style={accVars(track.hex)}>
      <div className={styles.wrap}>
        <TopBar backHref="/learning" backLabel="Learning" />

        <header className={styles.head}>
          <div className={styles.eyebrow}>
            <span className={styles.bar} /> Pathway {String(track.index).padStart(2, '0')} · zero → professional
          </div>
          <h1>{track.title}</h1>
          <p className={styles.tagline}>{track.tagline}</p>
          <p className={styles.blurb}>{track.blurb}</p>
          <div className={styles.meta}>
            <span><b>{track.stages.length}</b> chapters</span>
            <span><b>~{track.minutes}</b> min total</span>
            <span><b>{resourceCount}</b> links out</span>
            <span><b>0</b> accounts required</span>
          </div>
        </header>

        <div className={styles.ovCols}>
          <main>
            <div className={styles.ovCap}><span className={styles.railBar} /> The chapters — one page each</div>
            <ol className={styles.ovList}>
              {track.stages.map((s, i) => (
                <li key={s.id}>
                  <Link className={styles.ovRow} href={`/learning/${track.id}/${s.id}/`}>
                    <span className={styles.ovNo}>{String(i + 1).padStart(2, '0')}</span>
                    <span className={styles.ovBody}>
                      <span className={styles.ovTitle}>{s.title}</span>
                      <span className={styles.ovLede}>{s.lede}</span>
                    </span>
                    <span className={styles.ovGo} aria-hidden="true">→</span>
                  </Link>
                </li>
              ))}
            </ol>
          </main>

          <aside className={styles.ovSide}>
            <div className={styles.ovCap}><span className={styles.railBar} /> You are there when…</div>
            <ul className={styles.outcomeList}>
              {track.outcomes.map((o) => (
                <li key={o}><span className={styles.tick}>▸</span>{o}</li>
              ))}
            </ul>

            <Link className={styles.next} href={`/learning/${next.id}/`}>
              <div className={styles.nextCap}>Next pathway</div>
              <div className={styles.nextTitle}>
                {next.title} <span className={styles.arr}>→</span>
              </div>
              <div className={styles.nextTag}>{next.tagline}</div>
            </Link>
          </aside>
        </div>

        <footer className={styles.foot}>
          <p>
            This course was written for this site and is free to read — no account, no paywall. The
            links in each chapter go straight to their authors; nothing is mirrored or resold. If
            you own something linked here and would rather it were not, open an issue on{' '}
            <a href="https://github.com/drupesh2008/drupesh2008.github.io" target="_blank" rel="noopener noreferrer">
              the repository
            </a>{' '}
            and it comes down.
          </p>
        </footer>
      </div>
    </div>
  )
}

/* ════════════════════════════════════════════════════════════════════
   One chapter, one page
   ════════════════════════════════════════════════════════════════════ */
export function StageView({
  trackId,
  stageId,
  prose,
}: {
  trackId: string
  stageId: string
  prose: ReactNode
}) {
  const track = pathwayById(trackId)
  const i = track.stages.findIndex((s) => s.id === stageId)
  if (i < 0) throw new Error(`pathway ${trackId}: unknown stage "${stageId}"`)
  if (!prose) throw new Error(`pathway ${trackId}: no prose for stage "${stageId}"`)
  const stage = track.stages[i]
  const prev = i > 0 ? track.stages[i - 1] : null
  const next = i < track.stages.length - 1 ? track.stages[i + 1] : null
  const nextTrack = next ? null : nextPathway(trackId)

  return (
    <div className={styles.root} style={accVars(track.hex)}>
      <div className={styles.wrap}>
        <TopBar backHref={`/learning/${track.id}/`} backLabel={track.title} />

        <article className={styles.stagePage}>
          <div className={styles.stageNo}>
            Chapter {String(i + 1).padStart(2, '0')} / {String(track.stages.length).padStart(2, '0')} ·{' '}
            {track.title}
          </div>
          <div className={styles.progress} aria-hidden="true">
            <span style={{ width: `${(100 * (i + 1)) / track.stages.length}%` }} />
          </div>
          <h1 className={styles.stageTitle}>{stage.title}</h1>
          <p className={styles.lede}>{stage.lede}</p>

          <div className={styles.prose}>{prose}</div>

          {stage.resources.length > 0 && (
            <div className={styles.reading}>
              <div className={styles.readingCap}><span className={styles.railBar} /> Go deeper — free, no account</div>
              {stage.resources.map((r) => {
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
          )}

          <nav className={styles.pager} aria-label="Chapter navigation">
            {prev ? (
              <Link className={styles.pagerCard} href={`/learning/${track.id}/${prev.id}/`}>
                <span className={styles.pagerCap}>← Previous</span>
                <span className={styles.pagerTitle}>{prev.title}</span>
              </Link>
            ) : (
              <Link className={styles.pagerCard} href={`/learning/${track.id}/`}>
                <span className={styles.pagerCap}>← Course cover</span>
                <span className={styles.pagerTitle}>{track.title}</span>
              </Link>
            )}
            {next ? (
              <Link className={`${styles.pagerCard} ${styles.pagerNext}`} href={`/learning/${track.id}/${next.id}/`}>
                <span className={styles.pagerCap}>Next chapter →</span>
                <span className={styles.pagerTitle}>{next.title}</span>
              </Link>
            ) : (
              <Link className={`${styles.pagerCard} ${styles.pagerNext}`} href={`/learning/${nextTrack!.id}/`}>
                <span className={styles.pagerCap}>Pathway complete · next →</span>
                <span className={styles.pagerTitle}>{nextTrack!.title}</span>
              </Link>
            )}
          </nav>
          <div className={styles.pagerAll}>
            <Link href={`/learning/${track.id}/`}>All {track.stages.length} chapters</Link>
          </div>
        </article>
      </div>
    </div>
  )
}

export type { Pathway }
