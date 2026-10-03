'use client'

/**
 * Dynamo's consistent-hash ring with virtual nodes and sloppy quorums. Keys
 * hash to a point; the next N distinct nodes clockwise own them. Remove a
 * node and watch how little moves; tune N, R and W and see what the quorum
 * guarantees.
 */

import { useMemo, useState } from 'react'
import { Sim, Controls, Slider, Btn, Stat, Read, s, dg, hash } from './ui'

const KEYS = ['cart:alice', 'cart:bob', 'cart:carol', 'cart:dan', 'cart:erin', 'cart:frank', 'cart:gina', 'cart:hal']
const NAMES = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']

function tokens(nodes: string[], vnodes: number) {
  const out: { node: string; pos: number }[] = []
  for (const n of nodes) for (let i = 0; i < vnodes; i++) out.push({ node: n, pos: hash(`${n}#${i}`) % 360 })
  return out.sort((a, b) => a.pos - b.pos)
}

function owners(key: string, toks: { node: string; pos: number }[], N: number): string[] {
  if (!toks.length) return []
  const p = hash(key) % 360
  let i = toks.findIndex((t) => t.pos >= p)
  if (i < 0) i = 0
  const out: string[] = []
  for (let k = 0; k < toks.length && out.length < N; k++) {
    const n = toks[(i + k) % toks.length].node
    if (!out.includes(n)) out.push(n)
  }
  return out
}

export default function DynamoRing() {
  const [count, setCount] = useState(5)
  const [vnodes, setVnodes] = useState(4)
  const [N, setN] = useState(3)
  const [R, setR] = useState(2)
  const [W, setW] = useState(2)
  const [removed, setRemoved] = useState<string | null>(null)

  const nodes = useMemo(() => NAMES.slice(0, count), [count])
  const live = useMemo(() => nodes.filter((n) => n !== removed), [nodes, removed])
  const before = useMemo(() => tokens(nodes, vnodes), [nodes, vnodes])
  const after = useMemo(() => tokens(live, vnodes), [live, vnodes])
  const n = Math.min(N, live.length)
  const table = KEYS.map((k) => {
    const was = owners(k, before, n), now = owners(k, after, n)
    return { key: k, was, now, moved: was.join() !== now.join() }
  })
  const moved = table.filter((t) => t.moved).length

  const cx = 150, cy = 150, r = 112
  const pt = (deg: number, rad = r) => [cx + rad * Math.cos(((deg - 90) * Math.PI) / 180), cy + rad * Math.sin(((deg - 90) * Math.PI) / 180)]
  const quorum = R + W > n

  return (
    <Sim
      title="A ring of nodes, a key, and a quorum"
      note="Keys hash to a point on the ring and belong to the next N distinct nodes clockwise. Virtual nodes spread each physical node around the ring so that load and recovery are shared evenly."
    >
      <Controls>
        <Slider label="Physical nodes" value={count} min={3} max={8} onChange={(v) => { setCount(v); setRemoved(null) }} />
        <Slider label="Virtual nodes each" value={vnodes} min={1} max={8} onChange={setVnodes} />
        <Slider label="Replicas (N)" value={N} min={1} max={3} onChange={(v) => { setN(v); setR(Math.min(R, v)); setW(Math.min(W, v)) }} />
        <Slider label="Read quorum (R)" value={R} min={1} max={N} onChange={setR} />
        <Slider label="Write quorum (W)" value={W} min={1} max={N} onChange={setW} />
        <div className={s.btnRow}>
          <Btn primary={!removed} onClick={() => setRemoved(removed ? null : nodes[Math.floor(nodes.length / 2)])}>
            {removed ? `Bring ${removed} back` : `Lose node ${nodes[Math.floor(nodes.length / 2)]}`}
          </Btn>
        </div>
      </Controls>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 300px) minmax(0, 1fr)', gap: 18, alignItems: 'start' }}>
        <svg viewBox="0 0 300 300" role="img" aria-label="Consistent hashing ring with node tokens and keys">
          <circle cx={cx} cy={cy} r={r} className={dg.dgLine} strokeWidth="1.2" fill="none" />
          {after.map((t, i) => {
            const [x, y] = pt(t.pos)
            return (
              <g key={`${t.node}${i}`}>
                <rect x={x - 7} y={y - 7} width="14" height="14" rx="3" className={dg.dgBox} strokeWidth="1" />
                <text x={x} y={y + 3.5} textAnchor="middle" className={dg.dgTextHi} style={{ fontSize: 9 }}>{t.node}</text>
              </g>
            )
          })}
          {removed && before.filter((t) => t.node === removed).map((t, i) => {
            const [x, y] = pt(t.pos)
            return <text key={i} x={x} y={y + 4} textAnchor="middle" className={dg.dgTextAcc} style={{ fontSize: 12 }}>✕</text>
          })}
          {KEYS.map((k) => {
            const p = hash(k) % 360
            const [x, y] = pt(p, r - 22)
            const [lx, ly] = pt(p, r - 40)
            return (
              <g key={k}>
                <circle cx={x} cy={y} r="4" className={dg.dgAccFill} />
                <text x={lx} y={ly + 3} textAnchor="middle" className={dg.dgText} style={{ fontSize: 7.5 }}>{k.split(':')[1]}</text>
              </g>
            )
          })}
          <text x={cx} y={cy + 4} textAnchor="middle" className={dg.dgTextS}>N = {n}</text>
        </svg>

        <table className={s.table}>
          <thead><tr><th>key</th><th>owners (clockwise)</th><th>{removed ? 'after losing ' + removed : ''}</th></tr></thead>
          <tbody>
            {table.map((t) => (
              <tr key={t.key}>
                <td>{t.key}</td>
                <td>{t.was.join(' → ')}</td>
                <td className={t.moved ? s.hi : s.muted}>{removed ? t.now.join(' → ') : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className={s.stats}>
        <Stat label="keys that moved" value={removed ? moved : 0} unit={`of ${KEYS.length}`} hint={removed ? 'only the lost node’s share, not everything' : 'remove a node to see'} />
        <Stat label="R + W vs N" value={`${R + W} ${quorum ? '>' : '≤'} ${n}`} hint={quorum ? 'every read overlaps the last write' : 'a read can miss the latest write'} />
      </div>
      <Read>
        {quorum
          ? `With R + W > N, any read set and any write set share at least one node, so a read returns the newest version on some replica. Dynamo lets you pick: W = 1 makes writes fast and available, R = ${n} then pays for it on reads.`
          : `With R + W ≤ N there is a combination of replicas where the read never meets the write; you get availability and speed and accept stale reads, which vector clocks and read-repair clean up later. This is the "eventually" in eventual consistency.`}
      </Read>
    </Sim>
  )
}
