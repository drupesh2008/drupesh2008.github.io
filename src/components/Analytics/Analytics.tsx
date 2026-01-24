'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect, Suspense } from 'react'
import { pageview, event, GA_TRACKING_ID } from '@/lib/gtag'

function AnalyticsTracker() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (pathname) {
      const url = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : '')
      pageview(url)
    }
  }, [pathname, searchParams])

  // Track section visibility and engagement for portfolio sections
  useEffect(() => {
    // Skip analytics if no tracking ID is configured
    if (!GA_TRACKING_ID) return
    const sections = ['hero', 'about', 'experience', 'skills', 'current-work', 'contact']
    const observedSections = new Set<string>()
    const sectionStartTimes = new Map<string, number>()

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const sectionId = entry.target.id
          
          if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
            // Track section view
            if (sections.includes(sectionId) && !observedSections.has(sectionId)) {
              observedSections.add(sectionId)
              sectionStartTimes.set(sectionId, Date.now())
              event({
                action: 'view',
                category: 'section',
                label: sectionId
              })
            }
          } else if (sectionStartTimes.has(sectionId)) {
            // Track time spent in section when leaving
            const timeSpent = Math.round((Date.now() - sectionStartTimes.get(sectionId)!) / 1000)
            sectionStartTimes.delete(sectionId)
            
            if (timeSpent > 3) { // Only track if spent more than 3 seconds
              event({
                action: 'engagement',
                category: 'section',
                label: `${sectionId}_time_spent`,
                value: timeSpent
              })
            }
          }
        })
      },
      {
        threshold: 0.5
      }
    )

    // Track total session time
    const sessionStart = Date.now()
    const trackSessionEnd = () => {
      const sessionDuration = Math.round((Date.now() - sessionStart) / 1000)
      if (sessionDuration > 10) { // Only track if session is longer than 10 seconds
        event({
          action: 'session',
          category: 'engagement',
          label: 'total_session_time',
          value: sessionDuration
        })
      }
    }

    // Track session end on page unload
    window.addEventListener('beforeunload', trackSessionEnd)

    // Observe all sections
    sections.forEach((sectionId) => {
      const element = document.getElementById(sectionId)
      if (element) {
        observer.observe(element)
      }
    })

    return () => {
      observer.disconnect()
      window.removeEventListener('beforeunload', trackSessionEnd)
      trackSessionEnd() // Track session time when component unmounts
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