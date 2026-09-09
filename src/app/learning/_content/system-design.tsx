/**
 * The written chapters of the system-design pathway, keyed by stage id.
 * Rendered one per page by StageView; a stage listed in the data but
 * missing here fails the static build.
 */
import type { ReactNode } from 'react'
import { Callout, Fig, Tbl } from '@/components/Pathway/Pathway'
import {RequestAnatomy, BTreeVsLsm, TheLog, HashRing, CircuitStates} from './system-design-diagrams'

export const sections: Record<string, ReactNode> = {

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

        /* ── Sharding ────────────────────────────────────────────── */
        sharding: (
          <>
            <p>
              Somewhere past the first few million users, writes outgrow one machine — vertical
              scaling buys time, never escape. <strong>Sharding</strong> splits data across
              databases by a <strong>shard key</strong>, and the key choice is the whole game: it
              decides which queries stay single-shard (fast, transactional) and which become
              scatter-gather. Shard a social product by user ID and a profile page is one shard,
              but “everyone who liked this post” touches all of them. Choose the key from your top
              queries, not from aesthetics.
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
            <Callout>
              The shard key is a product decision wearing an infrastructure costume: it encodes
              which questions your system answers cheaply, forever. Pick it from the top queries —
              and design the resharding path before you need it.
            </Callout>
          </>
        ),

        /* ── Streams ─────────────────────────────────────────────── */
        streams: (
          <>
            <p>
              Sharding split the data; a second pressure arrives with it: every write starts owing
              side effects — update the search index, invalidate the cache, notify a service. Doing
              that synchronously makes users wait on your bookkeeping; doing it “later, somehow”
              loses updates on the first bad day. The instrument that tames it is old and perfect.
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

        /* ── Designing the API ───────────────────────────────────── */
        api: (
          <>
            <p>
              Databases get migrated, services get rewritten, whole architectures get replaced —
              and through all of it, the API keeps its promises, because clients you do not
              control depend on every one of them. That asymmetry is the whole discipline: the API
              is the longest-lived artefact you will design, so design it like the permanent thing
              it is.
            </p>

            <h3>REST that clients can guess</h3>
            <p>
              The convention that won did so by being guessable: <strong>nouns for resources</strong>{' '}
              (<code>/orders/123</code>, not <code>/getOrder</code>), <strong>verbs from
              HTTP</strong> (GET reads and is cacheable, POST creates, PUT/PATCH replace/modify,
              DELETE deletes), and <strong>status codes that mean what they say</strong> — 2xx
              success, 4xx “you did something wrong, don’t retry as-is”, 5xx “we did, retrying is
              reasonable”. That last split is not pedantry: it is the retry policy of every client
              you will ever have, encoded in a number. Return 500 for a validation error and
              well-behaved clients will politely hammer you with the same bad request forever.
            </p>

            <h3>The contract details that decide everything later</h3>
            <Tbl>
              <table>
                <thead>
                  <tr><th>Decision</th><th>Do this</th><th>Because</th></tr>
                </thead>
                <tbody>
                  <tr><td>Pagination</td><td>opaque cursors, not offsets</td><td>offset 100000 scans 100000 rows and skips/duplicates under concurrent writes; a cursor is O(1) at the index and stable</td></tr>
                  <tr><td>Unsafe operations</td><td>accept an idempotency key</td><td>the Distributed Systems rules: clients WILL retry; make the second attempt return the first outcome</td></tr>
                  <tr><td>Errors</td><td>machine-readable body: code, message, retryable?</td><td>clients branch on your errors; give them fields, not prose to regex</td></tr>
                  <tr><td>Limits</td><td>document timeouts, rate limits, max sizes in the contract</td><td>undocumented limits are landmines with your logo on them</td></tr>
                </tbody>
              </table>
            </Tbl>

            <h3>Evolving without breaking anyone</h3>
            <p>
              The compatibility rules are the RPC chapter’s, applied at the public edge: adding an
              optional field or a new endpoint is safe; renaming, removing, retyping, or changing
              the meaning of anything is a break — and the uncomfortable law is that{' '}
              <em>any observable behaviour will be depended on</em>, error text included. When a
              break is truly unavoidable: version (<code>/v2/</code> at the path is crude and
              perfectly effective), run both, announce deprecation with dates, watch v1 traffic
              decay, and only then retire it. Companies that respect this loop keep developer
              trust for decades; the shortcut is remembered for exactly as long.
            </p>

            <h3>When REST is the wrong shape</h3>
            <p>
              <strong>gRPC</strong> earns its place service-to-service: typed contracts, deadline
              propagation, streaming — internal edges where you control both sides.{' '}
              <strong>GraphQL</strong> earns its place when many differently-shaped frontends
              over-fetch from one API — clients ask for exactly the fields they need; the bill is
              server complexity (every query is a little planner, caching gets harder, one
              endpoint hides expensive queries). The honest default remains boring REST + JSON,
              upgraded when a measured pain — not fashion — names one of these shapes.
            </p>
            <Callout>
              Every field you expose is a promise you are making to strangers, indefinitely.
              Expose the minimum, document the limits, and make the safe path — idempotent,
              paginated, correctly coded — the path of least resistance.
            </Callout>
          </>
        ),

        /* ── Load balancing, gateways and discovery ──────────────── */
        gateway: (
          <>
            <p>
              Between the internet and your code stand boxes most engineers inherit rather than
              understand — until the day the “simple” load balancer is the outage. This chapter
              opens the boxes: what balancing actually decides, what a gateway is for, and how
              traffic finds services that will not sit still.
            </p>

            <h3>L4 vs L7 — what each can see</h3>
            <p>
              An <strong>L4</strong> balancer works at the connection layer: it sees IPs and ports,
              picks a backend per <em>connection</em>, and forwards bytes it never reads — nearly
              wire-speed, protocol-blind. An <strong>L7</strong> balancer terminates TLS and reads
              HTTP: it balances per <em>request</em>, routes by path/header/cookie, retries
              idempotent failures, and emits the metrics you actually alert on. The costs mirror
              the powers: L7 pays parsing and holds state; L4 cannot help you with anything it
              cannot see — including one long-lived HTTP/2 connection carrying a thousand
              requests/second that L4 happily “balanced” onto a single backend. Real edges layer
              them: L4 (often anycast) at the front for scale, L7 behind it for brains.
            </p>

            <h3>Choosing a backend, and ejecting one</h3>
            <p>
              Round robin assumes requests cost the same; they do not. <strong>Least outstanding
              requests</strong> is the sturdy default — send work where the queue is shortest,
              which automatically feeds slow nodes less. Session affinity (consistent-hash on a
              cookie/user) buys cache locality at the price of the stateless ideal from the
              request-anatomy chapter — take it knowingly or not at all. <strong>Health
              checking</strong> is where balancers turn dangerous: a naive checker that ejects any
              instance failing a ping will, when a <em>shared</em> dependency hiccups, eject the
              entire fleet and route 100% of traffic to the last “healthy” victim — the retry
              spiral’s cousin. The counter-pattern is <strong>outlier ejection with a floor</strong>:
              eject the statistically worst few, never below a minimum healthy fraction — and
              distinguish liveness (“restart me”) from readiness (“route around me briefly”), the
              failure chapter’s split, enforced here.
            </p>

            <h3>Gateways and discovery</h3>
            <p>
              An <strong>API gateway</strong> is an L7 balancer with the cross-cutting jobs moved
              in: authentication, rate limiting, request logging, routing to the right service —
              excellent, precisely because every request now flows through one very smart single
              point of failure. Keep it boring: policy yes, business logic no; anything clever in
              the gateway is logic you cannot deploy independently and an outage you cannot
              scope. Behind it, <strong>service discovery</strong> answers “where is
              checkout-service <em>right now</em>” — a registry fed by health checks, consumed
              either server-side (the balancer resolves; simple clients) or client-side (callers
              subscribe and balance themselves; smarter, and the model service meshes automate by
              parking a proxy sidecar next to every instance — the mesh is this chapter productised,
              priced in operational complexity).
            </p>

            <h3>Where it bites</h3>
            <ul>
              <li>gRPC/HTTP2 behind an L4 balancer — one connection, one backend, “balanced”.</li>
              <li>Health checks that test a shared dependency — one Redis blip ejects the fleet.</li>
              <li>Gateway timeout longer than the client’s — work completing for callers already gone (deadline budgets, again).</li>
              <li>Config in the balancer diverging from reality in the registry — the 3 a.m. classic; make one own the truth.</li>
            </ul>
            <Callout>
              The boxes in front of your code are distributed-systems participants, not furniture.
              Give them the same design review as your services — their failure modes are
              multiplicative, because everything is behind them.
            </Callout>
          </>
        ),

        /* ── The edge: CDNs and static delivery ──────────────────── */
        cdn: (
          <>
            <p>
              Foundations proved the expensive thing about networks is distance, and no vendor
              sells shorter light-paths. The CDN is the industry’s answer: if the bytes cannot
              travel faster, station copies of them near everyone. This chapter is how that
              actually works — and the header-level mechanics that decide whether it works for
              you.
            </p>

            <h3>The machinery</h3>
            <p>
              A CDN is hundreds of <strong>points of presence</strong> — cache clusters parked at
              internet exchange points — plus routing that lands each user on a nearby one,
              usually via <strong>anycast</strong>: every PoP announces the same IP, and internet
              routing itself delivers packets to the closest. A request hits the edge; on a miss
              it walks up a cache hierarchy and ultimately to your <strong>origin</strong>. The
              round-trip arithmetic is the sale: 150 ms cross-continent becomes 15 ms to the edge
              — and for HTTPS, the TLS handshakes happen at the edge too, so even{' '}
              <em>uncacheable</em> API traffic gets faster by terminating nearby and riding the
              CDN’s warm, fat pipes to origin.
            </p>

            <h3>The headers do the work</h3>
            <p>
              The CDN obeys your origin’s HTTP headers, so caching quality is a code review, not a
              vendor setting. <code>Cache-Control</code> carries the policy: <code>max-age</code>{' '}
              (how long anyone may cache), <code>s-maxage</code> (CDN-specific override),{' '}
              <code>public/private</code> (may shared caches hold it), <code>no-store</code>{' '}
              (never). <code>ETag</code> enables cheap <strong>revalidation</strong> — “I have
              version abc123, still current?” → <code>304 Not Modified</code>, headers only, no
              body. And the modern winner for HTML: <code>stale-while-revalidate</code> — serve
              the stale copy instantly, refresh behind the scenes; users get edge latency, origin
              gets background traffic, and staleness is bounded and chosen.
            </p>

            <h3>Invalidation, and the strategy that skips it</h3>
            <p>
              Purging a URL from hundreds of PoPs is slow, eventually-consistent, and — recall the
              reads chapter — one of the two hard problems. The professional pattern opts out:{' '}
              <strong>versioned URLs</strong>. Fingerprint assets by content
              (<code>app.9f2c1a.js</code>), cache them for a year as immutable, and “invalidate”
              by shipping HTML that references the new name. The mutable surface shrinks to HTML
              itself — short TTL plus stale-while-revalidate — and purges become an emergency
              tool, not a workflow. For private content, <strong>signed URLs</strong> (expiring,
              tamper-proof query signatures) let the CDN serve authorised bytes without holding
              your auth logic; the blob-storage chapter leans on exactly this.
            </p>

            <h3>Where it bites</h3>
            <ul>
              <li>One user’s private response cached as <code>public</code> and served to another — the classic CDN incident; audit cacheability per route.</li>
              <li>A hot asset expiring everywhere at once — the miss storm hits origin; jitter TTLs, use origin shielding (one designated PoP collapses the herd).</li>
              <li>Purge-based deploys: version instead, and stop fighting propagation.</li>
              <li>Treating the CDN as static-only — edge TLS termination for APIs is often the cheapest 30–80 ms you will ever save.</li>
            </ul>
            <Callout>
              The CDN is a cache you configure through HTTP headers and defeat through carelessness
              in them. Version what you can, bound the staleness of what you cannot, and let
              distance — the one cost physics fixed — be paid as rarely as possible.
            </Callout>
          </>
        ),

        /* ── Data modelling across paradigms ─────────────────────── */
        modeling: (
          <>
            <p>
              The storage chapter opened the engine; this one is about the shape you pour into it —
              and the quiet truth that schema design is <em>query</em> design. The same information
              modelled two ways can differ by 100× at read time, and the difference is decided
              months before the slow query pages anyone.
            </p>

            <h3>Relational: normalise, then betray it deliberately</h3>
            <p>
              <strong>Normalisation</strong> — each fact stored once, related by keys — is the
              relational default for good reasons: no update anomalies, no contradictory copies,
              integrity the database itself enforces. Start there. Then let <em>measured</em> read
              patterns argue for <strong>denormalisation</strong>: a duplicated author-name column
              to skip a hot join, a maintained counter instead of a COUNT over millions. Every
              denormalisation is a copy, and every copy is a consistency obligation you now own in
              application code — the reads-chapter bargain again, inside the database. Take it
              knowingly, write the reconciliation job, and document which copy is authoritative.
            </p>

            <h3>The access-pattern mismatch family</h3>
            <p>
              The <strong>N+1 query</strong> is the emblem: load 50 orders (one query), then loop
              loading each customer (50 more). Every ORM makes it easy to write and invisible in
              dev, and the fix is always the same shape — fetch the batch (a join or an{' '}
              <code>IN</code> list), not the items. Its siblings: selecting <code>*</code> when
              three columns would ride a covering index; paginating with OFFSET (the API chapter
              already convicted it); filtering in application code what the database would filter
              with an index. One habit prevents the family: <em>state the query shapes first</em>,
              then design tables and indexes to serve them — never the reverse.
            </p>

            <h3>NoSQL modelling is modelling inverted</h3>
            <p>
              Document and wide-column stores hand you scale and take away joins — so the method
              flips: <strong>list the access patterns first, then design keys that answer each in
              one lookup</strong>. In practice that means pre-joining: store the data as the
              answers you will need. The DynamoDB single-table craft in this chapter’s talk is the
              extreme sport version — partition keys, sort keys and item collections arranged so a
              handful of patterns are each one cheap read. The bill arrives when a{' '}
              <em>new</em> access pattern appears: relational absorbs it with a query; key-value
              demands a migration or a backfilled index. Which is the honest selection rule:
              stable, known patterns at scale → NoSQL shines; evolving product questions → the
              relational model’s flexibility is the feature you were about to throw away.
            </p>

            <h3>Time, history and schema change</h3>
            <p>
              Two modelling decisions recur everywhere. <strong>History</strong>: overwrite rows
              and you have amnesia; keep every version and you have volume. The middle paths —
              soft deletes (<code>deleted_at</code>), audit tables fed by triggers or CDC, or full
              event sourcing (next chapter) — are chosen per entity by asking “will anyone need to
              know what this looked like before?” <strong>Schema migration</strong> on a live
              system is the delivery chapter’s expand–migrate–contract: add the nullable column,
              dual-write, backfill in batches, switch reads, drop the old — never a table lock on
              a hot table, never a big-bang rename.
            </p>
            <Callout>
              Model for the questions, not the things. A schema is a bet about your future queries
              — relational hedges the bet, key-value concentrates it — and the only wrong move is
              placing it without writing the queries down first.
            </Callout>
          </>
        ),

        /* ── Derived data: search, analytics and event sourcing ──── */
        derived: (
          <>
            <p>
              By this point your system has one source of truth and a growing crowd of shadows:
              a cache, a search index, an analytics store, maybe a recommendation feed. The
              liberating reframe of this chapter: those are all the same thing —{' '}
              <strong>derived data</strong>, projections rebuilt from the source — and the log you
              built last chapter is how they stay honest.
            </p>

            <h3>The derived-data mindset</h3>
            <p>
              A derived store is disposable by definition: if it can be rebuilt from the source of
              truth, it needs no backups, no two-phase writes, no heroics — it needs a{' '}
              <strong>pipeline</strong> (consume the change stream, transform, upsert) and a{' '}
              <strong>freshness SLO</strong> (“search reflects writes within 30 seconds”),
              monitored as consumer lag. Rebuild-from-scratch is not an emergency procedure; it is
              the design test. If you cannot replay the log into an empty index and get the right
              answer, the pipeline is wrong <em>now</em> — you just have not noticed yet.
            </p>

            <h3>Search — a different index for a different question</h3>
            <p>
              B-trees answer “rows where author = X”; search answers “documents <em>about</em>{' '}
              X” — and needs the <strong>inverted index</strong>: for every term, the list of
              documents containing it. Queries intersect those lists, then <strong>rank</strong>{' '}
              (BM25 remains the honest baseline: rare terms count more, term-stuffed long docs
              count less). The craft hides in <strong>analysis</strong> — how text becomes terms:
              lowercase, tokenise, stem (“running” → “run”), handle synonyms — and analysis
              mismatches between index-time and query-time explain most “search is broken”
              tickets. Populate it like every derived store: CDC from the source, never dual
              writes from application code (the streams chapter already prosecuted that crime).
            </p>

            <h3>OLTP and OLAP — stop making one store do both</h3>
            <p>
              Transactional stores read rows; analytics reads columns — “average order value by
              month for two years” touches two columns of fifty million rows, and a row store
              drags the other forty-eight through memory (the ladder, wasted). <strong>Column
              stores</strong> lay data column-wise: scan only what you select, compress
              beautifully (a column is self-similar), aggregate at vector speed. So the standard
              shape: OLTP databases for the product, a warehouse/lakehouse for questions, the log
              in between — batch loads where hours of lag are fine, streaming where minutes
              matter, and <em>reprocessing as a first-class operation</em> either way, because the
              transform logic will change and history must be re-derivable.
            </p>

            <h3>Event sourcing and CQRS — the mindset at its limit</h3>
            <p>
              Event sourcing promotes the log to <em>be</em> the source of truth: state is a
              projection, every past state reconstructable, audit for free. CQRS is its natural
              partner — commands append events, queries hit projections shaped per reader. The
              unbought costs: eventual consistency between write and read sides (session
              guarantees return from the Distributed Systems pathway), and{' '}
              <strong>event schema evolution</strong> — your events are forever, so the RPC
              chapter’s compatibility rules apply to your own history. Superb for domains that{' '}
              <em>are</em> ledgers (payments, inventory, anything audited); a self-inflicted
              distributed system for a CRUD app. Most systems want the mindset — log-fed,
              rebuildable projections — without the full commitment.
            </p>
            <Callout>
              One source of truth; everything else is a projection with a freshness SLO and a
              replayable pipeline. Say which store is which out loud — half of all data
              architecture arguments end at that sentence.
            </Callout>
          </>
        ),

        /* ── Counting at scale: probabilistic structures ─────────── */
        sketches: (
          <>
            <p>
              “How many unique visitors this month?” Exactly answered, that question costs a set
              with a hundred million members. Answered within 1%, it costs{' '}
              <em>twelve kilobytes</em>. That trade — a tunable error for orders of magnitude of
              memory — is a whole family of structures, and at scale it is rarely optional: the
              exact answer is often the one you cannot afford.
            </p>

            <h3>Bloom filters — “definitely not” in bits</h3>
            <p>
              A Bloom filter answers set membership with one asymmetry: <strong>no</strong> is
              certain, <strong>yes</strong> is probable. Mechanically: a bit array plus k hash
              functions; adding sets k bits, querying checks them — any zero means definitely
              absent; all ones means present <em>or</em> collision. False positives, never false
              negatives — and that asymmetry is exactly shaped for “skip the expensive lookup”:
              the LSM engine from the storage chapter consults one per SSTable (definitely-not →
              skip the file), caches use them to dodge penetration lookups, crawlers to skip seen
              URLs. Sizing is a formula, not folklore — ~10 bits and 7 hashes per element gives
              ~1% false positives — and the classic limitation (no deletes; a bit may be shared)
              is what counting and <strong>cuckoo</strong> variants exist to fix.
            </p>

            <h3>The counting family</h3>
            <Tbl>
              <table>
                <thead>
                  <tr><th>Structure</th><th>Question</th><th>Cost / error</th><th>Lives in</th></tr>
                </thead>
                <tbody>
                  <tr><td>HyperLogLog</td><td>how many distinct?</td><td>~12 KB for ~0.8% at any cardinality; mergeable across shards</td><td>uniques, cardinality alerts, COUNT DISTINCT approximations</td></tr>
                  <tr><td>Count–min sketch</td><td>how often has X appeared?</td><td>KBs; overestimates only, tunable</td><td>heavy hitters, trending, hot-key detection</td></tr>
                  <tr><td>Reservoir sample</td><td>a fair sample of a stream</td><td>exactly k items, uniform, single pass</td><td>debugging firehoses, sampled analytics</td></tr>
                  <tr><td>Top-K (sketch + heap)</td><td>the current leaders</td><td>bounded memory over unbounded streams</td><td>leaderboards, trending topics</td></tr>
                </tbody>
              </table>
            </Tbl>
            <p>
              HyperLogLog’s trick deserves one sentence of intuition: hash every element and track
              the longest run of leading zeros seen — a run of 20 zeros suggests ~2²⁰ distinct
              values; many small registers plus careful averaging turns that gambler’s logic into
              0.8% accuracy. Two properties make these production tools rather than curiosities:
              they are <strong>mergeable</strong> (per-shard sketches union into a global answer —
              distributed counting without coordination) and their error is <strong>a dial you
              set</strong>, with a formula linking memory to accuracy printed on the box.
            </p>

            <h3>Where it bites</h3>
            <ul>
              <li>Billing, quotas, anything user-visible as an exact promise — ±1% is an SLA violation wearing a lab coat; sketches are for operational truth, not ledgers.</li>
              <li>Bloom filters sized for launch traffic — the false-positive rate climbs as it fills; size for the future or rotate.</li>
              <li>Counting distinct by <code>INSERT IGNORE</code> into a table — the 12 KB answer, purchased for gigabytes and lock contention.</li>
              <li>Forgetting mergeability — per-node exact counts cannot be combined for distinct; per-node HLLs can. Choose the sketch <em>because</em> of the topology.</li>
            </ul>
            <Callout>
              When the question is operational — roughly how many, roughly how often, roughly who
              leads — buy the approximate answer at 1/1000th the price. Exactness is a product
              requirement, not a reflex.
            </Callout>
          </>
        ),

        /* ── Geospatial indexing and proximity ───────────────────── */
        geo: (
          <>
            <p>
              “Find drivers near me” looks like a WHERE clause and is not one. A B-tree orders one
              dimension; nearness lives in two — index latitude and you get a thin useless stripe
              of the planet; add longitude and the intersection is still wrong at any scale. Space
              needs structures of its own, and they all share one idea:{' '}
              <strong>turn 2-D proximity into 1-D order</strong>.
            </p>

            <h3>Grids — geohash and friends</h3>
            <p>
              <strong>Geohash</strong> interleaves the bits of latitude and longitude into one
              sortable string: each added character quarters the cell, and — the payoff —{' '}
              <em>shared prefixes mean shared neighbourhoods</em>. Suddenly a plain B-tree works:
              index the geohash, and “nearby” becomes a prefix range scan. Two honest defects ship
              with it. <strong>Edges</strong>: two points a metre apart can straddle a cell
              boundary and share no prefix — so every real query checks the cell{' '}
              <em>and its eight neighbours</em>, never the prefix alone. And{' '}
              <strong>skew</strong>: fixed cells mean Manhattan’s cell holds a million points and
              Montana’s holds three.
            </p>

            <h3>Trees and hexagons</h3>
            <p>
              Where density is wildly uneven, adaptive structures earn their complexity: a{' '}
              <strong>quadtree</strong> splits any cell that exceeds capacity into four — busy
              cities subdivide deeply, empty plains stay coarse; the <strong>R-tree</strong>{' '}
              generalises to rectangles and powers “shapes near/containing X” inside PostGIS-style
              databases. And when the job is <em>analytics over</em> space — surge zones, coverage,
              supply/demand per area — Uber’s <strong>H3</strong> hexagons (this chapter’s
              reading) fix the squares’ subtle lie: hexagons have six neighbours all at equal
              distance (squares have eight at two different distances), so “adjacent zones” and
              gradient-style computations stop being biased by grid geometry.
            </p>

            <h3>The moving-object problem</h3>
            <p>
              A food-delivery city updates hundreds of thousands of driver locations every few
              seconds — and here is the trap: treating that as a database problem. Persistent
              geo-indexes hate hot updates (every move is a delete+insert somewhere). The
              production shape instead: <strong>live location in memory</strong> — a hash of
              cell → driver set, updated in place, rebuilt from the stream on restart (it is a{' '}
              <em>derived view</em>, last chapter’s mindset; losing it loses nothing) — while
              trips and history land durably elsewhere. Queries then read like this:
              compute candidate cells for the radius → union their driver sets → <em>exact</em>{' '}
              distance filter on that shortlist → rank. Coarse cells first, precise maths on
              dozens instead of millions.
            </p>

            <h3>Sharding space</h3>
            <p>
              Shard by grid cell and the city-centre cell melts — the hot-key problem wearing a
              map. Shard by <em>coarse region</em> with capacity-aware splits (busy regions get
              more shards), keep queries region-local, and accept the cross-border query as the
              scatter-gather it honestly is. The atlas chapter’s ride-matching design is this
              chapter plus a lock — worth reading them together.
            </p>
            <Callout>
              All practical geo-indexing is the same three-step: map 2-D to 1-D cells, over-fetch
              candidate cells (always including neighbours), then filter exactly on the shortlist.
              Choose grid vs tree vs hexagon by density and query shape — not by what the database
              happened to ship.
            </Callout>
          </>
        ),

        /* ── Identity, time and unique IDs ───────────────────────── */
        ids: (
          <>
            <p>
              <code>AUTO_INCREMENT</code> dies the day the second database arrives — two counters
              both issue 1001, and everything downstream corrupts politely. Every distributed
              system therefore needs an answer to a deceptively small question: who hands out
              identifiers, for what properties, at what coordination price?
            </p>

            <h3>The requirements matrix</h3>
            <p>
              Five properties, and you cannot maximise them all: <strong>uniqueness</strong>{' '}
              (non-negotiable), <strong>coordination cost</strong> (may issuers mint without
              talking?), <strong>sortability</strong> (do IDs order by creation time? — your
              B-tree cares deeply), <strong>opacity</strong> (do IDs leak volume or invite
              guessing?), and <strong>size</strong> (128 bits in every index and URL, forever).
              Every scheme is a stance on these five.
            </p>
            <Tbl>
              <table>
                <thead>
                  <tr><th>Scheme</th><th>Coordination</th><th>Sortable</th><th>The catch</th></tr>
                </thead>
                <tbody>
                  <tr><td>UUIDv4 (random)</td><td>none</td><td>no</td><td>random inserts shred B-tree locality — pages split everywhere (storage chapter’s revenge)</td></tr>
                  <tr><td>Snowflake-style</td><td>worker-ID assignment once</td><td>yes (ms timestamp + worker + sequence)</td><td>clocks: skew reorders, backwards steps threaten uniqueness</td></tr>
                  <tr><td>ULID / UUIDv7</td><td>none</td><td>yes (time prefix + randomness)</td><td>creation time is readable — opacity traded away</td></tr>
                  <tr><td>Ticket server / ranges</td><td>rare batch grants</td><td>roughly</td><td>a service to run; blocks if unreachable when ranges exhaust</td></tr>
                </tbody>
              </table>
            </Tbl>

            <h3>Time-based IDs meet the clocks chapter</h3>
            <p>
              Snowflake’s layout — 41 bits of milliseconds, 10 of worker, 12 of per-ms sequence —
              is elegant until the Distributed Systems time chapter knocks: NTP steps a clock{' '}
              <em>backwards</em> and a worker can re-mint a timestamp it already used. Real
              implementations must choose — refuse to issue until the clock catches up (brief
              stall), or track last-issued time and always advance (drift from wall time). Neither
              is wrong; not choosing is. Same story for sequence overflow: more than 4,096 IDs in
              one millisecond on one worker → wait for the next tick. These edge cases are the
              entire implementation; the happy path is bit-packing.
            </p>

            <h3>The pragmatic classics, and the API surface</h3>
            <p>
              Flickr’s ticket servers (this chapter’s reading) remain the honest budget option:
              two MySQL boxes, offset auto-increments (one issues odds, the other evens), each
              app server grabbing IDs in batches — coordination amortised to near-zero, and the
              whole thing debuggable by anyone. It quietly generalises to{' '}
              <strong>pre-allocated ranges</strong>: grant each node a block of a million, refill
              early, never block on the hot path. Finally, the property teams forget until the
              incident: <strong>IDs are API surface</strong>. Sequential public IDs leak volume
              (“order 10,412” tells competitors your daily rate) and invite enumeration
              (<code>/invoices/10413</code>). The standard resolution: sortable IDs{' '}
              <em>internally</em> where the B-tree lives, opaque tokens <em>externally</em> where
              strangers browse — and 64-bit integers travel JSON as strings, because JavaScript’s
              2⁵³ ceiling (Foundations, data representation) is waiting for exactly this mistake.
            </p>
            <Callout>
              Pick the ID scheme off the requirements matrix, then engineer its failure edges —
              backwards clocks, exhausted ranges, sequence overflow. UUIDv7-style time-ordered
              randomness is the modern default; everything else needs a named reason.
            </Callout>
          </>
        ),

        /* ── Files, media and blob storage ───────────────────────── */
        blob: (
          <>
            <p>
              The database stores who uploaded the video, when, and for whom; something else
              entirely stores the video. Mixing those two jobs is the original sin of file
              handling — gigabytes of binary in a system engineered for transactional rows — and
              this chapter is the standard architecture that keeps them apart.
            </p>

            <h3>Object storage — what the contract actually says</h3>
            <p>
              S3-style stores speak a deliberately tiny language: PUT a blob at a key, GET it,
              DELETE it, list by prefix. No partial updates, no transactions across objects, no
              filesystem semantics — and in exchange: eleven-nines durability (many copies across
              zones), effectively unbounded scale, and pennies per gigabyte. Why filesystems lose
              at this game is the Haystack paper in this chapter’s reading: at billions of small
              files, filesystem <em>metadata</em> (directories, permissions, per-file inodes)
              costs more I/O than the photos — Facebook’s fix was to pack millions of images into
              huge append-only files with one in-memory index, turning any photo fetch into one
              seek. That is object storage’s soul: blobs as immutable values, metadata somewhere
              built for metadata.
            </p>

            <h3>Uploads — never proxy the bytes</h3>
            <p>
              The rookie topology streams uploads through your app servers into storage — burning
              your compute, your memory (Little’s Law with 100 MB requests is brutal), and your
              patience. The standard pattern inverts it with <strong>presigned URLs</strong>:
              the client asks your API “I want to upload photo.jpg”; the API authorises, writes a
              pending-media row, and returns a short-lived signed URL; the client PUTs{' '}
              <strong>directly to storage</strong>; a storage event (or client confirm) flips the
              row to ready. Your servers touch metadata only. Large files add{' '}
              <strong>multipart</strong> (upload in parallel chunks, retry only the chunk that
              failed — at-least-once, applied to bytes) and resumability for free.
            </p>

            <h3>The media pipeline</h3>
            <p>
              The uploaded original is almost never what you serve — video needs transcoding to
              multiple resolutions, images need thumbnails and format variants. This is the jobs
              chapter wearing headphones: upload-complete emits an event; workers consume,
              process, write derivatives back to storage under versioned keys; the metadata row
              tracks state (<code>uploaded → processing → ready</code>) and the product shows
              honest intermediate UI. Everything idempotent — the transcoder <em>will</em> run
              twice — and derivatives are derived data (rebuildable from the original), so they
              get lifecycle rules, not backups.
            </p>

            <h3>Serving, and the bill</h3>
            <p>
              Serving is the CDN chapter applied: immutable derivative keys cached hard at the
              edge; <strong>signed URLs</strong> for private content so authorisation stays yours
              while bytes stay on the CDN; <strong>range requests</strong> honoured for video
              seeking. The bill has two lines people forget: <strong>egress</strong> (bytes out
              cost multiples of bytes stored — the CDN is also a cost optimisation) and{' '}
              <strong>storage classes</strong> (hot originals → infrequent-access → archive, on
              lifecycle rules — old originals are cold by month two, and archive tiers charge for
              retrieval, so the class is a promise about access patterns, not just a discount).
            </p>

            <h3>Where it bites</h3>
            <ul>
              <li>Blobs in the database — backups balloon, replication crawls, and the buffer pool evicts your actual rows.</li>
              <li>Orphans: storage writes that never got their metadata row (or vice versa) — the outbox discipline applies to files too; reconcile by listing.</li>
              <li>Serving private media by copying through the app tier “because auth” — signed URLs exist precisely for this.</li>
              <li>Unversioned derivative keys — a re-transcode now needs a CDN purge instead of a new name.</li>
            </ul>
            <Callout>
              Metadata in the database, bytes in object storage, delivery via the CDN, processing
              on the queue — four systems, each doing the one thing it is built for. Every file
              architecture that hurts is one of these four jobs done by the wrong system.
            </Callout>
          </>
        ),

        /* ── Realtime: websockets, presence and push ─────────────── */
        realtime: (
          <>
            <p>
              Everything so far assumed the client asks first. Chat, live dashboards, collaborative
              cursors and “driver is 2 minutes away” invert it: the <em>server</em> has news. This
              chapter is the options ladder for pushing, and the architecture that keeps a million
              open connections from becoming your defining problem.
            </p>

            <h3>The options ladder</h3>
            <Tbl>
              <table>
                <thead>
                  <tr><th>Mechanism</th><th>How</th><th>Right when</th></tr>
                </thead>
                <tbody>
                  <tr><td>Short polling</td><td>ask every n seconds</td><td>lag tolerance ≥ n; brutally simple; wasteful at scale</td></tr>
                  <tr><td>Long polling</td><td>server holds the request until news or timeout</td><td>near-realtime through hostile proxies; the honest fallback</td></tr>
                  <tr><td>Server-sent events</td><td>one HTTP response, kept open, streaming events</td><td>one-directional feeds (tickers, notifications) — auto-reconnect built in</td></tr>
                  <tr><td>WebSocket</td><td>HTTP upgraded to a persistent two-way frame pipe</td><td>bidirectional and chatty: chat, games, collaboration</td></tr>
                </tbody>
              </table>
            </Tbl>
            <p>
              The professional instinct is to climb only as high as needed — SSE covers a
              surprising share of “we need websockets”, at a fraction of the operational surface.
            </p>

            <h3>What a million connections actually costs</h3>
            <p>
              An idle WebSocket is cheap-ish — tens of KB of buffers and an entry in the event
              loop (Foundations’ epoll, at last cashing its cheque: a thread per connection died
              right here). A million idle connections is therefore tens of GB and very careful
              file-descriptor limits: real, but manageable on a modest fleet. The true cost is
              architectural: connections are <strong>state</strong>. The socket tier cannot be
              casually restarted (every deploy disconnects everyone — stagger it), the L7
              balancer must support upgrades and long lives, and “which server holds Alice?”
              becomes a routing question the next paragraph answers.
            </p>

            <h3>The two-tier shape, and fan-out</h3>
            <p>
              Keep socket servers <strong>dumb</strong>: they authenticate, hold connections, and
              subscribe each to the topics it cares about (<code>room:42</code>,{' '}
              <code>user:alice</code>) on a <strong>pub/sub backbone</strong> (Redis pub/sub, NATS,
              Kafka by need). Application servers stay stateless and simply publish — “message in
              room 42” — and every socket server holding a member delivers it. Nobody asks where
              Alice is connected; the subscription <em>is</em> the routing table. Presence — who is
              online, who is typing — is deliberately ephemeral state: TTL’d keys refreshed by
              heartbeats, living in memory, never the database; it is a derived view of
              connections, and losing it costs a few seconds of green dots.
            </p>

            <h3>Reconnection is the real protocol</h3>
            <p>
              Mobile networks guarantee disconnects, so design for the gap, not against it:
              clients reconnect with jittered backoff (the retry rules, verbatim) carrying a{' '}
              <strong>resume token</strong> — last-seen sequence per topic — and the server
              replays what they missed from a short buffer… which is the streams chapter’s log,
              in miniature: per-topic ordering, consumer offsets, catch-up reads. Beyond the
              buffer’s horizon, fall back to “refetch state via the API”. And when no socket
              exists at all — app backgrounded, phone in a pocket — <strong>mobile push</strong>{' '}
              (APNs/FCM) is the delivery of last resort: an unreliable, rate-shaped hint to come
              online, not a message bus; anything important still lands in the inbox model
              server-side.
            </p>
            <Callout>
              Realtime = stateless app tier + dumb stateful socket tier + pub/sub between them +
              a resumable per-topic sequence. Every scaling problem in it maps to a chapter you
              already have — connections to the event loop, fan-out to the log, recovery to
              retries with offsets.
            </Callout>
          </>
        ),

        /* ── Background work: queues, schedulers and cron at scale ── */
        jobs: (
          <>
            <p>
              Every request handler eventually accumulates barnacles — send the email, resize the
              image, sync the CRM — until p99 is a tour of your integrations. The fix is one
              honest sentence: <em>acknowledge now, do it later</em>. But “later” is a system, and
              because nobody designs it on purpose, it is where reliability quietly goes to die.
              This chapter designs it on purpose.
            </p>

            <h3>A task queue is not an event stream</h3>
            <p>
              The streams chapter’s log broadcasts <em>facts</em> to whoever cares, retained and
              replayable. A <strong>task queue</strong> distributes <em>work</em>: each task goes
              to exactly one worker, gets acknowledged on success, is redelivered on timeout, and
              after N failures lands in a <strong>dead-letter queue</strong> — parked with its
              error for a human, because infinite retries on a poison task is a treadmill, not
              persistence. Choose by noun: fact → log; chore → queue. (Kafka can back a work
              queue; you will simply be implementing redelivery and DLQs yourself — sometimes
              worth it, never free.)
            </p>

            <h3>Workers live under Distributed Systems law</h3>
            <p>
              Delivery is at-least-once — the worker that finishes and dies before acking means
              the task <em>will</em> run twice — so every handler is <strong>idempotent</strong>{' '}
              or it is wrong: charge-payment carries an idempotency key; send-email checks a
              sent-record; resize-image overwrites the same derivative key (naturally idempotent —
              the best kind). Two operational patterns complete the worker: a{' '}
              <strong>visibility timeout</strong> comfortably above real task duration (too short
              is a duplicate-work generator), and <strong>per-tenant fairness</strong> — one
              customer’s 3-million-task import must not starve everyone’s password resets, so
              partition queues by priority and/or tenant and cap per-tenant concurrency. Priority
              inversion is real: the bulk lane never blocks the urgent lane.
            </p>

            <h3>Later, and repeatedly: timers and distributed cron</h3>
            <p>
              “Send the reminder in 24 hours” wants <strong>delayed delivery</strong> (native in
              good queues; otherwise a sorted-by-due-time store swept by a poller — a timer wheel
              at heart). “Every night at 2:00” wants cron — and distributed cron is a trap
              wearing a crontab: run the schedule on three boxes for availability and the job
              fires three times. The correct shape is this chapter’s SRE reading: leader-elect the
              scheduler (coordination chapter — lease plus fencing token), the leader enqueues{' '}
              <em>tasks</em> rather than doing work, and fired-at state is recorded so a failover
              neither skips nor repeats the 2:00 run. Idempotent jobs make even that bookkeeping
              forgiving. And respect the humble timezone: “9 a.m. local, per user” is a
              per-timezone fan-out with DST edges — schedule in UTC, map at enqueue time.
            </p>

            <h3>Observability for the invisible</h3>
            <p>
              Background work fails silently by default — nobody is waiting on the response. The
              dashboard that keeps it honest: <strong>queue depth</strong> and — better —{' '}
              <strong>age of the oldest task</strong> (depth says busy; age says <em>late</em>),
              per-queue failure and retry rates (a retry surge is an incident with a fuse), DLQ
              size with an alert on first arrival, and worker saturation for the capacity story.
              Little’s Law closes the loop: arrival rate × average task time = workers needed;
              when age climbs, that equation names the deficit.
            </p>
            <Callout>
              “Later” is a promise with no user watching you keep it. Idempotent handlers, honest
              timeouts, a dead-letter lane, fair scheduling, and an age-of-oldest alert — that is
              the entire difference between async and amnesia.
            </Callout>
          </>
        ),

        /* ── Rate limiting and abuse protection ──────────────────── */
        ratelimit: (
          <>
            <p>
              Your API will be called too much. Not maliciously, mostly — a partner’s retry loop
              without backoff, a mobile release polling every second, your own batch job at
              midnight — and the failure chapter taught what unbounded intake does to a system.
              Rate limiting is where you decide the rules before the flood, and communicate them
              so well-behaved clients can stay well-behaved.
            </p>

            <h3>The algorithms, honestly compared</h3>
            <Tbl>
              <table>
                <thead>
                  <tr><th>Algorithm</th><th>Mechanic</th><th>Character</th></tr>
                </thead>
                <tbody>
                  <tr><td>Fixed window</td><td>counter per minute, reset on the boundary</td><td>trivial; permits 2× bursts straddling the reset — fine for rough caps only</td></tr>
                  <tr><td>Sliding window counter</td><td>weighted blend of this window and last</td><td>smooths the straddle cheaply; the pragmatic middle</td></tr>
                  <tr><td>Token bucket</td><td>tokens drip in at rate r up to burst b; requests spend one</td><td>the default: steady rate <em>plus</em> honest bursts — matches real traffic</td></tr>
                  <tr><td>Leaky bucket</td><td>queue drained at fixed rate</td><td>smooths output perfectly; adds queueing delay — shaping, not just limiting</td></tr>
                </tbody>
              </table>
            </Tbl>
            <p>
              Token bucket wins most arguments because its two knobs map to the two real
              questions: sustained rate (r) and forgivable burst (b). Stripe’s post in the reading
              runs exactly this in production, with a detail worth stealing: alongside the
              per-user limiter sits a <strong>load shedder</strong> that reserves capacity for
              critical traffic when the whole system is hot — rate limiting protects you from one
              client; shedding protects everyone from everything (the failure chapter, at the
              front door).
            </p>

            <h3>Keys, layers, and the distributed counter</h3>
            <p>
              What you key on is policy: per API key (the baseline), per user, per IP (weak alone
              — NATs share IPs, botnets don’t), per tenant, and layered — a per-endpoint cap
              inside a global cap, expensive endpoints priced lower. Then the systems question:
              counters <em>where</em>? A shared Redis gives exact global limits and adds a hop
              plus a hot key at scale (atomic Lua for check-and-spend); per-node local buckets are
              free and fuzzy (N nodes ≈ N× the limit worst-case). The grown-up answer is the
              hybrid: coarse local buckets as the first gate, the shared store for the precise
              global ceiling — and remember the sketches chapter when “roughly over” is good
              enough. Precision here is a cost knob, not a virtue.
            </p>

            <h3>Saying no like a professional</h3>
            <p>
              A rate limit response is API surface (the API chapter’s law: it will be depended
              on): <code>429 Too Many Requests</code>, a <code>Retry-After</code> that is
              honest, and limit/remaining/reset headers so clients can pace{' '}
              <em>before</em> hitting the wall. Well-built clients treat 429 + backoff + jitter as
              routine; your own SDKs should model it. And distinguish the neighbour from the
              adversary: limits handle the noisy; <strong>abuse</strong> (credential stuffing,
              scraping, carding) gets its own playbook — cost-based limits (login attempts priced
              steeply), concurrency caps, device/behaviour signals, and the occasional tarpit —
              because an attacker under your rate limit is still an attacker.
            </p>

            <h3>Where it bites</h3>
            <ul>
              <li>Announcing limits nowhere, then enforcing them — partners discover policy as an outage.</li>
              <li>One global Redis counter as a single point of failure — the limiter must fail open or degrade local, never take the API down with it.</li>
              <li>Limiting after the expensive work — the gate belongs at the gateway, before the fan-out.</li>
              <li>Uniform pricing: a search-everything endpoint costing the same token as a health check.</li>
            </ul>
            <Callout>
              A rate limiter is capacity policy made explicit: how much, for whom, said in headers
              a machine can obey. Decide it calmly, enforce it early, and pair it with shedding —
              the flood will come from a customer you like.
            </Callout>
          </>
        ),

        /* ── Identity, authorisation and the security basics ─────── */
        security: (
          <>
            <p>
              Every chapter so far assumed the caller is who they claim. That assumption is a
              subsystem, and it fails differently from everything else you have built: a down
              system stops working, a broken auth system <em>keeps working for the wrong
              people</em>. This chapter is the load-bearing minimum every designer owes the
              system — not a security career, but the parts you cannot delegate.
            </p>

            <h3>Sessions vs tokens — where the risk lives</h3>
            <p>
              After login, something must carry “this is Alice” on every request. A{' '}
              <strong>server-side session</strong> (opaque cookie → session store) keeps state
              central: revocation is deleting a row, the cookie leaks nothing — at the cost of a
              lookup per request and a shared store (the reads chapter says: cache it). A{' '}
              <strong>JWT</strong> moves the state into a signed token: any service verifies it
              locally, no lookup, beautiful for service-to-service — and the signature is also
              the trap: <em>a JWT cannot be un-issued</em>. Until expiry it is valid, logout or
              breach notwithstanding — so JWTs live short (minutes), pair with revocable{' '}
              <strong>refresh tokens</strong>, and anything sensitive keeps a deny-list check
              anyway… at which point you have rebuilt half a session store and should ask if you
              needed the JWT. Browser cookies get the armour: <code>HttpOnly</code>,{' '}
              <code>Secure</code>, <code>SameSite</code> — three flags that neutralise whole
              attack classes.
            </p>

            <h3>OAuth and OIDC without the fog</h3>
            <p>
              OAuth 2 answers <em>delegation</em> — “let this app read my calendar without my
              password” — and OIDC adds “and tell the app who I am”. The modern guidance (this
              chapter’s reading, by a spec editor) collapses to one flow worth knowing cold:{' '}
              <strong>authorization code + PKCE</strong> — redirect to provider, user consents,
              app exchanges a one-time code (plus a proof only it holds) for tokens. PKCE exists
              because the older implicit flow put tokens in URLs, and URLs leak. Everything else
              in the spec zoo is a variant for machines (client credentials) or legacy to avoid.
            </p>

            <h3>Authorisation — the part you will get paged for</h3>
            <p>
              Authentication says who; <strong>authorisation</strong> says what — and its bugs are
              the boring catastrophic kind: <code>/invoices/10413</code> served to the wrong
              tenant because someone checked <em>logged in</em> but not <em>owns it</em> (IDOR,
              perennial #1 in the wild). The discipline: <strong>RBAC</strong> for coarse
              structure (roles → permissions), attribute checks for the fine grain (owner,
              tenant, state) — but above all <em>one</em> enforcement point per resource type,
              because authorisation smeared across handlers is authorisation with gaps. In
              multi-tenant systems, make the tenant check structural, not disciplinary: tenant_id
              in every key/query by construction (the sharding chapter’s keys double as an
              isolation boundary), so forgetting the WHERE clause is hard, not habitual.
            </p>

            <h3>The transport and the secrets</h3>
            <p>
              Non-negotiables, briefly: <strong>TLS everywhere</strong>, including inside the
              perimeter — “internal” networks stopped being trustable a decade ago; mTLS (or a
              mesh doing it for you) gives services mutual identity. <strong>Secrets</strong> live
              in a manager with rotation and audit, never in env-files-forever, never in git
              (history is immutable; a leaked key is rotated, not deleted). Passwords —
              if you must hold them — are argon2/bcrypt-hashed, and the better answer is
              increasingly to not hold them at all (OIDC to an identity provider, passkeys). And
              the <strong>OWASP Top Ten</strong> is not compliance theatre; it is a design-review
              checklist — read your architecture against it once per major change and injection,
              broken access control and SSRF stop being surprises.
            </p>
            <Callout>
              Authenticate at the edge, authorise at every resource, encrypt every hop, and keep
              one revocation story you actually believe. Auth is the subsystem whose failures are
              silent — design it with the paranoia you save for money, because it is the door to
              the money.
            </Callout>
          </>
        ),

        /* ── Multi-region and disaster recovery ──────────────────── */
        multiregion: (
          <>
            <p>
              One region is a single point of failure with excellent marketing. But “go
              multi-region” is not a checkbox — it is a family of postures with order-of-magnitude
              cost differences, and the honest conversation starts with two numbers, not with
              architecture.
            </p>

            <h3>RPO and RTO — the two numbers</h3>
            <p>
              <strong>RPO</strong> (recovery point objective): how much data may be lost —
              the gap between the last safe copy and the disaster. <strong>RTO</strong> (recovery
              time objective): how long until service returns. “Zero and zero” is a wish, not a
              requirement; every posture below is a price on this pair, and the business — not
              the architect — owns choosing it. Ask per <em>system</em>: the payments ledger and
              the recommendation cache do not deserve the same numbers.
            </p>
            <Tbl>
              <table>
                <thead>
                  <tr><th>Posture</th><th>RPO / RTO</th><th>What it really is</th></tr>
                </thead>
                <tbody>
                  <tr><td>Backups + restore</td><td>hours / hours-days</td><td>the floor. Tested restores or it is a rumour, not a posture</td></tr>
                  <tr><td>Pilot light</td><td>minutes / ~an hour</td><td>data replicated cross-region; infra as code, ignited on demand</td></tr>
                  <tr><td>Warm standby</td><td>seconds-minutes / minutes</td><td>scaled-down full copy always running; scale up + fail over</td></tr>
                  <tr><td>Active-active</td><td>~0 / ~0</td><td>all regions serve; the hard problems of this pathway, at full price</td></tr>
                </tbody>
              </table>
            </Tbl>

            <h3>Active-active, honestly</h3>
            <p>
              Serving writes from two regions is the Distributed Systems pathway with real
              latency: cross-region round trips are ~60–150 ms, so synchronous replication taxes
              every write and asynchronous replication means a failover <em>loses acknowledged
              writes</em> (there is your non-zero RPO) — while accepting writes both sides is
              multi-leader, and “which region’s update to the cart wins” is the conflict chapter
              you already read. The professional pattern that dodges most of it:{' '}
              <strong>home the data</strong> — partition users/tenants to a primary region each
              (often legally required anyway: residency), serve them locally, replicate
              asynchronously for disaster, and reserve true multi-writer conflict resolution
              (CRDTs, LWW-with-eyes-open) for the few datasets that genuinely need it. Many
              “active-active” systems are honestly “active-active for reads, homed for writes” —
              and better for admitting it.
            </p>

            <h3>Static stability, and the failover you can trust</h3>
            <p>
              The Builders’ Library idea in this chapter’s reading deserves its name in your
              vocabulary: <strong>static stability</strong> — surviving a zone or region loss{' '}
              <em>without any control-plane action</em>. Pre-provision N+1 capacity so the
              survivors absorb the load without an autoscaler (which is down too, or panicking)
              having to act during the incident. The failover mechanics themselves: DNS-based
              (TTL-bound, minutes, clients that ignore TTLs exist) or anycast/global-LB
              (seconds); health checks that trip on <em>region-level</em> signals, with a manual
              override, because flapping between regions is worse than either region. And the
              rules that decide whether any of it works on the day: <strong>rehearse</strong> —
              an untested failover is a rumour (game days, the DS testing chapter, applied);
              beware the <strong>fail-back</strong>, which is often riskier than the failover
              (the returned region is cold-cached and stale — warm it deliberately); and drain{' '}
              <em>toward</em> your capacity, not toward hope.
            </p>
            <Callout>
              Multi-region is a price list, and RPO/RTO are the currency. Buy the cheapest posture
              that meets the numbers, home your writes, pre-provision the survivors, and rehearse
              the switch — a disaster plan is exactly as real as its last drill.
            </Callout>
          </>
        ),

        /* ── Shipping safely: deploys, flags and migrations ──────── */
        delivery: (
          <>
            <p>
              The failure chapter dealt with the outages that arrive; this one deals with the
              outages we ship. Most production incidents walk in through the front door wearing a
              deploy badge — which is excellent news, because unlike hardware and networks,{' '}
              <em>this</em> failure source is entirely under your process control.
            </p>

            <h3>Bounded blast radius as a deployment property</h3>
            <p>
              <strong>Blue-green</strong>: two identical environments; deploy to the idle one,
              flip traffic, keep the old one warm as an instant rollback. Clean, doubled
              infrastructure, and the flip is all-or-nothing. <strong>Canary</strong>: route 1%,
              then 5%, then 25% to the new version, watching error rates, latency percentiles and
              business metrics at each step — blast radius is the dial itself, and the honest
              modern default. The step that separates adults from tourists:{' '}
              <strong>automated rollback</strong> wired to the SLO — if the canary burns error
              budget, the system reverts without waiting for a human to notice the graph. Which
              implies the real prerequisite: rollback is a <em>designed path</em>, tested like the
              deploy, not a git-revert improvised at 3 a.m.
            </p>

            <h3>N and N+1 always run together</h3>
            <p>
              During any rollout, old and new code serve simultaneously — same traffic, same
              database, same queues. That single fact generates the compatibility law: every
              deploy must be safe <em>alongside</em> its predecessor. Message and API changes
              follow the RPC chapter’s rules; the database gets the famous three-step,{' '}
              <strong>expand–migrate–contract</strong>: (1) <em>expand</em> — add the nullable
              column/new table, code reads old, writes both; (2) <em>migrate</em> — backfill in
              rate-limited batches (never one giant UPDATE holding locks on a hot table — the
              writes chapter explains exactly why); (3) <em>contract</em> — once nothing reads
              the old shape, drop it, in a <em>later</em> deploy. Slower than the big-bang
              rename? Yes. It is also the difference between a schema change and an outage with
              a schema change inside it. Renames are the classic trap: a rename is an add + a
              drop, never a rename.
            </p>

            <h3>Flags: decoupling deploy from release</h3>
            <p>
              The sharpest tool in the drawer: ship code dark behind a <strong>feature
              flag</strong>, then release by flipping a percentage — per user, per tenant, per
              region — and unrelease in seconds without a deploy. This is also the kill switch
              the AI chapters demanded, and how deploy risk (did the binary break?) gets
              separated from release risk (does the feature behave?). The taxonomy in Hodgson’s
              essay is worth internalising because the <em>lifetimes</em> differ: release flags
              die in weeks (delete them — flag debt is real code debt: every stale flag doubles
              the test matrix), ops flags (kill switches, load-shedding levers) live forever and
              get tested like circuit breakers, permission flags are entitlements wearing a
              flag’s clothes and belong in the auth system eventually.
            </p>

            <h3>Where it bites</h3>
            <ul>
              <li>The Friday migration that renames a column — v(N) is still reading it; instant 500s fleet-wide.</li>
              <li>Canary judged on error rate alone — latency p99 and the business metric are how quiet degradations ship.</li>
              <li>Rollback that “mostly works” — if the new code wrote data the old code cannot read, your rollback is forward-only; expand–contract exists for this too.</li>
              <li>Two hundred live flags, ownerless — nobody can say what production even is. Flags get owners and expiry dates at creation.</li>
            </ul>
            <Callout>
              Deploys are the one failure source you schedule. Make them boring: dark launches,
              percentage rollouts, SLO-triggered rollback, and schema changes that always leave
              both neighbouring versions alive. Boring is the achievement.
            </Callout>
          </>
        ),

        /* ── The problem atlas: classic designs decomposed ───────── */
        atlas: (
          <>
            <p>
              The worked chapter taught the method on one problem. This closing chapter is the
              map: the canonical design prompts, each reduced to the two or three chapters that
              make it hard. Use it in both directions — given a problem, find its chapters; given
              a chapter, know which problems rehearse it. The core skill of the professional (and
              the interview) is exactly this classification, done fast and out loud.
            </p>

            <h3>The atlas</h3>
            <Tbl>
              <table>
                <thead>
                  <tr><th>Problem</th><th>The crux</th><th>Built from</th></tr>
                </thead>
                <tbody>
                  <tr><td>News feed</td><td>fan-out on write (precompute feeds; celebrities explode it) vs on read (compute at request; hot users pay) — the hybrid: push for most, pull for the famous</td><td>reads, sharding, streams, derived</td></tr>
                  <tr><td>Chat</td><td>per-conversation ordering (one partition per conversation — DS ordering, applied), presence, delivery receipts as idempotent state machines</td><td>realtime, streams, jobs</td></tr>
                  <tr><td>Ride matching</td><td>geo index for candidates, then <em>contention</em>: two riders, one driver — a lock/reservation with expiry decides; surge is backpressure with a price tag</td><td>geo, writes, jobs, failure</td></tr>
                  <tr><td>Ticketing / flash sale</td><td>inventory is the invariant: reserve-with-TTL, confirm on payment, release on expiry; a queue at the door sheds the stampede honestly</td><td>writes, jobs, ratelimit, failure</td></tr>
                  <tr><td>Web crawler</td><td>the frontier is a giant priority queue; politeness = per-domain rate limits; seen-URLs = a Bloom filter at billions; DNS becomes your bottleneck</td><td>jobs, sketches, ratelimit, cdn</td></tr>
                  <tr><td>Video platform</td><td>upload → transcode fan-out → CDN economics; view counts at scale are sketches, not counters</td><td>blob, jobs, cdn, sketches</td></tr>
                  <tr><td>Notification system</td><td>multi-channel fan-out with per-user preferences, collapsing (“5 new likes”), per-channel rate limits, and idempotent sends — the duplicate notification is the brand-killer</td><td>jobs, streams, ratelimit, ids</td></tr>
                  <tr><td>Distributed counter / analytics</td><td>exact counters contend (shard them, sum on read) — or admit the question is operational and reach for HLL/count-min</td><td>sketches, sharding, derived</td></tr>
                </tbody>
              </table>
            </Tbl>

            <h3>Reading the table like a professional</h3>
            <p>
              Notice what repeats. <strong>Jobs and streams appear almost everywhere</strong> —
              because nearly every hard problem decomposes into “acknowledge fast, process
              async, keep order where it matters”. <strong>The invariant names the design</strong>:
              feed = eventual and cheap, ticketing = strict and reserved; ask “what must never
              be wrong?” and half the architecture writes itself. And{' '}
              <strong>hybrids beat purities</strong>: push+pull feeds, exact-then-approximate
              counters, homed-writes-active-reads regions — the canonical answers are almost all
              “both, partitioned by the case that stresses each”.
            </p>
            <p>
              To turn the atlas into skill: take one row per week, run it through the worked
              chapter’s framework — requirements, envelope arithmetic, the boring design, deep
              dives where your numbers say it breaks — then read a real engineering-blog
              writeup of the same system (the aggregated reading list next door at{' '}
              <strong>/tech-blogs</strong> exists for exactly this) and diff their scars against
              your sketch. The gap is your syllabus, personalised. Do that eight times and you
              will have finished this course in the only sense that matters.
            </p>
            <Callout>
              Every “new” system design is a remix of perhaps a dozen mechanisms you now own.
              Classify the problem by its invariant and its stressed chapters, and you are never
              starting from a blank page again — which was the point of the whole pathway.
            </Callout>
          </>
        ),
}
