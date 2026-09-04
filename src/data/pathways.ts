/**
 * /learning — four structured pathways, written and hosted here.
 *
 * This file holds the structure: which pathways exist, their stages, and the
 * free external reading attached to each stage. The course prose itself lives
 * in the per-track pages under src/app/learning/, because it is writing, not
 * data.
 *
 * The old "Data & Storage" track did not survive as a separate pathway — a
 * storage engine only matters in the context of the system around it, so its
 * material became the middle stages of System Design.
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
  /* ───────────────────────────────────────────────────────────────── */
  {
    id: 'foundations',
    index: 1,
    title: 'Foundations',
    tagline: 'How the machine actually runs your code',
    blurb:
      'Memory, operating systems, networks and the cost model underneath every framework. The slowest track to pay off, and the one that makes the other three legible.',
    hex: '#7BD88F',
    minutes: 80,
    outcomes: [
      'Predict roughly what a line of code costs before running it',
      'Explain what the OS is doing for — and to — your process',
      'Follow a request from socket to socket without hand-waving',
      'Choose a data structure from the shape of the access pattern',
    ],
    stages: [
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

  /* ───────────────────────────────────────────────────────────────── */
  {
    id: 'distributed-systems',
    index: 2,
    title: 'Distributed Systems',
    tagline: 'Why two machines are more than twice as hard as one',
    blurb:
      'Partial failure, disagreement about time, and how a group of unreliable machines pretends to be one reliable one. The theory track — everything in System Design leans on it.',
    hex: '#5EE9D5',
    minutes: 90,
    outcomes: [
      'Treat a timeout as ambiguity, not as an answer',
      'Order events without trusting anyone’s clock',
      'Name the consistency model a system gives you, and what it permits',
      'Explain an election and a replicated log without notes',
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
    ],
  },

  /* ───────────────────────────────────────────────────────────────── */
  {
    id: 'system-design',
    index: 3,
    title: 'System Design',
    tagline: 'From one server to a defensible architecture',
    blurb:
      'The applied track, and the widest: requests, caching, storage engines, transactions, streams and failure. What used to be a separate Data & Storage track lives here now, because a database only makes sense inside the system around it.',
    hex: '#4C8BF5',
    minutes: 120,
    outcomes: [
      'Sketch a latency budget for a request before writing code',
      'Say which cache and which invalidation you chose, and why',
      'Predict whether a workload wants a B-tree or an LSM engine',
      'Name the isolation level you need, not the one you inherited',
      'Design the failure path with the same care as the success path',
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
    ],
  },

  /* ───────────────────────────────────────────────────────────────── */
  {
    id: 'ai-engineering',
    index: 4,
    title: 'AI Engineering',
    tagline: 'Shipping systems that use models, not just calling them',
    blurb:
      'From what a transformer actually computes to retrieval, agents and evaluation. Weighted towards building and measuring rather than training from scratch.',
    hex: '#A78BFA',
    minutes: 90,
    outcomes: [
      'Reason about context, cost and failure from how the model works',
      'Build retrieval that you can measure, not just demo',
      'Say when an agent loop earns its complexity — and when it doesn’t',
      'Ship behind evals, so “it seems better” becomes a number',
    ],
    stages: [
      {
        id: 'model',
        title: 'What the model actually does',
        lede: 'Everything downstream gets easier once the model stops being a black box.',
        resources: [
          {
            title: 'Neural Networks: Zero to Hero',
            source: 'Andrej Karpathy',
            url: 'https://karpathy.ai/zero-to-hero.html',
            type: 'course',
            note: 'Build backprop, then a language model, from scratch in a notebook. The highest-leverage free ML course.',
          },
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
