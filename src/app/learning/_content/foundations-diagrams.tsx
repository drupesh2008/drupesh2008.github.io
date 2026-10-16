/**
 * Figures for the Foundations pathway. Drawn only with the shared diagram
 * vocabulary from Pathway.module.css, so both theme exposures re-ink them.
 */
import { pathwayStyles as s } from '@/components/Pathway/Pathway'

/** the latency ladder — each rung ~10× the one above, drawn on a log scale */
export function LatencyLadder() {
  const rows = [
    { label: 'L1 cache', cost: '~1 ns', w: 60, ratio: '1×' },
    { label: 'Main memory', cost: '~100 ns', w: 170, ratio: '100×' },
    { label: 'SSD read', cost: '~100 µs', w: 335, ratio: '100,000×' },
    { label: 'Same-region network hop', cost: '~0.5 ms', w: 380, ratio: '500,000×' },
    { label: 'Spinning disk seek', cost: '~10 ms', w: 445, ratio: '10,000,000×' },
    { label: 'Cross-continent round trip', cost: '~150 ms', w: 510, ratio: '150,000,000×' },
  ]
  return (
    <svg viewBox="0 0 660 236" role="img" aria-label="Latency ladder from L1 cache to a cross-continent round trip, on a log scale">
      <text x="8" y="16" className={s.dgTextS}>bar length on a log scale</text>
      {rows.map((r, i) => {
        const y = 34 + i * 32
        return (
          <g key={r.label}>
            <rect x="8" y={y} width={r.w} height="16" rx="3" className={i < 2 ? s.dgAccFill : s.dgFaintFill} opacity={i < 2 ? 0.9 : 0.5} />
            <text x="14" y={y + 12} className={s.dgTextHi} style={{ fontSize: 10.5 }}>{r.label}</text>
            <text x={r.w + 16} y={y + 12} className={s.dgText} style={{ fontSize: 10.5 }}>{r.cost}</text>
            <text x="652" y={y + 12} textAnchor="end" className={s.dgTextS}>{r.ratio}</text>
          </g>
        )
      })}
      <text x="652" y="16" textAnchor="end" className={s.dgTextS}>relative to an L1 hit</text>
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
    <svg viewBox="0 0 660 190" role="img" aria-label="Two goroutines read the same counter value, both add one, and one increment is lost">
      <text x="8" y="16" className={s.dgTextS}>time →</text>
      <text x="8" y="52" className={s.dgTextHi} style={{ fontSize: 11 }}>Core 1</text>
      <text x="8" y="122" className={s.dgTextHi} style={{ fontSize: 11 }}>Core 2</text>

      {step(90, 36, 120, 'load Views = 41')}
      {step(310, 36, 100, 'add → 42')}
      {step(470, 36, 120, 'store Views = 42')}

      {step(180, 106, 120, 'load Views = 41', true)}
      {step(360, 106, 100, 'add → 42', true)}
      {step(520, 106, 130, 'store Views = 42', true)}

      <line x1="90" y1="80" x2="650" y2="80" className={`${s.dgLine} ${s.dgDash}`} strokeWidth="1" />
      <text x="8" y="176" className={s.dgTextAcc}>two hits handled · Views moved by one · core 2 loaded before core 1 stored</text>
    </svg>
  )
}

/** what one fresh HTTPS request pays before the first useful byte */
export function RoundTrips() {
  const legs = [
    { label: 'DNS lookup', trips: '0–1 RTT' },
    { label: 'TCP handshake', trips: '1 RTT' },
    { label: 'TLS 1.3 handshake', trips: '1 RTT' },
    { label: 'Request + response', trips: '1 RTT' },
  ]
  return (
    <svg viewBox="0 0 660 210" role="img" aria-label="A fresh HTTPS request spends three or four round trips before the response arrives">
      <line x1="120" y1="26" x2="120" y2="184" className={s.dgLine} strokeWidth="1.2" />
      <line x1="540" y1="26" x2="540" y2="184" className={s.dgLine} strokeWidth="1.2" />
      <text x="120" y="16" textAnchor="middle" className={s.dgTextHi}>browser</text>
      <text x="540" y="16" textAnchor="middle" className={s.dgTextHi}>hitcount</text>
      {legs.map((l, i) => {
        const y = 42 + i * 36
        return (
          <g key={l.label}>
            <line x1="124" y1={y} x2="536" y2={y + 8} className={s.dgAcc} strokeWidth="1.1" />
            <line x1="536" y1={y + 8} x2="124" y2={y + 16} className={`${s.dgLine} ${s.dgDash}`} strokeWidth="1" />
            <text x="330" y={y - 4} textAnchor="middle" className={s.dgText} style={{ fontSize: 10.5 }}>{l.label}</text>
            <text x="632" y={y + 8} textAnchor="end" className={s.dgTextS}>{l.trips}</text>
          </g>
        )
      })}
      <text x="8" y="204" className={s.dgTextAcc}>at 200 ms per round trip: ~800 ms before the handler’s 40 µs of work</text>
    </svg>
  )
}

/** how “Café” becomes bytes, and how the wrong decoder turns it into “CafÃ©” */
export function Utf8Bytes() {
  const bytes = [
    { hex: '43', bin: '01000011', hot: false },
    { hex: '61', bin: '01100001', hot: false },
    { hex: '66', bin: '01100110', hot: false },
    { hex: 'C3', bin: '110·00011', hot: true },
    { hex: 'A9', bin: '10·101001', hot: true },
  ]
  const latin = ['C', 'a', 'f', 'Ã', '©']
  const x = (i: number) => 150 + i * 98
  const w = 86
  return (
    <svg viewBox="0 0 660 236" role="img" aria-label="The text Café as four code points, five UTF-8 bytes, and the five wrong characters a Latin-1 decoder produces">
      <text x="8" y="44" className={s.dgTextS}>characters</text>
      <text x="8" y="92" className={s.dgTextS}>code points</text>
      <text x="8" y="146" className={s.dgTextS}>UTF-8 bytes</text>
      <text x="8" y="206" className={s.dgTextS}>read as Latin-1</text>

      {['C', 'a', 'f'].map((c, i) => (
        <g key={c}>
          <rect x={x(i)} y="26" width={w} height="26" rx="5" className={s.dgBox} strokeWidth="1" />
          <text x={x(i) + w / 2} y="44" textAnchor="middle" className={s.dgTextHi}>{c}</text>
          <rect x={x(i)} y="74" width={w} height="26" rx="5" className={s.dgBox} strokeWidth="1" />
          <text x={x(i) + w / 2} y="92" textAnchor="middle" className={s.dgText} style={{ fontSize: 10.5 }}>{['U+0043', 'U+0061', 'U+0066'][i]}</text>
        </g>
      ))}
      <rect x={x(3)} y="26" width={w + 98} height="26" rx="5" className={s.dgBoxHi} strokeWidth="1" />
      <text x={x(3) + (w + 98) / 2} y="44" textAnchor="middle" className={s.dgTextHi}>é</text>
      <rect x={x(3)} y="74" width={w + 98} height="26" rx="5" className={s.dgBoxHi} strokeWidth="1" />
      <text x={x(3) + (w + 98) / 2} y="92" textAnchor="middle" className={s.dgText} style={{ fontSize: 10.5 }}>U+00E9 = 000 1110 1001</text>

      {bytes.map((b, i) => (
        <g key={b.hex}>
          <rect x={x(i)} y="122" width={w} height="40" rx="5" className={b.hot ? s.dgBoxHi : s.dgBox} strokeWidth="1" />
          <text x={x(i) + w / 2} y="139" textAnchor="middle" className={s.dgTextHi}>{b.hex}</text>
          <text x={x(i) + w / 2} y="155" textAnchor="middle" className={s.dgText} style={{ fontSize: 9.5 }}>{b.bin}</text>
        </g>
      ))}

      {latin.map((c, i) => (
        <g key={c}>
          <rect x={x(i)} y="188" width={w} height="26" rx="5" className={i > 2 ? s.dgBoxHi : s.dgBox} strokeWidth="1" />
          <text x={x(i) + w / 2} y="206" textAnchor="middle" className={s.dgTextHi}>{c}</text>
        </g>
      ))}
      <text x="8" y="230" className={s.dgTextAcc}>same five bytes · one decoder sees 4 characters, the other sees 5</text>
    </svg>
  )
}

/** a map of pointers versus a flat slice of values, as the cache sees them */
export function PointerVsFlat() {
  const buckets = [0, 1, 2, 3, 4, 5, 6, 7]
  const targets = [
    { x: 470, y: 92 }, { x: 60, y: 112 }, { x: 300, y: 98 }, { x: 560, y: 116 },
    { x: 190, y: 92 }, { x: 410, y: 118 }, { x: 110, y: 96 }, { x: 250, y: 120 },
  ]
  return (
    <svg viewBox="0 0 660 252" role="img" aria-label="Map entries point to Page structs scattered across the heap, while a flat slice packs four records into each 64-byte cache line">
      <text x="8" y="14" className={s.dgTextS}>map[string]*Page · each entry points elsewhere in the heap</text>
      {buckets.map((b) => (
        <g key={b}>
          <rect x={8 + b * 80} y="24" width="72" height="22" rx="4" className={s.dgBox} strokeWidth="1" />
          <text x={44 + b * 80} y="39" textAnchor="middle" className={s.dgText} style={{ fontSize: 9.5 }}>key · ptr</text>
          <line x1={44 + b * 80} y1="46" x2={targets[b].x + 30} y2={targets[b].y} className={s.dgAcc} strokeWidth="0.9" />
          <rect x={targets[b].x} y={targets[b].y} width="60" height="16" rx="3" className={s.dgBoxHi} strokeWidth="1" />
          <text x={targets[b].x + 30} y={targets[b].y + 12} textAnchor="middle" className={s.dgText} style={{ fontSize: 9 }}>Page</text>
        </g>
      ))}
      <text x="8" y="154" className={s.dgTextAcc}>each arrow is a likely cache miss · ~100 ns</text>

      <text x="8" y="184" className={s.dgTextS}>[]Stat · 16-byte records packed side by side</text>
      {Array.from({ length: 16 }).map((_, i) => (
        <rect key={i} x={8 + i * 40} y="194" width="40" height="24" className={s.dgBox} strokeWidth="1" />
      ))}
      {[0, 1, 2, 3, 4].map((l) => (
        <line key={l} x1={8 + l * 160} y1="190" x2={8 + l * 160} y2="222" className={s.dgAcc} strokeWidth="1.6" />
      ))}
      {[0, 1, 2, 3].map((l) => (
        <text key={l} x={88 + l * 160} y="236" textAnchor="middle" className={s.dgTextS}>64-byte line</text>
      ))}
      <text x="8" y="250" className={s.dgTextAcc}>one miss brings in four pages · the prefetcher runs ahead</text>
    </svg>
  )
}

/** the four steps that make a snapshot survive a power cut */
export function SafeSnapshot() {
  const steps = [
    { label: 'write counts.tmp', a: 'crash: old counts.json', b: 'still intact' },
    { label: 'fsync(counts.tmp)', a: 'crash: old file intact,', b: 'new bytes on device' },
    { label: 'rename → counts.json', a: 'crash: either name,', b: 'both complete' },
    { label: 'fsync(directory)', a: 'the rename itself', b: 'survives power loss' },
  ]
  return (
    <svg viewBox="0 0 660 170" role="img" aria-label="Write to a temporary file, fsync it, rename it over the old snapshot, then fsync the directory; a crash at any step leaves a complete snapshot">
      <text x="8" y="16" className={s.dgTextS}>a crash after any step leaves one complete snapshot on disk</text>
      {steps.map((st, i) => {
        const x = 8 + i * 164
        return (
          <g key={st.label}>
            <rect x={x} y="32" width="150" height="34" rx="6" className={i === 1 || i === 3 ? s.dgBoxHi : s.dgBox} strokeWidth="1.1" />
            <text x={x + 75} y="53" textAnchor="middle" className={s.dgTextHi} style={{ fontSize: 11 }}>{st.label}</text>
            {i < steps.length - 1 && <line x1={x + 150} y1="49" x2={x + 164} y2="49" className={s.dgAcc} strokeWidth="1.2" />}
            <text x={x + 4} y="90" className={s.dgText} style={{ fontSize: 10 }}>{st.a}</text>
            <text x={x + 4} y="106" className={s.dgText} style={{ fontSize: 10 }}>{st.b}</text>
          </g>
        )
      })}
      <line x1="8" y1="124" x2="652" y2="124" className={`${s.dgLine} ${s.dgDash}`} strokeWidth="1" />
      <text x="8" y="146" className={s.dgTextAcc}>the naive version truncates counts.json first</text>
      <text x="8" y="162" className={s.dgTextAcc}>and leaves a window where no valid snapshot exists</text>
    </svg>
  )
}
