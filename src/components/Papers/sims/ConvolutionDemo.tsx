'use client'

/**
 * What a convolutional layer does, on an 8×8 image you can paint: slide a
 * 3×3 filter over it and write the response. The filters here are the
 * classic hand-made ones; AlexNet's point was that it learned 96 of its own.
 * Below, the ImageNet top-5 error by year, with the 2012 drop.
 */

import { useMemo, useState } from 'react'
import { Sim, Controls, Btn, Read, LineChart, s } from './ui'

const N = 8
const KERNELS: Record<string, { k: number[][]; what: string }> = {
  'vertical edges': { k: [[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]], what: 'responds where brightness changes left to right' },
  'horizontal edges': { k: [[-1, -2, -1], [0, 0, 0], [1, 2, 1]], what: 'responds where brightness changes top to bottom' },
  'blur': { k: [[1, 1, 1], [1, 1, 1], [1, 1, 1]].map((r) => r.map((v) => v / 9)), what: 'averages each pixel with its neighbours' },
  'sharpen': { k: [[0, -1, 0], [-1, 5, -1], [0, -1, 0]], what: 'exaggerates a pixel against its neighbours' },
}
const START = [
  '00000000', '00111100', '00100100', '00100100', '00111100', '00000000', '01111110', '00000000',
].map((r) => r.split('').map(Number))

const ERR: [number, number][] = [[2010, 28.2], [2011, 25.8], [2012, 16.4], [2013, 11.7], [2014, 6.7], [2015, 3.6], [2016, 3.0], [2017, 2.3]]

export default function ConvolutionDemo() {
  const [img, setImg] = useState<number[][]>(START)
  const [kname, setKname] = useState<keyof typeof KERNELS>('vertical edges')
  const K = KERNELS[kname].k

  const out = useMemo(() => {
    const o: number[][] = []
    for (let y = 0; y < N - 2; y++) {
      const row: number[] = []
      for (let x = 0; x < N - 2; x++) {
        let sum = 0
        for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) sum += img[y + j][x + i] * K[j][i]
        row.push(sum)
      }
      o.push(row)
    }
    return o
  }, [img, K])
  const maxAbs = Math.max(1e-6, ...out.flat().map((v) => Math.abs(v)))
  const toggle = (y: number, x: number) => setImg((im) => im.map((r, yy) => r.map((v, xx) => (yy === y && xx === x ? 1 - v : v))))

  return (
    <Sim
      title="Paint an image, slide a filter over it"
      note="Click pixels to toggle them. The output is the filter's response at each position: a feature map. A deep network stacks dozens of these, each layer reading the maps of the one below."
    >
      <Controls>
        <div className={s.chips}>
          {(Object.keys(KERNELS) as (keyof typeof KERNELS)[]).map((k) => (
            <button type="button" key={k} className={`${s.chip} ${kname === k ? s.chipOn : ''}`} onClick={() => setKname(k)}>{k}</button>
          ))}
        </div>
        <Btn onClick={() => setImg(START)}>Reset image</Btn>
      </Controls>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 18, alignItems: 'start' }}>
        <div>
          <div className={s.ctlLabel} style={{ marginBottom: 8 }}>input · 8 × 8 (click to paint)</div>
          <div className={s.cells} style={{ gridTemplateColumns: `repeat(${N}, 1fr)`, maxWidth: 240 }}>
            {img.map((r, y) => r.map((v, x) => (
              <div key={`${y}${x}`} className={s.cell} onClick={() => toggle(y, x)} style={{ background: v ? 'var(--chalk)' : 'var(--panel2)' }} />
            )))}
          </div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div className={s.ctlLabel} style={{ marginBottom: 8 }}>3 × 3 filter</div>
          <div className={s.cells} style={{ gridTemplateColumns: 'repeat(3, 28px)' }}>
            {K.flat().map((v, i) => <div key={i} className={s.cell} style={{ cursor: 'default', color: 'var(--chalk)' }}>{Number.isInteger(v) ? v : v.toFixed(2)}</div>)}
          </div>
          <div style={{ fontSize: 11, color: 'var(--faint)', marginTop: 8, maxWidth: 120 }}>{KERNELS[kname].what}</div>
        </div>
        <div>
          <div className={s.ctlLabel} style={{ marginBottom: 8 }}>feature map · 6 × 6</div>
          <div className={s.cells} style={{ gridTemplateColumns: `repeat(${N - 2}, 1fr)`, maxWidth: 180 }}>
            {out.map((r, y) => r.map((v, x) => (
              <div key={`${y}${x}`} className={s.cell} style={{ cursor: 'default', background: v >= 0 ? `rgba(94, 233, 213, ${Math.abs(v) / maxAbs})` : `rgba(255, 122, 122, ${Math.abs(v) / maxAbs})` }} />
            )))}
          </div>
          <div style={{ fontSize: 11, color: 'var(--faint)', marginTop: 8 }}>positive response in teal, negative in red</div>
        </div>
      </div>

      <div style={{ marginTop: 22 }}>
        <div className={s.ctlLabel} style={{ marginBottom: 6 }}>ImageNet top-5 error of the winning entry, by year</div>
        <LineChart series={[{ name: 'winner', points: ERR, color: 'var(--accent)' }]} xLabel="year" yLabel="top-5 error, %" yMin={0} yMax={30} marker={2012} h={220}
          fmtX={(v) => String(v)} />
      </div>
      <Read>
        Before 2012 the winners used features designed by hand (edges, corners, colour histograms) and the error fell a point or two a year. AlexNet learned its filters from the pixels and cut the error from 25.8% to 16.4% in one step. Every winner since has been a deeper network of the same kind, and the 2015 entry passed the estimated human error of about 5%.
      </Read>
    </Sim>
  )
}
