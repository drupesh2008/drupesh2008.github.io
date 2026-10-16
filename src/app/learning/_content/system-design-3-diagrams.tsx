/**
 * Figures for the System Design pathway, part 3 (jobs through the atlas),
 * drawn with the shared diagram vocabulary so both theme exposures re-ink them.
 */
import { pathwayStyles as s } from '@/components/Pathway/Pathway'

/** a straight connector with a small filled head at (x2, y2) */
function Arrow({ x1, y1, x2, y2, acc = true, dash = false }: { x1: number; y1: number; x2: number; y2: number; acc?: boolean; dash?: boolean }) {
  const a = Math.atan2(y2 - y1, x2 - x1)
  const h = 6.5
  const w = 3.4
  const bx = x2 - h * Math.cos(a)
  const by = y2 - h * Math.sin(a)
  const pts = `${x2},${y2} ${bx + w * Math.sin(a)},${by - w * Math.cos(a)} ${bx - w * Math.sin(a)},${by + w * Math.cos(a)}`
  return (
    <g>
      <line x1={x1} y1={y1} x2={bx} y2={by} className={`${acc ? s.dgAcc : s.dgLine}${dash ? ` ${s.dgDash}` : ''}`} strokeWidth="1.2" />
      <polygon points={pts} className={acc ? s.dgAccFill : s.dgFaintFill} />
    </g>
  )
}

function Box({ x, y, w, h, title, sub, hot = false }: { x: number; y: number; w: number; h: number; title: string; sub?: string; hot?: boolean }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx="7" className={hot ? s.dgBoxHi : s.dgBox} strokeWidth="1.1" />
      <text x={x + w / 2} y={sub ? y + h / 2 - 2 : y + h / 2 + 4} textAnchor="middle" className={s.dgTextHi} style={{ fontSize: 11 }}>{title}</text>
      {sub && (
        <text x={x + w / 2} y={y + h / 2 + 12} textAnchor="middle" className={s.dgTextS} style={{ fontSize: 8 }}>{sub}</text>
      )}
    </g>
  )
}

/** a queue hands out leases, not messages: ack deletes, silence redelivers, repeated failure parks */
export function JobLease() {
  return (
    <svg viewBox="0 0 660 250" role="img" aria-label="The order service writes a job through an outbox into a queue; a worker leases it, calls the provider with an idempotency key and acknowledges; an expired lease redelivers the job; after five failed attempts it moves to a dead-letter queue">
      <Box x={8} y={70} w={120} h={46} title="order service" sub="order + outbox row" />
      <Box x={176} y={70} w={130} h={46} title="queue" sub="refund #8812 ready" hot />
      <Box x={366} y={70} w={120} h={46} title="worker" sub="holds a lease" />
      <Box x={532} y={70} w={120} h={46} title="provider" sub="refund API" />

      <Arrow x1={128} y1={93} x2={176} y2={93} />
      <text x="152" y="62" textAnchor="middle" className={s.dgTextS} style={{ fontSize: 8 }}>relay</text>

      <Arrow x1={306} y1={86} x2={366} y2={86} />
      <text x="336" y="62" textAnchor="middle" className={s.dgTextS} style={{ fontSize: 8 }}>lease 60 s</text>

      <Arrow x1={486} y1={93} x2={532} y2={93} />
      <text x="509" y="62" textAnchor="middle" className={s.dgTextS} style={{ fontSize: 8 }}>idem key</text>

      {/* ack back to the queue */}
      <Arrow x1={366} y1={104} x2={306} y2={104} acc={false} />
      <text x="336" y="132" textAnchor="middle" className={s.dgText} style={{ fontSize: 9.5 }}>ack → deleted</text>

      {/* lease expiry loop */}
      <path d="M 426 116 L 426 160 L 260 160 L 260 122" className={`${s.dgAcc} ${s.dgDash}`} strokeWidth="1.2" fill="none" />
      <polygon points="260,116 256.6,123 263.4,123" className={s.dgAccFill} />
      <text x="343" y="176" textAnchor="middle" className={s.dgText} style={{ fontSize: 9.5 }}>no ack before the lease ends → visible again, attempt + 1</text>

      {/* dead letter */}
      <Arrow x1={210} y1={116} x2={210} y2={196} acc={false} />
      <Box x={150} y={196} w={140} h={40} title="dead-letter queue" sub="after 5 attempts" />
      <text x="304" y="214" className={s.dgTextS} style={{ fontSize: 8 }}>alert on first arrival · a human reads the error</text>

      <text x="8" y="26" className={s.dgTextAcc}>the queue never knows whether the refund happened, only whether it was acked</text>
    </svg>
  )
}

/** a token bucket simulated over three minutes: bursts spend, time refills, empty means 429 */
export function TokenBucket() {
  const cap = 5
  const rate = 1 / 30
  const reqs = [0, 3, 6, 9, 12, 15, 40, 44, 100, 104, 160]
  const x0 = 270, x1 = 644, yTop = 44, yBot = 174, tMax = 180
  const X = (t: number) => x0 + ((x1 - x0) * t) / tMax
  const Y = (k: number) => yBot - ((yBot - yTop) * k) / cap
  const pts: string[] = []
  const marks: { t: number; ok: boolean }[] = []
  let tokens = cap
  let last = 0
  pts.push(`${X(0)},${Y(tokens)}`)
  for (const t of [...reqs, tMax]) {
    tokens = Math.min(cap, tokens + (t - last) * rate)
    last = t
    pts.push(`${X(t)},${Y(tokens)}`)
    if (t === tMax) break
    const ok = tokens >= 1
    if (ok) tokens -= 1
    marks.push({ t, ok })
    pts.push(`${X(t)},${Y(tokens)}`)
  }
  return (
    <svg viewBox="0 0 660 230" role="img" aria-label="A token bucket of five refilling at one token every thirty seconds; a burst of five passes, the sixth request is refused, and later requests pass as tokens trickle back">
      {/* the bucket */}
      <text x="128" y="24" textAnchor="middle" className={s.dgTextS}>refill r = 1 per 30 s</text>
      <Arrow x1={128} y1={30} x2={128} y2={56} />
      <path d="M 62 62 L 74 168 L 182 168 L 194 62" className={s.dgLine} strokeWidth="1.4" fill="none" />
      {[0, 1, 2].map((i) => (
        <circle key={i} cx={98 + i * 30} cy={152} r="9" className={s.dgAccFill} opacity="0.85" />
      ))}
      <circle cx={113} cy={132} r="9" className={s.dgAccFill} opacity="0.85" />
      <text x="128" y="190" textAnchor="middle" className={s.dgText} style={{ fontSize: 10 }}>capacity b = 5 tokens</text>
      <text x="128" y="208" textAnchor="middle" className={s.dgTextS} style={{ fontSize: 8 }}>each request spends one · none left → 429</text>

      {/* the trace */}
      <line x1={x0} y1={yBot} x2={x1} y2={yBot} className={s.dgLine} strokeWidth="1" />
      <line x1={x0} y1={yTop} x2={x0} y2={yBot} className={s.dgLine} strokeWidth="1" />
      <text x={x0 - 6} y={yTop + 4} textAnchor="end" className={s.dgTextS} style={{ fontSize: 8 }}>5</text>
      <text x={x0 - 6} y={yBot + 3} textAnchor="end" className={s.dgTextS} style={{ fontSize: 8 }}>0</text>
      {[0, 60, 120, 180].map((t) => (
        <text key={t} x={X(t)} y={yBot + 16} textAnchor="middle" className={s.dgTextS} style={{ fontSize: 8 }}>{t} s</text>
      ))}
      <polyline points={pts.join(' ')} className={s.dgAcc} strokeWidth="1.5" fill="none" />
      {marks.map((m, i) => (
        m.ok ? (
          <line key={i} x1={X(m.t)} y1={yTop - 14} x2={X(m.t)} y2={yTop - 4} className={s.dgAcc} strokeWidth="1.4" />
        ) : (
          <text key={i} x={X(m.t)} y={yTop - 4} textAnchor="middle" className={s.dgTextAcc} style={{ fontSize: 11 }}>✕</text>
        )
      ))}
      <text x={x0} y="20" className={s.dgTextS} style={{ fontSize: 8 }}>tokens over time · ticks = requests let through · ✕ = refused</text>
      <text x={x0} y="222" className={s.dgTextAcc} style={{ fontSize: 9 }}>bursts are allowed up to b; the long-run rate never exceeds r</text>
    </svg>
  )
}

/** retries at every layer multiply: three attempts at three layers is twenty-seven calls */
export function RetryAmplification() {
  const layers = [
    { t: 'Dabba app', n: '1 tap' },
    { t: 'order service', n: '3 calls' },
    { t: 'payment client', n: '9 calls' },
    { t: 'provider', n: '27 calls' },
  ]
  return (
    <svg viewBox="0 0 660 190" role="img" aria-label="The app, the order service and the payment client each make three attempts, so one failed tap becomes twenty-seven calls on the payment provider">
      {layers.map((l, i) => {
        const x = 8 + i * 166
        return (
          <g key={l.t}>
            <Box x={x} y={56} w={130} h={40} title={l.t} hot={i === 3} />
            <text x={x + 65} y="120" textAnchor="middle" className={i === 3 ? s.dgTextAcc : s.dgText} style={{ fontSize: i === 3 ? 11 : 10 }}>{l.n}</text>
            {i < 3 && (
              <>
                <Arrow x1={x + 130} y1={76} x2={x + 166} y2={76} />
                <text x={x + 148} y="48" textAnchor="middle" className={s.dgTextS} style={{ fontSize: 8 }}>×3</text>
              </>
            )}
          </g>
        )
      })}
      <text x="8" y="24" className={s.dgTextS}>each layer “helpfully” tries three times when the call below it fails</text>
      <text x="8" y="156" className={s.dgText} style={{ fontSize: 10 }}>the provider is slow because it is overloaded; the retries arrive as 27× the load</text>
      <text x="8" y="178" className={s.dgTextAcc} style={{ fontSize: 9.5 }}>retry at one layer, with backoff, jitter and a budget → at most ~3.3 calls per tap</text>
    </svg>
  )
}

/** each city is written in exactly one region and replicated to the other */
export function CityHoming() {
  const a = ['Mumbai', 'Pune', 'Delhi NCR', 'Jaipur', 'Ahmedabad']
  const b = ['Bengaluru', 'Hyderabad', 'Chennai', 'Kolkata', 'Kochi']
  const chips = (names: string[], x: number, y: number, home: boolean) =>
    names.map((n, i) => (
      <g key={n}>
        <rect x={x + (i % 3) * 92} y={y + Math.floor(i / 3) * 26} width="86" height="20" rx="5"
          className={home ? s.dgBoxHi : `${s.dgLine} ${s.dgDash}`} strokeWidth="1" fill="none" />
        <text x={x + (i % 3) * 92 + 43} y={y + Math.floor(i / 3) * 26 + 14} textAnchor="middle"
          className={home ? s.dgText : s.dgTextS} style={{ fontSize: home ? 9.5 : 8 }}>{n}</text>
      </g>
    ))
  return (
    <svg viewBox="0 0 660 270" role="img" aria-label="A city router sends each request to the region that homes its city; each region writes its own cities and holds read-only replicas of the other region's cities">
      <Box x={230} y={10} w={200} h={40} title="city router" sub="delivery address → city → home" hot />
      <Arrow x1={290} y1={50} x2={170} y2={80} />
      <Arrow x1={370} y1={50} x2={490} y2={80} />

      <rect x="8" y="80" width="312" height="150" rx="10" className={s.dgBox} strokeWidth="1.1" />
      <text x="20" y="100" className={s.dgTextHi} style={{ fontSize: 11 }}>region A · Mumbai</text>
      <text x="20" y="118" className={s.dgTextS} style={{ fontSize: 8 }}>homes (writes)</text>
      {chips(a, 20, 124, true)}
      <text x="20" y="190" className={s.dgTextS} style={{ fontSize: 8 }}>replicas of region B cities</text>
      <rect x="20" y="198" width="288" height="20" rx="5" className={`${s.dgLine} ${s.dgDash}`} strokeWidth="1" fill="none" />
      <text x="164" y="212" textAnchor="middle" className={s.dgTextS} style={{ fontSize: 8 }}>Bengaluru · Hyderabad · Chennai · …</text>

      <rect x="340" y="80" width="312" height="150" rx="10" className={s.dgBox} strokeWidth="1.1" />
      <text x="352" y="100" className={s.dgTextHi} style={{ fontSize: 11 }}>region B · Hyderabad</text>
      <text x="352" y="118" className={s.dgTextS} style={{ fontSize: 8 }}>homes (writes)</text>
      {chips(b, 352, 124, true)}
      <text x="352" y="190" className={s.dgTextS} style={{ fontSize: 8 }}>replicas of region A cities</text>
      <rect x="352" y="198" width="288" height="20" rx="5" className={`${s.dgLine} ${s.dgDash}`} strokeWidth="1" fill="none" />
      <text x="496" y="212" textAnchor="middle" className={s.dgTextS} style={{ fontSize: 8 }}>Mumbai · Pune · Delhi NCR · …</text>

      <text x="8" y="256" className={s.dgTextAcc} style={{ fontSize: 9 }}>failover = re-home a city: fence the old home, promote its replica, flip one router entry</text>
    </svg>
  )
}

/** expand, migrate, contract: every step leaves the previous code version working */
export function ExpandContract() {
  const steps = [
    { t: '1 · expand', a: 'add nullable', b: 'zone_id column', c: 'code unchanged' },
    { t: '2 · dual write', a: 'v2 writes both', b: 'reads old', c: 'new rows filled' },
    { t: '3 · backfill', a: '5k-row batches', b: 'rate-limited', c: 'old rows filled' },
    { t: '4 · switch read', a: 'v3 reads new', b: 'still writes both', c: 'compare, alarm' },
    { t: '5 · contract', a: 'v4 stops old write', b: 'drop column', c: 'a later release' },
  ]
  return (
    <svg viewBox="0 0 660 200" role="img" aria-label="Five steps to change a column without downtime: expand the schema, dual write, backfill, switch reads, then contract in a later release">
      <text x="8" y="22" className={s.dgTextS}>one schema change, five deploys · old and new code overlap at every step</text>
      {steps.map((st, i) => {
        const x = 8 + i * 131
        return (
          <g key={st.t}>
            <rect x={x} y="40" width="121" height="96" rx="7" className={i === 4 ? s.dgBoxHi : s.dgBox} strokeWidth="1.1" />
            <text x={x + 60} y="60" textAnchor="middle" className={s.dgTextHi} style={{ fontSize: 10.5 }}>{st.t}</text>
            <text x={x + 60} y="82" textAnchor="middle" className={s.dgText} style={{ fontSize: 9 }}>{st.a}</text>
            <text x={x + 60} y="98" textAnchor="middle" className={s.dgText} style={{ fontSize: 9 }}>{st.b}</text>
            <text x={x + 60} y="122" textAnchor="middle" className={s.dgTextS} style={{ fontSize: 7.5 }}>{st.c}</text>
            {i < 4 && <Arrow x1={x + 121} y1={88} x2={x + 131} y2={88} />}
            <text x={x + 60} y="160" textAnchor="middle" className={i === 4 ? s.dgTextAcc : s.dgText} style={{ fontSize: 9 }}>
              {i === 4 ? 'rollback: forward only' : 'rollback: safe'}
            </text>
          </g>
        )
      })}
      <text x="8" y="190" className={s.dgTextAcc} style={{ fontSize: 9 }}>the only irreversible step comes last, after the new path has carried real traffic</text>
    </svg>
  )
}

/** the rider-assignment path: events in, candidates from the geo index, an offer with a timer, a conditional write */
export function AssignmentFlow() {
  return (
    <svg viewBox="0 0 660 260" role="img" aria-label="An order-accepted event reaches an assignment worker, which reads nearby riders from the geo index, sends one rider an offer with a timer, and records the acceptance with a conditional write in the rider store; the order shard is updated afterwards">
      <Box x={8} y={30} w={120} h={44} title="order service" sub="outbox" />
      <Box x={172} y={30} w={130} h={44} title="order events" sub="48 partitions · order id" />
      <Box x={346} y={30} w={140} h={44} title="assignment worker" sub="decides via rider store" hot />
      <Box x={530} y={30} w={122} h={44} title="rider app" sub="offer card" />

      <Arrow x1={128} y1={52} x2={172} y2={52} />
      <text x="150" y="22" textAnchor="middle" className={s.dgTextS} style={{ fontSize: 7.5 }}>accepted</text>
      <Arrow x1={302} y1={52} x2={346} y2={52} />
      <Arrow x1={486} y1={52} x2={530} y2={52} />
      <text x="508" y="22" textAnchor="middle" className={s.dgTextS} style={{ fontSize: 7.5 }}>offer</text>

      <Box x={346} y={140} w={140} h={44} title="geo index" sub="rider pings · H3 cells" />
      <Arrow x1={400} y1={74} x2={400} y2={140} acc={false} />
      <Arrow x1={432} y1={140} x2={432} y2={74} />
      <text x="442" y="112" className={s.dgTextS} style={{ fontSize: 7.5 }}>nearby, fresh</text>
      <text x="390" y="112" textAnchor="end" className={s.dgTextS} style={{ fontSize: 7.5 }}>ask</text>
      <text x="416" y="204" textAnchor="middle" className={s.dgTextS} style={{ fontSize: 7.5 }}>← 10,000 pings / s</text>

      <Box x={172} y={140} w={130} h={44} title="offer timer" sub="fires at 35 s" />
      <Arrow x1={346} y1={66} x2={268} y2={140} acc={false} dash />

      <Box x={530} y={140} w={122} h={44} title="rider store" sub="riders + offers" />
      <Arrow x1={590} y1={74} x2={590} y2={140} />
      <text x="598" y="112" className={s.dgTextS} style={{ fontSize: 7.5 }}>accept</text>
      <text x="591" y="200" textAnchor="middle" className={s.dgTextS} style={{ fontSize: 7.5 }}>then → order shard</text>
      <path d="M 237 184 L 237 226 L 600 226 L 600 190" className={`${s.dgLine} ${s.dgDash}`} strokeWidth="1.1" fill="none" />
      <polygon points="600,184 596.6,191 603.4,191" className={s.dgFaintFill} />
      <text x="418" y="220" textAnchor="middle" className={s.dgTextS} style={{ fontSize: 7.5 }}>expire only if still PENDING</text>

      <text x="8" y="252" className={s.dgTextAcc} style={{ fontSize: 9 }}>every arrow may arrive twice; every state change is a conditional write</text>
    </svg>
  )
}
