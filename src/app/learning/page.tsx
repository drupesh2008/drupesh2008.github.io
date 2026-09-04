import type { Metadata } from 'next'
import LearningHub from '@/components/LearningHub'

export const metadata: Metadata = {
  title: 'Learning — free engineering curriculum',
  description:
    'A structured, free path through distributed systems, system design, data and storage, AI engineering and CS fundamentals. Curated links to resources that are already free to read. No sign-in, no paywall.',
}

export default function LearningPage() {
  return <LearningHub />
}
