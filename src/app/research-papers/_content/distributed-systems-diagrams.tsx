/**
 * Figures for the Distributed Systems papers — drawn with the shared diagram
 * vocabulary so both theme exposures re-ink them.
 */
import { pathwayStyles as s } from '@/components/Pathway/Pathway'

/** two machines, two clocks: the reply is stamped before the request */
export function ClockSkew() {
  return (
    <svg viewBox="0 0 660 190" role="img" aria-label="Machine A sends at its 10:00:05; machine B, whose clock is behind, receives it at its 10:00:02">
      <text x="60" y="26" textAnchor="middle" className={s.dgTextS}>machine A · clock fast</text>
      <text x="600" y="26" textAnchor="middle" className={s.dgTextS}>machine B · clock slow</text>
      <line x1="60" x2="60" y1="40" y2="170" className={s.dgLine} strokeWidth="1.1" />
      <line x1="600" x2="600" y1="40" y2="170" className={s.dgLine} strokeWidth="1.1" />
      <line x1="66" y1="70" x2="594" y2="112" className={s.dgAcc} strokeWidth="1.3" />
      <text x="40" y="74" textAnchor="end" className={s.dgTextHi} style={{ fontSize: 11 }}>sent 10:00:05</text>
      <text x="620" y="116" className={s.dgTextHi} style={{ fontSize: 11 }}>received 10:00:02</text>
      <text x="330" y="80" textAnchor="middle" className={s.dgText}>the message takes 40 ms</text>
      <text x="330" y="160" textAnchor="middle" className={s.dgTextAcc}>by the clocks, it arrived three seconds before it left</text>
    </svg>
  )
}

/** a chain of events versus two events nobody can order */
export function HappensBefore() {
  const y = [40, 100, 160]
  return (
    <svg viewBox="0 0 660 200" role="img" aria-label="Three processes; events joined by messages are ordered, events on different processes without a connecting chain are concurrent">
      {['P1', 'P2', 'P3'].map((p, i) => (
        <g key={p}>
          <text x="16" y={y[i] + 4} className={s.dgTextS}>{p}</text>
          <line x1="50" x2="640" y1={y[i]} y2={y[i]} className={s.dgLine} strokeWidth="1" />
        </g>
      ))}
      {/* a → b → c chain */}
      <circle cx="120" cy={y[0]} r="9" className={s.dgBoxHi} strokeWidth="1.3" />
      <text x="120" y={y[0] - 16} textAnchor="middle" className={s.dgTextHi} style={{ fontSize: 11 }}>a</text>
      <line x1="128" y1={y[0] + 4} x2="252" y2={y[1] - 6} className={s.dgAcc} strokeWidth="1.2" />
      <circle cx="260" cy={y[1]} r="9" className={s.dgBoxHi} strokeWidth="1.3" />
      <text x="260" y={y[1] - 16} textAnchor="middle" className={s.dgTextHi} style={{ fontSize: 11 }}>b</text>
      <line x1="268" y1={y[1] + 4} x2="392" y2={y[2] - 6} className={s.dgAcc} strokeWidth="1.2" />
      <circle cx="400" cy={y[2]} r="9" className={s.dgBoxHi} strokeWidth="1.3" />
      <text x="400" y={y[2] + 24} textAnchor="middle" className={s.dgTextHi} style={{ fontSize: 11 }}>c</text>
      {/* an unrelated event */}
      <circle cx="520" cy={y[0]} r="9" className={s.dgBox} strokeWidth="1.3" />
      <text x="520" y={y[0] - 16} textAnchor="middle" className={s.dgText} style={{ fontSize: 11 }}>d</text>
      <text x="640" y="194" textAnchor="end" className={s.dgTextAcc}>a → b → c · d is concurrent with b and c, whatever the wall clocks say</text>
    </svg>
  )
}

/** the shape of a MapReduce job */
export function MapReduceFlow() {
  const box = (x: number, y: number, w: number, label: string, hi = false) => (
    <g>
      <rect x={x} y={y} width={w} height="28" rx="6" className={hi ? s.dgBoxHi : s.dgBox} strokeWidth="1.1" />
      <text x={x + w / 2} y={y + 18} textAnchor="middle" className={s.dgText} style={{ fontSize: 10.5 }}>{label}</text>
    </g>
  )
  return (
    <svg viewBox="0 0 660 230" role="img" aria-label="Input splits flow to map workers, intermediate files are partitioned by key to reduce workers, which write output files">
      {['split 0', 'split 1', 'split 2', 'split 3'].map((l, i) => box(10, 20 + i * 48, 80, l))}
      {['map', 'map', 'map', 'map'].map((l, i) => box(130, 20 + i * 48, 70, l, true))}
      {[0, 1, 2, 3].map((i) => <line key={i} x1="90" y1={34 + i * 48} x2="130" y2={34 + i * 48} className={s.dgLine} strokeWidth="1" />)}
      {[0, 1, 2, 3].map((i) => [0, 1].map((r) => (
        <line key={`${i}${r}`} x1="200" y1={34 + i * 48} x2="330" y2={60 + r * 96} className={`${s.dgLine} ${s.dgDash}`} strokeWidth="0.9" />
      )))}
      <text x="265" y="212" textAnchor="middle" className={s.dgTextAcc}>shuffle: hash(key) mod R</text>
      {['reduce 0', 'reduce 1'].map((l, r) => box(330, 46 + r * 96, 90, l, true))}
      {[0, 1].map((r) => <line key={r} x1="420" y1={60 + r * 96} x2="470" y2={60 + r * 96} className={s.dgLine} strokeWidth="1" />)}
      {['output 0', 'output 1'].map((l, r) => box(470, 46 + r * 96, 90, l))}
      <text x="610" y="64" className={s.dgTextS}>on GFS</text>
      <text x="610" y="160" className={s.dgTextS}>on GFS</text>
    </svg>
  )
}

/** the master re-runs the tasks of a dead worker */
export function MasterReexec() {
  return (
    <svg viewBox="0 0 660 170" role="img" aria-label="A master pings workers; when one stops answering, its tasks are reassigned to another">
      <rect x="20" y="60" width="110" height="40" rx="8" className={s.dgBoxHi} strokeWidth="1.2" />
      <text x="75" y="84" textAnchor="middle" className={s.dgTextHi}>master</text>
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <rect x="250" y={16 + i * 52} width="120" height="36" rx="8" className={s.dgBox} strokeWidth="1.1" opacity={i === 1 ? 0.4 : 1} />
          <text x="310" y={38 + i * 52} textAnchor="middle" className={s.dgText}>worker {i + 1}{i === 1 ? ' · silent' : ''}</text>
          <line x1="130" y1="80" x2="250" y2={34 + i * 52} className={`${s.dgLine} ${i === 1 ? s.dgDash : ''}`} strokeWidth="1" />
        </g>
      ))}
      <text x="190" y="30" className={s.dgTextS}>ping</text>
      <line x1="370" y1="68" x2="470" y2="34" className={s.dgAcc} strokeWidth="1.3" />
      <text x="480" y="30" className={s.dgTextAcc}>map tasks 4, 5 → re-run on worker 1</text>
      <text x="480" y="48" className={s.dgText} style={{ fontSize: 10.5 }}>their output lived on the dead disk</text>
      <text x="480" y="130" className={s.dgText} style={{ fontSize: 10.5 }}>finished reduce tasks stay: their</text>
      <text x="480" y="146" className={s.dgText} style={{ fontSize: 10.5 }}>output is already on GFS</text>
    </svg>
  )
}

/** a partition splits two replicas; both keep accepting writes */
export function WriteDuringPartition() {
  return (
    <svg viewBox="0 0 660 200" role="img" aria-label="Two data centres cut off from each other; each accepts a cart update; later the two versions are merged">
      <rect x="20" y="30" width="250" height="120" rx="10" className={s.dgBox} strokeWidth="1.1" />
      <rect x="390" y="30" width="250" height="120" rx="10" className={s.dgBox} strokeWidth="1.1" />
      <text x="145" y="52" textAnchor="middle" className={s.dgTextS}>data centre east</text>
      <text x="515" y="52" textAnchor="middle" className={s.dgTextS}>data centre west</text>
      <line x1="270" y1="90" x2="390" y2="90" className={`${s.dgLine} ${s.dgDash}`} strokeWidth="1.2" />
      <text x="330" y="80" textAnchor="middle" className={s.dgTextAcc} style={{ fontSize: 13 }}>✕</text>
      <text x="330" y="112" textAnchor="middle" className={s.dgTextS}>link down</text>
      <text x="145" y="96" textAnchor="middle" className={s.dgTextHi} style={{ fontSize: 11.5 }}>cart = {'{'}book{'}'} · add shoes</text>
      <text x="145" y="124" textAnchor="middle" className={s.dgTextAcc}>accepted: {'{'}book, shoes{'}'}</text>
      <text x="515" y="96" textAnchor="middle" className={s.dgTextHi} style={{ fontSize: 11.5 }}>cart = {'{'}book{'}'} · add lamp</text>
      <text x="515" y="124" textAnchor="middle" className={s.dgTextAcc}>accepted: {'{'}book, lamp{'}'}</text>
      <text x="330" y="184" textAnchor="middle" className={s.dgText}>when the link returns, both versions exist; the application merges them: {'{'}book, shoes, lamp{'}'}</text>
    </svg>
  )
}

/** vector clocks tell a store which versions descend from which */
export function VersionVectors() {
  const node = (x: number, y: number, label: string, vc: string, hi = false) => (
    <g>
      <rect x={x - 62} y={y - 20} width="124" height="40" rx="8" className={hi ? s.dgBoxHi : s.dgBox} strokeWidth="1.1" />
      <text x={x} y={y - 4} textAnchor="middle" className={s.dgTextHi} style={{ fontSize: 11 }}>{label}</text>
      <text x={x} y={y + 12} textAnchor="middle" className={s.dgTextAcc} style={{ fontSize: 9.5 }}>{vc}</text>
    </g>
  )
  return (
    <svg viewBox="0 0 660 210" role="img" aria-label="A version tree: D1 by node A, D2 by A, then two concurrent versions D3 by B and D4 by C, reconciled into D5">
      {node(330, 30, 'D1 · {book}', '[A:1]')}
      <line x1="330" y1="50" x2="330" y2="72" className={s.dgLine} strokeWidth="1" />
      {node(330, 92, 'D2 · {book, pen}', '[A:2]')}
      <line x1="300" y1="112" x2="200" y2="134" className={s.dgLine} strokeWidth="1" />
      <line x1="360" y1="112" x2="460" y2="134" className={s.dgLine} strokeWidth="1" />
      {node(180, 154, 'D3 · {book, pen, shoes}', '[A:2, B:1]', true)}
      {node(480, 154, 'D4 · {book, lamp}', '[A:2, C:1]', true)}
      <text x="330" y="150" textAnchor="middle" className={s.dgText} style={{ fontSize: 10.5 }}>neither vector dominates: concurrent</text>
      <text x="330" y="200" textAnchor="middle" className={s.dgTextAcc}>the read returns both; the app writes D5 = {'{'}book, pen, shoes, lamp{'}'} with [A:3, B:1, C:1]</text>
    </svg>
  )
}

/** Raft's three roles and the transitions between them */
export function RaftRoles() {
  const role = (x: number, label: string, hi = false) => (
    <g>
      <rect x={x - 60} y="70" width="120" height="44" rx="22" className={hi ? s.dgBoxHi : s.dgBox} strokeWidth="1.2" />
      <text x={x} y="97" textAnchor="middle" className={s.dgTextHi}>{label}</text>
    </g>
  )
  return (
    <svg viewBox="0 0 660 190" role="img" aria-label="Follower becomes candidate on timeout, candidate becomes leader on majority vote, any role returns to follower on seeing a higher term">
      {role(110, 'follower')}{role(330, 'candidate')}{role(550, 'leader', true)}
      <line x1="170" y1="86" x2="270" y2="86" className={s.dgAcc} strokeWidth="1.2" />
      <text x="220" y="78" textAnchor="middle" className={s.dgTextAcc} style={{ fontSize: 9 }}>timeout, no heartbeat</text>
      <line x1="390" y1="86" x2="490" y2="86" className={s.dgAcc} strokeWidth="1.2" />
      <text x="440" y="78" textAnchor="middle" className={s.dgTextAcc} style={{ fontSize: 9 }}>majority of votes</text>
      <path d="M330 114 C 330 150, 150 150, 120 114" className={`${s.dgLine} ${s.dgDash}`} strokeWidth="1" fill="none" />
      <text x="225" y="150" textAnchor="middle" className={s.dgText} style={{ fontSize: 9.5 }}>another leader appears, or split vote: new timeout</text>
      <path d="M550 114 C 560 170, 130 175, 110 116" className={`${s.dgLine} ${s.dgDash}`} strokeWidth="1" fill="none" />
      <text x="400" y="178" textAnchor="middle" className={s.dgText} style={{ fontSize: 9.5 }}>sees a higher term in any message: step down</text>
      <text x="330" y="30" textAnchor="middle" className={s.dgTextS}>terms only go up; one leader per term at most</text>
    </svg>
  )
}

/** two majorities of five always overlap */
export function MajorityOverlap() {
  const nodes = [80, 200, 320, 440, 560]
  return (
    <svg viewBox="0 0 660 180" role="img" aria-label="Five nodes; the majority that committed an entry and the majority that elects the next leader share at least one node">
      <rect x="40" y="44" width="360" height="56" rx="28" className={s.dgAcc} strokeWidth="1.2" fill="none" />
      <text x="50" y="36" className={s.dgTextAcc}>committed on these 3</text>
      <rect x="280" y="80" width="320" height="56" rx="28" className={`${s.dgLine} ${s.dgDash}`} strokeWidth="1.2" fill="none" />
      <text x="590" y="156" textAnchor="end" className={s.dgTextS}>voted for the new leader: these 3</text>
      {nodes.map((x, i) => (
        <g key={x}>
          <circle cx={x} cy={i < 3 ? 72 : 108} r="17" className={i === 2 ? s.dgBoxHi : s.dgBox} strokeWidth="1.2" />
          <text x={x} y={(i < 3 ? 72 : 108) + 4} textAnchor="middle" className={s.dgText} style={{ fontSize: 10.5 }}>n{i + 1}</text>
        </g>
      ))}
      <text x="330" y="172" textAnchor="middle" className={s.dgTextAcc}>n3 is in both, and n3 refuses to vote for anyone whose log lacks the entry</text>
    </svg>
  )
}

/** Spanner's layers: tablets, Paxos groups per tablet, two-phase commit across groups */
export function SpannerStack() {
  const group = (x: number, label: string) => (
    <g>
      <rect x={x} y="60" width="180" height="96" rx="10" className={s.dgBox} strokeWidth="1.1" />
      <text x={x + 90} y="80" textAnchor="middle" className={s.dgTextS}>{label}</text>
      {['zone A', 'zone B', 'zone C'].map((z, i) => (
        <g key={z}>
          <rect x={x + 12 + i * 54} y="92" width="46" height="26" rx="5" className={i === 0 ? s.dgBoxHi : s.dgBox} strokeWidth="1" />
          <text x={x + 35 + i * 54} y="109" textAnchor="middle" className={s.dgText} style={{ fontSize: 8.5 }}>{z}</text>
        </g>
      ))}
      <text x={x + 90} y="144" textAnchor="middle" className={s.dgTextAcc} style={{ fontSize: 9 }}>Paxos: leader in zone A</text>
    </g>
  )
  return (
    <svg viewBox="0 0 660 200" role="img" aria-label="Three tablets each replicated by a Paxos group across zones; a transaction touching two tablets runs two-phase commit between their leaders">
      {group(20, 'tablet: users a–m')}{group(240, 'tablet: users n–z')}{group(460, 'tablet: orders')}
      <path d="M110 60 C 110 20, 550 20, 550 60" className={s.dgAcc} strokeWidth="1.2" fill="none" />
      <text x="330" y="30" textAnchor="middle" className={s.dgTextAcc}>one transaction, two tablets: two-phase commit between the Paxos leaders</text>
      <text x="330" y="190" textAnchor="middle" className={s.dgText} style={{ fontSize: 10.5 }}>each write is durable on a majority of zones before the leader answers</text>
    </svg>
  )
}

/** a TrueTime reading is an interval, not a number */
export function TrueTimeInterval() {
  return (
    <svg viewBox="0 0 660 150" role="img" aria-label="A clock reading drawn as an interval that definitely contains the true time">
      <line x1="40" x2="620" y1="90" y2="90" className={s.dgLine} strokeWidth="1" />
      {[0, 1, 2, 3, 4, 5].map((i) => <line key={i} x1={40 + i * 116} x2={40 + i * 116} y1="86" y2="94" className={s.dgLine} strokeWidth="1" />)}
      <rect x="236" y="60" width="188" height="24" rx="6" className={s.dgBoxHi} strokeWidth="1.2" />
      <text x="330" y="76" textAnchor="middle" className={s.dgTextHi} style={{ fontSize: 11 }}>TT.now() = [earliest, latest]</text>
      <line x1="330" x2="330" y1="94" y2="118" className={s.dgAcc} strokeWidth="1.4" />
      <text x="330" y="134" textAnchor="middle" className={s.dgTextAcc}>true time is somewhere in here, guaranteed</text>
      <text x="236" y="52" textAnchor="middle" className={s.dgTextS}>− ε</text>
      <text x="424" y="52" textAnchor="middle" className={s.dgTextS}>+ ε</text>
      <text x="620" y="134" textAnchor="end" className={s.dgText} style={{ fontSize: 10.5 }}>ε ≈ 1–7 ms in the paper</text>
    </svg>
  )
}
