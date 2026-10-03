/**
 * Figures for the AI & Machine Learning papers — shared diagram vocabulary.
 */
import { pathwayStyles as s } from '@/components/Pathway/Pathway'

const box = (x: number, y: number, w: number, h: number, label: string, hi = false, size = 10) => (
  <g>
    <rect x={x} y={y} width={w} height={h} rx="7" className={hi ? s.dgBoxHi : s.dgBox} strokeWidth="1.1" />
    <text x={x + w / 2} y={y + h / 2 + 4} textAnchor="middle" className={s.dgText} style={{ fontSize: size }}>{label}</text>
  </g>
)
const arrow = (x1: number, y: number, x2: number) => <line x1={x1} y1={y} x2={x2} y2={y} className={s.dgLine} strokeWidth="1" />

/** hand-designed features versus learned ones */
export function HandVsLearned() {
  return (
    <svg viewBox="0 0 660 190" role="img" aria-label="Before: image to hand-designed features to a classifier. After: image to a network that learns its own features">
      <text x="20" y="24" className={s.dgTextS}>before 2012</text>
      {box(20, 36, 70, 36, 'image')}{arrow(90, 54, 110)}
      {box(110, 36, 150, 36, 'SIFT / HOG features')}{arrow(260, 54, 280)}
      {box(280, 36, 120, 36, 'encode, pool')}{arrow(400, 54, 420)}
      {box(420, 36, 100, 36, 'SVM')}{arrow(520, 54, 540)}
      {box(540, 36, 100, 36, '“cat” 74%')}
      <text x="185" y="88" textAnchor="middle" className={s.dgText} style={{ fontSize: 9 }}>designed by people, fixed</text>
      <text x="20" y="124" className={s.dgTextS}>AlexNet</text>
      {box(20, 136, 70, 36, 'image')}{arrow(90, 154, 110)}
      {box(110, 136, 410, 36, '5 convolutional layers + 3 fully connected · 60 million weights, all learned from the pixels', true, 9.5)}
      {arrow(520, 154, 540)}
      {box(540, 136, 100, 36, '“cat” 84%')}
    </svg>
  )
}

/** the eight layers, and the split across two GPUs */
export function ConvNetStack() {
  const layer = (x: number, w: number, h: number, label: string, hi = false) => (
    <g>
      <rect x={x} y={100 - h / 2} width={w} height={h} rx="4" className={hi ? s.dgBoxHi : s.dgBox} strokeWidth="1" />
      <text x={x + w / 2} y="172" textAnchor="middle" className={s.dgTextS} style={{ fontSize: 8 }}>{label}</text>
    </g>
  )
  return (
    <svg viewBox="0 0 660 190" role="img" aria-label="Input image, five convolutional layers of decreasing size, then three fully connected layers and a thousand-way softmax">
      {layer(16, 40, 120, '224×224×3')}
      {layer(76, 36, 100, 'conv 11×11', true)}
      {layer(132, 32, 80, 'conv 5×5', true)}
      {layer(184, 28, 60, 'conv 3×3', true)}
      {layer(232, 28, 60, 'conv 3×3', true)}
      {layer(280, 28, 60, 'conv 3×3', true)}
      {layer(340, 18, 110, 'fc 4096')}
      {layer(378, 18, 110, 'fc 4096')}
      {layer(416, 18, 70, 'softmax 1000')}
      <line x1="16" x2="500" y1="100" y2="100" className={`${s.dgLine} ${s.dgDash}`} strokeWidth="0.8" />
      <text x="520" y="86" className={s.dgText} style={{ fontSize: 9.5 }}>top half: GPU 1</text>
      <text x="520" y="118" className={s.dgText} style={{ fontSize: 9.5 }}>bottom half: GPU 2</text>
      <text x="520" y="138" className={s.dgTextS} style={{ fontSize: 8.5 }}>3 GB each; they talk at two layers</text>
      <text x="330" y="24" textAnchor="middle" className={s.dgTextS}>early layers see edges and colours; later layers see parts and objects</text>
    </svg>
  )
}

/** a one-hot vector versus a dense one */
export function OneHotVsDense() {
  return (
    <svg viewBox="0 0 660 170" role="img" aria-label="A one-hot vector with one 1 among tens of thousands of zeros, versus a dense 300-dimensional vector of small numbers">
      <text x="20" y="24" className={s.dgTextS}>one-hot · “queen” = position 21,407 of 50,000</text>
      {Array.from({ length: 36 }, (_, i) => (
        <rect key={i} x={20 + i * 17} y="34" width="14" height="14" rx="2" className={i === 17 ? s.dgAccFill : s.dgBox} strokeWidth="0.8" />
      ))}
      <text x="20" y="66" className={s.dgText} style={{ fontSize: 9.5 }}>every word is equally far from every other; “queen” and “king” share nothing</text>
      <text x="20" y="106" className={s.dgTextS}>dense · “queen” = 300 numbers</text>
      {[0.3, -0.8, 0.1, 0.9, -0.2, 0.6, -0.5, 0.7, 0.2, -0.9, 0.4, -0.1].map((v, i) => (
        <g key={i}>
          <rect x={20 + i * 40} y="116" width="34" height="18" rx="3" className={s.dgBoxHi} strokeWidth="0.8" fill="var(--accent)" fillOpacity={0.15 + Math.abs(v) * 0.5} />
          <text x={37 + i * 40} y="129" textAnchor="middle" className={s.dgText} style={{ fontSize: 8.5 }}>{v.toFixed(1)}</text>
        </g>
      ))}
      <text x="510" y="129" className={s.dgTextS} style={{ fontSize: 9 }}>… 288 more</text>
      <text x="20" y="156" className={s.dgTextAcc} style={{ fontSize: 9.5 }}>“king” is nearby; the direction from “king” to “queen” is the direction from “man” to “woman”</text>
    </svg>
  )
}

/** skip-gram: from one word, predict its neighbours */
export function SkipGram() {
  return (
    <svg viewBox="0 0 660 190" role="img" aria-label="The centre word maps through a lookup table to a vector, which is used to predict each context word">
      {box(20, 76, 110, 38, 'input: “fox”', true)}
      <line x1="130" y1="95" x2="200" y2="95" className={s.dgLine} strokeWidth="1" />
      {box(200, 70, 160, 50, 'lookup row of a 50,000 × 300 table', false, 9)}
      <text x="280" y="138" textAnchor="middle" className={s.dgTextAcc} style={{ fontSize: 9 }}>this row becomes the word’s vector</text>
      {['quick', 'brown', 'jumps', 'over'].map((w, i) => (
        <g key={w}>
          <line x1="360" y1="95" x2="440" y2={28 + i * 44} className={s.dgLine} strokeWidth="1" />
          {box(440, 14 + i * 44, 150, 28, `predict “${w}”`, false, 9.5)}
        </g>
      ))}
      <text x="330" y="180" textAnchor="middle" className={s.dgTextS}>no hidden layer, no nonlinearity: cheap enough to train on a billion words in a day</text>
    </svg>
  )
}

/** scaled dot-product attention as a data flow */
export function QKVFlow() {
  return (
    <svg viewBox="0 0 660 210" role="img" aria-label="Each token's vector is projected to a query, a key and a value; queries are compared with every key, softmaxed, and used to weight the values">
      {box(20, 90, 100, 32, 'token vectors', true)}
      {['query = xWq', 'key = xWk', 'value = xWv'].map((l, i) => (
        <g key={l}>
          <line x1="120" y1="106" x2="180" y2={38 + i * 60} className={s.dgLine} strokeWidth="1" />
          {box(180, 22 + i * 60, 110, 32, l, false, 9.5)}
        </g>
      ))}
      <line x1="290" y1="38" x2="350" y2="60" className={s.dgLine} strokeWidth="1" />
      <line x1="290" y1="98" x2="350" y2="76" className={s.dgLine} strokeWidth="1" />
      {box(350, 52, 130, 32, 'scores = QKᵀ / √d', true, 9.5)}
      <line x1="415" y1="84" x2="415" y2="110" className={s.dgLine} strokeWidth="1" />
      {box(350, 110, 130, 32, 'softmax → weights', false, 9.5)}
      <line x1="290" y1="158" x2="350" y2="172" className={s.dgLine} strokeWidth="1" />
      <line x1="415" y1="142" x2="415" y2="166" className={s.dgLine} strokeWidth="1" />
      {box(350, 166, 130, 32, 'weights × V', true, 9.5)}
      <line x1="480" y1="182" x2="530" y2="182" className={s.dgLine} strokeWidth="1" />
      {box(530, 166, 110, 32, 'new token vectors', false, 9.5)}
      <text x="560" y="40" className={s.dgTextS} style={{ fontSize: 8.5 }}>× 8 heads in parallel,</text>
      <text x="560" y="54" className={s.dgTextS} style={{ fontSize: 8.5 }}>each with its own W</text>
    </svg>
  )
}

/** the whole model: stacks of identical blocks */
export function TransformerBlocks() {
  const block = (x: number, y: number, label: string, hi = false) => (
    <g>
      <rect x={x} y={y} width="190" height="26" rx="5" className={hi ? s.dgBoxHi : s.dgBox} strokeWidth="1" />
      <text x={x + 95} y={y + 17} textAnchor="middle" className={s.dgText} style={{ fontSize: 9.5 }}>{label}</text>
    </g>
  )
  return (
    <svg viewBox="0 0 660 230" role="img" aria-label="Encoder stack of self-attention and feed-forward blocks; decoder stack adds masked self-attention and attention over the encoder output">
      <text x="135" y="20" textAnchor="middle" className={s.dgTextS}>encoder · ×6</text>
      {block(40, 30, 'input embedding + position')}
      {block(40, 66, 'multi-head self-attention', true)}
      {block(40, 102, 'add & norm')}
      {block(40, 138, 'feed-forward (per token)', true)}
      {block(40, 174, 'add & norm')}
      <text x="445" y="20" textAnchor="middle" className={s.dgTextS}>decoder · ×6</text>
      {block(350, 30, 'output so far + position')}
      {block(350, 66, 'masked self-attention', true)}
      {block(350, 102, 'attention over encoder output', true)}
      {block(350, 138, 'feed-forward')}
      {block(350, 174, 'next-token probabilities')}
      <line x1="230" y1="190" x2="350" y2="115" className={`${s.dgLine} ${s.dgDash}`} strokeWidth="1" />
      <text x="330" y="220" textAnchor="middle" className={s.dgTextS}>GPT keeps only the decoder stack; BERT keeps only the encoder</text>
    </svg>
  )
}

/** fine-tune per task versus prompt one model */
export function PretrainThenPrompt() {
  return (
    <svg viewBox="0 0 660 200" role="img" aria-label="Before: a pretrained model copied and fine-tuned separately for each task. GPT-3: one frozen model, a different prompt per task">
      <text x="20" y="24" className={s.dgTextS}>2018–2019 · fine-tuning</text>
      {box(20, 36, 110, 36, 'pretrained model')}
      {['translate', 'sentiment', 'Q&A'].map((t, i) => (
        <g key={t}>
          <line x1="130" y1="54" x2="190" y2={44 + i * 40} className={s.dgLine} strokeWidth="1" />
          {box(190, 30 + i * 40, 110, 28, `fine-tune: ${t}`, false, 9)}
          <text x="310" y={48 + i * 40} className={s.dgText} style={{ fontSize: 8.5 }}>thousands of labelled examples, a new copy of the weights</text>
        </g>
      ))}
      <text x="20" y="156" className={s.dgTextS}>GPT-3 · prompting</text>
      {box(20, 164, 150, 30, 'one frozen model · 175B', true)}
      {['translate', 'sentiment', 'Q&A'].map((t, i) => (
        <g key={t}>
          <line x1="170" y1="179" x2="230" y2="179" className={s.dgLine} strokeWidth="1" />
          {box(230 + i * 140, 164, 130, 30, `prompt: ${t}`, false, 9)}
        </g>
      ))}
    </svg>
  )
}

/** the paper's headline shape: few-shot gains grow with model size */
export function InContextCurve() {
  const pts = (k: [number, number][]) => k.map(([x, y]) => `${60 + x * 100},${170 - y * 1.3}`).join(' ')
  return (
    <svg viewBox="0 0 660 200" role="img" aria-label="Schematic: accuracy rises with model size for zero-, one- and few-shot prompting, and the gap between them widens">
      <line x1="60" x2="620" y1="170" y2="170" className={s.dgLine} strokeWidth="1" />
      <line x1="60" x2="60" y1="20" y2="170" className={s.dgLine} strokeWidth="1" />
      {['0.1B', '1B', '10B', '175B'].map((l, i) => <text key={l} x={60 + i * 160 + 60} y="186" textAnchor="middle" className={s.dgText} style={{ fontSize: 9 }}>{l}</text>)}
      <text x="24" y="100" className={s.dgTextS} style={{ fontSize: 8 }}>accuracy</text>
      <polyline points={pts([[0.6, 10], [2.2, 24], [3.8, 44], [5.4, 72]])} fill="none" stroke="var(--accent)" strokeWidth="1.8" />
      <polyline points={pts([[0.6, 8], [2.2, 18], [3.8, 34], [5.4, 58]])} fill="none" stroke="var(--chalk)" strokeWidth="1.4" strokeDasharray="5 4" />
      <polyline points={pts([[0.6, 6], [2.2, 12], [3.8, 24], [5.4, 44]])} fill="none" stroke="var(--faint)" strokeWidth="1.4" strokeDasharray="2 4" />
      <text x="612" y="72" textAnchor="end" className={s.dgTextAcc} style={{ fontSize: 9 }}>few-shot</text>
      <text x="612" y="94" textAnchor="end" className={s.dgTextHi} style={{ fontSize: 9 }}>one-shot</text>
      <text x="612" y="114" textAnchor="end" className={s.dgTextS} style={{ fontSize: 9 }}>zero-shot</text>
      <text x="330" y="22" textAnchor="middle" className={s.dgTextS}>schematic of the paper’s aggregate result, not a plot of its numbers</text>
    </svg>
  )
}

/** three straight lines on log-log axes */
export function PowerLawLines() {
  const panel = (x: number, label: string, slope: string) => (
    <g>
      <line x1={x} x2={x + 180} y1="140" y2="140" className={s.dgLine} strokeWidth="1" />
      <line x1={x} x2={x} y1="30" y2="140" className={s.dgLine} strokeWidth="1" />
      <line x1={x + 10} y1="48" x2={x + 170} y2="118" className={s.dgAcc} strokeWidth="1.8" />
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => <circle key={i} cx={x + 14 + i * 22} cy={50 + i * 9.6 + (i % 2 ? 2 : -2)} r="2.5" className={s.dgInkFill} />)}
      <text x={x + 90} y="158" textAnchor="middle" className={s.dgTextS}>{label}</text>
      <text x={x + 90} y="22" textAnchor="middle" className={s.dgTextAcc} style={{ fontSize: 9 }}>{slope}</text>
    </g>
  )
  return (
    <svg viewBox="0 0 660 180" role="img" aria-label="Loss against parameters, data and compute, each a straight line on log-log axes">
      {panel(30, 'parameters (log)', 'L ∝ N^−0.076')}
      {panel(240, 'dataset tokens (log)', 'L ∝ D^−0.095')}
      {panel(450, 'compute (log)', 'L ∝ C^−0.050')}
      <text x="330" y="176" textAnchor="middle" className={s.dgText} style={{ fontSize: 9.5 }}>loss, log scale on the vertical axis · straight means a power law · the lines held over seven orders of magnitude</text>
    </svg>
  )
}

/** same compute, two ways to spend it */
export function ChinchillaShift() {
  const bar = (x: number, y: number, w: number, label: string, hi: boolean) => (
    <g>
      <rect x={x} y={y} width={w} height="22" rx="4" className={hi ? s.dgBoxHi : s.dgBox} strokeWidth="1" fill={hi ? 'var(--accent)' : undefined} fillOpacity={hi ? 0.25 : undefined} />
      <text x={x + 8} y={y + 15} className={s.dgText} style={{ fontSize: 9.5 }}>{label}</text>
    </g>
  )
  return (
    <svg viewBox="0 0 660 170" role="img" aria-label="For the same compute, Kaplan's recipe gives a 280-billion parameter model on 300 billion tokens; Chinchilla's gives 70 billion parameters on 1.4 trillion tokens, and the smaller one wins">
      <text x="20" y="24" className={s.dgTextS}>same compute budget · 2020 recipe (Gopher)</text>
      {bar(20, 34, 380, 'parameters: 280 B', false)}
      {bar(20, 62, 120, 'tokens: 300 B', false)}
      <text x="20" y="112" className={s.dgTextS}>same compute budget · 2022 recipe (Chinchilla)</text>
      {bar(20, 122, 100, 'parameters: 70 B', true)}
      {bar(20, 150, 560, 'tokens: 1.4 T', true)}
      <text x="640" y="48" textAnchor="end" className={s.dgTextAcc} style={{ fontSize: 9.5 }}>the 70 B model scored higher on nearly every benchmark</text>
      <text x="640" y="66" textAnchor="end" className={s.dgText} style={{ fontSize: 9.5 }}>and costs a quarter as much to run</text>
    </svg>
  )
}
