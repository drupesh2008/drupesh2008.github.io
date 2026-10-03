'use client'

/**
 * Lamport's happens-before, live. Three processes exchange messages; every
 * event gets a Lamport timestamp (what the paper gives you) and, underneath,
 * a vector clock (so the page can tell you the truth about concurrency).
 * Click two events to ask whether one happened before the other.
 */

import { useState } from 'react'
import { Sim, Controls, Btn, Read, s, dg } from './ui'

type Kind = 'local' | 'send' | 'recv'
interface Ev { id: number; proc: number; kind: Kind; t: number; vc: number[]; from?: number }

const PROCS = ['P1', 'P2', 'P3']
const MAX = 14

function last(events: Ev[], p: number): { t: number; vc: number[] } {
  for (let i = events.length - 1; i >= 0; i--) if (events[i].proc === p) return { t: events[i].t, vc: events[i].vc }
  return { t: 0, vc: [0, 0, 0] }
}

function preset(): Ev[] {
  let out: Ev[] = []
  const api = {
    local: (p: number) => { out = withLocal(out, p) },
    msg: (a: number, b: number) => { out = withMsg(out, a, b) },
  }
  api.local(0); api.msg(0, 1); api.local(2); api.msg(2, 0); api.msg(1, 2); api.local(1)
  return out
}

function withLocal(events: Ev[], p: number): Ev[] {
  const { t, vc } = last(events, p)
  const nvc = [...vc]; nvc[p]++
  return [...events, { id: events.length, proc: p, kind: 'local', t: t + 1, vc: nvc }]
}

function withMsg(events: Ev[], a: number, b: number): Ev[] {
  const la = last(events, a)
  const svc = [...la.vc]; svc[a]++
  const send: Ev = { id: events.length, proc: a, kind: 'send', t: la.t + 1, vc: svc }
  const lb = last([...events, send], b)
  const rvc = lb.vc.map((v, i) => Math.max(v, send.vc[i])); rvc[b]++
  const recv: Ev = { id: events.length + 1, proc: b, kind: 'recv', t: Math.max(lb.t, send.t) + 1, vc: rvc, from: send.id }
  return [...events, send, recv]
}

const before = (x: Ev, y: Ev) => x.vc.every((v, i) => v <= y.vc[i]) && x.vc.some((v, i) => v < y.vc[i])

export default function LamportClocks() {
  const [events, setEvents] = useState<Ev[]>(preset)
  const [sel, setSel] = useState<number[]>([])
  const [from, setFrom] = useState(0)
  const [to, setTo] = useState(1)

  const full = events.length >= MAX
  const pick = (id: number) => setSel((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id].slice(-2)))

  const x = (i: number) => 54 + i * 44
  const y = (p: number) => 46 + p * 78
  const W = Math.max(640, 54 + MAX * 44 + 20)

  let verdict: string | null = null
  if (sel.length === 2) {
    const [a, b] = sel.map((id) => events[id])
    const name = (e: Ev) => `${PROCS[e.proc]}'s event with clock ${e.t}`
    if (before(a, b)) verdict = `${name(a)} happened before ${name(b)}: there is a chain of local steps and messages from one to the other, and the Lamport clocks agree (${a.t} < ${b.t}).`
    else if (before(b, a)) verdict = `${name(b)} happened before ${name(a)}: a chain of events connects them, and the clocks agree (${b.t} < ${a.t}).`
    else verdict = `These two are concurrent: no chain of messages connects them, so neither happened before the other, even though their Lamport clocks (${a.t} and ${b.t}) still put one first. A Lamport clock orders every pair; it just cannot tell you when the order is real.`
  }

  return (
    <Sim
      title="Build a history, then ask which event came first"
      note="Add local events and messages, then click any two events. The number on each event is its Lamport clock; the verdict below uses the true happens-before relation."
    >
      <Controls>
        <label className={s.ctl}>
          <span className={s.ctlLabel}>Local event on</span>
          <div className={s.btnRow}>
            {PROCS.map((p, i) => <Btn key={p} onClick={() => setEvents((e) => withLocal(e, i))} disabled={full}>{p}</Btn>)}
          </div>
        </label>
        <label className={s.ctl}>
          <span className={s.ctlLabel}>Message</span>
          <div className={s.btnRow}>
            <select className={s.select} value={from} onChange={(e) => setFrom(Number(e.target.value))}>
              {PROCS.map((p, i) => <option key={p} value={i}>{p}</option>)}
            </select>
            <span className={s.ctlLabel}>to</span>
            <select className={s.select} value={to} onChange={(e) => setTo(Number(e.target.value))}>
              {PROCS.map((p, i) => <option key={p} value={i}>{p}</option>)}
            </select>
            <Btn primary onClick={() => setEvents((e) => withMsg(e, from, to))} disabled={full || from === to || events.length >= MAX - 1}>Send</Btn>
          </div>
        </label>
        <Btn onClick={() => { setEvents(preset()); setSel([]) }}>Reset</Btn>
      </Controls>

      <svg viewBox={`0 0 ${W} 250`} role="img" aria-label="Three process timelines with events and messages">
        {PROCS.map((p, i) => (
          <g key={p}>
            <text x="8" y={y(i) + 4} className={dg.dgTextS}>{p}</text>
            <line x1="40" x2={W - 10} y1={y(i)} y2={y(i)} className={dg.dgLine} strokeWidth="1" />
          </g>
        ))}
        {events.map((e) => e.from != null && (
          <line key={`m${e.id}`} x1={x(e.from)} y1={y(events[e.from].proc)} x2={x(e.id)} y2={y(e.proc)}
            className={dg.dgAcc} strokeWidth="1.2" markerEnd="url(#lamport-arrow)" />
        ))}
        <defs>
          <marker id="lamport-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
            <path d="M0,0 L8,4 L0,8 z" className={dg.dgAccFill} />
          </marker>
        </defs>
        {events.map((e) => {
          const on = sel.includes(e.id)
          return (
            <g key={e.id} onClick={() => pick(e.id)} style={{ cursor: 'pointer' }}>
              <circle cx={x(e.id)} cy={y(e.proc)} r="13" className={on ? dg.dgBoxHi : dg.dgBox} strokeWidth={on ? 2 : 1.2} />
              <text x={x(e.id)} y={y(e.proc) + 4} textAnchor="middle" className={on ? dg.dgTextHi : dg.dgText} style={{ fontSize: 11 }}>{e.t}</text>
              <text x={x(e.id)} y={y(e.proc) + 28} textAnchor="middle" className={dg.dgTextS} style={{ fontSize: 8 }}>
                {e.kind === 'local' ? 'local' : e.kind}
              </text>
            </g>
          )
        })}
        <text x={W - 10} y="244" textAnchor="end" className={dg.dgTextS}>time runs left to right · messages are the arrows</text>
      </svg>

      {verdict ? <Read>{verdict}</Read> : (
        <Read>Click two events to compare them. Each is labelled with its Lamport clock: a local step adds one, and a message carries its sender&apos;s clock so the receiver jumps past it.</Read>
      )}
    </Sim>
  )
}
