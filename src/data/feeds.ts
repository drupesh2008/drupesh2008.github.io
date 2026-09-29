/**
 * Types and typed views over `feeds.json`.
 *
 * The raw list lives in JSON so that `scripts/fetch-feeds.mjs` (plain Node,
 * no build step) and the Next page can read the same source of truth.
 *
 * We only ever store a title, a timestamp, the excerpt the publisher put in
 * their own feed, and a link back to the original. No article body is copied
 * or rehosted — this is a directory, not a mirror.
 */

import raw from './feeds.json'

export type Sector =
  | 'Streaming & Media'
  | 'Fintech'
  | 'Marketplace'
  | 'Social'
  | 'Commerce'
  | 'Enterprise & SaaS'
  | 'Developer Tools'
  | 'Infrastructure'
  | 'Data & AI'
  | 'Security'

export interface Feed {
  /** stable id, also used as the filter key */
  slug: string
  company: string
  url: string
  /** where a human should go to browse it */
  site: string
  sector: Sector
  /** other addresses the feed has lived at; tried before discovery when `url` fails */
  alt?: string[]
  /** a broader feed from the same publisher, tried only after discovery has failed too */
  fallback?: string[]
  /** lower per-source cap for prolific vendor blogs, so one source cannot crowd out the rest */
  max?: number
  /** the blog publishes no feed; it is listed so that hand-picked posts (picks.json) have a home */
  manual?: boolean
}

/** one hand-picked post in picks.json, for sources that publish no feed */
export interface Pick {
  /** must match a feed slug */
  slug: string
  title: string
  url: string
  /** ISO date */
  published: string
  /** our own one-line note, shown in place of a publisher excerpt */
  note?: string
}

export interface Topic {
  id: string
  label: string
  /** matched case-insensitively against title + excerpt */
  keywords: string[]
}

export const FEEDS = raw.feeds as Feed[]
export const TOPICS = raw.topics as Topic[]

export const SECTORS: Sector[] = [
  'Streaming & Media',
  'Fintech',
  'Marketplace',
  'Social',
  'Commerce',
  'Enterprise & SaaS',
  'Developer Tools',
  'Infrastructure',
  'Data & AI',
  'Security',
]

/** one entry in public/data/tech-blogs.json */
export interface Post {
  id: string
  title: string
  url: string
  company: string
  slug: string
  sector: string
  /** ISO 8601 */
  published: string
  excerpt: string
  topics: string[]
  /** hand-picked from a blog with no feed; the excerpt is our note, not the publisher's */
  curated?: boolean
}

/** the shape of public/data/tech-blogs.json, written by the refresh workflow */
export interface FeedIndex {
  generatedAt: string
  ok: string[]
  failed: { slug: string; reason: string }[]
  posts: Post[]
}
