'use client'

/**
 * The small vocabulary every simulation is built from: a framed panel, a few
 * controls, readouts, and an SVG line chart. All drawn in the page tokens, so
 * a simulation looks the same on every paper page and in both themes.
 */

import type { ReactNode } from 'react'
import s from '../Papers.module.css'
import dg from '@/components/Pathway/Pathway.module.css'

export { s, dg }

export function Sim({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <section className={s.sim}>
      <div className={s.simHead}>
        <span className={s.simCap}>Try it</span>
        <span className={s.simTitle}>{title}</span>
      </div>
      {note && <p className={s.simNote}>{note}</p>}
      <div className={s.simBody}>{children}</div>
    </section>
  )
}

export function Controls({ children }: { children: ReactNode }) {
  return <div className={s.controls}>{children}</div>
}

export function Slider({
  label, value, min, max, step = 1, onChange, fmt,
}: {
  label: string; value: number; min: number; max: number; step?: number
  onChange: (v: number) => void; fmt?: (v: number) => string
}) {
  return (
    <label className={s.ctl}>
      <span className={s.ctlLabel}>{label} <b>{fmt ? fmt(value) : value}</b></span>
      <input className={s.range} type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))} />
    </label>
  )
}

export function Select<T extends string>({
  label, value, options, onChange,
}: { label: string; value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <label className={s.ctl}>
      <span className={s.ctlLabel}>{label}</span>
      <select className={s.select} value={value} onChange={(e) => onChange(e.target.value as T)}>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  )
}

export function Btn({
  children, onClick, primary, disabled,
}: { children: ReactNode; onClick: () => void; primary?: boolean; disabled?: boolean }) {
  return (
    <button type="button" className={`${s.btn} ${primary ? s.btnPrimary : ''}`} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  )
}

export function Stat({ label, value, unit, hint }: { label: string; value: ReactNode; unit?: string; hint?: ReactNode }) {
  return (
    <div className={s.stat}>
      <span className={s.statLabel}>{label}</span>
      <span className={s.statValue}>{value}{unit && <small>{unit}</small>}</span>
      {hint && <span className={s.statHint}>{hint}</span>}
    </div>
  )
}

export function Read({ children }: { children: ReactNode }) {
  return <p className={s.simRead}>{children}</p>
}

export function Legend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <div className={s.legend}>
      {items.map((i) => (
        <span key={i.label}><i className={s.swatch} style={{ background: i.color }} />{i.label}</span>
      ))}
    </div>
  )
}

/* ── a line chart in SVG ─────────────────────────────────────────── */

export interface Series { name: string; points: [number, number][]; color: string; dashed?: boolean }

const niceTicks = (min: number, max: number, log: boolean, n = 5): number[] => {
  if (log) {
    const lo = Math.ceil(Math.log10(min)), hi = Math.floor(Math.log10(max))
    const out: number[] = []
    for (let e = lo; e <= hi; e++) out.push(10 ** e)
    return out.length ? out : [min, max]
  }
  const span = max - min || 1
  const raw = span / n
  const mag = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 5, 10].map((m) => m * mag).find((st) => span / st <= n) ?? mag
  const out: number[] = []
  for (let v = Math.ceil(min / step) * step; v <= max + 1e-9; v += step) out.push(Number(v.toFixed(10)))
  return out
}

export function LineChart({
  series, xLabel, yLabel, xLog, yLog, w = 640, h = 260, fmtX, fmtY, xMin, xMax, yMin, yMax, marker,
}: {
  series: Series[]; xLabel: string; yLabel: string; xLog?: boolean; yLog?: boolean; w?: number; h?: number
  fmtX?: (v: number) => string; fmtY?: (v: number) => string
  xMin?: number; xMax?: number; yMin?: number; yMax?: number
  /** an x position to highlight with a vertical rule */
  marker?: number
}) {
  const pad = { l: 56, r: 16, t: 14, b: 40 }
  const all = series.flatMap((sr) => sr.points)
  const xs = all.map((p) => p[0]), ys = all.map((p) => p[1])
  const x0 = xMin ?? Math.min(...xs), x1 = xMax ?? Math.max(...xs)
  const y0 = yMin ?? Math.min(...ys), y1 = yMax ?? Math.max(...ys)
  const tx = (x: number) => {
    const a = xLog ? Math.log10(x) : x, lo = xLog ? Math.log10(x0) : x0, hi = xLog ? Math.log10(x1) : x1
    return pad.l + ((a - lo) / ((hi - lo) || 1)) * (w - pad.l - pad.r)
  }
  const ty = (y: number) => {
    const a = yLog ? Math.log10(y) : y, lo = yLog ? Math.log10(y0) : y0, hi = yLog ? Math.log10(y1) : y1
    return h - pad.b - ((a - lo) / ((hi - lo) || 1)) * (h - pad.t - pad.b)
  }
  const fx = fmtX ?? ((v) => (xLog ? `1e${Math.round(Math.log10(v))}` : String(v)))
  const fy = fmtY ?? ((v) => (yLog ? `1e${Math.round(Math.log10(v))}` : String(v)))
  const xt = niceTicks(x0, x1, !!xLog), yt = niceTicks(y0, y1, !!yLog)

  return (
    <svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label={`${yLabel} against ${xLabel}`}>
      {yt.map((v) => (
        <g key={`y${v}`}>
          <line x1={pad.l} x2={w - pad.r} y1={ty(v)} y2={ty(v)} className={dg.dgLine} strokeWidth="0.6" opacity="0.5" />
          <text x={pad.l - 8} y={ty(v) + 3.5} textAnchor="end" className={dg.dgText} style={{ fontSize: 10 }}>{fy(v)}</text>
        </g>
      ))}
      {xt.map((v) => (
        <text key={`x${v}`} x={tx(v)} y={h - pad.b + 16} textAnchor="middle" className={dg.dgText} style={{ fontSize: 10 }}>{fx(v)}</text>
      ))}
      <line x1={pad.l} x2={w - pad.r} y1={h - pad.b} y2={h - pad.b} className={dg.dgLine} strokeWidth="1" />
      <line x1={pad.l} x2={pad.l} y1={pad.t} y2={h - pad.b} className={dg.dgLine} strokeWidth="1" />
      <text x={w - pad.r} y={h - 6} textAnchor="end" className={dg.dgTextS}>{xLabel}</text>
      <text x={pad.l + 6} y={pad.t + 2} className={dg.dgTextS}>{yLabel}</text>
      {marker != null && marker >= x0 && marker <= x1 && (
        <line x1={tx(marker)} x2={tx(marker)} y1={pad.t} y2={h - pad.b} className={`${dg.dgAcc} ${dg.dgDash}`} strokeWidth="1" />
      )}
      {series.map((sr) => (
        <polyline
          key={sr.name}
          points={sr.points.filter((p) => p[0] >= x0 && p[0] <= x1).map((p) => `${tx(p[0]).toFixed(1)},${ty(Math.min(Math.max(p[1], y0), y1)).toFixed(1)}`).join(' ')}
          fill="none" stroke={sr.color} strokeWidth="1.8" strokeDasharray={sr.dashed ? '5 5' : undefined} strokeLinejoin="round"
        />
      ))}
    </svg>
  )
}

/** deterministic pseudo-random, so a simulation replays the same way for everyone */
export function rng(seed: number) {
  let t = seed >>> 0
  return () => {
    t += 0x6d2b79f5
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r)
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

/** a small stable string hash, for placing keys on rings and in partitions */
export function hash(str: string): number {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}
