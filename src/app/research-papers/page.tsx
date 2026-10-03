import type { Metadata } from 'next'
import { PapersHub } from '@/components/Papers/Papers'

export const metadata: Metadata = {
  title: 'Research papers — twenty that built the industry, explained',
  description:
    'Twenty foundational computer-science papers, five each in distributed systems, databases, cloud infrastructure and AI, explained from the problem outward with diagrams and interactive simulations.',
}

export default function ResearchPapersPage() {
  return <PapersHub />
}
