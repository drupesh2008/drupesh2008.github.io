/**
 * Cloud & Infrastructure — five explainers. Each opens on the situation the
 * authors were stuck in, carries one worked example through the mechanism,
 * and ends with how to read the original. Keyed by paper id.
 */
import type { ReactNode } from 'react'
import { Callout, Fig, Tbl, Predict, Notes } from '@/components/Pathway/Pathway'
import GfsSim from '@/components/Papers/sims/GfsSim'
import DapperTrace from '@/components/Papers/sims/DapperTrace'
import TailLatency from '@/components/Papers/sims/TailLatency'
import BorgScheduler from '@/components/Papers/sims/BorgScheduler'
import FirecrackerDensity from '@/components/Papers/sims/FirecrackerDensity'
import {
  GfsRead, WritePipeline, SpanTree, CollectionPipeline, FanOutTail, HedgedRequest, BorgCell, PriorityBands,
  IsolationStack, JailerLayers,
} from './cloud-diagrams'

export const sections: Record<string, ReactNode> = {
  /* ────────────────────────────────────────────────────────────────── */
  gfs: (
    <>
      <p>
        In the early 2000s Google was storing its crawl of the web on a few thousand cheap Linux
        PCs. On a fleet that size something is always broken: a disk has died, a machine is
        rebooting after a kernel bug, a power supply has failed, and now and then a drive returns
        bytes that are not the bytes it was given. The files themselves were unlike anything a
        workstation file system expected. A day’s crawl might be a handful of files, each many
        gigabytes long, which hundreds of MapReduce workers append to at the same time and the
        next job then reads from start to finish.
      </p>
      <p>
        NFS and the file systems before it were built for the opposite case: reliable disks, many
        small files, and one user doing small reads and writes at random offsets. The GFS paper
        describes what Google built instead, and it is unusually frank about what it gave up. By
        the end of this page you should be able to trace one append through a master and three
        replicas, say what a reader sees when one replica fails halfway through, and explain why
        HDFS looks the way it does and why Google later replaced GFS with Colossus.
      </p>
      <p>
        We will follow one example. A crawler worker wants to append a 1 MB record of fetched
        pages to a shared file called <code>/crawl/day-17</code>. Forty other workers are appending
        to the same file at the same moment.
      </p>

      <h3>Start from the workload, not from POSIX</h3>
      <p>
        Section 2.1 of the paper lists assumptions before it describes any mechanism, and every
        later decision traces back to one of them. Component failure is the normal state, so
        detection and repair have to be automatic. Files are large, so a few million of them is
        plenty and per-file metadata can be generous. Most mutations append to the end of a file
        and almost nothing overwrites the middle, so random writes can be supported without being
        fast. Workloads care about sustained bandwidth more than the latency of any single
        operation, because a MapReduce job is measured in hours.
      </p>
      <p>
        The last assumption is the one that makes GFS possible at all: the file system and the
        applications were written by the same company. GFS does not implement the POSIX
        interface. It offers create, delete, open, close, read and write, plus two operations
        POSIX lacks, snapshot and record append. When the authors could make the file system
        simpler by asking applications to do a little more work, they did, and they could ask
        because they knew every application.
      </p>
      <p>
        A common reading is that GFS is a general-purpose distributed file system that happened to
        be built at Google. It is not. The paper says small files are supported but not optimised,
        and later Google teams found out exactly how expensive that sentence was. Keep the
        workload in mind when a design choice looks strange; it usually stops looking strange.
      </p>

      <h3>One master that never touches the bytes</h3>
      <p>
        A GFS cluster has one <strong>master</strong> and many <strong>chunkservers</strong>.
        Every file is cut into fixed 64 MB <strong>chunks</strong>, each named by a 64-bit chunk
        handle and stored as an ordinary Linux file on three chunkservers by default. The master
        holds all metadata in memory: the namespace, the list of chunk handles that make up each
        file, and which chunkservers currently hold each chunk.
      </p>
      <p>
        Holding everything in memory sounds reckless until you do the arithmetic. The paper says
        the master keeps less than 64 bytes of metadata per 64 MB chunk. A petabyte of data is
        about sixteen million chunks, and sixteen million times 64 bytes is roughly a gigabyte of
        RAM. That fit comfortably on one machine in 2003, and it means every placement decision
        can be made with a complete, global view and no disk seek.
      </p>
      <p>
        Now a reader of our crawl file asks for the bytes at offset 200,000,000. The client
        library divides by 64 MB and gets chunk index 2. It sends the master the file name and
        that index, and the master replies with the chunk handle and the three chunkservers that
        hold it. The client caches the answer and reads the bytes straight from the nearest
        replica. The next read in the same chunk does not involve the master at all.
      </p>
      <Fig caption="A read. The client asks the master which chunk and which servers, caches the reply, then fetches the data directly from a chunkserver. The master handles a few dozen bytes per lookup and none of the file data.">
        <GfsRead />
      </Fig>
      <p>
        The master does not store chunk locations on disk. At startup, and in every heartbeat
        after that, it asks each chunkserver what it holds. The reasoning is that the chunkserver
        has the final word on what is actually on its disks, since disks fail and operators rename
        machines, so a persistent copy on the master would only be a second, staler opinion to
        reconcile. What the master does persist, through an operation log, is the namespace and
        the file-to-chunk mapping, because nothing else knows those.
      </p>
      <p>
        The 64 MB chunk size is the other big bet. Large chunks mean fewer master lookups, fewer
        metadata entries, and long-lived TCP connections to one chunkserver for a whole sequential
        read. The cost shows up with small files. The paper describes an executable stored in
        GFS as a single-chunk file and then started on hundreds of machines at once; the few
        chunkservers holding it were overwhelmed. The fix was a higher replication factor for
        that file and staggered start times, which is a workaround, not a design.
      </p>
      <Callout>
        A single coordinator is safe at scale when it sits on the path of decisions and off the
        path of data. GFS lets the master see everything and carry almost nothing.
      </Callout>

      <h3>Following one append through the replicas</h3>
      <p>
        Our worker’s 1 MB record goes to the last chunk of <code>/crawl/day-17</code>. Section 3.1
        of the paper walks the steps, and they separate two flows that most designs mix together:
        the flow of data and the flow of control.
      </p>
      <p>
        First the client asks the master which replica holds the <strong>lease</strong> for the
        last chunk. A lease is a grant of authority over one chunk, with an initial timeout of 60
        seconds that the primary renews by piggybacking requests on its heartbeats. If no replica
        holds one, the master grants it to one of the three, which becomes the
        <strong> primary</strong>. The master replies with the primary and the two secondaries.
      </p>
      <p>
        Second, the client pushes the 1 MB of data, not to all three replicas from its own network
        link, but to the nearest one, which forwards it to the next nearest while it is still
        receiving. Each replica buffers the bytes without applying them. The paper computes the
        payoff: with 100 Mbps links, pushing 1 MB takes about 80 ms along a pipelined chain,
        because each link carries the data once. Sending three separate copies from the client’s
        link would take three times as long.
      </p>
      <p>
        Third, once every replica has acknowledged the data, the client sends the primary a short
        control message: append the buffered record. For a record append, the primary picks the
        offset itself, at the current end of the chunk, applies the bytes there, and tells both
        secondaries to apply them at the same offset. When all three reply, the primary tells the
        client the offset where its record landed. The forty other workers are doing the same
        thing, and the primary serialises all of them. One machine decides the order for one
        chunk for a few seconds at a time, and no global agreement is needed.
      </p>
      <Fig caption="A write. The data travels along a chain of replicas, each forwarding as it receives, so every link is used once. The command to apply it goes only to the primary, which chooses the order and tells the other two.">
        <WritePipeline />
      </Fig>
      <p>
        Change one variable. Suppose the last chunk has only 0.5 MB of space left. The primary
        sees that a 1 MB record will not fit, pads the rest of the chunk, tells the secondaries
        to pad as well, and replies to the client with an instruction to retry. The master
        allocates a new chunk and the record lands at its start. To keep the waste bounded, GFS
        limits a record append to a quarter of the chunk size, so at most 16 MB of any chunk can
        be padding, and in practice much less.
      </p>

      <Predict q={<>Now suppose the first attempt reached the primary and secondary A but secondary C’s disk write failed. The client retries and the second attempt succeeds everywhere. How many copies of the record does a reader of replica A find, and what does a reader of replica C find at the first offset?</>}>
        <p>
          Replica A holds the record twice: once at the first offset, from the attempt that
          failed on C, and again at the new offset the primary assigned on the retry. Replica C
          holds the record once, at the second offset, and at the first offset it holds whatever
          was there: partial bytes or padding.
        </p>
        <p>
          GFS reports the first attempt as a failure and does not roll it back on the replicas
          that succeeded. The only promise is that the record is written at least once, atomically,
          at the same offset on every replica, at the offset the client was told. Everything
          around that offset is the application’s problem.
        </p>
      </Predict>

      <h3>What the consistency model actually promises</h3>
      <p>
        Section 2.7 gives the vocabulary. A file region is <strong>consistent</strong> if every
        client sees the same bytes whichever replica it reads, and <strong>defined</strong> if it
        is consistent and also reflects one mutation in its entirety. The table below is the
        paper’s model restated with what an application has to do about each case.
      </p>
      <Tbl>
        <table>
          <thead><tr><th>What happened</th><th>State of the region</th><th>What the reader must do</th></tr></thead>
          <tbody>
            <tr><td>a single write or append succeeded</td><td>defined</td><td>nothing</td></tr>
            <tr><td>concurrent writes to overlapping ranges all succeeded</td><td>consistent but undefined: every replica agrees, but the bytes may be fragments of several writes</td><td>avoid overlapping writes, or treat the region as untrustworthy</td></tr>
            <tr><td>a record append succeeded after retries</td><td>defined at the returned offset, possibly inconsistent around it</td><td>skip padding and partial records, drop duplicates</td></tr>
            <tr><td>a mutation failed</td><td>inconsistent: replicas disagree</td><td>do not use; the writer will retry elsewhere</td></tr>
          </tbody>
        </table>
      </Tbl>
      <p>
        Google’s applications coped by writing what the paper calls “self-validating,
        self-identifying records”: each record carries a checksum, so a reader can skip padding
        and fragments, and a unique id, so a reader can drop the duplicate copy our worker’s
        retry produced. This logic lived in a shared library, so individual teams did not
        reinvent it.
      </p>
      <p>
        Why accept such a weak promise? Exactly-once appends would need a commit protocol across
        the replicas on every append. The primary would have to hold the record until all three
        agreed, and roll back the replicas that applied it when one failed. That costs a round
        trip per append, and it means a single slow secondary blocks forty writers. GFS made
        retries cheap and pushed duplicate removal to the reader, who was usually a MapReduce job
        reading the whole file sequentially anyway. For that workload it was a good trade. For a
        bank ledger it would not be.
      </p>

      <h3>Failure is a background job</h3>
      <p>
        The second half of the design is a set of mechanisms that keep running while machines
        fail around them. The master exchanges heartbeats with every chunkserver. When one goes
        silent, every chunk it held drops below three copies, and the master queues those chunks
        for re-replication. The queue has a priority order: a chunk with one live copy goes ahead
        of a chunk with two, chunks of live files go ahead of chunks of recently deleted ones, and
        any chunk that is blocking a client’s progress jumps the queue. The master also throttles
        cloning so that repair traffic does not swamp the clients.
      </p>
      <GfsSim />
      <p>
        A chunkserver that was down during a mutation comes back holding an old copy. GFS catches
        this with a <strong>chunk version number</strong>: the master increments it every time it
        grants a new lease, and the up-to-date replicas record the new number. When the returning
        server reports an older version, the master treats that replica as stale, leaves it out of
        replies to clients, and garbage-collects it later.
      </p>
      <p>
        Disks that lie are handled by the chunkservers themselves. Each chunk is divided into
        64 KB blocks, each with a 32-bit checksum kept in memory and logged. A chunkserver verifies
        the checksum of every block it returns. On a mismatch it returns an error to the reader,
        tells the master, and the master clones a good replica over the bad one. Corruption is
        caught at the server that holds it and does not spread to other replicas through a copy.
      </p>
      <p>
        Deletion is lazy. A deleted file is renamed to a hidden name with a timestamp, and the
        master removes it during a regular namespace scan once it is older than three days by
        default. Chunks that no file references are dropped when chunkservers report them in
        heartbeats. This is slower than deleting eagerly, but it gives users an undelete window
        and it makes partial failures harmless: a chunkserver that missed a delete message will
        simply be told in a later heartbeat.
      </p>
      <p>
        The master itself is protected by its operation log, which is replicated on several
        machines, and by periodic checkpoints of its state. If the master process dies, a new one
        starts, loads the latest checkpoint, replays the log, and polls the chunkservers for
        locations. Read-only <strong>shadow masters</strong> trail the log and can serve lookups
        while the primary is down. The paper’s measurements show the repair side working: after
        killing a chunkserver holding roughly 600 GB, the cluster restored full replication in a
        little over twenty minutes, and when two servers were killed, the chunks left with a
        single copy were raised to two within a couple of minutes.
      </p>

      <h3>What the single master cost, and what replaced it</h3>
      <p>
        The design aged in exactly the places its assumptions did. In a 2009 ACM Queue interview,
        Sean Quinlan, who led GFS for years, described the pressures. The number of files grew
        far past what the workload section had predicted, and the master’s memory and the time it
        took to recover from a crash grew with it. Teams worked around the limit by running many
        GFS cells and splitting their data between them. New applications such as Gmail were
        latency-sensitive and full of small files, which suited neither the 64 MB chunk nor the
        at-least-once append.
      </p>
      <p>
        Google’s successor, Colossus, kept the separation of metadata from data but spread the
        metadata across many servers backed by a database (Google has said publicly that Colossus
        stores its file system metadata in Bigtable), and replaced three full copies with
        Reed-Solomon erasure coding, which survives similar failures with much less extra storage.
        Outside Google, HDFS copied GFS almost line for line: the NameNode is the master, DataNodes
        are chunkservers, and blocks are chunks. HDFS spent the following decade adding standby
        NameNodes and federation to address the same single-master limits.
      </p>
      <p>
        If you are choosing a storage design today, the GFS shape fits when files are large, writes
        are appends, readers scan, and you control the applications. It fits badly when you need
        POSIX semantics, many small files, low-latency random reads, or overwrites in place. Those
        are the conditions that would make you revisit it, and they are the conditions Colossus and
        modern object stores were built for.
      </p>

      <h3>How to read the original</h3>
      <p>
        Read section 2 slowly, especially 2.1 (assumptions) and 2.7 (the consistency model). Then
        read section 3 with figure 2 open next to it; trace the numbered steps for a write and then
        for a record append. In section 4, skim namespace locking and read replica placement,
        re-replication and garbage collection closely. Section 5 on fault tolerance is short and
        worth reading in full.
      </p>
      <p>
        In section 6, the micro-benchmarks show where reads and writes fall short of the network
        limit, and the authors explain why. The real-cluster numbers are more interesting for what
        they show about the master: its operation rate is modest, which supports the claim that a
        single master is not the bottleneck at their scale. Section 7, on experiences, describes
        bugs in Linux disk drivers and the cost of <code>fsync</code> on large logs. It is a good
        reminder that a distributed system inherits the faults of every layer under it.
      </p>
      <p>
        The next paper, Dapper, starts where GFS’s users ended up: with a request that crosses many
        services and machines, and no way to see where the time went.
      </p>
      <Notes items={[
        'GFS was designed from a written list of workload assumptions, and each mechanism traces back to one of them.',
        'The master holds all metadata in memory and never carries file data; clients get locations from it and read bytes directly from chunkservers.',
        'Data is pipelined along a chain of replicas, while the order of mutations is decided by the primary that holds a short lease.',
        'Record append is at-least-once: retries leave duplicates and padding, and readers filter them with checksums and record ids.',
        'Re-replication, version numbers, checksums and lazy deletion make failure a routine background task rather than an emergency.',
        'The single master eventually limited file count and recovery time, which is why Colossus distributed the metadata.',
      ]} />
    </>
  ),

  /* ────────────────────────────────────────────────────────────────── */
  dapper: (
    <>
      <p>
        A user types a query and the results take 900 ms instead of the usual 200. Behind the
        search page sit dozens of services: query rewriting, spelling, several index shards,
        ranking, ads, images, news, each run by a different team, each with its own dashboard.
        Every dashboard looks normal. Each team can truthfully say its median latency has not
        moved. The slow request is real, and nobody can see it.
      </p>
      <p>
        Logs did not help much. A machine’s log says what that machine did, not which user request
        it was doing it for or what that request was waiting on elsewhere. Matching log lines by
        timestamp across hundreds of machines is guesswork. The Dapper paper describes the
        tracing system Google built to follow a single request across every process it touches,
        and the two constraints that shaped it: it had to cover nearly every service without each
        team doing work, and it had to be cheap enough to leave on in production all the time,
        because the slow requests you need to see happen when nobody is watching.
      </p>
      <p>
        After this page you should be able to read a trace and find its critical path, explain how
        a trace id gets from one process to the next, work out how many traces a given sampling
        rate produces, and recognise Dapper’s design inside OpenTelemetry. We will use one search
        request that took 126 ms.
      </p>

      <h3>What a single machine’s log cannot tell you</h3>
      <p>
        Before Dapper there were two families of tracing systems. Black-box systems, such as
        Project 5 from HP Labs, recorded messages between components and inferred the causal path
        statistically, which needs no changes to applications but gives approximate answers and
        needs a lot of data. Annotation-based systems, such as Pinpoint and X-Trace, had
        applications tag every message with a request id, which gives exact answers but needs
        every application changed.
      </p>
      <p>
        Dapper is annotation-based, with one decision that made it practical at Google: the
        annotation lives in the shared libraries that every service already used, not in each
        service. Google’s binaries were built on a small set of common libraries, so instrumenting
        those few places covered nearly everything. That decision is the reason Dapper could be
        ubiquitous, and it is also the source of its main blind spot, which we will come to.
      </p>

      <h3>A trace is a tree, and the ids do the stitching</h3>
      <p>
        Dapper models a request as a <strong>trace</strong>: a tree of <strong>spans</strong>. A
        span is one unit of work, usually one RPC as seen by one server. It records a name, a
        start and end time, its own span id, the id of its parent span, and the trace id it
        belongs to. A process may also attach <strong>annotations</strong> to its span: timestamped
        text notes or key-value pairs.
      </p>
      <Fig caption="One trace. Each span stores its own id and its parent’s id, and all of them carry the same trace id, so the tree can be rebuilt from records written separately on many machines.">
        <SpanTree />
      </Fig>
      <p>
        Here is how our 126 ms request gets its tree. When the front end receives the HTTP request,
        it creates a root span and a new trace id, and stores both in thread-local storage. When
        it calls <code>search.Query</code>, the RPC library copies the trace id and the current
        span id into the outgoing request. The search server reads them, creates a child span whose
        parent is the front end’s span, and puts that in its own thread-local storage. When search
        hands work to a callback that runs on another thread, Google’s control-flow library carries
        the context with the callback. Repeat this at every hop and every span knows its parent,
        even though no machine ever saw the whole tree.
      </p>
      <p>
        For an RPC, a span holds timestamps from both sides: when the client sent the request,
        when the server received it, when the server replied, and when the client got the reply.
        Those come from different machines with different clocks, and the paper notes the skew.
        The client’s send and receive times bound the server’s times, which is usually enough to
        tell network delay from server work.
      </p>
      <p>
        Now change one variable. Suppose the ranking team uses its own thread pool rather than the
        shared control-flow library. Work handed to that pool loses its trace context. The database
        call ranking makes from inside the pool goes out with no trace id, so it either starts a
        new, orphaned trace or is not traced at all. The tree for our request now ends at
        <code> ranking.Score</code>, and the database call that made it slow is invisible. The paper
        names this limitation: applications using non-standard control flow or communication
        libraries need manual instrumentation. Coverage by shared libraries is very wide, but it
        is never complete, and the gaps are exactly where nonstandard code lives.
      </p>

      <h3>Reading where 126 milliseconds went</h3>
      <p>
        A trace is most useful drawn as a waterfall: each span a bar on a shared time axis. In our
        request the front end spends 4 to 18 ms on <code>auth.Check</code>, then calls{' '}
        <code>search.Query</code> and <code>ads.Select</code> in parallel. Ads finishes at 58 ms.
        Search fans out to an index lookup and then ranking, and ranking waits on a database read
        of user preferences that took 34 ms when its median is 6 ms.
      </p>
      <Predict q={<>In this request, if <code>ads.Select</code> became 30 ms faster, how much sooner would the user get the page? And if the database read dropped from 34 ms to its usual 6 ms?</>}>
        <p>
          Making ads faster saves nothing. Ads runs in parallel with search and finishes at 58 ms,
          while the front end waits until search returns at 116 ms. Ads is not on the critical
          path.
        </p>
        <p>
          The database read is on the critical path: front end, then search, then ranking, then
          the database. Cutting it by 28 ms brings ranking and search back by about 28 ms, so the
          request finishes near 98 ms, as long as nothing else was overlapping in a way that now
          becomes the limit. Finding the critical path is the first thing to do with any trace.
        </p>
      </Predict>
      <DapperTrace />
      <p>
        No dashboard in our opening scene would have shown this. The database’s median was
        normal. Only the trace connects one slow read to one slow page.
      </p>

      <h3>Deciding at the root which requests to keep</h3>
      <p>
        Tracing every request would cost too much. The paper measured the effect of sampling rate
        on a web search cluster: tracing every request added noticeably to average latency, tracing
        one in sixteen cost much less, and at one in 1,024 the difference was lost in measurement
        noise. Creating a span takes a couple of hundred nanoseconds; writing it to disk and
        shipping it costs more, and that is what sampling saves.
      </p>
      <p>
        The sampling decision is made once, at the root, and travels with the trace context. Every
        downstream server either records its span or does not, according to that one bit. This
        matters more than it seems. If each server sampled independently at 1 in 1,024, a trace
        through five services would be complete with probability one in 1,024 to the fifth power,
        which is effectively never. Deciding at the root gives whole trees or nothing.
      </p>
      <p>
        At 10,000 requests per second and 1 in 1,024, the front end produces about ten traces a
        second, or 36,000 an hour. That is plenty to see every common path and most uncommon ones.
        Now change the traffic. A low-volume service that gets five requests a minute, at the same
        rate, produces one trace roughly every three and a half hours, which is useless. Dapper
        therefore added adaptive sampling, which sets a target number of sampled traces per unit
        time rather than a fixed fraction, so quiet services sample more of their requests.
      </p>
      <p>
        There is a second stage. Even sampled traces produced more data than the team wanted to
        store, so the collectors hash each trace id to a number between zero and one and keep the
        trace only if that number falls under a collection threshold. Because the hash depends only
        on the trace id, every span of a trace makes the same decision, and the team can turn down
        storage volume without touching any running binary.
      </p>
      <p>
        What head sampling gives up is the rare event. If one request in a million hits a bug, a
        1 in 1,024 sampler records about one occurrence per thousand. Later systems answered this
        with tail-based sampling: record every span briefly, decide after the trace is complete,
        and keep the slow or failed ones. The cost is buffering everything and routing all spans of
        a trace to one place before deciding.
      </p>

      <h3>Why the trace data travels out of band</h3>
      <p>
        Spans are not sent with the request or the response. Each process writes its spans to
        local log files. A Dapper daemon on every machine reads those files and sends the spans to
        collectors, which write them into Bigtable with one row per trace and one column per span.
        Bigtable’s sparse rows suit traces well, since each trace has a different number of spans.
      </p>
      <Fig caption="Collection happens after the request. Spans go to local log files, a daemon on each machine ships them, and Bigtable stores one row per trace. The request does not wait for any of it.">
        <CollectionPipeline />
      </Fig>
      <p>
        The authors give two reasons for keeping trace data off the request path. Adding spans to
        RPC responses would change the size and timing of the very traffic being measured. And
        many RPCs are not neatly nested: a server may reply to its caller before its own children
        finish, so their spans would have no response to ride on. The cost is delay. The paper
        reports a median of under fifteen seconds from writing a span to finding it in the
        repository, but the slow end was much worse, sometimes hours. That made Dapper good for
        understanding behaviour and weaker for firefighting during an incident.
      </p>
      <p>
        By default, Dapper recorded RPC method names and timings, not payloads. Application data
        only appeared in annotations a developer added on purpose. This kept the tracing system
        from becoming a copy of every user’s data, and it had a side benefit: the traces showed
        which services talked to which, which helped check that services were following
        security policies about who may call what.
      </p>

      <h3>How engineers actually used a trace</h3>
      <p>
        Storing traces is only half of the system. Dapper exposed its repository through an API
        that could fetch a trace by id, scan traces in bulk with MapReduce, or look them up through
        an index by service, host and time. Most engineers used a web interface built on top. The
        workflow the paper describes starts from a question, not a trace id: pick a service, a time
        window and a metric such as latency, and the interface shows the distribution of that
        metric across sampled traces. You then select an outlier from the slow end and open its
        waterfall.
      </p>
      <p>
        That order is worth copying. A single trace is an anecdote. The distribution tells you
        whether the request you are looking at is typical or one of the 1 per cent, and the
        waterfall then tells you which span made it so. Today’s tools that plot latency heat maps
        and let you click through to an example trace follow the same path.
      </p>
      <p>
        Now walk through a case the trace model handles badly. A storage server buffers writes and
        flushes them to disk in batches of twenty. Our search request happens to be the one whose
        write fills the buffer, so the flush runs inside its span. The trace shows a 40 ms disk
        write that the request did not really cause, and the nineteen other requests whose data was
        in the batch show nothing. The paper calls this a coalescing effect. An engineer reading
        the trace would blame the wrong thing, or at least the wrong request.
      </p>
      <p>
        The fix later systems adopted is to let a span refer to more than one parent. In
        OpenTelemetry, a batch span can carry links to the spans of every request whose work it
        contains. The cost is that the data is no longer a simple tree: queries and displays have
        to handle a graph, and most tools still show links as a secondary detail. Queues and
        asynchronous messaging have the same problem, since the consumer’s work belongs to a
        request whose span may have finished long before.
      </p>

      <h3>What the choices bought and cost</h3>
      <Tbl>
        <table>
          <thead><tr><th>Choice</th><th>What it bought</th><th>What it cost</th><th>What later systems did</th></tr></thead>
          <tbody>
            <tr><td>instrument shared libraries</td><td>coverage without each team’s effort</td><td>blind spots wherever code bypasses them</td><td>OpenTelemetry offers auto-instrumentation plus an explicit API for the gaps</td></tr>
            <tr><td>sample at the root, about 1 in 1,024</td><td>overhead lost in the noise</td><td>rare requests usually missed</td><td>tail-based sampling in collectors</td></tr>
            <tr><td>collect out of band via local logs</td><td>serving path untouched</td><td>seconds to hours of delay</td><td>streaming exporters and collectors</td></tr>
            <tr><td>record names and timings, not payloads</td><td>privacy and small spans</td><td>less context per span</td><td>attributes added deliberately by developers</td></tr>
          </tbody>
        </table>
      </Tbl>
      <p>
        The experiences section of the paper is a set of short case studies. Google’s Ads Review team used traces
        during a large rewrite of their serving system to find latency problems early. Traces were joined
        to exception reports, so an engineer looking at an error could see the request around it.
        Traces were aggregated to infer which services depended on which, something no document
        had kept current. Network and storage use were attributed back to the services that caused
        them. The paper also lists what Dapper could not do well: work that is batched together
        gets attributed to whichever trace happened to trigger the batch, offline batch jobs do not
        fit the request model, and a trace shows that a span was slow without saying why, for
        example whether it sat in a queue.
      </p>

      <h3>From Dapper to OpenTelemetry</h3>
      <p>
        Twitter’s Zipkin (2012) reimplemented Dapper in the open, and Uber’s Jaeger followed. Two
        standardisation efforts, OpenTracing and OpenCensus, merged in 2019 into OpenTelemetry,
        which now defines the API and wire format most tracing tools use. The W3C Trace Context
        standard carries Dapper’s context in an HTTP header:
      </p>
      <pre><code>{`traceparent: 00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01
             │  └ trace id (128 bits)             └ parent span id └ flags: 01 = sampled`}</code></pre>
      <p>
        Every part of that header is in the paper: the trace id, the id of the calling span, and
        the sampling decision made at the root. The ids grew from 64 bits to 128 to make
        collisions across organisations negligible.
      </p>
      <p>
        Tracing is not always worth its setup. A single service with a request id in every log line
        can be debugged without it. The case for tracing grows with the number of services a
        request crosses and the number of teams that own them, which is exactly the situation
        Dapper was built for.
      </p>

      <h3>How to read the original</h3>
      <p>
        It is a technical report, not a conference paper, so it reads more like a design document
        with experience attached. Read section 2 for the trace model, where instrumentation
        lives, and how spans are collected; look closely at the figures of a span and its
        annotations. Section 4 covers overhead and sampling, including the table relating sampling
        rate to latency and throughput in web search (check what was measured and on what
        workload), adaptive sampling, and the second sampling stage at collection, which is easy
        to miss.
      </p>
      <p>
        Sections 5 and 6, on the tools built on Dapper and the experiences of teams using it, are
        the most useful part, and the section on lessons and limitations that follows is worth
        reading twice. The related-work section explains why Dapper chose annotations over
        black-box inference. There is no controlled evaluation in the usual sense, so treat the
        numbers as one company’s production measurements.
      </p>
      <p>
        Dapper shows you which span was slow. The next paper, The Tail at Scale, explains why some
        span is almost always slow when a request touches enough servers, and what to do about it.
      </p>
      <Notes items={[
        'A trace is a tree of spans; each span records its parent’s id, and the trace id ties them together across machines.',
        'Dapper made tracing universal by putting context propagation in shared RPC, threading and callback libraries.',
        'Any code path that bypasses those libraries breaks the tree, so coverage is wide but not complete.',
        'The sampling decision is made once at the root and propagated, so stored traces are whole.',
        'Out-of-band collection keeps the request path clean at the cost of delay before traces are queryable.',
        'The W3C traceparent header and OpenTelemetry spans are Dapper’s design with larger ids.',
      ]} />
    </>
  ),

  /* ────────────────────────────────────────────────────────────────── */
  'tail-at-scale': (
    <>
      <p>
        A team runs the leaf servers for a search index. Each leaf answers in a few milliseconds
        most of the time and in about a second one time in a hundred. The leaves are healthy:
        nothing is crashing, no machine is overloaded, and the slow one is a different machine
        each time. Yet the search page is slow for most users. Adding servers does not help, and
        there is no bug to fix.
      </p>
      <p>
        Jeff Dean and Luiz André Barroso’s 2013 article explains why this happens and what Google
        did about it. Its main point is that in a large system, variability in response time is a
        property of the whole system, like failure, and has to be engineered around in the same
        way. After this page you should be able to compute how a single server’s tail becomes a
        request’s tail, explain what hedged and tied requests do to that number and what they
        cost, and choose among the other techniques the article describes.
      </p>
      <p>
        We will use one setup throughout: a root server that fans each user request out to 100
        leaf servers and waits for all of them. Each leaf is slow, meaning about one second, with
        probability 1 per cent.
      </p>

      <h3>The arithmetic of waiting for everyone</h3>
      <Predict q={<>Each of 100 leaves is slow 1 per cent of the time, independently. The root waits for all of them. What fraction of user requests are slow?</>}>
        <p>
          A request is fast only if every leaf is fast. The chance of that is 0.99 multiplied by
          itself 100 times, which is about 0.366. So about 63 per cent of user requests wait for a
          slow leaf. A rare event at one server becomes the usual case for the request.
        </p>
      </Predict>
      <p>
        The general rule is that if each server is slow with probability <em>p</em> and a request
        needs <em>n</em> of them, the request is slow with probability 1 − (1 − <em>p</em>)
        <sup>n</sup>. The article’s own example is the one above: with a one-second 99th percentile
        at each server, 63 per cent of 100-way fan-out requests take more than a second.
      </p>
      <p>
        Now change the variables. Make each server much better: slow only one time in 10,000. Make
        the fan-out larger: 2,000 servers. The chance that a request is fast is 0.9999 to the
        2,000th power, which is about e<sup>−0.2</sup>, or 0.82. Almost one request in five is still
        slow. Improving each server by a factor of a hundred did not make the problem go away,
        because the fan-out grew too. That is the article’s point in one calculation.
      </p>
      <Fig caption="A 1 per cent chance of slowness at one server becomes a 63 per cent chance for a request that has to wait for a hundred servers.">
        <FanOutTail />
      </Fig>
      <TailLatency />
      <p>
        The article also gives a measurement from a real Google service in which a root server
        distributes a request through intermediate servers to many leaves. The 99th-percentile
        latency for one leaf request was 10 ms. The 99th-percentile latency for all leaf requests
        of a user request to finish was 140 ms. And the 99th-percentile latency for 95 per cent of
        them to finish was 70 ms. Waiting for the last 5 per cent of leaves doubled the tail. Keep
        that number; it comes back when we discuss returning partial results.
      </p>

      <h3>Where the slow one per cent comes from</h3>
      <p>
        The article lists the causes, and what matters is what they have in common. Machines are
        shared, so another process can take the CPU, the memory bandwidth or the network for a
        while. Background daemons wake up. Storage systems compact their files. Garbage collectors
        pause. Queues fill briefly at several levels, in the server, the operating system and the
        disk. Processors throttle themselves when they get hot or hit power limits, and come out of
        energy-saving states slowly.
      </p>
      <p>
        Almost none of these depend on the request. The same query sent to the same leaf a few
        milliseconds later would probably be fast. A common misreading is that the tail comes from
        a few bad servers that should be found and removed. Usually it comes from good servers
        having brief bad moments. That distinction is why redundancy works: if slowness is
        transient and independent of the request, a second copy of the request elsewhere will
        probably not hit a bad moment at the same time.
      </p>

      <h3>Reducing variability inside one server</h3>
      <p>
        The article first describes ways to make each component steadier, while admitting that
        they cannot remove the tail. Use service classes and prioritise interactive requests over
        background ones. Keep low-level queues short, because the operating system or disk cannot
        reorder by priority if requests are already queued beneath the server’s scheduler. Break
        long-running requests into smaller ones so that a cheap request does not wait behind an
        expensive one.
      </p>
      <p>
        One technique is counter-intuitive. Suppose each of our 100 leaves runs a one-second
        background compaction at a random time once a minute. Then at any moment about one leaf in
        sixty is busy, and a 100-way request almost always hits one. If all the leaves do their
        compaction in the same one-second window, the requests in that window are slow and every
        other request is fast. Synchronising the disruption across machines shrinks the share of
        affected requests from most of them to about one in sixty.
      </p>

      <h3>Hedged requests, worked through</h3>
      <p>
        The article compares latency to fault tolerance. Reliable systems are not built from
        components that never fail; they are built from redundant components and routing around
        the ones that do. A slow reply can be treated like a failure: have more than one replica
        that can answer, notice when one is taking too long, and ask another.
      </p>
      <p>
        The simplest form is the <strong>hedged request</strong>. Each leaf’s data is held by at
        least two replicas. The root sends the request to one. If no answer has come back by the
        95th-percentile latency for that kind of request, it sends the same request to a second
        replica, uses whichever reply comes first, and cancels the other.
      </p>
      <Fig caption="A hedged request. The first replica is slow; once the wait passes the 95th percentile, the client sends a copy to a second replica, takes its fast answer and cancels the first.">
        <HedgedRequest />
      </Fig>
      <p>
        Work it through for one leaf. Without hedging, the leaf is slow 1 per cent of the time.
        With hedging, it is slow only if the first replica is slow and the second replica is slow
        as well. If those are independent, that is 1 per cent of 1 per cent, or 0.01 per cent. For
        100 leaves, the chance that some leaf is slow falls from about 63 per cent to about 1 per
        cent. The extra load is small because only requests that have not answered by the 95th
        percentile send a second copy, at most 5 per cent more requests.
      </p>
      <p>
        There is a floor to this improvement. A hedged leaf cannot answer before the hedging delay
        plus the second replica’s response time, so hedging turns a one-second outlier into
        something nearer twice the 95th percentile. That is a large win, but not a fast request.
        The article reports a benchmark in which a client read 1,000 keys from a Bigtable spread
        over 100 servers. Sending a hedge after 10 ms reduced the 99.9th-percentile latency from
        1,800 ms to 74 ms while sending only about 2 per cent more requests.
      </p>
      <p>
        Hedging fails when its assumption fails. If a request is slow because it is expensive, such
        as a query that matches a huge posting list, the second replica is just as slow, and the
        system has now done the expensive work twice. If the whole cluster is overloaded, hedges
        add load where there is none to spare, and slowness spreads. That is why production hedging
        policies, such as the one in gRPC, put a cap on extra attempts and throttle hedging when
        the error or retry rate rises. Hedging is also only safe for requests that can be repeated
        without harm, such as reads.
      </p>

      <p>
        Put numbers on the floor. Say a leaf’s median is 5 ms and its 95th percentile 10 ms. A
        request that hits a slow moment on the first replica now waits 10 ms, sends the hedge, and
        gets the second replica’s answer about 5 ms later. The slow leaf costs about 15 ms instead
        of a second. That is what turns the tail from a cliff into a step.
      </p>
      <p>
        The independence assumption carries a lot of weight in the calculation above, so change
        it. Suppose both replicas of a leaf sit behind the same top-of-rack switch, or share a
        machine with the same noisy batch job, so that when the first is slow the second is slow
        20 per cent of the time rather than 1 per cent. A leaf is then slow with probability
        0.01 × 0.2, or 0.2 per cent, and a 100-way request is slow with probability about
        1 − 0.998<sup>100</sup>, roughly 18 per cent. Hedging still helps, but far less. Where
        replicas are placed decides how much a hedge is worth.
      </p>

      <h3>When hedging makes things worse</h3>
      <p>
        Here is the failure to plan for. A team sets its hedging delay to a fixed 10 ms, the 95th
        percentile measured last month. One afternoon a dependency slows down and every leaf’s
        latency rises, so that 10 ms is now the 70th percentile. Thirty per cent of requests now
        cross the threshold and send a hedge. The leaves receive 30 per cent more work, which makes
        them slower still, so more requests cross the threshold. The mechanism meant to protect
        the tail is now adding to the overload.
      </p>
      <p>
        Two fixes are standard, and both have a cost. Compute the hedging delay from recent
        latency, so it stays near the true 95th percentile; this keeps the extra load near 5 per
        cent, but under a broad slowdown the hedges arrive later and help less. And put a budget on
        hedges, for example allowing extra requests up to a fixed share of normal traffic and
        dropping hedges beyond it; this caps the damage, but in a bad hour the budget runs out and
        the tail returns. gRPC’s design does both: a hedging policy with a delay and a maximum
        number of attempts, and a throttle that stops retries and hedges when too many requests
        are failing. Redundancy is only cheap when there is spare capacity to spend on it.
      </p>

      <h3>Tied requests: the problem is the queue</h3>
      <p>
        Much of a server’s latency is time spent waiting in a queue before work starts. Once a
        request has started, it usually finishes quickly. A <strong>tied request</strong> exploits
        this. The client sends the request to two servers, each tagged with the other server’s
        identity. Both enqueue it. Whichever server starts it first sends a cancellation to the
        other, which removes its copy from the queue. The client waits a little, about twice the
        network message delay, before sending the second copy, so that the two servers are
        unlikely to start at exactly the same moment and both do the work.
      </p>
      <p>
        The article reports experiments in which tied requests to Bigtable cut the high percentiles
        substantially, both on an idle cluster and on one running a heavy background sort, with
        only a small increase in disk work. An alternative is to ask servers how long their queues
        are and send the request to the shortest. The authors explain why this is worse: queue
        lengths change between the probe and the request, request costs are hard to predict, and
        many clients probing at once all pick the same lightly loaded server.
      </p>
      <Tbl>
        <table>
          <thead><tr><th>Technique</th><th>What it improves</th><th>What it costs</th><th>When it stops working</th></tr></thead>
          <tbody>
            <tr><td>hedged request</td><td>a slow leaf now needs two unlucky replicas</td><td>up to ~5 per cent more requests</td><td>the request itself is expensive, or the cluster is overloaded</td></tr>
            <tr><td>tied request</td><td>time spent in a long queue</td><td>a cancellation message, rare duplicate work</td><td>queues are short and service time dominates</td></tr>
            <tr><td>micro-partitions</td><td>load can move in small pieces</td><td>more partitions to track</td><td>a single key is hot</td></tr>
            <tr><td>selective replication</td><td>hot data has more replicas to share load</td><td>storage and update cost for extra copies</td><td>hotness changes faster than replication</td></tr>
            <tr><td>latency-induced probation</td><td>chronically slow machines are bypassed</td><td>temporarily less capacity</td><td>slowness is spread evenly</td></tr>
            <tr><td>good-enough results</td><td>never waiting for the last few leaves</td><td>a slightly incomplete answer</td><td>every leaf’s result is required</td></tr>
          </tbody>
        </table>
      </Tbl>

      <h3>Adapting across many requests</h3>
      <p>
        Hedged and tied requests act within one request. The article then describes techniques
        that act over seconds to minutes. With <strong>micro-partitions</strong>, data is split
        into many more pieces than there are machines, about twenty per machine, so load balancing
        and recovery move small pieces quickly. <strong>Selective replication</strong> adds copies
        of partitions that are hot, for example a part of the index that is getting many queries
        during a news event. <strong>Latency-induced probation</strong> stops sending regular
        traffic to a server that has been slow, while still sending it shadow requests to see when
        it recovers.
      </p>
      <p>
        Two techniques are specific to large retrieval systems. <strong>Good-enough</strong>{' '}
        results return the answer once enough leaves have replied, accepting a slightly less
        complete result in exchange for not waiting for the last few. In the measurement quoted
        earlier, that is the difference between 70 ms and 140 ms. It is acceptable only when the
        missing leaves hold results that would rarely change what the user sees.{' '}
        <strong>Canary requests</strong> handle a different kind of tail: a query that triggers a
        bug and crashes every server it reaches. The root sends it to one or two leaves first and
        sends it to all of them only if those reply. The cost is a small amount of added latency.
      </p>
      <p>
        Writes are easier than one might expect. The article notes that updates are often less
        latency-sensitive, and that quorum protocols such as Paxos tolerate tails naturally: a
        write that needs three of five replicas to acknowledge does not wait for the slowest two.
      </p>

      <h3>When not to bother</h3>
      <p>
        With no fan-out the arithmetic is gentle. A single-server request with a 1 per cent tail
        has a 1 per cent tail, and hedging spends up to 5 per cent extra load to fix it, which may
        or may not be worth it. Hedging is a poor fit when slowness is correlated with the request,
        when requests have side effects, or when the system has no spare capacity. Before adding
        hedges, look at a trace of a slow request. If it shows the same expensive operation every
        time, the fix is in that operation, not in redundancy.
      </p>

      <h3>How to read the original</h3>
      <p>
        The article is short, around eight pages in Communications of the ACM, and written for a
        broad audience, so read it all. Spend most of your time on the section about why
        variability exists, the table with the 10 ms, 70 ms and 140 ms measurements, and the
        sections on hedged and tied requests with their Bigtable numbers. Read the parts on
        cross-request adaptation and large information retrieval systems for the catalogue of
        techniques.
      </p>
      <p>
        There is no evaluation section in the conference sense. The numbers are illustrations from
        Google systems, each with a specific workload, so when you quote one, check what the
        baseline was and what percentile it refers to. The closing section on hardware trends
        argues that the problem will get worse as systems grow, which matches what happened.
      </p>
      <p>
        The next paper, Borg, is about the cause behind several of these tail sources: many
        workloads deliberately sharing the same machines, and the scheduler that decides who gets
        what.
      </p>
      <Notes items={[
        'If each of n servers is slow with probability p, a request that waits for all of them is slow with probability 1 − (1 − p)^n.',
        'With 100 leaves at a 1 per cent tail, about 63 per cent of requests wait for a slow leaf.',
        'Most tail latency comes from brief, request-independent events on healthy machines, which is why a second copy usually helps.',
        'A hedged request sent after the 95th percentile costs at most about 5 per cent extra load and requires two replicas to be slow at once.',
        'Tied requests target queueing delay by letting whichever server starts first cancel the other copy.',
        'Hedging hurts when slowness comes from the request itself or the cluster is overloaded, so it needs caps and idempotent requests.',
      ]} />
    </>
  ),

  /* ────────────────────────────────────────────────────────────────── */
  borg: (
    <>
      <p>
        Every service at Google, from web search to Gmail, and every batch job, from MapReduce to
        index builds, needs machines. The simple answer is to give each team its own. That wastes
        a great deal: a serving team must own enough machines for its daily peak, which leaves
        most of them idle at night, while a batch team wants a burst of a thousand machines for
        three hours and nothing afterwards. Sharing one pool of machines between them recovers the
        waste, but raises hard questions. Who gets a machine when the pool is full? What happens
        to a batch task when a serving task needs its machine? How does a client find a server
        that could be anywhere? And how does the whole thing keep running when machines, racks and
        the control system itself fail?
      </p>
      <p>
        Google had answered these questions in Borg by the mid-2000s and ran almost everything on
        it for a decade before publishing this paper in 2015, a year after releasing Kubernetes.
        After this page you should be able to follow one job from submission to running tasks,
        explain why a production task can evict a batch task but not another production task,
        explain how Borg measured the savings from sharing, and map Borg’s concepts onto
        Kubernetes.
      </p>
      <p>
        We will follow one job. A team submits <code>web</code>, a production service of three
        tasks, each asking for 2 CPU cores and 4 GiB of memory, to a cell whose machines are
        already busy with a large batch indexing job.
      </p>

      <h3>The contract a user signs</h3>
      <p>
        Borg manages a <strong>cell</strong>, a set of machines in one cluster, with about 10,000
        machines in a median cell. A user submits a <strong>job</strong>: a name, a binary, a
        number of identical <strong>tasks</strong>, a resource request per task, constraints such
        as a processor type, and a <strong>priority</strong>. Jobs are written in a configuration
        language called BCL. As a sketch (this is not real BCL syntax), our job says:
      </p>
      <pre><code>{`job web {
  cell     = "cc"
  binary   = "/team/web/server"
  priority = production
  replicas = 3
  per task = { cpu: 2.0 cores, ram: 4 GiB }
}`}</code></pre>
      <p>
        Priorities fall into bands. From highest to lowest the paper names monitoring, production,
        batch and best effort. A higher-priority task can take a machine from a lower one by
        evicting it. There is one important exception: tasks in the production band are not
        allowed to evict each other. Without that rule a production task could evict another, which
        would then evict a third, and so on through the cell. The paper calls this a preemption
        cascade, and forbidding it within the band keeps production stable.
      </p>
      <Fig caption="Priority bands. Production work is admitted against quota and is not evicted by other production work. Batch runs in what production leaves free and expects to be evicted. Best effort is free and promised nothing.">
        <PriorityBands />
      </Fig>
      <p>
        Priority decides who wins when machines are full. <strong>Quota</strong> decides who is
        allowed to submit at all. A team buys quota as a vector of resources (CPU, memory, disk and
        so on) at a given priority for a period such as a month. Borg checks quota when a job is
        submitted and rejects jobs that exceed it, so admission control happens before scheduling.
        Quota at the highest priorities is sold carefully, which is what makes it safe to schedule
        production as if batch did not exist. Every user effectively has unlimited quota at priority
        zero, but jobs there get only what is left over.
      </p>

      <h3>Placing one task</h3>
      <Fig caption="A cell. The Borgmaster, replicated five ways with Paxos, holds the state of every job and machine. The scheduler places tasks. A Borglet on each machine starts them and reports back. Batch tasks fill the space production leaves free.">
        <BorgCell />
      </Fig>
      <p>
        When <code>web</code> is accepted, its three tasks go into the pending queue. The scheduler
        works through the queue from high priority to low, and for each task it does two things.
        <strong> Feasibility checking</strong> finds machines that meet the task’s constraints and
        have enough resources, counting resources that could be freed by evicting lower-priority
        tasks. <strong>Scoring</strong> then ranks the feasible machines.
      </p>
      <p>
        Take <code>web</code>’s first task. Machine M1 has 16 cores, 15 of them used by indexing
        tasks; it is feasible, because evicting batch tasks would free room. Machine M2 has 4 free
        cores and already has the <code>web</code> binary in its local package cache; it is
        feasible without evicting anything. Scoring prefers M2. Among the criteria the paper lists
        are minimising the number and priority of tasks that must be evicted, preferring machines
        that already have the task’s packages, spreading a job’s tasks across power and failure
        domains, and mixing high- and low-priority tasks on each machine so that a load spike can
        be absorbed by evicting batch work.
      </p>
      <p>
        Package locality matters more than it might seem. The paper reports a median task startup
        of about 25 seconds, of which about 80 per cent was package installation. Placing a task
        where its binary is already cached removes most of that delay.
      </p>
      <p>
        Change one variable. Suppose every machine is full and has no spare cores at all. For a
        production task, the scheduler picks a machine and evicts batch tasks to make room, and
        the evicted tasks go back to the pending queue to be placed again when space frees up. For
        a batch task in the same situation, nothing happens: it waits in the queue. That asymmetry
        is the scheduling policy.
      </p>
      <p>
        The paper also explains how scoring balances two goals that conflict. Worst fit spreads
        load and leaves headroom on every machine, but fragments free space so that large tasks
        cannot fit anywhere. Best fit packs tightly, but leaves no slack for spikes and hurts
        bursty workloads. Borg uses a hybrid that tries to reduce stranded resources, meaning
        resources left unusable on a machine because some other resource there is used up. To
        make scoring fast across 10,000 machines, the scheduler caches scores, groups tasks with
        identical requirements so each group is scored once, and examines machines in random order
        until it has found enough good candidates rather than scoring every machine.
      </p>

      <h3>Why one shared pool beats two</h3>
      <p>
        The economic argument for Borg rests on one measurement, and the paper is careful about
        how it was made. To compare policies, the authors used <strong>cell compaction</strong>:
        take a real workload from a production cell, then remove machines until the workload no
        longer fits, using Borg’s own scheduler running offline. The smallest cell that still fits
        measures how efficient a policy is. They repeated the process many times with different
        random seeds to get a distribution.
      </p>
      <Predict q={<>If production and batch work ran in separate cells instead of one shared cell, would the total machine count go up or down, and roughly by how much?</>}>
        <p>
          Up. Production tasks request resources for their peaks and use less most of the time;
          batch work can use what they leave idle. Separate the two and that idle capacity is
          stranded in the production cell while the batch cell needs its own machines.
        </p>
        <p>
          The paper found that segregating production from non-production work would need 20 to
          30 per cent more machines in the median cell. It also found that rounding resource
          requests up to fixed sizes, rather than letting users ask for fractions of a core and
          exact amounts of memory, would need 30 to 50 per cent more resources in the median
          case.
        </p>
      </Predict>
      <BorgScheduler />
      <p>
        In this small model, production tasks are placed first and evict batch tasks when needed.
        The evicted tasks wait and return when space frees up. The final readout compares the
        shared pool with two separate pools; the direction matches the paper even though the
        model is tiny.
      </p>

      <h3>Lending out what tasks asked for but did not use</h3>
      <p>
        Users ask for more than they use, because running out of memory kills a task and nobody
        wants that page. Borg recovers the difference through <strong>resource reclamation</strong>.
        A task’s request is its <strong>limit</strong>. Borg also keeps a{' '}
        <strong>reservation</strong>, its estimate of what the task will actually use. The
        reservation starts equal to the limit, and after an initial period, to allow for startup,
        it decays slowly toward the measured usage plus a safety margin. Production tasks are
        scheduled against limits. Batch tasks are scheduled against reservations, so they can use
        the gap between what production asked for and what it uses.
      </p>
      <p>
        Follow one <code>web</code> task. It asked for 4 GiB and settles at about 1.5 GiB. Its
        reservation decays to around 2 GiB, and roughly 2 GiB on that machine becomes available
        for batch. Now <code>web</code> receives a traffic spike and its memory use climbs to
        3.5 GiB. What happens next depends on the type of resource. Memory is
        <strong> non-compressible</strong>: it cannot be taken back gradually, so the Borglet
        evicts lower-priority tasks on that machine, starting with batch, until <code>web</code>
        fits. CPU is <strong>compressible</strong>: the Borglet throttles batch tasks’ CPU and
        latency-sensitive tasks keep running. The batch work pays for the spike, which is what
        it agreed to.
      </p>
      <p>
        The paper reports that about 20 per cent of the workload in a median cell ran on reclaimed
        resources. It also describes an experiment comparing more and less aggressive estimates:
        more aggressive reclamation freed more capacity but caused more out-of-memory events. That
        is the trade, and the paper chose a middle setting.
      </p>

      <h3>Keeping the control plane small and alive</h3>
      <p>
        The <strong>Borgmaster</strong> runs as five replicas that use Paxos to agree on the
        cell’s state, with one elected leader handling changes. State is saved as periodic
        checkpoints plus a change log. A <strong>Borglet</strong> on every machine starts and
        stops tasks, restarts them when they fail, and reports state when the master polls it.
        Polling is spread across replicas, each owning a shard of the machines, so that the
        leader receives only changes. If a machine does not respond to several polls, it is
        marked down and its tasks are rescheduled elsewhere.
      </p>
      <p>
        The important design property is that running tasks do not depend on the master. If the
        whole Borgmaster is unavailable, Borglets keep their tasks running; nobody can submit or
        change jobs until it returns. The paper reports Borgmaster availability around 99.99 per
        cent. Checkpoints were also loaded into a simulator called Fauxmaster, which ran the real
        scheduler code offline to debug decisions and answer capacity questions such as whether a
        new job would fit.
      </p>
      <p>
        Two more services make the shared pool usable. The Borg name service records each task’s
        hostname and port in Chubby, so clients can find tasks wherever they run. And every task
        exposes a health endpoint and metrics, and Borg provides user interfaces that explain, for
        example, why a task is still pending. The paper treats this introspection as essential,
        since users of a shared system cannot log in to a machine they own to find out what is
        happening.
      </p>

      <p>
        Sharing a machine needs isolation between the tasks on it, and section 6 of the paper is
        candid about how far Borg went. Tasks run in Linux containers built from chroot and
        cgroups, which separate resources well enough for tasks that all belong to Google
        employees. Borg does not treat containers as a security boundary against hostile code. The
        externally facing products that ran customer code, App Engine and Compute Engine, ran
        their workloads inside virtual machines under KVM, launched as Borg tasks. Performance
        isolation was the harder daily problem: the paper describes CPU throttling, kernel changes
        to the scheduler, and classifying tasks as latency-sensitive or batch so that the Borglet
        can protect the first from the second on a busy machine.
      </p>

      <h3>A rack loses power</h3>
      <p>
        Walk through a failure with our job. The rack holding one of <code>web</code>’s three tasks
        loses power. The Borgmaster’s pollers get no reply from those Borglets; after several
        missed polls the machines are marked down and their tasks go back into the pending queue.
        Because the scheduler had spread <code>web</code>’s tasks across failure domains, this
        rack held only one of them. The other two keep serving while the third is rescheduled
        somewhere else, where it may in turn evict batch work.
      </p>
      <p>
        Now the rack comes back. Its Borglets restart and report their tasks, including the old
        copy of <code>web</code>, which is still running. Borg already has a replacement elsewhere,
        so the master tells the Borglet to kill the old copy. Without that step, a network
        partition would leave two copies of a task that is supposed to exist once.
      </p>
      <p>
        Planned disruption is handled with the same care. Kernel upgrades and machine maintenance
        take machines away on purpose, and Borg limits how quickly it disrupts a job’s tasks and
        how many of a job’s tasks can be down at once. Kubernetes exposes the same idea as a pod
        disruption budget.
      </p>
      <p>
        Batch users see the other side of these rules. A MapReduce worker evicted halfway through a
        task loses its progress, and the MapReduce master runs the task again somewhere else.
        Batch frameworks at Google were written to expect this, with re-execution and
        checkpointing built in. The cheapness of the batch band depends on the batch software being
        able to lose work and recover. A batch job that cannot restart safely does not belong in a
        band that promises eviction.
      </p>

      <h3>What Kubernetes kept and what it changed</h3>
      <p>
        Section 8 of the paper lists lessons, and several of them are explicitly about decisions
        Kubernetes reversed.
      </p>
      <Tbl>
        <table>
          <thead><tr><th>Borg</th><th>Problem the authors saw</th><th>Kubernetes</th></tr></thead>
          <tbody>
            <tr><td>jobs as the only way to group tasks</td><td>users encoded structure in job names and needed many workarounds</td><td>labels and selectors on any object</td></tr>
            <tr><td>one IP per machine; ports allocated as a resource</td><td>every task and client had to handle dynamic ports</td><td>one IP per pod</td></tr>
            <tr><td>allocs: reserved resources shared by helper tasks</td><td>useful, but bolted on</td><td>pods as the basic unit</td></tr>
            <tr><td>a monolithic Borgmaster, with a large job specification</td><td>hard to extend; tuned for expert users</td><td>an API server with separate controllers that reconcile desired state</td></tr>
            <tr><td>limits, reservations, priority, preemption</td><td>kept</td><td>requests, limits, priority classes, preemption</td></tr>
          </tbody>
        </table>
      </Tbl>
      <p>
        The companion article “Borg, Omega, and Kubernetes” in ACM Queue (2016), by several of the
        same people, discusses these choices at more length. Outside Google, Borg’s model of
        bin-packing with priorities is the model of Mesos, YARN, Nomad and Kubernetes. Spot and
        preemptible cloud instances sell the batch band to the public: cheap capacity that can be
        taken back.
      </p>
      <p>
        A Borg-style shared pool pays off when the workload mix is varied, especially when
        latency-sensitive services with daily peaks can share machines with batch work that is
        willing to be evicted. With a small cluster and one kind of workload, the savings come
        mostly from right-sizing requests, and the complexity of priorities and preemption may not
        be worth it.
      </p>

      <h3>How to read the original</h3>
      <p>
        Read section 2, the user’s view of jobs, priorities, quota and naming, closely; most of
        the paper relies on it. In section 3, read the scheduling subsection carefully and skim
        the Borglet. Section 3.4 on scalability is worth a skim for the tricks. Section 4, on
        availability, can be skimmed.
      </p>
      <p>
        Section 5, on utilisation, is the heart of the evaluation. Understand the cell compaction
        method before looking at the figures, then read each figure as a distribution across cells
        rather than a single number, and note that the results come from Google’s workloads.
        Section 6 covers isolation, including the split between compressible and non-compressible
        resources. Section 8, lessons learned, is the part most worth rereading if you work with
        Kubernetes.
      </p>
      <p>
        Borg isolates tasks with Linux containers, which is fine when every tenant works for the
        same company. The next paper, Firecracker, asks what changes when the tenants are strangers
        who may be hostile.
      </p>
      <Notes items={[
        'Borg runs production and batch work in one shared cell and uses priority to decide who is evicted when space runs out.',
        'Production tasks may evict batch tasks but not each other, which prevents preemption cascades.',
        'Quota controls admission before scheduling, so production can be scheduled as if batch did not exist.',
        'Cell compaction showed that segregating production and batch would need roughly 20 to 30 per cent more machines in a median cell.',
        'Reclamation lets batch use the gap between a task’s limit and its usage; memory pressure evicts batch, CPU pressure throttles it.',
        'Kubernetes kept Borg’s scheduling model and changed its grouping, networking and control-plane structure.',
      ]} />
    </>
  ),

  /* ────────────────────────────────────────────────────────────────── */
  firecracker: (
    <>
      <p>
        When AWS Lambda launched in 2014, each customer’s functions ran in containers inside EC2
        virtual machines dedicated to that customer. The VM separated one customer from another;
        containers separated functions of the same customer. This was secure, but it wasted
        capacity. A customer with one small function still needed a whole VM, and functions from
        different customers could never share one, so hosts carried a lot of reserved but idle
        memory and CPU.
      </p>
      <p>
        The Firecracker paper, from NSDI 2020, describes the virtual machine monitor AWS built so
        that thousands of functions from unrelated customers could share one host, each with the
        isolation of a virtual machine and close to the start-up cost and memory footprint of a
        container. After this page you should be able to explain why neither containers nor
        traditional VMs met Lambda’s requirements, what Firecracker removed from a VMM and why,
        how the jailer limits a compromised VMM, and what the design costs in I/O performance.
      </p>
      <p>
        We will follow one invocation: the first call to a 128 MB Python function that has not
        run on this worker host before, and then what changes when calls arrive faster.
      </p>

      <h3>Six requirements that ruled out the obvious options</h3>
      <p>
        Section 2 of the paper lists what Lambda needed from its isolation layer. Isolation: code
        from different customers must be safe to run on the same hardware, including against
        privilege escalation and side channels. Overhead and density: thousands of functions per
        host, with little waste. Performance: close to native. Compatibility: arbitrary Linux
        binaries and libraries, without code changes. Fast switching: starting new functions and
        cleaning up old ones quickly. Soft allocation: overcommitting CPU and memory, with each
        function using only what it actually needs.
      </p>
      <p>
        Then the paper tests each existing option against that list. The table below summarises
        the argument.
      </p>
      <Tbl>
        <table>
          <thead><tr><th>Option</th><th>What isolates tenants</th><th>Why it fell short for Lambda</th></tr></thead>
          <tbody>
            <tr><td>containers</td><td>Linux namespaces, cgroups and seccomp on a shared kernel</td><td>every tenant can reach the host kernel’s large system-call surface; narrowing it with seccomp breaks compatibility</td></tr>
            <tr><td>language-level sandboxes</td><td>a language runtime such as a JavaScript engine</td><td>cannot run arbitrary Linux binaries</td></tr>
            <tr><td>user-space kernels such as gVisor</td><td>a reimplementation of the Linux interface in a separate process</td><td>compatibility gaps and extra overhead on system calls</td></tr>
            <tr><td>traditional VMs with QEMU</td><td>hardware virtualisation via KVM</td><td>large device emulation code, more memory per VM, slower start</td></tr>
            <tr><td>Firecracker</td><td>KVM plus a minimal VMM in a sandboxed process</td><td>gives up devices and some I/O performance (see below)</td></tr>
          </tbody>
        </table>
      </Tbl>
      <Fig caption="Where the isolation boundary sits. Containers share the host kernel. A traditional VM puts hardware virtualisation between tenants but brings a large emulator. A microVM keeps the hardware boundary and removes most of the emulator.">
        <IsolationStack />
      </Fig>
      <p>
        The reasoning about QEMU deserves a precise reading. Hardware virtualisation was never the
        problem: KVM, which is part of Linux, uses the processor’s virtualisation support to
        isolate CPU and memory, and it is small and well reviewed. The problem was the VMM above
        it, the user-space program that emulates disks, network cards, buses and firmware for the
        guest. QEMU is over a million lines of code and can emulate a large range of hardware. Each
        emulated device is code that processes input from an untrusted guest, and that code was
        where VM escapes had historically been found.
      </p>

      <h3>What is left when you strip a VMM</h3>
      <p>
        Firecracker replaces QEMU and keeps KVM. It started from crosvm, Google’s VMM for Chrome
        OS, and is written in Rust, which rules out many memory-safety bugs in the code that
        parses guest input. The paper puts it at about 50,000 lines.
      </p>
      <p>
        The device list is short on purpose. There is a virtio network device and a virtio block
        device, a serial console, and a minimal keyboard controller kept only so the guest can
        signal a shutdown. There is no BIOS: Firecracker loads a Linux kernel directly into guest
        memory and jumps to it. There is no PCI bus; devices are exposed over memory-mapped virtio.
        There is no USB, graphics or sound.
      </p>
      <p>
        One omission shows the reasoning clearly. Many VMMs let the guest see a directory on the
        host through a shared file system. That would have been convenient for Lambda, since the
        function’s code lives on the host. Firecracker offers only a block device, because a file
        system protocol would expose a much larger part of the host kernel to the guest. The guest
        gets a disk image, and the guest kernel does all the file system work on its own side of
        the boundary.
      </p>
      <p>
        Each microVM is a separate Firecracker process. That sounds wasteful, but it is how
        Firecracker reuses Linux instead of reimplementing it: the host scheduler schedules vCPU
        threads, cgroups limit CPU, memory is allocated lazily by the host kernel when the guest
        first touches it, and standard tools can see and kill each VM. The cost is that the host
        kernel remains part of what must be trusted and patched, and the paper says so.
      </p>
      <p>
        A microVM is configured through a small REST API on a Unix socket. Starting one looks like
        this, using the open-source project’s API:
      </p>
      <pre><code>{`PUT /boot-source     {"kernel_image_path": "vmlinux", "boot_args": "console=ttyS0 reboot=k panic=1"}
PUT /drives/rootfs   {"drive_id": "rootfs", "path_on_host": "fn.ext4", "is_root_device": true, "is_read_only": false}
PUT /machine-config  {"vcpu_count": 1, "mem_size_mib": 128}
PUT /actions         {"action_type": "InstanceStart"}`}</code></pre>
      <p>
        The network and block devices can also be given <strong>rate limiters</strong>, token
        buckets for bandwidth and operations per second, so that one tenant cannot use up a
        host’s disk or network.
      </p>
      <Callout>
        Every device a VMM emulates is code that reads input from an untrusted guest. Firecracker
        is mostly an argument about which devices a serverless function does not need.
      </Callout>

      <h3>What happens when the guest sends a packet</h3>
      <p>
        To see where a microVM spends time, follow one network write from our function. The Python
        code calls an HTTP client, which writes to a socket, and the guest kernel’s virtio-net
        driver places a descriptor pointing at the packet into a ring buffer in guest memory. It
        then writes to a memory-mapped register to say there is work. That register is not real
        hardware, so the processor exits from the guest to KVM, and KVM returns control to the
        Firecracker thread that owns the device.
      </p>
      <p>
        Firecracker reads the descriptor from guest memory, checks it, copies the packet out and
        writes it to a tap device on the host with an ordinary system call. When the write
        completes, it marks the descriptor used and asks KVM to inject an interrupt into the guest.
        Each step is cheap, but each exit and system call takes time that a process on bare metal
        would not spend, and a disk read or write follows the same pattern against a file on the
        host.
      </p>
      <p>
        This path is also the attack surface. The descriptors and packets are data written by the
        guest, which the customer controls, and Firecracker’s device code is the first thing on the
        host to parse them. Keeping that code small, in Rust, and limited to a few devices is how
        the design reduces the chance that a crafted descriptor becomes an escape. The rate
        limiters sit on this path too, so one guest cannot flood the host’s network or disk.
      </p>

      <h3>Following one invocation into a slot</h3>
      <p>
        Section 4 of the paper describes how Lambda uses Firecracker. A request to invoke our
        function arrives at a front end, which asks the Worker Manager where to send it. The
        Worker Manager routes invocations of the same function to the same workers, so that warm
        environments get reused. On a worker host, each function’s environment is a{' '}
        <strong>slot</strong>: one microVM with a guest kernel, the language runtime and the
        customer’s code loaded. A slot handles one invocation at a time.
      </p>
      <p>
        Our function has no slot yet. The Placement service picks a worker with capacity and a new
        slot is created. Firecracker starts the microVM; the paper measures boot times around
        125 ms with a minimal guest kernel and configuration. Then the Python runtime starts inside
        it, the function’s module is imported, and the handler runs. The microVM boot is only part
        of the cold start the customer sees, and the runtime and the customer’s own initialisation
        can take longer.
      </p>
      <p>
        Change one variable. Two seconds later the function is called again. The Worker Manager
        sends the call to the same worker and the existing slot handles it with no boot at all.
        Change another. Fifty calls arrive together. A slot handles one invocation at a time, so
        this means up to fifty slots, each its own microVM, possibly spread across several
        workers. Every one is isolated from the others by KVM, even though they are the same
        customer’s code.
      </p>
      <p>
        Now the memory budget. Our function asks for 128 MB, and Firecracker’s own overhead per
        microVM is a few megabytes; the project promises under 5 MiB, and the paper’s measurements
        are in that range. That overhead is what makes density possible.
      </p>
      <Predict q={<>A worker host has 128 GB of memory. Each function needs 128 MB. How many fit if each sandbox adds 5 MB of overhead (a microVM), and how many if each adds 512 MB (a typical traditional VM)? Then repeat for 1,024 MB functions.</>}>
        <p>
          For 128 MB functions: 131,072 MB divided by 133 MB is about 985 microVMs. Divided by
          640 MB it is about 204 traditional VMs. The microVM fits almost five times as many.
        </p>
        <p>
          For 1,024 MB functions: 131,072 divided by 1,029 is about 127, and divided by 1,536 it
          is about 85. The advantage drops to about one and a half times. Per-sandbox overhead
          matters most when functions are small, and most serverless functions are small.
        </p>
        <p>
          These counts assume every byte of every function’s memory is in use. In practice most
          functions use less than they asked for and are idle much of the time, and the host only
          allocates guest memory when it is touched, which is why Lambda can overcommit further.
        </p>
      </Predict>
      <FirecrackerDensity />
      <p>
        Overcommitting is the soft-allocation requirement in practice. It relies on functions on
        one host not all being busy at the same moment. Spreading a customer’s slots across many
        hosts, and mixing many customers on each host, keeps the load on any one host closer to
        an average.
      </p>

      <h3>When the guest breaks out: the jailer</h3>
      <p>
        AWS did not assume Firecracker would be bug-free. Each Firecracker process is started by a
        <strong> jailer</strong>, which puts it in a chroot containing only the files that microVM
        needs, in its own PID and network namespaces, under cgroups, and with its privileges
        dropped. It then applies a seccomp filter that allows only a short list of system calls,
        a couple of dozen, some with restrictions on their arguments.
      </p>
      <Fig caption="Layers of the jailer. KVM provides the hardware boundary. The Firecracker process is further restricted by seccomp, a chroot, namespaces and cgroups, so an attacker who gets out of the guest must also break each of those.">
        <JailerLayers />
      </Fig>
      <p>
        Walk through a failure. An attacker controls the guest kernel, which is allowed: the
        customer can run anything in their own VM. They find a bug in Firecracker’s virtio-net
        emulation and gain code execution in the Firecracker process. Now what? The process
        cannot open files outside its chroot. It cannot call <code>execve</code> to start a shell,
        because that system call is not on the allowed list. It cannot see other microVMs’
        processes because of the PID namespace. To reach another tenant, the attacker needs a
        second bug, this time in the host kernel, reachable only through the few system calls
        the filter still allows.
      </p>
      <p>
        The cost of this protection falls on development. Any new feature that needs a new system
        call needs a change to the filter and a security review, which slows down adopting new
        kernel interfaces for performance.
      </p>
      <p>
        The paper also discusses side channels. Hardware isolation does not prevent one tenant from
        learning about another through shared caches and processor structures, as the Spectre and
        L1TF vulnerabilities showed. The paper recommends host configuration such as disabling
        simultaneous multithreading and applying the kernel’s mitigations, and treats this as part
        of operating Firecracker safely rather than something the VMM can solve by itself.
      </p>

      <h3>What it gave up, measured</h3>
      <p>
        The evaluation in section 5 compares Firecracker with QEMU and with Intel’s Cloud
        Hypervisor. On boot time and memory overhead, Firecracker does well, which is what it was
        designed for. On I/O it is frank about weakness. Block device performance trailed QEMU,
        especially on large reads and writes, because Firecracker’s block device handled I/O
        serially at the time. Network throughput also fell short of what the hardware could do.
        For Lambda functions, which mostly make short network calls, this was acceptable. For a
        database it would not be.
      </p>
      <p>
        Later work addressed the cold start more directly. Firecracker gained snapshot and
        restore, which saves an initialised microVM’s memory and device state so that new
        instances resume rather than boot. Lambda SnapStart, launched in 2022 for Java, is built on
        this. Snapshots bring their own problem: every restored copy starts with the same memory,
        including the state of random number generators, which the Firecracker team has written
        about separately. Another paper from the same team, on loading container images on demand
        in Lambda, describes how large function images are split into chunks and fetched lazily.
      </p>
      <p>
        Walk through the snapshot problem with our function. Lambda initialises the function once,
        snapshots the microVM, and later restores two copies of that snapshot on different hosts to
        serve two invocations. Both copies resume with the same memory, so both hold the same
        pseudo-random generator state. If the function generates a request id, a session token or
        a key after resuming, the two copies can produce the same value. The fix is to tell the
        guest that it has been restored, so the kernel and the language runtime can reseed and
        refresh anything that must be unique. That fix costs cooperation: the guest kernel, the
        runtime and sometimes the customer’s own code have to respond to the signal, which is part
        of why snapshot-based starts arrived one runtime at a time.
      </p>
      <p>
        Firecracker was open-sourced in 2018 and is used outside AWS, for example by Fly.io and
        as one runtime option for Kata Containers, which runs Kubernetes pods inside lightweight
        VMs. Its devices and virtualisation code share components with other Rust VMMs through
        the rust-vmm project. Google took the other path with gVisor, which implements the Linux
        system-call interface in a user-space kernel; it avoids the guest kernel but pays more per
        system call.
      </p>
      <p>
        Firecracker fits short-lived, many-tenant workloads that need strong isolation and modest
        I/O. It fits less well when a workload needs devices it does not emulate, such as GPUs, or
        sustained high-throughput disk access. Those are the conditions that would send you back to
        a fuller VMM or to bare metal.
      </p>

      <h3>How to read the original</h3>
      <p>
        Section 2, on choosing an isolation approach, is the most useful part of the paper; it is
        a clear comparison of containers, language VMs, user-space kernels and virtualisation for
        a stated set of requirements. Read section 3 on Firecracker’s design, especially the parts
        about the device model and the jailer. Section 4, on Lambda’s architecture, explains slots,
        the Worker Manager and placement, and is where the microVM becomes a service.
      </p>
      <p>
        In section 5, look at the boot time and memory overhead results first, then at the I/O
        figures, and read the authors’ explanations of where Firecracker falls behind. Note what
        each comparison configures for QEMU and Cloud Hypervisor, since boot times depend heavily
        on guest kernel and VMM settings. Section 6 discusses lessons and side channels, and is
        short.
      </p>
      <p>
        That ends this group of papers. GFS, Dapper, the Tail at Scale, Borg and Firecracker each
        start from what goes wrong at scale: disks fail, requests cross too many machines, some
        server is always slow, machines sit idle, and tenants cannot be trusted. Each describes a
        design that treats that problem as normal.
      </p>
      <Notes items={[
        'Lambda needed VM-level isolation between customers with near-container density and start-up time, which neither containers nor QEMU-based VMs provided.',
        'Firecracker keeps KVM for hardware isolation and replaces QEMU with a small Rust VMM that emulates only a few virtio devices.',
        'Each microVM is a separate process, so Linux handles scheduling, memory and resource limits, and the host kernel stays in the trusted base.',
        'The jailer adds a chroot, namespaces, cgroups and a seccomp allowlist, so escaping the guest still leaves an attacker with very little.',
        'Per-sandbox overhead of a few megabytes is what makes thousands of small functions per host possible.',
        'The design gives up devices and some I/O throughput, which is acceptable for short functions and not for disk-heavy workloads.',
      ]} />
    </>
  ),
}
