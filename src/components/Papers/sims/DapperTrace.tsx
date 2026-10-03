'use client'

/**
 * One request as Dapper sees it: a tree of spans, each with a start, an end
 * and a parent, laid out as a waterfall. Click a span for its annotations,
 * reveal the critical path, and set the sampling rate to see what tracing
 * costs at ten thousand requests a second.
 */

import { useState } from 'react'
import { Sim, Controls, Slider, Btn, Stat, Read, s, dg } from './ui'

interface Span { id: string; name: string; parent: string | null; start: number; end: number; notes: string[] }
const SPANS: Span[] = [
  { id: 'fe', name: 'frontend GET /search', parent: null, start: 0, end: 126, notes: ['trace id 0x4e3a…', 'client ip, user agent', 'response 200, 48 KB'] },
  { id: 'auth', name: 'auth.Check', parent: 'fe', start: 4, end: 18, notes: ['cache hit for session', '1 RPC'] },
  { id: 'search', name: 'search.Query', parent: 'fe', start: 22, end: 116, notes: ['query "raft paper"', 'fan-out to 2 shards'] },
  { id: 'index', name: 'index.Lookup', parent: 'search', start: 26, end: 64, notes: ['shard 7 of 40', 'posting lists merged: 3'] },
  { id: 'rank', name: 'ranking.Score', parent: 'search', start: 66, end: 112, notes: ['model v12', '1,240 candidates'] },
  { id: 'db', name: 'db.Get(user_prefs)', parent: 'rank', start: 70, end: 104, notes: ['replica lag 0 ms', 'row size 2 KB', 'slow: 34 ms, p50 is 6 ms'] },
  { id: 'ads', name: 'ads.Select', parent: 'fe', start: 22, end: 58, notes: ['3 candidates', 'timeout 80 ms'] },
]
const CRITICAL = ['fe', 'search', 'rank', 'db']
const RATES = [1, 4, 16, 64, 256, 1024]

export default function DapperTrace() {
  const [sel, setSel] = useState<string>('db')
  const [crit, setCrit] = useState(false)
  const [ri, setRi] = useState(5)
  const rps = 10000
  const rate = RATES[ri]
  const depth = (sp: Span): number => (sp.parent ? 1 + depth(SPANS.find((x) => x.id === sp.parent)!) : 0)
  const total = Math.max(...SPANS.map((x) => x.end))
  const X = (t: number) => 190 + (t / total) * 450
  const chosen = SPANS.find((x) => x.id === sel)!

  return (
    <Sim
      title="Where did 126 milliseconds go?"
      note="Each bar is a span: one unit of work in one service, with its parent recorded so the tree can be rebuilt from scattered logs. Click a span."
    >
      <Controls>
        <div className={s.btnRow}>
          <Btn primary={crit} onClick={() => setCrit(!crit)}>{crit ? 'Hide' : 'Show'} critical path</Btn>
        </div>
        <Slider label="Sampling: trace 1 in" value={ri} min={0} max={RATES.length - 1} onChange={setRi} fmt={(v) => String(RATES[v])} />
      </Controls>

      <svg viewBox="0 0 660 230" role="img" aria-label="Waterfall of spans for one request">
        {[0, 25, 50, 75, 100, 125].map((t) => (
          <g key={t}>
            <line x1={X(t)} x2={X(t)} y1="8" y2="200" className={dg.dgLine} strokeWidth="0.6" opacity="0.6" />
            <text x={X(t)} y="214" textAnchor="middle" className={dg.dgText} style={{ fontSize: 9 }}>{t} ms</text>
          </g>
        ))}
        {SPANS.map((sp, i) => {
          const y = 14 + i * 26
          const on = sp.id === sel
          const dimmed = crit && !CRITICAL.includes(sp.id)
          return (
            <g key={sp.id} onClick={() => setSel(sp.id)} style={{ cursor: 'pointer' }} opacity={dimmed ? 0.3 : 1}>
              <text x={8 + depth(sp) * 12} y={y + 13} className={on ? dg.dgTextHi : dg.dgText} style={{ fontSize: 10 }}>{sp.name}</text>
              <rect x={X(sp.start)} y={y} width={Math.max(2, X(sp.end) - X(sp.start))} height="18" rx="4"
                className={on || (crit && CRITICAL.includes(sp.id)) ? dg.dgBoxHi : dg.dgBox} strokeWidth={on ? 1.6 : 1}
                fill={on ? 'var(--accent)' : undefined} fillOpacity={on ? 0.2 : undefined} />
              <text x={X(sp.end) + 5} y={y + 13} className={dg.dgTextS} style={{ fontSize: 8.5 }}>{sp.end - sp.start} ms</text>
            </g>
          )
        })}
      </svg>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 18 }}>
        <div>
          <div className={s.ctlLabel} style={{ marginBottom: 6 }}>span annotations · {chosen.name}</div>
          <div className={s.log} style={{ marginTop: 0 }}>{chosen.notes.map((n, i) => <div key={i} className={n.startsWith('slow') ? s.hi : undefined}>{n}</div>)}</div>
        </div>
        <div className={s.stats}>
          <Stat label="traces stored" value={Math.round(rps / rate).toLocaleString()} unit="/ s" hint={`at ${rps.toLocaleString()} requests per second`} />
          <Stat label="overhead" value={rate >= 256 ? 'negligible' : rate >= 16 ? 'measurable' : 'high'} hint={rate >= 1024 ? 'the paper’s production default: 1 in 1024' : 'span writes compete with real work'} />
        </div>
      </div>
      <Read>
        {crit
          ? 'The critical path is the chain that decides the total: frontend → search → ranking → one slow database read. Ads finished early and auth was quick; speeding them up would change nothing. Without a trace you would guess, and most guesses are wrong.'
          : 'Sampling is what made it possible to leave tracing on in production. One request in a thousand still gives thousands of traces a minute, and the slow patterns show up in that sample just as they do in the whole.'}
      </Read>
    </Sim>
  )
}
