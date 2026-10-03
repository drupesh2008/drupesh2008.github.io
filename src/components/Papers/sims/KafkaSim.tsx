'use client'

/**
 * A Kafka topic as the paper describes it: partitions that are append-only
 * logs, producers that choose a partition by key, and a consumer group whose
 * members each own some partitions and remember an offset. Replay is just
 * resetting the offset.
 */

import { useState } from 'react'
import { Sim, Controls, Slider, Btn, Stat, Read, s, dg, hash } from './ui'

const USERS = ['alice', 'bob', 'carol', 'dan']

export default function KafkaSim() {
  const [P, setP] = useState(3)
  const [C, setC] = useState(2)
  const [key, setKey] = useState<string>('alice')
  const [parts, setParts] = useState<string[][]>(() => Array.from({ length: 4 }, () => []))
  const [offsets, setOffsets] = useState<number[]>(() => Array(4).fill(0))
  const [rr, setRr] = useState(0)

  const produce = (n: number) => {
    const next = parts.map((p) => [...p])
    let r = rr
    for (let i = 0; i < n; i++) {
      const k = key === 'none' ? USERS[Math.floor(Math.random() * USERS.length)] : key
      const p = key === 'none' ? r++ % P : hash(k) % P
      next[p].push(k)
    }
    setParts(next); setRr(r)
  }
  const consume = () => setOffsets((o) => o.map((off, p) => (p < P && off < parts[p].length ? off + 1 : off)))
  const replay = () => setOffsets(Array(4).fill(0))
  const reset = () => { setParts(Array.from({ length: 4 }, () => [])); setOffsets(Array(4).fill(0)); setRr(0) }

  const owner = (p: number) => p % C
  const lag = parts.slice(0, P).reduce((n, p, i) => n + (p.length - offsets[i]), 0)
  const cellW = 44

  return (
    <Sim
      title="Produce to partitions, consume as a group"
      note="Messages with the same key always land in the same partition, so one user's events stay in order. Consumers in a group split the partitions between them and each keeps an offset."
    >
      <Controls>
        <Slider label="Partitions" value={P} min={1} max={4} onChange={(v) => { setP(v); reset() }} />
        <Slider label="Consumers in group" value={C} min={1} max={4} onChange={setC} />
        <label className={s.ctl}>
          <span className={s.ctlLabel}>Producer key</span>
          <select className={s.select} value={key} onChange={(e) => setKey(e.target.value)}>
            {USERS.map((u) => <option key={u} value={u}>{u}</option>)}
            <option value="none">no key (round-robin)</option>
          </select>
        </label>
        <div className={s.btnRow}>
          <Btn primary onClick={() => produce(1)}>Produce</Btn>
          <Btn onClick={() => produce(5)}>Produce ×5</Btn>
          <Btn onClick={consume}>Consume one each</Btn>
          <Btn onClick={replay}>Replay from 0</Btn>
          <Btn onClick={reset}>Reset</Btn>
        </div>
      </Controls>

      <svg viewBox="0 0 660 190" role="img" aria-label="Topic partitions with messages and consumer offsets">
        {Array.from({ length: P }, (_, p) => {
          const y = 14 + p * 42
          const msgs = parts[p].slice(-10)
          const base = Math.max(0, parts[p].length - 10)
          return (
            <g key={p}>
              <text x="8" y={y + 17} className={dg.dgTextS}>P{p}</text>
              <text x="8" y={y + 30} className={dg.dgText} style={{ fontSize: 8.5 }}>→ C{owner(p) + 1}</text>
              {msgs.map((m, i) => {
                const idx = base + i
                const consumed = idx < offsets[p]
                return (
                  <g key={idx}>
                    <rect x={50 + i * cellW} y={y} width={cellW - 4} height="26" rx="4" className={consumed ? dg.dgBoxHi : dg.dgBox} strokeWidth="1"
                      fill={consumed ? 'var(--accent)' : undefined} fillOpacity={consumed ? 0.16 : undefined} />
                    <text x={50 + i * cellW + (cellW - 4) / 2} y={y + 12} textAnchor="middle" className={dg.dgText} style={{ fontSize: 8.5 }}>{m}</text>
                    <text x={50 + i * cellW + (cellW - 4) / 2} y={y + 22} textAnchor="middle" className={dg.dgTextS} style={{ fontSize: 7.5 }}>#{idx}</text>
                  </g>
                )
              })}
              {parts[p].length > 0 && (
                <line x1={50 + Math.min(10, Math.max(0, offsets[p] - base)) * cellW - 2} x2={50 + Math.min(10, Math.max(0, offsets[p] - base)) * cellW - 2}
                  y1={y - 4} y2={y + 30} className={dg.dgAcc} strokeWidth="2" />
              )}
            </g>
          )
        })}
        <text x="652" y="184" textAnchor="end" className={dg.dgTextS}>filled = consumed by the group · the bar is the group&apos;s offset</text>
      </svg>

      <div className={s.stats}>
        <Stat label="messages" value={parts.slice(0, P).reduce((n, p) => n + p.length, 0)} />
        <Stat label="group lag" value={lag} hint="unread messages across partitions" />
        <Stat label="active consumers" value={Math.min(C, P)} unit={`of ${C}`} hint={C > P ? `${C - P} idle: more consumers than partitions` : 'each owns at least one partition'} />
      </div>
      <Read>
        {C > P
          ? 'A partition is read by exactly one consumer in a group, so parallelism is capped by the partition count; the extra consumers wait. Pick partitions for the parallelism you will need, not the one you have.'
          : 'The broker keeps no per-message state. Each group simply remembers how far it has read, so a new system can start from offset zero and replay history, and a crashed consumer resumes from its last offset. Messages are kept for a retention period whether anyone read them or not.'}
      </Read>
    </Sim>
  )
}
