/**
 * Figures for System Design, part 1 (request → writes), drawn with the
 * shared diagram vocabulary so both theme exposures re-ink them.
 */
import { pathwayStyles as s } from '@/components/Pathway/Pathway'

/** a horizontal arrow with a small head; dir 1 points right, -1 left */
function HArrow({ x1, x2, y, acc = false, dash = false }: { x1: number; x2: number; y: number; acc?: boolean; dash?: boolean }) {
  const dir = x2 > x1 ? 1 : -1
  const tip = x2
  const pts = `${tip},${y} ${tip - dir * 7},${y - 3.5} ${tip - dir * 7},${y + 3.5}`
  return (
    <g>
      <line x1={x1} y1={y} x2={x2 - dir * 6} y2={y} className={`${acc ? s.dgAcc : s.dgLine}${dash ? ` ${s.dgDash}` : ''}`} strokeWidth="1.1" />
      <polygon points={pts} className={acc ? s.dgAccFill : s.dgFaintFill} />
    </g>
  )
}

/** a vertical arrow pointing down */
function VArrow({ x, y1, y2, acc = false }: { x: number; y1: number; y2: number; acc?: boolean }) {
  return (
    <g>
      <line x1={x} y1={y1} x2={x} y2={y2 - 6} className={acc ? s.dgAcc : s.dgLine} strokeWidth="1.1" />
      <polygon points={`${x},${y2} ${x - 3.5},${y2 - 7} ${x + 3.5},${y2 - 7}`} className={acc ? s.dgAccFill : s.dgFaintFill} />
    </g>
  )
}

/** opening the app on a cold connection vs a reused one, on a 60 ms mobile round trip */
export function ColdOpenWaterfall() {
  const x = (ms: number) => 150 + ms
  const setup = [
    { label: 'DNS lookup', a: 0, b: 60 },
    { label: 'TCP handshake', a: 60, b: 120 },
    { label: 'TLS 1.3 handshake', a: 120, b: 180 },
  ]
  return (
    <svg viewBox="0 0 660 252" role="img" aria-label="On a cold connection, DNS, TCP and TLS cost three round trips before the request is sent; on a reused connection only the request and the server's work remain">
      <text x="8" y="18" className={s.dgTextS}>cold open · 60 ms round trip · 150 ms of server work</text>
      {setup.map((r, i) => (
        <g key={r.label}>
          <text x="8" y={48 + i * 26} className={s.dgText} style={{ fontSize: 10.5 }}>{r.label}</text>
          <rect x={x(r.a)} y={36 + i * 26} width={r.b - r.a} height="16" rx="3" className={s.dgBox} strokeWidth="1.1" />
        </g>
      ))}
      <text x="8" y="126" className={s.dgText} style={{ fontSize: 10.5 }}>GET /home</text>
      <rect x={x(180)} y="114" width="30" height="16" rx="3" className={s.dgBox} strokeWidth="1.1" />
      <rect x={x(210)} y="114" width="150" height="16" rx="3" className={s.dgBoxHi} strokeWidth="1.1" />
      <text x={x(285)} y="126" textAnchor="middle" className={s.dgText} style={{ fontSize: 9.5 }}>server</text>
      <rect x={x(360)} y="114" width="30" height="16" rx="3" className={s.dgBox} strokeWidth="1.1" />
      <text x={x(398)} y="126" className={s.dgTextAcc}>390 ms</text>

      <text x="8" y="164" className={s.dgTextS}>warm · connection reused</text>
      <text x="8" y="190" className={s.dgText} style={{ fontSize: 10.5 }}>GET /home</text>
      <rect x={x(0)} y="178" width="30" height="16" rx="3" className={s.dgBox} strokeWidth="1.1" />
      <rect x={x(30)} y="178" width="150" height="16" rx="3" className={s.dgBoxHi} strokeWidth="1.1" />
      <text x={x(105)} y="190" textAnchor="middle" className={s.dgText} style={{ fontSize: 9.5 }}>server</text>
      <rect x={x(180)} y="178" width="30" height="16" rx="3" className={s.dgBox} strokeWidth="1.1" />
      <text x={x(218)} y="190" className={s.dgTextAcc}>210 ms</text>

      <line x1={x(0)} y1="212" x2={x(480)} y2="212" className={s.dgLine} strokeWidth="1" />
      {[0, 100, 200, 300, 400].map((t) => (
        <g key={t}>
          <line x1={x(t)} y1="209" x2={x(t)} y2="215" className={s.dgLine} strokeWidth="1" />
          <text x={x(t)} y="228" textAnchor="middle" className={s.dgTextS}>{t} ms</text>
        </g>
      ))}
      <text x="8" y="248" className={s.dgTextAcc}>cold, the handshakes cost more time than the server does</text>
    </svg>
  )
}

/** a lost response, a retry with the same key, and the stored answer replayed */
export function IdempotentRetry() {
  const lanes = [
    { x: 80, label: 'customer app' },
    { x: 330, label: 'order API' },
    { x: 570, label: 'Postgres' },
  ]
  const msg = (y: number, label: string) => (
    <text x="0" y={y} className={s.dgText} style={{ fontSize: 10 }}>{label}</text>
  )
  return (
    <svg viewBox="0 0 660 320" role="img" aria-label="The first POST creates order 9001 but the response is lost; the retry carries the same idempotency key and receives the stored response for order 9001 instead of creating a second order">
      {lanes.map((l) => (
        <g key={l.label}>
          <rect x={l.x - 56} y="8" width="112" height="26" rx="6" className={s.dgBox} strokeWidth="1.1" />
          <text x={l.x} y="25" textAnchor="middle" className={s.dgTextHi} style={{ fontSize: 11 }}>{l.label}</text>
          <line x1={l.x} y1="34" x2={l.x} y2="300" className={`${s.dgLine} ${s.dgDash}`} strokeWidth="1" />
        </g>
      ))}
      <HArrow x1={80} x2={330} y={62} />
      <g transform="translate(92,0)">{msg(56, 'POST /orders · key k7f2')}</g>
      <HArrow x1={330} x2={570} y={90} />
      <g transform="translate(342,0)">{msg(84, 'store key + order 9001, commit')}</g>
      <HArrow x1={330} x2={210} y={118} dash />
      <g transform="translate(222,0)">{msg(112, '201 · order 9001')}</g>
      <text x="196" y="122" textAnchor="middle" className={s.dgTextAcc} style={{ fontSize: 14 }}>×</text>
      <text x="92" y="146" className={s.dgTextS}>response lost · app times out</text>

      <HArrow x1={80} x2={330} y={186} acc />
      <g transform="translate(92,0)">{msg(180, 'retry · same key k7f2')}</g>
      <HArrow x1={330} x2={570} y={214} />
      <g transform="translate(342,0)">{msg(208, 'key k7f2 found, completed')}</g>
      <HArrow x1={570} x2={330} y={242} />
      <g transform="translate(342,0)">{msg(236, 'stored response')}</g>
      <HArrow x1={330} x2={80} y={270} acc />
      <g transform="translate(92,0)">{msg(264, '201 · order 9001, replayed')}</g>
      <text x="8" y="316" className={s.dgTextAcc}>two requests, one order · the retry reads the first outcome instead of repeating it</text>
    </svg>
  )
}

/** cache-aside: a slow reader puts back a value the writer already replaced */
export function CacheAsideRace() {
  const lanes = [
    { x: 80, label: 'menu reader' },
    { x: 250, label: 'Redis' },
    { x: 420, label: 'Postgres' },
    { x: 590, label: 'price editor' },
  ]
  const label = (x: number, y: number, t: string, hot = false) => (
    <text x={x} y={y} textAnchor="middle" className={hot ? s.dgTextAcc : s.dgText} style={{ fontSize: 10 }}>{t}</text>
  )
  return (
    <svg viewBox="0 0 660 300" role="img" aria-label="A reader misses the cache and reads the old price; the editor updates the price and deletes the cache key; the reader then writes the old price back into the cache">
      {lanes.map((l) => (
        <g key={l.label}>
          <rect x={l.x - 54} y="8" width="108" height="26" rx="6" className={s.dgBox} strokeWidth="1.1" />
          <text x={l.x} y="25" textAnchor="middle" className={s.dgTextHi} style={{ fontSize: 11 }}>{l.label}</text>
          <line x1={l.x} y1="34" x2={l.x} y2="270" className={`${s.dgLine} ${s.dgDash}`} strokeWidth="1" />
        </g>
      ))}
      <HArrow x1={80} x2={250} y={66} />
      {label(165, 60, '1 · get menu:42 → miss')}
      <HArrow x1={80} x2={420} y={104} />
      {label(250, 98, '2 · read menu, paneer ₹240')}
      <HArrow x1={590} x2={420} y={142} />
      {label(505, 136, '3 · price → ₹280')}
      <HArrow x1={590} x2={250} y={180} />
      {label(420, 174, '4 · delete menu:42')}
      <HArrow x1={80} x2={250} y={226} acc />
      {label(165, 220, '5 · set menu:42 = ₹240', true)}
      <text x="8" y="292" className={s.dgTextAcc}>the delete ran before the set · the stale menu now lives until its TTL</text>
    </svg>
  )
}

/** placing an order: one local transaction, then the payment provider, then events */
export function OrderWritePath() {
  const rows = [
    '1 · idempotency key k7f2',
    '2 · order + items · PAYMENT_PENDING',
    '3 · stock − 1 where remaining ≥ 1',
    '4 · outbox row · order_created',
  ]
  return (
    <svg viewBox="0 0 660 312" role="img" aria-label="The order service writes the idempotency key, the order, the stock decrement and an outbox row in one transaction; after commit it calls the payment provider; a webhook later moves the order to placed; an outbox relay notifies the restaurant">
      <rect x="8" y="96" width="80" height="34" rx="7" className={s.dgBox} strokeWidth="1.1" />
      <text x="48" y="117" textAnchor="middle" className={s.dgTextHi} style={{ fontSize: 11 }}>app</text>
      <HArrow x1={88} x2={118} y={113} acc />
      <rect x="118" y="96" width="110" height="34" rx="7" className={s.dgBoxHi} strokeWidth="1.1" />
      <text x="173" y="117" textAnchor="middle" className={s.dgTextHi} style={{ fontSize: 11 }}>order service</text>
      <HArrow x1={228} x2={262} y={113} acc />

      <rect x="262" y="28" width="220" height="172" rx="9" className={`${s.dgLine} ${s.dgDash}`} strokeWidth="1.1" fill="none" />
      <text x="372" y="20" textAnchor="middle" className={s.dgTextS}>one database transaction</text>
      {rows.map((r, i) => (
        <g key={r}>
          <rect x="274" y={40 + i * 40} width="196" height="30" rx="5" className={s.dgBox} strokeWidth="1.1" />
          <text x="284" y={59 + i * 40} className={s.dgText} style={{ fontSize: 9.5 }}>{r}</text>
        </g>
      ))}

      <VArrow x={173} y1={130} y2={240} />
      <text x="165" y="172" textAnchor="end" className={s.dgTextS}>after commit</text>
      <text x="165" y="186" textAnchor="end" className={s.dgTextS}>create payment</text>
      <text x="165" y="200" textAnchor="end" className={s.dgTextS}>key = order id</text>
      <rect x="98" y="240" width="150" height="34" rx="7" className={s.dgBox} strokeWidth="1.1" />
      <text x="173" y="261" textAnchor="middle" className={s.dgTextHi} style={{ fontSize: 11 }}>payment provider</text>

      <HArrow x1={248} x2={296} y={257} />
      <rect x="296" y="240" width="170" height="34" rx="7" className={s.dgBox} strokeWidth="1.1" />
      <text x="381" y="261" textAnchor="middle" className={s.dgTextHi} style={{ fontSize: 11 }}>webhook handler</text>
      <text x="381" y="294" textAnchor="middle" className={s.dgTextS}>PLACED only if still PAYMENT_PENDING</text>

      <HArrow x1={470} x2={516} y={175} />
      <rect x="516" y="158" width="136" height="34" rx="7" className={s.dgBox} strokeWidth="1.1" />
      <text x="584" y="179" textAnchor="middle" className={s.dgTextHi} style={{ fontSize: 11 }}>outbox relay</text>
      <VArrow x={584} y1={192} y2={240} />
      <rect x="516" y="240" width="136" height="34" rx="7" className={s.dgBox} strokeWidth="1.1" />
      <text x="584" y="261" textAnchor="middle" className={s.dgTextHi} style={{ fontSize: 11 }}>restaurant tablet</text>
    </svg>
  )
}
