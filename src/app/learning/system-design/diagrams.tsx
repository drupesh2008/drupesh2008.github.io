/**
 * Figures for the System Design pathway — drawn with the shared diagram
 * vocabulary so both theme exposures re-ink them.
 */
import { pathwayStyles as s } from '@/components/Pathway/Pathway'

/** the boxes every design interview draws, with the budget written under them */
export function RequestAnatomy() {
  const hops = [
    { label: 'client', note: '' },
    { label: 'DNS', note: '~1 RTT, cached' },
    { label: 'LB / CDN', note: 'terminate TLS' },
    { label: 'app server', note: 'your code' },
    { label: 'cache', note: '~1 ms' },
    { label: 'database', note: '~10 ms' },
  ]
  return (
    <svg viewBox="0 0 660 150" role="img" aria-label="A request passes client, DNS, load balancer, app server, cache and database, each hop with its own cost">
      {hops.map((h, i) => {
        const x = 8 + i * 110
        return (
          <g key={h.label}>
            <rect x={x} y="40" width="94" height="34" rx="7" className={i === 4 ? s.dgBoxHi : s.dgBox} strokeWidth="1.1" />
            <text x={x + 47} y="61" textAnchor="middle" className={s.dgTextHi} style={{ fontSize: 11 }}>{h.label}</text>
            {h.note && (
              <text x={x + 47} y="92" textAnchor="middle" className={s.dgTextS} style={{ fontSize: 8.5 }}>{h.note}</text>
            )}
            {i < hops.length - 1 && <line x1={x + 94} y1="57" x2={x + 110} y2="57" className={s.dgAcc} strokeWidth="1.1" />}
          </g>
        )
      })}
      <text x="8" y="22" className={s.dgTextS}>the p99 budget is spent here, one hop at a time</text>
      <text x="8" y="128" className={s.dgTextAcc}>a cache hit ends the story at ~1 ms · a miss pays the database and warms the next hit</text>
    </svg>
  )
}

/** two storage engine families and where each pays its cost */
export function BTreeVsLsm() {
  return (
    <svg viewBox="0 0 660 240" role="img" aria-label="A B-tree updates pages in place and reads in one descent; an LSM tree appends fast and reads across levels until compaction merges them">
      {/* B-tree side */}
      <text x="160" y="22" textAnchor="middle" className={s.dgTextHi}>B-tree · read-optimised</text>
      <rect x="120" y="38" width="80" height="26" rx="5" className={s.dgBox} strokeWidth="1.1" />
      <text x="160" y="55" textAnchor="middle" className={s.dgText} style={{ fontSize: 10 }}>root</text>
      {[52, 160, 268].map((x) => (
        <g key={x}>
          <rect x={x - 32} y="96" width="64" height="24" rx="5" className={s.dgBox} strokeWidth="1.1" />
          <line x1="160" y1="64" x2={x} y2="96" className={s.dgLine} strokeWidth="1" />
        </g>
      ))}
      <rect x="20" y="152" width="280" height="24" rx="5" className={s.dgBoxHi} strokeWidth="1.1" />
      <text x="160" y="168" textAnchor="middle" className={s.dgText} style={{ fontSize: 10 }}>leaf pages · updated in place</text>
      <line x1="52" y1="120" x2="90" y2="152" className={s.dgLine} strokeWidth="1" />
      <line x1="160" y1="120" x2="160" y2="152" className={s.dgLine} strokeWidth="1" />
      <line x1="268" y1="120" x2="230" y2="152" className={s.dgLine} strokeWidth="1" />
      <text x="160" y="200" textAnchor="middle" className={s.dgTextS}>read: one descent · write: in place</text>

      {/* divider */}
      <line x1="330" y1="30" x2="330" y2="210" className={`${s.dgLine} ${s.dgDash}`} strokeWidth="1" />

      {/* LSM side */}
      <text x="500" y="22" textAnchor="middle" className={s.dgTextHi}>LSM · write-optimised</text>
      <rect x="410" y="38" width="180" height="24" rx="5" className={s.dgBoxHi} strokeWidth="1.1" />
      <text x="500" y="54" textAnchor="middle" className={s.dgText} style={{ fontSize: 10 }}>memtable · append, in RAM</text>
      <line x1="500" y1="62" x2="500" y2="82" className={s.dgAcc} strokeWidth="1.1" />
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <rect x={410 - i * 28} y={88 + i * 34} width={180 + i * 56} height="22" rx="5" className={s.dgBox} strokeWidth="1.1" opacity={1 - i * 0.18} />
          <text x="500" y={103 + i * 34} textAnchor="middle" className={s.dgText} style={{ fontSize: 9.5 }}>
            {i === 0 ? 'L0 · flushed runs' : i === 1 ? 'L1 · merged, sorted' : 'L2 · older, larger'}
          </text>
        </g>
      ))}
      <text x="500" y="200" textAnchor="middle" className={s.dgTextS}>write: append · read: newest level first</text>
      <text x="330" y="230" textAnchor="middle" className={s.dgTextAcc}>same data, opposite bets — pick by the workload’s read/write mix</text>
    </svg>
  )
}

/** an append-only log with consumers at their own offsets */
export function TheLog() {
  return (
    <svg viewBox="0 0 660 190" role="img" aria-label="Producers append to an ordered log; consumers read at their own offsets and can replay history">
      <text x="8" y="20" className={s.dgTextS}>old → new</text>
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
        <g key={i}>
          <rect x={8 + i * 66} y="32" width="58" height="30" rx="4" className={i === 7 ? s.dgBoxHi : s.dgBox} strokeWidth="1.1" />
          <text x={8 + i * 66 + 29} y="51" textAnchor="middle" className={s.dgText} style={{ fontSize: 10 }}>{i}</text>
        </g>
      ))}
      <line x1="592" y1="14" x2="592" y2="47" className={s.dgAcc} strokeWidth="1.1" />
      <text x="600" y="20" className={s.dgTextAcc}>append</text>

      {/* consumers */}
      <g>
        <line x1="169" y1="66" x2="169" y2="98" className={s.dgAcc} strokeWidth="1.1" />
        <text x="169" y="114" textAnchor="middle" className={s.dgText} style={{ fontSize: 10 }}>analytics · offset 2</text>
      </g>
      <g>
        <line x1="367" y1="66" x2="367" y2="132" className={s.dgAcc} strokeWidth="1.1" />
        <text x="367" y="148" textAnchor="middle" className={s.dgText} style={{ fontSize: 10 }}>search indexer · offset 5</text>
      </g>
      <g>
        <line x1="565" y1="66" x2="565" y2="98" className={s.dgAcc} strokeWidth="1.1" />
        <text x="565" y="114" textAnchor="middle" className={s.dgText} style={{ fontSize: 10 }}>cache invalidator · offset 7</text>
      </g>
      <text x="8" y="178" className={s.dgTextAcc}>one ordered history, many readers at their own pace — rewind an offset and the past replays</text>
    </svg>
  )
}
