/**
 * Databases & Storage — five explainers, each opening on the situation the
 * paper's authors were stuck in and carrying one worked example through.
 * Keyed by paper id.
 */
import type { ReactNode } from 'react'
import { Callout, Fig, Tbl, Predict, Notes } from '@/components/Pathway/Pathway'
import RelationalAlgebra from '@/components/Papers/sims/RelationalAlgebra'
import AriesSim from '@/components/Papers/sims/AriesSim'
import LsmSim from '@/components/Papers/sims/LsmSim'
import BigtableKeys from '@/components/Papers/sims/BigtableKeys'
import KafkaSim from '@/components/Papers/sims/KafkaSim'
import {
  PointerChase, JoinByValue, WalRule, RecoveryPasses, LsmLevels, WriteVsAppend, BigtableModel, TabletServing,
  BeforeKafka, PartitionedLog,
} from './databases-diagrams'

export const sections: Record<string, ReactNode> = {
  /* ────────────────────────────────────────────────────────────────── */
  'relational-model': (
    <>
      <p>
        Picture a payroll program at a large company in 1969. The data lives in IBM’s IMS, a
        hierarchical database. Each department record sits at the top of a small tree, and its
        employee records hang beneath it, linked by pointers stored on disk. To list the engineers
        who earn more than 80,000, the program opens the ENG department record, follows the pointer
        to its first employee, checks the salary, follows the next pointer, checks again, and stops
        at the end of the chain. The program is a route through the storage.
      </p>
      <p>
        Now the operations team wants to reorganise the file so that employees hang under projects
        instead of departments, because a new reporting system needs that. Every program that walks
        from department to employee stops working. Nobody changed what the data means. Asha still
        works in Engineering and still earns what she earned yesterday. Only the route changed, and
        the route was written into hundreds of programs.
      </p>
      <p>
        Edgar Codd’s 1970 paper is about removing that route from the program. After reading it you
        should be able to say exactly which kinds of change used to break applications, why
        describing data as relations stops them breaking, and what the database had to take on in
        exchange. That last part, the cost, is the reason query optimisers exist.
      </p>

      <h3>Three ways a program depended on the disk</h3>
      <p>
        The paper does not open with tables. It opens with a diagnosis. Codd lists three ways that
        programs of his day depended on how data was stored, and each one is a specific failure an
        engineer at the time would have recognised.
      </p>
      <p>
        The first is <em>ordering dependence</em>. If employee records are stored in name order, a
        program that prints the first employee whose salary exceeds 80,000 and stops is quietly
        relying on name order. Re-sort the file by employee number for a different application and
        the program still runs, but it prints a different person. The second is{' '}
        <em>indexing dependence</em>. If a program asks for records through a particular index,
        dropping that index to save space breaks it, even though the index was only ever a
        performance aid. The third, and the one that hurt most, is <em>access path dependence</em>:
        the program knows the shape of the tree or network, which record owns which, and navigates
        it.
      </p>
      <Fig caption="Reading data in a pointer database. To find Eli’s salary the program starts at the department and follows next-pointers until the name matches. The order of the chain is part of the program.">
        <PointerChase />
      </Fig>
      <p>
        Codd makes the access path problem concrete with a small example of parts, projects and the
        commitments between them. He shows several different hierarchies that could hold exactly the
        same facts, parts above projects, projects above parts, and so on, and points out that a
        program written for one structure fails on the others. The facts are identical in every
        version. Only the storage shape differs, and the programs are tied to the shape.
      </p>
      <p>
        This is worth reading slowly because it changes what the paper is about. The relational
        model is often taught as “data in tables”, as if the point were a tidy format. Codd’s point
        is separation: the programs should depend on what the data means, and the storage should be
        free to change underneath them. He calls this data independence, and everything else in the
        paper serves it.
      </p>

      <h3>What a relation is, and what it deliberately leaves out</h3>
      <p>
        A relation, in Codd’s definition, is a set of tuples. Each tuple takes one value from each of
        a fixed list of domains. Our running example has two relations:
      </p>
      <pre><code>{`employees(name, dept, salary)
  (Asha, ENG, 92)   (Ben, ENG, 71)   (Chen, OPS, 58)   (Dara, SALES, 64)

departments(dept, dept_name, floor)
  (ENG, Engineering, 4)   (OPS, Operations, 2)   (SALES, Sales, 1)`}</code></pre>
      <p>
        The interesting part of the definition is what it excludes. Because a relation is a set, its
        rows have no order, so no program can depend on order. Because it is a set, there are no
        duplicate rows, so every row must be identifiable by its values. And there are no pointers.
        Asha’s row does not point at the Engineering row. It contains the value ENG, and the
        departments relation contains a row whose key is ENG. The relationship is the shared value.
      </p>
      <Fig caption="The same facts as two relations. Nothing points at anything. Employees and departments are related because both contain the value ENG, and finding the matching rows is the database’s job.">
        <JoinByValue />
      </Fig>
      <p>
        Codd names the identifying columns too. A primary key is a domain, or combination of domains,
        whose values identify each row. When a relation carries a column whose values are the primary
        key of another relation, as <code>employees.dept</code> does, he calls it a foreign key. These
        terms appear in the 1970 paper and are still the words in every schema review.
      </p>
      <p>
        Every one of these exclusions closes off one of the three dependencies. No order means no
        ordering dependence. No pointers visible to the user means no access path dependence. And
        since indexes are not part of the model at all, a program written against relations cannot
        name one, so indexes can be added and dropped freely. The storage engine is still allowed to
        keep records in name order, build indexes and even maintain pointer chains internally. It
        just cannot expose them.
      </p>
      <Predict q={<>The operations team re-sorts the employees file by salary to speed up a payroll report. Two programs run against it: a navigational one that walks the ENG chain and stops at the first employee earning over 80, and a relational query that asks for the names of ENG employees with salary over 80. What happens to each?</>}>
        <p>
          The navigational program still runs and returns a person, but possibly a different one,
          because “first” now means “lowest salary over 80” instead of “first in name order”. Nothing
          fails loudly. That is the dangerous version of ordering dependence.
        </p>
        <p>
          The relational query returns the same set as before: Asha. It never said “first”, so the new
          physical order cannot change its meaning. If the program wants the result in name order it
          must ask for that explicitly, which is what <code>ORDER BY</code> later became.
        </p>
      </Predict>

      <h3>Flattening the data: the first normal form</h3>
      <p>
        Pointer databases happily stored repeating groups inside a record. Codd’s own example in the
        paper is an employee record that contains, inside it, a job history, and inside each job a
        salary history, and alongside those a list of children. That nesting is natural to draw, and
        it is exactly what makes the data hard to ask questions of: a query about salaries has to know
        it is reaching through jobs to get there.
      </p>
      <p>
        Codd requires that every domain be simple, meaning a value is atomic and not itself a set or
        list. A relation that meets this is in what he calls normal form, later named first normal
        form. He then shows how to take the nested employee record and decompose it into several flat
        relations: one for employees, one for job history keyed by employee and job date, one for
        salary history keyed by employee, job date and salary date, one for children keyed by
        employee and child name. Each nested level becomes its own relation, and the key of the parent
        is carried down into the child so the pieces can be put back together by value.
      </p>
      <p>
        Two things follow from this. The operators described next can treat every relation the same
        way, because there are no special cases for nested values. And redundancy becomes something
        you can see and reason about. The paper has a section on redundancy and consistency that
        distinguishes relations that can be derived from others from those that cannot, and frames
        consistency as a statement that must hold across relations. The further normal forms, second
        and third, came in Codd’s papers of the following years. The 1970 paper only plants the idea
        that a schema can be checked for redundancy the way a proof can be checked for a missing step.
      </p>

      <h3>Operations that take tables and return tables</h3>
      <p>
        If programs can no longer navigate, they need another way to ask. Codd defines a set of
        operations on relations whose result is always another relation. In the paper’s vocabulary
        these include projection (keep some columns, drop duplicates), restriction (keep the rows
        that satisfy a condition), join (combine two relations on equal values in a shared domain),
        composition and permutation. Because each result is a relation, the output of one operation
        can be the input of the next. A question becomes an expression.
      </p>
      <p>
        Here is our query, “names of engineers on floor 4 earning more than 80”, written as a chain of
        those operations and then in the SQL that IBM’s System R team developed a few years later:
      </p>
      <pre><code>{`project[name]( restrict[salary > 80 and floor = 4]( employees JOIN departments ON dept ) )

SELECT e.name
FROM employees e JOIN departments d ON e.dept = d.dept
WHERE e.salary > 80 AND d.floor = 4;`}</code></pre>
      <p>
        Neither version mentions a pointer, an index or an order. Try it in the panel below: switch
        the join off and the floor column is simply unavailable, because the employees relation does
        not contain it and nothing in it points to where it lives.
      </p>
      <RelationalAlgebra />
      <p>
        The paper also sketches a data sublanguage based on first-order predicate logic, in which a
        user states the properties of the rows wanted. Codd developed this into the relational
        calculus in a 1972 paper and showed that it and the algebra can express the same queries.
        That equivalence is what makes a declarative language possible: the user writes the
        description, and the system translates it into a sequence of operations it can execute.
      </p>

      <h3>The bill: someone now has to choose the route</h3>
      <p>
        Data independence moves the route out of the program. It does not make the route disappear.
        Take the query above and suppose employees has ten million rows and departments has fifty.
        The system could scan all of employees, filter by salary, and look up each survivor’s
        department. Or it could find the departments on floor 4 first, then use an index on{' '}
        <code>employees.dept</code> to fetch only their employees. If only one department sits on
        floor 4, the second plan reads a tiny fraction of the data. If most departments are on floor
        4, the full scan may be cheaper because it reads the table sequentially.
      </p>
      <p>
        In 1969 the programmer made that decision once, when writing the navigation. After Codd,
        the database has to make it for every query, using whatever it knows about the data. This is
        the job of the query optimiser, and the paper leaves a gap exactly its shape. Pat Selinger
        and colleagues filled it in System R with cost-based optimisation in 1979: estimate the cost
        of each candidate plan from statistics about the tables and pick the cheapest. An{' '}
        <code>EXPLAIN</code> plan today is that machinery showing its choice.
      </p>
      <p>
        This was the strongest objection at the time, and it was a fair one. Charles Bachman, who
        built the network model and won the Turing Award in 1973 for it, argued that skilled
        programmers navigating a known structure would beat any general system. For a decade the
        critics were partly right, because early relational systems were slower. What changed the
        outcome was the optimiser getting good enough, and hardware getting fast enough, that the
        flexibility outweighed the overhead for most applications.
      </p>
      <Tbl>
        <table>
          <thead><tr><th>Change to storage</th><th>Navigational program</th><th>Relational query</th><th>Who absorbs the change</th></tr></thead>
          <tbody>
            <tr><td>Re-sort the file</td><td>Silently returns different rows if it relied on order</td><td>Same result set</td><td>Nobody; order was never part of the meaning</td></tr>
            <tr><td>Drop an index</td><td>Fails if it navigated through that index</td><td>Same result, possibly slower</td><td>The optimiser picks another plan</td></tr>
            <tr><td>Restructure the hierarchy</td><td>Rewritten, since the route has changed</td><td>Same result</td><td>The storage layer and optimiser</td></tr>
            <tr><td>Add a new kind of question</td><td>New navigation code</td><td>A new expression over the same relations</td><td>The query author, in a few lines</td></tr>
          </tbody>
        </table>
      </Tbl>
      <Callout>
        Data independence does not remove the access path. It moves the choice of path from the
        program, where it was made once and frozen, to the database, where it can be remade for every
        query as the data and the indexes change.
      </Callout>

      <h3>What later systems changed, and when to step away from the model</h3>
      <p>
        SQL did not implement Codd’s model faithfully, and the differences are worth knowing because
        they still cause bugs. Codd’s relations are sets. SQL tables and query results are bags: they
        allow duplicate rows unless you write <code>DISTINCT</code> or declare a key. SQL also added{' '}
        <code>NULL</code> with three-valued logic, in which <code>NULL = NULL</code> is not true. Codd
        himself proposed missing values in later work, but the specific behaviour engineers trip over,
        such as <code>NOT IN</code> returning nothing when the subquery contains a null, belongs to SQL.
      </p>
      <p>
        The model also gave up something real: control over physical locality. A navigational
        database stored an order and its line items next to each other on disk because the parent
        record owned them. In a relational database they are two relations joined by value, and
        whether they are close on disk is the engine’s business. Clustered indexes, interleaved
        tables in Spanner and partition keys in distributed SQL systems are all ways of giving some of
        that control back without exposing it in queries.
      </p>
      <p>
        That suggests when to revisit the decision. Document stores such as MongoDB nest an order’s
        line items inside the order, which is Codd’s nested employee record again. That is a
        reasonable choice when the access pattern is fixed and almost always “fetch this one thing
        whole”, and the price is the same one IMS users paid: a new question that cuts across the
        nesting needs new code or a second copy of the data. Wide-column stores like Bigtable, later on
        this list, go further and make the row key the only index. When the questions are unknown in
        advance or will change, the relational trade is still the one to make. Notice also that most
        of the NoSQL systems of the 2010s added a SQL-like query layer back on top within a few years.
      </p>

      <h3>How to read the original</h3>
      <p>
        The paper is about eleven pages and has no experiments, because it is an argument and a
        definition rather than a system. Read section 1.2, on data dependencies in present systems,
        first and carefully. It is the motivation, and the parts-and-projects example there shows the
        problem better than any summary. Then read 1.3 and 1.4 for the definition of a relation, keys
        and normal form, and follow the nested employee example through its decomposition with a pen.
      </p>
      <p>
        Sections 1.5 and 1.6, on the sublanguage and on named versus stored relations, can be skimmed
        on a first pass. Section 2 defines the operations and then discusses redundancy and
        consistency. The notation is older than modern relational algebra courses and some operations,
        like composition and permutation, are not ones you will use, so read it for the idea that
        operations close over relations and that consistency is a property of the whole set of
        relations, not of one record. Instead of an evaluation, look for the places where Codd says
        what the system must now do on the user’s behalf. Those are the open problems the next
        twenty years of database research worked on.
      </p>
      <p>
        The next paper on this list, ARIES, takes the relational system as given and asks a lower-level
        question: if the machine crashes in the middle of updating these relations, how does the
        database come back with every committed change and none of the uncommitted ones?
      </p>
      <Notes items={[
        'Codd’s target was three specific dependencies, on ordering, on indexes and on access paths, each of which broke programs when storage changed.',
        'A relation is a set of rows related to other relations only by shared values; no order, no duplicates and no user-visible pointers.',
        'First normal form flattens nested groups into separate relations, carrying the parent’s key into each child.',
        'Because queries say what rather than how, the database must choose the access path, which is why cost-based optimisers exist.',
        'SQL departs from the model with duplicate rows and NULLs; many surprising query results come from those two departures.',
        'Nesting data for locality is a legitimate trade when the access pattern is fixed, and it brings back the problems Codd described when it is not.',
      ]} />
    </>
  ),

  /* ────────────────────────────────────────────────────────────────── */
  aries: (
    <>
      <p>
        A bank’s database is halfway through a transfer when the power goes. It has already debited
        one account in memory, and the buffer manager, short of space, has written that page to disk.
        The credit to the other account was never written anywhere. A second transaction, which
        committed a moment earlier and was told “done”, changed a page that is still only in memory.
        When the machine restarts, the disk holds a change that must be removed and lacks a change
        that must be present.
      </p>
      <p>
        Every serious database faces this on every crash, and in 1992 most vendors had a recovery
        scheme that handled it with restrictions: locks on whole pages rather than rows, no partial
        rollback, checkpoints that paused the system, or corner cases that were quietly wrong. ARIES,
        from C. Mohan and colleagues at IBM, is the method that handled all of it together, and it
        became the template for DB2, SQL Server and most engines that followed.
      </p>
      <p>
        By the end of this explainer you should be able to take a short log, a crash point and the
        state of the pages on disk, and work out by hand what each recovery pass does. We will carry
        one example the whole way and then change it to see why each rule is there.
      </p>

      <h3>Why the fast buffer policies make recovery hard</h3>
      <p>
        Two decisions about the buffer pool set the difficulty. The first is whether a page changed
        by an uncommitted transaction may be written to disk. Allowing it is called{' '}
        <em>steal</em>, because the buffer manager steals the frame from a running transaction. The
        second is whether commit must wait until every page the transaction changed is on disk.
        Requiring it is called <em>force</em>. The terms come from Härder and Reuter’s 1983 survey
        of recovery, and ARIES chooses steal and no-force, the combination that is fastest and
        hardest to recover.
      </p>
      <Tbl>
        <table>
          <thead><tr><th>Policy</th><th>What it costs at run time</th><th>What recovery must do</th></tr></thead>
          <tbody>
            <tr><td>No-steal, force</td><td>Big transactions must fit in memory; every commit waits for random page writes</td><td>Nothing: disk only ever holds committed pages, all of them</td></tr>
            <tr><td>No-steal, no-force</td><td>Big transactions must fit in memory</td><td>Redo committed work that did not reach disk</td></tr>
            <tr><td>Steal, force</td><td>Every commit waits for random page writes</td><td>Undo uncommitted work that did reach disk</td></tr>
            <tr><td>Steal, no-force (ARIES)</td><td>Commit waits only for a sequential log write; the buffer pool is free to evict anything</td><td>Both redo and undo</td></tr>
          </tbody>
        </table>
      </Tbl>
      <p>
        The reason for choosing the hard corner is the commit path. Under force, a transaction that
        touched twenty pages scattered across the disk cannot commit until twenty random writes
        finish. Under no-force, it commits once a few log records, written sequentially to the end of
        one file, are durable. That gap is what makes high transaction rates possible, and steal is
        what lets a transaction update more data than fits in memory.
      </p>

      <h3>The log, the LSN and one number on every page</h3>
      <p>
        ARIES rests on write-ahead logging. Every change is described by a log record carrying enough
        information to redo it and to undo it, and the records are appended to a single sequential
        log. Two rules govern when things reach disk. A data page may be written only after the log
        records describing its changes are on disk. A commit is acknowledged only after the log is on
        disk up to and including the commit record. Nothing else is forced.
      </p>
      <Fig caption="The two rules of write-ahead logging. A page may go to disk only after the log records that explain it; a commit is acknowledged only once the log is durable up to the commit record. Data pages are written whenever the buffer manager likes, or not at all.">
        <WalRule />
      </Fig>
      <p>
        Each log record gets a log sequence number, an increasing identifier for its position in the
        log. Each data page stores a pageLSN: the LSN of the latest log record whose change has been
        applied to that page. That single field is what makes recovery decidable. Given a log record
        with LSN 20 for page B, recovery reads page B from disk and compares. If the pageLSN is 20 or
        more, the change is already there. If it is less, the change is missing.
      </p>
      <p>
        Every update record also carries the LSN of the same transaction’s previous record, so each
        transaction’s records form a backward chain through the log. At run time the system keeps two
        small tables in memory: a transaction table with each active transaction and the LSN of its
        last record, and a dirty page table with each page that has been changed in memory but not
        written, together with its recLSN, the LSN of the first change that dirtied it. Periodically
        ARIES writes a checkpoint that copies both tables into the log. These checkpoints are fuzzy:
        the system keeps running while they are taken, and no pages are forced to disk.
      </p>

      <h3>A crash we can follow by hand</h3>
      <p>
        Here is our example, which is also the script in the simulation below. Two pages start on disk
        with A = 10 and B = 20, both with pageLSN 0. Two transactions run:
      </p>
      <pre><code>{`LSN 10  T1 update A   10 -> 15    prevLSN -
LSN 20  T2 update B   20 -> 25    prevLSN -
LSN 30  T1 commit                  (log forced through 30, client told "ok")
LSN 40  T2 update A   15 -> 17    prevLSN 20`}</code></pre>
      <p>
        A and B here stand for records. In a real system they could even be two rows on the same page,
        which matters later. After LSN 40 the buffer manager needs a free frame and evicts page A,
        whose pageLSN is 40. The write-ahead rule forces the log through LSN 40 first, then page A
        goes to disk with value 17. Page B, holding 25, is still only in memory. Then the power fails.
      </p>
      <p>
        On disk we now have A = 17 with pageLSN 40, which includes T2’s uncommitted change, and
        B = 20 with pageLSN 0, which is missing T2’s change. The log is durable through LSN 40. The
        correct final state is A = 15, because T1 committed and T2 did not, and B = 20.
      </p>
      <p>
        Recovery runs three passes over the log.
      </p>
      <Fig caption="The three passes of restart recovery. Analysis reads forward from the last checkpoint to rebuild the transaction and dirty page tables. Redo reads forward from the oldest change that might be missing. Undo reads backward through the transactions that did not commit.">
        <RecoveryPasses />
      </Fig>
      <p>
        <strong>Analysis</strong> reads forward from the last checkpoint, which in our case is the
        start of the log. It sees T1’s update, T2’s update, T1’s commit, T2’s second update. It ends
        with a transaction table holding T2 as a loser, with last LSN 40, and T1 as committed. It also
        rebuilds a dirty page table conservatively: page A with recLSN 10 and page B with recLSN 20.
        Analysis cannot know that page A was flushed, because the flush was not logged, so it assumes
        any page changed since the checkpoint might be dirty. Redo will sort that out.
      </p>
      <p>
        <strong>Redo</strong> starts at the smallest recLSN in the dirty page table, LSN 10, and walks
        forward. LSN 10 is for page A; page A on disk has pageLSN 40, which is not less than 10, so the
        change is already there and redo skips it. LSN 20 is for page B; page B has pageLSN 0, so redo
        sets B to 25 and its pageLSN to 20. LSN 30 is a commit, nothing to apply. LSN 40 is for page A,
        pageLSN 40, skip. The database is now exactly as it was at the instant of the crash: A = 17,
        B = 25. Note that redo just re-applied T2’s change to B, even though T2 is a loser.
      </p>
      <p>
        <strong>Undo</strong> takes the losers and walks their chains backward, always picking the
        largest LSN still to be undone. T2’s last record is LSN 40. Undo sets A back to 15 and writes a
        compensation log record, a CLR, at LSN 50 that says “A restored to 15” and carries an
        undoNextLSN of 20, the next record of T2 that still needs undoing. Then it undoes LSN 20,
        setting B back to 20, and writes CLR 60 with undoNextLSN empty. T2 has nothing left, so undo
        writes an end record for it. Final state: A = 15, B = 20, as required.
      </p>
      <AriesSim />
      <p>
        In the simulation, try different flush choices before you crash. Flush nothing, flush
        everything, flush only B. The disk state at the crash changes each time, and the decisions in
        the redo pass change with it, but the end state does not.
      </p>

      <Predict q={<>Change one thing: page A was flushed after LSN 10 but before LSN 40, so on disk A = 15 with pageLSN 10, and the log only reached disk through LSN 30 (T1’s commit force). Page B was never flushed. What does each pass do, and what is the final state?</>}>
        <p>
          The log on disk ends at LSN 30, so LSN 40 is lost along with the memory. That is safe: by the
          write-ahead rule, no page carrying LSN 40’s change can be on disk either.
        </p>
        <p>
          Analysis finds T1 committed and T2 a loser whose last durable record is LSN 20. Redo starts at
          LSN 10. Page A has pageLSN 10, so LSN 10 is skipped. Page B has pageLSN 0, so LSN 20 is
          re-applied, B = 25. Undo then reverses LSN 20 with a CLR, B = 20. Final state A = 15, B = 20,
          the same as before. The redo and undo work differed; the answer did not.
        </p>
      </Predict>

      <h3>Why repeat history for the losers too</h3>
      <p>
        The redo pass looks wasteful. It re-applied T2’s change to B only so that undo could take it
        away again. Earlier schemes tried to redo only committed transactions and skip the losers,
        which seems more efficient. The paper calls its own approach repeating history and argues it
        is what makes everything else work.
      </p>
      <p>
        The argument comes from fine-grained locking. Suppose A and B are two rows on the same page P,
        and two transactions are allowed to update different rows of that page concurrently, which is
        what row-level locking means. The page has one pageLSN. If recovery redid only the winners, it
        would apply T1’s change to P and skip T2’s, and then P’s pageLSN would no longer describe the
        page: some records below that LSN would be applied and some not. The test “is pageLSN at least
        this record’s LSN” would stop being a reliable answer, and the undo pass would be reversing
        changes that may or may not be present.
      </p>
      <p>
        Repeating history keeps one invariant intact: after redo, every page reflects every logged
        change up to its pageLSN, regardless of who made it. Undo then runs on a state that really
        existed, using the same logic as a normal rollback during operation. That is why ARIES can
        offer row-level locks and a simple recovery at the same time.
      </p>

      <h3>Crashing during recovery, and why undo is logged</h3>
      <p>
        Now change the example again. Recovery has written CLR 50, restoring A to 15, and that CLR
        has reached the log. Before it can process LSN 20, the machine crashes a second time.
      </p>
      <p>
        On the next restart, analysis sees T2 is still a loser, but its last record is now CLR 50.
        Redo repeats history again, including CLR 50 if page A on disk does not already reflect it,
        so A is 15. Undo starts from T2’s last record, CLR 50. A CLR is never undone; instead undo
        jumps to its undoNextLSN, which is 20. It undoes LSN 20 and finishes. LSN 40 is not touched a
        second time.
      </p>
      <p>
        Without the CLR, the second recovery would have to rediscover what the first one had done. For
        a simple “set the value back to 15” that is harmless, because applying it twice gives the same
        answer. But ARIES supports logical undo: undoing an insert into a B-tree index may mean deleting
        the key from whatever page it now lives on, after other transactions have split pages and moved
        keys around. Logical operations are not safe to repeat blindly. CLRs make the undo work itself
        part of history, which redo repeats and undo never re-does, so recovery does a bounded amount
        of work however many times it is interrupted.
      </p>
      <p>
        The same machinery gives partial rollback almost for free. A transaction that sets a savepoint
        and later rolls back to it simply runs the undo logic over its own chain back to the
        savepoint’s LSN, writing CLRs, and then carries on. The paper also introduces nested top
        actions for structural changes such as a page split in an index. The split should survive even
        if the transaction that triggered it rolls back, because other transactions may already be
        using the new page. A nested top action ends with a dummy CLR whose undoNextLSN skips over the
        split’s records, so a later rollback steps around them.
      </p>
      <Callout>
        Redo puts the database back in the exact state it was in at the crash, losers included; undo
        then rolls the losers back using the same logged steps as a normal abort. Every page’s LSN
        answers “is this change here?”, and every undo step is itself logged so it is never repeated.
      </Callout>

      <h3>What the method costs, and what later engines changed</h3>
      <p>
        ARIES is not free. Every update writes a log record with enough information to redo and undo
        it, so the log volume is roughly proportional to the data changed. Commit latency is the
        latency of making the log durable, which is why databases put the log on the fastest device
        available and why group commit, flushing many transactions’ commit records in one write,
        appears in every serious engine. Recovery time depends on how far back the oldest recLSN is and
        how much work the losers did. A transaction that ran for an hour before the crash can take a
        long time to undo, during which its locks are held.
      </p>
      <p>
        Later systems kept the principles and changed the details. MySQL’s InnoDB keeps a redo log and
        separate undo logs, and the undo logs are themselves protected by redo. PostgreSQL uses
        write-ahead logging for redo but has no undo pass, because its multi-version storage never
        overwrites a row in place. An uncommitted row version is simply invisible to everyone once the
        transaction is marked aborted, and vacuum removes it later. The cost moves from recovery time
        to storage and background cleanup.
      </p>
      <p>
        SQL Server, whose recovery follows ARIES, added Accelerated Database Recovery in 2019 to deal
        with the long-transaction problem. It keeps row versions in a persistent version store so that
        aborting a transaction becomes a matter of marking it aborted and letting readers skip its
        versions, rather than undoing every change one log record at a time. That is a move toward the
        PostgreSQL idea, layered onto an ARIES engine. Research systems built for fast non-volatile
        memory have gone further and questioned whether a separate log is needed at all, but on disk
        and SSD the ARIES structure is still the default.
      </p>
      <p>
        If you are building a store where data is never updated in place, the full method is more
        than you need. An append-only log of immutable records, as in an LSM-tree or Kafka, only has
        to redo the log tail into memory on restart. Undo exists because pages are overwritten. Remove
        overwriting and you remove undo, which is the trade PostgreSQL and every log-structured system
        on this list make.
      </p>

      <h3>How to read the original</h3>
      <p>
        The paper is about seventy pages in ACM Transactions on Database Systems, and very few readers
        get through it in one sitting. Start with the introduction, which states the goals as a list of
        properties the method must have (fine-grained locking, partial rollback, fuzzy checkpoints,
        recovery that survives repeated crashes, and so on). Keep that list beside you; much of the
        rest is the argument that each property holds.
      </p>
      <p>
        Next read the overview and the sections on data structures and normal processing, which define
        the log record fields, pageLSN, the transaction and dirty page tables, and how a rollback
        writes CLRs. Then read restart processing, the three passes, with a hand-written example like
        ours beside you. Skim media recovery and the material on nested top actions on a first read,
        and come back to them if you work on index structures. The long comparison with other recovery
        methods near the end is the best history of the field there is, and it explains why System R’s
        shadow paging and several other approaches were abandoned. There is no benchmark section. The
        evaluation is the argument that every listed property holds at once, so look for the places
        where the authors show a competitor losing one of them.
      </p>
      <p>
        The next paper, the LSM-tree, starts from the same insight that sequential log writes are cheap
        and random page writes are expensive, and pushes it much further: what if the data itself were
        written like a log, so that nothing is ever updated in place?
      </p>
      <Notes items={[
        'ARIES chooses steal and no-force, so commit waits only for a sequential log write and recovery must do both redo and undo.',
        'A page may reach disk only after its log records have, and a commit is acknowledged only once the log is durable through it.',
        'The pageLSN on every page decides whether a logged change is already present, which makes redo safe to run repeatedly.',
        'Redo repeats history for every transaction, losers included, so that pages shared by concurrent transactions stay consistent with their pageLSN.',
        'Every undo step writes a compensation log record pointing to the next record to undo, so a crash during recovery never repeats undo work.',
        'Systems that never overwrite in place, such as PostgreSQL and log-structured stores, avoid the undo pass and pay for it in versions and cleanup.',
      ]} />
    </>
  ),

  /* ────────────────────────────────────────────────────────────────── */
  'lsm-tree': (
    <>
      <p>
        Take a bank that records every account movement in a history table. Rows are only ever
        appended, but the bank also wants an index on account and time, so that a teller can pull up
        the recent movements for one customer. The appends are cheap. The index is the problem. Each
        new row’s index entry belongs on whichever B-tree leaf covers that account, and consecutive
        rows belong to unrelated accounts, so every insert lands on a different, effectively random
        leaf. If that leaf is not in memory, the disk has to seek to read it and seek again to write
        it back.
      </p>
      <p>
        On a 1996 disk a seek cost on the order of ten milliseconds, so one disk arm could do at most
        about a hundred random page accesses a second. A busy system inserting thousands of rows a
        second needed dozens of disks, bought not for their capacity but for their arms, to maintain
        one index. The same disks could stream data sequentially many times faster than that. The
        hardware had the bandwidth. The access pattern was wasting it.
      </p>
      <p>
        Patrick O’Neil, Edward Cheng, Dieter Gawlick and Elizabeth O’Neil proposed the
        log-structured merge-tree to fix this. After this explainer you should be able to trace a key
        from a write through memory, a flush and a compaction, say what a read must check to find it,
        and reason about the three costs, write, read and space amplification, that every LSM store
        trades against each other.
      </p>

      <h3>Paying for each insert with a fraction of a sequential write</h3>
      <p>
        The B-tree’s problem is not the cost of a page write. It is that each page write carries only
        one new entry. If a leaf holds forty index entries and we write it to add one, we paid a seek
        and a full page transfer for a fortieth of a page of new information.
      </p>
      <Fig caption="Seven updates, two ways. Updating a B-tree in place means a seek for each; appending them and sorting later turns them into one sequential write. The LSM-tree is built on the gap between those two costs.">
        <WriteVsAppend />
      </Fig>
      <p>
        The paper’s idea is to batch. New index entries go into a small tree in memory, which the
        authors call C0. A much larger tree on disk, C1, holds everything older. Inserts never touch
        C1 directly. Instead, a process the paper calls the rolling merge continuously walks C0 and C1
        together in key order, the way the merge step of merge sort walks two sorted lists. It reads
        C1’s leaves sequentially in large multi-page blocks, merges in the C0 entries that fall in each
        key range, and writes the combined leaves out to new positions on disk, again sequentially.
        Old blocks are freed once their contents have been rewritten.
      </p>
      <p>
        Here is the arithmetic that makes this pay, with illustrative numbers. Say a leaf holds forty
        entries and C1 is ten times larger than C0. On average, as the merge passes over each C1 leaf,
        about four new entries from C0 fall into it. The merge reads and writes that leaf once,
        sequentially, and the cost is shared by those four entries. Compare that with the B-tree,
        which spends a random read and a random write per entry. The LSM-tree has replaced two random
        I/Os per insert with roughly half a sequential page I/O per insert. The paper derives this
        ratio in general and shows that the saving grows with the number of entries merged per page
        and with the gap between random and sequential cost.
      </p>
      <p>
        One structure on disk is not enough when the data is large, because C0 must then be large to
        keep the merge efficient, and memory is expensive. The paper generalises to a chain of
        components, C0 in memory and C1 through Ck on disk, each larger than the one before, with a
        rolling merge between every adjacent pair. It also shows that, for a fixed largest component,
        total merge cost is lowest when the size ratio between consecutive components is the same at
        every step. That result is why every LSM store you will meet has a single “level size
        multiplier”, commonly ten.
      </p>

      <h3>Following keys through a modern LSM store</h3>
      <p>
        The stores built on this idea since 2006 took the structure from Bigtable rather than directly
        from the paper, and they look different in detail. Instead of one continuously merged tree per
        level, they write immutable sorted files, called SSTables, and merge them in discrete
        compactions. The principle is the same: absorb writes in memory, write them out sequentially in
        sorted batches, and merge batches into larger ones in the background.
      </p>
      <Fig caption="The modern form. Every write is logged and inserted into an in-memory memtable. A full memtable is written out as an immutable sorted run in level 0. Compaction merges runs into larger, older levels. A read checks the memtable, then each level from newest to oldest.">
        <LsmLevels />
      </Fig>
      <p>
        Let us run a small store by hand, with the same settings as the simulation below: the memtable
        holds four distinct keys, and when level 0 has three runs they are compacted into level 1.
        Every write is also appended to a write-ahead log so that the memtable can be rebuilt after a
        crash. We write thirteen operations:
      </p>
      <pre><code>{`1-5    put k03=v1, k07=v2, k03=v3, k11=v4, k01=v5
       memtable full at 4 keys -> flush run R1: k01:v5 k03:v3 k07:v2 k11:v4

6-9    put k07=v6, k02=v7, k09=v8, delete k11
       flush run R2: k02:v7 k07:v6 k09:v8 k11:<tombstone>

10-13  put k03=v10, k05=v11, k07=v12, k12=v13
       flush run R3: k03:v10 k05:v11 k07:v12 k12:v13
       level 0 now has three runs -> compact R3, R2, R1 into level 1`}</code></pre>
      <p>
        Notice first that k03=v1 never reached disk. It was overwritten while still in the memtable, so
        the flush wrote only v3. Short-lived values cost almost nothing in an LSM store, which is one
        reason it suits counters and session state.
      </p>
      <p>
        Next, the delete. An LSM store cannot find k11 in R1 and erase it, because R1 is immutable and
        rewriting it would be the random write we are trying to avoid. So a delete is a write: a
        tombstone record for k11 that is newer than v4. Until compaction removes them, both the old
        value and the tombstone take up space.
      </p>
      <p>
        Now the compaction. It reads R3, R2 and R1 together in key order and, for each key, keeps only
        the newest version: k01:v5, k02:v7, k03:v10, k05:v11, k07:v12, k09:v8, k12:v13. For k11 it
        finds the tombstone in R2 shadowing v4 in R1. Because level 1 is the bottom of this store, no
        older copy of k11 can exist anywhere else, so the compaction drops both the tombstone and v4.
        Level 1 ends up with seven entries.
      </p>
      <p>
        Count what we wrote to disk. Thirteen operations became twelve entries across three flushes,
        then seven more entries written by compaction: nineteen entries written for thirteen
        operations, a write amplification of about 1.5. With more levels, each byte is rewritten once
        for every level it passes through, and often more, so that number grows with the depth of the
        tree.
      </p>
      <LsmSim />

      <Predict q={<>Stop just before the compaction, with R1, R2 and R3 in level 0 and an empty memtable. A client reads k11. Which runs does the read look at, in what order, and what does it return? What would go wrong if the store checked runs oldest-first?</>}>
        <p>
          The read checks the memtable (miss), then the newest run R3. R3’s Bloom filter almost
          certainly says k11 is not there, so R3 is skipped without a disk read. Next is R2, which holds
          the tombstone for k11. The read stops and returns “not found”.
        </p>
        <p>
          Checked oldest-first, the read would hit R1 first and return v4, a value the client deleted.
          The newest-first order is not an optimisation; it is what makes overwrites and deletes
          correct. It is also why a tombstone must survive until compaction reaches the level holding
          the oldest copy of the key.
        </p>
      </Predict>

      <h3>Reads pay for what writes saved</h3>
      <p>
        The paper is candid that the LSM-tree is built for workloads where inserts greatly outnumber
        lookups. Our read of k11 had to consult up to four places. A B-tree lookup is one descent. In a
        real store with a dozen level 0 files and five or six levels below, a lookup for a key that
        does not exist could touch every one of them.
      </p>
      <p>
        Two additions made reads acceptable, and neither is in the 1996 paper. The first is the Bloom
        filter. Bigtable kept one per SSTable: a small bit array that answers “definitely not here” or
        “possibly here” for any key. With around ten bits per key, the false positive rate is about
        one percent, so a lookup reads from disk only the files that probably hold the key. The second
        is leveled compaction, introduced by LevelDB, in which every level below level 0 is a single
        sorted run split into non-overlapping files. A lookup then checks at most one file per level.
      </p>
      <p>
        Range scans are harder. A Bloom filter cannot say whether a range is empty, so a scan from k02
        to k09 must open an iterator on every run that could overlap the range and merge them on the
        fly. Prefix Bloom filters and range filters are later attempts to recover some of that, with
        mixed success. If your workload is dominated by short range scans over data that is rarely
        written, a B-tree is usually the better structure.
      </p>

      <h3>Three amplifications, and the knob that trades them</h3>
      <p>
        Once a store has several levels, every design decision moves cost among three quantities.
        Write amplification is bytes written to disk per byte the application wrote. Read
        amplification is the number of places, or disk reads, a lookup touches. Space amplification is
        bytes on disk per byte of live data, inflated by old versions and tombstones not yet compacted
        away. Athanassoulis and colleagues later framed this as the RUM conjecture: an access method
        cannot be optimal for reads, updates and memory at the same time.
      </p>
      <p>
        The compaction strategy is the main knob. Change one variable, the policy, and watch the
        three move. Assume a store with a size ratio of ten and five levels.
      </p>
      <Tbl>
        <table>
          <thead><tr><th>Policy</th><th>Write amplification</th><th>Read amplification</th><th>Space amplification</th><th>Where it is used</th></tr></thead>
          <tbody>
            <tr><td>Leveled (one run per level)</td><td>High: moving data into a level rewrites the overlapping part of that level, up to about ten times its size, at each of five levels</td><td>Low: one file per level</td><td>Low: about 10% extra, since most data sits in the last level</td><td>RocksDB and LevelDB default; Cassandra LCS</td></tr>
            <tr><td>Tiered (several runs per level, merged together when full)</td><td>Lower: each byte is written about once per level</td><td>Higher: up to ten runs per level to check</td><td>Higher: a full merge can need twice the space temporarily</td><td>Cassandra STCS; RocksDB universal compaction</td></tr>
            <tr><td>B-tree, for contrast</td><td>A whole page per changed entry</td><td>One descent</td><td>Pages left partly empty by splits</td><td>InnoDB, PostgreSQL, most relational engines</td></tr>
          </tbody>
        </table>
      </Tbl>
      <p>
        Research since 2016 has mostly been about moving along this curve more cleverly. WiscKey
        stores keys in the LSM-tree and values in a separate log, so compaction moves small keys
        instead of large values; RocksDB’s BlobDB and BadgerDB adopt the idea. Monkey showed that
        giving deeper levels fewer Bloom filter bits per key and shallower levels more lowers lookup
        cost for the same memory. Dostoevsky proposed lazy leveling, tiered in the upper levels and
        leveled at the bottom. Cassandra added time-window compaction for time series, where whole
        files expire together and can be dropped without merging.
      </p>

      <h3>When the deferred bill comes due</h3>
      <p>
        An LSM store accepts writes at memory speed and promises to do the sorting later. The failure
        mode is a write rate that the background compaction cannot keep up with. Here is how it
        unfolds in RocksDB, step by step.
      </p>
      <p>
        A bulk import starts writing faster than usual. Memtables fill and flush quickly, and level 0
        files accumulate faster than compaction can merge them into level 1. Reads start to slow
        because every lookup must check every level 0 file, whose key ranges overlap. When the number
        of level 0 files passes a slowdown threshold, RocksDB deliberately delays writes to let
        compaction catch up; past a higher stop threshold it blocks writes entirely. From the
        application’s side, write latency that was a fraction of a millisecond jumps to seconds, and
        nothing in the application changed.
      </p>
      <p>
        The fixes all cost something. More compaction threads finish the work sooner but take CPU and
        disk bandwidth from foreground reads. Larger memtables mean fewer, larger flushes but more
        memory and longer recovery from the write-ahead log. A rate limiter on ingestion keeps the
        store healthy by making the import take longer. Switching to tiered compaction lowers the
        write cost per byte but makes reads and space worse. The decision should be written down as
        which of those costs the system can afford.
      </p>
      <p>
        Deletes have their own version of this. A delete-heavy workload, such as a queue implemented
        on top of Cassandra, can accumulate large numbers of tombstones that every read must step over
        until compaction reaches the bottom. Cassandra keeps tombstones for a grace period so that
        replicas which missed the delete do not resurrect the data, which makes the problem longer
        lived. Reads that scan through many tombstones are a common cause of Cassandra latency
        incidents.
      </p>
      <Callout>
        An LSM-tree does not remove the cost of keeping data sorted. It postpones that cost and pays it
        in large sequential batches. Whether that is a good deal depends on whether the background
        compaction can keep pace with the writes and whether the workload can tolerate reads that look
        in several places.
      </Callout>

      <h3>Why the idea survived SSDs</h3>
      <p>
        The paper’s cost model is written in terms of disk arms, and solid-state drives have no arm.
        It would be reasonable to expect the LSM-tree to have faded with spinning disks. It did the
        opposite. LevelDB appeared in 2011, Facebook forked it into RocksDB the following year, and
        RocksDB now sits under MyRocks, CockroachDB’s earlier storage layer, TiKV, Kafka Streams state
        stores and much of Meta’s infrastructure. Cassandra, HBase and ScyllaDB are LSM-trees too.
      </p>
      <p>
        Two properties of flash kept the design relevant. Flash cannot overwrite a page in place; it
        must erase a large block first, so random small writes cause internal write amplification in
        the drive and wear it out sooner. Large sequential writes of immutable files are close to what
        flash wants. And LSM stores compress well, because each file is written once and can be
        compressed as a whole, which matters when storage is paid for by the gigabyte. Facebook’s
        stated reason for building MyRocks was space and write efficiency on flash compared with
        InnoDB.
      </p>

      <h3>How to read the original</h3>
      <p>
        The paper is long and analytical. Start with the introduction, which sets out the history
        table example and the cost argument based on the five-minute rule, the observation that it is
        cheaper to keep a page in memory than to fetch it repeatedly from disk if it is used often
        enough. That framing is how the authors justify spending memory on C0. Then read the
        two-component algorithm closely, with attention to how the rolling merge reads and writes
        multi-page blocks and how a lookup searches C0 before C1.
      </p>
      <p>
        The cost analysis is the paper’s evaluation; there are no benchmarks. Read it for the ratio
        between LSM and B-tree insert cost and for the multi-component result that equal size ratios
        minimise total cost. You can skim the details of concurrency and recovery during a merge on a
        first read. The comparison with other structures near the end is useful for seeing which
        workloads the authors thought the design was not for. While reading, translate the paper’s
        terms into today’s: C0 is the memtable, the components are levels, the rolling merge is
        compaction, and the paper’s deletion entries are tombstones.
      </p>
      <p>
        The next paper, Bigtable, is where most engineers first met this structure in practice. It
        puts a memtable and SSTables behind every server in a cluster of thousands and adds the Bloom
        filters this design needed, then asks a new question: if all data is sorted by key, how should
        the key be designed?
      </p>
      <Notes items={[
        'A B-tree insert pays a random read and write for one new entry; an LSM-tree shares one sequential write among many entries.',
        'Writes go to a logged memtable, flush as immutable sorted runs, and are merged into larger levels by compaction.',
        'A delete is a tombstone write, and it must survive until compaction reaches the oldest copy of the key.',
        'Reads check newest to oldest and rely on Bloom filters and leveled layout to avoid touching every run.',
        'Leveled and tiered compaction trade write, read and space amplification against each other; no setting minimises all three.',
        'If compaction cannot keep up with ingest, level 0 grows and the store throttles writes, so compaction capacity is part of the write budget.',
      ]} />
    </>
  ),

  /* ────────────────────────────────────────────────────────────────── */
  bigtable: (
    <>
      <p>
        Google’s crawler in the early 2000s fetched billions of web pages and fetched them again as
        they changed. For each page the indexing pipeline wanted the latest contents, a few older
        versions to detect change, and every link pointing to the page from elsewhere on the web, with
        the anchor text of each. The pipeline read this data in enormous batch scans. Other teams
        wanted to read single rows of it while a user waited. The same company also needed to store
        satellite imagery for Google Earth, click streams for Analytics and per-user settings for
        personalised search.
      </p>
      <p>
        GFS, Google’s distributed file system, could hold the bytes, but a file system offers no way
        to update one page’s record among billions or to find it by URL. Commercial databases of the
        time did not scale across thousands of cheap machines, and their licences would have cost a
        fortune at that size. So a team including Fay Chang, Jeff Dean and Sanjay Ghemawat built a
        storage system with a deliberately small feature set, described in this 2006 OSDI paper.
      </p>
      <p>
        After reading this you should be able to design a Bigtable row key for a given access pattern
        and predict where its load will land, trace a read from a client to the right server, and
        explain what happens when a server holding part of the table dies. Those three skills carry
        directly to HBase, Cassandra, Cloud Bigtable and DynamoDB.
      </p>

      <h3>A map with three parts to its key</h3>
      <p>
        The paper describes Bigtable as a sparse, distributed, persistent, multi-dimensional sorted
        map. That phrase is denser than it looks, so let us take it apart with the paper’s own example,
        the Webtable that holds the crawl.
      </p>
      <p>
        Each cell is addressed by three things: a row key, a column key and a timestamp. The value is
        an uninterpreted string of bytes. The row key for a page is its URL with the hostname reversed,
        so www.cnn.com/index.html becomes <code>com.cnn.www/index.html</code>. Columns are grouped into
        column families, which must be declared when the table is created and are meant to be few, a
        few hundred at most. Inside a family, any column name can be used without declaration. The
        Webtable has a <code>contents</code> family holding the page body, and an <code>anchor</code>{' '}
        family in which the column name is the referring site, so <code>anchor:cnnsi.com</code> holds
        the link text that cnnsi.com uses when it points to CNN. A popular page may have thousands of
        anchor columns; an obscure one has none. That is what sparse means: a row stores only the
        columns that were written to it.
      </p>
      <Fig caption="The Webtable row for CNN’s home page. Rows are sorted by key; contents and anchor are column families; each cell keeps several timestamped versions. A column exists because something was written to it.">
        <BigtableModel />
      </Fig>
      <p>
        Every cell can hold multiple versions, indexed by a 64-bit timestamp, stored newest first. Each
        column family has a garbage-collection setting: keep the last n versions, or keep versions
        newer than some age. The crawler writes a new <code>contents</code> version each time it
        fetches a page and the table keeps, say, the last three, so the indexer can tell whether the
        page changed.
      </p>
      <p>
        Two properties of this model matter more than everything else in it. First, rows are kept in
        lexicographic order by row key, and a contiguous range of rows, called a tablet, is the unit of
        distribution. Second, every read or write of a single row is atomic, however many columns it
        touches, and nothing wider is. There are no multi-row transactions, no secondary indexes, no
        joins and no query language. If you want to find rows by something other than their key, you
        maintain a second table yourself.
      </p>

      <h3>Why the hostname is reversed</h3>
      <p>
        Sorting by row key means the row key is the only index and the only control over what is
        stored together. Reversing the hostname is a design decision about locality, and you can see
        its effect by changing it.
      </p>
      <p>
        With plain URLs as keys, rows sort by the first label of the hostname. www.cnn.com sits among
        everything else starting with “www”, money.cnn.com sits among the m’s, sports.cnn.com among the
        s’s. A job that wants to process every page on cnn.com must read scattered ranges spread across
        many tablets on many servers. With reversed hostnames, com.cnn.money, com.cnn.sports and
        com.cnn.www are adjacent, and every page of the site is one contiguous range that usually falls
        in one tablet or a few neighbouring ones. Try both in the panel below.
      </p>
      <BigtableKeys />
      <p>
        The benefit goes beyond scans. Bigtable compresses data per block within each SSTable, and
        pages from the same site share navigation bars, boilerplate and scripts. Because the reversed
        key puts them next to each other, the compressor sees the repetition. The paper reports roughly
        a ten-to-one reduction for Webtable contents with its two-pass compression scheme, and
        attributes much of that to similar pages being stored together. The row key, chosen for
        locality, also bought a large storage saving.
      </p>
      <Callout>
        In a store sorted by row key, the key design decides which rows are read together, which rows
        are compressed together and which server takes each write. Design the key from the question
        the application asks most often, and check where the newest writes will land.
      </Callout>

      <Predict q={<>A monitoring team stores one reading per host per second in Bigtable with the row key <code>timestamp#hostname</code>, for example <code>20061106T120000#web-0412</code>. They have 50,000 hosts and 400 tablet servers. At any moment, how many tablet servers are receiving writes? How would you change the key?</>}>
        <p>
          Essentially one. Every write in a given second has nearly the same timestamp prefix, so all
          50,000 rows sort into the same narrow range at the end of the table, which belongs to the
          last tablet. Bigtable will split that tablet as it grows, but the new writes always land past
          the latest split, on the tablet holding the newest timestamps. One server takes the entire
          write load while 399 sit idle.
        </p>
        <p>
          Put the host first: <code>web-0412#20061106T120000</code>. Writes now spread across the whole
          key space because 50,000 hosts are spread across it, and the question “readings for host
          web-0412 in the last hour” is a single contiguous scan. The cost is that “all hosts at noon”
          becomes a scan over every host’s range. If that question matters, a second table keyed by time
          bucket and host, written alongside the first, answers it. Some designs also reverse the
          timestamp (subtract it from a large constant) so that the newest reading for a host sorts
          first. Google’s Cloud Bigtable documentation still warns against row keys that begin with a
          timestamp, for this reason.
        </p>
      </Predict>

      <h3>Finding the server that holds a row</h3>
      <p>
        A large table is split into many tablets, each roughly 100 to 200 MB by default, and each
        tablet is served by one tablet server at a time. Tablets split when they grow too large, and
        the master moves them between servers to balance load. A client that wants row{' '}
        <code>com.cnn.www/index.html</code> must find which server currently holds the tablet whose
        range covers that key.
      </p>
      <p>
        Bigtable answers this with a three-level lookup that is itself stored in Bigtable. A file in
        Chubby, Google’s Paxos-replicated lock service, records the location of the root tablet. The
        root tablet holds the locations of all the METADATA tablets. Each METADATA tablet holds the
        locations of a set of user tablets, in rows keyed by table name and the tablet’s end row. The
        paper works out that with 128 MB METADATA tablets this scheme can address 2<sup>34</sup>{' '}
        tablets. The root tablet is never split, so the hierarchy never grows a fourth level.
      </p>
      <Fig caption="Who talks to whom. Clients send reads and writes straight to tablet servers. The master assigns tablets and balances load but is not on the data path. Chubby holds the locks and the root tablet’s location; GFS stores every SSTable and commit log.">
        <TabletServing />
      </Fig>
      <p>
        Clients cache tablet locations. With an empty cache, a lookup costs three network round trips,
        one of them to Chubby. With a stale cache, the client discovers the miss when the server it
        contacts no longer holds the tablet, and walks back up the hierarchy, which the paper says can
        take up to six round trips. Clients also prefetch neighbouring METADATA entries when they read
        one. The effect is that the master is almost never contacted by clients, so its load does not
        grow with traffic. A single master is acceptable precisely because it is off the read and write
        path.
      </p>

      <h3>Inside a tablet server: the LSM-tree from the previous paper</h3>
      <p>
        Each tablet server stores its tablets the way the LSM-tree paper suggests, with names that
        stuck. A write is checked for authorisation, appended to a commit log in GFS, and then inserted
        into an in-memory sorted buffer called the memtable. When the memtable grows past a threshold,
        it is frozen and written to GFS as an SSTable, an immutable file of sorted key-value pairs in
        blocks with an index at the end. The paper calls this a minor compaction. A merging compaction
        combines a few SSTables and the memtable into one new SSTable. A major compaction rewrites all
        of a tablet’s SSTables into exactly one, and it is the only kind guaranteed to remove deleted
        data, because only then can it be sure no older copy is hiding in another file.
      </p>
      <p>
        A read is executed on the merged view of the memtable and the tablet’s SSTables. To keep that
        affordable, the paper adds several refinements that later systems copied almost unchanged.
        Clients can group column families into locality groups, each stored in its own SSTables, so
        that a scan of the small anchor data never reads the large page contents. A locality group can
        be marked to live in memory, which Bigtable uses for the location columns of the METADATA
        table. And clients can ask for a Bloom filter per locality group, so that a lookup for a row or
        column that does not exist rarely touches disk.
      </p>

      <h3>When a tablet server dies</h3>
      <p>
        Here is a failure walked through step by step, because it is where the pieces fit together.
        When a tablet server starts, it creates a uniquely named file in a Chubby directory and takes
        an exclusive lock on it. The master watches that directory. Suppose the server holding the
        tablet for <code>com.cnn.*</code> is cut off by a network fault.
      </p>
      <p>
        Its Chubby session expires and it loses its lock. A server that has lost its lock stops serving
        its tablets, so it cannot accept a write that the system would then forget. The master,
        periodically asking each server about its lock, gets no answer from this one. It then tries to
        take the lock on the server’s file itself. If it succeeds, Chubby is healthy and the server is
        the problem, so the master deletes the file, ensuring the server can never serve again under
        that identity, and puts its tablets in the set of unassigned tablets.
      </p>
      <p>
        A new server is assigned the cnn tablet. It reads the tablet’s list of SSTables from METADATA,
        which is fast because SSTables are already in GFS. The writes that were only in the dead
        server’s memtable exist in its commit log, and here a design decision complicates recovery.
        Each server keeps one commit log for all its tablets, not one per tablet, because one log means
        sequential appends to one GFS file instead of many. So the dead server’s log interleaves
        entries for many tablets, and each of those tablets may now be on a different new server. If
        every new server read the whole log, the log would be read many times over. The paper’s
        answer is to sort the log first, in parallel across servers, by table, row and log sequence
        number. After sorting, each new server reads only the contiguous part for its tablets.
      </p>
      <p>
        The cost of that choice falls in the recovery path, which happens rarely, while its benefit, a
        single sequential log, applies to every write. That is the paper’s typical trade. When a
        tablet is moved deliberately for load balancing, the old server does a minor compaction first
        so the new server has almost no log to replay.
      </p>
      <Tbl>
        <table>
          <thead><tr><th>Choice in the paper</th><th>What it buys</th><th>What it costs</th><th>Who later revisited it</th></tr></thead>
          <tbody>
            <tr><td>Single-row transactions only</td><td>No distributed commit; every write is handled by one server</td><td>Secondary indexes and cross-row invariants are the application’s job</td><td>Percolator, Megastore, then Spanner</td></tr>
            <tr><td>One master, off the data path</td><td>Simple placement and balancing logic</td><td>A master failure pauses tablet moves until a new master takes the Chubby lock</td><td>Largely kept; HBase has the same shape</td></tr>
            <tr><td>Dependence on Chubby</td><td>Correct membership and master election without writing consensus code</td><td>If Chubby is down for long, Bigtable is unavailable</td><td>Kept; the paper measures the effect</td></tr>
            <tr><td>One commit log per server</td><td>Sequential writes, fewer files</td><td>Recovery must sort the log before replay</td><td>HBase kept a shared write-ahead log per region server</td></tr>
            <tr><td>Storage in GFS</td><td>Replication and durability come for free; tablets move without copying data</td><td>Every read that misses cache is a remote read</td><td>GFS replaced by Colossus inside Google</td></tr>
          </tbody>
        </table>
      </Tbl>

      <h3>What the authors left out, and what came after</h3>
      <p>
        The paper’s lessons section is worth reading for its candour. The authors say they had planned
        general-purpose transactions and dropped them after finding that most applications needed only
        single-row atomicity, and that the remaining needs, such as secondary indexes, could be met
        with narrower mechanisms. They also describe how many failures in practice were not the clean
        crashes their design assumed: memory and network corruption, large clock skew, hung machines,
        bugs in other systems they depended on. Their advice, to delay a feature until it is clear how
        it will be used, is the reasoning behind the small API.
      </p>
      <p>
        Google’s own later systems show which omissions hurt. Percolator, published in 2010, built
        multi-row transactions on top of Bigtable to let the search index be updated incrementally.
        Megastore, in 2011, added transactions within groups of rows and synchronous replication across
        data centres. Spanner, in 2012, provided externally consistent distributed transactions and a
        SQL interface, and its paper is direct that some teams had found Bigtable hard to use for
        applications needing complex, evolving schemas or strong consistency across regions.
      </p>
      <p>
        Outside Google, HBase reimplemented Bigtable on Hadoop with regions instead of tablets and
        ZooKeeper instead of Chubby. Cassandra combined Bigtable’s data model and storage engine with
        Dynamo’s leaderless replication. Accumulo added cell-level security labels. Google later sold
        Bigtable itself as Cloud Bigtable, with an HBase-compatible API. DynamoDB is a different design
        internally, but its partition key and sort key ask the same question this paper made central:
        which rows will be read together, and where will the writes land?
      </p>
      <p>
        That points to when not to choose this model. If the application needs transactions across
        rows, ad-hoc queries on fields other than the key, or joins, a wide-column store will make the
        team build those features badly in application code. Bigtable suits large data with a small
        number of well-understood access patterns: time series keyed by entity, crawl and event data,
        per-user state, and analytic scans by key range.
      </p>

      <h3>How to read the original</h3>
      <p>
        Read the data model section and the API section first; together they are only a few pages,
        and the Webtable example in them is the best way into the system. Then read the
        implementation section on tablet location, tablet assignment and tablet serving, with the
        failure walk-through above in mind. The refinements section, covering locality groups,
        compression, caching, Bloom filters, the shared commit log and recovery speed-ups, is where
        most of the ideas that other systems copied live, so read it slowly.
      </p>
      <p>
        The performance evaluation measures sequential and random reads and writes and scans as the
        number of tablet servers grows. Do not look for headline numbers; look at how the authors
        explain the curves. Aggregate throughput rises with more servers but far from linearly, and the
        paper attributes this to load imbalance and, for random reads, to fetching a whole SSTable block
        from GFS to return one small value. That explanation tells you more about the system than the
        figures do. Then read the section on real applications, which describes how a handful of
        Google products used the system, and the lessons section, which may be the most useful three
        pages in the paper.
      </p>
      <p>
        The next paper, Kafka, takes the commit log, which Bigtable treats as a recovery detail,
        and makes it the product: a durable, partitioned log that many systems read at their own pace.
      </p>
      <Notes items={[
        'Bigtable is a map from row key, column key and timestamp to bytes, kept sorted by row key and split into tablets by key range.',
        'Atomicity covers one row and no more; indexes, joins and cross-row invariants are left to the application.',
        'The row key is the only index and the only locality control, so key design determines scan cost, compression and write hot spots.',
        'Clients find tablets through a three-level lookup that they cache, which keeps the single master off the data path.',
        'Each tablet server is an LSM-tree over GFS: commit log, memtable, SSTables and minor, merging and major compactions.',
        'Server failure is detected through Chubby locks, and recovery replays a shared commit log after sorting it by tablet.',
      ]} />
    </>
  ),

  /* ────────────────────────────────────────────────────────────────── */
  kafka: (
    <>
      <p>
        At LinkedIn around 2010, every page view, search, profile edit and ad impression produced an
        event, and a growing list of systems wanted those events. The Hadoop warehouse wanted all of
        them for overnight reports. The news feed wanted profile edits within seconds. Search wanted
        them for relevance. Security wanted login events. Operations wanted service metrics. Each new
        consumer meant a new pipeline from each producer, with its own format, its own failure modes
        and its own on-call rotation.
      </p>
      <p>
        The tools available split into two camps, and neither fitted. Log aggregators such as Facebook’s
        Scribe and Cloudera’s Flume collected log files and shipped them to Hadoop in batches, which
        worked for the warehouse and was useless for the feed. Enterprise message queues such as
        ActiveMQ and RabbitMQ delivered individual messages quickly, but the broker tracked the
        delivery state of every message for every consumer, acknowledged each one, and slowed badly
        when messages piled up because a consumer was slow or offline. A website’s event volume, with
        a batch consumer that reads once an hour, is exactly that case.
      </p>
      <p>
        Jay Kreps, Neha Narkhede and Jun Rao described the system they built instead in a short 2011
        paper at the NetDB workshop. After reading this explainer you should be able to say what a
        Kafka broker does and does not remember, trace a message from producer to two independent
        consumer groups, predict what a consumer sees after it crashes, and choose a partition count
        with its consequences in mind.
      </p>

      <h3>Store the log; let consumers keep their place</h3>
      <Fig caption="Before and after. On the left, each producer has a separate pipeline to each consumer that needs its data. On the right, every producer writes once to a shared log and every consumer reads the same history from it.">
        <BeforeKafka />
      </Fig>
      <p>
        The design inverts the queue. In a message queue, the broker’s job is to track messages: which
        consumer has each one, which have been acknowledged, which can be deleted. In Kafka, the
        broker’s job is to store an append-only log and serve byte ranges from it. It does not know
        which messages any consumer has read.
      </p>
      <p>
        A stream of messages of one kind is a topic. A topic is divided into partitions, and each
        partition is a log: an ordered sequence of messages, each identified by its position. In the
        2011 paper that identifier is the message’s byte position in the log, so ids increase but are
        not consecutive, and the next id is the current one plus the message’s length. Later versions
        of Kafka switched to consecutive offsets 0, 1, 2 and so on; we will use those below because
        they are easier to follow.
      </p>
      <p>
        A consumer fetches by asking for “partition 2, starting at offset 118, up to this many bytes”.
        The broker returns that range and forgets the request. The consumer, not the broker, tracks
        where it is, and in the paper it records its offset periodically in ZooKeeper. Messages are
        deleted when they are older than a retention period, commonly days, regardless of whether
        anyone has read them.
      </p>
      <Tbl>
        <table>
          <thead><tr><th>Question</th><th>Message queue (ActiveMQ, RabbitMQ in 2011)</th><th>Kafka log</th></tr></thead>
          <tbody>
            <tr><td>Who tracks what has been read?</td><td>The broker, per message per consumer</td><td>Each consumer group, as one offset per partition</td></tr>
            <tr><td>When is a message deleted?</td><td>When acknowledged</td><td>When older than the retention period</td></tr>
            <tr><td>What does a slow consumer cost the broker?</td><td>Growing per-message state and memory pressure</td><td>Nothing; the data is on disk either way</td></tr>
            <tr><td>Can a new system read last week’s data?</td><td>No, it was deleted on delivery</td><td>Yes, from any offset still retained</td></tr>
            <tr><td>Ordering guarantee</td><td>Varies; per-queue order under conditions</td><td>Order within a partition only</td></tr>
            <tr><td>Delivery guarantee in the paper</td><td>Per-message acknowledgement</td><td>At least once; duplicates possible after a consumer crash</td></tr>
          </tbody>
        </table>
      </Tbl>
      <Callout>
        A Kafka broker remembers messages, not readers. Moving the reading position to the consumer is
        what lets one log serve a real-time feed and an hourly batch job at the same time, and lets a
        new consumer replay history the producers wrote before it existed.
      </Callout>

      <h3>One topic, three partitions, two groups</h3>
      <p>
        Here is the running example. The topic <code>page-views</code> has three partitions. Each
        message is a page view event, and the producer uses the member id as the key. The paper
        allows a producer either to pick a partition at random or to choose one with a partitioning
        function on a key; with a key, a typical function is a hash of the key modulo the number of
        partitions. Suppose member 4711 hashes to partition 1. Every page view by member 4711 is
        appended to partition 1, in the order the producer sent them.
      </p>
      <p>
        Two consumer groups read the topic. The group <code>feed</code> has two consumers and keeps up
        within seconds. The group <code>hadoop</code> runs once an hour and reads everything new since
        its last run. Within a group, each partition is read by exactly one consumer at a time; the
        paper makes the partition the smallest unit of parallelism for exactly this reason, because it
        means consumers in a group never need to coordinate over individual messages. With three
        partitions and two consumers in <code>feed</code>, one consumer owns partitions 0 and 1 and the
        other owns partition 2.
      </p>
      <Fig caption="The page-views topic. Each partition is a numbered log. Each consumer group has its own offset in each partition: feed is a few messages behind, hadoop is hours behind and reads in hourly batches. Neither group affects the other.">
        <PartitionedLog />
      </Fig>
      <p>
        The two groups are completely independent. The broker stores each message once. When{' '}
        <code>feed</code> fetches partition 1 from offset 5,002 and <code>hadoop</code> fetches it from
        offset 1,340, the broker serves two byte ranges from the same file. If <code>hadoop</code> is
        down for a day, nothing on the broker changes except that its offset stops moving. When it
        comes back it starts where it left off, as long as the data is still within retention. A third
        group, say a new fraud detector, can join next month and start from the oldest retained offset.
      </p>
      <p>
        The one ordering guarantee follows from the structure. Member 4711’s page views are all in
        partition 1, partition 1 is an ordered log, and only one consumer in each group reads it, so
        each group sees member 4711’s events in the order they were produced. There is no ordering
        between partitions. An event for member 4711 and an event for member 9000 in partition 2 may be
        processed in either order.
      </p>
      <KafkaSim />
      <p>
        Now change one variable: add consumers to <code>feed</code>. With three consumers, each owns one
        partition and throughput rises. With four, one consumer owns nothing and sits idle, because a
        partition cannot be split between consumers of a group. Try it in the simulation. The partition
        count is therefore a ceiling on a group’s parallelism, and the paper notes that LinkedIn
        deliberately created more partitions than it had consumers so that load would balance well.
      </p>

      <Predict q={<>Keep the example, but the topic now needs more throughput, so the team raises <code>page-views</code> from three partitions to six while producers are running. The producer still uses hash of member id modulo the partition count. What happens to member 4711’s events, and to the ordering guarantee?</>}>
        <p>
          Member 4711’s key hashed to partition 1 under modulo 3. Under modulo 6 it may map to a
          different partition, say 4. Events produced before the change sit in partition 1; events
          after it go to partition 4. A consumer group reading both partitions can process a new event
          for 4711 from partition 4 before an older one still waiting in partition 1. Per-key order is
          broken across the change, though it holds again for events produced afterwards.
        </p>
        <p>
          This is why teams pick a partition count with room to grow when a topic is created, and why
          increasing it on a keyed topic is treated as a migration rather than a setting change. Kafka
          lets you add partitions, but not remove them, and does not move existing data when you do.
        </p>
      </Predict>

      <h3>Why a log on disk can be faster than a queue in memory</h3>
      <p>
        The paper’s performance claims rest on choices that look odd at first. Kafka does not cache
        messages in its own process memory. Each partition is stored as a set of segment files of
        about a gigabyte. New messages are appended to the last segment, which is flushed to disk after
        a configurable number of messages or amount of time; in the paper’s design, consumers only see
        messages once they are flushed. The broker keeps in memory only the offset of the first message
        in each segment, which is enough to find the file for any requested offset.
      </p>
      <p>
        Reads and writes go through the operating system’s page cache instead of an application cache.
        That avoids keeping two copies of the same data in memory, keeps the cache warm when the broker
        process restarts, and keeps the Java heap small so garbage collection stays cheap. Because
        consumers usually read data soon after it is written, most reads are served from the page cache
        without touching disk. A lagging consumer reads from disk, but sequentially.
      </p>
      <p>
        To send data to a consumer, the paper uses the <code>sendfile</code> system call, which copies
        bytes from a file to a network socket inside the kernel. The usual path, read the file into a
        user buffer and then write the buffer to a socket, involves four data copies and two system
        calls; <code>sendfile</code> removes two of the copies and one of the calls. Producers and
        consumers also batch: a producer sends a set of messages in one request and a consumer fetches
        many messages at once. The per-message overhead in Kafka’s storage format is a few bytes, where
        the paper measured ActiveMQ’s at well over a hundred.
      </p>
      <p>
        The evaluation compares Kafka with ActiveMQ and RabbitMQ on a pair of machines with small
        messages. The paper reports that Kafka produced around 50,000 messages a second when sending
        one message per request and around 400,000 with batches of 50, far above the other two, and
        that its consumer was more than four times faster than either. Read those numbers with the
        authors’ own caveats in mind, which they state. The Kafka producer in the test sent
        asynchronously and did not wait for the broker to acknowledge each message, while the other
        systems did. Kafka had no replication at the time, so it was doing less work per message than
        a broker offering stronger guarantees. The comparison shows what a design without per-message
        state can do; it is not a like-for-like durability comparison.
      </p>

      <h3>A consumer crashes mid-batch</h3>
      <p>
        At-least-once delivery is the paper’s guarantee, and it is easiest to understand by watching it
        happen.
      </p>
      <Predict q={<>A consumer in <code>feed</code> owns partition 1. It processes messages and commits its offset every five seconds. Its last commit recorded offset 120, meaning “the next message to read is 120”. It has since processed messages 120 to 134, updating a follower-count cache for each, and then the process is killed. Where does its replacement start, and what happens to the cache?</>}>
        <p>
          The group rebalances, and another consumer takes over partition 1. It reads the last committed
          offset, 120, and starts there. Messages 120 to 134 are processed a second time.
        </p>
        <p>
          Whether that matters depends on the processing. If the consumer sets a field to a value, such
          as “last seen time for member 4711”, repeating it is harmless. If it increments a counter,
          those fifteen events are counted twice. The paper is explicit that duplicates are possible
          after an unclean shutdown and that an application which cares must deduplicate, for example
          using the offset or a unique id carried in the message.
        </p>
      </Predict>
      <p>
        The alternative is to commit the offset before processing. Then a crash after the commit and
        before the work loses messages instead of repeating them, which is at-most-once delivery. The
        paper chose at-least-once because losing events was worse than repeating them for LinkedIn’s
        uses, and because duplicates can be handled downstream while lost data cannot be recovered.
      </p>
      <p>
        The broker side of the 2011 design was weaker still. There was no replication. If a broker
        died, the messages on it that had not been consumed were unavailable until it came back, and if
        its disk was lost they were gone. The paper lists built-in replication as future work. For
        LinkedIn’s first use, activity data headed for analytics, that was an acceptable risk. It would
        not have been acceptable for payments.
      </p>

      <h3>What changed after the paper</h3>
      <p>
        Almost every limitation the paper states was addressed in the following decade, and each fix
        cost some of the original simplicity.
      </p>
      <p>
        Kafka 0.8, in 2013, added replication. Each partition has a leader and followers, and the
        leader tracks the set of in-sync replicas. A producer can ask to be acknowledged only once all
        in-sync replicas have the message. That closed the data-loss gap and introduced settings, such
        as how many replicas must acknowledge and whether an out-of-sync replica may become leader,
        that every operator now has to understand. The same release moved to consecutive offsets.
        Consumer offsets moved from ZooKeeper into an internal Kafka topic shortly after, because
        ZooKeeper was not built for that write rate.
      </p>
      <p>
        Log compaction gave topics a second retention mode: keep at least the latest message for every
        key, instead of everything for a period. A compacted topic can serve as the durable store for a
        table, which is how Kafka Streams keeps its state and how change-data-capture tools publish a
        database’s current rows.
      </p>
      <p>
        Kafka 0.11, in 2017, added idempotent producers and transactions, marketed as exactly-once
        semantics. The idempotent producer attaches a producer id and a per-partition sequence number
        to each batch, so the broker can discard a retried batch it has already written. Transactions
        let a consumer-producer write its output messages and commit its input offsets atomically. In
        our crash example, if the follower-count updates were written to an output topic inside a
        transaction with the offset commit, the replacement would never see them twice. The guarantee
        is precise and narrow: it covers reads and writes within Kafka. If the consumer updates an
        external cache or sends an email, those side effects still need to be idempotent.
      </p>
      <p>
        Finally, ZooKeeper itself was removed. KIP-500 replaced it with KRaft, a Raft-based quorum of
        controllers inside Kafka that stores cluster metadata as, fittingly, a replicated log. KRaft
        was declared production-ready in Kafka 3.3 in 2022, and Kafka 4.0 in 2025 removed ZooKeeper
        mode entirely. Tiered storage, which moves older segments to object storage, and a rewritten
        consumer group protocol have since changed the cost of long retention and of rebalancing.
      </p>

      <h3>When a log is the wrong tool</h3>
      <p>
        The design has costs that follow directly from its strengths. Ordering exists only within a
        partition, so a workflow that needs a global order across all events must use one partition and
        give up parallelism. Parallelism per consumer group is capped by the partition count, and the
        count is hard to change on keyed topics. A slow message blocks the messages behind it in the
        same partition, because a consumer cannot skip ahead without moving its offset past it.
      </p>
      <p>
        That last point matters for task queues. If each message is a job that takes anywhere from a
        second to ten minutes, and jobs are independent, a log forces each consumer to work through its
        partition in order, and one slow job delays everything behind it. A traditional queue that
        hands each message to whichever worker is free, and redelivers it if the worker dies, fits
        better. Kafka has been adding share groups for this case, which is an admission that the
        original model was designed for streams of events, not for distributing work.
      </p>

      <h3>How to read the original</h3>
      <p>
        The paper is short, around seven pages, and readable in one sitting. Read the introduction
        and related work for the problem; the descriptions of why existing queues and log aggregators
        fell short are the clearest statement of the requirements. Then read the architecture section,
        which covers storage, efficient transfer, the stateless broker and distributed coordination
        with consumer groups and ZooKeeper. This is the heart of the paper and most of it is still
        accurate about Kafka today.
      </p>
      <p>
        The delivery guarantees section is a few paragraphs and worth reading word for word, because
        it says plainly what Kafka did not promise. The section on LinkedIn’s deployment describes the
        cluster layout, the replication to an analytics data centre by consumers, the auditing system
        that counts messages per time window to detect loss, and the use of Avro with a schema
        registry. In the evaluation, read the paragraphs that explain why Kafka was faster as closely
        as the figures, and note the asynchronous producer and the absence of replication. Then read
        Jay Kreps’s 2013 essay “The Log”, listed below, which turns the paper’s mechanism into a
        general argument about how data systems should be built.
      </p>
      <p>
        This closes the databases category. Codd separated what data means from how it is stored;
        ARIES made the log the record of truth for a single database; the LSM-tree and Bigtable turned
        that log into the storage layout; and Kafka made the log something many systems share. The
        next category, Cloud &amp; Infrastructure, starts with the Google File System, the layer
        Bigtable stored every SSTable and commit log in, and asks how a file system should behave when
        it expects its disks to fail every day.
      </p>
      <Notes items={[
        'A Kafka broker stores partitioned append-only logs and serves ranges of them; it does not track which consumer has read what.',
        'Each consumer group keeps its own offset per partition, so groups with very different speeds read the same data without affecting each other.',
        'Messages with the same key go to the same partition and are read in order; there is no ordering across partitions.',
        'A partition is read by one consumer per group, so the partition count caps a group’s parallelism and is hard to change on keyed topics.',
        'Committing offsets after processing gives at-least-once delivery, so a crash causes reprocessing from the last committed offset.',
        'Replication, idempotent producers, transactions and KRaft came later; exactly-once covers Kafka reads and writes, not external side effects.',
      ]} />
    </>
  ),
}
