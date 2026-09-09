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
    tagline: 'How the machine actually runs your code',
    blurb:
      'From source code to silicon and back: execution, data representation, memory, the operating system, concurrency, networks, cost, and the mathematics behind ML. The slowest track to pay off, and the one that makes the other three legible.',
    hex: '#7BD88F',
    minutes: 110,
    outcomes: [
      'Predict roughly what a line of code costs before running it',
      'Explain what the OS is doing for — and to — your process',
      'Reason about races, locks and event loops without superstition',
      'Follow a request from socket to socket without hand-waving',
      'Choose a data structure from the shape of the access pattern',
    ],
    stages: [
      {
        id: 'how-code-runs',
        title: 'From source code to a running process',
        lede: 'Before pricing anything, know what actually happens between hitting run and code executing.',
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
        lede: 'Every mysterious bug involving 0.1 + 0.2, mojibake or overflow is this stage, unlearned.',
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
        lede: 'You write code that works, but you cannot yet say what it costs.',
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
        lede: 'You know memory is slow and caches are fast; now meet the software that hides the machine from you.',
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
        title: 'Concurrency: sharing memory without lying',
        lede: 'The scheduler interleaves your threads wherever it pleases; correctness under that is a discipline.',
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
        title: 'The network is a machine too',
        lede: 'Everything so far happened inside one box. Almost nothing you will build stays there.',
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
        lede: 'You know what the machine and the network charge; algorithms are how you decide what to buy.',
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
        lede: 'Estimates start the argument; profilers end it.',
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
        lede: 'Your language is a machine too — garbage collector, JIT and all — and it has a cost model of its own.',
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
        lede: 'One stage of maths, scoped to what the AI pathway quietly assumes.',
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
    tagline: 'Why two machines are more than twice as hard as one',
    blurb:
      'Partial failure, communication, disagreement about time, replication, consensus, coordination — and how to test any of it. The theory track: everything in System Design leans on it.',
    hex: '#5EE9D5',
    minutes: 115,
    outcomes: [
      'Treat a timeout as ambiguity, not as an answer',
      'Order events without trusting anyone’s clock',
      'Name the consistency model a system gives you, and what it permits',
      'Explain an election and a replicated log without notes',
      'Say how you would break a distributed system before production does',
    ],
    stages: [
      {
        id: 'partial-failure',
        title: 'Partial failure',
        lede: 'On one machine things either work or crash. Add a network, and a third state appears: unknown.',
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
        lede: 'Before the deep theory: the mechanics of one service calling another, and why it can never feel local.',
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
        lede: 'You have accepted that machines fail independently. Now give up on them agreeing what time it is.',
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
        lede: 'Copies make a system available. They also make “what is the current value?” a real question.',
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
        lede: 'Between “send one message” and “agree on everything” sits a family of primitives systems quietly rely on.',
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
        lede: 'Sometimes “roughly agreed” is not enough. Consensus is how machines commit to one answer together.',
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
        lede: 'Consensus gave you a kernel of agreement; this stage is the machinery that puts it to work.',
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
        lede: 'One database promised you atomicity; now the write spans three systems that each promise nothing about the others.',
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
        lede: 'The theory is settled. Now read what happened when three famous systems met production.',
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
        lede: 'A distributed system you have not deliberately broken is a system whose failure modes you are saving for customers.',
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
    tagline: 'From one server to a defensible architecture',
    blurb:
      'The applied track, and the widest: requests, APIs, load balancing, caching, storage, transactions, sharding, streams, derived data, probabilistic structures, geo-indexing, IDs, files, realtime, background jobs, rate limiting, security, resilience, delivery — closing with a worked design and an atlas of the classic problems.',
    hex: '#4C8BF5',
    minutes: 250,
    outcomes: [
      'Sketch a latency budget for a request before writing code',
      'Design an API that survives its clients and its own v2',
      'Say which cache and which invalidation you chose, and why',
      'Predict whether a workload wants a B-tree or an LSM engine',
      'Name the isolation level you need, not the one you inherited',
      'Design the failure path with the same care as the success path',
      'Pick the right sketch, index or ID scheme from the constraint, not the fashion',
      'Take a vague product ask to a justified design in forty-five minutes',
    ],
    stages: [
      {
        id: 'request',
        title: 'Anatomy of a request',
        lede: 'Every system you will ever design is, at bottom, this one picture with more boxes.',
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
        lede: 'The API outlives every implementation behind it; design it like the permanent thing it is.',
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
        lede: 'The boxes between the internet and your code deserve to be understood, not inherited.',
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
        lede: 'Traffic grows read-first. The first real architecture most systems grow is a cache in front of a database.',
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
        lede: 'The fastest request is one that never crosses an ocean; the edge is how you arrange that at scale.',
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
        lede: 'The database stops being a black box: two families of storage engine, and the workloads each one disappoints.',
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
        lede: 'The engine was half the story; the shape you store is the other half, and it is chosen, not discovered.',
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
        lede: 'Reads can be a little stale and nobody dies. Writes are where correctness lives.',
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
        lede: 'Writes outgrow one machine; how you split the data decides which queries stay easy.',
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
        lede: 'Past a certain scale the question changes from “where is the data?” to “in what order did things happen?”',
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
        title: 'Derived data: search, analytics and event sourcing',
        lede: 'One source of truth, many read-optimised shadows — kept honest by the log you just built.',
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
        lede: 'Exact answers cost memory linear in the data; a whole family of structures trades a tunable error for constant space.',
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
        lede: '“Find drivers near me” breaks every index you have met so far; space needs structures of its own.',
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
        lede: 'Auto-increment dies with the single database; whatever replaces it must be unique, fast, and ideally sortable.',
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
        lede: 'The database stores who uploaded the video; something else entirely stores the video.',
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
        title: 'Realtime: websockets, presence and push',
        lede: 'Request–response assumed the client asks; now the server has something to say first.',
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
        lede: 'Not everything happens in a request; the work that happens later needs the same design care, and usually gets none.',
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
        lede: 'Your API will be called too much — by bugs, by scrapers, by your own retries. Decide the rules before the flood.',
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
        lede: 'Every design so far assumed the caller is who they claim; that assumption is a subsystem.',
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
        lede: 'The system works. This stage is about the day it doesn’t, designed in advance.',
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
        lede: 'One region is a single point of failure with excellent marketing; going beyond it is a design, not a checkbox.',
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
        lede: 'Most outages walk in through the front door, wearing a deploy. Ship in a way that assumes so.',
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
        lede: 'Everything in one sitting: a real problem taken from requirements to a defensible architecture, out loud.',
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
        lede: 'The canonical problems, each reduced to the stages that make it hard — the map from prompt to chapter.',
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
    tagline: 'Shipping systems that use models, not just calling them',
    blurb:
      'The whole arc: learning from data, the classical ML toolbox and deep learning fundamentals first — then transformers, serving economics, prompting, retrieval, customisation, agents, security and evaluation. Weighted towards building and measuring.',
    hex: '#A78BFA',
    minutes: 135,
    outcomes: [
      'Ship a defensible classical baseline before reaching for a model API',
      'Train and debug a small network by hand, and read its curves',
      'Reason about context, cost and failure from how the model works',
      'Build retrieval that you can measure, not just demo',
      'Say when an agent loop earns its complexity — and when it doesn’t',
      'Treat prompt injection as a security boundary, not a curiosity',
      'Ship behind evals, so “it seems better” becomes a number',
    ],
    stages: [
      {
        id: 'ml-basics',
        title: 'Learning from data',
        lede: 'Before any neural network: what it means for a machine to learn, and the discipline that keeps you from fooling yourself.',
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
        lede: 'Most production ML is not deep: trees, ensembles and linear models carry tabular data, and knowing them keeps you honest.',
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
        lede: 'Stack linear layers with nonlinearities and train by gradient descent; the questions become why it works, and which knobs matter.',
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
        lede: 'Everything downstream gets easier once the model stops being a black box.',
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
        lede: 'Between the model and your users sits a serving stack with its own physics; its numbers set your product’s.',
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
        lede: 'The lowest rung of the leverage ladder — and the one that solves more problems than its reputation suggests.',
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
        lede: 'The model is fixed; what you control is what it reads. Retrieval is how you control it well.',
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
        title: 'Customisation: fine-tuning and when not to',
        lede: 'The escalation ladder’s top rung — expensive, powerful, and reached far less often than assumed.',
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
        lede: 'Give the model the ability to act, and a new discipline appears: deciding when it should.',
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
        title: 'Security: injection, leakage and sandboxing',
        lede: 'The model reads everything and believes most of it; the systems around it must not.',
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
        title: 'Evaluation and production',
        lede: 'The demo works. This stage is the difference between a demo and a system.',
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
        title: 'In production: feedback, drift and improvement loops',
        lede: 'Offline evals said ship it; now the system meets users, and the measuring must continue.',
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
