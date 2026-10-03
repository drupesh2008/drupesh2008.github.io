'use client'

/**
 * GFS in one picture: a master that knows where every chunk lives and
 * chunkservers that hold the bytes. Kill a server, watch chunks become
 * under-replicated, let the master repair them, and follow a read: metadata
 * from the master, data straight from a chunkserver.
 */

import { useMemo, useState } from 'react'
import { Sim, Controls, Slider, Btn, Stat, Read, s, dg } from './ui'

const SERVERS = 5
const REPL = 3

export default function GfsSim() {
  const [chunks, setChunks] = useState(4)
  const [dead, setDead] = useState<number[]>([])
  const [placement, setPlacement] = useState<number[][]>(() => initial(4))
  const [log, setLog] = useState<string[]>(['The master holds only metadata: file → chunks → which servers. Clients never stream data through it.'])

  function initial(n: number): number[][] {
    return Array.from({ length: n }, (_, c) => Array.from({ length: REPL }, (_, r) => (c * 2 + r) % SERVERS))
  }
  const say = (m: string) => setLog((l) => [m, ...l].slice(0, 6))

  const alive = (sv: number) => !dead.includes(sv)
  const copies = useMemo(() => placement.map((p) => p.filter(alive)), [placement, dead]) // eslint-disable-line react-hooks/exhaustive-deps
  const under = copies.map((c, i) => (c.length < REPL ? i : -1)).filter((i) => i >= 0)

  const kill = () => {
    const victim = Array.from({ length: SERVERS }, (_, i) => i).find((i) => alive(i) && placement.some((p) => p.includes(i)))
    if (victim == null) return
    setDead((d) => [...d, victim])
    const lost = placement.filter((p) => p.includes(victim)).length
    say(`Chunkserver ${victim + 1} stopped heartbeating. The master notices within seconds and marks ${lost} chunk${lost === 1 ? '' : 's'} as under-replicated. Reads keep working from the other copies.`)
  }
  const repair = () => {
    if (!under.length) return
    const next = placement.map((p, i) => {
      if (!under.includes(i)) return p
      const have = p.filter(alive)
      const target = Array.from({ length: SERVERS }, (_, sv) => sv).find((sv) => alive(sv) && !have.includes(sv))
      return target == null ? have : [...have, target]
    })
    setPlacement(next)
    say(`Re-replication: for each under-replicated chunk the master picks a healthy server without a copy and has it clone the chunk from a surviving replica. Priority goes to chunks furthest below ${REPL} copies.`)
  }
  const restore = () => { setDead([]); say('Servers are back. Their old copies still exist; the master now sees chunks with more than three replicas and will garbage-collect the extras lazily.') }
  const read = () => {
    const c = Math.floor(Math.random() * chunks)
    const from = copies[c][0]
    if (from == null) { say(`Read of chunk ${c + 1}: no live replica. This is what re-replication prevents.`); return }
    say(`Read of chunk ${c + 1}: client asks the master "where is chunk ${c + 1}?" → [${copies[c].map((x) => `CS${x + 1}`).join(', ')}] (a few bytes, cached). Then it fetches the 64 MB chunk from CS${from + 1} directly.`)
  }
  const resize = (n: number) => { setChunks(n); setPlacement(initial(n)); setDead([]); setLog(['Fresh placement: three copies of every chunk, spread across servers.']) }

  return (
    <Sim
      title="Lose a chunkserver, keep the file"
      note="A file is a list of 64 MB chunks; each chunk lives on three chunkservers. The master only knows where things are."
    >
      <Controls>
        <Slider label="Chunks in the file" value={chunks} min={2} max={6} onChange={resize} />
        <div className={s.btnRow}>
          <Btn onClick={kill} disabled={dead.length >= 2}>Kill a chunkserver</Btn>
          <Btn primary={under.length > 0} onClick={repair} disabled={!under.length}>Re-replicate</Btn>
          <Btn onClick={restore} disabled={!dead.length}>Restore servers</Btn>
          <Btn onClick={read}>Read a random chunk</Btn>
        </div>
      </Controls>

      <svg viewBox="0 0 660 200" role="img" aria-label="Master metadata table and five chunkservers holding chunk replicas">
        <rect x="8" y="10" width="150" height="180" rx="8" className={dg.dgBoxHi} strokeWidth="1.2" />
        <text x="83" y="30" textAnchor="middle" className={dg.dgTextAcc}>master · metadata</text>
        {placement.map((p, c) => (
          <text key={c} x="18" y={50 + c * 22} className={dg.dgText} style={{ fontSize: 9.5 }}>
            chunk {c + 1} → {copies[c].map((x) => `CS${x + 1}`).join(' ') || '—'}
          </text>
        ))}
        {Array.from({ length: SERVERS }, (_, sv) => {
          const x = 180 + sv * 96
          const held = placement.map((p, c) => (p.includes(sv) ? c : -1)).filter((c) => c >= 0)
          const down = !alive(sv)
          return (
            <g key={sv} opacity={down ? 0.35 : 1}>
              <rect x={x} y="10" width="86" height="180" rx="8" className={dg.dgBox} strokeWidth="1.2" />
              <text x={x + 43} y="30" textAnchor="middle" className={down ? dg.dgTextAcc : dg.dgTextS}>CS{sv + 1}{down ? ' · down' : ''}</text>
              {held.map((c, i) => (
                <g key={c}>
                  <rect x={x + 10} y={42 + i * 24} width="66" height="18" rx="4" className={under.includes(c) ? dg.dgBoxHi : dg.dgBox} strokeWidth="1" />
                  <text x={x + 43} y={55 + i * 24} textAnchor="middle" className={dg.dgText} style={{ fontSize: 9.5 }}>chunk {c + 1}</text>
                </g>
              ))}
            </g>
          )
        })}
      </svg>

      <div className={s.stats}>
        <Stat label="chunks" value={chunks} unit={`× ${REPL} copies`} />
        <Stat label="under-replicated" value={under.length} hint={under.length ? 'readable, but one more failure from loss' : 'every chunk has three live copies'} />
        <Stat label="servers up" value={SERVERS - dead.length} unit={`of ${SERVERS}`} />
      </div>
      <div className={s.log}>{log.map((m, i) => <div key={i}>{i === 0 ? <b>{m}</b> : m}</div>)}</div>
      <Read>Failure is not an exception here, it is the steady state: the master expects servers to vanish and treats a missing replica as routine work. Because clients fetch data directly from chunkservers, a single master can coordinate thousands of them without becoming the bottleneck.</Read>
    </Sim>
  )
}
