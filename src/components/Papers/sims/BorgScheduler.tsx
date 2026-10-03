'use client'

/**
 * A pocket Borg: four machines, two priority bands. Production jobs are
 * placed first and may evict batch work; evicted batch tasks go back to the
 * queue and run when space frees. The readout compares this shared pool
 * with keeping separate clusters for the two kinds of work.
 */

import { useState } from 'react'
import { Sim, Controls, Btn, Stat, Read, s, dg } from './ui'

interface Task { id: number; kind: 'prod' | 'batch'; cpu: number }
const MACHINES = 4
const CAP = 16

export default function BorgScheduler() {
  const [placed, setPlaced] = useState<Task[][]>(() => Array.from({ length: MACHINES }, () => []))
  const [queue, setQueue] = useState<Task[]>([])
  const [nextId, setNextId] = useState(1)
  const [evictions, setEvictions] = useState(0)
  const [log, setLog] = useState<string[]>(['Empty cluster. Submit work.'])

  const used = (m: Task[]) => m.reduce((n, t) => n + t.cpu, 0)
  const say = (m: string) => setLog((l) => [m, ...l].slice(0, 6))

  const schedule = (tasks: Task[], machines: Task[][], q: Task[]) => {
    let ev = 0
    const ms = machines.map((m) => [...m])
    const pending: Task[] = []
    for (const t of tasks) {
      // best fit: the machine that would be left with the least free CPU
      const fits = ms.map((m, i) => ({ i, free: CAP - used(m) })).filter((x) => x.free >= t.cpu).sort((a, b) => a.free - b.free)
      if (fits.length) { ms[fits[0].i].push(t); continue }
      if (t.kind === 'prod') {
        // evict the fewest batch cores that make room
        const cand = ms.map((m, i) => ({ i, batch: m.filter((x) => x.kind === 'batch').reduce((n, x) => n + x.cpu, 0), free: CAP - used(m) }))
          .filter((x) => x.free + x.batch >= t.cpu).sort((a, b) => a.batch - b.batch)
        if (cand.length) {
          const m = ms[cand[0].i]
          let need = t.cpu - (CAP - used(m))
          const keep: Task[] = []
          for (const x of m.sort((a, b) => b.cpu - a.cpu)) {
            if (x.kind === 'batch' && need > 0) { need -= x.cpu; pending.push(x); ev++ } else keep.push(x)
          }
          ms[cand[0].i] = [...keep, t]
          continue
        }
      }
      pending.push(t)
    }
    return { ms, pending: [...q.filter((x) => !tasks.includes(x)), ...pending], ev }
  }

  const submit = (kind: 'prod' | 'batch', count: number) => {
    const fresh: Task[] = Array.from({ length: count }, (_, i) => ({ id: nextId + i, kind, cpu: kind === 'prod' ? 6 : 2 + ((nextId + i) % 3) * 2 }))
    setNextId(nextId + count)
    // batch work waiting in the queue gets another chance after prod has been placed
    const { ms, pending, ev } = schedule([...fresh, ...queue], placed, [])
    setPlaced(ms); setQueue(pending); setEvictions((e) => e + ev)
    say(kind === 'prod'
      ? `Prod job (${fresh[0].cpu} cores) placed${ev ? ` after evicting ${ev} batch task${ev === 1 ? '' : 's'}, which went back to the queue` : ' by best fit'}.`
      : `${count} batch task${count === 1 ? '' : 's'} submitted; ${pending.length} waiting for space. Batch runs on whatever is left over.`)
  }
  const finish = () => {
    const ms = placed.map((m) => m.filter((t) => t.kind !== 'batch'))
    const { ms: ms2, pending } = schedule(queue, ms, [])
    setPlaced(ms2); setQueue(pending); say('Batch tasks finished; queued ones were admitted into the freed space.')
  }
  const reset = () => { setPlaced(Array.from({ length: MACHINES }, () => [])); setQueue([]); setNextId(1); setEvictions(0); setLog(['Empty cluster.']) }

  const prodCores = placed.flat().filter((t) => t.kind === 'prod').reduce((n, t) => n + t.cpu, 0)
  const batchCores = placed.flat().filter((t) => t.kind === 'batch').reduce((n, t) => n + t.cpu, 0)
  const util = Math.round((100 * (prodCores + batchCores)) / (MACHINES * CAP))
  const separate = Math.ceil(prodCores / CAP) + Math.ceil(batchCores / CAP)
  const shared = Math.max(1, Math.ceil((prodCores + batchCores) / CAP))

  return (
    <Sim
      title="One pool for production and batch"
      note="Production jobs must run; batch jobs run when they can. Submit both and watch placement, eviction and the machines you would need if the two kinds had separate clusters."
    >
      <Controls>
        <div className={s.btnRow}>
          <Btn primary onClick={() => submit('prod', 1)}>Submit prod job</Btn>
          <Btn onClick={() => submit('batch', 1)}>Submit batch task</Btn>
          <Btn onClick={() => submit('batch', 4)}>Submit 4 batch</Btn>
          <Btn onClick={finish} disabled={!placed.flat().some((t) => t.kind === 'batch')}>Batch finishes</Btn>
          <Btn onClick={reset}>Reset</Btn>
        </div>
      </Controls>

      <svg viewBox="0 0 660 150" role="img" aria-label="Four machines with their CPU allocation">
        {placed.map((m, i) => {
          const x = 10 + i * 162
          let cursor = 0
          return (
            <g key={i}>
              <text x={x} y="14" className={dg.dgTextS}>machine {i + 1} · {used(m)}/{CAP} cores</text>
              <rect x={x} y="22" width="150" height="90" rx="6" className={dg.dgBox} strokeWidth="1" />
              {m.map((t) => {
                const h = (t.cpu / CAP) * 90
                const y = 112 - cursor - h
                cursor += h
                return (
                  <g key={t.id}>
                    <rect x={x + 1} y={y} width="148" height={h - 1} rx="2" fill={t.kind === 'prod' ? 'var(--accent)' : 'var(--faint)'} fillOpacity={t.kind === 'prod' ? 0.55 : 0.35} />
                    <text x={x + 75} y={y + h / 2 + 3} textAnchor="middle" className={dg.dgTextHi} style={{ fontSize: 8.5 }}>{t.kind} {t.cpu}c</text>
                  </g>
                )
              })}
            </g>
          )
        })}
        <text x="10" y="138" className={dg.dgTextS}>queue: {queue.length} task{queue.length === 1 ? '' : 's'} waiting</text>
      </svg>

      <div className={s.stats}>
        <Stat label="utilisation" value={`${util}%`} />
        <Stat label="evictions" value={evictions} hint="batch preempted by prod" />
        <Stat label="machines needed" value={`${shared} shared`} unit={`vs ${separate} separate`} hint="the paper measured 20–30% savings from sharing" />
      </div>
      <div className={s.log}>{log.map((m, i) => <div key={i}>{i === 0 ? <b>{m}</b> : m}</div>)}</div>
      <Read>Priority is the whole trick. Production work is placed as if the batch work were not there; batch work soaks up the gaps and accepts being thrown out. Separate clusters would each need headroom for their own peaks; one pool shares the headroom.</Read>
    </Sim>
  )
}
