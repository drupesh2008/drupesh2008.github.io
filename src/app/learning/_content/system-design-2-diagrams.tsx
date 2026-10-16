/**
 * Figures for the System Design pathway, chapters sharding → realtime.
 * Drawn with the shared diagram vocabulary so both themes re-ink them.
 */
import { pathwayStyles as s } from '@/components/Pathway/Pathway'

/** dinner-peak write share per shard: shard by city vs shard by hashed restaurant id */
export function ShardKeyLoad() {
  const city = [
    { l: 'BLR', v: 30 }, { l: 'MUM', v: 22 }, { l: 'DEL', v: 14 }, { l: 'HYD', v: 10 },
    { l: 'PUN', v: 8 }, { l: 'CHE', v: 6 }, { l: 'KOL', v: 5 }, { l: 'AMD', v: 5 },
  ]
  const hashed = [13, 12, 12.5, 13, 12, 12.5, 12, 13]
  const base = 178
  const k = 3.6 // px per percentage point
  const cap = 18
  const panel = (x0: number, vals: number[], labels: string[], title: string) => (
    <g>
      <text x={x0} y="22" className={s.dgTextHi}>{title}</text>
      <line x1={x0 - 4} y1={base} x2={x0 + 290} y2={base} className={s.dgLine} strokeWidth="1" />
      <line x1={x0 - 4} y1={base - cap * k} x2={x0 + 290} y2={base - cap * k} className={`${s.dgAcc} ${s.dgDash}`} strokeWidth="1" />
      {vals.map((v, i) => {
        const x = x0 + i * 36
        const over = v > cap
        return (
          <g key={i}>
            <rect x={x} y={base - v * k} width="26" height={v * k} rx="3" className={over ? s.dgAccFill : s.dgFaintFill} opacity={over ? 0.9 : 0.55} />
            <text x={x + 13} y={base + 14} textAnchor="middle" className={s.dgText} style={{ fontSize: 9 }}>{labels[i]}</text>
            <text x={x + 13} y={base - v * k - 5} textAnchor="middle" className={s.dgText} style={{ fontSize: 9 }}>{v}%</text>
          </g>
        )
      })}
    </g>
  )
  return (
    <svg viewBox="0 0 660 230" role="img" aria-label="Sharding orders by city puts thirty percent of dinner writes on the Bengaluru shard, above one database's comfortable peak; hashing restaurant ids spreads writes evenly across eight shards">
      {panel(24, city.map((c) => c.v), city.map((c) => c.l), 'shard key = city')}
      {panel(356, hashed, hashed.map((_, i) => `s${i}`), 'shard key = hash(restaurant_id)')}
      <text x="24" y="214" className={s.dgTextAcc}>dashed line · what one database handles comfortably at the dinner peak</text>
    </svg>
  )
}

/** the transactional outbox: one commit, then a relay ships events to the log */
export function OutboxRelay() {
  return (
    <svg viewBox="0 0 660 230" role="img" aria-label="The order service writes the order row and an outbox row in one transaction; a relay reads the outbox and appends to the order-events log, which several consumers read">
      <rect x="10" y="80" width="110" height="44" rx="8" className={s.dgBox} strokeWidth="1.1" />
      <text x="65" y="100" textAnchor="middle" className={s.dgTextHi} style={{ fontSize: 11 }}>order service</text>
      <text x="65" y="115" textAnchor="middle" className={s.dgTextS} style={{ fontSize: 8 }}>status change</text>
      <line x1="120" y1="102" x2="150" y2="102" className={s.dgAcc} strokeWidth="1.2" />

      <rect x="150" y="44" width="176" height="118" rx="10" className={s.dgBoxHi} strokeWidth="1.2" />
      <text x="238" y="62" textAnchor="middle" className={s.dgTextAcc}>one transaction</text>
      <rect x="164" y="74" width="148" height="30" rx="5" className={s.dgBox} strokeWidth="1" />
      <text x="238" y="93" textAnchor="middle" className={s.dgText} style={{ fontSize: 10 }}>orders · 8812 → PLACED</text>
      <rect x="164" y="114" width="148" height="30" rx="5" className={s.dgBox} strokeWidth="1" />
      <text x="238" y="133" textAnchor="middle" className={s.dgText} style={{ fontSize: 10 }}>outbox · order_placed</text>

      <line x1="326" y1="129" x2="360" y2="129" className={s.dgAcc} strokeWidth="1.2" />
      <rect x="360" y="108" width="74" height="42" rx="8" className={s.dgBox} strokeWidth="1.1" />
      <text x="397" y="127" textAnchor="middle" className={s.dgTextHi} style={{ fontSize: 11 }}>relay</text>
      <text x="397" y="141" textAnchor="middle" className={s.dgTextS} style={{ fontSize: 8 }}>one per shard</text>
      <line x1="434" y1="129" x2="462" y2="129" className={s.dgAcc} strokeWidth="1.2" />

      {[0, 1, 2, 3, 4].map((i) => (
        <rect key={i} x={462 + i * 22} y="114" width="20" height="30" rx="3" className={i === 4 ? s.dgBoxHi : s.dgBox} strokeWidth="1" />
      ))}
      <text x="516" y="104" textAnchor="middle" className={s.dgText} style={{ fontSize: 10 }}>order-events</text>

      {['restaurant tablet', 'rider assignment', 'notifications'].map((c, i) => (
        <g key={c}>
          <line x1="516" y1="146" x2={470 + i * 70} y2="178" className={s.dgLine} strokeWidth="1" />
          <text x={470 + i * 70} y="192" textAnchor="middle" className={s.dgText} style={{ fontSize: 9 }}>{c}</text>
        </g>
      ))}
      <text x="10" y="22" className={s.dgTextS}>either both rows commit or neither does · the relay may send twice, never zero times</text>
      <text x="10" y="220" className={s.dgTextAcc}>consumers dedupe by event id, because at-least-once is the price of never losing one</text>
    </svg>
  )
}

/** change data capture: the database's own log feeds every derived store */
export function CdcFanout() {
  const sinks = [
    { l: 'search index', n: 'menus, dishes, open now' },
    { l: 'warehouse', n: 'columns, 90 days+' },
    { l: 'customer_orders', n: 'sharded by customer' },
    { l: 'cache invalidator', n: 'drop stale menu keys' },
  ]
  return (
    <svg viewBox="0 0 660 236" role="img" aria-label="The primary database's write-ahead log is read by a CDC connector, which appends row changes to a log; search, warehouse, a per-customer view and a cache invalidator each consume it at their own offset">
      <rect x="10" y="78" width="120" height="58" rx="9" className={s.dgBoxHi} strokeWidth="1.2" />
      <text x="70" y="102" textAnchor="middle" className={s.dgTextHi} style={{ fontSize: 11 }}>primary DB</text>
      <text x="70" y="118" textAnchor="middle" className={s.dgTextS} style={{ fontSize: 8 }}>source of truth</text>
      <line x1="130" y1="107" x2="160" y2="107" className={s.dgAcc} strokeWidth="1.2" />
      <rect x="160" y="88" width="88" height="38" rx="7" className={s.dgBox} strokeWidth="1.1" />
      <text x="204" y="104" textAnchor="middle" className={s.dgText} style={{ fontSize: 10 }}>WAL / binlog</text>
      <text x="204" y="117" textAnchor="middle" className={s.dgTextS} style={{ fontSize: 7.5 }}>already exists</text>
      <line x1="248" y1="107" x2="276" y2="107" className={s.dgAcc} strokeWidth="1.2" />
      <rect x="276" y="88" width="88" height="38" rx="7" className={s.dgBox} strokeWidth="1.1" />
      <text x="320" y="104" textAnchor="middle" className={s.dgText} style={{ fontSize: 10 }}>CDC connector</text>
      <text x="320" y="117" textAnchor="middle" className={s.dgTextS} style={{ fontSize: 7.5 }}>row before/after</text>
      <line x1="364" y1="107" x2="392" y2="107" className={s.dgAcc} strokeWidth="1.2" />
      {[0, 1, 2, 3].map((i) => (
        <rect key={i} x={392 + i * 18} y="92" width="16" height="30" rx="3" className={s.dgBox} strokeWidth="1" />
      ))}
      <text x="426" y="84" textAnchor="middle" className={s.dgTextS} style={{ fontSize: 8 }}>log</text>
      {sinks.map((k, i) => {
        const y = 32 + i * 52
        return (
          <g key={k.l}>
            <line x1="464" y1="107" x2="508" y2={y + 16} className={s.dgLine} strokeWidth="1" />
            <rect x="508" y={y} width="144" height="34" rx="6" className={s.dgBox} strokeWidth="1.1" />
            <text x="580" y={y + 15} textAnchor="middle" className={s.dgTextHi} style={{ fontSize: 10 }}>{k.l}</text>
            <text x="580" y={y + 27} textAnchor="middle" className={s.dgTextS} style={{ fontSize: 7.5 }}>{k.n}</text>
          </g>
        )
      })}
      <text x="10" y="22" className={s.dgTextS}>the application writes once · nothing else is written by app code</text>
      <text x="10" y="226" className={s.dgTextAcc}>rebuild any sink: snapshot the table, then replay the log from the snapshot position</text>
    </svg>
  )
}

/** count-min sketch: one item, one counter per row, the estimate is the smallest */
export function CountMinGrid() {
  const rows = [
    [3, 41, 0, 7, 12, 980, 5, 2, 19, 4],
    [8, 1, 1003, 6, 0, 22, 3, 14, 9, 2],
    [2, 17, 5, 0, 986, 1, 30, 4, 11, 6],
    [995, 3, 8, 2, 6, 0, 13, 44, 1, 7],
  ]
  const hit = [5, 2, 4, 0]
  return (
    <svg viewBox="0 0 660 230" role="img" aria-label="A count-min sketch is four rows of counters; the dish hashes to one counter in each row; collisions only add, so the smallest of the four counters is the best estimate">
      <text x="10" y="22" className={s.dgTextS}>“chicken biryani, Bengaluru, this hour” → hash₁ … hash₄</text>
      {rows.map((r, ri) => (
        <g key={ri}>
          <text x="10" y={58 + ri * 36} className={s.dgText} style={{ fontSize: 9.5 }}>{`row ${ri + 1}`}</text>
          {r.map((v, ci) => {
            const x = 60 + ci * 46
            const on = hit[ri] === ci
            return (
              <g key={ci}>
                <rect x={x} y={40 + ri * 36} width="42" height="28" rx="4" className={on ? s.dgBoxHi : s.dgBox} strokeWidth={on ? 1.4 : 1} />
                <text x={x + 21} y={58 + ri * 36} textAnchor="middle" className={on ? s.dgTextHi : s.dgText} style={{ fontSize: 10 }}>{v}</text>
              </g>
            )
          })}
        </g>
      ))}
      <text x="540" y="62" className={s.dgText} style={{ fontSize: 10 }}>980</text>
      <text x="540" y="98" className={s.dgText} style={{ fontSize: 10 }}>1003</text>
      <text x="540" y="134" className={s.dgText} style={{ fontSize: 10 }}>986</text>
      <text x="540" y="170" className={s.dgText} style={{ fontSize: 10 }}>995</text>
      <text x="580" y="118" className={s.dgTextAcc}>min = 980</text>
      <text x="10" y="204" className={s.dgTextAcc}>other dishes that share a counter can only add to it, never subtract</text>
      <text x="10" y="222" className={s.dgTextS}>so every row overestimates · the smallest row overestimates least</text>
    </svg>
  )
}

/** geohash cells: the query point's own cell is not enough; search the 3×3 block */
export function GeohashNeighbours() {
  const names = [
    ['tdr1y', 'tdr1z', 'tdr3b'],
    ['tdr1w', 'tdr1x', 'tdr38'],
    ['tdr1q', 'tdr1r', 'tdr32'],
  ]
  const x0 = 40, y0 = 34, c = 58
  return (
    <svg viewBox="0 0 660 230" role="img" aria-label="A restaurant sits near the east edge of its geohash cell; the nearest rider is a few hundred metres away in the neighbouring cell, whose name shares only the prefix tdr; searching only the restaurant's cell misses that rider">
      {names.map((row, r) =>
        row.map((n, ci) => {
          const centre = r === 1 && ci === 1
          return (
            <g key={n}>
              <rect x={x0 + ci * c} y={y0 + r * c} width={c} height={c} className={centre ? s.dgBoxHi : s.dgBox} strokeWidth={centre ? 1.5 : 1} />
              <text x={x0 + ci * c + 6} y={y0 + r * c + 13} className={s.dgTextS} style={{ fontSize: 8 }}>{n}</text>
            </g>
          )
        }),
      )}
      {/* restaurant near the east edge of the centre cell */}
      <circle cx={x0 + c + 52} cy={y0 + c + 34} r="5" className={s.dgAccFill} />
      {/* rider just across the boundary */}
      <circle cx={x0 + 2 * c + 8} cy={y0 + c + 30} r="4" className={s.dgInkFill} />
      {/* a rider far away inside the same cell */}
      <circle cx={x0 + c + 8} cy={y0 + c + 50} r="4" className={s.dgInkFill} opacity="0.55" />
      <circle cx={x0 + c + 52} cy={y0 + c + 34} r="40" className={`${s.dgAcc} ${s.dgDash}`} strokeWidth="1" fill="none" />

      <text x="260" y="58" className={s.dgText} style={{ fontSize: 10.5 }}>● filled accent: the restaurant, near its cell’s east edge</text>
      <text x="260" y="80" className={s.dgText} style={{ fontSize: 10.5 }}>the closest rider is ~150 m away, in tdr38</text>
      <text x="260" y="98" className={s.dgText} style={{ fontSize: 10.5 }}>tdr1x and tdr38 share only the prefix “tdr”</text>
      <text x="260" y="126" className={s.dgText} style={{ fontSize: 10.5 }}>a prefix scan on tdr1x finds only the far rider</text>
      <text x="260" y="148" className={s.dgText} style={{ fontSize: 10.5 }}>the fix: scan all nine cells, then filter by distance</text>
      <text x="40" y="222" className={s.dgTextAcc}>a cell is a coarse bucket, not a circle · always over-fetch, then measure</text>
    </svg>
  )
}

/** a 64-bit order id: time, logical shard, sequence */
export function OrderIdLayout() {
  const parts = [
    { bits: 41, label: 'milliseconds since Dabba epoch', note: '~69 years of range', hi: true },
    { bits: 13, label: 'logical shard', note: '8,192 shards', hi: false },
    { bits: 10, label: 'sequence', note: '1,024 per ms per shard', hi: false },
  ]
  const W = 620 / 64
  let x = 20
  return (
    <svg viewBox="0 0 660 170" role="img" aria-label="A 64-bit order id holds 41 bits of milliseconds since a custom epoch, 13 bits of logical shard number, and 10 bits of per-millisecond sequence">
      <text x="20" y="24" className={s.dgTextS}>64 bits · fits a BIGINT · sorts by creation time</text>
      {parts.map((p) => {
        const w = p.bits * W
        const g = (
          <g key={p.label}>
            <rect x={x} y="44" width={w - 3} height="40" rx="5" className={p.hi ? s.dgBoxHi : s.dgBox} strokeWidth="1.2" />
            <text x={x + (w - 3) / 2} y="68" textAnchor="middle" className={s.dgTextHi} style={{ fontSize: 11 }}>{p.bits} bits</text>
            <text x={x + (w - 3) / 2} y="104" textAnchor="middle" className={s.dgText} style={{ fontSize: 10 }}>{p.label}</text>
            <text x={x + (w - 3) / 2} y="120" textAnchor="middle" className={s.dgTextS} style={{ fontSize: 8 }}>{p.note}</text>
          </g>
        )
        x += w
        return g
      })}
      <text x="20" y="156" className={s.dgTextAcc}>the shard bits route the id · the time bits keep the B-tree appending at its right edge</text>
    </svg>
  )
}

/** presigned upload: the API grants, the client sends bytes straight to storage */
export function PresignedUpload() {
  const lanes = [
    { x: 70, l: 'restaurant app' },
    { x: 250, l: 'Dabba API' },
    { x: 430, l: 'object store' },
    { x: 590, l: 'image worker' },
  ]
  const msgs = [
    { a: 0, b: 1, y: 70, t: '1 · may I upload a photo for dish 5521?' },
    { a: 1, b: 0, y: 98, t: '2 · row pending · signed PUT URL, 10 min' },
    { a: 0, b: 2, y: 128, t: '3 · PUT 3.8 MB directly' },
    { a: 2, b: 3, y: 158, t: '4 · object-created event' },
    { a: 3, b: 1, y: 188, t: '5 · thumbnails written · row ready' },
  ]
  return (
    <svg viewBox="0 0 660 232" role="img" aria-label="The restaurant app asks the API for permission, receives a short-lived signed URL, uploads the photo directly to object storage, which emits an event; an image worker writes resized versions and marks the row ready">
      {lanes.map((l) => (
        <g key={l.l}>
          <text x={l.x} y="24" textAnchor="middle" className={s.dgTextHi} style={{ fontSize: 11 }}>{l.l}</text>
          <line x1={l.x} y1="34" x2={l.x} y2="206" className={`${s.dgLine} ${s.dgDash}`} strokeWidth="1" />
        </g>
      ))}
      {msgs.map((m) => {
        const x1 = lanes[m.a].x, x2 = lanes[m.b].x
        const dir = x2 > x1 ? 1 : -1
        const big = m.a === 0 && m.b === 2
        return (
          <g key={m.t}>
            <line x1={x1} y1={m.y} x2={x2 - dir * 6} y2={m.y} className={big ? s.dgAcc : s.dgLine} strokeWidth={big ? 2.2 : 1.1} />
            <path d={`M ${x2} ${m.y} l ${-dir * 7} -4 l 0 8 z`} className={big ? s.dgAccFill : s.dgFaintFill} />
            <text x={(x1 + x2) / 2} y={m.y - 6} textAnchor="middle" className={s.dgText} style={{ fontSize: 9.5 }}>{m.t}</text>
          </g>
        )
      })}
      <text x="20" y="226" className={s.dgTextAcc}>the API handles two small JSON calls · the megabytes never touch it</text>
    </svg>
  )
}

/** live location: ingest, pub/sub by rider, socket servers that hold the customers */
export function LocationFanout() {
  return (
    <svg viewBox="0 0 660 240" role="img" aria-label="A rider app posts its location every five seconds to an ingest service, which updates the Redis geo set and publishes on the rider's topic; socket servers subscribed to that topic push to the customer and the restaurant tablet">
      <rect x="10" y="92" width="96" height="44" rx="8" className={s.dgBox} strokeWidth="1.1" />
      <text x="58" y="111" textAnchor="middle" className={s.dgTextHi} style={{ fontSize: 11 }}>rider app</text>
      <text x="58" y="126" textAnchor="middle" className={s.dgTextS} style={{ fontSize: 8 }}>every 5 s</text>
      <line x1="106" y1="114" x2="136" y2="114" className={s.dgAcc} strokeWidth="1.2" />
      <rect x="136" y="92" width="100" height="44" rx="8" className={s.dgBox} strokeWidth="1.1" />
      <text x="186" y="111" textAnchor="middle" className={s.dgTextHi} style={{ fontSize: 11 }}>ingest</text>
      <text x="186" y="126" textAnchor="middle" className={s.dgTextS} style={{ fontSize: 8 }}>stateless</text>

      <line x1="186" y1="136" x2="186" y2="168" className={s.dgLine} strokeWidth="1" />
      <rect x="126" y="168" width="120" height="38" rx="7" className={s.dgBox} strokeWidth="1.1" />
      <text x="186" y="185" textAnchor="middle" className={s.dgText} style={{ fontSize: 10 }}>Redis geo set</text>
      <text x="186" y="198" textAnchor="middle" className={s.dgTextS} style={{ fontSize: 7.5 }}>latest position per rider</text>

      <line x1="236" y1="114" x2="270" y2="114" className={s.dgAcc} strokeWidth="1.2" />
      <rect x="270" y="88" width="120" height="52" rx="9" className={s.dgBoxHi} strokeWidth="1.2" />
      <text x="330" y="108" textAnchor="middle" className={s.dgTextHi} style={{ fontSize: 11 }}>pub/sub</text>
      <text x="330" y="124" textAnchor="middle" className={s.dgTextS} style={{ fontSize: 8 }}>topic rider:4411</text>

      {[{ y: 52, l: 'socket server A' }, { y: 150, l: 'socket server B' }].map((b) => (
        <g key={b.l}>
          <line x1="390" y1="114" x2="430" y2={b.y + 20} className={s.dgAcc} strokeWidth="1.1" />
          <rect x="430" y={b.y} width="110" height="40" rx="7" className={s.dgBox} strokeWidth="1.1" />
          <text x="485" y={b.y + 24} textAnchor="middle" className={s.dgText} style={{ fontSize: 10 }}>{b.l}</text>
        </g>
      ))}
      <line x1="540" y1="72" x2="568" y2="72" className={s.dgLine} strokeWidth="1" />
      <text x="574" y="70" className={s.dgText} style={{ fontSize: 10 }}>customer</text>
      <text x="574" y="83" className={s.dgTextS} style={{ fontSize: 7.5 }}>SSE</text>
      <line x1="540" y1="170" x2="568" y2="170" className={s.dgLine} strokeWidth="1" />
      <text x="574" y="168" className={s.dgText} style={{ fontSize: 10 }}>restaurant</text>
      <text x="574" y="181" className={s.dgTextS} style={{ fontSize: 7.5 }}>WebSocket</text>
      <text x="10" y="24" className={s.dgTextS}>nobody looks up which server holds the customer</text>
      <text x="10" y="40" className={s.dgTextS}>the subscription is the routing table</text>
      <text x="10" y="232" className={s.dgTextAcc}>a reconnecting client gets the latest position from Redis first, then resumes the stream</text>
    </svg>
  )
}
