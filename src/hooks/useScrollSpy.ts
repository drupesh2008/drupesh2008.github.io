'use client'

import { useEffect, useState } from 'react'

/**
 * Returns the id of the section currently crossing the viewport focus line.
 * `offset` is the fraction down the viewport used as the trigger line (0.4 = 40%).
 */
export function useScrollSpy(ids: string[], offset = 0.4): string {
  const [active, setActive] = useState<string>(ids[0] ?? '')

  useEffect(() => {
    const els = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null)
    if (els.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActive(entry.target.id)
        })
      },
      {
        rootMargin: `-${offset * 100}% 0px -${(1 - offset) * 100}% 0px`,
        threshold: 0,
      }
    )

    els.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [ids, offset])

  return active
}
