/**
 * /learning — the hub.
 *
 * Four courses, written and hosted on this site, each a staged path from zero
 * to professional. The old filterable link directory is gone: the links still
 * exist, but they now live at the end of the stage they belong to, as the
 * "go deeper" reading. Server component — the toggle is the only client bit.
 */

import Link from 'next/link'
import { PATHWAYS, STAGE_COUNT, RESOURCE_COUNT } from '@/data/pathways'
import { accVars } from '@/data/accents'
import ThemeToggle from '@/components/ThemeToggle'
import styles from './PathwayHub.module.css'

export default function PathwayHub() {
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
            Four pathways from <strong>zero to professional</strong> — through the machine, distributed
            systems, system design and AI engineering. The courses are written and hosted on this
            site, and every stage ends with the best free reading on the open web, linked straight to
            the people who wrote it. Walk the pathways in order, or jump to the one your work needs
            this week.
          </p>
          <div className={styles.stats}>
            <span><b>{PATHWAYS.length}</b> pathways</span>
            <span><b>{STAGE_COUNT}</b> stages</span>
            <span><b>{RESOURCE_COUNT}</b> links out</span>
            <span><b>0</b> accounts required</span>
          </div>
        </header>

        <div className={styles.grid}>
          {PATHWAYS.map((p) => (
            <Link className={styles.card} href={`/learning/${p.id}`} key={p.id} style={accVars(p.hex)}>
              <div className={styles.cardNo}>
                <span className={styles.cardDot} /> Pathway {String(p.index).padStart(2, '0')}
              </div>
              <h2>{p.title}</h2>
              <p className={styles.cardTagline}>{p.tagline}</p>
              <p className={styles.cardBlurb}>{p.blurb}</p>
              <ol className={styles.stageList}>
                {p.stages.map((s, i) => (
                  <li key={s.id}>
                    <span className={styles.stageNo}>{String(i + 1).padStart(2, '0')}</span>
                    {s.title}
                  </li>
                ))}
              </ol>
              <div className={styles.cardFoot}>
                <span>
                  {p.stages.length} stages · ~{p.minutes} min ·{' '}
                  {p.stages.reduce((n, s) => n + s.resources.length, 0)} links
                </span>
                <span className={styles.begin}>
                  Begin <span className={styles.arr}>→</span>
                </span>
              </div>
            </Link>
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
