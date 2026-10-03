'use client'

/**
 * The scaling laws as a calculator. Kaplan et al. fit loss as a power law in
 * parameters, data and compute; Chinchilla (2022) corrected how to split a
 * compute budget between the two. Slide the budget and see what the laws
 * recommend and predict.
 */

import { useMemo, useState } from 'react'
import { Sim, Controls, Slider, Stat, Read, LineChart, Legend, s } from './ui'

// Kaplan et al. (2020), Table 1: L(N) = (Nc/N)^αN, L(D) = (Dc/D)^αD
const Nc = 8.8e13, aN = 0.076, Dc = 5.4e13, aD = 0.095
const LN = (N: number) => (Nc / N) ** aN
const LD = (D: number) => (Dc / D) ** aD
const fmt = (v: number) => (v >= 1e12 ? `${(v / 1e12).toFixed(1)}T` : v >= 1e9 ? `${(v / 1e9).toFixed(1)}B` : v >= 1e6 ? `${(v / 1e6).toFixed(0)}M` : v.toFixed(0))

export default function ScalingLawCalc() {
  const [logC, setLogC] = useState(23) // FLOPs
  const [ratio, setRatio] = useState(20) // tokens per parameter (Chinchilla ≈ 20)
  const C = 10 ** logC
  // C ≈ 6 N D and D = ratio · N  ⇒  N = sqrt(C / (6 · ratio))
  const N = Math.sqrt(C / (6 * ratio))
  const D = ratio * N
  const series = useMemo(() => {
    const pts: [number, number][] = []
    for (let e = 6; e <= 12.5; e += 0.25) pts.push([10 ** e, LN(10 ** e)])
    return [{ name: 'L(N)', points: pts, color: 'var(--accent)' }]
  }, [])

  return (
    <Sim
      title="Spend a compute budget"
      note="Choose a training budget in floating-point operations and a data-to-parameter ratio. The calculator splits the budget into model size and tokens and reads the predicted loss off the paper's power law."
    >
      <Controls>
        <Slider label="Compute budget" value={logC} min={19} max={26} step={0.25} onChange={setLogC} fmt={(v) => `10^${v.toFixed(2)} FLOPs`} />
        <Slider label="Tokens per parameter" value={ratio} min={5} max={100} step={5} onChange={setRatio} fmt={(v) => `${v}×`} />
      </Controls>

      <div className={s.stats}>
        <Stat label="parameters" value={fmt(N)} hint="N = √(C / 6·ratio)" />
        <Stat label="training tokens" value={fmt(D)} hint="D = ratio × N" />
        <Stat label="predicted loss (size-limited)" value={LN(N).toFixed(2)} unit="nats/token" hint="Kaplan's L(N)" />
        <Stat label="predicted loss (data-limited)" value={LD(D).toFixed(2)} unit="nats/token" hint="Kaplan's L(D)" />
      </div>

      <LineChart series={series} xLabel="parameters (log)" yLabel="test loss, nats per token" xLog yMin={1.5} yMax={5} marker={N} h={240}
        fmtX={(v) => fmt(v)} fmtY={(v) => v.toFixed(1)} />
      <Legend items={[{ label: 'L(N) = (8.8·10¹³ / N)^0.076', color: 'var(--accent)' }]} />

      <Read>
        {ratio < 15
          ? 'Below about twenty tokens per parameter you are in the regime the original paper recommended: big models, lightly trained. Chinchilla showed this leaves performance on the table; the same compute spent on a smaller model and more data reaches a lower loss.'
          : ratio > 40
            ? 'Far above twenty tokens per parameter the model is small for its budget. Loss still falls, slowly, and the model is cheap to serve, which is why many production models are deliberately over-trained this way.'
            : 'Around twenty tokens per parameter is the Chinchilla-optimal split: the lowest loss for a fixed budget. Note how flat the curve is on a log axis: each halving of loss costs orders of magnitude more compute, which is the whole economics of the field.'}
      </Read>
    </Sim>
  )
}
