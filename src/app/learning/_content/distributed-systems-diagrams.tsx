/**
 * Figures for the Distributed Systems pathway — drawn with the shared
 * diagram vocabulary so both theme exposures re-ink them.
 */
import { pathwayStyles as s } from '@/components/Pathway/Pathway'

/** three different failures, one identical experience: silence */
export function TimeoutAmbiguity() {
  const panel = (x: number, title: string, cutAt: 'req' | 'work' | 'reply') => (
    <g>
      <text x={x + 95} y="30" textAnchor="middle" className={s.dgTextS}>{title}</text>
      <line x1={x + 20} y1="44" x2={x + 20} y2="150" className={s.dgLine} strokeWidth="1.1" />
      <line x1={x + 170} y1="44" x2={x + 170} y2="150" className={s.dgLine} strokeWidth="1.1" />
      <text x={x + 20} y="166" textAnchor="middle" className={s.dgText} style={{ fontSize: 10 }}>you</text>
      <text x={x + 170} y="166" textAnchor="middle" className={s.dgText} style={{ fontSize: 10 }}>server</text>
      {/* request */}
      {cutAt === 'req' ? (
        <>
          <line x1={x + 24} y1="60" x2={x + 95} y2="72" className={s.dgAcc} strokeWidth="1.2" />
          <text x={x + 106} y="80" className={s.dgTextAcc} style={{ fontSize: 12 }}>✕</text>
        </>
      ) : (
        <line x1={x + 24} y1="60" x2={x + 166} y2="82" className={s.dgAcc} strokeWidth="1.2" />
      )}
      {/* work / crash */}
      {cutAt === 'work' && (
        <text x={x + 170} y="102" textAnchor="middle" className={s.dgTextAcc} style={{ fontSize: 12 }}>✕</text>
      )}
      {cutAt !== 'req' && cutAt !== 'work' && (
        <>
          <line x1={x + 166} y1="100" x2={x + 95} y2="118" className={`${s.dgLine} ${s.dgDash}`} strokeWidth="1.1" />
          <text x={x + 84} y="126" className={s.dgTextAcc} style={{ fontSize: 12 }}>✕</text>
        </>
      )}
      {/* the waiting client */}
      <text x={x + 20} y="144" textAnchor="middle" className={s.dgText} style={{ fontSize: 13 }}>…</text>
    </g>
  )
  return (
    <svg viewBox="0 0 660 178" role="img" aria-label="Request lost, server crashed, or reply lost — the caller sees the same silence in all three cases">
      {panel(10, 'request lost', 'req')}
      {panel(235, 'crashed mid-work', 'work')}
      {panel(460, 'reply lost', 'reply')}
    </svg>
  )
}

/** R + W > N — why a read must meet at least one node that saw the write */
export function QuorumOverlap() {
  const nodes = [80, 205, 330, 455, 580]
  return (
    <svg viewBox="0 0 660 210" role="img" aria-label="Five replicas; a write to three and a read from three must overlap in at least one node">
      {/* write set */}
      <rect x="38" y="52" width="376" height="60" rx="30" className={s.dgAcc} strokeWidth="1.2" fill="none" />
      <text x="48" y="42" className={s.dgTextAcc}>write · W = 3</text>
      {/* read set */}
      <rect x="288" y="96" width="334" height="60" rx="30" className={`${s.dgLine} ${s.dgDash}`} strokeWidth="1.2" fill="none" />
      <text x="612" y="176" textAnchor="end" className={s.dgTextS}>read · R = 3</text>

      {nodes.map((x, i) => (
        <g key={x}>
          <circle cx={x} cy={i < 3 ? 82 : 126} r="17" className={i === 2 ? s.dgBoxHi : s.dgBox} strokeWidth="1.2" />
          <text x={x} y={(i < 3 ? 82 : 126) + 4} textAnchor="middle" className={s.dgText} style={{ fontSize: 10.5 }}>
            n{i + 1}
          </text>
        </g>
      ))}
      <text x="330" y="200" textAnchor="middle" className={s.dgTextAcc}>
        R + W &gt; N → the sets must share a node — here n3 — so some read replica has the new value
      </text>
    </svg>
  )
}

/** a leader replicating a log; an entry commits when a majority holds it */
export function ReplicatedLog() {
  const cell = (x: number, y: number, n: number, ok: boolean) => (
    <g>
      <rect x={x} y={y} width="42" height="26" rx="4" className={ok ? s.dgBoxHi : s.dgBox} strokeWidth="1.1" opacity={ok ? 1 : 0.55} />
      <text x={x + 21} y={y + 17} textAnchor="middle" className={s.dgText} style={{ fontSize: 10.5 }}>{n}</text>
    </g>
  )
  const row = (y: number, label: string, upto: number) => (
    <g>
      <text x="8" y={y + 17} className={s.dgTextHi} style={{ fontSize: 11 }}>{label}</text>
      {[1, 2, 3, 4, 5].map((n, i) => cell(96 + i * 50, y, n, n <= upto))}
    </g>
  )
  return (
    <svg viewBox="0 0 660 196" role="img" aria-label="A leader's log replicated to two followers; entries held by a majority are committed">
      {row(30, 'leader', 5)}
      {row(78, 'follower', 5)}
      {row(126, 'follower', 3)}
      {/* entries 1–5 are on two of three nodes, a majority; the third node holds only 1–3 */}
      <line x1="346" y1="20" x2="346" y2="160" className={`${s.dgAcc} ${s.dgDash}`} strokeWidth="1.2" />
      <text x="354" y="170" className={s.dgTextAcc}>committed — on a majority (2 of 3)</text>
      <text x="8" y="188" className={s.dgTextS}>the slow follower is behind, not wrong — it will catch up from the leader</text>
    </svg>
  )
}

/* ── shared helpers for the sequence-style figures below ─────────────── */

/** a line with a small filled arrowhead at (x2, y2) */
function Arrow({
  x1, y1, x2, y2, acc = false, dash = false,
}: { x1: number; y1: number; x2: number; y2: number; acc?: boolean; dash?: boolean }) {
  const a = Math.atan2(y2 - y1, x2 - x1)
  const L = 7
  const W = 3.4
  const bx = x2 - L * Math.cos(a)
  const by = y2 - L * Math.sin(a)
  const pts = [
    [x2, y2],
    [bx + W * Math.sin(a), by - W * Math.cos(a)],
    [bx - W * Math.sin(a), by + W * Math.cos(a)],
  ]
    .map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`)
    .join(' ')
  return (
    <g>
      <line
        x1={x1} y1={y1} x2={bx} y2={by}
        className={`${acc ? s.dgAcc : s.dgLine}${dash ? ` ${s.dgDash}` : ''}`}
        strokeWidth="1.2"
      />
      <polygon points={pts} className={acc ? s.dgAccFill : s.dgFaintFill} />
    </g>
  )
}

/** a vertical lifeline with its name on top */
function Lane({ x, label, y1 = 40, y2 }: { x: number; label: string; y1?: number; y2: number }) {
  return (
    <g>
      <text x={x} y={y1 - 12} textAnchor="middle" className={s.dgTextHi}>{label}</text>
      <line x1={x} y1={y1} x2={x} y2={y2} className={s.dgLine} strokeWidth="1.1" />
    </g>
  )
}

/** the same idempotency key on a retry finds the stored result instead of moving money twice */
export function IdempotentRetry() {
  return (
    <svg viewBox="0 0 660 250" role="img" aria-label="First attempt commits the transfer and stores the key, the reply is lost, the retry with the same key returns the stored result">
      <Lane x={80} label="API" y2={232} />
      <Lane x={330} label="wallet service" y2={232} />
      <Lane x={570} label="wallet database" y2={232} />

      <text x={205} y={52} textAnchor="middle" className={s.dgText}>POST /transfers · key k7f2</text>
      <Arrow x1={82} y1={58} x2={326} y2={70} />
      <text x={450} y={74} textAnchor="middle" className={s.dgText}>one transaction:</text>
      <Arrow x1={334} y1={80} x2={566} y2={86} />
      <text x={450} y={102} textAnchor="middle" className={s.dgTextS}>insert key + debit + credit</text>

      <line x1={326} y1={112} x2={210} y2={124} className={`${s.dgLine} ${s.dgDash}`} strokeWidth="1.2" />
      <text x={196} y={130} className={s.dgTextAcc} style={{ fontSize: 12 }}>✕</text>
      <text x={250} y={146} textAnchor="middle" className={s.dgTextS}>reply lost</text>
      <text x={88} y={150} className={s.dgTextAcc}>timeout · retry</text>

      <text x={205} y={168} textAnchor="middle" className={s.dgText}>same key k7f2</text>
      <Arrow x1={82} y1={174} x2={326} y2={184} />
      <Arrow x1={334} y1={190} x2={566} y2={194} acc />
      <text x={450} y={186} textAnchor="middle" className={s.dgTextS}>key exists</text>
      <Arrow x1={326} y1={206} x2={84} y2={220} acc />
      <text x={205} y={238} textAnchor="middle" className={s.dgTextAcc}>stored result · no second debit</text>
    </svg>
  )
}

/** Lamport counters: a receive jumps past the sender's stamp */
export function LamportTimeline() {
  const ev = (x: number, y: number, n: number, below = false, hi = false) => (
    <g>
      <circle cx={x} cy={y} r="5" className={hi ? s.dgAccFill : s.dgFaintFill} />
      <text x={x} y={below ? y + 22 : y - 12} textAnchor="middle" className={hi ? s.dgTextAcc : s.dgText} style={hi ? { fontSize: 12 } : undefined}>
        {n}
      </text>
    </g>
  )
  return (
    <svg viewBox="0 0 660 210" role="img" aria-label="Server A sends at counter 5; server B at counter 2 receives it and jumps to 6">
      <text x={10} y={64} className={s.dgTextHi}>server A</text>
      <line x1={100} y1={60} x2={640} y2={60} className={s.dgLine} strokeWidth="1.2" />
      <text x={10} y={154} className={s.dgTextHi}>server B</text>
      <line x1={100} y1={150} x2={640} y2={150} className={s.dgLine} strokeWidth="1.2" />

      {ev(150, 60, 1)}
      {ev(220, 60, 2)}
      {ev(290, 60, 3)}
      {ev(360, 60, 4)}
      {ev(430, 60, 5, false, true)}
      <text x={430} y={30} textAnchor="middle" className={s.dgTextS}>send, stamped 5</text>

      {ev(190, 150, 1, true)}
      {ev(300, 150, 2, true)}
      <Arrow x1={432} y1={63} x2={516} y2={146} acc />
      {ev(520, 150, 6, true, true)}
      {ev(600, 150, 7, true)}
      <text x={520} y={196} textAnchor="middle" className={s.dgTextS}>receive: max(2, 5) + 1 = 6</text>
    </svg>
  )
}

/** a write acknowledged by the leader, then a read served by a follower that has not applied it */
export function ReplicationLag() {
  return (
    <svg viewBox="0 0 660 260" role="img" aria-label="The leader acknowledges a transfer; a read sent to the far follower returns the old balance because replication has not arrived yet">
      <Lane x={70} label="app" y2={238} />
      <Lane x={245} label="leader · DC-1" y2={238} />
      <Lane x={420} label="follower · DC-1" y2={238} />
      <Lane x={590} label="follower · DC-2" y2={238} />

      <text x={157} y={52} textAnchor="middle" className={s.dgText}>send ₹500</text>
      <Arrow x1={72} y1={58} x2={241} y2={66} />
      <text x={252} y={84} className={s.dgTextS}>₹2,000 → ₹1,500</text>
      <Arrow x1={241} y1={94} x2={74} y2={102} />
      <text x={157} y={116} textAnchor="middle" className={s.dgText}>ok</text>

      <Arrow x1={249} y1={96} x2={416} y2={104} />
      <Arrow x1={249} y1={98} x2={586} y2={208} dash />
      <text x={584} y={226} textAnchor="end" className={s.dgTextS}>applied ~80 ms later</text>

      <text x={330} y={140} textAnchor="middle" className={s.dgText}>GET balance</text>
      <Arrow x1={72} y1={146} x2={586} y2={154} />
      <Arrow x1={586} y1={168} x2={74} y2={178} acc />
      <text x={330} y={190} textAnchor="middle" className={s.dgTextAcc}>₹2,000 · the old value</text>
    </svg>
  )
}

/** a paused leaseholder wakes with an old token; storage refuses it */
export function FencingToken() {
  return (
    <svg viewBox="0 0 660 270" role="img" aria-label="Server A gets token 33 then pauses; its lease expires; server B gets token 34 and writes; A wakes and writes with 33 and storage rejects it">
      <Lane x={70} label="wallet A" y2={250} />
      <Lane x={245} label="lock service" y2={250} />
      <Lane x={420} label="wallet B" y2={250} />
      <Lane x={590} label="ledger storage" y2={250} />

      <Arrow x1={72} y1={52} x2={241} y2={58} />
      <Arrow x1={241} y1={68} x2={74} y2={74} />
      <text x={157} y={88} textAnchor="middle" className={s.dgText}>lease · token 33</text>

      <rect x={62} y={96} width={16} height={104} rx={3} className={s.dgBoxHi} strokeWidth="1.1" />
      <text x={86} y={150} className={s.dgTextAcc}>paused</text>

      <text x={252} y={118} className={s.dgTextS}>lease expires</text>
      <Arrow x1={416} y1={128} x2={249} y2={134} />
      <Arrow x1={249} y1={144} x2={416} y2={150} />
      <text x={332} y={164} textAnchor="middle" className={s.dgText}>token 34</text>
      <Arrow x1={424} y1={176} x2={586} y2={182} />
      <text x={505} y={170} textAnchor="middle" className={s.dgText}>write · 34 ✓</text>
      <text x={584} y={198} textAnchor="end" className={s.dgTextS}>highest seen = 34</text>

      <Arrow x1={72} y1={214} x2={586} y2={224} acc />
      <text x={330} y={212} textAnchor="middle" className={s.dgText}>write · token 33</text>
      <text x={584} y={244} textAnchor="end" className={s.dgTextAcc}>rejected · 33 &lt; 34</text>
    </svg>
  )
}

/** two-phase commit: after a yes vote, a participant cannot decide alone */
export function TwoPhaseDoubt() {
  return (
    <svg viewBox="0 0 660 260" role="img" aria-label="Coordinator sends prepare to two shards, both vote yes, the coordinator crashes before logging the decision, both shards hold locks in doubt">
      <Lane x={100} label="coordinator" y2={240} />
      <Lane x={360} label="shard 3 · Asha" y2={240} />
      <Lane x={580} label="shard 11 · Ravi" y2={240} />

      <Arrow x1={102} y1={52} x2={356} y2={64} />
      <Arrow x1={102} y1={54} x2={576} y2={76} />
      <text x={220} y={50} textAnchor="middle" className={s.dgText}>prepare</text>

      <Arrow x1={356} y1={96} x2={104} y2={108} />
      <Arrow x1={576} y1={102} x2={104} y2={118} />
      <text x={230} y={96} textAnchor="middle" className={s.dgText}>yes</text>

      <text x={100} y={146} textAnchor="middle" className={s.dgTextAcc} style={{ fontSize: 14 }}>✕</text>
      <text x={112} y={170} className={s.dgTextS}>crashed before</text>
      <text x={112} y={184} className={s.dgTextS}>logging commit</text>

      <rect x={352} y={90} width={16} height={136} rx={3} className={s.dgBoxHi} strokeWidth="1.1" />
      <rect x={572} y={96} width={16} height={130} rx={3} className={s.dgBoxHi} strokeWidth="1.1" />
      <text x={470} y={160} textAnchor="middle" className={s.dgTextAcc}>in doubt</text>
      <text x={470} y={176} textAnchor="middle" className={s.dgTextS}>locks held · cannot</text>
      <text x={470} y={190} textAnchor="middle" className={s.dgTextS}>commit or abort alone</text>
    </svg>
  )
}
