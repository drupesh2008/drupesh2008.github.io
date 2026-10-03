/**
 * Cloud & Infrastructure — five explainers, problem first. Keyed by paper id.
 */
import type { ReactNode } from 'react'
import { Callout, Fig, Tbl } from '@/components/Pathway/Pathway'
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
      <h3>The problem: when something is always broken</h3>
      <p>
        File systems of 2003 assumed that disks mostly worked, that files were modest, and that
        programs read and wrote them in small pieces at random. Google’s machines broke every one
        of those assumptions. It ran thousands of cheap PCs with commodity disks, so at any moment
        some were dead and some were quietly corrupting data. Its files were web crawls measured in
        gigabytes and terabytes, written once by a stream of appends and read in long sequential
        sweeps by programs like MapReduce. A file system built for a workstation, scaled up, would
        spend its life fighting the hardware and the workload at once.
      </p>
      <p>
        So the authors wrote down their assumptions first, which is why the paper is still worth
        reading as a method even where its design has been superseded: failure is normal; files
        are huge; appends dominate; bandwidth matters more than latency; and the file system and
        the applications are built by the same company, so the interface can be bent to fit.
      </p>

      <h3>The idea: one master for the map, many servers for the bytes</h3>
      <p>
        A GFS cluster has a single <strong>master</strong> and many <strong>chunkservers</strong>.
        Files are cut into fixed 64-megabyte <strong>chunks</strong>, each stored on three
        chunkservers. The master keeps all metadata in memory: the file namespace, which chunks make
        up each file, and where every chunk’s replicas are. Clients ask the master where a chunk
        lives, cache the answer, and then read or write the bytes directly from chunkservers. The
        master handles a few bytes per operation; the terabytes never pass through it.
      </p>
      <Fig caption="A read. Metadata from the master, cached; data straight from a chunkserver. Keeping the master off the data path is what lets one machine coordinate thousands.">
        <GfsRead />
      </Fig>
      <Callout>
        A single master is a simplification, not a weakness, if it does almost nothing per request.
        GFS keeps the master in the loop for placement decisions, where a global view pays, and out
        of the loop for data, where it would be the bottleneck.
      </Callout>

      <h3>How it works</h3>
      <p>
        The master expects to lose chunkservers and treats a missing replica as ordinary work. It
        exchanges heartbeats with every server, and when one goes silent the chunks it held become
        under-replicated and are cloned elsewhere, most urgent first; when the server returns, its
        stale copies are garbage-collected lazily. Chunkservers checksum every 64-kilobyte block, so
        a disk that lies is caught before its data spreads. The master’s own state is protected by
        an operation log replicated to other machines and by periodic checkpoints; if it dies, a
        new master replays the log and asks the chunkservers what they hold.
      </p>
      <GfsSim />
      <p>
        Writes separate data from control. The client pushes the bytes along a chain of replicas,
        each forwarding to the next nearest, so every network link is used once. Then it asks the{' '}
        <strong>primary</strong> replica, which holds a short lease from the master, to apply the
        write; the primary chooses a serial order and tells the others to apply it in that order.
        One machine decides, briefly and locally, and no global coordination is needed.
      </p>
      <Fig caption="A write. Bytes are pipelined along a chain (each hop uses full bandwidth); the order is decided by the primary replica, which holds the lease for that chunk.">
        <WritePipeline />
      </Fig>
      <p>
        The interface is bent in one famous place. <strong>Record append</strong> lets many clients
        append to one file concurrently with GFS choosing the offset, guaranteeing that each record
        lands at least once, somewhere, atomically, possibly with duplicates or padding between
        records. That is a weaker promise than a POSIX file makes and a much stronger one than
        Google’s producer-consumer pipelines needed; applications tolerated duplicates with sequence
        numbers and checksums, and the file system stayed fast.
      </p>

      <h3>What it changed</h3>
      <p>
        GFS was the floor under MapReduce and Bigtable, and its open-source copy, the Hadoop
        Distributed File System, was the floor under the big-data industry: the NameNode and
        DataNodes are the master and chunkservers under other names. Inside Google it was replaced
        by Colossus around 2010, which spread the metadata across many machines and used erasure
        coding instead of three copies, because the single master finally did become the limit.
        What survived is the posture: design for failure as the normal case, replicate at the
        file-system layer so applications need not, and keep the metadata path and the data path
        apart.
      </p>

      <h3>Where you meet it today</h3>
      <ul>
        <li><strong>HDFS</strong> and every Hadoop-era cluster; the NameNode is still the single master.</li>
        <li><strong>Object stores.</strong> S3 and its peers keep the separation of a metadata service from storage nodes, with erasure coding where GFS used replication.</li>
        <li><strong>Chunking.</strong> Splitting large objects into fixed-size, independently replicated pieces is now how backups, video and ML datasets are stored.</li>
        <li><strong>Leases.</strong> A short-lived grant of authority from a coordinator, renewed by heartbeat, is the standard way to pick a primary without consensus on every write.</li>
      </ul>
    </>
  ),

  /* ────────────────────────────────────────────────────────────────── */
  dapper: (
    <>
      <h3>The problem: a slow search, and nobody who could say why</h3>
      <p>
        A single Google search in 2010 fanned out from a front end to hundreds of services on
        thousands of machines: query rewriting, several index shards, spelling, ads, maps, and
        more, written by many teams in several languages. When a search was slow, every one of
        those teams could truthfully say their service was fine, because each saw only its own
        slice. The logs of one machine told you what that machine did, not which request it was
        doing it for or what else that request had been waiting on.
      </p>
      <p>
        The authors wanted a view of one request across every process it touched, and they set
        two constraints that shaped everything: the instrumentation had to be{' '}
        <strong>ubiquitous</strong>, present in every service without each team opting in, and its{' '}
        <strong>overhead</strong> had to be low enough to leave on in production, all the time,
        because the slow requests you care about happen when you are not looking.
      </p>

      <h3>The idea: a tree of spans, stitched by an id that travels with the request</h3>
      <p>
        Dapper records a request as a <strong>trace</strong>: a tree of <strong>spans</strong>, where a
        span is one unit of work (a server handling an RPC, say) with a start time, an end time, a
        name, and the id of its parent span. A trace id and the current span id are attached to
        every RPC as it leaves a process and read back when it arrives, so the tree can be rebuilt
        later from records written by different machines that never spoke to each other. Any
        process can attach <strong>annotations</strong>, timestamped notes or key-value pairs, to its
        span.
      </p>
      <Fig caption="A trace. Every span knows its own id and its parent’s, and every span carries the same trace id, so the tree can be reassembled from logs written on dozens of machines.">
        <SpanTree />
      </Fig>
      <Callout>
        Put the instrumentation where everyone already is. Google’s threading library, control-flow
        library and RPC framework carried the trace context automatically, so almost every service
        was traced without its authors writing a line.
      </Callout>

      <h3>How it works</h3>
      <p>
        The span data never travels with the request. Each process writes its spans to a local log
        file; a daemon on every machine sweeps the files up and stores them in a Bigtable with one
        row per trace. The paper reports a median delay of under fifteen seconds from a request
        finishing to its trace being queryable, which was fast enough for debugging and left the
        serving path untouched.
      </p>
      <Fig caption="Out-of-band collection. Spans go to local disk, a daemon ships them, and a Bigtable holds one row per trace. The request itself never waits for any of this.">
        <CollectionPipeline />
      </Fig>
      <p>
        Overhead was tamed by <strong>sampling</strong>. Tracing one request in 1,024 cost
        nothing measurable, and for a high-volume service it still produced thousands of traces a
        minute, enough to see every common pattern and most rare ones; low-traffic services used
        adaptive rates so they were not under-sampled. The authors’ point is that you do not need
        every request to understand the system, you need a representative set, and sampling is
        what makes “always on” affordable.
      </p>
      <DapperTrace />
      <p>
        The uses they found were broader than debugging. Traces revealed the real dependency graph
        between services, which no document had kept current. They attributed load on a shared
        service back to the front ends causing it, which settled arguments about capacity. And
        they found behaviour nobody had designed: a service that made the same call twice in a
        request, a cache being bypassed by a path everyone had forgotten.
      </p>

      <h3>What it changed</h3>
      <p>
        Dapper is the design under nearly every distributed tracing system. Twitter’s Zipkin (2012)
        and Uber’s Jaeger (2015) reimplemented it in the open; the OpenTracing and OpenCensus
        projects standardised its API, and merged into OpenTelemetry, which is now the industry’s
        shared instrumentation layer; the W3C <code>traceparent</code> header is Dapper’s trace
        context as a web standard. The paper also set the terms of the observability conversation:
        logs, metrics and traces as three complementary signals, with tracing the one that follows
        the request.
      </p>

      <h3>Where you meet it today</h3>
      <ul>
        <li><strong>OpenTelemetry, Jaeger, Zipkin, Tempo, Datadog APM, X-Ray.</strong> Spans, trace ids and parent ids, exactly as the paper defined them.</li>
        <li><strong>The <code>traceparent</code> header</strong> on an HTTP request, propagating the trace through every hop.</li>
        <li><strong>Sampling decisions.</strong> Head-based and tail-based sampling policies are the paper’s cost argument, revisited.</li>
        <li><strong>Service maps.</strong> The dependency graph your observability tool draws is derived from traces, as Dapper’s was.</li>
      </ul>
    </>
  ),

  /* ────────────────────────────────────────────────────────────────── */
  'tail-at-scale': (
    <>
      <h3>The problem: the slowest one per cent is the user experience</h3>
      <p>
        Suppose a server answers 99 per cent of requests in ten milliseconds and one per cent in a
        second. Ask it once and the odds are fine. Now suppose a user request has to touch a
        hundred such servers, as a web search does when it consults a hundred index shards and
        waits for all of them. The chance that none of the hundred hits its slow case is 0.99 to
        the hundredth power, about 37 per cent. Nearly two-thirds of users wait a second. No
        server is misbehaving; the slow one is a different server each time; there is nothing to
        fix, and the system is slow.
      </p>
      <Fig caption="The arithmetic. A one-per-cent tail on a single server becomes a 63-per-cent tail for any request that fans out to a hundred of them.">
        <FanOutTail />
      </Fig>
      <p>
        Dean and Barroso catalogue where the one per cent comes from, and it is everywhere: a
        shared CPU, a background daemon, a garbage collector, a disk compaction, a queue that
        briefly filled, a machine throttling itself for heat. Some can be reduced. None can be
        eliminated, and at scale there are always enough of them that some request is hitting one.
        The paper’s thesis is that <strong>variability is a property of large systems</strong> and
        that latency has to be engineered the way availability is: by assuming components will
        misbehave and arranging for the system to tolerate it.
      </p>

      <h3>The idea: tail-tolerant design</h3>
      <p>
        The analogy the authors draw is with fault tolerance. We do not build reliable systems from
        components that never fail; we build them from redundant components and detect and route
        around failure. A slow response is a kind of failure, and the same move applies: have more
        than one place to get the answer, notice when one is taking too long, and ask another.
      </p>
      <Callout>
        You cannot make every server fast every time. You can make sure that one server’s bad
        moment is not the user’s bad moment, by giving each request a second chance and taking the
        first answer that comes back.
      </Callout>

      <h3>How it works</h3>
      <p>
        The simplest technique is the <strong>hedged request</strong>: send the request to one
        replica, and if no answer arrives within the 95th-percentile latency, send it to a second;
        use whichever answers first and cancel the other. Only the slowest five per cent of requests
        ever send a backup, so the extra load is small, but the tail collapses because a request
        must now be unlucky twice. In the paper’s Bigtable benchmark, hedging cut the 99.9th
        percentile of a 100-server fan-out from 1,800 milliseconds to 74, with about two per cent
        more requests.
      </p>
      <Fig caption="A hedged request. The first replica is having a slow moment; after the 95th-percentile delay a copy goes to a second replica, which answers in eight milliseconds, and the first is cancelled.">
        <HedgedRequest />
      </Fig>
      <TailLatency />
      <p>
        <strong>Tied requests</strong> go one step further: send to two servers at once, each told
        about the other, and have whichever starts the work first cancel the other’s copy, so the
        work is rarely done twice and the request never sits in one long queue. Then come the
        techniques that shape the system rather than the request: <strong>micro-partitions</strong>,
        many more shards than machines, so load can be moved in small pieces; <strong>selective
        replication</strong> of hot shards; <strong>latency-induced probation</strong>, temporarily
        routing around a server that has been slow; and <strong>good-enough results</strong>,
        answering a search once 95 per cent of shards have replied rather than waiting for the last
        one. Canary requests protect against a different tail: a query that crashes every server
        it touches is tried on one or two first.
      </p>
      <Tbl>
        <table>
          <thead><tr><th>technique</th><th>what it costs</th><th>what it buys</th></tr></thead>
          <tbody>
            <tr><td>hedged request</td><td>a few per cent extra load</td><td>the tail needs two unlucky replicas</td></tr>
            <tr><td>tied request</td><td>a cancellation message</td><td>no queueing behind a long request</td></tr>
            <tr><td>micro-partitions</td><td>more metadata</td><td>fine-grained load balancing and recovery</td></tr>
            <tr><td>good-enough results</td><td>a slightly incomplete answer</td><td>never waiting for the slowest shard</td></tr>
          </tbody>
        </table>
      </Tbl>

      <h3>What it changed</h3>
      <p>
        The article made the 99th percentile the number engineers argue about. Latency objectives
        moved from averages to tails; load balancers, RPC frameworks and databases grew hedging and
        speculative retries as first-class features (gRPC, Envoy and Cassandra all have them); and
        the vocabulary of “tail latency” and “tail-tolerant” entered everyday use. The deeper
        shift was in attitude: slowness stopped being a bug to be found and became a condition to
        be designed for.
      </p>

      <h3>Where you meet it today</h3>
      <ul>
        <li><strong>p99 dashboards and SLOs.</strong> If you are paged on a percentile, you are living in this paper.</li>
        <li><strong>Hedging policies</strong> in gRPC, Envoy and service meshes; speculative execution in Cassandra and Spark.</li>
        <li><strong>Fan-out budgets.</strong> The reason microservice architectures with deep call graphs are hard to make fast is the arithmetic above.</li>
        <li><strong>Timeouts with fallbacks.</strong> Returning partial results, cached results or a degraded page after a deadline is “good-enough results” in product form.</li>
      </ul>
    </>
  ),

  /* ────────────────────────────────────────────────────────────────── */
  borg: (
    <>
      <h3>The problem: a hundred thousand machines and no idle ones allowed</h3>
      <p>
        Every Google service, from search to Gmail, and every batch job, from MapReduce to the
        nightly index build, had to run somewhere. Giving each team its own machines was simple and
        wasteful: serving systems need headroom for their peaks, batch jobs need bursts, and
        dedicated clusters sit half-empty most of the day. The alternative, one shared pool for
        everything, raises the questions that make cluster management hard. Who goes first when the
        pool is full? What happens to a batch job when a serving job needs its machine? How does a
        service find its instances when they can be anywhere? And how do you keep all of it running
        while machines, racks and the management system itself fail?
      </p>
      <p>
        Google answered those questions internally around 2004 and ran essentially everything on
        the result for a decade before describing it. The paper is the description, and it was
        published a year after the same team released Kubernetes, which is the public retelling of
        its lessons.
      </p>

      <h3>The idea: one scheduler, priorities, and the slack is for batch</h3>
      <p>
        Borg manages a <strong>cell</strong>, a cluster of about ten thousand machines, as a single
        pool. Users submit <strong>jobs</strong> made of identical <strong>tasks</strong>, each with a
        priority and a resource request. The scheduler finds machines with room and places tasks;
        a <strong>Borglet</strong> agent on each machine starts them in containers and reports
        back. Every job carries a priority, and the bands matter: production jobs are placed as
        though batch jobs did not exist, and a batch task simply gets evicted when a production
        task needs its machine, to be rescheduled later. Batch work fills the gaps that production
        headroom leaves and gives them back on demand.
      </p>
      <Fig caption="A cell. The Borgmaster, replicated five ways with Paxos, holds the state; the scheduler places tasks; a Borglet on every machine runs them in containers. Batch tasks are packed into the slack left by production tasks.">
        <BorgCell />
      </Fig>
      <Callout>
        Mixing workloads is the whole economic argument. The paper measured what separate
        production and batch cells would have needed and found that sharing saved roughly 20 to 30
        per cent of the machines, which at Google’s size is a number with its own data centres.
      </Callout>

      <h3>How it works</h3>
      <p>
        The <strong>Borgmaster</strong> is a replicated state machine (the Raft-style idea, with
        Paxos) holding every job, task and machine; it survives the loss of most of its replicas,
        and even a complete outage leaves running tasks running, because the Borglets keep going
        without it. The scheduler scans the queue in priority order, finds feasible machines, and
        scores them so that tasks spread for failure tolerance while leaving large holes for large
        tasks. Tasks get stable names through a service that lets clients find instances wherever
        they land, and every task exports metrics and health that the system scrapes.
      </p>
      <Fig caption="Priority bands. Admission into the production band is controlled by quota; the batch band runs on leftovers and expects to be evicted; the best-effort band promises nothing and costs almost nothing.">
        <PriorityBands />
      </Fig>
      <BorgScheduler />
      <p>
        Two refinements made the economics work. Tasks ask for more resources than they use, so
        Borg measures actual use and <strong>reclaims</strong> the difference for lower-priority
        work, giving it back if the owner’s usage rises. And the system was shaped by the people
        running it: a built-in web interface showed every job’s state and every machine’s load, and
        the paper is frank that the tooling was as important as the scheduler.
      </p>

      <h3>What it changed</h3>
      <p>
        Borg’s lessons, good and bad, became Kubernetes. Pods replaced bare tasks, because
        co-scheduled helper processes were a pattern everyone had reinvented; labels replaced
        rigid job membership; one IP per pod replaced Borg’s awkward port juggling; a declarative
        API server replaced the Borgmaster’s remote procedure calls. The companion essay in ACM
        Queue, by the same authors, walks through those choices. Borg also normalised containers
        as the unit of deployment years before Docker, and made “bin-packing with priorities” the
        default model for every cluster scheduler since, including Mesos, YARN and Nomad.
      </p>

      <h3>Where you meet it today</h3>
      <ul>
        <li><strong>Kubernetes.</strong> Requests and limits, priority classes, preemption and node scoring are Borg’s mechanisms with Borg’s names barely changed.</li>
        <li><strong>Spot and preemptible instances.</strong> The cloud sells the batch band to the public: cheap capacity that may be taken back.</li>
        <li><strong>Resource reclamation.</strong> Vertical autoscalers and “right-sizing” tools do what Borg did automatically with over-requested resources.</li>
        <li><strong>The control-plane pattern.</strong> A replicated store of desired state and agents that reconcile towards it is now how most infrastructure is built.</li>
      </ul>
    </>
  ),

  /* ────────────────────────────────────────────────────────────────── */
  firecracker: (
    <>
      <h3>The problem: thousands of strangers on one machine</h3>
      <p>
        A serverless platform promises to run your function the moment it is called and to charge
        you only while it runs. To make that pay, the provider must pack thousands of functions
        from thousands of unrelated customers onto each physical host, start a new one in a
        fraction of a second, and guarantee that none of them can read, interfere with or even
        time-attack another. The two existing tools each failed one requirement. Containers are
        dense and start in milliseconds but share the host kernel, and the Linux kernel’s attack
        surface is too large to bet a multi-tenant business on. Virtual machines isolate properly,
        with hardware help, but a conventional VM carries a full device model and firmware, costs
        hundreds of megabytes and takes seconds to boot.
      </p>
      <Fig caption="Where the boundary lies. A container’s neighbours are one kernel bug away; a VM puts hardware between them but drags a million lines of device emulation along; a microVM keeps the hardware boundary and sheds the baggage.">
        <IsolationStack />
      </Fig>

      <h3>The idea: a virtual machine with everything unnecessary removed</h3>
      <p>
        AWS Lambda had launched on containers inside dedicated per-customer VMs, which worked and
        wasted machines. Firecracker is the replacement: a <strong>virtual machine monitor</strong>{' '}
        that uses the Linux kernel’s KVM for the hardware boundary and implements only what a
        serverless function needs. No BIOS, no PCI bus, no USB, no graphics; a virtual network
        device, a block device, a serial console, a keyboard that exists only to signal reboot, and
        a small configuration API. Written in Rust, forked from Chrome OS’s crosvm, it is around
        fifty thousand lines where QEMU is well over a million.
      </p>
      <Callout>
        Security through subtraction. Every emulated device is attack surface; a function that will
        never print or draw does not need a printer or a screen. Shrinking the device model shrank
        both the code to trust and the time to boot.
      </Callout>

      <h3>How it works</h3>
      <p>
        A microVM boots an unmodified Linux kernel in about 125 milliseconds and adds under five
        megabytes of memory overhead, which is what lets a host run thousands of them; the paper
        reports creating up to 150 microVMs per second on one host. Memory and CPU are oversubscribed
        on purpose, since most functions idle most of the time, with rate limiters on network and
        disk so one tenant cannot starve the others.
      </p>
      <FirecrackerDensity />
      <p>
        The hardware boundary is not the only one. The VMM runs inside a <strong>jailer</strong>{' '}
        that drops it into fresh namespaces, a chroot and cgroups, removes its privileges, and
        applies a seccomp filter so the process can make only a short list of system calls. An
        attacker who escapes the guest kernel and then the VMM still finds themselves in a jail
        with nothing to use. The paper calls this defence in depth and treats it as the design
        rather than an extra.
      </p>
      <Fig caption="The jailer. KVM provides the hardware boundary; the VMM process is additionally confined by seccomp, a chroot, namespaces and cgroups, so a breach has to cross several walls.">
        <JailerLayers />
      </Fig>
      <p>
        On top of the microVM, Lambda’s architecture keeps warm microVMs in <strong>slots</strong>{' '}
        on worker hosts, routes an invocation to an existing slot for that function if one is free,
        and otherwise creates one; later work added snapshot-and-restore so that a “cold” start can
        resume a pre-initialised memory image rather than booting at all.
      </p>

      <h3>What it changed</h3>
      <p>
        Firecracker made hardware-isolated sandboxes cheap enough to be the default, and AWS
        open-sourced it in 2018, before the paper. It runs Lambda and Fargate, and outside AWS it
        powers Fly.io’s machines, container runtimes such as Kata Containers, and the sandboxes
        that code-execution and AI-agent products use to run untrusted code. The broader lesson,
        that the right unit of isolation for the cloud is a stripped-down VM rather than a
        hardened container, reshaped how providers think about multi-tenancy.
      </p>

      <h3>Where you meet it today</h3>
      <ul>
        <li><strong>AWS Lambda and Fargate.</strong> Every invocation runs in a Firecracker microVM.</li>
        <li><strong>Sandboxes for untrusted code.</strong> CI runners, online IDEs and AI coding agents increasingly execute inside microVMs rather than containers.</li>
        <li><strong>Kata Containers and friends.</strong> Kubernetes pods that are secretly tiny VMs.</li>
        <li><strong>The “cold start” conversation.</strong> The 125 ms figure, and snapshot-restore to beat it, define what serverless latency means.</li>
      </ul>
    </>
  ),
}
