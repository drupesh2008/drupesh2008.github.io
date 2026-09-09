/**
 * Figures for the Foundations pathway. Drawn only with the shared diagram
 * vocabulary from Pathway.module.css, so both theme exposures re-ink them.
 */
import { pathwayStyles as s } from '@/components/Pathway/Pathway'

/** the latency ladder — each rung ~10× the one above, drawn on a log scale */
export function LatencyLadder() {
  const rows = [
    { label: 'L1 cache', cost: '~1 ns', w: 60, human: 'a heartbeat' },
    { label: 'Main memory', cost: '~100 ns', w: 170, human: 'two minutes' },
    { label: 'SSD read', cost: '~100 µs', w: 335, human: 'a day and a half' },
    { label: 'Same-region network hop', cost: '~1 ms', w: 390, human: 'two weeks' },
    { label: 'Spinning disk seek', cost: '~10 ms', w: 445, human: 'four months' },
    { label: 'Cross-continent round trip', cost: '~150 ms', w: 510, human: 'five years' },
  ]
  return (
    <svg viewBox="0 0 660 236" role="img" aria-label="Latency ladder from L1 cache to a cross-continent round trip, on a log scale">
      <text x="8" y="16" className={s.dgTextS}>each step down ≈ 10–100× slower · log scale</text>
      {rows.map((r, i) => {
        const y = 34 + i * 32
        return (
          <g key={r.label}>
            <rect x="8" y={y} width={r.w} height="16" rx="3" className={i < 2 ? s.dgAccFill : s.dgFaintFill} opacity={i < 2 ? 0.9 : 0.5} />
            <text x="14" y={y + 12} className={s.dgTextHi} style={{ fontSize: 10.5 }}>{r.label}</text>
            <text x={r.w + 16} y={y + 12} className={s.dgText} style={{ fontSize: 10.5 }}>{r.cost}</text>
            <text x="652" y={y + 12} textAnchor="end" className={s.dgTextS}>{r.human}</text>
          </g>
        )
      })}
      <text x="652" y="16" textAnchor="end" className={s.dgTextS}>if L1 were one second…</text>
    </svg>
  )
}

/** two threads racing an unguarded counter — the lost update, step by step */
export function LostUpdate() {
  const step = (x: number, y: number, w: number, label: string, hot = false) => (
    <g>
      <rect x={x} y={y} width={w} height="24" rx="5" className={hot ? s.dgBoxHi : s.dgBox} strokeWidth="1" />
      <text x={x + w / 2} y={y + 16} textAnchor="middle" className={s.dgText} style={{ fontSize: 10.5 }}>{label}</text>
    </g>
  )
  return (
    <svg viewBox="0 0 660 190" role="img" aria-label="Two threads read the same counter value, both add one, and one increment is lost">
      <text x="8" y="16" className={s.dgTextS}>time →</text>
      <text x="8" y="52" className={s.dgTextHi} style={{ fontSize: 11 }}>Thread A</text>
      <text x="8" y="122" className={s.dgTextHi} style={{ fontSize: 11 }}>Thread B</text>

      {step(90, 36, 120, 'read n = 41')}
      {step(310, 36, 100, 'n + 1 = 42')}
      {step(470, 36, 120, 'write n = 42')}

      {step(180, 106, 120, 'read n = 41', true)}
      {step(360, 106, 100, 'n + 1 = 42', true)}
      {step(520, 106, 130, 'write n = 42', true)}

      <line x1="90" y1="80" x2="650" y2="80" className={`${s.dgLine} ${s.dgDash}`} strokeWidth="1" />
      <text x="8" y="176" className={s.dgTextAcc}>two increments ran · the counter moved once — B read before A wrote</text>
    </svg>
  )
}

/** what one fresh HTTPS request pays before the first useful byte */
export function RoundTrips() {
  const legs = [
    { label: 'DNS lookup', trips: '~1 RTT' },
    { label: 'TCP handshake', trips: '1 RTT' },
    { label: 'TLS handshake', trips: '1–2 RTT' },
    { label: 'Request + response', trips: '1 RTT' },
  ]
  return (
    <svg viewBox="0 0 660 210" role="img" aria-label="A fresh HTTPS request spends four or five round trips before the first useful byte arrives">
      <line x1="120" y1="26" x2="120" y2="184" className={s.dgLine} strokeWidth="1.2" />
      <line x1="540" y1="26" x2="540" y2="184" className={s.dgLine} strokeWidth="1.2" />
      <text x="120" y="16" textAnchor="middle" className={s.dgTextHi}>client</text>
      <text x="540" y="16" textAnchor="middle" className={s.dgTextHi}>server</text>
      {legs.map((l, i) => {
        const y = 42 + i * 36
        return (
          <g key={l.label}>
            <line x1="124" y1={y} x2="536" y2={y + 8} className={s.dgAcc} strokeWidth="1.1" markerEnd="" />
            <line x1="536" y1={y + 8} x2="124" y2={y + 16} className={`${s.dgLine} ${s.dgDash}`} strokeWidth="1" />
            <text x="330" y={y - 4} textAnchor="middle" className={s.dgText} style={{ fontSize: 10.5 }}>{l.label}</text>
            <text x="632" y={y + 8} textAnchor="end" className={s.dgTextS}>{l.trips}</text>
          </g>
        )
      })}
      <text x="8" y="204" className={s.dgTextAcc}>at 150 ms per round trip, the wire is idle — the distance is the cost</text>
    </svg>
  )
}
