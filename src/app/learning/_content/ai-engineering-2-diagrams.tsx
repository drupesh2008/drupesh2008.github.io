/**
 * Figures for the second half of the AI Engineering pathway (fine-tuning,
 * agents, security, evals, production). Drawn with the shared diagram
 * vocabulary so both theme exposures re-ink them.
 */
import { pathwayStyles as s } from '@/components/Pathway/Pathway'

/** LoRA: a frozen weight matrix plus a trainable low-rank detour */
export function LoraAdapter() {
  return (
    <svg viewBox="0 0 660 236" role="img" aria-label="The input passes through the frozen 4096 by 4096 weight matrix and, in parallel, through two thin trainable matrices A and B; the two outputs are added">
      <text x="8" y="18" className={s.dgTextS}>one projection inside one transformer layer</text>

      {/* input */}
      <rect x="8" y="92" width="58" height="32" rx="7" className={s.dgBox} strokeWidth="1.1" />
      <text x="37" y="112" textAnchor="middle" className={s.dgTextHi}>x</text>

      {/* frozen path */}
      <path d="M 66 100 C 96 100, 100 70, 130 70" className={s.dgLine} strokeWidth="1.2" />
      <rect x="130" y="32" width="170" height="76" rx="8" className={s.dgBox} strokeWidth="1.1" />
      <text x="215" y="62" textAnchor="middle" className={s.dgTextHi}>W · frozen</text>
      <text x="215" y="80" textAnchor="middle" className={s.dgText} style={{ fontSize: 10 }}>4096 × 4096</text>
      <text x="215" y="96" textAnchor="middle" className={s.dgTextS} style={{ fontSize: 8.5 }}>16,777,216 weights</text>

      {/* adapter path */}
      <path d="M 66 116 C 96 116, 100 164, 130 164" className={s.dgAcc} strokeWidth="1.2" />
      <rect x="130" y="146" width="76" height="36" rx="7" className={s.dgBoxHi} strokeWidth="1.2" />
      <text x="168" y="162" textAnchor="middle" className={s.dgTextHi} style={{ fontSize: 11 }}>A</text>
      <text x="168" y="175" textAnchor="middle" className={s.dgTextS} style={{ fontSize: 8 }}>16 × 4096</text>
      <line x1="206" y1="164" x2="224" y2="164" className={s.dgAcc} strokeWidth="1.2" />
      <rect x="224" y="146" width="76" height="36" rx="7" className={s.dgBoxHi} strokeWidth="1.2" />
      <text x="262" y="162" textAnchor="middle" className={s.dgTextHi} style={{ fontSize: 11 }}>B</text>
      <text x="262" y="175" textAnchor="middle" className={s.dgTextS} style={{ fontSize: 8 }}>4096 × 16</text>
      <text x="215" y="200" textAnchor="middle" className={s.dgTextAcc} style={{ fontSize: 9 }}>trainable · 131,072 weights</text>

      {/* sum */}
      <path d="M 300 70 C 330 70, 340 104, 358 106" className={s.dgLine} strokeWidth="1.2" />
      <path d="M 300 164 C 330 164, 340 116, 358 112" className={s.dgAcc} strokeWidth="1.2" />
      <circle cx="372" cy="109" r="14" className={s.dgBox} strokeWidth="1.2" />
      <text x="372" y="114" textAnchor="middle" className={s.dgTextHi} style={{ fontSize: 14 }}>+</text>
      <line x1="386" y1="109" x2="420" y2="109" className={s.dgLine} strokeWidth="1.2" />
      <rect x="420" y="93" width="58" height="32" rx="7" className={s.dgBox} strokeWidth="1.1" />
      <text x="449" y="113" textAnchor="middle" className={s.dgTextHi}>h</text>

      {/* notes */}
      <text x="496" y="70" className={s.dgText} style={{ fontSize: 10 }}>h = Wx + (α/r)·BAx</text>
      <text x="496" y="100" className={s.dgText} style={{ fontSize: 10 }}>B starts at zero, so</text>
      <text x="496" y="114" className={s.dgText} style={{ fontSize: 10 }}>step 0 is the base model</text>
      <text x="496" y="144" className={s.dgText} style={{ fontSize: 10 }}>after training, BA can be</text>
      <text x="496" y="158" className={s.dgText} style={{ fontSize: 10 }}>merged into W, or kept</text>
      <text x="496" y="172" className={s.dgText} style={{ fontSize: 10 }}>apart and swapped per task</text>

      <text x="8" y="228" className={s.dgTextAcc}>rank 16 trains 0.78% of this matrix · the base model never changes</text>
    </svg>
  )
}

/** each agent step re-sends the whole conversation, so cost grows faster than the step count */
export function StepCost() {
  const base = 6000
  const grow = 400
  const scale = 130 / 8000
  const steps = [0, 1, 2, 3, 4, 5]
  return (
    <svg viewBox="0 0 660 214" role="img" aria-label="Six agent steps; each step's input is the base prompt plus every earlier tool call and result, so the bars grow and the total is about seven single calls">
      <text x="8" y="18" className={s.dgTextS}>input tokens sent to the model, per step</text>
      <line x1="40" y1="172" x2="420" y2="172" className={s.dgLine} strokeWidth="1" />
      {steps.map((k) => {
        const hb = base * scale
        const hg = grow * k * scale
        const x = 56 + k * 60
        return (
          <g key={k}>
            <rect x={x} y={172 - hb} width="36" height={hb} rx="2" className={s.dgFaintFill} opacity="0.45" />
            {k > 0 && <rect x={x} y={172 - hb - hg} width="36" height={hg} rx="2" className={s.dgAccFill} opacity="0.9" />}
            <text x={x + 18} y={172 - hb - hg - 6} textAnchor="middle" className={s.dgText} style={{ fontSize: 9 }}>
              {((base + grow * k) / 1000).toFixed(1)}k
            </text>
            <text x={x + 18} y="188" textAnchor="middle" className={s.dgTextS} style={{ fontSize: 8.5 }}>step {k + 1}</text>
          </g>
        )
      })}
      <rect x="450" y="56" width="10" height="10" className={s.dgFaintFill} opacity="0.45" />
      <text x="466" y="65" className={s.dgText} style={{ fontSize: 10 }}>prompt, docs, history</text>
      <rect x="450" y="76" width="10" height="10" className={s.dgAccFill} />
      <text x="466" y="85" className={s.dgText} style={{ fontSize: 10 }}>earlier calls + results</text>
      <text x="450" y="118" className={s.dgTextHi} style={{ fontSize: 11 }}>six steps ≈ 42,000 tokens</text>
      <text x="450" y="134" className={s.dgText} style={{ fontSize: 10 }}>one call = 6,000 tokens</text>
      <text x="450" y="150" className={s.dgText} style={{ fontSize: 10 }}>ratio = 7×, not 6×</text>
      <text x="8" y="208" className={s.dgTextAcc}>the model is stateless · every step pays again for everything before it</text>
    </svg>
  )
}

/** the lethal trifecta, mapped onto the support assistant */
export function Trifecta() {
  return (
    <svg viewBox="0 0 660 270" role="img" aria-label="Three overlapping circles: private data, untrusted content, and an exfiltration channel. Where all three overlap, prompt injection becomes a data breach">
      <circle cx="285" cy="100" r="72" className={s.dgAcc} strokeWidth="1.2" />
      <circle cx="375" cy="100" r="72" className={s.dgAcc} strokeWidth="1.2" />
      <circle cx="330" cy="172" r="72" className={s.dgAcc} strokeWidth="1.2" />
      <circle cx="285" cy="100" r="72" className={s.dgFaintFill} opacity="0.07" />
      <circle cx="375" cy="100" r="72" className={s.dgFaintFill} opacity="0.07" />
      <circle cx="330" cy="172" r="72" className={s.dgFaintFill} opacity="0.07" />

      <text x="255" y="80" textAnchor="middle" className={s.dgTextHi} style={{ fontSize: 10.5 }}>private data</text>
      <text x="405" y="80" textAnchor="middle" className={s.dgTextHi} style={{ fontSize: 10.5 }}>untrusted text</text>
      <text x="330" y="210" textAnchor="middle" className={s.dgTextHi} style={{ fontSize: 10.5 }}>a way out</text>
      <text x="330" y="134" textAnchor="middle" className={s.dgTextAcc} style={{ fontSize: 9 }}>breach</text>

      <text x="8" y="40" className={s.dgTextS}>the customer’s</text>
      <text x="8" y="56" className={s.dgText} style={{ fontSize: 10 }}>orders, holdings, PAN,</text>
      <text x="8" y="70" className={s.dgText} style={{ fontSize: 10 }}>bank details, ticket history</text>
      <line x1="170" y1="62" x2="218" y2="78" className={`${s.dgLine} ${s.dgDash}`} strokeWidth="1" />

      <text x="470" y="40" className={s.dgTextS}>text we did not write</text>
      <text x="470" y="56" className={s.dgText} style={{ fontSize: 10 }}>edited articles, forum posts,</text>
      <text x="470" y="70" className={s.dgText} style={{ fontSize: 10 }}>customer messages, tickets</text>
      <line x1="466" y1="62" x2="440" y2="78" className={`${s.dgLine} ${s.dgDash}`} strokeWidth="1" />

      <text x="470" y="200" className={s.dgTextS}>an exfiltration channel</text>
      <text x="470" y="216" className={s.dgText} style={{ fontSize: 10 }}>auto-loaded image URLs,</text>
      <text x="470" y="230" className={s.dgText} style={{ fontSize: 10 }}>links, outbound tools</text>
      <line x1="466" y1="212" x2="398" y2="196" className={`${s.dgLine} ${s.dgDash}`} strokeWidth="1" />

      <text x="8" y="262" className={s.dgTextAcc}>take away any one circle and a hijacked model can misbehave, but it cannot leak</text>
    </svg>
  )
}

/** end-to-end accuracy decomposed into retrieval and generation */
export function RetrievalSplit() {
  return (
    <svg viewBox="0 0 660 214" role="img" aria-label="Of the eval cases, 78 percent retrieve the right document and 92 percent of those are answered correctly; 22 percent miss the document and 31 percent of those are still handled correctly; the total is 78.6 percent">
      <text x="8" y="18" className={s.dgTextS}>300 eval cases, split by what retrieval did</text>
      <rect x="8" y="88" width="110" height="38" rx="8" className={s.dgBoxHi} strokeWidth="1.2" />
      <text x="63" y="111" textAnchor="middle" className={s.dgTextHi} style={{ fontSize: 11 }}>question</text>

      <path d="M 118 100 C 150 100, 150 58, 186 58" className={s.dgAcc} strokeWidth="1.2" />
      <path d="M 118 114 C 150 114, 150 156, 186 156" className={s.dgLine} strokeWidth="1.2" />
      <text x="150" y="50" textAnchor="middle" className={s.dgText} style={{ fontSize: 9.5 }}>0.78</text>
      <text x="150" y="176" textAnchor="middle" className={s.dgText} style={{ fontSize: 9.5 }}>0.22</text>

      <rect x="186" y="40" width="170" height="36" rx="7" className={s.dgBox} strokeWidth="1.1" />
      <text x="271" y="55" textAnchor="middle" className={s.dgTextHi} style={{ fontSize: 10.5 }}>right doc in top 5</text>
      <text x="271" y="68" textAnchor="middle" className={s.dgTextS} style={{ fontSize: 8 }}>recall@5</text>
      <rect x="186" y="138" width="170" height="36" rx="7" className={s.dgBox} strokeWidth="1.1" />
      <text x="271" y="153" textAnchor="middle" className={s.dgTextHi} style={{ fontSize: 10.5 }}>right doc missed</text>
      <text x="271" y="166" textAnchor="middle" className={s.dgTextS} style={{ fontSize: 8 }}>model must say so</text>

      <line x1="356" y1="58" x2="400" y2="58" className={s.dgAcc} strokeWidth="1.2" />
      <line x1="356" y1="156" x2="400" y2="156" className={s.dgLine} strokeWidth="1.2" />
      <text x="378" y="50" textAnchor="middle" className={s.dgText} style={{ fontSize: 9.5 }}>0.92</text>
      <text x="378" y="176" textAnchor="middle" className={s.dgText} style={{ fontSize: 9.5 }}>0.31</text>

      <rect x="400" y="40" width="120" height="36" rx="7" className={s.dgBoxHi} strokeWidth="1.2" />
      <text x="460" y="62" textAnchor="middle" className={s.dgTextHi} style={{ fontSize: 10.5 }}>0.78 × 0.92 = 0.718</text>
      <rect x="400" y="138" width="120" height="36" rx="7" className={s.dgBox} strokeWidth="1.1" />
      <text x="460" y="160" textAnchor="middle" className={s.dgTextHi} style={{ fontSize: 10.5 }}>0.22 × 0.31 = 0.068</text>

      <text x="540" y="104" className={s.dgTextS}>end to end</text>
      <text x="540" y="124" className={s.dgTextHi} style={{ fontSize: 15 }}>0.786</text>

      <text x="8" y="206" className={s.dgTextAcc}>one end-to-end score hides which of the two stages to fix</text>
    </svg>
  )
}

/** one traced conversation turn, laid out on a time axis */
export function TraceWaterfall() {
  const x0 = 150
  const k = 480 / 7000
  const rows: { label: string; a: number; b: number; hi?: boolean; wait?: number }[] = [
    { label: 'input checks', a: 0, b: 80 },
    { label: 'retrieval', a: 80, b: 480 },
    { label: 'decision call', a: 480, b: 1580, hi: true },
    { label: 'get_order_status', a: 1580, b: 1830 },
    { label: 'reply call', a: 1830, b: 6930, hi: true, wait: 2730 },
    { label: 'output checks', a: 2730, b: 6970 },
  ]
  return (
    <svg viewBox="0 0 660 240" role="img" aria-label="A trace of one turn: input checks, retrieval, a decision call that picks the lookup, the order lookup, and a reply call whose first token arrives at about 2.7 seconds and which streams until about 6.9 seconds">
      <text x="8" y="18" className={s.dgTextS}>one turn · “where is my sell order ORD-88213?” · spans on a time axis</text>
      {[0, 1, 2, 3, 4, 5, 6, 7].map((t) => (
        <g key={t}>
          <line x1={x0 + t * 1000 * k} y1="30" x2={x0 + t * 1000 * k} y2="196" className={`${s.dgLine} ${s.dgDash}`} strokeWidth="0.6" />
          <text x={x0 + t * 1000 * k} y="210" textAnchor="middle" className={s.dgTextS} style={{ fontSize: 8.5 }}>{t} s</text>
        </g>
      ))}
      {rows.map((r, i) => {
        const y = 38 + i * 26
        return (
          <g key={r.label}>
            <text x={x0 - 10} y={y + 12} textAnchor="end" className={s.dgText} style={{ fontSize: 10 }}>{r.label}</text>
            {r.wait ? (
              <>
                <rect x={x0 + r.a * k} y={y + 2} width={(r.wait - r.a) * k} height="14" rx="2" className={s.dgFaintFill} opacity="0.5" />
                <rect x={x0 + r.wait * k} y={y + 2} width={(r.b - r.wait) * k} height="14" rx="2" className={s.dgAccFill} opacity="0.85" />
              </>
            ) : (
              <rect x={x0 + r.a * k} y={y + 2} width={Math.max(3, (r.b - r.a) * k)} height="14" rx="2" className={r.hi ? s.dgAccFill : s.dgFaintFill} opacity={r.hi ? 0.85 : 0.6} />
            )}
          </g>
        )
      })}
      <line x1={x0 + 2730 * k} y1="28" x2={x0 + 2730 * k} y2="196" className={s.dgAcc} strokeWidth="1.2" />
      <text x={x0 + 2730 * k + 6} y="34" className={s.dgTextAcc} style={{ fontSize: 9 }}>first visible token · 2.73 s</text>
      <text x="8" y="232" className={s.dgTextAcc}>the customer waits for everything left of the line · the stream hides what is right of it</text>
    </svg>
  )
}
