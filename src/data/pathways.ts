/**
 * /learning — the full curriculum, four pathways, written and hosted here.
 *
 * This file holds the structure: every pathway, every chapter, and the free
 * external reading attached to each. The chapter prose itself lives in the
 * content modules under src/app/learning/_content — every chapter is written
 * in full, one page per chapter, and a chapter listed here without prose
 * there fails the static build.
 *
 * The old "Data & Storage" track did not survive as a separate pathway — a
 * storage engine only matters in the context of the system around it, so its
 * material lives in the middle stages of System Design.
 *
 * Every external link is free to read and goes straight to its author.
 */

export type ResourceType = 'paper' | 'course' | 'video' | 'book' | 'docs' | 'article' | 'repo'

export interface Resource {
  title: string
  source: string
  url: string
  type: ResourceType
  /** one line on why this link earns its place */
  note: string
}

export interface Stage {
  id: string
  title: string
  /** where the reader stands when the stage begins — one sentence */
  lede: string
  resources: Resource[]
}

export interface Pathway {
  id: string
  /** 01, 02… — the order the pathways are meant to be walked */
  index: number
  title: string
  tagline: string
  blurb: string
  hex: string
  /** what "professional" means at the end of this track */
  outcomes: string[]
  /** total reading time of the course */
  minutes: number
  stages: Stage[]
}

export const TYPE_LABEL: Record<ResourceType, string> = {
  paper: 'Paper',
  course: 'Course',
  video: 'Video',
  book: 'Book',
  docs: 'Docs',
  article: 'Article',
  repo: 'Repo',
}

export const PATHWAYS: Pathway[] = [
  /* ═══════════════════════════════════════════════════════════════════
     01 · FOUNDATIONS
     ═══════════════════════════════════════════════════════════════════ */
  {
    id: 'foundations',
    index: 1,
    title: 'Foundations',
    tagline: 'One small service, followed all the way down',
    blurb:
      'We follow hitcount, a small service that counts page views for a blog, from source code to process, through its bytes, caches, kernel, concurrent requests and network path, then estimate, profile and question its numbers. Each chapter starts from something that went wrong with it and works out why.',
    hex: '#7BD88F',
    minutes: 115,
    outcomes: [
      'Pick a representation for a counter, an average or a string knowing where it breaks',
      'Estimate what a request costs in cache misses, system calls and round trips before building it',
      'Explain a kill with exit code 137, a throttled container and a lost write from what the kernel does',
      'Say what each lock in a program protects, and find a lost update or deadlock from its symptoms',
      'Go from a latency regression to its cause with percentiles, the USE method and the right profile',
    ],
    stages: [
      {
        id: 'how-code-runs',
        title: 'From source code to a running process',
        lede: 'We meet hitcount and follow it from Go source to machine instructions, a process, its system calls and the stack trace it prints when it crashes.',
        resources: [
          {
            title: 'Putting the “You” in CPU',
            source: 'cpu.land — Lexi Mattick & Hack Club',
            url: 'https://cpu.land/',
            type: 'article',
            note: 'From pressing enter to a running process, told with rigour and jokes. The best zero-to-one read on execution.',
          },
        ],
      },
      {
        id: 'data-representation',
        title: 'Bits, numbers and text',
        lede: 'A total that went negative, an average that stopped moving and a title that turned into “CafÃ©”: three representation edges, found the hard way.',
        resources: [
          {
            title: 'The Absolute Minimum Every Software Developer Must Know About Unicode',
            source: 'Nikita Prokopov',
            url: 'https://tonsky.me/blog/unicode/',
            type: 'article',
            note: 'The 2023 refresh of the classic. Code points, UTF-8, graphemes — the whole text story in one sitting.',
          },
          {
            title: 'What Every Computer Scientist Should Know About Floating-Point Arithmetic',
            source: 'David Goldberg',
            url: 'https://docs.oracle.com/cd/E19957-01/806-3568/ncg_goldberg.html',
            type: 'paper',
            note: 'The canonical reference. Skim the first half; keep it bookmarked for the day a float bug finds you.',
          },
        ],
      },
      {
        id: 'machine',
        title: 'The machine underneath',
        lede: 'The same code, 2,500 times more pages: why the answer depends on caches and layout more than on the sort.',
        resources: [
          {
            title: 'Teach Yourself Computer Science',
            source: 'Ozan Onay & Myles Byrne',
            url: 'https://teachyourselfcs.com/',
            type: 'article',
            note: 'If you want the full self-taught CS path, take this reading order rather than assembling your own.',
          },
          {
            title: 'Interactive latency numbers',
            source: 'Colin Scott',
            url: 'https://colin-scott.github.io/personal_website/research/interactive_latency.html',
            type: 'docs',
            note: 'The latency ladder as an interactive chart, year by year. Worth revisiting until the ratios are reflex.',
          },
        ],
      },
      {
        id: 'os',
        title: 'The operating system’s three lies',
        lede: 'A throttled container, a silent kill with exit code 137 and a snapshot lost in a power cut, each explained by a promise the kernel keeps imperfectly.',
        resources: [
          {
            title: 'Operating Systems: Three Easy Pieces',
            source: 'Arpaci-Dusseau, Wisconsin',
            url: 'https://pages.cs.wisc.edu/~remzi/OSTEP/',
            type: 'book',
            note: 'Free in full, and genuinely enjoyable. Virtualisation, concurrency, persistence — the three lies, chapter by chapter.',
          },
        ],
      },
      {
        id: 'concurrency',
        title: 'Concurrency: two requests, one counter',
        lede: '100,000 hits go in and 97,412 come out. Lost updates, the invariants locks protect, and a deadlock in the snapshot code.',
        resources: [
          {
            title: 'Rust Atomics and Locks',
            source: 'Mara Bos',
            url: 'https://marabos.nl/atomics/',
            type: 'book',
            note: 'Free in full. Nominally Rust, actually the clearest modern treatment of atomics, ordering and locks in print.',
          },
        ],
      },
      {
        id: 'network',
        title: 'One request across the network',
        lede: 'The handler takes 40 µs and the reader waits 800 ms. Where the rest goes, and what the network loses without telling anyone.',
        resources: [
          {
            title: 'Computer Networks: A Systems Approach',
            source: 'Peterson & Davie',
            url: 'https://book.systemsapproach.org/',
            type: 'book',
            note: 'Free and open-source. The standard networks text, kept current.',
          },
          {
            title: 'Beej’s Guide to Network Programming',
            source: 'Brian Hall',
            url: 'https://beej.us/guide/bgnet/',
            type: 'book',
            note: 'Sockets from first principles. Short, funny, and it makes the abstractions concrete.',
          },
        ],
      },
      {
        id: 'cost',
        title: 'Reasoning about cost',
        lede: 'Can one machine count views for 5 million pages? Growth rates, a hidden quadratic, and an estimate that finds the real bottleneck.',
        resources: [
          {
            title: 'Algorithms',
            source: 'Jeff Erickson, Illinois',
            url: 'https://jeffe.cs.illinois.edu/teaching/algorithms/',
            type: 'book',
            note: 'Free textbook plus problem sets. Rigorous and unusually well written.',
          },
        ],
      },
      {
        id: 'performance',
        title: 'Measuring before believing',
        lede: 'p99 jumps from 4 ms to 900 ms after a release while the median stays put. Tracing it to a cause with percentiles, USE and the right profile.',
        resources: [
          {
            title: 'The USE Method',
            source: 'Brendan Gregg',
            url: 'https://www.brendangregg.com/usemethod.html',
            type: 'article',
            note: 'A checklist that turns “it is slow” into a systematic search. Memorise the three words.',
          },
          {
            title: 'Flame Graphs',
            source: 'Brendan Gregg',
            url: 'https://www.brendangregg.com/flamegraphs.html',
            type: 'docs',
            note: 'The visualisation that made profiles readable, explained by its inventor.',
          },
        ],
      },
      {
        id: 'languages',
        title: 'Languages and runtimes',
        lede: 'What the compiler and garbage collector do on hitcount’s behalf, what they charge, and whether a rewrite in another language would change anything.',
        resources: [
          {
            title: 'Crafting Interpreters',
            source: 'Robert Nystrom',
            url: 'https://craftinginterpreters.com/',
            type: 'book',
            note: 'Free in full. Build two interpreters by hand; languages stop being magic about halfway through the first.',
          },
        ],
      },
      {
        id: 'maths',
        title: 'The mathematics you will actually use',
        lede: 'Averages, percentiles, sampling error, hash collisions, vectors, gradients and softmax, each worked by hand on hitcount’s own data.',
        resources: [
          {
            title: 'Mathematics for Machine Learning',
            source: 'Deisenroth, Faisal & Ong',
            url: 'https://mml-book.github.io/',
            type: 'book',
            note: 'Free PDF. Exactly the subset of maths ML needs, without a full undergraduate detour.',
          },
          {
            title: 'Essence of Linear Algebra',
            source: '3Blue1Brown',
            url: 'https://www.3blue1brown.com/topics/linear-algebra',
            type: 'video',
            note: 'Builds the geometric intuition first. Watch before, or alongside, any formal treatment.',
          },
        ],
      },
    ],
  },

  /* ═══════════════════════════════════════════════════════════════════
     02 · DISTRIBUTED SYSTEMS
     ═══════════════════════════════════════════════════════════════════ */
  {
    id: 'distributed-systems',
    index: 2,
    title: 'Distributed Systems',
    tagline: 'One wallet service, from one machine to three in two data centres',
    blurb:
      'A payments wallet carries all ten chapters. It starts on one server; then a transfer times out and nobody knows whether it happened. From there we make retries safe, order updates without trusting clocks, replicate balances, elect a leader, fence the old one, move money between shards, and test whether any of it holds. System Design leans on every chapter here.',
    hex: '#5EE9D5',
    minutes: 120,
    outcomes: [
      'Design a money-moving call that is safe to retry after a timeout',
      'Decide which of two updates came first without comparing timestamps',
      'Choose a consistency guarantee for each read path and say what it costs',
      'Trace a Raft election and log commit, and explain why a deposed leader loses nothing committed',
      'Fence a paused leaseholder so its late writes are rejected',
      'Pick between two-phase commit and a saga from the invariant you need',
      'Write a system’s guarantees as checks and choose how to test them',
    ],
    stages: [
      {
        id: 'partial-failure',
        title: 'Partial failure',
        lede: 'Asha sends ₹500 and the call times out. Did the money move? Across a network, the honest answer is often “not known yet”.',
        resources: [
          {
            title: 'Notes on Distributed Systems for Young Bloods',
            source: 'Jeff Hodges',
            url: 'https://www.somethingsimilar.com/2013/01/14/notes-on-distributed-systems-for-young-bloods/',
            type: 'article',
            note: 'The single best first read. Hard-won operational advice, no maths, ages extremely well.',
          },
          {
            title: 'Distributed Systems (lecture series)',
            source: 'Martin Kleppmann, Cambridge',
            url: 'https://www.youtube.com/playlist?list=PLeKd45zvjcDFUEv_ohr_HdUFe97RItdiB',
            type: 'video',
            note: 'Eight lectures that take you from clocks to consensus without hand-waving.',
          },
          {
            title: 'Distributed Systems lecture notes',
            source: 'Martin Kleppmann, Cambridge',
            url: 'https://www.cl.cam.ac.uk/teaching/2122/ConcDisSys/dist-sys-notes.pdf',
            type: 'book',
            note: 'The written companion to the lectures — worth reading even on its own.',
          },
        ],
      },
      {
        id: 'rpc',
        title: 'Talking between machines',
        lede: 'Making the transfer call safe to retry: idempotency keys, deadlines, errors the caller can act on, and messages that survive a rolling deploy.',
        resources: [
          {
            title: 'A Note on Distributed Computing',
            source: 'Waldo, Wyant, Wollrath & Kendall (Sun, 1994)',
            url: 'https://scholar.harvard.edu/files/waldo/files/waldo-94.pdf',
            type: 'paper',
            note: 'Thirty years old and still the definitive case for why remote calls must not pretend to be local ones.',
          },
          {
            title: 'gRPC documentation',
            source: 'grpc.io',
            url: 'https://grpc.io/docs/what-is-grpc/introduction/',
            type: 'docs',
            note: 'A production RPC stack documenting its own choices: contracts, streaming, deadlines, retries.',
          },
        ],
      },
      {
        id: 'time',
        title: 'Time and order',
        lede: 'A freeze and an unfreeze land on two machines whose clocks disagree. Order has to come from messages, and sometimes there is none to find.',
        resources: [
          {
            title: 'Time, Clocks, and the Ordering of Events in a Distributed System',
            source: 'Leslie Lamport',
            url: 'https://lamport.azurewebsites.net/pubs/time-clocks.pdf',
            type: 'paper',
            note: 'The 1978 paper that defines happens-before. Short, and everything else assumes you have read it.',
          },
        ],
      },
      {
        id: 'replication',
        title: 'Replication and consistency',
        lede: 'Three copies of the wallet in two data centres. Asha sends money, refreshes, and sees her old balance.',
        resources: [
          {
            title: 'Consistency Models',
            source: 'Jepsen',
            url: 'https://jepsen.io/consistency',
            type: 'docs',
            note: 'A map of every model and how they relate. Keep it open while you read anything else on this topic.',
          },
          {
            title: 'Please stop calling databases CP or AP',
            source: 'Martin Kleppmann',
            url: 'https://martin.kleppmann.com/2015/05/11/please-stop-calling-databases-cp-or-ap.html',
            type: 'article',
            note: 'Why the CAP theorem is narrower than the way people cite it, and what to reason about instead.',
          },
          {
            title: 'Jepsen analyses',
            source: 'Kyle Kingsbury',
            url: 'https://jepsen.io/analyses',
            type: 'article',
            note: 'Real databases tested to destruction. Read one for a system you use — it will change how you trust it.',
          },
        ],
      },
      {
        id: 'broadcast',
        title: 'Broadcast, gossip and ordering guarantees',
        lede: 'Every balance change has several listeners. Each needs a different guarantee about missing and reordered events, at a different price.',
        resources: [
          {
            title: 'Gossip Glomers — distributed systems challenges',
            source: 'Fly.io & Kyle Kingsbury',
            url: 'https://fly.io/dist-sys/',
            type: 'course',
            note: 'Free, hands-on, brilliant: implement broadcast, ordering and replication against a real test harness.',
          },
        ],
      },
      {
        id: 'consensus',
        title: 'Consensus',
        lede: 'The wallet’s replicas choose their own leader, never two at once, and never forget a transfer they acknowledged.',
        resources: [
          {
            title: 'In Search of an Understandable Consensus Algorithm (Raft)',
            source: 'Ongaro & Ousterhout',
            url: 'https://raft.github.io/raft.pdf',
            type: 'paper',
            note: 'Consensus written to be taught rather than to be clever. Read this before Paxos.',
          },
          {
            title: 'The Raft visualisation',
            source: 'raft.github.io',
            url: 'https://raft.github.io/',
            type: 'docs',
            note: 'Watch elections and log replication happen. Kill a node mid-flight and see what recovers.',
          },
          {
            title: '6.824 / 6.5840 Distributed Systems',
            source: 'MIT',
            url: 'https://pdos.csail.mit.edu/6.824/',
            type: 'course',
            note: 'Lectures, papers and the labs where you implement Raft yourself. The labs are the point.',
          },
        ],
      },
      {
        id: 'coordination',
        title: 'Membership, failure detection and coordination',
        lede: 'A wallet server pauses for fifteen seconds, loses its lease, and wakes up still acting as owner. The storage has to say no.',
        resources: [
          {
            title: 'SWIM: Scalable Weakly-consistent Infection-style Process Group Membership',
            source: 'Das, Gupta & Motivala (Cornell)',
            url: 'https://www.cs.cornell.edu/projects/Quicksilver/public_pdfs/SWIM.pdf',
            type: 'paper',
            note: 'The membership protocol under Consul and friends. Readable, and the amplification trick is lovely.',
          },
          {
            title: 'ZooKeeper: Wait-free coordination for Internet-scale systems',
            source: 'Hunt et al., USENIX ATC 2010',
            url: 'https://www.usenix.org/legacy/event/atc10/tech/full_papers/Hunt.pdf',
            type: 'paper',
            note: 'How a small ordered kernel becomes locks, elections and config for everyone else.',
          },
        ],
      },
      {
        id: 'txns',
        title: 'Distributed transactions',
        lede: 'Asha is on shard 3 and Ravi on shard 11. Moving ₹500 between them means two-phase commit or a saga, and each has a price.',
        resources: [
          {
            title: 'Large-scale Incremental Processing Using Distributed Transactions (Percolator)',
            source: 'Peng & Dabek, Google, OSDI 2010',
            url: 'https://static.googleusercontent.com/media/research.google.com/en//pubs/archive/36726.pdf',
            type: 'paper',
            note: 'Cross-row transactions conjured from Bigtable primitives. The pattern behind several modern databases.',
          },
        ],
      },
      {
        id: 'shipped',
        title: 'Systems that shipped',
        lede: 'Dynamo, Spanner, Kafka, etcd and MapReduce read as sets of choices, and what the wallet would get from building on each.',
        resources: [
          {
            title: 'Dynamo: Amazon’s Highly Available Key-value Store',
            source: 'Amazon, SOSP 2007',
            url: 'https://www.allthingsdistributed.com/files/amazon-dynamo-sosp2007.pdf',
            type: 'paper',
            note: 'Consistent hashing, vector clocks, quorums and hinted handoff — the ancestor of a whole generation of stores.',
          },
          {
            title: 'Spanner: Google’s Globally-Distributed Database',
            source: 'Google, OSDI 2012',
            url: 'https://static.googleusercontent.com/media/research.google.com/en//archive/spanner-osdi2012.pdf',
            type: 'paper',
            note: 'What becomes possible when you treat clock uncertainty as a number you can bound rather than ignore.',
          },
          {
            title: 'MapReduce: Simplified Data Processing on Large Clusters',
            source: 'Google, OSDI 2004',
            url: 'https://static.googleusercontent.com/media/research.google.com/en//archive/mapreduce-osdi04.pdf',
            type: 'paper',
            note: 'Historically important and still the clearest statement of moving computation to data.',
          },
        ],
      },
      {
        id: 'testing',
        title: 'Breaking it on purpose',
        lede: 'Turning the wallet’s guarantees into checks, then trying to break them with recorded histories, injected faults, simulation and model checking.',
        resources: [
          {
            title: 'The TLA+ Home Page',
            source: 'Leslie Lamport',
            url: 'https://lamport.azurewebsites.net/tla/tla.html',
            type: 'docs',
            note: 'Specification as thinking tool. The video course linked there is surprisingly watchable.',
          },
          {
            title: 'Principles of Chaos Engineering',
            source: 'principlesofchaos.org',
            url: 'https://principlesofchaos.org/',
            type: 'article',
            note: 'One page, community-written, and the discipline’s charter: hypotheses, blast radius, production truth.',
          },
        ],
      },
    ],
  },

  /* ═══════════════════════════════════════════════════════════════════
     03 · SYSTEM DESIGN
     ═══════════════════════════════════════════════════════════════════ */
  {
    id: 'system-design',
    index: 3,
    title: 'System Design',
    tagline: 'One product, designed end to end, every choice argued',
    blurb:
      'We design Dabba, a food-ordering and delivery app working across Indian cities, from the first request a customer makes to a system that survives its own failures. Each chapter adds what the product needs next and argues the choice from Dabba’s numbers: an order API that is safe to retry, caches and a CDN for a read-heavy menu, storage and a data model for orders, a correct write path, then sharding, streams, live rider locations, background jobs, rate limits, security, failure handling and a second region. It closes with a worked design and an atlas of the classic problems.',
    hex: '#4C8BF5',
    minutes: 300,
    outcomes: [
      'Turn a product brief into peak rates, storage growth and a latency budget, with the arithmetic shown',
      'Design an order API whose retries never create a second order or a second charge',
      'Choose what to cache, for how long and how it is invalidated, from what a stale copy would cause',
      'Pick a store and its indexes for each data set from its write rate, read pattern and cost of loss',
      'Name the anomaly your isolation level allows and the smallest mechanism that prevents it',
      'Design the failure path with the same care as the success path',
      'Pick the right sketch, index or ID scheme from the constraint, not the fashion',
      'Take a vague product ask to a justified design in forty-five minutes',
    ],
    stages: [
      {
        id: 'request',
        title: 'The brief, and one request end to end',
        lede: 'Who uses Dabba, how much, and at what peak; then where the time goes when a customer opens the app at 8 pm, and how an optional service can take the home screen down.',
        resources: [
          {
            title: 'High Performance Browser Networking',
            source: 'Ilya Grigorik',
            url: 'https://hpbn.co/',
            type: 'book',
            note: 'Free in full. What actually happens between a client and your server — latency, TCP, TLS, HTTP/2.',
          },
        ],
      },
      {
        id: 'api',
        title: 'Designing the API',
        lede: 'The contract for placing an order, written so that a lost response and a second tap still produce one order and one charge, and so that months-old app versions keep working.',
        resources: [
          {
            title: 'Zalando RESTful API Guidelines',
            source: 'Zalando',
            url: 'https://opensource.zalando.com/restful-api-guidelines/',
            type: 'docs',
            note: 'A real company’s complete, argued API rulebook — steal the reasoning, not just the rules.',
          },
          {
            title: 'API Improvement Proposals',
            source: 'Google',
            url: 'https://google.aip.dev/',
            type: 'docs',
            note: 'How Google designs APIs, one numbered decision at a time. Excellent on naming, paging and errors.',
          },
        ],
      },
      {
        id: 'gateway',
        title: 'Load balancing, gateways and discovery',
        lede: 'Why Dabba runs thirty servers where twenty would do, how the balancer picks one, what the gateway checks first, and how a health check can remove a healthy fleet.',
        resources: [
          {
            title: 'Introduction to modern network load balancing and proxying',
            source: 'Matt Klein (Envoy)',
            url: 'https://blog.envoyproxy.io/introduction-to-modern-network-load-balancing-and-proxying-a57f6ff80236',
            type: 'article',
            note: 'The canonical map of the territory, from the author of Envoy. Everything else is a footnote to this.',
          },
        ],
      },
      {
        id: 'reads',
        title: 'Scaling reads',
        lede: 'The menu is read sixteen times for every order. Caching it means deciding, part by part, how stale each piece may be, and defending against races, stampedes and cold starts.',
        resources: [
          {
            title: 'The System Design Primer',
            source: 'Donne Martin',
            url: 'https://github.com/donnemartin/system-design-primer',
            type: 'repo',
            note: 'The most complete free reference. Skim the index, then read only the sections you cannot explain aloud.',
          },
        ],
      },
      {
        id: 'cdn',
        title: 'The edge: CDNs and static delivery',
        lede: 'Dish photos and public menus served from near the customer, with URLs that never need purging and headers that never show one customer another’s orders.',
        resources: [
          {
            title: 'What is a CDN?',
            source: 'Cloudflare Learning Center',
            url: 'https://www.cloudflare.com/learning/cdn/what-is-a-cdn/',
            type: 'docs',
            note: 'Clear, vendor-written but honest. Read the whole learning-center CDN section in an hour.',
          },
        ],
      },
      {
        id: 'storage',
        title: 'Where the data actually lives',
        lede: 'Orders, menus, rider locations and photos behave differently. We open the two common storage engines and give each data set the home that fits it.',
        resources: [
          {
            title: 'CMU 15-445 Database Systems',
            source: 'Andy Pavlo, Carnegie Mellon',
            url: 'https://15445.courses.cs.cmu.edu/',
            type: 'course',
            note: 'Full lectures, slides and assignments online. The best free database internals course there is.',
          },
          {
            title: 'Use The Index, Luke',
            source: 'Markus Winand',
            url: 'https://use-the-index-luke.com/',
            type: 'book',
            note: 'Free in full. SQL indexing explained from the developer side rather than the DBA side.',
          },
          {
            title: 'RocksDB wiki',
            source: 'Meta',
            url: 'https://github.com/facebook/rocksdb/wiki',
            type: 'docs',
            note: 'A production LSM engine documenting its own tradeoffs — compaction, write amplification, tuning.',
          },
        ],
      },
      {
        id: 'modeling',
        title: 'Data modelling across paradigms',
        lede: 'Which facts an order copies and freezes, which it references, why a history screen made 141 queries, and what the same data looks like in a key-value store.',
        resources: [
          {
            title: 'SQLBolt',
            source: 'sqlbolt.com',
            url: 'https://sqlbolt.com/',
            type: 'course',
            note: 'If SQL itself is the gap, close it here in an afternoon — interactive, free, zero setup.',
          },
          {
            title: 'Advanced Design Patterns for DynamoDB',
            source: 'Rick Houlihan, AWS re:Invent',
            url: 'https://www.youtube.com/watch?v=HaEPXoXVf2k',
            type: 'video',
            note: 'The famous talk: watch someone model relational problems onto a key-value store at speed.',
          },
        ],
      },
      {
        id: 'writes',
        title: 'Getting writes right',
        lede: 'Forty customers tap Place order for the last twelve thalis. What the database guarantees, where its guarantees stop, and how to stay correct when payment happens somewhere else.',
        resources: [
          {
            title: 'A Critique of ANSI SQL Isolation Levels',
            source: 'Berenson et al.',
            url: 'https://www.microsoft.com/en-us/research/wp-content/uploads/2016/02/tr-95-51.pdf',
            type: 'paper',
            note: 'Why the standard isolation levels are underspecified, and what the anomalies really are.',
          },
          {
            title: 'Readings in Database Systems (the Red Book)',
            source: 'Bailis, Hellerstein, Stonebraker',
            url: 'http://www.redbook.io/',
            type: 'book',
            note: 'Free in full. A curated tour of the field with editorial commentary on why each paper mattered.',
          },
        ],
      },
      {
        id: 'sharding',
        title: 'Sharding and partitioning',
        lede: 'Dabba’s orders outgrow one database. Choosing the shard key decides which queries stay on one machine and which must ask them all.',
        resources: [
          {
            title: 'Vitess: sharding concepts',
            source: 'vitess.io',
            url: 'https://vitess.io/docs/reference/features/sharding/',
            type: 'docs',
            note: 'A system that sharded MySQL for YouTube explaining keyspaces, vindexes and resharding for real.',
          },
        ],
      },
      {
        id: 'streams',
        title: 'Streams and the log',
        lede: 'Placing an order owes work to six other systems. An append-only log lets the order service record it once and lets each reader catch up in its own time.',
        resources: [
          {
            title: 'The Log: what every software engineer should know about real-time data',
            source: 'Jay Kreps, LinkedIn',
            url: 'https://engineering.linkedin.com/distributed-systems/log-what-every-software-engineer-should-know-about-real-time-datas-unifying',
            type: 'article',
            note: 'Long, and worth every paragraph. The log as the unifying abstraction behind replication, streams and integration.',
          },
          {
            title: 'Engineering blogs, aggregated',
            source: 'This site',
            url: '/tech-blogs',
            type: 'docs',
            note: 'The companion to this course — primary writing from the teams who ran these systems in production.',
          },
        ],
      },
      {
        id: 'derived',
        title: 'Derived data: search, analytics and change capture',
        lede: 'Search, analytics and per-customer history are copies of the truth. Build them from the commit log, promise how fresh they are, and make sure they can be rebuilt.',
        resources: [
          {
            title: 'Inverted index',
            source: 'Elasticsearch: The Definitive Guide',
            url: 'https://www.elastic.co/guide/en/elasticsearch/guide/current/inverted-index.html',
            type: 'docs',
            note: 'The data structure under every search box, in a few pages.',
          },
          {
            title: 'Event Sourcing',
            source: 'Martin Fowler',
            url: 'https://martinfowler.com/eaaDev/EventSourcing.html',
            type: 'article',
            note: 'The pattern from the person who named half of them — including the caveats people skip.',
          },
        ],
      },
      {
        id: 'sketches',
        title: 'Counting at scale: probabilistic structures',
        lede: 'Unique menu viewers and trending dishes, live and merged across servers: when a small, calculable error buys kilobytes instead of gigabytes, and when it does not.',
        resources: [
          {
            title: 'Bloom Filters by Example',
            source: 'Bill Mill',
            url: 'https://llimllib.github.io/bloomfilter-tutorial/',
            type: 'docs',
            note: 'Interactive: watch the bits set and the false-positive rate move as you type.',
          },
          {
            title: 'Probabilistic data structures',
            source: 'Redis documentation',
            url: 'https://redis.io/docs/latest/develop/data-types/probabilistic/',
            type: 'docs',
            note: 'HyperLogLog, Bloom, count–min and top-K as production tools, with their error bounds stated.',
          },
        ],
      },
      {
        id: 'geo',
        title: 'Geospatial indexing and proximity',
        lede: 'Restaurants that deliver here, and the nearest free rider right now: two nearness questions that need cells, neighbours and very different storage.',
        resources: [
          {
            title: 'H3 documentation',
            source: 'h3geo.org (Uber)',
            url: 'https://h3geo.org/docs/',
            type: 'docs',
            note: 'The hexagonal index that powers ride-matching analytics, explaining its own design choices.',
          },
          {
            title: 'Geospatial data type',
            source: 'Redis documentation',
            url: 'https://redis.io/docs/latest/develop/data-types/geospatial/',
            type: 'docs',
            note: 'Geohash-backed radius queries as a working tool — a good first implementation to reason against.',
          },
        ],
      },
      {
        id: 'ids',
        title: 'Identity, time and unique IDs',
        lede: 'Designing Dabba’s order id: unique without coordination, sorted by time, able to find its own shard, and careful about what it reveals.',
        resources: [
          {
            title: 'RFC 9562 — UUIDv7',
            source: 'IETF',
            url: 'https://www.rfc-editor.org/rfc/rfc9562',
            type: 'docs',
            note: 'The modern standard for time-ordered IDs — short, readable, and the reasoning is in the appendices.',
          },
          {
            title: 'Ticket servers: distributed unique primary keys on the cheap',
            source: 'Flickr Engineering',
            url: 'https://code.flickr.net/2010/02/08/ticket-servers-distributed-unique-primary-keys-on-the-cheap/',
            type: 'article',
            note: 'A classic of pragmatic design: two MySQL boxes issuing IDs for one of the largest sites of its era.',
          },
        ],
      },
      {
        id: 'blob',
        title: 'Files, media and blob storage',
        lede: 'Ten million dish photos: the database keeps the facts, object storage keeps the bytes, and the upload never passes through our servers.',
        resources: [
          {
            title: 'Finding a needle in Haystack: Facebook’s photo storage',
            source: 'Beaver et al., OSDI 2010',
            url: 'https://www.usenix.org/legacy/event/osdi10/tech/full_papers/Beaver.pdf',
            type: 'paper',
            note: 'Why filesystems buckle at billions of photos and what a purpose-built blob store looks like.',
          },
        ],
      },
      {
        id: 'realtime',
        title: 'Realtime: live location and push',
        lede: 'The rider on the map and the tablet that must ring: when polling is enough, when to hold a connection open, and what open connections cost.',
        resources: [
          {
            title: 'The WebSocket API',
            source: 'MDN',
            url: 'https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API',
            type: 'docs',
            note: 'The protocol and API without framework fog — enough to reason about any realtime stack above it.',
          },
        ],
      },
      {
        id: 'jobs',
        title: 'Background work: queues, schedulers and cron at scale',
        lede: 'When the customer stops waiting, the work still has to happen exactly once in effect, on time and visibly: queues, retries, poison messages and scheduled jobs for Dabba’s notifications, refunds and payouts.',
        resources: [
          {
            title: 'Distributed periodic scheduling with cron',
            source: 'Google SRE book',
            url: 'https://sre.google/sre-book/distributed-periodic-scheduling/',
            type: 'book',
            note: 'How “run this daily” becomes a leases-and-consensus problem at fleet scale — free chapter.',
          },
        ],
      },
      {
        id: 'ratelimit',
        title: 'Rate limiting and abuse protection',
        lede: 'An OTP endpoint, a script and an SMS bill: deciding how much each caller may ask for, keying limits on what attackers cannot vary, and counting across many machines.',
        resources: [
          {
            title: 'Scaling your API with rate limiters',
            source: 'Stripe Engineering',
            url: 'https://stripe.com/blog/rate-limiters',
            type: 'article',
            note: 'The rare vendor post with real algorithms and real production judgement, including load shedders.',
          },
        ],
      },
      {
        id: 'security',
        title: 'Identity, authorisation and the security basics',
        lede: 'Customers, restaurants and riders read the same order row. Who is calling, which slice of it they may see and when, and how to trust a payment webhook.',
        resources: [
          {
            title: 'OAuth 2.0 Simplified',
            source: 'Aaron Parecki',
            url: 'https://aaronparecki.com/oauth-2-simplified/',
            type: 'article',
            note: 'The flows explained by someone who helps maintain the spec, minus the spec.',
          },
          {
            title: 'OWASP Top Ten',
            source: 'OWASP',
            url: 'https://owasp.org/www-project-top-ten/',
            type: 'docs',
            note: 'The industry’s shared list of how systems actually get broken. Design against it explicitly.',
          },
        ],
      },
      {
        id: 'failure',
        title: 'Designing for failure',
        lede: 'The payment provider slows down at dinner peak and the menus stop loading. Timeouts, retries, breakers, bulkheads and load shedding, worked through with Little’s law.',
        resources: [
          {
            title: 'Site Reliability Engineering',
            source: 'Google',
            url: 'https://sre.google/sre-book/table-of-contents/',
            type: 'book',
            note: 'Free in full. The chapters on SLOs, error budgets and cascading failure repay reading even outside SRE.',
          },
          {
            title: 'The Site Reliability Workbook',
            source: 'Google',
            url: 'https://sre.google/workbook/table-of-contents/',
            type: 'book',
            note: 'The practical companion — how to actually set an SLO rather than admire the idea of one.',
          },
          {
            title: 'How Complex Systems Fail',
            source: 'Richard Cook',
            url: 'https://how.complexsystems.fail/',
            type: 'article',
            note: 'Eighteen short observations about failure. Ten minutes, and it reframes every postmortem you write after it.',
          },
        ],
      },
      {
        id: 'multiregion',
        title: 'Multi-region and disaster recovery',
        lede: 'What an hour without Dabba costs, what a second region costs, why cities make active-active practical, and the drills that show whether failover works.',
        resources: [
          {
            title: 'Static stability using Availability Zones',
            source: 'Amazon Builders’ Library',
            url: 'https://aws.amazon.com/builders-library/static-stability-using-availability-zones/',
            type: 'article',
            note: 'How AWS itself designs to keep working during zone loss — the whole Builders’ Library is free and superb.',
          },
        ],
      },
      {
        id: 'delivery',
        title: 'Shipping safely: deploys, flags and migrations',
        lede: 'Most incidents follow a change. Canaries sized from the signal, flags, schema migrations that keep old and new code working, and rollbacks that are tested.',
        resources: [
          {
            title: 'Feature Toggles (aka Feature Flags)',
            source: 'Pete Hodgson, martinfowler.com',
            url: 'https://martinfowler.com/articles/feature-toggles.html',
            type: 'article',
            note: 'The taxonomy and the traps — release vs ops vs permission flags, and how not to drown in them.',
          },
          {
            title: 'BlueGreenDeployment',
            source: 'Martin Fowler',
            url: 'https://martinfowler.com/bliki/BlueGreenDeployment.html',
            type: 'article',
            note: 'Two pages, and the vocabulary every safe-deploy conversation builds on.',
          },
        ],
      },
      {
        id: 'worked',
        title: 'A worked design, end to end',
        lede: 'Assigning a rider to an order, taken from invariants and numbers through races and failure modes to a table of decisions another engineer can challenge.',
        resources: [
          {
            title: 'System Design in a Hurry',
            source: 'Hello Interview',
            url: 'https://www.hellointerview.com/learn/system-design/in-a-hurry/introduction',
            type: 'docs',
            note: 'A free, sharp condensation of the interview craft — read it after this stage and the structure will feel familiar.',
          },
        ],
      },
      {
        id: 'atlas',
        title: 'The problem atlas: classic designs decomposed',
        lede: 'Familiar design problems placed by their invariant, their dominant ratio and their scarce resource, and mapped to the chapters that make each one hard.',
        resources: [
          {
            title: 'Awesome Scalability',
            source: 'Binh Nguyen (GitHub)',
            url: 'https://github.com/binhnguyennus/awesome-scalability',
            type: 'repo',
            note: 'The reading list of record: real engineering write-ups filed under every pattern this course teaches.',
          },
        ],
      },
    ],
  },

  /* ═══════════════════════════════════════════════════════════════════
     04 · AI ENGINEERING
     ═══════════════════════════════════════════════════════════════════ */
  {
    id: 'ai-engineering',
    index: 4,
    title: 'AI Engineering',
    tagline: 'One support assistant, built from a first classifier to production',
    blurb:
      'We follow a single system through every chapter: a support assistant for a stock-broking app that answers from the help centre, looks up orders and raises tickets. It starts as a message classifier, which teaches how models learn and how to measure them, then becomes a language model with serving costs worked out, prompts written as specifications, retrieval that can be traced, and the customisation, agents, security and evaluation that production needs.',
    hex: '#A78BFA',
    minutes: 150,
    outcomes: [
      'Split data by time, catch leakage, and set a threshold from the cost of each kind of error',
      'Compute a gradient step by hand and say what a pair of training curves is telling you',
      'Explain a wrong answer, a slow reply or a large bill from what the model computes per token',
      'Work out the cost of a conversation and the effect of prompt order on caching',
      'Write a prompt as a specification and get output that code can validate',
      'Build retrieval you can measure, and trace a wrong answer to the stage that lost the passage',
      'Say when an agent loop earns its complexity — and when it doesn’t',
      'Treat prompt injection as a security boundary, not a curiosity',
      'Ship behind evals, so “it seems better” becomes a number',
    ],
    stages: [
      {
        id: 'ml-basics',
        title: 'Learning from data',
        lede: 'We teach a model to sort support messages, and find out how easily a good score can be a false one: splits, leakage, precision, recall and the threshold the fraud desk can staff.',
        resources: [
          {
            title: 'Machine Learning Crash Course',
            source: 'Google',
            url: 'https://developers.google.com/machine-learning/crash-course',
            type: 'course',
            note: 'Short videos, visual exercises, no setup. The fastest honest zero-to-one on supervised learning.',
          },
          {
            title: 'StatQuest',
            source: 'Josh Starmer',
            url: 'https://www.youtube.com/@statquest',
            type: 'video',
            note: 'Every fundamental — bias/variance, ROC, boosting — explained slowly enough to actually stick.',
          },
        ],
      },
      {
        id: 'ml-toolbox',
        title: 'The classical toolbox',
        lede: 'Predicting which conversations will need a human, from account fields: what a linear model cannot see, how a tree picks its questions, and why boosting usually wins on tables.',
        resources: [
          {
            title: 'An Introduction to Statistical Learning',
            source: 'James, Witten, Hastie, Tibshirani',
            url: 'https://www.statlearning.com/',
            type: 'book',
            note: 'Free PDF. The standard text for exactly this stage — read it with the labs, skip nothing in chapters 2–8.',
          },
          {
            title: 'scikit-learn user guide',
            source: 'scikit-learn',
            url: 'https://scikit-learn.org/stable/user_guide.html',
            type: 'docs',
            note: 'Reference docs that double as a course — every classical method with its assumptions and pitfalls.',
          },
        ],
      },
      {
        id: 'deep-learning',
        title: 'Deep learning fundamentals',
        lede: 'When customers say the same thing in different words, hand-built features run out. A network learns its own, and we work its gradient steps through with real numbers.',
        resources: [
          {
            title: 'Neural Networks: Zero to Hero',
            source: 'Andrej Karpathy',
            url: 'https://karpathy.ai/zero-to-hero.html',
            type: 'course',
            note: 'Build backprop, then a language model, from scratch in a notebook. The highest-leverage free ML course.',
          },
          {
            title: 'Neural networks (video series)',
            source: '3Blue1Brown',
            url: 'https://www.3blue1brown.com/topics/neural-networks',
            type: 'video',
            note: 'The geometric intuition for what layers and gradients are doing — watch before Karpathy, not instead.',
          },
          {
            title: 'Practical Deep Learning for Coders',
            source: 'fast.ai',
            url: 'https://course.fast.ai/',
            type: 'course',
            note: 'Top-down and free: train real models first, meet the theory as you need it.',
          },
        ],
      },
      {
        id: 'model',
        title: 'What the model actually does',
        lede: 'Tokens, attention, sampling and frozen weights: what the model computes when it writes a reply, and why a confident wrong answer is its normal output when facts are missing.',
        resources: [
          {
            title: 'Let’s build GPT: from scratch, in code, spelled out',
            source: 'Andrej Karpathy',
            url: 'https://www.youtube.com/watch?v=kCc8FmEb1nY',
            type: 'video',
            note: 'Two hours, and transformers stop being mysterious.',
          },
          {
            title: 'The Illustrated Transformer',
            source: 'Jay Alammar',
            url: 'https://jalammar.github.io/illustrated-transformer/',
            type: 'article',
            note: 'The diagrams most people picture when they think about attention.',
          },
          {
            title: 'Attention Is All You Need',
            source: 'Vaswani et al.',
            url: 'https://arxiv.org/abs/1706.03762',
            type: 'paper',
            note: 'The original transformer paper. Read it after the Karpathy video, not before.',
          },
        ],
      },
      {
        id: 'inference',
        title: 'Serving and inference economics',
        lede: 'Where a reply’s seconds go, why decode waits on memory, what the KV cache costs, and the price of one support conversation worked out turn by turn.',
        resources: [
          {
            title: 'Large Transformer Model Inference Optimization',
            source: 'Lilian Weng',
            url: 'https://lilianweng.github.io/posts/2023-01-10-inference-optimization/',
            type: 'article',
            note: 'The serving-side techniques in one rigorous survey — batching, caching, quantisation, distillation.',
          },
        ],
      },
      {
        id: 'prompting',
        title: 'Prompting and structured output',
        lede: 'Rewriting the assistant’s instructions as a specification, teaching a boundary with examples, and getting decisions that code can validate, plus the one-line edit that broke fraud handling.',
        resources: [
          {
            title: 'Prompt engineering overview',
            source: 'Anthropic documentation',
            url: 'https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/overview',
            type: 'docs',
            note: 'Vendor docs, but the techniques are general and the examples are honest about failure modes.',
          },
        ],
      },
      {
        id: 'context',
        title: 'Context and retrieval',
        lede: 'Choosing which few passages of the help centre the model reads for each question, measuring that choice, and tracing a wrong answer back to the stage that lost the right passage.',
        resources: [
          {
            title: 'Retrieval-Augmented Generation for LLMs: A Survey',
            source: 'Gao et al.',
            url: 'https://arxiv.org/abs/2312.10997',
            type: 'paper',
            note: 'A map of the design space before you commit to one framework’s opinion about it.',
          },
          {
            title: 'Writing on ML systems and RAG',
            source: 'Eugene Yan',
            url: 'https://eugeneyan.com/writing/',
            type: 'article',
            note: 'Practitioner writing on evaluation, retrieval and recommendation, consistently more concrete than most.',
          },
        ],
      },
      {
        id: 'finetune',
        title: 'Fine-tuning, and when a better prompt wins',
        lede: 'Retrieval changes what the model reads; fine-tuning changes how it behaves. Find out which problem the assistant has before paying for the second.',
        resources: [
          {
            title: 'Deep Dive into LLMs like ChatGPT',
            source: 'Andrej Karpathy',
            url: 'https://www.youtube.com/watch?v=7xTGNNLPyMI',
            type: 'video',
            note: 'Three and a half hours covering pretraining, SFT and RLHF end to end — the full picture, honestly told.',
          },
        ],
      },
      {
        id: 'agents',
        title: 'Agents and tools',
        lede: 'The assistant learns to look up orders and raise tickets. Most of the work is in the loop around the model: tool definitions, budgets, stopping rules and approvals.',
        resources: [
          {
            title: 'Building effective agents',
            source: 'Anthropic',
            url: 'https://www.anthropic.com/engineering/building-effective-agents',
            type: 'article',
            note: 'When an agent loop is the right tool and when a single call would have done — with the patterns that hold up.',
          },
          {
            title: '12-Factor Agents',
            source: 'HumanLayer',
            url: 'https://github.com/humanlayer/12-factor-agents',
            type: 'repo',
            note: 'Principles for agents you can actually operate, argued from production experience rather than demos.',
          },
        ],
      },
      {
        id: 'ai-security',
        title: 'Security: injection, exfiltration and least privilege',
        lede: 'A forum post or a customer message can steer the model. Design so that a steered model still cannot leak a customer’s data or act against them.',
        resources: [
          {
            title: 'Prompt injection series',
            source: 'Simon Willison',
            url: 'https://simonwillison.net/series/prompt-injection/',
            type: 'article',
            note: 'The person who named the attack, documenting every variant as it appears in the wild. Start at the top.',
          },
        ],
      },
      {
        id: 'evals',
        title: 'Evaluation: measuring the assistant',
        lede: 'Build an eval set from real tickets, grade it with checks you can trust, and score retrieval apart from generation so the number says what to fix.',
        resources: [
          {
            title: 'Full Stack Deep Learning',
            source: 'FSDL',
            url: 'https://fullstackdeeplearning.com/',
            type: 'course',
            note: 'Free lectures on the parts nobody teaches: testing, deployment, monitoring, and team workflow.',
          },
          {
            title: 'Blog — ML systems in production',
            source: 'Chip Huyen',
            url: 'https://huyenchip.com/blog/',
            type: 'article',
            note: 'The operational side: drift, evaluation, and what breaks between a notebook and production.',
          },
        ],
      },
      {
        id: 'online',
        title: 'In production: monitoring, fallbacks and feedback',
        lede: 'Trace every turn, hold cost and latency to a budget, survive a provider outage, and turn what customers do next into new eval cases.',
        resources: [
          {
            title: 'Your AI product needs evals',
            source: 'Hamel Husain',
            url: 'https://hamel.dev/blog/posts/evals/',
            type: 'article',
            note: 'The full lifecycle from error analysis to CI to production monitoring, drawn from real deployments.',
          },
        ],
      },
    ],
  },
]

export const pathwayById = (id: string) => {
  const p = PATHWAYS.find((x) => x.id === id)
  if (!p) throw new Error(`unknown pathway: ${id}`)
  return p
}

/** the track that follows this one, wrapping at the end */
export const nextPathway = (id: string) => {
  const i = PATHWAYS.findIndex((x) => x.id === id)
  return PATHWAYS[(i + 1) % PATHWAYS.length]
}

export const STAGE_COUNT = PATHWAYS.reduce((n, p) => n + p.stages.length, 0)
export const RESOURCE_COUNT = PATHWAYS.reduce(
  (n, p) => n + p.stages.reduce((k, s) => k + s.resources.length, 0),
  0
)
