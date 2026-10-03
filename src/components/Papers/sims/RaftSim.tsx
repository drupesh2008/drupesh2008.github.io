'use client'

/**
 * A five-node Raft cluster you drive by hand: elections, log replication,
 * commits on a majority, a leader crash and the recovery rule that the new
 * leader must hold every committed entry. Simplified to the paper's core
 * (no timing, no partitions) so each step is one visible cause and effect.
 */

import { useState } from 'react'
import { Sim, Controls, Btn, Stat, Read, s, dg } from './ui'

type Role = 'follower' | 'candidate' | 'leader'
interface Entry { term: number; cmd: string }
interface Node { id: number; role: Role; term: number; log: Entry[]; alive: boolean }

const SIZE = 5
const MAJ = Math.floor(SIZE / 2) + 1
const fresh = (): Node[] => Array.from({ length: SIZE }, (_, id) => ({ id, role: 'follower', term: 0, log: [], alive: true }))
const CMDS = ['set x=1', 'set y=2', 'incr x', 'del y', 'set z=9', 'set x=7']

export default function RaftSim() {
  const [nodes, setNodes] = useState<Node[]>(fresh)
  const [commit, setCommit] = useState(0)
  const [events, setEvents] = useState<string[]>(['Five followers, term 0, empty logs. Nothing happens until a timeout fires.'])
  const [n, setN] = useState(0)

  const leader = nodes.find((x) => x.role === 'leader' && x.alive) ?? null
  const say = (m: string) => setEvents((e) => [m, ...e].slice(0, 8))

  const timeout = () => {
    // the follower with the most complete log is the one Raft would let win
    const alive = nodes.filter((x) => x.alive && x.role !== 'leader')
    if (!alive.length) return
    const cand = [...alive].sort((a, b) => b.log.length - a.log.length)[0]
    const term = Math.max(...nodes.map((x) => x.term)) + 1
    const voters = nodes.filter((x) => x.alive && x.log.length <= cand.log.length).length
    const won = voters >= MAJ
    setNodes((ns) => ns.map((x) => {
      if (x.id === cand.id) return { ...x, role: won ? 'leader' : 'candidate', term }
      if (!x.alive) return x
      return { ...x, role: 'follower', term }
    }))
    say(won
      ? `Node ${cand.id + 1} timed out, started term ${term}, got ${voters} of ${SIZE} votes → leader. Nodes only vote for a candidate whose log is at least as complete as theirs.`
      : `Node ${cand.id + 1} timed out and started term ${term}, but only ${voters} nodes are up: no majority, no leader. The cluster cannot make progress.`)
  }

  const write = () => {
    if (!leader) return
    const cmd = CMDS[n % CMDS.length]
    const entry = { term: leader.term, cmd }
    const replicas = nodes.filter((x) => x.alive).length
    const idx = leader.log.length + 1
    setNodes((ns) => ns.map((x) => (x.alive && (x.id === leader.id || x.role === 'follower') ? { ...x, log: [...x.log, entry] } : x)))
    setN(n + 1)
    if (replicas >= MAJ) {
      setCommit(idx)
      say(`Client sent "${cmd}". Leader appended it at index ${idx} and replicated to ${replicas - 1} followers → on ${replicas} of ${SIZE} nodes, so it is committed and applied.`)
    } else {
      say(`Client sent "${cmd}". Leader appended it, but only ${replicas} nodes are up: it sits uncommitted until a majority holds it.`)
    }
  }

  const crash = () => {
    if (!leader) return
    setNodes((ns) => ns.map((x) => (x.id === leader.id ? { ...x, alive: false, role: 'follower' } : x)))
    say(`Leader (node ${leader.id + 1}) crashed. Followers hear no heartbeats; one of them will time out next.`)
  }
  const crashFollower = () => {
    const f = nodes.find((x) => x.alive && x.role === 'follower')
    if (!f) return
    setNodes((ns) => ns.map((x) => (x.id === f.id ? { ...x, alive: false } : x)))
    say(`Node ${f.id + 1} crashed. ${nodes.filter((x) => x.alive).length - 1} of ${SIZE} remain; a majority is ${MAJ}.`)
  }
  const restore = () => {
    setNodes((ns) => ns.map((x) => (x.alive ? x : { ...x, alive: true, role: 'follower', term: leader?.term ?? x.term, log: leader ? [...leader.log] : x.log })))
    say(leader ? 'Crashed nodes are back. The leader overwrites their logs with its own, so they catch up.' : 'Crashed nodes are back as followers with the logs they had.')
  }
  const reset = () => { setNodes(fresh()); setCommit(0); setN(0); setEvents(['Reset. Five followers, empty logs.']) }

  const maxLog = Math.max(1, ...nodes.map((x) => x.log.length))
  const alive = nodes.filter((x) => x.alive).length

  return (
    <Sim
      title="Drive a five-node cluster"
      note="Fire a timeout to elect a leader, send writes and watch them commit when a majority holds them, then crash the leader and see who may replace it."
    >
      <Controls>
        <div className={s.btnRow}>
          <Btn primary={!leader} onClick={timeout}>Election timeout</Btn>
          <Btn primary={!!leader} onClick={write} disabled={!leader}>Client write</Btn>
          <Btn onClick={crash} disabled={!leader}>Crash leader</Btn>
          <Btn onClick={crashFollower} disabled={!nodes.some((x) => x.alive && x.role === 'follower')}>Crash a follower</Btn>
          <Btn onClick={restore} disabled={alive === SIZE}>Restore all</Btn>
          <Btn onClick={reset}>Reset</Btn>
        </div>
      </Controls>

      <svg viewBox="0 0 660 190" role="img" aria-label="Five Raft nodes with their roles, terms and logs">
        {nodes.map((x, i) => {
          const y = 14 + i * 34
          return (
            <g key={x.id} opacity={x.alive ? 1 : 0.35}>
              <rect x="8" y={y} width="118" height="26" rx="6" className={x.role === 'leader' ? dg.dgBoxHi : dg.dgBox} strokeWidth="1.2" />
              <text x="18" y={y + 17} className={dg.dgTextHi} style={{ fontSize: 11 }}>node {x.id + 1}</text>
              <text x="118" y={y + 17} textAnchor="end" className={x.role === 'leader' ? dg.dgTextAcc : dg.dgTextS} style={{ fontSize: 8.5 }}>
                {x.alive ? x.role : 'down'} · t{x.term}
              </text>
              {Array.from({ length: maxLog }, (_, j) => {
                const e = x.log[j]
                const committed = e && j < commit
                return (
                  <g key={j}>
                    <rect x={140 + j * 84} y={y + 2} width="78" height="22" rx="4"
                      className={e ? (committed ? dg.dgBoxHi : dg.dgBox) : dg.dgBox} strokeWidth="1" opacity={e ? 1 : 0.25}
                      fill={committed ? 'var(--accent)' : undefined} fillOpacity={committed ? 0.18 : undefined} />
                    {e && <text x={179 + j * 84} y={y + 16} textAnchor="middle" className={dg.dgText} style={{ fontSize: 9.5 }}>{e.cmd} · t{e.term}</text>}
                  </g>
                )
              })}
            </g>
          )
        })}
        <text x="652" y="184" textAnchor="end" className={dg.dgTextS}>filled = committed (on a majority) · outline = replicated, not yet safe</text>
      </svg>

      <div className={s.stats}>
        <Stat label="leader" value={leader ? `node ${leader.id + 1}` : 'none'} hint={leader ? `term ${leader.term}` : 'no writes possible'} />
        <Stat label="nodes up" value={`${alive} / ${SIZE}`} hint={alive >= MAJ ? `majority of ${MAJ} available` : 'below majority: stalled, not wrong'} />
        <Stat label="commit index" value={commit} />
      </div>
      <div className={s.log}>{events.map((e, i) => <div key={i}>{i === 0 ? <b>{e}</b> : e}</div>)}</div>
      <Read>Everything Raft promises follows from one rule: an entry counts as committed only when a majority holds it, and only a node whose log is at least as complete as a majority can become leader. Two majorities always overlap, so a committed entry can never be lost by an election.</Read>
    </Sim>
  )
}
