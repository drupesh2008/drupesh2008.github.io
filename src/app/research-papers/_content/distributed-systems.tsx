/**
 * Distributed Systems — five explainers, each written from the problem
 * outward. Keyed by paper id; rendered by PaperView.
 */
import type { ReactNode } from 'react'
import { Callout, Fig, Tbl } from '@/components/Pathway/Pathway'
import LamportClocks from '@/components/Papers/sims/LamportClocks'
import MapReduceSim from '@/components/Papers/sims/MapReduceSim'
import DynamoRing from '@/components/Papers/sims/DynamoRing'
import RaftSim from '@/components/Papers/sims/RaftSim'
import TrueTimeSim from '@/components/Papers/sims/TrueTimeSim'
import {
  ClockSkew, HappensBefore, MapReduceFlow, MasterReexec, WriteDuringPartition, VersionVectors,
  RaftRoles, MajorityOverlap, SpannerStack, TrueTimeInterval,
} from './distributed-systems-diagrams'

export const sections: Record<string, ReactNode> = {
  /* ────────────────────────────────────────────────────────────────── */
  'lamport-clocks': (
    <>
      <h3>The problem: “before” stops meaning anything</h3>
      <p>
        On one computer, “which happened first” is a question the hardware answers for you. Two
        instructions run in order; a timestamp from the system clock settles any dispute. Put the
        program on two computers connected by a network and that comfort disappears. Each machine has
        its own clock, the clocks drift apart by milliseconds a day, and a message between them takes
        an unpredictable amount of time to arrive. Compare timestamps across machines and you get
        answers that are not merely imprecise but impossible: a reply recorded as arriving before its
        request was sent.
      </p>
      <Fig caption="Physical timestamps across machines: the reply is stamped three seconds before the request. Nothing is broken; the clocks simply disagree by more than the message took.">
        <ClockSkew />
      </Fig>
      <p>
        This matters because almost everything a distributed system must get right is a question of
        order. Did the withdrawal come before the deposit? Did this replica see the delete before the
        re-insert? Which of two conflicting updates should win? In 1978, Leslie Lamport asked what
        “before” could possibly mean when no clock can be trusted, and found that the answer was
        sitting in the structure of the system itself.
      </p>

      <h3>The idea: order comes from causality, not from clocks</h3>
      <p>
        Lamport’s move was to stop asking the clocks and ask the messages. Two facts about any system
        are beyond dispute. First, within a single process, events happen in the order the process
        performed them. Second, a message is sent before it is received. Chain those facts together
        (if <em>a</em> happened before <em>b</em> and <em>b</em> before <em>c</em>, then <em>a</em> before{' '}
        <em>c</em>) and you have a relation he called <strong>happened-before</strong>, written →.
      </p>
      <p>
        The relation has a hole in it, and the hole is the point. If no chain of messages connects two
        events on different machines, neither happened before the other. They are{' '}
        <strong>concurrent</strong>: not simultaneous, just unordered, and no amount of clock
        accuracy would change that, because nothing either event did could have influenced the
        other. Lamport’s claim is that this partial order is the only order a distributed program
        can ever depend on.
      </p>
      <Fig caption="A chain of messages orders a, b and c. Event d touches none of them: it is concurrent with b and c, and asking which came first is not a meaningful question.">
        <HappensBefore />
      </Fig>
      <Callout>
        If one event could not have affected another, their order does not matter, and any order a
        system chooses is correct. If one could have affected the other, the messages between them
        already tell you which came first. Clocks are not needed for either case.
      </Callout>

      <h3>How it works: a counter that respects the arrows</h3>
      <p>
        Having defined the order, the paper shows how to compute something consistent with it using
        nothing but a counter in each process, a <strong>logical clock</strong>. Three rules:
      </p>
      <ol>
        <li>Before every event, a process increments its counter.</li>
        <li>Every message carries the sender’s counter value.</li>
        <li>On receiving a message, the process sets its counter to one more than the larger of its own value and the value in the message.</li>
      </ol>
      <p>
        That is all. The guarantee is that if <em>a</em> → <em>b</em> then <em>C(a)</em> &lt;{' '}
        <em>C(b)</em>: the clock never contradicts causality. The converse is false, and it is the
        most common misreading of the paper: a smaller Lamport timestamp does not mean the event
        happened first, only that it did not happen after. To tell concurrency apart from order you
        need the vector clocks that Fidge and Mattern introduced a decade later, which carry one
        counter per process. The simulation below computes both, shows you only the Lamport value,
        and tells you the truth when you ask.
      </p>
      <LamportClocks />
      <p>
        The second half of the paper is easy to skip and should not be. Lamport breaks ties between
        equal timestamps with the process number, which turns the partial order into a{' '}
        <strong>total order</strong> that every process computes identically. With a total order on
        requests, he builds a distributed mutual-exclusion algorithm in which each process keeps a
        queue of requests and grants the lock to the lowest timestamp. The method generalises: feed
        every process the same commands in the same order, and they will reach the same state. That is
        the <strong>replicated state machine</strong>, and it is the idea under Paxos, Raft, and every
        strongly consistent database since.
      </p>

      <h3>What it changed</h3>
      <p>
        The paper gave the field its vocabulary. “Happens-before”, “concurrent”, “logical clock”,
        “causal consistency” and “state-machine replication” all start here. It also drew the line
        that later work had to choose a side of: either accept the partial order and build systems
        that merge concurrent updates, as Dynamo does with version vectors, or manufacture a total
        order with consensus, as Raft does, or close the clock problem by bounding the uncertainty,
        as Spanner does with TrueTime. All three are answers to the question this paper posed.
      </p>

      <h3>Where you meet it today</h3>
      <ul>
        <li><strong>Git.</strong> A commit’s ancestry is the happens-before relation; two branches with no common commits after the fork are concurrent, which is exactly why a merge is needed.</li>
        <li><strong>Databases.</strong> A log sequence number is a Lamport clock for one node; Cassandra’s “last write wins” compares timestamps across nodes and inherits every pitfall the paper warned about.</li>
        <li><strong>Dynamo-style stores and CRDTs.</strong> Version vectors and vector clocks detect concurrent writes so they can be merged instead of silently lost.</li>
        <li><strong>Tracing.</strong> A distributed trace is a happens-before graph with spans as events and RPCs as messages.</li>
      </ul>
    </>
  ),

  /* ────────────────────────────────────────────────────────────────── */
  mapreduce: (
    <>
      <h3>The problem: a thousand machines, one program, every time</h3>
      <p>
        By 2003 Google had crawled billions of pages, and the useful questions about them were simple
        to state. How many times does each word appear? Which pages link to this one? What are the
        most requested URLs today? Each answer is a few lines of logic. The difficulty was that the
        input was terabytes, so the logic had to run on hundreds or thousands of machines at once,
        and the machines were cheap commodity boxes that failed every day.
      </p>
      <p>
        So every such program had to solve the same hard problems again: split the input, ship work
        to machines, move intermediate results between them, balance the load, notice a dead
        machine, redo its work, and merge the output. The simple logic was buried under a mountain of
        scaffolding, written slightly differently each time and debugged at three in the morning.
        Jeff Dean and Sanjay Ghemawat noticed that nearly all of these programs had the same shape,
        and that the scaffolding could therefore be written once.
      </p>

      <h3>The idea: two functions, and a library that does the rest</h3>
      <p>
        The shape is borrowed from functional programming. You write a <strong>map</strong> function
        that takes one input record and emits any number of (key, value) pairs, and a{' '}
        <strong>reduce</strong> function that takes one key and all the values emitted for it and
        produces the output. Word count is the paper’s example: map emits (word, 1) for every word on
        a line; reduce sums the ones. Everything else, the part that was hard, is the library.
      </p>
      <Fig caption="The run-time shape every MapReduce job has. Input splits are mapped independently; intermediate pairs are partitioned by key so that all values for one key reach one reducer; output goes back to the distributed file system.">
        <MapReduceFlow />
      </Fig>
      <Callout>
        Restricting what the programmer may write is what makes the system powerful. Because map
        processes records independently and reduce sees one key at a time, the library knows it can
        run them anywhere, in any order, as many times as it likes. The constraint buys parallelism,
        fault tolerance and locality for free.
      </Callout>

      <h3>How it works</h3>
      <p>
        A master process splits the input into pieces of 16 to 64 megabytes and assigns map tasks to
        workers, preferring a worker holding the input chunk locally on the Google File System, so
        most reads never cross the network. Each map worker writes its pairs to local disk in{' '}
        <em>R</em> partitions, one per reducer, chosen by hashing the key. When the maps finish, each
        reduce worker fetches its partition from every map worker, sorts it so that equal keys sit
        together, and calls reduce once per key. Output lands on GFS, one file per reducer.
      </p>
      <MapReduceSim />
      <p>
        Failure handling is where the design shows its teeth. The master pings every worker. If one
        stops answering, every map task it completed is scheduled again on another machine, because
        the intermediate files lived on the disk that just died. Completed reduce tasks are left
        alone: their output is already safe on GFS. If the master itself dies, the paper simply
        aborts the job; one master in thousands of machines fails rarely enough that this was the
        right trade.
      </p>
      <Fig caption="The master re-executes the map tasks of a silent worker. Finished reduce tasks are not re-run: their output already lives on the replicated file system.">
        <MasterReexec />
      </Fig>
      <p>
        The subtler trick is for <strong>stragglers</strong>, a machine that is slow rather than dead
        because of a bad disk or a noisy neighbour. Near the end of a job the master launches backup
        copies of the remaining tasks and takes whichever finishes first. The paper reports that
        this cost a few per cent of resources and cut the sort benchmark’s running time by 44 per
        cent. Ten years later the same idea reappears for individual requests as hedging in “The Tail
        at Scale”.
      </p>
      <p>
        The numbers the paper gives are from 2004 and still impressive: a grep through ten billion
        100-byte records on 1,800 machines finished in about 150 seconds, and a terabyte sort in 891
        seconds. The sentence that mattered most inside Google was about code, not speed: rewriting
        the production indexing system as a sequence of MapReduce jobs shrank one of its phases from
        3,800 lines to 700.
      </p>

      <h3>What it changed</h3>
      <p>
        Outside Google the paper became Hadoop, an open-source MapReduce on an open-source GFS, and
        for a decade “big data” meant Hadoop. Then its limits became the next generation’s design
        brief. Writing every intermediate result to disk made iterative algorithms and interactive
        queries painfully slow, and chaining jobs by hand was brittle. Spark (2010) kept the
        functional model but held data in memory and generalised two stages to a graph of them;
        Google itself moved on to Flume and Dataflow. MapReduce as a product is history. MapReduce as
        a shape, partition, apply, shuffle, aggregate, is how every distributed query engine works.
      </p>

      <h3>Where you meet it today</h3>
      <ul>
        <li><strong>Any distributed SQL.</strong> A <code>GROUP BY</code> in Spark, BigQuery, Snowflake or Trino is a map, a shuffle by key, and a reduce; the explain plan will show you the exchange.</li>
        <li><strong>Stream processors.</strong> Kafka Streams and Flink apply the same key-partitioned aggregation to data that never stops arriving.</li>
        <li><strong>Re-execution as fault tolerance.</strong> Idempotent tasks that can be rerun anywhere are now the default design for batch systems, from Airflow DAGs to CI pipelines.</li>
        <li><strong>Backup tasks.</strong> Speculative execution in Hadoop and Spark, and hedged requests in RPC frameworks, descend from the straggler fix.</li>
      </ul>
    </>
  ),

  /* ────────────────────────────────────────────────────────────────── */
  dynamo: (
    <>
      <h3>The problem: the cart must never say no</h3>
      <p>
        Amazon’s shopping cart has one rule that outranks all others: a customer who clicks “add to
        cart” must succeed. A failed write is a lost sale and a lost customer. That rule has to hold
        while disks fail, servers fail, and whole data centres lose contact with each other, which at
        Amazon’s size is not a possibility but a daily event. And it must hold fast: the paper’s
        service level is measured at the 99.9th percentile, 300 milliseconds for a peak of 500
        requests a second, because the slowest customers are the ones with the fullest carts.
      </p>
      <p>
        The relational databases of 2007 could not promise this. They kept replicas consistent by
        making every write wait for agreement, and a replica that cannot reach the others must
        either refuse writes or risk diverging. Brewer’s CAP conjecture had put the choice plainly:
        during a network partition you keep consistency or availability, not both. Amazon chose
        availability, on purpose, and built a store around the consequences.
      </p>

      <h3>The idea: accept every write, resolve the conflicts later</h3>
      <p>
        Dynamo is a key-value store that is <strong>always writable</strong>. Any replica will
        accept a write even when it cannot talk to the others, and the system makes no attempt to
        prevent two replicas from accepting different writes to the same key at the same time.
        Instead it keeps both versions, detects the conflict when the key is next read, and hands
        the versions to the application to reconcile. For a shopping cart, reconciliation is a
        union: nothing a customer added is ever lost, though something they deleted may briefly
        reappear. The paper is candid that this is a business decision encoded in a database.
      </p>
      <Fig caption="A partition between two data centres. Both sides accept an update to the same cart; when the link heals, Dynamo returns both versions and the application merges them.">
        <WriteDuringPartition />
      </Fig>
      <Callout>
        Consistency and availability are not features of a database; they are a choice about which
        failures the user will see. Dynamo makes the choice explicit, per operation, with three
        numbers: N replicas, W of which must acknowledge a write, R of which must answer a read.
      </Callout>

      <h3>How it works</h3>
      <p>
        The paper is a catalogue of techniques, each solving one sub-problem, and most of them are
        now standard equipment. <strong>Consistent hashing</strong> places both keys and nodes on a
        ring; a key belongs to the first N distinct nodes clockwise from it, so adding or removing
        a node moves only the keys next to it. Each physical node owns many <strong>virtual
        nodes</strong> scattered around the ring, so load and the work of recovery spread evenly.
      </p>
      <DynamoRing />
      <p>
        Versions are tracked with <strong>vector clocks</strong>, one counter per node that has
        touched the value. If one clock dominates another, the store knows which version is newer and
        discards the old one silently; if neither dominates, the writes were concurrent and both are
        returned. In production the paper found this was rare: 99.94 per cent of requests saw exactly
        one version.
      </p>
      <Fig caption="A version tree. D3 and D4 were written concurrently on different nodes; neither vector dominates, so a read returns both and the application writes a reconciled D5.">
        <VersionVectors />
      </Fig>
      <p>
        Availability during failure comes from <strong>sloppy quorums</strong> and{' '}
        <strong>hinted handoff</strong>: if a replica is unreachable, the write goes to the next
        healthy node on the ring with a hint saying who it was for, and is handed back when the
        replica returns. Replicas that drift apart are reconciled in the background by comparing{' '}
        <strong>Merkle trees</strong> of their key ranges, so only the differing pieces are
        transferred. Membership and failure detection run on <strong>gossip</strong>, with no central
        coordinator anywhere in the system, which is itself a statement about availability.
      </p>

      <h3>What it changed</h3>
      <p>
        Dynamo was the engineering paper behind the NoSQL movement. Cassandra, built at Facebook a
        year later, combined Dynamo’s ring with Bigtable’s data model; Riak and Voldemort
        reimplemented the paper almost directly; the word “eventually consistent” entered everyday
        engineering vocabulary. Amazon’s own sequel is instructive: when Dynamo became the DynamoDB
        service in 2012, the team dropped vector clocks and application-side reconciliation, which
        developers found too hard, and offered a simple choice between eventually and strongly
        consistent reads instead. The techniques survived; the programming model was tamed.
      </p>

      <h3>Where you meet it today</h3>
      <ul>
        <li><strong>DynamoDB, Cassandra, ScyllaDB, Riak.</strong> The ring, the quorums and tunable consistency are the user-facing model of all of them.</li>
        <li><strong>Consistent hashing everywhere.</strong> Load balancers, CDNs, distributed caches and Kafka partition assignment all use it to move as little as possible when membership changes.</li>
        <li><strong>CRDTs.</strong> The reconciliation Dynamo left to the application was later formalised as data types that merge automatically, used in collaborative editors and Redis.</li>
        <li><strong>Your own conflict policy.</strong> Any system with offline writes, from mobile apps to Git, faces the paper’s question: keep both, merge, or last-writer-wins.</li>
      </ul>
    </>
  ),

  /* ────────────────────────────────────────────────────────────────── */
  raft: (
    <>
      <h3>The problem: everyone needs consensus, nobody could implement it</h3>
      <p>
        A great deal of infrastructure comes down to one need: several machines must agree on a
        sequence of commands and keep agreeing while some of them crash and restart. That is{' '}
        <strong>consensus</strong>, and by 2013 the field had a complete answer to it in Paxos,
        Lamport’s algorithm from 1989. It also had a problem. Paxos is famously hard to understand,
        and the published algorithm covers agreeing on a single value; building a real system that
        agrees on an entire log required extensions the literature left vague, so every production
        system, Google’s Chubby, Apache ZooKeeper, filled the gaps differently and nobody could
        check anyone else’s work.
      </p>
      <p>
        Diego Ongaro and John Ousterhout set an unusual goal for an algorithm paper. Correctness and
        performance were required, but the explicit objective was <strong>understandability</strong>:
        an engineer should be able to hold the whole algorithm in their head and implement it
        correctly from the paper. They then tested that claim on 43 students, who scored better on
        Raft than on Paxos after equivalent lectures.
      </p>

      <h3>The idea: elect a leader, let the leader decide</h3>
      <p>
        Raft divides time into numbered <strong>terms</strong>, each beginning with an election. Every
        node is a follower, a candidate, or a leader, and at most one leader exists per term. The
        leader alone accepts client commands, appends them to its log, and replicates them to the
        followers; entries flow in one direction only. A follower that hears nothing from a leader
        for a randomly chosen interval assumes it is dead, becomes a candidate, and asks the others
        for votes. The randomness is doing real work: it makes two nodes timing out at once unlikely,
        so most elections finish in one round.
      </p>
      <Fig caption="The three roles and the only transitions between them. Terms only increase, and a node that sees a higher term in any message immediately becomes a follower.">
        <RaftRoles />
      </Fig>
      <Callout>
        An entry is committed once a majority of nodes hold it, and a node may only vote for a
        candidate whose log is at least as complete as its own. Because any two majorities of the
        cluster overlap, every future leader is guaranteed to hold every committed entry. That single
        overlap is the safety proof.
      </Callout>

      <h3>How it works</h3>
      <p>
        Two remote calls carry the whole protocol. <strong>RequestVote</strong> asks for a vote in a
        new term and includes the candidate’s last log index and term, which is how voters apply the
        completeness rule. <strong>AppendEntries</strong> carries new log entries from the leader,
        and when empty serves as the heartbeat that keeps followers from timing out. Each
        AppendEntries names the entry that should precede the new ones; a follower whose log
        disagrees rejects it, and the leader walks back one entry at a time until the logs match,
        then overwrites the follower’s divergent tail. This is the <strong>log matching</strong>{' '}
        property: if two logs agree on an entry, they agree on everything before it.
      </p>
      <RaftSim />
      <Fig caption="Why nothing committed can be lost. The entry was committed on three nodes; any three nodes that elect a new leader include at least one of them, and that node will not vote for a candidate whose log is shorter.">
        <MajorityOverlap />
      </Fig>
      <p>
        The paper finishes the job that Paxos papers left to the reader. Membership changes use a
        joint configuration in which decisions need majorities of both the old and new sets, so no
        two leaders can be elected during the transition. Logs are compacted by snapshotting the
        state machine. Clients retry safely because every command carries a serial number. None of
        this is deep; all of it is the difference between an algorithm and a system.
      </p>

      <h3>What it changed</h3>
      <p>
        Raft did what its authors hoped. Within a few years there were implementations in every major
        language, many of them correct, and new systems stopped inventing their own consensus. etcd
        adopted it and became the store under Kubernetes, so every object in every cluster is a Raft
        log entry; Consul, CockroachDB, TiKV and YugabyteDB run thousands of small Raft groups, one
        per range of data; Kafka replaced ZooKeeper with its own Raft (KRaft) in 2022. Paxos is still
        the deeper theory, but Raft is what gets built.
      </p>

      <h3>Where you meet it today</h3>
      <ul>
        <li><strong>Kubernetes.</strong> The control plane’s truth lives in etcd; a three- or five-node etcd cluster is a Raft group, and “lost quorum” is a Raft election that cannot complete.</li>
        <li><strong>Distributed SQL.</strong> CockroachDB, TiDB and YugabyteDB replicate each shard with Raft and layer transactions on top.</li>
        <li><strong>Message brokers.</strong> Kafka’s metadata, RabbitMQ’s quorum queues and NATS JetStream are Raft logs.</li>
        <li><strong>Your own leader election.</strong> If you ever need “exactly one of these runs at a time”, reach for an existing Raft store rather than a database lock.</li>
      </ul>
    </>
  ),

  /* ────────────────────────────────────────────────────────────────── */
  spanner: (
    <>
      <h3>The problem: a database that is global and still tells the truth</h3>
      <p>
        Google’s advertising business ran on a sharded MySQL deployment that took years to re-shard
        and could not survive a data centre outage without manual failover. The team wanted a
        database replicated synchronously across continents, with SQL and real transactions, that
        kept working when a whole region vanished. Bigtable offered the scale but no multi-row
        transactions; its successor Megastore offered transactions but wrote too slowly to be
        general. And one requirement seemed to rule out any global design: <strong>external
        consistency</strong>, which means that if transaction T2 starts after T1 has committed,
        anywhere on Earth, T2 must see T1’s writes and carry a later timestamp.
      </p>
      <p>
        The obstacle is the one Lamport named in 1978. Timestamps from different machines cannot be
        compared, so a transaction committed in Tokyo and one committed in Dublin a millisecond later
        could easily be recorded in the wrong order, and a snapshot read in between would see an
        impossible history. Every previous system either routed all commits through one place, which
        does not scale across oceans, or gave up global ordering.
      </p>

      <h3>The idea: measure the clock error, then wait it out</h3>
      <p>
        Spanner’s answer is <strong>TrueTime</strong>, an API that refuses to pretend. Instead of a
        timestamp it returns an interval, [earliest, latest], that is guaranteed to contain the true
        time; the width of the interval, 2ε, is the uncertainty, and the system knows it at every
        moment. Behind the API are GPS receivers and atomic clocks in every data centre and a
        daemon on every machine that polls them and widens its interval between polls to cover drift.
        In the paper ε is typically between one and seven milliseconds.
      </p>
      <Fig caption="A TrueTime reading. The true time is somewhere in the interval, guaranteed; the system is honest about how uncertain it is instead of picking a number.">
        <TrueTimeInterval />
      </Fig>
      <Callout>
        A commit takes the latest time in its interval as its timestamp and then <strong>waits</strong>{' '}
        until that moment is definitely in the past before replying. Any transaction that starts after
        the reply therefore starts after the timestamp, on every clock, so timestamps and real time
        agree everywhere. The uncertainty is paid for with a few milliseconds of waiting, not with
        correctness.
      </Callout>

      <h3>How it works</h3>
      <p>
        Data is split into tablets, and each tablet is replicated across zones by its own Paxos
        group; a write is durable on a majority before the leader acknowledges it. A transaction that
        touches several tablets runs two-phase commit between their Paxos leaders, with the
        participants themselves replicated, so the classic weakness of two-phase commit, a
        coordinator that dies and leaves everyone waiting, cannot happen. Locks are held in the
        leaders; this is two-phase locking inside Paxos inside two-phase commit, and the paper is
        matter-of-fact about stacking them.
      </p>
      <Fig caption="The stack. Every tablet is a Paxos group spanning zones; a transaction across tablets runs two-phase commit between the groups’ leaders. Each layer replaces a single point of failure with a majority.">
        <SpannerStack />
      </Fig>
      <TrueTimeSim />
      <p>
        The payoff is reads. Because timestamps mean the same thing everywhere, Spanner can serve a{' '}
        <strong>snapshot read</strong> at any past timestamp from any replica that is caught up to
        it, without locks and without talking to the leader. A query over the whole database at “ten
        seconds ago” is consistent across every continent. Even schema changes become transactions
        with a timestamp in the future, applied simultaneously worldwide when the clock passes it.
      </p>

      <h3>What it changed</h3>
      <p>
        Spanner ended the assumption that global scale required giving up transactions, and started
        the category now called NewSQL. CockroachDB and YugabyteDB reproduce its architecture without
        special hardware, using hybrid logical clocks and accepting slightly weaker guarantees; TiDB
        takes a similar route. Google shipped Spanner itself as Cloud Spanner in 2017, and in 2024
        Amazon’s Aurora DSQL adopted the same bounded-time approach using precise clock
        synchronisation. Brewer’s follow-up essay argues that Spanner is “effectively CA”: it is
        technically CP, but Google’s private network makes partitions so rare that users never see the
        difference.
      </p>

      <h3>Where you meet it today</h3>
      <ul>
        <li><strong>Cloud Spanner, CockroachDB, YugabyteDB, TiDB.</strong> If a database advertises global strong consistency, it is some variation of this paper.</li>
        <li><strong>Bounded clocks as a service.</strong> AWS Time Sync and the ClockBound library expose an interval, not a number, so applications can play Spanner’s trick themselves.</li>
        <li><strong>Snapshot reads at a timestamp.</strong> “As of” queries and time-travel reads in modern databases descend from Spanner’s read-only transactions.</li>
        <li><strong>The design principle.</strong> When you cannot eliminate uncertainty, measure it and wait it out; the same idea reappears in leases, fencing tokens and lock expiry.</li>
      </ul>
      <Tbl>
        <table>
          <thead><tr><th>system</th><th>time source</th><th>guarantee across regions</th></tr></thead>
          <tbody>
            <tr><td>Spanner</td><td>TrueTime (GPS + atomic clocks)</td><td>external consistency</td></tr>
            <tr><td>CockroachDB</td><td>hybrid logical clocks, NTP</td><td>serialisable; linearisable within a bounded skew</td></tr>
            <tr><td>Dynamo-style</td><td>vector clocks, no physical order</td><td>eventual, application merges</td></tr>
          </tbody>
        </table>
      </Tbl>
    </>
  ),
}
