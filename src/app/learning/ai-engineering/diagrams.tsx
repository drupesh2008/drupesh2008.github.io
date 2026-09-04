/**
 * Figures for the AI Engineering pathway — drawn with the shared diagram
 * vocabulary so both theme exposures re-ink them.
 */
import { pathwayStyles as s } from '@/components/Pathway/Pathway'

/** everything the model sees is one assembled sequence — and you assemble it */
export function ContextAssembly() {
  const parts = [
    { label: 'system prompt', w: 108 },
    { label: 'retrieved docs', w: 150 },
    { label: 'conversation so far', w: 150 },
    { label: 'user message', w: 100 },
  ]
  let x = 8
  const placed = parts.map((p) => {
    const r = { ...p, x }
    x += p.w + 8
    return r
  })
  return (
    <svg viewBox="0 0 660 200" role="img" aria-label="System prompt, retrieved documents, history and the user message are concatenated into one context window; the model emits a distribution over the next token">
      <text x="8" y="20" className={s.dgTextS}>the context window — one sequence of tokens, assembled by your code</text>
      {placed.map((p) => (
        <g key={p.label}>
          <rect x={p.x} y="32" width={p.w} height="30" rx="6" className={s.dgBox} strokeWidth="1.1" />
          <text x={p.x + p.w / 2} y="51" textAnchor="middle" className={s.dgText} style={{ fontSize: 9.5 }}>{p.label}</text>
        </g>
      ))}
      <line x1="330" y1="62" x2="330" y2="88" className={s.dgAcc} strokeWidth="1.2" />
      <rect x="230" y="90" width="200" height="34" rx="8" className={s.dgBoxHi} strokeWidth="1.2" />
      <text x="330" y="111" textAnchor="middle" className={s.dgTextHi} style={{ fontSize: 11.5 }}>model · frozen weights</text>
      <line x1="330" y1="124" x2="330" y2="146" className={s.dgAcc} strokeWidth="1.2" />
      {/* distribution bars */}
      {[
        { t: '“the”', h: 26 },
        { t: '“a”', h: 15 },
        { t: '“its”', h: 8 },
        { t: '…', h: 4 },
      ].map((b, i) => (
        <g key={b.t}>
          <rect x={258 + i * 40} y={178 - b.h} width="22" height={b.h} rx="2" className={i === 0 ? s.dgAccFill : s.dgFaintFill} opacity={i === 0 ? 0.9 : 0.5} />
          <text x={269 + i * 40} y="192" textAnchor="middle" className={s.dgTextS} style={{ fontSize: 8.5 }}>{b.t}</text>
        </g>
      ))}
      <text x="430" y="168" className={s.dgText} style={{ fontSize: 10 }}>a probability for every</text>
      <text x="430" y="182" className={s.dgText} style={{ fontSize: 10 }}>possible next token</text>
    </svg>
  )
}

/** where inference time goes: one parallel prefill, then a token-by-token decode */
export function PrefillDecode() {
  return (
    <svg viewBox="0 0 660 176" role="img" aria-label="Prefill processes the whole prompt in one parallel pass; decode then produces one token at a time, each step reading the KV cache">
      <text x="8" y="20" className={s.dgTextS}>time →</text>
      {/* prefill block */}
      <rect x="8" y="34" width="150" height="34" rx="7" className={s.dgBoxHi} strokeWidth="1.2" />
      <text x="83" y="50" textAnchor="middle" className={s.dgTextHi} style={{ fontSize: 10.5 }}>prefill</text>
      <text x="83" y="63" textAnchor="middle" className={s.dgTextS} style={{ fontSize: 8 }}>whole prompt, one pass</text>
      {/* decode steps */}
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <g key={i}>
          <rect x={178 + i * 62} y="34" width="48" height="34" rx="7" className={s.dgBox} strokeWidth="1.1" />
          <text x={202 + i * 62} y="55" textAnchor="middle" className={s.dgText} style={{ fontSize: 10 }}>t{i + 1}</text>
        </g>
      ))}
      <text x="640" y="55" textAnchor="end" className={s.dgText} style={{ fontSize: 12 }}>…</text>
      {/* annotations */}
      <line x1="8" y1="84" x2="158" y2="84" className={s.dgAcc} strokeWidth="1.1" />
      <text x="8" y="102" className={s.dgText} style={{ fontSize: 10 }}>sets time-to-first-token</text>
      <line x1="178" y1="84" x2="612" y2="84" className={`${s.dgLine} ${s.dgDash}`} strokeWidth="1.1" />
      <text x="178" y="102" className={s.dgText} style={{ fontSize: 10 }}>one token per step · sets tokens-per-second</text>
      <rect x="8" y="118" width="230" height="26" rx="6" className={s.dgBox} strokeWidth="1.1" />
      <text x="123" y="135" textAnchor="middle" className={s.dgText} style={{ fontSize: 9.5 }}>KV cache · attention state</text>
      <text x="252" y="135" className={s.dgTextS} style={{ fontSize: 9 }}>grows with context — and every decode step re-reads it</text>
      <text x="8" y="168" className={s.dgTextAcc}>stream the decode — the user reads t1 while t9 is still being made</text>
    </svg>
  )
}

/** the agent loop — act, observe, decide again, with an exit that you own */
export function AgentLoop() {
  return (
    <svg viewBox="0 0 660 210" role="img" aria-label="The model proposes a tool call, your code executes it, the result is appended to context, and the loop repeats until the model answers or a limit stops it">
      <rect x="60" y="80" width="170" height="44" rx="9" className={s.dgBoxHi} strokeWidth="1.2" />
      <text x="145" y="99" textAnchor="middle" className={s.dgTextHi} style={{ fontSize: 11.5 }}>model</text>
      <text x="145" y="114" textAnchor="middle" className={s.dgTextS} style={{ fontSize: 8.5 }}>reads context, decides</text>

      <rect x="430" y="80" width="170" height="44" rx="9" className={s.dgBox} strokeWidth="1.2" />
      <text x="515" y="99" textAnchor="middle" className={s.dgTextHi} style={{ fontSize: 11.5 }}>your code</text>
      <text x="515" y="114" textAnchor="middle" className={s.dgTextS} style={{ fontSize: 8.5 }}>runs the tool, for real</text>

      {/* top arc: tool call */}
      <path d="M 230 88 C 300 52, 360 52, 430 88" className={s.dgAcc} strokeWidth="1.2" fill="none" />
      <text x="330" y="52" textAnchor="middle" className={s.dgText} style={{ fontSize: 10 }}>tool call · structured, checkable</text>

      {/* bottom arc: result */}
      <path d="M 430 116 C 360 152, 300 152, 230 116" className={s.dgAcc} strokeWidth="1.2" fill="none" />
      <text x="330" y="166" textAnchor="middle" className={s.dgText} style={{ fontSize: 10 }}>result · appended to context</text>

      {/* exit */}
      <line x1="60" y1="102" x2="16" y2="102" className={`${s.dgLine} ${s.dgDash}`} strokeWidth="1.1" />
      <text x="16" y="90" className={s.dgTextAcc} style={{ fontSize: 9 }}>answer</text>

      <text x="330" y="200" textAnchor="middle" className={s.dgTextAcc}>the loop is yours: cap the iterations, gate the dangerous tools, log every step</text>
    </svg>
  )
}
