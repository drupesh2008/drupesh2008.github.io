/**
 * The /learning curriculum.
 *
 * Every resource linked here is free to read or watch without an account.
 * Nothing is mirrored or reproduced — each entry points at the original
 * author, and the surrounding prose is written for this site.
 *
 * The bar for inclusion: it has to be the thing you would actually send a
 * colleague, not the thing that ranks first. Where a canonical paper exists,
 * the paper wins over a summary of it.
 */

export type ResourceType = 'paper' | 'course' | 'video' | 'book' | 'docs' | 'article' | 'repo'
export type Difficulty = 'foundational' | 'intermediate' | 'advanced'

export interface Resource {
  title: string
  source: string
  url: string
  type: ResourceType
  /** why this one is worth your time, in one line */
  note: string
}

export interface Module {
  id: string
  title: string
  /** what you will actually be able to do afterwards */
  summary: string
  difficulty: Difficulty
  resources: Resource[]
}

export interface Track {
  id: string
  title: string
  tagline: string
  blurb: string
  hex: string
  modules: Module[]
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

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  foundational: 'Foundational',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
}

export const TRACKS: Track[] = [
  /* ───────────────────────────────────────────────────────────────── */
  {
    id: 'distributed-systems',
    title: 'Distributed Systems',
    tagline: 'Why two machines are more than twice as hard as one',
    blurb:
      'The failure modes that only appear once state lives in more than one place: partial failure, disagreement about time, and the difference between a slow node and a dead one. Start here — almost everything in the other tracks is downstream of it.',
    hex: '#5EE9D5',
    modules: [
      {
        id: 'ds-foundations',
        title: 'The shape of the problem',
        summary:
          'Understand what actually changes when a system spans machines, and why the intuitions from single-process code stop holding.',
        difficulty: 'foundational',
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
            note: 'Eight lectures that take you from clocks to consensus without hand-waving. The companion notes are free too.',
          },
          {
            title: 'Distributed Systems lecture notes',
            source: 'Martin Kleppmann, Cambridge',
            url: 'https://www.cl.cam.ac.uk/teaching/2122/ConcDisSys/dist-sys-notes.pdf',
            type: 'book',
            note: 'The written companion to the lectures — worth reading even on its own.',
          },
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
        id: 'ds-consistency',
        title: 'Consistency models',
        summary:
          'Learn to say precisely what guarantee a system gives you, instead of arguing about whether it is "consistent".',
        difficulty: 'intermediate',
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
        id: 'ds-consensus',
        title: 'Replication and consensus',
        summary:
          'Follow how a group of machines agrees on a single ordered log, and why that primitive underpins nearly every strongly consistent system.',
        difficulty: 'advanced',
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
        id: 'ds-realworld',
        title: 'Systems that shipped',
        summary:
          'Read the primary papers behind the storage systems most modern architectures imitate.',
        difficulty: 'advanced',
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
    title: 'System Design',
    tagline: 'Turning a vague requirement into a defensible architecture',
    blurb:
      'Less about memorising architectures and more about the reasoning: what you measure, what you trade away, and how you justify the choice afterwards. Useful for interviews, and considerably more useful for the job itself.',
    hex: '#4C8BF5',
    modules: [
      {
        id: 'sd-primer',
        title: 'The vocabulary',
        summary:
          'Get fluent in the building blocks — load balancing, caching, sharding, queues — so design conversations stop stalling on terminology.',
        difficulty: 'foundational',
        resources: [
          {
            title: 'The System Design Primer',
            source: 'Donne Martin',
            url: 'https://github.com/donnemartin/system-design-primer',
            type: 'repo',
            note: 'The most complete free starting point. Skim the index, then read only the sections you cannot explain aloud.',
          },
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
        id: 'sd-reliability',
        title: 'Reliability and operations',
        summary:
          'Define what "working" means in numbers, and design for the day it stops working rather than the day it ships.',
        difficulty: 'intermediate',
        resources: [
          {
            title: 'Site Reliability Engineering',
            source: 'Google',
            url: 'https://sre.google/sre-book/table-of-contents/',
            type: 'book',
            note: 'Free in full. Chapters on SLOs, error budgets and cascading failure are worth reading even if you never touch SRE.',
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
            note: 'Eighteen short observations about failure in complex systems. Ten minutes, and it reframes every postmortem you write after it.',
          },
        ],
      },
      {
        id: 'sd-scale',
        title: 'Designing for scale',
        summary:
          'Work through how real products handle throughput, hot keys and back-pressure — and where they chose to be imperfect.',
        difficulty: 'advanced',
        resources: [
          {
            title: 'Engineering blogs, aggregated',
            source: 'This site',
            url: '/tech-blogs',
            type: 'docs',
            note: 'The companion to this page — primary writing from the teams who ran these systems in production.',
          },
          {
            title: 'The Log: what every software engineer should know about real-time data',
            source: 'Jay Kreps, LinkedIn',
            url: 'https://engineering.linkedin.com/distributed-systems/log-what-every-software-engineer-should-know-about-real-time-datas-unifying',
            type: 'article',
            note: 'Long, and worth every paragraph. The log as the unifying abstraction behind replication, streams and integration.',
          },
        ],
      },
    ],
  },

  /* ───────────────────────────────────────────────────────────────── */
  {
    id: 'data-storage',
    title: 'Data & Storage',
    tagline: 'What the database is doing while you wait',
    blurb:
      'Indexes, storage engines, query planning and the streaming systems built on top. The track that most reliably turns a slow endpoint into a fast one.',
    hex: '#FFB454',
    modules: [
      {
        id: 'db-internals',
        title: 'Storage engines and indexes',
        summary:
          'Understand B-trees versus LSM-trees well enough to predict which workload each one will disappoint.',
        difficulty: 'intermediate',
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
        id: 'db-theory',
        title: 'Transactions and isolation',
        summary:
          'Learn what your isolation level actually permits, and stop being surprised by anomalies the database considers legal.',
        difficulty: 'advanced',
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
    ],
  },

  /* ───────────────────────────────────────────────────────────────── */
  {
    id: 'ai-engineering',
    title: 'AI Engineering',
    tagline: 'Shipping systems that use models, not just calling them',
    blurb:
      'From how a transformer actually works to retrieval, evaluation and the operational reality of running inference. Weighted towards building and measuring rather than training from scratch.',
    hex: '#A78BFA',
    modules: [
      {
        id: 'ai-transformers',
        title: 'How the model works',
        summary:
          'Build a working mental model of attention and training — enough to reason about cost, context and failure rather than treating it as a black box.',
        difficulty: 'foundational',
        resources: [
          {
            title: 'Neural Networks: Zero to Hero',
            source: 'Andrej Karpathy',
            url: 'https://karpathy.ai/zero-to-hero.html',
            type: 'course',
            note: 'Build backprop, then a language model, from scratch in a notebook. The single highest-leverage free ML course.',
          },
          {
            title: 'Let’s build GPT: from scratch, in code, spelled out',
            source: 'Andrej Karpathy',
            url: 'https://www.youtube.com/watch?v=kCc8FmEb1nY',
            type: 'video',
            note: 'Two hours, and transformers stop being mysterious.',
          },
          {
            title: 'Attention Is All You Need',
            source: 'Vaswani et al.',
            url: 'https://arxiv.org/abs/1706.03762',
            type: 'paper',
            note: 'The original transformer paper. Read it after the Karpathy video, not before.',
          },
          {
            title: 'The Illustrated Transformer',
            source: 'Jay Alammar',
            url: 'https://jalammar.github.io/illustrated-transformer/',
            type: 'article',
            note: 'The diagrams most people picture when they think about attention.',
          },
        ],
      },
      {
        id: 'ai-rag',
        title: 'Retrieval and context',
        summary:
          'Get grounded answers out of a model without pretending the retrieval half is a solved problem.',
        difficulty: 'intermediate',
        resources: [
          {
            title: 'Retrieval-Augmented Generation for Large Language Models: A Survey',
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
        id: 'ai-evals',
        title: 'Evaluation and reliability',
        summary:
          'Build the measurement discipline that separates a demo from something you would put in front of users.',
        difficulty: 'advanced',
        resources: [
          {
            title: 'Full Stack Deep Learning',
            source: 'FSDL',
            url: 'https://fullstackdeeplearning.com/',
            type: 'course',
            note: 'Free lectures on the parts nobody teaches: testing, deployment, monitoring, and team workflow.',
          },
          {
            title: 'Building effective agents',
            source: 'Anthropic',
            url: 'https://www.anthropic.com/engineering/building-effective-agents',
            type: 'article',
            note: 'When an agent loop is the right tool and when a single call would have done — with the patterns that hold up.',
          },
        ],
      },
    ],
  },

  /* ───────────────────────────────────────────────────────────────── */
  {
    id: 'foundations',
    title: 'Foundations',
    tagline: 'The layer underneath everything above',
    blurb:
      'Operating systems, networks, algorithms and the mathematics that the rest of this curriculum quietly assumes. Slower to pay off, and the difference between copying an architecture and understanding one.',
    hex: '#7BD88F',
    modules: [
      {
        id: 'f-systems',
        title: 'Operating systems and networks',
        summary:
          'Know what the machine and the network are doing beneath your runtime, so performance work stops being guesswork.',
        difficulty: 'foundational',
        resources: [
          {
            title: 'Operating Systems: Three Easy Pieces',
            source: 'Arpaci-Dusseau, Wisconsin',
            url: 'https://pages.cs.wisc.edu/~remzi/OSTEP/',
            type: 'book',
            note: 'Free in full, and genuinely enjoyable. Virtualisation, concurrency, persistence.',
          },
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
        id: 'f-algorithms',
        title: 'Algorithms and complexity',
        summary:
          'Recognise the small number of patterns that most real problems reduce to, and reason about cost before writing code.',
        difficulty: 'intermediate',
        resources: [
          {
            title: 'Algorithms',
            source: 'Jeff Erickson, Illinois',
            url: 'https://jeffe.cs.illinois.edu/teaching/algorithms/',
            type: 'book',
            note: 'Free textbook plus problem sets. Rigorous and unusually well written.',
          },
          {
            title: 'Teach Yourself Computer Science',
            source: 'Ozan Onay & Myles Byrne',
            url: 'https://teachyourselfcs.com/',
            type: 'article',
            note: 'If you want a full self-taught CS path, start from this reading order rather than assembling your own.',
          },
        ],
      },
      {
        id: 'f-maths',
        title: 'Mathematics for machine learning',
        summary:
          'Cover the linear algebra, calculus and probability the AI track leans on, at the depth an engineer actually needs.',
        difficulty: 'intermediate',
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
]

/** every distinct resource, flattened — used for search and the counts */
export const ALL_RESOURCES = TRACKS.flatMap((t) =>
  t.modules.flatMap((m) =>
    m.resources.map((r) => ({ ...r, trackId: t.id, trackTitle: t.title, moduleId: m.id, moduleTitle: m.title, difficulty: m.difficulty, hex: t.hex }))
  )
)

export const RESOURCE_COUNT = ALL_RESOURCES.length
export const MODULE_COUNT = TRACKS.reduce((n, t) => n + t.modules.length, 0)
