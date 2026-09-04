import type { Metadata } from 'next'
import PathwayHub from '@/components/PathwayHub/PathwayHub'

export const metadata: Metadata = {
  title: 'Learning — four pathways, zero to professional',
  description:
    'Free structured courses through computing foundations, distributed systems, system design and AI engineering — written and hosted here, with each stage linking out to the best free reading on the open web. No sign-in, no paywall.',
}

export default function LearningPage() {
  return <PathwayHub />
}
