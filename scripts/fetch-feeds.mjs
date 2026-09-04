#!/usr/bin/env node
/**
 * Refresh public/data/tech-blogs.json from the engineering blogs listed in
 * src/data/feeds.json.
 *
 * What this stores: title, canonical link, publish date, and the excerpt the
 * publisher themselves put in the feed (trimmed). Nothing else. The page links
 * straight back to the original — we are a directory, not a mirror.
 *
 * Design notes:
 *  - Every feed is independently fallible. One 404 must not empty the page, so
 *    failures are recorded and the previous run's posts for that feed are kept.
 *  - No XML dependency. RSS 2.0 and Atom are regular enough for the five fields
 *    we want, and avoiding a parser keeps the workflow install trivial.
 *
 * Usage:  node scripts/fetch-feeds.mjs
 */

import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const SOURCE = path.join(ROOT, 'src/data/feeds.json')
const OUT = path.join(ROOT, 'public/data/tech-blogs.json')

const PER_FEED = 25 // most recent posts kept per company
const TOTAL = 1200 // hard cap on the published file
const TIMEOUT_MS = 20000
const MAX_AGE_DAYS = 550 // drop anything older; keeps the file from growing forever

const { feeds, topics } = JSON.parse(fs.readFileSync(SOURCE, 'utf8'))

/* ── tiny XML helpers ─────────────────────────────────────────────── */

const decode = (s = '') =>
  s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
    .replace(/\s+/g, ' ')
    .trim()

const tag = (xml, name) => {
  const m = xml.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, 'i'))
  return m ? m[1] : ''
}

/** Atom puts the URL in an attribute; RSS puts it in the element body. */
const linkOf = (xml) => {
  const alt = xml.match(/<link[^>]*rel=["']alternate["'][^>]*href=["']([^"']+)["']/i)
  if (alt) return alt[1]
  const href = xml.match(/<link[^>]*href=["']([^"']+)["'][^>]*\/?>/i)
  if (href) return href[1]
  const body = tag(xml, 'link')
  if (body && !body.includes('<')) return decode(body)
  const guid = tag(xml, 'guid')
  return guid && /^https?:/i.test(decode(guid)) ? decode(guid) : ''
}

const dateOf = (xml) => {
  for (const f of ['pubDate', 'published', 'updated', 'dc:date']) {
    const v = decode(tag(xml, f))
    if (!v) continue
    const d = new Date(v)
    if (!Number.isNaN(d.valueOf())) return d.toISOString()
  }
  return ''
}

const splitItems = (xml) => {
  const out = []
  const re = /<(item|entry)[\s>][\s\S]*?<\/\1>/gi
  let m
  while ((m = re.exec(xml))) out.push(m[0])
  return out
}

const tagTopics = (text) => {
  const hay = ` ${text.toLowerCase()} `
  return topics.filter((t) => t.keywords.some((k) => hay.includes(k.toLowerCase()))).map((t) => t.id)
}

/* ── fetch one feed ───────────────────────────────────────────────── */

async function pull(feed) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(feed.url, {
      signal: ctrl.signal,
      redirect: 'follow',
      headers: {
        // some publishers 403 an unidentified client; say who we are and where to complain
        'user-agent':
          'drupesh2008.github.io feed reader (+https://github.com/drupesh2008/drupesh2008.github.io)',
        accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*',
      },
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const xml = await res.text()
    const items = splitItems(xml)
    if (!items.length) throw new Error('no items parsed')

    const cutoff = Date.now() - MAX_AGE_DAYS * 864e5
    const posts = []
    for (const item of items) {
      const title = decode(tag(item, 'title'))
      const url = linkOf(item)
      if (!title || !url || !/^https?:/i.test(url)) continue

      const published = dateOf(item)
      if (published && new Date(published).valueOf() < cutoff) continue

      const rawExcerpt =
        tag(item, 'description') || tag(item, 'summary') || tag(item, 'content:encoded') || tag(item, 'content')
      let excerpt = decode(rawExcerpt)
      if (excerpt.length > 280) excerpt = `${excerpt.slice(0, 277).trimEnd()}…`

      posts.push({
        id: `${feed.slug}:${url}`,
        title,
        url,
        company: feed.company,
        slug: feed.slug,
        sector: feed.sector,
        published: published || new Date().toISOString(),
        excerpt,
        topics: tagTopics(`${title} ${excerpt}`),
      })
    }
    posts.sort((a, b) => b.published.localeCompare(a.published))
    return { ok: true, posts: posts.slice(0, PER_FEED) }
  } catch (err) {
    return { ok: false, reason: err?.message || String(err) }
  } finally {
    clearTimeout(timer)
  }
}

/* ── run ──────────────────────────────────────────────────────────── */

const previous = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : { posts: [] }
const keptBySlug = new Map()
for (const p of previous.posts ?? []) {
  if (!keptBySlug.has(p.slug)) keptBySlug.set(p.slug, [])
  keptBySlug.get(p.slug).push(p)
}

const ok = []
const failed = []
const collected = []

// modest concurrency — enough to be quick, polite enough not to look like a scrape
const QUEUE = [...feeds]
async function worker() {
  while (QUEUE.length) {
    const feed = QUEUE.shift()
    const r = await pull(feed)
    if (r.ok) {
      ok.push(feed.slug)
      collected.push(...r.posts)
      process.stdout.write(`  ok    ${feed.slug.padEnd(14)} ${r.posts.length} posts\n`)
    } else {
      failed.push({ slug: feed.slug, reason: r.reason })
      const kept = keptBySlug.get(feed.slug) ?? []
      collected.push(...kept)
      process.stdout.write(`  FAIL  ${feed.slug.padEnd(14)} ${r.reason}${kept.length ? ` (kept ${kept.length} from last run)` : ''}\n`)
    }
  }
}
console.log(`Fetching ${feeds.length} feeds…`)
await Promise.all(Array.from({ length: 6 }, worker))

// dedupe on canonical URL, newest wins, then sort and cap
const byUrl = new Map()
for (const p of collected) {
  const prev = byUrl.get(p.url)
  if (!prev || p.published > prev.published) byUrl.set(p.url, p)
}
const posts = [...byUrl.values()].sort((a, b) => b.published.localeCompare(a.published)).slice(0, TOTAL)

const index = { generatedAt: new Date().toISOString(), ok, failed, posts }
fs.mkdirSync(path.dirname(OUT), { recursive: true })
fs.writeFileSync(OUT, `${JSON.stringify(index)}\n`)

console.log(
  `\n${posts.length} posts from ${ok.length}/${feeds.length} feeds → ${path.relative(ROOT, OUT)}`
)
if (failed.length) {
  console.log(`\n${failed.length} feed(s) need attention:`)
  for (const f of failed) console.log(`  ${f.slug}: ${f.reason}`)
}
// a dead feed is a maintenance task, not a failed build — only bail if nothing worked
if (!ok.length) {
  console.error('\nEvery feed failed — refusing to overwrite with an empty index.')
  process.exit(1)
}
