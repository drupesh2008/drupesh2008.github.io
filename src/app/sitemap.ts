import type { MetadataRoute } from 'next'
import { PATHWAYS } from '@/data/pathways'
import { ALL_PAPERS } from '@/data/papers'

export const dynamic = 'force-static'
const BASE = 'https://crysthope.com'

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()
  const fixed = ['/', '/about/', '/learning/', '/research-papers/', '/tech-blogs/']
  const urls = [
    ...fixed,
    ...PATHWAYS.map((p) => `/learning/${p.id}/`),
    ...PATHWAYS.flatMap((p) => p.stages.map((s) => `/learning/${p.id}/${s.id}/`)),
    ...ALL_PAPERS.map((p) => `/research-papers/${p.id}/`),
  ]
  return urls.map((u) => ({ url: BASE + u, lastModified: now, priority: u === '/' ? 1 : u.split('/').length > 3 ? 0.5 : 0.8 }))
}
