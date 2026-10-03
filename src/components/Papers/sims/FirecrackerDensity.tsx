'use client'

/**
 * The serverless trade-off as a calculator: how many isolated functions fit
 * on one host, and how long a cold start takes, for a traditional VM, a
 * container, and a Firecracker microVM. The figures for Firecracker are the
 * paper's; the others are typical, labelled as such.
 */

import { useState } from 'react'
import { Sim, Controls, Slider, Stat, Read, Btn, s, dg } from './ui'

const OPTIONS = {
  vm: { name: 'traditional VM', overheadMb: 512, bootMs: 8000, isolation: 'hardware (hypervisor)', note: 'full guest OS and device model per tenant' },
  container: { name: 'container', overheadMb: 8, bootMs: 60, isolation: 'shared kernel (namespaces)', note: 'fast and dense, but one kernel bug exposes every tenant' },
  firecracker: { name: 'Firecracker microVM', overheadMb: 5, bootMs: 125, isolation: 'hardware (KVM) + minimal device model', note: 'the paper: < 5 MiB overhead, ~125 ms to boot, 150 microVMs/s per host' },
} as const
type Opt = keyof typeof OPTIONS

export default function FirecrackerDensity() {
  const [hostGb, setHostGb] = useState(128)
  const [fnMb, setFnMb] = useState(128)
  const [race, setRace] = useState(0)

  const count = (o: Opt) => Math.floor((hostGb * 1024) / (fnMb + OPTIONS[o].overheadMb))
  const maxBoot = Math.max(...Object.values(OPTIONS).map((o) => o.bootMs))

  return (
    <Sim
      title="How many strangers fit on one machine?"
      note="Pick a host size and a function's memory. Density is what fits; the race is a cold start, drawn to scale."
    >
      <Controls>
        <Slider label="Host memory" value={hostGb} min={32} max={512} step={32} onChange={setHostGb} fmt={(v) => `${v} GB`} />
        <Slider label="Function memory" value={fnMb} min={64} max={1024} step={64} onChange={setFnMb} fmt={(v) => `${v} MB`} />
        <div className={s.btnRow}><Btn primary onClick={() => setRace(race + 1)}>Cold start, all three</Btn></div>
      </Controls>

      <table className={s.table}>
        <thead><tr><th>sandbox</th><th>isolation</th><th>memory overhead</th><th>cold start</th><th>functions per host</th></tr></thead>
        <tbody>
          {(Object.keys(OPTIONS) as Opt[]).map((k) => (
            <tr key={k} className={k === 'firecracker' ? s.hi : undefined}>
              <td>{OPTIONS[k].name}</td><td>{OPTIONS[k].isolation}</td><td>~{OPTIONS[k].overheadMb} MB</td><td>~{OPTIONS[k].bootMs} ms</td><td>{count(k).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <svg viewBox="0 0 660 120" role="img" aria-label="Cold start race between a VM, a container and a microVM" key={race}>
        {(Object.keys(OPTIONS) as Opt[]).map((k, i) => {
          const y = 14 + i * 34
          const w = race ? (OPTIONS[k].bootMs / maxBoot) * 470 : 0
          return (
            <g key={k}>
              <text x="8" y={y + 14} className={dg.dgTextS}>{OPTIONS[k].name}</text>
              <rect x="170" y={y} width="470" height="20" rx="4" className={dg.dgBox} strokeWidth="1" />
              <rect x="170" y={y} width={w} height="20" rx="4" fill="var(--accent)" fillOpacity={k === 'firecracker' ? 0.6 : 0.3}
                style={{ transition: race ? `width ${OPTIONS[k].bootMs}ms linear` : 'none' }} />
              {race > 0 && <text x={176 + Math.min(w, 400)} y={y + 14} className={dg.dgTextHi} style={{ fontSize: 9, transition: `x ${OPTIONS[k].bootMs}ms linear` }}>{OPTIONS[k].bootMs} ms</text>}
            </g>
          )
        })}
        <text x="640" y="114" textAnchor="end" className={dg.dgTextS}>bars fill in real time; the long one is the point</text>
      </svg>

      <div className={s.stats}>
        <Stat label="density gain vs VMs" value={`${(count('firecracker') / Math.max(1, count('vm'))).toFixed(1)}×`} hint="more functions per host at this size" />
        <Stat label="start-up gain vs VMs" value={`${Math.round(OPTIONS.vm.bootMs / OPTIONS.firecracker.bootMs)}×`} hint="faster cold start" />
      </div>
      <Read>
        Containers were already dense and fast, but they share the host kernel with every other tenant; a provider cannot put strangers&apos; code there. Virtual machines isolate properly but cost hundreds of megabytes and seconds to start. Firecracker keeps the hardware boundary and throws away everything a serverless function will never use: no BIOS, no PCI bus, five devices, and a 50,000-line VMM instead of a million.
      </Read>
    </Sim>
  )
}
