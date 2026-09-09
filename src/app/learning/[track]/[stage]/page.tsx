import type { Metadata } from 'next'
import { PATHWAYS, pathwayById } from '@/data/pathways'
import { StageView } from '@/components/Pathway/Pathway'
import { SECTIONS } from '../../_content'

export const dynamicParams = false

export function generateStaticParams() {
  return PATHWAYS.flatMap((p) => p.stages.map((s) => ({ track: p.id, stage: s.id })))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ track: string; stage: string }>
}): Promise<Metadata> {
  const { track, stage } = await params
  const p = pathwayById(track)
  const s = p.stages.find((x) => x.id === stage)!
  const i = p.stages.findIndex((x) => x.id === stage)
  return {
    title: `${s.title} — ${p.title} ${String(i + 1).padStart(2, '0')}`,
    description: s.lede,
  }
}

export default async function StagePage({
  params,
}: {
  params: Promise<{ track: string; stage: string }>
}) {
  const { track, stage } = await params
  return <StageView trackId={track} stageId={stage} prose={SECTIONS[track]?.[stage]} />
}
