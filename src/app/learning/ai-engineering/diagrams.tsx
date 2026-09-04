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
