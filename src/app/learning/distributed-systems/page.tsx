import type { Metadata } from 'next'
import Pathway, { Callout, Fig } from '@/components/Pathway/Pathway'
import { TimeoutAmbiguity, QuorumOverlap, ReplicatedLog } from './diagrams'

export const metadata: Metadata = {
  title: 'Distributed Systems — a free pathway from zero to professional',
  description:
    'Partial failure, time and order, replication, consistency and consensus — a staged free course written for this site, with the canonical papers and lectures linked at every stage.',
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
            <p>
              The decision has teeth. If you retry, and the original request actually succeeded, the
              work happens twice — a payment, an email, a row. So retries force a choice that shapes
              every serious API: either make operations <strong>idempotent</strong> (safe to apply
              twice — usually via a client-supplied request ID the server remembers) and retry
              freely, or accept that some operations may be lost and never retried. At-least-once
              with idempotency, or at-most-once. There is no exactly-once wire; there are only
              systems built to survive its absence.
            </p>
            <p>
              Notice what this does to design. Every arrow in your architecture diagram is now a
              place where the answer can be “unknown”, and the machines on either side of it fail{' '}
              <em>independently</em> — one rack loses power, the rest keep serving. That
              independence is why distribution is worth the pain: it is the raw material of fault
              tolerance. The rest of this pathway is about paying for it honestly.
            </p>
            <Callout>
              A timeout tells you nothing about the fate of the request. Design every call as if it
              might have succeeded invisibly — because sometimes it did.
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
            <p>
              Physical clocks drift — cheap oscillators gain or lose milliseconds constantly, and
              NTP corrects them by <em>stepping</em> the clock, sometimes backwards. Two machines’
              clocks routinely disagree by more than the time a network hop takes, which means
              “compare the timestamps” can order two events <strong>backwards</strong>: the reply
              stamped earlier than the request that caused it. A last-write-wins system built on
              wall clocks will, on a bad day, let a stale write erase a newer one and log that
              everything went fine.
            </p>
            <p>
              Lamport’s 1978 move was to stop asking what time events happened and ask instead what
              could have <em>caused</em> what. If a and b happen in the same process, in that order,
              a <strong>happens-before</strong> b. If a is the sending of a message and b its
              receipt, a happens-before b. Chain those together and you get a partial order — and
              events that no chain connects are simply <strong>concurrent</strong>. Not
              “simultaneous”: causally unrelated. Neither knew about the other.
            </p>
            <p>
              A logical clock is a counter that respects this order: tick on every event, and on
              receiving a message, jump to at least the sender’s value. Vector clocks extend the
              trick so you can also <em>detect</em> concurrency — which is exactly what a replicated
              store needs when two datacenters accept writes to the same key and must later decide
              whether one supersedes the other or they genuinely conflict.
            </p>
            <p>
              One practical footnote before moving on: your language exposes two clocks. The wall
              clock is for telling humans the time. The <strong>monotonic clock</strong> only ever
              moves forward and is the only one fit for measuring durations. Every timeout you ever
              set belongs on the monotonic clock.
            </p>
            <Callout>
              Order in a distributed system comes from messages, not from clocks. If no chain of
              messages connects two events, “which came first” has no answer — design for that case
              instead of denying it.
            </Callout>
          </>
        ),

        /* ── Stage 3 ─────────────────────────────────────────────── */
        replication: (
          <>
            <p>
              You replicate data for three reasons, and it is worth being able to name which one you
              are buying: to survive a machine dying (durability and availability), to put data
              nearer its readers (latency), and to spread read load. The price is one new question
              that never goes away: <em>when the copies disagree, what does a read return?</em>
            </p>
            <p>
              The workhorse arrangement is <strong>leader and followers</strong>: writes go to one
              node, which streams them to the rest. Replication is usually asynchronous, so
              followers run slightly behind — and that lag surfaces as real anomalies. You post a
              comment, refresh, and it is gone: your write hit the leader, your read hit a stale
              follower. Guarantees like <em>read-your-writes</em> and <em>monotonic reads</em> are
              named patches for exactly these moments.
            </p>
            <p>
              A <strong>consistency model</strong> is the honest label on the jar: a contract about
              which read results are legal. At the strict end, linearizability — the system behaves
              as if there were one copy and every operation happened at a single instant. At the
              loose end, eventual consistency — stop writing, and replicas converge, eventually, to
              something. Between them lies a whole taxonomy, and the professional skill is naming
              the model you need for each piece of data rather than arguing about “consistent” as if
              it were one thing. A shopping cart and a bank ledger deserve different contracts.
            </p>
            <p>
              What about CAP? Read it narrowly, because it is narrow: when a network partition
              happens — and it will — a system must either serve possibly-stale answers or refuse to
              answer. That is the entire theorem. It says nothing about behaviour on a healthy
              network, where the real trade is <em>latency versus freshness</em>: waiting for more
              replicas to confirm buys stronger answers at slower speeds.
            </p>
            <Fig caption="Fig 2 · Quorums — overlap is the mechanism, not magic">
              <QuorumOverlap />
            </Fig>
            <p>
              Leaderless stores make that trade tunable per request: write to W replicas of N, read
              from R, and if R + W exceeds N the read set must overlap the write set somewhere, so
              at least one replica you consult has the newest value. Lower the numbers and the
              overlap guarantee evaporates — by choice, in exchange for speed. It is the cleanest
              example in the field of a guarantee you can literally dial.
            </p>
          </>
        ),

        /* ── Stage 4 ─────────────────────────────────────────────── */
        consensus: (
          <>
            <p>
              Quorums let replicas converge, but some questions cannot tolerate “converging
              eventually” — they need one answer, agreed, now. Who is the leader? Did this
              transaction commit? Which of two clients got the lock? Answer such a question twice,
              differently, and you get the classic catastrophe: <strong>split brain</strong>, two
              leaders both accepting writes, each convinced the other is dead. (They cannot check —
              Stage 1 again: a partitioned peer and a crashed peer look identical.)
            </p>
            <p>
              <strong>Consensus</strong> is the primitive that prevents it, and Raft is the version
              designed to fit in a working engineer’s head. Time is divided into numbered{' '}
              <strong>terms</strong>. A node that stops hearing from a leader stands for election;
              a candidate needs votes from a <strong>majority</strong>, and each node votes once per
              term — so two leaders in one term are arithmetically impossible. Majorities are the
              same overlap trick as quorums, used for uniqueness: any two majorities of five share a
              node, and that shared node will not vote twice.
            </p>
            <Fig caption="Fig 3 · The replicated log — an entry exists once it lives on a majority">
              <ReplicatedLog />
            </Fig>
            <p>
              The elected leader’s job is to maintain a <strong>replicated log</strong>: it appends
              each command, ships it to followers, and declares it <em>committed</em> once a
              majority holds it. Committed entries survive any minority of failures — a new leader
              must gather a majority of votes, and some voter in that majority carries the entry, so
              the log’s history cannot be rewritten behind you. A cluster of 2f + 1 nodes rides out
              f failures; five nodes, two losses, business as usual.
            </p>
            <p>
              The price is written in Stage 1’s currency: every committed write costs a round trip
              to a majority, and liveness depends on elections settling. Which is why mature
              architectures spend consensus where uniqueness is priceless — configuration, leases,
              leader election, the metadata plane — and let the data path run on cheaper replication
              coordinated <em>by</em> that consensus. Small agreements, guarding large flows.
            </p>
            <Callout>
              Majorities intersect. That single arithmetical fact — any two majorities share a node
              — is what rules out two leaders and protects committed history. All the rest of Raft
              is bookkeeping around it.
            </Callout>
          </>
        ),

        /* ── Stage 5 ─────────────────────────────────────────────── */
        shipped: (
          <>
            <p>
              Theory earns its keep when it meets a workload. Three famous systems, three different
              answers to the same question — <em>which guarantee do we sell, and which do we give
              up?</em> — and together they form a map of the design space you now have the
              vocabulary to read.
            </p>
            <p>
              <strong>Dynamo</strong> (Amazon, 2007) chose availability. A shopping cart must accept
              writes even mid-partition, so Dynamo takes writes on any replica, spreads keys with
              consistent hashing, tracks causality with vector clocks — Stage 2, deployed — and
              reconciles conflicts after the fact, sometimes by handing the application both
              versions and asking it to merge. Eventual consistency not as a compromise, but as the
              product requirement.
            </p>
            <p>
              <strong>Spanner</strong> (Google, 2012) chose the opposite pole: global transactions
              with external consistency. Its heresy is the clock. Instead of pretending clocks are
              exact, TrueTime returns an <em>interval</em> — “now is somewhere in here” — bounded by
              GPS and atomic clocks. Spanner simply <strong>waits out the uncertainty</strong>{' '}
              before making a commit visible, so timestamp order matches real order. Stage 2 said
              wall clocks cannot order events; Spanner agrees, then buys clocks good enough that a
              few milliseconds of honesty about the error bar closes the gap.
            </p>
            <p>
              <strong>MapReduce</strong> (Google, 2004) is the odd one out — computation, not
              storage — and it contributes the move the data world still runs on: with data this
              large, <em>move the computation to the data</em>, not the reverse. Express the job as
              two pure functions, map and reduce; let the framework schedule them next to the bytes
              and re-run whatever fails. Partial failure — Stage 1 — handled not by preventing
              failure but by making work <strong>safe to redo</strong>. Idempotency, industrialised.
            </p>
            <p>
              Read all three papers with one pencil habit: at every design choice, write which
              guarantee was sold and which was bought. Do that, and you are no longer reading
              systems — you are pricing them, which is the professional skill this pathway was
              building toward. The System Design pathway puts it to work.
            </p>
          </>
        ),
      }}
    />
  )
}
