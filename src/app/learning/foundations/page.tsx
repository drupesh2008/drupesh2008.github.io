import type { Metadata } from 'next'
import Pathway, { Callout, Fig, Tbl } from '@/components/Pathway/Pathway'
import { LatencyLadder, LostUpdate, RoundTrips } from './diagrams'

export const metadata: Metadata = {
  title: 'Foundations — a free pathway from zero to professional',
  description:
    'How the machine actually runs your code: memory and caches, operating systems, networks, algorithmic cost and the mathematics behind ML — a comprehensive free course with curated further reading.',
}

export default function FoundationsPage() {
  return (
    <Pathway
      trackId="foundations"
      sections={{
        /* ── Stage 1 ─────────────────────────────────────────────── */
        machine: (
          <>
            <p>
              Every program you will ever write runs on the same physical arrangement: a processor
              that executes simple instructions absurdly fast, and data that lives progressively
              further away from it. The processor is almost never the bottleneck. <strong>Waiting for
              data is.</strong> This stage builds the cost model that every later decision — cache or
              not, index or not, one service or two — silently consults.
            </p>

            <h3>The parts, in one paragraph</h3>
            <p>
              A modern server CPU has a handful to a few dozen <strong>cores</strong>, each executing
              billions of instructions per second on values held in <strong>registers</strong>.
              Between the cores and main memory sit two or three levels of <strong>cache</strong> —
              small, fast copies of recently used memory (L1 is per-core and tiny, ~32&nbsp;KB; L3 is
              shared and a few tens of MB). Below that: <strong>RAM</strong> in the tens or hundreds
              of GB, then <strong>SSDs</strong> in the TBs, then the <strong>network</strong>, which
              is how you reach everything you do not have. Each step down is bigger, cheaper per
              byte, and slower — usually by one or two orders of magnitude.
            </p>
            <Fig caption="Fig 1 · The ladder, on a log scale — and in human time, where one L1 hit lasts a second">
              <LatencyLadder />
            </Fig>

            <h3>The numbers worth memorising</h3>
            <p>
              These are the classic “latency numbers every programmer should know”, rounded to be
              memorable. The absolute values drift year to year; the <em>ratios</em> are what design
              decisions turn on, and they have been stable for decades.
            </p>
            <Tbl>
              <table>
                <thead>
                  <tr><th>Operation</th><th>Cost</th><th>Intuition</th></tr>
                </thead>
                <tbody>
                  <tr><td>L1 cache hit</td><td>~1 ns</td><td>the baseline — call it one heartbeat</td></tr>
                  <tr><td>Branch mispredict</td><td>~3 ns</td><td>the CPU guessed the if-branch wrong and rewinds</td></tr>
                  <tr><td>Mutex lock/unlock, uncontended</td><td>~20 ns</td><td>cheap — contention is what costs, not the lock</td></tr>
                  <tr><td>Main memory reference</td><td>~100 ns</td><td>100× the cache — the first big cliff</td></tr>
                  <tr><td>Read 1 MB sequentially from RAM</td><td>~10 µs</td><td>sequential is the fast lane everywhere</td></tr>
                  <tr><td>SSD random read</td><td>~100 µs</td><td>1,000× RAM — the second cliff</td></tr>
                  <tr><td>Read 1 MB sequentially from SSD</td><td>~1 ms</td><td>still fine — again, sequential forgives</td></tr>
                  <tr><td>Round trip, same datacenter</td><td>~0.5 ms</td><td>a network hop costs like an SSD read</td></tr>
                  <tr><td>Spinning disk seek</td><td>~10 ms</td><td>mechanical — why databases fear random disk I/O</td></tr>
                  <tr><td>Round trip, cross-continent</td><td>~150 ms</td><td>physics; no vendor sells a way around it</td></tr>
                </tbody>
              </table>
            </Tbl>
            <p>
              Scale it to human time and the ladder stops being trivia: if a cache hit takes one
              second, main memory is a two-minute walk, an SSD read is a long weekend, and a request
              to another continent is a five-year expedition. One line of code that quietly crosses
              the network sits at the bottom of that ladder no matter how elegant it looks.
            </p>

            <h3>Cache lines and locality</h3>
            <p>
              Memory does not move one byte at a time. It moves in <strong>cache lines</strong> of 64
              bytes: touch one byte and the hardware fetches its 63 neighbours, betting you will want
              them next. That bet is the whole story of fast code. Walk an array front to back and
              every fetch pays for the next several elements — the prefetcher even starts fetching
              ahead of you. Chase pointers through a linked list or a tree scattered across the heap
              and every hop is a fresh ~100 ns miss: <em>same big-O, ten times slower</em>.
            </p>
            <p>
              The classic demonstration is iterating a large 2-D array. Loop row-by-row (the order
              it is laid out in memory) and you stream through cache lines; loop column-by-column
              and every single access lands on a different line. Identical arithmetic, routinely a
              5–10× difference. When a profiler says your time is in “memory”, this is usually what
              it means.
            </p>

            <h3>Where memory comes from</h3>
            <p>
              Your language gives you two allocation regimes. The <strong>stack</strong> is a bump of
              a pointer — effectively free, automatically reclaimed, and beautifully local. The{' '}
              <strong>heap</strong> is where dynamic and long-lived things go, and it costs real
              work: the allocator finds space, and in garbage-collected languages every allocation is
              a future collection to pay for. Allocation inside a hot loop is one of the most common
              self-inflicted slowdowns in production code — not because one allocation is slow, but
              because a million of them per second turns the allocator and the GC into your busiest
              component. Reuse buffers; allocate outside the loop; let flat arrays of values beat
              trees of boxed objects.
            </p>

            <h3>Where it bites</h3>
            <ul>
              <li>
                <strong>Pointer-heavy designs at scale.</strong> The elegant object graph benchmarks
                fine on 100 items and dies on 10 million — every edge is a probable cache miss.
              </li>
              <li>
                <strong>False sharing.</strong> Two threads updating two <em>different</em> counters
                that happen to sit in the same 64-byte line will fight over that line and serialise
                each other. Pad hot per-thread data apart.
              </li>
              <li>
                <strong>Benchmarking with a warm cache</strong> and shipping to a cold one — or the
                reverse. Say which case you measured.
              </li>
              <li>
                <strong>Trusting big-O across the ladder.</strong> O(log n) probes of an SSD lose to
                O(n) over a RAM-resident array for astonishing values of n.
              </li>
            </ul>
            <Callout>
              Performance is mostly a question of <em>where the data is</em>, not how clever the
              code is. Before optimising anything, ask which rung of the ladder each access touches
              — and whether the accesses are sequential or scattered.
            </Callout>
          </>
        ),

        /* ── Stage 2 ─────────────────────────────────────────────── */
        os: (
          <>
            <p>
              Hundreds of programs share your machine, and none of them are written as if that were
              true. That is the operating system’s doing. It maintains three convenient fictions for
              every process, and understanding where each one leaks is most of what “knowing how
              computers work” means in practice. Take the lies one at a time.
            </p>

            <h3>Lie one — “you have the CPU to yourself”</h3>
            <p>
              In reality the <strong>scheduler</strong> gives your process short slices of a core —
              milliseconds — suspending and resuming it constantly. Each <strong>context
              switch</strong> costs a few microseconds directly, plus something sneakier: the
              incoming thread finds the caches full of someone else’s data. Crossing into the kernel
              at all (a <strong>system call</strong> — every read, write, or send) costs on the
              order of a hundred nanoseconds to a microsecond, which is why batching small I/O into
              bigger calls is a perennial win.
            </p>
            <p>The units of execution, priced:</p>
            <Tbl>
              <table>
                <thead>
                  <tr><th>Unit</th><th>Memory</th><th>Created in</th><th>Switched by</th><th>Isolation</th></tr>
                </thead>
                <tbody>
                  <tr><td>Process</td><td>MBs (own address space)</td><td>~ms</td><td>kernel, µs</td><td>full — crash contained</td></tr>
                  <tr><td>Thread</td><td>~1 MB stack, shared heap</td><td>~10–100 µs</td><td>kernel, µs</td><td>none — shared memory</td></tr>
                  <tr><td>Async task / goroutine</td><td>KBs</td><td>~ns–µs</td><td>runtime, ~ns</td><td>none — cooperative</td></tr>
                </tbody>
              </table>
            </Tbl>
            <p>
              The table explains an architectural fact you will meet again in System Design: a
              thread per connection stops scaling around a few thousand connections (stacks eat RAM,
              switches eat CPU), which is exactly why event loops and lightweight tasks exist. It
              also gives the classic dividing line: <strong>CPU-bound</strong> work wants roughly one
              thread per core and no more; <strong>I/O-bound</strong> work wants many cheap waiters.
            </p>

            <h3>Lie two — “you have memory to yourself”</h3>
            <p>
              The addresses your program sees are <strong>virtual</strong>. Hardware and OS translate
              them, in 4&nbsp;KB <strong>pages</strong>, to wherever the physical bytes actually are
              — with a small cache of translations (the TLB) making the common case free. The fiction
              buys enormous things: processes cannot read each other’s memory, memory can be handed
              out lazily, and a file can be <code>mmap</code>ed straight into your address space.
            </p>
            <p>
              It leaks at the <strong>page fault</strong>. A <em>minor</em> fault (the page exists,
              just not mapped yet) costs microseconds. A <em>major</em> fault means the page is on
              disk — and your “memory access” silently became an SSD read from Stage 1’s ladder.
              This is why swapping servers feel broken rather than slow, and why container memory
              limits matter: exceed them and the <strong>OOM killer</strong> ends your process, no
              exceptions thrown. When you read memory dashboards, know the words: <em>RSS</em> is
              what you actually occupy in RAM; virtual size is merely what you have promised
              yourself.
            </p>

            <h3>Lie three — “what you wrote is on disk”</h3>
            <p>
              A successful <code>write()</code> means your bytes reached the OS <strong>page
              cache</strong> — RAM — not the device. The OS flushes them later, in whatever order it
              likes. Until an <code>fsync</code> on the file completes (and, for new files, one on
              the containing directory), a power cut can erase what your code considers written, and
              can even leave <em>later</em> writes present while <em>earlier</em> ones vanished.
            </p>
            <p>
              Every database you respect is built around taking this seriously: write an intent
              record to an append-only <strong>write-ahead log</strong>, <code>fsync</code> it,{' '}
              <em>then</em> touch the real data structures — so a crash at any moment can be replayed
              or rolled back. You will meet the WAL again under transactions in System Design; it is
              the same idea both times. The professional habit here is modest: know, for anything
              you claim is durable, exactly which line of code makes it so.
            </p>

            <h3>Sharing memory without lying to yourself</h3>
            <p>
              The CPU lie has a sharp edge: threads share the heap, and the scheduler interleaves
              them wherever it pleases. Two threads that each do <code>read, add one, write</code> on
              the same counter can interleave so that one increment vanishes:
            </p>
            <Fig caption="Fig 2 · The lost update — the interleaving the scheduler is allowed to pick">
              <LostUpdate />
            </Fig>
            <p>
              Both threads did everything right, locally; the result is still wrong, and only{' '}
              <em>sometimes</em>, which is what makes data races so expensive to find. The tools, in
              rough order of reach: a <strong>mutex</strong> makes a critical section exclusive
              (cheap uncontended — it is <em>contention</em> that costs, because contention means
              waiting); a <strong>read-write lock</strong> lets readers share; <strong>atomics</strong>{' '}
              (compare-and-swap) handle single-word updates without blocking; and message passing
              sidesteps sharing altogether by giving each piece of data one owner.
            </p>
            <p>
              Locks bring their own failure mode. <strong>Deadlock</strong> needs four conditions at
              once — mutual exclusion, hold-and-wait, no preemption, and a cycle of waiting — and
              the practical defence is boringly effective: define one global order in which locks
              may be taken, and never hold a lock while doing I/O or waiting on anything slow.
            </p>

            <h3>The async alternative</h3>
            <p>
              Instead of many threads blocking on I/O, one thread can ask the kernel “tell me when
              any of these ten thousand sockets is ready” (<code>epoll</code> and friends) and hop
              between whichever are. That is the entire secret of the <strong>event loop</strong>;{' '}
              <code>async/await</code> is syntax for pausing a task at a marked point and resuming
              it later on the same thread. Interleaving still happens — but only at{' '}
              <code>await</code>s, which is why single-threaded async code needs no locks around
              plain state, and why <em>blocking</em> the loop (a long computation, a synchronous
              file read) freezes every task at once. Async wins when you wait a lot on many things;
              threads-per-core win when you compute.
            </p>

            <h3>Where it bites</h3>
            <ul>
              <li>Holding a lock across an <code>await</code> or a network call — you have serialised the system on your slowest dependency.</li>
              <li>CPU-heavy work on the event loop — one busy handler and every connection stalls.</li>
              <li>“Durable” systems with no <code>fsync</code> in sight — find the line or stop using the word.</li>
              <li>Unbounded thread or connection creation under load — the fix is a pool with a queue, which is Stage 6 of System Design in miniature.</li>
            </ul>
            <Callout>
              <code>write()</code> returning is a promise by the OS, not the disk. Every durability
              story you will ever audit reduces to: where, exactly, is the fsync — and what is
              replayed after a crash?
            </Callout>
          </>
        ),

        /* ── Stage 3 ─────────────────────────────────────────────── */
        network: (
          <>
            <p>
              The network is the bottom rung of the latency ladder, and the first place where things
              fail <em>partially</em> — a packet can simply not arrive, and nobody is obliged to
              tell you. Everything the Distributed Systems pathway later makes rigorous begins here
              as plain mechanics. Follow one HTTPS request all the way, layer by layer.
            </p>

            <h3>A name becomes an address</h3>
            <p>
              <strong>DNS</strong> first. Your process asks a resolver; on a miss the resolver walks
              the hierarchy — root servers, then <code>.com</code>, then the domain’s authoritative
              servers — and caches the answer for its <strong>TTL</strong>. Two engineering
              consequences hide in that sentence: DNS is the first cache <em>you</em> configure (a
              5-minute TTL means failover takes up to 5 minutes; a 5-second TTL means constant
              lookups), and DNS is a crude but universal traffic-steering tool — return different
              addresses to different regions and you have routed users before a single packet
              reaches you.
            </p>

            <h3>A connection becomes possible</h3>
            <p>
              <strong>IP</strong> moves packets and promises nothing: loss, duplication, reordering
              are all allowed. <strong>TCP</strong> builds a reliable, ordered byte stream on top —
              but first the two ends must agree to talk: SYN, SYN-ACK, ACK. One round trip before
              any data. <strong>TLS</strong> (1.3) adds identity and encryption for one more round
              trip. Only then does the request itself travel.
            </p>
            <Fig caption="Fig 3 · What a fresh HTTPS request pays before any real work happens">
              <RoundTrips />
            </Fig>
            <p>
              Notice what the diagram is really saying: the wire is mostly <em>idle</em>. The cost
              is not bandwidth — you can buy bandwidth — it is the speed of light applied several
              times in a row. Hence the single most valuable network optimisation in ordinary
              backends: <strong>reuse connections</strong>. Keep-alive and connection pools pay the
              handshake tax once and amortise it over thousands of requests; a service that opens a
              fresh TLS connection per call has tripled its latency floor by choice.
            </p>

            <h3>Reliability, and what it costs</h3>
            <p>
              TCP numbers every byte, acknowledges what arrives, retransmits what does not, and
              paces itself twice over: <strong>flow control</strong> (do not drown the receiver) and{' '}
              <strong>congestion control</strong> (do not drown the network — start slow, speed up
              until loss says stop). Two consequences matter to you. A new connection cannot use
              full bandwidth immediately (slow start — another argument for reuse). And because the
              stream is strictly ordered, one lost packet stalls everything behind it:{' '}
              <strong>head-of-line blocking</strong>. That single defect explains a decade of HTTP
              evolution:
            </p>
            <Tbl>
              <table>
                <thead>
                  <tr><th>Version</th><th>Transport</th><th>Multiplexing</th><th>Head-of-line</th></tr>
                </thead>
                <tbody>
                  <tr><td>HTTP/1.1</td><td>TCP</td><td>none — one request at a time per connection</td><td>at the app: browsers open ~6 connections to fake it</td></tr>
                  <tr><td>HTTP/2</td><td>TCP</td><td>many streams on one connection</td><td>moved down: one lost packet stalls <em>all</em> streams</td></tr>
                  <tr><td>HTTP/3</td><td>QUIC (UDP)</td><td>many independent streams</td><td>per-stream only; also 1-RTT combined handshake</td></tr>
                </tbody>
              </table>
            </Tbl>

            <h3>The socket boundary</h3>
            <p>
              One level down, the API keeps a final surprise: TCP is a stream of bytes, <em>not of
              messages</em>. A single <code>read()</code> may return half a message or three glued
              together, and a large <code>write()</code> may send only part of your buffer. Deciding
              where one message ends is your protocol’s job — a length prefix, a delimiter, or a
              format like HTTP that carries its own framing. Every “it only breaks under load”
              parsing bug traces back to this paragraph.
            </p>

            <h3>Where it bites</h3>
            <ul>
              <li>No timeout on a network call — you have volunteered to wait forever; the OS default is not your SLA.</li>
              <li>Assuming one <code>read()</code> = one message. It equals one <em>some bytes</em>.</li>
              <li>Fresh connection per request — the handshake tax, paid maximally.</li>
              <li>Measuring throughput over a long fat link and blaming bandwidth — throughput on one connection is bounded by window ÷ round-trip time; distance was the problem.</li>
            </ul>
            <Callout>
              Network performance work is the art of removing round trips — fewer of them, over
              shorter distances, on connections you already have. Count trips the way Stage 1
              counted memory accesses; it is the same ladder, lower down.
            </Callout>
          </>
        ),

        /* ── Stage 4 ─────────────────────────────────────────────── */
        cost: (
          <>
            <p>
              You now know what the machine and the network charge. Algorithms are the discipline of
              deciding what to buy, and big-O notation is its grammar: ignore constants and ask one
              question — <em>as the input grows, how fast does the cost grow?</em> That single
              question separates designs that survive success from designs that melt at their first
              real workload.
            </p>

            <h3>The growth classes you actually meet</h3>
            <Tbl>
              <table>
                <thead>
                  <tr><th>Class</th><th>Feels like</th><th>At n = 1,000,000</th><th>Typical source</th></tr>
                </thead>
                <tbody>
                  <tr><td>O(1)</td><td>free</td><td>1 step</td><td>hash lookup, array index</td></tr>
                  <tr><td>O(log n)</td><td>free enough</td><td>~20 steps</td><td>binary search, balanced tree</td></tr>
                  <tr><td>O(n)</td><td>one pass</td><td>10⁶ steps — ms in RAM</td><td>scan, filter, single loop</td></tr>
                  <tr><td>O(n log n)</td><td>a sort</td><td>~2×10⁷ — still fine</td><td>sorting, merge joins</td></tr>
                  <tr><td>O(n²)</td><td>a wall</td><td>10¹² — hours or never</td><td>the accidental nested loop</td></tr>
                  <tr><td>O(2ⁿ)</td><td>a proof you need a new idea</td><td>—</td><td>brute-forcing subsets</td></tr>
                </tbody>
              </table>
            </Tbl>
            <p>
              The one to fear is the quiet O(n²): a loop that calls a function that loops — a{' '}
              <code>contains</code> on a list inside a <code>for</code>, an N+1 query pattern, string
              concatenation in a loop. Fine at n = 100 in the demo, dead at n = 100,000 in
              production. Most real “it fell over” stories are this row.
            </p>

            <h3>The toolbox, by the question you are asking</h3>
            <Tbl>
              <table>
                <thead>
                  <tr><th>You need</th><th>Reach for</th><th>Cost</th><th>Fine print</th></tr>
                </thead>
                <tbody>
                  <tr><td>Find by exact key</td><td>hash table</td><td>O(1) expected</td><td>resizing pauses; no order; hostile keys can degrade</td></tr>
                  <tr><td>Find in sorted data / ranges</td><td>sorted array + binary search, or B-tree</td><td>O(log n)</td><td>the database index, previewed</td></tr>
                  <tr><td>Keep order while inserting</td><td>balanced tree / skip list</td><td>O(log n)</td><td>pointer-chasing — remember Stage 1</td></tr>
                  <tr><td>Always know the max / top-K</td><td>heap</td><td>O(log n) per op</td><td>top-K of a stream in K memory</td></tr>
                  <tr><td>First-in-first-out / undo</td><td>queue / stack</td><td>O(1)</td><td>the backbone of BFS and DFS</td></tr>
                  <tr><td>Relationships, reachability</td><td>graph + BFS/DFS</td><td>O(V + E)</td><td>shortest paths: BFS unweighted, Dijkstra weighted</td></tr>
                </tbody>
              </table>
            </Tbl>
            <p>
              Two refinements keep the grammar honest. <strong>Amortised</strong> analysis explains
              why a dynamic array that occasionally doubles is still O(1) per append — the rare
              expensive step is spread across the cheap ones. And <strong>expected vs worst case</strong>{' '}
              explains why hashing and quicksort dominate in practice despite ugly worst cases: the
              bad case is engineered to be rare. Meanwhile the constants big-O hides still exist —
              an O(n) pass over a contiguous array beats an O(log n) walk through scattered pointers
              for any n you will actually meet. Theory gives the shape; Stage 1 prices it.
            </p>

            <h3>The estimate, worked</h3>
            <p>
              The professional habit this stage installs is the back-of-envelope, so do one honestly.{' '}
              <em>Can a single server handle 10,000 requests per second, if each request does two
              cache reads and one database read?</em>
            </p>
            <ul>
              <li>Per request: 2 × 0.5 ms (same-DC round trips to cache) + 1 × ~5 ms (DB query) ≈ 6 ms of waiting; CPU work perhaps 1 ms.</li>
              <li>10,000 req/s × 1 ms CPU = 10 CPU-seconds per second → 10 cores busy: plausible on a 32-core box.</li>
              <li>The 6 ms of waiting costs no CPU if the server is async — but it does hold ~60 requests in flight (10,000 × 6 ms), so memory per request matters.</li>
              <li>The database is now taking 10,000 reads/s — <em>that</em> is the real question, and you found it in four lines of arithmetic.</li>
            </ul>
            <p>
              Same trick for storage: 100 million users × 2 KB of profile ≈ 200 GB — fits on one
              machine’s SSD easily, fits in RAM on a big one. The point of estimating is rarely the
              number itself; it is discovering <em>which</em> component is the real problem before
              you have built the wrong six.
            </p>

            <h3>Where it bites</h3>
            <ul>
              <li>Optimising before profiling — the slow part is reliably not where intuition points.</li>
              <li>Big-O across the network: an O(n) loop of RPCs is not “linear”, it is n round trips — batch it.</li>
              <li>Small n: for a dozen items, a linear scan of an array beats every clever structure. Constants rule the small.</li>
              <li>Distributing before arithmetic — the estimate above is how you earn the right to stay on one box, which is always the better system.</li>
            </ul>
            <Callout>
              An estimate that is wrong by 2× still saves you from a design that is wrong by 1000×.
              Estimate first; measure after; never rely on adjectives in between.
            </Callout>
          </>
        ),

        /* ── Stage 5 ─────────────────────────────────────────────── */
        maths: (
          <>
            <p>
              This last stage exists for one reason: the AI Engineering pathway assumes a reader who
              is not frightened of three ideas. None of them requires a degree; all of them reward a
              few evenings of real attention. Here is each one taken far enough to be useful.
            </p>

            <h3>Linear algebra — the data structure of ML</h3>
            <p>
              A <strong>vector</strong> is a list of numbers standing in for something — a word, a
              user, an image patch. Once things are vectors, geometry becomes meaning: the{' '}
              <strong>dot product</strong> measures how aligned two vectors are, and its normalised
              form, <strong>cosine similarity</strong>, is precisely the operation behind “find me
              documents similar to this query” in the retrieval stage later. Embeddings work because
              training arranges the space so that related things point the same way.
            </p>
            <p>
              A <strong>matrix</strong> is a machine that transforms vectors — stretch, rotate,
              project — and <strong>matrix multiplication</strong> applies one transformation to a
              whole batch of vectors at once. The bookkeeping rule worth internalising: an{' '}
              <code>(m×k)</code> matrix times a <code>(k×n)</code> gives <code>(m×n)</code> — inner
              dimensions must agree; they are what gets “summed away”. When a model card says a layer
              projects 4096 dimensions to 4096, it is describing one such matrix; “more parameters”
              largely means bigger and more numerous matrices. Every one of the exotic words —
              embedding, attention, projection, LoRA — is this operation wearing a costume.
            </p>

            <h3>Calculus — one idea, used a billion times</h3>
            <p>
              The derivative answers a single question: <em>if I nudge this input, how much does the
              output move?</em> The <strong>gradient</strong> is that answer for many inputs at once
              — a vector pointing uphill. Training a network is: measure how wrong the output was (a
              loss), compute the gradient of that loss with respect to every parameter, and step
              each parameter slightly <em>downhill</em>. That is <strong>gradient descent</strong>;
              the <strong>chain rule</strong> is what lets the gradient flow backwards through a
              stack of layers (hence <em>backpropagation</em> — it is the chain rule, applied
              systematically); the <strong>learning rate</strong> is the step size, and almost every
              training pathology — divergence, stagnation — is a step-size story. You need the
              picture and the chain rule; nobody will ask you to integrate anything.
            </p>

            <h3>Probability — the model’s native language</h3>
            <p>
              A language model’s raw output is not text. For every possible next token it emits a
              score; <strong>softmax</strong> exponentiates and normalises those scores into a
              probability distribution — and <strong>temperature</strong> is a knob that divides the
              scores first, sharpening the distribution toward the favourite (low T) or flattening
              it toward variety (high T). Sampling from the distribution is what produces words.
              This is also why the same prompt yields different answers, and why “the model said” is
              a draw from a distribution, not a verdict.
            </p>
            <p>
              Three more terms carry you a long way: <strong>expectation</strong> (the long-run
              average — what an eval score estimates), <strong>conditional probability</strong>{' '}
              (probability <em>given</em> what you already know — the model is one big conditional
              distribution over the next token given the context), and the idea that training
              maximises the probability of the data (<em>log-likelihood</em> — the log is there so
              that multiplying many probabilities becomes adding many logs).
            </p>

            <h3>How much is enough?</h3>
            <p>
              Enough to read the AI pathway without flinching: cosine similarity, matmul shapes,
              gradient + chain rule + learning rate, softmax + temperature, expectation. The linked
              book covers exactly this subset properly; the 3Blue1Brown series makes the geometry
              visceral in an evening. Resist the completionist detour into proofs — you can always
              return for them once something concrete demands it.
            </p>
            <Callout>
              Every modern model is matrix multiplication plus a simple nonlinearity, repeated, and
              trained by nudging numbers downhill. The mystery is scale, not mechanism.
            </Callout>
            <p>
              That closes the foundations. You can price a line of code, name the fictions your
              process lives inside, follow a request across the wire, estimate before you build, and
              read ML’s notation without flinching. The next pathway takes the one assumption still
              standing — that you are on a single machine — and removes it.
            </p>
          </>
        ),
      }}
    />
  )
}
