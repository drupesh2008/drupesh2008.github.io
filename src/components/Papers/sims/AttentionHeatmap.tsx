'use client'

/**
 * One attention head on one sentence. Every token has a small feature vector;
 * the score between a query and a key is their dot product, softmax turns
 * the row of scores into weights, and the output for the query is the
 * weighted mix of values. Toy vectors, real mechanism.
 */

import { useMemo, useState } from 'react'
import { Sim, Controls, Slider, Btn, Read, s, dg } from './ui'

// features: [animate, place, tiredness/width, function-word]
const BASE: [string, number[]][] = [
  ['The', [0, 0, 0, 1]], ['animal', [2, 0, 0.5, 0]], ["didn't", [0, 0, 0, 1]], ['cross', [0.3, 1, 0, 0]],
  ['the', [0, 0, 0, 1]], ['street', [0, 2, 0.2, 0]], ['because', [0, 0, 0, 1]], ['it', [1.6, 0.4, 0.8, 0]],
  ['was', [0, 0, 0, 1]], ['too', [0, 0, 0.4, 1]], ['tired', [0.6, 0, 2, 0]],
]

export default function AttentionHeatmap() {
  const [variant, setVariant] = useState<'tired' | 'wide'>('tired')
  const [q, setQ] = useState(7)
  const [temp, setTemp] = useState(2)

  const tokens = useMemo(() => BASE.map(([w, v]) => {
    if (variant === 'wide' && w === 'tired') return ['wide', [0.2, 1.8, 2, 0]] as [string, number[]]
    if (variant === 'wide' && w === 'it') return ['it', [0.4, 1.8, 0.6, 0]] as [string, number[]]
    return [w, v] as [string, number[]]
  }), [variant])

  const weights = useMemo(() => tokens.map(([, qv]) => {
    const scores = tokens.map(([, kv]) => qv.reduce((n, x, i) => n + x * kv[i], 0) / temp)
    const m = Math.max(...scores)
    const ex = scores.map((v) => Math.exp(v - m))
    const z = ex.reduce((n, x) => n + x, 0)
    return ex.map((v) => v / z)
  }), [tokens, temp])

  const row = weights[q]
  const top = [...row.map((w, i) => ({ w, i }))].sort((x, y) => y.w - x.w).slice(0, 3)
  // bars run topPad..topPad+80, token labels sit 14 under the baseline, so the
  // viewBox must be at least topPad + 100 tall or the labels are clipped
  const cell = 40, left = 70, topPad = 44, svgH = topPad + 102

  return (
    <Sim
      title="What does “it” look at?"
      note="Click a token in the sentence to make it the query. The bars are its attention weights over every token, including itself. Swap the last word and watch the same mechanism resolve “it” differently."
    >
      <Controls>
        <div className={s.btnRow}>
          <Btn primary={variant === 'tired'} onClick={() => setVariant('tired')}>…because it was too tired</Btn>
          <Btn primary={variant === 'wide'} onClick={() => setVariant('wide')}>…because it was too wide</Btn>
        </div>
        <Slider label="Temperature (√d)" value={temp} min={0.5} max={4} step={0.5} onChange={setTemp} />
      </Controls>

      <div className={s.chips} style={{ marginBottom: 12 }}>
        {tokens.map(([w], i) => (
          <button type="button" key={i} className={`${s.chip} ${i === q ? s.chipOn : ''}`} onClick={() => setQ(i)}>{w}</button>
        ))}
      </div>

      <svg viewBox={`0 0 ${left + tokens.length * cell + 10} ${svgH}`} role="img" aria-label="Attention weights for the selected query token">
        <text x="4" y="26" className={dg.dgTextS}>query</text>
        <text x="4" y="40" className={dg.dgTextHi} style={{ fontSize: 11 }}>{tokens[q][0]}</text>
        {tokens.map(([w], i) => {
          const h = row[i] * 80
          return (
            <g key={i}>
              <rect x={left + i * cell + 4} y={topPad + 80 - h} width={cell - 8} height={h} rx="3" fill="var(--accent)" fillOpacity={0.25 + row[i] * 0.75} />
              <text x={left + i * cell + cell / 2} y={topPad + 80 - h - 4} textAnchor="middle" className={dg.dgText} style={{ fontSize: 8.5 }}>{(row[i] * 100).toFixed(0)}%</text>
              <text x={left + i * cell + cell / 2} y={topPad + 94} textAnchor="middle" className={i === q ? dg.dgTextHi : dg.dgTextS} style={{ fontSize: 8.5 }}>{w}</text>
            </g>
          )
        })}
        <line x1={left} x2={left + tokens.length * cell} y1={topPad + 80} y2={topPad + 80} className={dg.dgLine} strokeWidth="1" />
      </svg>

      <div style={{ marginTop: 12 }}>
        <div className={s.ctlLabel} style={{ marginBottom: 6 }}>the whole head · rows are queries, columns are keys</div>
        <div className={s.cells} style={{ gridTemplateColumns: `repeat(${tokens.length}, 1fr)`, maxWidth: 440 }}>
          {weights.map((r, i) => r.map((w, j) => (
            <div key={`${i}${j}`} className={s.cell} onClick={() => setQ(i)} title={`${tokens[i][0]} → ${tokens[j][0]}: ${(w * 100).toFixed(0)}%`}
              style={{ background: `color-mix(in srgb, var(--accent) ${Math.round(Math.min(1, w * 1.6) * 100)}%, transparent)`, border: i === q ? '1px solid var(--accent)' : undefined }} />
          )))}
        </div>
      </div>
      <Read>
        {tokens[q][0] === 'it'
          ? `For “it”, the strongest keys are ${top.map((t) => `“${tokens[t.i][0]}” (${(t.w * 100).toFixed(0)}%)`).join(', ')}. The output of this head for “it” is a blend of their value vectors in those proportions, so the word carries the meaning of what it refers to. In the paper's own visualisation, this is exactly the example the authors used.`
          : `Every token is a query at the same time, in parallel: this is why a Transformer trains so much faster than a model that reads left to right. Lower the temperature to sharpen the weights, raise it to blur them.`}
      </Read>
    </Sim>
  )
}
