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

/** consistent hashing — a ring of key space; a node's arrival moves one arc */
export function HashRing() {
  const cx = 190, cy = 108, r = 78
  const node = (deg: number, label: string, hot = false) => {
    const a = ((deg - 90) * Math.PI) / 180
    const x = cx + r * Math.cos(a), y = cy + r * Math.sin(a)
    const lx = cx + (r + 26) * Math.cos(a), ly = cy + (r + 26) * Math.sin(a)
    return (
      <g>
        <circle cx={x} cy={y} r="9" className={hot ? s.dgBoxHi : s.dgBox} strokeWidth="1.2" />
        <text x={lx} y={ly + 3} textAnchor="middle" className={hot ? s.dgTextAcc : s.dgText} style={{ fontSize: 9.5 }}>{label}</text>
      </g>
    )
  }
  return (
    <svg viewBox="0 0 660 216" role="img" aria-label="Keys hash onto a ring owned in arcs by nodes; adding a node takes over one arc instead of reshuffling everything">
      <circle cx={cx} cy={cy} r={r} className={s.dgLine} strokeWidth="1.2" fill="none" />
      {/* the arc the new node takes over */}
      <path d={`M ${cx + r * Math.cos(((-90 + 300) * Math.PI) / 180)} ${cy + r * Math.sin(((-90 + 300) * Math.PI) / 180)}
               A ${r} ${r} 0 0 1 ${cx + r * Math.cos(((-90 + 352) * Math.PI) / 180)} ${cy + r * Math.sin(((-90 + 352) * Math.PI) / 180)}`}
        className={s.dgAcc} strokeWidth="3" fill="none" opacity="0.85" />
      {node(0, 'A')}
      {node(105, 'B')}
      {node(215, 'C')}
      {node(300, 'D · new', true)}
      {/* a key hashing clockwise to its owner */}
      <circle cx={cx + r * Math.cos(((-90 + 330) * Math.PI) / 180)} cy={cy + r * Math.sin(((-90 + 330) * Math.PI) / 180)} r="3" className={s.dgAccFill} />
      <text x="352" y="52" className={s.dgText} style={{ fontSize: 10.5 }}>a key hashes to a point on the ring and</text>
      <text x="352" y="68" className={s.dgText} style={{ fontSize: 10.5 }}>belongs to the next node clockwise</text>
      <text x="352" y="98" className={s.dgText} style={{ fontSize: 10.5 }}>D arriving claims only the marked arc —</text>
      <text x="352" y="114" className={s.dgText} style={{ fontSize: 10.5 }}>~1/N of keys move; the rest stay put</text>
      <text x="352" y="144" className={s.dgTextS}>vs hash(key) mod N: nearly every key moves</text>
      <text x="352" y="176" className={s.dgTextS}>virtual nodes: each machine owns many small</text>
      <text x="352" y="190" className={s.dgTextS}>arcs, smoothing load and rebalancing</text>
    </svg>
  )
}

/** circuit breaker — the three states and what moves between them */
export function CircuitStates() {
  const box = (x: number, label: string, sub: string, hot = false) => (
    <g>
      <rect x={x} y="70" width="150" height="46" rx="9" className={hot ? s.dgBoxHi : s.dgBox} strokeWidth="1.2" />
      <text x={x + 75} y="90" textAnchor="middle" className={s.dgTextHi} style={{ fontSize: 11.5 }}>{label}</text>
      <text x={x + 75} y="106" textAnchor="middle" className={s.dgTextS} style={{ fontSize: 8.5 }}>{sub}</text>
    </g>
  )
  return (
    <svg viewBox="0 0 660 190" role="img" aria-label="A circuit breaker moves from closed to open on repeated failures, to half-open after a cooldown, and back to closed on a successful probe">
      {box(20, 'closed', 'calls flow · failures counted')}
      {box(255, 'open', 'calls refused instantly', true)}
      {box(490, 'half-open', 'a few probes allowed')}
      <path d="M 170 82 C 200 70, 225 70, 255 82" className={s.dgAcc} strokeWidth="1.2" fill="none" />
      <text x="212" y="58" textAnchor="middle" className={s.dgText} style={{ fontSize: 9.5 }}>failure rate trips</text>
      <path d="M 405 82 C 435 70, 460 70, 490 82" className={s.dgAcc} strokeWidth="1.2" fill="none" />
      <text x="447" y="58" textAnchor="middle" className={s.dgText} style={{ fontSize: 9.5 }}>cooldown expires</text>
      <path d="M 492 112 C 434 148, 324 148, 262 114" className={`${s.dgLine} ${s.dgDash}`} strokeWidth="1.1" fill="none" />
      <text x="374" y="124" textAnchor="middle" className={s.dgTextS} style={{ fontSize: 8.5 }}>probe fails → open again</text>
      <path d="M 500 118 C 380 190, 160 182, 88 122" className={s.dgAcc} strokeWidth="1.1" fill="none" />
      <text x="300" y="186" textAnchor="middle" className={s.dgText} style={{ fontSize: 9.5 }}>probe succeeds → closed</text>
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
