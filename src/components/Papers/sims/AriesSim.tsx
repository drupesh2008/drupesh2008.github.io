'use client'

/**
 * ARIES in miniature: two transactions, two pages, a write-ahead log, a buffer
 * pool you can flush from, and a crash button. Recovery then runs the three
 * passes (analysis, redo, undo) and shows what each one decided.
 */

import { useState } from 'react'
import { Sim, Controls, Btn, Stat, Read, s } from './ui'

type Page = 'A' | 'B'
interface Rec { lsn: number; txn: string; type: 'update' | 'commit' | 'CLR' | 'end'; page?: Page; before?: number; after?: number; note?: string }
interface PageState { value: number; lsn: number }

const SCRIPT: { txn: string; page?: Page; to?: number; commit?: boolean; label: string }[] = [
  { txn: 'T1', page: 'A', to: 15, label: 'T1 sets A = 15' },
  { txn: 'T2', page: 'B', to: 25, label: 'T2 sets B = 25' },
  { txn: 'T1', commit: true, label: 'T1 commits' },
  { txn: 'T2', page: 'A', to: 17, label: 'T2 sets A = 17' },
]
const START: Record<Page, PageState> = { A: { value: 10, lsn: 0 }, B: { value: 20, lsn: 0 } }

export default function AriesSim() {
  const [step, setStep] = useState(0)
  const [log, setLog] = useState<Rec[]>([])
  const [flushedLsn, setFlushedLsn] = useState(0)
  const [disk, setDisk] = useState<Record<Page, PageState>>({ ...START })
  const [buf, setBuf] = useState<Partial<Record<Page, PageState>>>({})
  const [crashed, setCrashed] = useState(false)
  const [phases, setPhases] = useState<string[]>([])

  const cur = (p: Page): PageState => buf[p] ?? disk[p]
  const nextLsn = log.length + 1

  const next = () => {
    const op = SCRIPT[step]
    if (!op) return
    if (op.commit) {
      const rec: Rec = { lsn: nextLsn, txn: op.txn, type: 'commit', note: 'log forced to disk before the client hears "ok"' }
      setLog((l) => [...l, rec]); setFlushedLsn(nextLsn)
    } else {
      const before = cur(op.page!).value
      const rec: Rec = { lsn: nextLsn, txn: op.txn, type: 'update', page: op.page, before, after: op.to }
      setLog((l) => [...l, rec])
      setBuf((b) => ({ ...b, [op.page!]: { value: op.to!, lsn: nextLsn } }))
    }
    setStep(step + 1)
  }

  const flush = (p: Page) => {
    const page = buf[p]
    if (!page) return
    // WAL: the log up to this page's LSN must be on disk before the page is
    setFlushedLsn((f) => Math.max(f, page.lsn))
    setDisk((d) => ({ ...d, [p]: page }))
    setBuf((b) => { const n = { ...b }; delete n[p]; return n })
  }

  const crash = () => {
    setBuf({}); setCrashed(true)
    setLog((l) => l.filter((r) => r.lsn <= flushedLsn))
  }

  const recover = () => {
    const out: string[] = []
    const committed = new Set(log.filter((r) => r.type === 'commit').map((r) => r.txn))
    const losers = [...new Set(log.filter((r) => r.type === 'update' && !committed.has(r.txn)).map((r) => r.txn))]
    out.push(`Analysis: scanned ${log.length} log records. Committed: ${[...committed].join(', ') || 'none'}. Losers (active at the crash): ${losers.join(', ') || 'none'}.`)
    const d = { ...disk }
    const redone: string[] = []
    for (const r of log) if (r.type === 'update' && r.page && d[r.page].lsn < r.lsn) { d[r.page] = { value: r.after!, lsn: r.lsn }; redone.push(`${r.page}=${r.after} (LSN ${r.lsn})`) }
    out.push(`Redo: repeat history. Every logged update whose LSN is newer than the page on disk is re-applied, losers included: ${redone.join(', ') || 'nothing, the pages were already current'}.`)
    const clrs: Rec[] = []
    let lsn = log.length
    for (const t of losers) {
      const ups = log.filter((r) => r.type === 'update' && r.txn === t).reverse()
      for (const u of ups) { lsn++; d[u.page!] = { value: u.before!, lsn }; clrs.push({ lsn, txn: t, type: 'CLR', page: u.page, after: u.before, note: `undo of LSN ${u.lsn}` }) }
      lsn++; clrs.push({ lsn, txn: t, type: 'end' })
    }
    out.push(`Undo: losers are rolled back newest-first, each step logged as a compensation record so a crash during recovery is also recoverable. ${clrs.filter((c) => c.type === 'CLR').map((c) => `${c.page}=${c.after}`).join(', ') || 'nothing to undo'}.`)
    out.push(`Result on disk: A = ${d.A.value}, B = ${d.B.value}. Every committed change survived; every uncommitted one is gone.`)
    setDisk(d); setLog((l) => [...l, ...clrs]); setPhases(out)
  }

  const reset = () => { setStep(0); setLog([]); setFlushedLsn(0); setDisk({ ...START }); setBuf({}); setCrashed(false); setPhases([]) }

  return (
    <Sim
      title="Crash a database and bring it back"
      note="Run the script, flush pages to disk whenever you like (or never), then crash. Recovery must end with T1's committed write present and T2's uncommitted writes gone, whatever you did."
    >
      <Controls>
        <div className={s.btnRow}>
          <Btn primary={!crashed && step < SCRIPT.length} onClick={next} disabled={crashed || step >= SCRIPT.length}>
            {step < SCRIPT.length ? `Next: ${SCRIPT[step].label}` : 'Script done'}
          </Btn>
          <Btn onClick={() => flush('A')} disabled={crashed || !buf.A}>Flush page A</Btn>
          <Btn onClick={() => flush('B')} disabled={crashed || !buf.B}>Flush page B</Btn>
          <Btn primary={!crashed && step === SCRIPT.length} onClick={crash} disabled={crashed || log.length === 0}>Crash!</Btn>
          <Btn primary={crashed && !phases.length} onClick={recover} disabled={!crashed || phases.length > 0}>Recover</Btn>
          <Btn onClick={reset}>Reset</Btn>
        </div>
      </Controls>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)', gap: 18, alignItems: 'start' }}>
        <div>
          <div className={s.ctlLabel} style={{ marginBottom: 8 }}>write-ahead log <b>durable to LSN {flushedLsn}</b></div>
          <table className={s.table}>
            <thead><tr><th>lsn</th><th>txn</th><th>record</th><th>on disk</th></tr></thead>
            <tbody>
              {log.map((r) => (
                <tr key={r.lsn} className={r.type === 'CLR' || r.type === 'end' ? s.hi : undefined}>
                  <td>{r.lsn}</td><td>{r.txn}</td>
                  <td>{r.type === 'update' ? `update ${r.page}: ${r.before} → ${r.after}` : r.type === 'CLR' ? `CLR ${r.page} ← ${r.after} (${r.note})` : r.type}</td>
                  <td>{r.lsn <= flushedLsn || r.type === 'CLR' || r.type === 'end' ? 'yes' : 'buffer only'}</td>
                </tr>
              ))}
              {!log.length && <tr><td colSpan={4} className={s.muted}>empty</td></tr>}
            </tbody>
          </table>
        </div>
        <div>
          <div className={s.ctlLabel} style={{ marginBottom: 8 }}>pages</div>
          <table className={s.table}>
            <thead><tr><th>page</th><th>on disk</th><th>in buffer</th></tr></thead>
            <tbody>
              {(['A', 'B'] as Page[]).map((p) => (
                <tr key={p}>
                  <td>{p}</td>
                  <td>{disk[p].value} <span className={s.muted}>lsn {disk[p].lsn}</span></td>
                  <td>{crashed ? <span className={s.bad}>lost</span> : buf[p] ? <span className={s.hi}>{buf[p]!.value} dirty, lsn {buf[p]!.lsn}</span> : <span className={s.muted}>clean</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className={s.stats}>
            <Stat label="state" value={phases.length ? 'recovered' : crashed ? 'crashed' : 'running'} />
          </div>
        </div>
      </div>

      {phases.length > 0 && <div className={s.log}>{phases.map((p, i) => <div key={i}>{i === 0 ? <b>{p}</b> : p}</div>)}</div>}
      <Read>
        {!crashed
          ? 'Two rules make everything else possible. Write-ahead: a page may reach disk only after the log records describing it have. Force at commit: the log is flushed before a commit is acknowledged. Pages themselves may be flushed any time, or never.'
          : phases.length
            ? 'Redo repeated history for everyone, including the loser, and only then undid the loser. That order sounds wasteful but it is what lets ARIES support fine-grained locks and partial rollbacks, and crash during recovery itself.'
            : 'The buffer is gone; the disk holds whatever you flushed, and the log holds everything up to its last force. Press Recover.'}
      </Read>
    </Sim>
  )
}
