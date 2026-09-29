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
 *  - The index accumulates. Most feeds only expose their 10–25 newest posts, so
 *    each run merges what it fetched with what earlier runs already saw. A post
 *    leaves the index only when it is older than MAX_AGE_DAYS or pushed out by
 *    newer posts from the same source. That is what lets the file hold far more
 *    than the feeds show at any single moment.
 *  - Feed URLs move. When the configured URL fails we ask the site itself where
 *    its feed is, then try the conventional paths, before giving up.
 *  - No XML dependency. RSS 2.0 and Atom are regular enough for the five fields
 *    we want, and avoiding a parser keeps the workflow install trivial.
 *
 * Usage:  node scripts/fetch-feeds.mjs
 */

import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const SOURCE = path.join(ROOT, 'src/data/feeds.json')
const PICKS = path.join(ROOT, 'src/data/picks.json')
const OUT = path.join(ROOT, 'public/data/tech-blogs.json')

const PER_FEED = 80 // newest posts kept per source, across runs (feeds.json can lower it with "max")
const TOTAL = 1000 // hard cap on the published file, shared fairly between sources (see fairShare)
const TIMEOUT_MS = 15000
const MAX_AGE_DAYS = 730 // two years; anything older ages out of the index
const WORKERS = 6
const MIN_GAP_MS = 120 // between any two request starts — spreads the load across publishers

const { feeds, topics } = JSON.parse(fs.readFileSync(SOURCE, 'utf8'))
/**
 * Hand-picked posts from blogs that publish no feed at all (Uber, LinkedIn,
 * Stripe's dev blog, Anthropic…). We will not scrape HTML, so these are the
 * only way such posts reach the index. Each carries its own one-line note in
 * place of a publisher excerpt, is exempt from the age limit, and is marked
 * `curated` so the page can say why it is there.
 */
const picks = fs.existsSync(PICKS) ? JSON.parse(fs.readFileSync(PICKS, 'utf8')) : []

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

/**
 * This is an index of engineering writing, not a changelog aggregator. Even a
 * good engineering blog posts release notes, "now available" notices, event
 * recaps and newsletters; those are dropped by title so that what remains is
 * the write-ups. Hand-picked posts are never subject to this.
 */
const EXCLUDE = new RegExp(
  [
    'now (generally )?available', 'generally available', 'general availability', 'is (now )?released',
    'are (now )?released', 'release notes', 'patch release', 'patch notes', 'changelog', 'product update',
    'announcing', 'webinar', 'summit', 'keynote', 'meetup', 'conference', 'recap', 'round-?up', 'newsletter',
    'digest', 'week in review', 'year in review', 'month in review', 'awards?\\b', 'honou?red', 'named a leader',
    'gartner', 'forrester', 'magic quadrant', 'customer stor(y|ies)', 'partners? with',
    'partnership', 'collaborat(es|ion) with', 'acquires?\\b', 'acquisition', 'funding', 'series [a-f]\\b',
    "we'?re hiring", 'join (us|our team)', 'job openings?', 'careers? at', 'holiday', 'black friday',
    'discount', 'pricing', 'sustainability report', 'expanding (in|to|our)', 'new office', 'deprecat(ion|ed)',
    'end[- ]of[- ]life', '\\beol\\b', 'maintenance window', 'sponsor', 'giveaway', 'hackathon winners?',
  ].join('|'),
  'i',
)
const isUpdate = (title) => EXCLUDE.test(title)

/**
 * The same post must dedupe to one entry no matter which run fetched it, so
 * tracking parameters are stripped — Medium stamps `?source=rss----…` on every
 * link, and a few publishers add utm_ tags to their own feeds.
 */
const TRACKING = /^(utm_.*|source|ref|fbclid|gclid|mc_[ce]id|ncid|mkt_tok|_hsenc|_hsmi)$/i
const canonical = (raw) => {
  try {
    const u = new URL(String(raw).trim())
    u.hash = ''
    for (const k of [...u.searchParams.keys()]) if (TRACKING.test(k)) u.searchParams.delete(k)
    return u.toString().replace(/\?$/, '')
  } catch {
    return String(raw).trim()
  }
}

/* ── fetching ─────────────────────────────────────────────────────── */

const UA =
  'drupesh2008.github.io feed reader (+https://github.com/drupesh2008/drupesh2008.github.io)'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// Medium alone hosts a fifth of these feeds and rate-limits a burst from one
// address, so request starts are spaced out and a 429 is retried after a pause.
let nextSlot = 0
async function throttle() {
  const at = Math.max(Date.now(), nextSlot)
  nextSlot = at + MIN_GAP_MS
  const wait = at - Date.now()
  if (wait > 0) await sleep(wait)
}

async function get(url, accept, attempt = 0) {
  await throttle()
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      redirect: 'follow',
      // some publishers 403 an unidentified client; say who we are and where to complain
      headers: { 'user-agent': UA, accept },
    })
    if (res.status === 429 && attempt < 2) {
      const hinted = Number(res.headers.get('retry-after')) * 1000
      clearTimeout(timer)
      await sleep(hinted > 0 && hinted < 30000 ? hinted : (attempt + 1) * 5000)
      return get(url, accept, attempt + 1)
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.text()
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Feed URLs move — a third of this list broke within a year. Rather than
 * hard-coding a fresh guess every time, ask the blog itself, in the same two
 * steps a feed reader would:
 *
 *   1. read the site page and take the feed it advertises in <head> as
 *      <link rel="alternate" type="application/rss+xml" href="...">
 *   2. failing that, try the conventional paths, since almost every static
 *      site generator publishes to one of them
 *
 * A feed entry may also list `alt` URLs of its own — known previous addresses,
 * regional mirrors — which are tried before either step, and `fallback` URLs
 * (a broader feed from the same company, say) which are tried only after both
 * steps have failed. This only ever runs after the configured URL has failed,
 * and stops at the first feed that parses.
 */
const CONVENTIONAL = ['feed', 'feed.xml', 'rss', 'rss.xml', 'atom.xml', 'index.xml', 'feed/']

async function declaredIn(siteUrl) {
  const html = await get(siteUrl, 'text/html,application/xhtml+xml,*/*')
  const links = html.match(/<link\b[^>]*>/gi) ?? []
  for (const tag of links) {
    if (!/rel=["']?alternate/i.test(tag)) continue
    if (!/type=["']?application\/(rss|atom)\+xml/i.test(tag)) continue
    const href = tag.match(/href=["']([^"']+)["']/i)?.[1]
    if (href) return new URL(href, siteUrl).toString()
  }
  return null
}

/** yields candidate feed URLs, best guess first */
async function* candidates(feed) {
  for (const u of feed.alt ?? []) yield u
  try {
    const declared = await declaredIn(feed.site)
    if (declared) yield declared
  } catch {
    // the site page itself is unreachable; the conventional paths may still be
  }
  // resolve against the blog's own path, so /blog/engineering/ -> /blog/engineering/feed
  const base = feed.site.endsWith('/') ? feed.site : `${feed.site}/`
  for (const p of CONVENTIONAL) yield new URL(p, base).toString()
  for (const u of feed.fallback ?? []) yield u
}

async function readFeed(url) {
  const xml = await get(url, 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*')
  const items = splitItems(xml)
  if (!items.length) throw new Error('no items parsed')
  return items
}

async function pull(feed) {
  let items
  let via = feed.url
  try {
    items = await readFeed(feed.url)
  } catch (first) {
    // rate-limited, not moved: discovery would only burn more requests on the same host
    if (/HTTP 429/.test(first?.message)) return { ok: false, reason: first.message }
    // the configured URL is stale or blocked — go and find where the feed moved to
    const tried = new Set([feed.url])
    for await (const candidate of candidates(feed)) {
      if (tried.has(candidate)) continue
      tried.add(candidate)
      try {
        items = await readFeed(candidate)
        via = candidate
        process.stdout.write(`  note  ${feed.slug.padEnd(16)} recovered via ${candidate}\n`)
        break
      } catch {
        /* try the next candidate */
      }
    }
    if (!items) return { ok: false, reason: first?.message || String(first) }
  }

  const posts = []
  for (const item of items) {
    const title = decode(tag(item, 'title'))
    const url = canonical(linkOf(item))
    if (!title || !url || !/^https?:/i.test(url)) continue
    if (isUpdate(title)) continue

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
      published: dateOf(item), // may be empty; remember() fills it from the last run or the clock
      excerpt,
      topics: [],
    })
  }
  return { ok: true, posts, via }
}

/* ── run ──────────────────────────────────────────────────────────── */

const stamp = new Date().toISOString()
const cutoff = Date.now() - MAX_AGE_DAYS * 864e5

// last run's index, grouped by source. Older files may hold un-normalised links,
// so canonicalise on the way in — otherwise the same post would appear twice.
const previous = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : { posts: [] }
const keptBySlug = new Map()
for (const p of previous.posts ?? []) {
  const url = canonical(p.url)
  if (!keptBySlug.has(p.slug)) keptBySlug.set(p.slug, [])
  keptBySlug.get(p.slug).push({ ...p, url, id: `${p.slug}:${url}` })
}

/**
 * Merge what this run fetched with what earlier runs already hold for the
 * same source, newest first, capped per source. Company, sector and topics are
 * recomputed from the current configuration so that renaming a source or adding
 * a topic keyword applies to every post already in the index, not just new ones.
 */
function remember(feed, fresh) {
  const cap = feed.max ?? PER_FEED
  const byUrl = new Map()
  for (const p of keptBySlug.get(feed.slug) ?? []) byUrl.set(p.url, p)
  for (const p of fresh) {
    const prev = byUrl.get(p.url)
    byUrl.set(p.url, { ...p, published: p.published || prev?.published || stamp })
  }
  const posts = [...byUrl.values()]
    .filter((p) => new Date(p.published).valueOf() >= cutoff && !isUpdate(p.title))
    .map((p) => ({
      ...p,
      company: feed.company,
      sector: feed.sector,
      topics: tagTopics(`${p.title} ${p.excerpt}`),
    }))
  posts.sort((a, b) => b.published.localeCompare(a.published))
  return posts.slice(0, cap)
}

const ok = []
const failed = []
const collected = []
const moved = [] // feeds that only worked after discovery — worth writing back into feeds.json
const perSource = []

// modest concurrency — enough to be quick, polite enough not to look like a scrape.
// `manual` sources publish no feed; they are listed for the picks file only.
const QUEUE = feeds.filter((f) => !f.manual)
async function worker() {
  while (QUEUE.length) {
    const feed = QUEUE.shift()
    const r = await pull(feed)
    if (r.ok) {
      ok.push(feed.slug)
      if (r.via !== feed.url) moved.push({ slug: feed.slug, from: feed.url, to: r.via })
      const posts = remember(feed, r.posts)
      collected.push(...posts)
      perSource.push({ slug: feed.slug, n: posts.length })
      process.stdout.write(`  ok    ${feed.slug.padEnd(16)} ${String(r.posts.length).padStart(3)} in feed → ${String(posts.length).padStart(3)} kept\n`)
    } else {
      failed.push({ slug: feed.slug, reason: r.reason })
      const posts = remember(feed, [])
      collected.push(...posts)
      perSource.push({ slug: feed.slug, n: posts.length })
      process.stdout.write(`  FAIL  ${feed.slug.padEnd(16)} ${r.reason}${posts.length ? ` (kept ${posts.length} from earlier runs)` : ''}\n`)
    }
  }
}
console.log(`Fetching ${QUEUE.length} feeds…`)
await Promise.all(Array.from({ length: WORKERS }, worker))

// curated picks join the pool under their company; a pick that a feed also
// carries is deduped below and the feed's copy wins
const feedBySlug = new Map(feeds.map((f) => [f.slug, f]))
for (const pick of picks) {
  const feed = feedBySlug.get(pick.slug)
  if (!feed) {
    console.warn(`  warn  pick "${pick.title}" names unknown source "${pick.slug}" — skipped`)
    continue
  }
  const url = canonical(pick.url)
  const d = new Date(pick.published)
  collected.push({
    id: `${feed.slug}:${url}`,
    title: pick.title,
    url,
    company: feed.company,
    slug: feed.slug,
    sector: feed.sector,
    published: Number.isNaN(d.valueOf()) ? stamp : d.toISOString(),
    excerpt: pick.note ?? '',
    topics: tagTopics(`${pick.title} ${pick.note ?? ''}`),
    curated: true,
  })
}

// dedupe on canonical URL across sources (cross-posts), newest wins; a feed's
// own copy of a post beats the curated one so the publisher's excerpt is shown
const byUrl = new Map()
for (const p of collected) {
  const prev = byUrl.get(p.url)
  if (!prev || (p.published > prev.published && !p.curated) || (prev.curated && !p.curated)) byUrl.set(p.url, p)
}

/**
 * Fit TOTAL fairly. Keeping simply the newest TOTAL posts would let a handful
 * of prolific feeds (a vendor publishing several posts a day) push everything
 * older than a few months from the quiet sources out of the index. Instead find
 * the largest per-source allowance such that every source keeps its newest
 * min(count, allowance) posts and the sum fits — the firehoses are trimmed
 * first, a blog that posts monthly keeps its whole two-year history.
 */
function fairShare(all) {
  const bySlug = new Map()
  for (const p of all) {
    if (!bySlug.has(p.slug)) bySlug.set(p.slug, [])
    bySlug.get(p.slug).push(p)
  }
  const lists = [...bySlug.values()].map((l) => l.sort((a, b) => b.published.localeCompare(a.published)))
  const fits = (c) => lists.reduce((n, l) => n + Math.min(l.length, c), 0) <= TOTAL
  let allowance = PER_FEED
  while (allowance > 1 && !fits(allowance)) allowance--
  return { posts: lists.flatMap((l) => l.slice(0, allowance)), allowance }
}
const { posts: kept, allowance } = fairShare([...byUrl.values()])
const posts = kept.sort((a, b) => b.published.localeCompare(a.published)).slice(0, TOTAL)

// a dead feed is a maintenance task, not a failed build — only bail if nothing
// at all could be read, which means the runner itself is offline
if (!ok.length) {
  console.error('\nEvery feed failed — leaving the previous index untouched.')
  for (const f of failed) console.error(`  ${f.slug}: ${f.reason}`)
  process.exit(1)
}

const index = { generatedAt: stamp, ok, failed, posts }
fs.mkdirSync(path.dirname(OUT), { recursive: true })
fs.writeFileSync(OUT, `${JSON.stringify(index)}\n`)

const live = new Set(posts.map((p) => p.slug)).size
const oldest = posts.length ? posts[posts.length - 1].published.slice(0, 10) : '—'
console.log(
  `\n${posts.length} posts from ${live} sources (${ok.length}/${feeds.length} feeds reachable), back to ${oldest}, at most ${allowance} per source → ${path.relative(ROOT, OUT)}`
)
if (moved.length) {
  console.log(`\n${moved.length} feed(s) were found at a new URL — update src/data/feeds.json:`)
  for (const m of moved) console.log(`  ${m.slug}: ${m.from}\n     -> ${m.to}`)
}
if (failed.length) {
  console.log(`\n${failed.length} feed(s) need attention:`)
  for (const f of failed) console.log(`  ${f.slug}: ${f.reason}`)
}
