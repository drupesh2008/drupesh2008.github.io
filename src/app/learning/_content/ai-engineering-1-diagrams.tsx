/**
 * Figures for the AI Engineering pathway, part 1 (ml-basics → context).
 * Drawn with the shared diagram vocabulary so both themes re-ink them.
 */
import { pathwayStyles as s } from '@/components/Pathway/Pathway'

/** two score distributions and the threshold that splits them */
export function ThresholdSlide() {
  const x = (v: number) => 40 + v * 580
  return (
    <svg viewBox="0 0 660 230" role="img" aria-label="Scores for ordinary messages bunch near zero, scores for fraud reports bunch near one, and they overlap in the middle; moving the threshold from 0.5 to 0.2 flags more of both">
      <text x="8" y="18" className={s.dgTextS}>model score for “urgent: possible unauthorised activity”</text>
      {/* ordinary messages */}
      <path d="M 40 172 C 66 30, 140 30, 196 118 S 300 168, 372 172" className={s.dgLine} strokeWidth="1.4" />
      <text x="96" y="52" className={s.dgText} style={{ fontSize: 10 }}>ordinary messages (99%)</text>
      {/* fraud reports, drawn taller than life so the shape is visible */}
      <path d="M 196 172 C 320 160, 410 84, 468 92 S 566 160, 616 172" className={s.dgAcc} strokeWidth="1.6" />
      <text x="440" y="78" className={s.dgTextAcc} style={{ fontSize: 9.5 }}>fraud reports (1%, magnified)</text>
      {/* axis */}
      <line x1="40" y1="172" x2="620" y2="172" className={s.dgLine} strokeWidth="1" />
      {[0, 0.2, 0.5, 1].map((v) => (
        <text key={v} x={x(v)} y="188" textAnchor="middle" className={s.dgTextS} style={{ fontSize: 9 }}>{v}</text>
      ))}
      {/* thresholds */}
      <line x1={x(0.5)} y1="30" x2={x(0.5)} y2="172" className={s.dgAcc} strokeWidth="1.2" />
      <text x={x(0.5) + 6} y="40" className={s.dgText} style={{ fontSize: 10 }}>threshold 0.5</text>
      <line x1={x(0.2)} y1="30" x2={x(0.2)} y2="172" className={`${s.dgLine} ${s.dgDash}`} strokeWidth="1.2" />
      <text x={x(0.2) - 6} y="40" textAnchor="end" className={s.dgText} style={{ fontSize: 10 }}>0.2</text>
      <text x="8" y="212" className={s.dgText} style={{ fontSize: 10 }}>everything right of the line is flagged · lowering it catches more fraud and flags far more ordinary messages</text>
    </svg>
  )
}

/** one candidate split, scored by how much it purifies the node */
export function TreeSplit() {
  return (
    <svg viewBox="0 0 660 230" role="img" aria-label="A node of 1,000 conversations with 180 escalations is split on whether a withdrawal is pending; the two children are purer, lowering weighted Gini impurity from 0.295 to 0.227">
      <rect x="200" y="14" width="260" height="48" rx="8" className={s.dgBoxHi} strokeWidth="1.2" />
      <text x="330" y="34" textAnchor="middle" className={s.dgTextHi} style={{ fontSize: 11.5 }}>1,000 conversations · 180 escalate</text>
      <text x="330" y="52" textAnchor="middle" className={s.dgTextS} style={{ fontSize: 9 }}>gini 0.295</text>

      <line x1="290" y1="62" x2="160" y2="110" className={s.dgAcc} strokeWidth="1.2" />
      <line x1="370" y1="62" x2="500" y2="110" className={s.dgAcc} strokeWidth="1.2" />
      <text x="200" y="88" textAnchor="end" className={s.dgText} style={{ fontSize: 10 }}>withdrawal pending</text>
      <text x="460" y="88" className={s.dgText} style={{ fontSize: 10 }}>no withdrawal pending</text>

      <rect x="40" y="110" width="240" height="48" rx="8" className={s.dgBox} strokeWidth="1.1" />
      <text x="160" y="130" textAnchor="middle" className={s.dgText} style={{ fontSize: 11 }}>200 · 110 escalate (55%)</text>
      <text x="160" y="148" textAnchor="middle" className={s.dgTextS} style={{ fontSize: 9 }}>gini 0.495</text>

      <rect x="380" y="110" width="240" height="48" rx="8" className={s.dgBox} strokeWidth="1.1" />
      <text x="500" y="130" textAnchor="middle" className={s.dgText} style={{ fontSize: 11 }}>800 · 70 escalate (8.75%)</text>
      <text x="500" y="148" textAnchor="middle" className={s.dgTextS} style={{ fontSize: 9 }}>gini 0.160</text>

      <text x="8" y="190" className={s.dgText} style={{ fontSize: 10 }}>weighted after split: 0.2 × 0.495 + 0.8 × 0.160 = 0.227 · drop of 0.068</text>
      <text x="8" y="212" className={s.dgTextAcc} style={{ fontSize: 9.5 }}>the rival split on “market hours” only drops it by 0.009, so the tree asks about withdrawals first</text>
    </svg>
  )
}

/** a two-weight network: values forward on top, gradients backward underneath */
export function TinyNet() {
  const node = (cx: number, label: string, sub: string, hi = false) => (
    <g>
      <circle cx={cx} cy="78" r="26" className={hi ? s.dgBoxHi : s.dgBox} strokeWidth="1.2" />
      <text x={cx} y="76" textAnchor="middle" className={s.dgTextHi} style={{ fontSize: 12 }}>{label}</text>
      <text x={cx} y="91" textAnchor="middle" className={s.dgTextS} style={{ fontSize: 8.5 }}>{sub}</text>
    </g>
  )
  return (
    <svg viewBox="0 0 660 200" role="img" aria-label="Input x equals 1 feeds a ReLU hidden unit through weight 0.5, which feeds a sigmoid output through weight 1.0, giving probability 0.622; gradients flow back as minus 0.378 at the output, minus 0.189 for w2 and minus 0.378 for w1">
      <text x="8" y="18" className={s.dgTextS}>forward: values · backward: gradients of the loss</text>
      {node(70, 'x', '= 1')}
      {node(270, 'h', 'relu · 0.5')}
      {node(470, 'p', 'σ(0.5) = 0.622', true)}
      <rect x="560" y="60" width="90" height="36" rx="7" className={s.dgBox} strokeWidth="1.1" />
      <text x="605" y="76" textAnchor="middle" className={s.dgText} style={{ fontSize: 10 }}>loss 0.474</text>
      <text x="605" y="89" textAnchor="middle" className={s.dgTextS} style={{ fontSize: 8 }}>label y = 1</text>

      <line x1="96" y1="78" x2="244" y2="78" className={s.dgLine} strokeWidth="1.2" />
      <line x1="296" y1="78" x2="444" y2="78" className={s.dgLine} strokeWidth="1.2" />
      <line x1="496" y1="78" x2="560" y2="78" className={s.dgLine} strokeWidth="1.2" />
      <text x="170" y="68" textAnchor="middle" className={s.dgText} style={{ fontSize: 10.5 }}>w1 = 0.5</text>
      <text x="370" y="68" textAnchor="middle" className={s.dgText} style={{ fontSize: 10.5 }}>w2 = 1.0</text>

      {/* backward */}
      <path d="M 600 104 C 580 140, 500 140, 480 112" className={`${s.dgAcc} ${s.dgDash}`} strokeWidth="1.1" />
      <text x="540" y="152" textAnchor="middle" className={s.dgTextAcc} style={{ fontSize: 9 }}>∂L/∂z = p − y = −0.378</text>
      <path d="M 450 104 C 420 140, 320 140, 290 112" className={`${s.dgAcc} ${s.dgDash}`} strokeWidth="1.1" />
      <text x="370" y="152" textAnchor="middle" className={s.dgTextAcc} style={{ fontSize: 9 }}>∂L/∂w2 = −0.378 × h = −0.189</text>
      <text x="370" y="166" textAnchor="middle" className={s.dgTextAcc} style={{ fontSize: 9 }}>∂L/∂h = −0.378 × w2 = −0.378</text>
      <path d="M 250 104 C 220 140, 120 140, 90 112" className={`${s.dgAcc} ${s.dgDash}`} strokeWidth="1.1" />
      <text x="170" y="152" textAnchor="middle" className={s.dgTextAcc} style={{ fontSize: 9 }}>∂L/∂w1 = −0.378 × 1 × x = −0.378</text>
      <text x="8" y="192" className={s.dgText} style={{ fontSize: 10 }}>negative gradients mean “increase this weight to lower the loss”</text>
    </svg>
  )
}

/** one attention lookup: the token “it” scores the earlier tokens and takes a weighted mix */
export function AttentionWeights() {
  const toks = ['The', 'exchange', 'rejected', 'my', 'order', 'because', 'it']
  const xs = [40, 118, 214, 300, 366, 452, 560]
  const w: Record<string, number> = { exchange: 0.292, rejected: 0.227, order: 0.481 }
  return (
    <svg viewBox="0 0 660 200" role="img" aria-label="The token it attends to order with weight 0.48, exchange with 0.29 and rejected with 0.23">
      <text x="8" y="18" className={s.dgTextS}>where “it” looks (other weights near zero, left out)</text>
      {toks.map((t, i) => (
        <g key={t}>
          <rect x={xs[i] - 34} y="132" width="68" height="28" rx="6" className={t === 'it' ? s.dgBoxHi : s.dgBox} strokeWidth="1.1" />
          <text x={xs[i]} y="150" textAnchor="middle" className={t === 'it' ? s.dgTextHi : s.dgText} style={{ fontSize: 10.5 }}>{t}</text>
        </g>
      ))}
      {Object.entries(w).map(([t, v]) => {
        const i = toks.indexOf(t)
        const x0 = xs[6]
        const x1 = xs[i]
        const top = 128 - 40 - v * 120
        return (
          <g key={t}>
            <path d={`M ${x0} 130 C ${x0} ${top}, ${x1} ${top}, ${x1} 130`} className={s.dgAcc} strokeWidth={1 + v * 6} fill="none" opacity={0.85} />
            <text x={(x0 + x1) / 2} y={top + 18} textAnchor="middle" className={s.dgText} style={{ fontSize: 10 }}>{v.toFixed(2)}</text>
          </g>
        )
      })}
      <text x="8" y="186" className={s.dgText} style={{ fontSize: 10 }}>output for “it” = 0.48 · v(order) + 0.29 · v(exchange) + 0.23 · v(rejected)</text>
    </svg>
  )
}

/** what one decode step spends its time on, at three batch sizes */
export function DecodeStepBudget() {
  const rows = [
    { b: 'batch 1', kv: 0.26, per: '179 tok/s each', agg: '≈180 total' },
    { b: 'batch 32', kv: 8.4, per: '73 tok/s each', agg: '≈2,340 total' },
    { b: 'batch 64', kv: 16.8, per: '45 tok/s each', agg: '≈2,900 total' },
  ]
  const px = 15 // pixels per millisecond
  const w = 5.33
  return (
    <svg viewBox="0 0 660 200" role="img" aria-label="Each decode step reads the 16 GB of weights once, about 5.3 ms, plus every active conversation's KV cache; at batch 32 the KV read adds 8.4 ms, at batch 64 it adds 16.8 ms">
      <text x="8" y="18" className={s.dgTextS}>one decode step on a ~3 TB/s GPU · 8B model · 6,000-token conversations</text>
      {rows.map((r, i) => {
        const y = 36 + i * 46
        return (
          <g key={r.b}>
            <text x="8" y={y + 17} className={s.dgText} style={{ fontSize: 10.5 }}>{r.b}</text>
            <rect x="74" y={y} width={w * px} height="26" rx="3" className={s.dgAccFill} opacity={0.85} />
            <rect x={74 + w * px} y={y} width={Math.max(r.kv * px, 3)} height="26" rx="3" className={s.dgFaintFill} opacity={0.55} />
            <text x={74 + (w + r.kv) * px + 8} y={y + 12} className={s.dgText} style={{ fontSize: 10 }}>{(w + r.kv).toFixed(1)} ms</text>
            <text x={74 + (w + r.kv) * px + 8} y={y + 25} className={s.dgTextS} style={{ fontSize: 8.5 }}>{r.per} · {r.agg}</text>
          </g>
        )
      })}
      <rect x="74" y="176" width="12" height="10" className={s.dgAccFill} opacity={0.85} />
      <text x="92" y="185" className={s.dgText} style={{ fontSize: 9.5 }}>read the weights once, shared by the batch</text>
      <rect x="350" y="176" width="12" height="10" className={s.dgFaintFill} opacity={0.55} />
      <text x="368" y="185" className={s.dgText} style={{ fontSize: 9.5 }}>read each conversation’s KV cache</text>
    </svg>
  )
}

/** the retrieval path from a customer question to the passages the model reads */
export function RetrievalPipeline() {
  const box = (x: number, y: number, wd: number, title: string, sub: string, hi = false) => (
    <g>
      <rect x={x} y={y} width={wd} height="42" rx="8" className={hi ? s.dgBoxHi : s.dgBox} strokeWidth="1.1" />
      <text x={x + wd / 2} y={y + 18} textAnchor="middle" className={s.dgTextHi} style={{ fontSize: 10.5 }}>{title}</text>
      <text x={x + wd / 2} y={y + 33} textAnchor="middle" className={s.dgTextS} style={{ fontSize: 8 }}>{sub}</text>
    </g>
  )
  return (
    <svg viewBox="0 0 660 220" role="img" aria-label="The question is rewritten into a standalone query, searched by keyword and by embedding, the two lists are fused, a reranker keeps five passages, and those are assembled into the prompt under a token budget">
      {box(8, 82, 110, 'question', '+ conversation')}
      {box(140, 82, 100, 'rewrite', 'standalone query')}
      {box(266, 30, 120, 'keyword search', 'bm25 · top 50')}
      {box(266, 134, 120, 'vector search', 'embeddings · top 50')}
      {box(410, 82, 90, 'fuse', 'rrf · ~80 unique')}
      {box(522, 82, 130, 'rerank', 'cross-encoder · keep 5', true)}
      <line x1="118" y1="103" x2="140" y2="103" className={s.dgAcc} strokeWidth="1.2" />
      <line x1="240" y1="96" x2="266" y2="56" className={s.dgAcc} strokeWidth="1.2" />
      <line x1="240" y1="110" x2="266" y2="150" className={s.dgAcc} strokeWidth="1.2" />
      <line x1="386" y1="56" x2="410" y2="96" className={s.dgAcc} strokeWidth="1.2" />
      <line x1="386" y1="150" x2="410" y2="110" className={s.dgAcc} strokeWidth="1.2" />
      <line x1="500" y1="103" x2="522" y2="103" className={s.dgAcc} strokeWidth="1.2" />
      <text x="8" y="206" className={s.dgTextAcc} style={{ fontSize: 9.5 }}>log the ids at every stage: when an answer is wrong, find the stage where the right passage fell out</text>
    </svg>
  )
}
