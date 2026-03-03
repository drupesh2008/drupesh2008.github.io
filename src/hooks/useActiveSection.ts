'use client'

import { useState, useEffect, useCallback } from 'react'

export type ActiveSection = 'journey' | 'experience' | 'projects' | 'skills' | 'contact' | null

const VALID_SECTIONS: ActiveSection[] = ['journey', 'experience', 'projects', 'skills', 'contact']

function getHashSection(): ActiveSection {
  if (typeof window === 'undefined') return null
  const hash = window.location.hash.replace('#', '')
  return VALID_SECTIONS.includes(hash as ActiveSection) ? (hash as ActiveSection) : null
}

export function useActiveSection() {
  const [activeSection, setActiveSection] = useState<ActiveSection>(null)

  // Sync from hash on mount
  useEffect(() => {
    setActiveSection(getHashSection())
  }, [])

  // Listen for browser back/forward
  useEffect(() => {
    const onHashChange = () => setActiveSection(getHashSection())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  const setSection = useCallback((section: ActiveSection) => {
    setActiveSection(section)
    if (section) {
      window.history.pushState(null, '', `#${section}`)
    } else {
      window.history.pushState(null, '', window.location.pathname)
    }
  }, [])

  const goHome = useCallback(() => {
    setActiveSection(null)
    window.history.pushState(null, '', window.location.pathname)
  }, [])

  // Keyboard navigation
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        goHome()
        return
      }

      if (!activeSection) return

      const currentIndex = VALID_SECTIONS.indexOf(activeSection)
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        e.preventDefault()
        const next = VALID_SECTIONS[(currentIndex + 1) % VALID_SECTIONS.length]
        setSection(next)
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        e.preventDefault()
        const prev = VALID_SECTIONS[(currentIndex - 1 + VALID_SECTIONS.length) % VALID_SECTIONS.length]
        setSection(prev)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [activeSection, setSection, goHome])

  return { activeSection, setSection, goHome, sections: VALID_SECTIONS }
}
