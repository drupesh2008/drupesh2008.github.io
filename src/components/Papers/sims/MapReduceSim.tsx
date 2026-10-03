'use client'

/**
 * Word count, the paper's own example, run one phase at a time: input splits
 * become map workers, map output is partitioned by key to R reducers, and the
 * reducers sum. The point is the shape, not the counting.
 */

import { useMemo, useState } from 'react'
import { Sim, Controls, Slider, Btn, Stat, Read, s, hash } from './ui'

const DEFAULT = `the quick brown fox jumps over the lazy dog
the dog sleeps and the fox runs
a quick fox and a quick dog`

const tokenise = (line: string) => line.toLowerCase().match(/[a-z']+/g) ?? []

export default function MapReduceSim() {
  const [text, setText] = useState(DEFAULT)
  const [R, setR] = useState(3)
  const [stage, setStage] = useState(0)

  const splits = useMemo(() => text.split('\n').map((l) => l.trim()).filter(Boolean).slice(0, 6), [text])
  const mapped = useMemo(() => splits.map((line) => tokenise(line).map((w) => [w, 1] as [string, number])), [splits])
  const partitions = useMemo(() => {
    const parts: Record<number, [string, number][]> = {}
    for (let r = 0; r < R; r++) parts[r] = []
    for (const pairs of mapped) for (const p of pairs) parts[hash(p[0]) % R].push(p)
    return parts
  }, [mapped, R])
  const reduced = useMemo(() => {
    const out: Record<number, [string, number][]> = {}
    for (let r = 0; r < R; r++) {
      const m = new Map<string, number>()
      for (const [w, n] of partitions[r]) m.set(w, (m.get(w) ?? 0) + n)
      out[r] = [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]))
    }
    return out
  }, [partitions, R])

  const pairs = mapped.reduce((n, p) => n + p.length, 0)
  const unique = new Set(mapped.flat().map((p) => p[0])).size

  const col = (title: string, body: React.ReactNode, dim: boolean) => (
    <div style={{ opacity: dim ? 0.28 : 1, transition: 'opacity 0.3s', minWidth: 0 }}>
      <div className={s.ctlLabel} style={{ marginBottom: 8 }}>{title}</div>
      {body}
    </div>
  )
  const box = (children: React.ReactNode, key: string | number) => (
    <div key={key} style={{ border: '1px solid var(--edge)', borderRadius: 8, padding: '7px 9px', marginBottom: 6, fontFamily: 'var(--mono)', fontSize: 11, lineHeight: 1.55, color: 'var(--dim)', background: 'var(--panel2)' }}>
      {children}
    </div>
  )

  return (
    <Sim
      title="Word count, one phase at a time"
      note="Each line of the text is an input split handed to its own map worker. Change the text, pick a number of reducers, and step through the phases."
    >
      <Controls>
        <label className={s.ctl} style={{ flex: '1 1 320px' }}>
          <span className={s.ctlLabel}>Input (one split per line, up to six)</span>
          <textarea className={s.textarea} value={text} onChange={(e) => { setText(e.target.value); setStage(0) }} rows={3} />
        </label>
        <Slider label="Reducers (R)" value={R} min={1} max={4} onChange={(v) => { setR(v); setStage(0) }} />
        <div className={s.btnRow}>
          <Btn primary={stage === 0} onClick={() => setStage(1)} disabled={stage >= 1}>1 · Map</Btn>
          <Btn primary={stage === 1} onClick={() => setStage(2)} disabled={stage !== 1}>2 · Shuffle</Btn>
          <Btn primary={stage === 2} onClick={() => setStage(3)} disabled={stage !== 2}>3 · Reduce</Btn>
          <Btn onClick={() => setStage(0)}>Reset</Btn>
        </div>
      </Controls>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 14 }}>
        {col(`${splits.length} map workers`, mapped.map((pairs, i) => box(<><b style={{ color: 'var(--chalk)' }}>split {i + 1}</b><br />{pairs.map((p) => `(${p[0]}, 1)`).join(' ')}</>, i)), stage < 1)}
        {col(`shuffle → ${R} partition${R > 1 ? 's' : ''} (hash(word) mod R)`, Object.keys(partitions).map((k) => {
          const r = Number(k)
          return box(<><b style={{ color: 'var(--chalk)' }}>partition {r}</b><br />{partitions[r].map((p) => p[0]).join(' · ') || '—'}</>, r)
        }), stage < 2)}
        {col(`${R} reduce worker${R > 1 ? 's' : ''} sum per key`, Object.keys(reduced).map((k) => {
          const r = Number(k)
          return box(<><b style={{ color: 'var(--chalk)' }}>reducer {r}</b><br />{reduced[r].map(([w, n]) => `${w}: ${n}`).join('  ') || '—'}</>, r)
        }), stage < 3)}
      </div>

      <div className={s.stats}>
        <Stat label="splits" value={splits.length} />
        <Stat label="intermediate pairs" value={pairs} />
        <Stat label="unique keys" value={unique} />
        <Stat label="output files" value={R} hint="one per reducer" />
      </div>
      <Read>
        {stage === 0 && 'You wrote two functions. map turns a line into (word, 1) pairs; reduce sums the values for one word. Everything else on this screen is the framework.'}
        {stage === 1 && 'Every split is processed independently, so with a thousand machines you would run a thousand maps at once. A map worker never needs to know about any other.'}
        {stage === 2 && 'The same word always hashes to the same partition, so all of its pairs land on one reducer, wherever they were produced. This shuffle is the only step that moves data between machines.'}
        {stage === 3 && 'Each reducer sees every pair for its keys and nothing else, so it can sum without coordination. If a worker dies, its split or partition is simply re-run elsewhere.'}
      </Read>
    </Sim>
  )
}
