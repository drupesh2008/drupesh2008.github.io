/**
 * /research-papers — the hub, and one page per paper.
 *
 * PapersHub lays out the four categories, five papers each, every row a link
 * to that paper's page. PaperView is one paper on one page: masthead with the
 * link to the original, the explainer (problem first), a reading list, and a
 * previous/next pager that walks the whole list in order.
 *
 * The reading layout is the one /learning uses (Pathway.module.css), so the
 * two sections read as one site; the paper masthead and the simulations have
 * their own small stylesheet. Server components; the theme toggle and the
 * simulations are the client bits.
 */

import Link from 'next/link'
import type { ReactNode } from 'react'
import { CATEGORIES, ALL_PAPERS, PAPER_COUNT, TYPE_LABEL, categoryOf, paperById, nextPaper, prevPaper } from '@/data/papers'
import { accVars } from '@/data/accents'
import ThemeToggle from '@/components/ThemeToggle'
import styles from '@/components/Pathway/Pathway.module.css'
import hub from '@/components/PathwayHub/PathwayHub.module.css'
import own from './Papers.module.css'

function TopBar({ backHref, backLabel }: { backHref: string; backLabel: string }) {
  return (
    <div className={styles.top}>
      <Link className={styles.back} href={backHref}>← {backLabel}</Link>
      <div className={styles.topLinks}>
        <Link href="/learning">Learning</Link>
        <Link href="/tech-blogs">Tech blogs</Link>
        <ThemeToggle />
      </div>
    </div>
  )
}

/* ════════════════════════════════════════════════════════════════════
   The hub
   ════════════════════════════════════════════════════════════════════ */
export function PapersHub() {
  const minutes = ALL_PAPERS.reduce((n, p) => n + p.minutes, 0)
  const years = ALL_PAPERS.map((p) => p.year)
  return (
    <div className={hub.root}>
      <div className={hub.wrap}>
        <div className={hub.top}>
          <Link className={hub.back} href="/">← Ground station</Link>
          <div className={hub.topLinks}>
            <Link href="/learning">Learning</Link>
            <Link href="/tech-blogs">Tech blogs</Link>
            <Link href="/about">About</Link>
            <ThemeToggle />
          </div>
        </div>

        <header className={hub.head}>
          <div className={hub.eyebrow}><span className={hub.bar} /> Free · no sign-in · explained here, linked to the originals</div>
          <h1>Research papers</h1>
          <p>
            Twenty papers that built the software industry, five from each of four fields, each explained
            on its own page <strong>from the problem outward</strong>: what the world looked like before,
            what broke, what the authors proposed, and how it works, in plain words, with diagrams and an
            interactive simulation you can play with. Every page links to the original paper and to the best
            free explanations elsewhere. Read a category in order, or jump to the one you keep hearing about.
          </p>
          <div className={hub.stats}>
            <span><b>{CATEGORIES.length}</b> fields</span>
            <span><b>{PAPER_COUNT}</b> papers</span>
            <span><b>{Math.min(...years)}–{Math.max(...years)}</b> published</span>
            <span><b>~{Math.round(minutes / 60)}</b> hours of reading</span>
            <span><b>{PAPER_COUNT}</b> simulations</span>
          </div>
        </header>

        <div className={hub.grid}>
          {CATEGORIES.map((c) => (
            <div className={hub.card} key={c.id} style={accVars(c.hex)}>
              <Link className={hub.cardHead} href={`/research-papers/${c.papers[0].id}/`}>
                <div className={hub.cardNo}>
                  <span className={hub.cardDot} /> Field {String(c.index).padStart(2, '0')}
                </div>
                <h2>{c.title}</h2>
                <p className={hub.cardTagline}>{c.tagline}</p>
                <p className={hub.cardBlurb}>{c.blurb}</p>
              </Link>
              <ol className={hub.stageList}>
                {c.papers.map((p, i) => (
                  <li key={p.id}>
                    <Link className={hub.stageLink} href={`/research-papers/${p.id}/`}>
                      <span className={hub.stageNo}>{String(i + 1).padStart(2, '0')}</span>
                      <span className={hub.stageTitle}>
                        {p.short} <span style={{ opacity: 0.55 }}>· {p.year}</span>
                      </span>
                      <span className={hub.stageGo} aria-hidden="true">→</span>
                    </Link>
                  </li>
                ))}
              </ol>
              <div className={hub.cardFoot}>
                <span>{c.papers.length} papers · ~{c.papers.reduce((n, p) => n + p.minutes, 0)} min</span>
                <Link className={hub.begin} href={`/research-papers/${c.papers[0].id}/`}>
                  Start with {c.papers[0].short} <span className={hub.arr}>→</span>
                </Link>
              </div>
            </div>
          ))}
        </div>

        <footer className={hub.foot}>
          <p>
            The explanations, diagrams and simulations on these pages are original to this site and free to
            read. The papers belong to their authors and publishers; every page links to the official copy
            and nothing is mirrored here. Where a page quotes a figure from a paper, it is that paper&apos;s
            claim at the time of publication.
          </p>
          <p>
            Think a paper is missing, or an explanation is wrong? Open an issue on{' '}
            <a href="https://github.com/drupesh2008/drupesh2008.github.io" target="_blank" rel="noopener noreferrer">
              the repository
            </a>
            .
          </p>
        </footer>
      </div>
    </div>
  )
}

/* ════════════════════════════════════════════════════════════════════
   One paper, one page
   ════════════════════════════════════════════════════════════════════ */
export function PaperView({ paperId, prose }: { paperId: string; prose: ReactNode }) {
  const paper = paperById(paperId)
  const cat = categoryOf(paperId)
  if (!prose) throw new Error(`research papers: no explainer for "${paperId}"`)
  const i = cat.papers.findIndex((p) => p.id === paperId)
  const prev = prevPaper(paperId)
  const next = nextPaper(paperId)

  return (
    <div className={styles.root} style={accVars(cat.hex)}>
      <div className={styles.wrap}>
        <TopBar backHref="/research-papers" backLabel="Research papers" />

        <article className={styles.stagePage}>
          <div className={styles.stageNo}>
            {cat.title} · Paper {String(i + 1).padStart(2, '0')} / {String(cat.papers.length).padStart(2, '0')}
          </div>
          <div className={styles.progress} aria-hidden="true">
            <span style={{ width: `${(100 * (i + 1)) / cat.papers.length}%` }} />
          </div>
          <h1 className={styles.stageTitle}>{paper.title}</h1>
          <p className={own.authors}>{paper.authors}</p>
          <p className={own.venue}>
            <b>{paper.year}</b> · {paper.venue} · ~{paper.minutes} min read
          </p>
          <a className={own.pdf} href={paper.pdf} target="_blank" rel="noopener noreferrer">
            Read the original paper <span aria-hidden="true">↗</span>
          </a>
          <p className={styles.lede}>{paper.lede}</p>

          <div className={styles.prose}>{prose}</div>

          <div className={styles.reading}>
            <div className={styles.readingCap}><span className={styles.railBar} /> Go deeper — free, no account</div>
            <a className={styles.res} href={paper.pdf} target="_blank" rel="noopener noreferrer">
              <div className={styles.resTop}>
                <span className={styles.resType}>Paper</span>
                <span className={styles.resTitle}>{paper.title}</span>
                <span className={styles.resSource}>{paper.venue}, {paper.year}</span>
                <span className={styles.ext} aria-hidden="true">↗</span>
              </div>
              <p className={styles.resNote}>The original. Read it after this page; the explainer above is a map, not a substitute.</p>
            </a>
            {paper.resources.map((r) => (
              <a className={styles.res} href={r.url} target="_blank" rel="noopener noreferrer" key={r.url}>
                <div className={styles.resTop}>
                  <span className={styles.resType}>{TYPE_LABEL[r.type]}</span>
                  <span className={styles.resTitle}>{r.title}</span>
                  <span className={styles.resSource}>{r.source}</span>
                  <span className={styles.ext} aria-hidden="true">↗</span>
                </div>
                <p className={styles.resNote}>{r.note}</p>
              </a>
            ))}
          </div>

          <nav className={styles.pager} aria-label="Paper navigation">
            {prev ? (
              <Link className={styles.pagerCard} href={`/research-papers/${prev.id}/`}>
                <span className={styles.pagerCap}>← Previous</span>
                <span className={styles.pagerTitle}>{prev.short}</span>
              </Link>
            ) : (
              <Link className={styles.pagerCard} href="/research-papers">
                <span className={styles.pagerCap}>← All papers</span>
                <span className={styles.pagerTitle}>Research papers</span>
              </Link>
            )}
            <Link className={`${styles.pagerCard} ${styles.pagerNext}`} href={`/research-papers/${next.paper.id}/`}>
              <span className={styles.pagerCap}>{next.newCategory ? `Next field · ${next.category.title} →` : 'Next paper →'}</span>
              <span className={styles.pagerTitle}>{next.paper.short}</span>
            </Link>
          </nav>
          <div className={styles.pagerAll}>
            <Link href="/research-papers">All {PAPER_COUNT} papers</Link>
          </div>
        </article>
      </div>
    </div>
  )
}
