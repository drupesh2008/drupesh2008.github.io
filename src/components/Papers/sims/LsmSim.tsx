'use client'

/**
 * A log-structured merge-tree you feed by hand: writes go to a sorted
 * in-memory table, full tables are flushed as immutable sorted runs, runs are
 * merged by compaction, and reads walk newest-to-oldest with a Bloom filter
 * saying which runs to skip.
 */

import { useState } from 'react'
import { Sim, Controls, Btn, Stat, Read, s, rng } from './ui'

interface Entry { key: string; v: number }
interface Run { id: number; entries: Entry[] }
const KEYS = Array.from({ length: 12 }, (_, i) => `k${String(i + 1).padStart(2, '0')}`)
const CAP = 4

const merge = (runs: Run[]): Entry[] => {
  const m = new Map<string, number>()
  for (const r of [...runs].reverse()) for (const e of r.entries) m.set(e.key, e.v) // oldest first, newest overwrites
  return [...m.entries()].map(([key, v]) => ({ key, v })).sort((a, b) => a.key.localeCompare(b.key))
}

export default function LsmSim() {
  const [rand] = useState(() => rng(7))
  const [mem, setMem] = useState<Entry[]>([])
  const [l0, setL0] = useState<Run[]>([])
  const [l1, setL1] = useState<Run | null>(null)
  const [version, setVersion] = useState(1)
  const [runId, setRunId] = useState(1)
  const [stats, setStats] = useState({ puts: 0, flushes: 0, compactions: 0, written: 0 })
  const [trace, setTrace] = useState<string[]>([])
  const [lookup, setLookup] = useState(KEYS[2])

  const put = (n: number) => {
    let m = [...mem], runs = [...l0], merged = l1, id = runId, ver = version
    const st = { ...stats }
    for (let i = 0; i < n; i++) {
      const key = KEYS[Math.floor(rand() * KEYS.length)]
      m = [...m.filter((e) => e.key !== key), { key, v: ver++ }].sort((a, b) => a.key.localeCompare(b.key))
      st.puts++
      if (m.length >= CAP) {
        runs = [{ id: id++, entries: m }, ...runs]; st.flushes++; st.written += m.length; m = []
        if (runs.length >= 3) {
          const all = merged ? [...runs, merged] : runs
          merged = { id: id++, entries: merge(all) }; st.compactions++; st.written += merged.entries.length; runs = []
        }
      }
    }
    setMem(m); setL0(runs); setL1(merged); setRunId(id); setVersion(ver); setStats(st)
  }

  const get = () => {
    const steps: string[] = []
    const inMem = mem.find((e) => e.key === lookup)
    if (inMem) { steps.push(`memtable: hit, ${lookup} = v${inMem.v}`); setTrace(steps); return }
    steps.push('memtable: miss')
    for (const r of l0) {
      const hit = r.entries.find((e) => e.key === lookup)
      if (!hit) { steps.push(`run ${r.id} (L0): Bloom filter says "not here", skipped without a disk read`); continue }
      steps.push(`run ${r.id} (L0): hit, ${lookup} = v${hit.v}`); setTrace(steps); return
    }
    if (l1) {
      const hit = l1.entries.find((e) => e.key === lookup)
      steps.push(hit ? `run ${l1.id} (L1): hit, ${lookup} = v${hit.v}` : `run ${l1.id} (L1): Bloom filter says no`)
    }
    if (!steps.some((x) => x.includes('hit'))) steps.push(`${lookup} was never written`)
    setTrace(steps)
  }

  const reset = () => { setMem([]); setL0([]); setL1(null); setVersion(1); setRunId(1); setStats({ puts: 0, flushes: 0, compactions: 0, written: 0 }); setTrace([]) }
  const box = (title: string, entries: Entry[], hi?: boolean) => (
    <div style={{ border: `1px solid ${hi ? 'var(--accent)' : 'var(--edge)'}`, borderRadius: 8, padding: '7px 9px', marginBottom: 6, fontFamily: 'var(--mono)', fontSize: 11, lineHeight: 1.6, color: 'var(--dim)', background: 'var(--panel2)' }}>
      <b style={{ color: 'var(--chalk)', fontWeight: 500 }}>{title}</b><br />
      {entries.length ? entries.map((e) => `${e.key}:v${e.v}`).join('  ') : <span className={s.muted}>empty</span>}
    </div>
  )

  return (
    <Sim
      title="Write a firehose, read it back"
      note="Every write is an append into a small sorted memtable. When it fills, it is flushed as an immutable sorted run; when runs pile up, they are merged. Nothing is ever updated in place."
    >
      <Controls>
        <div className={s.btnRow}>
          <Btn primary onClick={() => put(1)}>Put one random key</Btn>
          <Btn onClick={() => put(6)}>Put six</Btn>
          <Btn onClick={reset}>Reset</Btn>
        </div>
        <label className={s.ctl}>
          <span className={s.ctlLabel}>Read a key</span>
          <div className={s.btnRow}>
            <select className={s.select} value={lookup} onChange={(e) => setLookup(e.target.value)}>
              {KEYS.map((k) => <option key={k} value={k}>{k}</option>)}
            </select>
            <Btn onClick={get}>Get</Btn>
          </div>
        </label>
      </Controls>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 14 }}>
        <div>
          <div className={s.ctlLabel} style={{ marginBottom: 8 }}>memory · memtable ({mem.length}/{CAP})</div>
          {box('memtable (sorted)', mem, true)}
        </div>
        <div>
          <div className={s.ctlLabel} style={{ marginBottom: 8 }}>disk · level 0 (newest first)</div>
          {l0.length ? l0.map((r) => <div key={r.id}>{box(`run ${r.id}`, r.entries)}</div>) : box('no runs yet', [])}
        </div>
        <div>
          <div className={s.ctlLabel} style={{ marginBottom: 8 }}>disk · level 1 (merged)</div>
          {l1 ? box(`run ${l1.id}`, l1.entries) : box('nothing compacted yet', [])}
        </div>
      </div>

      <div className={s.stats}>
        <Stat label="puts" value={stats.puts} />
        <Stat label="flushes" value={stats.flushes} />
        <Stat label="compactions" value={stats.compactions} />
        <Stat label="write amplification" value={stats.puts ? (stats.written / stats.puts).toFixed(1) : '—'} unit="×" hint="entries written to disk per entry ingested" />
      </div>
      {trace.length > 0 && <div className={s.log}>{trace.map((t, i) => <div key={i}>{t}</div>)}</div>}
      <Read>
        A write never seeks: it lands in memory and later in one sequential run, which is why these stores absorb far more writes per second than a tree updated in place. The price is paid on reads, which may check several runs, and in compaction, which rewrites data in the background. Bloom filters make most of those checks free.
      </Read>
    </Sim>
  )
}
