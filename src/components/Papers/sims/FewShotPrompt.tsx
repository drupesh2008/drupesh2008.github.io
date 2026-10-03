'use client'

/**
 * The GPT-3 interface: no training run, just a prompt. Build a zero-, one-
 * or few-shot prompt for a task and see exactly what the model receives.
 * Underneath, the eight model sizes the paper trained, to scale.
 */

import { useState } from 'react'
import { Sim, Controls, Slider, Read, Stat, s, dg } from './ui'

const TASKS = {
  sentiment: { intro: 'Classify the sentiment of each review as positive or negative.', shots: ['Review: The pasta was cold and the service slow.\nSentiment: negative', 'Review: Lovely room, kind staff, would stay again.\nSentiment: positive', 'Review: Battery died after two days.\nSentiment: negative'], query: 'Review: The headphones sound great and arrived early.\nSentiment:' },
  translate: { intro: 'Translate English to French.', shots: ['English: cheese\nFrench: fromage', 'English: good morning\nFrench: bonjour', 'English: the small house\nFrench: la petite maison'], query: 'English: a cup of tea\nFrench:' },
  arithmetic: { intro: 'Add the numbers.', shots: ['Q: 17 + 26\nA: 43', 'Q: 84 + 19\nA: 103', 'Q: 55 + 38\nA: 93'], query: 'Q: 48 + 37\nA:' },
  format: { intro: 'Extract the city and the year.', shots: ['Text: The conference was held in Lisbon in 2019.\nCity: Lisbon · Year: 2019', 'Text: She moved to Nairobi during 2021.\nCity: Nairobi · Year: 2021', 'Text: Our office opened in Osaka in 2016.\nCity: Osaka · Year: 2016'], query: 'Text: The team met in Montreal in 2023.\nCity:' },
} as const
type Task = keyof typeof TASKS

const SIZES: { name: string; params: number; layers: number; d: number }[] = [
  { name: 'GPT-3 Small', params: 125e6, layers: 12, d: 768 }, { name: 'Medium', params: 350e6, layers: 24, d: 1024 },
  { name: 'Large', params: 760e6, layers: 24, d: 1536 }, { name: 'XL', params: 1.3e9, layers: 24, d: 2048 },
  { name: '2.7B', params: 2.7e9, layers: 32, d: 2560 }, { name: '6.7B', params: 6.7e9, layers: 32, d: 4096 },
  { name: '13B', params: 13e9, layers: 40, d: 5140 }, { name: 'GPT-3 175B', params: 175e9, layers: 96, d: 12288 },
]

export default function FewShotPrompt() {
  const [task, setTask] = useState<Task>('sentiment')
  const [k, setK] = useState(2)
  const t = TASKS[task]
  const prompt = [t.intro, ...t.shots.slice(0, k), t.query].join('\n\n')
  const mode = k === 0 ? 'zero-shot' : k === 1 ? 'one-shot' : 'few-shot'
  const maxLog = Math.log10(175e9)

  return (
    <Sim
      title="Teach a task without training"
      note="Pick a task and how many worked examples to show. What you see is the entire input: the model's weights do not change, it simply continues the text."
    >
      <Controls>
        <div className={s.chips}>
          {(Object.keys(TASKS) as Task[]).map((x) => (
            <button type="button" key={x} className={`${s.chip} ${task === x ? s.chipOn : ''}`} onClick={() => setTask(x)}>{x}</button>
          ))}
        </div>
        <Slider label="Examples in the prompt" value={k} min={0} max={3} onChange={setK} fmt={(v) => `${v} · ${v === 0 ? 'zero-shot' : v === 1 ? 'one-shot' : 'few-shot'}`} />
      </Controls>

      <div className={s.log} style={{ marginTop: 0, maxHeight: 260 }}>{prompt}<span className={s.hi}> ▌</span></div>
      <div className={s.stats}>
        <Stat label="mode" value={mode} hint={k === 0 ? 'the instruction alone; the model must already know the format' : 'the examples set the format and the task; nothing is fine-tuned'} />
        <Stat label="prompt tokens, roughly" value={Math.round(prompt.length / 4)} hint="GPT-3’s context held 2,048" />
      </div>

      <div style={{ marginTop: 18 }}>
        <div className={s.ctlLabel} style={{ marginBottom: 6 }}>the eight models the paper trained · parameters on a log scale</div>
        <svg viewBox="0 0 660 200" role="img" aria-label="Bar chart of GPT-3 model sizes">
          {SIZES.map((m, i) => {
            const w = (Math.log10(m.params) / maxLog) * 420
            const y = 8 + i * 23
            return (
              <g key={m.name}>
                <text x="4" y={y + 12} className={dg.dgTextS}>{m.name}</text>
                <rect x="110" y={y} width={w} height="16" rx="3" fill="var(--accent)" fillOpacity={0.2 + (i / SIZES.length) * 0.6} />
                <text x={114 + w} y={y + 12} className={dg.dgText} style={{ fontSize: 9 }}>
                  {m.params >= 1e9 ? `${(m.params / 1e9).toFixed(m.params < 1e10 ? 1 : 0)}B` : `${m.params / 1e6}M`} · {m.layers} layers · d={m.d}
                </text>
              </g>
            )
          })}
        </svg>
      </div>
      <Read>
        The paper&apos;s finding was not that prompting works; it was that it works better the bigger the model, and that the gap between zero-shot and few-shot widens with size. The 175-billion-parameter model is the one that made a prompt a product.
      </Read>
    </Sim>
  )
}
