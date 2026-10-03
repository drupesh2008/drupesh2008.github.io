'use client'

/**
 * TrueTime's commit wait, drawn to scale. A clock reading is an interval
 * [earliest, latest]; a transaction takes `latest` as its timestamp and then
 * waits until `latest` is definitely in the past before replying. Compare with
 * two naive clocks that are simply skewed.
 */

import { useState } from 'react'
import { Sim, Controls, Slider, Btn, Stat, Read, s, dg } from './ui'

export default function TrueTimeSim() {
  const [eps, setEps] = useState(4)
  const [naive, setNaive] = useState(false)
  const [skew, setSkew] = useState(6)

  // absolute (true) time in ms along the x axis
  const W = 660, L = 70, R = 640
  const span = 60
  const x = (t: number) => L + ((R - L) * t) / span
  const t1 = 14 // T1 asks for a timestamp
  const s1 = t1 + eps // its commit timestamp = latest
  const done1 = s1 + eps // commit wait ends when now.earliest > s1, i.e. true time > s1 + eps
  const t2 = done1 + 3 // T2 starts after T1 has replied
  const s2 = t2 + eps

  return (
    <Sim
      title="Why Spanner waits before it says yes"
      note="Drag the uncertainty. T1 takes the latest possible time as its timestamp, then waits until that moment is surely past. T2, which starts after T1 has replied, can only get a larger timestamp."
    >
      <Controls>
        <Slider label="Clock uncertainty ε" value={eps} min={1} max={12} onChange={setEps} fmt={(v) => `${v} ms`} />
        <div className={s.btnRow}>
          <Btn primary={!naive} onClick={() => setNaive(false)}>TrueTime</Btn>
          <Btn primary={naive} onClick={() => setNaive(true)}>Two skewed clocks</Btn>
        </div>
        {naive && <Slider label="Skew between the two clocks" value={skew} min={0} max={12} onChange={setSkew} fmt={(v) => `${v} ms`} />}
      </Controls>

      <svg viewBox={`0 0 ${W} 200`} role="img" aria-label="Timeline of two transactions and their timestamps">
        <line x1={L} x2={R} y1="160" y2="160" className={dg.dgLine} strokeWidth="1" />
        {[0, 10, 20, 30, 40, 50, 60].map((t) => (
          <g key={t}>
            <line x1={x(t)} x2={x(t)} y1="156" y2="164" className={dg.dgLine} strokeWidth="1" />
            <text x={x(t)} y="178" textAnchor="middle" className={dg.dgText} style={{ fontSize: 9.5 }}>{t} ms</text>
          </g>
        ))}
        <text x={R} y="194" textAnchor="end" className={dg.dgTextS}>true time</text>

        {!naive ? (
          <>
            {/* T1 */}
            <text x="8" y="52" className={dg.dgTextS}>T1</text>
            <rect x={x(t1 - eps)} y="38" width={x(t1 + eps) - x(t1 - eps)} height="18" rx="4" className={dg.dgBox} strokeWidth="1" />
            <text x={x(t1)} y="32" textAnchor="middle" className={dg.dgText} style={{ fontSize: 9 }}>TT.now() = [{t1 - eps}, {t1 + eps}]</text>
            <line x1={x(s1)} x2={x(s1)} y1="34" y2="60" className={dg.dgAcc} strokeWidth="1.6" />
            <text x={x(s1) + 4} y="68" className={dg.dgTextAcc} style={{ fontSize: 9 }}>s1 = {s1}</text>
            <rect x={x(s1)} y="72" width={x(done1) - x(s1)} height="8" rx="2" fill="var(--accent)" fillOpacity="0.35" />
            <text x={x(done1) + 4} y="80" className={dg.dgText} style={{ fontSize: 9 }}>commit wait {eps} ms, then reply</text>
            {/* T2 */}
            <text x="8" y="118" className={dg.dgTextS}>T2</text>
            <rect x={x(t2 - eps)} y="104" width={x(t2 + eps) - x(t2 - eps)} height="18" rx="4" className={dg.dgBox} strokeWidth="1" />
            <text x={x(t2)} y="98" textAnchor="middle" className={dg.dgText} style={{ fontSize: 9 }}>starts after T1 replied</text>
            <line x1={x(s2)} x2={x(s2)} y1="100" y2="126" className={dg.dgAcc} strokeWidth="1.6" />
            <text x={x(s2) + 4} y="134" className={dg.dgTextAcc} style={{ fontSize: 9 }}>s2 = {s2} &gt; s1</text>
          </>
        ) : (
          <>
            <text x="8" y="52" className={dg.dgTextS}>T1 · node A</text>
            <line x1={x(t1)} x2={x(t1)} y1="34" y2="60" className={dg.dgAcc} strokeWidth="1.6" />
            <text x={x(t1) + 4} y="68" className={dg.dgTextAcc} style={{ fontSize: 9 }}>A&apos;s clock says {t1 + skew}</text>
            <text x="8" y="118" className={dg.dgTextS}>T2 · node B</text>
            <line x1={x(t1 + 3)} x2={x(t1 + 3)} y1="100" y2="126" className={dg.dgAcc} strokeWidth="1.6" />
            <text x={x(t1 + 3) + 4} y="134" className={dg.dgTextAcc} style={{ fontSize: 9 }}>B&apos;s clock says {t1 + 3}</text>
            <text x={x(30)} y="150" className={skew > 3 ? dg.dgTextAcc : dg.dgText} style={{ fontSize: 10 }}>
              {skew > 3 ? `T2 really happened 3 ms after T1 but carries the smaller timestamp: history is now backwards.` : 'With small skew the order survives, but nothing guarantees it.'}
            </text>
          </>
        )}
      </svg>

      <div className={s.stats}>
        {!naive ? (
          <>
            <Stat label="commit wait" value={eps} unit="ms" hint="the price of an honest timestamp" />
            <Stat label="s2 − s1" value={s2 - s1} unit="ms" hint="always positive: T2 is after T1 in real time" />
            <Stat label="Spanner's ε in practice" value="1–7" unit="ms" hint="GPS and atomic clocks in every data centre" />
          </>
        ) : (
          <Stat label="timestamp order" value={skew > 3 ? 'inverted' : 'lucky'} hint="a snapshot read at time 20 would see T2 but not the T1 it depended on" />
        )}
      </div>
      <Read>
        {naive
          ? 'Ordinary clocks drift and no one knows by how much, so a timestamp from one machine cannot be compared with a timestamp from another. Every system before Spanner either gave up global ordering or routed everything through one place.'
          : 'TrueTime never claims to know the time; it returns a window that is guaranteed to contain it. By waiting out the window, a transaction makes its timestamp mean something on every machine on Earth, and the cost is a few milliseconds, paid once per commit.'}
      </Read>
    </Sim>
  )
}
