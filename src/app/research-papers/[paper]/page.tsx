import type { Metadata } from 'next'
import { ALL_PAPERS, paperById, categoryOf } from '@/data/papers'
import { PaperView } from '@/components/Papers/Papers'
import { SECTIONS } from '../_content'

export const dynamicParams = false

export function generateStaticParams() {
  return ALL_PAPERS.map((p) => ({ paper: p.id }))
}

export async function generateMetadata({ params }: { params: Promise<{ paper: string }> }): Promise<Metadata> {
  const { paper } = await params
  const p = paperById(paper)
  const c = categoryOf(paper)
  return {
    title: `${p.short} (${p.year}) — ${c.title} · Research papers`,
    description: p.lede,
  }
}

export default async function PaperPage({ params }: { params: Promise<{ paper: string }> }) {
  const { paper } = await params
  return <PaperView paperId={paper} prose={SECTIONS[paper]} />
}
