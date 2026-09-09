/**
 * /learning — the hub.
 *
 * Four complete courses, written and hosted on this site, each chapter its
 * own page. Every chapter row here links straight to that chapter — the card
 * is a table of contents, not a poster. Server component; the toggle is the
 * only client bit.
 */

import Link from 'next/link'
import { PATHWAYS, STAGE_COUNT, RESOURCE_COUNT } from '@/data/pathways'
import { accVars } from '@/data/accents'
import ThemeToggle from '@/components/ThemeToggle'
import styles from './PathwayHub.module.css'

export default function PathwayHub() {
  const totalMinutes = PATHWAYS.reduce((n, p) => n + p.minutes, 0)
  return (
    <div className={styles.root}>
      <div className={styles.wrap}>
        <div className={styles.top}>
          <Link className={styles.back} href="/">← Ground station</Link>
          <div className={styles.topLinks}>
            <Link href="/tech-blogs">Tech blogs</Link>
            <Link href="/about">About</Link>
            <ThemeToggle />
          </div>
        </div>

        <header className={styles.head}>
          <div className={styles.eyebrow}><span className={styles.bar} /> Free · no sign-in · written here</div>
          <h1>Learning</h1>
          <p>
            Four complete pathways from <strong>zero to professional</strong> — through the machine,
            distributed systems, system design and AI engineering. Every chapter is its own page:
            open one, finish it, take the next. Each ends with the best free reading on the web,
            linked straight to the people who wrote it. Walk a pathway in order, or jump to the
            chapter your work needs this week.
          </p>
          <div className={styles.stats}>
            <span><b>{PATHWAYS.length}</b> pathways</span>
            <span><b>{STAGE_COUNT}</b> chapters</span>
            <span><b>~{Math.round(totalMinutes / 60)}</b> hours of reading</span>
            <span><b>{RESOURCE_COUNT}</b> links out</span>
            <span><b>0</b> accounts required</span>
          </div>
        </header>

        <div className={styles.grid}>
          {PATHWAYS.map((p) => (
            <div className={styles.card} key={p.id} style={accVars(p.hex)}>
              <Link className={styles.cardHead} href={`/learning/${p.id}/`}>
                <div className={styles.cardNo}>
                  <span className={styles.cardDot} /> Pathway {String(p.index).padStart(2, '0')}
                </div>
                <h2>{p.title}</h2>
                <p className={styles.cardTagline}>{p.tagline}</p>
                <p className={styles.cardBlurb}>{p.blurb}</p>
              </Link>
              <ol className={styles.stageList}>
                {p.stages.map((s, i) => (
                  <li key={s.id}>
                    <Link className={styles.stageLink} href={`/learning/${p.id}/${s.id}/`}>
                      <span className={styles.stageNo}>{String(i + 1).padStart(2, '0')}</span>
                      <span className={styles.stageTitle}>{s.title}</span>
                      <span className={styles.stageGo} aria-hidden="true">→</span>
                    </Link>
                  </li>
                ))}
              </ol>
              <div className={styles.cardFoot}>
                <span>
                  {p.stages.length} chapters · ~{p.minutes} min ·{' '}
                  {p.stages.reduce((n, s) => n + s.resources.length, 0)} links
                </span>
                <Link className={styles.begin} href={`/learning/${p.id}/${p.stages[0].id}/`}>
                  Begin <span className={styles.arr}>→</span>
                </Link>
              </div>
            </div>
          ))}
        </div>

        <footer className={styles.foot}>
          <p>
            The writing on these pages is original to this site; the linked material belongs to its
            authors and every link goes directly to them — nothing is mirrored or resold. If you own
            something linked here and would rather it were not, open an issue on{' '}
            <a href="https://github.com/drupesh2008/drupesh2008.github.io" target="_blank" rel="noopener noreferrer">
              the repository
            </a>{' '}
            and it comes down.
          </p>
          <p>
            Suggestions are welcome the same way. The bar is unchanged: free to read without an
            account, and good enough that you would send it to a colleague.
          </p>
        </footer>
      </div>
    </div>
  )
}
