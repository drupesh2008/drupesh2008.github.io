'use client'

/**
 * Bigtable is one sorted map, so the row key you choose decides what sits
 * together on disk and how many tablets a scan must touch. The paper's own
 * example: store web pages under the reversed hostname so a site's pages are
 * contiguous.
 */

import { useMemo, useState } from 'react'
import { Sim, Controls, Stat, Read, s } from './ui'

const URLS = [
  'www.cnn.com/index.html', 'www.cnn.com/world', 'sports.cnn.com/nba', 'money.cnn.com/markets',
  'www.bbc.co.uk/news', 'www.bbc.co.uk/sport', 'news.bbc.co.uk/weather',
  'www.example.com/', 'blog.example.com/post/1', 'shop.example.com/cart',
  'en.wikipedia.org/wiki/Bigtable', 'de.wikipedia.org/wiki/Bigtable',
  'maps.google.com/', 'www.google.com/search',
]
const TABLET = 4

const reverse = (url: string) => {
  const [host, ...rest] = url.split('/')
  return `${host.split('.').reverse().join('.')}/${rest.join('/')}`
}
const SITES = ['cnn.com', 'bbc.co.uk', 'example.com', 'wikipedia.org', 'google.com']

export default function BigtableKeys() {
  const [mode, setMode] = useState<'url' | 'reversed'>('url')
  const [site, setSite] = useState('cnn.com')

  const rows = useMemo(() => {
    const keyed = URLS.map((u) => ({ url: u, key: mode === 'url' ? u : reverse(u) }))
    return keyed.sort((a, b) => a.key.localeCompare(b.key))
  }, [mode])
  const tablets = useMemo(() => {
    const out: { id: number; rows: typeof rows }[] = []
    for (let i = 0; i < rows.length; i += TABLET) out.push({ id: out.length + 1, rows: rows.slice(i, i + TABLET) })
    return out
  }, [rows])
  const belongs = (url: string) => url.split('/')[0].endsWith(site)
  const touched = tablets.filter((t) => t.rows.some((r) => belongs(r.url))).length
  const prefix = mode === 'reversed' ? site.split('.').reverse().join('.') : null

  return (
    <Sim
      title="Pick a row key, then scan one site"
      note="Rows live in key order and are split into tablets of four rows each. Ask for every page of one site and count the tablets the scan has to visit."
    >
      <Controls>
        <label className={s.ctl}>
          <span className={s.ctlLabel}>Row key</span>
          <div className={s.chips}>
            <button type="button" className={`${s.chip} ${mode === 'url' ? s.chipOn : ''}`} onClick={() => setMode('url')}>the URL as written</button>
            <button type="button" className={`${s.chip} ${mode === 'reversed' ? s.chipOn : ''}`} onClick={() => setMode('reversed')}>reversed hostname</button>
          </div>
        </label>
        <label className={s.ctl}>
          <span className={s.ctlLabel}>Scan all pages of</span>
          <select className={s.select} value={site} onChange={(e) => setSite(e.target.value)}>
            {SITES.map((x) => <option key={x} value={x}>{x}</option>)}
          </select>
        </label>
      </Controls>

      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${tablets.length}, minmax(0, 1fr))`, gap: 10 }}>
        {tablets.map((t) => {
          const hit = t.rows.some((r) => belongs(r.url))
          return (
            <div key={t.id} style={{ border: `1px solid ${hit ? 'var(--accent)' : 'var(--edge)'}`, borderRadius: 8, padding: '7px 8px', background: 'var(--panel2)', fontFamily: 'var(--mono)', fontSize: 10, lineHeight: 1.6 }}>
              <div className={s.ctlLabel} style={{ marginBottom: 5 }}>tablet {t.id}</div>
              {t.rows.map((r) => (
                <div key={r.url} style={{ color: belongs(r.url) ? 'var(--accent)' : 'var(--dim)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.key}</div>
              ))}
            </div>
          )
        })}
      </div>

      <div className={s.stats}>
        <Stat label="tablets touched" value={touched} unit={`of ${tablets.length}`} />
        <Stat label="scan is" value={prefix ? `prefix "${prefix}"` : 'scattered'} hint={prefix ? 'one contiguous key range' : 'rows for one site are spread by subdomain'} />
      </div>
      <Read>
        {mode === 'reversed'
          ? 'Reversing the hostname puts com.cnn.www, com.cnn.sports and com.cnn.money next to each other, so one site is one range. The paper stores the whole web this way, and it is why locality-aware key design is the first thing any Bigtable, HBase or Cassandra schema review asks about.'
          : 'With plain URLs, sorting is by the first label, so sports.cnn.com sits far from www.cnn.com. A scan for one site walks tablets it mostly does not need. Nothing in the system is wrong; the key just does not match the question you ask.'}
      </Read>
    </Sim>
  )
}
