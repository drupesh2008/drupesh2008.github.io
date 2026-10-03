'use client'

/**
 * Codd's three operations on two small tables: select rows, project columns,
 * join on a shared value. The result is always another table, which is the
 * whole trick. The algebra and the SQL update as you change the query.
 */

import { useMemo, useState } from 'react'
import { Sim, Controls, Slider, Read, s } from './ui'

const EMP = [
  { id: 1, name: 'Asha', dept: 'ENG', salary: 92, city: 'Pune' },
  { id: 2, name: 'Ben', dept: 'ENG', salary: 71, city: 'Berlin' },
  { id: 3, name: 'Chen', dept: 'OPS', salary: 58, city: 'Pune' },
  { id: 4, name: 'Dara', dept: 'SALES', salary: 64, city: 'Dublin' },
  { id: 5, name: 'Eli', dept: 'ENG', salary: 55, city: 'Dublin' },
  { id: 6, name: 'Fola', dept: 'SALES', salary: 83, city: 'Lagos' },
]
const DEPT = [
  { dept: 'ENG', dname: 'Engineering', floor: 4 },
  { dept: 'OPS', dname: 'Operations', floor: 2 },
  { dept: 'SALES', dname: 'Sales', floor: 1 },
]
const COLS = ['name', 'dept', 'salary', 'city', 'dname', 'floor'] as const
type Col = (typeof COLS)[number]

export default function RelationalAlgebra() {
  const [dept, setDept] = useState<'ALL' | 'ENG' | 'OPS' | 'SALES'>('ALL')
  const [minSalary, setMinSalary] = useState(50)
  const [join, setJoin] = useState(true)
  const [cols, setCols] = useState<Col[]>(['name', 'dept', 'salary'])

  const rows = useMemo(() => {
    const base = EMP.filter((e) => (dept === 'ALL' || e.dept === dept) && e.salary >= minSalary)
    return base.map((e) => {
      const d = join ? DEPT.find((x) => x.dept === e.dept) : undefined
      return { ...e, dname: d?.dname ?? '', floor: d?.floor ?? '' }
    })
  }, [dept, minSalary, join])

  const shown = cols.filter((c) => join || (c !== 'dname' && c !== 'floor'))
  const toggle = (c: Col) => setCols((cur) => (cur.includes(c) ? cur.filter((x) => x !== c) : [...cur, c]))
  const conds = [dept !== 'ALL' ? `dept = '${dept}'` : null, minSalary > 50 ? `salary ≥ ${minSalary}k` : null].filter(Boolean)
  const rel = join ? 'employees ⋈ departments' : 'employees'
  const algebra = `π${shown.join(', ')}(${conds.length ? `σ${conds.join(' ∧ ')}(${rel})` : rel})`
  const sql = `SELECT ${shown.join(', ')}\nFROM employees${join ? ' JOIN departments USING (dept)' : ''}${conds.length ? `\nWHERE ${conds.join(' AND ').replace('≥', '>=').replace('k', '')}` : ''};`

  return (
    <Sim
      title="Ask a question of two tables"
      note="Filter rows, choose columns and decide whether to join. Note that you never say how to find anything: no pointers, no file offsets, no loop. The result is itself a table."
    >
      <Controls>
        <label className={s.ctl}>
          <span className={s.ctlLabel}>Department</span>
          <select className={s.select} value={dept} onChange={(e) => setDept(e.target.value as typeof dept)}>
            {(['ALL', 'ENG', 'OPS', 'SALES'] as const).map((d) => <option key={d} value={d}>{d === 'ALL' ? 'any' : d}</option>)}
          </select>
        </label>
        <Slider label="Minimum salary" value={minSalary} min={50} max={95} step={5} onChange={setMinSalary} fmt={(v) => `${v}k`} />
        <label className={s.ctl}>
          <span className={s.ctlLabel}>Join departments</span>
          <div className={s.chips}>
            <button type="button" className={`${s.chip} ${join ? s.chipOn : ''}`} onClick={() => setJoin(true)}>yes</button>
            <button type="button" className={`${s.chip} ${!join ? s.chipOn : ''}`} onClick={() => setJoin(false)}>no</button>
          </div>
        </label>
        <label className={s.ctl} style={{ minWidth: 260 }}>
          <span className={s.ctlLabel}>Columns to keep (project)</span>
          <div className={s.chips}>
            {COLS.filter((c) => join || (c !== 'dname' && c !== 'floor')).map((c) => (
              <button type="button" key={c} className={`${s.chip} ${cols.includes(c) ? s.chipOn : ''}`} onClick={() => toggle(c)}>{c}</button>
            ))}
          </div>
        </label>
      </Controls>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 18, alignItems: 'start' }}>
        <div>
          <div className={s.ctlLabel} style={{ marginBottom: 8 }}>result · {rows.length} row{rows.length === 1 ? '' : 's'}</div>
          <table className={s.table}>
            <thead><tr>{shown.map((c) => <th key={c}>{c}</th>)}</tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>{shown.map((c) => <td key={c}>{String(r[c])}</td>)}</tr>
              ))}
              {!rows.length && <tr><td colSpan={shown.length || 1} className={s.muted}>empty relation (still a table)</td></tr>}
            </tbody>
          </table>
        </div>
        <div>
          <div className={s.ctlLabel} style={{ marginBottom: 8 }}>the same question, two notations</div>
          <div className={s.log} style={{ marginTop: 0 }}><b>algebra</b>{'\n'}{algebra}{'\n\n'}<b>SQL</b>{'\n'}{sql}</div>
        </div>
      </div>
      <Read>
        {join
          ? 'The join matches rows by a shared value (dept) rather than by a stored link. Codd’s point: because tables relate by value, the storage engine may lay them out however it likes, and your query still means the same thing.'
          : 'Without the join, department names and floors are simply unavailable; the employees table does not contain them, and nothing in it points at the table that does. Turn the join on to combine them by value.'}
      </Read>
    </Sim>
  )
}
