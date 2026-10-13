import type { ReactNode } from 'react'
import Link from 'next/link'
import { PLATES, type SceneName } from './scenes'
import styles from './Atlas.module.css'

export default function Hero({
  scene, eyebrow, title, lede, meta, actions, tag, tagR, children,
}: {
  scene: SceneName
  eyebrow: string
  title: ReactNode
  lede?: ReactNode
  meta?: ReactNode
  actions?: ReactNode
  tag?: ReactNode
  tagR?: ReactNode
  right?: boolean
  children?: ReactNode
}) {
  const plate = PLATES[scene]
  return (
    <section className={styles.hero} aria-labelledby="page-title">
      <div className={styles.art}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/atlas/${scene}-1600.webp`}
          srcSet={`/atlas/${scene}-800.webp 800w, /atlas/${scene}-1600.webp 1600w`}
          sizes="(max-width: 860px) 100vw, 100vw"
          alt={plate.alt}
          width={1600}
          height={900}
          fetchPriority="high"
          decoding="async"
          style={{ objectPosition: plate.focus }}
        />
        {plate.pins && (
          <ul className={styles.pins}>
            {plate.pins.map((p) => (
              <li key={p.text} style={{ left: `${p.x}%`, top: `${p.y}%` }}>
                {p.href ? <Link href={p.href} className={styles.label}>{p.text}</Link> : <span className={styles.label}>{p.text}</span>}
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className={styles.copy}>
        <p className={styles.eyebrow}>{eyebrow}</p>
        <h1 id="page-title" className={styles.h1}>{title}</h1>
        {lede && <p className={styles.lede}>{lede}</p>}
        {meta && <p className={styles.meta}>{meta}</p>}
        {actions && <div className={styles.actions}>{actions}</div>}
        {children}
      </div>
      <div className={styles.tag}>{tag ?? <>People<br />Systems<br />A brighter tomorrow</>}</div>
      {tagR && <div className={styles.tagR}>{tagR}</div>}
    </section>
  )
}
