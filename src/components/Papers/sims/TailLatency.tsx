'use client'

/**
 * The arithmetic of the tail. If each server is slow with probability p and a
 * request touches n of them, the request is slow with probability
 * 1 − (1 − p)^n. Hedged requests send a backup to a second replica after a
 * short wait, so both must be slow for the user to suffer.
 */

import { useMemo, useState } from 'react'
import { Sim, Controls, Slider, Stat, Read, LineChart, Legend, s } from './ui'

export default function TailLatency() {
  const [pPct, setPPct] = useState(1)
  const [n, setN] = useState(100)
  const p = pPct / 100
  const slow = (k: number) => 1 - (1 - p) ** k
  const hedged = (k: number) => 1 - (1 - p * p) ** k

  const series = useMemo(() => {
    const xs = [1, 2, 3, 5, 8, 10, 15, 20, 30, 50, 70, 100, 150, 200, 300, 500, 1000]
    return [
      { name: 'one request, n servers', points: xs.map((k) => [k, 100 * slow(k)] as [number, number]), color: 'var(--accent)' },
      { name: 'with hedged requests', points: xs.map((k) => [k, 100 * hedged(k)] as [number, number]), color: 'var(--chalk)', dashed: true },
    ]
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p])

  return (
    <Sim
      title="How rare slowness becomes the common case"
      note="Set how often a single server is slow and how many servers one user request fans out to. The chart shows the chance that the request waits for a slow one."
    >
      <Controls>
        <Slider label="A server is slow" value={pPct} min={0.1} max={5} step={0.1} onChange={setPPct} fmt={(v) => `${v.toFixed(1)}% of the time`} />
        <Slider label="Servers per request" value={n} min={1} max={1000} onChange={setN} />
      </Controls>

      <LineChart series={series} xLabel="servers touched by one request (log)" yLabel="% of requests slow" xLog yMin={0} yMax={100} marker={n} fmtY={(v) => `${v}%`} />
      <Legend items={[{ label: 'plain fan-out', color: 'var(--accent)' }, { label: 'hedged after the 95th percentile', color: 'var(--chalk)' }]} />

      <div className={s.stats}>
        <Stat label="chance a request is slow" value={`${(100 * slow(n)).toFixed(1)}%`} hint={`1 − (1 − ${p.toFixed(3)})^${n}`} />
        <Stat label="with hedging" value={`${(100 * hedged(n)).toFixed(2)}%`} hint="both replicas must be slow" />
        <Stat label="extra load from hedging" value={`~${Math.max(5, Math.round(100 * (1 - 0.95)))}%`} hint="backups are sent only for the slowest 5%" />
      </div>
      <Read>
        {slow(n) > 0.5
          ? `At ${n} servers, a one-in-a-hundred hiccup becomes the typical experience: most requests wait for someone's garbage collector, disk scrub or background compaction. The paper's answer is not to eliminate variability, which is impossible, but to stop one slow server from deciding the outcome.`
          : 'Keep raising the fan-out. The curve is not a straight line because the slow servers are independent: each one you add is another lottery ticket the user can lose. Hedging turns one loss into needing two, which squares the odds.'}
      </Read>
    </Sim>
  )
}
