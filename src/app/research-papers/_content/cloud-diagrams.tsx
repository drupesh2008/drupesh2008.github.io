/**
 * Figures for the Cloud & Infrastructure papers — shared diagram vocabulary.
 */
import { pathwayStyles as s } from '@/components/Pathway/Pathway'

const box = (x: number, y: number, w: number, h: number, label: string, hi = false, size = 10.5) => (
  <g>
    <rect x={x} y={y} width={w} height={h} rx="8" className={hi ? s.dgBoxHi : s.dgBox} strokeWidth="1.1" />
    <text x={x + w / 2} y={y + h / 2 + 4} textAnchor="middle" className={s.dgText} style={{ fontSize: size }}>{label}</text>
  </g>
)

/** metadata from the master, bytes from a chunkserver */
export function GfsRead() {
  return (
    <svg viewBox="0 0 660 190" role="img" aria-label="A client asks the master where a chunk lives, then reads the chunk directly from a chunkserver">
      {box(20, 70, 110, 40, 'client', true)}
      {box(290, 16, 130, 40, 'master')}
      {[0, 1, 2].map((i) => box(290 + i * 125, 120, 110, 40, `chunkserver ${i + 1}`))}
      <line x1="130" y1="80" x2="290" y2="36" className={s.dgAcc} strokeWidth="1.2" />
      <text x="190" y="46" className={s.dgTextAcc} style={{ fontSize: 9 }}>① file, chunk index</text>
      <line x1="290" y1="44" x2="130" y2="92" className={`${s.dgAcc} ${s.dgDash}`} strokeWidth="1.2" />
      <text x="150" y="118" className={s.dgTextAcc} style={{ fontSize: 9 }}>② chunk handle + 3 locations (cached)</text>
      <line x1="130" y1="100" x2="290" y2="140" className={s.dgLine} strokeWidth="1.4" />
      <text x="200" y="150" className={s.dgText} style={{ fontSize: 9 }}>③ read 64 MB directly</text>
      <text x="330" y="182" textAnchor="middle" className={s.dgTextS}>the master touches bytes of metadata per operation, never the data</text>
    </svg>
  )
}

/** data flows along a chain, control goes through the primary */
export function WritePipeline() {
  return (
    <svg viewBox="0 0 660 200" role="img" aria-label="The client pushes data to the nearest replica, which forwards it along a chain; the primary then orders the mutation on all replicas">
      {box(20, 80, 100, 40, 'client', true)}
      {box(200, 20, 120, 40, 'replica A')}
      {box(200, 80, 120, 40, 'primary · lease')}
      {box(200, 140, 120, 40, 'replica C')}
      <line x1="120" y1="94" x2="200" y2="40" className={s.dgLine} strokeWidth="1.4" />
      <line x1="260" y1="60" x2="260" y2="80" className={s.dgLine} strokeWidth="1.4" />
      <line x1="260" y1="120" x2="260" y2="140" className={s.dgLine} strokeWidth="1.4" />
      <text x="330" y="54" className={s.dgText} style={{ fontSize: 9.5 }}>data: pushed to the nearest replica, forwarded</text>
      <text x="330" y="70" className={s.dgText} style={{ fontSize: 9.5 }}>along the chain, buffered, not yet applied</text>
      <line x1="120" y1="106" x2="200" y2="100" className={s.dgAcc} strokeWidth="1.2" />
      <text x="330" y="106" className={s.dgTextAcc} style={{ fontSize: 9.5 }}>control: “write it” goes to the primary only;</text>
      <text x="330" y="122" className={s.dgTextAcc} style={{ fontSize: 9.5 }}>it picks a serial order and tells the others</text>
      <text x="330" y="166" className={s.dgTextS}>network bandwidth is used once per hop; one machine decides the order</text>
    </svg>
  )
}

/** a trace is a tree of spans, each knowing its parent */
export function SpanTree() {
  const sp = (x: number, y: number, w: number, label: string, id: string, parent: string, hi = false) => (
    <g>
      <rect x={x} y={y} width={w} height="30" rx="6" className={hi ? s.dgBoxHi : s.dgBox} strokeWidth="1.1" />
      <text x={x + 8} y={y + 13} className={s.dgTextHi} style={{ fontSize: 10 }}>{label}</text>
      <text x={x + 8} y={y + 25} className={s.dgTextS} style={{ fontSize: 8 }}>span {id} · parent {parent}</text>
    </g>
  )
  return (
    <svg viewBox="0 0 660 200" role="img" aria-label="A root span for the request with child spans for each service call, each carrying its own id and its parent's id">
      {sp(230, 10, 200, 'frontend.Request', 'a1', '—', true)}
      {sp(40, 80, 170, 'auth.Check', 'b2', 'a1')}
      {sp(245, 80, 170, 'search.Query', 'c3', 'a1')}
      {sp(450, 80, 170, 'ads.Select', 'd4', 'a1')}
      {sp(180, 150, 150, 'index.Lookup', 'e5', 'c3')}
      {sp(345, 150, 150, 'rank.Score', 'f6', 'c3')}
      <line x1="300" y1="40" x2="125" y2="80" className={s.dgLine} strokeWidth="1" />
      <line x1="330" y1="40" x2="330" y2="80" className={s.dgLine} strokeWidth="1" />
      <line x1="360" y1="40" x2="535" y2="80" className={s.dgLine} strokeWidth="1" />
      <line x1="310" y1="110" x2="255" y2="150" className={s.dgLine} strokeWidth="1" />
      <line x1="350" y1="110" x2="420" y2="150" className={s.dgLine} strokeWidth="1" />
      <text x="640" y="40" textAnchor="end" className={s.dgTextAcc} style={{ fontSize: 9.5 }}>trace id 7f3e… on every span</text>
    </svg>
  )
}

/** spans are written locally and collected out of band */
export function CollectionPipeline() {
  return (
    <svg viewBox="0 0 660 150" role="img" aria-label="Application processes write span data to local log files; a daemon collects them into a central Bigtable; tools read traces from it">
      {[0, 1, 2].map((i) => box(20, 16 + i * 44, 130, 34, `service process ${i + 1}`))}
      {[0, 1, 2].map((i) => box(190, 16 + i * 44, 110, 34, 'local log file'))}
      {[0, 1, 2].map((i) => <line key={i} x1="150" y1={33 + i * 44} x2="190" y2={33 + i * 44} className={s.dgLine} strokeWidth="1" />)}
      {box(360, 50, 110, 44, 'collector daemon')}
      {[0, 1, 2].map((i) => <line key={i} x1="300" y1={33 + i * 44} x2="360" y2="72" className={`${s.dgLine} ${s.dgDash}`} strokeWidth="1" />)}
      {box(520, 50, 120, 44, 'Bigtable · trace per row', true)}
      <line x1="470" y1="72" x2="520" y2="72" className={s.dgAcc} strokeWidth="1.2" />
      <text x="330" y="140" textAnchor="middle" className={s.dgTextS}>the request path never waits on tracing; the median delay to a queryable trace was under 15 seconds</text>
    </svg>
  )
}

/** one slow server in a hundred becomes most requests slow */
export function FanOutTail() {
  return (
    <svg viewBox="0 0 660 190" role="img" aria-label="One server: 1 in 100 requests slow. Fan out to 100 servers: 63 in 100 requests slow">
      <text x="160" y="24" textAnchor="middle" className={s.dgTextS}>one server · 1% of calls slow</text>
      {Array.from({ length: 100 }, (_, i) => (
        <rect key={i} x={40 + (i % 20) * 12} y={36 + Math.floor(i / 20) * 12} width="10" height="10" rx="2" className={i === 37 ? s.dgAccFill : s.dgBox} strokeWidth="0.8" />
      ))}
      <text x="160" y="118" textAnchor="middle" className={s.dgText} style={{ fontSize: 10 }}>1 request in 100 waits</text>
      <text x="500" y="24" textAnchor="middle" className={s.dgTextS}>fan out to 100 servers · each 1% slow</text>
      {Array.from({ length: 100 }, (_, i) => (
        <rect key={i} x={380 + (i % 20) * 12} y={36 + Math.floor(i / 20) * 12} width="10" height="10" rx="2" className={(i * 7919) % 100 < 63 ? s.dgAccFill : s.dgBox} strokeWidth="0.8" />
      ))}
      <text x="500" y="118" textAnchor="middle" className={s.dgTextAcc} style={{ fontSize: 10 }}>63 requests in 100 wait for someone</text>
      <text x="330" y="160" textAnchor="middle" className={s.dgText} style={{ fontSize: 10.5 }}>1 − 0.99¹⁰⁰ = 0.63 · the slow one is a different server each time, so there is nothing to fix</text>
      <text x="330" y="180" textAnchor="middle" className={s.dgTextS}>the paper’s own arithmetic</text>
    </svg>
  )
}

/** a hedged request: send a backup after the 95th percentile, keep the first answer */
export function HedgedRequest() {
  return (
    <svg viewBox="0 0 660 170" role="img" aria-label="A request is sent to replica 1; after the 95th-percentile delay a copy goes to replica 2; the first reply is used and the other cancelled">
      <line x1="60" x2="620" y1="130" y2="130" className={s.dgLine} strokeWidth="1" />
      {[0, 10, 20, 30, 40, 50].map((t) => <text key={t} x={60 + t * 11} y="148" textAnchor="middle" className={s.dgText} style={{ fontSize: 9 }}>{t} ms</text>)}
      <text x="20" y="54" className={s.dgTextS}>replica 1</text>
      <rect x="60" y="40" width="440" height="18" rx="4" className={s.dgBox} strokeWidth="1" />
      <text x="280" y="53" textAnchor="middle" className={s.dgText} style={{ fontSize: 9 }}>busy: this call would take 40 ms (a 1-in-100 case)</text>
      <text x="20" y="94" className={s.dgTextS}>replica 2</text>
      <rect x="170" y="80" width="88" height="18" rx="4" className={s.dgBoxHi} strokeWidth="1.2" />
      <text x="214" y="93" textAnchor="middle" className={s.dgTextAcc} style={{ fontSize: 9 }}>8 ms</text>
      <line x1="170" x2="170" y1="30" y2="110" className={`${s.dgAcc} ${s.dgDash}`} strokeWidth="1" />
      <text x="176" y="118" className={s.dgTextAcc} style={{ fontSize: 9 }}>p95 passed: send a backup</text>
      <line x1="258" x2="258" y1="30" y2="110" className={s.dgAcc} strokeWidth="1.2" />
      <text x="264" y="36" className={s.dgTextAcc} style={{ fontSize: 9 }}>answer at 18 ms · cancel replica 1</text>
    </svg>
  )
}

/** a Borg cell: Borgmaster, scheduler, Borglets */
export function BorgCell() {
  return (
    <svg viewBox="0 0 660 200" role="img" aria-label="Users submit jobs to the Borgmaster, replicated five ways; a scheduler places tasks; a Borglet on every machine runs them">
      {box(20, 20, 100, 36, 'users · jobs')}
      {box(200, 14, 150, 48, 'Borgmaster · 5 replicas', true)}
      {box(400, 14, 110, 48, 'scheduler')}
      <line x1="120" y1="38" x2="200" y2="38" className={s.dgAcc} strokeWidth="1.2" />
      <line x1="350" y1="38" x2="400" y2="38" className={s.dgLine} strokeWidth="1" />
      {Array.from({ length: 6 }, (_, i) => (
        <g key={i}>
          <rect x={30 + i * 102} y="110" width="90" height="60" rx="7" className={s.dgBox} strokeWidth="1" />
          <text x={75 + i * 102} y="128" textAnchor="middle" className={s.dgTextS} style={{ fontSize: 8.5 }}>machine · Borglet</text>
          <rect x={38 + i * 102} y="136" width="34" height="24" rx="3" className={s.dgAccFill} opacity="0.5" />
          <rect x={78 + i * 102} y="136" width="34" height="24" rx="3" className={s.dgFaintFill} opacity="0.4" />
        </g>
      ))}
      <line x1="275" y1="62" x2="275" y2="110" className={`${s.dgLine} ${s.dgDash}`} strokeWidth="1" />
      <text x="330" y="190" textAnchor="middle" className={s.dgTextS}>a cell: ~10,000 machines · filled = prod tasks · grey = batch tasks packed into the slack</text>
    </svg>
  )
}

/** priority bands and what happens to the lower one */
export function PriorityBands() {
  const band = (y: number, label: string, note: string, hi: boolean) => (
    <g>
      <rect x="20" y={y} width="620" height="32" rx="6" className={hi ? s.dgBoxHi : s.dgBox} strokeWidth="1.1" />
      <text x="34" y={y + 20} className={s.dgTextHi} style={{ fontSize: 11 }}>{label}</text>
      <text x="630" y={y + 20} textAnchor="end" className={s.dgText} style={{ fontSize: 9.5 }}>{note}</text>
    </g>
  )
  return (
    <svg viewBox="0 0 660 170" role="img" aria-label="Four priority bands from monitoring down to best-effort; higher bands may preempt lower ones">
      {band(10, 'monitoring', 'the things that watch everything else', false)}
      {band(50, 'production', 'serving jobs: never preempted by batch, admission needs quota', true)}
      {band(90, 'batch', 'MapReduce and friends: runs in the gaps, evicted when prod needs the room', false)}
      {band(130, 'best effort', 'no promises at all, nearly free', false)}
    </svg>
  )
}

/** what each kind of sandbox shares with its neighbours */
export function IsolationStack() {
  const col = (x: number, title: string, layers: string[], hi: number[]) => (
    <g>
      <text x={x + 70} y="20" textAnchor="middle" className={s.dgTextS}>{title}</text>
      {layers.map((l, i) => (
        <g key={l}>
          <rect x={x} y={30 + i * 34} width="140" height="28" rx="5" className={hi.includes(i) ? s.dgBoxHi : s.dgBox} strokeWidth="1" />
          <text x={x + 70} y={48 + i * 34} textAnchor="middle" className={s.dgText} style={{ fontSize: 9.5 }}>{l}</text>
        </g>
      ))}
    </g>
  )
  return (
    <svg viewBox="0 0 660 200" role="img" aria-label="A container shares the host kernel; a VM has its own kernel on a hypervisor with a large device model; a microVM has its own kernel on a minimal device model">
      {col(20, 'container', ['your function', 'runtime', 'host kernel · shared', 'hardware'], [2])}
      {col(260, 'virtual machine', ['your function', 'guest kernel', 'QEMU · 1.4M lines, BIOS, PCI', 'KVM · hardware'], [2])}
      {col(500, 'Firecracker microVM', ['your function', 'guest kernel', 'VMM · ~50k lines, 5 devices', 'KVM · hardware'], [2])}
      <text x="330" y="190" textAnchor="middle" className={s.dgTextS}>highlighted: the layer that decides the attack surface between tenants</text>
    </svg>
  )
}

/** the jailer: layers around the VMM */
export function JailerLayers() {
  const r = (x: number, y: number, w: number, h: number, label: string, hi = false) => (
    <g>
      <rect x={x} y={y} width={w} height={h} rx="10" className={hi ? s.dgBoxHi : s.dgBox} strokeWidth="1.1" />
      <text x={x + 10} y={y + 16} className={s.dgTextS} style={{ fontSize: 8.5 }}>{label}</text>
    </g>
  )
  return (
    <svg viewBox="0 0 660 190" role="img" aria-label="Nested boxes: the guest inside the VMM, inside seccomp and a chroot, inside cgroups and namespaces, on a host that also uses KVM">
      {r(20, 10, 620, 170, 'host · KVM provides the hardware boundary')}
      {r(60, 36, 540, 118, 'jailer: new namespaces, chroot, cgroups, dropped privileges')}
      {r(100, 62, 460, 68, 'seccomp: the VMM may make ~24 system calls, nothing else')}
      {r(140, 86, 380, 30, 'Firecracker VMM (Rust) → guest kernel → your function', true)}
      <text x="330" y="186" textAnchor="middle" className={s.dgTextS} style={{ fontSize: 8.5 }}>defence in depth: an escape from the guest still lands in a jail</text>
    </svg>
  )
}
