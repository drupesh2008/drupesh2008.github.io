import Link from 'next/link'
import type { ReactNode } from 'react'
import styles from './Atlas.module.css'

const NAV = [
  { href: '/work/', label: 'Work', key: 'work' },
  { href: '/journey/', label: 'Journey', key: 'journey' },
  { href: '/about/', label: 'About', key: 'about' },
  { href: '/contact/', label: 'Contact', key: 'contact' },
]

export default function AtlasShell({ active, children }: { active?: string; children: ReactNode }) {
  return (
    <div className={styles.root}>
      <a href="#main" className={styles.skip}>Skip to content</a>
      <header className={styles.nav}>
        <Link href="/" className={styles.brand}>D Rupesh Kumar</Link>
        <nav aria-label="Primary" className={styles.navLinks}>
          {NAV.map((n) => (
            <Link key={n.key} href={n.href} aria-current={active === n.key ? 'page' : undefined}>{n.label}</Link>
          ))}
        </nav>
      </header>
      <main id="main">{children}</main>
      <footer className={styles.footer}>
        <span>Free to read:</span>
        <Link href="/learning/">Learning pathways</Link>
        <Link href="/tech-blogs/">Tech blogs</Link>
        <Link href="/research-papers/">Research papers</Link>
        <a href="https://github.com/drupesh2008">GitHub</a>
        <a href="https://in.linkedin.com/in/d-rupesh-kumar">LinkedIn</a>
      </footer>
    </div>
  )
}
