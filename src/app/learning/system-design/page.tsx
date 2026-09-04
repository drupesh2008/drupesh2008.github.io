import type { Metadata } from 'next'
import Pathway, { Callout, Fig, Tbl } from '@/components/Pathway/Pathway'
import { RequestAnatomy, BTreeVsLsm, TheLog, HashRing, CircuitStates } from './diagrams'

export const metadata: Metadata = {
  title: 'System Design — a free pathway from zero to professional',
  description:
    'Requests, caching, storage engines, transactions, sharding, streams, failure and a worked end-to-end design — a comprehensive free course from one server to a defensible architecture.',
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
              choosing those boxes deliberately — so start by making the picture concrete, and by
              attaching the three numbers every design conversation runs on.
            </p>
            <Fig caption="Fig 1 · The chain — every design conversation is really about this picture">
              <RequestAnatomy />
            </Fig>

            <h3>The boxes, and why each exists</h3>
            <p>
              <strong>DNS</strong> turns the name into an address (and, with region-aware answers,
              quietly does your first load balancing). A <strong>CDN</strong> serves static and
              cacheable content from the edge — it wins by removing distance, Foundations’ most
              expensive commodity. The <strong>load balancer</strong> spreads traffic across
              interchangeable app servers and survives the loss of any one of them; know the two
              kinds — <em>L4</em> balances TCP connections (fast, content-blind), <em>L7</em> reads
              HTTP and can route by path, cookie or header (richer, costlier), and it is usually
              where TLS terminates. Behind it, <strong>stateless app servers</strong> — stateless
              precisely so any server can take any request, which is what makes horizontal scaling
              and zero-drama deploys possible; state that must live somewhere goes to the cache and
              the database, which get their own stages.
            </p>

            <h3>The three numbers</h3>
            <p>
              <strong>Latency</strong> is time per request; <strong>throughput</strong> is requests
              per time; they are cousins, not synonyms — a system can be high-throughput and slow
              (batch pipelines) or low-throughput and fast. <strong>Availability</strong> is the
              fraction of requests that succeed, spoken in nines:
            </p>
            <Tbl>
              <table>
                <thead>
                  <tr><th>Availability</th><th>Downtime / year</th><th>Downtime / day</th></tr>
                </thead>
                <tbody>
                  <tr><td>99%</td><td>~3.7 days</td><td>~14 min</td></tr>
                  <tr><td>99.9%</td><td>~8.8 hours</td><td>~86 s</td></tr>
                  <tr><td>99.99%</td><td>~53 min</td><td>~8.6 s</td></tr>
                  <tr><td>99.999%</td><td>~5.3 min</td><td>~0.9 s</td></tr>
                </tbody>
              </table>
            </Tbl>
            <p>
              Two compositions to internalise. <em>Serial dependencies multiply:</em> a request that
              must touch five 99.9% services is a ~99.5% request — chains eat nines, which is a
              standing argument for fewer required dependencies and graceful degradation for the
              rest. And <em>tails dominate experience:</em> design at the p99, not the average — in
              a page that fans out to twenty services, nearly every user touches somebody’s p99.
              One more relation quietly governs capacity everywhere:{' '}
              <strong>Little’s Law</strong> — concurrency = arrival rate × time in system. 1,000
              req/s at 200 ms each means ~200 requests alive in your process at all times; that is
              your connection pools, memory and thread counts, derived in one multiplication.
            </p>

            <h3>The budget, worked</h3>
            <p>
              Give the request a number and make the hops fit. Say the product wants p99 ≤ 300 ms
              for a page in the user’s region: TLS + edge ~20 ms, LB + app ~5 ms, two cache reads
              ~2 ms, one DB query budgeted 30 ms, rendering 20 ms — roughly 80 ms spent, 220 ms of
              headroom that vanishes the moment someone adds a cross-region call (+150 ms) or a
              sequential fan-out. Budgets convert “make it fast” into decisions: cache this,
              co-locate that, parallelise the fan-out, delete the hop.
            </p>

            <h3>Where it bites</h3>
            <ul>
              <li>Sticky sessions — state smuggled into “stateless” servers; one node’s death logs users out and defeats the balancer.</li>
              <li>Averages on dashboards, tails in tickets. Alert on percentiles.</li>
              <li>Serial fan-out that could be parallel: five 40 ms calls are 200 ms in series, 40 ms in parallel.</li>
              <li>No stated budget at all — then every hop is justifiable and the sum is not.</li>
            </ul>
            <Callout>
              Numbers first, boxes second. An architecture you cannot attach a budget — and an
              availability target — to is a drawing, not a design.
            </Callout>
          </>
        ),

        /* ── Stage 2 ─────────────────────────────────────────────── */
        reads: (
          <>
            <p>
              Growth arrives read-first: most systems serve tens or hundreds of reads per write. So
              the first real architecture almost every product grows is the same one — put the
              answers people keep asking for somewhere cheaper than computing them again. A cache is
              Foundations’ ladder used as a tool: copy hot data a few rungs up.
            </p>

            <h3>The layers</h3>
            <p>
              Browser caches spare you the request entirely (cache headers are the cheapest
              performance feature you will ever ship). The <strong>CDN</strong> answers from the
              edge. An in-memory tier — <strong>Redis or memcached</strong> — sits in front of the
              database holding hot keys at sub-millisecond cost. The database caches pages
              underneath it all. Each layer absorbs some fraction, so the layer below sees only
              what leaked through. The governing number is the <strong>hit rate</strong>, and it is
              worth feeling its leverage: at 99% the database sees 1% of reads; a deploy that flushes
              the cache raises that to 100% instantly — a 100× traffic spike from a “cache blip”,
              which is how caches cause the outages they were bought to prevent. Warm-up and
              gradual rollout are part of cache design, not operational trivia.
            </p>

            <h3>The four write policies</h3>
            <Tbl>
              <table>
                <thead>
                  <tr><th>Pattern</th><th>How it works</th><th>Cost you accept</th></tr>
                </thead>
                <tbody>
                  <tr><td>Cache-aside</td><td>app reads cache; on miss reads DB and fills; writes go to DB and invalidate</td><td>the default; a stale window between write and invalidation</td></tr>
                  <tr><td>Read-through</td><td>cache itself loads on miss</td><td>same behaviour, library-shaped</td></tr>
                  <tr><td>Write-through</td><td>writes go to cache + DB synchronously</td><td>slower writes; cache always fresh</td></tr>
                  <tr><td>Write-behind</td><td>writes hit cache, flushed to DB async</td><td>fast writes; you can lose acknowledged data — use with eyes open</td></tr>
                </tbody>
              </table>
            </Tbl>
            <p>
              Staleness policy is a per-data-class decision, and this is replication lag from the
              Distributed Systems pathway wearing a cheaper suit: a <strong>TTL</strong> where
              bounded staleness is harmless (a profile, minutes old), <strong>explicit
              invalidation</strong> where it bites, <em>versioned keys</em> where you would rather
              never argue with a stale copy. Write the tolerable staleness down and the policy
              usually chooses itself.
            </p>

            <h3>The failure modes with names</h3>
            <ul>
              <li>
                <strong>Stampede</strong> (dog-pile): a hot key expires and a thousand requests miss
                at once, all recomputing. Fixes: per-key locking or request coalescing (one flight
                recomputes, the rest wait), TTL jitter so keys do not expire in choirs, or
                probabilistic early refresh of items about to expire.
              </li>
              <li>
                <strong>Hot key</strong>: one celebrity item exceeds what a single cache node
                serves. Fixes: replicate that key across nodes, or add a tiny in-process cache for
                the top-N keys — even 1 second of local TTL flattens astonishing load.
              </li>
              <li>
                <strong>Penetration</strong>: requests for keys that do not exist bypass the cache
                forever. Fix: cache the negative (“no such user”, short TTL).
              </li>
              <li>
                <strong>Eviction surprise</strong>: memory pressure evicts by LRU/LFU policy, not by
                your intent — capacity-plan the working set, or your “cached” items quietly are not.
              </li>
            </ul>

            <h3>Beyond the cache</h3>
            <p>
              When one primary still cannot carry residual reads, add <strong>read replicas</strong>{' '}
              and route queries that tolerate lag to them (the anomalies and patches are exactly the
              Distributed Systems Stage 3 catalogue — this is where you apply it). And split by
              job — <em>vertical</em> partitioning: search traffic to a search index, sessions to a
              key-value store, analytics to a column store (Stage 3 explains why). Sharding the
              write path is the bigger hammer; it waits for Stage 5.
            </p>
            <Callout>
              Every cache is a bet that yesterday’s answer is still good, and every hit rate is a
              cliff you will one day fall off. Price the bet — tolerable staleness, and the cost of
              the miss storm — before you take it.
            </Callout>
          </>
        ),

        /* ── Stage 3 ─────────────────────────────────────────────── */
        storage: (
          <>
            <p>
              Sooner or later the box marked “database” has to open. Inside, nearly every store you
              will ever meet is one of two machines — and knowing which one you are holding lets
              you predict its behaviour instead of discovering it in production.
            </p>
            <Fig caption="Fig 2 · Two families, opposite bets — the read-optimised tree and the write-optimised log of runs">
              <BTreeVsLsm />
            </Fig>

            <h3>The B-tree, mechanically</h3>
            <p>
              Postgres, MySQL/InnoDB, and most of the relational world keep rows in fixed-size{' '}
              <strong>pages</strong> (commonly 8–16 KB) arranged as a shallow, wide tree — three or
              four levels reach billions of keys, so any lookup is a handful of page reads, mostly
              cached. Updates happen <strong>in place</strong>: find the page, modify it — but first
              write the change to the <strong>write-ahead log</strong> and fsync (Foundations’
              third lie, industrialised): sequential log writes make random page writes safe to
              defer, and crash recovery replays the log. The personality that follows: steady,
              predictable reads; writes that pay a read (find the page) plus eventual page I/O; and
              fifty years of operational tooling.
            </p>

            <h3>The LSM tree, mechanically</h3>
            <p>
              RocksDB, Cassandra, and the engines under most write-heavy systems refuse to update
              in place. Writes append to an in-memory <strong>memtable</strong> (plus a WAL for
              durability); full memtables flush to disk as sorted immutable files (<strong>SSTables</strong>);
              background <strong>compaction</strong> merges files so reads stay sane. Reads check
              memtable, then files newest-first — with a <strong>Bloom filter</strong> per file
              (a tiny probabilistic “definitely not here / maybe here” structure) skipping most of
              them. The costs live on a triangle you can now name:{' '}
              <strong>write amplification</strong> (compaction rewrites each datum several times),{' '}
              <strong>read amplification</strong> (multiple places to look), and{' '}
              <strong>space amplification</strong> (obsolete versions await compaction) — tiered
              compaction favours writes, leveled favours reads and space; tuning LSMs is choosing a
              point on that triangle.
            </p>
            <p>
              The decision rule survives contact with vendors: read-heavy, update-in-place,
              transactional → B-tree family. Ingest-heavy, append-mostly, huge working sets → LSM
              family. Say it from the workload’s read/write mix and you will out-predict the
              benchmark pages.
            </p>

            <h3>Indexes — buying reads with writes</h3>
            <p>
              A <strong>secondary index</strong> is one more sorted structure, keyed by the column
              you search, pointing at the rows. That one sentence carries the whole economics:
              reads stop scanning (O(log n) instead of O(n)); every write now maintains one more
              structure. The refinements that pay rent weekly: a <strong>composite</strong> index on{' '}
              <code>(a, b)</code> serves <em>a</em> and <em>a,b</em> but not <em>b</em> alone —
              column order is a design decision; a <strong>covering</strong> index that contains
              every selected column answers the query without touching the table at all;
              low-<strong>selectivity</strong> columns (status with three values) rarely deserve an
              index — the planner will rightly ignore it. And the professional habit that makes the
              database a machine instead of a mood: read the <strong>query plan</strong>. It tells
              you what the engine actually did — scan vs index, join order, row estimates — and a
              wildly wrong row estimate usually means stale statistics, not a broken optimiser.
            </p>

            <h3>Choosing a store without theology</h3>
            <Tbl>
              <table>
                <thead>
                  <tr><th>Shape of need</th><th>Reach for</th><th>Because</th></tr>
                </thead>
                <tbody>
                  <tr><td>Relational integrity, transactions, ad-hoc queries</td><td>Postgres/MySQL</td><td>the default until a measured reason says otherwise</td></tr>
                  <tr><td>Key→value at brutal scale, known access paths</td><td>Dynamo-family / LSM stores</td><td>you pre-pay by modelling around the key</td></tr>
                  <tr><td>Analytics over billions of rows, few columns at a time</td><td>column store (OLAP)</td><td>columnar layout + compression: scan only what you select</td></tr>
                  <tr><td>Text search, relevance</td><td>search index (inverted index)</td><td>a different data structure entirely — do not grep a B-tree</td></tr>
                  <tr><td>Large immutable blobs</td><td>object storage + CDN</td><td>databases store pointers, not videos</td></tr>
                </tbody>
              </table>
            </Tbl>
            <p>
              Note what the table is really saying: “SQL vs NoSQL” was never the question. The
              question is the access pattern — and the row/column split (OLTP vs OLAP) matters more
              than any brand name on it.
            </p>
            <Callout>
              A slow query is a claim about physical layout. The plan tells you what the engine
              actually did — read it before you guess, and index for the query you run, not the
              table you have.
            </Callout>
          </>
        ),

        /* ── Stage 4 ─────────────────────────────────────────────── */
        writes: (
          <>
            <p>
              Reads can be a little stale and nobody dies. Writes are where the money moves, and
              they fail in a distinctive way: not by being slow but by being <em>interleaved</em> —
              two requests, each correct alone, landing on the same rows at the same time. This
              stage is the machinery that makes concurrent writes tell the truth.
            </p>

            <h3>What a transaction actually promises</h3>
            <p>
              <strong>Atomicity</strong>: all of the group’s writes commit or none do — implemented
              with the WAL you met in Stage 3. <strong>Durability</strong>: committed means
              fsync’d. <strong>Consistency</strong> here means your constraints hold. The load-bearing
              letter is <strong>Isolation</strong>: the rules for what concurrent transactions may
              see of each other — and it comes in degrees, each permitting named anomalies:
            </p>
            <Tbl>
              <table>
                <thead>
                  <tr><th>Level</th><th>Prevents</th><th>Still permits</th></tr>
                </thead>
                <tbody>
                  <tr><td>Read committed</td><td>dirty reads (seeing uncommitted data)</td><td>non-repeatable reads, lost updates, phantoms, write skew</td></tr>
                  <tr><td>Repeatable read / snapshot</td><td>non-repeatable reads; each txn sees one consistent photo</td><td>write skew; phantoms in some engines</td></tr>
                  <tr><td>Serializable</td><td>everything — as if run one at a time</td><td>aborts you must retry, and a throughput cost</td></tr>
                </tbody>
              </table>
            </Tbl>
            <p>
              Most engines default to read committed or snapshot, implemented with{' '}
              <strong>MVCC</strong>: writers create new row versions instead of overwriting, readers
              see the version current at their snapshot — readers never block writers, which is why
              modern databases feel so concurrent. The classic snapshot escape is{' '}
              <strong>write skew</strong>: two doctors check the on-call roster (two listed), each
              removes themselves in parallel; both snapshots were valid, neither wrote what the
              other read, both commit, the roster is empty. The <em>reads</em> were the constraint,
              and snapshots do not guard reads.
            </p>

            <h3>Choosing your weapon per invariant</h3>
            <ul>
              <li><strong>Let the database enforce it</strong> where possible: unique and check constraints, foreign keys — they hold at every isolation level and under every retry.</li>
              <li><strong>Pessimistic</strong>: <code>SELECT … FOR UPDATE</code> locks the rows the invariant depends on. Right when conflicts are common; brings lock waits and deadlocks (the engine detects and kills one — your code retries).</li>
              <li><strong>Optimistic</strong>: version each row; <code>UPDATE … WHERE version = n</code>; zero rows updated means someone beat you — retry. Right when conflicts are rare; it is idempotency’s cousin and pairs perfectly with retries from the Distributed Systems pathway.</li>
              <li><strong>Serializable for the one transaction that deserves it</strong> — per-transaction, not global; pay the aborts where correctness is priceless.</li>
            </ul>

            <h3>When the write spans systems</h3>
            <p>
              All of the above is <em>one database’s</em> promise. “Commit the order, then charge
              the card, then publish the event” crosses three systems, and no isolation level covers
              the trio. <strong>Two-phase commit</strong> exists (prepare everywhere, then commit
              everywhere) but blocks the world when the coordinator dies mid-flight — the
              Distributed Systems pathway explained why that is disqualifying on hot paths. The
              workable pattern is the <strong>saga</strong>: a sequence of local transactions, each
              with a <em>compensating action</em> (refund, release, cancel) run if a later step
              fails. You trade isolation for availability — intermediate states are visible, so
              design them to be honest (“payment pending”), make every step idempotent, and let a
              driver (often the outbox/stream machinery of the next stage) push each saga to
              completion or compensation. Never half-finished, only visibly-in-progress or cleanly
              undone.
            </p>
            <Callout>
              Find out the isolation level your database actually defaults to, then name the
              anomaly it permits that would hurt you most, then choose the smallest weapon that
              kills it. That sentence is the whole stage.
            </Callout>
          </>
        ),

        /* ── Stage 5 ─────────────────────────────────────────────── */
        streams: (
          <>
            <p>
              Somewhere past the first few million users, two pressures arrive together: writes
              outgrow one machine, and every write starts owing side effects — update the search
              index, invalidate the cache, notify a service. This stage is the pair of instruments
              that tame both: partitioning the data, and putting the changes on a log.
            </p>

            <h3>Sharding — splitting the write path</h3>
            <p>
              <strong>Sharding</strong> splits data across databases by a <strong>shard key</strong>,
              and the key choice is the whole game: it decides which queries stay single-shard
              (fast, transactional) and which become scatter-gather. Shard a social product by user
              ID and a profile page is one shard, but “everyone who liked this post” touches all of
              them. Choose the key from your top queries, not from aesthetics.
            </p>
            <Fig caption="Fig 3 · Consistent hashing — growth moves one arc of keys, not all of them">
              <HashRing />
            </Fig>
            <p>
              Placement has three standard answers: <strong>range</strong> (keys 0–999 → shard A:
              great for range scans, prone to hot ranges — today’s timestamps all land together),{' '}
              <strong>hash</strong> (uniform spread, range queries destroyed), and hash on a{' '}
              <strong>consistent-hashing ring</strong> with virtual nodes — the diagram — so that
              adding capacity moves ~1/N of keys instead of nearly all of them (<code>mod N</code>’s
              fatal flaw). Directory-based placement (a lookup service maps key→shard) buys the most
              flexibility at the cost of one more thing that can be down. The recurring diseases:{' '}
              <strong>hot shards</strong> (one tenant is 100× the rest — mitigate by salting that
              key or giving whales their own shard), cross-shard queries (pre-aggregate, or accept
              scatter-gather at the tail), cross-shard transactions (sagas, previous stage), and{' '}
              <strong>resharding</strong> — the migration you should design for on day one, because
              it is miserable to retrofit under load.
            </p>

            <h3>The log — one ordered history</h3>
            <Fig caption="Fig 4 · The log — one ordered history, many readers, replay for free">
              <TheLog />
            </Fig>
            <p>
              For the side-effects problem, the instrument is old and perfect: the{' '}
              <strong>append-only log</strong> (Kafka being the industrial version). Producers
              append; the log assigns each record a position; consumers read at their own pace,
              remembering only an offset. Three properties fall out at once: producers and consumers
              are <em>decoupled</em> (a slow indexer delays nobody — its offset just lags, and that
              lag is your cleanest health metric); history is <em>replayable</em> (rewind to rebuild
              a cache or backfill a brand-new consumer from last month’s events); and order within a
              partition is <em>settled once</em> by position, never re-argued — the Distributed
              Systems pathway taught how precious that is. Partitions shard the log for throughput
              (same key → same partition → per-key order preserved); consumer groups spread
              partitions across workers, with the standing rule that parallelism ≤ partition count.
              Queues (SQS-style) differ from logs on one axis worth naming: a queue deletes on
              consumption and targets one handler per message; a log retains and lets many readers
              share one history.
            </p>

            <h3>Closing the last gap</h3>
            <p>
              “Commit the row, then publish the event” — a crash between the two either loses the
              event or invents one, and no care in ordering fixes it. Make one write the moment of
              truth: the <strong>transactional outbox</strong> writes the event into an outbox table{' '}
              <em>inside the same database transaction</em> as the row, and a relay ships outbox
              rows to the log afterwards (at-least-once, so consumers stay idempotent — permanently
              on duty). Or go one lower with <strong>change data capture</strong>: treat the
              database’s own replication log as the event stream, and derived systems — caches,
              indexes, warehouses — become consumers of the source of truth rather than hopeful
              recipients of app-code side effects. Event sourcing takes the idea to its limit (the
              log <em>is</em> the source of truth; state is a projection) — powerful for
              audit-heavy domains, a real modelling commitment everywhere else; know it exists,
              reach for it deliberately.
            </p>
            <Callout>
              Decide which single write is the moment of truth and derive everything else from it,
              asynchronously, idempotently. Trying to make two systems agree simultaneously is how
              workflows lie.
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

            <h3>Define working, in numbers</h3>
            <p>
              An <strong>SLI</strong> is the measurement (fraction of requests under 300 ms and
              successful). The <strong>SLO</strong> is your target for it (99.9% over 30 days) — set
              from what users notice, not what the dashboard flatters. An SLA is the contractual
              version with penalties; never promise externally what you only aspire to internally.
              The complement of the SLO is the <strong>error budget</strong>: 99.9% over 30 days
              grants ~43 minutes of failure. Budgets turn reliability into an economy — burning fast
              pauses risky launches; running far under budget means you are paying for caution
              users cannot perceive. Alert on <strong>burn rate</strong> (how fast the budget is
              draining, on fast and slow windows), not on every blip: pages should mean “a human
              must act now”, or they train humans to ignore pages.
            </p>

            <h3>How failure travels</h3>
            <p>
              The worst outages are small failures <em>amplified by the system’s own defences</em>.
              The canonical spiral: a dependency slows; callers time out and retry, tripling load on
              a service already drowning; its queue grows until every request waits longer than its
              caller’s timeout — now all work is completed <em>and</em> discarded; the load balancer
              routes away from “unhealthy” nodes, concentrating the flood on survivors. Every
              defence made it worse. The counter-tools are all ways of <strong>refusing early</strong>:
            </p>
            <ul>
              <li><strong>Timeout budgets</strong> that shrink down the call chain — if the edge promises 300 ms, an inner call may have 50; an inner timeout longer than the outer one is a bug you can grep for.</li>
              <li><strong>Retries</strong>: capped, exponential, jittered, idempotent-only — and budgeted (e.g. retries ≤ 10% of traffic) so recovery cannot become the second outage.</li>
              <li><strong>Circuit breakers</strong> — stop calling what keeps failing, probe gently, recover automatically:</li>
            </ul>
            <Fig caption="Fig 5 · The breaker — failing fast is a service you provide to your callers">
              <CircuitStates />
            </Fig>
            <ul>
              <li><strong>Bounded queues + load shedding</strong>: a fast “no” (429, degraded page) protects the “yes” for everyone else; an unbounded queue is a promise to fail slowly and completely.</li>
              <li><strong>Backpressure</strong>: slowness propagates as reduced intake, not as infinite buffering — consumer lag on the Stage 5 log is backpressure made visible.</li>
              <li><strong>Bulkheads</strong>: separate pools per dependency or tenant, so one storm cannot sink the ship; plus health checks that distinguish <em>liveness</em> (restart me) from <em>readiness</em> (route around me, briefly).</li>
              <li><strong>Designed degradation</strong>: the page without recommendations, the search over yesterday’s index — built and tested in the calm, because improvised degradation at 3 a.m. is just a second incident.</li>
            </ul>

            <h3>Seeing and learning</h3>
            <p>
              Observability is three signals with different jobs — <strong>metrics</strong>{' '}
              (cheap, aggregated: rate, errors, duration percentiles per endpoint and dependency),{' '}
              <strong>logs</strong> (searchable detail, structured, stamped with a request ID), and{' '}
              <strong>traces</strong> (one request’s journey across services — the only way to see{' '}
              <em>where</em> the 300 ms went). Propagating a correlation ID everywhere is the
              cheapest observability investment you will ever make. And when the budget burns
              anyway: a <strong>blameless postmortem</strong> aimed at the system that made the
              mistake easy — the linked eighteen observations will reframe every incident review
              you attend — plus a periodic game-day where you kill things on purpose, because an
              untested failover is a rumour, not a capability.
            </p>
            <Callout>
              Every resilience pattern is a way of saying no early. Systems die trying to say yes
              to everyone at once.
            </Callout>
          </>
        ),

        /* ── Stage 7 ─────────────────────────────────────────────── */
        worked: (
          <>
            <p>
              Everything in one sitting. This is the delivery framework used in design interviews —
              which is also, not coincidentally, a decent way to run a real design review. Then a
              problem worked through it, out loud.
            </p>

            <h3>The framework</h3>
            <Tbl>
              <table>
                <thead>
                  <tr><th>Step</th><th>~Time</th><th>You produce</th></tr>
                </thead>
                <tbody>
                  <tr><td>1 · Requirements</td><td>5 min</td><td>functional (what it does) and non-functional (scale, latency, availability, consistency) — three of each, written down</td></tr>
                  <tr><td>2 · Estimates</td><td>5 min</td><td>QPS, storage, read:write ratio — only the arithmetic that will change the design</td></tr>
                  <tr><td>3 · API + data model</td><td>5 min</td><td>the 3–4 core endpoints and the tables/keys behind them</td></tr>
                  <tr><td>4 · High-level design</td><td>10 min</td><td>the Stage 1 chain, drawn, every box justified by a requirement</td></tr>
                  <tr><td>5 · Deep dives</td><td>15 min</td><td>the two or three places your numbers say it breaks — this is where the interview actually happens</td></tr>
                  <tr><td>6 · Failure &amp; wrap</td><td>5 min</td><td>what dies first, what degrades, what you would build next</td></tr>
                </tbody>
              </table>
            </Tbl>

            <h3>Worked: a URL shortener</h3>
            <p>
              <strong>Requirements.</strong> Functional: create a short link for a long URL;
              redirect; optional custom alias and expiry. Non-functional: reads dominate massively;
              redirects should be tens of milliseconds; 99.99% for redirects (the write path can be
              humbler); links must not vanish.
            </p>
            <p>
              <strong>Estimates.</strong> Say 100 M new links/month ≈ 40 writes/s — trivial. At
              100:1 read:write, redirects ≈ 4,000/s, spiking higher. Storage: 100 M/month × ~500
              bytes ≈ 50 GB/year — one database, for years. The arithmetic has already shaped the
              design: <em>this is a read problem with a tiny write problem attached.</em>
            </p>
            <p>
              <strong>API + data.</strong> <code>POST /links</code> → short code;{' '}
              <code>GET /:code</code> → 301. One table: code (PK), long_url, owner, created_at,
              expires_at. The interesting decision is the code itself: a base62 encoding of a
              sequence gives 62⁷ ≈ 3.5 trillion codes at 7 characters. Random codes need a
              uniqueness check; sequential codes are guessable and reveal volume; a common middle
              path is per-server pre-allocated ID ranges (no coordination on the hot path) encoded
              base62.
            </p>
            <p>
              <strong>High level.</strong> Stage 1’s chain almost verbatim: DNS → LB → stateless
              app → cache → DB. Redirects: check cache (cache-aside), miss → DB → fill → 301.
              With a 90-day-skewed access pattern the hot set is a few GB — cache hit rate in the
              high 90s, so the DB sees tens of reads/s. A single replicated Postgres with a read
              replica clears every number with an order of magnitude to spare — <em>say that out
              loud; earned simplicity is the strongest signal there is.</em>
            </p>
            <p>
              <strong>Deep dives, chosen by the numbers.</strong> (1) Hot keys: one viral link can
              be 50% of traffic — the Stage 2 answer: tiny in-process cache with 1 s TTL in front of
              Redis. (2) Analytics without slowing redirects: do not write counts on the redirect
              path; emit a click event to the Stage 5 log and aggregate downstream — the redirect
              stays read-only. (3) Cache stampede on expiry of a viral key: request coalescing.
              (4) If asked to 100× the scale: shard by hash of code (single-key lookups shard
              perfectly), promote the cache to a cluster, note that codes are immutable so
              replication lag is harmless — consistency was never the hard part here.
            </p>
            <p>
              <strong>Failure story.</strong> Cache down → DB takes the full read load: survivable
              at these numbers, and the breaker + shed-load patterns from Stage 6 guard the spike.
              DB primary down → replica promotion; writes pause for seconds, redirects keep serving
              from cache. Degraded mode: redirects work while link-creation is down — which is
              exactly the availability asymmetry the requirements asked for.
            </p>

            <h3>What changes when the problem changes</h3>
            <p>
              The framework is stable; the deep dives move with the workload. A <em>news feed</em>{' '}
              is a fan-out problem (push on write vs pull on read, and the celebrity hybrid). A{' '}
              <em>chat system</em> is ordering + presence (per-conversation sequencing through one
              partition, delivery receipts as idempotent state). A <em>ride-matching or ticketing
              system</em> is contention (Stage 4’s locking and invariants, plus reservations with
              expiry). Classify the problem by which stage of this pathway it stresses, and you
              will know where the interview — or the production incident — is going to spend its
              time.
            </p>
            <Callout>
              Requirements → numbers → the boring design that meets them → deep dives where the
              numbers say it breaks. Complexity you cannot trace back to a requirement is
              decoration, and interviewers and outages both bill for it.
            </Callout>
          </>
        ),
      }}
    />
  )
}
