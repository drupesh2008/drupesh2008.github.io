import type { Metadata } from 'next'
import Pathway, { Callout, Fig, Tbl } from '@/components/Pathway/Pathway'
import { TimeoutAmbiguity, QuorumOverlap, ReplicatedLog } from './diagrams'

export const metadata: Metadata = {
  title: 'Distributed Systems — a free pathway from zero to professional',
  description:
    'Partial failure, time and order, replication, consistency and consensus — a comprehensive free course written for this site, with the canonical papers and lectures linked at every stage.',
}

export default function DistributedSystemsPage() {
  return (
    <Pathway
      trackId="distributed-systems"
      sections={{
        /* ── Stage 1 ─────────────────────────────────────────────── */
        'partial-failure': (
          <>
            <p>
              On a single machine, failure is refreshingly honest: the process is running or it has
              crashed, and the operating system knows which. Split the work across two machines and
              a third state appears that has no equivalent in single-machine life —{' '}
              <strong>unknown</strong>. You sent a request. Nothing came back. Now what do you
              actually know?
            </p>
            <Fig caption="Fig 1 · Three different failures, one identical experience — the silence does not say which">
              <TimeoutAmbiguity />
            </Fig>
            <p>
              Almost nothing, and that is the founding problem of the whole field. The request may
              have been lost before arriving. The server may have crashed after doing the work. The
              reply may have vanished on the way back. From where you sit these are
              indistinguishable, so a timeout is not information about what happened —{' '}
              <em>it is a decision you make in the absence of information.</em>
            </p>

            <h3>Naming the ways things fail</h3>
            <p>
              It helps to know which failure model you are designing for, because they cost wildly
              different amounts to handle:
            </p>
            <Tbl>
              <table>
                <thead>
                  <tr><th>Model</th><th>The machine may…</th><th>Handled by</th></tr>
                </thead>
                <tbody>
                  <tr><td>Crash-stop</td><td>halt, and never return</td><td>replication, failover</td></tr>
                  <tr><td>Crash-recovery</td><td>halt, then come back with its disk but not its memory</td><td>write-ahead logs, rejoin protocols — the realistic default</td></tr>
                  <tr><td>Network partition</td><td>keep running but be unreachable</td><td>the hard one: indistinguishable from crash, resolved by quorums (Stage 4)</td></tr>
                  <tr><td>Byzantine</td><td>lie, corrupt, act maliciously</td><td>a different, far costlier family (BFT); assume it only when you must — blockchains do, your microservices should not</td></tr>
                </tbody>
              </table>
            </Tbl>
            <p>
              Ordinary backend engineering lives in crash-recovery plus partitions. Keep the eight
              classic “fallacies of distributed computing” pinned somewhere — <em>the network is
              reliable, latency is zero, bandwidth is infinite, the network is secure, topology
              doesn’t change, there is one administrator, transport cost is zero, the network is
              homogeneous</em> — every one of them is an outage report waiting for a date.
            </p>

            <h3>Retries, done properly</h3>
            <p>
              The timeout decision has teeth. If you retry and the original request actually
              succeeded, the work happens twice — a payment, an email, a row. So retries force a
              choice that shapes every serious API: at-least-once delivery with{' '}
              <strong>idempotent</strong> operations, or at-most-once and accept loss. There is no
              exactly-once wire; “exactly-once” in marketing means “at-least-once, deduplicated”.
            </p>
            <p>
              Idempotency is implemented, not declared. The standard mechanics: the client
              generates a unique <strong>idempotency key</strong> per logical operation and sends it
              on every attempt; the server records the key with the outcome (in the same transaction
              as the work — that detail is the whole trick) and, on seeing a repeat, returns the
              recorded outcome instead of re-executing. Keys need an expiry policy, and the record
              must survive crashes — which is why it lives in the database and not a process map.
            </p>
            <p>
              And retry <em>politely</em>, because naive retries are how one slow dependency becomes
              a self-inflicted flood: cap attempts (two or three, not “until it works”), back off{' '}
              <strong>exponentially</strong> (1s, 2s, 4s…), and add <strong>jitter</strong> —
              randomise each delay — so a thousand clients that failed together do not return in
              lockstep and knock the service down again on schedule. Retry only idempotent
              operations, and only errors that can plausibly heal (a timeout, a 503 — not a 400).
            </p>

            <h3>Why bother, then</h3>
            <p>
              Every arrow in your architecture diagram is now a place where the answer can be
              “unknown”, and the machines on either side of it fail <em>independently</em> — one
              rack loses power, the rest keep serving. That independence is the raw material of
              fault tolerance and the entire reason distribution is worth its pain. The rest of this
              pathway is about paying for it honestly: ordering events without shared time (Stage
              2), keeping copies that agree usefully (Stage 3), and getting a group to commit to one
              answer (Stage 4).
            </p>
            <Callout>
              A timeout tells you nothing about the fate of the request. Design every call as if it
              might have succeeded invisibly — because sometimes it did. Idempotency keys plus
              capped, jittered retries are the professional reflex.
            </Callout>
          </>
        ),

        /* ── Stage 2 ─────────────────────────────────────────────── */
        time: (
          <>
            <p>
              The natural next instinct is to reach for timestamps: if every machine records when
              things happened, surely you can reconstruct the order later. The instinct is wrong,
              and it is wrong in a way that corrupts data quietly rather than loudly.
            </p>

            <h3>What is wrong with clocks</h3>
            <p>
              Physical clocks drift — cheap quartz gains or loses on the order of{' '}
              <strong>tens of parts per million</strong>, seconds per day if uncorrected. NTP
              corrects them over the network, holding typical machines within a few milliseconds of
              truth on a good day and much worse under load — and the correction itself can{' '}
              <em>step the clock backwards</em>. Meanwhile a same-datacenter message arrives in half
              a millisecond. The conclusion is arithmetic: two machines’ timestamps routinely
              disagree by more than the time a message takes, so “compare the timestamps” can order
              a reply before the request that caused it. A last-write-wins store keyed on wall
              clocks will, on a bad day, let a stale write erase a newer one and log that all was
              well.
            </p>
            <p>
              One immediately practical rule falls out before any theory: your language exposes two
              clocks. The <strong>wall clock</strong> tells humans the time and may jump. The{' '}
              <strong>monotonic clock</strong> only moves forward and is the only one fit for
              measuring durations. Every timeout and every latency metric belongs on the monotonic
              clock; a surprising number of production incidents trace to violating this sentence.
            </p>

            <h3>Happens-before — order without time</h3>
            <p>
              Lamport’s 1978 move was to stop asking <em>when</em> events happened and ask what
              could have <em>caused</em> what. Define <strong>happens-before</strong> (written
              a → b) by three rules: if a and b are in the same process and a came first, a → b; if
              a is the sending of a message and b its receipt, a → b; and the relation chains (a → b
              and b → c gives a → c). Events connected by no chain are <strong>concurrent</strong> —
              not “simultaneous”, but causally unrelated: neither could have known about the other.
              Order in a distributed system is a partial order, and pretending otherwise is where
              the bugs come from.
            </p>
            <p>
              A <strong>Lamport clock</strong> makes this executable. Each process keeps a counter:
              increment on every local event; stamp outgoing messages with it; on receipt, set the
              counter to <code>max(local, message) + 1</code>. Walk an example: A’s counter reaches
              5 and it sends a message stamped 5; B, sitting at 2, receives it and jumps to 6. Now
              anything B does next is numbered after the send that influenced it — causality is
              respected. The limitation: if two events have stamps 5 and 6 you <em>cannot</em>{' '}
              conclude the 5 caused the 6; unrelated events also get ordered numbers. Lamport clocks
              give you <em>a</em> consistent order, not the ability to detect concurrency.
            </p>
            <p>
              <strong>Vector clocks</strong> buy that ability by keeping one counter per process.
              Each process increments its own slot; messages carry the whole vector; receivers take
              the element-wise max, then increment their slot. Now comparison is meaningful:
              [2,1,0] happened before [3,1,0] (every element ≤, one strictly less), while [2,1,0]
              and [1,2,0] are <em>concurrent</em> (each ahead somewhere) — which is precisely the
              signal a replicated store needs when two datacenters accepted writes to the same key
              and must decide: supersede, or genuine conflict? Dynamo, in Stage 5, deploys exactly
              this.
            </p>

            <h3>In practice</h3>
            <ul>
              <li>
                Real systems mostly buy order structurally: a Kafka partition or a Raft log is a
                place where order is <em>assigned once</em>, so consumers never re-derive it. When
                you need cross-machine order, the honest options are “put it through one log” or
                “carry causality metadata” — not “trust the timestamp”.
              </li>
              <li>
                <strong>Hybrid logical clocks</strong> (HLC) combine a wall clock with a logical
                counter — timestamps that are readable by humans <em>and</em> respect
                happens-before; several modern databases use them.
              </li>
              <li>
                And the exception that proves the rule: Google’s Spanner (Stage 5) gets away with
                timestamp ordering only by measuring clock <em>uncertainty</em> with GPS and atomic
                clocks and deliberately waiting it out. If you are not doing that, you do not have
                its guarantee.
              </li>
            </ul>
            <Callout>
              Order comes from messages, not from clocks. If no chain of messages connects two
              events, “which came first” has no answer — design the merge instead of denying the
              question.
            </Callout>
          </>
        ),

        /* ── Stage 3 ─────────────────────────────────────────────── */
        replication: (
          <>
            <p>
              You replicate data for three reasons, and it is worth naming which one you are buying:
              surviving a machine’s death (durability, availability), putting data near its readers
              (latency), and spreading read load. The price is one question that never goes away:{' '}
              <em>when the copies momentarily disagree, what does a read return?</em>
            </p>

            <h3>Leader–follower, and the shape of lag</h3>
            <p>
              The workhorse arrangement: writes go to one <strong>leader</strong>, which streams
              them to <strong>followers</strong>. The first design decision is when the leader
              acknowledges:
            </p>
            <Tbl>
              <table>
                <thead>
                  <tr><th>Mode</th><th>Ack when</th><th>You gain</th><th>You risk</th></tr>
                </thead>
                <tbody>
                  <tr><td>Asynchronous</td><td>leader has it</td><td>lowest latency</td><td>leader dies → acknowledged writes lost</td></tr>
                  <tr><td>Semi-synchronous</td><td>leader + one follower</td><td>no single-node loss</td><td>slightly slower; the usual compromise</td></tr>
                  <tr><td>Synchronous (all)</td><td>every follower</td><td>strongest durability</td><td>one slow node stalls all writes — rarely used as stated</td></tr>
                </tbody>
              </table>
            </Tbl>
            <p>
              Because followers run behind, lag surfaces as concrete, nameable anomalies — learn
              them by the user story: you post a comment, refresh, and it is gone (<strong>read
              your own writes</strong> violated — your write hit the leader, your read a stale
              follower); you refresh twice and the comment flickers in and out (<strong>monotonic
              reads</strong> violated — second read hit a <em>more</em> stale replica); an answer
              appears before the question it replies to (<strong>consistent prefix</strong>{' '}
              violated). Each has a standard patch — pin a user’s reads to the leader briefly after
              their writes, pin a session to one replica, order causally related items through one
              partition — but you must know you are buying the patch.
            </p>
            <p>
              Failover is the other sharp edge. Detecting a dead leader is Stage 1’s ambiguity all
              over again (slow ≠ dead); promoting a follower during async lag can silently discard
              the last acknowledged writes; and the old leader coming back convinced it still leads
              is <strong>split brain</strong> — two leaders accepting conflicting writes. Doing this
              safely is precisely the consensus problem, which is why Stage 4 exists.
            </p>

            <h3>The consistency ladder</h3>
            <p>
              A <strong>consistency model</strong> is the honest label on the jar — a contract about
              which read results are legal. The rungs you will actually discuss:
            </p>
            <Tbl>
              <table>
                <thead>
                  <tr><th>Model</th><th>The promise</th><th>Feels like</th></tr>
                </thead>
                <tbody>
                  <tr><td>Linearizable</td><td>as if one copy; every op atomic at some instant; reads see the latest write</td><td>a single machine — the gold standard, at a latency price</td></tr>
                  <tr><td>Sequential</td><td>one global order everyone agrees on, but not tied to real time</td><td>consistent, possibly stale together</td></tr>
                  <tr><td>Causal</td><td>whatever happened-before is seen in order; concurrent things may differ</td><td>conversations make sense; often the sweet spot</td></tr>
                  <tr><td>Session guarantees</td><td>read-your-writes, monotonic reads — per client</td><td>“I am not confused about myself”</td></tr>
                  <tr><td>Eventual</td><td>stop writing and replicas converge, eventually</td><td>anything goes, briefly</td></tr>
                </tbody>
              </table>
            </Tbl>
            <p>
              The professional skill is naming the rung <em>per piece of data</em>: the account
              balance wants linearizable; the like counter is happily eventual; the comment thread
              wants causal. And read CAP narrowly, because it is narrow: <em>during a partition</em>,
              a system must choose between serving possibly-stale answers and refusing to answer.
              That is all it says. On a healthy network the operative trade is latency versus
              freshness — waiting for more replicas buys stronger answers at slower speeds.
            </p>

            <h3>Quorums — the dial</h3>
            <Fig caption="Fig 2 · Quorums — overlap is the mechanism, not magic">
              <QuorumOverlap />
            </Fig>
            <p>
              Leaderless stores (the Dynamo family) make the trade tunable per request: write to W
              of N replicas, read from R, and if <strong>R + W &gt; N</strong> the read set must
              overlap the write set, so at least one consulted replica has the newest value (the
              client or coordinator reconciles versions — vector clocks from Stage 2 report which).
              With N = 3: W = 2, R = 2 balances both paths; W = 3, R = 1 makes reads cheap and
              writes fragile; W = 1, R = 1 is fast and guarantees nothing. Production wrinkles to
              know by name: <strong>sloppy quorums</strong> (during a partition, accept writes on
              stand-in nodes to stay available) and <strong>hinted handoff</strong> (those stand-ins
              deliver the writes home later) — availability preserved, overlap guarantee
              temporarily traded away.
            </p>
            <p>
              One more tool for the concurrent-writes problem deserves a name:{' '}
              <strong>CRDTs</strong> — data types (counters, sets, registers) built so concurrent
              updates merge deterministically by construction, no coordination needed. Where your
              data fits one (likes, presence, shopping carts), conflict resolution stops being your
              code’s problem at all.
            </p>
            <Callout>
              “Is it consistent?” is not a question. “Which model, for which data, and what does it
              cost at the tail?” is. Carry the ladder in your head and price each rung in round
              trips.
            </Callout>
          </>
        ),

        /* ── Stage 4 ─────────────────────────────────────────────── */
        consensus: (
          <>
            <p>
              Quorums let replicas converge, but some questions cannot tolerate “roughly agreed” —
              they need one answer, agreed, now, and still agreed after any minority of machines
              dies. Who is the leader? Did this transaction commit? Who holds the lock? Answer such
              a question twice, differently, and you get split brain and corrupted history. Getting
              a group of unreliable machines to answer it once is <strong>consensus</strong>.
            </p>

            <h3>Why the obvious approaches fail</h3>
            <p>
              “Have a coordinator ask everyone and commit if all say yes” is two-phase commit, and
              it has a fatal flaw as a consensus protocol: if the coordinator dies after collecting
              yes-votes but before announcing the outcome, every participant is stuck — voted,
              locked, and unable to decide alone. Blocking on a single failure is exactly what we
              were trying to escape. “Let the nodes vote by majority whenever they like” fails
              differently: without terms and careful rules, two candidates can each assemble
              overlapping support at different moments and both believe they won. Consensus
              protocols are precisely the bookkeeping that closes these gaps — and the arithmetic
              they all lean on is that <strong>any two majorities of the same group share at least
              one member</strong>.
            </p>

            <h3>Raft, in enough detail to trust it</h3>
            <p>
              Raft divides time into numbered <strong>terms</strong>. Every node is a follower,
              candidate, or leader. Followers expect periodic heartbeats from the leader; a follower
              that hears nothing for a <em>randomised</em> election timeout (the randomisation is
              what prevents endless split votes) increments the term and stands as a candidate,
              voting for itself and asking the rest. A node grants at most{' '}
              <strong>one vote per term</strong>, so two leaders in one term are arithmetically
              impossible: both would need majorities, and majorities intersect.
            </p>
            <p>
              The leader’s job is a <strong>replicated log</strong>. It appends each client command,
              ships entries to followers (with the index and term of the preceding entry — followers
              reject on mismatch, which is how divergent histories get detected and repaired), and
              declares an entry <strong>committed</strong> once a majority holds it. Committed
              entries are then applied, in order, by every node’s state machine — the log <em>is</em>{' '}
              the agreement.
            </p>
            <Fig caption="Fig 3 · The replicated log — an entry exists once it lives on a majority">
              <ReplicatedLog />
            </Fig>
            <p>
              Two safety rules make crashes survivable. The <strong>election restriction</strong>: a
              node only votes for a candidate whose log is at least as up-to-date as its own — so a
              winner’s majority necessarily includes every committed entry, and a new leader can
              never erase committed history. And leaders never overwrite their own entries; they
              only repair followers toward their log. Result: a cluster of 2f + 1 nodes rides out f
              failures — five nodes, two losses, business as usual; lose the majority and the
              cluster stops accepting writes rather than lying. That stop is a feature.
            </p>

            <h3>The practical layer: leases and fencing</h3>
            <p>
              Real systems rarely put consensus on the data path — every committed write costs a
              majority round trip. Instead, a small consensus service (etcd, ZooKeeper, Consul)
              guards the <em>control</em> plane: configuration, membership, and{' '}
              <strong>leases</strong> — time-boxed leadership grants that must be renewed. One trap
              remains even then: a leaseholder that pauses (a long GC, say), loses its lease without
              noticing, and resumes acting on stale authority. The fix is the{' '}
              <strong>fencing token</strong>: every lease carries a monotonically increasing number,
              downstream systems remember the highest they have seen, and actions bearing an older
              token are rejected. Authority you cannot fence is authority you do not have.
            </p>

            <h3>Deployment notes worth knowing</h3>
            <ul>
              <li>Run 3 or 5 voters — even counts add cost without adding failure tolerance; 5 tolerates 2 losses.</li>
              <li>Keep voters close: commit latency ≈ one round trip to the median voter. Cross-region consensus is a deliberate, priced decision.</li>
              <li>Throughput comes from batching and pipelining many commands per round trip — the protocol is not the bottleneck when operated well.</li>
              <li>Reads are subtle: serving them from the leader without a check risks stale reads from a deposed leader; production systems use lease-based reads or a quorum check.</li>
            </ul>
            <Callout>
              Majorities intersect — that single fact rules out two leaders and protects committed
              history; the rest of Raft is disciplined bookkeeping around it. And in practice:
              consensus for the control plane, leases with fencing tokens for everything downstream.
            </Callout>
          </>
        ),

        /* ── Stage 5 ─────────────────────────────────────────────── */
        shipped: (
          <>
            <p>
              Theory earns its keep when it meets a workload. Three famous systems, three different
              answers to the same question — <em>which guarantee do we sell, and which do we give
              up?</em> Read them with the vocabulary you now have, and they stop being papers and
              become priced decisions.
            </p>

            <h3>Dynamo — availability as the product</h3>
            <p>
              Amazon’s constraint was blunt: the shopping cart must accept writes even during
              partitions; a refused “add to cart” costs real money, a briefly-forked cart does not.
              Everything in the design follows. Keys are spread with{' '}
              <strong>consistent hashing</strong> on a ring — each node owns arcs of key space via
              many <strong>virtual nodes</strong>, so adding or removing a machine moves only ~1/N
              of the data (contrast <code>hash mod N</code>, which reshuffles nearly everything).
              Membership spreads by <strong>gossip</strong>; there is no leader anywhere. Writes use
              the sloppy quorums and hinted handoff you met in Stage 3; divergent replicas are found
              cheaply in the background by comparing <strong>Merkle trees</strong>; and when
              versions genuinely conflict, Dynamo keeps both, ships them to the application with
              their <strong>vector clocks</strong>, and lets it merge (carts: union). Every stage of
              this pathway appears in one system, tuned entirely toward “never refuse a write”.
            </p>

            <h3>Spanner — buying back the clock</h3>
            <p>
              Google wanted the opposite pole: globally distributed data with real transactions and{' '}
              <strong>external consistency</strong> — if transaction B starts after A finishes,
              anywhere on Earth, B’s timestamp is after A’s. Stage 2 said wall clocks cannot give
              you that. Spanner agrees, then attacks the premise: <strong>TrueTime</strong> returns
              not a timestamp but an <em>interval</em> — “now is somewhere in [earliest, latest]” —
              kept a few milliseconds wide by GPS and atomic clocks in every datacenter. The
              protocol then simply refuses to lie: a transaction takes a timestamp and{' '}
              <strong>waits out the uncertainty</strong> (commit-wait) before making its writes
              visible, so timestamp order provably matches real order. Underneath, each shard is a
              Paxos group (consensus, Stage 4) and cross-shard transactions run two-phase commit{' '}
              <em>on top of</em> those fault-tolerant groups — 2PC’s blocking flaw neutralised by
              making every participant itself replicated. The lesson generalises: sometimes the
              winning move is not a cleverer algorithm but an engineered reduction of the
              uncertainty everyone else designs around.
            </p>

            <h3>MapReduce — making failure boring</h3>
            <p>
              The odd one out — computation, not storage — and the origin of a move the data world
              still runs on: with terabytes in play, <em>move the computation to the data</em>.
              Express the job as two pure functions: <strong>map</strong> turns each input record
              into key–value pairs; the framework <strong>shuffles</strong> — groups every value by
              key across the cluster (the expensive, all-to-all step); <strong>reduce</strong> folds
              each group to results. Because the functions are pure and inputs immutable, the
              response to Stage 1’s partial failure is luxuriously dumb: a worker died? Re-run its
              tasks elsewhere. A worker is merely slow? Run <strong>backup tasks</strong> — duplicate
              the stragglers and take whichever finishes, an at-least-once trick that works only
              because the work is idempotent by construction. Add scheduling for data locality and
              failure stops being an event at all; it is amortised into the design. Successors
              (Spark most famously) keep exactly this recovery-by-recomputation idea and fix the
              economics — intermediate data in memory instead of on disk between every step.
            </p>

            <h3>How to read the next one</h3>
            <p>
              These three give you a permanent reading protocol for any systems paper or
              architecture post: <em>what failure model is assumed? where does order come from?
              which consistency rung is sold, and to whom? what happens during a partition? what
              got cheaper, and who pays?</em> Answer those in the margin as you read, and you are no
              longer consuming systems — you are pricing them. The System Design pathway now puts
              that pricing to work on things you will actually build.
            </p>
          </>
        ),
      }}
    />
  )
}
