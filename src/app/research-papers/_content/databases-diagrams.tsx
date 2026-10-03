/**
 * Figures for the Databases & Storage papers — shared diagram vocabulary,
 * so both theme exposures re-ink them.
 */
import { pathwayStyles as s } from '@/components/Pathway/Pathway'

/** 1969: data as records chained by physical pointers, read by navigating */
export function PointerChase() {
  const rec = (x: number, y: number, label: string, hi = false) => (
    <g>
      <rect x={x} y={y} width="110" height="30" rx="6" className={hi ? s.dgBoxHi : s.dgBox} strokeWidth="1.1" />
      <text x={x + 55} y={y + 19} textAnchor="middle" className={s.dgText} style={{ fontSize: 10.5 }}>{label}</text>
    </g>
  )
  return (
    <svg viewBox="0 0 660 200" role="img" aria-label="A department record pointing to a chain of employee records; a program must follow the pointers in order">
      {rec(20, 80, 'dept: ENG', true)}
      {rec(190, 30, 'emp: Asha')}{rec(190, 80, 'emp: Ben')}{rec(190, 130, 'emp: Eli')}
      <line x1="130" y1="95" x2="190" y2="45" className={s.dgAcc} strokeWidth="1.1" />
      <line x1="300" y1="45" x2="340" y2="45" className={s.dgLine} strokeWidth="1" />
      <path d="M340 45 C 370 45, 370 95, 300 95" className={s.dgLine} strokeWidth="1" fill="none" />
      <path d="M300 95 C 370 95, 370 145, 300 145" className={s.dgLine} strokeWidth="1" fill="none" />
      {rec(430, 80, 'project: Atlas')}
      <line x1="300" y1="95" x2="430" y2="95" className={`${s.dgLine} ${s.dgDash}`} strokeWidth="1" />
      <text x="330" y="190" textAnchor="middle" className={s.dgTextAcc}>“find Eli’s salary” = start at the department, follow next-pointers until the name matches</text>
      <text x="330" y="18" textAnchor="middle" className={s.dgTextS}>the program knows the pointers; change the layout and the program breaks</text>
    </svg>
  )
}

/** the same data as two tables related by a value */
export function JoinByValue() {
  const table = (x: number, title: string, head: string[], rows: string[][], hiCol: number) => (
    <g>
      <text x={x} y="24" className={s.dgTextS}>{title}</text>
      {head.map((h, i) => <text key={h} x={x + i * 70} y="46" className={s.dgTextAcc} style={{ fontSize: 9 }}>{h}</text>)}
      <line x1={x} x2={x + head.length * 70 - 10} y1="52" y2="52" className={s.dgLine} strokeWidth="1" />
      {rows.map((r, ri) => r.map((c, ci) => (
        <text key={`${ri}${ci}`} x={x + ci * 70} y={72 + ri * 22} className={ci === hiCol ? s.dgTextHi : s.dgText} style={{ fontSize: 10.5 }}>{c}</text>
      )))}
    </g>
  )
  return (
    <svg viewBox="0 0 660 190" role="img" aria-label="An employees table and a departments table share the dept column; rows are matched by equal values, not by pointers">
      {table(20, 'employees', ['name', 'dept', 'salary'], [['Asha', 'ENG', '92'], ['Ben', 'ENG', '71'], ['Chen', 'OPS', '58'], ['Dara', 'SALES', '64']], 1)}
      {table(380, 'departments', ['dept', 'name', 'floor'], [['ENG', 'Engineering', '4'], ['OPS', 'Operations', '2'], ['SALES', 'Sales', '1']], 0)}
      <path d="M190 68 C 290 68, 290 68, 378 68" className={`${s.dgAcc} ${s.dgDash}`} strokeWidth="1.1" fill="none" />
      <text x="330" y="176" textAnchor="middle" className={s.dgTextAcc}>join on dept = dept · the database decides how to find the match; the query just says what</text>
    </svg>
  )
}

/** the write-ahead rule and the force-at-commit rule */
export function WalRule() {
  return (
    <svg viewBox="0 0 660 210" role="img" aria-label="Transactions write to pages in a buffer pool and to a log; the log reaches disk before the page, and before commit is acknowledged">
      <rect x="20" y="30" width="200" height="150" rx="10" className={s.dgBox} strokeWidth="1.1" />
      <text x="120" y="52" textAnchor="middle" className={s.dgTextS}>memory · buffer pool</text>
      {['page A · dirty', 'page B · dirty', 'page C · clean'].map((p, i) => (
        <g key={p}>
          <rect x="40" y={66 + i * 34} width="160" height="26" rx="5" className={i < 2 ? s.dgBoxHi : s.dgBox} strokeWidth="1" />
          <text x="120" y={83 + i * 34} textAnchor="middle" className={s.dgText} style={{ fontSize: 10 }}>{p}</text>
        </g>
      ))}
      <rect x="440" y="30" width="200" height="150" rx="10" className={s.dgBox} strokeWidth="1.1" />
      <text x="540" y="52" textAnchor="middle" className={s.dgTextS}>disk</text>
      <rect x="460" y="66" width="160" height="26" rx="5" className={s.dgBox} strokeWidth="1" />
      <text x="540" y="83" textAnchor="middle" className={s.dgText} style={{ fontSize: 10 }}>data pages</text>
      <rect x="460" y="112" width="160" height="50" rx="5" className={s.dgBoxHi} strokeWidth="1.2" />
      <text x="540" y="132" textAnchor="middle" className={s.dgTextHi} style={{ fontSize: 10.5 }}>the log · append-only</text>
      <text x="540" y="150" textAnchor="middle" className={s.dgTextAcc} style={{ fontSize: 9 }}>LSN 1, 2, 3, 4 …</text>
      <line x1="220" y1="140" x2="460" y2="140" className={s.dgAcc} strokeWidth="1.3" />
      <text x="340" y="132" textAnchor="middle" className={s.dgTextAcc} style={{ fontSize: 9.5 }}>① log record first, sequentially</text>
      <line x1="220" y1="79" x2="460" y2="79" className={`${s.dgLine} ${s.dgDash}`} strokeWidth="1.1" />
      <text x="340" y="71" textAnchor="middle" className={s.dgText} style={{ fontSize: 9.5 }}>② page later, whenever convenient</text>
      <text x="330" y="202" textAnchor="middle" className={s.dgTextS}>commit = the log is on disk up to the commit record; no data page needs to be</text>
    </svg>
  )
}

/** the three passes over the log after a crash */
export function RecoveryPasses() {
  const pass = (y: number, label: string, from: number, to: number, dir: string, hi = false) => (
    <g>
      <text x="10" y={y + 4} className={s.dgTextS}>{label}</text>
      <line x1={from} x2={to} y1={y} y2={y} className={hi ? s.dgAcc : s.dgLine} strokeWidth="1.4" />
      <text x={(from + to) / 2} y={y - 8} textAnchor="middle" className={hi ? s.dgTextAcc : s.dgText} style={{ fontSize: 9.5 }}>{dir}</text>
    </g>
  )
  return (
    <svg viewBox="0 0 660 190" role="img" aria-label="Analysis scans forward from the checkpoint, redo scans forward from the earliest dirty page, undo scans backward through the losers">
      <line x1="140" x2="620" y1="40" y2="40" className={s.dgLine} strokeWidth="1" />
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => <rect key={i} x={146 + i * 58} y="30" width="46" height="20" rx="4" className={i === 2 ? s.dgBoxHi : s.dgBox} strokeWidth="1" />)}
      <text x="169" y="26" textAnchor="middle" className={s.dgTextS} style={{ fontSize: 8 }}>old</text>
      <text x="285" y="26" textAnchor="middle" className={s.dgTextAcc} style={{ fontSize: 8 }}>checkpoint</text>
      <text x="575" y="26" textAnchor="middle" className={s.dgTextS} style={{ fontSize: 8 }}>crash →</text>
      {pass(90, 'analysis', 262, 600, 'forward: which transactions were live, which pages dirty')}
      {pass(125, 'redo', 200, 600, 'forward: repeat every logged change the disk lacks, losers included', true)}
      {pass(160, 'undo', 600, 230, '← backward: roll back the losers, logging each step as a CLR')}
    </svg>
  )
}

/** memtable, runs, levels, compaction */
export function LsmLevels() {
  const run = (x: number, y: number, w: number, label: string, hi = false) => (
    <g>
      <rect x={x} y={y} width={w} height="24" rx="5" className={hi ? s.dgBoxHi : s.dgBox} strokeWidth="1.1" />
      <text x={x + w / 2} y={y + 16} textAnchor="middle" className={s.dgText} style={{ fontSize: 9.5 }}>{label}</text>
    </g>
  )
  return (
    <svg viewBox="0 0 660 210" role="img" aria-label="Writes enter a memtable, are flushed as sorted runs to level 0, and are merged down into larger levels">
      <text x="20" y="30" className={s.dgTextS}>memory</text>
      {run(110, 14, 120, 'memtable (sorted)', true)}
      <text x="250" y="30" className={s.dgTextAcc} style={{ fontSize: 9.5 }}>← every write lands here, sequentially logged</text>
      <line x1="170" y1="38" x2="170" y2="62" className={s.dgAcc} strokeWidth="1.2" />
      <text x="180" y="56" className={s.dgTextAcc} style={{ fontSize: 9 }}>flush</text>
      <text x="20" y="80" className={s.dgTextS}>level 0</text>
      {run(110, 64, 60, 'run')}{run(180, 64, 60, 'run')}{run(250, 64, 60, 'run')}
      <line x1="200" y1="88" x2="200" y2="112" className={s.dgLine} strokeWidth="1.1" />
      <text x="210" y="106" className={s.dgText} style={{ fontSize: 9 }}>compaction: merge, drop overwritten versions</text>
      <text x="20" y="130" className={s.dgTextS}>level 1</text>
      {run(110, 114, 240, 'one sorted run · ~10× larger')}
      <line x1="230" y1="138" x2="230" y2="162" className={s.dgLine} strokeWidth="1.1" />
      <text x="20" y="180" className={s.dgTextS}>level 2</text>
      {run(110, 164, 500, 'one sorted run · ~100× larger · most of the data lives here')}
      <text x="640" y="80" textAnchor="end" className={s.dgText} style={{ fontSize: 9.5 }}>a read checks memtable, then each level</text>
      <text x="640" y="96" textAnchor="end" className={s.dgText} style={{ fontSize: 9.5 }}>a Bloom filter per run skips most of them</text>
    </svg>
  )
}

/** random writes into a B-tree versus sequential appends */
export function WriteVsAppend() {
  return (
    <svg viewBox="0 0 660 170" role="img" aria-label="Updating a B-tree in place scatters writes across the disk; a log-structured store appends them in order">
      <text x="160" y="24" textAnchor="middle" className={s.dgTextS}>update in place (B-tree)</text>
      <rect x="20" y="40" width="280" height="24" rx="4" className={s.dgBox} strokeWidth="1" />
      {[34, 112, 190, 61, 250, 143, 275].map((x, i) => (
        <g key={i}>
          <rect x={x} y="42" width="10" height="20" className={s.dgAccFill} opacity="0.8" />
          <line x1={x + 5} y1="42" x2={160 - (160 - x - 5) * 0.2} y2="90" className={`${s.dgLine} ${s.dgDash}`} strokeWidth="0.8" />
        </g>
      ))}
      <text x="160" y="110" textAnchor="middle" className={s.dgText} style={{ fontSize: 10 }}>7 writes → 7 seeks</text>
      <text x="160" y="126" textAnchor="middle" className={s.dgText} style={{ fontSize: 10 }}>the disk arm does the work</text>
      <text x="500" y="24" textAnchor="middle" className={s.dgTextS}>append (LSM)</text>
      <rect x="360" y="40" width="280" height="24" rx="4" className={s.dgBox} strokeWidth="1" />
      {[0, 1, 2, 3, 4, 5, 6].map((i) => <rect key={i} x={364 + i * 12} y="42" width="10" height="20" className={s.dgAccFill} opacity="0.8" />)}
      <text x="500" y="110" textAnchor="middle" className={s.dgTextAcc} style={{ fontSize: 10 }}>7 writes → 1 sequential burst</text>
      <text x="500" y="126" textAnchor="middle" className={s.dgText} style={{ fontSize: 10 }}>sorting is deferred to a background merge</text>
      <text x="330" y="160" textAnchor="middle" className={s.dgTextS}>in 1996 a seek cost ~10 ms; sequential transfer of the same bytes, microseconds</text>
    </svg>
  )
}

/** Bigtable's data model: a sorted map keyed by row, column, timestamp */
export function BigtableModel() {
  return (
    <svg viewBox="0 0 660 210" role="img" aria-label="Rows sorted by key, column families, and timestamped versions in each cell">
      <text x="20" y="26" className={s.dgTextS}>row key (sorted)</text>
      <text x="250" y="26" className={s.dgTextS}>family: contents</text>
      <text x="440" y="26" className={s.dgTextS}>family: anchor</text>
      {['com.cnn.www', 'com.cnn.www/world', 'org.wikipedia.en/wiki/Bigtable'].map((k, i) => (
        <g key={k}>
          <rect x="20" y={40 + i * 50} width="210" height="40" rx="6" className={i === 0 ? s.dgBoxHi : s.dgBox} strokeWidth="1" />
          <text x="30" y={64 + i * 50} className={s.dgTextHi} style={{ fontSize: 10.5 }}>{k}</text>
          <rect x="250" y={40 + i * 50} width="170" height="40" rx="6" className={s.dgBox} strokeWidth="1" />
          <rect x="440" y={40 + i * 50} width="200" height="40" rx="6" className={s.dgBox} strokeWidth="1" />
        </g>
      ))}
      <text x="258" y="56" className={s.dgText} style={{ fontSize: 9 }}>contents: · t6 “&lt;html&gt;…”</text>
      <text x="258" y="70" className={s.dgText} style={{ fontSize: 9 }}>contents: · t5, t3 (older versions)</text>
      <text x="448" y="56" className={s.dgText} style={{ fontSize: 9 }}>anchor:cnnsi.com · t9 “CNN”</text>
      <text x="448" y="70" className={s.dgText} style={{ fontSize: 9 }}>anchor:my.look.ca · t8 “CNN.com”</text>
      <text x="330" y="200" textAnchor="middle" className={s.dgTextAcc}>(row, column, timestamp) → bytes · columns are created by writing to them · rows with nearby keys share a tablet</text>
    </svg>
  )
}

/** master, tablet servers, Chubby and GFS */
export function TabletServing() {
  const box = (x: number, y: number, w: number, h: number, label: string, hi = false) => (
    <g>
      <rect x={x} y={y} width={w} height={h} rx="8" className={hi ? s.dgBoxHi : s.dgBox} strokeWidth="1.1" />
      <text x={x + w / 2} y={y + h / 2 + 4} textAnchor="middle" className={s.dgText} style={{ fontSize: 10.5 }}>{label}</text>
    </g>
  )
  return (
    <svg viewBox="0 0 660 220" role="img" aria-label="Clients talk to tablet servers; the master assigns tablets; Chubby holds locks and the root location; GFS stores the SSTables and logs">
      {box(20, 20, 110, 36, 'client')}
      {box(20, 100, 110, 36, 'Chubby', true)}
      <text x="75" y="156" textAnchor="middle" className={s.dgTextS} style={{ fontSize: 8.5 }}>locks · root tablet</text>
      {box(270, 20, 120, 36, 'master')}
      <text x="330" y="74" textAnchor="middle" className={s.dgTextS} style={{ fontSize: 8.5 }}>assigns tablets, balances</text>
      {[0, 1, 2].map((i) => box(200 + i * 150, 100, 130, 52, `tablet server ${i + 1}`, true))}
      {box(200, 180, 430, 30, 'GFS · SSTables and commit logs, replicated')}
      <line x1="130" y1="38" x2="270" y2="38" className={`${s.dgLine} ${s.dgDash}`} strokeWidth="1" />
      <text x="200" y="32" textAnchor="middle" className={s.dgText} style={{ fontSize: 8.5 }}>rarely</text>
      <line x1="75" y1="56" x2="75" y2="100" className={s.dgLine} strokeWidth="1" />
      <line x1="130" y1="46" x2="200" y2="118" className={s.dgAcc} strokeWidth="1.3" />
      <text x="145" y="86" className={s.dgTextAcc} style={{ fontSize: 9 }}>reads, writes</text>
      {[0, 1, 2].map((i) => <line key={i} x1={265 + i * 150} y1="152" x2={265 + i * 150} y2="180" className={s.dgLine} strokeWidth="1" />)}
      <line x1="330" y1="56" x2="330" y2="100" className={s.dgLine} strokeWidth="1" />
    </svg>
  )
}

/** point-to-point pipelines versus one log in the middle */
export function BeforeKafka() {
  const src = ['web', 'search', 'ads', 'mobile']
  const dst = ['hadoop', 'metrics', 'security', 'feed']
  return (
    <svg viewBox="0 0 660 200" role="img" aria-label="Four producers connected to four consumers pairwise, versus the same systems connected through one shared log">
      {src.map((n, i) => <text key={n} x="20" y={34 + i * 40} className={s.dgTextS}>{n}</text>)}
      {dst.map((n, i) => <text key={n} x="250" y={34 + i * 40} className={s.dgTextS}>{n}</text>)}
      {src.map((_, i) => dst.map((__, j) => (
        <line key={`${i}${j}`} x1="70" y1={30 + i * 40} x2="245" y2={30 + j * 40} className={s.dgLine} strokeWidth="0.7" opacity="0.7" />
      )))}
      <text x="160" y="190" textAnchor="middle" className={s.dgText} style={{ fontSize: 10 }}>N × M pipelines, each its own format and failure mode</text>
      {src.map((n, i) => <text key={n} x="380" y={34 + i * 40} className={s.dgTextS}>{n}</text>)}
      {dst.map((n, i) => <text key={n} x="610" y={34 + i * 40} className={s.dgTextS}>{n}</text>)}
      <rect x="470" y="20" width="80" height="150" rx="8" className={s.dgBoxHi} strokeWidth="1.2" />
      <text x="510" y="100" textAnchor="middle" className={s.dgTextAcc} style={{ fontSize: 10 }}>the log</text>
      {src.map((_, i) => <line key={i} x1="430" y1={30 + i * 40} x2="470" y2={30 + i * 40} className={s.dgAcc} strokeWidth="1" />)}
      {dst.map((_, i) => <line key={i} x1="550" y1={30 + i * 40} x2="605" y2={30 + i * 40} className={s.dgAcc} strokeWidth="1" />)}
      <text x="510" y="190" textAnchor="middle" className={s.dgTextAcc} style={{ fontSize: 10 }}>N + M connections; every consumer reads the same history</text>
    </svg>
  )
}

/** a partitioned log with offsets and two consumer groups */
export function PartitionedLog() {
  const row = (y: number, label: string, n: number, offA: number, offB: number) => (
    <g>
      <text x="10" y={y + 16} className={s.dgTextS}>{label}</text>
      {Array.from({ length: n }, (_, i) => (
        <g key={i}>
          <rect x={90 + i * 46} y={y} width="40" height="24" rx="4" className={s.dgBox} strokeWidth="1" />
          <text x={110 + i * 46} y={y + 16} textAnchor="middle" className={s.dgText} style={{ fontSize: 9.5 }}>{i}</text>
        </g>
      ))}
      <line x1={90 + offA * 46 - 3} x2={90 + offA * 46 - 3} y1={y - 5} y2={y + 29} className={s.dgAcc} strokeWidth="2" />
      <line x1={90 + offB * 46 - 3} x2={90 + offB * 46 - 3} y1={y - 5} y2={y + 29} className={`${s.dgLine}`} strokeWidth="2" />
      <text x={90 + n * 46 + 8} y={y + 16} className={s.dgTextS} style={{ fontSize: 8.5 }}>← appends</text>
    </g>
  )
  return (
    <svg viewBox="0 0 660 170" role="img" aria-label="Three partitions of a topic as numbered logs, with the offsets of two consumer groups marked">
      {row(20, 'partition 0', 9, 7, 3)}
      {row(64, 'partition 1', 8, 8, 2)}
      {row(108, 'partition 2', 10, 6, 5)}
      <text x="10" y="160" className={s.dgTextAcc} style={{ fontSize: 9.5 }}>▌ group “feed” offsets · nearly caught up</text>
      <text x="330" y="160" className={s.dgText} style={{ fontSize: 9.5 }}>▌ group “hadoop” offsets · reads in hourly batches, hours behind, and that is fine</text>
    </svg>
  )
}
