'use client'

import { useEffect, Suspense, useRef } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { pageview, event, GA_TRACKING_ID } from '@/lib/gtag'

function AnalyticsTracker() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const sectionTimerRef = useRef<{ section: string; start: number } | null>(null)
  const viewedSections = useRef(new Set<string>())

  // Pageview tracking
  useEffect(() => {
    if (pathname) {
      const url = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : '')
      pageview(url)
    }
  }, [pathname, searchParams])

  // Hash-based section tracking
  useEffect(() => {
    if (!GA_TRACKING_ID) return

    const trackSection = () => {
      const hash = window.location.hash.replace('#', '')

      // End timer for previous section
      if (sectionTimerRef.current) {
        const timeSpent = Math.round((Date.now() - sectionTimerRef.current.start) / 1000)
        if (timeSpent > 3) {
          event({
            action: 'engagement',
            category: 'section',
            label: `${sectionTimerRef.current.section}_time_spent`,
            value: timeSpent,
          })
        }
        sectionTimerRef.current = null
      }

      if (hash) {
        // Track first view
        if (!viewedSections.current.has(hash)) {
          viewedSections.current.add(hash)
          event({ action: 'view', category: 'section', label: hash })
        }

        // Track navigation
        event({ action: 'navigate', category: 'section', label: hash })
        sectionTimerRef.current = { section: hash, start: Date.now() }
      }
    }

    // Track initial hash
    trackSection()

    window.addEventListener('hashchange', trackSection)

    // Session duration
    const sessionStart = Date.now()
    const trackSessionEnd = () => {
      const sessionDuration = Math.round((Date.now() - sessionStart) / 1000)
      if (sessionDuration > 10) {
        event({
          action: 'session',
          category: 'engagement',
          label: 'total_session_time',
          value: sessionDuration,
        })
      }
    }
    window.addEventListener('beforeunload', trackSessionEnd)

    return () => {
      window.removeEventListener('hashchange', trackSection)
      window.removeEventListener('beforeunload', trackSessionEnd)
    }
  }, [])

  return null
}

export default function Analytics() {
  return (
    <Suspense fallback={null}>
      <AnalyticsTracker />
    </Suspense>
  )
}
