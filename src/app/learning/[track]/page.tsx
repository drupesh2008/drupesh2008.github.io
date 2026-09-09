import type { Metadata } from 'next'
import { PATHWAYS, pathwayById } from '@/data/pathways'
import { PathwayOverview } from '@/components/Pathway/Pathway'

export const dynamicParams = false

export function generateStaticParams() {
  return PATHWAYS.map((p) => ({ track: p.id }))
}

export async function generateMetadata({ params }: { params: Promise<{ track: string }> }): Promise<Metadata> {
  const { track } = await params
  const p = pathwayById(track)
  return {
    title: `${p.title} — a free course, zero to professional`,
    description: `${p.tagline}. ${p.blurb}`,
  }
}

export default async function TrackPage({ params }: { params: Promise<{ track: string }> }) {
  const { track } = await params
  return <PathwayOverview trackId={track} />
}
