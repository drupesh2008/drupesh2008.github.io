import type { Metadata } from 'next'
import GroundStation from '@/components/GroundStation'

export const metadata: Metadata = {
  title: 'D Rupesh Kumar — Ground Station',
  description:
    'Every system I have built answers one of two questions: where, and who. A tracking station for five postings across FinTech, SpaceTech, Geospatial and HR Tech.',
}

export default function Home() {
  return <GroundStation />
}
