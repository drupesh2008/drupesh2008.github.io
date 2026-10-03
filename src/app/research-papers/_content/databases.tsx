/**
 * Databases & Storage — five explainers, problem first. Keyed by paper id.
 */
import type { ReactNode } from 'react'
import { Callout, Fig, Tbl } from '@/components/Pathway/Pathway'
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
      <h3>The problem: programs that knew too much</h3>
      <p>
        In 1970 a database was a set of records chained together by pointers on disk, and a program
        read it by navigating: start at a department record, follow the pointer to its first
        employee, follow the next-pointer to the second, stop when the name matches. The two
        dominant designs, IBM’s hierarchical IMS and the CODASYL network model, differed in the
        shapes of the chains but agreed on the premise that the application should know how the
        data was laid out.
      </p>
      <Fig caption="Navigating a 1969 database. The program embodies the storage layout: the order of the chains, which record owns which. Reorganise the disk and every program has to change.">
        <PointerChase />
      </Fig>
      <p>
        The cost showed up the moment anything changed. Add an index, split a file, reorder a chain
        for performance, and every program that navigated it broke, because the navigation was the
        program. Different programs stored the same fact in several places and let them drift apart.
        Asking a new question meant writing a new navigation. Edgar Codd, a mathematician at IBM,
        thought the whole arrangement had the layers backwards.
      </p>

      <h3>The idea: describe the data, not the path to it</h3>
      <p>
        Codd proposed that users see data as nothing but <strong>relations</strong>: tables of rows,
        each row a tuple of values drawn from named domains, with no ordering, no duplicates, and no
        pointers. Records relate to each other by containing the same value, the way an employee row
        and a department row both contain “ENG”. The storage engine may keep the tables however it
        likes, with whatever indexes and chains it finds efficient, and may change its mind
        tomorrow; the user’s view does not move. He called this <strong>data independence</strong>,
        and it is the paper’s real subject.
      </p>
      <Fig caption="The same facts as two tables. Nothing points at anything; the relationship is the shared value in the dept column, and finding matches is the database’s job.">
        <JoinByValue />
      </Fig>
      <Callout>
        Separate what the data means from how it is stored. Then the questions can be written in a
        language about meaning, the storage can be changed without touching the questions, and a
        machine can choose the best way to answer each one.
      </Callout>

      <h3>How it works</h3>
      <p>
        Having defined the view, Codd defined the operations on it, and this is why the paper is
        mathematics rather than opinion. A handful of operators take relations and return relations:
        select rows that satisfy a condition, project onto some of the columns, join two tables on
        equal values, and a few more. Because each result is again a table, operations compose, and
        a question of any complexity is an expression. SQL, which arrived a few years later, is a
        friendlier spelling of this <strong>relational algebra</strong>.
      </p>
      <RelationalAlgebra />
      <p>
        The paper also starts the discipline of <strong>normalisation</strong>. Codd insists that
        every value be atomic, no lists inside a cell, so that the operators have something uniform
        to work on, and he shows how to decompose a relation that carries repeating groups into
        several that do not. Redundancy and the inconsistencies it breeds, the practical disease of
        the pointer databases, become a property you can reason about and remove.
      </p>
      <p>
        One more consequence falls out and turned into an industry: if a query says what rather than
        how, something has to decide how. That something is the <strong>query optimiser</strong>, and
        the decades of work on it, from System R’s cost-based planner onward, exist because the
        relational model left a gap exactly its shape.
      </p>

      <h3>What it changed</h3>
      <p>
        IBM was slow to act on its own researcher’s idea, since it sold IMS, but the System R project
        built the first serious prototype and invented SQL in the process; Berkeley’s Ingres became
        the lineage that leads to Postgres; a small company called Relational Software shipped the
        first commercial product in 1979 and renamed itself Oracle. Codd received the Turing Award
        in 1981. For forty years the relational model has absorbed every challenger: object
        databases in the 1990s, XML stores in the 2000s, and the NoSQL systems of the 2010s, most of
        which have since added a SQL dialect of their own.
      </p>

      <h3>Where you meet it today</h3>
      <ul>
        <li><strong>Every SQL database</strong>, and the query planners in them: an <code>EXPLAIN</code> output is the optimiser choosing a path on your behalf.</li>
        <li><strong>NoSQL growing tables.</strong> Cassandra’s CQL, DynamoDB’s PartiQL and MongoDB’s aggregation pipelines are the relational operators returning under other names.</li>
        <li><strong>Data lakes.</strong> Spark SQL, Trino and BigQuery run relational algebra over files; the model outlived the storage it was invented for.</li>
        <li><strong>Schema design.</strong> Normal forms, foreign keys and the question “is this value stored twice?” are Codd’s questions.</li>
      </ul>
    </>
  ),

  /* ────────────────────────────────────────────────────────────────── */
  aries: (
    <>
      <h3>The problem: fast, or safe, pick one</h3>
      <p>
        A database makes two promises that fight each other. A committed transaction must survive a
        crash: the moment the client is told “done”, the change is permanent even if the power fails
        a microsecond later. And an uncommitted transaction must leave no trace: if the crash comes
        mid-way, its half-written changes must vanish. The simple ways to keep those promises are
        slow. Forcing every changed page to disk at commit makes commit as slow as the disk; refusing
        to write any uncommitted page to disk means a big transaction cannot use the buffer pool
        at all.
      </p>
      <p>
        High-performance engines want the opposite policies, which the literature calls{' '}
        <strong>steal</strong> and <strong>no-force</strong>: let dirty pages reach disk whenever
        the buffer manager likes, even before commit, and let commit return before any data page is
        written. Both are fine for throughput and both make recovery hard, because after a crash the
        disk may hold uncommitted changes that must be undone and lack committed changes that must
        be redone. By 1992 every vendor had a recovery scheme; most were slow, limited, or quietly
        wrong in corner cases. ARIES, from IBM’s Almaden lab, is the one that became the standard.
      </p>

      <h3>The idea: write it down first, then repeat history</h3>
      <p>
        The foundation is <strong>write-ahead logging</strong>. Every change is described in a log
        record, with the values before and after, and the record is appended to a sequential log
        before the page it describes may be written to disk. Commit means the log is durable up to
        the commit record, nothing more. The log is cheap because it is sequential, and it is
        complete because nothing happens that it does not describe.
      </p>
      <Fig caption="The two rules. A page may be written only after the log records that explain it; a commit is acknowledged only after the log is on disk. Pages themselves are written whenever convenient, or never.">
        <WalRule />
      </Fig>
      <Callout>
        After a crash, first put the database back exactly where it was at the moment of failure by
        replaying the log, uncommitted work included, and only then undo the transactions that had
        not committed. Repeating history before undoing it is what makes everything else in ARIES
        simple and correct.
      </Callout>

      <h3>How it works</h3>
      <p>
        Every log record has a <strong>log sequence number</strong>, and every page carries the LSN
        of the last record applied to it. That one field answers the question recovery asks
        thousands of times: has this change reached this page? If the page’s LSN is older than the
        record, apply it; if not, skip. Recovery runs three passes over the log.
      </p>
      <Fig caption="The three passes. Analysis rebuilds the tables of live transactions and dirty pages from the last checkpoint; redo replays forward from the oldest dirty page; undo walks the losers backwards.">
        <RecoveryPasses />
      </Fig>
      <ol>
        <li><strong>Analysis</strong> reads forward from the last checkpoint to find which transactions were in flight and which pages might be dirty.</li>
        <li><strong>Redo</strong> reads forward and re-applies every change whose page lacks it, no matter whose transaction it was. The database is now exactly as it was at the crash.</li>
        <li><strong>Undo</strong> reads backward through the loser transactions and reverses each change, writing a <strong>compensation log record</strong> for every step. A CLR records that the undo happened and points at the next record to undo, so if the system crashes during recovery, the next recovery skips the work already done instead of undoing an undo.</li>
      </ol>
      <AriesSim />
      <p>
        The compensation records are the part that justifies the long title. Because undo is logged
        and never repeated, a transaction can be rolled back partially to a savepoint, locks can be
        taken on individual records rather than whole pages (two transactions may update different
        rows on one page, and recovery still sorts them out), and checkpoints can be taken while the
        system is running rather than halting everything. These were the features the vendors
        wanted and could not get from earlier schemes.
      </p>

      <h3>What it changed</h3>
      <p>
        ARIES is in IBM’s DB2, in Microsoft SQL Server, and in spirit in Oracle; MySQL’s InnoDB keeps
        separate redo and undo logs on the same principles. PostgreSQL uses write-ahead logging but
        skips the undo pass, because its multi-version storage never overwrites a row in place and
        an uncommitted row version is simply invisible. SQLite’s WAL mode is the same idea at the
        scale of a phone. More broadly, the paper made “the log is the truth and the pages are a
        cache of it” the default mental model, which the next three papers on this list each take
        somewhere new.
      </p>

      <h3>Where you meet it today</h3>
      <ul>
        <li><strong>Every database you run.</strong> <code>fsync</code> latency on the log is your commit latency; this is why the log goes on the fastest disk.</li>
        <li><strong>Replication.</strong> Shipping the WAL to a replica is how Postgres streaming replication and MySQL binlog replication work; the log was already the complete story.</li>
        <li><strong>Change data capture.</strong> Debezium and friends read the same log to turn a database into an event stream.</li>
        <li><strong>Embedded stores.</strong> RocksDB, etcd and SQLite all write a WAL before anything else; the design is the same whether the database is a cluster or a file.</li>
      </ul>
    </>
  ),

  /* ────────────────────────────────────────────────────────────────── */
  'lsm-tree': (
    <>
      <h3>The problem: a disk arm cannot keep up with inserts</h3>
      <p>
        The paper’s motivating example is a bank’s transaction history: every account movement
        appended to a table that must also be searchable by account. A B-tree index handles the
        search beautifully and the inserts terribly, because each new record lands on an effectively
        random leaf page, and a random write on a 1996 disk means moving the arm, which costs about
        ten milliseconds. A busy system generating thousands of inserts a second was paying for a
        seek on every one. Meanwhile the same disk could stream hundreds of megabytes a second
        sequentially. The hardware was fast; the access pattern was wrong.
      </p>
      <Fig caption="Seven updates. In place, each one is a seek; appended, they are one sequential burst and the sorting is deferred. The ratio between those costs is the entire argument.">
        <WriteVsAppend />
      </Fig>

      <h3>The idea: never write in place; sort later, in bulk</h3>
      <p>
        O’Neil and colleagues proposed keeping the newest data in a small in-memory tree (C0) and
        the bulk on disk in a larger tree (C1), and never inserting into C1 directly. When C0 fills,
        a <strong>rolling merge</strong> streams its contents into C1 in sorted order, rewriting C1’s
        pages sequentially like the merge step of a merge sort. Inserts cost a memory operation and
        an amortised share of a sequential merge; the random seek is gone. Add more levels, each
        roughly ten times larger than the one above, and the merges stay cheap all the way down.
      </p>
      <Fig caption="The modern form. Writes go to a memtable; full memtables are flushed as immutable sorted runs; compaction merges runs into larger, older levels. Reads check the levels from newest to oldest.">
        <LsmLevels />
      </Fig>
      <Callout>
        Trade read cost for write cost deliberately. An update-in-place tree pays the full cost of
        placing every record at write time; a log-structured tree pays a little at write time and
        the rest later, in large sequential batches, when the disk is best at it.
      </Callout>

      <h3>How it works</h3>
      <p>
        In today’s engines the components have names the paper did not use but the structure is
        the same. Writes are appended to a log for durability and inserted into a sorted{' '}
        <strong>memtable</strong>. When the memtable reaches a few megabytes it is written out as an{' '}
        <strong>SSTable</strong>, a sorted, immutable file with an index. Runs accumulate in level 0;{' '}
        <strong>compaction</strong> merges them with the level below, discarding versions that have
        been overwritten or deleted. A read checks the memtable, then each level in turn, and would be
        slow if it had to open every run, so every run carries a <strong>Bloom filter</strong>, a
        tiny bitmap that says “definitely not here” for almost every key it does not contain.
      </p>
      <LsmSim />
      <p>
        The costs do not vanish, they move. Each record is rewritten once per level during
        compaction, so a store with five levels writes every byte several times:{' '}
        <strong>write amplification</strong>. A key may exist in several runs until compaction
        catches up: <strong>space amplification</strong>. And a read may consult several runs:{' '}
        <strong>read amplification</strong>. Levelled and tiered compaction strategies are
        different points in that triangle, and tuning them is most of what operating an LSM store
        consists of.
      </p>
      <Tbl>
        <table>
          <thead><tr><th>cost</th><th>B-tree (in place)</th><th>LSM-tree</th></tr></thead>
          <tbody>
            <tr><td>write</td><td>a random page write per update</td><td>an append; sequential merges later</td></tr>
            <tr><td>point read</td><td>one tree descent</td><td>memtable, then runs filtered by Bloom filters</td></tr>
            <tr><td>range scan</td><td>leaves in order</td><td>merge across runs on the fly</td></tr>
            <tr><td>space</td><td>pages half-empty after splits</td><td>stale versions until compaction</td></tr>
          </tbody>
        </table>
      </Tbl>

      <h3>What it changed</h3>
      <p>
        The paper waited a decade for its moment. Bigtable put an LSM-tree under Google’s storage
        in 2006; Google engineers extracted that engine as LevelDB in 2011; Facebook forked it into
        RocksDB, which now sits beneath CockroachDB, TiKV, MySQL’s MyRocks, Kafka Streams state
        stores and much of Meta. Cassandra, HBase, ScyllaDB and InfluxDB are LSM-trees with
        different compaction policies. Solid-state drives changed the arithmetic, since they have no
        arm to move, but they still prefer sequential writes and wear out faster under random
        ones, so the design kept winning.
      </p>

      <h3>Where you meet it today</h3>
      <ul>
        <li><strong>Almost every new storage engine</strong> since 2010: RocksDB, LevelDB, Pebble, Cassandra, HBase, ScyllaDB, Badger.</li>
        <li><strong>Compaction stalls.</strong> The latency spike at 2 a.m. in a write-heavy service is often the LSM paying its deferred bill.</li>
        <li><strong>Bloom filters</strong> appeared in production because of this structure and are now a standard tool anywhere a “definitely not” answer is cheap and useful.</li>
        <li><strong>Deletes that do not free space.</strong> A delete in an LSM store is a tombstone record until compaction; this surprises everyone once.</li>
      </ul>
    </>
  ),

  /* ────────────────────────────────────────────────────────────────── */
  bigtable: (
    <>
      <h3>The problem: one storage system for everything Google had</h3>
      <p>
        By 2004 Google needed to store the raw crawl of the web, hundreds of terabytes of pages
        updated continuously; the satellite imagery of Google Earth; the click-streams of Google
        Analytics; and the per-user data of personalised search. Some workloads were throughput
        bound, streaming through billions of rows in batch. Others served a user who was waiting.
        No commercial database would scale to thousands of machines at an affordable price, and a
        file system alone, even one as good as GFS, offered no structure, no indexing and no way to
        update one row among billions.
      </p>

      <h3>The idea: a sparse, sorted map, split by row range</h3>
      <p>
        Bigtable is deliberately not a relational database. It is one enormous map from a key to a
        value, where the key is a row name, a column name and a timestamp, and the value is bytes.
        Rows are kept in sorted order by name; a contiguous range of rows is a{' '}
        <strong>tablet</strong>, the unit that gets spread across machines. Columns are grouped into
        a small number of <strong>column families</strong> declared in advance, within which any
        column name may be used without declaration, so the table is sparse: a row stores only the
        columns written to it. Each cell can hold several versions, by timestamp, with a policy for
        how many to keep.
      </p>
      <Fig caption="The data model. Rows sorted by key, a few declared column families, unlimited columns inside each, and timestamped versions in every cell. Row keys that sort together are stored together.">
        <BigtableModel />
      </Fig>
      <Callout>
        Because rows are stored in key order, the row key is the only index and the only locality
        control. Designing the key so that the data you read together sorts together is the entire
        art of using Bigtable, and of every wide-column store that copied it.
      </Callout>

      <h3>How it works</h3>
      <p>
        A single <strong>master</strong> assigns tablets to <strong>tablet servers</strong> and
        balances them, but is not on the read or write path: clients find the right tablet server
        through a three-level lookup (a root tablet, located via Chubby, that lists metadata tablets,
        that list user tablets) and cache the result, so the master is rarely contacted. Each
        tablet server keeps recent writes in a memtable and the rest in SSTables on GFS, with a
        commit log also on GFS: this is the LSM-tree from the previous paper, made distributed and
        with compactions called minor, merging and major. Locks, master election and the bootstrap
        location live in <strong>Chubby</strong>, Google’s Paxos-based lock service, which is also
        how a tablet server proves it is alive.
      </p>
      <Fig caption="The pieces. Clients go straight to tablet servers; the master assigns and balances; Chubby holds the locks and the root location; GFS stores every SSTable and log with three copies.">
        <TabletServing />
      </Fig>
      <BigtableKeys />
      <p>
        Two design choices are worth noticing because of what they refuse. Bigtable offers
        transactions on a single row and nothing wider, and it does not try to hide replication
        lag between data centres; the paper argues that most of its users were happier with a
        simple, predictable model than with features they would pay for on every operation. Spanner
        was the eventual answer for the users who were not.
      </p>

      <h3>What it changed</h3>
      <p>
        Bigtable defined the wide-column category. HBase reimplemented it on Hadoop within a year
        and became the store under Facebook Messenger and much of the Hadoop ecosystem; Cassandra
        combined its data model with Dynamo’s ring; the SSTable and memtable design, extracted as
        LevelDB and then RocksDB, became the most reused storage engine in the world. Google sells
        the system itself as Cloud Bigtable. Row-key design, the one skill the paper demands of its
        users, is now the central question in any schema review for DynamoDB, Cassandra or HBase.
      </p>

      <h3>Where you meet it today</h3>
      <ul>
        <li><strong>HBase, Cassandra, ScyllaDB, Cloud Bigtable.</strong> Tablets became regions or ranges; the model is the paper’s.</li>
        <li><strong>DynamoDB’s partition key and sort key.</strong> A different system with the same lesson: the key decides locality and hot spots.</li>
        <li><strong>Time-series layouts.</strong> Keys like <code>sensor#reversed-timestamp</code> that put the newest readings first are a Bigtable idiom.</li>
        <li><strong>Column families</strong> as a way to store hot and cold data of one entity on different disks, now in RocksDB under the same name.</li>
      </ul>
    </>
  ),

  /* ────────────────────────────────────────────────────────────────── */
  kafka: (
    <>
      <h3>The problem: everyone wanted every event, and each got their own pipe</h3>
      <p>
        LinkedIn in 2010 generated a torrent of activity data (page views, searches, profile edits,
        ad impressions) and a torrent of operational metrics, and a growing list of systems wanted
        all of it: the Hadoop warehouse for analytics, the search index for relevance, the news
        feed, security monitoring, dashboards. Each consumer was wired to each producer with its own
        pipeline, and the pipelines fell into two families that were each wrong in their own way.
        Log aggregators like Scribe and Flume shipped files to Hadoop in batches and were useless for
        anything real time. Message queues like ActiveMQ delivered individual messages with
        per-message acknowledgements and brokers that tracked the state of every message, and fell
        over at the throughput a website produces.
      </p>
      <Fig caption="N producers and M consumers. On the left, every pair is a pipeline with its own format and failures. On the right, one durable log in the middle, written once and read by anyone, at their own pace.">
        <BeforeKafka />
      </Fig>

      <h3>The idea: a durable, partitioned log that consumers read at their own pace</h3>
      <p>
        Kafka’s authors kept the one thing databases had learned (the previous two papers on this
        list) and discarded what message queues assumed. A topic is a set of{' '}
        <strong>partitions</strong>; each partition is an append-only log on disk, and a message’s
        position in it is its <strong>offset</strong>. The broker remembers nothing about who has
        read what. Consumers pull messages and keep their own offset, so a slow consumer costs the
        broker nothing, a crashed consumer resumes from where it was, and a brand-new system can
        start from offset zero and replay weeks of history. Messages are kept for a configured
        time regardless of consumption. The log, not the message, is the unit of design.
      </p>
      <Fig caption="A topic with three partitions. Each is a numbered log; each consumer group owns a position in each partition. The real-time group is nearly caught up; the batch group reads hourly and is hours behind. Neither affects the other.">
        <PartitionedLog />
      </Fig>
      <Callout>
        Move the state to the edges. A broker that only appends and serves ranges of an immutable
        log can use the disk and the operating system the way they want to be used, and the
        consumers can be as many, as slow and as different as the business needs.
      </Callout>

      <h3>How it works</h3>
      <p>
        Everything in the design serves throughput. A partition is a set of segment files that
        are only ever appended, so writes are sequential. Reads rely on the operating system’s page
        cache instead of an in-process cache, which survives broker restarts, and use the{' '}
        <code>sendfile</code> system call to move bytes from disk to the network socket without
        passing through the application at all. Producers batch messages and choose a partition,
        usually by hashing a key, which gives the one ordering guarantee Kafka makes: messages with
        the same key, in the same partition, are delivered in the order they were written.
      </p>
      <KafkaSim />
      <p>
        Consumers organise into <strong>groups</strong>. Every partition of a topic is read by
        exactly one member of each group, so a group scales out to the number of partitions and no
        further, and two groups reading the same topic are entirely independent. The paper’s
        benchmarks against ActiveMQ and RabbitMQ showed roughly an order of magnitude more
        throughput for both producing and consuming, with messages batched and nothing acknowledged
        individually. At-least-once delivery was the guarantee; exactly-once, through idempotent
        producers and transactions, came six years later.
      </p>

      <h3>What it changed</h3>
      <p>
        Kafka was open-sourced the year the paper appeared and became the default spine of data
        infrastructure: the thing every service writes to and every warehouse, index, cache and
        stream processor reads from. Jay Kreps’s essay “The Log”, written two years later,
        generalised the paper into an argument about system design that is still assigned reading.
        Change-data-capture tools turned database logs into Kafka topics; Kafka Streams and Flink
        turned the topics back into tables; event sourcing made the log the primary record. Rivals
        such as Pulsar, Redpanda and Kinesis compete on operations and cost, not on the model.
      </p>

      <h3>Where you meet it today</h3>
      <ul>
        <li><strong>Kafka itself</strong>, in most companies above a certain size, and its hosted forms.</li>
        <li><strong>Consumer lag</strong> as the health metric of a data platform: the offset diagram above, as a dashboard.</li>
        <li><strong>Replay as a feature.</strong> Rebuilding a search index or a cache from the log, instead of from a backup, is now expected.</li>
        <li><strong>Ordering per key.</strong> Any system that promises “events for one user arrive in order” is making Kafka’s promise with Kafka’s mechanism, a partition chosen by key.</li>
      </ul>
    </>
  ),
}
