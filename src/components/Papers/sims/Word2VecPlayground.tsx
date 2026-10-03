'use client'

/**
 * Words as points. A toy two-dimensional embedding in which the famous
 * analogies hold exactly, so the arithmetic can be seen; and the skip-gram
 * window that word2vec learns from, on a sentence.
 */

import { useState } from 'react'
import { Sim, Controls, Slider, Stat, Read, s, dg } from './ui'

const V: Record<string, [number, number]> = {
  man: [1, 1], woman: [3, 1], king: [1, 4], queen: [3, 4],
  walk: [6, 1], walked: [6, 3], swim: [8, 1], swam: [8, 3],
  france: [1, 7], paris: [3, 7], germany: [6, 7], berlin: [8, 7],
  apple: [11.5, 1.5], banana: [12.5, 2], car: [11, 5.5], truck: [12.5, 6],
}
const WORDS = Object.keys(V)
const SENTENCE = 'the quick brown fox jumps over the lazy dog'.split(' ')

export default function Word2VecPlayground() {
  const [a, setA] = useState('king')
  const [b, setB] = useState('man')
  const [c, setC] = useState('woman')
  const [center, setCenter] = useState(3)
  const [win, setWin] = useState(2)

  // sixteen points: cheap enough to recompute on every render, no memo needed
  const target: [number, number] = [V[a][0] - V[b][0] + V[c][0], V[a][1] - V[b][1] + V[c][1]]
  const nearest = WORDS.filter((w) => ![a, b, c].includes(w))
    .map((w) => ({ w, d: Math.hypot(V[w][0] - target[0], V[w][1] - target[1]) }))
    .sort((x, y) => x.d - y.d)[0]
  const X = (x: number) => 30 + x * 44, Y = (y: number) => 200 - y * 22
  const pairs = SENTENCE.map((w, i) => (i !== center && Math.abs(i - center) <= win ? [SENTENCE[center], w] : null)).filter(Boolean) as [string, string][]

  const sel = (label: string, v: string, set: (x: string) => void) => (
    <label className={s.ctl} style={{ minWidth: 110 }}>
      <span className={s.ctlLabel}>{label}</span>
      <select className={s.select} value={v} onChange={(e) => set(e.target.value)}>{WORDS.map((w) => <option key={w}>{w}</option>)}</select>
    </label>
  )

  return (
    <Sim
      title="Do arithmetic on words"
      note="Sixteen words placed in two dimensions so the relationships are visible. Pick a − b + c and see which word is nearest to the result. Real embeddings have hundreds of dimensions and the relationships are only approximate, but they are there."
    >
      <Controls>
        {sel('a', a, setA)}<span className={s.ctlLabel} style={{ alignSelf: 'center' }}>−</span>
        {sel('b', b, setB)}<span className={s.ctlLabel} style={{ alignSelf: 'center' }}>+</span>
        {sel('c', c, setC)}
      </Controls>

      <svg viewBox="0 0 640 220" role="img" aria-label="Scatter plot of word vectors with the analogy drawn">
        {WORDS.map((w) => (
          <g key={w}>
            <circle cx={X(V[w][0])} cy={Y(V[w][1])} r="3.5" className={[a, b, c].includes(w) ? dg.dgAccFill : dg.dgFaintFill} />
            <text x={X(V[w][0]) + 6} y={Y(V[w][1]) + 4} className={w === nearest.w ? dg.dgTextHi : dg.dgText} style={{ fontSize: 10 }}>{w}</text>
          </g>
        ))}
        <line x1={X(V[b][0])} y1={Y(V[b][1])} x2={X(V[a][0])} y2={Y(V[a][1])} className={dg.dgAcc} strokeWidth="1.4" markerEnd="url(#w2v-arrow)" />
        <line x1={X(V[c][0])} y1={Y(V[c][1])} x2={X(target[0])} y2={Y(target[1])} className={`${dg.dgAcc} ${dg.dgDash}`} strokeWidth="1.4" markerEnd="url(#w2v-arrow)" />
        <circle cx={X(target[0])} cy={Y(target[1])} r="7" className={dg.dgAcc} strokeWidth="1.5" fill="none" />
        <defs>
          <marker id="w2v-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
            <path d="M0,0 L8,4 L0,8 z" className={dg.dgAccFill} />
          </marker>
        </defs>
        <text x="632" y="214" textAnchor="end" className={dg.dgTextS}>solid: b → a · dashed: the same vector applied at c</text>
      </svg>
      <div className={s.stats}>
        <Stat label={`${a} − ${b} + ${c} ≈`} value={nearest.w} hint={`nearest word to the open circle (distance ${nearest.d.toFixed(2)})`} />
      </div>

      <div style={{ marginTop: 20 }}>
        <div className={s.ctlLabel} style={{ marginBottom: 8 }}>what it learns from: skip-gram training pairs</div>
        <Controls>
          <Slider label="Centre word" value={center} min={0} max={SENTENCE.length - 1} onChange={setCenter} fmt={(v) => SENTENCE[v]} />
          <Slider label="Window" value={win} min={1} max={4} onChange={setWin} />
        </Controls>
        <div className={s.chips}>
          {SENTENCE.map((w, i) => (
            <span key={i} className={`${s.chip} ${i === center ? s.chipOn : ''}`} style={{ cursor: 'default', opacity: i !== center && Math.abs(i - center) > win ? 0.35 : 1 }}>{w}</span>
          ))}
        </div>
        <div className={s.log}>{pairs.map(([x, y], i) => <span key={i}>({x}, {y}){i < pairs.length - 1 ? '  ' : ''}</span>)}</div>
      </div>
      <Read>
        Training is nothing more than: given the centre word, predict the words in its window, millions of times over. Words that keep the same company end up with similar vectors, and because the model is linear, consistent relationships (gender, tense, capital-of) become consistent directions. Nobody told it what a capital was.
      </Read>
    </Sim>
  )
}
