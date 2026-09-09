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
      {/* commit line: entries 1–4 on majority?? entries 1-5 on two of three = majority; 4,5 missing on last */}
      <line x1="346" y1="20" x2="346" y2="160" className={`${s.dgAcc} ${s.dgDash}`} strokeWidth="1.2" />
      <text x="354" y="170" className={s.dgTextAcc}>committed — on a majority (2 of 3)</text>
      <text x="8" y="188" className={s.dgTextS}>the slow follower is behind, not wrong — it will catch up from the leader</text>
    </svg>
  )
}
