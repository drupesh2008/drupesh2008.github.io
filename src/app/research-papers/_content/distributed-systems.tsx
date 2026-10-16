/**
 * Distributed Systems: five explainers, each opening on the situation
 * engineers were stuck in before the paper and carrying one small worked
 * example through the mechanism. Keyed by paper id; rendered by PaperView.
 */
import type { ReactNode } from 'react'
import { Callout, Fig, Tbl, Predict, Notes } from '@/components/Pathway/Pathway'
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
      <p>
        Lamport’s 1978 paper gives us a way to put events on different machines into an order
        without trusting any machine’s clock. That sounds like a modest result. It is the reason a
        replicated database can promise that every copy applies the same writes in the same
        sequence, and the reason we can say precisely when two updates conflict.
      </p>
      <p>
        Start with the situation the paper was written against. A service runs on three processes,
        P1, P2 and P3, and each one writes a log line with its own wall-clock time. P1 sends a
        request to P2 and logs it at 10:00:05. P2 logs the arrival at 10:00:02, because its clock
        runs a few seconds behind P1’s. Anyone who later merges the logs and sorts by timestamp sees
        a reply to a request that had not yet been sent. Nothing is broken. Quartz clocks drift,
        synchronisation is approximate, and the message took 40 milliseconds while the clocks
        disagree by three seconds.
      </p>
      <Fig caption="Two machines, two clocks. By the timestamps the message arrived three seconds before it left, because the clocks disagree by more than the message took to travel.">
        <ClockSkew />
      </Fig>
      <p>
        A debugging log can survive this. A system that uses timestamps to decide which write wins,
        or who gets a lock, cannot. Lamport’s question was what “before” can mean when no clock is
        trustworthy, and his answer was that the system already records the order that matters, in
        the messages it sends.
      </p>

      <h3>What “before” can mean when clocks disagree</h3>
      <p>
        Two facts about any distributed system are beyond dispute. Within one process, events happen
        in the order the process performed them. And a message is sent before it is received.
        Lamport defines the relation <strong>happened-before</strong>, written →, as exactly these
        two facts plus chaining: if <em>a</em> → <em>b</em> and <em>b</em> → <em>c</em>, then{' '}
        <em>a</em> → <em>c</em>. Nothing else goes in. No clocks, no durations.
      </p>
      <p>
        Before our own example, here is the smallest picture of the idea. In the figure, a message
        from P1 to P2 and another from P2 to P3 chain three events together. A fourth event on P1,
        later by any clock, touches neither message.
      </p>
      <Fig caption="Events a, b and c are joined by a chain of messages, so they are ordered. Event d has no chain to b or c in either direction, so it is concurrent with them whatever the wall clocks say.">
        <HappensBefore />
      </Fig>
      <p>
        Now the example we will carry through this page, with events named by process. P1 does a
        local step <em>a1</em>, then sends a message to P2 (the send is <em>a2</em>). P2 has already
        done a local step <em>b1</em>; it receives P1’s message as <em>b2</em>, then sends to P3 as{' '}
        <em>b3</em>. Meanwhile P3 does two local steps of its own, <em>c1</em> and <em>c2</em>,
        before receiving P2’s message as <em>c3</em>.
      </p>
      <p>
        Following the arrows, <em>a1</em> → <em>a2</em> → <em>b2</em> → <em>b3</em> → <em>c3</em>.
        Also <em>c1</em> → <em>c2</em> → <em>c3</em>, because they are earlier steps on P3. But no
        chain of messages connects <em>c1</em> to <em>a1</em> or <em>a2</em> in either direction.
        Lamport calls such events <strong>concurrent</strong>. The word does not mean they happened
        at the same instant. It means neither could have influenced the other, so the system has no
        basis for ordering them and no correct program can depend on an order between them.
      </p>
      <p>
        This is a partial order: some pairs are ordered, some are not. Lamport borrowed the framing
        from special relativity, where two events outside each other’s light cones have no
        observer-independent order. The common misreading is that concurrency is a gap in our
        knowledge that better clocks would fill. It is not. Even a perfect clock would tell us only
        that <em>c1</em> occurred at some instant, and that fact would not change what P1 or P3
        could have known.
      </p>

      <h3>A counter that never contradicts the messages</h3>
      <p>
        Having defined the order, the paper asks for numbers that respect it. A{' '}
        <strong>logical clock</strong> is a counter in each process, and the paper’s requirement,
        the clock condition, is one direction only: if <em>a</em> → <em>b</em> then{' '}
        <em>C(a)</em> &lt; <em>C(b)</em>. Two implementation rules are enough to guarantee it.
      </p>
      <pre><code>{`on any local event or send:
    C = C + 1
    (a send carries the new C in the message)

on receive of a message carrying T:
    C = max(C, T) + 1`}</code></pre>
      <p>
        Run our example through those rules. P1’s local step <em>a1</em> gets 1 and the send{' '}
        <em>a2</em> gets 2, so the message carries 2. On P2, local step <em>b1</em> gets 1. When
        the message arrives, P2 computes max(1, 2) + 1 = 3, so <em>b2</em> gets 3, and the send{' '}
        <em>b3</em> gets 4. On P3, <em>c1</em> gets 1 and <em>c2</em> gets 2. The receive{' '}
        <em>c3</em> computes max(2, 4) + 1 = 5.
      </p>
      <Tbl>
        <table>
          <thead><tr><th>event</th><th>process</th><th>what happens</th><th>Lamport time</th></tr></thead>
          <tbody>
            <tr><td>a1</td><td>P1</td><td>local step</td><td>1</td></tr>
            <tr><td>a2</td><td>P1</td><td>send to P2, carries 2</td><td>2</td></tr>
            <tr><td>b1</td><td>P2</td><td>local step</td><td>1</td></tr>
            <tr><td>b2</td><td>P2</td><td>receive: max(1, 2) + 1</td><td>3</td></tr>
            <tr><td>b3</td><td>P2</td><td>send to P3, carries 4</td><td>4</td></tr>
            <tr><td>c1</td><td>P3</td><td>local step</td><td>1</td></tr>
            <tr><td>c2</td><td>P3</td><td>local step</td><td>2</td></tr>
            <tr><td>c3</td><td>P3</td><td>receive: max(2, 4) + 1</td><td>5</td></tr>
          </tbody>
        </table>
      </Tbl>
      <p>
        Every arrow in the example goes from a smaller number to a larger one, which is all the
        clock condition asks. The receive rule is what makes it hold: by jumping past the sender’s
        value, the receiver makes sure everything it does from now on is numbered after everything
        the sender had done when it sent.
      </p>
      <Predict q={<>In the table, <em>c1</em> on P3 has Lamport time 1 and <em>a2</em> on P1 has Lamport time 2. Did <em>c1</em> happen before <em>a2</em>?</>}>
        <p>
          No. There is no chain of messages from <em>c1</em> to <em>a2</em> or from <em>a2</em> to{' '}
          <em>c1</em>, so they are concurrent. The smaller number tells us only that <em>c1</em>{' '}
          did not happen after <em>a2</em>. If P3 had done ten local steps before <em>c1</em>, it
          would carry 11 and the comparison would flip, while the causal facts stayed exactly the
          same.
        </p>
      </Predict>

      <h3>What a smaller timestamp does not tell you</h3>
      <p>
        The clock condition runs one way. If <em>a</em> → <em>b</em>, then C(a) &lt; C(b). The
        converse is false, and reading it as true is the most frequent mistake made with this paper.
        A Lamport timestamp folds a partial order into a single line of integers, and a single line
        cannot represent “these two are unordered”. Concurrent events get numbers anyway, and the
        numbers compare one way or the other by accident.
      </p>
      <p>
        Change one variable to see it. Suppose P3 is busy and performs ten local steps before{' '}
        <em>c1</em> and <em>c2</em>. Now <em>c1</em> is 11, <em>c2</em> is 12, and the receive{' '}
        <em>c3</em> becomes max(12, 4) + 1 = 13. Nothing about who could have influenced whom has
        changed, yet <em>c1</em> now looks “later” than everything P1 and P2 did. A system that used
        these numbers to pick a winning write would now prefer P3’s value for no reason other than
        P3’s workload.
      </p>
      <p>
        Telling concurrency apart from order needs more state. Vector clocks, introduced
        independently by Colin Fidge and Friedemann Mattern in 1988, keep one counter per process
        and compare element by element. If neither vector is greater than or equal to the other in
        every position, the events are concurrent. The cost is size: a vector grows with the number
        of processes that have touched the data. Dynamo, later in this set, pays that cost because
        detecting concurrent writes is the point of its design. The simulation below computes both
        clocks, shows you only the Lamport value, and reveals the vector verdict when you pick two
        events.
      </p>
      <LamportClocks />

      <h3>From a partial order to one queue everybody agrees on</h3>
      <p>
        The second half of the paper is easy to skip and should not be. Lamport breaks ties between
        equal timestamps using process numbers: order first by Lamport time, then by process id.
        That turns the partial order into a <strong>total order</strong> that every process can
        compute from the same information and get the same answer. The total order is somewhat
        arbitrary for concurrent events, and that is fine, because for concurrent events any order
        is consistent with causality.
      </p>
      <p>
        He then uses the total order to solve a real problem: mutual exclusion over a shared
        resource with no central lock server. Each process keeps a queue of requests. To ask for the
        resource, a process timestamps a request, adds it to its own queue and sends it to everyone.
        A receiver adds the request to its queue and replies with a timestamped acknowledgement. To
        release, the holder removes its request and sends a release message. A process may take the
        resource when its own request is first in its queue by the total order, and it has received
        some message from every other process with a timestamp later than its request.
      </p>
      <p>
        Walk it through with three processes. P2 requests at time 2. Before hearing about it, P1
        requests at time 3. Both broadcast. Once the messages land, every queue holds the same two
        entries in the same order, 2:P2 then 3:P1. P2’s request is first, and P2 has heard from P1
        (its request carried 3) and from P3 (an acknowledgement stamped above 2), so P2 enters. P1
        sees that its request is second and waits. When P2 sends its release, every process drops
        2:P2, P1’s request becomes first, and P1 enters. No process ever asked a coordinator. They
        each ran the same rule over the same queue.
      </p>
      <p>
        The second condition is the subtle one. Waiting until it has heard something later from
        every process is how P1 knows that no earlier request is still in flight. Lamport assumes
        messages between two processes arrive in the order they were sent, so a later message from
        P3 means anything P3 sent earlier has already arrived.
      </p>
      <p>
        Change one variable here too. Suppose P1 had not been slow, and both requests carried
        timestamp 3. The tie-break decides: 3:P1 sorts before 3:P2 because 1 is less than 2, so P1
        goes first. Is that fair? Not in any human sense, since P2 may have asked earlier by the
        wall clock. But the two requests were concurrent, so no process could have known which came
        first, and the only requirement is that everyone picks the same winner. Every process
        applies the same comparison to the same pair of numbers, so they do.
      </p>
      <Callout>
        If every process applies the same commands in the same total order, starting from the same
        state, every process ends in the same state. The paper presents mutual exclusion as an
        example of this general method, and the method, now called state-machine replication, is
        what Paxos, Raft and every strongly consistent replicated database implement.
      </Callout>

      <h3>Where the algorithm breaks</h3>
      <p>
        Now make one process fail. P3 crashes just after P2 broadcasts its request and before it
        acknowledges. P2’s request is first in every queue, but P2 cannot enter, because it has not
        heard anything from P3 stamped later than 2. P1 cannot enter either, since its request sits
        behind P2’s. The whole system stops because one member went quiet. Lamport says plainly that
        his algorithm assumes no failures and that handling them is a hard problem. The fix arrived
        in his own Paxos work about a decade later: wait for a majority instead of everyone, and add
        a protocol for agreeing on the order when the coordinator changes. That fix costs extra
        message rounds and a great deal of subtlety, which is the story of the Raft paper.
      </p>
      <p>
        The paper also names a failure that logical clocks cannot fix on their own, in a section
        titled “Anomalous Behavior”. A user issues request A on P1, then phones a colleague, who
        issues request B on P3. In the real world A came first. Inside the system no message
        connects them, so they are concurrent and B may well get the smaller timestamp. Lamport
        gives two remedies. Either carry the ordering into the system (the user passes A’s timestamp
        along so B is stamped after it), or use physical clocks synchronised tightly enough that an
        event outside the system cannot outrun them. He then proves a bound on how far apart
        physical clocks drift given a maximum drift rate and message delay. Thirty-four years later,
        Spanner’s TrueTime is an engineering answer to that same section.
      </p>
      <p>
        The reasoning in the physical clocks section is worth having in your head, because it
        recurs. If clocks can disagree by at most some amount, and no message (or phone call) can
        get from one machine to another faster than that amount, then nothing sent can arrive
        stamped earlier than it left. Lamport adjusts each clock forward on every received message,
        much like the logical clock rule, and shows that clocks with a small drift rate stay within
        a computable bound of each other. Our opening example broke this condition: the clocks
        disagreed by three seconds and the message took 40 milliseconds. Tighten the clocks to
        within a few milliseconds and the reply could no longer appear before the request. That is
        the trade Spanner later makes, paying for very tight clocks so that physical timestamps can
        be trusted to respect order.
      </p>
      <Tbl>
        <table>
          <thead><tr><th>clock</th><th>what a comparison tells you</th><th>cost</th><th>used by</th></tr></thead>
          <tbody>
            <tr><td>wall clock</td><td>roughly when, if clocks are well synchronised; nothing reliable about causality</td><td>free, but wrong by the skew</td><td>logs, last-write-wins stores</td></tr>
            <tr><td>Lamport clock</td><td>if a → b, then C(a) &lt; C(b); a smaller value does not prove order</td><td>one integer per message</td><td>log sequence numbers, total ordering, Raft terms</td></tr>
            <tr><td>vector clock</td><td>exactly whether a → b, b → a, or concurrent</td><td>one counter per participant</td><td>Dynamo, Riak, causal stores</td></tr>
            <tr><td>hybrid logical clock</td><td>Lamport guarantee, plus values close to wall time</td><td>one timestamp, needs bounded skew</td><td>CockroachDB, YugabyteDB</td></tr>
            <tr><td>bounded interval (TrueTime)</td><td>real-time order when intervals do not overlap</td><td>GPS and atomic clocks, plus waiting</td><td>Spanner</td></tr>
          </tbody>
        </table>
      </Tbl>
      <p>
        Lamport has written on his publications page that the idea came from reading a paper on
        replicated databases whose timestamp scheme could order events in a way that violated
        causality, and that most readers remember the clocks while missing the state-machine idea
        he considered the real contribution. Read with that in mind, the paper is less about time
        than about how independent processes can agree on a sequence.
      </p>

      <h3>How to read the original</h3>
      <p>
        The paper is short, about eight pages, and needs no background beyond comfort with a little
        notation. Read the sections on the partial ordering and on logical clocks closely, and draw
        the space-time diagrams yourself with three processes before you read his. Then read the
        total ordering section slowly. The mutual exclusion algorithm is five rules; trace them on
        paper with two requests, and then with one crashed process, as we did above. The anomalous
        behaviour section is a page and is worth more than its length suggests. The physical clocks
        section and the appendix proof can be skimmed on a first pass unless you care about the
        bound itself. There is no evaluation section; the argument is the result.
      </p>
      <p>
        The next paper, MapReduce, comes from the opposite end of the field. It takes ordering and
        coordination as solved problems for one master and asks how to run one program across
        thousands of unreliable machines without the programmer thinking about any of this.
      </p>
      <Notes items={[
        'Happened-before is defined only from process order and messages; two events with no chain between them are concurrent, and no clock changes that.',
        'A Lamport clock guarantees that if a → b then C(a) < C(b); a smaller timestamp does not prove that an event came first.',
        'Telling concurrency from order needs vector clocks, at the cost of one counter per participant.',
        'Breaking ties by process id gives a total order every process computes identically, and feeding replicas commands in that order is state-machine replication.',
        'The paper’s mutual exclusion algorithm waits on every process, so one crash halts it; tolerating failures is the problem Paxos and Raft later solve.',
      ]} />
    </>
  ),

  /* ────────────────────────────────────────────────────────────────── */
  mapreduce: (
    <>
      <p>
        The MapReduce paper lets a programmer process terabytes on thousands of machines by writing
        two small functions. The library takes care of splitting the input, scheduling work,
        moving data between machines and redoing work when machines die. Reading the paper today is
        worth it less for the API than for the reasoning about failure: why some work is re-run and
        some is not, and what the programmer has to promise for that to be correct.
      </p>
      <p>
        The situation in 2003 was this. Google’s engineers had hundreds of special-purpose programs
        that computed things over crawled documents and request logs: inverted indexes, link
        graphs, the most frequent queries of the day. Each computation was simple in itself. Each
        also had to run on hundreds of cheap Linux machines with two to four gigabytes of memory, on
        a network where some machine was always failing. So each program carried its own code to
        partition input, ship it, handle a worker that disappeared, and stitch output back together.
        Jeff Dean and Sanjay Ghemawat noticed that these programs had the same shape and that the
        scaffolding could be written once.
      </p>

      <h3>The shape that kept repeating</h3>
      <p>
        The programmer writes a <strong>map</strong> function, which takes one input record and
        emits any number of intermediate key and value pairs, and a <strong>reduce</strong>{' '}
        function, which takes one intermediate key with all the values emitted for it and produces
        output. Word count is the paper’s own first example, and it will be ours.
      </p>
      <pre><code>{`map(line):
    for word in line.split():
        emit(word, 1)

reduce(word, counts):
    emit(word, sum(counts))`}</code></pre>
      <p>
        Our input is three lines, each treated as one split: “the quick brown fox jumps over the lazy
        dog”, “the dog sleeps and the fox runs”, and “a quick fox and a quick dog”. Map turns the
        first line into nine pairs, the second into seven and the third into seven: 23 pairs in all.
        Reduce for the key “the” receives [1, 1, 1, 1] and emits 4. Reduce for “quick” receives
        three ones, one from the first line and two from the third, and emits 3.
      </p>
      <p>
        The restriction is what matters. Map looks at one record and nothing else. Reduce looks at
        one key and nothing else. Because neither function depends on what is happening elsewhere,
        the library is free to run any map on any machine, in any order, and to run the same map
        twice if the first attempt is lost. A programmer who could write arbitrary distributed code
        would take that freedom away.
      </p>

      <h3>Following one job through the cluster</h3>
      <p>
        The paper describes a run as a fixed sequence of steps. A single master process splits the
        input into <em>M</em> pieces, typically 16 to 64 megabytes each, and assigns map tasks to
        idle workers. It prefers a worker that already stores a replica of that piece in the Google
        File System, or failing that one on the same network switch, so that most input is read
        from local disk. In our job <em>M</em> is 3 and we choose <em>R</em> = 2 reduce tasks.
      </p>
      <p>
        A map worker parses its split and runs the user’s map function. It buffers the pairs in
        memory and periodically writes them to its own local disk, divided into <em>R</em> regions
        by a partitioning function, by default hash(key) mod <em>R</em>. With <em>R</em> = 2, every
        pair for “the” goes to region 0 or region 1 on every map worker, the same region each time,
        so all of them will meet at the same reducer. The worker reports the locations of its
        regions to the master.
      </p>
      <p>
        When a reduce worker is told where its region lives on each map worker, it fetches the data
        over the network with remote reads. This is the shuffle, and it is usually the most
        expensive network step in the job. The reducer sorts what it fetched by key, so all pairs
        for one word sit together, then calls reduce once per key and appends the output to a file
        in GFS. A job with <em>R</em> = 2 produces two output files.
      </p>
      <Fig caption="Every MapReduce job has this run-time shape. Splits are mapped independently, intermediate pairs are partitioned by hash of the key so all values for a key reach one reducer, and reducers write their output back to the distributed file system.">
        <MapReduceFlow />
      </Fig>
      <p>
        One refinement changes the cost noticeably. A <strong>combiner</strong> is a reduce-like
        function the library runs on the map worker before writing, when the reduce operation is
        associative and commutative, as addition is. With a combiner, the first line emits
        (“the”, 2) once instead of (“the”, 1) twice, and the third line emits (“quick”, 2) and
        (“a”, 2). Our 23 pairs shrink to 19, one per distinct word per line. That is a small saving
        on three lines. On real text, where a handful of words make up a large share of all tokens,
        the combiner removes most of the shuffle traffic. Drag <em>R</em> in the simulation and
        watch the partitions change while each word still lands in exactly one of them.
      </p>
      <p>
        The partitioning function is the other refinement worth knowing, because it decides what
        ends up together. The default hash spreads keys evenly but puts no two related keys in the
        same output file on purpose. The paper’s example is a job whose keys are URLs, where the
        user wants all pages from one host in the same output file; partitioning by a hash of the
        hostname, rather than of the whole URL, does that. The library also guarantees that within
        a partition, keys reach reduce in sorted order, so each output file is sorted and supports
        lookups by key without a further pass. A badly chosen partitioning function has the opposite
        effect: if one key is far more common than the rest, the reducer that owns it does far more
        work than its peers and becomes a straggler of the job’s own making.
      </p>
      <MapReduceSim />
      <p>
        The paper’s typical production job used <em>M</em> = 200,000 and <em>R</em> = 5,000 on
        2,000 machines. Many more tasks than machines is deliberate. A worker that finishes early
        picks up another small task, which balances load, and when a worker dies its many small
        tasks spread across the whole cluster instead of landing on one replacement. The cost is
        on the master, which must make on the order of <em>M</em> + <em>R</em> scheduling decisions
        and keep state for every map and reduce pair; the paper notes this is about a byte per pair,
        which sets a practical ceiling on how finely a job can be cut.
      </p>
      <Predict q={<>Midway through a job, a worker dies. It had completed three map tasks and one reduce task, and was halfway through a fourth map task. Which of those does the master schedule again?</>}>
        <p>
          All four map tasks, and not the reduce task. The in-progress map obviously has to run
          again. The three completed maps also have to run again, because their output lived on the
          local disk of the machine that just died, and reducers that have not yet fetched it can no
          longer reach it. The completed reduce task is safe: its output was written to GFS, which
          keeps replicas on other machines.
        </p>
      </Predict>

      <h3>Why a dead worker costs only re-execution</h3>
      <p>
        The master keeps a small record for each task: idle, in progress or completed, and which
        worker has it. It pings every worker periodically. A worker that stops answering is marked
        failed, and its tasks go back to idle as described in the answer above. When a map task is
        re-run on a new worker, every reducer is told; any reducer that has not yet read the old
        copy reads from the new one.
      </p>
      <Fig caption="When a worker goes silent, the master re-runs the map tasks it had finished, because their output sat on its local disk. Finished reduce tasks stay finished: their output is already replicated in GFS.">
        <MasterReexec />
      </Fig>
      <p>
        Re-running work is only safe if a task’s output appears exactly once, even if two copies of
        the task run. The paper handles this with atomic commits. A map task writes to private
        temporary files and sends their names to the master in its completion message; the master
        ignores a completion for a task it has already recorded as done. A reduce task writes to a
        temporary file and, when finished, renames it to the final name, relying on the file
        system’s atomic rename. If two copies of the same reduce finish, the renames race and the
        final file holds the output of exactly one of them.
      </p>
      <p>
        This gives a strong promise, with a condition attached. If the user’s map and reduce
        functions are deterministic, the output of a distributed run is the same as a sequential
        run of the program with no failures. Change one variable to see what the condition is
        protecting. Suppose our map function samples one line in a thousand at random to build a
        preview. Map task 2 runs, reducer 0 fetches its output, then the worker dies before
        reducer 1 fetches. The master re-runs map task 2, which samples different lines, and reducer
        1 reads from the new run. Now reducer 0’s output reflects one execution and reducer 1’s
        another. Each output file is the result of some sequential run, but not the same run. The
        paper states this weaker guarantee for non-deterministic programs and leaves the decision
        to the user.
      </p>
      <p>
        And the master itself? The paper says the implementation simply aborts the job if the
        master fails, and the client can retry. Checkpointing the master was easy to add and they
        chose not to, because with one master among thousands of workers its failure was rare. That
        is a decision written down with its reason, and it held for years.
      </p>

      <h3>The last few tasks decide the finish time</h3>
      <p>
        A machine that is slow rather than dead causes more trouble than one that crashes. A
        failing disk that corrects errors, a machine shared with other jobs, or a misconfiguration
        that disabled processor caches (an example the paper gives) can make one task take many
        times longer than its peers. The job cannot finish until the slowest task does. The paper
        calls these <strong>stragglers</strong>.
      </p>
      <p>
        The fix is blunt. When a job is close to finishing, the master schedules backup copies of
        the tasks still in progress, and marks each task done when either copy finishes. The paper
        says this typically raises the resources used by no more than a few per cent. On its sort
        benchmark of about a terabyte, the normal run took 891 seconds; with backup tasks disabled
        the same sort took 1,283 seconds, 44 per cent longer, because a few stragglers held up the
        end. In another run they killed 200 of the roughly 1,800 workers part way through, and the
        job finished in 933 seconds, about 5 per cent slower than normal. Those two figures,
        compared, are the paper’s argument: crashes were cheap to absorb, slowness was not.
      </p>
      <p>
        The paper’s other benchmark, a grep that scanned ten billion 100-byte records for a rare
        pattern, finished in about 150 seconds, and the authors point out that about a minute of
        that was start-up: propagating the program to workers and opening the input files. That
        overhead is invisible on a long job and dominant on a short one, and it is one reason
        MapReduce never suited interactive queries.
      </p>
      <p>
        The same idea later moved from batch tasks to individual requests. Dean and Barroso’s “The
        Tail at Scale” (2013) applies it as hedged requests: send a second copy of a slow RPC to
        another replica and use whichever answers first.
      </p>

      <h3>What the paper chose not to do</h3>
      <p>
        Every choice that made MapReduce simple also has a cost, and the next decade of systems is
        largely a list of those costs being removed.
      </p>
      <Tbl>
        <table>
          <thead><tr><th>choice</th><th>what it bought</th><th>what it cost</th><th>what later systems changed</th></tr></thead>
          <tbody>
            <tr><td>map output on local disk</td><td>cheap writes, simple recovery by re-running</td><td>a dead worker loses finished work</td><td>Spark keeps lineage and recomputes only lost partitions</td></tr>
            <tr><td>job output to replicated GFS</td><td>finished reduces never re-run</td><td>multi-step pipelines write every stage to disk three times</td><td>Spark and Dataflow keep intermediate data in memory between stages</td></tr>
            <tr><td>exactly two stages</td><td>one model to schedule and reason about</td><td>real pipelines became chains of jobs glued by hand</td><td>FlumeJava, Spark and Dataflow plan a graph of stages</td></tr>
            <tr><td>sort every reduce input</td><td>grouping by key for free, sorted output</td><td>sorting work even when grouping by hash would do</td><td>engines choose hash or sort aggregation per query</td></tr>
            <tr><td>one master, abort on its failure</td><td>simple, consistent scheduling state</td><td>a single point of failure for the job</td><td>YARN and later schedulers replicate or restart the coordinator</td></tr>
          </tbody>
        </table>
      </Tbl>
      <p>
        Iterative work exposed the costs first. A machine-learning algorithm that makes twenty
        passes over the same data runs as twenty MapReduce jobs, each reading its input from the
        file system and writing its output back. Spark, from Matei Zaharia’s group at Berkeley,
        kept the functional model but held datasets in memory and recorded how each was derived,
        so a lost partition could be recomputed from its parents rather than reloaded from disk.
        Inside Google, FlumeJava (2010) let programmers describe a pipeline and compiled it into an
        optimised sequence of MapReduce jobs, and the Dataflow model (2015) merged batch and
        streaming. By 2014 Google said publicly that it had largely moved new work off MapReduce.
      </p>
      <p>
        The database community objected early. In 2008 David DeWitt and Michael Stonebraker
        published a critique arguing that MapReduce ignored decades of work on schemas, indexes and
        query optimisation. Much of that critique was later absorbed: Hive and Spark SQL put SQL
        back on top of the same engines. What survived intact is the execution shape. A{' '}
        <code>GROUP BY</code> in BigQuery, Snowflake, Trino or Spark is still partition, apply,
        shuffle by key, aggregate; the query plan will show you the exchange step where the shuffle
        happens. And re-execution of idempotent tasks remains the default way batch systems handle
        failure.
      </p>
      <p>
        When is the model the wrong fit? When the computation needs shared mutable state across
        records, when it is iterative and latency matters, or when results are needed within
        seconds of the data arriving. The paper does not claim otherwise; it claims that a large
        class of Google’s jobs fit, and the growth its experience section reports, from nothing to
        hundreds of separate MapReduce programs in about a year and a half, supports that claim.
      </p>

      <h3>How to read the original</h3>
      <p>
        Read Section 2 (the programming model) and Section 3 (implementation) in full; they are
        eight pages and contain nearly everything above. Section 3.3 on fault tolerance is the heart
        of the paper, including the paragraph on semantics in the presence of failures, which most
        summaries leave out. Skim Section 4 on refinements, but stop at the combiner, the skipping
        of bad records (the library can skip input records that deterministically crash user code),
        and the counters. In Section 5, look at the three data-transfer graphs for the sort
        benchmark side by side: normal, without backup tasks, and with machines killed. The shape of
        the tail in each is more instructive than the totals. Section 6 is short and shows how
        quickly the library spread inside Google, including the rewrite of the production indexing
        system, where one phase shrank from about 3,800 lines of C++ to about 700.
      </p>
      <p>
        MapReduce could re-run work because its inputs and outputs lived in a file system that
        never lost acknowledged data. The next paper, Dynamo, removes that comfort. It is about
        data that is being written to constantly, by customers, while parts of the system are
        unreachable.
      </p>
      <Notes items={[
        'Map sees one record and reduce sees one key, and that restriction is what lets the library run, move and re-run tasks freely.',
        'Completed map tasks are re-run when their worker dies because their output sat on its local disk; completed reduce tasks are not, because their output is in GFS.',
        'Atomic rename and master-side deduplication make duplicate task executions harmless, provided map and reduce are deterministic.',
        'Backup tasks for the last stragglers cost a few per cent of resources; without them the sort benchmark took 44 per cent longer.',
        'Writing every stage to disk made iterative and interactive work slow, which is the gap Spark and Dataflow filled.',
      ]} />
    </>
  ),

  /* ────────────────────────────────────────────────────────────────── */
  dynamo: (
    <>
      <p>
        The Dynamo paper describes a key-value store that accepts writes even when replicas cannot
        talk to each other, and then shows how to cope with the conflicting versions that result.
        Reading it lets you reason about a question every distributed store faces: when the network
        splits, which failure should the user see, a refused write or two versions of their data?
      </p>
      <p>
        Amazon’s answer for its shopping cart was fixed by the business. A customer who clicks
        “add to cart” must succeed, even if a disk, a server or the link to a data centre has
        just failed. Werner Vogels, one of the authors, has written that the work began after the
        2004 holiday season, when the relational databases behind several services reached their
        scaling limits. Most of what those services did was look up a value by its primary key. They
        did not need joins or multi-row transactions, and paying for them in availability made no
        sense.
      </p>
      <p>
        The paper is also precise about what “fast” means. Amazon’s internal agreements were stated
        at the 99.9th percentile, with the paper’s example being a response within 300 milliseconds
        for 99.9 per cent of requests at a peak of 500 requests a second. A page could fan out to
        more than 150 services, so an average hides the customers whose requests were slow. Every
        design choice in the paper is measured against that tail.
      </p>

      <h3>Choosing which failure the customer sees</h3>
      <p>
        When a network partition separates replicas, a store can refuse writes on the side that
        cannot reach a quorum, or accept them on both sides and live with divergence. Brewer’s CAP
        conjecture had framed this choice. Dynamo takes the second option on purpose and calls
        itself always writeable. It makes no attempt to stop two replicas accepting different
        writes to the same key. It keeps both versions, notices the conflict when the key is next
        read, and hands the versions to the application.
      </p>
      <Fig caption="A partition separates two data centres. Each side accepts a different change to the same cart. When the link heals, Dynamo returns both versions and the application merges them.">
        <WriteDuringPartition />
      </Fig>
      <p>
        For a cart, the merge is a union of items. Nothing a customer added is ever lost. The paper
        is candid about the price: an item the customer removed can come back. That is a product
        decision expressed in storage. A spurious item in a cart costs a moment of the customer’s
        attention; a lost item costs a sale. Other services made other choices. The paper notes
        that some used a simple “last write wins” rule based on timestamps, which is fine for data
        such as session state where losing a concurrent update does not matter.
      </p>

      <h3>Where a key lives: the ring</h3>
      <p>
        Our running example is the key <code>cart:alice</code>. Dynamo hashes the key with MD5 onto
        a ring of possible hash values. Each storage node is assigned positions on the same ring.
        The key belongs to the first node clockwise from its position, which acts as coordinator,
        and is replicated to the next <em>N</em> − 1 distinct nodes after it. With <em>N</em> = 3,{' '}
        <code>cart:alice</code> might live on nodes A, B and C. That ordered list of nodes is the
        key’s preference list.
      </p>
      <p>
        The point of consistent hashing is what happens when membership changes. Add a node and it
        takes over only the keys between itself and its predecessor; every other key stays where it
        was. With a plain hash(key) mod <em>n</em> scheme, changing <em>n</em> moves almost every
        key. Dynamo goes further and gives each physical node many <strong>virtual nodes</strong>,
        so a node owns many small arcs scattered around the ring rather than one large one. When a
        node fails, its load spreads across many survivors instead of falling on one neighbour, and
        a more powerful machine can simply be given more virtual nodes.
      </p>
      <DynamoRing />
      <p>
        The paper is honest that the first scheme was not good enough. Section 6.2 describes three
        partitioning strategies they ran in turn. Random token positions made bootstrapping a new
        node slow, because it had to scan other nodes for its keys, and made Merkle trees expensive
        to rebuild. The final strategy divides the ring into a fixed number of equal partitions and
        assigns whole partitions to nodes. It balanced load best and made membership changes
        cheaper. Most summaries describe only the first scheme.
      </p>

      <h3>Following two writes to one cart</h3>
      <p>
        Dynamo’s interface has two calls. A <code>get</code> returns either one value or a list of
        conflicting versions, together with an opaque context. A <code>put</code> must pass that
        context back. The context carries a <strong>vector clock</strong>: a list of (node, counter)
        pairs, one per node that has coordinated a write to this key.
      </p>
      <pre><code>{`(values, context) = get("cart:alice")
cart = merge(values)          # application's rule, e.g. union of items
cart.add("shoes")
put("cart:alice", context, cart)`}</code></pre>
      <p>
        Now follow Alice’s cart. Node A coordinates her first write, a book, and stamps it [A:1].
        Her next write adds a pen, again through A: [A:2]. Since [A:2] is greater than or equal to
        [A:1] in every position, it supersedes it and the old version can be discarded. So far
        there is one version.
      </p>
      <p>
        Then two things happen concurrently. On her laptop, Alice adds shoes; that write lands on
        node B with context [A:2], producing [A:2, B:1] and the cart book, pen, shoes. On her phone,
        reading the same [A:2] version, she removes the pen and adds a lamp; that write is
        coordinated by C, producing [A:2, C:1] and the cart book, lamp. Compare the two clocks.
        The first is ahead in B, the second is ahead in C. Neither dominates, so the writes were
        concurrent and both versions are kept.
      </p>
      <Fig caption="Alice’s cart as a version tree. D3 and D4 descend from the same D2 on different nodes; neither vector is ahead in every position, so a read returns both and the application writes a merged D5.">
        <VersionVectors />
      </Fig>
      <p>
        The next read returns both versions. The cart service takes the union, book, pen, shoes and
        lamp, and writes it back with a context that covers both clocks, so the new version
        dominates both and they can be discarded. Notice the pen. Alice removed it on her phone,
        and the union put it back. That is the cost the paper accepted, appearing in a four-step
        example.
      </p>
      <p>
        Compare what a timestamp rule would have done with the same two writes. Last write wins
        keeps whichever version has the later wall-clock time and discards the other without
        telling anyone. If the phone’s write is stamped later, the shoes vanish; if the laptop’s
        is, the lamp vanishes, and the pen removal is lost as well. Which one survives depends on
        the clocks of two different machines, which is exactly the comparison Lamport showed cannot
        be trusted. Vector clocks cost more space and push work onto the application, but they
        never silently drop a write that nobody saw.
      </p>
      <Predict q={<>Change one fact: Alice’s phone reads the cart <em>after</em> the laptop’s write of shoes has landed. The phone write still removes the pen and adds the lamp. How many versions does the next read return, and is the pen in the cart?</>}>
        <p>
          One version, without the pen. The phone now reads [A:2, B:1] and its write produces
          [A:2, B:1, C:1], which is at least as large as the laptop’s clock in every position. The
          store knows the phone’s write saw the shoes, discards the older version, and the removal
          of the pen stands. Vector clocks only report a conflict when one writer genuinely did not
          see the other’s write.
        </p>
      </Predict>

      <h3>R, W, and what a quorum stops promising</h3>
      <p>
        Each operation is tuned by three numbers. <em>N</em> is the number of replicas, <em>W</em>{' '}
        the number that must acknowledge a write before it is reported successful, and <em>R</em>{' '}
        the number that must answer a read. The coordinator writes locally, sends the write to the
        other replicas on the preference list, and replies once <em>W</em> − 1 of them have
        answered. If <em>R</em> + <em>W</em> &gt; <em>N</em>, every read set overlaps every write
        set in at least one node. The common configuration in the paper is (3, 2, 2): any two of
        three nodes overlap any other two.
      </p>
      <Tbl>
        <table>
          <thead><tr><th>N, R, W</th><th>what it improves</th><th>what the design must also handle</th></tr></thead>
          <tbody>
            <tr><td>3, 2, 2</td><td>reads and writes both survive one slow or dead replica; read and write sets overlap</td><td>the overlap only holds while the preference list is the real one</td></tr>
            <tr><td>3, 1, 3</td><td>fast reads from any single replica</td><td>a write fails or waits if any replica is unreachable</td></tr>
            <tr><td>3, 3, 1</td><td>writes succeed if one node is up</td><td>reads wait on every replica; a lost node blocks reads</td></tr>
            <tr><td>3, 1, 1</td><td>lowest latency for both</td><td>no overlap: reads can miss recent writes until repair runs</td></tr>
          </tbody>
        </table>
      </Tbl>
      <p>
        Here is the change that matters. Nodes B and C become unreachable from the coordinator.
        A strict quorum would fail the write, since only A is left of the three. Dynamo uses a{' '}
        <strong>sloppy quorum</strong> instead: it walks further round the ring and writes to the
        first <em>N</em> healthy nodes, say A, D and E. D’s copy carries a hint that it really
        belongs to B. D keeps it in a separate local store and hands it to B when B returns. This is{' '}
        <strong>hinted handoff</strong>, and it is why the cart write succeeds.
      </p>
      <p>
        Now read the cart from a client that can reach B and C but not A. With <em>R</em> = 2 it gets
        two answers, from B and C, and neither has the latest write. The arithmetic of{' '}
        <em>R</em> + <em>W</em> &gt; <em>N</em> assumed the read and write would use the same{' '}
        <em>N</em> nodes. Under a sloppy quorum they did not. Many readers take Dynamo’s quorums as
        a consistency guarantee. They are a tuning knob for latency and durability; under failure,
        the store promises only that the replicas will converge eventually.
      </p>
      <p>
        Convergence needs a background process for the cases hinted handoff misses, such as a hint
        holder that itself dies. Replicas compare <strong>Merkle trees</strong>, hash trees over
        their key ranges, starting at the root. If the roots match, the ranges are identical and
        nothing more is sent. If not, they descend only into the subtrees that differ. Membership
        and failure information spreads by gossip, with administrators adding and removing nodes
        explicitly. There is no central coordinator anywhere, which fits the system’s priorities
        and also makes it harder to operate.
      </p>
      <p>
        Reads also repair. When a coordinator collects responses for a <code>get</code> and finds
        that one replica returned an older version that another version supersedes, it writes the
        newer version back to the stale replica. Keys that are read often converge quickly this way;
        keys that are rarely read rely on the Merkle tree comparison. The paper also places each
        key’s preference list across multiple data centres, so the loss of a whole data centre
        leaves replicas elsewhere, at the price of some writes crossing the wide-area network.
      </p>

      <h3>What production taught them</h3>
      <p>
        Section 6 is the part of the paper most worth rereading. Over a 24-hour period on the
        shopping cart service, 99.94 per cent of requests saw exactly one version, and only a tiny
        remainder saw two or more. The authors write that the rise in divergent versions was usually caused not by
        failures but by concurrent writers, and that these were mostly automated client programs
        rather than people. The mechanism built for partitions was mostly handling robots.
      </p>
      <p>
        They also traded durability for latency where a service could tolerate it. An optional
        in-memory write buffer, flushed by a background writer, reduced 99.9th percentile write
        latency by a factor of five during peak traffic, at the risk of losing buffered writes if a
        server crashed. To limit that risk, one of the <em>N</em> replicas performs a durable write.
        Vector clocks have a size problem too: if many nodes coordinate writes for a key, the list
        grows. Dynamo truncates it past a threshold by dropping the oldest entry, which can make
        it impossible to prove that one version descends from another. The paper reports this had
        not been a problem in production; it is a correctness shortcut with a known failure mode.
      </p>
      <p>
        Finally, they moved coordination into the client. Instead of sending a request to a random
        node that forwards it, a client library can learn the membership and send directly to the
        coordinator. The paper reports this lowered latency at the 99.9th percentile as well as on
        average. It removed a network hop from every request.
      </p>

      <h3>What DynamoDB kept and what it dropped</h3>
      <p>
        Dynamo was internal software that each team ran for itself, and it asked a lot of
        application developers. Vogels has written that many Amazon teams preferred the simpler
        SimpleDB despite its limits, because running Dynamo and writing merge logic was hard. When
        Amazon launched DynamoDB as a service in 2012, it kept the partitioned, replicated,
        key-value shape and the obsession with predictable latency, and dropped the parts
        developers struggled with. DynamoDB does not return conflicting versions. Its 2022 USENIX
        ATC paper describes each partition being replicated with Multi-Paxos, with a leader replica
        that serves writes and strongly consistent reads. Global tables, which replicate across
        regions, resolve concurrent writes with last writer wins.
      </p>
      <p>
        Others took different paths. Cassandra, built at Facebook by one of Dynamo’s authors,
        combined the ring with Bigtable’s data model and used timestamps rather than vector clocks.
        Riak followed the paper closely, kept vector clocks, and later adopted dotted version
        vectors to stop sibling versions multiplying under concurrent clients. The reconciliation
        Dynamo left to applications was later formalised as conflict-free replicated data types,
        which merge automatically with rules defined by the data type rather than by each service.
      </p>
      <p>
        When should you not use this design? When an operation cannot be undone or merged: taking
        payment, decrementing stock that must never go negative, assigning a unique username. For
        those, a refused or delayed write is the correct answer during a partition, and the design
        you want is consensus, which is the next paper.
      </p>

      <h3>How to read the original</h3>
      <p>
        Read Section 2 first, especially the subsections on service level agreements and design
        considerations; they explain why the system looks the way it does. Then Table 1 in Section
        4, which lists each problem with the technique chosen for it and its advantage. Use it as a
        map for the rest of Section 4: read 4.3 (replication), 4.4 (versioning, with the paper’s
        own vector clock example) and 4.5 to 4.7 (quorums, hinted handoff, Merkle trees) closely,
        and skim the rest. Section 5 on implementation can be skimmed. Section 6 is the evaluation
        and is the best part: look at the latency graphs for the buffered write experiment, the
        three partitioning strategies, and the divergent-version counts. There is no formal
        correctness argument, and none is claimed; read it as an experience report.
      </p>
      <p>
        Dynamo chose availability and handed conflicts to the application. Raft makes the opposite
        choice. It gets a cluster to agree on one order of writes and refuses to make progress
        without a majority, and its paper is mostly about making that agreement understandable
        enough to build correctly.
      </p>
      <Notes items={[
        'Dynamo accepts writes during partitions and keeps conflicting versions, choosing divergence over refused writes for the shopping cart.',
        'Consistent hashing with virtual nodes moves only nearby keys on membership change and spreads a failed node’s load across many others.',
        'Vector clocks detect when two writes did not see each other; if one clock is ahead in every position, the older version is discarded silently.',
        'Union-based merging never loses an added item and can bring back a removed one.',
        'With sloppy quorums, R + W > N does not guarantee a read sees the latest write; it is a latency and durability setting, not a consistency guarantee.',
        'DynamoDB kept the partitioned design but dropped client-side reconciliation, replicating each partition with Multi-Paxos.',
      ]} />
    </>
  ),

  /* ────────────────────────────────────────────────────────────────── */
  raft: (
    <>
      <p>
        Raft is an algorithm for keeping a replicated log identical on a group of machines while
        some of them crash and restart. The paper’s contribution is not a new capability; Paxos
        already provided one. It is a design that engineers can understand well enough to
        implement correctly, and an argument for why that should count as a goal of the research.
      </p>
      <p>
        Consider the job Raft is used for. A configuration store runs on three machines so that
        losing one does not take it down. A client writes <code>leader=svc-7</code>. The machine
        that received the write crashes a moment later. Is the write durable? Will the new leader
        of the group have it? Could another client read the old value after being told the write
        succeeded? A replicated store has to answer these questions exactly and the same way every
        time, and it has to do so with no reliable clocks and messages that can be delayed or lost.
      </p>

      <h3>Why Paxos was not enough</h3>
      <p>
        By 2013 the field had a proven answer in Paxos. Lamport’s algorithm guarantees that a group
        agrees on a single value as long as a majority are working. Diego Ongaro and John
        Ousterhout’s complaint, set out in Section 3 of the paper, was twofold. Paxos was hard to
        understand, even for researchers who taught it. And its basic form agrees on one value; a
        real system needs agreement on a sequence of values, and the literature’s description of
        that extension, Multi-Paxos, left many decisions unspecified. Every production system, the
        paper notes, began with Paxos and ended with something different and unproven, with
        Google’s Chubby team saying as much in their own experience paper.
      </p>
      <p>
        So Raft starts from a different priority. Correctness and efficiency comparable to
        Multi-Paxos were required. Beyond that, whenever there was a design choice, the authors
        picked the option that was easier to explain, and they used two techniques throughout:
        divide the problem into parts that can be understood separately (leader election, log
        replication, safety), and reduce the number of states the system can be in. They then tested
        the claim with a user study of 43 students at Stanford and Berkeley who learned both
        algorithms; most did better on the Raft quiz.
      </p>

      <h3>One leader per term, and how it is elected</h3>
      <p>
        Raft puts all decisions in the hands of a single leader. Clients send commands to the
        leader; the leader appends them to its log and copies them to the others; log entries only
        flow from leader to followers. That is a much stronger leader than in basic Paxos, and it is
        the main simplification. The problem it creates is choosing the leader safely.
      </p>
      <p>
        Time is divided into <strong>terms</strong>, numbered with consecutive integers. Each term
        begins with an election and has at most one leader. Every server stores the latest term it
        has seen, and every message carries the sender’s term. A server that sees a higher term
        updates its own and becomes a follower at once; a request carrying a stale term is
        rejected. Terms play the role Lamport’s logical clocks play: they let servers detect
        stale information without trusting time.
      </p>
      <Fig caption="Each server is a follower, a candidate or a leader. A follower that hears nothing becomes a candidate; a candidate with a majority of votes becomes leader; any server that sees a higher term steps down to follower.">
        <RaftRoles />
      </Fig>
      <p>
        A leader sends periodic heartbeats. A follower that hears nothing for its election timeout
        increments its term, votes for itself, becomes a candidate and sends RequestVote to everyone.
        Each server votes for at most one candidate per term, first come first served. A candidate
        that collects votes from a majority becomes leader and starts sending heartbeats.
      </p>
      <p>
        If two followers time out at the same moment, they can split the votes and neither wins.
        Both time out again and start a new term, and this could repeat. Raft’s answer is
        randomisation: each server picks its timeout at random from a range, the paper’s example
        being 150 to 300 milliseconds. In a five-node cluster one follower will usually time out
        tens of milliseconds before the others, win the election and send heartbeats before anyone
        else wakes up. The authors had first considered a ranking scheme for breaking ties and
        found it produced subtle availability problems; randomness was easier to reason about.
      </p>
      <p>
        The paper states the timing requirement as an inequality. The time to send a message to
        all servers and get replies must be much less than the election timeout, which must be much
        less than the average time between failures of a single server. Broadcast time on a local
        network is typically well under the low tens of milliseconds, so a timeout of a few hundred
        milliseconds leaves room. Run Raft across continents and the left side of the inequality
        grows, which is why geographically spread deployments raise their timeouts.
      </p>

      <h3>Following one command into the log</h3>
      <p>
        Take a five-node cluster, S1 to S5, with S1 as leader in term 2. A client sends{' '}
        <code>set x=1</code>. S1 appends it to its log at index 4 with term 2 and sends
        AppendEntries to the four followers. Each AppendEntries also names the index and term of
        the entry just before the new ones, here index 3 and whatever term that entry had.
      </p>
      <p>
        A follower accepts only if its own log has an entry at index 3 with that term. This
        consistency check, applied inductively, gives the <strong>log matching</strong> property:
        if two logs have an entry with the same index and term, the logs are identical up to that
        point. When a follower’s log differs, say S4 missed entry 3 while it was down, it rejects
        the request. The leader keeps a next-index for each follower, decrements it, and retries
        until it reaches a point where the logs agree. Then it sends everything from there,
        overwriting anything the follower had after that point. Repair is always the leader’s log
        winning.
      </p>
      <p>
        With numbers: S4 holds entries 1 and 2. S1 sends index 4 with “previous is index 3, term 2”.
        S4 has no index 3, so it rejects. S1 lowers S4’s next-index to 3 and sends entries 3 and 4
        with “previous is index 2, term 1”. That matches, so S4 appends both. The paper notes this
        one-step-at-a-time walk back can be optimised, for instance by having the follower report
        the term of the conflicting entry so the leader skips a whole term at once, and argues that
        in practice failures are rare enough that the simple version is fine.
      </p>
      <p>
        One detail in Figure 2 is easy to miss and causes real bugs. Each server must write its
        current term, the candidate it voted for, and its log to stable storage before replying to
        any request. If a server votes for S2 in term 3, crashes, restarts with no memory of the
        vote, and then votes for S5 in term 3, two leaders can be elected in the same term. Raft’s
        safety argument assumes votes survive restarts.
      </p>
      <p>
        Once S1 learns that index 4 is stored on three of five servers, itself and two followers, the
        entry is <strong>committed</strong>. S1 applies it to its state machine, answers the client,
        and tells followers the new commit index in later messages so they apply it too. The
        simulation below lets you run elections, append entries, crash the leader and see which
        entries survive.
      </p>
      <RaftSim />

      <h3>Why a committed entry survives any crash</h3>
      <p>
        Suppose S1 crashes right after answering the client. The client was told <code>set x=1</code>{' '}
        succeeded, so the next leader must have it. Nothing so far guarantees that. Raft adds one
        rule to elections: a server refuses to vote for a candidate whose log is less up to date than
        its own. “Up to date” compares the term of the last entry first, and the length of the log
        only if those terms are equal. RequestVote carries the candidate’s last index and term so
        voters can apply the check.
      </p>
      <Fig caption="The entry was stored on three of five servers before it was committed. Any three servers that elect the next leader must include at least one of them, and that server will not vote for a candidate whose log lacks the entry.">
        <MajorityOverlap />
      </Fig>
      <Predict q={<>In the five-node cluster, index 4 is on S1, S2 and S3 and is committed. S1 crashes. S5 missed the entry and times out first. Can S5 become leader?</>}>
        <p>
          Not without the entry. S5 needs three votes including its own, so it needs two of S2, S3
          and S4. S2 and S3 both have index 4 from term 2, so their logs are more up to date than
          S5’s, and they refuse. S4 alone is not enough. S5’s election fails, and a later candidate
          from S2 or S3 wins. Any majority that can elect a leader overlaps the majority that stored
          the entry, and the overlapping server enforces the rule.
        </p>
      </Predict>

      <h3>The case that catches implementers: entries from an older term</h3>
      <p>
        The rule above is the obvious half. The paper’s Figure 8 shows a less obvious half, and it is
        worth walking through slowly because implementations get it wrong. Five servers again.
      </p>
      <p>
        In term 2, S1 is leader and replicates an entry at index 2 to S2 only, then crashes. S5 is
        elected leader for term 3 with votes from S3, S4 and itself (their logs end at index 1, as
        does S5’s, so S5 is up to date enough). S5 accepts a different client command at index 2 with
        term 3, then crashes before replicating it. S1 restarts, wins term 4, and continues
        replicating its old term-2 entry. It reaches S3, so the term-2 entry now sits on S1, S2 and
        S3: a majority.
      </p>
      <p>
        Is the term-2 entry committed? It is on a majority, so the naive rule says yes. Now let S1
        crash again. S5 can win term 5 with votes from S2, S3 and S4, because the last term in its
        log is 3, which beats the 2 at the end of theirs. As leader, S5 overwrites index 2 on every
        follower with its own term-3 entry. An entry that was stored on a majority, and might have
        been reported committed, has vanished.
      </p>
      <p>
        Raft’s fix is a restriction on the commit rule. A leader only counts replicas to commit
        entries from its own current term. Older entries become committed indirectly, when an
        entry from the current term after them is committed. In the walk-through, S1 in term 4 must
        get a term-4 entry onto a majority before anything at index 2 counts as committed. Once that
        happens, S5’s log is no longer up to date enough to win an election, and the overwrite
        cannot occur. The cost is a little extra latency in the rare case where a new leader inherits
        uncommitted entries; implementations commonly append an empty entry at the start of each
        term to settle them quickly.
      </p>
      <Callout>
        A Raft entry is safe once it is on a majority and a leader has committed an entry from its
        own term at or after it. Everything else in the safety argument follows from two majorities
        always sharing a server and that server refusing to vote for a less complete log.
      </Callout>

      <h3>What the paper leaves to you, and what came later</h3>
      <p>
        Much of what made Paxos hard to build lies outside the core algorithm, and Raft’s paper
        covers these parts too. Section 6 handles changing the set of servers with joint consensus:
        for a transition period, decisions need separate majorities of both the old and new
        configurations, so two leaders cannot be elected in different majorities. Section 7 covers
        snapshots for compacting the log, and Section 8 covers clients, including giving each
        command a serial number so a retried command is not applied twice, and requiring a leader to
        confirm it is still leader before serving a read.
      </p>
      <Tbl>
        <table>
          <thead><tr><th>problem</th><th>what the paper does</th><th>what it costs</th><th>what later work changed</th></tr></thead>
          <tbody>
            <tr><td>split votes</td><td>randomised election timeouts</td><td>a few hundred ms of unavailability after a leader dies</td><td>tuned timeouts per deployment</td></tr>
            <tr><td>changing membership</td><td>joint consensus over old and new sets</td><td>two-phase transition, more states</td><td>Ongaro’s thesis adds one-server-at-a-time changes, with a bug found and fixed later</td></tr>
            <tr><td>unbounded log</td><td>snapshot the state machine, discard the prefix</td><td>snapshot transfer to slow followers</td><td>incremental snapshots in production stores</td></tr>
            <tr><td>stale reads from a deposed leader</td><td>leader confirms with a heartbeat round before reads</td><td>a network round trip per read</td><td>leases that trade a clock assumption for speed</td></tr>
            <tr><td>a flaky server disrupting the cluster</td><td>not covered in the paper</td><td>repeated elections with ever higher terms</td><td>pre-vote and check-quorum, from Ongaro’s thesis</td></tr>
          </tbody>
        </table>
      </Tbl>
      <p>
        That last row is where real deployments hurt. A server that can send but not receive, or
        that is cut off from the leader but not from the others, keeps timing out and starting
        elections with higher terms, forcing a healthy leader to step down. Pre-vote has a
        candidate first ask whether it could win before incrementing its term; check-quorum has a
        leader step down if it cannot hear from a majority. Cloudflare’s 2020 write-up of a
        partially failed network switch, which left an etcd cluster electing leaders over and over,
        is a good account of this class of failure.
      </p>
      <p>
        Is Raft really different from Paxos? Heidi Howard and Richard Mortier’s 2020 paper compares
        them in a common framework and concludes the two are very close, with the main difference in
        how a leader is chosen: Raft only allows a server with an up-to-date log to win, while Paxos
        lets any server win and then has it catch up. Raft’s advantage is in presentation and
        completeness of specification more than in mechanism. That was the paper’s claim, so it is
        not a criticism.
      </p>
      <p>
        When should you not reach for Raft? When the data can tolerate merging, because a majority
        requirement means a minority partition cannot write at all. When write latency must stay low
        across distant regions, because every commit waits for a majority round trip. And when a
        single Raft group would hold too much data or traffic; CockroachDB, TiKV and YugabyteDB run
        thousands of small Raft groups, one per range of keys, for that reason. Within those limits,
        Raft became the default. etcd uses it and holds the state of every Kubernetes cluster, Consul
        uses it, and Kafka replaced ZooKeeper with its own Raft-based controller quorum.
      </p>

      <h3>How to read the original</h3>
      <p>
        Read the extended version linked here, not the shorter conference paper. Sections 1 to 4 are
        motivation and take ten minutes. Then go to Figure 2, the one-page summary of the whole
        algorithm, and keep it open while you read Section 5. Read 5.2 to 5.4 closely; Section 5.4.2
        and Figure 8 are where the subtle case above comes from, and they are worth reading twice.
        Section 5.6 has the timing inequality. Read Section 6 on membership if you will operate a
        cluster, and skim 7 and 8 otherwise. In Section 9, the user study is interesting as
        methodology; the performance section shows how election time depends on the timeout range,
        which is the evidence for randomisation. Afterwards, try writing the state transitions from
        memory. If you can, the paper achieved its goal.
      </p>
      <p>
        Raft orders writes within a group by having one leader number them. Spanner needs an order
        that holds across thousands of such groups spread over continents, consistent with real
        time, and it gets it by returning to the problem Lamport set aside: physical clocks.
      </p>
      <Notes items={[
        'Raft puts every decision in one leader per term, and terms let servers recognise and reject stale leaders without trusting clocks.',
        'Randomised election timeouts make split votes rare because one follower usually times out well before the others.',
        'An entry is committed when it is on a majority, and a server only votes for candidates whose log is at least as up to date as its own.',
        'A leader may only commit by counting replicas for entries from its own term; older entries commit indirectly, which closes the Figure 8 case.',
        'Membership changes, snapshots, client retries and pre-vote are where implementations go wrong, and the paper and Ongaro’s thesis cover them.',
      ]} />
    </>
  ),

  /* ────────────────────────────────────────────────────────────────── */
  spanner: (
    <>
      <p>
        Spanner is a database that replicates data across continents and still gives every
        transaction a timestamp consistent with real time, everywhere. The paper shows that the
        obstacle Lamport identified in 1978, that clocks on different machines cannot be compared,
        can be handled by measuring how wrong each clock might be and waiting out the uncertainty.
      </p>
      <p>
        The pressure came from Google’s advertising backend. It ran on MySQL, manually sharded by
        customer, and the paper reports that the last re-sharding took more than two years of
        effort across many teams. The team wanted a database that would move data between machines
        and data centres by itself, survive the loss of a region, and keep SQL and real
        transactions. Bigtable scaled but had no transactions across rows. Megastore, built on
        Bigtable, had transactions and synchronous replication but relatively poor write
        throughput.
      </p>
      <p>
        One requirement made a global design look impossible. The paper calls it{' '}
        <strong>external consistency</strong>: if transaction T1 commits before transaction T2
        starts, in real time and anywhere in the world, then T2’s commit timestamp must be greater
        than T1’s. Our running example: in Tokyo, Alice removes Bob from the list of people who can
        see her photos (T1). After that commits, in Dublin, she posts a photo (T2). A reader
        taking a snapshot at any timestamp must never see the new photo with Bob still on the list.
      </p>

      <h3>Why ordinary timestamps produce impossible histories</h3>
      <p>
        Try it with ordinary clocks. Put true time on a common axis in milliseconds. The Tokyo
        server’s clock is 5 ms fast. At true time 100, T1 commits and is stamped 105. Alice’s
        client gets the reply and, two milliseconds later at true time 102, starts T2 in Dublin,
        where the clock is 3 ms slow. T2 reads 99 and is stamped 99.
      </p>
      <p>
        A snapshot read at timestamp 100 now includes T2, the photo, and excludes T1, the removal.
        Bob, reading at that snapshot, sees a photo he was supposed to be blocked from. The history
        is impossible in real time, yet every server behaved correctly by its own clock. The skew
        was eight milliseconds, comfortably within what NTP leaves you with. Before Spanner, systems
        either sent every commit through one place that assigned timestamps, which does not work
        across oceans, or gave up this guarantee.
      </p>
      <p>
        Lamport’s logical clocks do not help here, and the reason is the “anomalous behaviour” from
        his paper. T1 and T2 are linked by Alice, outside the database. No message inside the
        system connects them, so a logical clock is free to order them either way.
      </p>

      <h3>A clock that reports its own error</h3>
      <p>
        TrueTime is Spanner’s answer. Its central call, <code>TT.now()</code>, does not return a
        time. It returns an interval, earliest to latest, and guarantees that the true time is
        inside it. Two helpers follow: <code>TT.after(t)</code> is true when t has definitely
        passed, and <code>TT.before(t)</code> is true when t has definitely not arrived. The
        half-width of the interval is called ε.
      </p>
      <Fig caption="A TrueTime reading is an interval that is guaranteed to contain the true time. The system reports how uncertain it is instead of picking a single number.">
        <TrueTimeInterval />
      </Fig>
      <p>
        Behind the API, each data centre has time master machines. Most have GPS receivers; the
        others, which the paper calls Armageddon masters, have atomic clocks, so that a fault
        affecting GPS does not affect every master. A daemon on every machine polls several
        masters, rejects outliers, and synchronises. Between polls, it assumes the local clock may
        drift at a worst-case rate and widens ε accordingly.
      </p>
      <p>
        The paper gives numbers we can check against each other. Daemons poll every 30 seconds,
        and the assumed worst-case drift is 200 microseconds per second. Over 30 seconds that is
        30 × 200 μs = 6 ms. Add about a millisecond of uncertainty from communicating with the
        masters, and ε rises from about 1 ms just after a poll to about 7 ms just before the next,
        a sawtooth that averages around 4 ms. The 200 μs per second figure is deliberately
        pessimistic, well beyond what a healthy crystal does, and the daemon evicts machines whose
        clocks drift more than that.
      </p>

      <h3>Commit wait, with numbers</h3>
      <p>
        With an honest interval, the rule for committing is short. When a transaction is ready to
        commit, the leader picks timestamp <em>s</em> no smaller than <code>TT.now().latest</code>.
        It then waits until <code>TT.after(s)</code> is true before releasing locks and replying.
        The paper calls this <strong>commit wait</strong>.
      </p>
      <pre><code>{`s = TT.now().latest          # no earlier than any possible true time now
apply_and_replicate(s)       # Paxos, in parallel with the wait
while not TT.after(s):       # wait until s is definitely in the past
    sleep briefly
release_locks(); reply(s)`}</code></pre>
      <p>
        Rerun the photo example with ε = 4 ms everywhere. At true time 100, Tokyo reads the
        interval [96, 104] and picks s = 104. It must wait until earliest exceeds 104, which happens
        once true time passes 108. Alice gets her reply at about 108. She starts T2 in Dublin at true
        time 110; Dublin reads [106, 114] and stamps T2 at 114 or later. Since 114 is greater than
        104, a snapshot that includes the photo also includes the removal.
      </p>
      <p>
        The argument does not depend on the specific numbers. When T1 replies, its timestamp is
        definitely in the past. Anything that starts after that reply reads a later true time, and
        its interval’s latest edge is later still. The cost is the wait, about 2ε per write
        transaction, roughly 8 ms on average with the paper’s figures. Spanner hides part of it by
        overlapping the wait with Paxos replication, which takes several milliseconds anyway.
      </p>
      <p>
        This is also why Google spent money on GPS receivers and atomic clocks instead of relying on
        NTP. The algorithm is correct with any honest ε; what ε controls is how long each write
        waits. With ordinary NTP over a wide network, a safe bound might be tens or hundreds of
        milliseconds, and every write would wait twice that. The hardware is a latency
        optimisation, which is an unusual way to think about clocks: Spanner turns clock accuracy
        directly into write latency.
      </p>
      <TrueTimeSim />
      <Predict q={<>A problem with nearby time masters makes ε grow from 4 ms to 8 ms for a while. What happens to the correctness of commits, and what happens to write latency?</>}>
        <p>
          Correctness is unchanged, because the intervals still contain true time; they are just
          wider. Latency rises: commit wait is about 2ε, so roughly 8 ms becomes 16 ms per write,
          and any part not hidden behind Paxos replication shows up in client latency. The system
          slows down instead of becoming wrong. What would break
          correctness is the opposite failure: a clock that drifts beyond the assumed bound, so the
          interval no longer contains true time.
        </p>
      </Predict>

      <h3>Paxos groups, two-phase commit and locks, stacked</h3>
      <p>
        TrueTime only orders transactions. Durability and atomicity come from layers that were
        already well understood, stacked so that each layer’s weakness is covered by the one
        beneath. Data is split into tablets. Each tablet is replicated by its own Paxos group,
        typically across three or five zones, with a long-lived leader that holds a timed lease, ten
        seconds by default. A write is durable once a majority of the group has logged it.
      </p>
      <Fig caption="Each tablet is a Paxos group spread across zones. A transaction that touches two tablets runs two-phase commit between the groups’ leaders, and every message of that protocol is itself replicated by Paxos.">
        <SpannerStack />
      </Fig>
      <p>
        A read-write transaction takes locks at the Paxos leaders, using two-phase locking with
        wound-wait to avoid deadlock. If it touched more than one group, the client picks one
        group’s leader as coordinator and runs two-phase commit. Each participant leader logs a
        prepare record through Paxos and chooses a prepare timestamp; the coordinator picks a commit
        timestamp at least as large as all of them and at least <code>TT.now().latest</code>, logs
        the commit through Paxos, performs commit wait, then tells participants.
      </p>
      <p>
        Two-phase commit has a well-known weakness: if the coordinator crashes after participants
        have prepared, they hold their locks and cannot decide alone. In Spanner the coordinator is
        a Paxos group, not a machine. If its leader dies, another replica takes over with the full
        log, and the protocol continues. That is how Spanner can use a protocol many systems avoid.
        The cost is latency: a cross-group commit is several Paxos rounds, each needing a majority
        across zones, plus commit wait.
      </p>
      <p>
        Data placement decides how often that cost is paid. Spanner groups rows that share a key
        prefix into a unit the paper calls a directory, and moves directories between Paxos groups
        in the background to balance load or bring data closer to its users. Applications declare
        hierarchies of tables, so that a user’s row and the rows of their photos and settings sit in
        the same directory. A transaction that touches only Alice’s own data then involves one Paxos
        group and skips two-phase commit entirely. Our example, with the access list in Tokyo and the
        album in Dublin, is the expensive case on purpose; a well-designed schema makes it rare.
      </p>
      <p>
        The paper also relies on a subtle property of leader leases. Each Paxos leader’s lease
        intervals must not overlap with those of the next leader, and each leader assigns timestamps
        within its lease, increasing over time. Without that, a new leader could assign a timestamp
        smaller than one the old leader had already given out.
      </p>

      <h3>What the timestamps buy: reads without locks</h3>
      <p>
        The payoff is on the read side. Because commit timestamps match real-time order, a snapshot
        at any timestamp <em>t</em> is a consistent view of the whole database as it was at that
        moment. Any replica can serve a read at <em>t</em>, with no locks and no conversation with
        the leader, as long as it knows it has applied every write up to <em>t</em>. Each replica
        tracks this as a safe time, derived from the Paxos writes it has applied and from any
        transactions that are prepared but not yet committed.
      </p>
      <p>
        A read-only transaction picks <em>t</em> = <code>TT.now().latest</code> and reads at it.
        Analytics over the whole database “as of ten seconds ago” can run on nearby replicas without
        slowing writers. Schema changes become transactions scheduled at a future timestamp: every
        server applies the change when its clock passes that timestamp, so there is no global pause.
        In the photo example, Bob’s client can read the access list and the album at the same
        snapshot, from replicas in whatever region is closest, and the result is always a state that
        really existed.
      </p>
      <p>
        Change one variable: the replica nearest Bob is lagging. Bob’s read picks timestamp 120,
        but that replica has applied writes only up to 112, so its safe time is 112. It cannot
        answer at 120, because a write between 112 and 120 might still be on its way. It waits until
        Paxos brings it past 120, or the client chooses a slightly older timestamp, say 110, which
        the replica can serve at once. Spanner exposes that choice as bounded-staleness reads: the
        application states how old a snapshot it will accept and in exchange reads locally without
        waiting. The guarantee that the snapshot is consistent does not weaken; only its age does.
      </p>

      <h3>What it costs, and who copied it</h3>
      <p>
        The bill comes in three parts. Writes pay commit wait and cross-zone Paxos rounds, so
        Spanner is not where you put a workload that needs single-digit-millisecond writes across
        regions. The guarantees depend on a clock bound that requires dedicated hardware and
        operational discipline. And during a partition, Spanner favours consistency: a minority side
        cannot commit. Eric Brewer’s 2017 note argues that Spanner is technically a CP system, but
        that Google’s private network makes partitions rare enough that users experience it as
        effectively available as well.
      </p>
      <Tbl>
        <table>
          <thead><tr><th>system</th><th>time source</th><th>what it guarantees across regions</th><th>what it pays</th></tr></thead>
          <tbody>
            <tr><td>Spanner</td><td>TrueTime: GPS and atomic clocks, explicit ε</td><td>external consistency</td><td>commit wait of about 2ε on writes, special hardware</td></tr>
            <tr><td>CockroachDB</td><td>hybrid logical clocks over NTP, configured maximum offset</td><td>serialisable transactions; real-time order within the offset bound</td><td>reads that hit the uncertainty window may restart</td></tr>
            <tr><td>Dynamo-style stores</td><td>vector clocks, no physical order</td><td>eventual convergence, application merges</td><td>conflicts surface to the application</td></tr>
            <tr><td>single-leader database</td><td>one leader assigns order</td><td>linearisable while the leader is reachable</td><td>every write travels to one region</td></tr>
          </tbody>
        </table>
      </Tbl>
      <p>
        CockroachDB and YugabyteDB reproduce Spanner’s architecture without atomic clocks. They use
        hybrid logical clocks, which combine wall time with a Lamport counter, and a configured
        maximum clock offset. Instead of waiting out uncertainty on every write, a read that finds a
        value inside its uncertainty window restarts at a higher timestamp. The guarantees are
        slightly weaker and the cost moves from writes to some reads. Google later published how
        Spanner became a full SQL system, and offers it as Cloud Spanner. AWS now exposes bounded
        clock error through its Time Sync service and the ClockBound library, which return an
        interval for applications to use the same way.
      </p>
      <p>
        When should you not want this? If your writes come from one region, a single-leader database
        with replicas is simpler and faster. If your data can merge, a Dynamo-style store keeps
        writing through partitions. Spanner’s design pays off when you need transactions across
        partitions of data spread over regions, and consistent snapshots across all of it.
      </p>

      <h3>How to read the original</h3>
      <p>
        Read Section 1 for the motivation and Section 3 on TrueTime, which is short. Then read
        Section 4 slowly, especially 4.1.2 on how timestamps are assigned to read-write
        transactions and the two rules, start and commit wait, that give external consistency;
        follow the small proof with our photo example beside you. Section 4.1.3 on safe time is dense;
        skim it first and return to it. Section 2 on the server organisation and directories can be
        skimmed unless you care about data placement. In the evaluation, look at the figure showing
        the distribution of ε over time and the experiment in which Paxos leaders were killed; the
        throughput dip and its duration follow directly from the lease length. The F1 case study at
        the end connects the design back to the advertising workload that motivated it.
      </p>
      <p>
        That completes this set. Each paper here answered the question Lamport posed in a
        different way: MapReduce avoided it with a single master, Dynamo accepted partial order and
        merged, Raft built a total order with a majority, and Spanner bounded physical time. The
        next set, Databases &amp; Storage, starts with Codd’s relational model and moves down
        through recovery and storage engines to the log.
      </p>
      <Notes items={[
        'External consistency means a transaction that starts after another commits always gets a larger timestamp, wherever the two ran.',
        'TrueTime returns an interval guaranteed to contain true time; with 30-second polls and an assumed 200 μs/s drift, ε moves between about 1 and 7 ms.',
        'Commit wait picks the latest edge of the interval as the timestamp and waits until it has definitely passed, costing about 2ε per write.',
        'Each tablet is a Paxos group, and two-phase commit runs between Paxos leaders, so a crashed coordinator does not block participants.',
        'Timestamps that match real time let any sufficiently caught-up replica serve consistent snapshot reads without locks.',
        'CockroachDB and similar systems replace TrueTime with hybrid logical clocks and a maximum offset, moving the cost from commit wait to occasional read restarts.',
      ]} />
    </>
  ),
}
