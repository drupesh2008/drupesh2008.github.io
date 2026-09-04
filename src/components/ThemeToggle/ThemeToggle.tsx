'use client'

/**
 * The theme switch for the dark-system pages (landing, /learning,
 * /tech-blogs). It flips [data-theme] on <html> and remembers the choice; a
 * pre-paint script in the root layout replays it on the next visit. /about is
 * a deliberately light page and ignores the attribute.
 *
 * It styles itself from whichever page it sits in — the pages all define the
 * same token names (--mono, --faint, --chalk, --edgeHi, --signal), so the
 * toggle matches its surroundings in either exposure for free.
 */

import { useEffect, useState } from 'react'
import styles from './ThemeToggle.module.css'

type Theme = 'dark' | 'light'

export default function ThemeToggle() {
  // the server always renders "dark"; the real value arrives after mount
  const [theme, setTheme] = useState<Theme>('dark')

  useEffect(() => {
    const t = document.documentElement.dataset.theme
    if (t === 'light' || t === 'dark') setTheme(t)
  }, [])

  const flip = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    document.documentElement.dataset.theme = next
    try {
      localStorage.setItem('theme', next)
    } catch {
      /* private mode — the choice just doesn't persist */
    }
  }

  return (
    <button
      type="button"
      className={styles.toggle}
      onClick={flip}
      aria-label={`Switch to the ${theme === 'dark' ? 'light' : 'dark'} theme`}
    >
      <span className={styles.orb} aria-hidden="true" />
      <span className={styles.label}>{theme === 'dark' ? 'Dark' : 'Light'}</span>
    </button>
  )
}
