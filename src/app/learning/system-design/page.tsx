import type { Metadata } from 'next'
import Pathway, { Callout, Fig } from '@/components/Pathway/Pathway'
import { RequestAnatomy, BTreeVsLsm, TheLog } from './diagrams'

export const metadata: Metadata = {
  title: 'System Design — a free pathway from zero to professional',
  description:
    'Requests, caching, storage engines, transactions, streams and failure — a staged free course from one server to a defensible architecture, with curated further reading at every stage.',
}

export default function SystemDesignPage() {
  return (
    <Pathway
      trackId="system-design"
      sections={{
        /* ── Stage 1 ─────────────────────────────────────────────── */
        request: (
          <>
            <p>
              Strip any architecture back far enough and one picture remains: a request crossing a
              short chain of boxes, spending time in each. System design is the discipline of
              choosing those boxes deliberately — and the fastest way to make it concrete is to
              follow one request and write down what every hop costs.
            </p>
            <Fig caption="Fig 1 · The chain — every design conversation is really about this picture">
              <RequestAnatomy />
            </Fig>
            <p>
              DNS resolves a name, usually from cache. A load balancer terminates TLS and picks a
              healthy server, for two reasons that will recur all course long: <em>spreading load</em>{' '}
              and <em>surviving the loss of any one machine</em>. Your application does its work,
              consults a cache, falls through to a database. Client to answer, perhaps 40
              milliseconds — of which your code is often the cheapest line.
            </p>
            <p>
              Two habits turn this picture into a method. First, the <strong>latency budget</strong>:
              give the whole request a number, then make the hops fit inside it. A 200 ms budget
              spends fast against Foundations’ ladder — one cross-region call and half of it is
              gone. Budgets convert “make it fast” into decisions: cache this, co-locate that, drop
              the extra hop.
            </p>
            <p>
              Second, design at the <strong>percentiles</strong>, not the average. The median
              request tells you nothing about the experience; the p99 is where timeouts, retries and
              angry users live — and in a page that fans out to twenty services, nearly every user
              touches somebody’s p99. Averages are for dashboards; tails are for design.
            </p>
            <Callout>
              Numbers first, boxes second. An architecture you cannot attach a budget to is a
              drawing, not a design.
            </Callout>
          </>
        ),

        /* ── Stage 2 ─────────────────────────────────────────────── */
        reads: (
          <>
            <p>
              Growth arrives read-first. Most systems serve tens or hundreds of reads for every
              write, so the first real architecture almost every product grows is the same one: put
              the answers people keep asking for somewhere cheaper than computing them again. A
              cache is Foundations’ latency ladder, used as a tool — copy hot data a few rungs up.
            </p>
            <p>
              The mechanics are layered like the ladder itself. The browser caches responses; a CDN
              caches them at the network edge, which works because it removes <em>distance</em>, not
              work; a memory cache like Redis sits in front of the database holding hot keys at
              microsecond cost; the database caches pages underneath it all. Each layer answers some
              fraction of traffic so the layer below sees only what got through. The <strong>hit
              rate</strong> is the number that matters: at 99% the database sees a hundredth of the
              read load — and if a deploy resets the cache, it sees all of it at once, which is how
              a “cache blip” becomes an outage. Warm-up is part of the design.
            </p>
            <p>
              The hard part is not storing the copies; it is that copies go stale — this is
              replication lag from the Distributed Systems pathway wearing a cheaper suit. There is
              a reason the joke says cache invalidation is one of the two hard problems. In
              practice you choose per data class: a <strong>TTL</strong> where bounded staleness is
              fine (a profile, minutes old, harmless), <strong>explicit invalidation</strong> on
              write where staleness bites, versioned keys where you would rather never argue with a
              stale copy at all. Write down the tolerable staleness for each kind of data and the
              policy usually chooses itself.
            </p>
            <p>
              When one database still cannot carry the writes and residual reads, work splits two
              ways: <strong>vertically</strong>, by giving different jobs their own stores (search
              to a search index, sessions to a key-value store), and <strong>horizontally</strong> —
              sharding — which is powerful enough and sharp enough to wait for Stage 5.
            </p>
            <Callout>
              Every cache is a bet that yesterday’s answer is still good. Price the bet explicitly:
              how stale is acceptable, and what does being wrong cost?
            </Callout>
          </>
        ),

        /* ── Stage 3 ─────────────────────────────────────────────── */
        storage: (
          <>
            <p>
              Sooner or later the box marked “database” has to open. Inside, nearly every store you
              will ever meet is one of two machines — and knowing which one you are holding lets you
              predict its behaviour instead of discovering it in production.
            </p>
            <Fig caption="Fig 2 · Two families, opposite bets — the read-optimised tree and the write-optimised log of runs">
              <BTreeVsLsm />
            </Fig>
            <p>
              The <strong>B-tree</strong> — Postgres, MySQL, most of the relational world — keeps
              data in sorted pages arranged as a shallow, wide tree. Any key is a few page reads
              away, and updates happen in place. It is the read-optimised bet, and the steady,
              predictable default the industry has trusted for fifty years.
            </p>
            <p>
              The <strong>LSM tree</strong> — RocksDB, Cassandra, the engines under most modern
              write-heavy systems — refuses to update in place. Writes append to a memory table that
              flushes to sorted, immutable runs; background <em>compaction</em> merges runs so reads
              stay sane. Writes are as fast as appending gets. The bill arrives elsewhere: reads may
              consult several levels, and compaction rewrites data repeatedly — <strong>write
              amplification</strong> — burning I/O the workload never explicitly asked for.
            </p>
            <p>
              Same data, opposite bets: read-heavy and update-in-place favours the B-tree;
              ingest-heavy, append-mostly favours the LSM. Say it from the workload’s read/write mix
              and you will be right more often than the benchmark pages are.
            </p>
            <p>
              On top of either engine sits the tool you will actually reach for weekly: the{' '}
              <strong>secondary index</strong> — another sorted structure, keyed by the column you
              search, pointing at the rows. Reads stop scanning; every write now maintains one more
              structure. That is the entire economics of indexing: buy reads, pay on writes — and it
              explains both the missing index behind most slow queries and the write-throughput
              cliff behind an over-indexed table. Learn to read a query plan and the database stops
              being a mood and becomes a machine.
            </p>
            <Callout>
              A slow query is a claim about physical layout. The plan tells you what the engine
              actually did — read it before you guess.
            </Callout>
          </>
        ),

        /* ── Stage 4 ─────────────────────────────────────────────── */
        writes: (
          <>
            <p>
              Reads can be a little stale and nobody dies. Writes are where the money moves, and
              they fail in a distinctive way: not by being slow, but by being <em>interleaved</em>.
              Two requests, each correct alone, land on the same rows at the same time — the lost
              update from Foundations, now with a balance attached.
            </p>
            <p>
              The database’s offer is the <strong>transaction</strong>: a group of operations that
              commits or vanishes as one (atomicity) and survives what it commits (durability —
              bought with a write-ahead log and that <code>fsync</code> discipline from
              Foundations). The subtle clause is the <strong>I</strong>: isolation, the rules for
              what concurrent transactions may see of each other. It comes in degrees, and the
              degree you run at silently decides which bugs are possible.
            </p>
            <p>
              Full <em>serializability</em> — the system behaves as if transactions ran one after
              another — is the guarantee everyone assumes they have. Almost nobody runs it.
              Real defaults sit lower: read committed, or snapshot isolation, where each transaction
              sees a consistent photograph of the database. Snapshots feel safe and are <em>almost</em>{' '}
              serializable — the classic escape is <strong>write skew</strong>: two doctors check
              the on-call roster (two are listed), each removes themselves in parallel, both
              transactions read a valid snapshot, both commit, the roster is empty. No conflict was
              detected because neither wrote what the other read — the reads were the constraint.
            </p>
            <p>
              The professional posture is not “crank everything to serializable” — it is to know the
              anomalies your level permits and decide, per invariant, whether you care. Where you
              do: <code>SELECT … FOR UPDATE</code>, a constraint the database enforces, or
              serializable for that one transaction. Where you cannot afford blocking, optimistic
              concurrency — version each row, retry on conflict — which is idempotency’s close
              cousin from the Distributed Systems pathway.
            </p>
            <p>
              One boundary to respect: all of this is <em>one database’s</em> promise. The moment an
              operation spans two systems — a row here, a message there — no isolation level covers
              the pair. That gap has its own tools, and they arrive in the next stage.
            </p>
            <Callout>
              Find out the isolation level your database actually defaults to, then name the
              anomaly it permits that would hurt you most. That one sentence is worth more than any
              acronym recital.
            </Callout>
          </>
        ),

        /* ── Stage 5 ─────────────────────────────────────────────── */
        streams: (
          <>
            <p>
              Somewhere past the first million users, two pressures arrive together. Writes outgrow
              one machine, so you <strong>shard</strong> — split data by key across many databases,
              inheriting a routing layer, hot keys, and the loss of cross-shard transactions (Stage
              4’s boundary, now everywhere). And every write starts owing side effects: update the
              search index, invalidate the cache, notify a service. Doing all of that synchronously
              in the request makes the user wait on your bookkeeping; doing it “later, somehow”
              loses updates the first bad day.
            </p>
            <p>
              The instrument that tames both pressures is embarrassingly old:{' '}
              <strong>the append-only log</strong>. Producers append records; the log assigns each a
              position; consumers read at their own pace, remembering only their offset.
            </p>
            <Fig caption="Fig 3 · The log — one ordered history, many readers, replay for free">
              <TheLog />
            </Fig>
            <p>
              Three properties fall out at once. Producers and consumers are <em>decoupled</em> — a
              slow indexer delays nobody, its offset just lags. History is <em>replayable</em> —
              rewind an offset and rebuild a cache or backfill a new service from the same events.
              And order within a partition is <em>settled once</em>, by the log, instead of
              re-argued by every consumer — the Distributed Systems pathway taught why that is
              precious. This is the shape under Kafka, database replication, and event sourcing
              alike; the famous essay in this stage’s reading argues, credibly, that it is the
              unifying abstraction of the whole field.
            </p>
            <p>
              The log also closes Stage 4’s gap. “Commit the row, then publish the event” — a crash
              between the two either loses the event or invents one. The workable patterns make one
              write the source of truth: the <strong>outbox</strong> (write the event into the same
              database transaction as the row, ship it to the log afterwards) or{' '}
              <strong>change data capture</strong> (treat the database’s own replication log as the
              event stream). Consumers still see at-least-once, so handlers stay idempotent —
              distributed systems Stage 1, permanently on duty.
            </p>
            <Callout>
              When a workflow spans systems, decide which single write is the moment of truth and
              derive everything else from it, asynchronously. Trying to make two systems agree
              simultaneously is how workflows lie.
            </Callout>
          </>
        ),

        /* ── Stage 6 ─────────────────────────────────────────────── */
        failure: (
          <>
            <p>
              Everything so far designed the success path. Professionals are distinguished by the
              other one — because at scale, failure is not an event, it is a <em>rate</em>. Some
              request is timing out right now. The design question is never “will it fail?” but
              “what happens next, and how far does it spread?”
            </p>
            <p>
              Start by defining “working” as a number: an <strong>SLO</strong> — say, 99.9% of
              requests succeed within 300 ms over 30 days. The complement is the{' '}
              <strong>error budget</strong>: the 0.1% you are allowed to burn. Budgets turn
              reliability from a virtue into an economy — burn too fast and you slow releases;
              running miles under budget suggests you are paying for more caution than users can
              notice. Alert on burn rate, not on every blip.
            </p>
            <p>
              Then study how failures travel, because the worst outages are not big failures — they
              are small ones <em>amplified by the system’s own defences</em>. A dependency slows;
              callers time out and retry; traffic triples on a service already drowning; its queue
              grows until every request waits longer than its caller’s timeout, so all work is both
              done and thrown away. The load balancer, seeing unhealthiness, concentrates traffic on
              the survivors and drowns them too. Nothing in that story except the first sentence is
              the dependency’s fault.
            </p>
            <p>
              The counter-tools are standard and mostly about <em>refusing early</em>: budgeted
              timeouts that shrink down the call chain; retries with exponential backoff, jitter and
              a cap; <strong>circuit breakers</strong> that stop calling what keeps failing;
              bounded queues and load shedding, because a fast “no” protects the “yes” for everyone
              else; <strong>backpressure</strong> so slowness propagates as reduced intake instead
              of unbounded buffering; bulkheads so one tenant’s storm cannot sink the ship.
              Degraded modes are designed, not improvised: the page without recommendations is a
              feature you build in the calm.
            </p>
            <p>
              And when the budget burns anyway: the blameless postmortem, focused on the system
              that made the mistake easy rather than the hand that made it. The reading for this
              stage — eighteen short observations from a physician who studied disasters — will
              reframe every incident review you attend afterwards.
            </p>
            <Callout>
              Every resilience pattern is a way of saying no early. Systems die trying to say yes
              to everyone at once.
            </Callout>
            <p>
              That closes the pathway — and the practice loop is simple to state: take any product
              you admire, budget it, choose its stores, place its caches, draw its failure story,
              then read how the team actually built it on their engineering blog. The gap between
              your sketch and their writeup is the curriculum, personalised.
            </p>
          </>
        ),
      }}
    />
  )
}
